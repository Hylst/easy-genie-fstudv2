
// src/services/supabase/brain-dump.supabase.service.ts
import { supabase } from '@/lib/supabaseClient';
import type { IBrainDumpService } from '../interfaces/IBrainDumpService';
import type { BrainDumpContent, CreateBrainDumpContentDTO } from '@/types';

export class BrainDumpSupabaseService implements IBrainDumpService {
  private tableName = 'brain_dumps';

  async getAll(userId: string): Promise<BrainDumpContent[]> {
    if (!userId) {
      console.warn("BrainDumpSupabaseService.getAll: userId is required. Returning empty array.");
      return [];
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error("Error fetching brain dumps from Supabase:", error);
      throw error;
    }
    return data || [];
  }

  async getById(id: string, userId: string): Promise<BrainDumpContent | null> {
    if (!userId) {
      console.warn("BrainDumpSupabaseService.getById: userId is required.");
      return null;
    }
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching brain dump ${id} from Supabase:`, error);
      throw error;
    }
    return data;
  }

  async add(dumpData: CreateBrainDumpContentDTO, userId: string): Promise<BrainDumpContent> {
    if (!userId) {
      throw new Error("BrainDumpSupabaseService.add: userId is required.");
    }
    const dumpToAdd = { ...dumpData, user_id: userId };
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(dumpToAdd)
      .select()
      .single();

    if (error) {
      console.error("Error adding brain dump to Supabase:", error);
      throw error;
    }
    if (!data) throw new Error("Failed to add brain dump, no data returned.");
    return data as BrainDumpContent;
  }

  async update(id: string, dumpData: Partial<CreateBrainDumpContentDTO>, userId: string): Promise<BrainDumpContent> {
     if (!userId) {
      throw new Error("BrainDumpSupabaseService.update: userId is required.");
    }
    const { user_id: ignored, ...updateData } = dumpData as any;
    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating brain dump ${id} in Supabase:`, error);
      throw error;
    }
    if (!data) throw new Error("Failed to update brain dump, no data returned or dump not found for user.");
    return data as BrainDumpContent;
  }

  async delete(id: string, userId: string): Promise<void> {
     if (!userId) {
      throw new Error("BrainDumpSupabaseService.delete: userId is required.");
    }
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`Error deleting brain dump ${id} from Supabase:`, error);
      throw error;
    }
  }
}
