
"use client";

import { useState, type FormEvent, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Trash2, PlusCircle, Edit, CalendarIcon, Clock, ChevronDown, ChevronUp, Info, WandSparkles, Save, Loader2, SparklesIcon, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PriorityTask, CreatePriorityTaskDTO, Frequency, PriorityGridPresetClient, CreatePriorityGridCustomPresetDTO, PriorityGridCustomPreset } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllPriorityTasks,
  addPriorityTask,
  updatePriorityTask,
  deletePriorityTask,
  clearAllPriorityTasks,
  clearCompletedPriorityTasks,
  getAllPriorityGridCustomPresets,
  addPriorityGridCustomPreset,
  deletePriorityGridCustomPreset,
} from '@/services/appDataService';


const frequencies: { value: Frequency, label: string, description: string }[] = [
  { value: "once", label: "Une fois", description: "Tâche unique, non récurrente." },
  { value: "daily", label: "Journalier", description: "Se répète tous les jours." },
  { value: "weekly", label: "Hebdomadaire", description: "Se répète chaque semaine." },
  { value: "bi-weekly", label: "Bi-mensuel", description: "Se répète toutes les deux semaines." },
  { value: "monthly", label: "Mensuel", description: "Se répète chaque mois." },
  { value: "yearly", label: "Annuel", description: "Se répète chaque année." },
];

type QuadrantKey = PriorityTask['quadrant'];


interface PresetCategory {
  id: string;
  name: string;
  presets: PriorityGridPresetClient[];
  isCustom?: boolean;
}

const hardcodedPresets: PresetCategory[] = [
  {
    id: 'morning_routine',
    name: '🚀 Routine Matinale Énergisante',
    presets: [
      { id: 'm1', name: 'Planifier la journée', text: "Définir les 3 priorités du jour", quadrant: 'urgentImportant', frequency: 'daily', specificTime: '08:00' },
      { id: 'm2', name: 'Méditation rapide', text: "5-10 min de méditation/pleine conscience", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '07:30' },
      { id: 'm3', name: 'Emails urgents (matin)', text: "Traiter les emails critiques uniquement", quadrant: 'urgentNotImportant', specificTime: '08:30', frequency: 'daily' },
      { id: 'm4', name: 'Petit-déjeuner sain', text: "Préparer et prendre un petit-déjeuner équilibré", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '07:00'},
    ],
  },
  {
    id: 'work_focus',
    name: '💼 Focus Projets Importants',
    presets: [
      { id: 'w1', name: 'Bloc de travail profond 1', text: "Avancer sur [Nom du Projet Clé] - Session 1", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '09:30'},
      { id: 'w2', name: 'Préparer Réunion X', text: "Préparer l\'ordre du jour et documents pour la réunion [Nom]", quadrant: 'urgentImportant', specificDate: 'today' },
      { id: 'w3', name: 'Relecture document Y', text: "Relire et finaliser le document [Nom du Document]", quadrant: 'notUrgentImportant' },
      { id: 'w4', name: 'Répondre aux messages importants', text: "Traiter les messages Slack/Teams prioritaires", quadrant: 'urgentNotImportant', frequency: 'daily', specificTime: '14:00'},
    ],
  },
  {
    id: 'personal_wellbeing',
    name: '🧘 Bien-être & Perso',
    presets: [
      { id: 'p1', name: 'Séance de sport', text: "Activité physique (course, gym, yoga)", quadrant: 'notUrgentImportant', frequency: 'weekly' },
      { id: 'p2', name: 'Appeler un proche', text: "Prendre des nouvelles de [Nom de la personne]", quadrant: 'notUrgentImportant', frequency: 'weekly' },
      { id: 'p3', name: 'Temps créatif / Hobby', text: "Dédier du temps à [Hobby : Peinture, écriture, musique...]", quadrant: 'notUrgentImportant', frequency: 'weekly'},
      { id: 'p4', name: 'Payer facture Z', text: "Régler la facture [Nom de la facture]", quadrant: 'urgentImportant'},
      { id: 'p5', name: 'Lecture', text: "Lire 30 minutes", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '21:00' },
    ],
  },
  {
    id: 'evening_routine',
    name: '🌙 Routine du Soir Apaisante',
    presets: [
      { id: 'e1', name: 'Préparer affaires pour demain', text: "Préparer vêtements, sac, déjeuner...", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '20:00' },
      { id: 'e2', name: 'Planifier le lendemain', text: "Revoir l'agenda et les tâches du lendemain", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '20:30' },
      { id: 'e3', name: 'Pas d\'écrans 1h avant coucher', text: "Éviter téléphone, TV, ordinateur", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '21:30' },
      { id: 'e4', name: 'Rituel détente', text: "Tisane, lecture légère, musique douce", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '22:00' },
    ],
  },
  {
    id: 'household_chores',
    name: '🏠 Tâches Ménagères',
    presets: [
        { id: 'hc1', name: 'Faire la vaisselle', text: "Nettoyer la vaisselle après le repas", quadrant: 'urgentNotImportant', frequency: 'daily' },
        { id: 'hc2', name: 'Sortir les poubelles', text: "Sortir les poubelles (selon jour de collecte)", quadrant: 'urgentImportant', frequency: 'weekly' },
        { id: 'hc3', name: 'Faire une lessive', text: "Lancer une machine de linge", quadrant: 'notUrgentImportant', frequency: 'weekly' },
        { id: 'hc4', name: 'Nettoyer la salle de bain', text: "Nettoyage hebdomadaire de la salle de bain", quadrant: 'notUrgentImportant', frequency: 'weekly' },
        { id: 'hc5', name: 'Faire les courses', text: "Acheter les provisions pour la semaine", quadrant: 'notUrgentImportant', frequency: 'weekly' },
    ],
  },
];


