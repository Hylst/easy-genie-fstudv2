
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Play, Pause, RotateCcw, BellRing, SkipForward, Brain, Coffee, ListChecks, Save, Trash2, Loader2, Volume2, VolumeX } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { TimeFocusPreset, CreateTimeFocusPresetDTO, TimeFocusSystemPreset, TimeFocusDisplayPreset } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getAllTimeFocusPresets, addTimeFocusPreset, deleteTimeFocusPreset } from '@/services/appDataService';


type TimerMode = 'work' | 'shortBreak' | 'longBreak';
interface TimerState {
  isRunning: boolean;
  timeLeft: number; // in seconds
  currentMode: TimerMode;
  pomodorosInCycle: number;
  currentPomodoroCycle: number;
  totalPomodorosCompleted: number;
  lastTickPlayedAt: number; 
  halfwayNotified: boolean; 
}

const DEFAULT_WORK_DURATION_MIN = 25;
const DEFAULT_SHORT_BREAK_DURATION_MIN = 5;
const DEFAULT_LONG_BREAK_DURATION_MIN = 15;
const DEFAULT_POMODOROS_PER_CYCLE = 4;

const SOUND_ENABLED_KEY = "easyGenieTimeFocusSoundEnabled_v1";

const systemTimeFocusPresets: TimeFocusSystemPreset[] = [
  { id: 's_classic', name: "Pomodoro Classique", work: 25, short: 5, long: 15, cycle: 4 },
  { id: 's_focus_long', name: "Focus Long", work: 50, short: 10, long: 20, cycle: 2 },
  { id: 's_revision', name: "Révision Rapide", work: 15, short: 3, long: 10, cycle: 4 },
  { id: 's_ultra_short', name: "Micro-Sessions", work: 10, short: 2, long: 5, cycle: 5 },
];


