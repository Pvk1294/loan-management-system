'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Built on the native <dialog>: `showModal()` gives focus trapping,
 * Escape-to-close and a backdrop, and keeps the page behind it inert.
 */
function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return { ref, onBackdropClick };
}

function DialogHeader({ title, description, onClose }: Pick<DialogBaseProps, 'title' | 'description' | 'onClose'>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
      <div className="min-w-0">
        <h2 className="display text-xl leading-tight text-ink">{title}</h2>
        {description && <div className="mt-1.5 text-sm text-ink-muted">{description}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-2 -mt-1 cursor-pointer rounded-lg p-2 text-ink-faint transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

interface ModalProps extends DialogBaseProps {
  size?: 'sm' | 'md' | 'lg';
}

const MODAL_WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' };

export function Modal({ open, onClose, title, description, footer, children, size = 'md' }: ModalProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-[22px] bg-white p-0 text-left shadow-overlay',
        'backdrop:bg-ink/60 backdrop:backdrop-blur-[3px] open:animate-pop',
        MODAL_WIDTHS[size],
      )}
    >
      {open && (
        <div className="flex max-h-[min(85dvh,44rem)] flex-col">
          <DialogHeader title={title} description={description} onClose={onClose} />
          <div className="overflow-y-auto px-6 py-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-paper/70 px-6 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function Drawer({ open, onClose, title, description, footer, children }: DialogBaseProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onBackdropClick}
      className={cn(
        'my-0 mr-0 ml-auto h-dvh w-full max-w-xl bg-white p-0 text-left shadow-overlay',
        'backdrop:bg-ink/60 backdrop:backdrop-blur-[3px] open:animate-slide-in',
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <DialogHeader title={title} description={description} onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-line bg-white px-6 py-4 sm:flex-row sm:justify-end">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
