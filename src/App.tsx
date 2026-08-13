import { useEffect, useRef, useState } from 'react'
import { PdfDropzone } from './components/PdfDropzone'
import { PdfResult } from './components/PdfResult'
import { validatePdfFile } from './lib/file-validation'
import type { PdfProcessResult, ProcessPdfRequest, ProcessPdfResponse } from './types'
import './styles.css'

interface CompletedInspection {
  fileName: string
  result: PdfProcessResult
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

  const installWorker = () => {
    const worker = new Worker(new URL('./workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<ProcessPdfResponse>) => {
      const response = event.data
      if (worker !== workerRef.current || response.requestId !== activeRequestRef.current) return

      setIsProcessing(false)
      if (response.type === 'error') {
        setError(response.message)
        return
      }

      setInspection({ fileName: activeFileNameRef.current, result: response.result })
    }

    worker.onerror = () => {
      if (worker !== workerRef.current) return

      activeRequestRef.current += 1
      setIsProcessing(false)
      setError('The PDF worker stopped unexpectedly. Try the file again or refresh the page.')
      worker.terminate()
      workerRef.current = null
    }

    workerRef.current = worker
    return worker
  }

  const restartWorker = () => {
    workerRef.current?.terminate()
    workerRef.current = null
    installWorker()
  }

  useEffect(() => {
    const worker = installWorker()
    return () => {
      worker.terminate()
      if (workerRef.current === worker) workerRef.current = null
    }
  }, [])

  const inspectFile = async (file: File) => {
    const requestId = activeRequestRef.current + 1
    activeRequestRef.current = requestId

    setError('')
    setInspection(null)
    setCopyLabel('Copy Markdown')

    try {
      const validationError = await validatePdfFile(file)
      if (requestId !== activeRequestRef.current) return

      if (validationError) {
        setError(validationError)
        return
      }

      setProcessingFileName(file.name)
      activeFileNameRef.current = file.name
      setIsProcessing(true)

      const buffer = await file.arrayBuffer()
      if (requestId !== activeRequestRef.current) return

      if (!workerRef.current) installWorker()
      const request: ProcessPdfRequest = { type: 'process', requestId, buffer }
      workerRef.current?.postMessage(request, [buffer])
    } catch (readError) {
      if (requestId !== activeRequestRef.current) return

      setIsProcessing(false)
      setError(readError instanceof Error ? readError.message : 'Unable to read this PDF.')
    }
  }

  const cancelProcessing = () => {
    activeRequestRef.current += 1
    restartWorker()
    setIsProcessing(false)
    setProcessingFileName('')
    activeFileNameRef.current = ''
    setError('')
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
        <section className="workspace" aria-labelledby="upload-heading" aria-busy={isProcessing}>
          <div className="workspace__intro">
            <p className="eyebrow">Start inspection</p>
            <h2 id="upload-heading">Choose a PDF</h2>
            <p>Text-based PDFs can be converted directly. Scanned pages are flagged for OCR.</p>
          </div>
          <PdfDropzone
            disabled={isProcessing}
            fileName={processingFileName}
            onFile={inspectFile}
            onCancel={cancelProcessing}
          />
          <div className="status-region" aria-live="polite" aria-atomic="true">
            {isProcessing && <span>Inspecting {processingFileName}. This can take longer for large PDFs.</span>}
          </div>
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
        <nav className="footer-links" aria-label="PDF tools">
          <a href="/pdf-to-markdown/">PDF to Markdown</a>
          <a href="/pdf-text-extractor/">PDF Text Extractor</a>
          <a href="/pdf-type-detector/">PDF Type Detector</a>
          <a href="/does-pdf-need-ocr/">Does My PDF Need OCR?</a>
        </nav>
        <p>Powered by Firecrawl's open-source pdf-inspector. PDF bytes are processed locally with WebAssembly.</p>
      </footer>
    </main>
  )
}