export function PriorityGridTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { toast } = useToast();
  const { user, isOnline } = useAuth();

  const [newTaskText, setNewTaskText] = useState<string>('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('urgentImportant');
  const [newFrequency, setNewFrequency] = useState<Frequency | undefined>(undefined);
  const [newSpecificDate, setNewSpecificDate] = useState<Date | undefined>(undefined);
  const [newSpecificTime, setNewSpecificTime] = useState<string>('');
  const [showNewTaskAdvanced, setShowNewTaskAdvanced] = useState(false);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);

  const [customPresets, setCustomPresets] = useState<PriorityGridCustomPreset[]>([]);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);
  const [isSavePresetDialogOpen, setIsSavePresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState<string>('');

  const [editingTask, setEditingTask] = useState<PriorityTask | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editQuadrant, setEditQuadrant] = useState<QuadrantKey>('urgentImportant');
  const [editFrequency, setEditFrequency] = useState<Frequency | undefined>(undefined);
  const [editSpecificDate, setEditSpecificDate] = useState<Date | undefined>(undefined);
  const [editSpecificTime, setEditSpecificTime] = useState<string>('');
  const [showEditTaskAdvanced, setShowEditTaskAdvanced] = useState(false);


  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }
    setIsLoadingTasks(true);
    try {
      const fetchedTasks = await getAllPriorityTasks();
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Error fetching priority tasks:", error);
      toast({
        title: "Erreur de chargement des tâches",
        description: (error as Error).message || "Impossible de récupérer les tâches.",
        variant: "destructive",
      });
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user, toast]);

  const fetchCustomPresets = useCallback(async () => {
    if (!user) {
      setCustomPresets([]);
      return;
    }
    setIsLoadingPresets(true);
    try {
      const fetchedPresets = await getAllPriorityGridCustomPresets();
      setCustomPresets(fetchedPresets);
    } catch (error) {
      console.error("Error fetching custom presets:", error);
      toast({ title: "Erreur de chargement des presets personnalisés", description: (error as Error).message, variant: "destructive" });
      setCustomPresets([]);
    } finally {
      setIsLoadingPresets(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTasks();
    fetchCustomPresets();
  }, [fetchTasks, fetchCustomPresets, isOnline]); 

  const resetNewTaskForm = () => {
    setNewTaskText('');
    setSelectedQuadrant('urgentImportant');
    setNewFrequency(undefined);
    setNewSpecificDate(undefined);
    setNewSpecificTime('');
    setShowNewTaskAdvanced(false);
  };

  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ title: "Non connecté", description: "Veuillez vous connecter pour ajouter des tâches.", variant: "destructive"});
        return;
    }
    if (!newTaskText.trim()) {
      toast({ title: "Texte de tâche manquant", description: "Veuillez entrer une description pour votre tâche.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      const taskDto: CreatePriorityTaskDTO = {
        text: newTaskText,
        quadrant: selectedQuadrant,
        frequency: newFrequency === "once" ? undefined : newFrequency,
        specificDate: newSpecificDate ? newSpecificDate.toISOString().split('T')[0] : undefined,
        specificTime: newSpecificTime || undefined,
        isCompleted: false,
      };
      await addPriorityTask(taskDto);
      await fetchTasks(); 
      toast({ title: "Tâche ajoutée!", description: `"${newTaskText}" a été ajoutée.` });
      resetNewTaskForm();
    } catch (error) {
      console.error("Error adding task:", error);
      toast({ title: "Erreur d'ajout", description: (error as Error).message || "Impossible d'ajouter la tâche.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!user) {
        toast({ title: "Non connecté", description: "Veuillez vous connecter pour supprimer des tâches.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
      await deletePriorityTask(id);
      await fetchTasks(); 
      toast({ title: "Tâche supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({ title: "Erreur de suppression", description: (error as Error).message || "Impossible de supprimer la tâche.", variant: "destructive"});
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (task: PriorityTask) => {
    setEditingTask(task);
    setEditText(task.text);
    setEditQuadrant(task.quadrant);
    setEditFrequency(task.frequency || undefined);
    setEditSpecificDate(task.specificDate ? new Date(`${task.specificDate}T00:00:00`) : undefined);
    setEditSpecificTime(task.specificTime || '');
    setShowEditTaskAdvanced(!!(task.frequency || task.specificDate || task.specificTime));
  };

  const handleUpdateTask = async () => {
    if (!user || !editingTask || !editText.trim()) {
      toast({ title: "Informations manquantes", description: "Impossible de mettre à jour la tâche.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      const taskUpdateDto: Partial<CreatePriorityTaskDTO> = {
        text: editText,
        quadrant: editQuadrant,
        frequency: editFrequency === "once" ? undefined : editFrequency,
        specificDate: editSpecificDate ? editSpecificDate.toISOString().split('T')[0] : undefined,
        specificTime: editSpecificTime || undefined,
        isCompleted: editingTask.isCompleted,
      };
      await updatePriorityTask(editingTask.id, taskUpdateDto);
      await fetchTasks(); 
      toast({ title: "Tâche mise à jour!" });
      setEditingTask(null);
    } catch (error) {
      console.error("Error updating task:", error);
      toast({ title: "Erreur de mise à jour", description: (error as Error).message || "Impossible de mettre à jour la tâche.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: PriorityTask) => {
    if (!user) {
        toast({ title: "Non connecté", description: "Veuillez vous connecter pour modifier des tâches.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
      await updatePriorityTask(task.id, { isCompleted: !task.isCompleted });
      await fetchTasks(); 
      toast({ title: task.isCompleted ? "Tâche marquée non faite" : "Tâche complétée !" });
    } catch (error) {
      console.error("Error toggling task completion:", error);
      toast({ title: "Erreur", description: (error as Error).message || "Impossible de modifier l'état de la tâche.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const loadPresetIntoForm = (preset: PriorityGridPresetClient) => {
    setNewTaskText(preset.text);
    setSelectedQuadrant(preset.quadrant);
    setNewFrequency(preset.frequency === "once" ? undefined : preset.frequency);

    if (preset.specificDate === "today") {
      setNewSpecificDate(new Date());
    } else if (preset.specificDate === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNewSpecificDate(tomorrow);
    } else if (preset.specificDate) {
       try {
        const [year, month, day] = preset.specificDate.split('-').map(Number);
        setNewSpecificDate(new Date(year, month - 1, day));
       } catch (e) {
        setNewSpecificDate(undefined);
       }
    } else {
      setNewSpecificDate(undefined);
    }

    setNewSpecificTime(preset.specificTime || '');
    setShowNewTaskAdvanced(!!(preset.frequency || preset.specificDate || preset.specificTime));
    setIsPresetDialogOpen(false);
    toast({
      title: "Preset chargé !",
      description: `Le preset "${preset.name}" a été chargé dans le formulaire. Ajustez-le si besoin.`,
    });
  };

  const handleOpenSavePresetDialog = () => {
    if (!user) {
        toast({ title: "Non connecté", description: "Veuillez vous connecter pour sauvegarder des presets.", variant: "destructive"});
        return;
    }
    if (!newTaskText.trim()) {
      toast({ title: "Description de tâche vide", description: "Veuillez d'abord décrire la tâche que vous souhaitez sauvegarder comme preset.", variant: "destructive" });
      return;
    }
    setNewPresetName(newTaskText.substring(0, 50));
    setIsSavePresetDialogOpen(true);
  };

  const handleSaveCustomPreset = async () => {
    if (!user) {
        toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive"});
        return;
    }
    if (!newPresetName.trim()) {
      toast({ title: "Nom de preset manquant", description: "Veuillez donner un nom à votre preset.", variant: "destructive"});
      return;
    }
    if (!newTaskText.trim()) {
        toast({ title: "Description de tâche vide", description: "La tâche à sauvegarder est vide.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    try {
      const presetDto: CreatePriorityGridCustomPresetDTO = {
        name: newPresetName,
        task_text: newTaskText,
        quadrant: selectedQuadrant,
        frequency: newFrequency === "once" ? undefined : newFrequency,
        specific_date: newSpecificDate ? newSpecificDate.toISOString().split('T')[0] : undefined,
        specific_time: newSpecificTime || undefined,
      };
      await addPriorityGridCustomPreset(presetDto);
      await fetchCustomPresets(); 
      toast({ title: "Preset Personnalisé Sauvegardé!", description: `"${newPresetName}" a été ajouté à vos presets.` });
      setNewPresetName('');
      setIsSavePresetDialogOpen(false);
    } catch (error) {
      console.error("Error saving custom preset:", error);
      toast({ title: "Erreur de sauvegarde du preset", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomPreset = async (presetId: string) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deletePriorityGridCustomPreset(presetId);
      await fetchCustomPresets(); 
      toast({ title: "Preset personnalisé supprimé", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting custom preset:", error);
      toast({ title: "Erreur de suppression du preset", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPresetCategories = (): PresetCategory[] => {
    const categories: PresetCategory[] = [...hardcodedPresets.map(c => ({...c, presets: c.presets.map(p => ({...p, isCustom: false}))}))];
    if (customPresets.length > 0) {
      categories.unshift({
        id: 'custom_presets',
        name: '🌟 Mes Presets Personnalisés',
        presets: customPresets.map(cp => ({
            id: cp.id,
            name: cp.name,
            text: cp.task_text,
            quadrant: cp.quadrant,
            frequency: cp.frequency,
            specificDate: cp.specific_date,
            specificTime: cp.specific_time,
            isCustom: true,
        })),
        isCustom: true,
      });
    }
    return categories;
  };

  const handleClearAllTasks = async () => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive"});
      return;
    }
    setIsBulkDeleting(true);
    try {
      await clearAllPriorityTasks();
      await fetchTasks(); 
      toast({ title: "Toutes les tâches ont été effacées !" });
    } catch (error) {
      console.error("Error clearing all tasks:", error);
      toast({ title: "Erreur", description: (error as Error).message || "Impossible d'effacer toutes les tâches.", variant: "destructive"});
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearCompletedTasks = async () => {
     if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter.", variant: "destructive"});
      return;
    }
    setIsBulkDeleting(true);
    try {
      await clearCompletedPriorityTasks();
      await fetchTasks(); 
      toast({ title: "Tâches complétées effacées !" });
    } catch (error) {
      console.error("Error clearing completed tasks:", error);
      toast({ title: "Erreur", description: (error as Error).message || "Impossible d'effacer les tâches complétées.", variant: "destructive"});
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const dateToFormat = dateString.includes('T') ? new Date(dateString) : new Date(`${dateString}T00:00:00`);
      return format(dateToFormat, "dd/MM/yyyy", { locale: fr });
    } catch (e) {
      console.error("Error formatting date:", e, "Input was:", dateString);
      return "Date invalide";
    }
  };

  const getFrequencyLabel = (freqValue?: Frequency) => {
    if (!freqValue) return '';
    return frequencies.find(f => f.value === freqValue)?.label || '';
  };

  const Quadrant = ({ title, quadrantKey, bgColor }: { title: string; quadrantKey: QuadrantKey; bgColor: string }) => (
    <div className={`p-4 rounded-lg shadow-inner min-h-[200px] ${bgColor} flex flex-col`}>
      <h3 className="font-semibold text-lg mb-3 text-foreground">{title}</h3>
      <div className="space-y-2 flex-grow">
        {isLoadingTasks && <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
        {!isLoadingTasks && user && tasks.filter(task => task.quadrant === quadrantKey).map(task => (
          <div key={task.id} className={`bg-background/80 p-3 rounded-md shadow-sm hover:shadow-md transition-shadow ${task.isCompleted ? 'opacity-60' : ''}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center flex-grow mr-2">
                 <Checkbox
                    id={`task-cb-${task.id}`}
                    checked={task.isCompleted}
                    onCheckedChange={() => handleToggleComplete(task)}
                    className="mr-2 flex-shrink-0"
                    disabled={isSubmitting || !user || isBulkDeleting}
                    aria-label={`Marquer la tâche ${task.text} comme ${task.isCompleted ? 'non complétée' : 'complétée'}`}
                  />
                <Label htmlFor={`task-cb-${task.id}`} className={`text-sm text-foreground break-words cursor-pointer ${task.isCompleted ? 'line-through' : ''}`}>{task.text}</Label>
              </div>
              <div className="flex-shrink-0 flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)} aria-label="Modifier la tâche" className="h-7 w-7" disabled={isSubmitting || !user || isBulkDeleting}>
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Modifier la tâche</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Supprimer la tâche" className="h-7 w-7" disabled={isSubmitting || !user || isBulkDeleting}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer la tâche ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer la tâche "{task.text}" ? Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTask(task.id)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </TooltipTrigger>
                    <TooltipContent><p>Supprimer la tâche</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {(task.frequency || task.specificDate || task.specificTime) && (
              <div className="mt-1.5 pt-1.5 border-t border-muted/50 text-xs text-muted-foreground space-y-0.5">
                {task.frequency && <p><span className="font-medium">Fréq.:</span> {getFrequencyLabel(task.frequency)}</p>}
                {task.specificDate && <p><CalendarIcon className="inline h-3 w-3 mr-1"/> {formatDateDisplay(task.specificDate)}</p>}
                {task.specificTime && <p><Clock className="inline h-3 w-3 mr-1"/> {task.specificTime}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {!isLoadingTasks && user && tasks.filter(task => task.quadrant === quadrantKey).length === 0 && (
        <p className="text-sm text-muted-foreground italic mt-auto">Aucune tâche ici.</p>
      )}
       {!isLoadingTasks && !user && (
        <p className="text-sm text-muted-foreground italic mt-auto">Connectez-vous pour voir et gérer vos tâches.</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="w-full max-w-5xl mx-auto shadow-xl">
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="flex-grow">
            <CardTitle className="text-3xl font-bold text-primary mb-1">Grille des Priorités Magique</CardTitle>
            <CardDescription>Organisez vos tâches avec la matrice d'Eisenhower. {user ? (isOnline ? "Mode En Ligne." : "Mode Hors Ligne.") : "Non connecté."}</CardDescription>
          </div>
          <div className="w-full md:w-auto md:min-w-[300px] md:max-w-xs lg:max-w-sm shrink-0">
            <IntensitySelector value={intensity} onChange={setIntensity} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          <Card className="p-4 sm:p-6 bg-card shadow-md">
            <CardTitle className="text-xl mb-1 text-primary">Ajouter une Tâche</CardTitle>
            {!user && <CardDescription className="mb-4 text-destructive">Veuillez vous connecter pour ajouter et gérer vos tâches.</CardDescription>}
            {user && <CardDescription className="mb-4">Remplissez les détails de votre nouvelle tâche. Les champs marqués d'un * sont requis.</CardDescription>}
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="new-task-text">Description de la tâche <span className="text-destructive">*</span></Label>
                <Input
                  id="new-task-text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Ex: Répondre aux e-mails importants"
                  className="w-full mt-1 transition-all duration-200 ease-in-out hover:shadow-lg hover:animate-subtle-shake transform hover:scale-[1.01]"
                  required
                  disabled={!user || isSubmitting || isBulkDeleting}
                />
              </div>

              <div>
                  <Label htmlFor="new-task-quadrant" className="flex items-center">
                    Quadrant <span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0" type="button"><Info className="h-3 w-3"/></Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p><strong>Urgent & Important:</strong> À faire immédiatement.</p>
                        <p><strong>Important, Pas Urgent:</strong> À planifier.</p>
                        <p><strong>Urgent, Pas Important:</strong> À déléguer si possible.</p>
                        <p><strong>Ni Urgent, Ni Important:</strong> À éliminer.</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select value={selectedQuadrant} onValueChange={(value) => setSelectedQuadrant(value as QuadrantKey)} required disabled={!user || isSubmitting || isBulkDeleting}>
                      <SelectTrigger id="new-task-quadrant" className="w-full mt-1">
                          <SelectValue placeholder="Choisir quadrant" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="urgentImportant">🔴 Urgent & Important</SelectItem>
                          <SelectItem value="notUrgentImportant">🟡 Important, Pas Urgent</SelectItem>
                          <SelectItem value="urgentNotImportant">🔵 Urgent, Pas Important</SelectItem>
                          <SelectItem value="notUrgentNotImportant">⚪ Ni Urgent, Ni Important</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              <Button
                type="button"
                variant="link"
                onClick={() => setShowNewTaskAdvanced(!showNewTaskAdvanced)}
                className="p-0 h-auto text-sm"
                disabled={!user || isSubmitting || isBulkDeleting}
              >
                {showNewTaskAdvanced ? <ChevronUp className="mr-1 h-4 w-4"/> : <ChevronDown className="mr-1 h-4 w-4"/>}
                Options avancées (fréquence, date, heure)
              </Button>

              {showNewTaskAdvanced && (
                <div className="space-y-4 p-4 border rounded-md bg-background/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="new-task-frequency" className="flex items-center">
                          Fréquence
                           <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0" type="button"><Info className="h-3 w-3"/></Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>À quelle fréquence cette tâche se répète-t-elle ? Choisissez "Une fois" si non récurrente.</p></TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select value={newFrequency || "once"} onValueChange={(value) => setNewFrequency(value as Frequency)} disabled={!user || isSubmitting || isBulkDeleting}>
                            <SelectTrigger id="new-task-frequency" className="w-full mt-1">
                                <SelectValue placeholder="Choisir fréquence (optionnel)" />
                            </SelectTrigger>
                            <SelectContent>
                              {frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-task-date">Date spécifique</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal mt-1"
                            id="new-task-date"
                            disabled={!user || isSubmitting || isBulkDeleting}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newSpecificDate ? format(newSpecificDate, "PPP", { locale: fr }) : <span>Choisir une date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newSpecificDate}
                            onSelect={setNewSpecificDate}
                            initialFocus
                            locale={fr}
                            disabled={!user || isSubmitting || isBulkDeleting}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="new-task-time">Heure spécifique</Label>
                      <Input
                        id="new-task-time"
                        type="time"
                        value={newSpecificTime}
                        onChange={(e) => setNewSpecificTime(e.target.value)}
                        className="w-full mt-1"
                        disabled={!user || isSubmitting || isBulkDeleting}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <Button type="submit" className="w-full sm:w-auto" disabled={!user || isSubmitting || isBulkDeleting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                  {isSubmitting ? "Ajout..." : "Ajouter la Tâche"}
                </Button>

                <div className="flex gap-2 w-full sm:w-auto">
                  <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={handleOpenSavePresetDialog} disabled={!user || !newTaskText.trim() || isSubmitting || isBulkDeleting}>
                    <Save className="mr-2 h-4 w-4" /> Sauvegarder comme Preset
                  </Button>
                  <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" className="flex-1 sm:flex-none" disabled={!user || isSubmitting || isBulkDeleting || isLoadingPresets}>
                        {isLoadingPresets ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WandSparkles className="mr-2 h-4 w-4" />}
                        Charger un Preset
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md md:max-w-lg max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Charger un Preset de Tâches</DialogTitle>
                        <DialogDescription>
                          Choisissez un modèle de tâche pour démarrer rapidement. Vous pourrez l'ajuster avant de l'ajouter.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex-grow overflow-y-auto pr-2 -mr-2 py-2">
                        {isLoadingPresets && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>}
                        {!isLoadingPresets && (
                          <Accordion type="multiple" defaultValue={customPresets.length > 0 ? ['custom_presets'] : ['morning_routine']} className="w-full space-y-2">
                            {allPresetCategories().map(category => (
                              <AccordionItem value={category.id} key={category.id} className="border rounded-md shadow-sm bg-card">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline text-primary font-medium">
                                  {category.name} ({category.presets.length})
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pt-0 pb-2">
                                  <div className="space-y-1 mt-2">
                                    {category.presets.map(preset => (
                                      <div key={preset.id} className="flex items-center justify-between py-1 hover:bg-accent/50 rounded-md pr-1">
                                        <Button
                                          variant="ghost"
                                          className="flex-grow justify-start h-auto py-1.5 text-left"
                                          onClick={() => loadPresetIntoForm(preset)}
                                        >
                                          <div>
                                            <p className="font-medium text-foreground">{preset.name}</p>
                                            <p className="text-xs text-muted-foreground">{preset.text} <br/>(Quadrant: {preset.quadrant.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())})</p>
                                          </div>
                                        </Button>
                                        {preset.isCustom && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" disabled={isSubmitting}>
                                                <Trash2 className="h-4 w-4 text-destructive"/>
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Supprimer ce preset ?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Êtes-vous sûr de vouloir supprimer le preset personnalisé "{preset.name}" ?
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteCustomPreset(preset.id)}>Supprimer</AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                      </div>
                                    ))}
                                    {category.presets.length === 0 && <p className="text-sm text-muted-foreground italic p-2">Aucun preset dans cette catégorie.</p>}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        )}
                      </div>
                      <DialogFooter className="mt-4">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Fermer</Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </form>
          </Card>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Quadrant title="🔴 Urgent & Important" quadrantKey="urgentImportant" bgColor="bg-red-100 dark:bg-red-900/30" />
            <Quadrant title="🟡 Important, Pas Urgent" quadrantKey="notUrgentImportant" bgColor="bg-yellow-100 dark:bg-yellow-900/30" />
            <Quadrant title="🔵 Urgent, Pas Important" quadrantKey="urgentNotImportant" bgColor="bg-blue-100 dark:bg-blue-900/30" />
            <Quadrant title="⚪ Ni Urgent, Ni Important" quadrantKey="notUrgentNotImportant" bgColor="bg-gray-100 dark:bg-gray-700/30" />
          </div>

          {user && tasks.length > 0 && (
            <Card className="p-4 sm:p-6 bg-card shadow-md mt-6">
              <CardTitle className="text-xl mb-4 text-primary">Actions en Masse</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto" disabled={isBulkDeleting || isSubmitting || !user}>
                      {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Tout Effacer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible et supprimera toutes vos tâches de la Grille des Priorités.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAllTasks}>Oui, tout effacer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto" disabled={isBulkDeleting || isSubmitting || !user || !tasks.some(t => t.isCompleted)}>
                       {isBulkDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SparklesIcon className="mr-2 h-4 w-4" />}
                      Effacer les Tâches Complétées
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                      <AlertDialogDescription>
                        Voulez-vous vraiment supprimer toutes les tâches marquées comme complétées ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearCompletedTasks}>Oui, effacer les complétées</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          )}

        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Conseil du Génie : Prioriser avec sagesse est la clé du succès.
          </p>
        </CardFooter>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(isOpen) => {
        if (!isOpen) setEditingTask(null);
      }}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la Tâche</DialogTitle>
            <DialogDescription>
              Mettez à jour les détails de votre tâche. Les champs marqués d'un * sont requis. Cliquez sur "Sauvegarder" lorsque vous avez terminé.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="edit-task-text">Texte <span className="text-destructive">*</span></Label>
              <Input
                id="edit-task-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                required
                disabled={isSubmitting || !user}
                className="transition-all duration-200 ease-in-out hover:shadow-lg hover:animate-subtle-shake transform hover:scale-[1.01]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-task-quadrant" className="flex items-center">
                Quadrant <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 ml-1 p-0" type="button"><Info className="h-3 w-3"/></Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p><strong>Urgent & Important:</strong> À faire immédiatement.</p>
                    <p><strong>Important, Pas Urgent:</strong> À planifier.</p>
                    <p><strong>Urgent, Pas Important:</strong> À déléguer.</p>
                    <p><strong>Ni Urgent, Ni Important:</strong> À éliminer.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select value={editQuadrant} onValueChange={(value) => setEditQuadrant(value as QuadrantKey)} required disabled={isSubmitting || !user}>
                <SelectTrigger id="edit-task-quadrant">
                  <SelectValue placeholder="Choisir quadrant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgentImportant">🔴 Urgent & Important</SelectItem>
                  <SelectItem value="notUrgentImportant">🟡 Important, Pas Urgent</SelectItem>
                  <SelectItem value="urgentNotImportant">🔵 Urgent, Pas Important</SelectItem>
                  <SelectItem value="notUrgentNotImportant">⚪ Ni Urgent, Ni Important</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
                type="button"
                variant="link"
                onClick={() => setShowEditTaskAdvanced(!showEditTaskAdvanced)}
                className="p-0 h-auto text-sm justify-start mt-2"
                disabled={isSubmitting || !user}
              >
                {showEditTaskAdvanced ? <ChevronUp className="mr-1 h-4 w-4"/> : <ChevronDown className="mr-1 h-4 w-4"/>}
                Options avancées
            </Button>

            {showEditTaskAdvanced && (
               <div className="space-y-4 p-4 border rounded-md bg-background/50 mt-1">
                 <div className="space-y-1">
                    <Label htmlFor="edit-task-frequency">Fréquence</Label>
                    <Select value={editFrequency || "once"} onValueChange={(value) => setEditFrequency(value as Frequency)} disabled={isSubmitting || !user}>
                        <SelectTrigger id="edit-task-frequency">
                            <SelectValue placeholder="Choisir fréquence" />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-task-date">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                          id="edit-task-date"
                          disabled={isSubmitting || !user}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editSpecificDate ? format(editSpecificDate, "PPP", { locale: fr }) : <span>Choisir date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editSpecificDate}
                          onSelect={(date) => setEditSpecificDate(date)}
                          initialFocus
                          locale={fr}
                          disabled={isSubmitting || !user}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-task-time">Heure</Label>
                    <Input
                      id="edit-task-time"
                      type="time"
                      value={editSpecificTime}
                      onChange={(e) => setEditSpecificTime(e.target.value)}
                      disabled={isSubmitting || !user}
                    />
                  </div>
               </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Annuler</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateTask} disabled={isSubmitting || !user}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Custom Preset Dialog */}
      <Dialog open={isSavePresetDialogOpen} onOpenChange={setIsSavePresetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Sauvegarder comme Preset Personnalisé</DialogTitle>
            <DialogDescription>
              Donnez un nom à ce preset pour le réutiliser facilement plus tard.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1">
              <Label htmlFor="preset-name">Nom du Preset <span className="text-destructive">*</span></Label>
              <Input
                id="preset-name"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Ex: Ma tâche hebdomadaire importante"
                required
                disabled={!user || isSubmitting}
              />
            </div>
            <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
              <p className="font-medium">Aperçu de la tâche à sauvegarder :</p>
              <p><strong>Texte :</strong> {newTaskText || "Non défini"}</p>
              <p><strong>Quadrant :</strong> {selectedQuadrant.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</p>
              {newFrequency && <p><strong>Fréquence :</strong> {getFrequencyLabel(newFrequency)}</p>}
              {newSpecificDate && <p><strong>Date :</strong> {format(newSpecificDate, "PPP", { locale: fr })}</p>}
              {newSpecificTime && <p><strong>Heure :</strong> {newSpecificTime}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setNewPresetName('')} disabled={isSubmitting}>Annuler</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveCustomPreset} disabled={!user || !newPresetName.trim() || !newTaskText.trim() || isSubmitting}>
               {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
              Sauvegarder le Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

    