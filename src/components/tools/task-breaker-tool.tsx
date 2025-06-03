
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2, ChevronDown, ChevronRight, Download, Mail, History, ListChecks, Save, BookOpenCheck } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';
import type { TaskBreakerTask, SavedTaskBreakdown } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

const TASK_BREAKER_STORAGE_KEY_MAIN = "easyGenieTaskBreakerMain_v1"; // version if structure changes significantly
const TASK_BREAKER_STORAGE_KEY_SUBTASKS = "easyGenieTaskBreakerSubtasks_v3"; // new key for isExpanded
const TASK_BREAKER_HISTORY_KEY = "easyGenieTaskBreakerHistory_v1";

interface CommonTaskPreset {
  id: string;
  name: string;
  description: string;
}

const commonTaskPresets: CommonTaskPreset[] = [
  { id: 'evt', name: "Organiser un événement majeur (ex: mariage, grande conférence)", description: "De la conception initiale à la gestion le jour J." },
  { id: 'report', name: "Rédiger un rapport de recherche approfondi", description: "Incluant la collecte de données, l'analyse, la rédaction et la révision." },
  { id: 'skill', name: "Apprendre une nouvelle compétence complexe (ex: un langage de programmation, un instrument)", description: "Définir les objectifs, trouver les ressources, pratiquer régulièrement et évaluer les progrès." },
  { id: 'launch', name: "Lancer un nouveau produit ou service", description: "De l'étude de marché au marketing, en passant par le développement et le lancement." },
  { id: 'move', name: "Planifier un déménagement international", description: "Logistique, visas, recherche de logement, adaptation culturelle." },
];


