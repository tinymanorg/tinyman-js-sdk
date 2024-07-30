declare function getStartTimestampOfWeek(timestamp: number, isFloor?: boolean): number;
declare function getNewTotalPowerTimestamps(oldTimeStamp: number, newTimeStamp: number): number[];
declare function getSlope(lockedAmount: number): number;
export { getNewTotalPowerTimestamps, getStartTimestampOfWeek, getSlope };
