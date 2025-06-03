
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { CheckSquare, Square, Trash2, PlusCircle, Wand2, Mic, Loader2, ChevronDown, ChevronRight, Download, Mail, History, ListChecks, Save, BookOpenCheck, Eraser, BookmarkPlus, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { breakdownTask } from '@/ai/flows/breakdown-task-flow';
import type { UITaskBreakerTask, SavedTaskBreakdown, CommonTaskPreset, CreateTaskBreakerTaskDTO, TaskBreakerCustomPreset, CreateTaskBreakerCustomPresetDTO } from '@/types';
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
  AlertDialogTrigger,
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
  deleteTaskBreakerTask,
  getAllTaskBreakerCustomPresets,
  addTaskBreakerCustomPreset,
  deleteTaskBreakerCustomPreset,
} from '@/services/appDataService';


const TASK_BREAKER_HISTORY_KEY = "easyGenieTaskBreakerHistory_v1"; // History remains local for now
const TASK_BREAKER_EXPANDED_STATE_KEY = "easyGenieTaskBreakerExpandedState_v1";


const systemTaskPresets: CommonTaskPreset[] = [
  { id: 'system_evt', name: "Organiser un événement majeur", taskText: "Organiser un événement majeur (ex: mariage, grande conférence)", isSystemPreset: true },
  { id: 'system_report', name: "Rédiger un rapport de recherche", taskText: "Rédiger un rapport de recherche approfondi (collecte, analyse, rédaction, révision)", isSystemPreset: true },
  { id: 'system_skill', name: "Apprendre une nouvelle compétence", taskText: "Apprendre une nouvelle compétence complexe (ex: langage de programmation, instrument)", isSystemPreset: true },
];

const buildTree = (tasks: UITaskBreakerTask[], parentId: string | null = null): UITaskBreakerTask[] => {
  return tasks
    .filter(task => task.parent_id === parentId)
    .sort((a, b) => a.order - b.order)
    .map(task => ({
      ...task,
      subTasks: buildTree(tasks, task.id),
    }));
};

const mapDbTasksToUiTasks = (dbTasks: TaskBreakerTask[], expandedStates: Record<string, boolean>): UITaskBreakerTask[] => {
    return dbTasks.map(dbTask => ({
        ...dbTask,
        isExpanded: expandedStates[dbTask.id] || false,
        subTasks: [] // Will be populated by buildTree
    }));
};


