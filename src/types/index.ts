
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

export interface TaskBreakerTask extends BaseEntity {
  parent_id?: string | null; // UUID of parent task, or null for root tasks related to a main concept
  main_task_text_context?: string; // Optional: original main task text if this is a root-level subtask
  text: string;
  is_completed: boolean;
  depth: number; // 0 for direct children of a main task concept, 1 for children of those, etc.
  order: number; // Order within its siblings
}


// --- DTOs for Create operations ---
// These omit system-generated fields like id, user_id (passed separately), created_at, updated_at, sync_status, last_synced_at.
// isCompleted and other optional fields may have defaults handled by services.

export type CreatePriorityTaskDTO = Omit<PriorityTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'isCompleted' | 'sync_status' | 'last_synced_at'> & { isCompleted?: boolean };

export type CreateRoutineDTO = Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;

export type CreateRoutineStepDTO = Omit<RoutineStep, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'isCompleted' | 'sync_status' | 'last_synced_at'> & { 
  isCompleted?: boolean;
  routine_id: string; // Must be provided when creating a step
  order: number; // Must be provided
};

export type CreateBrainDumpContentDTO = Omit<BrainDumpContent, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;

export type CreateTaskBreakerTaskDTO = Omit<TaskBreakerTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed' | 'depth' | 'sync_status' | 'last_synced_at'> & { 
  is_completed?: boolean; 
  depth?: number; // Optional here, can be set by service based on parent
  parent_id?: string | null;
  main_task_text_context?: string;
  order: number; // Must be provided
};


// For UI state, not directly for DB, might differ slightly (e.g. dates as Date objects)
// These UI types are from previous iterations and might need review/removal if fully replaced by DB types
export interface UIRoutine extends Omit<Routine, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'> {
  id: string; // For UI key
  user_id?: string; // Optional during creation
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
