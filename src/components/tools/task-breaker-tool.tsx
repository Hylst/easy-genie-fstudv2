"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle } from 'lucide-react';

interface SubTask {
  id: string;
  text: string;
  isCompleted: boolean;
}

export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTask, setMainTask] = useState<string>('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskText, setNewSubTaskText] = useState<string>('');

  const handleBreakDownTask = () => {
    // Placeholder logic: Intensity could determine number of pre-filled sub-tasks or suggestions.
    if (!mainTask.trim()) {
      setSubTasks([]);
      return;
    }
    
    const generatedSubTasks: SubTask[] = [];
    // Example: Higher intensity generates more detailed or more sub-tasks initially
    const numInitialSubTasks = intensity; 
    for(let i = 1; i <= numInitialSubTasks; i++) {
        generatedSubTasks.push({ id: crypto.randomUUID(), text: `Étape ${i} pour "${mainTask}" (suggestion)`, isCompleted: false });
    }
    // Add a final generic step
    generatedSubTasks.push({ id: crypto.randomUUID(), text: `Finaliser "${mainTask}"`, isCompleted: false });

    setSubTasks(generatedSubTasks);
  };

  const handleAddSubTask = () => {
    if (newSubTaskText.trim()) {
      setSubTasks([...subTasks, { id: crypto.randomUUID(), text: newSubTaskText, isCompleted: false }]);
      setNewSubTaskText('');
    }
  };

  const toggleSubTask = (id: string) => {
    setSubTasks(subTasks.map(task => task.id === id ? { ...task, isCompleted: !task.isCompleted } : task));
  };

  const deleteSubTask = (id: string) => {
    setSubTasks(subTasks.filter(task => task.id !== id));
  };
  
  const handleSubTaskTextChange = (id: string, newText: string) => {
    setSubTasks(subTasks.map(task => task.id === id ? { ...task, text: newText } : task));
  };


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">TaskBreaker</CardTitle>
        <CardDescription>Décomposez vos tâches complexes en étapes simples et gérables. Plus le niveau de magie est élevé, plus le génie vous aidera à détailler !</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <div>
          <label htmlFor="main-task" className="block text-sm font-medium text-foreground mb-1">Tâche principale à décomposer :</label>
          <div className="flex gap-2">
            <Input
              id="main-task"
              value={mainTask}
              onChange={(e) => setMainTask(e.target.value)}
              placeholder="Ex: Organiser une fête d'anniversaire"
              className="flex-grow"
            />
            <Button onClick={handleBreakDownTask}>Décomposer</Button>
          </div>
        </div>

        {mainTask && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Sous-tâches pour : <span className="text-primary">{mainTask}</span></h3>
            {subTasks.length === 0 && (
                <p className="text-muted-foreground">Aucune sous-tâche pour le moment. Ajoutez-en ou cliquez sur "Décomposer".</p>
            )}
            <ul className="space-y-2">
              {subTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50 transition-colors">
                  <Button variant="ghost" size="icon" onClick={() => toggleSubTask(task.id)} aria-label={task.isCompleted ? "Marquer comme non terminée" : "Marquer comme terminée"}>
                    {task.isCompleted ? <CheckSquare className="text-green-500" /> : <Square className="text-muted-foreground" />}
                  </Button>
                  <Input 
                    value={task.text} 
                    onChange={(e) => handleSubTaskTextChange(task.id, e.target.value)}
                    className={`flex-grow bg-transparent border-0 focus:ring-0 ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteSubTask(task.id)} aria-label="Supprimer la sous-tâche">
                    <Trash2 className="text-destructive w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Input 
                value={newSubTaskText}
                onChange={(e) => setNewSubTaskText(e.target.value)}
                placeholder="Ajouter une nouvelle sous-tâche manuellement"
                className="flex-grow"
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubTask()}
              />
              <Button onClick={handleAddSubTask} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Astuce: Le génie sauvegarde votre travail localement dans votre navigateur!</p>
      </CardFooter>
    </Card>
  );
}
