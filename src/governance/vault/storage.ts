import {Algodv2, bytesToBigInt, decodeAddress} from "algosdk";

import {joinByteArrays} from "../../util/util";
import {intToBytes} from "../util/utils";
import {getCumulativePowerDelta, getRawBoxValue} from "../utils";
import {
  ACCOUNT_POWER_BOX_ARRAY_LEN,
  ACCOUNT_POWER_SIZE,
  SLOPE_CHANGES,
  TOTAL_POWERS,
  TOTAL_POWER_SIZE
} from "./constants";

class AccountState {
  lockedAmount: number;
  lockEndTime: number;
  powerCount: number;
  deletedPowerCount: number;

  constructor(
    lockedAmount: number,
    lockEndTime: number,
    powerCount: number,
    deletedPowerCount: number
  ) {
    this.lockedAmount = lockedAmount;
    this.lockEndTime = lockEndTime;
    this.powerCount = powerCount;
    this.deletedPowerCount = deletedPowerCount;
  }

  get freeAccountPowerSpaceCount() {
    const remainder = this.powerCount % ACCOUNT_POWER_BOX_ARRAY_LEN;

    if (remainder > 0) {
      return ACCOUNT_POWER_BOX_ARRAY_LEN - remainder;
    }

    return 0;
  }

  get lastAccountPowerBoxIndex() {
    return getLastAccountPowerBoxIndexes(BigInt(this.powerCount))[0];
  }

  get lastAccountPowerArrayIndex() {
    return getLastAccountPowerBoxIndexes(BigInt(this.powerCount))[1];
  }
}

class AccountPower {
  bias: number;
  timestamp: number;
  slope: number;
  cumulativePower: number;

  constructor(bias: number, timestamp: number, slope: number, cumulativePower: number) {
    this.bias = bias;
    this.timestamp = timestamp;
    this.slope = slope;
    this.cumulativePower = cumulativePower;
  }

  get lockEndTimestamp() {
    const lockDuration = (this.bias * 2 ** 64) / this.slope;

    return this.timestamp + lockDuration;
  }

  cumulativePowerAt(timestamp: number) {
    const timeDelta = timestamp - this.timestamp;

    if (timeDelta < 0) {
      throw new Error("Time delta must be greater than or equal to 0");
    }

    return (
      this.cumulativePower + getCumulativePowerDelta(this.bias, this.slope, timeDelta)
    );
  }
}

class TotalPower {
  bias: number;
  timestamp: number;
  slope: number;
  cumulativePower: number;

  constructor(bias: number, timestamp: number, slope: number, cumulativePower: number) {
    this.bias = bias;
    this.timestamp = timestamp;
    this.slope = slope;
    this.cumulativePower = cumulativePower;
  }
}

class SlopeChange {
  slopeDelta?: number;

  constructor(slopeDelta?: number) {
    this.slopeDelta = slopeDelta;
  }
}

class VaultAppGlobalState {
  tinyAssetId: number;
  lastTotalPowerTimestamp: number;

  // eslint-disable-next-line no-useless-constructor
  constructor(
    public totalLockedAmount: bigint,
    public totalPowerCount: bigint,
    lastTotalPowerTimestamp: bigint,
    tinyAssetId: bigint
  ) {
    this.lastTotalPowerTimestamp = Number(lastTotalPowerTimestamp);
    this.tinyAssetId = Number(tinyAssetId);
  }

  get freeTotalPowerSpaceCount() {
    const remainder = Number(this.totalPowerCount % BigInt(ACCOUNT_POWER_BOX_ARRAY_LEN));

    return remainder > 0 ? ACCOUNT_POWER_BOX_ARRAY_LEN - remainder : 0;
  }

  get lastTotalPowerBoxIndex() {
    return getLastAccountPowerBoxIndexes(this.totalPowerCount)[0];
  }

  get lastTotalPowerArrayIndex() {
    return getLastAccountPowerBoxIndexes(this.totalPowerCount)[1];
  }
}

