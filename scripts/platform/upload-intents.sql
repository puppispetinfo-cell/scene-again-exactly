create table rivton_private.media_upload_intents(path text primary key,owner_id uuid not null references auth.users(id),state text not null default 'pending' check(state in('pending','processing')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '2 hours');
alter table rivton_private.media_upload_intents enable row level security;
create index media_intent_quota on rivton_private.media_upload_intents(owner_id,created_at);
create function rivton_private.prepare_upload()returns text language plpgsql security definer set search_path='' as $$declare path text;begin
if auth.uid() is null or coalesce(rivton_private.member_role(),'')not in('owner','editor','agent')then raise exception 'Not authorized' using errcode='42501';end if;
perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
if(select count(*)from rivton_private.media_upload_intents where owner_id=auth.uid()and created_at>now()-interval '1 day')>=200 then raise exception 'Daily upload limit';end if;
delete from rivton_private.media_upload_intents where owner_id=auth.uid()and created_at<now()-interval '7 days';
path=auth.uid()::text||'/'||gen_random_uuid()::text;insert into rivton_private.media_upload_intents(path,owner_id)values(path,auth.uid());return path;end$$;
revoke all on function rivton_private.prepare_upload()from public,anon,authenticated;grant execute on function rivton_private.prepare_upload()to authenticated;
create function public.prepare_upload()returns text language sql security invoker set search_path='' as $$select rivton_private.prepare_upload()$$;
revoke all on function public.prepare_upload()from public,anon,authenticated;grant execute on function public.prepare_upload()to authenticated;
create function rivton_private.upload_allowed(p_path text)returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from rivton_private.media_upload_intents where path=p_path and owner_id=auth.uid()and expires_at>now()and state='pending')$$;
revoke all on function rivton_private.upload_allowed(text)from public,anon,authenticated;grant execute on function rivton_private.upload_allowed(text)to authenticated;
create function rivton_private.claim_upload(p_path text)returns boolean language plpgsql security definer set search_path='' as $$begin
if auth.uid()is null or coalesce(rivton_private.member_role(),'')not in('owner','editor','agent')then return false;end if;
update rivton_private.media_upload_intents set state='processing'where path=p_path and owner_id=auth.uid()and state='pending'and expires_at>now();return found;end$$;
revoke all on function rivton_private.claim_upload(text)from public,anon,authenticated;grant execute on function rivton_private.claim_upload(text)to authenticated;
create function public.claim_upload(p_path text)returns boolean language sql security invoker set search_path='' as $$select rivton_private.claim_upload(p_path)$$;
revoke all on function public.claim_upload(text)from public,anon,authenticated;grant execute on function public.claim_upload(text)to authenticated;
