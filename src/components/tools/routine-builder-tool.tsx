
"use client";

import { useState, useEffect, useRef, type FormEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { IntensitySelector } from '@/components/intensity-selector';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Wand2, Mic, Loader2, Info, Edit3 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Routine, RoutineStep, DayOfWeek, CreateRoutineDTO, CreateRoutineStepDTO } from '@/types';
import { DAYS_OF_WEEK_ARRAY } from '@/types';
import { suggestRoutine, type SuggestRoutineOutput } from '@/ai/flows/suggest-routine-flow';
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
import { useAuth } from '@/contexts/AuthContext';
import {
  getAllRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
  getStepsForRoutine,
  addStepToRoutine,
  updateRoutineStep,
  deleteRoutineStep,
} from '@/services/appDataService';

type ActiveMicField =
  | 'newRoutineName'
  | 'newRoutineDescription'
  | `newStep_${string}` // routineId
  | `editStep_${string}_${string}`; // routineId_stepId

type UIRoutineWithSteps = Routine & { steps: RoutineStep[]; isSuggestion?: boolean };

export function RoutineBuilderTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [routines, setRoutines] = useState<UIRoutineWithSteps[]>([]);
  const [newRoutineName, setNewRoutineName] = useState<string>('');
  const [newRoutineDescription, setNewRoutineDescription] = useState<string>('');
  const [newStepText, setNewStepText] = useState<{ [routineId: string]: string }>({});

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For general submissions

  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  const [suggestionGoal, setSuggestionGoal] = useState<string>('');
  const [showGoalDialog, setShowGoalDialog] = useState<boolean>(false);

  const { toast } = useToast();
  const { user, isOnline } = useAuth();

  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeMicField, setActiveMicField] = useState<ActiveMicField | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const fetchRoutinesAndSteps = useCallback(async () => {
    if (!user) {
      setRoutines([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const fetchedRoutines = await getAllRoutines();
      const routinesWithSteps: UIRoutineWithSteps[] = [];
      for (const routine of fetchedRoutines) {
        const steps = await getStepsForRoutine(routine.id);
        routinesWithSteps.push({ ...routine, steps });
      }
      setRoutines(routinesWithSteps);
    } catch (error) {
      console.error("Error fetching routines:", error);
      toast({ title: "Erreur de chargement", description: "Impossible de charger les routines.", variant: "destructive" });
      setRoutines([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchRoutinesAndSteps();
  }, [fetchRoutinesAndSteps, isOnline]); 


  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'fr-FR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeMicField === 'newRoutineName') {
          setNewRoutineName(prev => prev ? prev + ' ' + transcript : transcript);
        } else if (activeMicField === 'newRoutineDescription') {
          setNewRoutineDescription(prev => prev ? prev + ' ' + transcript : transcript);
        } else if (activeMicField?.startsWith('newStep_')) {
          const routineId = activeMicField.split('_')[1];
          setNewStepText(prev => ({ ...prev, [routineId]: (prev[routineId] || '') + ' ' + transcript }));
        } else if (activeMicField?.startsWith('editStep_')) {
          const [, routineId, stepId] = activeMicField.split('_');
          setRoutines(prevRoutines => prevRoutines.map(r =>
            r.id === routineId ? {
              ...r,
              steps: r.steps.map(s => s.id === stepId ? { ...s, text: s.text + ' ' + transcript } : s)
            } : r
          ));
          const routine = routines.find(r => r.id === routineId);
          const step = routine?.steps.find(s => s.id === stepId);
          if (step) {
             handleDebouncedStepTextChange(routineId, stepId, step.text + ' ' + transcript);
          }
        }
        toast({ title: "Texte ajouté !", description: "Votre voix a été transcrite." });
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        toast({ title: "Erreur de reconnaissance", description: `Le génie n'a pas pu comprendre: ${event.error}`, variant: "destructive" });
      };
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setActiveMicField(null);
      };
    } else {
      console.warn("Speech Recognition API not supported in this browser.");
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [activeMicField, routines]); 

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
        setIsListening(false);
        setActiveMicField(null);
        toast({ title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive" });
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening, toast]);

  const handleAddRoutine = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour ajouter une routine.", variant: "destructive" });
      return;
    }
    if (!newRoutineName.trim()) {
      toast({ title: "Nom de routine requis", description: "Veuillez donner un nom à votre routine.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const routineDto: CreateRoutineDTO = {
        name: newRoutineName,
        description: newRoutineDescription || undefined,
        days: [],
      };
      const addedRoutine = await addRoutine(routineDto);
      setRoutines(prev => [...prev, { ...addedRoutine, steps: [] }]);
      setNewRoutineName('');
      setNewRoutineDescription('');
      toast({ title: "Routine ajoutée!", description: `La routine "${addedRoutine.name}" a été créée.` });
    } catch (error) {
      console.error("Error adding routine:", error);
      toast({ title: "Erreur d'ajout", description: "Impossible d'ajouter la routine.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour supprimer une routine.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteRoutine(routineId);
      setRoutines(prev => prev.filter(r => r.id !== routineId));
      toast({ title: "Routine supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting routine:", error);
      toast({ title: "Erreur de suppression", description: "Impossible de supprimer la routine.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDay = async (routineId: string, day: DayOfWeek) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour modifier une routine.", variant: "destructive" });
      return;
    }
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    const newDays = routine.days.includes(day) ? routine.days.filter(d => d !== day) : [...routine.days, day];
    newDays.sort((a, b) => DAYS_OF_WEEK_ARRAY.indexOf(a) - DAYS_OF_WEEK_ARRAY.indexOf(b));

    setIsSubmitting(true);
    try {
      const updated = await updateRoutine(routineId, { days: newDays });
      setRoutines(prevRoutines => prevRoutines.map(r =>
        r.id === routineId ? { ...r, ...updated } : r
      ));
    } catch (error) {
      console.error("Error updating routine days:", error);
      toast({ title: "Erreur de mise à jour", description: "Impossible de mettre à jour les jours.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStep = async (routineId: string) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour ajouter une étape.", variant: "destructive" });
      return;
    }
    const text = newStepText[routineId]?.trim();
    if (!text) {
      toast({ title: "Texte d'étape requis", description: "Veuillez écrire le contenu de l'étape.", variant: "destructive" });
      return;
    }
    const routine = routines.find(r => r.id === routineId);
    if (!routine) return;

    setIsSubmitting(true);
    try {
      const stepDto: CreateRoutineStepDTO = {
        routine_id: routineId,
        text,
        order: routine.steps.length, 
      };
      const addedStep = await addStepToRoutine(routineId, stepDto);
      setRoutines(prevRoutines => prevRoutines.map(r =>
        r.id === routineId ? { ...r, steps: [...r.steps, addedStep] } : r
      ));
      setNewStepText(prev => ({ ...prev, [routineId]: '' }));
      toast({ title: "Étape ajoutée!" });
    } catch (error) {
      console.error("Error adding step:", error);
      toast({ title: "Erreur d'ajout d'étape", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStep = async (routineId: string, stepId: string) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour supprimer une étape.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteRoutineStep(stepId);
      setRoutines(prevRoutines => prevRoutines.map(r =>
        r.id === routineId ? { ...r, steps: r.steps.filter(s => s.id !== stepId) } : r
      ));
      toast({ title: "Étape supprimée", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting step:", error);
      toast({ title: "Erreur de suppression d'étape", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDebouncedStepTextChange = useCallback((routineId: string, stepId: string, newText: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(async () => {
      if (!user) return; 
      try {
        await updateRoutineStep(stepId, { text: newText });
        toast({ title: "Étape sauvegardée", description: "Modification de l'étape enregistrée."});
      } catch (error) {
        console.error("Error saving step text:", error);
        toast({ title: "Erreur de sauvegarde", description: "Impossible d'enregistrer le texte de l'étape.", variant: "destructive"});
      }
    }, 1000); 
  }, [user, toast]);

  const handleStepTextChange = (routineId: string, stepId: string, text: string) => {
    setRoutines(prevRoutines => prevRoutines.map(r =>
      r.id === routineId ? {
        ...r,
        steps: r.steps.map(s => s.id === stepId ? { ...s, text } : s)
      } : r
    ));
    handleDebouncedStepTextChange(routineId, stepId, text);
  };

  const handleToggleStepCompletion = async (routineId: string, stepId: string) => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour modifier une étape.", variant: "destructive" });
      return;
    }
    const routine = routines.find(r => r.id === routineId);
    const step = routine?.steps.find(s => s.id === stepId);
    if (!step) return;

    setIsSubmitting(true);
    try {
      const updatedStep = await updateRoutineStep(stepId, { isCompleted: !step.isCompleted });
      setRoutines(prevRoutines => prevRoutines.map(r =>
        r.id === routineId ? {
          ...r,
          steps: r.steps.map(s => s.id === stepId ? updatedStep : s)
        } : r
      ));
    } catch (error) {
      console.error("Error toggling step completion:", error);
      toast({ title: "Erreur", description: "Impossible de modifier l'état de l'étape.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoiceInput = (micField: ActiveMicField) => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible sur ce navigateur.", variant: "destructive" });
      return;
    }
    if (isListening && activeMicField === micField) {
      setIsListening(false);
    } else {
      setActiveMicField(micField);
      setIsListening(true);
    }
  };

  const triggerGenieSuggestions = async () => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour obtenir des suggestions.", variant: "destructive" });
      return;
    }
    if (!suggestionGoal.trim()) {
      toast({ title: "Objectif manquant", description: "Veuillez indiquer au Génie quel est votre objectif.", variant: "destructive" });
      return;
    }
    setShowGoalDialog(false);
    setIsFetchingSuggestions(true);
    try {
      const result: SuggestRoutineOutput = await suggestRoutine({
        goal: suggestionGoal,
        intensityLevel: intensity,
        existingRoutineNames: routines.map(r => r.name)
      });

      const routineDto: CreateRoutineDTO = {
        name: result.name || `Suggestion: ${suggestionGoal}`,
        description: result.description,
        days: result.days || [],
      };
      const addedRoutine = await addRoutine(routineDto);
      
      const addedSteps: RoutineStep[] = [];
      for (let i = 0; i < result.steps.length; i++) {
        const stepText = result.steps[i];
        const stepDto: CreateRoutineStepDTO = {
          routine_id: addedRoutine.id,
          text: stepText,
          order: i,
        };
        const addedStep = await addStepToRoutine(addedRoutine.id, stepDto);
        addedSteps.push(addedStep);
      }
      
      setRoutines(prev => [...prev, { ...addedRoutine, steps: addedSteps, isSuggestion: true }]);
      toast({ title: "Suggestion du Génie ajoutée!", description: `La routine "${addedRoutine.name}" a été ajoutée.` });
      setSuggestionGoal('');
    } catch (error) {
      console.error("Error getting routine suggestions:", error);
      toast({ title: "Erreur de suggestion", description: "Le Génie n'a pas pu suggérer de routine.", variant: "destructive" });
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie vous laisse maître de vos routines.";
    if (intensity <= 4) return "Le Génie peut structurer vos routines avec des suggestions pertinentes.";
    return "Le Génie est prêt à vous guider de manière directive pour optimiser vos routines !";
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Chargement de vos routines...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-xl mx-auto shadow-xl">
      <CardHeader className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="flex-grow">
          <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
            <Edit3 className="h-8 w-8" /> Constructeur de Routines Magiques
          </CardTitle>
          <CardDescription>
            Organisez votre quotidien avec des routines personnalisées.
            {!user && " Connectez-vous pour sauvegarder et synchroniser vos routines."}
          </CardDescription>
        </div>
        <div className="w-full md:w-auto md:min-w-[300px] md:max-w-xs lg:max-w-sm shrink-0">
            <IntensitySelector value={intensity} onChange={setIntensity} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground text-center -mt-4 h-5">{intensityDescription()}</p>

        {!user && (
          <Card className="p-6 bg-yellow-50 border-yellow-300 text-yellow-700 text-center">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p className="font-semibold">Connectez-vous pour créer et gérer vos routines.</p>
            <p className="text-sm">Vos routines seront sauvegardées et synchronisées sur vos appareils.</p>
          </Card>
        )}

        {user && (
          <>
            <Card className="p-4 sm:p-6 bg-card shadow-md">
              <CardTitle className="text-xl mb-4 text-primary">Créer une Nouvelle Routine</CardTitle>
              <form onSubmit={handleAddRoutine} className="space-y-4">
                <div>
                  <Label htmlFor="new-routine-name">Nom de la routine</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      id="new-routine-name"
                      value={newRoutineName}
                      onChange={(e) => setNewRoutineName(e.target.value)}
                      placeholder="Ex: Routine du matin, Préparation semaine"
                      required
                      className="flex-grow"
                      disabled={isListening && activeMicField !== 'newRoutineName' || isSubmitting}
                    />
                    <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput('newRoutineName')} aria-label="Dicter le nom"
                      className={isListening && activeMicField === 'newRoutineName' ? 'text-red-500 animate-pulse' : ''}
                      disabled={!recognitionRef.current || (isListening && activeMicField !== 'newRoutineName') || isSubmitting}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="new-routine-description">Description (optionnel)</Label>
                  <div className="flex items-center gap-1">
                    <Textarea
                      id="new-routine-description"
                      value={newRoutineDescription}
                      onChange={(e) => setNewRoutineDescription(e.target.value)}
                      placeholder="Ex: Pour démarrer la journée avec énergie et focus"
                      rows={2}
                      className="flex-grow"
                      disabled={isListening && activeMicField !== 'newRoutineDescription' || isSubmitting}
                    />
                    <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput('newRoutineDescription')} aria-label="Dicter la description"
                      className={isListening && activeMicField === 'newRoutineDescription' ? 'text-red-500 animate-pulse' : ''}
                      disabled={!recognitionRef.current || (isListening && activeMicField !== 'newRoutineDescription') || isSubmitting}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <Button type="submit" className="w-full sm:w-auto" disabled={isListening || isFetchingSuggestions || isSubmitting || !user}>
                    {isSubmitting && !isFetchingSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <PlusCircle className="mr-2 h-5 w-5" />} 
                    Ajouter la Routine
                  </Button>
                  <AlertDialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isListening || isFetchingSuggestions || isSubmitting || !user}>
                        {isFetchingSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                        Suggestions du Génie
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Quel est votre objectif pour cette routine ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Décrivez brièvement ce que vous voulez accomplir avec cette nouvelle routine.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <Input
                        value={suggestionGoal}
                        onChange={(e) => setSuggestionGoal(e.target.value)}
                        placeholder="Ex: Productivité matinale"
                        onKeyPress={(e) => { if (e.key === 'Enter') triggerGenieSuggestions(); }}
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setSuggestionGoal('')}>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={triggerGenieSuggestions} disabled={!suggestionGoal.trim()}>Obtenir Suggestion</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </Card>

            {routines.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-foreground mt-6">Mes Routines</h3>
                <Accordion type="single" collapsible className="w-full" defaultValue={routines.find(r => r.isSuggestion)?.id}>
                  {routines.map((routine) => (
                    <AccordionItem value={routine.id} key={routine.id} className={`bg-card border rounded-lg mb-3 shadow ${routine.isSuggestion ? 'border-primary border-2' : ''}`}>
                      <AccordionTrigger className="px-4 py-3 text-lg hover:no-underline">
                        <div className="flex justify-between items-center w-full">
                          <span className="flex items-center gap-2">{routine.name} {routine.isSuggestion && <Wand2 className="h-4 w-4 text-primary" />}</span>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteRoutine(routine.id); }} aria-label="Supprimer la routine" disabled={isSubmitting || !user}>
                            <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 space-y-4">
                        {routine.description && <p className="text-sm text-muted-foreground mb-3">{routine.description}</p>}
                        <div className="mb-3">
                          <Label className="block mb-2 font-medium">Jours de la semaine :</Label>
                          <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK_ARRAY.map(day => (
                              <Button
                                key={day}
                                variant={routine.days.includes(day) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleToggleDay(routine.id, day)}
                                disabled={isSubmitting || !user}
                              >
                                {day}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="block mb-2 font-medium">Étapes :</Label>
                          {routine.steps.length === 0 && <p className="text-sm text-muted-foreground italic">Aucune étape définie.</p>}
                          <ul className="space-y-2">
                            {routine.steps.map(step => (
                              <li key={step.id} className="flex items-center gap-1 p-2 border rounded-md bg-background hover:bg-muted/50">
                                <Checkbox
                                  id={`step-${step.id}`}
                                  checked={step.isCompleted}
                                  onCheckedChange={() => handleToggleStepCompletion(routine.id, step.id)}
                                  aria-label="Marquer étape comme faite/non faite"
                                  disabled={isSubmitting || !user}
                                />
                                <Input
                                  value={step.text}
                                  onChange={(e) => handleStepTextChange(routine.id, step.id, e.target.value)}
                                  className={`flex-grow bg-transparent border-0 focus:ring-0 ${step.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                                  placeholder="Description de l'étape"
                                  disabled={(isListening && activeMicField !== `editStep_${routine.id}_${step.id}`) || isSubmitting || !user}
                                />
                                <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput(`editStep_${routine.id}_${step.id}`)} aria-label="Dicter l'étape"
                                  className={isListening && activeMicField === `editStep_${routine.id}_${step.id}` ? 'text-red-500 animate-pulse' : ''}
                                  disabled={!recognitionRef.current || (isListening && activeMicField !== `editStep_${routine.id}_${step.id}`) || isSubmitting || !user}
                                >
                                  <Mic className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(routine.id, step.id)} aria-label="Supprimer l'étape" disabled={isSubmitting || !user}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                          <form className="mt-3 flex items-center gap-1" onSubmit={(e) => { e.preventDefault(); handleAddStep(routine.id) }}>
                            <Input
                              value={newStepText[routine.id] || ''}
                              onChange={(e) => setNewStepText(prev => ({ ...prev, [routine.id]: e.target.value }))}
                              placeholder="Nouvelle étape..."
                              className="flex-grow"
                              disabled={(isListening && activeMicField !== `newStep_${routine.id}`) || isSubmitting || !user}
                            />
                            <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput(`newStep_${routine.id}`)} aria-label="Dicter la nouvelle étape"
                              className={isListening && activeMicField === `newStep_${routine.id}` ? 'text-red-500 animate-pulse' : ''}
                              disabled={!recognitionRef.current || (isListening && activeMicField !== `newStep_${routine.id}`) || isSubmitting || !user}
                            >
                              <Mic className="h-5 w-5" />
                            </Button>
                            <Button type="submit" size="sm" variant="outline" disabled={isListening || isSubmitting || !user}>
                               {isSubmitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : <PlusCircle className="mr-1 h-3 w-3" />}
                               Ajouter
                            </Button>
                          </form>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
            {user && routines.length === 0 && !isFetchingSuggestions && !isLoadingData && (
                <p className="text-center text-muted-foreground mt-6">Commencez par créer votre première routine ou demandez une suggestion au Génie !</p>
            )}
            {isFetchingSuggestions && <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Le Génie prépare une routine...</p></div>}
          </>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          {user ? (isOnline ? "Vos routines sont synchronisées avec le cloud." : "Vos routines sont sauvegardées localement en mode hors ligne.") : "Connectez-vous pour une expérience magique et synchronisée."}
        </p>
      </CardFooter>
    </Card>
  );
}
