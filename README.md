# PDF Inspector Web

A browser-first PDF inspection tool powered by Firecrawl's [`pdf-inspector`](https://github.com/firecrawl/pdf-inspector) WebAssembly package.

## MVP features

- Analyze PDF files entirely in the browser.
- Classify PDFs as text-based, scanned, image-based, or mixed.
- Show 1-indexed pages that need OCR.
- Surface encoding issues, table pages, and multi-column pages.
- Extract and preview Markdown when an embedded text layer is available.
- Copy or download extracted Markdown.
- Keep parsing off the React main thread with a Web Worker.

## Privacy

PDF bytes are passed directly from the file picker to a browser Web Worker. The MVP has no upload endpoint and no server-side PDF processing.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The generated `dist/` directory is static and can be hosted on Cloudflare Pages or another static host.

## Architecture

```text
PDF file
  -> browser ArrayBuffer
  -> Web Worker
  -> @firecrawl/pdf-inspector-wasm
  -> classification + OCR routing + Markdown
  -> React UI
```

## Scope

This project deliberately does not perform OCR. Scanned/image-only pages are detected and reported so they can be routed to a separate OCR tool or service later.
