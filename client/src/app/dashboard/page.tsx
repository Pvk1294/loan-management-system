import { redirect } from 'next/navigation';

/**
 * /dashboard has no page of its own: `proxy.ts` forwards each role to its
 * first module before this runs. This is only a fallback.
 */
export default function DashboardIndex() {
  redirect('/login');
}
