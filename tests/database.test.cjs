// Run with NODE_PATH pointing to an installation of @electric-sql/pglite.
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create schema auth;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 grant execute on function auth.uid() to authenticated;`);
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));
 const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003'];
 for(const [i,id] of ids.entries())await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,`user${i}@example.test`,JSON.stringify({full_name:'테스트',phone:'010-1234-5678',company_name:'Company '+i,business_number:'1234567890',role:'admin',status:'approved'})]);
 assert.equal((await db.query('select count(*)::int n from public.company_members where role=\'client\' and status=\'pending\'')).rows[0].n,3,'signup metadata cannot grant privileges');
 await db.query("update public.company_members set role='admin',status='approved' where id=$1",[ids[0]]);
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 await as(ids[1]);
 assert.equal((await db.query('select * from public.company_members')).rows.length,1,'clients see only themselves');
 await assert.rejects(db.query("update public.company_members set status='approved'"),/permission denied/);
 await assert.rejects(db.query("select public.review_company_member($1,'approved','')",[ids[1]]),/관리자/);
 await assert.rejects(db.query("select public.edit_company_member($1,'X','01012345678','X','1234567890')",[ids[1]]),/관리자/);
 assert.equal((await db.query('select public.is_approved_company_member() allowed')).rows[0].allowed,false);
 await as(ids[0]);
 assert.equal((await db.query('select * from public.company_members')).rows.length,3);
 await db.query("select public.review_company_member($1,'approved','확인 완료')",[ids[1]]);
 await db.query("select public.edit_company_member($1,'변경 담당자','01012345678','변경 회사','123-45-67890')",[ids[1]]);
 assert.equal((await db.query('select count(*)::int n from public.member_audit')).rows[0].n,1);
 await assert.rejects(db.query("select public.review_company_member($1,'suspended','')",[ids[1]]),/사유/);
 await assert.rejects(db.query("select public.review_company_member($1,'approved','')",[ids[0]]),/업체 계정/);
 await as(ids[1]);
 assert.equal((await db.query('select public.is_approved_company_member() allowed')).rows[0].allowed,true);
 assert.equal((await db.query('select * from public.company_members')).rows.length,1);
 assert.equal((await db.query('select * from public.member_audit')).rows.length,0);
 await as(ids[0]);await db.query("select public.review_company_member($1,'suspended','계약 종료')",[ids[1]]);
 await as(ids[1]);assert.equal((await db.query('select public.is_approved_company_member() allowed')).rows[0].allowed,false);
 await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from public.company_members'),/permission denied/);
 await db.close();console.log('PASS: signup privilege injection, tenant isolation, admin-only mutations, approval, suspension, audit, anonymous access');
})().catch(e=>{console.error(e);process.exitCode=1;});
