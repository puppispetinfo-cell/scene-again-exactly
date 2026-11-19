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
