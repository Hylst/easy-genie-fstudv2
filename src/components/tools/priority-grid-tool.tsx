
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Trash2, PlusCircle, Edit, CalendarIcon, Clock, ChevronDown, ChevronUp, Info, WandSparkles } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


type Frequency = "once" | "daily" | "weekly" | "bi-weekly" | "monthly" | "yearly";
const frequencies: { value: Frequency, label: string, description: string }[] = [
  { value: "once", label: "Une fois", description: "Tâche unique, non récurrente." },
  { value: "daily", label: "Journalier", description: "Se répète tous les jours." },
  { value: "weekly", label: "Hebdomadaire", description: "Se répète chaque semaine." },
  { value: "bi-weekly", label: "Bi-mensuel", description: "Se répète toutes les deux semaines." },
  { value: "monthly", label: "Mensuel", description: "Se répète chaque mois." },
  { value: "yearly", label: "Annuel", description: "Se répète chaque année." },
];

interface PriorityTask {
  id: string;
  text: string;
  quadrant: 'urgentImportant' | 'notUrgentImportant' | 'urgentNotImportant' | 'notUrgentNotImportant';
  frequency?: Frequency;
  specificDate?: string; // ISO string
  specificTime?: string; // HH:mm
}

type QuadrantKey = PriorityTask['quadrant'];
const PRIORITY_GRID_STORAGE_KEY = "easyGeniePriorityGridTasks_v1";

interface Preset {
  id: string;
  name: string;
  text: string;
  quadrant: QuadrantKey;
  frequency?: Frequency;
  specificDate?: string; // relative date like "today", "tomorrow", or "next Monday" that needs parsing, or leave empty
  specificTime?: string; // HH:mm
}

interface PresetCategory {
  id: string;
  name: string;
  presets: Preset[];
}

const hardcodedPresets: PresetCategory[] = [
  {
    id: 'morning',
    name: '🚀 Routine Matinale Énergisante',
    presets: [
      { id: 'm1', name: 'Planifier la journée', text: "Définir les 3 priorités du jour", quadrant: 'urgentImportant', frequency: 'daily', specificTime: '08:00' },
      { id: 'm2', name: 'Méditation rapide', text: "5-10 min de méditation/pleine conscience", quadrant: 'notUrgentImportant', frequency: 'daily', specificTime: '07:30' },
      { id: 'm3', name: 'Emails urgents', text: "Traiter les emails critiques uniquement", quadrant: 'urgentNotImportant', specificTime: '08:30' },
    ],
  },
  {
    id: 'work',
    name: '💼 Focus Projets Importants',
    presets: [
      { id: 'w1', name: 'Bloc de travail profond', text: "Avancer sur [Nom du Projet Clé]", quadrant: 'notUrgentImportant', frequency: 'daily' },
      { id: 'w2', name: 'Réunion de suivi', text: "Préparer et participer à la réunion [Nom]", quadrant: 'urgentImportant' },
      { id: 'w3', name: 'Relecture document', text: "Relire et finaliser le document X", quadrant: 'notUrgentImportant' },
    ],
  },
  {
    id: 'personal',
    name: '🧘 Bien-être & Perso',
    presets: [
      { id: 'p1', name: 'Séance de sport', text: "Activité physique (course, gym, yoga)", quadrant: 'notUrgentImportant', frequency: 'weekly' },
      { id: 'p2', name: 'Appeler un proche', text: "Prendre des nouvelles de [Nom]", quadrant: 'notUrgentImportant' },
      { id: 'p3', name: 'Temps créatif', text: "Peinture, écriture, musique...", quadrant: 'notUrgentImportant', frequency: 'weekly'},
      { id: 'p4', name: 'Payer facture Y', text: "Régler la facture [Nom de la facture]", quadrant: 'urgentImportant'},
    ],
  },
];


