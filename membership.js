(() => {
  'use strict';
  const root = document.getElementById('membership');
  const labels = {pending:'승인 대기', approved:'승인 완료', rejected:'가입 반려', suspended:'이용 정지'};
  let api, profile, members = [], generation = 0, busy = false;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const admin = () => profile?.role === 'admin' && profile?.status === 'approved';
  const field = (name,label,value='',type='text',extra='') => `<div><label for="member-${name}">${label}</label><input id="member-${name}" name="${name}" type="${type}" value="${escape(value)}" required ${extra}></div>`;
  const companyFields = (p={}) => field('full_name','이름',p.full_name,'text','maxlength="100" autocomplete="name"') + field('phone','연락처',p.phone,'tel','minlength="8" maxlength="25" autocomplete="tel"') + field('company_name','회사명',p.company_name,'text','maxlength="200" autocomplete="organization"') + field('business_number','사업자등록번호',p.business_number,'text','pattern="[0-9]{3}-?[0-9]{2}-?[0-9]{5}" placeholder="123-45-67890" maxlength="12"');
  function shell(content) { root.innerHTML = `<div class="member-shell"><div class="member-brand"><img src="assets/olacorp-logo.svg" alt="Ola corp." width="124" height="90"><div><b>Olacorp global</b><small>CDSCO Desk</small></div></div>${content}</div>`; }
  function message(text) { const el=document.getElementById('member-message'); if(el)el.textContent=text; }
  function lock() { document.body.classList.remove('workspace-open'); }
  async function perform(fn) {
    if(busy)return; busy=true;
    root.querySelectorAll('button').forEach(b=>b.disabled=true);
    try { await fn(); } catch(e) { message(errorText(e)); }
    finally { busy=false; root.querySelectorAll('button').forEach(b=>b.disabled=false); }
  }
  function errorText(e) {
    if(e.code==='weak_password'){
      const hints={
        length:'서버에서 요구하는 비밀번호 최소 길이를 충족하지 못했습니다.',
        characters:'서버에서 요구하는 문자 조합을 충족하지 못했습니다.',
        pwned:'유출된 것으로 알려진 비밀번호입니다. 다른 비밀번호를 사용해 주세요.'
      };
      const reasons=Array.isArray(e.reasons)?e.reasons:[];
      const messages=[...new Set(reasons.map(reason=>hints[reason]).filter(Boolean))];
      if(!messages.length)messages.push('비밀번호가 서버의 보안 조건을 충족하지 못했습니다.');
      if(e.message)messages.push(`상세 안내: ${e.message}`);
      return messages.join('\n');
    }
    if(e.code==='user_already_exists')return '이미 가입한 이메일입니다. 로그인해 주세요.';
    if(/Invalid login credentials/i.test(e.message))return '이메일 또는 비밀번호를 확인해 주세요.';
    if(/Email not confirmed/i.test(e.message))return '이메일 인증을 완료한 후 로그인해 주세요.';
    if(/rate limit/i.test(e.message))return '요청이 많습니다. 잠시 후 다시 시도해 주세요.';
    if(/fetch|network/i.test(e.message))return '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    return e.message || '처리하지 못했습니다. 다시 시도해 주세요.';
  }
  function authView() {
    lock();
    shell(`<section class="member-card member-auth"><h1>로그인</h1><p class="member-muted">승인된 업체 계정으로 CDSCO Desk를 이용하세요.</p><form id="member-auth-form"><div class="member-grid"><div class="member-wide">${field('email','이메일','','email','autocomplete="email" maxlength="254"')}</div><div class="member-wide">${field('password','비밀번호','','password','minlength="1" maxlength="72" autocomplete="current-password"')}</div></div><p id="member-message" class="member-message" role="status" aria-live="polite"></p><div class="member-actions"><button class="primary" type="submit">로그인</button></div></form></section>`);
    document.getElementById('member-auth-form').addEventListener('submit',event=>{
      event.preventDefault();
      const form=event.currentTarget; if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form));
      perform(async()=>{
        const {error}=await api.auth.signInWithPassword({email:values.email.trim(),password:values.password});
        if(error)throw error;
        await refresh();
      });
    });
  }
  function profileSummary(p){return `<dl class="member-grid">${[['담당자',p.full_name],['연락처',p.phone],['이메일',p.email],['회사명',p.company_name],['사업자등록번호',p.business_number]].map(([k,v])=>`<div><dt class="member-muted">${k}</dt><dd style="margin:4px 0">${escape(v)}</dd></div>`).join('')}</dl>`;}
  function memberView(){
    shell(`<section class="member-card"><div class="member-heading"><h1>${escape(profile.company_name)}</h1><button data-action="logout">로그아웃</button></div><span class="member-status">${labels[profile.status] || '권한 확인 필요'}</span><p>${({pending:'관리자가 가입 정보를 검토하고 있습니다. 승인 전에는 프로젝트에 접근할 수 없습니다.',rejected:'가입 신청이 반려되었습니다. 아래 사유를 확인하고 담당자에게 문의해 주세요.',suspended:'계정 이용이 정지되었습니다. 아래 사유를 확인하고 담당자에게 문의해 주세요.',approved:'업체 계정 승인이 완료되었습니다.'})[profile.status] || '관리자에게 문의해 주세요.'}</p>${profile.review_note?`<p><b>관리자 안내</b><br>${escape(profile.review_note)}</p>`:''}${profileSummary(profile)}<div class="member-actions"><button data-action="refresh">승인 상태 새로고침</button></div><p id="member-message" class="member-message" role="status"></p></section>${profile.status==='approved'?'<section class="member-card"><h2>내 프로젝트</h2><p class="member-muted">아직 배정된 프로젝트가 없습니다. 담당자가 프로젝트를 등록하면 이곳에서 확인할 수 있습니다.</p></section>':''}`);
  }
  async function refresh(background=false){
    const turn=++generation;
    const {data:{session},error}=await api.auth.getSession();
    if(turn!==generation)return;
    if(error){lock();throw error;}
    if(!session){profile=null;authView();return;}
    const {data,error:readError}=await api.from('company_members').select('*').eq('id',session.user.id).single();
    if(turn!==generation)return;
    if(readError){lock();profile=null;shell('<section class="member-card"><h1>계정 정보를 확인하지 못했습니다</h1><p>잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.</p><div class="member-actions"><button data-action="refresh">다시 시도</button><button data-action="logout">로그아웃</button></div><p id="member-message" role="status"></p></section>');return;}
    if(background && JSON.stringify(profile)===JSON.stringify(data))return;
    profile=data;
    if(!admin())lock();
    if(admin())await adminView(turn); else memberView();
  }
  async function adminView(turn=generation){
    const {data,error}=await api.from('company_members').select('*').eq('role','client').order('created_at',{ascending:false});
    if(turn!==generation || !admin())return;
    if(error){lock();throw error;}
    members=data;
    shell(`<section class="member-card"><div class="member-heading"><div><h1>가입업체 관리</h1><p class="member-muted">${escape(profile.full_name)} 관리자 · 승인 대기 ${members.filter(m=>m.status==='pending').length}건</p></div><div class="member-actions"><button data-action="refresh">새로고침</button><button data-action="demo">기존 프로젝트 데모</button><button data-action="logout">로그아웃</button></div></div><div class="member-grid"><div><label for="member-search">업체 검색</label><input id="member-search" placeholder="회사명, 이름, 이메일, 사업자번호"></div><div><label for="member-filter">가입 상태</label><select id="member-filter"><option value="all">전체</option>${Object.entries(labels).map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></div></div><p id="member-message" class="member-message" role="status"></p><div class="member-table"><table><thead><tr><th>회사명 / 사업자번호</th><th>담당자 / 연락처</th><th>이메일</th><th>가입일</th><th>상태</th><th>관리</th></tr></thead><tbody id="member-rows"></tbody></table></div></section><section id="member-detail"></section>`);
    document.getElementById('member-search').addEventListener('input',renderRows);
    document.getElementById('member-filter').addEventListener('change',renderRows);
    renderRows();
  }
  function renderRows(){
    const q=document.getElementById('member-search').value.trim().toLowerCase(), filter=document.getElementById('member-filter').value;
    document.getElementById('member-rows').innerHTML=members.filter(m=>(filter==='all'||m.status===filter)&&[m.company_name,m.full_name,m.email,m.business_number].join(' ').toLowerCase().includes(q)).map(m=>`<tr><td>${escape(m.company_name)}<br><small>${escape(m.business_number)}</small></td><td>${escape(m.full_name)}<br><small>${escape(m.phone)}</small></td><td>${escape(m.email)}</td><td>${new Date(m.created_at).toLocaleDateString('ko-KR')}</td><td>${labels[m.status]}</td><td><button data-action="detail" data-id="${m.id}">상세·승인</button></td></tr>`).join('')||'<tr><td colspan="6">조건에 맞는 업체가 없습니다.</td></tr>';
  }
  function detail(id){
    if(!admin())return;
    const m=members.find(m=>m.id===id);if(!m)return;
    document.getElementById('member-detail').innerHTML=`<div class="member-card"><h2>${escape(m.company_name)} · ${labels[m.status]}</h2><p>${escape(m.email)}</p><form id="member-edit"><div class="member-grid">${companyFields(m)}</div><div class="member-actions"><button type="submit">업체 정보 저장</button></div></form><label for="member-note" style="margin-top:24px">승인·반려·이용정지 사유 (반려·정지 시 필수)</label><textarea id="member-note" maxlength="1000">${escape(m.review_note)}</textarea><div class="member-actions">${[['approved','승인'],['rejected','반려'],['suspended','이용정지']].filter(([s])=>s!==m.status).map(([s,t])=>`<button class="${s==='approved'?'primary':''}" data-action="review" data-id="${m.id}" data-status="${s}">${t}</button>`).join('')}</div></div>`;
    document.getElementById('member-edit').addEventListener('submit',event=>{
      event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
      const v=Object.fromEntries(new FormData(form));
      perform(async()=>{
        const {error}=await api.rpc('edit_company_member',{member_id:id,member_name:v.full_name,member_phone:v.phone,member_company:v.company_name,member_business_number:v.business_number});
        if(error)throw error;await refresh();message('업체 정보를 저장했습니다.');
      });
    });
    document.getElementById('member-detail').scrollIntoView({behavior:'smooth'});
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action;
    if(action==='login')return authView();
    if(action==='detail')return detail(button.dataset.id);
    perform(async()=>{
      if(action==='refresh')await refresh();
      if(action==='logout') {lock();profile=null;members=[];generation++;const {error}=await api.auth.signOut();if(error)throw error;authView();}
      if(action==='review'){
        if(!admin())throw Error('관리자만 처리할 수 있습니다.');
        const note=document.getElementById('member-note').value.trim();
        if(button.dataset.status!=='approved'&&!note)throw Error('처리 사유를 입력해 주세요.');
        const {error}=await api.rpc('review_company_member',{member_id:button.dataset.id,new_status:button.dataset.status,note});
        if(error)throw error;await refresh();message('처리 결과를 저장했습니다.');
      }
      if(action==='demo'){
        await refresh();if(!admin())return;
        setRole('admin');document.getElementById('userName').textContent=profile.full_name;
        document.body.classList.add('workspace-open');
      }
    });
  });
  window.openMemberManagement=()=>{lock();perform(refresh);};
  async function start(){
    lock();
    const config=window.CDSCO_AUTH_CONFIG;
    if(!config?.url||!config?.publishableKey){shell('<section class="member-card member-auth"><h1>회원 서비스 준비 중</h1><p>로그인 서비스 연결을 준비하고 있습니다. 연결이 완료되면 이용할 수 있습니다.</p></section>');return;}
    shell('<section class="member-card member-auth"><h1>계정 확인 중…</h1><p id="member-message" role="status"></p></section>');
    try{
      const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.57.4');
      api=createClient(config.url,config.publishableKey);
      api.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){generation++;profile=null;members=[];authView();}else if(event==='SIGNED_IN')setTimeout(()=>perform(refresh),0);});
      await refresh();
      setInterval(()=>{if(profile&&!busy)perform(()=>refresh(true));},30000);
      document.addEventListener('visibilitychange',()=>{if(!document.hidden&&profile)perform(()=>refresh(true));});
    }catch(e){lock();message('회원 서비스에 연결하지 못했습니다. 페이지를 새로고침해 주세요.');}
  }
  start();
})();
