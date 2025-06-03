
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
  sync_status?: 'synced' | 'new' | 'updated' | 'deleted';
  last_synced_at?: string; // ISO Date string
}

export type Frequency = "once" | "daily" | "weekly" | "bi-weekly" | "monthly" | "yearly";

export interface PriorityTask extends BaseEntity {
  text: string;
  quadrant: 'urgentImportant' | 'notUrgentImportant' | 'urgentNotImportant' | 'notUrgentNotImportant';
  frequency?: Frequency;
  specificDate?: string; // ISO string for date part
  specificTime?: string; // HH:mm
  isCompleted: boolean; 
}

export interface RoutineStep extends BaseEntity {
  routine_id: string; // Foreign key to Routine
  text: string;
  order: number; // To maintain step order
  isCompleted: boolean; // Completion status of the step
}

export interface Routine extends BaseEntity {
  name: string;
  description?: string;
  days: DayOfWeek[]; // Stored as an array of strings
  // steps are related via routine_id in RoutineStep table/store
}

export interface BrainDumpContent extends BaseEntity {
  dump_text: string;
  analysis_text?: string;
  intensity_level_on_analysis?: number;
}

// TaskBreakerTask as stored in the database
export interface TaskBreakerTask extends BaseEntity {
  parent_id?: string | null; 
  main_task_text_context?: string; // Context of the original main task for top-level items
  text: string;
  is_completed: boolean;
  depth: number; 
  order: number; 
  // isExpanded is UI state, not stored in DB
}


// --- DTOs for Create operations ---
export type CreatePriorityTaskDTO = Omit<PriorityTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'isCompleted' | 'sync_status' | 'last_synced_at'> & { isCompleted?: boolean };

export type CreateRoutineDTO = Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;

export type CreateRoutineStepDTO = Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'isCompleted' | 'sync_status' | 'last_synced_at'> & { 
  isCompleted?: boolean;
  routine_id: string; 
  order: number; 
};

export type CreateBrainDumpContentDTO = Omit<BrainDumpContent, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;

// DTO for creating TaskBreakerTask, note isExpanded is removed as it's UI state
export type CreateTaskBreakerTaskDTO = Omit<TaskBreakerTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed' | 'depth' | 'sync_status' | 'last_synced_at'> & { 
  is_completed?: boolean; 
  depth?: number; 
  parent_id?: string | null;
  main_task_text_context?: string;
  order: number; 
};


// --- Specific types for TaskBreakerTool History & Presets (Currently LocalStorage only) ---
// This is the TaskBreakerTask structure as used in the UI and for localStorage history
// It includes isExpanded for UI state persistence
export interface UITaskBreakerTask extends TaskBreakerTask {
  subTasks: UITaskBreakerTask[]; // For client-side tree structure
  isExpanded: boolean;
}
export interface SavedTaskBreakdown {
  id: string;
  name: string; // User-given name for this saved breakdown
  mainTaskText: string; // The original main task text input
  subTasks: UITaskBreakerTask[]; // The tree of tasks including their expansion state
  createdAt: string; // ISO date string
  intensityOnSave?: number; 
}

export interface CommonTaskPreset {
  id: string;
  name: string; // Name displayed in the preset list (e.g., "Organiser un événement"). For custom, user-given.
  taskText: string; // The actual task text to load into the mainTask input.
  isSystemPreset?: boolean; // True for hardcoded, false/undefined for user-created (custom)
}


// For UI state, not directly for DB, might differ slightly (e.g. dates as Date objects)
export interface UIRoutine extends Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'> {
  id: string; 
  user_id?: string; 
  created_at?: string | Date;
  updated_at?: string | Date;
  steps: UIRoutineStep[];
  isSuggestion?: boolean;
}

export interface UIRoutineStep extends Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'routine_id' | 'order' | 'isCompleted' | 'sync_status' | 'last_synced_at'>
{
  id: string;
  text: string;
  isCompleted: boolean;
}
