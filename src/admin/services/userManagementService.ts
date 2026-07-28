import { adminApi } from './adminApi';

export const userManagementService = {
  async getUsers(): Promise<any[]> {
    try {
      return await adminApi.getUsers();
    } catch {
      return [];
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      await adminApi.deleteUser(id);
      return true;
    } catch {
      return false;
    }
  },
};