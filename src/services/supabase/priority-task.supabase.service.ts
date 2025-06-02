// src/services/supabase/priority-task.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IPriorityTaskService } from '../interfaces/IPriorityTaskService';
import type { PriorityTask, CreatePriorityTaskDTO } from '@/types';

export class PriorityTaskSupabaseService implements IPriorityTaskService {
  private tableName = 'priority_tasks';

  async getAll(userId: string): Promise<PriorityTask[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getById(id: string, userId: string): Promise<PriorityTask | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: 'No rows found'
        throw error;
    }
    return data;
  }

  async add(taskData: CreatePriorityTaskDTO, userId: string): Promise<PriorityTask> {
    // Supabase handles created_at and updated_at (via trigger)
    const taskToAdd = {
      ...taskData,
      user_id: userId,
      isCompleted: taskData.isCompleted || false,
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(taskToAdd)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to add priority task, no data returned.");
    return data;
  }

  async update(id: string, taskData: Partial<CreatePriorityTaskDTO>, userId: string): Promise<PriorityTask> {
    // Supabase handles updated_at via trigger
    // Ensure user_id is not accidentally changed and operation is on user's own task
    const taskToUpdate = {
      ...taskData,
    };
    
    const { data, error } = await supabase
      .from(this.tableName)
      .update(taskToUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Failed to update priority task, no data returned or task not found for user.");
    return data;
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}