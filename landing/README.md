# @effract/landing

The marketing site and docs for effract — **https://effract.tmonier.com**.

Astro 6 (static) · Tailwind 4 · i18n (en/fr) · oxlint/oxfmt · `astro check`. Animations are pure CSS
keyframes + a single `IntersectionObserver` for scroll reveals — no runtime animation library.

## Develop

```sh
just landing          # dev server (astro dev)
just landing-check    # oxlint + oxfmt + astro check
just landing-build    # static build → landing/dist
```

## Structure

```
src/
  tokens/      design tokens (tokens.css → @theme → global.css)
  styles/      global.css (fonts, base, keyframes, .reveal)
  layouts/     Base.astro (SEO/JSON-LD/reveal), DocsLayout.astro (sidebar + prose)
  components/  Logo, Nav, Hero, Thesis, Everywhere, Features, Cta, Footer, CodeWindow, HomePage
  i18n/        en.ts / fr.ts (typed SiteContent)
  content/     docs/*.md (the integrated documentation)
  pages/       index.astro, fr/index.astro, docs/
public/        favicon.svg, og.png, _headers, robots.txt
```

## Deploy (Cloudflare Pages)

Connect the repo and set, in the Pages project:

- **Root directory:** `/` (repo root — the build needs the pnpm workspace)
- **Build command:** `pnpm install && pnpm --filter @effract/landing build`
- **Build output directory:** `landing/dist`
- **Custom domain:** `effract.tmonier.com`

`public/_headers` ships the security headers and long-cache rules; the sitemap is generated at
`/sitemap-index.xml`.
