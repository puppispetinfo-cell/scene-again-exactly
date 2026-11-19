-- Explicit grants remain secure even on projects with permissive historical default grants.
alter default privileges in schema public revoke all on tables from anon,authenticated;
alter default privileges in schema public revoke all on sequences from anon,authenticated;
alter default privileges in schema public revoke all on functions from public,anon,authenticated;
-- Independent installation. Drafts, published documents and PII have separate tables.
create schema if not exists rivton_private;
revoke all on schema rivton_private from public;
grant usage on schema rivton_private to authenticated;
create table public.platform_members(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in ('owner','editor','agent','analyst')),active boolean not null default true);
alter table public.platform_members enable row level security;
create function rivton_private.member_role() returns text language sql stable security definer set search_path='' as $$select role from public.platform_members where user_id=(select auth.uid()) and active$$;
revoke all on function rivton_private.member_role() from public;
grant execute on function rivton_private.member_role() to authenticated;
create policy member_self on public.platform_members for select to authenticated using(user_id=(select auth.uid()));
grant select on public.platform_members to authenticated;

create table public.content_drafts(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('property','page','settings','form','marketing','team')),slug text not null,document jsonb not null check(jsonb_typeof(document)='object' and octet_length(document::text)<=262144),revision integer not null default 1,status text not null default 'draft' check(status in ('draft','published','archived')),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),unique(kind,slug));
create table public.published_content(id uuid primary key references public.content_drafts(id) on delete restrict,kind text not null,slug text not null,document jsonb not null,revision integer not null,published_at timestamptz not null default now(),unique(kind,slug));
create table public.content_revisions(id bigint generated always as identity primary key,resource_id uuid not null references public.content_drafts(id),revision integer not null,document jsonb not null,status text not null,created_at timestamptz not null default now(),actor uuid references auth.users(id),unique(resource_id,revision));
create table public.catalog_entries(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('type','operation','attribute')),slug text not null,label text not null check(length(label) between 1 and 300),active boolean not null default true,sort_order integer not null default 0,definition jsonb not null default '{}'::jsonb,revision integer not null default 1,unique(kind,slug));
create table public.property_catalog_refs(property_id uuid not null references public.content_drafts(id),catalog_id uuid not null references public.catalog_entries(id) on delete restrict,primary key(property_id,catalog_id));
create table public.media_assets(id uuid primary key default gen_random_uuid(),object_path text not null unique,hash text not null,alt text not null default '',width integer not null check(width between 1 and 20000),height integer not null check(height between 1 and 20000),bytes integer not null check(bytes between 1 and 10485760),created_by uuid references auth.users(id),created_at timestamptz not null default now(),unique(hash,created_by));
create table public.media_references(resource_id uuid not null references public.content_drafts(id),media_id uuid not null references public.media_assets(id) on delete restrict,published boolean not null default false,primary key(resource_id,media_id));
create table public.leads(id uuid primary key default gen_random_uuid(),form_id uuid not null references public.content_drafts(id),property_id uuid references public.content_drafts(id),answers jsonb not null,status text not null default 'new' check(status in ('new','contacted','following','closed','discarded')),notes text not null default '',source_path text not null default '/',campaign jsonb not null default '{}',idempotency_key uuid not null unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.audit_events(id bigint generated always as identity primary key,resource_id uuid,actor uuid references auth.users(id),action text not null,details jsonb not null default '{}',created_at timestamptz not null default now());
create table public.georef_cache(id text primary key,kind text not null check(kind in ('province','city')),parent_id text,name text not null,normalized_name text not null,updated_at timestamptz not null default now());
create unique index property_code_unique on public.content_drafts(lower(document->>'code')) where kind='property' and coalesce(document->>'code','')<>'';
create index content_drafts_updated on public.content_drafts(kind,updated_at desc);
create index published_kind_date on public.published_content(kind,published_at desc);
create index revision_history on public.content_revisions(resource_id,created_at desc);
create index leads_status_date on public.leads(status,created_at desc);
create index media_reference_lookup on public.media_references(media_id,published);
create index georef_parent_search on public.georef_cache(parent_id,normalized_name);

create function rivton_private.can_edit(k text,publish boolean default false) returns boolean language sql stable security definer set search_path='' as $$select case when rivton_private.member_role()='owner' then true when rivton_private.member_role()='editor' then k not in ('settings','marketing') when rivton_private.member_role()='agent' then k in ('property','lead') and not publish else false end$$;
revoke all on function rivton_private.can_edit(text,boolean) from public;
grant execute on function rivton_private.can_edit(text,boolean) to authenticated;
-- RLS is a data boundary, independent of menu visibility. No anonymous access to drafts/history/leads.
alter table public.content_drafts enable row level security;
alter table public.published_content enable row level security;
alter table public.content_revisions enable row level security;
alter table public.catalog_entries enable row level security;
alter table public.property_catalog_refs enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_references enable row level security;
alter table public.leads enable row level security;
alter table public.audit_events enable row level security;
alter table public.georef_cache enable row level security;
create policy drafts_read on public.content_drafts for select to authenticated using(rivton_private.can_edit(kind,false));
create policy published_read on public.published_content for select to anon,authenticated using(true);
create policy history_read on public.content_revisions for select to authenticated using(exists(select 1 from public.content_drafts d where d.id=resource_id and rivton_private.can_edit(d.kind,false)));
create policy catalogs_read on public.catalog_entries for select to anon,authenticated using(active);
create policy catalogs_admin on public.catalog_entries for select to authenticated using(rivton_private.member_role() in ('owner','editor','agent'));
create policy refs_admin on public.property_catalog_refs for select to authenticated using(rivton_private.can_edit('property',false));
create policy media_admin on public.media_assets for select to authenticated using(rivton_private.member_role() in ('owner','editor','agent'));
create policy media_refs_admin on public.media_references for select to authenticated using(rivton_private.member_role() in ('owner','editor','agent'));
create policy leads_private on public.leads for select to authenticated using(rivton_private.can_edit('lead',false));
create policy audit_admin on public.audit_events for select to authenticated using(rivton_private.member_role()='owner');
create policy georef_read on public.georef_cache for select to anon,authenticated using(true);
grant select on public.published_content,public.catalog_entries,public.georef_cache to anon,authenticated;
grant select on public.content_drafts,public.content_revisions,public.property_catalog_refs,public.media_assets,public.media_references,public.leads,public.audit_events to authenticated;
-- Never grant direct writes: every operation below rechecks permissions, limits and expected revision.
create function rivton_private.save_content(p_id uuid,p_kind text,p_slug text,p_document jsonb,p_expected integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.content_drafts; begin
if not rivton_private.can_edit(p_kind,false) or auth.uid() is null then raise exception 'Not authorized' using errcode='42501';end if;
if p_kind not in ('property','page','settings','form','marketing','team') or length(p_slug)>160 or octet_length(p_document::text)>262144 then raise exception 'Invalid content';end if;
select * into r from public.content_drafts where id=p_id for update;
if found then
if r.kind<>p_kind or r.revision<>p_expected then raise exception 'Revision conflict' using errcode='40001';end if;
update public.content_drafts set slug=p_slug,document=p_document,revision=revision+1,updated_at=now(),updated_by=auth.uid() where id=p_id returning * into r;
else
if p_expected<>0 then raise exception 'Revision conflict' using errcode='40001';end if;
insert into public.content_drafts(id,kind,slug,document,updated_by)values(p_id,p_kind,p_slug,p_document,auth.uid()) returning * into r;
end if;
insert into public.content_revisions(resource_id,revision,document,status,actor)values(r.id,r.revision,r.document,r.status,auth.uid());
insert into public.audit_events(resource_id,actor,action)values(r.id,auth.uid(),'draft_saved');
return to_jsonb(r);end$$;
revoke all on function rivton_private.save_content(uuid,text,text,jsonb,integer) from public;
grant execute on function rivton_private.save_content(uuid,text,text,jsonb,integer) to authenticated;
create function public.save_content(p_id uuid,p_kind text,p_slug text,p_document jsonb,p_expected integer) returns jsonb language sql security invoker set search_path='' as $$select rivton_private.save_content(p_id,p_kind,p_slug,p_document,p_expected)$$;
revoke all on function public.save_content(uuid,text,text,jsonb,integer) from public;grant execute on function public.save_content(uuid,text,text,jsonb,integer) to authenticated;

create table public.content_redirects(path text primary key,target text,status integer not null check(status in(301,410)),resource_id uuid not null references public.content_drafts(id),check(path~'^/[^[:space:]?]*$'),check(target is null or target~'^/[^[:space:]?]*$'));
alter table public.content_redirects enable row level security;
grant select on public.content_redirects to anon,authenticated;
create policy redirects_read on public.content_redirects for select to anon,authenticated using(true);

create function rivton_private.publish_content(p_id uuid,p_expected integer,p_publish boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.content_drafts; d jsonb; m uuid; c uuid; v text; attr record; definition jsonb;old_slug text;old_path text;new_path text;begin
select * into r from public.content_drafts where id=p_id for update;
if not found or auth.uid() is null or not rivton_private.can_edit(r.kind,true) then raise exception 'Not authorized' using errcode='42501';end if;
if r.revision<>p_expected then raise exception 'Revision conflict' using errcode='40001';end if;
d=r.document;
if r.kind in ('property','page')then
select slug into old_slug from public.published_content where id=r.id;
new_path=case when r.kind='property' then '/propiedades/'||r.slug when r.slug='/' then '/' else '/'||r.slug end;
if old_slug is not null then old_path=case when r.kind='property' then '/propiedades/'||old_slug when old_slug='/' then '/' else '/'||old_slug end;end if;
if p_publish then
delete from public.content_redirects where path=new_path;
if old_path is not null and old_path<>new_path then
update public.content_redirects set target=new_path where resource_id=r.id and status=301;
insert into public.content_redirects(path,target,status,resource_id)values(old_path,new_path,301,r.id)on conflict(path)do update set target=excluded.target,status=301;end if;
elsif r.kind='property' then
insert into public.content_redirects(path,target,status,resource_id)values(new_path,null,410,r.id)on conflict(path)do update set target=null,status=410;
end if;end if;
if p_publish then
if r.kind='page'and r.slug in('privacidad','cookies','terminos')and d->>'reviewApproved' is distinct from 'true' then raise exception 'Legal review required';end if;
if coalesce(d->>'title',d->>'name','')='' then raise exception 'Title required';end if;
if r.kind='property' then
if jsonb_array_length(coalesce(d->'images','[]'))<1 or coalesce(d->>'description','')='' or coalesce(d->>'provinceId','')='' or coalesce(d->>'cityId','')='' or r.slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Incomplete property';end if;
if not exists(select 1 from public.catalog_entries where id=(d->>'typeId')::uuid and kind='type' and active) or not exists(select 1 from public.catalog_entries where id=(d->>'operationId')::uuid and kind='operation' and active) then raise exception 'Invalid catalog reference';end if;
delete from public.property_catalog_refs where property_id=r.id;
for c in select (d->>'typeId')::uuid union select(d->>'operationId')::uuid union select key::uuid from jsonb_each(coalesce(d->'attributes','{}')) loop
if not exists(select 1 from public.catalog_entries where id=c and active) then raise exception 'Invalid attribute';end if;
insert into public.property_catalog_refs values(r.id,c) on conflict do nothing;end loop;
if d->'price'<>'null'::jsonb and coalesce((d->'price'->>'amount')::numeric,0)<=0 then raise exception 'Invalid price';end if;
for attr in select key,value from jsonb_each(coalesce(d->'attributes','{}')) loop
select ce.definition into definition from public.catalog_entries ce where ce.id=attr.key::uuid and ce.kind='attribute' and ce.active;
if definition is null or (definition->>'valueType'='boolean' and jsonb_typeof(attr.value)<>'boolean') or (definition->>'valueType'='number' and jsonb_typeof(attr.value)<>'number') or (definition->>'valueType' in ('text','select') and jsonb_typeof(attr.value)<>'string') or (definition->>'valueType'='multiselect' and jsonb_typeof(attr.value)<>'array') then raise exception 'Invalid typed attribute';end if;
end loop;
if coalesce((d->>'publicAddress')::boolean,false)=false then d=jsonb_set(d,'{address}','""');end if;
end if;
if r.kind='form' then d=jsonb_set(d,'{recipient}','""');end if;
-- Only registered processed images may be referenced; server also validates full Zod documents.
delete from public.media_references where resource_id=r.id;
for v in select distinct value from jsonb_path_query(d,'$.** ? (exists(@.src)).id') as x(value) loop
m=trim(both '"' from v)::uuid;
if not exists(select 1 from public.media_assets where id=m) then raise exception 'Missing image';end if;
insert into public.media_references values(r.id,m,true) on conflict do nothing;end loop;
insert into public.published_content(id,kind,slug,document,revision)values(r.id,r.kind,r.slug,d,r.revision)on conflict(id)do update set slug=excluded.slug,document=excluded.document,revision=excluded.revision,published_at=now();
else
delete from public.published_content where id=r.id;
update public.media_references set published=false where resource_id=r.id;
end if;
update public.content_drafts set status=case when p_publish then 'published' else 'archived' end,updated_at=now() where id=r.id;
insert into public.audit_events(resource_id,actor,action)values(r.id,auth.uid(),case when p_publish then 'published' else 'unpublished' end);
return jsonb_build_object('id',r.id,'revision',r.revision);end$$;
revoke all on function rivton_private.publish_content(uuid,integer,boolean) from public;grant execute on function rivton_private.publish_content(uuid,integer,boolean) to authenticated;
create function public.publish_content(p_id uuid,p_expected integer,p_publish boolean default true) returns jsonb language sql security invoker set search_path='' as $$select rivton_private.publish_content(p_id,p_expected,p_publish)$$;
revoke all on function public.publish_content(uuid,integer,boolean) from public;grant execute on function public.publish_content(uuid,integer,boolean) to authenticated;

create function rivton_private.save_catalog(p_id uuid,p_document jsonb,p_expected integer) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.catalog_entries;begin
if auth.uid() is null or coalesce(rivton_private.member_role(),'') not in ('owner','editor') then raise exception 'Not authorized' using errcode='42501';end if;
if not rivton_private.valid_json((select definition from rivton_private.document_schemas where kind='catalog'),p_document)then raise exception 'Invalid catalog';end if;
select * into r from public.catalog_entries where id=p_id for update;
if found and r.revision<>p_expected then raise exception 'Revision conflict' using errcode='40001';end if;
if found and r.slug<>p_document->>'slug' then raise exception 'Existing catalog URLs cannot be changed';end if;
if found and (r.kind<>p_document->>'kind' or p_document->>'active'='false') and exists(select 1 from public.property_catalog_refs where catalog_id=p_id) then raise exception 'Catalog is used by a published property';end if;
insert into public.catalog_entries(id,kind,slug,label,active,sort_order,definition)values(p_id,p_document->>'kind',p_document->>'slug',p_document->>'label',(p_document->>'active')::boolean,(p_document->>'order')::int,p_document)on conflict(id)do update set slug=excluded.slug,label=excluded.label,active=excluded.active,sort_order=excluded.sort_order,definition=excluded.definition,revision=public.catalog_entries.revision+1;
insert into public.audit_events(resource_id,actor,action)values(p_id,auth.uid(),'catalog_saved');return p_id;end$$;
revoke all on function rivton_private.save_catalog(uuid,jsonb,integer) from public;grant execute on function rivton_private.save_catalog(uuid,jsonb,integer) to authenticated;
create function public.save_catalog(p_id uuid,p_document jsonb,p_expected integer) returns uuid language sql security invoker set search_path='' as $$select rivton_private.save_catalog(p_id,p_document,p_expected)$$;
revoke all on function public.save_catalog(uuid,jsonb,integer) from public;grant execute on function public.save_catalog(uuid,jsonb,integer) to authenticated;

create function rivton_private.update_lead(p_id uuid,p_status text,p_notes text) returns void language plpgsql security definer set search_path='' as $$begin
if auth.uid() is null or not rivton_private.can_edit('lead',false) then raise exception 'Not authorized' using errcode='42501';end if;
if length(p_notes)>10000 then raise exception 'Notes too long';end if;
update public.leads set status=p_status,notes=p_notes,updated_at=now() where id=p_id;
if not found then raise exception 'Not found';end if;
insert into public.audit_events(resource_id,actor,action)values(p_id,auth.uid(),'lead_updated');end$$;
revoke all on function rivton_private.update_lead(uuid,text,text) from public;grant execute on function rivton_private.update_lead(uuid,text,text) to authenticated;
create function public.update_lead(p_id uuid,p_status text,p_notes text)returns void language sql security invoker set search_path='' as $$select rivton_private.update_lead(p_id,p_status,p_notes)$$;
revoke all on function public.update_lead(uuid,text,text)from public;grant execute on function public.update_lead(uuid,text,text)to authenticated;
create function rivton_private.register_media(p_id uuid,p_path text,p_hash text,p_alt text,p_width integer,p_height integer,p_bytes integer)returns jsonb language plpgsql security definer set search_path='' as $$declare r public.media_assets;begin
if auth.uid() is null or coalesce(rivton_private.member_role(),'') not in ('owner','editor','agent') then raise exception 'Not authorized' using errcode='42501';end if;
if p_path<>auth.uid()::text||'/'||p_hash||'.webp' or p_hash!~'^[a-f0-9]{64}$' or length(p_alt)>1000 then raise exception 'Invalid image';end if;
if (select count(*) from public.media_assets where created_by=auth.uid() and created_at>now()-interval '1 day')>=200 then raise exception 'Daily media limit';end if;
insert into public.media_assets(id,object_path,hash,alt,width,height,bytes,created_by)values(p_id,p_path,p_hash,p_alt,p_width,p_height,p_bytes,auth.uid())on conflict(hash,created_by)do update set alt=excluded.alt returning * into r;
return jsonb_build_object('id',r.id,'src','/api/media/'||r.id,'alt',r.alt,'width',r.width,'height',r.height);end$$;
revoke all on function rivton_private.register_media(uuid,text,text,text,integer,integer,integer)from public;grant execute on function rivton_private.register_media(uuid,text,text,text,integer,integer,integer)to authenticated;
create function public.register_media(p_id uuid,p_path text,p_hash text,p_alt text,p_width integer,p_height integer,p_bytes integer)returns jsonb language sql security invoker set search_path='' as $$select rivton_private.register_media(p_id,p_path,p_hash,p_alt,p_width,p_height,p_bytes)$$;
revoke all on function public.register_media(uuid,text,text,text,integer,integer,integer)from public;grant execute on function public.register_media(uuid,text,text,text,integer,integer,integer)to authenticated;
create function rivton_private.media_visible(p_path text)returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.media_assets m where m.object_path=p_path and (exists(select 1 from public.media_references r where r.media_id=m.id and r.published) or rivton_private.member_role() in ('owner','editor','agent')))$$;
revoke all on function rivton_private.media_visible(text)from public;grant execute on function rivton_private.media_visible(text)to anon,authenticated;grant usage on schema rivton_private to anon;
create function rivton_private.deliver_media(p_id uuid)returns text language sql stable security definer set search_path='' as $$select object_path from public.media_assets m where m.id=p_id and rivton_private.media_visible(m.object_path)$$;
revoke all on function rivton_private.deliver_media(uuid)from public;grant execute on function rivton_private.deliver_media(uuid)to anon,authenticated;
create function public.deliver_media(p_id uuid)returns text language sql security invoker set search_path='' as $$select rivton_private.deliver_media(p_id)$$;
revoke all on function public.deliver_media(uuid)from public;grant execute on function public.deliver_media(uuid)to anon,authenticated;
-- Public submissions are deliberately separate from authenticated administrative writes.
create table rivton_private.submission_limits(bucket text primary key,attempts integer not null,expires_at timestamptz not null);
alter table rivton_private.submission_limits enable row level security;
create function rivton_private.submit_form(p_form uuid,p_answers jsonb,p_key uuid,p_property uuid,p_path text)returns jsonb language plpgsql security definer set search_path='' as $$
declare f jsonb;field jsonb;v jsonb;key text;count_now integer;lead_id uuid;existing public.leads;begin
if octet_length(p_answers::text)>8192 or jsonb_typeof(p_answers)<>'object' or length(p_path)>300 or p_path!~'^/[^?]*$' then raise exception 'Invalid submission';end if;
select document into f from public.published_content where id=p_form and kind='form';
if f is null or f->>'active'<>'true' or f->>'privacyApproved'<>'true' or coalesce(f->>'privacyRevision','')='' then raise exception 'Form unavailable';end if;
if not exists(select 1 from public.published_content where kind='page'and slug='privacidad'and document->>'reviewApproved'='true'and id::text||':'||revision::text=f->>'privacyRevision')then raise exception 'Privacy policy unavailable';end if;
if p_answers->>'consent' is distinct from 'true' then raise exception 'Consent required';end if;
for key in select jsonb_object_keys(p_answers) loop
if not exists(select 1 from jsonb_array_elements(f->'fields') x where x->>'id'=key)then raise exception 'Unknown field';end if;end loop;
for field in select * from jsonb_array_elements(f->'fields') loop
v=p_answers->(field->>'id');
if field->>'required'='true' and (v is null or v='null'::jsonb or v='""'::jsonb or (field->>'type'='consent' and v<>'true'::jsonb)) then raise exception 'Required field';end if;
if v is not null and length(v::text)>2002 then raise exception 'Field too long';end if;
if field->>'type' in ('checkbox','consent') and v is not null and jsonb_typeof(v)<>'boolean' then raise exception 'Invalid boolean';end if;
if field->>'type' not in ('checkbox','consent') and v is not null and jsonb_typeof(v)<>'string' then raise exception 'Invalid text';end if;
if field->>'type'='email' and v is not null and trim(both '"' from v::text)!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email';end if;
end loop;
if p_property is not null and not exists(select 1 from public.published_content where id=p_property and kind='property')then raise exception 'Property unavailable';end if;
select * into existing from public.leads where idempotency_key=p_key;
if found then
if existing.form_id<>p_form or existing.answers<>p_answers then raise exception 'Submission conflict';end if;
return jsonb_build_object('stored',true,'leadId',existing.id,'duplicate',true);end if;
insert into rivton_private.submission_limits(bucket,attempts,expires_at)values(to_char(now(),'YYYY-MM-DD-HH24-MI'),1,now()+interval '1 day')on conflict(bucket)do update set attempts=rivton_private.submission_limits.attempts+1 returning attempts into count_now;
if count_now>20 then raise exception 'Please try later';end if;
delete from rivton_private.submission_limits where expires_at<now();
if f->>'storeLead'='true' then
insert into public.leads(form_id,property_id,answers,idempotency_key,source_path)values(p_form,p_property,p_answers,p_key,p_path) returning id into lead_id;
end if;
return jsonb_build_object('stored',lead_id is not null,'leadId',lead_id,'duplicate',false);end$$;
revoke all on function rivton_private.submit_form(uuid,jsonb,uuid,uuid,text)from public;grant execute on function rivton_private.submit_form(uuid,jsonb,uuid,uuid,text)to anon,authenticated;
create function public.submit_form(p_form uuid,p_answers jsonb,p_key uuid,p_property uuid default null,p_path text default '/')returns jsonb language sql security invoker set search_path='' as $$select rivton_private.submit_form(p_form,p_answers,p_key,p_property,p_path)$$;
revoke all on function public.submit_form(uuid,jsonb,uuid,uuid,text)from public;grant execute on function public.submit_form(uuid,jsonb,uuid,uuid,text)to anon,authenticated;
create function rivton_private.cache_locations(p_province text,p_rows jsonb)returns void language plpgsql security definer set search_path='' as $$declare item jsonb;begin
if auth.uid() is null or coalesce(rivton_private.member_role(),'') not in ('owner','editor','agent')then raise exception 'Not authorized' using errcode='42501';end if;
if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 or (p_province is not null and p_province!~'^[0-9]{2}$')then raise exception 'Invalid location response';end if;
for item in select * from jsonb_array_elements(p_rows)loop
if item->>'id'!~'^[0-9]{2,16}$' or length(item->>'name') not between 1 and 300 then raise exception 'Invalid location';end if;
insert into public.georef_cache(id,kind,parent_id,name,normalized_name)values(item->>'id',case when p_province is null then 'province' else 'city' end,p_province,item->>'name',lower(translate(item->>'name','ÁÉÍÓÚáéíóúÑñ','AEIOUaeiouNn')))on conflict(id)do update set name=excluded.name,normalized_name=excluded.normalized_name,updated_at=now();end loop;end$$;
revoke all on function rivton_private.cache_locations(text,jsonb)from public,anon,authenticated;grant execute on function rivton_private.cache_locations(text,jsonb)to authenticated;
create function public.cache_locations(p_province text,p_rows jsonb)returns void language sql security invoker set search_path='' as $$select rivton_private.cache_locations(p_province,p_rows)$$;
revoke all on function public.cache_locations(text,jsonb)from public,anon,authenticated;grant execute on function public.cache_locations(text,jsonb)to authenticated;

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

-- BEGIN GENERATED DOCUMENT VALIDATION
create table rivton_private.document_schemas(kind text primary key,definition jsonb not null);
alter table rivton_private.document_schemas enable row level security;
create function rivton_private.valid_json(s jsonb,v jsonb,depth integer default 0)returns boolean language plpgsql immutable set search_path='' as $$
declare k text;child jsonb;part jsonb;match boolean;typ text;begin
if depth>32 or v is null then return false;end if;
if s ? 'anyOf' then match=false;for part in select * from jsonb_array_elements(s->'anyOf')loop if rivton_private.valid_json(part,v,depth+1)then match=true;exit;end if;end loop;if not match then return false;end if;end if;
if s ? 'enum' and not exists(select 1 from jsonb_array_elements(s->'enum') x where x=v)then return false;end if;
if s ? 'const' and s->'const'<>v then return false;end if;
typ=jsonb_typeof(v);
if s ? 'type' and s->>'type'<>typ and not(s->>'type'='integer' and typ='number' and (v::text)::numeric=trunc((v::text)::numeric))then return false;end if;
if typ='string' then
k=v#>>'{}'; -- decoded JSON string
if s ? 'maxLength' and length(k)>(s->>'maxLength')::integer then return false;end if;
if s ? 'minLength' and length(k)<(s->>'minLength')::integer then return false;end if;
if s ? 'pattern' and k!~(s->>'pattern') then return false;end if;
-- Explicit protocol safety for URLs is also enforced by the generated field patterns.
end if;
if typ='number' then
if s ? 'minimum' and (v::text)::numeric<(s->>'minimum')::numeric then return false;end if;
if s ? 'maximum' and (v::text)::numeric>(s->>'maximum')::numeric then return false;end if;
if s ? 'exclusiveMinimum' and (v::text)::numeric<=(s->>'exclusiveMinimum')::numeric then return false;end if;
end if;
if typ='array' then
if s ? 'maxItems' and jsonb_array_length(v)>(s->>'maxItems')::integer then return false;end if;
if s ? 'minItems' and jsonb_array_length(v)<(s->>'minItems')::integer then return false;end if;
if s ? 'items' then for child in select * from jsonb_array_elements(v)loop if not rivton_private.valid_json(s->'items',child,depth+1)then return false;end if;end loop;end if;
end if;
if typ='object' then
for k in select jsonb_array_elements_text(coalesce(s->'required','[]'))loop if not v ? k then return false;end if;end loop;
for k,child in select * from jsonb_each(v)loop
if s ? 'propertyNames' and s->'propertyNames' ? 'enum' and not exists(select 1 from jsonb_array_elements_text(s->'propertyNames'->'enum') x where x=k)then return false;end if;
if s->'properties' ? k then if not rivton_private.valid_json(s->'properties'->k,child,depth+1)then return false;end if;
elsif s->'additionalProperties'='false'::jsonb then return false;
elsif jsonb_typeof(s->'additionalProperties')='object' and not rivton_private.valid_json(s->'additionalProperties',child,depth+1)then return false;end if;
end loop;
end if;
return true;end$$;
revoke all on function rivton_private.valid_json(jsonb,jsonb,integer)from public,anon,authenticated;
create function rivton_private.validate_document()returns trigger language plpgsql security definer set search_path='' as $$declare schema jsonb;begin
select definition into schema from rivton_private.document_schemas where kind=new.kind;
if schema is null or not rivton_private.valid_json(schema,new.document)then raise exception 'Document validation failed' using errcode='22023';end if;
return new;end$$;
revoke all on function rivton_private.validate_document()from public,anon,authenticated;
create trigger validate_content_document before insert or update of document on public.content_drafts for each row execute function rivton_private.validate_document();

insert into rivton_private.document_schemas(kind,definition)values('property','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"title":{"default":"","type":"string","maxLength":300},"slug":{"default":"","type":"string","maxLength":150},"code":{"default":"","type":"string","maxLength":40},"typeId":{"default":null,"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"operationId":{"default":null,"anyOf":[{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},{"type":"null"}]},"commercialStatus":{"default":"available","type":"string","enum":["available","reserved","sold","rented","unavailable"]},"featured":{"default":false,"type":"boolean"},"novelty":{"default":false,"type":"boolean"},"summary":{"default":"","type":"string","maxLength":1000},"description":{"default":"","type":"string","maxLength":15000},"provinceId":{"default":"","type":"string","maxLength":30},"province":{"default":"","type":"string","maxLength":300},"cityId":{"default":"","type":"string","maxLength":30},"city":{"default":"","type":"string","maxLength":300},"neighborhood":{"default":"","type":"string","maxLength":300},"address":{"default":"","type":"string","maxLength":300},"publicAddress":{"default":false,"type":"boolean"},"price":{"default":null,"anyOf":[{"type":"object","properties":{"amount":{"type":"number","minimum":0,"maximum":1000000000000},"currency":{"type":"string","enum":["ARS","USD"]}},"required":["amount","currency"],"additionalProperties":false},{"type":"null"}]},"attributes":{"default":{},"type":"object","propertyNames":{"type":"string"},"additionalProperties":{"anyOf":[{"type":"string","maxLength":200},{"type":"number","minimum":0,"maximum":1000000000},{"type":"boolean"},{"maxItems":50,"type":"array","items":{"type":"string","maxLength":100}}]}},"images":{"default":[],"maxItems":60,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false}},"seo":{"default":{"title":"","description":"","index":true,"manual":false},"type":"object","properties":{"title":{"type":"string","maxLength":200},"description":{"type":"string","maxLength":500},"canonical":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"openGraphTitle":{"type":"string","maxLength":200},"openGraphDescription":{"type":"string","maxLength":500},"index":{"type":"boolean"},"manual":{"default":false,"type":"boolean"}},"required":["title","description","index","manual"],"additionalProperties":false}},"required":["title","slug","code","typeId","operationId","commercialStatus","featured","novelty","summary","description","provinceId","province","cityId","city","neighborhood","address","publicAddress","price","attributes","images","seo"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('page','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"title":{"type":"string","maxLength":300},"slug":{"type":"string","pattern":"^(\\/|[a-z0-9]+(?:-[a-z0-9]+)*)$"},"elements":{"maxItems":40,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z0-9-]+$"},"label":{"type":"string","maxLength":300},"title":{"type":"string","maxLength":300},"subtitle":{"type":"string","maxLength":2000},"body":{"type":"string","maxLength":15000},"image":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"mobile":{"default":{},"type":"object","properties":{"title":{"type":"string","maxLength":300},"subtitle":{"type":"string","maxLength":2000},"body":{"type":"string","maxLength":15000},"image":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"focalX":{"type":"number","minimum":0,"maximum":100},"focalY":{"type":"number","minimum":0,"maximum":100}},"additionalProperties":false},"desktop":{"default":{},"type":"object","properties":{"title":{"type":"string","maxLength":300},"subtitle":{"type":"string","maxLength":2000},"body":{"type":"string","maxLength":15000},"image":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"focalX":{"type":"number","minimum":0,"maximum":100},"focalY":{"type":"number","minimum":0,"maximum":100}},"additionalProperties":false},"button":{"type":"object","properties":{"label":{"type":"string","maxLength":300},"href":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"}},"required":["label","href"],"additionalProperties":false},"visible":{"default":true,"type":"boolean"},"propertyIds":{"default":[],"maxItems":20,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"}},"categoryIds":{"default":[],"maxItems":20,"type":"array","items":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"}},"automatic":{"default":true,"type":"boolean"}},"required":["id","label","title","subtitle","body","mobile","desktop","visible","propertyIds","categoryIds","automatic"],"additionalProperties":false}},"reviewApproved":{"default":false,"type":"boolean"},"seo":{"type":"object","properties":{"title":{"type":"string","maxLength":200},"description":{"type":"string","maxLength":500},"canonical":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"openGraphTitle":{"type":"string","maxLength":200},"openGraphDescription":{"type":"string","maxLength":500},"index":{"type":"boolean"},"manual":{"default":false,"type":"boolean"}},"required":["title","description","index","manual"],"additionalProperties":false}},"required":["title","slug","elements","reviewApproved","seo"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('settings','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string","maxLength":300},"whatsapp":{"type":"string","pattern":"^\\d{6,20}$"},"email":{"type":"string","format":"email","pattern":"^(?:[A-Za-z0-9_''+\\-]+\\.)*[A-Za-z0-9_''+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"},"address":{"type":"string","maxLength":300},"hours":{"type":"string","maxLength":300},"instagram":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"temporariesUrl":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"footerText":{"type":"string","maxLength":1000},"presentation":{"type":"string","maxLength":15000},"history":{"type":"string","maxLength":15000},"services":{"type":"array","items":{"type":"string","maxLength":300}},"values":{"type":"array","items":{"type":"string","maxLength":300}},"coverage":{"type":"string","maxLength":300},"logo":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"alternateLogo":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"favicon":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false},"whatsappTemplate":{"type":"string","maxLength":2000},"filters":{"default":[],"maxItems":20,"type":"array","items":{"type":"object","properties":{"key":{"type":"string","pattern":"^[a-zA-Z]+$"},"label":{"type":"string","maxLength":300},"visible":{"type":"boolean"},"order":{"type":"integer","minimum":0,"maximum":100}},"required":["key","label","visible","order"],"additionalProperties":false}},"menu":{"maxItems":20,"type":"array","items":{"type":"object","properties":{"label":{"type":"string","maxLength":300},"href":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"}},"required":["label","href"],"additionalProperties":false}},"theme":{"type":"object","properties":{"colors":{"type":"object","propertyNames":{"type":"string","enum":["primary","secondary","background","foreground","ink","ink-foreground","graphite","sand"]},"additionalProperties":{"type":"string","pattern":"^#[0-9a-f]{6}$"}}},"required":["colors"],"additionalProperties":false}},"required":["name","whatsapp","email","address","hours","instagram","temporariesUrl","footerText","presentation","history","services","values","coverage","whatsappTemplate","filters","menu","theme"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('form','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string","maxLength":300},"active":{"type":"boolean"},"fields":{"maxItems":20,"type":"array","items":{"type":"object","properties":{"id":{"type":"string","pattern":"^[a-z][a-z0-9_]{0,39}$"},"label":{"type":"string","maxLength":300},"type":{"type":"string","enum":["name","email","phone","text","textarea","select","checkbox","consent"]},"required":{"type":"boolean"},"help":{"type":"string","maxLength":500},"options":{"maxItems":100,"type":"array","items":{"type":"string","maxLength":300}}},"required":["id","label","type","required","help","options"],"additionalProperties":false}},"storeLead":{"type":"boolean"},"whatsapp":{"type":"boolean"},"emailEnabled":{"type":"boolean"},"recipient":{"anyOf":[{"type":"string","format":"email","pattern":"^(?:[A-Za-z0-9_''+\\-]+\\.)*[A-Za-z0-9_''+\\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"},{"type":"string","const":""}]},"privacyApproved":{"type":"boolean"},"privacyRevision":{"type":"string","maxLength":100},"successMessage":{"type":"string","maxLength":1000}},"required":["name","active","fields","storeLead","whatsapp","emailEnabled","recipient","privacyApproved","privacyRevision","successMessage"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('marketing','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"default":"Marketing","type":"string","const":"Marketing"},"mode":{"type":"string","enum":["gtm","direct"]},"gtm":{"type":"object","properties":{"enabled":{"type":"boolean"},"id":{"anyOf":[{"type":"string","pattern":"^GTM-[A-Z0-9]+$"},{"type":"string","const":""}]}},"required":["enabled","id"],"additionalProperties":false},"ga4":{"type":"object","properties":{"enabled":{"type":"boolean"},"id":{"anyOf":[{"type":"string","pattern":"^G-[A-Z0-9]+$"},{"type":"string","const":""}]}},"required":["enabled","id"],"additionalProperties":false},"meta":{"type":"object","properties":{"enabled":{"type":"boolean"},"id":{"anyOf":[{"type":"string","pattern":"^\\d{5,30}$"},{"type":"string","const":""}]}},"required":["enabled","id"],"additionalProperties":false},"ads":{"type":"object","properties":{"enabled":{"type":"boolean"},"id":{"anyOf":[{"type":"string","pattern":"^AW-\\d+$"},{"type":"string","const":""}]}},"required":["enabled","id"],"additionalProperties":false},"adsLabels":{"type":"object","propertyNames":{"type":"string","enum":["generate_lead","contact_form_submit","whatsapp_click"]},"additionalProperties":{"type":"string","pattern":"^[A-Za-z0-9_-]{1,100}$"}},"consentRequired":{"type":"boolean","const":true}},"required":["name","mode","gtm","ga4","meta","ads","adsLabels","consentRequired"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('team','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"name":{"type":"string","minLength":1,"maxLength":300},"role":{"type":"string","maxLength":300},"biography":{"type":"string","maxLength":15000},"photo":{"type":"object","properties":{"id":{"type":"string","format":"uuid","pattern":"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"},"src":{"type":"string","maxLength":2048,"pattern":"^(?:\\/(?!\\/)[^\\\\\\x00-\\x20\\x7f]*|https:\\/\\/[^\\/@\\\\\\x00-\\x20\\x7f]+(?:[\\/?#][^\\\\\\x00-\\x20\\x7f]*)?)$"},"alt":{"type":"string","maxLength":1000},"width":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991},"height":{"type":"integer","exclusiveMinimum":0,"maximum":9007199254740991}},"required":["id","src","alt","width","height"],"additionalProperties":false}},"required":["name"],"additionalProperties":false}'::jsonb);
insert into rivton_private.document_schemas(kind,definition)values('catalog','{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"kind":{"type":"string","enum":["type","operation","attribute"]},"label":{"type":"string","minLength":1,"maxLength":300},"slug":{"type":"string","pattern":"^[a-z0-9]+(?:-[a-z0-9]+)*$"},"active":{"type":"boolean"},"order":{"type":"integer","minimum":0,"maximum":9007199254740991},"valueType":{"default":"boolean","type":"string","enum":["number","boolean","text","select","multiselect"]},"options":{"default":[],"maxItems":100,"type":"array","items":{"type":"string","maxLength":300}},"filterVisible":{"default":true,"type":"boolean"},"cardVisible":{"default":true,"type":"boolean"}},"required":["kind","label","slug","active","order","valueType","options","filterVisible","cardVisible"],"additionalProperties":false}'::jsonb);
-- END GENERATED DOCUMENT VALIDATION