export function PriorityGridTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [tasks, setTasks] = useState<PriorityTask[]>([]);
  const { toast } = useToast();

  // State for new task form
  const [newTaskText, setNewTaskText] = useState<string>('');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantKey>('urgentImportant');
  const [newFrequency, setNewFrequency] = useState<Frequency | undefined>(undefined);
  const [newSpecificDate, setNewSpecificDate] = useState<Date | undefined>(undefined);
  const [newSpecificTime, setNewSpecificTime] = useState<string>('');
  const [showNewTaskAdvanced, setShowNewTaskAdvanced] = useState(false);
  const [isPresetDialogValid, setIsPresetDialogValid] = useState(false);


  // State for editing task
  const [editingTask, setEditingTask] = useState<PriorityTask | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editQuadrant, setEditQuadrant] = useState<QuadrantKey>('urgentImportant');
  const [editFrequency, setEditFrequency] = useState<Frequency | undefined>(undefined);
  const [editSpecificDate, setEditSpecificDate] = useState<Date | undefined>(undefined);
  const [editSpecificTime, setEditSpecificTime] = useState<string>('');
  const [showEditTaskAdvanced, setShowEditTaskAdvanced] = useState(false);


  useEffect(() => {
    const savedTasks = localStorage.getItem(PRIORITY_GRID_STORAGE_KEY);
    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch (error) {
        console.error("Failed to parse tasks from localStorage", error);
        toast({ title: "Erreur de chargement", description: "Impossible de charger les tâches sauvegardées.", variant: "destructive"});
      }
    }
  }, [toast]);

  const saveTasks = (updatedTasks: PriorityTask[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(PRIORITY_GRID_STORAGE_KEY, JSON.stringify(updatedTasks));
  };

  const resetNewTaskForm = () => {
    setNewTaskText('');
    setSelectedQuadrant('urgentImportant');
    setNewFrequency(undefined);
    setNewSpecificDate(undefined);
    setNewSpecificTime('');
    setShowNewTaskAdvanced(false);
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) {
      toast({ title: "Texte de tâche manquant", description: "Veuillez entrer une description pour votre tâche.", variant: "destructive"});
      return;
    }

    const newTaskData: PriorityTask = {
      id: crypto.randomUUID(),
      text: newTaskText,
      quadrant: selectedQuadrant,
      frequency: newFrequency === "once" ? undefined : newFrequency,
      specificDate: newSpecificDate ? newSpecificDate.toISOString() : undefined,
      specificTime: newSpecificTime || undefined,
    };
    saveTasks([...tasks, newTaskData]);
    toast({ title: "Tâche ajoutée!", description: `"${newTaskText}" a été ajoutée à la grille.` });
    resetNewTaskForm();
  };

  const handleDeleteTask = (id: string) => {
    const newTasks = tasks.filter(task => task.id !== id);
    saveTasks(newTasks);
    toast({ title: "Tâche supprimée", variant: "destructive" });
  };

  const openEditDialog = (task: PriorityTask) => {
    setEditingTask(task);
    setEditText(task.text);
    setEditQuadrant(task.quadrant);
    setEditFrequency(task.frequency || undefined);
    setEditSpecificDate(task.specificDate ? new Date(task.specificDate) : undefined);
    setEditSpecificTime(task.specificTime || '');
    setShowEditTaskAdvanced(!!(task.frequency || task.specificDate || task.specificTime));
  };

  const handleUpdateTask = () => {
    if (!editingTask || !editText.trim()) {
      toast({ title: "Texte de tâche manquant", description: "La description ne peut être vide.", variant: "destructive"});
      return;
    }
    const updatedTasks = tasks.map(t => 
      t.id === editingTask.id 
      ? { 
          ...t, 
          text: editText,
          quadrant: editQuadrant,
          frequency: editFrequency === "once" ? undefined : editFrequency,
          specificDate: editSpecificDate ? editSpecificDate.toISOString() : undefined,
          specificTime: editSpecificTime || undefined,
        } 
      : t
    );
    saveTasks(updatedTasks);
    toast({ title: "Tâche mise à jour!" });
    setEditingTask(null);
  };
  
  const loadPreset = (preset: Preset) => {
    setNewTaskText(preset.text);
    setSelectedQuadrant(preset.quadrant);
    setNewFrequency(preset.frequency);
    
    // Basic relative date parsing for presets (can be expanded)
    if (preset.specificDate === "today") {
      setNewSpecificDate(new Date());
    } else if (preset.specificDate === "tomorrow") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setNewSpecificDate(tomorrow);
    } else if (preset.specificDate) {
       try {
        setNewSpecificDate(new Date(preset.specificDate)); // If it's an ISO string already
       } catch (e) {
        setNewSpecificDate(undefined); // Or handle other relative terms more robustly
       }
    } else {
      setNewSpecificDate(undefined);
    }

    setNewSpecificTime(preset.specificTime || '');
    setShowNewTaskAdvanced(!!(preset.frequency || preset.specificDate || preset.specificTime));
    setIsPresetDialogValid(false); // Close dialog
    toast({
      title: "Preset chargé !",
      description: `Le preset "${preset.name}" a été chargé dans le formulaire. Ajustez-le si besoin.`,
    });
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (e) {
      return "Date invalide";
    }
  };
  
  const getFrequencyLabel = (freqValue?: Frequency) => {
    if (!freqValue) return '';
    return frequencies.find(f => f.value === freqValue)?.label || '';
  };

  const quadrantInfo = {
    urgentImportant: "🔴 Tâches critiques à faire immédiatement.",
    notUrgentImportant: "🟡 Tâches importantes pour les objectifs à long terme, à planifier.",
    urgentNotImportant: "🔵 Tâches urgentes mais qui peuvent souvent être déléguées ou minimisées.",
    notUrgentNotImportant: "⚪ Tâches à faible valeur, à éviter ou éliminer si possible."
  };

  const Quadrant = ({ title, quadrantKey, bgColor }: { title: string; quadrantKey: QuadrantKey; bgColor: string }) => (
    <div className={`p-4 rounded-lg shadow-inner min-h-[200px] ${bgColor} flex flex-col`}>
      <h3 className="font-semibold text-lg mb-3 text-foreground">{title}</h3>
      <div className="space-y-2 flex-grow">
        {tasks.filter(task => task.quadrant === quadrantKey).map(task => (
          <div key={task.id} className="bg-background/80 p-3 rounded-md shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-sm text-foreground flex-grow break-words mr-2">{task.text}</p>
              <div className="flex-shrink-0 flex gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)} aria-label="Modifier la tâche" className="h-7 w-7">
                        <Edit className="w-4 h-4 text-blue-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Modifier la tâche</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                 <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label="Supprimer la tâche" className="h-7 w-7">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Supprimer la tâche</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {(task.frequency || task.specificDate || task.specificTime) && (
              <div className="mt-1.5 pt-1.5 border-t border-muted/50 text-xs text-muted-foreground space-y-0.5">
                {task.frequency && <p><span className="font-medium">Fréq.:</span> {getFrequencyLabel(task.frequency)}</p>}
                {task.specificDate && <p><CalendarIcon className="inline h-3 w-3 mr-1"/> {formatDate(task.specificDate)}</p>}
                {task.specificTime && <p><Clock className="inline h-3 w-3 mr-1"/> {task.specificTime}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      {tasks.filter(task => task.quadrant === quadrantKey).length === 0 && (
        <p className="text-sm text-muted-foreground italic mt-auto">Aucune tâche ici.</p>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Card className="w-full max-w-5xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">PriorityGrid Magique</CardTitle>
          <CardDescription>Organisez vos tâches avec la matrice d'Eisenhower. Le niveau de magie influencera les futures suggestions du Génie !</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <IntensitySelector value={intensity} onChange={setIntensity} />
          
          <Card className="p-4 sm:p-6 bg-card shadow-md">
            <CardTitle className="text-xl mb-1 text-primary">Ajouter une Tâche</CardTitle>
            <CardDescription className="mb-4">Remplissez les détails de votre nouvelle tâche. Les champs marqués d'un * sont requis.</CardDescription>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="new-task-text">Description de la tâche <span className="text-destructive">*</span></Label>
                <Input
                  id="new-task-text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Ex: Répondre aux e-mails importants"
                  className="w-full mt-1"
                  required
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
                  <Select value={selectedQuadrant} onValueChange={(value) => setSelectedQuadrant(value as QuadrantKey)} required>
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
                            <TooltipContent side="right"><p>À quelle fréquence cette tâche se répète-t-elle ?</p></TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select value={newFrequency} onValueChange={(value) => setNewFrequency(value as Frequency)}>
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
                      />
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <Button type="submit" className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter la Tâche
                </Button>
                
                <Dialog open={isPresetDialogValid} onOpenChange={setIsPresetDialogValid}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full sm:w-auto">
                      <WandSparkles className="mr-2 h-4 w-4" /> Charger un Preset
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md md:max-w-lg max-h-[80vh] flex flex-col">
                    <DialogHeader>
                      <DialogTitle>Charger un Preset de Tâches</DialogTitle>
                      <DialogDescription>
                        Choisissez un modèle de tâche pour démarrer rapidement. Vous pourrez l'ajuster avant de l'ajouter.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-2">
                    <Accordion type="multiple" className="w-full space-y-2">
                      {hardcodedPresets.map(category => (
                        <AccordionItem value={category.id} key={category.id} className="border rounded-md">
                          <AccordionTrigger className="px-4 hover:no-underline">{category.name}</AccordionTrigger>
                          <AccordionContent className="px-4 pt-0 pb-2">
                            <div className="space-y-2">
                              {category.presets.map(preset => (
                                <Button
                                  key={preset.id}
                                  variant="ghost"
                                  className="w-full justify-start h-auto py-2 text-left"
                                  onClick={() => loadPreset(preset)}
                                >
                                  <div>
                                    <p className="font-medium">{preset.name}</p>
                                    <p className="text-xs text-muted-foreground">{preset.text} ({preset.quadrant.replace(/([A-Z])/g, ' $1').toLowerCase()})</p>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    </div>
                    <DialogFooter className="mt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="outline">Fermer</Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

              </div>
            </form>
          </Card>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Quadrant title="🔴 Urgent & Important" quadrantKey="urgentImportant" bgColor="bg-red-100 dark:bg-red-900/30" />
            <Quadrant title="🟡 Important, Pas Urgent" quadrantKey="notUrgentImportant" bgColor="bg-yellow-100 dark:bg-yellow-900/30" />
            <Quadrant title="🔵 Urgent, Pas Important" quadrantKey="urgentNotImportant" bgColor="bg-blue-100 dark:bg-blue-900/30" />
            <Quadrant title="⚪ Ni Urgent, Ni Important" quadrantKey="notUrgentNotImportant" bgColor="bg-gray-100 dark:bg-gray-700/30" />
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Conseil du Génie : Prioriser avec sagesse est la clé du succès. Vos tâches sont sauvegardées localement.
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
              <Select value={editQuadrant} onValueChange={(value) => setEditQuadrant(value as QuadrantKey)} required>
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
              >
                {showEditTaskAdvanced ? <ChevronUp className="mr-1 h-4 w-4"/> : <ChevronDown className="mr-1 h-4 w-4"/>}
                Options avancées
            </Button>

            {showEditTaskAdvanced && (
               <div className="space-y-4 p-4 border rounded-md bg-background/50 mt-1">
                 <div className="space-y-1">
                    <Label htmlFor="edit-task-frequency">Fréquence</Label>
                    <Select value={editFrequency} onValueChange={(value) => setEditFrequency(value as Frequency)}>
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
                    />
                  </div>
               </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateTask}>Sauvegarder les Changements</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

    