# Cloudflare Pages deployment

Production hostname: `https://pdf.itea.fit`

The production hostname, Pages project name, and production branch are centralized in [`config/site.mjs`](../config/site.mjs). The same hostname is used by SEO canonical URLs, sitemap generation, production verification, and the deployment script.

## Pages project settings

Connect this GitHub repository to Cloudflare Pages and use:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node.js: 22.x

Vite 8 and the pinned Wrangler CLI are both intended to run on Node 22 in this project.

## Direct deployment with Wrangler

The repository includes a cross-platform Node deployment wrapper:

```bash
npm run deploy:cf
```

The command:

1. runs the production build and `dist/` verification;
2. deploys `dist/` with the project-local Wrangler version;
3. uses the Pages project name from `config/site.mjs`;
4. detects the current Git branch and passes it to Pages;
5. attaches the current commit SHA and subject when Git metadata is available;
6. for the production branch only, checks whether `pdf.itea.fit` is associated with the Pages project and adds it through the Cloudflare Pages API when API credentials are available.

A deployment from `main` targets the production branch when the Pages project is configured with `main` as its production branch. Deploying another branch creates or updates that branch's preview deployment and never modifies the production custom domain.

To override the project name without editing the repository config:

```bash
CLOUDFLARE_PAGES_PROJECT_NAME=my-pages-project npm run deploy:cf
```

To override the deployment branch:

```bash
npm run deploy:cf -- --branch preview
```

If `dist/` is already current and verified, skip the rebuild:

```bash
npm run deploy:cf -- --skip-build
```

To deploy production without checking or configuring the custom domain:

```bash
npm run deploy:cf -- --skip-domain
```

Other arguments are forwarded to `wrangler pages deploy`, so Wrangler deployment options can be added without changing the wrapper.

## Production domain configuration

The default deployment configuration lives in `config/site.mjs`:

```js
CLOUDFLARE_PAGES_DOMAIN = 'pdf.itea.fit'
CLOUDFLARE_PAGES_PROJECT_NAME = 'pdf-inspector-web'
CLOUDFLARE_PAGES_PRODUCTION_BRANCH = 'main'
```

Changing `CLOUDFLARE_PAGES_DOMAIN` also changes `SITE_ORIGIN`, so generated canonical URLs, `sitemap.xml`, `robots.txt`, verification, and deployment stay aligned.

Environment variables can override these values without changing source files:

```text
CLOUDFLARE_PAGES_DOMAIN
CLOUDFLARE_PAGES_PROJECT_NAME
CLOUDFLARE_PAGES_PRODUCTION_BRANCH
```

For a production deployment, the wrapper uses the Cloudflare Pages Domains API when both of these are available:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

It first lists the project's existing domains. If the configured domain already exists, deployment continues without changing it. If it is missing, the wrapper adds it. The returned status can initially be `pending` while Cloudflare finishes domain validation or certificate provisioning.

If the account ID or API token is not set, the Pages upload can still use Wrangler's interactive login. In that case the wrapper prints a warning and leaves domain association unchanged; add the domain once from **Pages > Custom domains**, or rerun with API credentials.

Do not manually point a CNAME at the Pages hostname before associating the custom domain with the Pages project.

## Authentication

### Local deployment

Install dependencies and authenticate Wrangler once:

```bash
npm install
npx wrangler login
npm run deploy:cf
```

Wrangler login is enough to upload the Pages deployment. To let the wrapper also create the custom-domain association automatically, export `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` before running it.

Credentials are not stored in this repository.

### CI deployment

For non-interactive CI, provide these secret environment variables:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

The token should be scoped to the target account with Cloudflare Pages write/edit permission. Do not commit either value to the repository.

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

`npm run build` finishes with `scripts/verify-dist.mjs`. The verifier fails the build when production output is missing required SEO pages, `_headers`, `robots.txt`, `sitemap.xml`, or canonical URLs for the configured production hostname.

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
