
// src/services/supabase/task-breaker.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { ITaskBreakerService } from '../interfaces/ITaskBreakerService';
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';

export class TaskBreakerSupabaseService implements ITaskBreakerService {
  private tableName = 'task_breaker_tasks';

  private mapToSupabase(data: CreateTaskBreakerTaskDTO | Partial<CreateTaskBreakerTaskDTO>, userId?: string): any {
    const { estimated_time_minutes, ...rest } = data;
    const payload: any = { ...rest };
    if (userId) payload.user_id = userId;
    if (estimated_time_minutes !== undefined) {
      payload.estimated_time_minutes = estimated_time_minutes;
    }
    return payload;
  }

  private mapFromSupabase(data: any): TaskBreakerTask {
    return {
      ...data,
      is_completed: data.is_completed ?? false,
      estimated_time_minutes: data.estimated_time_minutes, 
    } as TaskBreakerTask;
  }


  async getAll(userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('depth', { ascending: true })
      .order('order', { ascending: true });

    if (error) {
      console.error("Error fetching all TaskBreaker tasks from Supabase:", error);
      throw error;
    }
    return (data || []).map(this.mapFromSupabase);
  }

  async getById(id: string, userId: string): Promise<TaskBreakerTask | null> {
    if (!userId) {
      console.warn("TaskBreakerSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching TaskBreaker task ${id} from Supabase:`, error);
      throw error;
    }
    return data ? this.mapFromSupabase(data) : null;
  }
  
  async getTasksByParent(parentId: string | null, userId: string): Promise<TaskBreakerTask[]> {
    if (!userId) {
      console.warn("TaskBreakerSupabaseService.getTasksByParent: userId is required. Returning empty array.");
      return [];
    }
    let query = supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId);

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }
    
    const { data, error } = await query.order('order', { ascending: true });

