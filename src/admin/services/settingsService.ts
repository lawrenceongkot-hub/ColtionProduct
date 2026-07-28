import { adminApi } from './adminApi';

export const settingsService = {
  async getSettings(): Promise<any> {
    try {
      return await adminApi.getSettings();
    } catch {
      return null;
    }
  },

  async updateSettings(settings: any): Promise<boolean> {
    try {
      await adminApi.updateSettings(settings);
      return true;
    } catch {
      return false;
    }
  },
};