
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
    // Explicitly use snake_case for is_completed as a diagnostic step
    const { isCompleted, ...restTaskData } = taskData;
    const taskPayload: any = {
      ...restTaskData,
      user_id: userId,
      is_completed: isCompleted ?? false, // Explicitly use snake_case key
    };
    
    console.log("Attempting to add to Supabase (priority_tasks) with explicit snake_case payload:", JSON.stringify(taskPayload, null, 2));

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskPayload) // Send the payload with is_completed
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
        console.error("Error adding priority task to Supabase (summary):", errorMessage, "Original error object:", error);
        const customError = new Error(`Supabase add failed: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
        (customError as any).originalError = error; // Attach original error if needed upstream
        throw customError;
    }
    if (!data) {
        throw new Error("Failed to add priority task to Supabase, no data returned (check RLS policies and ensure operation succeeded).");
    }
    return data as PriorityTask;
  }

  async update(id: string, taskData: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.update: userId is required to update a task.");
    }
    // Explicitly use snake_case for is_completed if present in taskData
    const { user_id: ignoredUserIdInDTO, isCompleted, ...restOfTaskData } = taskData as any; 

    const taskToUpdate: any = {
      ...restOfTaskData,
    };
    if (isCompleted !== undefined) { // Only include is_completed if it's part of the update
        taskToUpdate.is_completed = isCompleted;
    }
    
    console.log(`Attempting to update task ${id} in Supabase (priority_tasks) with explicit snake_case payload:`, JSON.stringify(taskToUpdate, null, 2));
    
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
                console.error("Full Supabase error object (JSON) for update:", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object for update.");
            }
        }
        console.error(`Error updating priority task ${id} in Supabase (summary):`, errorMessage, "Original error object:", error);
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
                console.error("Full Supabase error object (JSON) for delete:", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object for delete.");
            }
        }
        console.error(`Error deleting priority task ${id} from Supabase (summary):`, errorMessage, "Original error object:", error);
        const customError = new Error(`Supabase delete failed for task ${id}: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
        (customError as any).originalError = error;
        throw customError;
    }
  }
}
