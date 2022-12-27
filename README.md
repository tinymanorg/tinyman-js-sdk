# tinyman-js-sdk

JavaScript/TypeScript SDK for the Tinyman AMM Contracts.

## Installation

```shell
npm i -S @tinymanorg/tinyman-js-sdk
```

## Usage

First, we need to instantiate the Algod client and get the Tinyman Validator App ID for the network:

```typescript
const algodClient = new algosdk.Algodv2(
  /** Enter token here */,
  /** Enter server here */,
  /** Enter port here */
)
const validatorAppID = getValidatorAppID("mainnet", CONTRACT_VERSION.V2)
```

Before doing any operations for v1 pools (for v2 contract operations, app opt-in is not required), we need to make sure the account is opted into the Tinyman Validator App:

```typescript
// Address of the account that will sign the transactions
const accountAddress = "...";
const account = await getAccountInformation(algodClient, accountAddress);
const isAppOptInRequired = isAccountOptedIntoApp({
  appID: validatorAppID,
  accountAppsLocalState: account["apps-local-state"]
});

if (!hasOptedIn) {
  const v1AppOptInTxns = await generateOptIntoValidatorTxns({
    client: algodClient,
    network: "mainnet",
    contractVersion: CONTRACT_VERSION.V1_1,
    initiatorAddr: accountAddress
  });

  /**
   * Create an instance of PeraConnect, to be able to sign txns.
   * For more details, see: https://github.com/perawallet/connect
   * You can also use any other wallet to sign the transactions.
   */
  const peraWalletManager = new PeraWalletConnect();

  // Sign the transactions using a wallet (or any other method)
  const signedTxns = await peraWalletManager.signTransaction(txGroups, accountAddress);

  // Send signed transactions to the network, and wait for confirmation
  const transactionData = await sendAndWaitRawTransaction(algodClient, [signedTxns]);

  // Log the transaction data to the consol
  console.log({transactionData});
}
```

<br>

<details>
<summary><strong>Swap</strong></summary>

<br>

0. Let's say, we want to perform a swap between ALGO and USDC:

```typescript
const assetIN = {
  id: 0,
  decimals: 6,
  unit_name: "ALGO"
};

const assetOUT = {
  id: 31566704,
  decimals: 6,
  unit_name: "USDC"
};
```

1. First, we need to get the pool details for the asset pair:

```typescript
const poolInfo = await getPoolInfo(algodClient, {
  validatorAppID,
  assetIN.id,
  assetOUT.id
});
```

This returns a PoolInfo object. A swap can only be done if the pair has a pool that is already created and has a `PoolStatus.READY` status. We can use `isPoolReady` utility to check this.

We will also need the reserve details of the pool to get a quote for the swap:

```typescript
const poolReserves = await getPoolReserves(algodClient, poolInfo);
```

For a successful swap, there needs to be some liquidity within the pool. We can check this using `isPoolEmpty` utility:

```typescript
const isEmpty = isPoolEmpty(poolReserves);
```

<br/>

2. If the pair has a READY pool, we can get a quote for the swap. The following code gets a quote for a FIXED INPUT swap:

```typescript
const assetIN_amount = 100;

const swapQuote = getSwapQuote(
  SwapType.FixedInput,
  poolInfo,
  poolReserves,
  {
    assetID: assetIN.id,
    amount: convertToBaseUnits(assetIN.decimals, assetIN_amount)
  },
  {
    assetIn: assetIN.decimals,
    assetOut: assetOUT.decimals
  }
);
```

On the other hand, for a FIXED OUTPUT swap, we can get the quote like the following:

```typescript
const assetOUT_amount = 71.694124;

const swapQuote = getSwapQuote(
  SwapType.FixedOutput,
  poolInfo,
  poolReserves,
  {
    assetID: assetOUT.id,
    amount: convertToBaseUnits(assetOUT.decimals, assetOUT_amount)
  },
  {
    assetIn: assetIN.decimals,
    assetOut: assetOUT.decimals
  }
);
```

