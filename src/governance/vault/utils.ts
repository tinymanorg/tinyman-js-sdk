import {WEEK} from "../constants";
import {MAX_LOCK_TIME, TWO_TO_THE_64} from "./constants";

function getStartTimestampOfWeek(timestamp: number, isFloor = false) {
  const numberOfWeeks = timestamp / WEEK;

  return (isFloor ? Math.floor(numberOfWeeks) : Math.ceil(numberOfWeeks)) * WEEK;
}

function getNewTotalPowerTimestamps(oldTimeStamp: number, newTimeStamp: number) {
  if (oldTimeStamp > newTimeStamp) {
    throw new Error("Old timestamp must be less than or equal to new timestamp");
  }

  const timestamps: number[] = [];

  let weekTimeStamp = getStartTimestampOfWeek(oldTimeStamp) + WEEK;

  while (weekTimeStamp < newTimeStamp) {
    timestamps.push(weekTimeStamp);

    weekTimeStamp += WEEK;
  }

  timestamps.push(newTimeStamp);

  return timestamps;
}

function getSlope(lockedAmount: number) {
  return Math.floor((lockedAmount * TWO_TO_THE_64) / MAX_LOCK_TIME);
}

export {getNewTotalPowerTimestamps, getStartTimestampOfWeek, getSlope};
