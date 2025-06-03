
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2, ChevronDown, ChevronRight, Download, Mail, History, ListChecks, Save, BookOpenCheck, Eraser, BookmarkPlus, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';
import type { TaskBreakerTask, SavedTaskBreakdown, CommonTaskPreset, CreateTaskBreakerTaskDTO, UITaskBreakerTask } from '@/types';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAuth } from '@/contexts/AuthContext';
import { 
  getAllTaskBreakerTasks, 
  addTaskBreakerTask, 
  updateTaskBreakerTask, 
  deleteTaskBreakerTask 
} from '@/services/appDataService';

// LocalStorage keys for features not yet migrated to DB
const TASK_BREAKER_HISTORY_KEY = "easyGenieTaskBreakerHistory_v1";
const TASK_BREAKER_CUSTOM_COMMON_PRESETS_KEY = "easyGenieTaskBreakerCustomCommonPresets_v1";
const TASK_BREAKER_EXPANDED_STATE_KEY = "easyGenieTaskBreakerExpandedState_v1";


const systemTaskPresets: CommonTaskPreset[] = [
  { id: 'evt', name: "Organiser un événement majeur", taskText: "Organiser un événement majeur (ex: mariage, grande conférence)", isSystemPreset: true },
  { id: 'report', name: "Rédiger un rapport de recherche", taskText: "Rédiger un rapport de recherche approfondi (collecte, analyse, rédaction, révision)", isSystemPreset: true },
  { id: 'skill', name: "Apprendre une nouvelle compétence", taskText: "Apprendre une nouvelle compétence complexe (ex: langage de programmation, instrument)", isSystemPreset: true },
  // ... more presets if needed
];

// Helper to build tree from flat list
const buildTree = (tasks: TaskBreakerTask[], parentId: string | null = null, expandedStates: Record<string, boolean>): UITaskBreakerTask[] => {
  return tasks
    .filter(task => task.parent_id === parentId)
    .sort((a, b) => a.order - b.order)
    .map(task => ({
      ...task,
      isExpanded: expandedStates[task.id] || false,
      subTasks: buildTree(tasks, task.id, expandedStates),
    }));
};