3. Using the quote details, we can get the transaction group for the swap.

```typescript
const slippage = 0.01;
const accountAddress = "...";

const swapTxns = await generateSwapTransactions({
  client: algodClient,
  pool: poolInfo,
  swapType: SwapType.FixedInput, // or, SwapType.FixedOutput
  assetIn: {
    assetID: swapQuote.assetInID,
    amount: Number(swapQuote.assetInAmount)
  },
  assetOut: {
    assetID: swapQuote.assetOutID,
    amount: Number(swapQuote.assetOutAmount)
  },
  slippage,
  initiatorAddr: accountAddress
});
```

This generates an array of `SignerTransaction` objects.

4. Sign the generated txns

```typescript
const signedTxns = await signSwapTransactions({
  pool: poolInfo,
  txGroup: swapTxns,
  initiatorSigner: signerCallback
});
```

`initiatorSigner` expects a callback of shape `(txGroups: SignerTransaction[][]) => Promise<Uint8Array[]>`. So, it takes the txns generated in the previous step and signs them and then resolves with `Uint8Array[]`.

5. Perform the swap:

```typescript
const data = await issueSwap({
  client: algodClient,
  pool: poolInfo,
  txGroup: swapTxns,
  signedTxns,
  swapType: SwapType.FixedInput, // or, SwapType.FixedOutput
  initiatorAddr: accountAddress
});
```

Data returned from `issueSwap` has information about the confirmation round, transaction ID and the excess amounts accumulated within the account. Please check the `SwapExecution` interface for details on the returned data.

</details>

<details>
<summary><strong>Create a pool</strong></summary>

<br>

0. Let's say, we want to create a pool between ALGO and USDC:

```typescript
const asset1 = {
  id: 31566704,
  decimals: 6,
  unit_name: "USDC"
};

const asset2 = {
  id: 0,
  decimals: 6,
  unit_name: "ALGO"
};
```

1. First, we need to get the pool info and make sure there is no pool available between the assets already:

```typescript
const poolInfo = await getPoolInfo(algodClient, {
  validatorAppID,
  asset1.id,
  asset2.id
});
const isNotCreated = isPoolNotCreated(poolInfo);
```

2. Create the transactions for the pool creation:

```typescript
const accountAddress = "...";

const bootstrapTxns = generateBootstrapTransactions({
  client: algodClient,
  validatorAppID,
  asset1ID: asset1.id,
  asset2ID: asset2.id,
  asset1UnitName: asset1.unit_name,
  asset2UnitName: asset2.unit_name,
  initiatorAddr: accountAddress
});
```

3. Sign the generated transactions:

```typescript
const {signedTxns, txnIDs} = await signBootstrapTransactions({
  txGroup: bootstrapTxns,
  validatorAppID,
  asset1ID: asset1.id,
  asset2ID: asset2.id,
  initiatorSigner: signerCallback
});
```

`initiatorSigner` expects a callback of shape `(txGroups: SignerTransaction[][]) => Promise<Uint8Array[]>`. So, it takes the txns generated in the previous step and signs them and then resolves with `Uint8Array[]`.

4. Create the pool using the signedTxns:

```typescript
const poolInfo = await createPool(
  algodClient,
  {
    asset1ID: asset1.id,
    asset2ID: asset2.id,
    validatorAppID
  },
  signedTxns,
  txnIDs
);
```

</details>

<details>
<summary><strong>Add liquidity to a pool</strong></summary>

<br>

0. Let's say, we want to add liquidity to the pool between ALGO and USDC:

```typescript
const asset1 = {
  id: 31566704,
  decimals: 6,
  unit_name: "USDC"
};

const asset2 = {
  id: 0,
  decimals: 6,
  unit_name: "ALGO"
};
```

1. First, we need to get the pool info and make sure there is actually a pool between the assets:

