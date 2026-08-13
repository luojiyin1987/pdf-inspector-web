import type { PdfProcessResult } from '../types'

interface PdfResultProps {
  fileName: string
  result: PdfProcessResult
  onCopy: () => void
  onDownload: () => void
  onReset: () => void
  copyLabel: string
}

function formatPdfType(type: PdfProcessResult['pdfType']) {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2')
}

function formatPageRanges(pages: number[]) {
  if (pages.length === 0) return ''

  const sorted = [...new Set(pages)].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]

  for (const page of sorted.slice(1)) {
    if (page === end + 1) {
      end = page
      continue
    }

    ranges.push(start === end ? `${start}` : `${start}–${end}`)
    start = page
    end = page
  }

  ranges.push(start === end ? `${start}` : `${start}–${end}`)
  const visibleRanges = ranges.slice(0, 12)
  const suffix = ranges.length > visibleRanges.length ? ', …' : ''
  return visibleRanges.join(', ') + suffix
}

export function PdfResult({
  fileName,
  result,
  onCopy,
  onDownload,
  onReset,
  copyLabel,
}: PdfResultProps) {
  const markdown = result.markdown?.trim() ?? ''
  const needsOcr = result.pagesNeedingOcr.length > 0
  const confidence = `${Math.round(result.confidence * 100)}%`
  const ocrPages = formatPageRanges(result.pagesNeedingOcr)
  const tablePages = formatPageRanges(result.layout.pagesWithTables)
  const columnPages = formatPageRanges(result.layout.pagesWithColumns)

  return (
    <section className="result" aria-live="polite">
      <div className="result__header">
        <div>
          <p className="eyebrow">Inspection complete</p>
          <h2 className="result__filename">{fileName}</h2>
        </div>
        <button className="button button--secondary" type="button" onClick={onReset}>
          Inspect another PDF
        </button>
      </div>

      <div className="stats" aria-label="PDF inspection summary">
        <article className="stat">
          <span>PDF type</span>
          <strong>{formatPdfType(result.pdfType)}</strong>
        </article>
        <article className="stat">
          <span>Pages</span>
          <strong>{result.pageCount}</strong>
        </article>
        <article className="stat">
          <span>Confidence</span>
          <strong>{confidence}</strong>
        </article>
        <article className="stat">
          <span>Processing</span>
          <strong>{Math.round(result.processingTimeMs)} ms</strong>
        </article>
      </div>

      {needsOcr && (
        <div className="notice notice--warning">
          <strong>This PDF needs OCR on {result.pagesNeedingOcr.length} page(s).</strong>
          <p>
            pdf-inspector does not run OCR. Pages needing OCR: {ocrPages}.
          </p>
        </div>
      )}

      {result.hasEncodingIssues && (
        <div className="notice notice--warning">
          <strong>Possible font encoding issues detected.</strong>
          <p>Some extracted text may be incomplete or garbled and may benefit from OCR.</p>
        </div>
      )}

      <div className="details-grid">
        <article className="detail-card">
          <span>Tables detected</span>
          <strong>{result.layout.pagesWithTables.length}</strong>
          <small>
            {result.layout.pagesWithTables.length
              ? `Pages ${tablePages}`
              : 'No table pages detected'}
          </small>
        </article>
        <article className="detail-card">
          <span>Multi-column pages</span>
          <strong>{result.layout.pagesWithColumns.length}</strong>
          <small>
            {result.layout.pagesWithColumns.length
              ? `Pages ${columnPages}`
              : 'No multi-column pages detected'}
          </small>
        </article>
      </div>

      <div className="markdown-panel">
        <div className="markdown-panel__header">
          <div>
            <p className="eyebrow">Extracted output</p>
            <h3>Markdown</h3>
          </div>
          {markdown && (
            <div className="actions">
              <button className="button button--secondary" type="button" onClick={onCopy}>
                {copyLabel}
              </button>
              <button className="button" type="button" onClick={onDownload}>
                Download .md
              </button>
            </div>
          )}
        </div>

        {markdown ? (
          <pre className="markdown-output" tabIndex={0} aria-label="Extracted Markdown">
            <code>{markdown}</code>
          </pre>
        ) : (
          <div className="empty-output">
            <strong>No extractable Markdown was found.</strong>
            <p>
              This commonly happens with scanned or image-only PDFs. Use the OCR page list above to
              decide what needs OCR.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
