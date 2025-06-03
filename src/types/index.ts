
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
}

export interface BrainDumpContent extends BaseEntity {
  dump_text: string;
  analysis_text?: string;
  intensity_level_on_analysis?: number;
}

export interface TaskBreakerTask extends BaseEntity {
  parent_id?: string | null;
  main_task_text_context?: string;
  text: string;
  is_completed: boolean;
  depth: number;
  order: number;
}

export interface TaskBreakerCustomPreset extends BaseEntity {
  name: string;
  task_text: string;
}

// For Task Breaker History (now stored in DB)
export interface TaskBreakerSavedBreakdown extends BaseEntity {
  name: string;
  main_task_text: string;
  sub_tasks_json: string; // JSON string of UITaskBreakerTask[] structure at time of save
  intensity_on_save?: number;
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
export type CreateTaskBreakerTaskDTO = Omit<TaskBreakerTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed' | 'depth' | 'sync_status' | 'last_synced_at'> & {
  is_completed?: boolean;
  depth?: number;
  parent_id?: string | null;
  main_task_text_context?: string;
  order: number;
};
export type CreateTaskBreakerCustomPresetDTO = Omit<TaskBreakerCustomPreset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;
export type CreateTaskBreakerSavedBreakdownDTO = Omit<TaskBreakerSavedBreakdown, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;


// --- Specific types for TaskBreakerTool client-side UI and Presets ---
export interface UITaskBreakerTask extends TaskBreakerTask {
  subTasks: UITaskBreakerTask[];
  isExpanded: boolean; // UI state, not persisted directly with task, but via expandedStates
}

// Used in TaskBreakerTool for system presets (text only for main task)
export interface TaskSuggestionPreset {
  id: string;
  name: string;
  taskText: string;
  category: string;
}

// New type for pre-decomposed task presets
export interface PreDecomposedTaskSubTask {
  text: string;
  is_completed?: boolean; // Optional, defaults to false
  subTasks?: PreDecomposedTaskSubTask[];
}
export interface PreDecomposedTaskPreset {
  id: string;
  name: string;
  mainTaskText: string;
  category: string;
  subTasks: PreDecomposedTaskSubTask[];
}
