# Pool CRM — Instruções e estado do projeto

Documento de continuidade para retomar o trabalho. Última atualização: **21 de maio de 2026**.

---

## 1. O que é este projeto

**Pool CRM** (`pool-crm`) — plataforma de operações para empresa de piscinas (Brothers Pool and Spa / contexto similar).

| Item | Valor |
|------|--------|
| Pasta local | `c:\Users\User\OneDrive\Área de Trabalho\New folder\pool crm` |
| Repositório GitHub | `https://github.com/adrianoreff/pool-crm` |
| Remote git | `pool-crm` → branch **`main`** |
| Supabase project ref | `qqhykrjmlaibimuynijp` |
| Stack | React + TypeScript + Vite + shadcn/ui + TanStack Query + Supabase |
| PWA | Sim (técnico usa no celular) |

**Não misturar** com o projeto `tradeflow-hub-87` — são codebases separados.

---

## 2. Cor da marca (técnico e CTAs)

Use sempre o laranja do app, **não** azul estilo Skimmer:

| Uso | Valor |
|-----|--------|
| Primária | `#F97316` |
| Hover | `#EA580C` |
| Classes Tailwind comuns | `bg-[#F97316]`, `hover:bg-[#EA580C]`, `stroke-[#F97316]` |

Referência: [`src/pages/technician/Dashboard.tsx`](src/pages/technician/Dashboard.tsx), [`src/pages/technician/Login.tsx`](src/pages/technician/Login.tsx).

---

## 3. Como rodar localmente

```bash
cd "c:\Users\User\OneDrive\Área de Trabalho\New folder\pool crm"
npm install
cp .env.example .env
# Preencher VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

- App: **http://localhost:8080**
- Build: `npm run build`
- Testes: `npm run test` ou `npx vitest run src/lib/route-schedule.test.ts`

### Variáveis importantes (`.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key |
| Mapbox (opcional no .env) | Token também pode vir de **Settings → business.mapbox_public_token** no admin |

### Edge Functions (secrets no Supabase)

- `RESEND_API_KEY` — e-mails de service report
- Remetente padrão verificado: **`oliver@brotherspoolandspa.com`**
- Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (se usar notificações)

---

## 4. Papéis e rotas principais

### Admin / escritório (`owner`, `admin`, `dispatcher`)

| Rota | Página | Função |
|------|--------|--------|
| `/dashboard` | Dashboard | Visão geral |
| `/routes/dashboard` | RoutesDashboard | Rotas semanais |
| `/routes/map` | RoutesMap | Mapa das rotas |
| `/routes/manage` | RouteManager | **Gerir rotas**: clientes na rota, ordem, gerar visits |
| `/pool/chemistry` | PoolChemistrySettings | Leituras/dosagens padrão |
| `/customers` | Customers | Clientes + import CSV |
| `/settings` | Settings | Negócio, Mapbox token, etc. |

### Técnico (PWA)

| Rota | Página | Função |
|------|--------|--------|
| `/technician/login` | Login | Login técnico |
| `/technician/dashboard` | Dashboard | **Today** + **Upcoming**, mapa, próximo stop |
| `/technician/route/:date` | **RouteDay** | Vista dia estilo Skimmer (lista, reorder, stats) |
| `/technician/jobs` | JobsList | Lista de jobs (Stops) |
| `/technician/jobs/:id` | JobDetails | Detalhe da visita |
| `/technician/jobs/:id/finish` | VisitFinish | Wizard: leituras → dosagens → foto → e-mail |
| `/technician/history` | History | Histórico |
| `/technician/profile` | Profile | Perfil |

Nav inferior do técnico: **Route** (dashboard + route day), **Stops**, **History**.

---

## 5. O que já foi feito (cronologia resumida)

### Fase grande: pivot “pool-only” (`346a883`)

- Schema de rotas: `routes`, `route_stops`, visits/appointments ligados à rota
- RPC `generate_route_visits` para gerar paradas no calendário
- Admin: Route Dashboard, Map, Manager, Pool Chemistry
- Técnico: fluxo de visita (`VisitFinish`), e-mail `pool_service_report`
- Import de clientes CSV, branding pool

### Correções e features posteriores (já no `main` remoto)

