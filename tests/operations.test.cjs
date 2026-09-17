const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const XLSX=require('../assets/vendor/xlsx.full.min.js');
const {InventoryImport}=require('../inventory-import.js');
const {MarketingImport}=require('../marketing-import.js');
const stock=['NEW-001','신규 제품',100,50,20,5,2,123];
function sheet(headers,rows){return XLSX.utils.aoa_to_sheet([headers,...rows]);}
function excel(headers,rows,type='xlsx',extra=false){
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet(headers,rows),'업로드');
 if(extra)XLSX.utils.book_append_sheet(book,sheet(headers,rows),'두 번째');
 const bytes=XLSX.write(book,{bookType:type,type:'buffer'});
 return {name:'재고.'+type,size:bytes.length,arrayBuffer:async()=>bytes};
}
function fixture(saved=new Map()){
 const elements=new Map();
 const el=id=>{
  if(!elements.has(id)){
   const handlers={},classes=new Set();
   elements.set(id,{innerHTML:'',textContent:'',value:id==='operationsCompany'?'somebymi':id==='operationsMonth'?'2026-09':'',open:false,
    classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v),contains:v=>classes.has(v)},
    addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn);},
    async fire(type,event={}){for(const fn of handlers[type]||[])await fn({preventDefault(){},...event});},
    showModal(){this.open=true;},close(){this.open=false;},click(){}
   });
  }return elements.get(id);
 };
 const context={currentRole:'admin',window:{XLSX,InventoryImport,MarketingImport},document:{getElementById:el,querySelectorAll:()=>[]},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},console};
 vm.runInNewContext(fs.readFileSync('operations.js','utf8'),context);
 return {el,context,saved,render:()=>context.window.renderOperations(),upload:async(prefix,file)=>el(prefix+'File').fire('change',{target:{files:[file]}})};
}
test('actual xlsx and xls import handles both workbook formats',async()=>{
 for(const type of ['xlsx','xls']){
  const file=excel(InventoryImport.headers,[stock],type);
  await file.arrayBuffer().then(bytes=>{
   const book=XLSX.read(bytes,{type:'buffer'});
   const rows=InventoryImport.parse(book.Sheets['업로드'],XLSX,'somebymi','2026-09','SOME BY MI');
   assert.equal(rows[0].sold,20);assert.equal(InventoryImport.closing(rows[0]),123);
  });
 }
});
test('stock validation rejects duplicate SKU, wrong balance, wrong tenant and partial invalid rows',()=>{
 const parse=rows=>InventoryImport.parse(sheet(InventoryImport.headers,rows),XLSX,'somebymi','2026-09','SOME BY MI');
 assert.throws(()=>parse([stock,stock]),/중복/);
 assert.throws(()=>parse([[...stock.slice(0,7),999]]),/계산값/);
 assert.throws(()=>parse([stock,['BAD','제품',-1,0,0,0,0,0]]),/3행/);
 assert.throws(()=>InventoryImport.parse(sheet(['고객사',...InventoryImport.headers],[['COSMELAB',...stock]]),XLSX,'somebymi','2026-09','SOME BY MI'),/고객사/);
 const blank=[...stock];blank[7]='';assert.equal(InventoryImport.closing(parse([blank])[0]),123);
 const reordered=sheet([...InventoryImport.headers].reverse(),[[...stock].reverse()]);
 assert.equal(InventoryImport.parse(reordered,XLSX,'somebymi','2026-09','SOME BY MI')[0].sku,'NEW-001');
});
test('upload replaces only selected tenant/month, refreshes chart, survives reload, rejects invalid file atomically',async()=>{
 const f=fixture();await f.upload('inventory',excel(InventoryImport.headers,[stock]));
 assert.match(f.el('inventoryRows').innerHTML,/NEW-001/);assert.doesNotMatch(f.el('inventoryRows').innerHTML,/SBM-001/);
 assert.match(f.el('inventoryChart').innerHTML,/>123</);
 const before=f.el('inventoryRows').innerHTML;
 await f.upload('inventory',excel(InventoryImport.headers,[stock,stock]));
 assert.equal(f.el('inventoryRows').innerHTML,before);assert.match(f.el('inventoryUploadStatus').textContent,/중복/);
 f.el('operationsCompany').value='cosmelab';f.render();assert.match(f.el('inventoryRows').innerHTML,/COS-001/);
 f.el('operationsCompany').value='somebymi';f.el('operationsMonth').value='2026-08';f.render();assert.match(f.el('inventoryRows').innerHTML,/SBM-001/);
 const reloaded=fixture(f.saved);assert.match(reloaded.el('inventoryRows').innerHTML,/NEW-001/);
});
test('inventory manual edit updates balance/chart and customer mode cannot edit or upload',async()=>{
 const f=fixture();
 await f.el('inventoryRows').fire('click',{target:{closest:()=>({dataset:{editInventory:'0'}})}});
 assert.equal(f.el('inventoryEditDialog').open,true);
 f.el('inventoryEdit-sold').value='100';await f.el('inventoryEditForm').fire('submit');
 assert.match(f.el('inventoryRows').innerHTML,/>1,555</);
 assert.match(f.el('inventoryChart').innerHTML,/>2,960</);
 f.context.currentRole='client';f.render();
 assert.doesNotMatch(f.el('inventoryRows').innerHTML,/data-edit-inventory/);
 assert.doesNotMatch(f.el('marketingRows').innerHTML,/data-edit-campaign/);
 const before=f.el('inventoryRows').innerHTML;
 await f.upload('inventory',excel(InventoryImport.headers,[stock]));
 assert.equal(f.el('inventoryRows').innerHTML,before);assert.match(f.el('inventoryUploadStatus').textContent,/어드민/);
});
const creator=['수정 대상','Instagram','https://example.com/new','Micro',10000,'4.5%',4,'2026-09-10',''];
test('marketing upload and manual editing persist and enforce dates and safe URLs',async()=>{
 const f=fixture();await f.upload('marketing',excel(MarketingImport.headers,[creator]));
 assert.match(f.el('marketingRows').innerHTML,/수정 대상/);assert.match(f.el('marketingRows').innerHTML,/4.5%/);
 const match=f.el('marketingRows').innerHTML.match(/data-edit-campaign="(\d+)"/);
 await f.el('marketingRows').fire('click',{target:{closest:()=>({dataset:{editCampaign:match[1]}})}});
 f.el('marketingEdit-name').value='변경 완료';f.el('marketingEdit-quantity').value='8';
 await f.el('marketingEditForm').fire('submit');
 assert.match(f.el('marketingRows').innerHTML,/변경 완료/);assert.match(f.el('marketingCount').textContent,/8개/);
 assert.match(fixture(f.saved).el('marketingRows').innerHTML,/변경 완료/);
 const bad=[...creator];bad[7]='2026-08-10';
 await f.upload('marketing',excel(MarketingImport.headers,[bad]));assert.match(f.el('marketingUploadStatus').textContent,/조회 월/);assert.match(f.el('marketingRows').innerHTML,/변경 완료/);
 bad[7]='2026-09-10';bad[2]='javascript:alert(1)';
 await f.upload('marketing',excel(MarketingImport.headers,[bad]));assert.match(f.el('marketingUploadStatus').textContent,/https/);
});
test('multi-sheet files wait for sheet selection and storage failure preserves current rows',async()=>{
 const f=fixture();const before=f.el('inventoryRows').innerHTML;
 await f.upload('inventory',excel(InventoryImport.headers,[stock],'xlsx',true));
 assert.equal(f.el('inventoryRows').innerHTML,before);assert.match(f.el('inventoryUploadStatus').textContent,/여러 개/);
 f.el('inventorySheet').value='두 번째';await f.el('inventoryApplySheet').fire('click');assert.match(f.el('inventoryRows').innerHTML,/NEW-001/);
 const saved=f.el('inventoryRows').innerHTML;f.context.localStorage.setItem=()=>{throw Error('quota');};
 await f.upload('inventory',excel(InventoryImport.headers,[[...stock.slice(0,2),200,50,20,5,2,223]]));
 assert.equal(f.el('inventoryRows').innerHTML,saved);assert.match(f.el('inventoryUploadStatus').textContent,/저장하지 못/);
});
