# Cloudflare Pages deployment

Production hostname: `https://pdf.itea.fit`

## Pages project settings

Connect this GitHub repository to Cloudflare Pages and use:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node.js: 22.x

Vite 8 requires a modern Node.js runtime, so Node 22 is the simplest production choice.

## Custom domain

After the first successful Pages deployment:

1. Open the Pages project in Cloudflare.
2. Open **Custom domains** and add `pdf.itea.fit`.
3. Complete the domain association before relying on a DNS CNAME alone.
4. If `itea.fit` is already managed in the same Cloudflare account, Cloudflare can create the DNS record during the custom-domain flow.

Do not manually point a CNAME at the Pages hostname before associating the custom domain in Pages; Cloudflare documents that this can result in a `522` response.

## Headers and caching

`public/_headers` is copied by Vite into `dist/_headers` and is interpreted by Cloudflare Pages.

The current policy:

- denies iframe embedding
- disables MIME sniffing
- uses a conservative referrer policy
- disables unused browser permissions
- gives hashed Vite assets a one-year immutable browser cache
- sends `X-Robots-Tag: noindex` on Cloudflare-provided `*.pages.dev` hosts and preview hosts to avoid duplicate indexing

HTML and generated SEO pages otherwise keep Cloudflare Pages' default revalidation behavior, so content updates are not pinned in browser cache.

## Build verification

`npm run build` now finishes with `scripts/verify-dist.mjs`. The verifier fails the build when production output is missing required SEO pages, `_headers`, `robots.txt`, `sitemap.xml`, or expected canonical URLs.

It can also be rerun independently:

```bash
npm run verify:dist
```

## Production smoke checks

After deployment, verify the custom domain:

```bash
curl -I https://pdf.itea.fit/
curl -I https://pdf.itea.fit/pdf-to-markdown/
curl -s https://pdf.itea.fit/sitemap.xml
curl -s https://pdf.itea.fit/robots.txt
```

Confirm the HTML responses include at least:

```text
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
```

Then inspect one hashed file under `/assets/` and confirm it receives:

```text
cache-control: public, max-age=31536000, immutable
```

Finally, request the Cloudflare-provided `*.pages.dev` hostname and confirm it includes:

```text
x-robots-tag: noindex
```

The production `pdf.itea.fit` hostname should not receive that `noindex` header.
