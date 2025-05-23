"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { IntensitySelector } from '@/components/intensity-selector';
import { Play, Pause, RotateCcw, BellRing } from 'lucide-react';
import { Progress } from "@/components/ui/progress";

export function TimeFocusTool() {
  const [intensity, setIntensity] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerId = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(durationMinutes * 60);
    }
  }, [durationMinutes, isRunning]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerId.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      // Placeholder: Play a sound or show notification
      alert("Temps écoulé ! C'est l'heure de la pause magique !");
      // Higher intensity might trigger more insistent notifications or auto-start break timer
      if(intensity >=4) {
        console.log("Notification intensifiée pour niveau de magie élevé!");
      }
    }
    return () => {
      if (timerId.current) clearTimeout(timerId.current);
    };
  }, [isRunning, timeLeft, intensity]);

  const handleStartPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(durationMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = isRunning ? ((durationMinutes * 60 - timeLeft) / (durationMinutes * 60)) * 100 : 0;

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl text-center">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">TimeFocus</CardTitle>
        <CardDescription>Configurez votre minuteur de concentration. Le génie vous aidera à rester focalisé. L'intensité magique peut influencer les rappels ou modes de minuteur.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <IntensitySelector value={intensity} onChange={setIntensity} />
        
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-foreground mb-1">Durée (minutes) :</label>
          <Input
            id="duration"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value, 10)))}
            min="1"
            className="w-32 mx-auto text-center"
            disabled={isRunning}
          />
        </div>

        <div className="my-8">
          <div className="text-6xl font-mono font-bold text-foreground tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <Progress value={progressPercentage} className="w-full h-2 mt-2" />
        </div>
        
        <div className="flex justify-center gap-4">
          <Button onClick={handleStartPause} size="lg" className="w-32">
            {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
            {isRunning ? 'Pause' : 'Démarrer'}
          </Button>
          <Button onClick={handleReset} variant="outline" size="lg" className="w-32">
            <RotateCcw className="mr-2 h-5 w-5" /> Réinitialiser
          </Button>
        </div>
        {timeLeft === 0 && !isRunning && (
            <div className="mt-4 p-3 bg-accent/30 rounded-md text-accent-foreground flex items-center justify-center gap-2">
                <BellRing className="h-5 w-5"/>
                <span>Temps écoulé ! Prenez une pause bien méritée.</span>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground mx-auto">Niveau {intensity}: {intensity <=2 ? "Concentration douce." : intensity <=4 ? "Mode Pomodoro suggéré." : "Rappels stricts activés."}</p>
      </CardFooter>
    </Card>
  );
}