export function TaskBreakerTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [mainTaskInput, setMainTaskInput] = useState<string>(''); 
  const [currentMainTaskContext, setCurrentMainTaskContext] = useState<string>('');

  // Contains all tasks for the current user, flat, including isExpanded from local state
  const [allUiTasksFlat, setAllUiTasksFlat] = useState<UITaskBreakerTask[]>([]);
  const [taskTree, setTaskTree] = useState<UITaskBreakerTask[]>([]); 
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  
  const [newDirectSubTaskText, setNewDirectSubTaskText] = useState<string>('');
  const [newChildSubTaskText, setNewChildSubTaskText] = useState<{ [parentId: string]: string }>({});

  const [isLoadingAI, setIsLoadingAI] = useState<boolean>(false);
  const [loadingAITaskId, setLoadingAITaskId] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Combined loading for tasks and presets
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // History remains local for now
  const [history, setHistory] = useState<SavedTaskBreakdown[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [saveToHistoryDialog, setSaveToHistoryDialog] = useState(false);
  const [currentBreakdownName, setCurrentBreakdownName] = useState('');
  
  const [showPresetsDialog, setShowPresetsDialog] = useState(false);
  const [customCommonPresets, setCustomCommonPresets] = useState<TaskBreakerCustomPreset[]>([]);
  const [showSaveCustomPresetDialog, setShowSaveCustomPresetDialog] = useState(false);
  const [newCustomPresetNameInput, setNewCustomPresetNameInput] = useState('');
  const [showClearTaskDialog, setShowClearTaskDialog] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedExpanded = localStorage.getItem(TASK_BREAKER_EXPANDED_STATE_KEY);
      if (savedExpanded) setExpandedStates(JSON.parse(savedExpanded));

      const savedHistory = localStorage.getItem(TASK_BREAKER_HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASK_BREAKER_EXPANDED_STATE_KEY, JSON.stringify(expandedStates));
    }
  }, [expandedStates]);

  useEffect(() => { // History remains local
    if (typeof window !== 'undefined') {
      localStorage.setItem(TASK_BREAKER_HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);


  const fetchTaskData = useCallback(async () => {
    if (!user) {
      setAllUiTasksFlat([]);
      setTaskTree([]);
      setCustomCommonPresets([]);
      setMainTaskInput('');
      setCurrentMainTaskContext('');
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [dbTasks, dbCustomPresets] = await Promise.all([
        getAllTaskBreakerTasks(),
        getAllTaskBreakerCustomPresets()
      ]);
      
      const uiTasks = mapDbTasksToUiTasks(dbTasks, expandedStates);
      setAllUiTasksFlat(uiTasks);
      setCustomCommonPresets(dbCustomPresets);
      
      const latestContext = uiTasks.length > 0 
        ? (uiTasks.filter(t => !t.parent_id).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]?.main_task_text_context || '')
        : '';
      
      setCurrentMainTaskContext(latestContext);
      const tasksForCurrentContext = latestContext ? uiTasks.filter(t => t.main_task_text_context === latestContext) : [];
      setTaskTree(buildTree(tasksForCurrentContext, null));
      setMainTaskInput(latestContext); 

    } catch (error) {
      console.error("Error fetching TaskBreaker data:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les données de TaskBreaker.", variant: "destructive" });
      setAllUiTasksFlat([]);
      setTaskTree([]);
      setCustomCommonPresets([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast, expandedStates]); 

  useEffect(() => {
    fetchTaskData();
  }, [fetchTaskData, isOnline]); // Re-fetch when user or online status changes

  useEffect(() => { // Rebuild tree when allUiTasksFlat or currentMainTaskContext or expandedStates changes
    const tasksForCurrentContext = currentMainTaskContext 
        ? allUiTasksFlat.filter(t => t.main_task_text_context === currentMainTaskContext) 
        : allUiTasksFlat.filter(t => !t.parent_id); // Fallback to show all root tasks if no context (e.g. after clear)
    setTaskTree(buildTree(tasksForCurrentContext, null));
  }, [allUiTasksFlat, currentMainTaskContext, expandedStates]);


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

  const handleDebouncedTaskTextChange = useCallback(async (taskId: string, newText: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      setIsSubmitting(true);
      try {
        await updateTaskBreakerTask(taskId, { text: newText });
        setAllUiTasksFlat(prevFlat => prevFlat.map(t => t.id === taskId ? {...t, text: newText, updated_at: new Date().toISOString()} : t));
        // Tree will rebuild via useEffect on allUiTasksFlat
        toast({ title: "Tâche sauvegardée", description: "Modification enregistrée."});
      } catch (error) {
        console.error("Error saving task text:", error);
        toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive"});
        await fetchTaskData(); 
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);
  }, [user, toast, fetchTaskData]);

  const handleSubTaskTextChange = (taskId: string, newText: string) => {
    setAllUiTasksFlat(prevFlat => prevFlat.map(node => {
      if (node.id === taskId) return { ...node, text: newText };
      return node;
    }));
    handleDebouncedTaskTextChange(taskId, newText);
  };
  
  const findTaskInUiList = (tasks: UITaskBreakerTask[], taskId: string): UITaskBreakerTask | null => {
    return tasks.find(task => task.id === taskId) || null;
  };

  const handleGenieBreakdown = async (taskTextToBreak: string, parentId: string | null) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    if (!taskTextToBreak.trim()) { toast({ title: "Tâche manquante", variant: "destructive" }); return; }
    
    setIsLoadingAI(true);
    setLoadingAITaskId(parentId);
    
    const mainContextForNewTasks = parentId 
      ? (findTaskInUiList(allUiTasksFlat, parentId)?.main_task_text_context || currentMainTaskContext) 
      : mainTaskInput;
    
    try {
      const result = await breakdownTask({ mainTaskText: taskTextToBreak, intensityLevel: intensity });
      
      const parentTask = parentId ? findTaskInUiList(allUiTasksFlat, parentId) : null;
      const currentDepth = parentTask ? parentTask.depth + 1 : 0;
      
      let orderOffset = 0;
      if (parentId) {
        orderOffset = allUiTasksFlat.filter(t => t.parent_id === parentId).length;
      } else {
        orderOffset = allUiTasksFlat.filter(t => !t.parent_id && t.main_task_text_context === mainContextForNewTasks).length;
      }

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
      
      if(!parentId && mainContextForNewTasks !== currentMainTaskContext) {
        setCurrentMainTaskContext(mainContextForNewTasks); 
      }
      await fetchTaskData(); 
      if (parentId) setExpandedStates(prev => ({...prev, [parentId]: true}));


      if (newTasksFromAI.length > 0) toast({ title: "Tâche décomposée par le Génie!" });
      else toast({ title: "Le Génie a besoin de plus de détails" });

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
      const parentTask = parentId ? findTaskInUiList(allUiTasksFlat, parentId) : null;
      const depth = parentTask ? parentTask.depth + 1 : 0;
      
      let order = 0;
      if (parentId) {
         order = allUiTasksFlat.filter(t => t.parent_id === parentId).length;
      } else {
        order = allUiTasksFlat.filter(t => !t.parent_id && t.main_task_text_context === (currentMainTaskContext || mainTaskInput)).length;
      }
      
      const mainContext = parentId ? (parentTask?.main_task_text_context || currentMainTaskContext) : (currentMainTaskContext || mainTaskInput);
      if (!currentMainTaskContext && !parentId && mainTaskInput) {
         setCurrentMainTaskContext(mainTaskInput);
      }

      const taskDto: CreateTaskBreakerTaskDTO = {
        text,
        parent_id: parentId,
        main_task_text_context: mainContext,
        is_completed: false,
        depth,
        order,
      };
      await addTaskBreakerTask(taskDto);
      await fetchTaskData();
      if (parentId) setExpandedStates(prev => ({...prev, [parentId]: true}));
      
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
    const task = findTaskInUiList(allUiTasksFlat, taskId);
    if (!task) return;
    
    setIsSubmitting(true);
    try {
      await updateTaskBreakerTask(taskId, { is_completed: !task.is_completed });
      setAllUiTasksFlat(prevFlat => prevFlat.map(t => t.id === taskId ? {...t, is_completed: !task.is_completed, updated_at: new Date().toISOString()} : t));
      // Tree will rebuild via useEffect
      toast({ title: task.is_completed ? "Tâche marquée non faite" : "Tâche complétée !" });
    } catch (error) {
      console.error("Error toggling completion:", error);
      toast({ title: "Erreur", description: (error as Error).message, variant: "destructive" });
      await fetchTaskData();
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleSubTaskExpansion = (taskId: string) => {
    setExpandedStates(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    // Tree will rebuild via useEffect
  };

  const handleDeleteSubTask = async (taskId: string) => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      await deleteTaskBreakerTask(taskId); 
      await fetchTaskData(); 
      toast({ title: "Tâche supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Erreur de suppression", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie suggérera des étapes générales.";
    if (intensity <= 4) return "Le Génie fournira une décomposition détaillée.";
    return "Le Génie va décortiquer la tâche au maximum !";
  };

  const generateTaskTreeText = (tasksToExport: UITaskBreakerTask[], format: 'txt' | 'md'): string => {
    let output = '';
    const generateNodeText = (node: UITaskBreakerTask) => { // Removed currentDepth, use node.depth
      const indentChar = format === 'md' ? '  ' : '  '; 
      const prefix = format === 'md' ? (node.is_completed ? '- [x] ' : '- [ ] ') : (node.is_completed ? '[x] ' : '[ ] ');
      const indentation = indentChar.repeat(node.depth * 2); // Use node.depth from data
      output += `${indentation}${prefix}${node.text}\n`;
      if (node.subTasks && node.subTasks.length > 0) { // subTasks is from client-side tree
        node.subTasks.forEach(child => generateNodeText(child));
      }
    };
    tasksToExport.forEach(task => generateNodeText(task));
    return output;
  };

  const handleExport = (format: 'txt' | 'md' | 'email') => {
    if (!currentMainTaskContext.trim() && taskTree.length === 0) {
      toast({title: "Rien à exporter", description: "Veuillez d'abord décomposer une tâche.", variant: "destructive"});
      return;
    }
    let content = '';
    const treeToExport = taskTree.length > 0 ? taskTree : [];

    if (format === 'md' || format === 'email') { 
      content = `# ${currentMainTaskContext || "Tâche Principale Non Définie"}\n\n`;
      if(treeToExport.length > 0) content += generateTaskTreeText(treeToExport, 'md');
      else content += "_Aucune sous-tâche définie._\n";
    } else { 
      content = `${currentMainTaskContext || "Tâche Principale Non Définie"}\n\n`;
      if(treeToExport.length > 0) content += generateTaskTreeText(treeToExport, 'txt');
      else content += "Aucune sous-tâche définie.\n";
    }
    
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
    if (!currentMainTaskContext.trim() && taskTree.length === 0) { 
      toast({ title: "Rien à sauvegarder", description: "Décomposez une tâche avant de la sauvegarder.", variant: "destructive"});
      return;
    }
    setCurrentBreakdownName(currentMainTaskContext.substring(0, 50) || "Nouvelle Décomposition");
    setSaveToHistoryDialog(true);
  };

  const handleSaveToHistory = () => { // HISTORY REMAINS LOCAL
    if (!currentBreakdownName.trim()) { 
      toast({ title: "Nom requis", description: "Veuillez nommer votre décomposition.", variant: "destructive"});
      return;
    }
    const newHistoryEntry: SavedTaskBreakdown = {
      id: crypto.randomUUID(),
      name: currentBreakdownName,
      mainTaskText: currentMainTaskContext, 
      subTasks: JSON.parse(JSON.stringify(taskTree)), // Deep copy taskTree
      createdAt: new Date().toISOString(),
      intensityOnSave: intensity,
    };
    setHistory(prev => [newHistoryEntry, ...prev].slice(0, 20)); 
    setSaveToHistoryDialog(false);
    setCurrentBreakdownName('');
    toast({ title: "Sauvegardé dans l'historique local!", description: `"${newHistoryEntry.name}" a été ajouté.`});
  };

  const handleLoadFromHistory = (entry: SavedTaskBreakdown) => { // HISTORY IS LOCAL
    if (!user) {
      toast({ title: "Non connecté", description: "Connectez-vous pour que le chargement de l'historique crée une nouvelle décomposition synchronisée.", variant: "destructive" });
      // Allow local load even if not logged in, but it won't sync
    }
    setMainTaskInput(entry.mainTaskText);
    setCurrentMainTaskContext(entry.mainTaskText + ` (depuis historique ${new Date().toLocaleTimeString()})`); // Mark as new context
    
    const newExpanded: Record<string, boolean> = {};
    function mapUiTasksForLocalLoad(nodes: UITaskBreakerTask[]): UITaskBreakerTask[] {
        return nodes.map(node => {
            if (node.isExpanded) newExpanded[node.id] = true;
            return {
                ...node, // Spread existing fields from history entry
                subTasks: node.subTasks ? mapUiTasksForLocalLoad(node.subTasks) : []
            };
        });
    }
    const loadedUiTasks = mapUiTasksForLocalLoad(entry.subTasks);
    setAllUiTasksFlat(loadedUiTasks); // For local display only before save
    setTaskTree(buildTree(loadedUiTasks, null)); // Build tree for immediate display
    setExpandedStates(newExpanded);

    if (entry.intensityOnSave) setIntensity(entry.intensityOnSave);
    setShowHistoryDialog(false);
    toast({ title: "Chargé depuis l'historique local", description: `"${entry.name}" est prêt. Vous pouvez le décomposer avec l'IA ou l'ajouter manuellement pour le sauvegarder.`});
    // Note: This doesn't automatically save to DB. User needs to interact (e.g. AI breakdown, add task) to trigger DB save for this new context.
  };

  const handleDeleteFromHistory = (id: string) => {  // HISTORY IS LOCAL
    setHistory(prev => prev.filter(item => item.id !== id));
    toast({title: "Supprimé de l'historique local", variant: "destructive"});
  };
  
  const handleLoadSystemPreset = async (preset: CommonTaskPreset) => {
    if (!user && !preset.isSystemPreset) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour charger et décomposer.", variant: "destructive" });
      return;
    }
    
    const existingContextTasks = allUiTasksFlat.filter(t => t.main_task_text_context === preset.taskText);
    if (existingContextTasks.length > 0) {
        setCurrentMainTaskContext(preset.taskText);
        setMainTaskInput(preset.taskText);
        // Tree will rebuild via useEffect
        toast({ title: "Décomposition existante chargée", description: `Tâche "${preset.name}" chargée.` });
    } else {
        setMainTaskInput(preset.taskText);
        setCurrentMainTaskContext(''); 
        setAllUiTasksFlat([]); // Clear tasks as this is a new context
        setTaskTree([]);
        toast({ title: "Modèle de tâche chargé", description: `"${preset.name}" prêt à être décomposé.` });
    }
    setShowPresetsDialog(false);
  };

  const handleClearCurrentTask = async () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    if (!currentMainTaskContext && mainTaskInput === '' && taskTree.length === 0) {
      toast({ title: "Rien à effacer", description: "Aucune tâche principale ou décomposition active.", variant: "default"});
      setShowClearTaskDialog(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const tasksInContext = allUiTasksFlat.filter(t => t.main_task_text_context === currentMainTaskContext || (!t.parent_id && t.main_task_text_context === mainTaskInput));
      for (const task of tasksInContext) {
        await deleteTaskBreakerTask(task.id);
      }
      
      setMainTaskInput('');
      setCurrentMainTaskContext('');
      setAllUiTasksFlat(prev => prev.filter(t => !tasksInContext.find(del => del.id === t.id)));
      // Tree will update via useEffect
      setNewDirectSubTaskText('');
      setNewChildSubTaskText({});
      
      setShowClearTaskDialog(false);
      toast({ title: "Tâche actuelle effacée", variant: "destructive"});
    } catch (error) {
      console.error("Error clearing current task:", error);
      toast({ title: "Erreur d'effacement", description:(error as Error).message, variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenSaveCustomPresetDialog = () => { 
    if (!user) { toast({ title: "Non connecté", description: "Connectez-vous pour mémoriser des modèles.", variant: "destructive"}); return; }
    if (!mainTaskInput.trim()) {
      toast({title: "Tâche principale vide", description: "Écrivez d'abord une tâche principale à mémoriser.", variant: "destructive"});
      return;
    }
    setNewCustomPresetNameInput(mainTaskInput.substring(0, 50));
    setShowSaveCustomPresetDialog(true);
  };

  const handleSaveCustomPreset = async () => { 
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    if (!newCustomPresetNameInput.trim()) {
       toast({title: "Nom de modèle requis", variant: "destructive"});
       return;
    }
    setIsSubmitting(true);
    try {
        const dto: CreateTaskBreakerCustomPresetDTO = {
            name: newCustomPresetNameInput,
            task_text: mainTaskInput,
        };
        const newPreset = await addTaskBreakerCustomPreset(dto);
        setCustomCommonPresets(prev => [...prev, newPreset]);
        setShowSaveCustomPresetDialog(false);
        setNewCustomPresetNameInput('');
        toast({title: "Modèle de tâche mémorisé!", description: `"${newPreset.name}" ajouté.`});
    } catch (error) {
        console.error("Error saving custom preset:", error);
        toast({title: "Erreur de mémorisation", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteCustomPreset = async (idToDelete: string) => { 
    if (!user) { toast({ title: "Non connecté", variant: "destructive"}); return; }
    setIsSubmitting(true);
    try {
        await deleteTaskBreakerCustomPreset(idToDelete);
        setCustomCommonPresets(prev => prev.filter(p => p.id !== idToDelete));
        toast({title: "Modèle personnalisé supprimé", variant: "destructive"});
    } catch (error) {
        console.error("Error deleting custom preset:", error);
        toast({title: "Erreur de suppression", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const combinedPresetsForDialog = (): CommonTaskPreset[] => {
    const customMapped: CommonTaskPreset[] = customCommonPresets.map(cp => ({
      id: cp.id,
      name: cp.name,
      taskText: cp.task_text,
      isSystemPreset: false,
    }));
    return [...customMapped, ...systemTaskPresets];
  };

  const RenderTaskNode: React.FC<{ task: UITaskBreakerTask }> = ({ task }) => {
    const isCurrentlyLoadingAI = isLoadingAI && loadingAITaskId === task.id;

    return (
      <div style={{ marginLeft: `${task.depth * 15}px` }} className="mb-1.5">
        <div className={`flex items-center gap-1 p-1.5 border rounded-md bg-background hover:bg-muted/50 transition-colors ${task.is_completed ? 'opacity-60' : ''}`}>
          { (allUiTasksFlat.some(t => t.parent_id === task.id) || task.isExpanded ) ? ( 
             <Button variant="ghost" size="icon" onClick={() => toggleSubTaskExpansion(task.id)} className="h-6 w-6 p-0 shrink-0">
              {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : ( <span className="w-6 h-6 inline-block shrink-0"></span>  )}
          <Button variant="ghost" size="icon" onClick={() => toggleSubTaskCompletion(task.id)} aria-label={task.is_completed ? "Marquer comme non terminée" : "Marquer comme terminée"} className="h-6 w-6 p-0 shrink-0" disabled={isSubmitting || isLoadingAI || !user}>
            {task.is_completed ? <CheckSquare className="text-green-500 h-4 w-4" /> : <Square className="text-muted-foreground h-4 w-4" />}
          </Button>
          <Input 
            value={task.text} 
            onChange={(e) => handleSubTaskTextChange(task.id, e.target.value)}
            className={`flex-grow bg-transparent border-0 focus:ring-0 h-auto py-0 text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}
            disabled={isSubmitting || isLoadingAI || !user}
          />
          <Button variant="ghost" size="icon" onClick={() => handleGenieBreakdown(task.text, task.id)} aria-label="Décomposer cette tâche avec le Génie" disabled={isCurrentlyLoadingAI || isLoadingAI || isSubmitting || !user} className="h-6 w-6 p-0 shrink-0">
            {isCurrentlyLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="text-primary h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteSubTask(task.id)} aria-label="Supprimer la sous-tâche" disabled={isSubmitting ||isLoadingAI || !user} className="h-6 w-6 p-0 shrink-0">
            <Trash2 className="text-destructive w-4 h-4" />
          </Button>
        </div>

        {task.isExpanded && (
        <div style={{ marginLeft: `20px` }} className="mt-1 pl-1 flex gap-2 items-center">
          <Input
            value={newChildSubTaskText[task.id] || ''}
            onChange={(e) => setNewChildSubTaskText(prev => ({ ...prev, [task.id]: e.target.value }))}
            placeholder="Ajouter une sous-tâche ici..."
            className="flex-grow h-8 text-xs"
            onKeyPress={(e) => { if (e.key === 'Enter' && !isLoadingAI && !isSubmitting) handleAddManualSubTask(task.id); }}
            disabled={isLoadingAI || isSubmitting || !user}
          />
          <Button onClick={() => handleAddManualSubTask(task.id)} variant="outline" size="sm" disabled={isLoadingAI || isSubmitting || !(newChildSubTaskText[task.id] || '').trim() || !user} className="h-8 text-xs">
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
          {user ? (isOnline ? " Vos tâches et modèles sont synchronisés." : " Mode hors ligne, données sauvegardées localement.") : " Connectez-vous pour sauvegarder et synchroniser."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-2 h-5">{intensityDescription()}</p>
        
        {!user && (
            <Card className="p-6 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p className="font-semibold">Connectez-vous pour décomposer et sauvegarder vos tâches et modèles.</p>
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
                  disabled={isLoadingAI || isListening || isSubmitting || isLoadingData}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleToggleVoiceInput}
                  className={`${isListening ? 'text-red-500 animate-pulse' : ''} self-start`}
                  aria-label={isListening ? "Arrêter l'écoute" : "Dicter la tâche principale"}
                  disabled={isLoadingAI || isSubmitting || isLoadingData || !recognitionRef.current}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <Button onClick={() => handleGenieBreakdown(mainTaskInput, null)} disabled={isLoadingAI || !mainTaskInput.trim() || isListening || isSubmitting || isLoadingData || (isLoadingAI && loadingAITaskId !== null)} className="mt-2">
                  {(isLoadingAI && loadingAITaskId === null) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Décomposer Tâche Principale
              </Button>
            </div>

            { (currentMainTaskContext || taskTree.length > 0 || isLoadingData) && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground mt-4">
                  {currentMainTaskContext ? `Décomposition pour : "${currentMainTaskContext}"` : (taskTree.length > 0 ? "Liste des sous-tâches" : "")}
                </h3>
                {isLoadingData && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /> <span className="ml-2">Chargement des tâches...</span></div>}
                
                {!isLoadingData && taskTree.length === 0 && !isLoadingAI && (
                    <p className="text-muted-foreground italic">Aucune sous-tâche. Cliquez sur "Décomposer" ou ajoutez-en manuellement ci-dessous.</p>
                )}
                {(!isLoadingData && (isLoadingAI && loadingAITaskId === null && taskTree.length === 0)) && (
                    <div className="flex items-center justify-center text-muted-foreground">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin"/> Le Génie décompose la tâche principale...
                    </div>
                )}
                
                {!isLoadingData && taskTree.length > 0 && (
                  <ScrollArea className="max-h-[500px] overflow-y-auto pr-2 rounded-md border p-2 bg-muted/20">
                    {taskTree.map((taskNode) => (
                      <RenderTaskNode key={taskNode.id} task={taskNode} />
                    ))}
                  </ScrollArea>
                )}

                {!isLoadingData && (currentMainTaskContext || taskTree.length > 0) && (
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

        <div className="mt-8 pt-6 border-t flex flex-wrap justify-center items-center gap-3">
            <Dialog open={showPresetsDialog} onOpenChange={setShowPresetsDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!user || isLoadingData || isSubmitting || isLoadingAI}><BookOpenCheck className="mr-2 h-4 w-4" /> Charger Tâche</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg"> 
                    <DialogHeader>
                        <DialogTitle>Charger un Modèle de Tâche</DialogTitle>
                        <DialogDescription>Choisissez un modèle pour démarrer ou un de vos modèles mémorisés.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] pr-3">
                        <Accordion type="multiple" defaultValue={['custom-presets', 'system-presets']} className="w-full">
                            <AccordionItem value="custom-presets">
                                <AccordionTrigger>Mes Tâches Mémorisées ({customCommonPresets.length})</AccordionTrigger>
                                <AccordionContent>
                                    {isLoadingData && <Loader2 className="h-5 w-5 animate-spin mx-auto my-2"/>}
                                    {!isLoadingData && customCommonPresets.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun modèle personnalisé.</p>}
                                    {!isLoadingData && customCommonPresets.map(preset => (
                                        <div key={preset.id} className="flex items-center justify-between py-2 hover:bg-accent/50 rounded-md px-2">
                                            <Button variant="ghost" className="flex-grow justify-start text-left h-auto" onClick={() => handleLoadSystemPreset({id: preset.id, name: preset.name, taskText: preset.task_text, isSystemPreset: false })}>
                                                {preset.name}
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomPreset(preset.id)} className="h-7 w-7" disabled={isSubmitting}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                            </Button>
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
            
            <Button variant="outline" onClick={handleOpenSaveCustomPresetDialog} disabled={!user || !mainTaskInput.trim() || isLoadingData || isSubmitting || isLoadingAI}>
                <BookmarkPlus className="mr-2 h-4 w-4" /> Mémoriser Tâche
            </Button>

            <Button variant="outline" onClick={handleOpenSaveToHistoryDialog} disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0) || isLoadingData || isSubmitting || isLoadingAI}>
                <Save className="mr-2 h-4 w-4" /> Sauvegarder Décomposition (Local)
            </Button>
           
            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoadingData || isSubmitting || isLoadingAI}><History className="mr-2 h-4 w-4" /> Historique Local ({history.length})</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">  
                    <DialogHeader><DialogTitle>Historique Local des Décompositions</DialogTitle></DialogHeader>
                    <ScrollArea className="h-[400px] pr-3">
                        {history.length === 0 && <p className="text-muted-foreground text-center py-4">Votre historique local est vide.</p>}
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
                    <Button variant="outline" disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0) || isLoadingData || isSubmitting || isLoadingAI}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>  
                    <DropdownMenuLabel>Options d'Export</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleExport('txt')}>Fichier Texte (.txt)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('md')}>Fichier Markdown (.md)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('email')}><Mail className="mr-2 h-4 w-4" /> Envoyer par Email</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            
            <AlertDialog open={showClearTaskDialog} onOpenChange={setShowClearTaskDialog}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!user || (!currentMainTaskContext.trim() && taskTree.length === 0 && mainTaskInput === '') || isLoadingData || isSubmitting || isLoadingAI}>
                        <Eraser className="mr-2 h-4 w-4" /> Effacer Tâche Actuelle
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent> 
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

       <Dialog open={saveToHistoryDialog} onOpenChange={setSaveToHistoryDialog}>
        <DialogContent> 
            <DialogHeader>
                <DialogTitle>Sauvegarder la Décomposition (Local)</DialogTitle>
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

      <Dialog open={showSaveCustomPresetDialog} onOpenChange={setShowSaveCustomPresetDialog}>
        <DialogContent> 
            <DialogHeader>
                <DialogTitle>Mémoriser la Tâche Principale</DialogTitle>
                <DialogDescription>Donnez un nom à ce modèle de tâche pour le réutiliser facilement.</DialogDescription>
            </DialogHeader>
            <div className="py-2 space-y-2">
                <div>
                    <Label htmlFor="customPresetName">Nom du modèle</Label>
                    <Input 
                    id="customPresetName" 
                    value={newCustomPresetNameInput} 
                    onChange={(e) => setNewCustomPresetNameInput(e.target.value)} 
                    placeholder="Ex: Rapport Mensuel, Planification Repas"
                    disabled={isSubmitting}
                    />
                </div>
                <div>
                    <Label>Tâche à mémoriser :</Label>
                    <p className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">{mainTaskInput || "Aucune tâche principale définie."}</p>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Annuler</Button></DialogClose>
                <Button onClick={handleSaveCustomPreset} disabled={isSubmitting || !newCustomPresetNameInput.trim() || !mainTaskInput.trim()}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null} Mémoriser
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
