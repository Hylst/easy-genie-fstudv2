
import type { LucideIcon } from 'lucide-react';
import type { SVGProps } from 'react';

export interface Tool {
  id: string;
  name: string;
  description: string;
  href: string;
  icon: LucideIcon; // For the small icon in the header
  illustration: React.ComponentType<SVGProps<SVGSVGElement>>; // For the card content
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
  specificDate?: string; // ISO string for date part 'YYYY-MM-DD'
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

export interface BrainDumpHistoryEntry extends BaseEntity {
  name: string; // User-defined or timestamp-based
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
  estimated_time_minutes?: number | null;
}

export interface TaskBreakerCustomPreset extends BaseEntity {
  name: string;
  task_text: string;
}

export interface TaskBreakerSavedBreakdown extends BaseEntity {
  name: string;
  main_task_text: string;
  sub_tasks_json: string; // JSON string of UITaskBreakerTask[] structure at time of save
  intensity_on_save?: number;
}

export interface PriorityGridCustomPreset extends BaseEntity {
  name: string;
  task_text: string;
  quadrant: PriorityTask['quadrant'];
  frequency?: Frequency;
  specific_date?: string; // 'YYYY-MM-DD'
  specific_time?: string; // 'HH:mm'
}

export interface TimeFocusPreset extends BaseEntity {
  name: string;
  work_duration_minutes: number;
  short_break_minutes: number;
  long_break_minutes: number;
  pomodoros_per_cycle: number;
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
export type CreateBrainDumpHistoryEntryDTO = Omit<BrainDumpHistoryEntry, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;

export type CreateTaskBreakerTaskDTO = Omit<TaskBreakerTask, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_completed' | 'depth' | 'sync_status' | 'last_synced_at'> & {
  is_completed?: boolean;
  depth?: number;
  parent_id?: string | null;
  main_task_text_context?: string;
  order: number;
  estimated_time_minutes?: number | null;
};
export type CreateTaskBreakerCustomPresetDTO = Omit<TaskBreakerCustomPreset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;
export type CreateTaskBreakerSavedBreakdownDTO = Omit<TaskBreakerSavedBreakdown, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;
export type CreatePriorityGridCustomPresetDTO = Omit<PriorityGridCustomPreset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;
export type CreateTimeFocusPresetDTO = Omit<TimeFocusPreset, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'sync_status' | 'last_synced_at'>;


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

// Type for PriorityGrid client-side preset structure (used for both hardcoded and custom)
export interface PriorityGridPresetClient {
  id: string; // For custom presets, this will be the DB ID. For hardcoded, a unique string.
  name: string;
  text: string;
  quadrant: PriorityTask['quadrant'];
  frequency?: Frequency;
  specificDate?: string; // Could be 'today', 'tomorrow', or 'YYYY-MM-DD' for hardcoded, or 'YYYY-MM-DD' from DB
  specificTime?: string;
  isCustom?: boolean; // To distinguish between hardcoded and user-saved
}

// Type for TimeFocus client-side preset structure
export interface TimeFocusSystemPreset {
  id: string;
  name: string;
  work: number; // minutes
  short: number; // minutes
  long: number; // minutes
  cycle: number; // pomodoros per long break
}

export interface TimeFocusDisplayPreset extends TimeFocusSystemPreset {
    isCustom?: boolean; // For UI distinction
}

// Types for Immersive Reader
export interface ImmersiveReaderSettings {
  fontSize: number;
  fontFamily: 'System' | 'Sans-Serif' | 'Serif' | 'OpenDyslexic';
  lineHeight: number;
  letterSpacing: number;
  wordSpacing: number;
  theme: 'light' | 'dark' | 'sepia';
  focusMode: 'none' | 'line' | 'paragraph'; // 'paragraph' is not yet fully implemented in UI rendering
  enableSentenceHighlighting: boolean;
}

export interface ImmersiveReaderDisplayPreset {
  name: string;
  settings: ImmersiveReaderSettings;
  isSystemPreset?: boolean;
  isDefault?: boolean; // Not directly used for selection logic, but can be for UI indicators
}

// Types for TimeFocus Tool Ambient Sounds
export interface AmbientSound {
  id: 'none' | 'whiteNoise' | 'pinkNoise' | 'brownianNoise' | 'rain' | 'waves' | 'drone_50hz' | 'binaural_10hz';
  name: string;
  // filePath is no longer needed for synthetically generated sounds
}

```