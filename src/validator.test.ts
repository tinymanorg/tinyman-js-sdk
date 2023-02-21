import {expect, test} from "@jest/globals";

import {CONTRACT_VERSION} from "./contract/constants";
import {SupportedNetwork} from "./util/commonTypes";
import {getValidatorAppID, VALIDATOR_APP_ID} from "./validator";

describe("`getValidatorAppID`", () => {
  test("throws an error when one of the args is invalid", () => {
    expect(() =>
      getValidatorAppID("unknown" as any, CONTRACT_VERSION.V1_1)
    ).toThrowError();
    expect(() => getValidatorAppID("mainnet", "unknown" as any)).toThrowError();
  });

  test("returns the correct validator app id", () => {
    const networks: SupportedNetwork[] = ["mainnet", "testnet"];
    const contractVersions = Object.values(CONTRACT_VERSION);

    for (const network of networks) {
      for (const contractVersion of contractVersions) {
        expect(getValidatorAppID(network, contractVersion)).toBe(
          VALIDATOR_APP_ID[contractVersion][network]
        );
      }
    }
  });
});
