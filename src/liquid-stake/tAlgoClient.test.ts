import algosdk, {TransactionType} from "algosdk";

import {TALGO_ASSET_ID} from "../util/asset/assetConstants";
import {SupportedNetwork} from "../util/commonTypes";
import {TinymanTAlgoClient} from "./tAlgoClient";
import {sendAndWaitRawTransaction} from "../util/util";

const algod = new algosdk.Algodv2("", "https://testnet-api.algonode.cloud", "");
const TEST_ACCOUNT = {
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
  const mintAmount = 1000000n;
  const burnAmount = 500000n;

  beforeAll(async () => {
    // Create a new instance of the tAlgoClient
    client = new TinymanTAlgoClient(algod, network);
    const accountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();

    if (accountInfo.amount < accountInfo.minBalance + mintAmount * 2n) {
      // Wait for the user to fund the account
      console.log(
        "Go to https://bank.testnet.algorand.network/?account=XNG5OX7MMUTYVJN4AR7YU27Z6PM7FRRILMXOXWAIXMVPTTW5I7INN7AEPE and fund your account."
      );
      await waitUntilAccountIsFunded(TEST_ACCOUNT.addr);
    }
  }, 180000);

  async function waitUntilAccountIsFunded(address: string) {
    const minBalance = 1000000n; // Minimum balance in microAlgos (1 Algo)
    let balance = 0n;

    while (balance < minBalance) {
      const accountInfo = await algod.accountInformation(address).do();

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
    const latestAccountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();
    const result = await client.mint(mintAmount, TEST_ACCOUNT.addr);

    if (
      latestAccountInfo.assets?.some(
        (asset) => asset.assetId === BigInt(TALGO_ASSET_ID[network])
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
    const suggestedParams = await algod.getTransactionParams().do();

    expect(result[0].fee).toBe(BigInt(result.length + 1) * suggestedParams.minFee);
  });

  it("should receive correct amount of tALGOs after mint transaction", async () => {
    const initialAccountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();
    const initialTAlgoAccountAsset = initialAccountInfo.assets?.find(
      (asset) => asset.assetId === BigInt(TALGO_ASSET_ID[network])
    );
    const txnsToBeSigned = await client.mint(mintAmount, TEST_ACCOUNT.addr);
    const signedTxns: Uint8Array[] = txnsToBeSigned.map((txn) =>
      txn.signTxn(TEST_ACCOUNT.sk)
    );

    await sendAndWaitRawTransaction(algod, [signedTxns]);

    const finalAccountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();
    const tAlgoAccountAsset = finalAccountInfo.assets?.find(
      (asset) => asset.assetId === BigInt(TALGO_ASSET_ID[network])
    );

    const ratio = await client.getRatio();
    const expectedTAlgoAmount =
      (initialTAlgoAccountAsset?.amount ?? 0n) +
      BigInt(Math.floor(Number(mintAmount) / ratio));

    // Check if the account has the correct amount of ALGOs
    expect(finalAccountInfo.amount).toBe(
      initialAccountInfo.amount - txnsToBeSigned[0].fee - mintAmount
    );

    // Check if the account has the correct amount of tALGOs
    expect(Number(tAlgoAccountAsset?.amount)).toBeCloseTo(Number(expectedTAlgoAmount));
  }, 18000);

  it("should create burn transactions", async () => {
    const spy = jest.spyOn(client, "burn");

    await client.burn(burnAmount, TEST_ACCOUNT.addr);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should calculate the burn transaction fee correctly", async () => {
    const result = await client.burn(burnAmount, TEST_ACCOUNT.addr);
    const suggestedParams = await algod.getTransactionParams().do();

    expect(result[0].fee).toBe(BigInt(result.length + 1) * suggestedParams.minFee);
  });

  it("should receive correct amount of ALGOs after burn transaction", async () => {
    const initialAccountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();
    const txnsToBeSigned = await client.burn(burnAmount, TEST_ACCOUNT.addr);
    const signedTxns: Uint8Array[] = txnsToBeSigned.map((txn) =>
      txn.signTxn(TEST_ACCOUNT.sk)
    );
    const ratio = 1 / (await client.getRatio());

    await sendAndWaitRawTransaction(algod, [signedTxns]);

    const finalAccountInfo = await algod.accountInformation(TEST_ACCOUNT.addr).do();

    const initialTAlgoAccountAsset = initialAccountInfo.assets?.find(
      (asset) => asset.assetId === BigInt(TALGO_ASSET_ID[network])
    );
    const finalTAlgoAccountAsset = finalAccountInfo.assets?.find(
      (asset) => asset.assetId === BigInt(TALGO_ASSET_ID[network])
    );
    const expectedAlgoAmount = Math.floor(Number(burnAmount) / ratio);

    // Check if the account has the correct amount of ALGOs
    expect(Number(finalAccountInfo.amount)).toBeGreaterThanOrEqual(
      Number(initialAccountInfo.amount - txnsToBeSigned[0].fee) + expectedAlgoAmount
    );

    // Check if the account has the correct amount of tALGOs
    expect(finalTAlgoAccountAsset?.amount).toBe(
      (initialTAlgoAccountAsset?.amount ?? 0n) - burnAmount
    );
  }, 18000);
});