export function TimeFocusTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [taskName, setTaskName] = useState<string>('');
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  const [configWorkDuration, setConfigWorkDuration] = useState<number>(DEFAULT_WORK_DURATION_MIN);
  const [configShortBreakDuration, setConfigShortBreakDuration] = useState<number>(DEFAULT_SHORT_BREAK_DURATION_MIN);
  const [configLongBreakDuration, setConfigLongBreakDuration] = useState<number>(DEFAULT_LONG_BREAK_DURATION_MIN);
  const [configPomodorosPerCycle, setConfigPomodorosPerCycle] = useState<number>(DEFAULT_POMODOROS_PER_CYCLE);

  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    timeLeft: configWorkDuration * 60,
    currentMode: 'work',
    pomodorosInCycle: configPomodorosPerCycle,
    currentPomodoroCycle: 1,
    totalPomodorosCompleted: 0,
    lastTickPlayedAt: 0,
    halfwayNotified: false,
  });

  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);


  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMessage, setCompletionMessage] = useState({ title: '', description: '' });

  const [userPresets, setUserPresets] = useState<TimeFocusPreset[]>([]);
  const [isLoadingUserPresets, setIsLoadingUserPresets] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSoundPreference = localStorage.getItem(SOUND_ENABLED_KEY);
      if (savedSoundPreference !== null) {
        setIsSoundEnabled(JSON.parse(savedSoundPreference));
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(isSoundEnabled));
    }
  }, [isSoundEnabled]);


  const fetchUserPresets = useCallback(async () => {
    if (!user) {
      setUserPresets([]);
      return;
    }
    setIsLoadingUserPresets(true);
    try {
      const presets = await getAllTimeFocusPresets();
      setUserPresets(presets);
    } catch (error) {
      console.error("Error fetching TimeFocus presets:", error);
      toast({ title: "Erreur de chargement des presets", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingUserPresets(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchUserPresets();
  }, [fetchUserPresets, isOnline]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn("Web Audio API is not supported or could not be initialized.", e);
        setIsSoundEnabled(false); // Disable sound if context fails
        toast({title: "Audio non supporté", description: "Les sons du minuteur sont désactivés.", variant: "destructive"});
      }
    }
    return () => {
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.warn("Error closing AudioContext:", e));
            audioContextRef.current = null;
        }
    };
  }, []);

  const playGeneratedSound = useCallback((type: 'tick' | 'halfway' | 'endBell' | 'startRace') => {
    if (!isSoundEnabled || !audioContextRef.current) return;
    const ac = audioContextRef.current;
    if (ac.state === 'suspended') {
      ac.resume().catch(e => console.warn("Failed to resume audio context:", e));
    }
    // Check again after attempting resume
    if (ac.state !== 'running') {
        console.warn("AudioContext not running. Sound not played for type:", type);
        return;
    }

    const createTone = (freq: number, dur: number, vol: number, oscType: OscillatorType = 'sine', atk: number = 0.01, dcy: number = 0.09, startTimeOffset: number = 0) => {
      try {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, ac.currentTime + startTimeOffset);
        gain.gain.setValueAtTime(0, ac.currentTime + startTimeOffset);
        gain.gain.linearRampToValueAtTime(vol, ac.currentTime + startTimeOffset + atk);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startTimeOffset + dur);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(ac.currentTime + startTimeOffset);
        osc.stop(ac.currentTime + startTimeOffset + dur);
      } catch (e) {
        console.error("Error playing generated sound:", e);
      }
    };
    
    if (type === 'tick') {
      createTone(1000, 0.05, 0.3, 'triangle', 0.01, 0.04);
    } else if (type === 'halfway') {
      createTone(600, 0.15, 0.4, 'square', 0.01, 0.1);
    } else if (type === 'endBell') {
      createTone(880, 0.8, 0.6, 'sine', 0.01, 0.7);
      createTone(880 * 1.5, 0.64, 0.24, 'triangle', 0.012, 0.56, 0.01); 
    } else if (type === 'startRace') {
      createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0);
      createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0.2);
      createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0.4);
      createTone(600, 0.5, 0.5, 'sine', 0.01, 0.4, 0.6);
    }
  }, [isSoundEnabled]);


  const getCurrentModeFullDuration = useCallback(() => {
    switch (timerState.currentMode) {
      case 'work': return configWorkDuration * 60;
      case 'shortBreak': return configShortBreakDuration * 60;
      case 'longBreak': return configLongBreakDuration * 60;
      default: return configWorkDuration * 60;
    }
  }, [timerState.currentMode, configWorkDuration, configShortBreakDuration, configLongBreakDuration]);


  const handleSessionCompletion = useCallback(() => {
    playGeneratedSound('endBell');
    setTimerState(prev => ({ ...prev, isRunning: false }));

    let nextMode: TimerMode = 'work';
    let newTimeLeft = configWorkDuration * 60;
    let newCurrentPomodoroCycle = timerState.currentPomodoroCycle;
    let newTotalPomodorosCompleted = timerState.totalPomodorosCompleted;
    let dialogTitle = '';
    let dialogDescription = '';

    if (timerState.currentMode === 'work') {
      newTotalPomodorosCompleted++;
      if (newTotalPomodorosCompleted % timerState.pomodorosInCycle === 0 && intensity > 2) { 
        nextMode = 'longBreak';
        newTimeLeft = configLongBreakDuration * 60;
        dialogTitle = "Cycle Terminé ! Pause Longue Méritée !";
        dialogDescription = `Vous avez complété ${timerState.pomodorosInCycle} sessions. Prenez une pause de ${configLongBreakDuration} minutes.`;
      } else if (intensity > 1) { 
        nextMode = 'shortBreak';
        newTimeLeft = configShortBreakDuration * 60;
        dialogTitle = "Session de Travail Terminée !";
        dialogDescription = `Bravo ! Prenez une petite pause de ${configShortBreakDuration} minutes.`;
      } else { 
        nextMode = 'work'; 
        newTimeLeft = configWorkDuration * 60;
        dialogTitle = "Temps écoulé !";
        dialogDescription = "Votre session de concentration est terminée.";
        newCurrentPomodoroCycle = 1;
        newTotalPomodorosCompleted = 0;
      }
      newCurrentPomodoroCycle = (intensity > 1 && newTotalPomodorosCompleted % timerState.pomodorosInCycle !== 0) ? timerState.currentPomodoroCycle + 1 : 1;
    } else { 
      nextMode = 'work';
      newTimeLeft = configWorkDuration * 60;
      dialogTitle = "Pause Terminée !";
      dialogDescription = `Retour au travail pour une session de ${configWorkDuration} minutes.`;
    }
    
    setCompletionMessage({ title: dialogTitle, description: dialogDescription });
    setShowCompletionDialog(true);

    setTimerState(prev => ({
      ...prev,
      timeLeft: newTimeLeft,
      currentMode: nextMode,
      currentPomodoroCycle: newCurrentPomodoroCycle,
      totalPomodorosCompleted: newTotalPomodorosCompleted,
      lastTickPlayedAt: newTimeLeft, 
      halfwayNotified: false,
    }));

  }, [timerState, intensity, configWorkDuration, configShortBreakDuration, configLongBreakDuration, playGeneratedSound]);


  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      timerId.current = setTimeout(() => {
        const newTimeLeft = timerState.timeLeft - 1;
        setTimerState(prev => ({ ...prev, timeLeft: newTimeLeft }));

        const fullDuration = getCurrentModeFullDuration();
        if (newTimeLeft > 0 && newTimeLeft < fullDuration && newTimeLeft % (5 * 60) === 0 && newTimeLeft !== timerState.lastTickPlayedAt) {
          playGeneratedSound('tick');
          setTimerState(prev => ({...prev, lastTickPlayedAt: newTimeLeft}));
        }
        if (!timerState.halfwayNotified && newTimeLeft > 0 && newTimeLeft <= Math.floor(fullDuration / 2) && (fullDuration / 2) > (2*60) ) {
          playGeneratedSound('halfway');
          setTimerState(prev => ({...prev, halfwayNotified: true}));
        }

      }, 1000);
    } else if (timerState.isRunning && timerState.timeLeft === 0) {
      handleSessionCompletion();
    }
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [timerState.isRunning, timerState.timeLeft, handleSessionCompletion, getCurrentModeFullDuration, timerState.lastTickPlayedAt, timerState.halfwayNotified, playGeneratedSound]);


  useEffect(() => {
    let workMin = configWorkDuration;
    let shortMin = configShortBreakDuration;
    let longMin = configLongBreakDuration;
    let cycleCount = configPomodorosPerCycle;

    if (!timerState.isRunning) {
        if (intensity === 1) { // Simple Timer
            // No change needed to configWorkDuration, use what's there
            // No breaks or cycles enforced here.
        } else if (intensity === 2) { // Light Pomodoro
            workMin = 25; shortMin = 5; longMin = 15; cycleCount = 4;
        } else if (intensity === 3) { // Standard Pomodoro
            workMin = 25; shortMin = 5; longMin = 15; cycleCount = 4;
        } else if (intensity === 5) { // Hyperfocus
            workMin = Math.max(configWorkDuration, 45); // Suggest longer if current is less
            shortMin = Math.min(configShortBreakDuration, 5); // Suggest shorter
            longMin = Math.min(configLongBreakDuration, 10); // Suggest shorter
            cycleCount = Math.max(configPomodorosPerCycle, 2); // Suggest fewer for longer work
        }

        // For non-configurable modes, apply these defaults directly to config state
        if (intensity < 4) {
            setConfigWorkDuration(workMin);
            setConfigShortBreakDuration(shortMin);
            setConfigLongBreakDuration(longMin);
            setConfigPomodorosPerCycle(cycleCount);
        }
        
        let newTimeLeft;
        const currentModeDurationBasis = 
            timerState.currentMode === 'work' ? (intensity < 4 ? workMin : configWorkDuration)
            : timerState.currentMode === 'shortBreak' ? (intensity < 4 ? shortMin : configShortBreakDuration)
            : (intensity < 4 ? longMin : configLongBreakDuration);
        
        newTimeLeft = currentModeDurationBasis * 60;
        
        setTimerState(prev => ({
            ...prev,
            timeLeft: newTimeLeft,
            pomodorosInCycle: (intensity < 4 ? cycleCount : configPomodorosPerCycle),
            lastTickPlayedAt: newTimeLeft,
            halfwayNotified: false,
        }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, timerState.isRunning, timerState.currentMode]); 


  const handleStartPause = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(e => console.warn("AudioContext resume failed:", e));
    }
    if (timerState.timeLeft === 0 && !timerState.isRunning) { 
      setShowCompletionDialog(false);
      if (timerState.currentMode === 'work') playGeneratedSound('startRace');
      setTimerState(prev => ({ ...prev, isRunning: true, lastTickPlayedAt: prev.timeLeft, halfwayNotified: false }));
    } else if (!timerState.isRunning && timerState.currentMode === 'work' && timerState.timeLeft === configWorkDuration * 60){ 
      playGeneratedSound('startRace');
      setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    } else { 
      setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    }
  };

  const handleReset = () => {
    if (timerId.current) clearTimeout(timerId.current);
    const initialWorkDuration = (intensity < 4 && intensity !== 1) ? 25 : configWorkDuration;

    setTimerState({
      isRunning: false,
      timeLeft: initialWorkDuration * 60,
      currentMode: 'work',
      pomodorosInCycle: (intensity < 4 && intensity !== 1) ? 4 : configPomodorosPerCycle,
      currentPomodoroCycle: 1,
      totalPomodorosCompleted: 0,
      lastTickPlayedAt: initialWorkDuration * 60,
      halfwayNotified: false,
    });
    setShowCompletionDialog(false);
  };

  const handleSkipBreak = () => {
    if (timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') {
      if (timerId.current) clearTimeout(timerId.current);
      const newTimeLeft = configWorkDuration * 60;
      setTimerState(prev => ({
        ...prev,
        isRunning: false,
        timeLeft: newTimeLeft,
        currentMode: 'work',
        lastTickPlayedAt: newTimeLeft,
        halfwayNotified: false,
      }));
      setShowCompletionDialog(false);
      toast({title: "Pause Passée", description: "Préparation de la prochaine session de travail."});
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = ((getCurrentModeFullDuration() - timerState.timeLeft) / getCurrentModeFullDuration()) * 100;

  const getIntensityDescription = () => {
    switch (intensity) {
      case 1: return "Minuteur simple. Définissez une durée et concentrez-vous.";
      case 2: return "Pomodoro léger (par défaut 25min travail / 5min pause).";
      case 3: return "Pomodoro classique (25min travail / 5min pause), 4 cycles avant pause longue.";
      case 4: return "Pomodoro configurable. Ajustez les durées ci-dessous ou chargez un preset.";
      case 5: return "Mode Hyper-Concentration. Sessions longues, pauses minimales. Configurable.";
      default: return "Ajustez le niveau de magie pour adapter le minuteur.";
    }
  };

  const getModeDisplay = () => {
    switch(timerState.currentMode) {
        case 'work': return "Travail";
        case 'shortBreak': return "Pause Courte";
        case 'longBreak': return "Pause Longue";
        default: return "";
    }
  };

  const handleLoadPreset = (preset: TimeFocusDisplayPreset) => {
    setConfigWorkDuration(preset.work);
    setConfigShortBreakDuration(preset.short);
    setConfigLongBreakDuration(preset.long);
    setConfigPomodorosPerCycle(preset.cycle);

    if (intensity < 4) setIntensity(4);

    const newTimeLeft = preset.work * 60;
    setTimerState(prev => ({
        ...prev,
        isRunning: false,
        timeLeft: newTimeLeft,
        currentMode: 'work',
        pomodorosInCycle: preset.cycle,
        currentPomodoroCycle: 1,
        totalPomodorosCompleted: 0,
        lastTickPlayedAt: newTimeLeft,
        halfwayNotified: false,
    }));
    setShowPresetDialog(false);
    toast({title: `Preset "${preset.name}" chargé!`});
  };

  const handleSavePreset = async () => {
    if (!user) {
      toast({ title: "Non connecté", description: "Veuillez vous connecter pour sauvegarder des presets.", variant: "destructive" });
      return;
    }
    if (!newPresetName.trim()) {
      toast({ title: "Nom de preset requis", variant: "destructive" });
      return;
    }
    const presetDto: CreateTimeFocusPresetDTO = {
      name: newPresetName,
      work_duration_minutes: configWorkDuration,
      short_break_minutes: configShortBreakDuration,
      long_break_minutes: configLongBreakDuration,
      pomodoros_per_cycle: configPomodorosPerCycle,
    };
    try {
      await addTimeFocusPreset(presetDto);
      await fetchUserPresets(); 
      toast({ title: "Preset sauvegardé!" });
      setShowSavePresetDialog(false);
      setNewPresetName('');
    } catch (error) {
      console.error("Error saving preset:", error);
      toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteUserPreset = async (presetId: string) => {
     if (!user) return;
     try {
        await deleteTimeFocusPreset(presetId);
        await fetchUserPresets();
        toast({title: "Preset supprimé", variant: "destructive"});
     } catch (error) {
        console.error("Error deleting preset:", error);
        toast({title: "Erreur de suppression", description: (error as Error).message, variant: "destructive"});
     }
  };

  const allDisplayPresets: TimeFocusDisplayPreset[] = [
    ...systemTimeFocusPresets.map(p => ({...p, isCustom: false})),
    ...userPresets.map(p => ({
        id: p.id,
        name: p.name,
        work: p.work_duration_minutes,
        short: p.short_break_minutes,
        long: p.long_break_minutes,
        cycle: p.pomodoros_per_cycle,
        isCustom: true,
    }))
  ];

  const handleToggleSound = () => {
    setIsSoundEnabled(prev => !prev);
    toast({ title: `Sons ${!isSoundEnabled ? "activés" : "désactivés"}` });
  };

  const isConfigEditable = !timerState.isRunning && intensity >= 4;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl text-center">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div className="flex-grow text-left md:text-center">
                <CardTitle className="text-3xl font-bold text-primary">TimeFocus Magique</CardTitle>
                <CardDescription>
                  {getIntensityDescription()}
                </CardDescription>
            </div>
             <div className="w-full md:w-auto md:min-w-[200px] md:max-w-[250px] shrink-0">
                <IntensitySelector value={intensity} onChange={setIntensity} />
            </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="my-8 p-6 rounded-lg bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-inner">
            <div className="flex items-center justify-center mb-2">
                {timerState.currentMode === 'work' && <Brain className="h-6 w-6 text-primary mr-2" />}
                {timerState.currentMode !== 'work' && <Coffee className="h-6 w-6 text-accent-foreground mr-2" />}
                <p className="text-xl font-semibold text-foreground">
                    Mode Actuel : {getModeDisplay()}
                </p>
            </div>
            <div className={`text-7xl font-mono font-bold tabular-nums mb-3
                ${timerState.currentMode === 'work' ? 'text-primary-foreground bg-primary/90' : 'text-accent-foreground bg-accent/80'}
                p-4 rounded-md shadow-lg`}>
                {formatTime(timerState.timeLeft)}
            </div>
            <Progress value={progressPercentage} className="w-full h-3" />
            {intensity > 1 && ( 
                <p className="text-sm text-muted-foreground mt-3">
                    Session {timerState.currentPomodoroCycle} / {timerState.pomodorosInCycle} | Total : {timerState.totalPomodorosCompleted}
                </p>
            )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button onClick={handleStartPause} size="lg" className="w-full sm:w-auto flex-1 text-lg py-3">
            {timerState.isRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
            {timerState.isRunning ? 'Pause' : (timerState.timeLeft === 0 ? 'Session Suivante' : 'Démarrer')}
          </Button>
          <Button onClick={handleReset} variant="outline" size="lg" className="w-full sm:w-auto flex-1 text-lg py-3">
            <RotateCcw className="mr-2 h-6 w-6" /> Réinitialiser
          </Button>
        </div>
        {(timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') && intensity > 1 && ( 
            <Button onClick={handleSkipBreak} variant="secondary" size="lg" className="w-full mt-2 text-lg py-3" disabled={timerState.isRunning}>
                <SkipForward className="mr-2 h-6 w-6" /> Passer la Pause
            </Button>
        )}
        
        <div className="mt-8 pt-6 border-t space-y-6">
            <div>
              <Label htmlFor="taskName">Nom de la tâche (optionnel) :</Label>
              <Input
                id="taskName"
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Sur quoi travaillez-vous ?"
                className="mt-1 transition-all duration-200 ease-in-out hover:shadow-lg hover:animate-subtle-shake transform hover:scale-[1.01]"
                disabled={timerState.isRunning}
              />
            </div>

            {(intensity >= 4) && (
              <Card className="p-4 bg-muted/50">
                <CardTitle className="text-md mb-3 text-center">Configuration Pomodoro Personnalisée</CardTitle>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div>
                    <Label htmlFor="workDurationConfig" className="text-xs">Travail (min)</Label>
                    <Input id="workDurationConfig" type="number" value={configWorkDuration} 
                           onChange={e => {
                               const val = Math.max(1, +e.target.value);
                               setConfigWorkDuration(val); 
                               if(!timerState.isRunning && timerState.currentMode === 'work') setTimerState(p => ({...p, timeLeft: val * 60, lastTickPlayedAt: val * 60, halfwayNotified: false}))
                           }} 
                           min="1" disabled={!isConfigEditable} className="h-8"/>
                  </div>
                  <div>
                    <Label htmlFor="shortBreakDurationConfig" className="text-xs">Pause Courte (min)</Label>
                    <Input id="shortBreakDurationConfig" type="number" value={configShortBreakDuration} 
                           onChange={e => {
                               const val = Math.max(1, +e.target.value);
                               setConfigShortBreakDuration(val); 
                               if(!timerState.isRunning && timerState.currentMode === 'shortBreak') setTimerState(p => ({...p, timeLeft: val * 60, lastTickPlayedAt: val * 60, halfwayNotified: false}))
                           }} 
                           min="1" disabled={!isConfigEditable} className="h-8"/>
                  </div>
                  <div>
                    <Label htmlFor="longBreakDurationConfig" className="text-xs">Pause Longue (min)</Label>
                    <Input id="longBreakDurationConfig" type="number" value={configLongBreakDuration} 
                           onChange={e => {
                               const val = Math.max(1, +e.target.value);
                               setConfigLongBreakDuration(val); 
                               if(!timerState.isRunning && timerState.currentMode === 'longBreak') setTimerState(p => ({...p, timeLeft: val * 60, lastTickPlayedAt: val * 60, halfwayNotified: false}))
                           }} 
                           min="1" disabled={!isConfigEditable} className="h-8"/>
                  </div>
                  <div>
                    <Label htmlFor="pomodorosPerCycleConfig" className="text-xs">Cycles / Pause Longue</Label>
                    <Input id="pomodorosPerCycleConfig" type="number" value={configPomodorosPerCycle} 
                           onChange={e => {
                               const val = Math.max(1, +e.target.value);
                               setConfigPomodorosPerCycle(val); 
                               if(!timerState.isRunning) setTimerState(p=>({...p, pomodorosInCycle: val }))
                           }} 
                           min="1" disabled={!isConfigEditable} className="h-8"/>
                  </div>
                </div>
                 <div className="mt-4 flex justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowSavePresetDialog(true)} disabled={timerState.isRunning || !user || intensity < 4}>
                        <Save className="mr-2 h-4 w-4" /> Sauvegarder Config
                    </Button>
                </div>
              </Card>
            )}
        </div>


         <Button variant="outline" onClick={() => setShowPresetDialog(true)} className="w-full" disabled={timerState.isRunning}>
            <ListChecks className="mr-2 h-4 w-4" /> Charger un Preset de Minuterie
        </Button>

        <div className="flex justify-center">
             <Button onClick={handleToggleSound} variant="ghost" size="icon" aria-label={isSoundEnabled ? "Désactiver les sons" : "Activer les sons"}>
                {isSoundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
             </Button>
        </div>

      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground mx-auto text-center w-full">
          {taskName ? `Concentration sur : "${taskName}"` : "Le Génie vous aide à maîtriser votre temps."}
        </p>
      </CardFooter>

      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
                <BellRing className="h-6 w-6 mr-2 text-primary" />
                {completionMessage.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {completionMessage.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
                setShowCompletionDialog(false);
            }}>
                OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Load Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Charger un Preset de Minuterie</DialogTitle>
            <DialogDescription>Choisissez une configuration pour démarrer rapidement.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3 -mr-3">
            {isLoadingUserPresets && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}
            {!isLoadingUserPresets && allDisplayPresets.length === 0 && <p className="text-muted-foreground p-4 text-center">Aucun preset disponible.</p>}
            {!isLoadingUserPresets && allDisplayPresets.length > 0 && (
                 <Accordion type="multiple" defaultValue={['system-presets', 'user-presets']} className="w-full">
                    <AccordionItem value="system-presets">
                        <AccordionTrigger>Presets Système ({systemTimeFocusPresets.length})</AccordionTrigger>
                        <AccordionContent>
                            {allDisplayPresets.filter(p => !p.isCustom).map(preset => (
                                <Button key={preset.id} variant="ghost" onClick={() => handleLoadPreset(preset)} className="w-full justify-start mb-1 h-auto py-2">
                                    <div>
                                        <p className="font-medium">{preset.name}</p>
                                        <p className="text-xs text-muted-foreground">T: {preset.work}m, PC: {preset.short}m, PL: {preset.long}m, Cycles: {preset.cycle}</p>
                                    </div>
                                </Button>
                            ))}
                        </AccordionContent>
                    </AccordionItem>
                    {user && (
                        <AccordionItem value="user-presets">
                            <AccordionTrigger>Mes Presets Personnalisés ({userPresets.length})</AccordionTrigger>
                            <AccordionContent>
                                {userPresets.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun preset personnalisé sauvegardé.</p>}
                                {allDisplayPresets.filter(p => p.isCustom).map(preset => (
                                    <div key={preset.id} className="flex items-center justify-between mb-1 pr-2 hover:bg-accent/50 rounded-md">
                                        <Button variant="ghost" onClick={() => handleLoadPreset(preset)} className="flex-grow justify-start text-left h-auto py-2">
                                            <div>
                                                <p className="font-medium">{preset.name}</p>
                                                <p className="text-xs text-muted-foreground">T: {preset.work}m, PC: {preset.short}m, PL: {preset.long}m, Cycles: {preset.cycle}</p>
                                            </div>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7 flex-shrink-0">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Supprimer ce preset ?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Êtes-vous sûr de vouloir supprimer le preset "{preset.name}" ?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUserPreset(preset.id)}>Supprimer</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                 </Accordion>
            )}
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sauvegarder la Configuration</DialogTitle>
            <DialogDescription>Donnez un nom à votre configuration actuelle du minuteur.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="presetName">Nom du Preset</Label>
            <Input
              id="presetName"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Ex: Focus Matin, Session Lecture"
            />
             <p className="text-xs text-muted-foreground mt-2">
                Sera sauvegardé avec : {configWorkDuration}min (travail), {configShortBreakDuration}min (courte), {configLongBreakDuration}min (longue), {configPomodorosPerCycle} cycles.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setNewPresetName('')}>Annuler</Button></DialogClose>
            <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </Card>
  );
}

    