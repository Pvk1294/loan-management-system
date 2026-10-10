import type { Metadata } from 'next';
import { AccessDenied } from '@/components/AccessDenied';

export const metadata: Metadata = { title: 'Access denied' };

/** Rendered by `proxy.ts` in place of a module the user's role may not open. */
export default function AccessDeniedPage() {
  return <AccessDenied />;
}