| Commit | Assunto |
|--------|---------|
| `6202921` | Fix onboarding `seed_pool_business_defaults` (colunas `duration_min`, `base_price_*`) |
| `b21928f` | E-mail Resend: sender `oliver@brotherspoolandspa.com` |
| `a213ee8` | Import CSV: telefone vazio, notação científica Excel, `;` |
| `e20c87f` / `d32b5fd` | Generate stops: endereço do customer + fix `customer_id` ambíguo no RPC |
| `f918ccc` | Dashboard técnico: abas **Today** / **Upcoming** |
| `562e687` | **Route Day View** (tela full-bleed, Mapbox, drag reorder) |

### Migrations Supabase relevantes (pool / rotas)

- `20260521120000_pool_routes_and_visits.sql` — base rotas
- `20260521120100_generate_route_visits.sql` — RPC gerar visits
- `20260521220000_fix_seed_pool_business_defaults.sql`
- `20260522120000_fix_generate_route_visits.sql`
- `20260522130000_fix_generate_route_visits_ambiguous.sql`

Garantir que estão aplicadas no projeto hosted: `npx supabase db push` (se usar CLI linkado).

---

## 6. Route Day View — o que foi implementado

Tela dedicada quando o técnico abre a rota de um dia (`/technician/route/YYYY-MM-DD`).

### Entrada (dashboard)

- **Today**: botões “Open route” e “View full route (N stops)”
- **Upcoming**: toque no card do dia → mesma rota com a data

### Funcionalidades

| Feature | Detalhe |
|---------|---------|
| Layout full-bleed | Sem `container`/`px-4` — [`TechnicianLayout.tsx`](src/components/layout/TechnicianLayout.tsx) detecta `/technician/route/:date` |
| Header próprio | Nome do técnico + data + voltar (laranja) |
| Gauge | `completed/total` (ex. `0/18`) |
| Barras Miles / Time | Labels informativos; **fill = progresso %** (0% se nada feito) |
| Lista numerada | Nome, endereço, `est 8:00am`, distância `> X mi` do trecho anterior |
| Mapbox Directions | [`src/lib/mapbox/route-metrics.ts`](src/lib/mapbox/route-metrics.ts) — milhas e tempo entre paradas |
| ETAs | [`src/lib/route-schedule.ts`](src/lib/route-schedule.ts) — início 8:00, ~18 min serviço (ou `route_stops.est_minutes`) |
| Drag & drop | `@dnd-kit` — persiste `route_stops.sort_order` via `useReorderRouteStops` |
| Footer Directions | Próxima parada incompleta → abre Maps (Mapbox ou Google) |
| Fora do escopo | Técnico **não** adiciona/remove clientes na rota (só admin em Route Manager) |

### Arquivos principais

```
src/pages/technician/RouteDay.tsx
src/hooks/useRouteDay.ts
src/components/technician/RouteDayStats.tsx
src/components/technician/RouteDayStopList.tsx
src/lib/mapbox/route-metrics.ts
src/lib/route-schedule.ts
src/lib/route-schedule.test.ts
```

### Dependências adicionadas

- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

---

## 7. Correções de UI (Route Day) — feitas localmente, ainda NÃO commitadas

Depois do push `562e687`, foram corrigidos problemas reportados no screenshot:

| Problema | Correção |
|----------|----------|
| Azul Skimmer não combina com o app | Tudo trocado para `#F97316` (header, footer, barras, coluna dos números) |
| `est 8:48.0544…am` | `Math.round` em `minutesToLabel` + arredondar drive legs |
| Barras cheias com 0/4 | Fill das barras = `pct` (progresso), não distância/tempo total |
| Endereço no footer não clicável | Dois botões: título “Directions to…” + endereço **sublinhado** |

### Estado Git atual (verificar com `git status`)

Arquivos modificados / novos **pendentes de commit**:

- `src/pages/technician/RouteDay.tsx`
- `src/components/technician/RouteDayStats.tsx`
- `src/components/technician/RouteDayStopList.tsx`
- `src/lib/route-schedule.ts`
- `src/lib/route-schedule.test.ts` (novo)

**Próximo passo imediato ao voltar:** commit + push dessas correções, por exemplo:

```bash
git add src/pages/technician/RouteDay.tsx src/components/technician/RouteDayStats.tsx src/components/technician/RouteDayStopList.tsx src/lib/route-schedule.ts src/lib/route-schedule.test.ts
git commit -m "fix(technician): Route Day brand orange, ETA rounding, progress bars, clickable address"
git push pool-crm main
```

---

## 8. Fluxos operacionais (como o negócio usa)

### Escritório — montar rota e gerar dia

1. **Route Manager** (`/routes/manage`): criar/editar rota por dia da semana, adicionar clientes, ordem (`sort_order`).
2. **Generate visits**: data deve bater com `day_of_week` da rota; clientes precisam estar na rota antes.
3. **Settings**: configurar `mapbox_public_token` para milhas/tempo/ETAs no app do técnico.

