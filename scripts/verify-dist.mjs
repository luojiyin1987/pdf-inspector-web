import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const dist = 'dist'
const origin = 'https://pdf.itea.fit'
const seoSlugs = [
  'pdf-to-markdown',
  'pdf-text-extractor',
  'pdf-type-detector',
  'does-pdf-need-ocr',
]

const requiredFiles = [
  'index.html',
  '_headers',
  'robots.txt',
  'sitemap.xml',
  ...seoSlugs.map((slug) => join(slug, 'index.html')),
]

for (const relativePath of requiredFiles) {
  await access(join(dist, relativePath))
}

const headers = await readFile(join(dist, '_headers'), 'utf8')
const requiredHeaderSnippets = [
  'X-Content-Type-Options: nosniff',
  'X-Frame-Options: DENY',
  'Referrer-Policy: strict-origin-when-cross-origin',
  'Cache-Control: public, max-age=31536000, immutable',
  'https://:project.pages.dev/*',
  'X-Robots-Tag: noindex',
]

for (const snippet of requiredHeaderSnippets) {
  if (!headers.includes(snippet)) {
    throw new Error(`dist/_headers is missing: ${snippet}`)
  }
}

const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
for (const url of [origin + '/', ...seoSlugs.map((slug) => `${origin}/${slug}/`)]) {
  if (!sitemap.includes(`<loc>${url}</loc>`)) {
    throw new Error(`sitemap.xml is missing ${url}`)
  }
}

const robots = await readFile(join(dist, 'robots.txt'), 'utf8')
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) {
  throw new Error('robots.txt does not reference the production sitemap')
}

for (const slug of seoSlugs) {
  const html = await readFile(join(dist, slug, 'index.html'), 'utf8')
  const canonical = `<link rel="canonical" href="${origin}/${slug}/" />`
  if (!html.includes(canonical)) {
    throw new Error(`${slug}/index.html has an unexpected canonical URL`)
  }
}

console.log(
  `Verified production dist: ${requiredFiles.length} required files, security headers, sitemap, robots, and ${seoSlugs.length} canonical SEO pages.`,
)
