
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
import { PlusCircle, Trash2, Edit3, Wand2, Mic, Save, UploadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Routine, RoutineStep, DayOfWeek } from '@/types';

const ROUTINE_BUILDER_STORAGE_KEY = "easyGenieRoutineBuilder";
const DAYS_OF_WEEK: DayOfWeek[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function RoutineBuilderTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [newRoutineName, setNewRoutineName] = useState<string>('');
  const [newRoutineDescription, setNewRoutineDescription] = useState<string>('');
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [newStepText, setNewStepText] = useState<{ [routineId: string]: string }>({});

  const { toast } = useToast();
  // Refs for voice input (placeholders for now)
  const routineNameRecognitionRef = useRef<any>(null);
  const routineDescRecognitionRef = useRef<any>(null);
  const stepTextRecognitionRef = useRef<any>(null);


  useEffect(() => {
    const savedRoutines = localStorage.getItem(ROUTINE_BUILDER_STORAGE_KEY);
    if (savedRoutines) {
      setRoutines(JSON.parse(savedRoutines));
    }
    // Placeholder for SpeechRecognition initialization for multiple inputs
  }, []);

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
        return { ...r, days: newDays.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b)) };
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
    // For now, just visual, could be used for tracking later
    const updatedRoutines = routines.map(r => 
      r.id === routineId ? { 
        ...r, 
        steps: r.steps.map(s => s.id === stepId ? {...s, isCompleted: !s.isCompleted} : s) 
      } : r
    );
    // No saveRoutines here if it's just a visual toggle for an "active" session
    setRoutines(updatedRoutines); 
  };


  // Placeholder functions for voice input
  const handleVoiceInput = (inputType: 'routineName' | 'routineDesc' | `stepText_${string}`) => {
    toast({ title: "Saisie vocale (Bientôt !)", description: "Cette fonctionnalité arrive bientôt pour remplir les champs." });
    // Logic for specific input field would go here, e.g. using setInputText(transcript)
  };

  const handleGenieSuggestions = () => {
    let suggestion = "Le Génie est en pause café.";
    if (intensity >= 3 && intensity <= 4) {
      suggestion = "Le Génie suggère: 'Routine Matinale: 1. Réveil & Hydratation, 2. Méditation 10min, 3. Planification de la journée'.";
    } else if (intensity >= 5) {
      suggestion = "Le Génie insiste: 'Routine de Soir Extrême: 1. Zéro écran 1h avant coucher, 2. Lecture apaisante 30min, 3. Sommeil réparateur 8h MINIMUM!'.";
    }
    toast({ title: "Suggestion du Génie (Démo)", description: suggestion, duration: 7000 });
    // Future: Call Genkit flow: createRoutineSuggestionsFlow({goal: '...', intensity});
  };
  
  const intensityDescription = () => {
    if (intensity <= 2) return "Le Génie vous laisse maître de vos routines.";
    if (intensity <= 4) return "Le Génie peut vous aider à structurer vos routines avec des suggestions.";
    return "Le Génie est prêt à vous guider de manière plus directive pour optimiser vos routines !";
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary flex items-center gap-2">
            <CalendarCheck className="h-8 w-8"/> RoutineBuilder Magique
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
              <div className="flex items-center gap-2">
                <Input
                  id="new-routine-name"
                  value={newRoutineName}
                  onChange={(e) => setNewRoutineName(e.target.value)}
                  placeholder="Ex: Routine du matin, Préparation semaine"
                  required
                  className="flex-grow"
                />
                <Button variant="ghost" size="icon" type="button" onClick={() => handleVoiceInput('routineName')} aria-label="Dicter le nom">
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="new-routine-description">Description (optionnel)</Label>
               <div className="flex items-center gap-2">
                <Textarea
                  id="new-routine-description"
                  value={newRoutineDescription}
                  onChange={(e) => setNewRoutineDescription(e.target.value)}
                  placeholder="Ex: Pour démarrer la journée avec énergie et focus"
                  rows={2}
                  className="flex-grow"
                />
                 <Button variant="ghost" size="icon" type="button" onClick={() => handleVoiceInput('routineDesc')} aria-label="Dicter la description">
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <Button type="submit" className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-5 w-5" /> Ajouter la Routine
                </Button>
                <Button type="button" variant="outline" onClick={handleGenieSuggestions} className="w-full sm:w-auto">
                    <Wand2 className="mr-2 h-5 w-5" /> Suggestions du Génie
                </Button>
            </div>
          </form>
        </Card>

        {routines.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-foreground mt-6">Mes Routines</h3>
            <Accordion type="single" collapsible className="w-full">
              {routines.map((routine) => (
                <AccordionItem value={routine.id} key={routine.id} className="bg-card border rounded-lg mb-3 shadow">
                  <AccordionTrigger className="px-4 py-3 text-lg hover:no-underline">
                    <div className="flex justify-between items-center w-full">
                        <span>{routine.name}</span>
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
                        {DAYS_OF_WEEK.map(day => (
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
                          <li key={step.id} className="flex items-center gap-2 p-2 border rounded-md bg-background hover:bg-muted/50">
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
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleVoiceInput(`stepText_${step.id}`)} aria-label="Dicter l'étape">
                                <Mic className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteStep(routine.id, step.id)} aria-label="Supprimer l'étape">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <form className="mt-3 flex items-center gap-2" onSubmit={(e) => {e.preventDefault(); handleAddStep(routine.id)}}>
                        <Input
                          value={newStepText[routine.id] || ''}
                          onChange={(e) => setNewStepText(prev => ({ ...prev, [routine.id]: e.target.value }))}
                          placeholder="Nouvelle étape..."
                          className="flex-grow"
                        />
                         <Button variant="ghost" size="icon" type="button" onClick={() => handleVoiceInput(`stepText_new_${routine.id}`)} aria-label="Dicter la nouvelle étape">
                            <Mic className="h-5 w-5" />
                        </Button>
                        <Button type="submit" size="sm" variant="outline">
                          <PlusCircle className="h-4 w-4 mr-1"/> Ajouter Étape
                        </Button>
                      </form>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
         {routines.length === 0 && <p className="text-center text-muted-foreground mt-6">Commencez par créer votre première routine !</p>}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground text-center w-full">
          Conseil du Génie : La régularité est la clé ! Vos routines sont sauvegardées localement dans votre navigateur.
        </p>
      </CardFooter>
    </Card>
  );
}
