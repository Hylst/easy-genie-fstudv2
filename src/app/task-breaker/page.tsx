import { TaskBreakerTool } from '@/components/tools/task-breaker-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TaskBreaker | Easy Genie',
  description: 'Décomposez vos tâches complexes en étapes simples et gérables avec TaskBreaker.',
};

export default function TaskBreakerPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <TaskBreakerTool />
    </div>
  );
}
