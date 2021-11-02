declare type WebStorageStoredValue =
  | null
  | string
  | boolean
  | {
      [x: string]: any;
    };
declare const WebStorage: {
  local: {
    setItem(itemName: string, itemValue: WebStorageStoredValue): void;
    getItem(itemName: string): WebStorageStoredValue;
    removeItem(itemName: string): void;
  };
  getFromWebStorage(itemName: string): WebStorageStoredValue;
  removeFromWebStorage(itemName: string): void;
  STORED_KEYS: {
    TINYMAN_CACHED_ASSETS: string;
  };
};
export default WebStorage;
