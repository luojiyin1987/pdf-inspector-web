import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const DIST_DIR = 'dist'
const SITE_ORIGIN = 'https://pdf.itea.fit'

const pages = [
  {
    slug: 'pdf-to-markdown',
    title: 'PDF to Markdown',
    description:
      'Convert text-based PDFs to clean Markdown locally in your browser. No upload, no account, and scanned pages are flagged when OCR is needed.',
    eyebrow: 'Local PDF conversion',
    heading: 'Convert PDF to Markdown in your browser',
    intro:
      'Choose a PDF and PDF Inspector extracts structured Markdown locally with WebAssembly. Text, headings, lists, tables, and reading order are preserved when the PDF contains usable embedded text.',
    bullets: [
      'PDF bytes stay on your device',
      'Download or copy the extracted Markdown',
      'Scanned and image-only pages are identified instead of silently returning empty output',
    ],
    sections: [
      {
        heading: 'When does PDF to Markdown work best?',
        body: 'It works best with native-text reports, research papers, invoices, manuals, and other PDFs that contain selectable text. Image-only scans need OCR before their text can be extracted.',
      },
      {
        heading: 'Why inspect before OCR?',
        body: 'Many PDFs already contain usable text. Detecting that first avoids sending every document through a slower OCR pipeline and shows exactly which pages still need OCR.',
      },
    ],
  },
  {
    slug: 'pdf-text-extractor',
    title: 'PDF Text Extractor',
    description:
      'Extract text and Markdown from PDFs locally in your browser while keeping the document on your device. Detect encoding and layout issues before using the output.',
    eyebrow: 'Private text extraction',
    heading: 'Extract text from a PDF without uploading it',
    intro:
      'PDF Inspector parses embedded PDF text in a browser Web Worker. It also reports layout complexity and encoding warnings so you can judge whether the extracted result is trustworthy.',
    bullets: [
      'Runs locally with browser WebAssembly',
      'Detects table and multi-column pages',
      'Flags possible font encoding problems',
    ],
    sections: [
      {
        heading: 'What can be extracted?',
        body: 'For text-based PDFs, the parser can recover text structure and produce Markdown with headings, lists, tables, links, and reading order. Results depend on how the source PDF encodes its content.',
      },
      {
        heading: 'What about scanned documents?',
        body: 'A scan usually contains page images rather than embedded text. PDF Inspector identifies pages that need OCR so you can route only those pages to an OCR tool.',
      },
    ],
  },
  {
    slug: 'pdf-type-detector',
    title: 'PDF Type Detector',
    description:
      'Check whether a PDF is text-based, scanned, image-based, or mixed. Analyze it locally in your browser without uploading the document.',
    eyebrow: 'PDF classification',
    heading: 'Detect whether a PDF is text-based or scanned',
    intro:
      'PDF Inspector classifies documents as Text Based, Scanned, Image Based, or Mixed and reports a confidence score plus the pages that appear to need OCR.',
    bullets: [
      'Classifies the document before extraction',
      'Reports page count and confidence',
      'Shows OCR candidates page by page',
    ],
    sections: [
      {
        heading: 'Why PDF type matters',
        body: 'A PDF is a container, not a guarantee that selectable text exists. Two files that look identical on screen may require completely different processing depending on whether their pages contain text operators or only images.',
      },
      {
        heading: 'Mixed PDFs are common',
        body: 'Some documents combine text pages with scanned attachments or image-only sections. Detecting the PDF at page level lets you avoid treating the whole document as either text-only or scan-only.',
      },
    ],
  },
  {
    slug: 'does-pdf-need-ocr',
    title: 'Does My PDF Need OCR?',
    description:
      'Check which PDF pages need OCR before sending the document to an OCR service. The analysis runs locally and identifies scanned or image-only pages.',
    eyebrow: 'OCR readiness check',
    heading: 'Check whether your PDF needs OCR',
    intro:
      'Upload is not required. PDF Inspector examines the file locally and lists pages that lack usable embedded text, helping you decide whether OCR is necessary at all.',
    bullets: [
      'Find pages that need OCR',
      'Avoid OCR for pages that already contain text',
      'Keep sensitive PDFs inside the browser',
    ],
    sections: [
      {
        heading: 'When is OCR necessary?',
        body: 'OCR is usually needed when a page is a photograph or scan of text rather than real PDF text. If you can select and copy clean text from the page, OCR may be unnecessary.',
      },
      {
        heading: 'Why check first?',
        body: 'OCR adds latency, cost, and another processing step. A quick local classification can separate pages that already contain text from pages that genuinely need image-to-text recognition.',
      },
    ],
  },
]

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

