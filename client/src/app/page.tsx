import { redirect } from 'next/navigation';

/**
 * The root has no page of its own. `proxy.ts` sends signed-in users to their
 * home before this renders; anyone who reaches it is not signed in.
 */
export default function RootPage() {
  redirect('/login');
}
