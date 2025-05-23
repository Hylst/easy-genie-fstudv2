"use client";

import type { Dispatch, SetStateAction } from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { IntensityLevel } from '@/types';

const intensityLevels: IntensityLevel[] = [
  { value: 1, name: "Minimal", description: "Support léger, suggestions douces." },
  { value: 2, name: "Modéré", description: "Support plus présent, quelques contraintes." },
  { value: 3, name: "Standard", description: "Équilibre entre liberté et structure." },
  { value: 4, name: "Intensif", description: "Structure forte, nombreux rappels." },
  { value: 5, name: "Maximum", description: "Contraintes fortes, approche très directive." },
];

interface IntensitySelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function IntensitySelector({ value, onChange }: IntensitySelectorProps) {
  const currentLevel = intensityLevels.find(level => level.value === value) || intensityLevels[2];

  return (
    <div className="space-y-4 p-4 border rounded-lg shadow-sm bg-card">
      <Label htmlFor="intensity-slider" className="text-lg font-semibold text-foreground">
        Niveau d'Énergie Magique: <span className="text-primary">{currentLevel.name}</span>
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
      <p className="text-sm text-muted-foreground h-10">{currentLevel.description}</p>
    </div>
  );
}
