-- =============================================================================
-- Storage: buckets e policies.
--
--   relatorios  público   PDFs de teses e relatórios          editor + admin
--   fotos       público   membros/, historia/ → admin
--                         posts/              → editor + admin
--   site        público   edital do PS, banners               admin
--   documentos  privado   estatuto, regimento, auxiliares     membros leem, admin escreve
--   envios      privado   alumni/: fotos do formulário público qualquer um envia, admin lê
--
-- Bucket público = arquivo servido por URL pública sem login. As policies de
-- SELECT abaixo só valem para listar ou baixar pela API.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('relatorios', 'relatorios', true,  20 * 1024 * 1024, array['application/pdf']),
  ('fotos',      'fotos',      true,   5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('site',       'site',       true,  20 * 1024 * 1024, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('documentos', 'documentos', false, 20 * 1024 * 1024, array['application/pdf']),
  ('envios',     'envios',     false,  5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- --- relatorios -------------------------------------------------------------
create policy "relatorios: editor lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'relatorios' and (select private.can_publish()));
create policy "relatorios: editor envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'relatorios' and (select private.can_publish()));
create policy "relatorios: editor substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'relatorios' and (select private.can_publish()))
  with check (bucket_id = 'relatorios' and (select private.can_publish()));
create policy "relatorios: editor remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'relatorios' and (select private.can_publish()));

-- --- fotos (por pasta) ------------------------------------------------------
create function private.can_write_foto(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case (storage.foldername(object_name))[1]
    when 'membros'  then private.is_admin()
    when 'historia' then private.is_admin()
    when 'posts'    then private.can_publish()
    else false
  end;
$$;
revoke execute on function private.can_write_foto from public;
grant execute on function private.can_write_foto to authenticated;

create policy "fotos: autorizados listam" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos' and private.can_write_foto(name));
create policy "fotos: autorizados enviam" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and private.can_write_foto(name));
create policy "fotos: autorizados substituem" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotos' and private.can_write_foto(name))
  with check (bucket_id = 'fotos' and private.can_write_foto(name));
create policy "fotos: autorizados removem" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and private.can_write_foto(name));

-- --- site -------------------------------------------------------------------
create policy "site: admin lista" on storage.objects
  for select to authenticated
  using (bucket_id = 'site' and (select private.is_admin()));
create policy "site: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site' and (select private.is_admin()));
create policy "site: admin substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'site' and (select private.is_admin()))
  with check (bucket_id = 'site' and (select private.is_admin()));
create policy "site: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site' and (select private.is_admin()));

-- --- documentos (privado) ---------------------------------------------------
create policy "documentos: membros baixam" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and (select private.is_member()));
create policy "documentos: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and (select private.is_admin()));
create policy "documentos: admin substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'documentos' and (select private.is_admin()))
  with check (bucket_id = 'documentos' and (select private.is_admin()));
create policy "documentos: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and (select private.is_admin()));

-- --- envios (formulário público de alumni) ----------------------------------
-- Só cria arquivos novos dentro de alumni/; não lê, não sobrescreve, não apaga.
create policy "envios: qualquer um envia foto de alumni" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'envios' and (storage.foldername(name))[1] = 'alumni');
create policy "envios: admin lê" on storage.objects
  for select to authenticated
  using (bucket_id = 'envios' and (select private.is_admin()));
create policy "envios: admin remove" on storage.objects
  for delete to authenticated
  using (bucket_id = 'envios' and (select private.is_admin()));
