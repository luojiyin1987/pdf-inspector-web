export type PdfType = 'TextBased' | 'Scanned' | 'ImageBased' | 'Mixed'

export interface PdfLayoutComplexity {
  isComplex: boolean
  pagesWithTables: number[]
  pagesWithColumns: number[]
}

export interface PdfProcessResult {
  pdfType: PdfType
  markdown?: string
  pageCount: number
  processingTimeMs: number
  pagesNeedingOcr: number[]
  ocrReasonsByPage: Array<{
    page: number
    reasons: string[]
  }>
  title?: string
  confidence: number
  layout: PdfLayoutComplexity
  hasEncodingIssues: boolean
}

export interface ProcessPdfRequest {
  type: 'process'
  requestId: number
  buffer: ArrayBuffer
}

export type ProcessPdfResponse =
  | {
      type: 'success'
      requestId: number
      result: PdfProcessResult
    }
  | {
      type: 'error'
      requestId: number
      message: string
    }
