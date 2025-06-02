// src/services/interfaces/IService.ts
export interface IService<T, CreateDTO> {
  getAll(userId: string): Promise<T[]>;
  getById(id: string, userId: string): Promise<T | null>;
  add(data: CreateDTO, userId: string): Promise<T>;
  update(id: string, data: Partial<CreateDTO>, userId: string): Promise<T>;
  delete(id: string, userId: string): Promise<void>;
}
