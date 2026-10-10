import type { ReactNode } from 'react';

/**
 * List on the left, the open record on the right (from 1280px up). The page
 * header belongs to the list column so the detail panel can run the full
 * height of the viewport, with its action buttons in view from the start.
 */
export function ModuleLayout({ header, list, detail }: { header: ReactNode; list: ReactNode; detail: ReactNode }) {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
      <div className="min-w-0">
        {header}
        {list}
      </div>
      {detail}
    </div>
  );
}
