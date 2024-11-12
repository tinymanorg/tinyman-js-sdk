import SwapQuoteError from "./util/error/SwapQuoteError";

export type {
  InitiatorSigner,
  SignerTransaction,
  SupportedNetwork
} from "./util/commonTypes";

export {
  BASE_MINIMUM_BALANCE,
  MINIMUM_BALANCE_REQUIRED_PER_ASSET,
  MINIMUM_BALANCE_REQUIRED_PER_APP,
  MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA,
  MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE,
  MINIMUM_ADD_LIQUIDITY_AMOUNT
} from "./util/constant";

export * from "./swap/v2/router";

export * from "./swap/common/utils";

export {
  applySlippageToAmount,
  ASSET_OPT_IN_PROCESS_TXN_COUNT,
  convertFromBaseUnits,
  convertToBaseUnits,
  sendAndWaitRawTransaction,
  getTxnGroupID,
  sumUpTxnFees
} from "./util/util";

export {generateOptIntoAssetTxns} from "./util/asset/assetUtils";

export type {
  AccountAsset,
  TinymanAnalyticsApiAsset,
  IndexerAssetInformation
} from "./util/asset/assetModels";

export {
  ALGO_ASSET,
  ALGO_ASSET_ID,
  POOL_TOKEN_UNIT_NAME,
  TINY_ASSET_ID
} from "./util/asset/assetConstants";

export {
  getAccountInformation,
  calculateAccountMinimumRequiredBalance,
  hasSufficientMinimumBalance,
  isAccountOptedIntoApp,
  getAccountExcessWithinPool,
  getAccountExcess,
  getMinRequiredBalanceToOptIn
} from "./util/account/accountUtils";

export type {AccountInformationData} from "./util/account/accountTypes";

export type {ContractVersionValue} from "./contract/types";
export {CONTRACT_VERSION} from "./contract/constants";
export {tinymanContract_v2} from "./contract/v2/contract";
export {tinymanContract_v1_1} from "./contract/v1_1/contract";

export {
  getValidatorAppID,
  generateOptIntoValidatorTxns,
  OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT,
  generateOptOutOfValidatorTxns,
  OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT
} from "./validator";

export type {V1PoolInfo, V2PoolInfo, PoolReserves} from "./util/pool/poolTypes";
// eslint-disable-next-line no-duplicate-imports
export {PoolStatus} from "./util/pool/poolTypes";

export {poolUtils} from "./util/pool";

export {Bootstrap} from "./bootstrap";

export type {
  V1_1AddLiquidityQuote,
  V1_1AddLiquidityExecution
} from "./add-liquidity/v1_1/types";
export {
  V1_1AddLiquidityTxnIndices,
  V1_1_ADD_LIQUIDITY_PROCESS_TXN_COUNT
} from "./add-liquidity/v1_1/constants";
export type {
  V2InitialAddLiquidityQuote,
  V2AddLiquidityInternalSwapQuote,
  V2FlexibleAddLiquidityQuote,
  V2SingleAssetInAddLiquidityQuote,
  V2AddLiquidityExecution
} from "./add-liquidity/v2/types";
export {V2AddLiquidityType, V2AddLiquidityTxnIndices} from "./add-liquidity/v2/constants";
export {getAddLiquidityTotalFee} from "./add-liquidity/util";
export {AddLiquidity} from "./add-liquidity";

export type {
  V1_1RemoveLiquidityExecution,
  V1_1RemoveLiquidityQuote
} from "./remove-liquidity/v1_1/types";
export type {
  V2RemoveLiquidityQuote,
  V2SingleAssetRemoveLiquidityQuote,
  V2RemoveLiquidityExecution
} from "./remove-liquidity/v2/types";

export {V1_1_REMOVE_LIQUIDITY_TXN_COUNT} from "./remove-liquidity/v1_1/constants";
export {V2_REMOVE_LIQUIDITY_APP_CALL_INNER_TXN_COUNT} from "./remove-liquidity/v2/constants";
export {RemoveLiquidity} from "./remove-liquidity";

export type {
  SwapQuote,
  V1SwapExecution,
  V2SwapExecution,
  DirectSwapQuote,
  SwapRoute,
  GenerateSwapTxnsParams
} from "./swap/types";
export * from "./swap/v2/util";
export {SwapType} from "./swap/constants";
export {Swap} from "./swap";
// eslint-disable-next-line no-duplicate-imports
export {SwapQuoteType} from "./swap/types";
export {SwapQuoteError};
// eslint-disable-next-line no-duplicate-imports
export {SwapQuoteErrorType} from "./util/error/SwapQuoteError";

export {
  redeemExcessAsset,
  redeemAllExcessAsset,
  generateRedeemTxns,
  REDEEM_PROCESS_TXN_COUNT
} from "./redeem";

export {fetchFolksLendingPool, LendingPool} from "./folks-lending-pools";
export type {FolksLendingPool} from "./folks-lending-pools/types";

export {prepareCommitTransactions, getStakingAppID} from "./stake";
export {tinymanJSSDKConfig} from "./config";
export {combineAndRegroupSignerTxns} from "./util/transaction/transactionUtils";

export {TinymanGovernanceClient} from "./governance";
export type {GetRawBoxValueCacheProps, RawBoxCacheValue} from "./governance/types";

export {AccountState} from "./governance/vault/storage";
export {getStartTimestampOfWeek} from "./governance/vault/utils";
export {ProposalVote} from "./governance/proposal-voting/constants";
export {generateProposalMetadata} from "./governance/proposal-voting/transactions";
export type {GenerateProposalMetadataPayload} from "./governance/proposal-voting/types";
export {intToBytes} from "./governance/util/utils";

export {
  generateCidFromProposalMetadata,
  calculateTinyPower,
  combineAndRegroupTxns,
  concatUint8Arrays
} from "./governance/utils";