export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTask, setMainTask] = useState<string>('');
  const [subTasks, setSubTasks] = useState<TaskBreakerTask[]>([]);
  
  const [newDirectSubTaskText, setNewDirectSubTaskText] = useState<string>('');
  const [newChildSubTaskText, setNewChildSubTaskText] = useState<{ [parentId: string]: string }>({});

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [loadingAITaskId, setLoadingAITaskId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const [history, setHistory] = useState<SavedTaskBreakdown[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [saveToHistoryDialog, setSaveToHistoryDialog] = useState(false);
  const [currentBreakdownName, setCurrentBreakdownName] = useState('');
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);


  useEffect(() => {
    const savedMainTask = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_MAIN);
    if (savedMainTask) setMainTask(savedMainTask);
    const savedSubTasks = localStorage.getItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS);
    if (savedSubTasks) {
      try {
        setSubTasks(JSON.parse(savedSubTasks));
      } catch (e) {
        console.error("Failed to parse subtasks from localStorage", e);
        localStorage.removeItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS);
      }
    }
    const savedHistory = localStorage.getItem(TASK_BREAKER_HISTORY_KEY);
    if (savedHistory) {
        try {
            setHistory(JSON.parse(savedHistory));
        } catch (e) {
            console.error("Failed to parse history from localStorage", e);
            localStorage.removeItem(TASK_BREAKER_HISTORY_KEY);
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
  }, [toast]);

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
  }, [isListening, toast]);

  useEffect(() => {
    localStorage.setItem(TASK_BREAKER_STORAGE_KEY_MAIN, mainTask);
  }, [mainTask]);

  useEffect(() => {
    localStorage.setItem(TASK_BREAKER_STORAGE_KEY_SUBTASKS, JSON.stringify(subTasks));
  }, [subTasks]);

  useEffect(() => {
    localStorage.setItem(TASK_BREAKER_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible.", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
  };

  const recursiveUpdate = useCallback((
    tasks: TaskBreakerTask[], 
    targetId: string, 
    updateFn: (task: TaskBreakerTask) => TaskBreakerTask
  ): TaskBreakerTask[] => {
    return tasks.map(task => {
      if (task.id === targetId) {
        return updateFn(task);
      }
      if (task.subTasks && task.subTasks.length > 0) {
        return { ...task, subTasks: recursiveUpdate(task.subTasks, targetId, updateFn) };
      }
      return task;
    });
  }, []);

  const recursiveDelete = useCallback((tasks: TaskBreakerTask[], targetId: string): TaskBreakerTask[] => {
    return tasks.filter(task => {
      if (task.id === targetId) {
        return false; 
      }
      if (task.subTasks && task.subTasks.length > 0) {
        task.subTasks = recursiveDelete(task.subTasks, targetId);
      }
      return true;
    });
  }, []);
  
  const recursiveFindAndAdd = useCallback((
    tasks: TaskBreakerTask[],
    parentId: string,
    newTasks: TaskBreakerTask[]
  ): TaskBreakerTask[] => {
    return tasks.map(task => {
      if (task.id === parentId) {
        return { ...task, subTasks: [...(task.subTasks || []), ...newTasks], isExpanded: true };
      }
      if (task.subTasks && task.subTasks.length > 0) {
        return { ...task, subTasks: recursiveFindAndAdd(task.subTasks, parentId, newTasks) };
      }
      return task;
    });
  }, []);
  
  const findTaskById = useCallback((tasksToSearch: TaskBreakerTask[], id: string): TaskBreakerTask | null => {
    for (const task of tasksToSearch) {
      if (task.id === id) return task;
      if (task.subTasks && task.subTasks.length > 0) {
        const found = findTaskById(task.subTasks, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleGenieBreakdown = async (taskTextToBreak: string, parentId: string | null) => {
    if (!taskTextToBreak.trim()) {
      toast({ title: "Tâche manquante", description: "Veuillez entrer une tâche à décomposer.", variant: "destructive" });
      return;
    }
    setIsLoadingAI(true);
    setLoadingAITaskId(parentId);
    try {
      const result = await breakdownTask({ mainTaskText: taskTextToBreak, intensityLevel: intensity });
      const parentTask = parentId ? findTaskById(subTasks, parentId) : null;
      const currentDepth = parentTask ? (parentTask.depth ?? 0) + 1 : 0;


      const newTasksFromAI: TaskBreakerTask[] = result.suggestedSubTasks.map(text => ({
        id: crypto.randomUUID(),
        text,
        is_completed: false,
        subTasks: [],
        depth: currentDepth,
        isExpanded: false,
        order: 0, // Order will be set by parent or if root
      }));

      if (parentId === null) {
        setSubTasks(newTasksFromAI.map((task, index) => ({...task, order: index })));
      } else {
        setSubTasks(prevTasks => {
            const parent = findTaskById(prevTasks, parentId);
            const orderOffset = parent?.subTasks?.length ?? 0;
            return recursiveFindAndAdd(prevTasks, parentId, newTasksFromAI.map((task, index) => ({...task, order: orderOffset + index})))
        });
      }

      if (newTasksFromAI.length > 0) {
        toast({ title: "Tâche décomposée par le Génie!", description: "Voici les sous-tâches suggérées." });
      } else {
        toast({ title: "Le Génie a besoin de plus de détails", description: "Aucune sous-tâche n'a pu être générée.", variant: "default" });
      }
    } catch (error) {
      console.error("Error breaking down task with AI:", error);
      toast({ title: "Erreur du Génie", description: (error as Error).message || "Le Génie n'a pas pu décomposer la tâche.", variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
      setLoadingAITaskId(null);
    }
  };

  const handleAddManualSubTask = (parentId: string | null) => {
    const text = parentId ? (newChildSubTaskText[parentId] || '').trim() : newDirectSubTaskText.trim();
    if (!text) return;

    const parentTask = parentId ? findTaskById(subTasks, parentId) : null;
    const depth = parentTask ? (parentTask.depth ?? 0) + 1 : 0;
    const order = parentTask ? (parentTask.subTasks?.length ?? 0) : subTasks.length;

    const newManualTask: TaskBreakerTask = {
      id: crypto.randomUUID(),
      text,
      is_completed: false,
      subTasks: [],
      depth,
      isExpanded: false,
      order,
    };

    if (parentId === null) {
      setSubTasks(prevTasks => [...prevTasks, newManualTask]);
      setNewDirectSubTaskText('');
    } else {
      setSubTasks(prevTasks => recursiveFindAndAdd(prevTasks, parentId, [newManualTask]));
      setNewChildSubTaskText(prev => ({ ...prev, [parentId]: '' }));
    }
  };

  const toggleSubTaskCompletion = (taskId: string) => {
    setSubTasks(prevTasks => recursiveUpdate(prevTasks, taskId, task => ({ ...task, is_completed: !task.is_completed })));
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
  
  // --- Export Logic ---
  const generateTaskTreeText = (tasks: TaskBreakerTask[], currentDepth: number, format: 'txt' | 'md'): string => {
    let output = '';
    const indentChar = format === 'md' ? '  ' : '  '; // Markdown uses spaces for list indentation

    tasks.forEach(task => {
      const prefix = format === 'md' ? (task.is_completed ? '- [x] ' : '- [ ] ') : (task.is_completed ? '[x] ' : '[ ] ');
      const indentation = indentChar.repeat(currentDepth * 2); // Increase indent factor for md lists
      output += `${indentation}${prefix}${task.text}\n`;
      if (task.subTasks && task.subTasks.length > 0) {
        output += generateTaskTreeText(task.subTasks, currentDepth + 1, format);
      }
    });
    return output;
  };

  const handleExport = (format: 'txt' | 'md' | 'email') => {
    if (!mainTask.trim() && subTasks.length === 0) {
      toast({ title: "Rien à exporter", description: "Veuillez d'abord entrer une tâche principale ou des sous-tâches.", variant: "destructive"});
      return;
    }

    let content = '';
    let fileExtension = format;
    let mimeType = 'text/plain';

    if (format === 'md' || format === 'email') { // email will use markdown body
      content = `# ${mainTask || "Tâche Principale Non Définie"}\n\n`;
      if(subTasks.length > 0) content += generateTaskTreeText(subTasks, 0, 'md');
      else content += "_Aucune sous-tâche définie._\n";
      fileExtension = 'md';
      mimeType = 'text/markdown';
    } else { // txt
      content = `${mainTask || "Tâche Principale Non Définie"}\n\n`;
      if(subTasks.length > 0) content += generateTaskTreeText(subTasks, 0, 'txt');
      else content += "Aucune sous-tâche définie.\n";
    }

    if (format === 'email') {
      const subject = encodeURIComponent(`Décomposition de tâche : ${mainTask || 'Nouvelle Tâche'}`);
      const body = encodeURIComponent(content);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast({ title: "Préparation de l'email", description: "Votre client email devrait s'ouvrir." });
    } else {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decomposition-${mainTask ? mainTask.toLowerCase().replace(/\s+/g, '-') : 'tache'}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exportation réussie!", description: `Fichier ${link.download} téléchargé.`});
    }
  };

  // --- History Logic ---
  const handleOpenSaveToHistoryDialog = () => {
    if (!mainTask.trim() && subTasks.length === 0) {
      toast({ title: "Rien à sauvegarder", description: "La tâche principale ou les sous-tâches sont vides.", variant: "destructive" });
      return;
    }
    setCurrentBreakdownName(mainTask.substring(0, 50) || "Nouvelle Décomposition");
    setSaveToHistoryDialog(true);
  };

  const handleSaveToHistory = () => {
    if (!currentBreakdownName.trim()) {
      toast({ title: "Nom requis", description: "Veuillez donner un nom à cette décomposition.", variant: "destructive"});
      return;
    }
    const newHistoryEntry: SavedTaskBreakdown = {
      id: crypto.randomUUID(),
      name: currentBreakdownName,
      mainTaskText: mainTask,
      subTasks: JSON.parse(JSON.stringify(subTasks)), // Deep copy
      createdAt: new Date().toISOString(),
      intensityOnSave: intensity,
    };
    setHistory(prev => [newHistoryEntry, ...prev].slice(0, 20)); // Keep last 20 for example
    setSaveToHistoryDialog(false);
    setCurrentBreakdownName('');
    toast({ title: "Sauvegardé dans l'historique!", description: `"${newHistoryEntry.name}" a été ajouté.`});
  };

  const handleLoadFromHistory = (entry: SavedTaskBreakdown) => {
    setMainTask(entry.mainTaskText);
    setSubTasks(JSON.parse(JSON.stringify(entry.subTasks))); // Deep copy
    if (entry.intensityOnSave) setIntensity(entry.intensityOnSave);
    setShowHistoryDialog(false);
    toast({ title: "Chargé depuis l'historique", description: `Décomposition "${entry.name}" restaurée.`});
  };

  const handleDeleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
    toast({ title: "Supprimé de l'historique", variant: "destructive"});
  };

  // --- Presets Logic ---
  const handleLoadPreset = (preset: CommonTaskPreset) => {
    setMainTask(preset.name);
    setSubTasks([]); // Clear subtasks when loading a preset main task
    setShowPresetsDialog(false);
    toast({ title: "Tâche courante chargée", description: `Vous pouvez maintenant décomposer "${preset.name}".` });
  };

  const RenderTaskNode: React.FC<{ task: TaskBreakerTask; currentDepth: number }> = ({ task, currentDepth }) => {
    const isCurrentlyLoadingAI = isLoadingAI && loadingAITaskId === task.id;
    const hasChildren = task.subTasks && task.subTasks.length > 0;

    return (
      <div style={{ marginLeft: `${currentDepth * 20}px` }} className="mb-2">
        <div className={`flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50 transition-colors ${task.is_completed ? 'opacity-70' : ''}`}>
          {hasChildren || (task.subTasks !== undefined) ? ( 
             <Button variant="ghost" size="icon" onClick={() => toggleSubTaskExpansion(task.id)} className="h-6 w-6 p-0">
              {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <span className="w-6 h-6 inline-block"></span> 
          )}
          <Button variant="ghost" size="icon" onClick={() => toggleSubTaskCompletion(task.id)} aria-label={task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée"} className="h-6 w-6 p-0">
            {task.is_completed ? <CheckSquare className="text-green-500 h-4 w-4" /> : <Square className="text-muted-foreground h-4 w-4" />}
          </Button>
          <Input 
            value={task.text} 
            onChange={(e) => handleSubTaskTextChange(task.id, e.target.value)}
            className={`flex-grow bg-transparent border-0 focus:ring-0 h-auto py-0 ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
            disabled={isLoadingAI}
          />
          <Button variant="ghost" size="icon" onClick={() => handleGenieBreakdown(task.text, task.id)} aria-label="Décomposer cette tâche avec le Génie" disabled={isCurrentlyLoadingAI || isLoadingAI} className="h-6 w-6 p-0">
            {isCurrentlyLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="text-primary h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubTask(task.id)} aria-label="Supprimer la sous-tâche" disabled={isLoadingAI} className="h-6 w-6 p-0">
            <Trash2 className="text-destructive w-4 h-4" />
          </Button>
        </div>

        {task.isExpanded && (
        <div style={{ marginLeft: `20px` }} className="mt-1 pl-1 flex gap-2 items-center">
          <Input
            value={newChildSubTaskText[task.id] || ''}
            onChange={(e) => setNewChildSubTaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
            placeholder="Ajouter une sous-tâche ici..."
            className="flex-grow h-8 text-sm"
            onKeyPress={(e) => { if (e.key === 'Enter' && !isLoadingAI) handleAddManualSubTask(task.id); }}
            disabled={isLoadingAI}
          />
          <Button onClick={() => handleAddManualSubTask(task.id)} variant="outline" size="sm" disabled={isLoadingAI || !(newChildSubTaskText[task.id] || '').trim()} className="h-8">
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
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">TaskBreaker Magique</CardTitle>
        <CardDescription>Décomposez vos tâches complexes. Le Génie vous aide à voir plus clair, niveau par niveau ! Votre travail est sauvegardé automatiquement dans votre navigateur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-2 h-5">{intensityDescription()}</p>
        
        <div className="flex flex-col sm:flex-row gap-2 items-start">
            <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline"><BookOpenCheck className="mr-2 h-4 w-4" /> Charger Tâche Courante</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Charger une Tâche Courante</DialogTitle>
                        <DialogDescription>Choisissez un exemple de tâche complexe à décomposer.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] pr-3">
                        <div className="space-y-2">
                        {commonTaskPresets.map(preset => (
                            <Button key={preset.id} variant="ghost" className="w-full justify-start text-left h-auto py-2" onClick={() => handleLoadPreset(preset)}>
                                <div>
                                    <p className="font-medium">{preset.name}</p>
                                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                                </div>
                            </Button>
                        ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button variant="outline" onClick={handleOpenSaveToHistoryDialog} disabled={(!mainTask.trim() && subTasks.length === 0)}><Save className="mr-2 h-4 w-4" /> Sauvegarder dans l'Historique</Button>
           
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline"><History className="mr-2 h-4 w-4" /> Voir Historique ({history.length})</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Historique des Décompositions</DialogTitle></DialogHeader>
                    <ScrollArea className="h-[400px] pr-3">
                        {history.length === 0 && <p className="text-muted-foreground text-center py-4">Votre historique est vide.</p>}
                        <div className="space-y-3">
                        {history.map(entry => (
                            <Card key={entry.id} className="p-3">
                                <CardHeader className="p-0 pb-2"><CardTitle className="text-base">{entry.name}</CardTitle></CardHeader>
                                <CardContent className="p-0 pb-2">
                                    <p className="text-xs text-muted-foreground truncate">Tâche principale : {entry.mainTaskText}</p>
                                    <p className="text-xs text-muted-foreground">Sous-tâches : {entry.subTasks.length}</p>
                                    <p className="text-xs text-muted-foreground">Sauvegardé le : {new Date(entry.createdAt).toLocaleDateString()}</p>
                                </CardContent>
                                <CardFooter className="p-0 flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleLoadFromHistory(entry)}>Charger</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteFromHistory(entry.id)}>Supprimer</Button>
                                </CardFooter>
                            </Card>
                        ))}
                        </div>
                    </ScrollArea>
                     <DialogFooter> <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose></DialogFooter>
                </DialogContent>
            </Dialog>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Exporter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuLabel>Options d'Export</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('txt')}>Fichier Texte (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('md')}>Fichier Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('email')}><Mail className="mr-2 h-4 w-4" /> Envoyer par Email</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        
        <div>
          <label htmlFor="main-task" className="block text-sm font-medium text-foreground mb-1">Tâche principale à décomposer :</label>
          <div className="flex gap-2 items-center">
            <Textarea
              id="main-task"
              value={mainTask}
              onChange={(e) => setMainTask(e.target.value)}
              placeholder="Ex: Planifier un voyage épique"
              className="flex-grow"
              rows={2}
              disabled={isLoadingAI || isListening}
            />
             <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleVoiceInput}
              className={`${isListening ? 'text-red-500 animate-pulse' : ''} self-start`}
              aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
              disabled={isLoadingAI || (isListening && recognitionRef.current && recognitionRef.current.isListening)}
            >
              <Mic className="h-5 w-5" />
            </Button>
          </div>
           <Button onClick={() => handleGenieBreakdown(mainTask, null)} disabled={isLoadingAI || !mainTask.trim() || isListening || (isLoadingAI && loadingAITaskId !== null)} className="mt-2">
              {(isLoadingAI && loadingAITaskId === null) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Décomposer Tâche Principale
            </Button>
        </div>

        { (mainTask || subTasks.length > 0) && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-foreground mt-4">
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
            
            <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2 rounded-md border p-2 bg-muted/20">
              {subTasks.map((task) => (
                <RenderTaskNode key={task.id} task={task} currentDepth={0} />
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Input 
                value={newDirectSubTaskText}
                onChange={(e) => setNewDirectSubTaskText(e.target.value)}
                placeholder="Ajouter une sous-tâche manuellement à la tâche principale"
                className="flex-grow"
                onKeyPress={(e) => {if (e.key === 'Enter' && !isLoadingAI && newDirectSubTaskText.trim()) handleAddManualSubTask(null);}}
                disabled={isLoadingAI}
              />
              <Button onClick={() => handleAddManualSubTask(null)} variant="outline" disabled={isLoadingAI || !newDirectSubTaskText.trim()}>
                <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            Une tâche bien décomposée est une tâche à moitié terminée !
        </p>
      </CardFooter>

       <Dialog open={saveToHistoryDialog} onOpenChange={setSaveToHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder dans l'historique</DialogTitle>
            <DialogDescription>Donnez un nom à cette décomposition pour la retrouver plus tard.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="breakdownName">Nom de la décomposition</Label>
            <Input 
              id="breakdownName" 
              value={currentBreakdownName} 
              onChange={(e) => setCurrentBreakdownName(e.target.value)} 
              placeholder="Ex: Organisation Voyage Japon Été 2025"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={handleSaveToHistory} disabled={!currentBreakdownName.trim()}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


    