insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('leadflow-demo-assets','leadflow-demo-assets',true,12582912,array['image/webp'])
on conflict (id) do update set public=true, file_size_limit=12582912, allowed_mime_types=array['image/webp'];

create policy "leadflow_demo_owner_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id='leadflow-demo-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

create policy "leadflow_demo_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id='leadflow-demo-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
)
with check (
  bucket_id='leadflow-demo-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
