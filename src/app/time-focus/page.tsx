import { TimeFocusTool } from '@/components/tools/time-focus-tool';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TimeFocus | Easy Genie',
  description: 'Utilisez le minuteur TimeFocus pour maintenir votre concentration sur vos tâches.',
};

export default function TimeFocusPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <TimeFocusTool />
    </div>
  );
}
