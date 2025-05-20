import {
  Algodv2,
  decodeAddress,
  encodeAddress,
  SuggestedParams,
  Transaction
} from "algosdk";

import {TINY_ASSET_ID} from "../util/asset/assetConstants";
import {generateOptIntoAssetTxns} from "../util/asset/assetUtils";
import {SupportedNetwork} from "../util/commonTypes";
import {TINYMAN_ANALYTICS_API_BASE_URLS} from "../util/constant";
import {
  PROPOSAL_VOTING_APP_ID,
  REWARDS_APP_ID,
  SECOND_IN_MS,
  STAKING_VOTING_APP_ID,
  VAULT_APP_ID,
  WEEK,
  WEEK_IN_S
} from "./constants";
import {
  ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE,
  EXECUTION_HASH_SIZE,
  ProposalVote
} from "./proposal-voting/constants";
import {getProposal, ProposalVotingAppGlobalState} from "./proposal-voting/storage";
import {
  prepareCastVoteTransactions,
  prepareCreateProposalTransactions
} from "./proposal-voting/transactions";
import {REWARD_CLAIM_SHEET_BOX_SIZE} from "./rewards/constants";
import {getRewardClaimSheet, RewardsAppGlobalState} from "./rewards/storage";
import {prepareClaimRewardsTransactions} from "./rewards/transactions";
import {
  getStakingAttendanceSheetBoxName,
  getStakingDistributionProposal
} from "./staking-voting/storage";
import {prepareCastVoteForStakingDistributionProposalTransactions} from "./staking-voting/transactions";
import {
  combineAndRegroupTxns,
  doesBoxExist,
  getAllBoxNames,
  getBias,
  getCumulativePowerDelta,
  getGlobalState
} from "./utils";
import {
  getAccountPowers,
  getAccountState,
  getAllTotalPowers,
  getPowerIndexAt,
  getSlopeChange,
  VaultAppGlobalState
} from "./vault/storage";
import {
  prepareCreateLockTransactions,
  prepareExtendLockEndTimeTransactions,
  prepareIncreaseLockAmountTransactions,
  prepareWithdrawTransactions
} from "./vault/transactions";

class TinymanGovernanceClient {
  private algodClient: Algodv2;
  private userAddress: string;
  private network: SupportedNetwork;

  constructor(algodClient: Algodv2, userAddress: string, network: SupportedNetwork) {
    this.algodClient = algodClient;
    this.userAddress = userAddress;
    this.network = network;
  }

  async getTinyPower(timeStamp = Math.floor(Date.now() / SECOND_IN_MS)) {
    const accountState = await this.fetchAccountState();

    if (!accountState) {
      return 0;
    }

    const accountPowers = await getAccountPowers({
      algodClient: this.algodClient,
      address: this.userAddress,
      appId: VAULT_APP_ID[this.network],
      powerCount: accountState.powerCount
    });

    const accountPowerIndex = getPowerIndexAt(accountPowers, timeStamp);

    if (accountPowerIndex === null) {
      return 0;
    }

    const accountPower = accountPowers[accountPowerIndex];
    const timeDelta = timeStamp - accountPower.timestamp;
    const tinyPower = Math.max(
      accountPower.bias - getBias(accountPower.slope, timeDelta),
      0
    );

    return tinyPower;
  }

