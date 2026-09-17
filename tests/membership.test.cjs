const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source=fs.readFileSync('membership.js','utf8');
function fixture(config={}){
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:'',addEventListener(){},querySelectorAll(){return[];},scrollIntoView(){}});return elements.get(id);};
 const classes=new Set(['workspace-open']);
 const document={getElementById:el,body:{classList:{remove:v=>classes.delete(v),add:v=>classes.add(v)}},addEventListener(){}};
 const context={document,window:{CDSCO_AUTH_CONFIG:config},location:{origin:'https://example.test',pathname:'/'},setTimeout, setInterval(){},console};
 // Expose functions only inside the isolated test VM, never in shipped code.
 const instrumented=source.replace('  start();','  window.testAPI={errorText,authView,memberView,renderRows,detail,refresh,admin,escape,companyFields,setProfile:p=>profile=p,setAPI:a=>api=a,setMembers:m=>members=m};\n  start();');
 vm.runInNewContext(instrumented,context);
 return {api:context.window.testAPI,el,classes};
}
test('missing config fails closed without a demo login',()=>{
 const f=fixture();assert.match(f.el('membership').innerHTML,/회원 서비스 준비 중/);assert.doesNotMatch(f.el('membership').innerHTML,/data-action="demo"/);
});
test('weak password errors preserve the actual policy reason and server details',()=>{
 const {api}=fixture();
 for(const [reason,expected] of [['length',/최소 길이/],['characters',/문자 조합/],['pwned',/유출/]]){
   const result=api.errorText({code:'weak_password',reasons:[reason],message:'Server policy details'});
   assert.match(result,expected);
   assert.match(result,/Server policy details/);
   assert.doesNotMatch(result,/12자 이상/);
 }
 const result=api.errorText({code:'weak_password',message:'Password should be at least 16 characters.'});
 assert.match(result,/16 characters/);
 assert.doesNotMatch(result,/12자 이상/);
 assert.match(api.errorText({code:'weak_password',reasons:['unknown']}),/서버의 보안 조건/);
});
test('login screen has no public signup form',()=>{
 const f=fixture();f.api.authView(true);const html=f.el('membership').innerHTML;
 for(const name of ['email','password'])assert.ok(html.includes(`name="${name}"`));
 assert.doesNotMatch(html,/회원가입|data-action="signup"|name="confirm"|name="company_name"/);
 assert.ok(!f.classes.has('workspace-open'));
});
test('pending, rejected and suspended accounts never receive a project panel',()=>{
 const f=fixture();
 for(const status of ['pending','rejected','suspended']){
 f.api.setProfile({status,company_name:'Test',review_note:'<img src=x onerror=alert(1)>'});f.api.memberView();
 assert.doesNotMatch(f.el('membership').innerHTML,/<h2>내 프로젝트/);
 assert.doesNotMatch(f.el('membership').innerHTML,/<img src=x/);
 }
});
test('public pages open the project without authentication',()=>{
 for(const file of ['index.html','membership-preview.html']){
 const html=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(html,/src="(?:membership|auth-config)\.js"|href="membership\.css"|id="membership"|openMemberManagement/);
 assert.match(html,/setRole\('admin'\);\s*<\/script>/);
 assert.match(html,/id="roleSelect" onchange="setRole\(this.value\)"/);
 assert.match(html,/<option value="admin">/);
 assert.match(html,/<option value="client">/);
 }
});
test('login accepts existing passwords shorter than the signup minimum',()=>{
 const f=fixture();f.api.authView();
 assert.match(f.el('membership').innerHTML,/minlength="1"/);

});
test('a stale session lookup cannot replace a newer signed-out view',async()=>{
 const f=fixture();let resolve;
 f.api.setAPI({auth:{getSession:()=>new Promise(r=>resolve=r)},from:()=>{throw Error('stale read');}});
 const pending=f.api.refresh();
 f.api.setAPI({auth:{getSession:async()=>({data:{session:null}})}});
 await f.api.refresh();
 resolve({data:{session:{user:{id:'old'}}}});await pending;
 assert.match(f.el('membership').innerHTML,/<h1>로그인/);
});
test('approved company gets an empty workspace, not another company demo',()=>{
 const f=fixture();f.api.setProfile({role:'client',status:'approved',company_name:'New Company'});f.api.memberView();
 assert.match(f.el('membership').innerHTML,/아직 배정된 프로젝트가 없습니다/);
 assert.doesNotMatch(f.el('membership').innerHTML,/SOME BY MI|data-action="demo"/);
 assert.equal(f.api.admin(),false);
});
test('only approved admins satisfy the UI admin gate',()=>{
 const f=fixture();for(const [role,status,allowed] of [['admin','approved',true],['admin','suspended',false],['admin','pending',false],['client','approved',false]]){f.api.setProfile({role,status});assert.equal(f.api.admin(),allowed);}
});
test('profile lookup failure closes a previously open workspace',async()=>{
 const f=fixture();f.api.setAPI({auth:{getSession:async()=>({data:{session:{user:{id:'user'}}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({error:{message:'offline'}})})})})});
 await f.api.refresh();assert.ok(!f.classes.has('workspace-open'));assert.equal(f.api.admin(),false);assert.match(f.el('membership').innerHTML,/계정 정보를 확인하지 못했습니다/);
});
test('revoked admin moves to suspended view on refresh',async()=>{
 const f=fixture();f.api.setProfile({role:'admin',status:'approved'});
 f.api.setAPI({auth:{getSession:async()=>({data:{session:{user:{id:'user'}}}})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'admin',status:'suspended',company_name:'Test'}})})})})});
 await f.api.refresh();assert.ok(!f.classes.has('workspace-open'));assert.match(f.el('membership').innerHTML,/계정 이용이 정지/);
});
test('project startup and both roles render all 15 steps before document lists',()=>{
 for(const file of ['index.html','membership-preview.html']){
  const html=fs.readFileSync(file,'utf8');
  const elements=new Map();
  function register(markup){
   for(const match of markup.matchAll(/\bid="([^"]+)"/g)){
    if(elements.has(match[1]))continue;
    let content='';
    elements.set(match[1],{
     value:match[1]==='skuFilter'?'all':'',style:{},textContent:'',
     classList:{add(){},remove(){},toggle(){}},
     get innerHTML(){return content;},
     set innerHTML(value){content=value;register(value);}
    });
   }
  }
  register(html.split('<script>')[0]);
  assert.equal(elements.has('docsA'),false);
  const context={document:{getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[]},window:{addEventListener(){}},localStorage:{getItem:()=>null},setTimeout(){},console};
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script,context);
  for(const role of ['client','admin']){
   context.setRole(role);
   const process=elements.get('processList').innerHTML;
   assert.equal((process.match(/class="process-row /g)||[]).length,15);
   assert.match(process,/CDSCO 인허가 완료/);
   assert.ok(elements.get('docsA').innerHTML.length>0);
   assert.ok(elements.get('docsB').innerHTML.length>0);
   assert.equal(process.includes('step-complete'),role==='admin');
  }
 }
});
test('operations filters tables and chart together and clears other company data on role changes',()=>{
 const elements=new Map();
 const el=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',value:id==='operationsCompany'?'all':id==='operationsMonth'?'2026-09':'',classList:{toggle(){},add(){},remove(){}},addEventListener(){}});
  return elements.get(id);
 };
 const context={document:{getElementById:el,querySelectorAll:()=>[]},window:{},currentRole:'admin'};
 vm.runInNewContext(fs.readFileSync('operations.js','utf8'),context);
 context.window.openOperations('distribution');
 assert.match(el('inventoryRows').innerHTML,/SOME BY MI/);
 assert.match(el('inventoryRows').innerHTML,/COSMELAB/);
 assert.match(el('inventoryChart').innerHTML,/3,601/);
 el('operationsCompany').value='cosmelab';context.window.renderOperations();
 assert.doesNotMatch(el('inventoryRows').innerHTML,/SOME BY MI/);
 assert.match(el('inventoryChart').innerHTML,/961/);
 context.window.openOperations('marketing');
 assert.match(el('marketingRows').innerHTML,/크리에이터 C/);
 assert.doesNotMatch(el('marketingRows').innerHTML,/크리에이터 A/);
 context.currentRole='client';context.window.renderOperations();
 assert.doesNotMatch(el('inventoryRows').innerHTML,/COSMELAB/);
 assert.doesNotMatch(el('marketingRows').innerHTML,/크리에이터 C/);
 assert.match(el('marketingRows').innerHTML,/크리에이터 A/);
 assert.match(el('inventoryChart').innerHTML,/2,640/);
 el('operationsCompany').value='cosmelab';context.window.renderOperations();
 assert.doesNotMatch(el('inventoryRows').innerHTML,/COSMELAB/);
 el('operationsMonth').value='2026-07';context.window.renderOperations();
 assert.match(el('inventoryChart').innerHTML,/데이터가 없습니다/);
 assert.match(el('marketingRows').innerHTML,/발송 내역이 없습니다/);
 assert.equal(el('inventoryTotals').innerHTML,'');
});
