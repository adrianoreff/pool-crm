# Reset operacional em produção

Zera clientes, agendamentos e histórico relacionado **sem disparar emails de cancelamento** (purge via SQL, não via UI).

## Antes de executar

1. **Backup obrigatório**: Supabase Dashboard → Database → Backups (ou `pg_dump`).
2. Confirme que está no projeto **produção** correto (`supabase link`).
3. Avise a equipe — o app ficará sem clientes/agendamentos até recadastrar.

## Passo 1 — Dry-run (recomendado)

```powershell
cd "c:\Users\User\OneDrive\Área de Trabalho\New folder\pool crm"
.\supabase\scripts\run-production-reset.ps1 -DryRun
```

Isso executa o SQL dentro de `BEGIN` e termina com `ROLLBACK` — nada é persistido. Revise as contagens impressas no output.

## Passo 2 — Reset real (COMMIT)

```powershell
.\supabase\scripts\run-production-reset.ps1 -Commit
```

Será pedida confirmação digitando `RESET PRODUCTION`.

## Passo 3 — Storage (opcional)

Após o SQL, limpe fotos órfãs no bucket `appointment-photos` (Dashboard → Storage). Não apague `business-logos`.

## O que permanece

- Admin / membros do time (`users`)
- `services`, categorias, checklists, definições de leitura/dosagem
- Configurações de horário, áreas, notificações, widget

## Emails

Nenhum email de cancelamento é enviado: o app só chama `send-notification` ao cancelar pelo hook React; este script não usa esse fluxo.
