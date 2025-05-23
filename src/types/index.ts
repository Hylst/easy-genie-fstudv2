import type { LucideIcon } from 'lucide-react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  dataAiHint: string;
}

export interface IntensityLevel {
  value: number;
  name: string;
  description: string;
}

export type FormalizerStyle = 
  | "Plus professionnel"
  | "Plus concis"
  | "Plus amical"
  | "Moins formel / Plus décontracté"
  | "Plus direct"
  | "Plus diplomate"
  | "Simplifier (ELI5)"
  | "Transformer en liste à puces"
  | "Transformer en e-mail court"
  | "Rendre sarcastique";

export type DayOfWeek = 'Lun' | 'Mar' | 'Mer' | 'Jeu' | 'Ven' | 'Sam' | 'Dim';

export interface RoutineStep {
  id: string;
  text: string;
  isCompleted: boolean; // For potential future interactive execution
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  days: DayOfWeek[];
  steps: RoutineStep[];
  // time?: string; // Optional: specific time for the routine
}
