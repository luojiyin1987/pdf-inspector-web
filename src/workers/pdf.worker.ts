import init, { processPdf } from '@firecrawl/pdf-inspector-wasm'
import type { PdfProcessResult, ProcessPdfRequest, ProcessPdfResponse } from '../types'

const worker = self as unknown as DedicatedWorkerGlobalScope
let wasmReady: Promise<unknown> | undefined

function ensureWasmReady() {
  wasmReady ??= init()
  return wasmReady
}

worker.onmessage = async (event: MessageEvent<ProcessPdfRequest>) => {
  const { type, requestId, buffer } = event.data
  if (type !== 'process') return

  try {
    await ensureWasmReady()
    const result = processPdf(new Uint8Array(buffer)) as PdfProcessResult
    const response: ProcessPdfResponse = { type: 'success', requestId, result }
    worker.postMessage(response)
  } catch (error) {
    const response: ProcessPdfResponse = {
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : 'Unable to inspect this PDF.',
    }
    worker.postMessage(response)
  }
}