async function getAccountState(algodClient: Algodv2, appId: number, address: string) {
  const boxName = getAccountStateBoxName(address);

  try {
    const rawBox = await getRawBoxValue(algodClient, appId, boxName);

    if (rawBox) {
      return parseBoxAccountState(rawBox);
    }

    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
}

function parseBoxAccountState(rawBox: Uint8Array): AccountState {
  const buffer = Buffer.from(rawBox);

  return new AccountState(
    buffer.readUIntBE(0, 8),
    buffer.readUIntBE(8, 8),
    buffer.readUIntBE(16, 8),
    buffer.readUIntBE(24, 8)
  );
}

function getAccountStateBoxName(address: string): Uint8Array {
  return decodeAddress(address).publicKey;
}

function getTotalPowerBoxName(boxIndex: number): Uint8Array {
  const boxIndexBytes = intToBytes(boxIndex);
  const combinedArray = new Uint8Array(TOTAL_POWERS.length + boxIndexBytes.length);

  combinedArray.set(TOTAL_POWERS, 0);
  combinedArray.set(boxIndexBytes, TOTAL_POWERS.length);

  return combinedArray;
}

function getLastAccountPowerBoxIndexes(powerCount: bigint): [number, number] {
  const lastIndex = powerCount - 1n;
  const boxIndex = Number(lastIndex / BigInt(ACCOUNT_POWER_BOX_ARRAY_LEN));
  const arrayIndex = Number(lastIndex % BigInt(ACCOUNT_POWER_BOX_ARRAY_LEN));

  return [boxIndex, arrayIndex];
}

function getAccountPowerBoxName(address: string, boxIndex: number) {
  const decodedAddress = decodeAddress(address).publicKey;
  const boxIndexBytes = intToBytes(boxIndex);

  const combinedArray = new Uint8Array(decodedAddress.length + boxIndexBytes.length);

  combinedArray.set(decodedAddress, 0);
  combinedArray.set(boxIndexBytes, decodedAddress.length);

  return combinedArray;
}

async function getSlopeChange(algod: Algodv2, appId: number, timeStamp: number) {
  const boxName = getSlopeChangeBoxName(timeStamp);

  const rawBox = await getRawBoxValue(algod, appId, boxName);

  if (!rawBox) {
    return null;
  }

  return parseBoxSlopeChange(rawBox);
}

function parseBoxSlopeChange(rawBox: Uint8Array) {
  return new SlopeChange(
    Number(bytesToBigInt(rawBox.slice(rawBox.length - 16, rawBox.length)))
  );
}

function getSlopeChangeBoxName(timestamp: number) {
  return joinByteArrays(SLOPE_CHANGES, intToBytes(timestamp));
}

async function getAllTotalPowers(
  algodClient: Algodv2,
  appId: number,
  totalPowerCount: bigint
): Promise<TotalPower[]> {
  let boxCount = 0;

  if (totalPowerCount) {
    boxCount = Number(
      (totalPowerCount + BigInt(ACCOUNT_POWER_BOX_ARRAY_LEN - 1)) /
        BigInt(ACCOUNT_POWER_BOX_ARRAY_LEN)
    );
  }

  const totalPowers: TotalPower[] = [];

  for (let boxIndex = 0; boxIndex < boxCount; boxIndex++) {
    const boxName = getTotalPowerBoxName(boxIndex);

    const rawBox = await getRawBoxValue(algodClient, appId, boxName);

    if (rawBox) {
      totalPowers.push(...parseBoxTotalPower(rawBox));
    }
  }

  return totalPowers;
}

function parseBoxTotalPower(rawBox: Uint8Array) {
  const boxSize = TOTAL_POWER_SIZE;

  const rows: Uint8Array[] = [];

  let rawBoxSubArray: Uint8Array;

  for (let i = 0; i < rawBox.length; i += boxSize) {
    rawBoxSubArray = rawBox.slice(i, i + boxSize);

    rows.push(rawBoxSubArray);
  }

  const powers: TotalPower[] = [];

  for (const row of rows) {
    if (row.every((byte) => byte === 0x00)) {
      break;
    }

    const buffer = Buffer.from(row);

    powers.push(
      new TotalPower(
        buffer.readUIntBE(0, 8),
        buffer.readUIntBE(8, 8),
        buffer.readUIntBE(16, 16),
        buffer.readUIntBE(32, 16)
      )
    );
  }

  return powers;
}

async function getAccountPowers({
  algodClient,
  address,
  appId,
  powerCount = null
}: {
  algodClient: Algodv2;
  address: string;
  appId: number;
  powerCount: number | null;
}) {
  let boxCount = 0;

  if (powerCount) {
    boxCount = Math.ceil(powerCount / ACCOUNT_POWER_BOX_ARRAY_LEN);
  }

  const accountPowers: AccountPower[] = [];

  for (let boxIndex = 0; boxIndex < boxCount; boxIndex++) {
    const boxName = getAccountPowerBoxName(address, boxIndex);

    const rawBox = await getRawBoxValue(algodClient, appId, boxName);

    if (rawBox) {
      accountPowers.push(...parseBoxAccountPower(rawBox));
    }
  }

  return accountPowers;
}

function getPowerIndexAt(powers: AccountPower[] | TotalPower[], timestamp: number) {
  let powerIndex: number | null = null;

  for (let index = 0; index < powers.length; index++) {
    const power = powers[index];

    if (timestamp >= power.timestamp) {
      powerIndex = index;
    } else {
      break;
    }
  }

  return powerIndex;
}

function parseBoxAccountPower(rawBox: Uint8Array) {
  const boxSize = ACCOUNT_POWER_SIZE;

  const rows: Uint8Array[] = [];

  let rawBoxSubArray: Uint8Array;

  for (let i = 0; i < rawBox.length; i += boxSize) {
    rawBoxSubArray = rawBox.slice(i, i + boxSize);

    rows.push(rawBoxSubArray);
  }

  const powers: AccountPower[] = [];

  for (const row of rows) {
    if (row.every((byte) => byte === 0x00)) {
      break;
    }

    const buffer = Buffer.from(row);

    powers.push(
      new AccountPower(
        buffer.readUIntBE(0, 8),
        buffer.readUIntBE(8, 8),
        buffer.readUIntBE(16, 16),
        buffer.readUIntBE(32, 16)
      )
    );
  }

  return powers;
}

export {
  AccountPower,
  AccountState,
  SlopeChange,
  TotalPower,
  VaultAppGlobalState,
  getAccountPowerBoxName,
  getAccountPowers,
  getAccountState,
  getAccountStateBoxName,
  getAllTotalPowers,
  getLastAccountPowerBoxIndexes,
  getPowerIndexAt,
  getSlopeChange,
  getSlopeChangeBoxName,
  getTotalPowerBoxName
};
