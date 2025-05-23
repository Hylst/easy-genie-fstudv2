"use client";

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Trash2, PlusCircle } from 'lucide-react';

interface PriorityTask {
  id: string;
  text: string;
  quadrant: 'urgentImportant' | 'notUrgentImportant' | 'urgentNotImportant' | 'notUrgentNotImportant';
}

type QuadrantKey = PriorityTask['quadrant'];

export function PriorityGridTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('urgentImportant');

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const newTask: PriorityTask = {
      id: crypto.randomUUID(),
      text: newTaskText,
      quadrant: selectedQuadrant,
    };
    setTasks([...tasks, newTask]);
    setNewTaskText('');
    // Placeholder: Higher intensity might offer suggestions on where to place the task
    if (intensity >= 4 && tasks.length < 5) {
        console.log(`Suggestion pour "${newTaskText}" avec intensité ${intensity}: Pensez à bien évaluer l'urgence et l'importance.`);
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const Quadrant = ({ title, quadrantKey, bgColor }: { title: string; quadrantKey: QuadrantKey; bgColor: string }) => (
    <div className={`p-4 rounded-lg shadow-inner min-h-[200px] ${bgColor}`}>
      <h3 className="font-semibold text-lg mb-3 text-foreground">{title}</h3>
      <ul className="space-y-2">
        {tasks.filter(task => task.quadrant === quadrantKey).map(task => (
          <li key={task.id} className="flex justify-between items-center bg-background p-2 rounded-md shadow-sm">
            <span className="text-sm text-foreground">{task.text}</span>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label="Supprimer la tâche">
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </li>
        ))}
      </ul>
      {tasks.filter(task => task.quadrant === quadrantKey).length === 0 && (
        <p className="text-sm text-muted-foreground italic">Aucune tâche ici.</p>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">PriorityGrid</CardTitle>
        <CardDescription>Organisez vos tâches avec la matrice d'Eisenhower. Le niveau de magie peut vous aider à mieux classer ou vous donner des défis !</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2 items-end p-4 border rounded-lg bg-card">
          <div className="flex-grow">
            <label htmlFor="new-task" className="block text-sm font-medium text-foreground mb-1">Nouvelle tâche :</label>
            <Input
              id="new-task"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Ex: Répondre aux e-mails importants"
              className="w-full"
            />
          </div>
          <div className="flex-shrink-0">
            <label htmlFor="quadrant-select" className="block text-sm font-medium text-foreground mb-1">Quadrant :</label>
             <select 
                id="quadrant-select"
                value={selectedQuadrant}
                onChange={(e) => setSelectedQuadrant(e.target.value as QuadrantKey)}
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
             >
                <option value="urgentImportant">Urgent & Important</option>
                <option value="notUrgentImportant">Important, Pas Urgent</option>
                <option value="urgentNotImportant">Urgent, Pas Important</option>
                <option value="notUrgentNotImportant">Ni Urgent, Ni Important</option>
             </select>
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Ajouter Tâche
          </Button>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Quadrant title="🔴 Urgent & Important (Faire)" quadrantKey="urgentImportant" bgColor="bg-red-100 dark:bg-red-900/30" />
          <Quadrant title="🟡 Important, Pas Urgent (Planifier)" quadrantKey="notUrgentImportant" bgColor="bg-yellow-100 dark:bg-yellow-900/30" />
          <Quadrant title="🔵 Urgent, Pas Important (Déléguer)" quadrantKey="urgentNotImportant" bgColor="bg-blue-100 dark:bg-blue-900/30" />
          <Quadrant title="⚪ Ni Urgent, Ni Important (Éliminer)" quadrantKey="notUrgentNotImportant" bgColor="bg-gray-100 dark:bg-gray-700/30" />
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Prioriser, c'est choisir ce qui compte vraiment. Le génie est là pour éclairer votre chemin.</p>
      </CardFooter>
    </Card>
  );
}
