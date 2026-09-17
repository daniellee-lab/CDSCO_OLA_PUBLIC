(() => {
  'use strict';
  const companies = {somebymi:'SOME BY MI',cosmelab:'COSMELAB'};
  let inventory = [
    {company:'somebymi',month:'2026-09',sku:'SBM-001',product:'AHA BHA PHA 토너 150ml',opening:1200,received:500,sold:420,seeding:40,damaged:5},
    {company:'somebymi',month:'2026-09',sku:'SBM-002',product:'미라클 세럼 50ml',opening:800,received:300,sold:260,seeding:30,damaged:3},
    {company:'somebymi',month:'2026-09',sku:'SBM-003',product:'데일리 마스크 30매',opening:600,received:200,sold:180,seeding:20,damaged:2},
    {company:'cosmelab',month:'2026-09',sku:'COS-001',product:'Hair Tattoo Brow 1.2g',opening:900,received:400,sold:310,seeding:25,damaged:4},
    {company:'somebymi',month:'2026-08',sku:'SBM-001',product:'AHA BHA PHA 토너 150ml',opening:1000,received:600,sold:350,seeding:45,damaged:5},
    {company:'somebymi',month:'2026-08',sku:'SBM-002',product:'미라클 세럼 50ml',opening:700,received:400,sold:270,seeding:25,damaged:5},
    {company:'somebymi',month:'2026-08',sku:'SBM-003',product:'데일리 마스크 30매',opening:500,received:300,sold:180,seeding:18,damaged:2},
    {company:'cosmelab',month:'2026-08',sku:'COS-001',product:'Hair Tattoo Brow 1.2g',opening:800,received:400,sold:275,seeding:20,damaged:5}
  ];
  let campaigns = [
    {company:'somebymi',name:'데모 크리에이터 A',platform:'Instagram',profile:'https://example.com/creator-a',tier:'Micro',followers:42000,engagement:4.8,quantity:3,date:'2026-09-05',content:'https://example.com/content-a'},
    {company:'somebymi',name:'데모 크리에이터 B',platform:'YouTube',profile:'https://example.com/creator-b',tier:'Macro',followers:210000,engagement:3.2,quantity:5,date:'2026-09-12',content:''},
    {company:'cosmelab',name:'데모 크리에이터 C',platform:'Instagram',profile:'https://example.com/creator-c',tier:'Micro',followers:65000,engagement:5.1,quantity:2,date:'2026-09-08',content:''},
    {company:'somebymi',name:'데모 크리에이터 D',platform:'Instagram',profile:'https://example.com/creator-d',tier:'Nano',followers:8500,engagement:6.4,quantity:2,date:'2026-08-20',content:''}
  ];
  const el = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = value => value.toLocaleString('ko-KR');
  const closing = row => row.opening+row.received-row.sold-row.seeding-row.damaged;
  let section='cdsco';
  const visible = rows => rows.filter(row => (currentRole==='admin' ? el('operationsCompany').value==='all'||row.company===el('operationsCompany').value : row.company==='somebymi') && (row.month||row.date.slice(0,7))===el('operationsMonth').value);
  function link(url,label){
    if(!url)return '<span class="member-muted">등록 대기</span>';
    if(!/^https?:\/\//i.test(url))return esc(label);
    return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  }
  function render(){
    const admin=currentRole==='admin';
    el('operationsCompanyFilter').classList.toggle('hidden',!admin);
    el('inventoryUpload').classList.toggle('hidden',!admin);
    el('inventoryEditHeading').classList.toggle('hidden',!admin);
    if(!admin){editingInventory=null;if(el('inventoryEditDialog').open)el('inventoryEditDialog').close();}
    el('marketingUpload').classList.toggle('hidden',!admin);
    el('marketingEditHeading').classList.toggle('hidden',!admin);
    if(!admin){pendingMarketing=null;editingCampaign=null;el('marketingSheetChoice').classList.add('hidden');el('marketingUploadStatus').textContent='';if(el('marketingEditDialog').open)el('marketingEditDialog').close();}
    if(!admin){pendingWorkbook=null;el('inventorySheetChoice').classList.add('hidden');el('inventoryUploadStatus').textContent='';}
    if(!admin)el('operationsCompany').value='somebymi';
    el('operationsScope').textContent=admin?'고객사별 운영 현황':'SOME BY MI · 자사 운영 현황';
    el('operationsTitle').textContent=section==='marketing'?'MARKETING · 인플루언서':'DISTRIBUTION · 현지 재고 현황';
    el('distributionPanel').classList.toggle('hidden',section!=='distribution');
    el('marketingPanel').classList.toggle('hidden',section!=='marketing');
    const rows=visible(inventory);
    el('operationsDataNote').textContent=section==='marketing'?(visible(campaigns).some(r=>r.imported)?'수정·업로드 자료는 이 브라우저에 저장되며 다른 기기와 공유되지 않습니다.':'예시 데이터 · 실제 인플루언서 실적이 아닙니다.'):rows.some(r=>r.imported)?'업로드 재고가 포함되어 있습니다. 업로드 자료는 이 브라우저에 저장되며 다른 기기와 공유되지 않습니다.':'예시 데이터 · 실제 재고가 아닙니다.';
    const totals=rows.reduce((sum,r)=>{for(const key of ['opening','received','sold','seeding','damaged'])sum[key]+=r[key];sum.closing+=closing(r);return sum;},{opening:0,received:0,sold:0,seeding:0,damaged:0,closing:0});
    const metrics=[['opening','월초재고'],['received','입고수량'],['sold','판매량'],['seeding','시딩수량'],['damaged','파손 수량'],['closing','월말재고']];
    const max=Math.max(1,...Object.values(totals));
    el('inventoryChart').innerHTML=rows.length?metrics.map(([key,label])=>`<div class="inventory-bar-row"><span>${label}</span><div class="inventory-track"><div class="inventory-bar ${key}" style="width:${totals[key]/max*100}%"></div></div><strong>${num(totals[key])}</strong></div>`).join(''):'<p class="operations-empty">선택한 월에 재고 데이터가 없습니다.</p>';
    el('inventoryRows').innerHTML=rows.map(r=>`<tr><td>${companies[r.company]}</td><td>${esc(r.sku)}</td><td>${esc(r.product)}</td>${['opening','received','sold','seeding','damaged'].map(k=>`<td class="numeric">${num(r[k])}</td>`).join('')}<td class="numeric"><b>${num(closing(r))}</b></td>${admin?`<td><button type="button" class="secondary" data-edit-inventory="${inventory.indexOf(r)}">수정</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${admin?10:9}" class="operations-empty">선택한 월에 재고 데이터가 없습니다.</td></tr>`;
    el('inventoryTotals').innerHTML=rows.length?`<tr><th colspan="3">합계</th>${metrics.map(([key])=>`<td class="numeric">${num(totals[key])}</td>`).join('')}${admin?'<td></td>':''}</tr>`:'';
    el('inventoryCount').textContent=`${rows.length} SKU · 단위: 개`;
    const people=visible(campaigns);
    el('marketingRows').innerHTML=people.map(r=>`<tr><td>${companies[r.company]}</td><td>${esc(r.name)}</td><td>${esc(r.platform)}</td><td>${link(r.profile,r.profile)}</td><td><span class="pill blue">${esc(r.tier)}</span></td><td class="numeric">${num(r.followers)}</td><td class="numeric">${r.engagement}%</td><td class="numeric">${r.quantity}</td><td>${r.date}</td><td>${link(r.content,'콘텐츠 보기')}</td>${admin?`<td><button type="button" class="secondary" data-edit-campaign="${campaigns.indexOf(r)}">수정</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${admin?11:10}" class="operations-empty">선택한 월에 발송 내역이 없습니다.</td></tr>`;
    el('marketingCount').textContent=`${people.length}명 · 발송 ${num(people.reduce((s,r)=>s+r.quantity,0))}개`;
    if(section!=='cdsco')el('crumb').textContent=`${admin?'전체 고객사':'SOME BY MI'} / ${section.toUpperCase()}`;
  }
  window.openOperations = next => {
    section=next;
    el('cdscoContent').classList.toggle('hidden',next!=='cdsco');
    el('operationsContent').classList.toggle('hidden',next==='cdsco');
    document.querySelectorAll('[data-operations]').forEach(button=>button.classList.toggle('active',button.dataset.operations===next));
    render();
    if(next==='cdsco')el('crumb').textContent=currentRole==='admin'?'전체 업체 / CDSCO 프로젝트 관리':'내 프로젝트 / CDSCO 진행 현황';
  };
  window.openCdscoView = (view='overview',phase=false) => {
    window.openOperations('cdsco');
    const tabs=document.querySelectorAll('.view-tabs button');
    switchView(view,tabs[{overview:0,sku:1,maker:2,activity:3}[view]]);
    if(phase)el('phase-2').scrollIntoView({behavior:'smooth',block:'start'});
  };
  const storageKey='olacorp:inventory:imports:v1';
  let pendingWorkbook=null, uploading=false,editingInventory=null;
  let imported=[];
  function restore(){
    try{
      const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');
      if(!Array.isArray(saved))throw Error('잘못된 저장 형식');
      if(saved.some(r=>!Object.hasOwn(companies,r.company)||!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||typeof r.sku!=='string'||typeof r.product!=='string'||!r.sku||!r.product||!['opening','received','sold','seeding','damaged'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=1000000000)||closing(r)<0))throw Error('잘못된 저장 데이터');
      imported=saved.map(r=>({...r,imported:true}));
      const groups=new Set(imported.map(r=>r.company+':'+r.month));
      inventory=inventory.filter(r=>!groups.has(r.company+':'+r.month)).concat(imported);
    }catch{el('inventoryUploadStatus').textContent='저장된 재고를 불러오지 못했습니다. 엑셀 파일을 다시 업로드해 주세요.';}
  }
  function uploadStatus(message){el('inventoryUploadStatus').textContent=message;}
  function target(){
    if(currentRole!=='admin')throw Error('어드민 화면에서만 업로드할 수 있습니다.');
    const company=el('operationsCompany').value,month=el('operationsMonth').value;
    if(!Object.hasOwn(companies,company))throw Error('상단에서 전체 고객사 대신 업로드할 고객사를 선택해 주세요.');
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('조회 월을 선택해 주세요.');
    return {company,month};
  }
  function applySheet(workbook,sheetName,scope){
    const now=target();
    if(now.company!==scope.company||now.month!==scope.month)throw Error('고객사 또는 조회 월이 변경되었습니다. 파일을 다시 선택해 주세요.');
    const rows=window.InventoryImport.parse(workbook.Sheets[sheetName],window.XLSX,scope.company,scope.month,companies[scope.company]).map(row=>({...row,imported:true}));
    const keep=row=>row.company!==scope.company||row.month!==scope.month;
    const next=imported.filter(keep).concat(rows);
    try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{throw Error('브라우저에 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요. 기존 재고는 유지됩니다.');}
    imported=next;
    inventory=inventory.filter(keep).concat(rows);
    pendingWorkbook=null;
    el('inventorySheetChoice').classList.add('hidden');
    render();
    uploadStatus(`${companies[scope.company]} · ${scope.month} · ${sheetName}: ${rows.length}개 SKU를 반영했습니다. 표와 그래프가 갱신되었습니다.`);
  }
  async function upload(files){
    if(uploading)return;
    uploading=true;
    pendingWorkbook=null;
    el('inventorySheetChoice').classList.add('hidden');
    try{
      const scope=target();
      if(files.length!==1)throw Error('엑셀 파일을 한 개씩 넣어 주세요.');
      const file=files[0];
      if(!/\.xlsx?$/i.test(file.name))throw Error('.xlsx 또는 .xls 엑셀 파일을 선택해 주세요.');
      if(file.size>10*1024*1024)throw Error('10MB 이하의 엑셀 파일을 선택해 주세요.');
      if(!window.XLSX||!window.InventoryImport)throw Error('엑셀 읽기 기능을 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
      uploadStatus('엑셀 파일을 읽고 있습니다…');
      const bytes=await file.arrayBuffer();
      if(currentRole!=='admin')throw Error('어드민 화면에서만 업로드할 수 있습니다.');
      let workbook;
      try{workbook=window.XLSX.read(bytes,{type:'array',cellFormula:false,sheetRows:10002});}catch{throw Error('엑셀 파일을 읽을 수 없습니다. 암호를 해제하고 정상적인 엑셀 파일을 선택해 주세요.');}
      const sheets=workbook.SheetNames.filter(name=>workbook.Sheets[name]['!ref']);
      if(!sheets.length)throw Error('재고 데이터가 있는 시트가 없습니다.');
      if(sheets.length===1)applySheet(workbook,sheets[0],scope);
      else{
        pendingWorkbook={workbook,scope};
        el('inventorySheet').innerHTML=sheets.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
        el('inventorySheetChoice').classList.remove('hidden');
        uploadStatus('시트가 여러 개입니다. 반영할 시트를 선택해 주세요.');
      }
    }catch(error){uploadStatus(error.message);}
    finally{uploading=false;el('inventoryFile').value='';}
  }
  el('inventoryFile').addEventListener('change',event=>upload(event.target.files));
  const drop=el('inventoryDrop');
  for(const type of ['dragenter','dragover'])drop.addEventListener(type,event=>{event.preventDefault();if(currentRole==='admin')drop.classList.add('dragging');});
  for(const type of ['dragleave','drop'])drop.addEventListener(type,event=>{event.preventDefault();drop.classList.remove('dragging');});
  drop.addEventListener('drop',event=>upload(event.dataTransfer.files));
  el('inventoryChoose').addEventListener('click',()=>el('inventoryFile').click());
  el('inventoryApplySheet').addEventListener('click',()=>{
    if(!pendingWorkbook)return;
    try{applySheet(pendingWorkbook.workbook,el('inventorySheet').value,pendingWorkbook.scope);}catch(error){uploadStatus(error.message);}
  });
  el('inventoryTemplate').addEventListener('click',()=>{
    try{
      target();
      if(!window.XLSX)throw Error('엑셀 기능을 불러오지 못했습니다. 새로고침해 주세요.');
      const book=window.XLSX.utils.book_new();
      const sheet=window.XLSX.utils.aoa_to_sheet([window.InventoryImport.headers,['SAMPLE-001','예시 제품 (실제 제품으로 교체)',100,50,30,5,2,113]]);
      sheet['!cols']=[{wch:20},{wch:38},...Array.from({length:6},()=>({wch:15}))];
      window.XLSX.utils.book_append_sheet(book,sheet,'현지 재고');
      window.XLSX.writeFile(book,'DISTRIBUTION_재고양식.xlsx');
    }catch(error){uploadStatus(error.message);}
  });
  const inventoryFields=['sku','product','opening','received','sold','seeding','damaged'];
  el('inventoryRows').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-inventory]');
    if(!button||currentRole!=='admin')return;
    const row=inventory[Number(button.dataset.editInventory)];
    if(!row||!visible(inventory).includes(row))return;
    editingInventory=row;
    for(const key of inventoryFields)el('inventoryEdit-'+key).value=row[key];
    el('inventoryEditScope').textContent=companies[row.company]+' · '+row.month;
    el('inventoryEditClosing').textContent=num(closing(row));
    el('inventoryEditStatus').textContent='';el('inventoryEditDialog').showModal();
  });
  el('inventoryEditForm').addEventListener('input',()=>{
    const row=Object.fromEntries(inventoryFields.slice(2).map(key=>[key,Number(el('inventoryEdit-'+key).value)]));
    el('inventoryEditClosing').textContent=num(closing(row));
  });
  el('inventoryEditCancel').addEventListener('click',()=>{editingInventory=null;el('inventoryEditDialog').close();});
  el('inventoryEditForm').addEventListener('submit',event=>{
    event.preventDefault();
    try{
      if(currentRole!=='admin'||!editingInventory)throw Error('어드민 화면에서만 수정할 수 있습니다.');
      const old=editingInventory;
      if(!inventory.includes(old))throw Error('목록이 변경되었습니다. 다시 열어 주세요.');
      const cells=inventoryFields.map(key=>el('inventoryEdit-'+key).value).concat('');
      const sheet=window.XLSX.utils.aoa_to_sheet([window.InventoryImport.headers,cells]);
      const updated={...window.InventoryImport.parse(sheet,window.XLSX,old.company,old.month,companies[old.company])[0],imported:true};
      if(inventory.some(r=>r!==old&&r.company===old.company&&r.month===old.month&&r.sku===updated.sku))throw Error('동일 고객사·월에 중복된 SKU가 있습니다.');
      const group=r=>r.company===old.company&&r.month===old.month;
      const next=imported.filter(r=>!group(r)).concat(inventory.filter(group).map(r=>r===old?updated:{...r,imported:true}));
      try{localStorage.setItem(storageKey,JSON.stringify(next));}catch{throw Error('브라우저에 저장하지 못했습니다. 기존 재고는 유지됩니다.');}
      imported=next;inventory=inventory.map(r=>r===old?updated:r);
      editingInventory=null;el('inventoryEditDialog').close();render();uploadStatus('재고를 저장했습니다. 표와 그래프가 갱신되었습니다.');
    }catch(error){el('inventoryEditStatus').textContent=error.message;}
  });
  const marketingStorageKey='olacorp:marketing:imports:v1';
  let pendingMarketing=null,editingCampaign=null,marketingBusy=false,marketingSaved=[];
  function saveMarketing(next){
    try{localStorage.setItem(marketingStorageKey,JSON.stringify(next));}catch{throw Error('브라우저에 저장하지 못했습니다. 기존 목록은 유지됩니다.');}
    marketingSaved=next;
    const groups=new Set(next.map(r=>r.company+':'+r.date.slice(0,7)));
    campaigns=campaigns.filter(r=>!groups.has(r.company+':'+r.date.slice(0,7))).concat(next);
  }
  function applyMarketing(workbook,sheet,scope){
    const now=target();
    if(now.company!==scope.company||now.month!==scope.month)throw Error('고객사 또는 조회 월이 변경되었습니다. 파일을 다시 선택해 주세요.');
    const rows=window.MarketingImport.parse(workbook.Sheets[sheet],window.XLSX,scope.company,scope.month,companies[scope.company]).map(r=>({...r,imported:true}));
    saveMarketing(marketingSaved.filter(r=>r.company!==scope.company||r.date.slice(0,7)!==scope.month).concat(rows));
    pendingMarketing=null;
    el('marketingSheetChoice').classList.add('hidden');
    render();
    el('marketingUploadStatus').textContent=`${companies[scope.company]} · ${scope.month}: ${rows.length}명 반영 완료`;
  }
  async function uploadMarketing(files){
    if(marketingBusy)return;
    marketingBusy=true;pendingMarketing=null;
    el('marketingSheetChoice').classList.add('hidden');
    try{
      const scope=target();
      if(files.length!==1)throw Error('엑셀 파일을 한 개씩 넣어 주세요.');
      const file=files[0];
      if(!/\.xlsx?$/i.test(file.name)||file.size>10*1024*1024)throw Error('10MB 이하의 .xlsx 또는 .xls 파일을 선택해 주세요.');
      if(!window.XLSX||!window.MarketingImport)throw Error('엑셀 기능을 불러오지 못했습니다. 새로고침해 주세요.');
      el('marketingUploadStatus').textContent='엑셀 파일을 읽고 있습니다…';
      const bytes=await file.arrayBuffer();
      if(currentRole!=='admin')throw Error('어드민 화면에서만 업로드할 수 있습니다.');
      let workbook;
      try{workbook=window.XLSX.read(bytes,{type:'array',cellFormula:false,sheetRows:10002});}catch{throw Error('엑셀 파일을 읽을 수 없습니다. 암호를 해제하고 다시 선택해 주세요.');}
      const sheets=workbook.SheetNames.filter(name=>workbook.Sheets[name]['!ref']);
      if(!sheets.length)throw Error('데이터가 있는 시트가 없습니다.');
      if(sheets.length===1)applyMarketing(workbook,sheets[0],scope);
      else{
        pendingMarketing={workbook,scope};
        el('marketingSheet').innerHTML=sheets.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
        el('marketingSheetChoice').classList.remove('hidden');
        el('marketingUploadStatus').textContent='반영할 시트를 선택해 주세요.';
      }
    }catch(error){el('marketingUploadStatus').textContent=error.message;}
    finally{marketingBusy=false;el('marketingFile').value='';}
  }
  el('marketingFile').addEventListener('change',event=>uploadMarketing(event.target.files));
  el('marketingChoose').addEventListener('click',()=>el('marketingFile').click());
  const marketingDrop=el('marketingDrop');
  for(const type of ['dragenter','dragover'])marketingDrop.addEventListener(type,event=>{event.preventDefault();if(currentRole==='admin')marketingDrop.classList.add('dragging');});
  for(const type of ['dragleave','drop'])marketingDrop.addEventListener(type,event=>{event.preventDefault();marketingDrop.classList.remove('dragging');});
  marketingDrop.addEventListener('drop',event=>uploadMarketing(event.dataTransfer.files));
  el('marketingApplySheet').addEventListener('click',()=>{
    if(!pendingMarketing)return;
    try{applyMarketing(pendingMarketing.workbook,el('marketingSheet').value,pendingMarketing.scope);}catch(error){el('marketingUploadStatus').textContent=error.message;}
  });
  el('marketingTemplate').addEventListener('click',()=>{
    try{
      const scope=target();
      if(!window.XLSX)throw Error('엑셀 기능을 불러오지 못했습니다. 새로고침해 주세요.');
      const book=window.XLSX.utils.book_new();
      const sheet=window.XLSX.utils.aoa_to_sheet([window.MarketingImport.headers,['예시 인플루언서','Instagram','https://example.com/profile','Micro',42000,4.8,3,scope.month+'-01','']]);
      sheet['!cols']=window.MarketingImport.headers.map(()=>({wch:24}));
      window.XLSX.utils.book_append_sheet(book,sheet,'인플루언서 시딩');window.XLSX.writeFile(book,'MARKETING_시딩양식.xlsx');
    }catch(error){el('marketingUploadStatus').textContent=error.message;}
  });
  el('marketingRows').addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-campaign]');
    if(!button||currentRole!=='admin')return;
    const row=campaigns[Number(button.dataset.editCampaign)];
    if(!row||!visible(campaigns).includes(row))return;
    editingCampaign=row;
    for(const key of window.MarketingImport.fields)el('marketingEdit-'+key).value=row[key];
    el('marketingEditScope').textContent=companies[row.company]+' · '+row.date.slice(0,7);
    el('marketingEditStatus').textContent='';el('marketingEditDialog').showModal();
  });
  el('marketingEditCancel').addEventListener('click',()=>{editingCampaign=null;el('marketingEditDialog').close();});
  el('marketingEditForm').addEventListener('submit',event=>{
    event.preventDefault();
    try{
      if(currentRole!=='admin'||!editingCampaign)throw Error('어드민 화면에서만 수정할 수 있습니다.');
      const old=editingCampaign;
      if(!campaigns.includes(old))throw Error('목록이 변경되었습니다. 다시 열어 주세요.');
      const input=Object.fromEntries(window.MarketingImport.fields.map(key=>[key,el('marketingEdit-'+key).value]));
      const updated={...window.MarketingImport.validate(input,old.company,old.date.slice(0,7)),imported:true};
      if(campaigns.some(r=>r!==old&&r.company===updated.company&&r.platform===updated.platform&&r.profile===updated.profile&&r.date===updated.date))throw Error('동일 플랫폼·프로필·발송일의 중복 행입니다.');
      const group=r=>r.company===old.company&&r.date.slice(0,7)===old.date.slice(0,7);
      saveMarketing(marketingSaved.filter(r=>!group(r)).concat(campaigns.filter(group).map(r=>r===old?updated:{...r,imported:true})));
      editingCampaign=null;el('marketingEditDialog').close();render();
      el('marketingUploadStatus').textContent='시딩 정보를 저장했습니다.';
    }catch(error){el('marketingEditStatus').textContent=error.message;}
  });
  try{
    const saved=JSON.parse(localStorage.getItem(marketingStorageKey)||'[]');
    if(!Array.isArray(saved))throw Error();
    marketingSaved=saved.map(r=>{
      if(!Object.hasOwn(companies,r.company))throw Error();
      return {...window.MarketingImport.validate(r,r.company,r.date.slice(0,7)),imported:true};
    });
    const groups=new Set(marketingSaved.map(r=>r.company+':'+r.date.slice(0,7)));
    campaigns=campaigns.filter(r=>!groups.has(r.company+':'+r.date.slice(0,7))).concat(marketingSaved);
  }catch{el('marketingUploadStatus').textContent='저장된 시딩 정보를 불러오지 못했습니다. 엑셀 파일을 다시 업로드해 주세요.';}
  restore();
  window.renderOperations=render;
  el('operationsCompany').addEventListener('change',render);
  el('operationsMonth').addEventListener('change',render);
  render();
})();
