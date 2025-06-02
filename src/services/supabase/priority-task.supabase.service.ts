
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
    
    console.log("Attempting to add to Supabase (priority_tasks) with explicit snake_case payload:", JSON.stringify(taskPayload, null, 2));

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

    const { user_id: ignoredUserIdInDTO, // Ensure user_id from DTO is not used
            specificDate, 
            specificTime, 
            isCompleted, // camelCase from DTO
            ...restOfTaskData } = taskData;

    const taskToUpdate: any = {
      ...restOfTaskData, // other fields like text, quadrant, frequency
    };

    if (specificDate !== undefined) {
      taskToUpdate.specific_date = specificDate;
    }
    if (specificTime !== undefined) {
      taskToUpdate.specific_time = specificTime;
    }
    if (isCompleted !== undefined) {
      taskToUpdate.is_completed = isCompleted; // Use snake_case for the payload
    }
    
    console.log(`Attempting to update task ${id} in Supabase (priority_tasks) with payload:`, JSON.stringify(taskToUpdate, null, 2));

    const { error: updateError, count } = await supabase
      .from(this.tableName)
      .update(taskToUpdate)
      .eq('id', id)
      .eq('user_id', userId);

    if (updateError) {
      let errorMessage = `Error updating priority task ${id} in Supabase.`;
      let errorDetails = "";
      if (updateError && typeof updateError === 'object') {
          if ('message' in updateError && typeof updateError.message === 'string') {
              errorMessage = updateError.message;
          }
          try {
              errorDetails = JSON.stringify(updateError);
              console.error("Full Supabase error object (JSON) for update operation:", errorDetails);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for update operation.");
          }
      }
      console.error(`Error during Supabase update operation for task ${id}:`, errorMessage, "Original error object:", updateError);
      const customError = new Error(`Supabase update operation failed for task ${id}: ${errorMessage}${errorDetails ? ` (Details: ${errorDetails})` : ''}`);
      (customError as any).originalError = updateError;
      throw customError;
    }

    if (count === 0) {
      const notFoundMsg = `Update matched 0 rows for task with id ${id} and user ${userId}. Task may not exist or RLS prevents update.`;
      console.warn(notFoundMsg);
      // It's crucial to throw an error here, as handleOnlineOperation expects the updated entity.
      // If 0 rows were updated, we can't fetch the "updated" entity.
      const customError = new Error(notFoundMsg);
      (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED'; // Custom code to signify this situation
      throw customError;
    }

    // If update was successful (count > 0), now fetch the updated row to get the server's timestamp etc.
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
        // This case should ideally not be reached if count > 0 and selectError is null.
        // It's a safeguard.
        throw new Error(`Failed to fetch updated task ${id} after successful update, no data returned, though ${count} rows were reported as updated.`);
    }

    return updatedTaskData as PriorityTask;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
        throw new Error("PriorityTaskSupabaseService.delete: userId is required to delete a task.");
    }
    console.log(`Attempting to delete task ${id} from Supabase (priority_tasks) for user ${userId}`);
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
        // For delete, if 0 rows are affected, it might not be a hard error for the client flow,
        // as the item effectively doesn't exist on the server from this user's perspective.
        // The sync reconciliation should eventually remove it locally if it was soft-deleted.
        // However, if the expectation is that it *must* exist to be deleted, an error could be thrown here.
        // For now, we'll log a warning and let the flow proceed (e.g., local hard delete).
    }
  }
}
