import { useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'

interface PdfDropzoneProps {
  disabled?: boolean
  fileName?: string
  onFile: (file: File) => void
}

export function PdfDropzone({ disabled = false, fileName, onFile }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const pickFirstFile = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onFile(file)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    pickFirstFile(event.target.files)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!disabled) pickFirstFile(event.dataTransfer.files)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  return (
    <div
      className={`dropzone${disabled ? ' dropzone--disabled' : ''}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label="Choose a PDF to inspect"
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="dropzone__icon" aria-hidden="true">PDF</div>
      <strong>{disabled ? 'Inspecting PDF…' : 'Drop a PDF here'}</strong>
      <span>{disabled ? fileName : 'or click to choose a file'}</span>
      <small>Your PDF stays on this device.</small>
    </div>
  )
}
