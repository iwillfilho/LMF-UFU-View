-- =============================================================================
-- Permissões do papel `trainee`.
--
-- O trainee passa em private.is_member() (tem um papel), então já lê
-- calendários, documentos, o link do Drive e os próprios pontos/strikes.
-- A única diferença para o membro efetivo: não lê os contatos (member_private)
-- dos outros membros e alumni, só a própria linha.
-- =============================================================================

-- Membro efetivo: qualquer papel exceto trainee.
create function private.is_efetivo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('presidente', 'diretor_rh', 'rh', 'editor', 'membro');
$$;

revoke execute on function private.is_efetivo from public;
grant execute on function private.is_efetivo to anon, authenticated;

drop policy "member_private: membros leem" on public.member_private;
create policy "member_private: efetivos leem, trainee só o próprio" on public.member_private
  for select to authenticated
  using ((select private.is_efetivo()) or member_id = (select private.current_member_id()));
