
import { ImmersiveReaderTool } from '@/components/tools/immersive-reader-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lecteur Immersif | Easy Genie',
  description: 'Facilitez votre lecture avec des outils de focus, simplification et synthèse vocale.',
};

export default function ImmersiveReaderPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <ImmersiveReaderTool />
    </div>
  );
}
