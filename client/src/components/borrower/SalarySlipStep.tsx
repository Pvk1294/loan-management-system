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
 * Step 3: the salary slip. The type and size are checked here first so a wrong
 * file is caught before any upload starts; the server checks them again, and
 * also looks at the file's actual content rather than its name.
 */
export function SalarySlipStep({ salarySlip, maxSizeBytes, allowedMimeTypes, onUploaded, onContinue, onBack }: SalarySlipStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  /** True when the borrower chose to swap a slip that is already uploaded. */
  const [replacing, setReplacing] = useState(false);
  const [viewing, setViewing] = useState(false);

  const typeNames = allowedMimeTypes.map((type) => TYPE_LABELS[type] ?? type);
  const typeList = typeNames.join(', ');
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
    event.target.value = ''; // allow choosing the same file again after an error
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
    <Card className="mx-auto max-w-2xl">
      <CardHeader
        title="Upload your salary slip"
        description="Your most recent payslip, so we can confirm your income."
      />
      <CardBody className="space-y-5">
        {/* Reaching this step means the eligibility check passed; say so. */}
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          You are eligible to apply.
        </p>
        {error && <Alert tone="error">{error}</Alert>}

        {salarySlip && !replacing && (
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700 ring-1 ring-emerald-200">
              <FileIcon mimeType={salarySlip.mimeType} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="truncate">{salarySlip.filename}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
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
                'rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                dragging ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-slate-50/60',
              )}
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-700 shadow-card ring-1 ring-slate-200">
                <UploadCloud className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-900">
                Drag your file here, or{' '}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer rounded text-brand-700 underline underline-offset-4 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-600"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {typeList} · up to {maxSizeLabel}
              </p>
              <input
                ref={inputRef}
                type="file"
                accept={allowedMimeTypes.join(',')}
                onChange={onInputChange}
                className="sr-only"
                aria-label="Salary slip file"
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FileIcon mimeType={file.type} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {TYPE_LABELS[file.type]} · {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  aria-label="Remove selected file"
                  className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} onClick={replacing ? () => setReplacing(false) : onBack} disabled={uploading}>
            {replacing ? 'Keep current file' : 'Back to details'}
          </Button>
          {showUploader ? (
            <Button size="lg" onClick={upload} loading={uploading} disabled={!file} icon={<UploadCloud className="h-4 w-4" />}>
              Upload salary slip
            </Button>
          ) : (
            <Button size="lg" onClick={onContinue}>
              Continue to loan
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardBody>

      <DocumentViewer document={viewing ? salarySlip : null} onClose={() => setViewing(false)} />
    </Card>
  );
}
