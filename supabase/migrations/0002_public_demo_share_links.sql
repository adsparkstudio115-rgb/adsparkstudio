-- Public, unguessable share links for approved-ready demo previews.
alter table public.demo_projects
  add column if not exists share_token text unique
  default encode(gen_random_bytes(24), 'hex');

create or replace function public.get_shared_demo(p_token text)
returns table (
  demo_id uuid,
  brand_data jsonb,
  business_name text,
  business_address text
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select d.id, d.brand_data, l.business_name, l.business_address
  from public.demo_projects d
  join public.leads l on l.id = d.lead_id and l.owner_id = d.owner_id
  where d.share_token = p_token
    and d.status in ('ready', 'approved')
  limit 1;
$$;

revoke all on function public.get_shared_demo(text) from public;
grant execute on function public.get_shared_demo(text) to anon, authenticated;
