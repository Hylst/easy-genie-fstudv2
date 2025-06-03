
import { TaskBreakerTool } from '@/components/tools/task-breaker-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Décomposeur de Tâches | Easy Genie',
  description: 'Décomposez vos tâches complexes en étapes simples et gérables avec le Décomposeur de Tâches.',
};

export default function TaskBreakerPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <TaskBreakerTool />
    </div>
  );
}
