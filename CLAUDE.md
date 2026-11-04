# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Institutional site for LMF UFU (Liga do Mercado Financeiro da UFU), being rewritten from a static HTML site into **Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui**. The backend is Supabase and hosting is Vercel. The rewrite lives on `main` of https://github.com/iwillfilho/LMF-UFU-View (MIT license). The history was restarted there; the old `gustavokono/Site-LMF-UFU` repo and its `react-rewrite` branch are no longer a remote. All user-facing content and code comments are in Brazilian Portuguese; keep them in pt-BR.

The approved implementation plan (routes, Supabase schema, RLS roles, phases) is in `~/.claude/plans/analise-as-modifica-es-pedidas-wondrous-dragonfly.md`. The stakeholders' change requests are in `../Alterações site LMF.pdf`, one directory above the repo. Phases 1 (foundation), 2 (database) and 3 (public pages on Supabase) are done. Next up is Phase 4: Google login and the Área Restrita. Role permissions and the login flow are specified in `~/.claude/plans/quero-saber-o-que-transient-kay.md`. Only `editor`/`presidente`/`diretor_rh` publish. Members read only their own `hr_records`. Only `presidente`/`diretor_rh` edit fixed content.

The site is deployed at https://lmf-ufu.vercel.app (Vercel project `will-wesley/lmf-ufu`). The project is connected to `iwillfilho/LMF-UFU-View` through Git integration, so a push to `main` deploys to production. `vercel deploy --prod` is still available for manual deploys.

Git conventions: `origin` is `git@github.com:iwillfilho/LMF-UFU-View.git`, and commits are authored only by the repo owner. Do not add `Co-Authored-By` lines or any Claude attribution to commits or PR descriptions.

## Hosted Supabase (production)

- Project `lmf-ufu`, ref `xjmmoxpxejyqqwxuseug`, region `sa-east-1` (São Paulo), on the free plan of the "iwillfilho's Org" organization. URL: `https://xjmmoxpxejyqqwxuseug.supabase.co`.
- The local CLI is linked to it through `supabase/.temp`, which is gitignored.
  - `npm run db:push` applies new migrations to production. It needs no DB password, because the CLI creates a temporary login role.
  - It asks for confirmation, so run `npx supabase db push --dry-run` first.
- The migration history on the server matches `supabase/migrations/` version by version. Always apply schema changes through migrations, never ad-hoc SQL in the Dashboard.
- Production content:
  - `seed.sql` never runs in production. The public content (núcleos, diretorias, membros, cargos, parceiros, relatórios) was copied once from the seed **without** `access_grants`. Fresh content comes from the Área Restrita (Phase 4).
  - The INTB3 PDF was uploaded with `npx supabase seed buckets --remote`.
- Vercel env vars:
  - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for Production, Preview and Development.
  - `NEXT_PUBLIC_SITE_URL=https://lmf-ufu.vercel.app` is set for Production only. Change it when the domain `lmfufu.com.br` goes live.
  - The publishable key is public by design. Never put the secret/service key in `NEXT_PUBLIC_*` vars or in the repo.
- Pending for Phase 4, all set in the Dashboard:
  - Enable Google as the auth provider.
  - Set Site URL and redirect URLs to the Vercel domain.
  - Turn on the `before_user_created` hook: `pg-functions://postgres/private/before_user_created`.
  - Create the first `access_grants` with the **real** e-mails of the Presidente and Diretor de RH. Production has zero grants.
  - Until the hook is on, email signup is open at the API level. That is harmless, because accounts without a grant have no role and RLS blocks them, but it creates junk users.

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
npm run db:push      # applies pending migrations to the hosted project (see "Hosted Supabase")
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
- Data layer:
  - `lib/queries.ts` (server-only): every public read is a `'use cache'` function with `cacheLife("conteudo")` (a 5-minute profile defined in `next.config.ts`) and a `cacheTag` from `TAGS`. Phase 4 Server Actions must call `updateTag(TAGS.x)` after writing.
  - The functions also map rows to view types (`Membro`, `Relatorio`, `PostResumo`…).
- `lib/supabase/public.ts`: the cookieless `anon` client. It forces `cache: "no-store"` on fetch. Without that, Next keeps Supabase responses in `.next/cache/fetch-cache`, which survives between builds and served deleted data.
- `lib/storage.ts` `publicUrl()`: builds public Storage URLs. Missing photos and banners fall back to `/imagens/*`. `next.config.ts` allows the Supabase host in `images.remotePatterns`, and `dangerouslyAllowLocalIP` is on only when that host is local.
- Forms:
  - Server Actions in `lib/actions/` (Zod + honeypot) insert with the `anon` client. RLS only allows inserting, never reading.
  - The alumni photo goes to the private `envios/alumni/` bucket.
  - The UI lives in `components/forms/`. `useActionState` keeps the typed values when there is an error.
- URL state:
  - `?membro=<slug>` opens `MemberDialog`, the CV pop-up, on `/equipe`, `/equipe/alumni` and `/relatorios`. It reads `useSearchParams`, so it must sit inside `<Suspense>`.
  - Report filters are `?nucleo= &tipo= &autor=`. The filter uses `autor`, not `membro`, so it doesn't clash with the pop-up.
- Dynamic routes: `/eventos/[categoria]` (smf | viagens | palestras) and `/publicacoes/[slug]`.
  - Cache Components forbids an empty `generateStaticParams`, so it returns a `__sem-publicacoes__` placeholder that ends in `notFound()`.
  - Unknown slugs return 200 + `noindex` once streaming has started. Next documents this behavior.
- `components/site/rich-text.tsx` renders the Tiptap JSON from `posts.corpo` without `dangerouslySetInnerHTML`. Links only accept http(s)/mailto, and images only accept paths in the `fotos` bucket.
- `components/site/auto-carousel.tsx`: Embla autoplay with a pause button. When every item fits on screen there is only 1 snap and the plugin doesn't initialize. Never call `play()` in that state, because it crashes the page.
- `components/org-chart/`: provisional org chart, to be replaced by the Figma design.
- `lib/site-config.ts`: the menu (`mainNav`), contacts and address. Whether the PS is open comes from `site_settings.ps_aberto` (read in `app/(public)/layout.tsx`). The `/processo-seletivo` page arrives in Phase 5.
- The LMF Google Drive link lives only in `restricted_settings.drive_url`, which is members-only via RLS. Never hardcode it in the repo, because the repo is public.
- `lib/content.ts`: "Quem somos" and MVV, the only institutional texts that have no table yet.
- Local testing gotcha: kill any old `next start` before starting a new one. A stale server on the same port keeps answering with the old build.
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
