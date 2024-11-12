export interface RawBoxCacheValue {
  [key: string]: Uint8Array;
}

export interface GetRawBoxValueCacheProps {
  onCacheUpdate: (cacheData: RawBoxCacheValue) => void;
  cacheData: RawBoxCacheValue | null;
}
