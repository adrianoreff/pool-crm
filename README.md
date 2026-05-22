# Pool CRM

Pool service operations platform—weekly routes, visit readings/dosages, service report emails, and a technician mobile PWA.

Built with **React**, **TypeScript**, **Vite**, **shadcn/ui**, and **Supabase** (`qqhykrjmlaibimuynijp`).

## Features

- **Admin web** — route dashboard, routes map, route manager, pool chemistry settings, customers with assign-to-route, invoices & analytics
- **Technician PWA** — today’s route (ordered stops), Info/Pool tabs, finish visit wizard (readings → dosages → photo → email), unfinish visit
- **Routes** — fixed weekly `route_stops`, generate visits RPC, `pool_service_report` emails via Resend
- **Optional** — shopping list & work orders (Admin Panel), booking widget, voice (VAPI)

## Quick start

```bash
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
npm run dev
```

App runs at [http://localhost:8080](http://localhost:8080).

## Environment variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (publishable) key |
| `VITE_SUPABASE_PROJECT_ID` | Optional project ref |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Project structure

```
src/
  pages/          # Routes (admin + technician + auth + widget)
  components/     # UI, layout, modals, maps
  hooks/          # Supabase data hooks
  contexts/       # Auth
  lib/            # Email templates, Mapbox, services
supabase/
  migrations/     # Database schema & RLS
  functions/      # Edge Functions (Deno)
docs/
  PROJECT_ANALYSIS.md   # Deep architecture & security notes
```

## Roles

| Role | Access |
|------|--------|
| `owner`, `admin`, `dispatcher` | Main app (`/dashboard`, …) |
| `technician` | `/technician/*` |

## Documentation

See **[docs/PROJECT_ANALYSIS.md](docs/PROJECT_ANALYSIS.md)** for architecture, data model, edge functions, and security recommendations.

## Supabase

Link your own project or use the included migrations:

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push
npx supabase functions deploy
```

Configure Edge Function secrets: `RESEND_API_KEY`, `VAPI_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, etc.

## License

Private / proprietary unless otherwise specified.
