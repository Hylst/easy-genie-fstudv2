
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Play, Pause, RotateCcw, BellRing, SkipForward, Brain, Coffee, ListChecks, Save, Trash2, Loader2, Volume2, VolumeX, Settings2, Music2, WandSparkles, MessageSquarePlus, Sparkles as SparklesIcon } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { TimeFocusPreset, CreateTimeFocusPresetDTO, TimeFocusSystemPreset, TimeFocusDisplayPreset, AmbientSound } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getAllTimeFocusPresets, addTimeFocusPreset, deleteTimeFocusPreset } from '@/services/appDataService';
import { suggestActivePause } from '@/ai/flows/suggest-active-pause-flow';


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

const TIME_FOCUS_SOUND_ENABLED_KEY = "easyGenieTimeFocusSoundEnabled_v1";
const TIME_FOCUS_MODE_KEY = "easyGenieTimeFocusMode_v1";
const TIME_FOCUS_AMBIENT_SOUND_ENABLED_KEY = "easyGenieTimeFocusAmbientSoundEnabled_v1";
const TIME_FOCUS_MICRO_OBJECTIVE_ENABLED_KEY = "easyGenieTimeFocusMicroObjectiveEnabled_v1";
const TIME_FOCUS_AI_PAUSE_ENABLED_KEY = "easyGenieTimeFocusAiPauseEnabled_v1";

const systemTimeFocusPresets: TimeFocusSystemPreset[] = [
  { id: 's_classic', name: "Pomodoro Classique", work: 25, short: 5, long: 15, cycle: 4 },
  { id: 's_focus_long', name: "Focus Long", work: 50, short: 10, long: 20, cycle: 2 },
  { id: 's_revision', name: "Révision Rapide", work: 15, short: 3, long: 10, cycle: 4 },
  { id: 's_ultra_short', name: "Micro-Sessions", work: 10, short: 2, long: 5, cycle: 5 },
];

const ambientSoundsList: AmbientSound[] = [
  { id: 'none', name: "Aucun" },
  { id: 'whiteNoise', name: "Bruit Blanc Pur" },
  { id: 'pinkNoise', name: "Bruit Rose Pur" },
  { id: 'brownianNoise', name: "Bruit Brownien Pur" },
  { id: 'rain', name: "Pluie (Synth.)" },
  { id: 'waves', name: "Vagues (Synth.)" },
  { id: 'drone_50hz', name: "Drone 50Hz (Continu)" },
  { id: 'binaural_10hz', name: "Battements Binauraux 10Hz (Alpha)" },
];

