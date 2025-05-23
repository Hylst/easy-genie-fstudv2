import { PriorityGridTool } from '@/components/tools/priority-grid-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PriorityGrid | Easy Genie',
  description: 'Priorisez vos tâches efficacement avec la matrice d\'Eisenhower de PriorityGrid.',
};

export default function PriorityGridPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <PriorityGridTool />
    </div>
  );
}
