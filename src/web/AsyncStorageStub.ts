/**
 * Web stub for AsyncStorage using localStorage.
 */
const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setItem error:', error);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage removeItem error:', error);
    }
  },

  clear: async (): Promise<void> => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clear error:', error);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },

  multiGet: async (
    keys: string[],
  ): Promise<[string, string | null][]> => {
    return keys.map(key => [key, localStorage.getItem(key)]);
  },

  multiSet: async (keyValuePairs: [string, string][]): Promise<void> => {
    keyValuePairs.forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  },

  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach(key => localStorage.removeItem(key));
  },
};

export default AsyncStorage;
