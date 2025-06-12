
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Tool } from '@/types';
import { Brain, LayoutGrid, ListTree, Timer, FileEdit, CalendarCheck } from 'lucide-react';

// Import new SVG illustrations
import { TaskBreakerIllustration } from '@/components/icons/tool-illustrations/task-breaker-illustration';
import { TimeFocusIllustration } from '@/components/icons/tool-illustrations/time-focus-illustration';
import { PriorityGridIllustration } from '@/components/icons/tool-illustrations/priority-grid-illustration';
import { BrainDumpIllustration } from '@/components/icons/tool-illustrations/brain-dump-illustration';
import { FormalizerIllustration } from '@/components/icons/tool-illustrations/formalizer-illustration';
import { RoutineBuilderIllustration } from '@/components/icons/tool-illustrations/routine-builder-illustration';


const tools: Tool[] = [
  { 
    id: 'taskbreaker', 
    name: 'Décomposeur de Tâches', 
    description: 'Le Génie décompose vos projets complexes en étapes simples et lumineuses.', 
    href: '/task-breaker', 
    icon: ListTree, 
    illustration: TaskBreakerIllustration 
  },
  { 
    id: 'timefocus', 
    name: 'TimeFocus', 
    description: 'Minuteur configurable pour maintenir la concentration et optimiser vos sessions de travail.', 
    href: '/time-focus', 
    icon: Timer, 
    illustration: TimeFocusIllustration
  },
  { 
    id: 'prioritygrid', 
    name: 'Grille des Priorités', 
    description: 'Organisez vos tâches avec la matrice d\'Eisenhower enchantée pour mieux décider quoi faire.', 
    href: '/priority-grid', 
    icon: LayoutGrid, 
    illustration: PriorityGridIllustration
  },
  { 
    id: 'braindump', 
    name: 'Décharge de pensées', 
    description: 'Un espace pour vider votre esprit. Le Génie peut ensuite analyser et organiser vos idées.', 
    href: '/brain-dump', 
    icon: Brain,
    illustration: BrainDumpIllustration
  },
  { 
    id: 'formalizer', 
    name: 'Formaliseur', 
    description: 'Transforme le texte pour l\'adapter à différents styles et tons, du plus pro au plus fun.', 
    href: '/formalizer', 
    icon: FileEdit,
    illustration: FormalizerIllustration
  },
  { 
    id: 'routinebuilder', 
    name: 'RoutineBuilder', 
    description: 'Créez et gérez vos routines quotidiennes et hebdomadaires avec l\'aide du Génie.', 
    href: '/routine-builder', 
    icon: CalendarCheck,
    illustration: RoutineBuilderIllustration
  },
  // { id: 'decisionhelper', name: 'DecisionHelper', description: 'Assistant pour prendre des décisions.', href: '/decision-helper', icon: GitFork, illustration: PlaceholderIllustration },
  // { id: 'moodtracker', name: 'MoodTracker', description: 'Suivi d\'humeur et d\'énergie au fil du temps.', href: '/mood-tracker', icon: Smile, illustration: PlaceholderIllustration },
  // { id: 'focusmode', name: 'FocusMode', description: 'Page web minimaliste pour travailler sans distractions.', href: '/focus-mode', icon: Monitor, illustration: PlaceholderIllustration },
];

export function ToolGrid() {
  return (
    <section id="tools" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
          Nos Outils Enchantés
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tools.map((tool) => (
            <Link href={tool.href} key={tool.id} legacyBehavior>
              <a className="block group">
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 ease-in-out border-2 border-transparent hover:border-primary">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <tool.icon className="w-10 h-10 text-primary" />
                    <CardTitle className="text-2xl font-semibold group-hover:text-primary transition-colors">{tool.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-48 rounded-md mb-4 overflow-hidden bg-muted/30">
                      <tool.illustration className="w-full h-full object-contain" />
                    </div>
                    <CardDescription className="text-base text-muted-foreground">{tool.description}</CardDescription>
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
