import { FormalizerTool } from '@/components/tools/formalizer-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Formaliseur | Easy Genie',
  description: 'Transformez vos pensées chaotiques en écrits clairs, ou vice-versa, avec l\'outil Formaliseur.',
};

export default function FormalizerPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <FormalizerTool />
    </div>
  );
}