function renderNavigation(currentSlug) {
  return pages
    .filter((page) => page.slug !== currentSlug)
    .map((page) => `<a href="/${page.slug}/">${escapeHtml(page.title)}</a>`)
    .join('\n              ')
}

function renderPage(page) {
  const canonical = `${SITE_ORIGIN}/${page.slug}/`
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.title,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    url: canonical,
    description: page.description,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }).replaceAll('<', '\\u003c')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(page.description)}" />
    <meta name="robots" content="index,follow" />
    <meta name="theme-color" content="#172033" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(page.title)} | PDF Inspector" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="${escapeHtml(page.title)} | PDF Inspector" />
    <meta name="twitter:description" content="${escapeHtml(page.description)}" />
    <title>${escapeHtml(page.title)} | PDF Inspector</title>
    <script type="application/ld+json">${structuredData}</script>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; background: #f4f6f8; }
      * { box-sizing: border-box; }
      body { margin: 0; min-width: 320px; background: radial-gradient(circle at top left, rgba(82,111,255,.08), transparent 32rem), #f4f6f8; }
      a { color: inherit; }
      .shell { width: min(960px, calc(100% - 32px)); margin: 0 auto; }
      header { padding: 28px 0 72px; }
      .brand { font-weight: 800; text-decoration: none; }
      main { padding-bottom: 72px; }
      .eyebrow { margin: 0 0 10px; color: #56617a; font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
      h1 { max-width: 780px; margin: 0 0 22px; font-size: clamp(2.5rem, 7vw, 5rem); line-height: .98; letter-spacing: -.06em; }
      h2 { margin: 0 0 10px; font-size: 1.45rem; letter-spacing: -.025em; }
      p, li { color: #5f6a80; line-height: 1.7; }
      .lede { max-width: 760px; font-size: 1.08rem; }
      .cta { display: inline-flex; margin: 18px 0 28px; padding: 12px 17px; border-radius: 10px; background: #172033; color: white; font-weight: 800; text-decoration: none; }
      .privacy { margin: 0; font-size: .88rem; font-weight: 700; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 34px 0; padding: 0; list-style: none; }
      .grid li, section { padding: 22px; border: 1px solid #dde1e8; border-radius: 18px; background: rgba(255,255,255,.92); box-shadow: 0 12px 36px rgba(27,38,63,.06); }
      .grid li { color: #35405a; font-weight: 700; }
      section { margin-top: 14px; }
      nav { display: flex; flex-wrap: wrap; gap: 10px 18px; margin-top: 36px; padding-top: 24px; border-top: 1px solid #dfe3ea; }
      nav a { color: #35405a; font-size: .9rem; font-weight: 700; }
      footer { padding: 24px 0 42px; color: #70798b; font-size: .82rem; text-align: center; }
      @media (max-width: 700px) { header { padding-bottom: 52px; } .grid { grid-template-columns: 1fr; } .shell { width: min(100% - 20px, 960px); } }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <a class="brand" href="/">PDF Inspector</a>
      </header>
      <main>
        <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
        <h1>${escapeHtml(page.heading)}</h1>
        <p class="lede">${escapeHtml(page.intro)}</p>
        <a class="cta" href="/">Open PDF Inspector</a>
        <p class="privacy">No upload · No server processing · Browser WebAssembly</p>

        <ul class="grid">
          ${page.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join('\n          ')}
        </ul>

        ${page.sections
          .map(
            (section) => `<section>
          <h2>${escapeHtml(section.heading)}</h2>
          <p>${escapeHtml(section.body)}</p>
        </section>`,
          )
          .join('\n\n        ')}

        <nav aria-label="Related PDF tools">
          <a href="/">PDF Inspector</a>
          ${renderNavigation(page.slug)}
        </nav>
      </main>
      <footer>PDF files are processed locally in your browser. PDF Inspector does not provide OCR.</footer>
    </div>
  </body>
</html>
`
}

await mkdir(DIST_DIR, { recursive: true })

for (const page of pages) {
  const outputDir = join(DIST_DIR, page.slug)
  await mkdir(outputDir, { recursive: true })
  await writeFile(join(outputDir, 'index.html'), renderPage(page), 'utf8')
}

const urls = [`${SITE_ORIGIN}/`, ...pages.map((page) => `${SITE_ORIGIN}/${page.slug}/`)]
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map((url) => `  <url><loc>${url}</loc></url>`)
  .join('\n')}\n</urlset>\n`

await writeFile(join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8')
await writeFile(
  join(DIST_DIR, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
  'utf8',
)

console.log(`Generated ${pages.length} SEO pages, sitemap.xml, and robots.txt for ${SITE_ORIGIN}`)
