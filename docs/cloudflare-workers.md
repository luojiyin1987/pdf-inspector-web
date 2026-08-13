# Cloudflare Workers deployment

Production hostname: `https://pdf.itea.fit`

## Deployment model

This project is a static Vite application. Cloudflare Workers Static Assets serves the generated `dist/` directory directly; there is no Worker script and no server-side PDF processing.

`wrangler.jsonc` contains the deployment configuration:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "pdf-inspector-web",
  "compatibility_date": "2026-08-13",
  "assets": {
    "directory": "./dist",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "none"
  },
  "routes": [
    {
      "pattern": "pdf.itea.fit",
      "custom_domain": true
    }
  ]
}
```

The custom domain is therefore created and maintained by Wrangler as part of the Worker configuration. No separate Pages Domain API call is needed.

## Deploy

Install dependencies and authenticate Wrangler once:

```bash
npm install
npx wrangler login
```

Then deploy:

```bash
npm run deploy
```

`npm run deploy` performs the production build and output verification before running `wrangler deploy`.

For non-interactive CI, provide Cloudflare credentials through CI secrets rather than committing them to the repository.

## Custom-domain note

`pdf.itea.fit` must be in an active Cloudflare zone that the deploying account can manage. If the hostname already has a conflicting CNAME record, remove the conflict before the first Worker custom-domain deployment.

## Headers and caching

`public/_headers` is copied by Vite into `dist/_headers` and interpreted by Workers Static Assets.

The current policy:

- denies iframe embedding
- disables MIME sniffing
- uses a conservative referrer policy
- disables unused browser permissions
- gives hashed Vite assets a one-year immutable browser cache
- sends `X-Robots-Tag: noindex` on the generated `*.workers.dev` hostname

The production `pdf.itea.fit` hostname remains indexable.

## Production smoke checks

After deployment:

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

Inspect one hashed file under `/assets/` and confirm:

```text
cache-control: public, max-age=31536000, immutable
```

If the Worker `workers.dev` hostname is enabled, confirm it returns:

```text
x-robots-tag: noindex
```
