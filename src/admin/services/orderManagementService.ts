import { adminApi } from './adminApi';

export const orderManagementService = {
  async getOrders(): Promise<any[]> {
    try {
      return await adminApi.getOrders();
    } catch {
      return [];
    }
  },
};