```typescript
const poolInfo = await getPoolInfo(algodClient, {
  validatorAppID,
  asset1.id,
  asset2.id
});
const isReady = isPoolReady(poolInfo);
```

We will also need the reserve details of the pool to get a quote for the mint as well:

```typescript
const poolReserves = await getPoolReserves(algodClient, poolInfo);
```

2. Find out the current reserve ratio and make sure the amounts to be deposited is in consistent with the ratio. Within the poolInfo and pool reserves data retrieved from `getPoolInfo` and `getPoolReserves` functions, asset1 is always the asset with greater asset ID. Therefore, we need to be careful about the pair order when determining the ratio from the poolReserves. In our example here, the `asset1` and `asset2` is in the correct order.

```typescript
let pairRatio = getPoolPairRatio(
  {
    asset1: asset1.decimals,
    asset2: asset2.decimals
  },
  poolReserves
);

/* If assets were not in the correct order, eg. asset1 was ALGO and asset2 was USDC 
let pairRatio = 1 / getPoolPairRatio(
  {
    asset1: asset1.decimals,
    asset2: asset2.decimals
  },
  poolReserves
);
*/

const asset1AmountToDeposit = 100;
const asset2AmountToDeposit = asset1AmountToDeposit * (1 / pairRatio);

/* If we wanted to set the asset2 amount and determine the asset1 amount from the ratio:
const asset2AmountToDeposit = 100;
const asset1AmountToDeposit = asset2AmountToDeposit * pairRatio;
*/
```

3. After the amounts are set, we can get a quote for the mint:

```typescript
const mintQuote = await getMintLiquidityQuote({
  pool: poolInfo,
  reserves: poolReserves,
  asset1In: asset1AmountToDeposit,
  asset2In: asset2AmountToDeposit
});
```

4. Create the transactions to add liquidity:

```typescript
const slippage = 0.01;
const accountAddress = "...";

const mintTxns = await generateMintTxns({
  client: algodClient,
  pool: poolInfo,
  asset1In: mintQuote.asset1In,
  asset2In: mintQuote.asset2In,
  liquidityOut: mintQuote.liquidityOut,
  slippage,
  initiatorAddr: accountAddress
});
```

5. Sign the generated transactions:

```typescript
const signedTxns = await signMintTxns({
  pool: poolInfo,
  txGroup: mintTxns,
  initiatorSigner: signerCallback
});
```

`initiatorSigner` expects a callback of shape `(txGroups: SignerTransaction[][]) => Promise<Uint8Array[]>`. So, it takes the txns generated in the previous step and signs them and then resolves with `Uint8Array[]`.

6. Perform the mint operation:

```typescript
const data = await mintLiquidity({
  client: algodClient,
  pool: poolInfo,
  txGroup: mintTxns,
  signedTxns,
  initiatorAddr: accountAddress
});
```

Data returned from `mintLiquidity` has information about the confirmation round, transaction ID and the liquidity token excess amount accumulated within the account. Please check the `MintExecution` interface for details on the returned data.

</details>

<details>
<summary><strong>Remove liquidity from a pool</strong></summary>

<br>

0. Let's say, we want to remove liquidity from the pool between ALGO and USDC:

```typescript
const asset1 = {
  id: 31566704,
  decimals: 6,
  unit_name: "USDC"
};

const asset2 = {
  id: 0,
  decimals: 6,
  unit_name: "ALGO"
};
```

The rest of the steps below assumes assets are set in the right order, ie. asset1 has an ID that is greater than asset2's ID.

1. First, we need to get the pool info and make sure there is actually a pool between the assets:

```typescript
const poolInfo = await getPoolInfo(algodClient, {
  validatorAppID,
  asset1.id,
  asset2.id
});
const isReady = isPoolReady(poolInfo);
```

We will also need the reserve details of the pool to get a quote for the burn:

```typescript
const poolReserves = await getPoolReserves(algodClient, poolInfo);
```

2. Get a quote for the burn:

