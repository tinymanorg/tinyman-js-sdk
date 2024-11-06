import algosdk, {ALGORAND_MIN_TX_FEE, TransactionType} from "algosdk";

import {TALGO_ASSET_ID} from "../util/asset/assetConstants";
import {SupportedNetwork} from "../util/commonTypes";
import {TinymanTAlgoClient} from "./tAlgoClient";
import {AccountInformation} from "../util/account/accountTypes";
import {sendAndWaitRawTransaction} from "../util/util";
import {calculateAccountMinimumRequiredBalance} from "../util/account/accountUtils";

const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const TEST_ACCOUNT: algosdk.Account = {
  addr: "XNG5OX7MMUTYVJN4AR7YU27Z6PM7FRRILMXOXWAIXMVPTTW5I7INN7AEPE",
  sk: new Uint8Array([
    14, 109, 69, 154, 246, 14, 24, 178, 50, 15, 86, 9, 107, 152, 149, 174, 9, 6, 85, 232,
    195, 223, 225, 19, 76, 225, 4, 60, 80, 90, 76, 176, 187, 77, 215, 95, 236, 101, 39,
    138, 165, 188, 4, 127, 138, 107, 249, 243, 217, 242, 198, 40, 91, 46, 235, 216, 8,
    187, 42, 249, 206, 221, 71, 208
  ])
};

describe("TinymanTAlgoClient", () => {
  let client: TinymanTAlgoClient;
  const network: SupportedNetwork = "testnet";
  const mintAmount = 1000000;
  const burnAmount = 500000;

  beforeAll(async () => {
    // Create a new instance of the tAlgoClient
    client = new TinymanTAlgoClient(algod, network);
    const accountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;

    if (
      accountInfo.amount <
      calculateAccountMinimumRequiredBalance(accountInfo) + mintAmount * 2
    ) {
      // Wait for the user to fund the account
      console.log(
        `Go to https://bank.testnet.algorand.network/?account=${TEST_ACCOUNT.addr} and fund your account.`
      );
      await waitUntilAccountIsFunded(TEST_ACCOUNT.addr);
    }
  }, 180000);

  async function waitUntilAccountIsFunded(address: string) {
    const minBalance = 1000000; // Minimum balance in microAlgos (1 Algo)
    let balance = 0;

    while (balance < minBalance) {
      const accountInfo = (await algod
        .accountInformation(address)
        .do()) as AccountInformation;

      balance = accountInfo.amount;
      if (balance < minBalance) {
        console.log(`Current balance: ${balance}. Waiting for funding...`);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking again
      }
    }

    console.log(`Account funded with balance: ${balance}`);
  }

  it("should create mint transactions", async () => {
    const spy = jest.spyOn(client, "mint");

    await client.mint(mintAmount, TEST_ACCOUNT.addr);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should include opt-in txn inside the mint transactions if needed", async () => {
    const latestAccountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;
    const result = await client.mint(mintAmount, TEST_ACCOUNT.addr);

    if (
      latestAccountInfo.assets.some(
        (asset) => asset["asset-id"] === TALGO_ASSET_ID[network]
      )
    ) {
      // Should not contain the opt-in transaction
      expect(result.some((txn) => txn.type === TransactionType.axfer)).toBe(false);
    } else {
      expect(result.some((txn) => txn.type === TransactionType.axfer)).toBe(true);
    }
  });

  it("should calculate the mint transaction fee correctly", async () => {
    const result = await client.mint(mintAmount, TEST_ACCOUNT.addr);

    expect(result[0].fee).toBe((result.length + 4) * ALGORAND_MIN_TX_FEE);
  });

  it("should receive correct amount of tALGOs after mint transaction", async () => {
    const initialAccountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;
    const initialTAlgoAccountAsset = initialAccountInfo.assets.find(
      (asset) => asset["asset-id"] === TALGO_ASSET_ID[network]
    );
    const txnsToBeSigned = await client.mint(mintAmount, TEST_ACCOUNT.addr);
    const signedTxns: Uint8Array[] = txnsToBeSigned.map((txn) =>
      txn.signTxn(TEST_ACCOUNT.sk)
    );

    await sendAndWaitRawTransaction(algod, [signedTxns]);

    const finalAccountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;
    const tAlgoAccountAsset = finalAccountInfo.assets.find(
      (asset) => asset["asset-id"] === TALGO_ASSET_ID[network]
    );

    const ratio = await client.getRatio();
    const expectedTAlgoAmount =
      (initialTAlgoAccountAsset?.amount ?? 0) +
      Math.floor((mintAmount * Math.pow(10, 6)) / ratio);

    // Check if the account has the correct amount of ALGOs
    expect(finalAccountInfo.amount).toBe(
      initialAccountInfo.amount - txnsToBeSigned[0].fee - mintAmount
    );

    // Check if the account has the correct amount of tALGOs
    expect(tAlgoAccountAsset?.amount).toBeCloseTo(expectedTAlgoAmount);
  }, 10000);
  it("should create burn transactions", async () => {
    const spy = jest.spyOn(client, "burn");

    await client.burn(burnAmount, TEST_ACCOUNT.addr);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should calculate the burn transaction fee correctly", async () => {
    const result = await client.burn(burnAmount, TEST_ACCOUNT.addr);

    expect(result[0].fee).toBe((result.length + 1) * ALGORAND_MIN_TX_FEE);
  });

  it("should receive correct amount of ALGOs after burn transaction", async () => {
    const initialAccountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;
    const txnsToBeSigned = await client.burn(burnAmount, TEST_ACCOUNT.addr);
    const signedTxns: Uint8Array[] = txnsToBeSigned.map((txn) =>
      txn.signTxn(TEST_ACCOUNT.sk)
    );

    await sendAndWaitRawTransaction(algod, [signedTxns]);

    const finalAccountInfo = (await algod
      .accountInformation(TEST_ACCOUNT.addr)
      .do()) as AccountInformation;

    const initialTAlgoAccountAsset = initialAccountInfo.assets.find(
      (asset) => asset["asset-id"] === TALGO_ASSET_ID[network]
    );
    const finalTAlgoAccountAsset = finalAccountInfo.assets.find(
      (asset) => asset["asset-id"] === TALGO_ASSET_ID[network]
    );

    const expectedAlgoAmount = burnAmount;

    // Check if the account has the correct amount of ALGOs
    expect(finalAccountInfo.amount).toBeGreaterThanOrEqual(
      initialAccountInfo.amount - txnsToBeSigned[0].fee + expectedAlgoAmount
    );

    // Check if the account has the correct amount of tALGOs
    expect(finalTAlgoAccountAsset?.amount).toBe(
      (initialTAlgoAccountAsset?.amount ?? 0) - burnAmount
    );
  }, 10000);
});
