export const MAX_PDF_SIZE_BYTES = 100 * 1024 * 1024
export const MAX_PDF_SIZE_LABEL = '100 MB'

function looksLikePdfNameOrMime(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export async function validatePdfFile(file: File): Promise<string | null> {
  if (!looksLikePdfNameOrMime(file)) {
    return 'Please choose a PDF file.'
  }

  if (file.size === 0) {
    return 'This PDF is empty.'
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    return `This PDF is larger than ${MAX_PDF_SIZE_LABEL}. Choose a smaller file to avoid exhausting browser memory.`
  }

  const prefix = new Uint8Array(await file.slice(0, 1024).arrayBuffer())
  const header = new TextDecoder().decode(prefix)

  if (!header.includes('%PDF-')) {
    return 'This file does not appear to contain a valid PDF header.'
  }

  return null
}
