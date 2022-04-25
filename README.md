# tinyman-js-sdk

JavaScript/TypeScript SDK for the Tinyman AMM Contracts.

## Installation

```shell
npm i -S github:tinymanorg/tinyman-js-sdk
```

As this is a private repo, the CI tool will require access to the repo as well when it needs to install the package as a dependency. Please add this step to your CI workflow before it attempts to install dependencies:

```yml
- name: Configure PAT
  # Configure with [PAT](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)
  # so that we can install private repos
  run: git config --global url."https://${{ secrets.GH_WORKFLOW_PAT }}@github.com/".insteadOf ssh://git@github.com/
```

GH_WORKFLOW_PAT is a token created by an Github account that has access to this repo. It should be added as a secret to the CI workflow.

## Usage

First, we need to instantiate the Algod client and get the Tinyman Validator App ID for the network:

```typescript
const algodClient = new algosdk.Algodv2(
  /** Enter token here */,
  /** Enter server here */,
  /** Enter port here */
)
const validatorAppId = getValidatorAppID("mainnet")
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

The returned data from `issueSwap` has information about the confirmation round, transaction ID and the excess amounts accumulated within the account. Please check the `SwapExecution` interface for details on the returned data.

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

0. Let's say, we want to add liquidity to a pool between ALGO and USDC:

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

/* If assets were not in the correct order,
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

The returned data from `mintLiquidity` has information about the confirmation round, transaction ID and the liquidity token excess amount accumulated within the account. Please check the `MintExecution` interface for details on the returned data.
