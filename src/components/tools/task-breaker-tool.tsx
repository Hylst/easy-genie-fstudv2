
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';

interface SubTask {
  id: string;
  text: string;
  isCompleted: boolean;
  subTasks: SubTask[]; // Children tasks
  depth: number;
  isExpanded?: boolean; // For UI toggle to show/hide children
}

const TASK_BREAKER_STORAGE_KEY_MAIN = "easyGenieTaskBreakerMain";
const TASK_BREAKER_STORAGE_KEY_SUBTASKS = "easyGenieTaskBreakerSubtasks_v2"; // Changed key for new structure

export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTask, setMainTask] = useState<string>('');
  const [subTasks, setSubTasks] = useState<SubTask[]>([]);
  
  // For adding sub-task directly under the main task
  const [newDirectSubTaskText, setNewDirectSubTaskText] = useState<string>('');
  // For adding sub-tasks under existing sub-tasks (parentId -> text)
  const [newChildSubTaskText, setNewChildSubTaskText] = useState<{ [parentId: string]: string }>({});

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [loadingAITaskId, setLoadingAITaskId] = useState<string | null>(null); // To show spinner on specific task
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Load from localStorage
  useEffect(() => {
    const savedMainTask = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_MAIN);
    if (savedMainTask) setMainTask(savedMainTask);
    const savedSubTasks = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS);
    if (savedSubTasks) {
      try {
        setSubTasks(JSON.parse(savedSubTasks));
      } catch (e) {
        console.error("Failed to parse subtasks from localStorage", e);
        localStorage.removeItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS); // Clear corrupted data
      }
    }

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

  // Mic control
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

  // Save to localStorage
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

  // --- Recursive Helper Functions ---
  const recursiveUpdate = (
    tasks: SubTask[], 
    targetId: string, 
    updateFn: (task: SubTask) => SubTask
  ): SubTask[] => {
    return tasks.map(task => {
      if (task.id === targetId) {
        return updateFn(task);
      }
      if (task.subTasks && task.subTasks.length > 0) {
        return { ...task, subTasks: recursiveUpdate(task.subTasks, targetId, updateFn) };
      }
      return task;
    });
  };

  const recursiveDelete = (tasks: SubTask[], targetId: string): SubTask[] => {
    return tasks.filter(task => {
      if (task.id === targetId) {
        return false; // Remove this task
      }
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks = recursiveDelete(task.subTasks, targetId);
      }
      return true;
    });
  };
  
  const recursiveFindAndAdd = (
    tasks: SubTask[],
    parentId: string,
    newTasks: SubTask[]
  ): SubTask[] => {
    return tasks.map(task => {
      if (task.id === parentId) {
        return { ...task, subTasks: [...task.subTasks, ...newTasks], isExpanded: true };
      }
      if (task.subTasks && task.subTasks.length > 0) {
        return { ...task, subTasks: recursiveFindAndAdd(task.subTasks, parentId, newTasks) };
      }
      return task;
    });
  };
  // --- End Recursive Helper Functions ---

  const handleGenieBreakdown = async (taskTextToBreak: string, parentId: string | null) => {
    if (!taskTextToBreak.trim()) {
      toast({ title: "Tâche manquante", description: "Veuillez entrer une tâche à décomposer.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setLoadingAITaskId(parentId); // Mark which task is loading, or null for main task
    try {
      const result = await breakdownTask({ mainTaskText: taskTextToBreak, intensityLevel: intensity });
      const currentDepth = parentId ? (findTaskById(subTasks, parentId)?.depth ?? -1) +1 : 0;

      const newTasksFromAI: SubTask[] = result.suggestedSubTasks.map(text => ({
        id: crypto.randomUUID(),
        text,
        isCompleted: false,
        subTasks: [],
        depth: currentDepth,
        isExpanded: false,
      }));

      if (parentId === null) { // Breaking down the main task
        setSubTasks(newTasksFromAI);
      } else { // Breaking down an existing sub-task
        setSubTasks(prevTasks => recursiveFindAndAdd(prevTasks, parentId, newTasksFromAI));
      }

      if (newTasksFromAI.length > 0) {
        toast({ title: "Tâche décomposée par le Génie!", description: "Voici les sous-tâches suggérées." });
      } else {
        toast({ title: "Le Génie a besoin de plus de détails", description: "Aucune sous-tâche n'a pu être générée.", variant: "default" });
      }
    } catch (error) {
      console.error("Error breaking down task with AI:", error);
      toast({ title: "Erreur du Génie", description: "Le Génie n'a pas pu décomposer la tâche.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
      setLoadingAITaskId(null);
    }
  };
  
  const findTaskById = (tasksToSearch: SubTask[], id: string): SubTask | null => {
    for (const task of tasksToSearch) {
      if (task.id === id) return task;
      if (task.subTasks && task.subTasks.length > 0) {
        const found = findTaskById(task.subTasks, id);
        if (found) return found;
      }
    }
    return null;
  };


  const handleAddManualSubTask = (parentId: string | null) => {
    const text = parentId ? (newChildSubTaskText[parentId] || '').trim() : newDirectSubTaskText.trim();
    if (!text) return;

    const parentTask = parentId ? findTaskById(subTasks, parentId) : null;
    const depth = parentTask ? parentTask.depth + 1 : 0;

    const newManualTask: SubTask = {
      id: crypto.randomUUID(),
      text,
      isCompleted: false,
      subTasks: [],
      depth,
      isExpanded: false,
    };

    if (parentId === null) { // Adding to root
      setSubTasks(prevTasks => [...prevTasks, newManualTask]);
      setNewDirectSubTaskText('');
    } else { // Adding as a child to an existing sub-task
      setSubTasks(prevTasks => recursiveFindAndAdd(prevTasks, parentId, [newManualTask]));
      setNewChildSubTaskText(prev => ({ ...prev, [parentId]: '' }));
    }
  };

  const toggleSubTaskCompletion = (taskId: string) => {
    setSubTasks(prevTasks => recursiveUpdate(prevTasks, taskId, task => ({ ...task, isCompleted: !task.isCompleted })));
  };
  
  const toggleSubTaskExpansion = (taskId: string) => {
    setSubTasks(prevTasks => recursiveUpdate(prevTasks, taskId, task => ({ ...task, isExpanded: !(task.isExpanded ?? false) })));
  };

  const handleDeleteSubTask = (taskId: string) => {
    setSubTasks(prevTasks => recursiveDelete(prevTasks, taskId));
  };
  
  const handleSubTaskTextChange = (taskId: string, newText: string) => {
    setSubTasks(prevTasks => recursiveUpdate(prevTasks, taskId, task => ({ ...task, text: newText })));
  };

  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie proposera quelques grandes étapes.";
    if (intensity <= 4) return "Le Génie détaillera davantage les sous-tâches.";
    return "Le Génie fournira une décomposition très fine et détaillée.";
  };

  // Recursive component to render tasks
  const RenderTaskNode: React.FC<{ task: SubTask; currentDepth: number }> = ({ task, currentDepth }) => {
    const isCurrentlyLoadingAI = isLoadingAI && loadingAITaskId === task.id;
    const hasChildren = task.subTasks && task.subTasks.length > 0;

    return (
      <div style={{ marginLeft: `${currentDepth * 20}px` }} className="mb-2">
        <div className={`flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50 transition-colors ${task.isCompleted ? 'opacity-70' : ''}`}>
          {hasChildren || task.subTasks?.length > 0 ? ( // Check if it can have children or already has
             <Button variant="ghost" size="icon" onClick={() => toggleSubTaskExpansion(task.id)} className="h-6 w-6 p-0">
              {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <span className="w-6"></span> // Placeholder for alignment
          )}
          <Button variant="ghost" size="icon" onClick={() => toggleSubTaskCompletion(task.id)} aria-label={task.isCompleted ? "Marquer comme non terminée" : "Marquer comme terminée"} className="h-6 w-6 p-0">
            {task.isCompleted ? <CheckSquare className="text-green-500 h-4 w-4" /> : <Square className="text-muted-foreground h-4 w-4" />}
          </Button>
          <Input 
            value={task.text} 
            onChange={(e) => handleSubTaskTextChange(task.id, e.target.value)}
            className={`flex-grow bg-transparent border-0 focus:ring-0 h-auto py-0 ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}
            disabled={isLoadingAI}
          />
          <Button variant="ghost" size="icon" onClick={() => handleGenieBreakdown(task.text, task.id)} aria-label="Décomposer cette tâche avec le Génie" disabled={isCurrentlyLoadingAI || isLoadingAI} className="h-6 w-6 p-0">
            {isCurrentlyLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="text-primary h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubTask(task.id)} aria-label="Supprimer la sous-tâche" disabled={isLoadingAI} className="h-6 w-6 p-0">
            <Trash2 className="text-destructive w-4 h-4" />
          </Button>
        </div>

        {/* Input for adding new child to this task */}
        {task.isExpanded && ( // Only show input if parent is expanded, or always show if we want to allow adding to unexpanded
        <div style={{ marginLeft: `20px` }} className="mt-1 pl-1 flex gap-2 items-center">
          <Input
            value={newChildSubTaskText[task.id] || ''}
            onChange={(e) => setNewChildSubTaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
            placeholder="Ajouter une sous-tâche ici..."
            className="flex-grow h-8 text-sm"
            onKeyPress={(e) => { if (e.key === 'Enter') handleAddManualSubTask(task.id); }}
            disabled={isLoadingAI}
          />
          <Button onClick={() => handleAddManualSubTask(task.id)} variant="outline" size="sm" disabled={isLoadingAI} className="h-8">
            <PlusCircle className="mr-1 h-3 w-3" /> Ajouter
          </Button>
        </div>
        )}
        
        {task.isExpanded && task.subTasks && task.subTasks.length > 0 && (
          <div className="mt-2">
            {task.subTasks.map(childTask => (
              <RenderTaskNode key={childTask.id} task={childTask} currentDepth={childTask.depth} />
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl"> {/* Increased max-width for better nesting visibility */}
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">TaskBreaker Magique</CardTitle>
        <CardDescription>Décomposez vos tâches complexes. Le Génie vous aide à voir plus clair, niveau par niveau !</CardDescription>
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
              placeholder="Ex: Planifier un voyage épique"
              className="flex-grow"
              disabled={isLoadingAI || isListening}
            />
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleVoiceInput}
              className={`${isListening ? 'text-red-500 animate-pulse' : ''}`}
              aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
              disabled={isLoadingAI || (isListening && recognitionRef.current && recognitionRef.current.isListening)}
            >
              <Mic className="h-5 w-5" />
            </Button>
            <Button onClick={() => handleGenieBreakdown(mainTask, null)} disabled={isLoadingAI || !mainTask.trim() || isListening || (isLoadingAI && loadingAITaskId !== null)}>
              {(isLoadingAI && loadingAITaskId === null) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Décomposer Tâche Principale
            </Button>
          </div>
        </div>

        { (mainTask || subTasks.length > 0) && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">
              {mainTask ? `Décomposition pour : "${mainTask}"` : "Liste des sous-tâches"}
            </h3>
            {subTasks.length === 0 && !isLoadingAI && (
                <p className="text-muted-foreground italic">Aucune sous-tâche. Cliquez sur "Décomposer" ou ajoutez-en manuellement ci-dessous.</p>
            )}
            {(isLoadingAI && loadingAITaskId === null && subTasks.length === 0) && (
                <div className="flex items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Le Génie décompose la tâche principale...
                </div>
            )}
            
            {/* Render top-level tasks */}
            <div className="space-y-1">
              {subTasks.map((task) => (
                <RenderTaskNode key={task.id} task={task} currentDepth={0} />
              ))}
            </div>

            {/* Input for adding new direct sub-task to main task */}
            <div className="mt-4 flex gap-2">
              <Input 
                value={newDirectSubTaskText}
                onChange={(e) => setNewDirectSubTaskText(e.target.value)}
                placeholder="Ajouter une sous-tâche manuellement à la tâche principale"
                className="flex-grow"
                onKeyPress={(e) => {if (e.key === 'Enter') handleAddManualSubTask(null);}}
                disabled={isLoadingAI}
              />
              <Button onClick={() => handleAddManualSubTask(null)} variant="outline" disabled={isLoadingAI}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter à la tâche principale
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
