
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Trash2, PlusCircle, Edit, CalendarIcon, Clock } from 'lucide-react';
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
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

type Frequency = "once" | "daily" | "weekly" | "bi-weekly" | "monthly" | "yearly";
const frequencies: { value: Frequency, label: string }[] = [
  { value: "once", label: "Une fois" },
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "bi-weekly", label: "Bi-mensuel" },
  { value: "monthly", label: "Mensuel" },
  { value: "yearly", label: "Annuel" },
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

  // State for editing task
  const [editingTask, setEditingTask] = useState<PriorityTask | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editQuadrant, setEditQuadrant] = useState<QuadrantKey>('urgentImportant');
  const [editFrequency, setEditFrequency] = useState<Frequency | undefined>(undefined);
  const [editSpecificDate, setEditSpecificDate] = useState<Date | undefined>(undefined);
  const [editSpecificTime, setEditSpecificTime] = useState<string>('');


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
  }, []);

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

  const handlePresetPlaceholder = () => {
    toast({
      title: "Bientôt disponible !",
      description: "La fonctionnalité de presets sera ajoutée prochainement par le Génie.",
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
  };
  
  const getFrequencyLabel = (freqValue?: Frequency) => {
    if (!freqValue) return '';
    return frequencies.find(f => f.value === freqValue)?.label || '';
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
                <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)} aria-label="Modifier la tâche" className="h-7 w-7">
                  <Edit className="w-4 h-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} aria-label="Supprimer la tâche" className="h-7 w-7">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            {(task.frequency || task.specificDate || task.specificTime) && (
              <div className="mt-1.5 pt-1.5 border-t border-muted/50 text-xs text-muted-foreground space-y-0.5">
                {task.frequency && <p><span className="font-medium">Fréquence:</span> {getFrequencyLabel(task.frequency)}</p>}
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
    <>
      <Card className="w-full max-w-5xl mx-auto shadow-xl"> {/* Increased max-width */}
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-primary">PriorityGrid Magique</CardTitle>
          <CardDescription>Organisez vos tâches avec la matrice d'Eisenhower. Ajoutez des détails comme la fréquence et les échéances. Le niveau de magie influencera les futures suggestions du Génie !</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <IntensitySelector value={intensity} onChange={setIntensity} />
          
          <Card className="p-4 sm:p-6 bg-card shadow-md">
            <CardTitle className="text-xl mb-1 text-primary">Ajouter une Tâche</CardTitle>
            <CardDescription className="mb-4">Remplissez les détails de votre nouvelle tâche.</CardDescription>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Label htmlFor="new-task-text">Description de la tâche</Label>
                <Input
                  id="new-task-text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder="Ex: Répondre aux e-mails importants"
                  className="w-full mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="new-task-quadrant">Quadrant</Label>
                    <Select value={selectedQuadrant} onValueChange={(value) => setSelectedQuadrant(value as QuadrantKey)}>
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
                <div>
                    <Label htmlFor="new-task-frequency">Fréquence</Label>
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
                  <Label htmlFor="new-task-date">Date spécifique (optionnel)</Label>
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
                  <Label htmlFor="new-task-time">Heure spécifique (optionnel)</Label>
                  <Input
                    id="new-task-time"
                    type="time"
                    value={newSpecificTime}
                    onChange={(e) => setNewSpecificTime(e.target.value)}
                    className="w-full mt-1"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                <Button type="submit" className="w-full sm:w-auto">
                  <PlusCircle className="mr-2 h-4 w-4" /> Ajouter la Tâche
                </Button>
                <Button type="button" variant="outline" onClick={handlePresetPlaceholder}  className="w-full sm:w-auto">
                  Charger un Preset (Bientôt!)
                </Button>
              </div>
            </form>
          </Card>


          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Quadrant title="🔴 Urgent & Important (À faire)" quadrantKey="urgentImportant" bgColor="bg-red-100 dark:bg-red-900/30" />
            <Quadrant title="🟡 Important, Pas Urgent (Planifier)" quadrantKey="notUrgentImportant" bgColor="bg-yellow-100 dark:bg-yellow-900/30" />
            <Quadrant title="🔵 Urgent, Pas Important (Déléguer)" quadrantKey="urgentNotImportant" bgColor="bg-blue-100 dark:bg-blue-900/30" />
            <Quadrant title="⚪ Ni Urgent, Ni Important (Éliminer)" quadrantKey="notUrgentNotImportant" bgColor="bg-gray-100 dark:bg-gray-700/30" />
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            Conseil du Génie : Prioriser avec sagesse est la clé du succès. Vos tâches sont sauvegardées localement.
          </p>
        </CardFooter>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(isOpen) => !isOpen && setEditingTask(null)}>
        <DialogContent className="sm:max-w-[425px] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la Tâche</DialogTitle>
            <DialogDescription>
              Mettez à jour les détails de votre tâche. Cliquez sur "Sauvegarder" lorsque vous avez terminé.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-text" className="text-right col-span-1">
                Texte
              </Label>
              <Input
                id="edit-task-text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-quadrant" className="text-right col-span-1">
                Quadrant
              </Label>
              <Select value={editQuadrant} onValueChange={(value) => setEditQuadrant(value as QuadrantKey)}>
                <SelectTrigger id="edit-task-quadrant" className="col-span-3">
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-frequency" className="text-right col-span-1">
                Fréquence
              </Label>
               <Select value={editFrequency} onValueChange={(value) => setEditFrequency(value as Frequency)}>
                  <SelectTrigger id="edit-task-frequency" className="col-span-3">
                      <SelectValue placeholder="Choisir fréquence" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencies.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-date" className="text-right col-span-1">
                Date
              </Label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="col-span-3 justify-start text-left font-normal"
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
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-task-time" className="text-right col-span-1">
                Heure
              </Label>
              <Input
                id="edit-task-time"
                type="time"
                value={editSpecificTime}
                onChange={(e) => setEditSpecificTime(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline">Annuler</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateTask}>Sauvegarder les Changements</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

