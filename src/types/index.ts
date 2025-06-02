
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

export const DAYS_OF_WEEK_ARRAY = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;
export type DayOfWeek = typeof DAYS_OF_WEEK_ARRAY[number];


// --- Data Model Interfaces (for DB interaction) ---
interface BaseEntity {
  id: string; // UUID
  user_id: string;
  created_at: string; // ISO Date string
  updated_at: string; // ISO Date string
}

export type Frequency = "once" | "daily" | "weekly" | "bi-weekly" | "monthly" | "yearly";

export interface PriorityTask extends BaseEntity {
  text: string;
  quadrant: 'urgentImportant' | 'notUrgentImportant' | 'urgentNotImportant' | 'notUrgentNotImportant';
  frequency?: Frequency;
  specificDate?: string; // ISO string for date part
  specificTime?: string; // HH:mm
  isCompleted: boolean; // Added for tracking completion
}

export interface RoutineStep extends BaseEntity {
  routine_id: string; // Foreign key to Routine
  text: string;
  order: number; // To maintain step order
  // isCompleted field might be transient, or part of a separate "RoutineExecution" table later
}

export interface Routine extends BaseEntity {
  name: string;
  description?: string;
  days: DayOfWeek[]; // Stored as an array of strings
  // steps are now in RoutineStep table
}

export interface BrainDumpContent extends BaseEntity {
  dump_text: string;
  analysis_text?: string;
  intensity_level_on_analysis?: number;
}

export interface TaskBreakerTask extends BaseEntity {
  parent_id?: string | null; // For nesting, null if root task for a user's specific breakdown
  main_task_text_context?: string; // If this task is a subtask, what was the main task it belongs to.
  text: string;
  is_completed: boolean;
  depth: number; // UI helper for nesting, can be derived or stored
  order: number; // To maintain order among siblings
}


// --- DTOs for Create operations (omitting id, user_id, created_at, updated_at as they are set by system/DB) ---
export type CreatePriorityTaskDTO = Omit<PriorityTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'isCompleted'> & { isCompleted?: boolean };
export type CreateRoutineDTO = Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CreateRoutineStepDTO = Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CreateBrainDumpContentDTO = Omit<BrainDumpContent, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
export type CreateTaskBreakerTaskDTO = Omit<TaskBreakerTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'depth'> & { depth?: number};


// For UI state, not directly for DB, might differ slightly (e.g. dates as Date objects)
export interface UIRoutine extends Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  id: string; // For UI key
  user_id?: string; // Optional during creation
  created_at?: string | Date;
  updated_at?: string | Date;
  steps: UIRoutineStep[];
  isSuggestion?: boolean;
}

export interface UIRoutineStep extends Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'routine_id' | 'order'>