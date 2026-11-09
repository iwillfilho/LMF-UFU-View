# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Institutional site for LMF UFU (Liga do Mercado Financeiro da UFU), being rewritten from a static HTML site into **Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui**. The backend is Supabase and hosting is Vercel. The rewrite lives on `main` of https://github.com/iwillfilho/LMF-UFU-View (MIT license). The history was restarted there; the old `gustavokono/Site-LMF-UFU` repo and its `react-rewrite` branch are no longer a remote. All user-facing content and code comments are in Brazilian Portuguese; keep them in pt-BR.

The approved implementation plan (routes, Supabase schema, RLS roles, phases) is in `~/.claude/plans/analise-as-modifica-es-pedidas-wondrous-dragonfly.md`. The stakeholders' change requests are in `../Alterações site LMF.pdf`, one directory above the repo. Phases 1 (foundation), 2 (database) and 3 (public pages on Supabase) are done. Phase 4 (Google login and the Área Restrita) is **done in code**. Phase 5 (the `/processo-seletivo` page, SEO, a11y/Lighthouse, domain, removing `legacy/`) is next:
- Done in code: Google login, `proxy.ts`, the role layer (`lib/auth.ts`), the Área Restrita layout and menu, the Calendário tab (4.2), Publicações (4.3: list, post editor with Tiptap, reports with direct PDF upload; `lib/actions/publicacoes.ts`, `components/area-restrita/`, `app/area-restrita/publicacoes/`) , Documentos (4.4: `lib/actions/documentos.ts`, `app/area-restrita/documentos/`), pontos/strikes (4.5a: `lib/actions/rh.ts`, `app/area-restrita/rh/`, `app/area-restrita/meus-pontos/`), Acessos (4.5b: `lib/actions/acessos.ts`, `app/area-restrita/acessos/`, `components/area-restrita/acessos.tsx`), Membros + alumni approval (4.5c: `lib/actions/membros.ts`, `app/area-restrita/membros/`, `components/area-restrita/{membros,virar-gestao,envios-alumni}.tsx`) and fixed content (4.5d: `lib/actions/conteudo.ts`, `app/area-restrita/conteudo/`, `components/area-restrita/conteudo.tsx`).
- 4.6, the PS panel, lives in Conteúdo → Processo Seletivo (`components/area-restrita/processo-seletivo.tsx`), together with the PS steps. The plan had put it in the RH tab, but the `rh` role also sees that tab.
- Still open by design: Ferramenta is a placeholder (`PaginaProvisoria`) until the tool is defined. Production needs `npm run db:push` (migration `membros_anonimizados`) **before** deploying this code, plus the Dashboard setup below.
- PS rules: opening the PS requires a Google Forms link (`forms.gle` or `docs.google.com/forms`). Closing keeps the link. The header button (only while open) goes to `/processo-seletivo`, which is always public: open shows steps + edital (react-pdf) + form; closed shows "Inscrições encerradas" + steps. Only a `docs.google.com/forms/…/viewform` link is embedded in an iframe (`?embedded=true`); `forms.gle` and edit links only get the button. The react-pdf viewer (`components/site/edital-pdf-visor.tsx`) is loaded with `next/dynamic` + `ssr: false` (`edital-pdf.tsx`), and `workerSrc` must stay in the same module as `<Document>`. The edital goes from the browser straight to `site/ps/<uuid>.pdf` (up to 20 MB, above the Server Action limit). `anexarEdital` re-checks it with `conferirPdf`, saves `edital_pdf_path` and prunes `site/ps/`. Every change calls `updateTag(TAGS.settings)`. Ferramenta is a placeholder (`PaginaProvisoria`).
- RH rules: `rh`, `diretor_rh` and `presidente` add records; only `presidente`/`diretor_rh` correct or delete them. Meus pontos filters by the member linked to the account (`member_private.user_id`), because RLS alone would show RH users everyone's records. The default gestão is the current semester in Brasília time (`gestaoDe` in `lib/format.ts`: Jan–Jun → `.1`, Jul–Dec → `.2`).
- Documentos rules: PDFs live in the private bucket under `documentos/<id>/`; they are never linked directly. `/area-restrita/documentos/[id]/arquivo` checks the session and role on every click and redirects to a 60-second signed URL (`?baixar` forces download). Only `presidente`/`diretor_rh` manage documents and the Drive link (`restricted_settings.drive_url`).
- Acessos rules: only `presidente`/`diretor_rh`. The UI groups `access_grants` by e-mail; "Já entrou" means a `user_roles` row points to one of its grants. Every grant of an e-mail must point to the same `member_id` (`member_private.user_id` is unique, so the sync trigger fails otherwise), and a member can be linked to only one e-mail. Relinking is a single `UPDATE ... where email = x`, because the AFTER ROW sync triggers only fire at the end of the statement. The last-admin trigger raises `P0001`, shown as a friendly message. Revoking your own access redirects to `/area-restrita`.
- Access rules shared by Acessos and Membros (`liberarAcesso`, `membroOcupado`, `revogarDosMembros`, the `P0001` message) live in `lib/acessos-servidor.ts`.
- Membros rules (only `presidente`/`diretor_rh`):
  - Photos are cropped to a square (biased upward on portraits) and converted to 640 px WebP in the browser (`lib/imagem-navegador.ts`), re-checked by magic numbers on the server, and stored in `fotos/membros/<id>/<uuid>.webp`. The old file is deleted only after the row points to the new one.
  - Cargos are edited as rows and sent as JSON. `salvarCargos` deletes the removed rows first, then upserts the rest by `id`, and returns the saved rows so the client gets the new ids (otherwise a second save would duplicate them). The slug is set on creation and never changes, so `?membro=<slug>` links keep working.
  - "Mover para alumni" is the normal exit: the status changes and the access is revoked in the same action. Hard delete is only allowed with no `report_authors` (FK `restrict`). Otherwise the member is anonymized: `members.anonimizado` (migration `membros_anonimizados`, with a check constraint that forbids personal data). Anonymized members are left out of `getEquipe`, `getMembrosRH` and the public lists, and appear as "Ex-membro" with no CV link on reports.
  - Virar gestão: it revokes access first (the last-admin trigger can abort before anything changes), then sets the leavers to alumni, then copies the latest-gestão terms of those who stay (upsert ignoring duplicates). These are three separate requests, so a failure halfway is fixed by running it again.
  - Alumni submissions: approving creates a new member or merges into an existing one (fields left empty in the submission don't overwrite). The `envios` photo is downloaded and re-validated, because anyone can upload to `envios/alumni/` through the API. It is then uploaded to `fotos` and deleted from `envios`. Rejecting also deletes the photo.
- Conteúdo rules (only `presidente`/`diretor_rh`): one page per table (núcleos, diretorias, parceiros, Nossa História, etapas do PS, calendários).
  - `moverItem`/`excluirItem` are generic, but they only accept tables from the `TABELAS` whitelist, which also lists each table's public cache tags and its files folder. Reordering renumbers the whole list (1..n).
  - Deleting a núcleo or a diretoria requires typing its name, because reports and member terms lose the reference (`on delete set null`).
  - Slugs (`/nucleos#slug`, org chart) are set on creation and never change on rename.
  - Images are shrunk in the browser (`imagemReduzida`: banners 1920 px, logos 600 px, history photos 1600 px, WebP with alpha). They are re-checked on the server (`lerImagem`/`subirImagem`/`podarPasta` in `lib/storage-servidor.ts`) and stored in `site/nucleos/<id>/`, `site/parceiros/<id>/` and `fotos/historia/<id>/`. History photos the client asks to keep must already belong to that section.
  - Partner ↔ núcleo links are edited only on the partner ("Aparece em"). Inside a núcleo, partners follow the global partner order (`getNucleos` sorts by `partners.ordem`; `nucleo_partners.ordem` is no longer used).
  - Calendars accept the Google Calendar ID or the embed link (the `src` is extracted).
- Cache Components keeps up to 3 visited routes mounted but hidden (`<Activity>`), so form state survives navigation. A "create" form that redirects must reset itself when it is hidden (see `FormNovoMembro` and `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). In Playwright, hidden copies duplicate ids, so use `:visible` or `filter({ visible: true })`.
- Style constants used by Server Components (`botaoPrimario`, `selectClasse`…) live in `components/area-restrita/estilos.ts`, not in the `"use client"` `campos.tsx`.
- Shared Storage helpers for Server Actions (`listarPasta`, `remover`, `conferirPdf`) are in `lib/storage-servidor.ts`. Labels shared by server and client components go in `lib/labels.ts`: a plain object exported from a `"use client"` file arrives on the server as a client reference, not the object.
- Publicações rules: a post or report is created as a draft first (title + type), then edited; images live in `fotos/posts/<id>/` and PDFs in `relatorios/<id>/`. `posts.corpo` is validated and rebuilt by `lib/corpo-post.ts` (only what `rich-text.tsx` renders). Saving deletes files removed from the post, and unreferenced uploads older than 24 h. Edit forms submit with `startTransition`, not the `action` prop, because React 19's automatic form reset desyncs controlled selects/checkboxes.
- `getSessao()` calls `connection()` before `getClaims()`: the token expiry check reads the clock, which Next forbids during (partial) prerendering.
- Dashboard setup is still pending (see "Hosted Supabase").

Role permissions and the login flow are specified in `~/.claude/plans/quero-saber-o-que-transient-kay.md`. Only `editor`/`presidente`/`diretor_rh` publish. Members read only their own `hr_records`. Only `presidente`/`diretor_rh` edit fixed content.

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
  - `NEXT_PUBLIC_SITE_URL=https://lmf-ufu.vercel.app` is set for Production only. Change it when the domain `lmfufu.com.br` goes live. Besides metadata, it is the origin of the login redirects (`lib/origem.ts`); without it (local, previews) the request `Host` is used.
  - The publishable key is public by design. Never put the secret/service key in `NEXT_PUBLIC_*` vars or in the repo.
- Pending for Phase 4, all set in the Dashboard (the code side is ready; none of this is confirmed as done):
  - Enable Google as the auth provider. Locally it is `enabled = false` in `supabase/config.toml` (needs a Google OAuth client in `SUPABASE_AUTH_EXTERNAL_GOOGLE_*`).
  - The callback is `/auth/callback`; add it to the redirect URLs.
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

There are no tests inside this repo besides the pgTAP ones. A separate QA suite (Vitest unit, Playwright E2E, axe a11y, RLS battery) lives in the sibling directory `../lmf-testes`, imports from this repo and does not modify it; see its README.

## Database (supabase/)

- `migrations/` run in order: `base` → `pessoas_e_acessos` → `conteudo_e_area_restrita` → `storage` → `membros_anonimizados`. Never edit an applied migration. Add a new one with `npx supabase migration new <nome>`.
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
- Any permission change must come with a test in `supabase/tests/permissoes.test.sql`. Keep `select plan(N)` equal to the number of assertions (65 now).
- `calendars` (Google Calendar IDs shown in the Calendário tab) is members-read and admin-write. The seed has one public example (Brazilian holidays); production starts empty.

## Next.js 16 specifics (read node_modules/next/dist/docs before using unfamiliar APIs)

- `cacheComponents` and `partialPrefetching` are enabled in `next.config.ts`.
  - Data must be cached explicitly with `'use cache'` + `cacheLife` + `cacheTag`. After a mutation, use `updateTag`/`revalidateTag`.
  - Anything that reads `cookies()`/`headers()`/`searchParams` must sit inside `<Suspense>`, otherwise the build fails.
  - Public pages should read Supabase with a cookieless client inside `'use cache'` functions. Auth-dependent UI should stream behind Suspense.
- Route protection starts in `proxy.ts` (formerly `middleware.ts`). It refreshes the session with `supabase.auth.getClaims()`, sends logged-out visitors from `/area-restrita/*` to `/login`, and sets `no-store`. Its matcher covers only `/area-restrita`, `/login` and `/auth`, so public pages stay static. It does **not** check roles; see "Área Restrita" below.
- `Date.now()`/`new Date()` in prerendered components breaks prerendering. Avoid it, or isolate it behind Suspense.

## Architecture

- `app/layout.tsx`: root `<html lang="pt-BR">`, Inter + Instrument Serif via `next/font` (CSS vars `--font-inter`/`--font-instrument-serif`), `ThemeProvider` (next-themes, class-based, dark is the default), and the default metadata.
- `app/(public)/`: public pages sharing `layout.tsx`, which renders `SiteHeader` + `SiteFooter` and has a skip link. The restricted area (`app/area-restrita/`) has its own layout and must not live under `(public)`. `app/login/` and `app/auth/` (`callback`, `sem-acesso`) are outside both groups.
- Data layer:
  - `lib/queries.ts` (server-only): every public read is a `'use cache'` function with `cacheLife("conteudo")` (a 5-minute profile defined in `next.config.ts`) and a `cacheTag` from `TAGS`. Phase 4 Server Actions must call `updateTag(TAGS.x)` after writing.
  - The functions also map rows to view types (`Membro`, `Relatorio`, `PostResumo`…).
- Área Restrita (everything uses the logged-in user's session, so RLS applies; nothing here uses `'use cache'`):
  - `lib/supabase/server.ts` (cookie client, `@supabase/ssr`) and `lib/supabase/env.ts` (env check shared with `public.ts` and `proxy.ts`). `lib/supabase/client.ts` (browser client) exists but nothing uses it yet.
  - `lib/auth.ts`: `getSessao()` reads roles from `user_roles` on every request, not from the JWT, so a revoked access takes effect on the next page. `exigirPapel(papeis)` is called at the top of **every** page, read (`lib/restrito.ts`) and Server Action. No session redirects to `/login`; no role at all goes to `/auth/sem-acesso` (signs out); wrong role gives a 404.
  - `lib/papeis.ts`: role groups (`ADMIN`, `PUBLICA`, `RH`, `TODOS`) that mirror the `private.*` helpers, plus `ABAS`, the tab list with who sees each. A new tab needs an entry there and `exigirPapel` in its page.
  - Login: `lib/actions/auth.ts` (`entrarComGoogle`, `sair`) → Google → `app/auth/callback/route.ts`. `?next=` goes through `destinoSeguro()` (`lib/auth-destino.ts`), which only accepts paths inside `/area-restrita`.
  - `lib/actions/publicacoes.ts`: posts and reports CRUD. Order in every action is role → Zod → database → files → cache (`updateTag`). Old files are deleted only after the row points to the new ones, and orphans older than 24h in the folder are cleaned up.
  - Uploads are validated by magic numbers in `lib/arquivos.ts` (shared with the alumni form), never by `Content-Type`. Images up to 5 MB, PDFs up to 20 MB.
  - `lib/corpo-post.ts` rebuilds the Tiptap JSON with only the nodes, marks and attributes `rich-text.tsx` can render, and rejects the rest. Keep the two in sync when adding a Tiptap extension.
  - `lib/calendario.ts` builds the Google Calendar embed URL from the `calendars` table. `lib/data-hora.ts` converts `datetime-local` to timestamptz in Brasília time (UTC−3).
  - UI is in `components/area-restrita/` (menu, `agenda`, post form, `editor-texto` (Tiptap), `imagens-post`, `excluir`).
- `lib/supabase/public.ts`: the cookieless `anon` client. It forces `cache: "no-store"` on fetch. Without that, Next keeps Supabase responses in `.next/cache/fetch-cache`, which survives between builds and served deleted data.
- `lib/storage.ts` `publicUrl()`: builds public Storage URLs. Missing photos and banners fall back to `/imagens/*`. `next.config.ts` allows the Supabase host in `images.remotePatterns`, and `dangerouslyAllowLocalIP` is on only when that host is local.
- Forms:
  - Public forms: Server Actions in `lib/actions/` (`contato`, `alumni`; Zod + honeypot) insert with the `anon` client. RLS only allows inserting, never reading. `next.config.ts` raises the Server Action body limit to 6 MB for the alumni photo.
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
