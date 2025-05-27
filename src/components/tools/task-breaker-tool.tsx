
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Keep for potential future use, not primary for subtasks
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';

interface SubTask {
  id: string;
  text: string;
  isCompleted: boolean;
}

const TASK_BREAKER_STORAGE_KEY_MAIN = "easyGenieTaskBreakerMain";
const TASK_BREAKER_STORAGE_KEY_SUBTASKS = "easyGenieTaskBreakerSubtasks";


export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTask, setMainTask] = useState<string>('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  const [newSubTaskText, setNewSubTaskText] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const savedMainTask = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_MAIN);
    if (savedMainTask) setMainTask(savedMainTask);
    const savedSubTasks = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS);
    if (savedSubTasks) setSubTasks(JSON.parse(savedSubTasks));

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMainTask(prev => prev ? prev + ' ' + transcript : transcript);
        toast({ title: "Tâche principale mise à jour!" });
      };
      recognitionRef.current.onerror = (event: any) => {
        toast({ title: "Erreur de reconnaissance vocale", description: event.error, variant: "destructive" });
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn("Speech Recognition API not supported.");
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        setIsListening(false);
        toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"});
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  useEffect(() => {
    localStorage.setItem(TASK_BREAKER_STORAGE_KEY_MAIN, mainTask);
  }, [mainTask]);

  useEffect(() => {
    localStorage.setItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS, JSON.stringify(subTasks));
  }, [subTasks]);


  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible.", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
  };

  const handleGenieBreakdown = async () => {
    if (!mainTask.trim()) {
      toast({ title: "Tâche principale manquante", description: "Veuillez entrer une tâche principale à décomposer.", variant: "destructive" });
      setSubTasks([]);
      return;
    }
    setIsLoadingAI(true);
    try {
      const result = await breakdownTask({ mainTaskText: mainTask, intensityLevel: intensity });
      const newSubTasks = result.suggestedSubTasks.map(text => ({
        id: crypto.randomUUID(),
        text,
        isCompleted: false,
      }));
      setSubTasks(newSubTasks);
      if (newSubTasks.length > 0) {
        toast({ title: "Tâche décomposée par le Génie!", description: "Voici les sous-tâches suggérées." });
      } else {
        toast({ title: "Le Génie a besoin de plus de détails", description: "Aucune sous-tâche n'a pu être générée. Essayez une tâche plus claire ou une intensité différente.", variant: "default" });
      }
    } catch (error) {
      console.error("Error breaking down task with AI:", error);
      toast({ title: "Erreur du Génie", description: "Le Génie n'a pas pu décomposer la tâche.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
    }
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

  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie proposera quelques grandes étapes.";
    if (intensity <= 4) return "Le Génie détaillera davantage les sous-tâches.";
    return "Le Génie fournira une décomposition très fine et détaillée.";
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">TaskBreaker Magique</CardTitle>
        <CardDescription>Décomposez vos tâches complexes. Le Génie vous aide à voir plus clair selon le niveau de magie choisi !</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-2 h-5">{intensityDescription()}</p>
        
        <div>
          <label htmlFor="main-task" className="block text-sm font-medium text-foreground mb-1">Tâche principale à décomposer :</label>
          <div className="flex gap-2 items-center">
            <Input
              id="main-task"
              value={mainTask}
              onChange={(e) => setMainTask(e.target.value)}
              placeholder="Ex: Organiser mes vacances d'été"
              className="flex-grow"
              disabled={isLoadingAI || isListening}
            />
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleVoiceInput}
              className={`${isListening ? 'text-red-500 animate-pulse' : ''}`}
              aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
              disabled={isLoadingAI || (isListening && recognitionRef.current && recognitionRef.current.isListening)} // More robust disabled check
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button onClick={handleGenieBreakdown} disabled={isLoadingAI || !mainTask.trim() || isListening}>
              {isLoadingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Décomposer
            </Button>
          </div>
        </div>

        { (mainTask || subTasks.length > 0) && ( // Show sub-tasks section if main task entered OR subtasks exist
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              {mainTask ? `Sous-tâches pour : "${mainTask}"` : "Liste des sous-tâches"}
            </h3>
            {subTasks.length === 0 && !isLoadingAI && (
                <p className="text-muted-foreground italic">Aucune sous-tâche. Cliquez sur "Décomposer" ou ajoutez-en manuellement.</p>
            )}
            {isLoadingAI && subTasks.length === 0 && (
                <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Le Génie réfléchit...
                </div>
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
                    disabled={isLoadingAI}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteSubTask(task.id)} aria-label="Supprimer la sous-tâche" disabled={isLoadingAI}>
                    <Trash2 className="text-destructive w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Input 
                value={newSubTaskText}
                onChange={(e) => setNewSubTaskText(e.target.value)}
                placeholder="Ajouter une sous-tâche manuellement"
                className="flex-grow"
                onKeyPress={(e) => {if (e.key === 'Enter') handleAddSubTask();}}
                disabled={isLoadingAI}
              />
              <Button onClick={handleAddSubTask} variant="outline" disabled={isLoadingAI}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            Le Génie sauvegarde votre travail localement. Une tâche bien décomposée est une tâche à moitié terminée !
        </p>
      </CardFooter>
    </Card>
  );
}
