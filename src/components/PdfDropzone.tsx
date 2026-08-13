import { useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import { MAX_PDF_SIZE_LABEL } from '../lib/file-validation'

interface PdfDropzoneProps {
  disabled?: boolean
  fileName?: string
  onFile: (file: File) => void
  onCancel: () => void
}

export function PdfDropzone({ disabled = false, fileName, onFile, onCancel }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

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
    setIsDragging(false)
    if (!disabled) pickFirstFile(event.dataTransfer.files)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const className = [
    'dropzone',
    disabled ? 'dropzone--disabled' : '',
    isDragging && !disabled ? 'dropzone--dragging' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? undefined : 0}
      aria-disabled={disabled || undefined}
      aria-label={disabled ? undefined : 'Choose a PDF to inspect'}
      aria-busy={disabled || undefined}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={handleKeyDown}
      onDragEnter={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => event.preventDefault()}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <label className="visually-hidden" htmlFor={inputId}>
        Choose a PDF to inspect
      </label>
      <input
        ref={inputRef}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="dropzone__icon" aria-hidden="true">PDF</div>
      <strong>{disabled ? 'Inspecting PDF…' : isDragging ? 'Release to inspect' : 'Drop a PDF here'}</strong>
      <span>{disabled ? fileName : 'or click to choose a file'}</span>
      <small>Up to {MAX_PDF_SIZE_LABEL}. Your PDF stays on this device.</small>
      {disabled && (
        <button
          className="button button--secondary dropzone__cancel"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCancel()
          }}
        >
          Cancel inspection
        </button>
      )}
    </div>
  )
}