    if (error) {
      console.error(`Error fetching tasks by parent ${parentId} from Supabase:`, error);
      throw error;
    }
    return (data || []).map(this.mapFromSupabase);
  }


  async add(taskData: CreateTaskBreakerTaskDTO, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerSupabaseService.add: userId is required.");
    }

    let depth = 0; 
    if (taskData.parent_id) {
        const parentTask = await this.getById(taskData.parent_id, userId);
        if (parentTask) {
            depth = parentTask.depth + 1;
        } else {
             console.warn(`Supabase: Parent task ${taskData.parent_id} not found for user ${userId} during add. Setting depth based on DTO or 0.`);
             depth = taskData.depth ?? 0;
        }
    } else {
        depth = taskData.depth ?? 0;
    }

    const taskToAddSupabase = this.mapToSupabase({
        ...taskData,
        depth: depth,
        is_completed: taskData.is_completed ?? false,
    }, userId);

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskToAddSupabase)
      .select()
      .single();

    if (error) {
      let errorMessage = `Error adding TaskBreaker task to Supabase.`;
      let errorDetailsString = "";
      if (error && typeof error === 'object') {
          if ('message' in error && typeof (error as any).message === 'string') {
              errorMessage = (error as any).message;
          }
          if ('details' in error && typeof (error as any).details === 'string') {
              errorMessage += ` Details: ${(error as any).details}`;
          }
          if ('hint' in error && typeof (error as any).hint === 'string') {
              errorMessage += ` Hint: ${(error as any).hint}`;
          }
           if ('code' in error && typeof (error as any).code === 'string') {
              errorMessage += ` Code: ${(error as any).code}`;
          }
          try {
              errorDetailsString = JSON.stringify(error);
              console.error("Full Supabase error object (JSON) for add operation:", errorDetailsString);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for add operation.");
          }
      }
      console.error(`Error adding TaskBreaker task to Supabase (summary):`, errorMessage, "Original error object:", error);
      const customError = new Error(errorMessage);
      (customError as any).originalError = error;
      (customError as any).code = (error as any).code;
      throw customError;
    }
    if (!data) throw new Error("Failed to add TaskBreaker task, no data returned.");
    return this.mapFromSupabase(data);
  }

  async update(id: string, taskData: Partial<CreateTaskBreakerTaskDTO>, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerSupabaseService.update: userId is required.");
    }
    const { user_id: ignoredUserId, ...updatePayloadRaw } = taskData;
    
    let depthToSet;
    if (updatePayloadRaw.parent_id !== undefined) { 
        if (updatePayloadRaw.parent_id === null) {
            depthToSet = 0;
        } else {
            const parentTask = await this.getById(updatePayloadRaw.parent_id, userId);
            depthToSet = parentTask ? parentTask.depth + 1 : 0;
        }
    } else if (updatePayloadRaw.depth !== undefined) {
        depthToSet = updatePayloadRaw.depth;
    }

    const taskToUpdateSupabase = this.mapToSupabase({
      ...updatePayloadRaw,
      ...(depthToSet !== undefined && { depth: depthToSet }),
    });


    const { error: updateOpError, count } = await supabase
      .from(this.tableName)
      .update(taskToUpdateSupabase)
      .eq('id', id)
      .eq('user_id', userId);

    if (updateOpError) {
      let errorMessage = `Error during Supabase update operation for TaskBreaker task ${id}.`;
      let errorDetailsString = "";
      if (updateOpError && typeof updateOpError === 'object') {
          if ('message' in updateOpError && typeof (updateOpError as any).message === 'string') {
              errorMessage = (updateOpError as any).message;
          }
          if ('details' in updateOpError && typeof (updateOpError as any).details === 'string') {
              errorMessage += ` Details: ${(updateOpError as any).details}`;
          }
          if ('hint' in updateOpError && typeof (updateOpError as any).hint === 'string') {
              errorMessage += ` Hint: ${(updateOpError as any).hint}`;
          }
          if ('code' in updateOpError && typeof (updateOpError as any).code === 'string') {
              errorMessage += ` Code: ${(updateOpError as any).code}`;
          }
          try {
              errorDetailsString = JSON.stringify(updateOpError);
              console.error("Full Supabase error object (JSON) for update operation:", errorDetailsString);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for update operation.");
          }
      }
      console.error(`Error updating TaskBreaker task ${id} in Supabase (summary):`, errorMessage, "Original error object:", updateOpError);
      const customError = new Error(errorMessage);
      (customError as any).originalError = updateOpError;
      (customError as any).code = (updateOpError as any).code;
      throw customError;
    }

    if (count === 0) {
      const notFoundMsg = `Update for TaskBreaker task ${id} (user ${userId}) matched 0 rows. Task may not exist or RLS prevents update.`;
      console.warn(notFoundMsg);
      const customError = new Error(notFoundMsg);
      (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE';
      throw customError;
    }

    const { data: updatedTaskData, error: selectError } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (selectError) {
      let errorMessage = `Error fetching updated TaskBreaker task ${id} after successful update.`;
      let errorDetailsString = "";
       if (selectError && typeof selectError === 'object') {
          if ('message' in selectError && typeof (selectError as any).message === 'string') {
              errorMessage = (selectError as any).message;
          }
          if ('details' in selectError && typeof (selectError as any).details === 'string') {
              errorMessage += ` Details: ${(selectError as any).details}`;
          }
          if ('hint' in selectError && typeof (selectError as any).hint === 'string') {
              errorMessage += ` Hint: ${(selectError as any).hint}`;
          }
           if ('code' in selectError && typeof (selectError as any).code === 'string') {
              errorMessage += ` Code: ${(selectError as any).code}`;
          }
          try {
              errorDetailsString = JSON.stringify(selectError);
              console.error("Full Supabase error object (JSON) for select after update:", errorDetailsString);
          } catch (e) {
              console.error("Could not stringify the full Supabase error object for select after update.");
          }
      }
      console.error(`${errorMessage} Supabase select error for task ${id}:`, selectError.message, "Original error object:", selectError);
      const customError = new Error(errorMessage);
      (customError as any).originalError = selectError;
      throw customError;
    }
    
    if (!updatedTaskData) {
        throw new Error(`Failed to fetch updated TaskBreaker task ${id} after successful update, no data returned, though ${count} rows were reported as updated.`);
    }

    return this.mapFromSupabase(updatedTaskData);
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerSupabaseService.delete: userId is required.");
    }
    const { error, count } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting TaskBreaker task ${id} from Supabase:`, error);
      throw error;
    }
    if (count === 0) {
      console.warn(`Supabase delete for TaskBreaker task ${id} (user ${userId}) affected 0 rows. Task might have already been deleted or not found.`);
    }
  }
}
