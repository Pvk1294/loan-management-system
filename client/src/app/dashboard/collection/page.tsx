import type { Metadata } from 'next';
import { ModuleGuard } from '@/components/dashboard/ModuleGuard';
import { CollectionModule } from '@/components/dashboard/CollectionModule';

export const metadata: Metadata = { title: 'Collection' };

export default function CollectionPage() {
  return (
    <ModuleGuard module="collection">
      <CollectionModule />
    </ModuleGuard>
  );
}
