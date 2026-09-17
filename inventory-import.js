/* Excel parsing and validation shared by the browser and tests. */
(function(root){
  'use strict';
  const headers=['SKU','제품명','월초재고','입고수량','판매량','시딩수량','파손 수량','월말재고'];
  const fields=['opening','received','sold','seeding','damaged'];
  const normalize=value=>String(value??'').replace(/\s/g,'').toLowerCase();
  const closing=row=>row.opening+row.received-row.sold-row.seeding-row.damaged;
  function quantity(value,row,label){
    const text=String(value??'').trim();
    if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text))throw Error(`${row}행 ${label}: 0 이상의 정수를 입력해 주세요.`);
    const number=Number(text.replace(/,/g,''));
    if(!Number.isSafeInteger(number)||number>1000000000)throw Error(`${row}행 ${label}: 수량이 너무 큽니다.`);
    return number;
  }
  function parse(sheet,XLSX,company,month,companyName){
    if(!company||company==='all')throw Error('업로드할 고객사를 먼저 선택해 주세요.');
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('조회 월을 선택해 주세요.');
    const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
    if(range.e.r>10000||range.e.c>100)throw Error('시트는 최대 10,000행, 101열까지 지원합니다.');
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,blankrows:true});
    const first=rows.findIndex(row=>row.some(value=>String(value).trim()));
    if(first<0)throw Error('빈 시트입니다.');
    const titles=rows[first].map(normalize);
    const indices=headers.map(title=>titles.indexOf(normalize(title)));
    const missing=headers.filter((_,i)=>indices[i]<0);
    if(missing.length)throw Error(`필수 열이 없습니다: ${missing.join(', ')}. 양식을 다운로드해 주세요.`);
    if(headers.some(title=>titles.filter(t=>t===normalize(title)).length!==1))throw Error('중복된 열 제목이 있습니다.');
    const companyIndex=titles.indexOf(normalize('고객사'));
    const seen=new Set(), result=[];
    rows.slice(first+1).forEach((cells,index)=>{
      const line=range.s.r+first+index+2;
      if(cells.every(value=>!String(value).trim()))return;
      const sku=String(cells[indices[0]]??'').trim(), product=String(cells[indices[1]]??'').trim();
      if(!sku||!product)throw Error(`${line}행: SKU와 제품명을 모두 입력해 주세요.`);
      if(sku.length>100||product.length>300)throw Error(`${line}행: SKU 또는 제품명이 너무 깁니다.`);
      if(seen.has(sku))throw Error(`${line}행: SKU ${sku}가 중복되었습니다.`);
      seen.add(sku);
      if(companyIndex>=0&&normalize(cells[companyIndex])!==normalize(companyName)&&normalize(cells[companyIndex])!==normalize(company))throw Error(`${line}행: 고객사가 선택한 ${companyName}와 다릅니다.`);
      const row={company,month,sku,product};
      fields.forEach((field,i)=>row[field]=quantity(cells[indices[i+2]],line,headers[i+2]));
      const balance=closing(row);
      if(balance<0)throw Error(`${line}행: 판매·시딩·파손 수량이 보유 재고보다 많습니다.`);
      const provided=cells[indices[7]];
      if(String(provided??'').trim()&&quantity(provided,line,'월말재고')!==balance)throw Error(`${line}행: 월말재고가 계산값 ${balance.toLocaleString('ko-KR')}과 다릅니다.`);
      result.push(row);
    });
    if(!result.length)throw Error('반영할 재고 행이 없습니다.');
    return result;
  }
  root.InventoryImport={headers,parse,closing};
})(typeof module==='object'&&module.exports?module.exports:window);
