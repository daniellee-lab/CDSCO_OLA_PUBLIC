-- Run once in the Supabase SQL editor on a new project.
begin;
create table public.company_members (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 full_name text not null check (length(trim(full_name)) between 1 and 100),
 phone text not null check (phone ~ '^[0-9+() -]{8,25}$'),
 company_name text not null check (length(trim(company_name)) between 1 and 200),
 business_number text not null check (business_number ~ '^[0-9]{10}$'),
 role text not null default 'client' check (role in ('client','admin')),
 status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
 review_note text not null default '' check (length(review_note) <= 1000),
 reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.company_members enable row level security;
create function public.is_company_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.company_members where id=auth.uid() and role='admin' and status='approved');
$$;
revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated;
revoke all on public.company_members from anon, authenticated;
grant select on public.company_members to authenticated;
create policy member_read on public.company_members for select to authenticated using (id=auth.uid() or public.is_company_admin());
create function public.register_company_member() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.company_members(id,email,full_name,phone,company_name,business_number)
 values(new.id,new.email,trim(new.raw_user_meta_data->>'full_name'),trim(new.raw_user_meta_data->>'phone'),trim(new.raw_user_meta_data->>'company_name'),regexp_replace(new.raw_user_meta_data->>'business_number','[^0-9]','','g'));
 return new;
end;
$$;
revoke all on function public.register_company_member() from public,anon,authenticated;
create trigger on_company_signup after insert on auth.users for each row execute function public.register_company_member();
create table public.member_audit (
 id bigint generated always as identity primary key,
 member_id uuid not null references public.company_members(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 old_status text not null,new_status text not null,note text not null,
 created_at timestamptz not null default now()
);
alter table public.member_audit enable row level security;
revoke all on public.member_audit from anon,authenticated;
grant select on public.member_audit to authenticated;
create policy admin_audit_read on public.member_audit for select to authenticated using(public.is_company_admin());
create function public.review_company_member(member_id uuid,new_status text,note text) returns void language plpgsql security definer set search_path = '' as $$
declare previous_status text;
begin
 if not public.is_company_admin() then raise exception '관리자만 처리할 수 있습니다.'; end if;
 if new_status not in ('approved','rejected','suspended') or new_status is null then raise exception '잘못된 상태입니다.'; end if;
 if note is null or length(note)>1000 or (new_status in ('rejected','suspended') and length(trim(note))=0) then raise exception '처리 사유를 입력해 주세요.'; end if;
 select status into previous_status from public.company_members where id=member_id and role='client' for update;
 if not found then raise exception '처리할 업체 계정이 없습니다.'; end if;
 if previous_status=new_status then raise exception '이미 처리된 상태입니다.'; end if;
 update public.company_members set status=new_status,review_note=trim(note),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where id=member_id;
 insert into public.member_audit(member_id,actor_id,old_status,new_status,note) values(member_id,auth.uid(),previous_status,new_status,trim(note));
end;
$$;
create function public.edit_company_member(member_id uuid,member_name text,member_phone text,member_company text,member_business_number text) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_company_admin() then raise exception '관리자만 수정할 수 있습니다.'; end if;
 update public.company_members set full_name=trim(member_name),phone=trim(member_phone),company_name=trim(member_company),business_number=regexp_replace(member_business_number,'[^0-9]','','g'),updated_at=now() where id=member_id and role='client';
 if not found then raise exception '수정할 업체 계정이 없습니다.'; end if;
end;
$$;
revoke all on function public.review_company_member(uuid,text,text) from public,anon;
revoke all on function public.edit_company_member(uuid,text,text,text,text) from public,anon;
grant execute on function public.review_company_member(uuid,text,text) to authenticated;
grant execute on function public.edit_company_member(uuid,text,text,text,text) to authenticated;
-- Future project/document tables must use both approval AND ownership in RLS.
create function public.is_approved_company_member() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.company_members where id=auth.uid() and status='approved');
$$;
revoke all on function public.is_approved_company_member() from public,anon;
grant execute on function public.is_approved_company_member() to authenticated;
commit;
