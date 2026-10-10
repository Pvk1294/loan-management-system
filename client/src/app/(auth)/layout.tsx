import { Brand } from '@/components/Brand';
import { OfferPanel } from '@/components/auth/OfferPanel';

/** Sign-in and sign-up: the offer on the left, the form on the right. */
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-1">
      <OfferPanel />
      <main className="flex flex-1 flex-col px-5 py-8 sm:px-10 lg:justify-center">
        <div className="mx-auto w-full max-w-[26rem]">
          <Brand className="mb-10 lg:hidden" />
          {children}
        </div>
      </main>
    </div>
  );
}
