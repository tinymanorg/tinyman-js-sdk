type WebStorageStoredValue = null | string | boolean | {[x: string]: any};

const WebStorage = {
  local: {
    setItem(itemName: string, itemValue: WebStorageStoredValue) {
      if (localStorage) {
        localStorage.setItem(itemName, JSON.stringify(itemValue));
      }
    },
    getItem(itemName: string): WebStorageStoredValue {
      const storedValue = localStorage?.getItem(itemName);

      return storedValue ? JSON.parse(storedValue) : null;
    },
    removeItem(itemName: string) {
      if (localStorage) {
        localStorage.removeItem(itemName);
      }
    }
  },
  getFromWebStorage(itemName: string): WebStorageStoredValue {
    return WebStorage.local.getItem(itemName);
  },
  removeFromWebStorage(itemName: string) {
    WebStorage.local.removeItem(itemName);
  },
  STORED_KEYS: {
    TINYMAN_CACHED_ASSETS: "TINYMAN_CACHED_ASSETS"
  }
};

export default WebStorage;
