
// src/services/supabase/routine.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IRoutineService } from '../interfaces/IRoutineService';
import type { Routine, CreateRoutineDTO, RoutineStep, CreateRoutineStepDTO } from '@/types';

export class RoutineSupabaseService implements IRoutineService {
  private routineTable = 'routines';
  private stepTable = 'routine_steps';

  // --- Routine Methods ---
  async getAll(userId: string): Promise<Routine[]> {
    if (!userId) {
      console.warn("RoutineSupabaseService.getAllRoutines: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.routineTable)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching all routines from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<Routine | null> {
    if (!userId) {
      console.warn("RoutineSupabaseService.getRoutineById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.routineTable)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching routine ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(routineData: CreateRoutineDTO, userId: string): Promise<Routine> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.addRoutine: userId is required.");
    }
    const routineToAdd = { ...routineData, user_id: userId };
    const { data, error } = await supabase
      .from(this.routineTable)
      .insert(routineToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding routine to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add routine to Supabase, no data returned.");
    return data as Routine;
  }

  async update(id: string, routineData: Partial<CreateRoutineDTO>, userId: string): Promise<Routine> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.updateRoutine: userId is required.");
    }
    const { user_id: ignored, ...updateData } = routineData as any;
    const { data, error } = await supabase
      .from(this.routineTable)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating routine ${id} in Supabase:`, error);
      throw error;
    }
    if (!data) throw new Error("Failed to update routine, no data returned or routine not found for user.");
    return data as Routine;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.deleteRoutine: userId is required.");
    }
    // First delete associated steps due to potential foreign key constraints or just for cleanup
    const { error: stepError } = await supabase
        .from(this.stepTable)
        .delete()
        .eq('routine_id', id)
        .eq('user_id', userId);

    if (stepError) {
        console.error(`Error deleting steps for routine ${id} from Supabase:`, stepError);
        throw stepError;
    }

    const { error } = await supabase
      .from(this.routineTable)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting routine ${id} from Supabase:`, error);
      throw error;
    }
  }

  // --- RoutineStep Methods ---
  async getStepsForRoutine(routineId: string, userId: string): Promise<RoutineStep[]> {
    if (!userId) {
      console.warn("RoutineSupabaseService.getStepsForRoutine: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.stepTable)
      .select('*')
      .eq('routine_id', routineId)
      .eq('user_id', userId)
      .order('order', { ascending: true });

    if (error) {
      console.error(`Error fetching steps for routine ${routineId} from Supabase:`, error);
      throw error;
    }
    return data || [];
  }

  async addStepToRoutine(routineId: string, stepData: CreateRoutineStepDTO, userId: string): Promise<RoutineStep> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.addStepToRoutine: userId is required.");
    }
    if (stepData.routine_id !== routineId) {
      throw new Error("Routine ID in stepData does not match the provided routineId.");
    }
    const stepToAdd = { 
      ...stepData, 
      user_id: userId,
      isCompleted: stepData.isCompleted ?? false
    };
    const { data, error } = await supabase
      .from(this.stepTable)
      .insert(stepToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding routine step to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add routine step to Supabase, no data returned.");
    return data as RoutineStep;
  }

  async updateRoutineStep(stepId: string, stepData: Partial<CreateRoutineStepDTO>, userId: string): Promise<RoutineStep> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.updateRoutineStep: userId is required.");
    }
    const { user_id: ignored, routine_id: ignoredRoutineId, ...updateData } = stepData as any;
    const { data, error } = await supabase
      .from(this.stepTable)
      .update(updateData)
      .eq('id', stepId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating routine step ${stepId} in Supabase:`, error);
      throw error;
    }
    if (!data) throw new Error("Failed to update routine step, no data returned or step not found for user.");
    return data as RoutineStep;
  }

  async deleteRoutineStep(stepId: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("RoutineSupabaseService.deleteRoutineStep: userId is required.");
    }
    const { error } = await supabase
      .from(this.stepTable)
      .delete()
      .eq('id', stepId)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting routine step ${stepId} from Supabase:`, error);
      throw error;
    }
  }
}
