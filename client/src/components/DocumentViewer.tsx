'use client';

import { useEffect } from 'react';
import { Download, FileWarning } from 'lucide-react';
import { Modal } from '@/components/ui/Dialog';
import { PageLoader } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { useApiQuery } from '@/hooks/useApiQuery';
import { fetchFileUrl } from '@/lib/api';
import { formatFileSize } from '@/lib/format';
import type { SalarySlip } from '@/types/api';

interface DocumentViewerProps {
  document: SalarySlip | null;
  onClose: () => void;
}

/**
 * Shows a salary slip inside the app. The file has no public URL, so it is
 * downloaded with the user's token and displayed from memory.
 */
export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const { data: url, error, isLoading } = useApiQuery(document ? `file:${document.fileId}` : null, () =>
    fetchFileUrl(document!.fileId),
  );

  // Release the in-memory copy once the viewer is done with it.
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  const isImage = document?.mimeType.startsWith('image/');

  return (
    <Modal
      open={document !== null}
      onClose={onClose}
      size="lg"
      title="Salary slip"
      description={document && `${document.filename} · ${formatFileSize(document.size)}`}
      footer={
        url &&
        document && (
          <a
            href={url}
            download={document.filename}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download
          </a>
        )
      }
    >
      {error ? (
        <EmptyState icon={FileWarning} tone="error" title="This document could not be opened" description={error.message} className="py-8" />
      ) : isLoading || !url ? (
        <PageLoader label="Opening document" />
      ) : isImage ? (
        // The file is a private blob held in memory, which next/image cannot optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Salary slip: ${document?.filename}`} className="mx-auto max-h-[60dvh] rounded-lg border border-slate-200" />
      ) : (
        <iframe src={url} title="Salary slip" className="h-[60dvh] w-full rounded-lg border border-slate-200 bg-slate-50" />
      )}
    </Modal>
  );
}
