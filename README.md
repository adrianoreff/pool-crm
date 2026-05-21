# Pool CRM (TradeFlow)

Multi-tenant field service CRM for trade businesses—scheduling, customers, technicians, invoicing, email, voice calls, and an embeddable booking widget.

Built with **React**, **TypeScript**, **Vite**, **shadcn/ui**, and **Supabase**.

## Features

- **Office app** — dashboard, calendar, appointments, customers, team, services, service areas (Mapbox), invoices, analytics, settings, email templates
- **Technician PWA** — jobs, maps, checklists, job completion, office chat, push notifications
- **Booking widget** — public `/widget/:embedCode` + `widget-loader.js` embed
- **Integrations** — Resend (email), VAPI (calls), web push (VAPID)

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
