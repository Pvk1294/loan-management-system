'use client';

import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, FileImage, FileText, RefreshCw, UploadCloud, X } from 'lucide-react';
import { DocumentViewer } from '@/components/DocumentViewer';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { api, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatFileSize } from '@/lib/format';
import type { SalarySlip } from '@/types/api';

interface SalarySlipStepProps {
  salarySlip: SalarySlip | null;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  onUploaded: () => void;
  onContinue: () => void;
  onBack: () => void;
}

const TYPE_LABELS: Record<string, string> = { 'application/pdf': 'PDF', 'image/jpeg': 'JPG', 'image/png': 'PNG' };

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  const Icon = mimeType.startsWith('image/') ? FileImage : FileText;
  return <Icon className={className} aria-hidden="true" />;
}

/**
 * Step 2: the salary slip. Type and size are checked here before any upload
 * starts; the server checks them again and also reads the file's real content.
 */
export function SalarySlipStep({ salarySlip, maxSizeBytes, allowedMimeTypes, onUploaded, onContinue, onBack }: SalarySlipStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [viewing, setViewing] = useState(false);

  const typeNames = allowedMimeTypes.map((type) => TYPE_LABELS[type] ?? type);
  const typeChoice = new Intl.ListFormat('en', { type: 'disjunction' }).format(typeNames);
  const maxSizeLabel = formatFileSize(maxSizeBytes);
  const showUploader = !salarySlip || replacing;

  const choose = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!allowedMimeTypes.includes(candidate.type)) {
      setFile(null);
      setError(`“${candidate.name}” is not a supported file. Upload a ${typeChoice} file.`);
      return;
    }
    if (candidate.size > maxSizeBytes) {
      setFile(null);
      setError(`“${candidate.name}” is ${formatFileSize(candidate.size)}. The limit is ${maxSizeLabel}.`);
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0]);
    event.target.value = '';
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    choose(event.dataTransfer.files?.[0]);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      await api('/borrower/salary-slip', { method: 'POST', body });
      setFile(null);
      setReplacing(false);
      onUploaded();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="reveal mx-auto max-w-2xl">
      <CardHeader title="Your latest salary slip" description="One document, so we can confirm your income." />
      <CardBody className="space-y-5">
        <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 animate-check text-brand-600" aria-hidden="true" />
          Good news: based on your details, you can apply.
        </p>
        {error && <Alert tone="error">{error}</Alert>}

        {salarySlip && !replacing && (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-paper/60 p-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 shadow-card">
              <FileIcon mimeType={salarySlip.mimeType} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{salarySlip.filename}</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {formatFileSize(salarySlip.size)} · uploaded {formatDateTime(salarySlip.uploadedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => setViewing(true)}>
                View
              </Button>
              <Button variant="ghost" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setReplacing(true)}>
                Replace
              </Button>
            </div>
          </div>
        )}

        {showUploader && (
          <>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'rounded-[20px] border-2 border-dashed p-10 text-center transition-all duration-200',
                dragging ? 'scale-[1.01] border-saffron-500 bg-saffron-100/60' : 'border-line-strong bg-paper/50',
              )}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-saffron-300 shadow-raised">
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-5 text-[15px] font-medium text-ink">
                Drop your file here, or{' '}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer rounded text-brand-700 underline underline-offset-4 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  browse
                </button>
              </p>
              <p className="mt-1.5 text-[13px] text-ink-muted">
                {typeNames.join(', ')} · up to {maxSizeLabel}
              </p>
              <input ref={inputRef} type="file" accept={allowedMimeTypes.join(',')} onChange={onInputChange} className="sr-only" aria-label="Salary slip file" />
            </div>

            {file && (
              <div className="flex animate-pop items-center gap-3 rounded-2xl border border-line bg-white p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-ink-muted">
                  <FileIcon mimeType={file.type} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-[13px] text-ink-muted">
                    {TYPE_LABELS[file.type]} · {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  aria-label="Remove selected file"
                  className="cursor-pointer rounded-lg p-1.5 text-ink-faint hover:bg-paper-2 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={replacing ? () => setReplacing(false) : onBack} disabled={uploading}>
            {replacing ? 'Keep current file' : 'Back'}
          </Button>
          {showUploader ? (
            <Button variant="ink" size="lg" onClick={upload} loading={uploading} disabled={!file} icon={<UploadCloud className="h-4 w-4" />}>
              Upload
            </Button>
          ) : (
            <Button variant="ink" size="lg" onClick={onContinue}>
              Choose your loan
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardBody>

      <DocumentViewer document={viewing ? salarySlip : null} onClose={() => setViewing(false)} />
    </Card>
  );
}
