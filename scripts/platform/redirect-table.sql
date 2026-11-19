create table public.content_redirects(path text primary key,target text,status integer not null check(status in(301,410)),resource_id uuid not null references public.content_drafts(id),check(path~'^/[^[:space:]?]*$'),check(target is null or target~'^/[^[:space:]?]*$'));
alter table public.content_redirects enable row level security;
grant select on public.content_redirects to anon,authenticated;
create policy redirects_read on public.content_redirects for select to anon,authenticated using(true);
