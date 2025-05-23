import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Étincelles | Easy Genie',
  description: 'Découvrez des idées et inspirations avec Easy Genie.',
};

export default function SparksPage() {
  return (
    <div className="container mx-auto py-16 px-4 text-center">
      <Sparkles className="w-24 h-24 mx-auto text-primary mb-8" />
      <h1 className="text-4xl font-bold mb-4 text-foreground">Étincelles d'Inspiration</h1>
      <p className="text-lg text-muted-foreground max-w-xl mx-auto">
        Cette section est en cours de création... Bientôt, vous trouverez ici des articles, des astuces et des ressources pour nourrir votre créativité et votre bien-être.
      </p>
    </div>
  );
}
