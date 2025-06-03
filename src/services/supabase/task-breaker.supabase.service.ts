
// src/services/supabase/task-breaker.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { ITaskBreakerService } from '../interfaces/ITaskBreakerService';
import type { TaskBreakerTask, CreateTaskBreakerTaskDTO } from '@/types';

export class TaskBreakerSupabaseService implements ITaskBreakerService {
  private tableName = 'task_breaker_tasks';

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
    return (data || []).map(item => ({ ...item, is_completed: item.is_completed ?? false }));
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
    return data ? { ...data, is_completed: data.is_completed ?? false } as TaskBreakerTask : null;
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
    return (data || []).map(item => ({ ...item, is_completed: item.is_completed ?? false }));
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

    const taskToAdd = { 
      text: taskData.text,
      parent_id: taskData.parent_id,
      main_task_text_context: taskData.main_task_text_context,
      order: taskData.order,
      user_id: userId, 
      is_completed: taskData.is_completed ?? false,
      depth: depth
    };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding TaskBreaker task to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add TaskBreaker task, no data returned.");
    return { ...data, is_completed: data.is_completed ?? false } as TaskBreakerTask;
  }

  async update(id: string, taskData: Partial<CreateTaskBreakerTaskDTO>, userId: string): Promise<TaskBreakerTask> {
    if (!userId) {
      throw new Error("TaskBreakerSupabaseService.update: userId is required.");
    }
    // Destructure to prevent sending user_id in the update payload if it's part of taskData
    const { user_id: ignoredUserId, ...updatePayload } = taskData;
    
    let depthToSet;
    if (updatePayload.parent_id !== undefined) { 
        if (updatePayload.parent_id === null) {
            depthToSet = 0;
        } else {
            const parentTask = await this.getById(updatePayload.parent_id, userId);
            depthToSet = parentTask ? parentTask.depth + 1 : 0; // Default to 0 if parent not found (should not happen with valid data)
        }
    } else if (updatePayload.depth !== undefined) {
        depthToSet = updatePayload.depth;
    }

    const taskToUpdate = {
      ...updatePayload,
      ...(depthToSet !== undefined && { depth: depthToSet }),
    };

    const { data, error, count } = await supabase
      .from(this.tableName)
      .update(taskToUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select() 
      .single();


    if (error) {
      console.error(`Error updating TaskBreaker task ${id} in Supabase:`, error);
      if (error.code === 'PGRST116' && count === 0) { // Specifically for "0 rows" case
        const notFoundMsg = `Update for TaskBreaker task ${id} (user ${userId}) matched 0 rows. Task may not exist or RLS prevents update.`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_AFFECTED_ON_UPDATE'; 
        throw customError;
      }
      throw error;
    }
    if (!data) {
        const notFoundMsg = `Failed to update TaskBreaker task ${id}, no data returned. Task may not exist, or RLS prevents update. Count: ${count}`;
        console.warn(notFoundMsg);
        const customError = new Error(notFoundMsg);
        (customError as any).code = 'PGRST116_ZERO_ROWS_RETURNED_ON_UPDATE_SUCCESS';
        throw customError;
    }
    return { ...data, is_completed: data.is_completed ?? false } as TaskBreakerTask;
  }

  async delete(id: string, userId: string): Promise<void> {
    if (!userId) {
      throw new Error("TaskBreakerSupabaseService.delete: userId is required.");
    }
    // IMPORTANT: Without ON DELETE CASCADE in the DB for parent_id,
    // this will only delete the specified task, potentially orphaning children.
    // The client-side IndexedDB logic handles recursive deletion locally.
    // Sync logic would need to clean up orphans if this is not handled by DB.
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
