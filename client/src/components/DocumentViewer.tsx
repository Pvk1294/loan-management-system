'use client';

import { useEffect } from 'react';
import { Download, FileWarning } from 'lucide-react';
import { Modal } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/Spinner';
import { useApiQuery } from '@/hooks/useApiQuery';
import { fetchFileUrl } from '@/lib/api';
import { formatFileSize } from '@/lib/format';
import type { SalarySlip } from '@/types/api';

interface DocumentViewerProps {
  document: SalarySlip | null;
  onClose: () => void;
}

/** Shows a salary slip in the app. It has no public URL; it is fetched with the user's token. */
export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const { data: url, error, isLoading } = useApiQuery(document ? `file:${document.fileId}` : null, () => fetchFileUrl(document!.fileId));

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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-medium text-ink shadow-sm hover:bg-paper"
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
        // A private blob held in memory, which next/image cannot optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Salary slip: ${document?.filename}`} className="mx-auto max-h-[60dvh] rounded-xl border border-line" />
      ) : (
        <iframe src={url} title="Salary slip" className="h-[60dvh] w-full rounded-xl border border-line bg-paper" />
      )}
    </Modal>
  );
}
