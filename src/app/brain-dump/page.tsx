import { BrainDumpTool } from '@/components/tools/brain-dump-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'BrainDump | Easy Genie',
  description: 'Videz votre esprit et organisez vos pensées avec l\'outil BrainDump.',
};

export default function BrainDumpPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <BrainDumpTool />
    </div>
  );
}
