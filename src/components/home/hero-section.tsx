import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-transparent">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
          Bienvenue chez <span className="text-primary">Easy Genie</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
          Votre compagnon magique pour surmonter la procrastination et structurer vos pensées. Des outils simples, conçus pour les esprits neurodivergents et créatifs.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
            <Link href="#tools">Découvrir les Outils Magiques</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
