interface AssetWithIdAndAmount {
  id: number;
  amount: number | bigint;
}

interface AssetWithAmountAndDecimals {
  amount: number | bigint;
  decimals: number;
}