  async getTotalTinyPower(timeStamp = Math.floor(Date.now() / SECOND_IN_MS)) {
    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();

    if (!vaultAppGlobalState) {
      return 0;
    }

    const totalPowers = await getAllTotalPowers(
      this.algodClient,
      VAULT_APP_ID[this.network],
      vaultAppGlobalState.totalPowerCount
    );

    const totalPowerIndex = getPowerIndexAt(totalPowers, timeStamp);

    if (!totalPowerIndex) {
      return 0;
    }

    const totalPower = totalPowers[totalPowerIndex];
    const totalPowerWeekIndex = Math.floor(totalPower.timestamp / WEEK);

    const newWeekCount = Math.floor(timeStamp / WEEK) - totalPowerWeekIndex;

    const weekTimestamps = Array.from(
      {length: newWeekCount},
      (_, index) => (totalPowerWeekIndex + index) * WEEK
    );

    const timeRanges = weekTimestamps.map((weekTimestamp, index) => {
      const start = index === 0 ? totalPower.timestamp : weekTimestamps[index - 1];
      const end = weekTimestamp;

      return [start, end];
    });

    let {slope, bias: tinyPower} = totalPower;

    for (const timeRange of timeRanges) {
      const timeDelta = timeRange[1] - timeRange[0];
      const biasDelta = getBias(slope, timeDelta);

      tinyPower = Math.max(tinyPower - biasDelta, 0);

      const slopeChange = await getSlopeChange(
        this.algodClient,
        VAULT_APP_ID[this.network],
        timeRange[1]
      );

      const slopeDelta = slopeChange?.slopeDelta || 0;

      slope = Math.max(slope - slopeDelta, 0);

      if (tinyPower === 0 || slope === 0) {
        tinyPower = 0;
        slope = 0;
      }
    }

    return tinyPower;
  }

  async getCumulativeTinyPower(timeStamp = Math.floor(Date.now() / SECOND_IN_MS)) {
    const accountState = await this.fetchAccountState();

    if (!accountState) {
      return 0;
    }

    const accountPowers = await getAccountPowers({
      algodClient: this.algodClient,
      address: this.userAddress,
      appId: VAULT_APP_ID[this.network],
      powerCount: accountState.powerCount
    });
    const accountPowerIndex = getPowerIndexAt(accountPowers, timeStamp);

    if (accountPowerIndex === null) {
      return 0;
    }

    const accountPower = accountPowers[accountPowerIndex];
    const timeDelta = timeStamp - accountPower.timestamp;
    const cumulativePowerDelta = getCumulativePowerDelta(
      accountPower.bias,
      accountPower.slope,
      timeDelta
    );
    const cumulativeTinyPower = accountPower.cumulativePower - cumulativePowerDelta;

    return cumulativeTinyPower;
  }

  async fetchVaultAppGlobalState() {
    try {
      const data = await getGlobalState(this.algodClient, VAULT_APP_ID[this.network]);

      return new VaultAppGlobalState(
        data.tiny_asset_id,
        data.total_locked_amount,
        data.total_power_count,
        data.last_total_power_timestamp
      );
    } catch (error: any) {
      console.error(error);

      return null;
    }
  }

