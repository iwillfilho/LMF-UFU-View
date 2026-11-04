# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Institutional site for LMF UFU (Liga do Mercado Financeiro da UFU), being rewritten from a static HTML site into **Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui**. The backend will be Supabase and hosting will be Vercel. The rewrite happens on the `react-rewrite` branch. All user-facing content and code comments are in Brazilian Portuguese; keep them in pt-BR.

The approved implementation plan (routes, Supabase schema, RLS roles, phases) is in `~/.claude/plans/analise-as-modifica-es-pedidas-wondrous-dragonfly.md`. The stakeholders' change requests are in `../Alterações site LMF.pdf`, one directory above the repo. Phases 1 (foundation) and 2 (database) are done. Next up is Phase 3: build the public pages on top of Supabase. Role permissions and the login flow are specified in `~/.claude/plans/quero-saber-o-que-transient-kay.md`. Only `editor`/`presidente`/`diretor_rh` publish. Members read only their own `hr_records`. Only `presidente`/`diretor_rh` edit fixed content.

A demo is deployed with the Vercel CLI at https://lmf-ufu.vercel.app (project `will-wesley/lmf-ufu`, no Git integration). Redeploy with `vercel deploy --prod`.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build; also generates route types (LayoutProps/PageProps)
npm run lint         # ESLint (legacy/ is ignored)
npx tsc --noEmit     # typecheck; run `npm run build` or `next typegen` first if LayoutProps is missing

npm run db:start     # local Supabase in Docker (ports 553xx; another project uses 543xx)
npm run db:reset     # re-applies migrations + seed.sql and uploads the reference PDF
npm run db:test      # pgTAP permission tests (supabase/tests/)
npm run db:lint      # schema lint
npm run db:types     # regenerates lib/supabase/database.types.ts; run after every migration
```

Playwright is planned. The only automated tests so far are the pgTAP ones.

## Database (supabase/)

- `migrations/` run in order: `base` → `pessoas_e_acessos` → `conteudo_e_area_restrita` → `storage`. Never edit an applied migration. Add a new one with `npx supabase migration new <nome>`.
- Every table has RLS, and the grants are **explicit** because default privileges are revoked. A new table needs `grant ...` + `enable row level security` + policies, or the API returns 42501.
- Permissions go through `private.*` helpers (`has_role`, `is_admin`, `is_member`, `can_publish`, `can_manage_hr`, `current_member_id`). In policies, wrap them as `(select private.fn())`. The `private` schema is not exposed by the API.
- Access flow:
  - `access_grants` (by e-mail) is the source of truth. `user_roles` is derived from it by triggers, and clients never write it.
  - The `before_user_created` auth hook blocks signups from e-mails that have no grant. In production it has to be enabled in the Dashboard.
  - A trigger blocks removing the last `presidente`/`diretor_rh`.
- Data split by visibility, because RLS is per row:
  - `members` is public; contact info and the login link live in `member_private`.
  - `site_settings` is public; `restricted_settings` (Drive URL) is members-only.
- `seed.sql` is local-only. The repo is public, so never put real e-mails or the Drive URL in it. The seed's admin e-mails are placeholders: `presidente@lmf.com`, `diretor.rh@lmf.com`.
- Any permission change must come with a test in `supabase/tests/permissoes.test.sql`.

## Next.js 16 specifics (read node_modules/next/dist/docs before using unfamiliar APIs)

- `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`.
  - Data must be cached explicitly with `'use cache'` + `cacheLife` + `cacheTag`. After a mutation, use `updateTag`/`revalidateTag`.
  - Anything that reads `cookies()`/`headers()`/`searchParams` must sit inside `<Suspense>`, otherwise the build fails.
  - Public pages should read Supabase with a cookieless client inside `'use cache'` functions. Auth-dependent UI should stream behind Suspense.
- Route protection lives in `proxy.ts` (formerly `middleware.ts`). With `@supabase/ssr`, call `supabase.auth.getClaims()` there.
- `Date.now()`/`new Date()` in prerendered components breaks prerendering. Avoid it, or isolate it behind Suspense.

## Architecture

- `app/layout.tsx`: root `<html lang="pt-BR">`, Inter + Instrument Serif via `next/font` (CSS vars `--font-inter`/`--font-instrument-serif`), `ThemeProvider` (next-themes, class-based, dark is the default), and the default metadata.
- `app/(public)/`: public pages sharing `layout.tsx`, which renders `SiteHeader` + `SiteFooter` and has a skip link. The restricted area (`app/area-restrita/`) will get its own layout and must not live under `(public)`.
- Most routes are still placeholders (`PageIntro` + `EmConstrucao` from `components/site/page-intro.tsx`). The home page (`app/(public)/page.tsx`) is built.
- `lib/site-config.ts`: the menu (`mainNav`), contacts, address, and the provisional `psAberto` flag. That flag moves to `site_settings` in Supabase later. The Processo Seletivo link is intentionally left out of `mainNav` and only shows as a button when the flag is on.
- The LMF Google Drive link lives only in `restricted_settings.drive_url`, which is members-only via RLS. Never hardcode it in the repo, because the repo is public.
- `lib/content.ts`: temporary static content migrated from `legacy/index.html` (núcleos, MVV, parceiros). The same data is already seeded in Supabase. Pages switch to Supabase queries in Phase 3. MVV and "Quem somos" have no table yet.
- `lib/supabase/database.types.ts`: generated types (`npm run db:types`). Don't edit it by hand.
- `components/ui/`: shadcn components. The `cn` helper comes from the official `cn` npm package (shadcn), re-exported in `lib/utils.ts`.
- `legacy/`: the old static site, kept for reference until launch. Its asset paths point to `../public/`.

## Design system (app/globals.css)

- Brand colors: `violeta #8C14B9`, `plum #3F0953`, `lilac #C455ED`, `galaxy #09000F` (see `docs-marca/`). They are available as Tailwind colors (`bg-plum`, `text-lilac`…).
- Semantic shadcn tokens are defined for `:root` (light) and `.dark` (default).
- Use `text-ink-accent` for accent **text**. On the dark theme it resolves to lilac, because violet on galaxy fails contrast. Violet (`bg-primary`) is used only for fills.
- Brand utilities:
  - `.pill`: asymmetric pill from the brand guide. Use it only for functional tags, the active nav item and CTAs.
  - `.brand-mask` (via `components/site/logo.tsx`): the logo is a CSS mask so it takes on `currentColor` in both themes.
  - `.galaxy-glow`: the brand radial gradient. It's the one strong decoration; don't scatter it around.
- Type scale: `text-display` / `text-title` / `text-quote`. Headings use Instrument Serif at weight 400. Italic goes on whole lines, never on a single word.
- Motion: only the hero entrance (`animate-rise`, `animate-glow-in`), and it respects `prefers-reduced-motion`. Avoid per-section fade-ins.
- Lucide v1 has no brand icons. Instagram and LinkedIn are in `components/site/social-icons.tsx`.
- Logo variants (trimmed PNGs) live in `public/marca/`. `app/icon.png` and `app/apple-icon.png` are the favicons.
