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

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The Vite output is written to `dist/` and can be hosted as static assets, including on Cloudflare.

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