  async generateCreateLockTransactions({
    lockedAmount,
    lockEndTime,
    userAddress,
    suggestedParams
  }: {
    lockedAmount: number;
    lockEndTime: number;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const sender = userAddress || this.userAddress;
    const accountState = await this.fetchAccountState();
    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();
    let sp = suggestedParams;

    if (!vaultAppGlobalState) {
      throw new Error("There was an error while fetching vault app global state");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    const slopeChangeAtLockEndTime = await getSlopeChange(
      this.algodClient,
      VAULT_APP_ID[this.network],
      lockEndTime
    );

    return prepareCreateLockTransactions({
      lockedAmount,
      lockEndTime,
      vaultAppGlobalState,
      slopeChangeAtLockEndTime,
      sender,
      network: this.network,
      accountState,
      suggestedParams: sp
    });
  }

  async generateIncreaseLockAmountTransactions({
    lockedAmount,
    userAddress,
    suggestedParams
  }: {
    lockedAmount: number;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const sender = userAddress || this.userAddress;
    const accountState = await this.fetchAccountState();
    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();
    let sp = suggestedParams;

    if (!vaultAppGlobalState) {
      throw new Error("There was an error while fetching vault app global state");
    }

    if (!accountState) {
      throw new Error("There was an error while fetcing the account state");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    return prepareIncreaseLockAmountTransactions({
      accountState,
      lockedAmount,
      network: this.network,
      sender,
      vaultAppGlobalState,
      suggestedParams: sp
    });
  }

  async generateExtendLockTimeTransactions({
    newLockEndTime,
    userAddress,
    suggestedParams
  }: {
    newLockEndTime: number;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const sender = userAddress || this.userAddress;
    const accountState = await this.fetchAccountState();
    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();
    let sp = suggestedParams;

    if (!vaultAppGlobalState) {
      throw new Error("There was an error while fetching vault app global state");
    }

    if (!accountState) {
      throw new Error("There was an error while fetcing the account state");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    const slopeChangeAtNewLockEndTime = await getSlopeChange(
      this.algodClient,
      VAULT_APP_ID[this.network],
      newLockEndTime
    );

    return prepareExtendLockEndTimeTransactions({
      accountState,
      network: this.network,
      newLockEndTime,
      sender,
      vaultAppGlobalState,
      suggestedParams: sp,
      slopeChangeAtNewLockEndTime: slopeChangeAtNewLockEndTime?.slopeDelta
    });
  }

  async generateIncreaseLockAmountAndExtendLockEndTimeTransactions({
    lockAmount,
    lockEndTime,
    userAddress,
    suggestedParams
  }: {
    lockAmount: number;
    lockEndTime: number;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const sender = userAddress || this.userAddress;
    const accountState = await this.fetchAccountState();
    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();

    let increaseLockAmountTxnGroup: Transaction[] = [];
    let extendLockEndTimeTxnGroup: Transaction[] = [];

    let sp = suggestedParams;

    if (!vaultAppGlobalState) {
      throw new Error("There was an error while fetching vault app global state");
    }

    if (!accountState) {
      throw new Error("There was an error while fetcing the account state");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    increaseLockAmountTxnGroup = prepareIncreaseLockAmountTransactions({
      accountState,
      lockedAmount: lockAmount,
      network: this.network,
      sender,
      vaultAppGlobalState,
      suggestedParams: sp
    });

    accountState.powerCount += 1;
    vaultAppGlobalState.totalPowerCount += 1;

    const slopeChangeAtNewLockEndTime = await getSlopeChange(
      this.algodClient,
      VAULT_APP_ID[this.network],
      lockEndTime
    );

    extendLockEndTimeTxnGroup = prepareExtendLockEndTimeTransactions({
      accountState,
      network: this.network,
      newLockEndTime: lockEndTime,
      sender,
      vaultAppGlobalState,
      suggestedParams: sp,
      slopeChangeAtNewLockEndTime: slopeChangeAtNewLockEndTime?.slopeDelta
    });

    const txnGroup = [...increaseLockAmountTxnGroup, ...extendLockEndTimeTxnGroup];

    return Boolean(increaseLockAmountTxnGroup.length) &&
      Boolean(extendLockEndTimeTxnGroup.length)
      ? combineAndRegroupTxns(increaseLockAmountTxnGroup, extendLockEndTimeTxnGroup)
      : txnGroup;
  }

  async generateWithdrawTransactions(
    userAddress?: string,
    shouldOptIntoTINY?: boolean,
    suggestedParams?: SuggestedParams
  ) {
    const sender = userAddress || this.userAddress;
    const accountState = await this.fetchAccountState();
    let sp = suggestedParams;

    if (!accountState) {
      throw new Error("There was an error while fetcing the account state");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    let withdrawTxns = prepareWithdrawTransactions({
      accountState,
      network: this.network,
      sender,
      suggestedParams: sp,
      client: this.algodClient
    });

    if (shouldOptIntoTINY) {
      const optIntoTINYAssetTxn = await generateOptIntoAssetTxns({
        client: this.algodClient,
        initiatorAddr: sender,
        assetID: TINY_ASSET_ID[this.network]
      });

      withdrawTxns = combineAndRegroupTxns([optIntoTINYAssetTxn[0].txn], withdrawTxns);
    }

    return withdrawTxns;
  }

  fetchAccountState() {
    return getAccountState(
      this.algodClient,
      VAULT_APP_ID[this.network],
      this.userAddress
    );
  }

  fetchStakingDistributionProposal(proposalId: string) {
    return getStakingDistributionProposal(
      this.algodClient,
      STAKING_VOTING_APP_ID[this.network],
      proposalId
    );
  }

  async generateCastVoteForStakingDistributionProposalTransactions({
    proposalId,
    votes,
    assetIds,
    userAddress,
    suggestedParams
  }: {
    proposalId: string;
    votes: number[];
    assetIds: number[];
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const selectedUserAddress = userAddress ?? this.userAddress;
    let sp = suggestedParams;
    const stakingDistributionProposal = await this.fetchStakingDistributionProposal(
      proposalId
    );

    if (!stakingDistributionProposal) {
      throw new Error("There was an error while fetching staking distribution proposal");
    }

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    const accountState = await this.fetchAccountState();

    const appBoxNames = await getAllBoxNames(
      this.algodClient,
      STAKING_VOTING_APP_ID[this.network]
    );
    const accountPowers = await getAccountPowers({
      algodClient: this.algodClient,
      address: selectedUserAddress,
      appId: VAULT_APP_ID[this.network],
      powerCount: accountState?.powerCount ?? null
    });
    const accountPowerIndex = getPowerIndexAt(
      accountPowers,
      stakingDistributionProposal.creationTimestamp
    );

    if (accountPowerIndex === null) {
      throw new Error(
        "It is required to have an account power at the staking distribution proposal creation timestamp"
      );
    }

    return prepareCastVoteForStakingDistributionProposalTransactions({
      stakingVotingAppId: STAKING_VOTING_APP_ID[this.network],
      vaultAppId: VAULT_APP_ID[this.network],
      sender: selectedUserAddress,
      proposalId,
      proposal: stakingDistributionProposal,
      votes,
      assetIds,
      accountPowerIndex,
      appBoxNames,
      suggestedParams: sp,
      appCallNote: null
    });
  }

  async fetchRewardsAppGlobalState() {
    try {
      const data = await getGlobalState(this.algodClient, REWARDS_APP_ID[this.network]);

      return new RewardsAppGlobalState(
        data.tiny_asset_id,
        data.vault_app_id,
        data.reward_history_count,
        data.first_period_timestamp,
        data.reward_period_count,
        encodeAddress(data.manager),
        encodeAddress(data.rewards_manager)
      );
    } catch (error: any) {
      console.error(error);

      return null;
    }
  }

  async generateClaimRewardTransactions({
    periodIndexStart,
    periodCount,
    userAddress,
    suggestedParams,
    shouldOptIntoTINY
  }: {
    periodIndexStart: number;
    periodCount: number;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
    shouldOptIntoTINY?: boolean;
  }) {
    const selectedUserAddress = userAddress ?? this.userAddress;
    let sp = suggestedParams;

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    const accountState = await this.fetchAccountState();
    const rewardsAppGlobalState = await this.fetchRewardsAppGlobalState();

    if (!rewardsAppGlobalState) {
      throw new Error("There was an error while fetching rewards app global state");
    }

    if (periodIndexStart + periodCount > rewardsAppGlobalState.rewardPeriodCount) {
      throw new Error(
        "The reward period index to be claimed cannot be larger than the latest reward period index"
      );
    }

    const accountPowers = await getAccountPowers({
      algodClient: this.algodClient,
      address: selectedUserAddress,
      appId: VAULT_APP_ID[this.network],
      powerCount: accountState?.powerCount ?? null
    });

    const claimPeriodStartTimestamp =
      rewardsAppGlobalState.firstPeriodTimestamp + periodIndexStart * WEEK_IN_S;
    const claimPeriodEndTimestamp =
      rewardsAppGlobalState.firstPeriodTimestamp +
      (periodIndexStart + periodCount) * WEEK_IN_S;

    const accountPowerIndexes: number[] = [];

    for (
      let timestamp = claimPeriodStartTimestamp;
      timestamp < claimPeriodEndTimestamp + 1;
      timestamp = timestamp + WEEK_IN_S
    ) {
      accountPowerIndexes.push(getPowerIndexAt(accountPowers, timestamp) ?? 0);
    }

    let createRewardClaimSheet = false;
    const accountRewardClaimSheetBoxIndexes = new Set<number>();

    accountRewardClaimSheetBoxIndexes.add(
      Math.floor(periodIndexStart / (REWARD_CLAIM_SHEET_BOX_SIZE * 8))
    );
    accountRewardClaimSheetBoxIndexes.add(
      Math.floor((periodIndexStart + periodCount) / (REWARD_CLAIM_SHEET_BOX_SIZE * 8))
    );

    for (const index of Array.from(accountRewardClaimSheetBoxIndexes)) {
      const rewardClaimSheet = await getRewardClaimSheet(
        this.algodClient,
        REWARDS_APP_ID[this.network],
        this.userAddress,
        index
      );

      if (!rewardClaimSheet) {
        createRewardClaimSheet = true;
        break;
      }
    }

    let claimRewardsTxns = prepareClaimRewardsTransactions({
      rewardsAppId: REWARDS_APP_ID[this.network],
      vaultAppId: VAULT_APP_ID[this.network],
      tinyAssetId: TINY_ASSET_ID[this.network],
      sender: this.userAddress,
      periodIndexStart,
      periodCount,
      accountPowerIndexes,
      createRewardClaimSheet,
      suggestedParams: sp
    });

    if (shouldOptIntoTINY) {
      const optIntoTINYAssetTxns = await generateOptIntoAssetTxns({
        client: this.algodClient,
        initiatorAddr: selectedUserAddress,
        assetID: TINY_ASSET_ID[this.network]
      });

      claimRewardsTxns = combineAndRegroupTxns(
        [optIntoTINYAssetTxns[0].txn],
        claimRewardsTxns
      );
    }

    return claimRewardsTxns;
  }

  fetchProposal(proposalId: string) {
    return getProposal(
      this.algodClient,
      PROPOSAL_VOTING_APP_ID[this.network],
      proposalId
    );
  }

  //  TODO: update metadata type
  uploadProposalMetadata(proposalId: string, metadata: any) {
    const payload = {
      proposal_id: proposalId,
      metadata
    };
    const promise = fetch(
      `${TINYMAN_ANALYTICS_API_BASE_URLS[this.network].v1}/governance/proposals/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );

    return promise
      .catch(() => {
        return Promise.reject(new Error("Network error. Try again later."));
      })
      .then((response) => {
        if (response.ok) {
          return Promise.resolve(response);
        }

        return Promise.reject(response);
      })
      .catch(async (errorResponse) => {
        let finalError = errorResponse;

        // If the error is not an API error, it may not have a body that supports json conversion
        if (typeof errorResponse.json === "function") {
          const errorResponseJSON = await errorResponse.json();

          finalError = errorResponseJSON;
        }

        return Promise.reject(finalError);
      });
  }

  async generateCreateProposalTransactions({
    proposalId,
    userAddress,
    suggestedParams,
    executionHash,
    executor
  }: {
    proposalId: string;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
    executionHash?: string;
    executor?: string;
  }) {
    if (executionHash && executionHash.length !== EXECUTION_HASH_SIZE) {
      throw new Error("Invalid execution hash");
    }

    const vaultAppGlobalState = await this.fetchVaultAppGlobalState();

    if (!vaultAppGlobalState) {
      throw new Error("There was an error while fetching vault app global state");
    }

    const sender = userAddress ?? this.userAddress;
    let sp = suggestedParams;

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    return prepareCreateProposalTransactions({
      proposalId,
      proposalVotingAppId: PROPOSAL_VOTING_APP_ID[this.network],
      sender,
      suggestedParams: sp,
      vaultAppGlobalState,
      vaultAppId: VAULT_APP_ID[this.network],
      executionHash,
      executor: executor
        ? decodeAddress(executor).publicKey
        : new Uint8Array((await this.fetchProposalVotingAppGlobalState()).proposalManager)
    });
  }

  async generateCastVoteTransactions({
    proposalId,
    suggestedParams,
    vote,
    userAddress
  }: {
    proposalId: string;
    vote: ProposalVote;
    userAddress?: string;
    suggestedParams?: SuggestedParams;
  }) {
    const sender = userAddress ?? this.userAddress;
    let sp = suggestedParams;

    if (!sp) {
      sp = await this.algodClient.getTransactionParams().do();
    }

    const proposal = await this.fetchProposal(proposalId);
    const accountState = await this.fetchAccountState();

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (!accountState) {
      throw new Error("Account state not found");
    }

    if (!proposal.isApproved) {
      throw new Error("Proposal not approved");
    }

    if (!proposal.votingStartTimestamp) {
      throw new Error("Voting start timestamp is not valid");
    }

    if (
      proposal.votingStartTimestamp >= Math.floor(Date.now() / SECOND_IN_MS) ||
      proposal.votingEndTimestamp <= Math.floor(Date.now() / SECOND_IN_MS)
    ) {
      throw new Error("Voting period is not active");
    }

    const accountPowers = await getAccountPowers({
      algodClient: this.algodClient,
      address: sender,
      appId: VAULT_APP_ID[this.network],
      powerCount: accountState.powerCount
    });
    const accountPowerIndex = getPowerIndexAt(accountPowers, proposal.creationTimestamp);

    if (accountPowerIndex === null) {
      throw new Error("Account power index not found");
    }

    const accountAttendanceSheetBoxIndex = Math.floor(
      proposal.index / (ACCOUNT_ATTENDANCE_SHEET_BOX_SIZE * 8)
    );
    const accountAttendanceSheetBoxName = getStakingAttendanceSheetBoxName(
      sender,
      accountAttendanceSheetBoxIndex
    );
    const createAttendanceSheetBox = !(await doesBoxExist(
      this.algodClient,
      PROPOSAL_VOTING_APP_ID[this.network],
      accountAttendanceSheetBoxName
    ));

    return prepareCastVoteTransactions({
      proposalVotingAppId: PROPOSAL_VOTING_APP_ID[this.network],
      vaultAppId: VAULT_APP_ID[this.network],
      sender,
      proposalId,
      proposal,
      vote,
      accountPowerIndex,
      createAttendanceSheetBox,
      suggestedParams: sp
    });
  }

  async fetchProposalVotingAppGlobalState(): Promise<ProposalVotingAppGlobalState> {
    const data = await getGlobalState(
      this.algodClient,
      PROPOSAL_VOTING_APP_ID[this.network]
    );

    return new ProposalVotingAppGlobalState(
      data.vault_app_id,
      data.proposal_index_counter,
      data.voting_delay,
      data.voting_duration,
      data.proposal_threshold,
      data.proposal_threshold_numerator,
      data.quorum_threshold,
      data.approval_requirement,
      data.manager,
      data.proposal_manager
    );
  }

  async getRequiredTinyPowerToCreateProposal(totalTinyPower?: number) {
    const totalPower = totalTinyPower ?? (await this.getTotalTinyPower());
    const votingAppGlobalState = await this.fetchProposalVotingAppGlobalState();
    let requiredTinyPower = votingAppGlobalState.proposalThreshold;

    if (votingAppGlobalState.proposalThresholdNumerator) {
      requiredTinyPower = Math.max(
        requiredTinyPower,
        Math.floor((totalPower * votingAppGlobalState.proposalThresholdNumerator) / 100) +
          1
      );
    }

    return requiredTinyPower;
  }
}

export {TinymanGovernanceClient};
