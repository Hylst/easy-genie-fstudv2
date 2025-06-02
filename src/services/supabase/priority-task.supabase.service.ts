
// src/services/supabase/priority-task.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IPriorityTaskService } from '../interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';

export class PriorityTaskSupabaseService implements IPriorityTaskService {
  private tableName = 'priority_tasks';

  async getAll(userId: string): Promise<PriorityTask[]> {
    if (!userId) {
        console.warn("PriorityTaskSupabaseService.getAll: userId is required. Returning empty array.");
        return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching all priority tasks from Supabase:", error);
        throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<PriorityTask | null> {
    if (!userId) {
        console.warn("PriorityTaskSupabaseService.getById: userId is required.");
        return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found'
        console.error(`Error fetching priority task ${id} from Supabase:`, error);
        throw error;
    }
    return data;
  }

  async add(taskData: CreatePriorityTaskDTO, userId: string): Promise<PriorityTask> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.add: userId is required to add a task.");
    }
    const taskToAdd = {
      ...taskData,
      user_id: userId,
      isCompleted: taskData.isCompleted ?? false,
    };
    console.log("Attempting to add to Supabase (priority_tasks):", JSON.stringify(taskToAdd, null, 2));


    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskToAdd)
      .select()
      .single();

    if (error) {
        let errorMessage = "Unknown error adding priority task to Supabase.";
        let errorDetails = "";
        if (error && typeof error === 'object') {
            if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
            try {
                errorDetails = JSON.stringify(error);
                console.error("Full Supabase error object (JSON):", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object.");
            }
        }
        console.error("Error adding priority task to Supabase:", errorMessage, error); // Log original error too
        // Re-throw as a standard Error, including details if possible
        const customError = new Error(`Supabase add failed: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
        (customError as any).originalError = error; // Attach original error if needed upstream
        throw customError;
    }
    if (!data) {
        throw new Error("Failed to add priority task to Supabase, no data returned (อาจจะ RLS policy?).");
    }
    return data as PriorityTask;
  }

  async update(id: string, taskData: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.update: userId is required to update a task.");
    }
    const { user_id: ignoredUserIdInDTO, ...restOfTaskData } = taskData as any; 

    const taskToUpdate = {
      ...restOfTaskData,
    };
    console.log(`Attempting to update task ${id} in Supabase (priority_tasks):`, JSON.stringify(taskToUpdate, null, 2));
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(taskToUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
        let errorMessage = `Unknown error updating priority task ${id} in Supabase.`;
         let errorDetails = "";
        if (error && typeof error === 'object') {
            if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
             try {
                errorDetails = JSON.stringify(error);
                console.error("Full Supabase error object (JSON):", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object.");
            }
        }
        console.error(`Error updating priority task ${id} in Supabase:`, errorMessage, error);
        const customError = new Error(`Supabase update failed for task ${id}: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
        (customError as any).originalError = error;
        throw customError;
    }
    if (!data) {
        throw new Error(`Failed to update priority task ${id} in Supabase, no data returned or task not found for user.`);
    }
    return data as PriorityTask;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.delete: userId is required to delete a task.");
    }
    console.log(`Attempting to delete task ${id} from Supabase (priority_tasks) for user ${userId}`);
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
        let errorMessage = `Unknown error deleting priority task ${id} from Supabase.`;
        let errorDetails = "";
        if (error && typeof error === 'object') {
            if ('message' in error && typeof error.message === 'string') {
                errorMessage = error.message;
            }
            try {
                errorDetails = JSON.stringify(error);
                console.error("Full Supabase error object (JSON):", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object.");
            }
        }
        console.error(`Error deleting priority task ${id} from Supabase:`, errorMessage, error);
        const customError = new Error(`Supabase delete failed for task ${id}: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
        (customError as any).originalError = error;
        throw customError;
    }
  }
}
