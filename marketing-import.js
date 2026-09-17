(function(root){
  'use strict';
  const headers=['인플루언서명','플랫폼','프로필 URL','티어','팔로워 수','인게이지먼트','발송수량','발송일','콘텐츠 링크'];
  const fields=['name','platform','profile','tier','followers','engagement','quantity','date','content'];
  const norm=value=>String(value??'').replace(/\s/g,'').toLowerCase();
  function validate(input,company,month){
    const row={company};
    for(const key of ['name','platform','profile','tier','content'])row[key]=String(input[key]??'').trim();
    if(!row.name||!row.platform||!row.tier)throw Error('인플루언서명, 플랫폼, 티어를 입력해 주세요.');
    if([row.name,row.platform,row.tier].some(v=>v.length>200))throw Error('이름, 플랫폼, 티어는 200자 이하로 입력해 주세요.');
    for(const key of ['profile','content']){
      if(key==='content'&&!row[key])continue;
      try{const url=new URL(row[key]);if(!['http:','https:'].includes(url.protocol))throw Error();}catch{throw Error('프로필 URL과 콘텐츠 링크는 http 또는 https 주소를 입력해 주세요.');}
    }
    for(const key of ['followers','quantity']){
      const text=String(input[key]??'').trim();
      if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text))throw Error('팔로워 수와 발송수량은 0 이상의 정수를 입력해 주세요.');
      row[key]=Number(text.replace(/,/g,''));
      if(!Number.isSafeInteger(row[key])||row[key]>1000000000)throw Error('팔로워 수 또는 발송수량이 너무 큽니다.');
    }
    const engagement=String(input.engagement??'').trim().replace(/%$/,'');
    if(!/^\d+(\.\d+)?$/.test(engagement)||Number(engagement)>100)throw Error('인게이지먼트는 0~100 사이의 백분율을 입력해 주세요.');
    row.engagement=Number(engagement);
    const date=String(input.date??'').trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw Error('발송일은 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.');
    if(date.slice(0,7)!==month)throw Error('발송일이 선택한 조회 월과 다릅니다.');
    row.date=date;
    return row;
  }
  function parse(sheet,XLSX,company,month,companyName){
    const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
    if(range.e.r>10000||range.e.c>100)throw Error('시트는 최대 10,000행, 101열까지 지원합니다.');
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false,dateNF:'yyyy-mm-dd',blankrows:true});
    const first=rows.findIndex(row=>row.some(v=>String(v).trim()));
    if(first<0)throw Error('빈 시트입니다.');
    const titles=rows[first].map(norm);
    const indices=headers.map(h=>titles.indexOf(norm(h)));
    if(indices.some(i=>i<0))throw Error(`필수 열이 없습니다: ${headers.filter((_,i)=>indices[i]<0).join(', ')}`);
    if(headers.some(h=>titles.filter(t=>t===norm(h)).length!==1))throw Error('중복된 열 제목이 있습니다.');
    const companyIndex=titles.indexOf(norm('고객사'));
    const seen=new Set(),result=[];
    rows.slice(first+1).forEach((cells,index)=>{
      if(cells.every(v=>!String(v).trim()))return;
      try{
        if(companyIndex>=0&&![norm(company),norm(companyName)].includes(norm(cells[companyIndex])))throw Error('고객사가 선택한 고객사와 다릅니다.');
        const input=Object.fromEntries(fields.map((key,i)=>[key,cells[indices[i]]]));
        // Excel numeric date cells may have locale-specific display formatting.
        const dateCell=sheet[XLSX.utils.encode_cell({r:range.s.r+first+index+1,c:range.s.c+indices[7]})];
        if(dateCell?.t==='n'){
          const date=XLSX.SSF.parse_date_code(dateCell.v);
          if(!date)throw Error('발송일을 확인해 주세요.');
          input.date=`${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
        }
        const row=validate(input,company,month);
        const key=[row.platform,row.profile,row.date].join('|');
        if(seen.has(key))throw Error('동일 플랫폼·프로필·발송일의 중복 행입니다.');
        seen.add(key);result.push(row);
      }catch(error){throw Error(`${range.s.r+first+index+2}행: ${error.message}`);}
    });
    if(!result.length)throw Error('반영할 인플루언서 행이 없습니다.');
    return result;
  }
  root.MarketingImport={headers,fields,validate,parse};
})(typeof module==='object'&&module.exports?module.exports:window);
