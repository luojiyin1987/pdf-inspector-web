# PDF Inspector Web

Browser-only PDF inspection powered by [`@firecrawl/pdf-inspector-wasm`](https://www.npmjs.com/package/@firecrawl/pdf-inspector-wasm).

## MVP

- classify PDFs as text-based, scanned, image-based, or mixed
- show page count, confidence, processing time, and pages needing OCR
- surface encoding issues, table pages, and multi-column pages
- extract Markdown locally in a Web Worker
- copy or download Markdown output
- keep PDF bytes in the browser; no upload or server-side parsing

## Robustness

- validates the PDF signature before loading the full document
- rejects empty files and PDFs larger than 100 MB to protect browser memory
- supports cancelling active inspection by terminating and recreating the worker
- recovers from worker failures on the next inspection
- summarizes long page lists into ranges for large PDFs
- includes drag state, live processing status, keyboard access, and reduced-motion support

## SEO static pages

The production build generates crawlable, JavaScript-independent landing pages for common PDF tasks:

- `/pdf-to-markdown/`
- `/pdf-text-extractor/`
- `/pdf-type-detector/`
- `/does-pdf-need-ocr/`

The same build also writes `dist/sitemap.xml` and `dist/robots.txt`. The canonical production origin is kept in the small `config/site.mjs` module.

These landing pages explain the use case and link back to the browser tool at `/`; they do not duplicate the PDF parsing runtime or upload documents anywhere.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The build runs TypeScript checks, Vite, the SEO generator, and a final production-output verifier. Vite output is written to `dist/`, then the static SEO pages, sitemap, and robots file are added and validated.

To rerun only the output checks:

```bash
npm run verify:dist
```

## Cloudflare Workers

Deployment uses Workers Static Assets. `wrangler.jsonc` is the deployment source of truth:

- Worker name: `pdf-inspector-web`
- static assets: `./dist`
- custom domain: `pdf.itea.fit`
- HTML handling: `auto-trailing-slash`
- missing assets: return 404

`public/_headers` supplies security headers, immutable caching for hashed assets, and `noindex` for the Cloudflare-provided `workers.dev` hostname.

Deploy with:

```bash
npm run deploy
```

The command builds and verifies `dist/`, then runs `wrangler deploy`. No Pages project, Pages Domain API wrapper, or custom deployment script is required.

See [`docs/cloudflare-workers.md`](docs/cloudflare-workers.md) for authentication, custom-domain notes, and production smoke checks.

## Architecture

```text
PDF File
   ↓
Browser File API
   ↓
Web Worker
   ↓
@firecrawl/pdf-inspector-wasm
   ↓
classification + OCR routing + Markdown
   ↓
React UI
```

The project deliberately does not provide OCR. Scanned or image-only pages are identified so the user can decide whether a separate OCR step is needed.
