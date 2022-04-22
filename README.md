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
<summary><strong>Swapping</strong></summary>

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

This returns a PoolInfo object. A swap can only be done if the pair has a pool that is already created and has a `PoolStatus.READY` status.

We will also need the reserve details of the pool to get a quote for the swap:

```typescript
const poolReserves = await getPoolReserves(algodClient, poolInfo);
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
const slippage = 0.1;
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

4. Sign the txns

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
