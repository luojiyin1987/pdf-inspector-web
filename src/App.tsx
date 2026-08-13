import { useEffect, useRef, useState } from 'react'
import { PdfDropzone } from './components/PdfDropzone'
import { PdfResult } from './components/PdfResult'
import type { PdfProcessResult, ProcessPdfRequest, ProcessPdfResponse } from './types'
import './styles.css'

interface CompletedInspection {
  fileName: string
  result: PdfProcessResult
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function App() {
  const workerRef = useRef<Worker | null>(null)
  const activeRequestRef = useRef(0)
  const activeFileNameRef = useRef('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingFileName, setProcessingFileName] = useState('')
  const [inspection, setInspection] = useState<CompletedInspection | null>(null)
  const [error, setError] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy Markdown')

  useEffect(() => {
    const worker = new Worker(new URL('./workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<ProcessPdfResponse>) => {
      const response = event.data
      if (response.requestId !== activeRequestRef.current) return

      setIsProcessing(false)
      if (response.type === 'error') {
        setError(response.message)
        return
      }

      setInspection({ fileName: activeFileNameRef.current, result: response.result })
    }

    worker.onerror = () => {
      setIsProcessing(false)
      setError('The PDF worker failed to start. Refresh the page and try again.')
    }

    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  const inspectFile = async (file: File) => {
    if (!isPdf(file)) {
      setError('Please choose a PDF file.')
      return
    }

    setError('')
    setInspection(null)
    setCopyLabel('Copy Markdown')
    setProcessingFileName(file.name)
    activeFileNameRef.current = file.name
    setIsProcessing(true)

    try {
      const requestId = activeRequestRef.current + 1
      activeRequestRef.current = requestId
      const buffer = await file.arrayBuffer()
      const request: ProcessPdfRequest = { type: 'process', requestId, buffer }
      workerRef.current?.postMessage(request, [buffer])
    } catch (readError) {
      setIsProcessing(false)
      setError(readError instanceof Error ? readError.message : 'Unable to read this PDF.')
    }
  }

  const copyMarkdown = async () => {
    const markdown = inspection?.result.markdown
    if (!markdown) return

    try {
      await navigator.clipboard.writeText(markdown)
      setCopyLabel('Copied')
      window.setTimeout(() => setCopyLabel('Copy Markdown'), 1600)
    } catch {
      setCopyLabel('Copy failed')
    }
  }

  const downloadMarkdown = () => {
    const markdown = inspection?.result.markdown
    if (!inspection || !markdown) return

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = inspection.fileName.replace(/\.pdf$/i, '') + '.md'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    activeRequestRef.current += 1
    setInspection(null)
    setError('')
    setProcessingFileName('')
    activeFileNameRef.current = ''
    setIsProcessing(false)
    setCopyLabel('Copy Markdown')
  }

  return (
    <main className="shell">
      <header className="hero">
        <a className="brand" href="/" aria-label="PDF Inspector home">
          PDF Inspector
        </a>
        <div className="hero__content">
          <p className="eyebrow">Private, local PDF analysis</p>
          <h1>See what is really inside your PDF.</h1>
          <p className="hero__lede">
            Detect scanned pages, find OCR candidates, inspect layout complexity, and extract clean
            Markdown — entirely in your browser.
          </p>
          <div className="privacy-pill">No upload · No server processing · WebAssembly</div>
        </div>
      </header>

      {!inspection && (
        <section className="workspace" aria-labelledby="upload-heading">
          <div className="workspace__intro">
            <p className="eyebrow">Start inspection</p>
            <h2 id="upload-heading">Choose a PDF</h2>
            <p>Text-based PDFs can be converted directly. Scanned pages are flagged for OCR.</p>
          </div>
          <PdfDropzone
            disabled={isProcessing}
            fileName={processingFileName}
            onFile={inspectFile}
          />
          {error && <div className="notice notice--error" role="alert">{error}</div>}
        </section>
      )}

      {inspection && (
        <PdfResult
          fileName={inspection.fileName}
          result={inspection.result}
          onCopy={copyMarkdown}
          onDownload={downloadMarkdown}
          onReset={reset}
          copyLabel={copyLabel}
        />
      )}

      <footer>
        Powered by Firecrawl's open-source pdf-inspector. PDF bytes are processed locally with WebAssembly.
      </footer>
    </main>
  )
}
