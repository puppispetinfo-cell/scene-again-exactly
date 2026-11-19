create function rivton_private.cache_locations(p_province text,p_rows jsonb)returns void language plpgsql security definer set search_path='' as $$declare item jsonb;begin
if auth.uid() is null or coalesce(rivton_private.member_role(),'') not in ('owner','editor','agent')then raise exception 'Not authorized' using errcode='42501';end if;
if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 or (p_province is not null and p_province!~'^[0-9]{2}$')then raise exception 'Invalid location response';end if;
for item in select * from jsonb_array_elements(p_rows)loop
if item->>'id'!~'^[0-9]{2,16}$' or length(item->>'name') not between 1 and 300 then raise exception 'Invalid location';end if;
insert into public.georef_cache(id,kind,parent_id,name,normalized_name)values(item->>'id',case when p_province is null then 'province' else 'city' end,p_province,item->>'name',lower(translate(item->>'name','ÁÉÍÓÚáéíóúÑñ','AEIOUaeiouNn')))on conflict(id)do update set name=excluded.name,normalized_name=excluded.normalized_name,updated_at=now();end loop;end$$;
revoke all on function rivton_private.cache_locations(text,jsonb)from public,anon,authenticated;grant execute on function rivton_private.cache_locations(text,jsonb)to authenticated;
create function public.cache_locations(p_province text,p_rows jsonb)returns void language sql security invoker set search_path='' as $$select rivton_private.cache_locations(p_province,p_rows)$$;
revoke all on function public.cache_locations(text,jsonb)from public,anon,authenticated;grant execute on function public.cache_locations(text,jsonb)to authenticated;
