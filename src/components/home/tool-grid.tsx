import Link from 'next/link';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import type { Tool } from '@/types';
import { Brain, LayoutGrid, ListTree, Timer, FileEdit, CalendarCheck, GitFork, Smile, Monitor } from 'lucide-react';

const tools: Tool[] = [
  { id: 'taskbreaker', name: 'TaskBreaker', description: 'Décompose les tâches complexes en étapes gérables.', href: '/task-breaker', icon: ListTree, dataAiHint: 'checklist tasks' },
  { id: 'timefocus', name: 'TimeFocus', description: 'Minuteur configurable pour maintenir la concentration.', href: '/time-focus', icon: Timer, dataAiHint: 'clock timer' },
  { id: 'prioritygrid', name: 'PriorityGrid', description: 'Aide à prioriser les tâches selon l\'urgence et l\'importance.', href: '/priority-grid', icon: LayoutGrid, dataAiHint: 'grid chart' },
  { id: 'braindump', name: 'BrainDump', description: 'Interface pour vider son esprit et organiser ses pensées.', href: '/brain-dump', icon: Brain, dataAiHint: 'notebook thoughts' },
  { id: 'formalizer', name: 'Formaliseur', description: 'Transforme le texte pour l\'adapter à différents styles et tons.', href: '/formalizer', icon: FileEdit, dataAiHint: 'text writing' },
  // { id: 'routinebuilder', name: 'RoutineBuilder', description: 'Création de routines quotidiennes avec rappels.', href: '/routine-builder', icon: CalendarCheck, dataAiHint: 'calendar schedule' },
  // { id: 'decisionhelper', name: 'DecisionHelper', description: 'Assistant pour prendre des décisions.', href: '/decision-helper', icon: GitFork, dataAiHint: 'choices path' },
  // { id: 'moodtracker', name: 'MoodTracker', description: 'Suivi d\'humeur et d\'énergie au fil du temps.', href: '/mood-tracker', icon: Smile, dataAiHint: 'emotions face' },
  // { id: 'focusmode', name: 'FocusMode', description: 'Page web minimaliste pour travailler sans distractions.', href: '/focus-mode', icon: Monitor, dataAiHint: 'desk computer' },
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
                    <Image 
                      src={`https://placehold.co/600x400.png`}
                      alt={`${tool.name} placeholder image`}
                      width={600}
                      height={400}
                      className="w-full h-48 object-cover rounded-md mb-4"
                      data-ai-hint={tool.dataAiHint}
                    />
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
