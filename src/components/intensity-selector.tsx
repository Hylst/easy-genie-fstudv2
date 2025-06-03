
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { IntensityLevel } from '@/types';

const intensityLevels: IntensityLevel[] = [
  { value: 1, name: "Minimal", description: "Support léger." },
  { value: 2, name: "Modéré", description: "Support présent." },
  { value: 3, name: "Standard", description: "Équilibre structure/liberté." },
  { value: 4, name: "Intensif", description: "Structure forte." },
  { value: 5, name: "Maximum", description: "Approche directive." },
];

interface IntensitySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function IntensitySelector({ value, onChange }: IntensitySelectorProps) {
  const currentLevel = intensityLevels.find(level => level.value === value) || intensityLevels[2];

  return (
    <div className="space-y-2 p-3 rounded-lg shadow-sm bg-gradient-to-tr from-primary/5 via-background to-accent/5 hover:from-primary/10 hover:to-accent/10 hover:shadow-md transition-all duration-300 dark:from-primary/10 dark:via-card dark:to-accent/10 dark:hover:from-primary/20 dark:hover:to-accent/20">
      <Label htmlFor="intensity-slider" className="text-base font-semibold text-foreground">
        Niveau d'Énergie Magique: <span className="text-primary font-bold">{currentLevel.name}</span>
      </Label>
      <Slider
        id="intensity-slider"
        min={1}
        max={5}
        step={1}
        value={[value]}
        onValueChange={(newValues) => onChange(newValues[0])}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground h-auto min-h-[1.5em]">{currentLevel.description}</p>
    </div>
  );
}