export function TimeFocusTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [taskName, setTaskName] = useState<string>('');
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState<boolean>(true);
  const [toolMode, setToolMode] = useState<'magique' | 'genie'>('magique');

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

  const [accumulatedWorkTime, setAccumulatedWorkTime] = useState(0);
  const [completedWorkSessionsThisTask, setCompletedWorkSessionsThisTask] = useState(0);
  const [ambientSoundEnabled, setAmbientSoundEnabled] = useState<boolean>(false);
  const [currentAmbientSound, setCurrentAmbientSound] = useState<AmbientSound['id']>(ambientSoundsList[0].id);
  const [ambientSoundVolume, setAmbientSoundVolume] = useState<number>(0.1);
  const [microSessionObjectiveEnabled, setMicroSessionObjectiveEnabled] = useState<boolean>(false);
  const [currentMicroObjective, setCurrentMicroObjective] = useState<string>('');
  const [showMicroObjectiveDialog, setShowMicroObjectiveDialog] = useState<boolean>(false);
  const [aiPauseSuggestionsEnabled, setAiPauseSuggestionsEnabled] = useState<boolean>(false);
  const [lastAIPauseSuggestion, setLastAIPauseSuggestion] = useState<string>('');
  const [isFetchingAIPause, setIsFetchingAIPause] = useState<boolean>(false);

  const { toast } = useToast();
  const { user, isOnline } = useAuth();
  const timerId = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterAmbientGainNodeRef = useRef<GainNode | null>(null);
  const ambientSourceNodesRef = useRef<AudioNode[]>([]);


  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completionMessage, setCompletionMessage] = useState({ title: '', description: '', aiSuggestion: '' });

  const [userPresets, setUserPresets] = useState<TimeFocusPreset[]>([]);
  const [isLoadingUserPresets, setIsLoadingUserPresets] = useState(false);
  const [showPresetDialog, setShowPresetDialog] = useState(false);
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSoundPref = localStorage.getItem(TIME_FOCUS_SOUND_ENABLED_KEY);
      if (savedSoundPref !== null) setNotificationSoundEnabled(JSON.parse(savedSoundPref));
      const savedMode = localStorage.getItem(TIME_FOCUS_MODE_KEY) as 'magique' | 'genie';
      if (savedMode) setToolMode(savedMode);
      const savedAmbientEnabled = localStorage.getItem(TIME_FOCUS_AMBIENT_SOUND_ENABLED_KEY);
      if (savedAmbientEnabled !== null) setAmbientSoundEnabled(JSON.parse(savedAmbientEnabled));
      const savedMicroObjectiveEnabled = localStorage.getItem(TIME_FOCUS_MICRO_OBJECTIVE_ENABLED_KEY);
      if (savedMicroObjectiveEnabled !== null) setMicroSessionObjectiveEnabled(JSON.parse(savedMicroObjectiveEnabled));
      const savedAiPauseEnabled = localStorage.getItem(TIME_FOCUS_AI_PAUSE_ENABLED_KEY);
      if (savedAiPauseEnabled !== null) setAiPauseSuggestionsEnabled(JSON.parse(savedAiPauseEnabled));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TIME_FOCUS_SOUND_ENABLED_KEY, JSON.stringify(notificationSoundEnabled));
      localStorage.setItem(TIME_FOCUS_MODE_KEY, toolMode);
      localStorage.setItem(TIME_FOCUS_AMBIENT_SOUND_ENABLED_KEY, JSON.stringify(ambientSoundEnabled));
      localStorage.setItem(TIME_FOCUS_MICRO_OBJECTIVE_ENABLED_KEY, JSON.stringify(microSessionObjectiveEnabled));
      localStorage.setItem(TIME_FOCUS_AI_PAUSE_ENABLED_KEY, JSON.stringify(aiPauseSuggestionsEnabled));
    }
  }, [notificationSoundEnabled, toolMode, ambientSoundEnabled, microSessionObjectiveEnabled, aiPauseSuggestionsEnabled]);

  const fetchUserPresets = useCallback(async () => {
    if (!user) { setUserPresets([]); return; }
    setIsLoadingUserPresets(true);
    try {
      const presets = await getAllTimeFocusPresets(); setUserPresets(presets);
    } catch (error) { toast({ title: "Erreur chargement presets", description: (error as Error).message, variant: "destructive" }); }
    finally { setIsLoadingUserPresets(false); }
  }, [user, toast]);

  useEffect(() => { fetchUserPresets(); }, [fetchUserPresets, isOnline]);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContextRef.current) { 
          masterAmbientGainNodeRef.current = audioContextRef.current.createGain();
          masterAmbientGainNodeRef.current.connect(audioContextRef.current.destination);
          masterAmbientGainNodeRef.current.gain.value = ambientSoundVolume;
        } else {
          console.error("Failed to create AudioContext instance.");
          toast({ title: "Erreur Audio", description: "Impossible d'initialiser le moteur audio.", variant: "destructive" });
          setNotificationSoundEnabled(false);
          setAmbientSoundEnabled(false);
          return null;
        }
      } catch (e) {
        console.error("Web Audio API non supporté ou erreur d'initialisation:", e);
        toast({ title: "Audio Non Supporté", description: "Votre navigateur ne supporte pas l'audio nécessaire.", variant: "destructive" });
        setNotificationSoundEnabled(false);
        setAmbientSoundEnabled(false);
        return null;
      }
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(e => {
        console.warn("Reprise AudioContext échouée:", e);
        toast({ title: "Erreur Audio", description: "Impossible de réactiver l'audio. Veuillez interagir avec la page.", variant: "destructive" });
      });
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'running') {
        console.warn(`AudioContext n'est pas actif après tentative de reprise. État: ${audioContextRef.current?.state}`);
    }
    return audioContextRef.current;
  }, [ambientSoundVolume, toast]);


  useEffect(() => {
    getAudioContext(); 
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn("Erreur fermeture AudioContext:", e));
        audioContextRef.current = null;
        masterAmbientGainNodeRef.current = null;
      }
    };
  }, [getAudioContext]);

  useEffect(() => {
    if (masterAmbientGainNodeRef.current && audioContextRef.current) {
      masterAmbientGainNodeRef.current.gain.setValueAtTime(ambientSoundVolume, audioContextRef.current.currentTime);
    }
  }, [ambientSoundVolume]);


  const playGeneratedSound = useCallback((type: 'tick' | 'halfway' | 'endBell' | 'startRace') => {
    if (!notificationSoundEnabled) return;
    const ac = getAudioContext();
    if (!ac || ac.state !== 'running') return;

    const createTone = (freq: number, dur: number, vol: number, oscType: OscillatorType = 'sine', atk = 0.01, dcy = 0.09, startTimeOffset = 0) => {
      try {
        const osc = ac.createOscillator(); const gain = ac.createGain();
        osc.type = oscType; osc.frequency.setValueAtTime(freq, ac.currentTime + startTimeOffset);
        gain.gain.setValueAtTime(0, ac.currentTime + startTimeOffset);
        gain.gain.linearRampToValueAtTime(vol, ac.currentTime + startTimeOffset + atk);
        gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + startTimeOffset + dur);
        osc.connect(gain); gain.connect(ac.destination);
        osc.start(ac.currentTime + startTimeOffset); osc.stop(ac.currentTime + startTimeOffset + dur);
      } catch (e) { console.error("Erreur lecture son généré:", e); }
    };
    if (type === 'tick') createTone(1000, 0.05, 0.3, 'triangle', 0.01, 0.04);
    else if (type === 'halfway') createTone(600, 0.15, 0.4, 'square', 0.01, 0.1);
    else if (type === 'endBell') { createTone(880, 0.8, 0.6, 'sine', 0.01, 0.7); createTone(880 * 1.5, 0.64, 0.24, 'triangle', 0.01, 0.56, 0.01); }
    else if (type === 'startRace') { createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0); createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0.2); createTone(800, 0.1, 0.4, 'square', 0.01, 0.08, 0.4); createTone(600, 0.5, 0.5, 'sine', 0.01, 0.4, 0.6); }
  }, [notificationSoundEnabled, getAudioContext]);


  const stopAmbientSounds = useCallback(() => {
    ambientSourceNodesRef.current.forEach(node => {
      if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
        try { node.stop(); } catch (e) { /* ignore if already stopped */ }
      }
      try { node.disconnect(); } catch (e) { /* ignore */ }
    });
    ambientSourceNodesRef.current = [];
  }, []);
  
  const playWhiteNoise = useCallback(() => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();

    const bufferSize = 2 * ac.sampleRate;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) { output[i] = Math.random() * 2 - 1; }
    const whiteNoiseSource = ac.createBufferSource();
    whiteNoiseSource.buffer = buffer; whiteNoiseSource.loop = true;
    whiteNoiseSource.connect(masterAmbientGainNodeRef.current); whiteNoiseSource.start();
    ambientSourceNodesRef.current.push(whiteNoiseSource);
  }, [getAudioContext, stopAmbientSounds]);

  const playPinkNoise = useCallback(() => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();

    const bufferSize = 2 * ac.sampleRate; const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362; output[i] *= 0.11; b6 = white * 0.115926;
    }
    const pinkNoiseSource = ac.createBufferSource(); pinkNoiseSource.buffer = buffer; pinkNoiseSource.loop = true;
    pinkNoiseSource.connect(masterAmbientGainNodeRef.current); pinkNoiseSource.start();
    ambientSourceNodesRef.current.push(pinkNoiseSource);
  }, [getAudioContext, stopAmbientSounds]);

  const playBrownianNoise = useCallback(() => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();
    const bufferSize = 2 * ac.sampleRate; const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
    const output = buffer.getChannelData(0); let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1; output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i]; output[i] *= 3.5;
    }
    const brownNoiseSource = ac.createBufferSource(); brownNoiseSource.buffer = buffer; brownNoiseSource.loop = true;
    brownNoiseSource.connect(masterAmbientGainNodeRef.current); brownNoiseSource.start();
    ambientSourceNodesRef.current.push(brownNoiseSource);
  }, [getAudioContext, stopAmbientSounds]);

  const playRainSound = useCallback(() => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();

    const whiteNoise = ac.createBufferSource(); const bufferSize = 2 * ac.sampleRate;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    whiteNoise.buffer = buffer; whiteNoise.loop = true;

    const bandpass = ac.createBiquadFilter(); bandpass.type = "bandpass"; bandpass.frequency.value = 1000; bandpass.Q.value = 0.5;
    whiteNoise.connect(bandpass).connect(masterAmbientGainNodeRef.current); whiteNoise.start();
    ambientSourceNodesRef.current.push(whiteNoise);
  }, [getAudioContext, stopAmbientSounds]);
  
  const playWavesSound = useCallback(() => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();

    const pinkNoiseSource = ac.createBufferSource(); const bufferSize = 2 * ac.sampleRate;
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate); const output = buffer.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i=0; i<bufferSize; i++) {
        const white = Math.random()*2-1; b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759; b2=0.96900*b2+white*0.1538520;
        b3=0.86650*b3+white*0.3104856; b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980;
        output[i]=b0+b1+b2+b3+b4+b5+b6+white*0.5362; output[i]*=0.11; b6=white*0.115926;
    }
    pinkNoiseSource.buffer = buffer; pinkNoiseSource.loop = true;
    const lowpass = ac.createBiquadFilter(); lowpass.type = "lowpass"; lowpass.frequency.value = 400;
    const lfo = ac.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.2;
    const lfoGain = ac.createGain(); lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(lowpass.frequency);
    pinkNoiseSource.connect(lowpass).connect(masterAmbientGainNodeRef.current);
    pinkNoiseSource.start(); lfo.start();
    ambientSourceNodesRef.current.push(pinkNoiseSource, lfo);
  }, [getAudioContext, stopAmbientSounds]);

  const playDroneSound = useCallback((hz = 50) => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();
    const droneOsc = ac.createOscillator(); droneOsc.type = 'sine'; droneOsc.frequency.setValueAtTime(hz, ac.currentTime);
    droneOsc.connect(masterAmbientGainNodeRef.current); droneOsc.start();
    ambientSourceNodesRef.current.push(droneOsc);
  }, [getAudioContext, stopAmbientSounds]);
  
  const playBinauralBeats = useCallback((baseFreq = 200, beatFreq = 10) => {
    const ac = getAudioContext();
    if (!ac || !masterAmbientGainNodeRef.current || ac.state !== 'running') return;
    stopAmbientSounds();

    const oscL = ac.createOscillator(); oscL.type = 'sine'; oscL.frequency.setValueAtTime(baseFreq, ac.currentTime);
    const oscR = ac.createOscillator(); oscR.type = 'sine'; oscR.frequency.setValueAtTime(baseFreq + beatFreq, ac.currentTime);
    const merger = ac.createChannelMerger(2);
    const pannerL = ac.createStereoPanner(); pannerL.pan.value = -1;
    const pannerR = ac.createStereoPanner(); pannerR.pan.value = 1;
    oscL.connect(pannerL).connect(merger, 0, 0); oscR.connect(pannerR).connect(merger, 0, 1);
    merger.connect(masterAmbientGainNodeRef.current);
    oscL.start(); oscR.start();
    ambientSourceNodesRef.current.push(oscL, oscR);
    toast({ title: "Battements Binauraux Actifs", description: "Utilisez des écouteurs pour un effet optimal.", duration: 5000});
  }, [getAudioContext, stopAmbientSounds, toast]);

  useEffect(() => {
    if (toolMode === 'genie' && ambientSoundEnabled && timerState.isRunning && timerState.currentMode === 'work') {
      if (currentAmbientSound === 'whiteNoise') playWhiteNoise();
      else if (currentAmbientSound === 'pinkNoise') playPinkNoise();
      else if (currentAmbientSound === 'brownianNoise') playBrownianNoise();
      else if (currentAmbientSound === 'rain') playRainSound();
      else if (currentAmbientSound === 'waves') playWavesSound();
      else if (currentAmbientSound === 'drone_50hz') playDroneSound(50);
      else if (currentAmbientSound === 'binaural_10hz') playBinauralBeats(200, 10);
      else stopAmbientSounds();
    } else { stopAmbientSounds(); }
    return () => stopAmbientSounds();
  }, [toolMode, ambientSoundEnabled, timerState.isRunning, timerState.currentMode, currentAmbientSound, playWhiteNoise, playPinkNoise, playBrownianNoise, playRainSound, playWavesSound, playDroneSound, playBinauralBeats, stopAmbientSounds]);


  const getCurrentModeFullDuration = useCallback(() => {
    let durationInMinutes;
    const currentTimerMode = timerState.currentMode;

    if (intensity === 1) { // Simple Timer for intensity 1 (both modes)
        durationInMinutes = currentTimerMode === 'work' ? configWorkDuration : 0; 
    } else if (intensity === 2 || intensity === 3) { // Standard Pomodoro for intensity 2 & 3 (both modes)
        durationInMinutes = currentTimerMode === 'work' ? 25 : currentTimerMode === 'shortBreak' ? 5 : 15;
    } else { // Configurable Pomodoro for intensity 4 & 5 (both modes)
        durationInMinutes = currentTimerMode === 'work' ? configWorkDuration : currentTimerMode === 'shortBreak' ? configShortBreakDuration : configLongBreakDuration;
    }
    return durationInMinutes * 60;
  }, [timerState.currentMode, configWorkDuration, configShortBreakDuration, configLongBreakDuration, intensity]);


  const handleSessionCompletion = useCallback(async () => {
    playGeneratedSound('endBell');
    setTimerState(prev => ({ ...prev, isRunning: false }));

    let nextMode: TimerMode = 'work';
    let newTimeLeft: number;
    let newCurrentPomodoroCycle = timerState.currentPomodoroCycle;
    let newTotalPomodorosCompleted = timerState.totalPomodorosCompleted;
    let dialogTitle = '';
    let dialogDescription = '';
    let aiSuggestion = '';

    let currentCyclesConfig = (intensity === 1) ? 1 : (intensity === 2 || intensity === 3) ? 4 : configPomodorosPerCycle;
    let currentWorkConfig = (intensity === 1) ? configWorkDuration : (intensity === 2 || intensity === 3) ? 25 : configWorkDuration;
    let currentShortBreakConfig = (intensity === 1) ? 0 : (intensity === 2 || intensity === 3) ? 5 : configShortBreakDuration;
    let currentLongBreakConfig = (intensity === 1) ? 0 : (intensity === 2 || intensity === 3) ? 15 : configLongBreakDuration;
    
    if (timerState.currentMode === 'work') {
      newTotalPomodorosCompleted++;
      if (toolMode === 'genie') setCompletedWorkSessionsThisTask(prev => prev + 1);
      
      const workDurationThisSession = getCurrentModeFullDuration();
      if (toolMode === 'genie') setAccumulatedWorkTime(prev => prev + (workDurationThisSession - timerState.timeLeft));

      if (intensity === 1) { 
        nextMode = 'work'; newTimeLeft = currentWorkConfig * 60;
        dialogTitle = "Temps écoulé !";
        if (toolMode === 'genie') {
          dialogDescription = `Vous avez complété ${completedWorkSessionsThisTask + 1} session(s) pour un total de ${formatTimeDisplay(accumulatedWorkTime + workDurationThisSession)} sur la tâche '${taskName || "non définie"}'.`;
        } else {
          dialogDescription = `Votre session de concentration de ${currentWorkConfig} minutes${taskName ? ` sur "${taskName}"` : ''} est terminée.`;
        }
        newCurrentPomodoroCycle = 1; 
      } else { 
        if (newTotalPomodorosCompleted % currentCyclesConfig === 0) {
          nextMode = 'longBreak'; newTimeLeft = currentLongBreakConfig * 60;
          dialogTitle = "Cycle Terminé ! Pause Longue Méritée !";
           if (toolMode === 'genie') {
            dialogDescription = `Cycle complet ! Vous avez fait ${completedWorkSessionsThisTask + 1} sessions pour un total de ${formatTimeDisplay(accumulatedWorkTime + workDurationThisSession)} sur '${taskName || "cette tâche"}'. Pause longue de ${currentLongBreakConfig} min.`;
          } else {
             dialogDescription = `Vous avez complété ${currentCyclesConfig} sessions. Prenez une pause de ${currentLongBreakConfig} minutes.`;
          }
        } else {
          nextMode = 'shortBreak'; newTimeLeft = currentShortBreakConfig * 60;
          dialogTitle = "Session de Travail Terminée !";
          if (toolMode === 'genie') {
            dialogDescription = `Session terminée ! Vous avez fait ${completedWorkSessionsThisTask + 1} sessions pour un total de ${formatTimeDisplay(accumulatedWorkTime + workDurationThisSession)} sur '${taskName || "cette tâche"}'. Pause de ${currentShortBreakConfig} min.`;
          } else {
            dialogDescription = `Bravo ! Prenez une petite pause de ${currentShortBreakConfig} minutes.`;
          }
        }
        newCurrentPomodoroCycle = (newTotalPomodorosCompleted % currentCyclesConfig !== 0) ? timerState.currentPomodoroCycle + 1 : 1;
      }
    } else { 
      nextMode = 'work'; newTimeLeft = currentWorkConfig * 60;
      dialogTitle = "Pause Terminée !";
      dialogDescription = `Retour au travail pour une session de ${currentWorkConfig} minutes.`;
    }

    if (toolMode === 'genie' && aiPauseSuggestionsEnabled && (nextMode === 'shortBreak' || nextMode === 'longBreak')) {
      setIsFetchingAIPause(true);
      try {
        const breakDuration = nextMode === 'shortBreak' ? currentShortBreakConfig : currentLongBreakConfig;
        const result = await suggestActivePause({ 
            intensityLevel: intensity, 
            breakDurationMinutes: breakDuration,
            taskName: taskName || currentMicroObjective || undefined,
        });
        aiSuggestion = result.suggestion; setLastAIPauseSuggestion(aiSuggestion);
      } catch (error) { console.error("Error fetching AI pause suggestion:", error); aiSuggestion = "Le Génie est en pause aussi, profitez bien de la vôtre !"; }
      finally { setIsFetchingAIPause(false); }
    }
    setCompletionMessage({ title: dialogTitle, description: dialogDescription, aiSuggestion });
    setShowCompletionDialog(true);
    setTimerState(prev => ({ ...prev, timeLeft: newTimeLeft, currentMode: nextMode, currentPomodoroCycle: newCurrentPomodoroCycle, totalPomodorosCompleted: newTotalPomodorosCompleted, lastTickPlayedAt: newTimeLeft, halfwayNotified: false, pomodorosInCycle: currentCyclesConfig }));
  }, [timerState, intensity, configWorkDuration, configShortBreakDuration, configLongBreakDuration, configPomodorosPerCycle, playGeneratedSound, taskName, toolMode, aiPauseSuggestionsEnabled, accumulatedWorkTime, completedWorkSessionsThisTask, getCurrentModeFullDuration, currentMicroObjective]);

  useEffect(() => {
    if (timerState.isRunning && timerState.timeLeft > 0) {
      timerId.current = setTimeout(() => {
        const newTimeLeft = timerState.timeLeft - 1;
        setTimerState(prev => ({ ...prev, timeLeft: newTimeLeft }));
        const fullDuration = getCurrentModeFullDuration();
        if (newTimeLeft > 0 && newTimeLeft < fullDuration && newTimeLeft % (5 * 60) === 0 && newTimeLeft !== timerState.lastTickPlayedAt) {
          playGeneratedSound('tick'); setTimerState(prev => ({ ...prev, lastTickPlayedAt: newTimeLeft }));
        }
        if (!timerState.halfwayNotified && newTimeLeft > 0 && newTimeLeft <= Math.floor(fullDuration / 2) && (fullDuration / 2) > (2 * 60)) {
          playGeneratedSound('halfway'); setTimerState(prev => ({ ...prev, halfwayNotified: true }));
        }
      }, 1000);
    } else if (timerState.isRunning && timerState.timeLeft === 0) { handleSessionCompletion(); }
    return () => { if (timerId.current) clearTimeout(timerId.current); };
  }, [timerState.isRunning, timerState.timeLeft, handleSessionCompletion, getCurrentModeFullDuration, timerState.lastTickPlayedAt, timerState.halfwayNotified, playGeneratedSound]);

 useEffect(() => {
    if (timerState.isRunning) return;

    let workDur, shortBr, longBr, cycles;
    if (intensity === 1) {
      workDur = configWorkDuration; shortBr = 0; longBr = 0; cycles = 1;
    } else if (intensity === 2 || intensity === 3) {
      workDur = 25; shortBr = 5; longBr = 15; cycles = 4;
      if (toolMode === 'genie' || toolMode === 'magique') {
          setConfigWorkDuration(25); setConfigShortBreakDuration(5); setConfigLongBreakDuration(15); setConfigPomodorosPerCycle(4);
      }
    } else { 
      workDur = configWorkDuration; shortBr = configShortBreakDuration; longBr = configLongBreakDuration; cycles = configPomodorosPerCycle;
    }
    
    const newTimeLeft = (timerState.currentMode === 'work' ? workDur : timerState.currentMode === 'shortBreak' ? shortBr : longBr) * 60;
    setTimerState(prev => ({ ...prev, timeLeft: newTimeLeft, pomodorosInCycle: cycles, lastTickPlayedAt: newTimeLeft, halfwayNotified: false }));
  }, [intensity, configWorkDuration, configShortBreakDuration, configLongBreakDuration, configPomodorosPerCycle, timerState.isRunning, timerState.currentMode, toolMode]);


  const handleStartPause = () => {
    getAudioContext(); 
    if (toolMode === 'genie' && microSessionObjectiveEnabled && timerState.currentMode === 'work' && !timerState.isRunning && timerState.timeLeft === getCurrentModeFullDuration()) {
      setShowMicroObjectiveDialog(true); return;
    }
    startTimerLogic();
  };

  const startTimerLogic = () => {
    if (timerState.timeLeft === 0 && !timerState.isRunning) {
      setShowCompletionDialog(false);
      if (timerState.currentMode === 'work') playGeneratedSound('startRace');
      setTimerState(prev => ({ ...prev, isRunning: true, lastTickPlayedAt: prev.timeLeft, halfwayNotified: false }));
    } else if (!timerState.isRunning && timerState.currentMode === 'work' && timerState.timeLeft === getCurrentModeFullDuration()) {
      playGeneratedSound('startRace');
      setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    } else {
      setTimerState(prev => ({ ...prev, isRunning: !prev.isRunning }));
    }
  };

  const handleMicroObjectiveSubmit = () => { setShowMicroObjectiveDialog(false); startTimerLogic(); };

  const handleReset = () => {
    if (timerId.current) clearTimeout(timerId.current);
    let initialWorkDuration, initialPomodorosPerCycle;
    if (intensity === 1) {
      initialWorkDuration = configWorkDuration; initialPomodorosPerCycle = 1;
    } else if (intensity === 2 || intensity === 3) {
      initialWorkDuration = 25; initialPomodorosPerCycle = 4;
    } else { 
      initialWorkDuration = configWorkDuration; initialPomodorosPerCycle = configPomodorosPerCycle;
    }
    setTimerState({ isRunning: false, timeLeft: initialWorkDuration * 60, currentMode: 'work', pomodorosInCycle: initialPomodorosPerCycle, currentPomodoroCycle: 1, totalPomodorosCompleted: 0, lastTickPlayedAt: initialWorkDuration * 60, halfwayNotified: false });
    setShowCompletionDialog(false);
    if (toolMode === 'genie') { setAccumulatedWorkTime(0); setCompletedWorkSessionsThisTask(0); setCurrentMicroObjective(''); }
  };

  const handleSkipBreak = () => {
    if (timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') {
      if (timerId.current) clearTimeout(timerId.current);
      let workDurationForNextSession;
       if (intensity === 1) {
        workDurationForNextSession = configWorkDuration;
      } else if (intensity === 2 || intensity === 3) {
        workDurationForNextSession = 25;
      } else { 
        workDurationForNextSession = configWorkDuration;
      }
      const newTimeLeft = workDurationForNextSession * 60;
      setTimerState(prev => ({ ...prev, isRunning: false, timeLeft: newTimeLeft, currentMode: 'work', lastTickPlayedAt: newTimeLeft, halfwayNotified: false }));
      setShowCompletionDialog(false);
      toast({ title: "Pause Passée", description: "Préparation de la prochaine session de travail." });
    }
  };

  const formatTimeDisplay = (totalSeconds: number) => {
    if (totalSeconds < 0) totalSeconds = 0;
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    else { const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim(); }
  };
  const progressPercentage = ((getCurrentModeFullDuration() - timerState.timeLeft) / getCurrentModeFullDuration()) * 100;

 const getIntensityDescription = () => {
    if (toolMode === 'magique') {
      switch (intensity) {
        case 1: return "Minuteur simple. Définissez une durée et concentrez-vous.";
        case 2: return "Pomodoro léger (25min travail / 5min pause).";
        case 3: return "Pomodoro classique (25/5/15), 4 cycles avant pause longue.";
        case 4: return "Pomodoro configurable. Ajustez les durées ci-dessous.";
        case 5: return "Mode Hyper-Concentration. Sessions longues, pauses minimales.";
        default: return "";
      }
    } else { // toolMode === 'genie'
      switch (intensity) {
        case 1: return "Minuteur simple avec assistance Génie (bilan, ambiance, objectifs, pauses IA).";
        case 2: return "Pomodoro léger (25/5/15) avec assistance Génie.";
        case 3: return "Pomodoro classique (25/5/15) avec assistance Génie.";
        case 4: return "Pomodoro configurable avec assistance Génie.";
        case 5: return "Mode Hyper-Concentration configurable avec assistance Génie avancée.";
        default: return "";
      }
    }
  };
  const getModeDisplay = () => {
    switch (timerState.currentMode) {
      case 'work': return "Travail"; case 'shortBreak': return "Pause Courte"; case 'longBreak': return "Pause Longue"; default: return "";
    }
  };

  const handleLoadPreset = (preset: TimeFocusDisplayPreset) => {
    setConfigWorkDuration(preset.work); setConfigShortBreakDuration(preset.short); setConfigLongBreakDuration(preset.long); setConfigPomodorosPerCycle(preset.cycle);
    if (intensity < 4 && !(intensity === 1 && preset.cycle === 1)) setIntensity(4); // Ensure intensity allows config if loading a complex preset
    else if (intensity === 1 && preset.cycle > 1) setIntensity(4); // If simple timer mode was active, but preset has cycles, switch intensity
    
    const newTimeLeft = preset.work * 60;
    setTimerState(prev => ({ ...prev, isRunning: false, timeLeft: newTimeLeft, currentMode: 'work', pomodorosInCycle: preset.cycle, currentPomodoroCycle: 1, totalPomodorosCompleted: 0, lastTickPlayedAt: newTimeLeft, halfwayNotified: false }));
    setShowPresetDialog(false); toast({ title: `Preset "${preset.name}" chargé!` });
  };

  const handleSavePreset = async () => {
    if (!user) { toast({ title: "Non connecté", variant: "destructive" }); return; }
    if (!newPresetName.trim()) { toast({ title: "Nom de preset requis", variant: "destructive" }); return; }
    const presetDto: CreateTimeFocusPresetDTO = { name: newPresetName, work_duration_minutes: configWorkDuration, short_break_minutes: configShortBreakDuration, long_break_minutes: configLongBreakDuration, pomodoros_per_cycle: configPomodorosPerCycle };
    try {
      await addTimeFocusPreset(presetDto); await fetchUserPresets();
      toast({ title: "Preset sauvegardé!" }); setShowSavePresetDialog(false); setNewPresetName('');
    } catch (error) { toast({ title: "Erreur de sauvegarde", description: (error as Error).message, variant: "destructive" }); }
  };

  const handleDeleteUserPreset = async (presetId: string) => {
    if (!user) return;
    try { await deleteTimeFocusPreset(presetId); await fetchUserPresets(); toast({ title: "Preset supprimé", variant: "destructive" }); }
    catch (error) { toast({ title: "Erreur de suppression", description: (error as Error).message, variant: "destructive" }); }
  };
  const allDisplayPresets: TimeFocusDisplayPreset[] = [ ...systemTimeFocusPresets.map(p => ({ ...p, isCustom: false })), ...userPresets.map(p => ({ id: p.id, name: p.name, work: p.work_duration_minutes, short: p.short_break_minutes, long: p.long_break_minutes, cycle: p.pomodoros_per_cycle, isCustom: true })) ];
  const handleToggleNotificationSound = () => { setNotificationSoundEnabled(prev => !prev); toast({ title: `Sons de notification ${!notificationSoundEnabled ? "activés" : "désactivés"}` }); };
  const handleToggleAmbientSound = () => { setAmbientSoundEnabled(prev => !prev); toast({ title: `Sons d'ambiance ${!ambientSoundEnabled ? "activés" : "désactivés"}` }); };
  const handleToggleMicroObjective = () => { setMicroSessionObjectiveEnabled(prev => !prev); toast({ title: `Objectifs de micro-session ${!microSessionObjectiveEnabled ? "activés" : "désactivés"}` }); };
  const handleToggleAIPause = () => { setAiPauseSuggestionsEnabled(prev => !prev); toast({ title: `Suggestions de pause IA ${!aiPauseSuggestionsEnabled ? "activées" : "désactivées"}` }); };
  
  const isSimpleTimerDurationEditable = !timerState.isRunning && (intensity === 1);
  const isPomodoroConfigEditable = !timerState.isRunning && (intensity >= 4);
  const showSimpleTimerConfig = intensity === 1;
  const showPomodoroConfigCard = intensity >=2;

  let displayConfigWork = configWorkDuration;
  let displayConfigShort = configShortBreakDuration;
  let displayConfigLong = configLongBreakDuration;
  let displayConfigCycle = configPomodorosPerCycle;

  if (intensity === 2 || intensity === 3) {
    displayConfigWork = 25; displayConfigShort = 5; displayConfigLong = 15; displayConfigCycle = 4;
  }


  const handleSimpleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === "") { setConfigWorkDuration(1); return; }
    const numValue = parseInt(rawValue, 10);
    if (!isNaN(numValue)) { const val = Math.max(1, numValue); setConfigWorkDuration(val); }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl text-center">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-grow text-left sm:text-center">
            <CardTitle className="text-3xl font-bold text-primary flex items-center justify-center sm:justify-start gap-2">
               TimeFocus {toolMode === 'magique' ? <SparklesIcon className="h-7 w-7 text-accent" /> : <Brain className="h-7 w-7 text-accent" />}
            </CardTitle>
            <CardDescription>{getIntensityDescription()}</CardDescription>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[200px] sm:max-w-[280px] shrink-0 space-y-2">
            <IntensitySelector value={intensity} onChange={setIntensity} />
            <div className="flex items-center justify-between p-1 bg-muted/50 rounded-md">
                <Label htmlFor="tool-mode-switch-timefocus" className="text-xs text-muted-foreground px-1">Magique</Label>
                <Switch id="tool-mode-switch-timefocus" checked={toolMode === 'genie'} onCheckedChange={(checked) => setToolMode(checked ? 'genie' : 'magique')} aria-label="Changer de mode" />
                <Label htmlFor="tool-mode-switch-timefocus" className="text-xs text-muted-foreground px-1">Génie</Label>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="my-8 p-6 rounded-lg bg-gradient-to-br from-primary/10 via-background to-accent/10 shadow-inner">
            <div className="flex items-center justify-center mb-2">
                {timerState.currentMode === 'work' && <Brain className="h-6 w-6 text-primary mr-2" />}
                {timerState.currentMode !== 'work' && <Coffee className="h-6 w-6 text-accent-foreground mr-2" />}
                <p className="text-xl font-semibold text-foreground">Mode Actuel : {getModeDisplay()}</p>
            </div>
            <div className={`text-7xl font-mono font-bold tabular-nums mb-3 ${timerState.currentMode === 'work' ? 'text-primary-foreground bg-primary/90' : 'text-accent-foreground bg-accent/80'} p-4 rounded-md shadow-lg`}>
                {formatTimeDisplay(timerState.timeLeft)}
            </div>
            <Progress value={progressPercentage} className="w-full h-3" />
            {(intensity > 1) && ( 
                <p className="text-sm text-muted-foreground mt-3">Session {timerState.currentPomodoroCycle} / {timerState.pomodorosInCycle} | Total : {timerState.totalPomodorosCompleted}</p>
            )}
            {toolMode === 'genie' && currentMicroObjective && timerState.isRunning && timerState.currentMode === 'work' && (
                <p className="text-sm text-primary mt-2 font-medium animate-pulse">Objectif: {currentMicroObjective}</p>
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
        {(timerState.currentMode === 'shortBreak' || timerState.currentMode === 'longBreak') && (intensity > 1) && (
            <Button onClick={handleSkipBreak} variant="secondary" size="lg" className="w-full mt-2 text-lg py-3" disabled={timerState.isRunning}>
                <SkipForward className="mr-2 h-6 w-6" /> Passer la Pause
            </Button>
        )}
        <div className="mt-8 pt-6 border-t space-y-4">
            <div>
              <Label htmlFor="taskName">Nom de la tâche (optionnel) :</Label>
              <Input id="taskName" type="text" value={taskName}
                onChange={(e) => { const newTaskName = e.target.value; if (toolMode === 'genie' && taskName !== newTaskName) { setAccumulatedWorkTime(0); setCompletedWorkSessionsThisTask(0); } setTaskName(newTaskName); }}
                placeholder="Sur quoi travaillez-vous ?" className="mt-1 transition-all duration-200 ease-in-out hover:shadow-lg hover:animate-subtle-shake transform hover:scale-[1.01]" disabled={timerState.isRunning} />
            </div>
            {showSimpleTimerConfig && (
              <div><Label htmlFor="simpleTimerDurationConfig">Durée du minuteur (minutes)</Label><Input id="simpleTimerDurationConfig" type="number" value={configWorkDuration} onChange={handleSimpleDurationChange} min="1" disabled={!isSimpleTimerDurationEditable} className="mt-1 h-10"/></div>
            )}
            {showPomodoroConfigCard && (
              <Card className="p-4 bg-muted/50"><CardTitle className="text-md mb-3 text-center">Configuration Pomodoro</CardTitle>
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div><Label htmlFor="workDurationConfig" className="text-xs">Travail (min)</Label><Input id="workDurationConfig" type="number" value={displayConfigWork} onChange={e => setConfigWorkDuration(Math.max(1, +e.target.value))} min="1" disabled={!isPomodoroConfigEditable} className="h-8"/></div>
                  <div><Label htmlFor="shortBreakDurationConfig" className="text-xs">Pause Courte (min)</Label><Input id="shortBreakDurationConfig" type="number" value={displayConfigShort} onChange={e => setConfigShortBreakDuration(Math.max(1, +e.target.value))} min="1" disabled={!isPomodoroConfigEditable} className="h-8"/></div>
                  <div><Label htmlFor="longBreakDurationConfig" className="text-xs">Pause Longue (min)</Label><Input id="longBreakDurationConfig" type="number" value={displayConfigLong} onChange={e => setConfigLongBreakDuration(Math.max(1, +e.target.value))} min="1" disabled={!isPomodoroConfigEditable} className="h-8"/></div>
                  <div><Label htmlFor="pomodorosPerCycleConfig" className="text-xs">Cycles / Pause Longue</Label><Input id="pomodorosPerCycleConfig" type="number" value={displayConfigCycle} onChange={e => setConfigPomodorosPerCycle(Math.max(1, +e.target.value))} min="1" disabled={!isPomodoroConfigEditable} className="h-8"/></div>
                </div>
                {user && isPomodoroConfigEditable && <div className="mt-4 flex justify-center gap-2"><Button variant="outline" size="sm" onClick={() => setShowSavePresetDialog(true)} disabled={timerState.isRunning}><Save className="mr-2 h-4 w-4" /> Sauvegarder Config</Button></div>}
              </Card>
            )}
        </div>
        {toolMode === 'genie' && (
            <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="genie-settings">
                    <AccordionTrigger className="text-lg font-medium text-primary"><Settings2 className="mr-2 h-5 w-5"/>Paramètres du Génie</AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                            <Label htmlFor="ambientSoundEnabledSwitch" className="flex items-center gap-2 text-sm"><Music2 className="h-5 w-5"/>Sons d'ambiance</Label>
                            <Switch id="ambientSoundEnabledSwitch" checked={ambientSoundEnabled} onCheckedChange={handleToggleAmbientSound} disabled={timerState.isRunning}/>
                        </div>
                        {ambientSoundEnabled && (
                            <div className="pl-6 space-y-2">
                                <Select value={currentAmbientSound} onValueChange={(value) => setCurrentAmbientSound(value as AmbientSound['id'])} disabled={timerState.isRunning}>
                                    <SelectTrigger><SelectValue placeholder="Choisir un son" /></SelectTrigger>
                                    <SelectContent>{ambientSoundsList.map(sound => <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <div className="flex items-center gap-2"><Label htmlFor="ambientVolume" className="text-xs">Volume:</Label><Slider id="ambientVolume" min={0} max={1} step={0.01} value={[ambientSoundVolume]} onValueChange={(val) => setAmbientSoundVolume(val[0])} disabled={timerState.isRunning}/></div>
                            </div>
                        )}
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                            <Label htmlFor="microObjectiveSwitch" className="flex items-center gap-2 text-sm"><MessageSquarePlus className="h-5 w-5"/>Objectif de micro-session</Label>
                            <Switch id="microObjectiveSwitch" checked={microSessionObjectiveEnabled} onCheckedChange={handleToggleMicroObjective} disabled={timerState.isRunning}/>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/10">
                            <Label htmlFor="aiPauseSwitch" className="flex items-center gap-2 text-sm"><WandSparkles className="h-5 w-5"/>Suggestions de pause IA</Label>
                            <Switch id="aiPauseSwitch" checked={aiPauseSuggestionsEnabled} onCheckedChange={handleToggleAIPause} disabled={timerState.isRunning || isFetchingAIPause}/>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        )}
        <Button variant="outline" onClick={() => setShowPresetDialog(true)} className="w-full" disabled={timerState.isRunning}><ListChecks className="mr-2 h-4 w-4" /> Charger un Preset de Minuterie</Button>
        <div className="flex justify-center">
             <Button onClick={handleToggleNotificationSound} variant="ghost" size="icon" aria-label={notificationSoundEnabled ? "Désactiver les sons de notification" : "Activer les sons de notification"}>
                {notificationSoundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6 text-muted-foreground" />}
             </Button>
        </div>
      </CardContent>
      <CardFooter><p className="text-xs text-muted-foreground mx-auto text-center w-full">{taskName ? `Concentration sur : "${taskName}"` : "Le Génie vous aide à maîtriser votre temps."}</p></CardFooter>
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><BellRing className="h-6 w-6 mr-2 text-primary" />{completionMessage.title}</AlertDialogTitle>
            <AlertDialogDescription>{completionMessage.description}</AlertDialogDescription>
            {isFetchingAIPause && <div className="flex items-center pt-2"><Loader2 className="h-4 w-4 animate-spin mr-2"/> Le Génie cherche une idée de pause...</div>}
            {completionMessage.aiSuggestion && !isFetchingAIPause && (<div className="pt-3 mt-3 border-t"><p className="font-semibold text-sm text-primary">Suggestion du Génie pour votre pause :</p><p className="text-sm">{completionMessage.aiSuggestion}</p></div>)}
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogAction onClick={() => { setShowCompletionDialog(false); }}>OK</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={showMicroObjectiveDialog} onOpenChange={setShowMicroObjectiveDialog}>
        <DialogContent>
            <DialogHeader><DialogTitle>Quel est votre objectif pour cette session ?</DialogTitle><DialogDescription>Définir un objectif précis peut booster votre concentration.</DialogDescription></DialogHeader>
            <Input value={currentMicroObjective} onChange={(e) => setCurrentMicroObjective(e.target.value)} placeholder="Ex: Rédiger l'introduction du rapport X" className="my-4"/>
            <DialogFooter><Button variant="outline" onClick={() => { setShowMicroObjectiveDialog(false); setCurrentMicroObjective(''); }}>Annuler</Button><Button onClick={handleMicroObjectiveSubmit}>Démarrer la Session</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="sm:max-w-md md:max-w-lg"><DialogHeader><DialogTitle>Charger un Preset de Minuterie</DialogTitle><DialogDescription>Choisissez une configuration pour démarrer rapidement.</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3 -mr-3">
            {isLoadingUserPresets && <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin"/></div>}
            {!isLoadingUserPresets && allDisplayPresets.length === 0 && <p className="text-muted-foreground p-4 text-center">Aucun preset.</p>}
            {!isLoadingUserPresets && allDisplayPresets.length > 0 && (
                 <Accordion type="multiple" defaultValue={['system-presets', 'user-presets']} className="w-full">
                    <AccordionItem value="system-presets"><AccordionTrigger>Presets Système ({systemTimeFocusPresets.length})</AccordionTrigger>
                        <AccordionContent>{allDisplayPresets.filter(p => !p.isCustom).map(preset => (<Button key={preset.id} variant="ghost" onClick={() => handleLoadPreset(preset)} className="w-full justify-start mb-1 h-auto py-2"><div><p className="font-medium">{preset.name}</p><p className="text-xs text-muted-foreground">T:{preset.work}m, PC:{preset.short}m, PL:{preset.long}m, C:{preset.cycle}</p></div></Button>))}</AccordionContent></AccordionItem>
                    {user && (<AccordionItem value="user-presets"><AccordionTrigger>Mes Presets ({userPresets.length})</AccordionTrigger>
                        <AccordionContent>{userPresets.length === 0 && <p className="text-sm text-muted-foreground p-2">Aucun preset.</p>}
                            {allDisplayPresets.filter(p => p.isCustom).map(preset => (<div key={preset.id} className="flex items-center justify-between mb-1 pr-2 hover:bg-accent/50 rounded-md">
                                <Button variant="ghost" onClick={() => handleLoadPreset(preset)} className="flex-grow justify-start text-left h-auto py-2"><div><p className="font-medium">{preset.name}</p><p className="text-xs text-muted-foreground">T:{preset.work}m, PC:{preset.short}m, PL:{preset.long}m, C:{preset.cycle}</p></div></Button>
                                <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-7 w-7 flex-shrink-0"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Supprimer "{preset.name}"?</AlertDialogTitle><AlertDialogDescription>Action irréversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUserPreset(preset.id)}>Supprimer</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                            </div>))}</AccordionContent></AccordionItem>
                    )}
                 </Accordion>
            )}
          </ScrollArea>
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Fermer</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showSavePresetDialog} onOpenChange={setShowSavePresetDialog}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Sauvegarder la Configuration</DialogTitle><DialogDescription>Donnez un nom à votre configuration actuelle.</DialogDescription></DialogHeader>
          <div className="py-2"><Label htmlFor="presetName">Nom du Preset</Label><Input id="presetName" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Ex: Focus Matin"/>
             <p className="text-xs text-muted-foreground mt-2">Sera sauvegardé: {configWorkDuration}m (travail), {configShortBreakDuration}m (courte), {configLongBreakDuration}m (longue), {configPomodorosPerCycle} cycles.</p>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline" onClick={() => setNewPresetName('')}>Annuler</Button></DialogClose><Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>Sauvegarder</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