### Técnico — dia de trabalho

1. Login → **Route** tab → **Today** ou **Upcoming**.
2. **Open route** → tela Route Day: ver ordem, arrastar para reordenar (salva no DB).
3. Tocar parada → job detail → **Finish visit** (química, foto, e-mail).
4. Footer **Directions** → navegação para próxima parada não concluída.

### Reorder pelo técnico

- Só appointments com `route_stop_id` entram no drag-and-drop.
- Após reorder: invalida `technician-appointments` + `routes`; recalcula Mapbox no cliente.
- Admin vê nova ordem no Route Manager; próxima geração de visits respeita `sort_order`.

---

## 9. Mapbox — comportamento

| Com token | Sem token |
|-----------|-----------|
| Milhas entre paradas, tempo de deslocamento, ETAs com drive | Lista e reorder funcionam; stats de rota: milhas `—`, tempo só soma serviço |
| Geocode de endereços sem lat/lng (cache em memória) | Fallback ETAs só com tempo de serviço |

Cache de directions: chave em memória em `route-metrics.ts` (`clearRouteMetricsCache` ao reordenar).

---

## 10. Outras áreas do app (já existentes, menos foco recente)

- **Chat / mensagens** — job chat, direct messages, read receipts (migrations `20260131*`)
- **Push notifications** — `user_push_preferences`, banner no técnico
- **Invoices, Analytics, Calendar** — módulos admin herdados
- **Booking widget** — `/widget/:embedCode`
- **Admin Panel** — shopping list, work orders (opcional)
- **VAPI** — call logs (se configurado)

Documentação arquitetural: [`docs/PROJECT_ANALYSIS.md`](docs/PROJECT_ANALYSIS.md).

---

## 11. Ideias / fase 2 (não implementado)

Coisas mencionadas em planos mas **não** feitas ainda:

- Gravar ETAs no DB (`appointments.scheduled_start_time` / `scheduled_end_time`) após reorder
- `route_day_stats.miles_total` persistido
- Extrair `openDirectionsToAppointment()` compartilhado entre Dashboard e RouteDay
- Barra “miles remaining” estilo Skimmer com lógica mais fina (hoje: label `-X mi` + barra = progresso)
- Plano em `.cursor/plans/` (não editar os `.plan.md` como código — só referência)

Plano Route Day original: `technician_route_day_view_603f6c5e.plan.md` (Cursor plans).  
Plano correções UI: `route_day_ui_fixes_1289735f.plan.md`.

---

## 12. Checklist de verificação manual (Route Day)

- [ ] Técnico com rota hoje: abre `/technician/route/{hoje}`, lista numerada, `0/N` no gauge
- [ ] Com Mapbox em Settings: milhas/tempo > 0 entre paradas
- [ ] Arrastar parada: ordem salva; ETAs e milhas recalculam
- [ ] 0/N: barras Miles e Time **vazias** (laranja só no anel vazio)
- [ ] ETAs legíveis (`est 8:48am`, sem decimais)
- [ ] Tocar endereço no footer abre Maps
- [ ] `npm run build` passa
- [ ] `npm run test` — `route-schedule.test.ts` passa

---

## 13. Comandos Git úteis

```bash
git status
git log -10 --oneline
git push pool-crm main
```

**Último commit no remoto:** `562e687` — `feat(technician): add Skimmer-style route day view`  
**Pendente local:** correções UI laranja / ETAs / barras / footer (secção 7).

---

## 14. Resumo “onde parei”

1. **Route Day** está no ar no GitHub (`562e687`) com lista, reorder, Mapbox, dashboard navigation.
2. **Correções visuais e UX** (laranja, ETAs, barras de progresso, endereço clicável) estão **no disco, não commitadas** — é o primeiro trabalho ao retomar.
3. Pool CRM está estável para: rotas admin, generate visits, técnico Today/Upcoming/Route Day, finish visit + e-mail.
4. Confirmar migrations Supabase no projeto `qqhykrjmlaibimuynijp` se algo falhar no generate stops ou onboarding.

---

## 15. Contato / contexto de negócio

- E-mail operacional configurado: **oliver@brotherspoolandspa.com**
- App pensado para operação de pool service semanal (rotas fixas, química, service report ao cliente)

Se este arquivo ficar desatualizado, atualize a **secção 7** (git pendente) e a **secção 13** (último commit) sempre que fizer push ou mudança grande.
