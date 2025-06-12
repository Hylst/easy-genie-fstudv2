
import { RoutineBuilderTool } from '@/components/tools/routine-builder-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RoutineBuilder | Easy Genie',
  description: 'Créez et gérez vos routines quotidiennes et hebdomadaires avec l\'aide du Génie.',
};

export default function RoutineBuilderPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      {/* Image removed as per request */}
      <RoutineBuilderTool />
    </div>
  );
}