```typescript
const LIQUIDITY_TOKEN_DECIMALS = 6;

// We want to burn 10 liquidity tokens which would be 10_000_000 in base units
const liquidityIn = convertToBaseUnits(LIQUIDITY_TOKEN_DECIMALS, 10);

const burnQuote = await getBurnLiquidityQuote({
  pool: poolInfo,
  reserves: poolReserves,
  liquidityIn
});
```

3. Generate the burn transactions:

```typescript
const slippage = 0.01;
const accountAddress = "...";

const burnTxns = await generateBurnTxns({
  client: algodClient,
  pool: poolInfo,
  asset1Out: quote.asset1Out,
  asset2Out: quote.asset2Out,
  liquidityIn: quote.liquidityIn,
  slippage,
  initiatorAddr: accountAddress
});
```

4. Sign the transactions:

```typescript
const signedTxns = await signBurnTxns({
  pool: poolInfo,
  txGroup: burnTxns,
  initiatorSigner: signerCallback
});
```

`initiatorSigner` expects a callback of shape `(txGroups: SignerTransaction[][]) => Promise<Uint8Array[]>`. So, it takes the txns generated in the previous step and signs them and then resolves with `Uint8Array[]`.

5. Perform the burn operation:

```typescript
const data = await burnLiquidity({
  client: algodClient,
  pool: poolInfo,
  txGroup: burnTxns,
  signedTxns,
  initiatorAddr: accountAddress
});
```

Data returned from `burnLiquidity` has information about the confirmation round, transaction ID and the excess amounts accumulated within the account. Please check the `BurnExecution` interface for details on the returned data.

</details>

<details>
<summary><strong>Redeem an excess amount</strong></summary>

<br>

0. Let's say, we want to redeem USDC excess from the USDC/ALGO pool.

```typescript
const USDC = {
  id: 31566704,
  decimals: 6,
  unit_name: "USDC"
};

const ALGO = {
  id: 0,
  decimals: 6,
  unit_name: "ALGO"
};

const poolInfo = await getPoolInfo(algodClient, {
  validatorAppID,
  USDC.id,
  ALGO.id
});
```

1. Generate the redeem transactions:

```typescript
const accountAddress = "...";
const amountToRedeem = 1000;

const redeemTxns = await generateRedeemTxns({
  client: algodClient,
  pool: poolInfo,
  assetID: USDC.id,
  assetOut: amountToRedeem,
  initiatorAddr: accountAddress
});
```

2. Perform redeem operation:

```typescript
const data = await redeemExcessAsset({
  client: algodClient,
  pool: poolInfo,
  txGroup,
  initiatorSigner: signerCallback
});
```

`initiatorSigner` expects a callback of shape `(txGroups: SignerTransaction[][]) => Promise<Uint8Array[]>`. So, it takes the txns generated in the previous step and signs them and then resolves with `Uint8Array[]`.

</details>

## v2 Changelog

### Term changes

We now use clearer terms for operations, here are the changes (v1 -> v2):

- `Mint` -> `Add Liquidity`
- `Burn` -> `Remove Liquidity`
- `Liquidity Token` -> `Pool Token`

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

   ⚠️ Not available for `Bootstrap`

2. `generateTxns` : Generates the transactions for the desired operation with desired amounts

   ⚠️ Note that additional to `generateTxns`, `RemoveLiquidity.v2` module also has `generateSingleAssetOutTxns` method.

3. `signTxns` : Signs the transactions using the given `initiatorSigner`
4. `execute` : Sends the signed transactions to the blockchain, waits for the response and returns the operation data

And they can be used in the given order, to complete the operation.

### Migrating to new sdk version

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

## License

tinyman-js-sdk is licensed under a MIT license except for the exceptions listed below. See the LICENSE file for details.

### Exceptions

src/contract/asc.json is currently unlicensed. It may be used by this SDK but may not be used in any other way or be distributed separately without the express permission of Tinyman.
