
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
    
    const taskPayload: any = {
      text: taskData.text,
      quadrant: taskData.quadrant,
      frequency: taskData.frequency,
      specific_date: taskData.specificDate,
      specific_time: taskData.specificTime,
      user_id: userId,
      is_completed: taskData.isCompleted ?? false, 
    };
    
    console.log(`Attempting to add to Supabase (${this.tableName}) with explicit snake_case payload:`, JSON.stringify(taskPayload, null, 2));

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskPayload)
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
                console.error("Full Supabase error object (JSON) for add:", errorDetails);
            } catch (e) {
                console.error("Could not stringify the full Supabase error object for add.");
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

    const { user_id: ignoredUserIdInDTO, 
            specificDate, 
            specificTime, 
            isCompleted,
            ...restOfTaskData } = taskData;

    const taskToUpdate: any = {
      ...restOfTaskData,
    };
    if (specificDate !== undefined) taskToUpdate.specific_date = specificDate;
    if (specificTime !== undefined) taskToUpdate.specific_time = specificTime;
    if (isCompleted !== undefined) taskToUpdate.is_completed = isCompleted;
    
    console.log(`Attempting to update task ${id} in Supabase (${this.tableName}) with explicit snake_case payload:`, JSON.stringify(taskToUpdate, null, 2));

    // Step 1: Perform the update operation.
    const { error: updateOpError, count } = await supabase
      .from(this.tableName)
      .update(taskToUpdate)
      .eq('id', id)
      .eq('user_id', userId);

    if (updateOpError) {
      let errorMessage = `Error during Supabase update operation for task ${id}.`;
      let errorDetails = "";
      if (updateOpError && typeof updateOpError === 'object') {
          if ('message' in updateOpError && typeof updateOpError.message === 'string') {
              errorMessage = updateOpError.message;
          }
          try {
              errorDetails = JSON.stringify(updateOpError);
              console.error("Full Supabase error object (JSON) for update operation:", errorDetails);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for update operation.");
          }
      }
      console.error(errorMessage, "Original error object:", updateOpError);
      const customError = new Error(`${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
      (customError as any).originalError = updateOpError;
      throw customError;
    }

    if (count === 0) {
      const notFoundMsg = `Update for task ${id} (user ${userId}) matched 0 rows. Task may not exist or RLS prevents update.`;
      console.warn(notFoundMsg);
      const customError = new Error(notFoundMsg);
      (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
      throw customError;
    }

    // Step 2: If update was successful (count > 0), fetch the updated row to get server timestamps etc.
    const { data: updatedTaskData, error: selectError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (selectError) {
      let errorMessage = `Error fetching updated task ${id} after successful update confirmation.`;
      let errorDetails = "";
       if (selectError && typeof selectError === 'object') {
          if ('message' in selectError && typeof selectError.message === 'string') {
              errorMessage = selectError.message;
          }
          try {
              errorDetails = JSON.stringify(selectError);
              console.error("Full Supabase error object (JSON) for select after update:", errorDetails);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for select after update.");
          }
      }
      console.error(`${errorMessage} Supabase select error for task ${id}:`, selectError.message, "Original error object:", selectError);
      const customError = new Error(`${errorMessage} Supabase select error: ${selectError.message}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
      (customError as any).originalError = selectError;
      throw customError;
    }
    
    if (!updatedTaskData) {
        throw new Error(`Failed to fetch updated task ${id} after successful update, no data returned, though ${count} rows were reported as updated.`);
    }

    return updatedTaskData as PriorityTask;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.delete: userId is required to delete a task.");
    }
    console.log(`Attempting to delete task ${id} from Supabase (${this.tableName}) for user ${userId}`);
    const { error, count } = await supabase
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

    if (count === 0) {
        console.warn(`Supabase delete for task ${id} (user ${userId}) affected 0 rows. The task might have already been deleted, or RLS policies might be preventing deletion for this user, or the task ID/user ID combination doesn't exist.`);
    }
  }
}
