import {describe, expect, test} from "@jest/globals";

import {ALGO_ASSET_ID} from "./assetConstants";
import {isAlgo, prepareAssetPairData, sortAssetIds} from "./assetUtils";

test("`sortAssetIds` returns an array with bigger id first", () => {
  expect(sortAssetIds(0, 1)).toStrictEqual([1, 0]);
  expect(sortAssetIds(1, 0)).toStrictEqual([1, 0]);
});

test("`isAlgo` returns correct value", () => {
  expect(isAlgo(ALGO_ASSET_ID)).toBe(true);
  expect(isAlgo(ALGO_ASSET_ID + 1)).toBe(false);
});

describe("`prepareAssetPairData`", () => {
  test("returns an array of asset objects, with asset with bigger id first", () => {
    const assetWithBiggerId = {id: 1, name: "asset 1"};
    const assetWithSmallerId = {id: 0, name: "asset 2"};
    const expectedSortedResult = [assetWithBiggerId, assetWithSmallerId];

    expect(prepareAssetPairData(assetWithBiggerId, assetWithSmallerId)).toStrictEqual(
      expectedSortedResult
    );
    expect(prepareAssetPairData(assetWithSmallerId, assetWithBiggerId)).toStrictEqual(
      expectedSortedResult
    );
  });

  test("returns an array of asset objects, with asset with bigger id first, and converts id to number", () => {
    const assetWithBiggerId = {id: "1", name: "asset 1"};
    const assetWithSmallerId = {id: "0", name: "asset 2"};
    const expectedSortedResult = [
      {...assetWithBiggerId, id: Number(assetWithBiggerId.id)},
      {...assetWithSmallerId, id: Number(assetWithSmallerId.id)}
    ];

    expect(prepareAssetPairData(assetWithBiggerId, assetWithSmallerId)).toStrictEqual(
      expectedSortedResult
    );
    expect(prepareAssetPairData(assetWithSmallerId, assetWithBiggerId)).toStrictEqual(
      expectedSortedResult
    );
  });
});
