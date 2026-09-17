-- schema.sql 실행 및 아래 이메일의 가입/이메일 인증 완료 후
-- Supabase SQL Editor에서 운영자가 한 번 실행합니다.
-- 브라우저에서는 실행하지 않습니다.
do $$
declare promoted_id uuid;
begin
  update public.company_members m
  set role = 'admin', status = 'approved', updated_at = now()
  from auth.users u
  where m.id = u.id
    and lower(u.email) = lower('daniellee@olacorporation.com')
    and u.email_confirmed_at is not null
  returning m.id into promoted_id;

  if promoted_id is null then
    raise exception 'daniellee@olacorporation.com 계정의 회원가입 및 이메일 인증을 먼저 완료해 주세요.';
  end if;
end;
$$;
