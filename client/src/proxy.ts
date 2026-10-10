import { type NextRequest, NextResponse } from 'next/server';
import { BORROWER_HOME, DASHBOARD_MODULES, LOGIN_PATH, canAccessModule, homePathFor, isStaff } from '@/lib/rbac';
import { TOKEN_COOKIE, decodeTokenPayload } from '@/lib/session';
import type { Role } from '@/types/api';

/**
 * Route guard. Runs on the server before a page is rendered and redirects
 * people away from pages their role may not see:
 *
 *   not logged in          → /login
 *   borrower on /dashboard → /apply
 *   staff on /apply        → their dashboard module
 *   executive on another team's module → the "access denied" page
 *
 * This is an optimistic check: it reads the role from the token without
 * verifying the signature, which is enough to decide what to *show*. It is not
 * what protects the data. Every API route verifies the token and the role
 * again, so editing the cookie gets someone a page shell and a 403.
 */

const ROLES: readonly Role[] = ['admin', 'sales', 'sanction', 'disbursement', 'collection', 'borrower'];
const PUBLIC_PATHS = [LOGIN_PATH, '/signup'];

function roleFromRequest(request: NextRequest): Role | null {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const payload = token ? decodeTokenPayload(token) : null;
  if (!payload?.role || !ROLES.includes(payload.role)) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  return payload.role;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = roleFromRequest(request);
  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!role) {
    return PUBLIC_PATHS.includes(pathname) ? NextResponse.next() : redirectTo(LOGIN_PATH);
  }

  // Logged-in users have no use for the login page or the bare root.
  if (pathname === '/' || PUBLIC_PATHS.includes(pathname)) {
    return redirectTo(homePathFor(role));
  }

  if (pathname.startsWith(BORROWER_HOME)) {
    return isStaff(role) ? redirectTo(homePathFor(role)) : NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    if (!isStaff(role)) return redirectTo(BORROWER_HOME);
    if (pathname === '/dashboard') return redirectTo(homePathFor(role));

    const requested = DASHBOARD_MODULES.find(
      (module) => pathname === module.href || pathname.startsWith(`${module.href}/`),
    );
    if (requested && !canAccessModule(role, requested.key)) {
      // Keep the URL so it is clear which page was refused, but render the denial.
      return NextResponse.rewrite(new URL('/access-denied', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