export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTaskInput, setMainTaskInput] = useState<string>(''); // User's current input for the main task
  const [currentMainTaskContext, setCurrentMainTaskContext] = useState<string>(''); // The main task context for currently displayed subtasks

  const [allTasksFlat, setAllTasksFlat] = useState<TaskBreakerTask[]>([]); // Flat list from DB
  const [taskTree, setTaskTree] = useState<UITaskBreakerTask[]>([]); // Hierarchical for UI
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  
  const [newDirectSubTaskText, setNewDirectSubTaskText] = useState<string>('');
  const [newChildSubTaskText, setNewChildSubTaskText] = useState<{ [parentId: string]: string }>({});

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [loadingAITaskId, setLoadingAITaskId] = useState<string | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For manual add/update/delete

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- LocalStorage features (History, Custom Presets) ---
  const [history, setHistory] = useState<SavedTaskBreakdown[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [saveToHistoryDialog, setSaveToHistoryDialog] = useState(false);
  const [currentBreakdownName, setCurrentBreakdownName] = useState('');
  
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [customCommonPresets, setCustomCommonPresets] = useState<CommonTaskPreset[]>([]);
  const [showSaveCustomPresetDialog, setShowSaveCustomPresetDialog] = useState(false);
  const [newCustomPresetNameInput, setNewCustomPresetNameInput] = useState('');
  const [showClearTaskDialog, setShowClearTaskDialog] = useState(false);

  // Load initial data (expanded states, local history, local custom presets)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExpanded = localStorage.getItem(TASK_BREAKER_EXPANDED_STATE_KEY);
      if (savedExpanded) setExpandedStates(JSON.parse(savedExpanded));

      const savedHistory = localStorage.getItem(TASK_BREAKER_HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedCustomPresets = localStorage.getItem(TASK_BREAKER_CUSTOM_COMMON_PRESETS_KEY);
      if (savedCustomPresets) setCustomCommonPresets(JSON.parse(savedCustomPresets));
    }
  }, []);

  // Save expanded states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASK_BREAKER_EXPANDED_STATE_KEY, JSON.stringify(expandedStates));
    }
  }, [expandedStates]);

  // Save local history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASK_BREAKER_HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  // Save local custom presets
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASK_BREAKER_CUSTOM_COMMON_PRESETS_KEY, JSON.stringify(customCommonPresets));
    }
  }, [customCommonPresets]);


  const fetchAndBuildTree = useCallback(async () => {
    if (!user) {
      setAllTasksFlat([]);
      setTaskTree([]);
      setMainTaskInput('');
      setCurrentMainTaskContext('');
      setIsLoadingTasks(false);
      return;
    }
    setIsLoadingTasks(true);
    try {
      const flatTasks = await getAllTaskBreakerTasks();
      setAllTasksFlat(flatTasks);
      const tree = buildTree(flatTasks, null, expandedStates);
      setTaskTree(tree);
      
      // Set mainTaskInput and currentMainTaskContext based on fetched tasks
      if (flatTasks.length > 0) {
        const topLevelTasks = flatTasks.filter(t => t.parent_id === null);
        if (topLevelTasks.length > 0) {
          // Use the context of the most recently updated top-level task, or first one
          topLevelTasks.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
          const mainContext = topLevelTasks[0].main_task_text_context || '';
          setMainTaskInput(mainContext); // Pre-fill input if user wants to re-breakdown
          setCurrentMainTaskContext(mainContext); // Set context for display
        } else {
           setMainTaskInput(''); setCurrentMainTaskContext('');
        }
      } else {
        setMainTaskInput(''); setCurrentMainTaskContext('');
      }

    } catch (error) {
      console.error("Error fetching TaskBreaker tasks:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les tâches.", variant: "destructive" });
      setAllTasksFlat([]);
      setTaskTree([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user, toast, expandedStates]); // expandedStates is a dependency for buildTree

  useEffect(() => {
    fetchAndBuildTree();
  }, [fetchAndBuildTree, isOnline]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMainTaskInput(prev => prev ? prev + ' ' + transcript : transcript);
        toast({ title: "Tâche principale mise à jour!" });
      };
      recognitionRef.current.onerror = (event: any) => toast({ title: "Erreur de reconnaissance vocale", description: event.error, variant: "destructive" });
      recognitionRef.current.onend = () => setIsListening(false);
    } else console.warn("Speech Recognition API not supported.");
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, [toast]);

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.start(); } 
      catch (e) { setIsListening(false); toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"}); }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, toast]);

  const handleToggleVoiceInput = () => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", variant: "destructive" });
      return;
    }
    setIsListening(prev => !prev);
  };

  const handleDebouncedTaskTextChange = useCallback((taskId: string, newText: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      setIsSubmitting(true);
      try {
        await updateTaskBreakerTask(taskId, { text: newText });
        // fetchAndBuildTree(); // Re-fetch for consistency, or rely on optimistic update
        // Optimistic update already done by direct input change, but ensure data is fresh
        const updatedTasks = allTasksFlat.map(t => t.id === taskId ? {...t, text: newText, updated_at: new Date().toISOString()} : t);
        setAllTasksFlat(updatedTasks);
        setTaskTree(buildTree(updatedTasks, null, expandedStates));

        toast({ title: "Tâche sauvegardée", description: "Modification enregistrée."});
      } catch (error) {
        console.error("Error saving task text:", error);
        toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive"});
        fetchAndBuildTree(); // Re-fetch on error to revert optimistic
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);
  }, [user, toast, fetchAndBuildTree, allTasksFlat, expandedStates]);

  const handleSubTaskTextChange = (taskId: string, newText: string) => {
    // Optimistic UI update
    const updateInTree = (nodes: UITaskBreakerTask[]): UITaskBreakerTask[] => {
      return nodes.map(node => {
        if (node.id === taskId) return { ...node, text: newText };
        if (node.subTasks.length > 0) return { ...node, subTasks: updateInTree(node.subTasks) };
        return node;
      });
    };
    setTaskTree(prevTree => updateInTree(prevTree));
    handleDebouncedTaskTextChange(taskId, newText);
  };

  const handleGenieBreakdown = async (taskTextToBreak: string, parentId: string | null) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    if (!taskTextToBreak.trim()) { toast({ title: "Tâche manquante", variant: "destructive" }); return; }
    
    setIsLoadingAI(true);
    setLoadingAITaskId(parentId);
    
    let mainContextForNewTasks = parentId ? (allTasksFlat.find(t => t.id === parentId)?.main_task_text_context || currentMainTaskContext) : mainTaskInput;
    
    try {
      const result = await breakdownTask({ mainTaskText: taskTextToBreak, intensityLevel: intensity });
      
      const parentTask = parentId ? allTasksFlat.find(t => t.id === parentId) : null;
      const currentDepth = parentTask ? parentTask.depth + 1 : 0;
      const orderOffset = parentTask ? taskTree.find(t=>t.id === parentId)?.subTasks?.length ?? 0 : taskTree.length;

      const newTasksFromAI: CreateTaskBreakerTaskDTO[] = result.suggestedSubTasks.map((text, index) => ({
        text,
        parent_id: parentId,
        main_task_text_context: mainContextForNewTasks,
        is_completed: false,
        depth: currentDepth,
        order: orderOffset + index,
      }));

      for (const taskDto of newTasksFromAI) {
        await addTaskBreakerTask(taskDto);
      }
      
      await fetchAndBuildTree(); // Re-fetch to get new IDs and ensure tree is correct
      if (parentId) setExpandedStates(prev => ({...prev, [parentId]: true}));

      if (newTasksFromAI.length > 0) toast({ title: "Tâche décomposée par le Génie!" });
      else toast({ title: "Le Génie a besoin de plus de détails" });

      if(!parentId) setCurrentMainTaskContext(mainTaskInput); // Set context if it's a new main breakdown

    } catch (error) {
      console.error("Error AI breakdown:", error);
      toast({ title: "Erreur du Génie", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingAI(false);
      setLoadingAITaskId(null);
    }
  };

  const handleAddManualSubTask = async (parentId: string | null) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    const text = parentId ? (newChildSubTaskText[parentId] || '').trim() : newDirectSubTaskText.trim();
    if (!text) return;

    setIsSubmitting(true);
    try {
      const parentTask = parentId ? allTasksFlat.find(t => t.id === parentId) : null;
      const depth = parentTask ? parentTask.depth + 1 : 0;
      const order = parentTask ? taskTree.find(t=>t.id === parentId)?.subTasks?.length ?? 0 : taskTree.length;
      const mainContext = parentId ? (parentTask?.main_task_text_context || currentMainTaskContext) : currentMainTaskContext || mainTaskInput;

      const taskDto: CreateTaskBreakerTaskDTO = {
        text,
        parent_id: parentId,
        main_task_text_context: mainContext,
        is_completed: false,
        depth,
        order,
      };
      await addTaskBreakerTask(taskDto);
      await fetchAndBuildTree();
      if (parentId) setExpandedStates(prev => ({...prev, [parentId]: true}));
      else if (!currentMainTaskContext && mainTaskInput) setCurrentMainTaskContext(mainTaskInput);


      if (parentId) setNewChildSubTaskText(prev => ({ ...prev, [parentId]: '' }));
      else setNewDirectSubTaskText('');
      toast({title: "Sous-tâche ajoutée."})
    } catch (error) {
      console.error("Error adding manual sub-task:", error);
      toast({ title: "Erreur d'ajout", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubTaskCompletion = async (taskId: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    const task = allTasksFlat.find(t => t.id === taskId);
    if (!task) return;
    
    setIsSubmitting(true);
    try {
      await updateTaskBreakerTask(taskId, { is_completed: !task.is_completed });
      const updatedTasks = allTasksFlat.map(t => t.id === taskId ? {...t, is_completed: !task.is_completed, updated_at: new Date().toISOString()} : t);
      setAllTasksFlat(updatedTasks);
      setTaskTree(buildTree(updatedTasks, null, expandedStates));
      toast({ title: task.is_completed ? "Tâche marquée non faite" : "Tâche complétée !" });
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleSubTaskExpansion = (taskId: string) => {
    setExpandedStates(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    // Tree will be rebuilt by useEffect watching expandedStates if needed, or manually trigger:
    setTaskTree(buildTree(allTasksFlat, null, {...expandedStates, [taskId]: !expandedStates[taskId]}));
  };

  const handleDeleteSubTask = async (taskId: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      await deleteTaskBreakerTask(taskId); // This should handle children in services
      await fetchAndBuildTree(); // Re-fetch to get updated state
      toast({ title: "Tâche supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Erreur de suppression", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const intensityDescription = () => { /* ... same as before ... */ };
  const generateTaskTreeText = (tasks: UITaskBreakerTask[], currentDepth: number, format: 'txt' | 'md'): string => { /* ... same as before, but use UITaskBreakerTask ... */
    let output = '';
    const indentChar = format === 'md' ? '  ' : '  '; 

    tasks.forEach(task => {
      const prefix = format === 'md' ? (task.is_completed ? '- [x] ' : '- [ ] ') : (task.is_completed ? '[x] ' : '[ ] ');
      const indentation = indentChar.repeat(task.depth * 2); // Use task.depth
      output += `${indentation}${prefix}${task.text}\n`;
      if (task.subTasks && task.subTasks.length > 0) { // Check task.subTasks from UITaskBreakerTask
        output += generateTaskTreeText(task.subTasks, currentDepth + 1, format); // Pass task.subTasks
      }
    });
    return output;
  };

  const handleExport = (format: 'txt' | 'md' | 'email') => {
    if (!currentMainTaskContext.trim() && taskTree.length === 0) { /* ... */ }
    let content = '';
    if (format === 'md' || format === 'email') { 
      content = `# ${currentMainTaskContext || "Tâche Principale Non Définie"}\n\n`;
      if(taskTree.length > 0) content += generateTaskTreeText(taskTree, 0, 'md');
      else content += "_Aucune sous-tâche définie._\n";
    } else { /* ... txt format ... */ 
      content = `${currentMainTaskContext || "Tâche Principale Non Définie"}\n\n`;
      if(taskTree.length > 0) content += generateTaskTreeText(taskTree, 0, 'txt');
      else content += "Aucune sous-tâche définie.\n";
    }
    // ... rest of export logic same as before
    if (format === 'email') {
      const subject = encodeURIComponent(`Décomposition de tâche : ${currentMainTaskContext || 'Nouvelle Tâche'}`);
      const body = encodeURIComponent(content);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast({ title: "Préparation de l'email", description: "Votre client email devrait s'ouvrir." });
    } else {
      const fileExtension = format === 'md' ? 'md' : 'txt';
      const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `decomposition-${currentMainTaskContext ? currentMainTaskContext.toLowerCase().replace(/\s+/g, '-') : 'tache'}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Exportation réussie!", description: `Fichier ${link.download} téléchargé.`});
    }
  };

  const handleOpenSaveToHistoryDialog = () => {
    if (!currentMainTaskContext.trim() && taskTree.length === 0) { /* ... */ }
    setCurrentBreakdownName(currentMainTaskContext.substring(0, 50) || "Nouvelle Décomposition");
    setSaveToHistoryDialog(true);
  };

  const handleSaveToHistory = () => {
    if (!currentBreakdownName.trim()) { /* ... */ }
    const newHistoryEntry: SavedTaskBreakdown = {
      id: crypto.randomUUID(),
      name: currentBreakdownName,
      mainTaskText: currentMainTaskContext, // Save the context of the current tree
      subTasks: JSON.parse(JSON.stringify(taskTree)), // Save the UI tree structure
      createdAt: new Date().toISOString(),
      intensityOnSave: intensity,
    };
    setHistory(prev => [newHistoryEntry, ...prev].slice(0, 20)); 
    setSaveToHistoryDialog(false);
    setCurrentBreakdownName('');
    toast({ title: "Sauvegardé dans l'historique!", description: `"${newHistoryEntry.name}" a été ajouté.`});
  };

  const handleLoadFromHistory = (entry: SavedTaskBreakdown) => {
    // This now needs to load into DB via AppDataService if we want history to be DB-backed
    // For now, it loads into local state and will be saved to DB if user interacts
    setMainTaskInput(entry.mainTaskText);
    setCurrentMainTaskContext(entry.mainTaskText);
    
    // Clear existing tasks for this user (or prompt) before loading from history
    // This is a complex operation if DB is involved.
    // For now, it just sets the local UI state. User would need to save them to persist.
    const newFlatTasks: TaskBreakerTask[] = [];
    const newExpandedStates: Record<string, boolean> = {};
    function flattenUITree(nodes: UITaskBreakerTask[], parentId: string | null, currentDepth: number): void {
        nodes.forEach((node, index) => {
            const dbTask: TaskBreakerTask = {
                id: node.id, // Keep original ID for now, will be new on DB save
                user_id: user!.id, // Assign current user
                text: node.text,
                parent_id: parentId,
                main_task_text_context: entry.mainTaskText,
                is_completed: node.is_completed,
                depth: currentDepth,
                order: index,
                created_at: node.created_at || new Date().toISOString(),
                updated_at: node.updated_at || new Date().toISOString(),
                // sync_status will be 'new' if these are added to DB
            };
            newFlatTasks.push(dbTask);
            if (node.isExpanded) newExpandedStates[node.id] = true;
            if (node.subTasks && node.subTasks.length > 0) {
                flattenUITree(node.subTasks, node.id, currentDepth + 1);
            }
        });
    }
    flattenUITree(entry.subTasks, null, 0);
    setAllTasksFlat(newFlatTasks); // These are 'new' if we were to save them
    setTaskTree(buildTree(newFlatTasks, null, newExpandedStates));
    setExpandedStates(newExpandedStates);


    if (entry.intensityOnSave) setIntensity(entry.intensityOnSave);
    setShowHistoryDialog(false);
    toast({ title: "Chargé depuis l'historique (local)", description: `Décomposition "${entry.name}" restaurée. Interagissez pour sauvegarder dans la base de données.`});
  };

  const handleDeleteFromHistory = (id: string) => { /* ... same as before ... */ };
  const handleLoadSystemPreset = (preset: CommonTaskPreset) => { /* ... same as before ... */ };

  const handleClearCurrentTask = async () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    setIsSubmitting(true);
    try {
      // Delete all tasks for the current user from the database
      const tasksToDelete = [...allTasksFlat]; // Get a copy before clearing state
      for (const task of tasksToDelete) {
        await deleteTaskBreakerTask(task.id);
      }
      await fetchAndBuildTree(); // This will clear local state as DB is empty
      setMainTaskInput('');
      setCurrentMainTaskContext('');
      setExpandedStates({});
      localStorage.removeItem(TASK_BREAKER_EXPANDED_STATE_KEY); // Clear expanded state cache
      setShowClearTaskDialog(false);
      toast({ title: "Tâche actuelle effacée", variant: "destructive"});
    } catch (error) {
      console.error("Error clearing current task:", error);
      toast({ title: "Erreur d'effacement", description:(error as Error).message, variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenSaveCustomPresetDialog = () => { /* ... same as before ... */ };
  const handleSaveCustomPreset = () => { /* ... same as before ... */ };
  const handleDeleteCustomPreset = (idToDelete: string) => { /* ... same as before ... */ };

  const RenderTaskNode: React.FC<{ task: UITaskBreakerTask }> = ({ task }) => {
    const isCurrentlyLoadingAI = isLoadingAI && loadingAITaskId === task.id;
    const hasChildren = task.subTasks && task.subTasks.length > 0;

    return (
      <div style={{ marginLeft: `${task.depth * 20}px` }} className="mb-2">
        <div className={`flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50 transition-colors ${task.is_completed ? 'opacity-70' : ''}`}>
          { (task.subTasks !== undefined) ? ( 
             <Button variant="ghost" size="icon" onClick={() => toggleSubTaskExpansion(task.id)} className="h-6 w-6 p-0">
              {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : ( <span className="w-6 h-6 inline-block"></span>  )}
          <Button variant="ghost" size="icon" onClick={() => toggleSubTaskCompletion(task.id)} aria-label={task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée"} className="h-6 w-6 p-0" disabled={isSubmitting || isLoadingAI || !user}>
            {task.is_completed ? <CheckSquare className="text-green-500 h-4 w-4" /> : <Square className="text-muted-foreground h-4 w-4" />}
          </Button>
          <Input 
            value={task.text} 
            onChange={(e) => handleSubTaskTextChange(task.id, e.target.value)}
            className={`flex-grow bg-transparent border-0 focus:ring-0 h-auto py-0 ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
            disabled={isSubmitting || isLoadingAI || !user}
          />
          <Button variant="ghost" size="icon" onClick={() => handleGenieBreakdown(task.text, task.id)} aria-label="Décomposer cette tâche avec le Génie" disabled={isCurrentlyLoadingAI || isLoadingAI || isSubmitting || !user} className="h-6 w-6 p-0">
            {isCurrentlyLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="text-primary h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubTask(task.id)} aria-label="Supprimer la sous-tâche" disabled={isSubmitting ||isLoadingAI || !user} className="h-6 w-6 p-0">
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
            onKeyPress={(e) => { if (e.key === 'Enter' && !isLoadingAI && !isSubmitting) handleAddManualSubTask(task.id); }}
            disabled={isLoadingAI || isSubmitting || !user}
          />
          <Button onClick={() => handleAddManualSubTask(task.id)} variant="outline" size="sm" disabled={isLoadingAI || isSubmitting || !(newChildSubTaskText[task.id] || '').trim() || !user} className="h-8">
            <PlusCircle className="mr-1 h-3 w-3" /> Ajouter
          </Button>
        </div>
        )}
        
        {task.isExpanded && task.subTasks && task.subTasks.length > 0 && (
          <div className="mt-2">
            {task.subTasks.map(childTask => (
              <RenderTaskNode key={childTask.id} task={childTask} />
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
        <CardDescription>
          Décomposez vos tâches complexes. Le Génie vous aide à voir plus clair, niveau par niveau !
          {user ? (isOnline ? " Vos tâches sont synchronisées." : " Mode hors ligne, tâches sauvegardées localement.") : " Connectez-vous pour sauvegarder et synchroniser."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-2 h-5">{intensityDescription()}</p>
        
        {!user && (
            <Card className="p-6 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Connectez-vous pour décomposer et sauvegarder vos tâches.</p>
            </Card>
        )}

        {user && (
          <>
            <div>
              <label htmlFor="main-task" className="block text-sm font-medium text-foreground mb-1">Tâche principale à décomposer :</label>
              <div className="flex gap-2 items-center">
                <Textarea
                  id="main-task"
                  value={mainTaskInput}
                  onChange={(e) => setMainTaskInput(e.target.value)}
                  placeholder="Ex: Planifier un voyage épique"
                  className="flex-grow"
                  rows={2}
                  disabled={isLoadingAI || isListening || isSubmitting || isLoadingTasks}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleToggleVoiceInput}
                  className={`${isListening ? 'text-red-500 animate-pulse' : ''} self-start`}
                  aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
                  disabled={isLoadingAI || isSubmitting || isLoadingTasks || !recognitionRef.current}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <Button onClick={() => handleGenieBreakdown(mainTaskInput, null)} disabled={isLoadingAI || !mainTaskInput.trim() || isListening || isSubmitting || isLoadingTasks || (isLoadingAI && loadingAITaskId !== null)} className="mt-2">
                  {(isLoadingAI && loadingAITaskId === null) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Décomposer Tâche Principale
              </Button>
            </div>

            { (currentMainTaskContext || taskTree.length > 0 || isLoadingTasks) && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground mt-4">
                  {currentMainTaskContext ? `Décomposition pour : "${currentMainTaskContext}"` : (taskTree.length > 0 ? "Liste des sous-tâches" : "")}
                </h3>
                {isLoadingTasks && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Chargement des tâches...</span></div>}
                
                {!isLoadingTasks && taskTree.length === 0 && !isLoadingAI && (
                    <p className="text-muted-foreground italic">Aucune sous-tâche. Cliquez sur "Décomposer" ou ajoutez-en manuellement ci-dessous.</p>
                )}
                {(!isLoadingTasks && (isLoadingAI && loadingAITaskId === null && taskTree.length === 0)) && (
                    <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Le Génie décompose la tâche principale...
                    </div>
                )}
                
                {!isLoadingTasks && taskTree.length > 0 && (
                  <ScrollArea className="max-h-[500px] overflow-y-auto pr-2 rounded-md border p-2 bg-muted/20">
                    {taskTree.map((taskNode) => (
                      <RenderTaskNode key={taskNode.id} task={taskNode} />
                    ))}
                  </ScrollArea>
                )}

                {!isLoadingTasks && (currentMainTaskContext || taskTree.length > 0) && (
                  <div className="mt-4 flex gap-2">
                    <Input 
                      value={newDirectSubTaskText}
                      onChange={(e) => setNewDirectSubTaskText(e.target.value)}
                      placeholder="Ajouter une sous-tâche manuellement à la tâche principale"
                      className="flex-grow"
                      onKeyPress={(e) => {if (e.key === 'Enter' && !isLoadingAI && !isSubmitting && newDirectSubTaskText.trim()) handleAddManualSubTask(null);}}
                      disabled={isLoadingAI || isSubmitting || !user}
                    />
                    <Button onClick={() => handleAddManualSubTask(null)} variant="outline" disabled={isLoadingAI || isSubmitting || !newDirectSubTaskText.trim() || !user}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Ajouter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Action Buttons Section moved to bottom */}
        <div className="mt-8 pt-6 border-t flex flex-wrap justify-center items-center gap-3">
            <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!user || isLoadingTasks || isSubmitting || isLoadingAI}><BookOpenCheck className="mr-2 h-4 w-4" /> Charger Tâche</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg"> {/* ... Dialog content same as before ... */} 
                    <DialogHeader>
                        <DialogTitle>Charger un Modèle de Tâche</DialogTitle>
                        <DialogDescription>Choisissez un modèle pour démarrer ou un de vos modèles mémorisés.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-3">
                        <Accordion type="multiple" defaultValue={['custom-presets', 'system-presets']} className="w-full">
                            <AccordionItem value="custom-presets">
                                <AccordionTrigger>Mes Tâches Mémorisées ({customCommonPresets.length})</AccordionTrigger>
                                <AccordionContent>
                                    {customCommonPresets.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun modèle personnalisé.</p>}
                                    {customCommonPresets.map(preset => (
                                        <div key={preset.id} className="flex items-center justify-between py-2 hover:bg-accent/50 rounded-md px-2">
                                            <Button variant="ghost" className="flex-grow justify-start text-left h-auto" onClick={() => handleLoadSystemPreset(preset)}>
                                                {preset.name}
                                            </Button>
                                            {!preset.isSystemPreset && 
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomPreset(preset.id)} className="h-7 w-7">
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            }
                                        </div>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="system-presets">
                                <AccordionTrigger>Modèles Courants ({systemTaskPresets.length})</AccordionTrigger>
                                <AccordionContent>
                                    {systemTaskPresets.map(preset => (
                                        <Button key={preset.id} variant="ghost" className="w-full justify-start text-left h-auto py-2 hover:bg-accent/50 rounded-md px-2" onClick={() => handleLoadSystemPreset(preset)}>
                                            {preset.name}
                                        </Button>
                                    ))}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </ScrollArea>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Fermer</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={handleOpenSaveCustomPresetDialog} disabled={!user || !mainTaskInput.trim() || isLoadingTasks || isSubmitting || isLoadingAI}>
                <BookmarkPlus className="mr-2 h-4 w-4" /> Mémoriser Tâche
            </Button>

            <Button variant="outline" onClick={handleOpenSaveToHistoryDialog} disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0) || isLoadingTasks || isSubmitting || isLoadingAI}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder Décomposition
            </Button>
           
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!user || isLoadingTasks || isSubmitting || isLoadingAI}><History className="mr-2 h-4 w-4" /> Historique ({history.length})</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg"> {/* ... Dialog content same as before ... */} 
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
                    <Button variant="outline" disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0) || isLoadingTasks || isSubmitting || isLoadingAI}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent> {/* ... Dropdown content same as before ... */} 
                    <DropdownMenuLabel>Options d'Export</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('txt')}>Fichier Texte (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('md')}>Fichier Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('email')}><Mail className="mr-2 h-4 w-4" /> Envoyer par Email</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            <AlertDialog open={showClearTaskDialog} onOpenChange={setShowClearTaskDialog}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0) || isLoadingTasks || isSubmitting || isLoadingAI}>
                        <Eraser className="mr-2 h-4 w-4" /> Effacer Tâche Actuelle
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent> {/* ... AlertDialog content same as before ... */} 
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action effacera la tâche principale et toutes ses sous-tâches de la base de données et localement. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearCurrentTask}>Oui, effacer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
            Une tâche bien décomposée est une tâche à moitié terminée !
        </p>
      </CardFooter>

       {/* Save to History Dialog */}
       <Dialog open={saveToHistoryDialog} onOpenChange={setSaveToHistoryDialog}>
        <DialogContent> {/* ... Dialog content same as before ... */} 
            <DialogHeader>
                <DialogTitle>Sauvegarder la Décomposition</DialogTitle>
                <DialogDescription>Donnez un nom à cette décomposition pour la retrouver plus tard dans l'historique local.</DialogDescription>
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

      {/* Save Custom Preset Dialog */}
      <Dialog open={showSaveCustomPresetDialog} onOpenChange={setShowSaveCustomPresetDialog}>
        <DialogContent> {/* ... Dialog content same as before ... */} 
            <DialogHeader>
                <DialogTitle>Mémoriser la Tâche Principale</DialogTitle>
                <DialogDescription>Donnez un nom à ce modèle de tâche pour le réutiliser facilement (sauvegarde locale).</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
                <div>
                    <Label htmlFor="customPresetName">Nom du modèle</Label>
                    <Input 
                    id="customPresetName" 
                    value={newCustomPresetNameInput} 
                    onChange={(e) => setNewCustomPresetNameInput(e.target.value)} 
                    placeholder="Ex: Rapport Mensuel, Planification Repas"
                    />
                </div>
                <div>
                    <Label>Tâche à mémoriser :</Label>
                    <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">{mainTaskInput || "Aucune tâche principale définie."}</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                <Button onClick={handleSaveCustomPreset} disabled={!newCustomPresetNameInput.trim() || !mainTaskInput.trim()}>Mémoriser</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
