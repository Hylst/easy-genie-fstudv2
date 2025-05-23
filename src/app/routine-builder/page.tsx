import { RoutineBuilderTool } from '@/components/tools/routine-builder-tool';
import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'RoutineBuilder | Easy Genie',
  description: 'Créez et gérez vos routines quotidiennes et hebdomadaires avec l\'aide du Génie.',
};

export default function RoutineBuilderPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <Image
          src="https://placehold.co/800x300.png"
          alt="Routine Builder Banner"
          width={800}
          height={300}
          className="w-full h-auto max-h-[300px] object-cover rounded-lg shadow-lg mx-auto"
          data-ai-hint="organized planner genie"
        />
      </div>
      <RoutineBuilderTool />
    </div>
  );
}
