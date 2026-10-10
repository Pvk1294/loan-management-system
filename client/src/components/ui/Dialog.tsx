'use client';

import { type MouseEvent, type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DialogBaseProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Buttons pinned to the bottom of the dialog. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Shared behaviour for the modal and the drawer, built on the native <dialog>
 * element. `showModal()` gives focus trapping, Escape-to-close and a backdrop
 * for free, and keeps the rest of the page inert while it is open.
 */
function useNativeDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // A click that lands on the dialog element itself is a click on the backdrop.
  const onBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return { ref, onBackdropClick };
}

function DialogHeader({ title, description, onClose }: Pick<DialogBaseProps, 'title' | 'description' | 'onClose'>) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>
        {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="-mr-1.5 -mt-0.5 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

interface ModalProps extends DialogBaseProps {
  size?: 'sm' | 'md' | 'lg';
}

const MODAL_WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' };

/** A centred dialog for a single decision or a short form. */
export function Modal({ open, onClose, title, description, footer, children, size = 'md' }: ModalProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onBackdropClick}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 text-left shadow-overlay',
        'backdrop:bg-ink-950/55 backdrop:backdrop-blur-[2px] open:animate-pop',
        MODAL_WIDTHS[size],
      )}
    >
      {/* Rendered only while open so a form inside starts fresh every time. */}
      {open && (
        <div className="flex max-h-[min(85dvh,44rem)] flex-col">
          <DialogHeader title={title} description={description} onClose={onClose} />
          <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

/** A panel that slides in from the right, for looking at one record in detail. */
export function Drawer({ open, onClose, title, description, footer, children }: DialogBaseProps) {
  const { ref, onBackdropClick } = useNativeDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={onBackdropClick}
      className={cn(
        'my-0 mr-0 ml-auto h-dvh w-full max-w-xl bg-white p-0 text-left shadow-overlay',
        'backdrop:bg-ink-950/55 backdrop:backdrop-blur-[2px] open:animate-slide-in',
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <DialogHeader title={title} description={description} onClose={onClose} />
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              {footer}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
