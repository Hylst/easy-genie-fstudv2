
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { IntensitySelector } from '@/components/intensity-selector';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2, Wand2, Mic, Loader2, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Routine, RoutineStep, DayOfWeek } from '@/types';
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


const ROUTINE_BUILDER_STORAGE_KEY = "easyGenieRoutineBuilder";

type ActiveMicField = 
  | 'newRoutineName' 
  | 'newRoutineDescription' 
  | `newStep_${string}` // routineId
  | `editStep_${string}_${string}`; // routineId_stepId

export function RoutineBuilderTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [newRoutineName, setNewRoutineName] = useState<string>('');
  const [newRoutineDescription, setNewRoutineDescription] = useState<string>('');
  const [newStepText, setNewStepText] = useState<{ [routineId: string]: string }>({});
  
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState<boolean>(false);
  const [suggestionGoal, setSuggestionGoal] = useState<string>('');
  const [showGoalDialog, setShowGoalDialog] = useState<boolean>(false);

  const { toast } = useToast();
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [activeMicField, setActiveMicField] = useState<ActiveMicField | null>(null);


  useEffect(() => {
    const savedRoutines = localStorage.getItem(ROUTINE_BUILDER_STORAGE_KEY);
    if (savedRoutines) {
      setRoutines(JSON.parse(savedRoutines));
    }

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
              steps: r.steps.map(s => s.id === stepId ? {...s, text: s.text + ' ' + transcript} : s) 
            } : r
          ));
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
    };
  }, [activeMicField]); // Re-run if activeMicField changes to correctly update state

  useEffect(() => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting recognition:", e);
        setIsListening(false);
        setActiveMicField(null);
        toast({title: "Erreur Micro", description: "Impossible de démarrer l'écoute.", variant: "destructive"});
      }
    } else if (!isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isListening]);


  const saveRoutines = (updatedRoutines: Routine[]) => {
    localStorage.setItem(ROUTINE_BUILDER_STORAGE_KEY, JSON.stringify(updatedRoutines));
    setRoutines(updatedRoutines);
  };

  const handleAddRoutine = (e: FormEvent) => {
    e.preventDefault();
    if (!newRoutineName.trim()) {
      toast({ title: "Nom de routine requis", description: "Veuillez donner un nom à votre routine.", variant: "destructive" });
      return;
    }
    const newRoutine: Routine = {
      id: crypto.randomUUID(),
      name: newRoutineName,
      description: newRoutineDescription,
      days: [],
      steps: [],
    };
    saveRoutines([...routines, newRoutine]);
    setNewRoutineName('');
    setNewRoutineDescription('');
    toast({ title: "Routine ajoutée!", description: `La routine "${newRoutine.name}" a été créée.` });
  };

  const handleDeleteRoutine = (routineId: string) => {
    const updatedRoutines = routines.filter(r => r.id !== routineId);
    saveRoutines(updatedRoutines);
    toast({ title: "Routine supprimée", variant: "destructive" });
  };
  
  const handleToggleDay = (routineId: string, day: DayOfWeek) => {
    const updatedRoutines = routines.map(r => {
      if (r.id === routineId) {
        const newDays = r.days.includes(day) ? r.days.filter(d => d !== day) : [...r.days, day];
        return { ...r, days: newDays.sort((a, b) => DAYS_OF_WEEK_ARRAY.indexOf(a) - DAYS_OF_WEEK_ARRAY.indexOf(b)) };
      }
      return r;
    });
    saveRoutines(updatedRoutines);
  };

  const handleAddStep = (routineId: string) => {
    const text = newStepText[routineId]?.trim();
    if (!text) {
      toast({ title: "Texte d'étape requis", description: "Veuillez écrire le contenu de l'étape.", variant: "destructive" });
      return;
    }
    const newStep: RoutineStep = { id: crypto.randomUUID(), text, isCompleted: false };
    const updatedRoutines = routines.map(r => 
      r.id === routineId ? { ...r, steps: [...r.steps, newStep] } : r
    );
    saveRoutines(updatedRoutines);
    setNewStepText(prev => ({ ...prev, [routineId]: '' }));
    toast({ title: "Étape ajoutée!" });
  };

  const handleDeleteStep = (routineId: string, stepId: string) => {
    const updatedRoutines = routines.map(r => 
      r.id === routineId ? { ...r, steps: r.steps.filter(s => s.id !== stepId) } : r
    );
    saveRoutines(updatedRoutines);
    toast({ title: "Étape supprimée", variant: "destructive" });
  };
  
  const handleStepTextChange = (routineId: string, stepId: string, text: string) => {
     const updatedRoutines = routines.map(r => 
      r.id === routineId ? { 
        ...r, 
        steps: r.steps.map(s => s.id === stepId ? {...s, text} : s) 
      } : r
    );
    saveRoutines(updatedRoutines);
  };

  const handleToggleStepCompletion = (routineId: string, stepId: string) => {
    const updatedRoutines = routines.map(r => 
      r.id === routineId ? { 
        ...r, 
        steps: r.steps.map(s => s.id === stepId ? {...s, isCompleted: !s.isCompleted} : s) 
      } : r
    );
    setRoutines(updatedRoutines); // Visual toggle, save if persistence needed for completion state
  };

  const handleToggleVoiceInput = (micField: ActiveMicField) => {
    if (!recognitionRef.current) {
      toast({ title: "Micro non supporté", description: "La saisie vocale n'est pas disponible sur ce navigateur.", variant: "destructive" });
      return;
    }
    if (isListening && activeMicField === micField) {
      setIsListening(false); // Stop current listening
    } else {
      setActiveMicField(micField);
      setIsListening(true); // Start listening for this field
    }
  };

  const triggerGenieSuggestions = async () => {
    if (!suggestionGoal.trim()) {
      toast({ title: "Objectif manquant", description: "Veuillez indiquer au Génie quel est votre objectif pour cette routine.", variant: "destructive" });
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

      const suggestedSteps: RoutineStep[] = result.steps.map(stepText => ({
        id: crypto.randomUUID(),
        text: stepText,
        isCompleted: false,
      }));

      const newSuggestedRoutine: Routine = {
        id: crypto.randomUUID(),
        name: result.name || `Suggestion du Génie pour "${suggestionGoal}"`,
        description: result.description,
        days: result.days || [],
        steps: suggestedSteps,
        isSuggestion: true,
      };
      saveRoutines([...routines, newSuggestedRoutine]);
      toast({ title: "Suggestion du Génie ajoutée!", description: `La routine "${newSuggestedRoutine.name}" a été ajoutée à votre liste.` });
      setSuggestionGoal('');
    } catch (error) {
      console.error("Error getting routine suggestions:", error);
      toast({ title: "Erreur de suggestion", description: "Le Génie n'a pas pu suggérer de routine. Essayez à nouveau.", variant: "destructive" });
    } finally {
      setIsFetchingSuggestions(false);
    }
  };
  
  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie vous laisse maître de vos routines, mais peut donner un coup de pouce si demandé.";
    if (intensity <= 4) return "Le Génie peut vous aider à structurer vos routines avec des suggestions pertinentes.";
    return "Le Génie est prêt à vous guider de manière plus directive pour optimiser vos routines !";
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
            <Info className="h-8 w-8"/> RoutineBuilder Magique {/* Placeholder Icon */}
        </CardTitle>
        <CardDescription>Organisez votre quotidien avec des routines personnalisées. Le Génie vous aide à construire des habitudes solides, adaptées à votre énergie.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        <p className="text-sm text-muted-foreground text-center -mt-2 h-5">{intensityDescription()}</p>

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
                  disabled={isListening && activeMicField !== 'newRoutineName'}
                />
                <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput('newRoutineName')} aria-label="Dicter le nom"
                  className={isListening && activeMicField === 'newRoutineName' ? 'text-red-500 animate-pulse' : ''}
                  disabled={isListening && activeMicField !== 'newRoutineName'}
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
                  disabled={isListening && activeMicField !== 'newRoutineDescription'}
                />
                 <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput('newRoutineDescription')} aria-label="Dicter la description"
                  className={isListening && activeMicField === 'newRoutineDescription' ? 'text-red-500 animate-pulse' : ''}
                  disabled={isListening && activeMicField !== 'newRoutineDescription'}
                 >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <Button type="submit" className="w-full sm:w-auto" disabled={isListening || isFetchingSuggestions}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Ajouter la Routine
                </Button>
                
                <AlertDialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isListening || isFetchingSuggestions}>
                        {isFetchingSuggestions ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                        Suggestions du Génie
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Quel est votre objectif pour cette routine ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Décrivez brièvement ce que vous voulez accomplir avec cette nouvelle routine (ex: "être plus productif le matin", "me détendre avant de dormir", "planifier mes séances de sport").
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
                        <span className="flex items-center gap-2">{routine.name} {routine.isSuggestion && <Wand2 className="h-4 w-4 text-primary"/>}</span>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteRoutine(routine.id);}} aria-label="Supprimer la routine">
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
                              />
                            <Input
                              value={step.text}
                              onChange={(e) => handleStepTextChange(routine.id, step.id, e.target.value)}
                              className={`flex-grow bg-transparent border-0 focus:ring-0 ${step.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                              placeholder="Description de l'étape"
                              disabled={isListening && activeMicField !== `editStep_${routine.id}_${step.id}`}
                            />
                            {/* Voice input for existing steps could be added if needed, similar to new steps but targeting specific step */}
                            {/* <Button variant="ghost" size="icon" onClick={() => handleToggleVoiceInput(`editStep_${routine.id}_${step.id}`)} aria-label="Dicter l'étape"
                              className={isListening && activeMicField === `editStep_${routine.id}_${step.id}` ? 'text-red-500 animate-pulse' : ''}
                              disabled={isListening && activeMicField !== `editStep_${routine.id}_${step.id}`}
                            >
                                <Mic className="h-4 w-4" />
                            </Button> */}
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(routine.id, step.id)} aria-label="Supprimer l'étape">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <form className="mt-3 flex items-center gap-1" onSubmit={(e) => {e.preventDefault(); handleAddStep(routine.id)}}>
                        <Input
                          value={newStepText[routine.id] || ''}
                          onChange={(e) => setNewStepText(prev => ({ ...prev, [routine.id]: e.target.value }))}
                          placeholder="Nouvelle étape..."
                          className="flex-grow"
                          disabled={isListening && activeMicField !== `newStep_${routine.id}`}
                        />
                         <Button variant="ghost" size="icon" type="button" onClick={() => handleToggleVoiceInput(`newStep_${routine.id}`)} aria-label="Dicter la nouvelle étape"
                            className={isListening && activeMicField === `newStep_${routine.id}` ? 'text-red-500 animate-pulse' : ''}
                            disabled={isListening && activeMicField !== `newStep_${routine.id}`}
                          >
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button type="submit" size="sm" variant="outline" disabled={isListening}>
                          <PlusCircle className="h-4 w-4 mr-1"/> Ajouter
                        </Button>
                      </form>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
         {routines.length === 0 && !isFetchingSuggestions && <p className="text-center text-muted-foreground mt-6">Commencez par créer votre première routine ou demandez une suggestion au Génie !</p>}
         {isFetchingSuggestions && <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin text-primary"/> <p className="ml-2">Le Génie prépare une routine...</p></div>}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Conseil du Génie : La régularité est la clé ! Vos routines sont sauvegardées localement dans votre navigateur.
        </p>
      </CardFooter>
    </Card>
  );
}
