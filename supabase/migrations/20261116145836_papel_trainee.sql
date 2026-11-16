-- =============================================================================
-- Papel `trainee`: quem está no processo de trainee entra na Área Restrita com
-- acesso reduzido (calendário, documentos, Drive e os próprios pontos).
--
-- Fica sozinho nesta migration porque um valor novo de enum só pode ser usado
-- depois que a transação que o criou termina. As permissões vêm na próxima.
-- =============================================================================
alter type public.app_role add value if not exists 'trainee';

comment on type public.app_role is
  'Papéis da Área Restrita. presidente e diretor_rh administram tudo; rh lança pontos/strikes; editor publica posts e relatórios; membro só acessa; trainee acessa sem ver os contatos dos outros membros.';
