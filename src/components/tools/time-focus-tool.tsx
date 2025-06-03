
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Play, Pause, RotateCcw, BellRing, SkipForward, Brain, Coffee } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";

type TimerMode = 'work' | 'shortBreak' | 'longBreak';
interface TimerState {
  isRunning: boolean;
  timeLeft: number; // in seconds
  currentMode: TimerMode;
  pomodorosInCycle: number; // Number of work sessions before a long break
  currentPomodoroCycle: number; // Current pomodoro in the cycle
  totalPomodorosCompleted: number;
}

const DEFAULT_WORK_DURATION = 25 * 60; // 25 minutes
const DEFAULT_SHORT_BREAK_DURATION = 5 * 60; // 5 minutes
const DEFAULT_LONG_BREAK_DURATION = 15 * 60; // 15 minutes
const DEFAULT_POMODOROS_PER_CYCLE = 4;

export function TimeFocusTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [taskName, setTaskName] = useState<string>('');

  // User configurable durations (for intensity 4+)
  const [configWorkDuration, setConfigWorkDuration] = useState<number>(DEFAULT_WORK_DURATION / 60);
  const [configShortBreakDuration, setConfigShortBreakDuration] = useState<number>(DEFAULT_SHORT_BREAK_DURATION / 60);
  const [configLongBreakDuration, setConfigLongBreakDuration] = useState<number>(DEFAULT_LONG_BREAK_DURATION / 60);
  const [configPomodorosPerCycle, setConfigPomodorosPerCycle] = useState<number>(DEFAULT_POMODOROS_PER_CYCLE);
  
  const [timerState, setTimerState] = useState<TimerState>({
    isRunning: false,
    timeLeft: DEFAULT_WORK_DURATION,
    currentMode: 'work',
    pomodorosInCycle: DEFAULT_POMODOROS_PER_CYCLE,
    currentPomodoroCycle: 1,
    totalPomodorosCompleted: 0,
  });

  const { toast } = useToast();
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMessage, setCompletionMessage] = useState({ title: '', description: '' });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/timer-complete.mp3'); // Placeholder, ensure this sound exists if used
    }
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.warn("Error playing sound:", e));
    }
  };

  const handleSessionCompletion = useCallback(() => {
    playNotificationSound();
    setTimerState(prev => ({ ...prev, isRunning: false }));

    let nextMode: TimerMode = 'work';
    let newTimeLeft = configWorkDuration * 60;
    let newCurrentPomodoroCycle = timerState.currentPomodoroCycle;
    let newTotalPomodorosCompleted = timerState.totalPomodorosCompleted;
    let dialogTitle = '';
    let dialogDescription = '';

    if (timerState.currentMode === 'work') {
      newTotalPomodorosCompleted++;
      if (newTotalPomodorosCompleted % timerState.pomodorosInCycle === 0) {
        nextMode = 'longBreak';
        newTimeLeft = configLongBreakDuration * 60;
        dialogTitle = "Cycle Terminé ! Pause Longue Méritée !";
        dialogDescription = `Vous avez complété ${timerState.pomodorosInCycle} sessions de travail. Prenez une pause de ${configLongBreakDuration / 60} minutes.`;
      } else {
        nextMode = 'shortBreak';
        newTimeLeft = configShortBreakDuration * 60;
        dialogTitle = "Session de Travail Terminée !";
        dialogDescription = `Bravo ! Prenez une petite pause de ${configShortBreakDuration / 60} minutes.`;
      }
      newCurrentPomodoroCycle = timerState.currentPomodoroCycle < timerState.pomodorosInCycle ? timerState.currentPomodoroCycle + 1 : 1;
    } else { // currentMode was 'shortBreak' or 'longBreak'
      nextMode = 'work';
      newTimeLeft = configWorkDuration * 60;
      dialogTitle = "Pause Terminée !";
      dialogDescription = `Retour au travail pour une session de ${configWorkDuration / 60} minutes.`;
    }
    
    // For simple timer modes (intensity 1-2)
    if (intensity <= 2) {
      dialogTitle = "Temps écoulé !";
      dialogDescription = "Votre session de concentration est terminée.";
      // For simple mode, it just stops, doesn't cycle. User restarts manually.
      // To reset to initial state, we can do:
       setTimerState(prev => ({
        ...prev,
        isRunning: false,
        timeLeft: configWorkDuration * 60, // Reset to work duration
        currentMode: 'work',
        currentPomodoroCycle: 1,
        totalPomodorosCompleted: 0 // Or keep total if user wants to track across simple sessions
      }));
       setCompletionMessage({ title: dialogTitle, description: dialogDescription });
       setShowCompletionDialog(true);
      return; // Exit early for simple mode
    }


    setCompletionMessage({ title: dialogTitle, description: dialogDescription });
    setShowCompletionDialog(true);

    setTimerState(prev => ({
      ...prev,
      timeLeft: newTimeLeft,
      currentMode: nextMode,
      currentPomodoroCycle: newCurrentPomodoroCycle,
      totalPomodorosCompleted: newTotalPomodorosCompleted,
    }));

  }, [timerState, intensity, configWorkDuration, configShortBreakDuration, configLongBreakDuration ]);


  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      timerId.current = setTimeout(() => {
        setTimerState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (timerState.isRunning && timerState.timeLeft === 0) {
      handleSessionCompletion();
    }
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [timerState.isRunning, timerState.timeLeft, handleSessionCompletion]);


  useEffect(() => {
    // Update timer durations based on intensity
    let work = DEFAULT_WORK_DURATION / 60;
    let short = DEFAULT_SHORT_BREAK_DURATION / 60;
    let long = DEFAULT_LONG_BREAK_DURATION / 60;
    let cycle = DEFAULT_POMODOROS_PER_CYCLE;

    if (intensity === 1) { // Minimal - User defines one long session
        // Duration is set by configWorkDuration (which user can change)
        work = configWorkDuration; // User sets this
    } else if (intensity === 2) { // Modéré - Simple Pomodoro (25/5)
        work = 25; short = 5; long = 15; cycle = 4;
    } else if (intensity === 3) { // Standard - Pomodoro classique (25/5)
        work = 25; short = 5; long = 15; cycle = 4;
    } else if (intensity === 4) { // Intensif - Pomodoro Configurable
        // User values from configWorkDuration etc. are used
        work = configWorkDuration; short = configShortBreakDuration; long = configLongBreakDuration; cycle = configPomodorosPerCycle;
    } else if (intensity === 5) { // Maximum - Hyperfocus
        work = Math.max(configWorkDuration, 45); // Default to at least 45 min for hyperfocus
        short = configShortBreakDuration / 2 > 1 ? configShortBreakDuration /2 : 3; // Shorter short breaks
        long = configLongBreakDuration / 2 > 5 ? configLongBreakDuration / 2: 10 ; // Shorter long breaks
        cycle = configPomodorosPerCycle + 2; // More sessions before long break
    }
    
    setConfigWorkDuration(work);
    setConfigShortBreakDuration(short);
    setConfigLongBreakDuration(long);
    setConfigPomodorosPerCycle(cycle);
    
    // If not running, reset timeLeft to the new work duration (or current mode duration if applicable)
    if (!timerState.isRunning) {
        let newTimeLeft = work * 60;
        if (timerState.currentMode === 'shortBreak') newTimeLeft = short * 60;
        else if (timerState.currentMode === 'longBreak') newTimeLeft = long * 60;
        
         setTimerState(prev => ({
            ...prev,
            timeLeft: newTimeLeft,
            pomodorosInCycle: cycle,
         }));
    }
  }, [intensity, timerState.isRunning]); // configWorkDuration removed from deps to avoid loop, handled by its own setter.
                                         // Add pomodorosInCycle to deps if it changes based on intensity directly here.


  const handleStartPause = () => {
    if (timerState.timeLeft === 0 && !timerState.isRunning) { // Timer finished, user clicks start (or "Start Next Session")
      // This will effectively start the next session determined by handleSessionCompletion's logic
      // if it was manually paused after completion dialog.
      // Or, if it auto-paused, this restarts the new session.
      setShowCompletionDialog(false); // Close dialog if open
      setTimerState(prev => ({ ...prev, isRunning: true }));
    } else {
      setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    }
  };

  const handleReset = () => {
    if (timerId.current) clearTimeout(timerId.current);
    let initialTimeLeft = configWorkDuration * 60;
     if (intensity <= 2) { // simple timer
        initialTimeLeft = configWorkDuration * 60;
     } else { // pomodoro modes
        initialTimeLeft = configWorkDuration * 60;
     }

    setTimerState({
      isRunning: false,
      timeLeft: initialTimeLeft,
      currentMode: 'work',
      pomodorosInCycle: configPomodorosPerCycle,
      currentPomodoroCycle: 1,
      totalPomodorosCompleted: 0,
    });
    setShowCompletionDialog(false);
  };

  const handleSkipBreak = () => {
    if (timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') {
      if (timerId.current) clearTimeout(timerId.current);
      setTimerState(prev => ({
        ...prev,
        isRunning: false, // Pause before starting next work session
        timeLeft: configWorkDuration * 60,
        currentMode: 'work',
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
  
  const getCurrentModeDuration = () => {
    switch (timerState.currentMode) {
      case 'work': return configWorkDuration * 60;
      case 'shortBreak': return configShortBreakDuration * 60;
      case 'longBreak': return configLongBreakDuration * 60;
      default: return configWorkDuration * 60;
    }
  };

  const progressPercentage = ((getCurrentModeDuration() - timerState.timeLeft) / getCurrentModeDuration()) * 100;

  const getIntensityDescription = () => {
    switch (intensity) {
      case 1: return "Minuteur simple. Concentrez-vous sur une tâche à la fois.";
      case 2: return "Mode Pomodoro léger (25min travail / 5min pause).";
      case 3: return "Pomodoro classique (25min travail / 5min pause), 4 cycles avant pause longue.";
      case 4: return "Pomodoro configurable. Ajustez les durées ci-dessous.";
      case 5: return "Mode Hyper-Concentration. Sessions longues, pauses minimales.";
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


  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl text-center">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div className="flex-grow">
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
        <div>
          <Label htmlFor="taskName">Nom de la tâche (optionnel) :</Label>
          <Input
            id="taskName"
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Sur quoi travaillez-vous ?"
            className="mt-1"
            disabled={timerState.isRunning}
          />
        </div>

        {intensity >= 4 && ( // Configuration options for higher intensities
          <Card className="p-4 bg-muted/50">
            <CardTitle className="text-md mb-3 text-center">Configuration Pomodoro</CardTitle>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="workDurationConfig" className="text-xs">Travail (min)</Label>
                <Input id="workDurationConfig" type="number" value={configWorkDuration} onChange={e => setConfigWorkDuration(Math.max(1, +e.target.value))} min="1" disabled={timerState.isRunning} className="h-8"/>
              </div>
              <div>
                <Label htmlFor="shortBreakDurationConfig" className="text-xs">Pause Courte (min)</Label>
                <Input id="shortBreakDurationConfig" type="number" value={configShortBreakDuration} onChange={e => setConfigShortBreakDuration(Math.max(1, +e.target.value))} min="1" disabled={timerState.isRunning} className="h-8"/>
              </div>
              <div>
                <Label htmlFor="longBreakDurationConfig" className="text-xs">Pause Longue (min)</Label>
                <Input id="longBreakDurationConfig" type="number" value={configLongBreakDuration} onChange={e => setConfigLongBreakDuration(Math.max(1, +e.target.value))} min="1" disabled={timerState.isRunning} className="h-8"/>
              </div>
              <div>
                <Label htmlFor="pomodorosPerCycleConfig" className="text-xs">Cycles / Pause Longue</Label>
                <Input id="pomodorosPerCycleConfig" type="number" value={configPomodorosPerCycle} onChange={e => setConfigPomodorosPerCycle(Math.max(1, +e.target.value))} min="1" disabled={timerState.isRunning} className="h-8"/>
              </div>
            </div>
          </Card>
        )}
        
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
            {intensity > 2 && (
                <p className="text-sm text-muted-foreground mt-3">
                    Session {timerState.currentPomodoroCycle} / {timerState.pomodorosInCycle} | Total : {timerState.totalPomodorosCompleted}
                </p>
            )}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={handleStartPause} size="lg" className="w-full sm:w-36 text-lg py-3">
            {timerState.isRunning ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
            {timerState.isRunning ? 'Pause' : (timerState.timeLeft === 0 ? 'Session Suivante' : 'Démarrer')}
          </Button>
          <Button onClick={handleReset} variant="outline" size="lg" className="w-full sm:w-36 text-lg py-3">
            <RotateCcw className="mr-2 h-6 w-6" /> Réinitialiser
          </Button>
          {(timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') && intensity > 2 && (
            <Button onClick={handleSkipBreak} variant="secondary" size="lg" className="w-full sm:w-36 text-lg py-3" disabled={timerState.isRunning}>
                <SkipForward className="mr-2 h-6 w-6" /> Passer Pause
            </Button>
          )}
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
                // Optionally auto-start next session or require manual start
                if (intensity > 2 && timerState.timeLeft > 0) { // Only auto-start if not simple timer and not already reset
                   // setTimerState(prev => ({ ...prev, isRunning: true }));
                }
            }}>
                OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

    