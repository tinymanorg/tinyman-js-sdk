# tinyman-js-sdk

JavaScript/TypeScript SDK for the Tinyman AMM Contracts.

## Installation

```shell
npm i -S @tinymanorg/tinyman-js-sdk
```

<hr>
_(Optional)_ If you are integrating your project into Tinyman, you can provide `clientName` to SDK's `tinymanJSSDKConfig` instance.
The client name will be added to the application call transaction's note field. It is recommended, but completely optional.

```tsx
import {tinymanJSSDKConfig} from "@tinymanorg/tinyman-js-sdk";
tinymanJSSDKConfig.setClientName("my-project");
```

<hr>

## Usage

🆕 **AMM v2 Examples**: Example scripts for v2 contracts can be found in [examples folder](./examples/).

For more details about the modules and functions, see ["Module methods" section](#module-methods).

<details>
  <summary><strong>Opt into V1 Validator App</strong></summary>
  <br>
  If you want to interact with Tinyman V1 contracts, we need to make sure the account is opted into its validator app. This is <strong>not required</strong> for interacting with V2 contracts. Here is how you can opt an account into V1 validator app:

```typescript
// Address of the account that will sign the transactions
const accountAddress = "...";
const account = await getAccountInformation(algodClient, accountAddress);
const isAppOptInRequired = isAccountOptedIntoApp({
  appID: getValidatorAppID("mainnet", CONTRACT_VERSION.V1_1),
  accountAppsLocalState: account["apps-local-state"]
});

if (!hasOptedIn) {
  const v1AppOptInTxns = await generateOptIntoValidatorTxns({
    client: algodClient,
    network: "mainnet",
    contractVersion: CONTRACT_VERSION.V1_1,
    initiatorAddr: accountAddress
  });
  // Sign the transactions using a wallet (or any other method)
  const signedTxns = await signTransactions(txGroups, accountAddress);
  // Send signed transactions to the network, and wait for confirmation
  const transactionData = await sendAndWaitRawTransaction(algodClient, [signedTxns]);
  // Log the transaction data to the consol
  console.log({transactionData});
}
```

Tinyman JS SDK does not provide an implementation for signTransactions as each app may have different integrations with the wallets. The implementation of signTransactions may use the account's secret key to sign or it can use an integration with an external wallet such as PeraConnect and use their signTransaction method. It should always return a Promise that resolves with an array of Unsigned Integer encoding of the signed transactions, ie. `Promise<Uint8Array[]>`.

Example implementation that uses only account's secret key:

```ts
/**
 * @param account account data that will sign the transactions
 * @returns a function that will sign the transactions, can be used as `initiatorSigner`
 */
export default function signerWithSecretKey(account: Account) {
  return function (txGroups: SignerTransaction[][]): Promise<Uint8Array[]> {
    // Filter out transactions that don't need to be signed by the account
    const txnsToBeSigned = txGroups.flatMap((txGroup) =>
      txGroup.filter((item) => item.signers?.includes(account.addr))
    );
    // Sign all transactions that need to be signed by the account
    const signedTxns: Uint8Array[] = txnsToBeSigned.map(({txn}) =>
      txn.signTxn(account.sk)
    );

    // We wrap this with a Promise since SDK's initiatorSigner expects a Promise
    return new Promise((resolve) => {
      resolve(signedTxns);
    });
  };
}
```

</details>

<hr>

## v2 Changes

### Module structure

The new version of the sdk supports operations for both v1.1 and v2 contracts. Now, we have modules for different operations:

- `Bootstrap` : Pool creation
  - `Bootstrap.v1_1`
  - `Bootstrap.v2`
- `AddLiquidity` : Adding liquidity to the pools
  - `AddLiquidity.v1_1`
  - `AddLiquidity.v2`
    This module has 3 sub-modules, according to the add liquidity type:
    - `AddLiquidity.v2.initial` : For adding liquidity to a pool that has been created, but doesn’t have any liquidity yet
    - `AddLiquidity.v2.flexible` : For adding liquidity using two assets, with arbitrary amounts, to a pool that already has some liquidity
    - `AddLiquidity.v2.withSingleAsset` : For adding liquidity using a single assets, to a pool that already has some liquidity
- `RemoveLiquidity` : Removing previously added liquidity from the pools
  - `RemoveLiquidity.v1_1`
  - `RemoveLiquidity.v2`
    - `RemoveLiquidity.v2.generateTxns` (Generates txns for the default mode, multiple asset out)
    - `RemoveLiquidity.v2.generateSingleAssetOutTxns` (Generates txns for the new, single asset out mode)
- `Swap` : Swapping assets; trading some portion of one of the owned assets for an another asset
  - `Swap.v1_1`
  - `Swap.v2`

Additional to the operation modules, now there is also a module for pool utilities:

- `poolUtils`
  - `poolUtils.v1_1`
  - `poolUtils.v2`
  - Common utilities (The functions that are common for both versions, can be used like: `poolUtils.isPoolEmpty(pool)`)

### Module methods

And all of the operation modules have _almost_ the same structure of functions:

1. `getQuote` : Gets a quote for the desired operation, in which one can see the calculated amounts for the operation for example expected output amount, price impact, etc.

   > ⚠️ Not available for `Bootstrap`

2. `generateTxns` : Generates the transactions for the desired operation with desired amounts

   > ⚠️ Note that additional to `generateTxns`, `RemoveLiquidity.v2` module also has `generateSingleAssetOutTxns` method.

3. `signTxns` : Signs the transactions using the given `initiatorSigner`
4. `execute` : Sends the signed transactions to the blockchain, waits for the response and returns the operation data

And they can be used in the given order, to complete the operation.

### Migrating to new sdk version from v1.3.0

#### Term changes

We now use clearer terms for operations, here are the changes (v1 -> v2):

- `Mint` -> `Add Liquidity`
- `Burn` -> `Remove Liquidity`
- `Liquidity Token` -> `Pool Token`

#### Migrating the function calls

The new structure is actually pretty similar to the previous one, because the steps are the same, as mentioned in "Module methods" section. For example, for v1, to add liquidity (function arguments are left blank for simplicity):

```tsx
// 1. get quote
getMintLiquidityQuote();
// 2. generate transactions
generateMintTxns();
// 3. sign generated transactions
signMintTxns();
// 4. execute the operation
mintLiquidity();
```

To migrate to the new version, you should find the corresponding module, and use the methods in that module:

```tsx
// 1. get quote
AddLiquidity.v1_1.getQuote();
// 2. generate transactions
AddLiquidity.v1_1.generateTxns();
// 3. sign generated transactions
AddLiquidity.v1_1.signTxns();
// 4. execute the operation
AddLiquidity.v1_1.execute();
```

<hr>

## License

tinyman-js-sdk is licensed under a MIT license except for the exceptions listed below. See the LICENSE file for details.

<hr>

### Exceptions

`asc.json` files (`src/contract/v1_1/asc.json` and `src/contract/v2/asc.json`) are currently unlicensed. It may be used by this SDK but may not be used in any other way or be distributed separately without the express permission of Tinyman.
