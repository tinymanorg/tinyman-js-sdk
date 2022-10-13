"use strict";
Object.defineProperty(exports, "__esModule", {value: !0});
var t = require("algosdk"),
  e = require("base64-js");
function s(t) {
  return t && "object" == typeof t && "default" in t ? t : {default: t};
}
var n = s(t);
const a = Uint8Array.from([1]),
  o = "- would result negative",
  r = "logic eval error:",
  i = "exceeds schema integer count",
  c = /transaction \w+:/;
class u extends Error {
  constructor(t, e, ...s) {
    super(...s);
    const n = this.extractMessageFromAlgoSDKError(t);
    (this.data = t),
      (this.type = this.getErrorType(n)),
      this.setMessage(this.getErrorMessage(n, this.type, e));
  }
  setMessage(t) {
    this.message = t;
  }
  getErrorType(t) {
    let e = "Unknown";
    return (
      t.includes(o)
        ? (e = "SlippageTolerance")
        : t.includes(i)
        ? (e = "ExceedingExcessAmountCount")
        : t.includes(r)
        ? (e = "LogicError")
        : t.match(c) && (e = "TransactionError"),
      e
    );
  }
  getErrorMessage(t, e, s) {
    let n;
    switch (e) {
      case "SlippageTolerance":
        n =
          "The process failed due to too much slippage in the price. Please adjust the slippage tolerance and try again.";
        break;
      case "ExceedingExcessAmountCount":
        n =
          "The process failed due to the number of excess amounts accumulated for your account in the Tinyman app.";
        break;
      case "LogicError":
        n = t.split(r)[1];
        break;
      case "TransactionError":
        n = t.split(c)[1];
        break;
      case "Unknown":
        t && (n = t);
    }
    return (
      n || (n = s || "We encountered an unexpected error, try again later."), n.trim()
    );
  }
  extractMessageFromAlgoSDKError(t) {
    let e = "";
    return (
      t?.response?.body?.message
        ? (e = t.response.body.message)
        : t?.response?.text
        ? (e = t.response.text)
        : "string" == typeof t?.message &&
          (e = this.isMessageObjectString(t?.message)
            ? JSON.parse(t.message || "{message: ''}").message
            : t.message),
      "string" != typeof e && (e = String(e)),
      e
    );
  }
  isMessageObjectString(t) {
    return "string" == typeof t && t.includes("{message:");
  }
}
function A(t = []) {
  const e = {};
  for (const s of t) {
    const {key: t} = s;
    let n;
    if (1 == s.value.type) n = s.value.bytes;
    else {
      if (2 != s.value.type) throw new Error(`Unexpected state type: ${s.value.type}`);
      n = s.value.uint;
    }
    e[t] = n;
  }
  return e;
}
function l(t) {
  let e = t.reduce((t, e) => t + e.length, 0),
    s = new Uint8Array(e),
    n = 0;
  for (let e of t) s.set(e, n), (n += e.length);
  return s;
}
const d = 100000n,
  I = 100000n,
  p = 100000n,
  g = 25000n + 25000n,
  m = 25000n + 3500n;
function E(t) {
  return new Promise((e) => {
    setTimeout(() => {
      e(null);
    }, t);
  });
}
async function D(t, e) {
  for (;;) {
    await E(1e3);
    let s = null;
    try {
      s = await t.pendingTransactionInformation(e).do();
    } catch (t) {}
    if (s) {
      if (s["confirmed-round"]) return s;
      if (s["pool-error"]) throw new Error(`Transaction Rejected: ${s["pool-error"]}`);
    }
  }
}
function T(t, e, s) {
  if (e > 1 || e < 0)
    throw new Error(`Invalid slippage value. Must be between 0 and 1, got ${e}`);
  let n;
  try {
    const a = "negative" === t ? 1 - e : 1 + e;
    n = BigInt(Math.floor(Number(s) * a));
  } catch (t) {
    throw new Error(t.message);
  }
  return n;
}
function x(t, e) {
  const s = Number(t);
  return f({decimalPlaces: s}, Math.pow(10, -s) * Number(e));
}
function f({decimalPlaces: t = 0}, e) {
  return Number(Math.round(Number(e + `e+${t}`)) + `e-${t}`);
}
async function N(t, e) {
  try {
    let s = [];
    for (let n of e) {
      const {txId: e} = await t.sendRawTransaction(n).do(),
        a = (await D(t, e))["confirmed-round"];
      s.push({confirmedRound: a, txnID: e});
    }
    return s;
  } catch (t) {
    throw new u(
      t,
      "We encountered an error while processing this transaction. Try again later."
    );
  }
}
function y(t) {
  return t.reduce((t, e) => t + e.txn.fee, 0);
}
function S(t) {
  return (e = t[0].txn.group) ? Buffer.from(e).toString("base64") : "";
  var e;
}
function _(t) {
  return new TextEncoder().encode(t);
}
const w = {
    id: "0",
    name: "Algorand",
    unit_name: "ALGO",
    decimals: 6,
    url: "https://algorand.org",
    is_liquidity_token: !1,
    total_amount: "6615503326932151"
  },
  h = {DEFAULT: "TMPOOL11", V1: "TM1POOL"};
var B = {
    type: "logicsig",
    logic: {
      bytecode:
        "BCAIAQCBgICAgICAgPABgICAgICAgIDwAQMEBQYlJA1EMQkyAxJEMRUyAxJEMSAyAxJEMgQiDUQzAQAxABJEMwEQIQcSRDMBGIGCgICAgICAgPABEkQzARkiEjMBGyEEEhA3ARoAgAlib290c3RyYXASEEAAXDMBGSMSRDMBG4ECEjcBGgCABHN3YXASEEACOzMBGyISRDcBGgCABG1pbnQSQAE7NwEaAIAEYnVybhJAAZg3ARoAgAZyZWRlZW0SQAJbNwEaAIAEZmVlcxJAAnkAIQYhBSQjEk0yBBJENwEaARclEjcBGgIXJBIQRDMCADEAEkQzAhAhBBJEMwIhIxJEMwIiIxwSRDMCIyEHEkQzAiQjEkQzAiWACFRNUE9PTDExEkQzAiZRAA+AD1RpbnltYW5Qb29sMS4xIBJEMwIngBNodHRwczovL3RpbnltYW4ub3JnEkQzAikyAxJEMwIqMgMSRDMCKzIDEkQzAiwyAxJEMwMAMQASRDMDECEFEkQzAxElEkQzAxQxABJEMwMSIxJEJCMTQAAQMwEBMwIBCDMDAQg1AUIBsTMEADEAEkQzBBAhBRJEMwQRJBJEMwQUMQASRDMEEiMSRDMBATMCAQgzAwEIMwQBCDUBQgF8MgQhBhJENwEcATEAE0Q3ARwBMwQUEkQzAgAxABNEMwIUMQASRDMDADMCABJEMwIRJRJEMwMUMwMHMwMQIhJNMQASRDMDESMzAxAiEk0kEkQzBAAxABJEMwQUMwIAEkQzAQEzBAEINQFCAREyBCEGEkQ3ARwBMQATRDcBHAEzAhQSRDMDFDMDBzMDECISTTcBHAESRDMCADEAEkQzAhQzBAASRDMCESUSRDMDADEAEkQzAxQzAwczAxAiEk0zBAASRDMDESMzAxAiEk0kEkQzBAAxABNEMwQUMQASRDMBATMCAQgzAwEINQFCAJAyBCEFEkQ3ARwBMQATRDMCADcBHAESRDMCADEAE0QzAwAxABJEMwIUMwIHMwIQIhJNMQASRDMDFDMDBzMDECISTTMCABJEMwEBMwMBCDUBQgA+MgQhBBJENwEcATEAE0QzAhQzAgczAhAiEk03ARwBEkQzAQEzAgEINQFCABIyBCEEEkQzAQEzAgEINQFCAAAzAAAxABNEMwAHMQASRDMACDQBD0M=",
      address: "ABUKAXTANWR6K6ZYV75DWJEPVWWOU6SFUVRI6QHO44E4SIDLHBTD2CZ64A",
      size: 881,
      variables: [
        {name: "TMPL_ASSET_ID_1", type: "int", index: 15, length: 10},
        {name: "TMPL_ASSET_ID_2", type: "int", index: 5, length: 10},
        {name: "TMPL_VALIDATOR_APP_ID", type: "int", index: 74, length: 10}
      ],
      source:
        "https://github.com/tinymanorg/tinyman-contracts-v1/tree/dc9ab40c58b85c15d58f63a1507e18be76720dbb/contracts/pool_logicsig.teal.tmpl"
    },
    name: "pool_logicsig"
  },
  M = {
    type: "app",
    approval_program: {
      bytecode:
        "BCAHAAHoB+UHBf///////////wHAhD0mDQFvAWUBcAJhMQJhMgJsdARzd2FwBG1pbnQBdAJjMQJwMQJjMgJwMjEZgQQSMRkhBBIRMRmBAhIRQATxMRkjEjEbIhIQQATjNhoAgAZjcmVhdGUSQATUMRkjEjYaAIAJYm9vdHN0cmFwEhBAA/MzAhIzAggINTQiK2I1ZSI0ZXAARDUBIicEYjVmNGZAABEiYCJ4CTEBCDMACAk1AkIACCI0ZnAARDUCIicFYjVnKDRlFlA1byI0b2I1PSg0ZhZQNXAiNHBiNT4oNGcWUDVxIjRxYjU/IipiNUA0ATQ9CTVHNAI0Pgk1SDEAKVA0ZRZQNXkxAClQNGYWUDV6MQApUDRnFlA1ezYaAIAGcmVkZWVtEkAAWjYaAIAEZmVlcxJAABw2GgAnBhI2GgAnBxIRNhoAgARidXJuEhFAAG0ANGdJRDMCERJEMwISRDMCFDIJEkQ0PzMCEgk1PzRAMwISCTVAIio0QGYiNHE0P2YjQzMCFDMCBzMCECMSTTYcARJENDREIigzAhEWUEpiNDQJZiMxAClQMwIRFlBKYjQ0CUlBAANmI0NIaCNDMgciJwhiCUk1+kEARiInCWIiJwpiNPodTEAANx4hBSMeHzX7SEhIIicLYiInDGI0+h1MQAAdHiEFIx4fNfxISEgiJwk0+2YiJws0/GYiJwgyB2YzAxIzAwgINTU2HAExABNENGdBACIiNGdwAEQ1BiIcNAYJND8INQQ2GgAnBhJAASA0ZzMEERJENhoAJwcSQABVNhwBMwQAEkQzBBI0Rx00BCMdH0hITEhJNRA0NAk1yTMEEjRIHTQEIx0fSEhMSEk1ETQ1CTXKNBA0ERBENEc0EAk1UTRINBEJNVI0BDMEEgk1U0ICCjYcATMCABJENEc0NAg1UTRINDUINVI0BCISQAAuNDQ0BB00RyMdH0hITEg0NTQEHTRIIx0fSEhMSEoNTUk0BAg1UzMEEgk1y0IBvyInBTMEEUk1Z2YoNGcWUDVxIjRncABERDRnNGUTRDRnNGYTRDMEEiQISR018DQ0NDUdNfFKDEAACBJENPA08Q5EMwQSJAgjCEkdNfA0NDQ1HTXxSg1AAAgSRDTwNPENRCQ1PzQEMwQSJAgINVNCAU82HAEzAgASRDMCETRlEjMDETRmEhBJNWRAABkzAhE0ZhIzAxE0ZRIQRDRINRI0RzUTQgAINEc1EjRINRM2GgGAAmZpEkAAWjYaAYACZm8SRDQ1JAs0Eh00EzQ1CSUdH0hITEgjCEk1FSINNDU0EwwQRDQ0NBUJNGRBABM1yTRHNBUINVE0SDQ1CTVSQgBnNco0SDQVCDVSNEc0NQk1UUIAVDQ0STUVJQs0Ex00EiQLNDQlCx4fSEhMSEk1FCINNBQ0EwwQRDQUNDUJNGRBABM1yjRHNDQINVE0SDQUCTVSQgATNck0RzQUCTVRNEg0NAg1UkIAADQVIQQLNAQdgaCcATQSHR9ISExISTUqNAQINVNCADsiKzYaARdJNWVmIicENhoCF0k1ZmY0ZXEDRIABLVCABEFMR080ZkEABkg0ZnEDRFAzAiZJFYEPTFISQyIqNEA0KghmIjRxND80Kgg0ywhmIjRvND00yQhmIjRwND40yghmIoACczE0UWYigAJzMjRSZiInCjRSIQYdNFEjHR9ISExIZiInDDRRIQYdNFIjHR9ISExIZiKAA2lsdDRTZjTLQQAJIzR7SmI0ywhmNMlBAAkjNHlKYjTJCGY0ykEACSM0ekpiNMoIZiNDI0MiQw==",
      address: "BUQHXHPLMYUVS3P2INJ2EUJFCSNT6LNUGXVM6T2SZ27TDRDYLUMWCFYW3E",
      size: 1351,
      variables: [],
      source:
        "https://github.com/tinymanorg/tinyman-contracts-v1/tree/dc9ab40c58b85c15d58f63a1507e18be76720dbb/contracts/validator_approval.teal"
    },
    clear_program: {
      bytecode: "BIEB",
      address: "P7GEWDXXW5IONRW6XRIRVPJCT2XXEQGOBGG65VJPBUOYZEJCBZWTPHS3VQ",
      size: 3,
      variables: [],
      source:
        "https://github.com/tinymanorg/tinyman-contracts-v1/tree/dc9ab40c58b85c15d58f63a1507e18be76720dbb/contracts/validator_clear_state.teal"
    },
    global_state_schema: {num_uints: 0, num_byte_slices: 0},
    local_state_schema: {num_uints: 16, num_byte_slices: 0},
    name: "validator_app"
  };
function R(t) {
  let e = [];
  for (;;) {
    let s = 127 & t;
    if (!(t >>= 7)) {
      e.push(s);
      break;
    }
    e.push(128 | s);
  }
  return e;
}
function Q(t) {
  return t === C.V2;
}
const b = {
  v1_1: {testnet: 62368684, mainnet: 552635992},
  v2: {testnet: 113134165, mainnet: 552635992}
};
function P(t, e) {
  const s = b[e][t];
  if (!s)
    throw new Error(
      `No Validator App exists for ${t} network with ${e} contract version`
    );
  return s;
}
const C = {V1_1: "v1_1", V2: "v2"};
class O {
  constructor(t, s) {
    (this.validatorApprovalContract = e.toByteArray(t.approval_program.bytecode)),
      (this.validatorClearStateContract = e.toByteArray(t.clear_program.bytecode)),
      (this.schema = {
        numLocalInts: t.local_state_schema.num_uints,
        numLocalByteSlices: t.local_state_schema.num_byte_slices,
        numGlobalInts: t.global_state_schema.num_uints,
        numGlobalByteSlices: t.global_state_schema.num_byte_slices
      });
  }
}
class k extends O {
  constructor(t, e) {
    super(t, e),
      (this.poolLogicSigContractTemplate = e.logic.bytecode),
      (this.templateVariables = e.logic.variables);
  }
  generateLogicSigAccountForPool(s) {
    const {network: n, asset1ID: a, asset2ID: o} = s;
    return (function (s) {
      const {
        validatorAppID: n,
        poolLogicSigContractTemplate: a,
        templateVariables: o
      } = s;
      let {asset1ID: r, asset2ID: i} = s;
      if (r === i) throw new Error("Assets are the same");
      if (i > r) {
        const t = r;
        (r = i), (i = t);
      }
      let c = Array.from(e.toByteArray(a));
      const u = {asset_id_1: r, asset_id_2: i, validator_app_id: n};
      let A = 0;
      o.sort((t, e) => t.index - e.index);
      for (let t = 0; t < o.length; t++) {
        const e = o[t];
        let s = u[e.name.split("TMPL_")[1].toLowerCase()],
          n = e.index - A,
          a = n + e.length,
          r = R(s);
        (A += e.length - r.length), (c = c.slice(0, n).concat(r).concat(c.slice(a)));
      }
      const l = new Uint8Array(c);
      return new t.LogicSigAccount(l);
    })({
      validatorAppID: P(n, C.V1_1),
      asset1ID: a,
      asset2ID: o,
      poolLogicSigContractTemplate: this.poolLogicSigContractTemplate,
      templateVariables: this.templateVariables
    });
  }
}
const U = new k(M, B),
  L = new (class extends O {
    constructor(t, e) {
      super(t, e), (this.poolLogicSigContractTemplate = e.logic.bytecode);
    }
    generateLogicSigAccountForPool(s) {
      const {network: n, asset1ID: a, asset2ID: o} = s;
      return (function (s) {
        const {validatorAppID: n, poolLogicSigContractTemplate: a} = s;
        let {asset1ID: o, asset2ID: r} = s;
        if (o === r) throw new Error("Assets are the same");
        if (r > o) {
          const t = o;
          (o = r), (r = t);
        }
        let i = Array.from(e.toByteArray(a));
        const c = Array.from(e.toByteArray(n.toString())),
          u = Array.from(e.toByteArray(o.toString())),
          A = Array.from(e.toByteArray(r.toString()));
        i.slice(0, 3)
          .concat([...c, ...u, ...A])
          .concat(i.slice(27));
        const l = new Uint8Array(i);
        return new t.LogicSigAccount(l);
      })({
        validatorAppID: P(n, C.V2),
        asset1ID: a,
        asset2ID: o,
        poolLogicSigContractTemplate: this.poolLogicSigContractTemplate
      });
    }
  })(M, {
    type: "logicsig",
    logic: {bytecode: "BoAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQBbNQA0ADEYEkQxGYEBEkSBAUM="},
    name: "pool_logicsig"
  });
function F(t) {
  const e = t["apps-total-schema"];
  return (
    1e5 +
    1e5 * (t.assets || []).length +
    1e5 * (t["created-apps"] || []).length +
    1e5 * (t["apps-local-state"] || []).length +
    5e4 * ((e && e["num-byte-slice"]) || 0) +
    28500 * ((e && e["num-uint"]) || 0) +
    1e5 * (t["apps-total-extra-pages"] || 0)
  );
}
const v = _("e");
async function j({client: s, pool: a, accountAddr: o}) {
  const r =
    (await s.accountInformation(o).setIntDecoding(t.IntDecoding.BIGINT).do())[
      "apps-local-state"
    ] || [];
  let i = 0n,
    c = 0n,
    u = 0n;
  const d = a.account.address();
  for (const t of r) {
    if (t.id != a.validatorAppID) continue;
    const s = t["key-value"];
    if (!s) break;
    const o = A(s),
      r = e.fromByteArray(
        l([n.default.decodeAddress(d).publicKey, v, n.default.encodeUint64(a.asset1ID)])
      ),
      I = e.fromByteArray(
        l([n.default.decodeAddress(d).publicKey, v, n.default.encodeUint64(a.asset2ID)])
      ),
      p = e.fromByteArray(
        l([
          n.default.decodeAddress(d).publicKey,
          v,
          n.default.encodeUint64(a.liquidityTokenID)
        ])
      ),
      g = o[r],
      m = o[I],
      E = o[p];
    "bigint" == typeof g && (i = g),
      "bigint" == typeof m && (c = m),
      "bigint" == typeof E && (u = E);
  }
  const I = {excessAsset1: i, excessAsset2: c, excessLiquidityTokens: u};
  if (I.excessAsset1 < 0n || I.excessAsset2 < 0n || I.excessLiquidityTokens < 0n)
    throw new Error(`Invalid account excess: ${I}`);
  return I;
}
var J;
async function X(t) {
  const {client: e, network: s, contractVersion: n, asset1ID: a, asset2ID: o} = t,
    r = (n === C.V1_1 ? U : L).generateLogicSigAccountForPool(t),
    i = P(s, n),
    c = r.address();
  let u = {
    account: r,
    validatorAppID: i,
    asset1ID: Math.max(a, o),
    asset2ID: Math.min(a, o),
    status: exports.PoolStatus.NOT_CREATED,
    contractVersion: n
  };
  const A = await Y({client: e, address: c, network: s, contractVersion: n});
  return (
    A &&
      ((u.asset1ID = A.asset1ID),
      (u.asset2ID = A.asset2ID),
      (u.liquidityTokenID = A.liquidityTokenID),
      (u.status = exports.PoolStatus.READY)),
    u
  );
}
(exports.PoolStatus = void 0),
  ((J = exports.PoolStatus || (exports.PoolStatus = {})).NOT_CREATED = "not created"),
  (J.BOOTSTRAP = "bootstrap"),
  (J.READY = "ready"),
  (J.ERROR = "error");
const V = _("o"),
  z = 0xffffffffffffffffn;
const G = {};
async function Y({client: t, address: e, network: s, contractVersion: n}, a = G) {
  if (a[e]) return a[e];
  const o = await t.accountInformation(e).do(),
    r = o["apps-local-state"].find((t) => t.id == P(s, n));
  let i = null;
  if (r) {
    const t = A(r["key-value"]),
      s = Q(n) ? "asset_1_id" : "a1",
      c = Q(n) ? "asset_2_id" : "a2",
      u = btoa(s),
      l = btoa(c),
      d = o["created-assets"][0].index;
    (i = {asset1ID: t[u], asset2ID: t[l], liquidityTokenID: d}), (a[e] = i);
  }
  return i;
}
function W(t) {
  return Boolean(t && !(t.asset1 + t.asset2));
}
var q, H;
function Z(t, e) {
  return (
    3e5 +
    (0 === t ? 0 : 1e5) +
    1e5 +
    28500 * U.schema.numLocalInts +
    5e4 * U.schema.numLocalByteSlices +
    e.liquidityTokenCreateTxn +
    e.asset1OptinTxn +
    e.asset2OptinTxn +
    e.validatorAppCallTxn
  );
}
!(function (t) {
  (t[(t.FUNDING_TXN = 0)] = "FUNDING_TXN"),
    (t[(t.VALIDATOR_APP_CALL = 1)] = "VALIDATOR_APP_CALL"),
    (t[(t.LIQUIDITY_TOKEN_CREATE = 2)] = "LIQUIDITY_TOKEN_CREATE"),
    (t[(t.ASSET1_OPT_IN = 3)] = "ASSET1_OPT_IN"),
    (t[(t.ASSET2_OPT_IN = 4)] = "ASSET2_OPT_IN");
})(q || (q = {})),
  (function (t) {
    (t[(t.FEE_TXN = 0)] = "FEE_TXN"),
      (t[(t.VALIDATOR_APP_CALL_TXN = 1)] = "VALIDATOR_APP_CALL_TXN"),
      (t[(t.ASSET1_OUT_TXN = 2)] = "ASSET1_OUT_TXN"),
      (t[(t.ASSET2_OUT_TXN = 3)] = "ASSET2_OUT_TXN"),
      (t[(t.LIQUDITY_IN_TXN = 4)] = "LIQUDITY_IN_TXN");
  })(H || (H = {}));
const K = 3n,
  $ = 1000n;
var tt, et;
(exports.SwapType = void 0),
  ((tt = exports.SwapType || (exports.SwapType = {})).FixedInput = "fixed-input"),
  (tt.FixedOutput = "fixed-output"),
  (function (t) {
    (t[(t.FEE_TXN_INDEX = 0)] = "FEE_TXN_INDEX"),
      (t[(t.VALIDATOR_APP_CALL_TXN_INDEX = 1)] = "VALIDATOR_APP_CALL_TXN_INDEX"),
      (t[(t.ASSET_IN_TXN_INDEX = 2)] = "ASSET_IN_TXN_INDEX"),
      (t[(t.ASSET_OUT_TXN_INDEX = 3)] = "ASSET_OUT_TXN_INDEX");
  })(et || (et = {}));
(exports.ALGO_ASSET = w),
  (exports.ALGO_ASSET_ID = 0),
  (exports.ASSET_OPT_IN_PROCESS_TXN_COUNT = 1),
  (exports.BASE_MINIMUM_BALANCE = 1e5),
  (exports.BURN_PROCESS_TXN_COUNT = 5),
  (exports.CONTRACT_VERSION = C),
  (exports.LIQUIDITY_TOKEN_UNIT_NAME = h),
  (exports.MINIMUM_BALANCE_REQUIRED_PER_APP = 1e5),
  (exports.MINIMUM_BALANCE_REQUIRED_PER_ASSET = 1e5),
  (exports.MINIMUM_BALANCE_REQUIRED_PER_BYTE_SCHEMA = 5e4),
  (exports.MINIMUM_BALANCE_REQUIRED_PER_INT_SCHEMA_VALUE = 28500),
  (exports.MINIMUM_LIQUIDITY_MINTING_AMOUNT = 1e3),
  (exports.OPT_IN_VALIDATOR_APP_PROCESS_TXN_COUNT = 1),
  (exports.OPT_OUT_VALIDATOR_APP_PROCESS_TXN_COUNT = 1),
  (exports.REDEEM_PROCESS_TXN_COUNT = 3),
  (exports.SWAP_PROCESS_TXN_COUNT = 4),
  (exports.TinymanContractV1_1 = k),
  (exports.applySlippageToAmount = T),
  (exports.burnLiquidity = async function ({
    client: t,
    pool: e,
    txGroup: s,
    signedTxns: n,
    initiatorAddr: a
  }) {
    try {
      const o = s[H.ASSET1_OUT_TXN].txn.amount,
        r = s[H.ASSET2_OUT_TXN].txn.amount,
        i = s[H.LIQUDITY_IN_TXN].txn.amount,
        c = await j({client: t, pool: e, accountAddr: a}),
        [{confirmedRound: u, txnID: A}] = await N(t, [n]),
        l = await j({client: t, pool: e, accountAddr: a});
      let d = l.excessAsset1 - c.excessAsset1;
      d < 0n && (d = 0n);
      let I = l.excessAsset2 - c.excessAsset2;
      return (
        I < 0n && (I = 0n),
        {
          round: u,
          fees: y(s),
          asset1ID: e.asset1ID,
          asset1Out: BigInt(o) + d,
          asset2ID: e.asset2ID,
          asset2Out: BigInt(r) + I,
          liquidityID: e.liquidityTokenID,
          liquidityIn: BigInt(i),
          excessAmounts: [
            {
              assetID: e.asset1ID,
              excessAmountForBurning: d,
              totalExcessAmount: l.excessAsset1
            },
            {
              assetID: e.asset2ID,
              excessAmountForBurning: I,
              totalExcessAmount: l.excessAsset2
            }
          ],
          txnID: A,
          groupID: S(s)
        }
      );
    } catch (t) {
      const e = new u(
        t,
        "We encountered something unexpected while burning liquidity. Try again later."
      );
      throw (
        ("SlippageTolerance" === e.type &&
          e.setMessage(
            "The burn failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
          ),
        e)
      );
    }
  }),
  (exports.calculateAccountMinimumRequiredBalance = F),
  (exports.calculatePoolBootstrapFundingTxnAmount = Z),
  (exports.convertFromBaseUnits = x),
  (exports.convertToBaseUnits = function (t, e) {
    return f({decimalPlaces: 0}, Math.pow(10, Number(t)) * Number(e));
  }),
  (exports.createPool = async function (t, e, s, n) {
    return (
      await (async function ({client: t, signedTxns: e, txnIDs: s}) {
        try {
          await t.sendRawTransaction(e).do();
          const n = (await D(t, s[q.LIQUIDITY_TOKEN_CREATE]))["asset-index"];
          if ("number" != typeof n)
            throw new Error(`Generated ID is not valid: got ${n}`);
          return {liquidityTokenID: n};
        } catch (t) {
          throw new u(
            t,
            "We encountered something unexpected while bootstraping the pool. Try again later."
          );
        }
      })({client: t, signedTxns: s, txnIDs: n}),
      X({
        client: t,
        network: "testnet",
        asset1ID: e.asset1ID,
        asset2ID: e.asset2ID,
        contractVersion: C.V1_1
      })
    );
  }),
  (exports.generateBootstrapTransactions = async function ({
    client: t,
    validatorAppID: e,
    asset1ID: s,
    asset2ID: a,
    asset1UnitName: o,
    asset2UnitName: r,
    initiatorAddr: i
  }) {
    const c = await t.getTransactionParams().do(),
      u =
        s > a
          ? {asset1: {id: s, unitName: o}, asset2: {id: a, unitName: r}}
          : {asset1: {id: a, unitName: r}, asset2: {id: s, unitName: o}},
      A = U.generateLogicSigAccountForPool({
        asset1ID: u.asset1.id,
        asset2ID: u.asset2.id,
        network: "testnet"
      }).address(),
      l = n.default.makeApplicationOptInTxnFromObject({
        from: A,
        appIndex: e,
        appArgs: [
          _("bootstrap"),
          n.default.encodeUint64(u.asset1.id),
          n.default.encodeUint64(u.asset2.id)
        ],
        foreignAssets: 0 == u.asset2.id ? [u.asset1.id] : [u.asset1.id, u.asset2.id],
        suggestedParams: c
      }),
      d = n.default.makeAssetCreateTxnWithSuggestedParamsFromObject({
        from: A,
        total: 0xffffffffffffffffn,
        decimals: 6,
        defaultFrozen: !1,
        unitName: h.DEFAULT,
        assetName: `TinymanPool1.1 ${u.asset1.unitName}-${u.asset2.unitName}`,
        assetURL: "https://tinyman.org",
        suggestedParams: c
      }),
      I = n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: A,
        to: A,
        assetIndex: u.asset1.id,
        amount: 0,
        suggestedParams: c
      }),
      p =
        0 === u.asset2.id
          ? null
          : n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
              from: A,
              to: A,
              assetIndex: u.asset2.id,
              amount: 0,
              suggestedParams: c
            });
    let g = [
      n.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: i,
        to: A,
        amount: Z(u.asset2.id, {
          liquidityTokenCreateTxn: d.fee,
          asset1OptinTxn: I.fee,
          asset2OptinTxn: p ? p.fee : 0,
          validatorAppCallTxn: l.fee
        }),
        suggestedParams: c
      }),
      l,
      d,
      I
    ];
    p && g.push(p);
    const m = n.default.assignGroupID(g);
    let E = [
      {txn: m[0], signers: [i]},
      {txn: m[1], signers: [A]},
      {txn: m[2], signers: [A]},
      {txn: m[3], signers: [A]}
    ];
    return m[4] && E.push({txn: m[4], signers: [A]}), E;
  }),
  (exports.generateBurnTxns = async function ({
    client: t,
    pool: e,
    liquidityIn: s,
    asset1Out: o,
    asset2Out: r,
    slippage: i,
    initiatorAddr: c,
    poolAddress: u
  }) {
    const A = await t.getTransactionParams().do(),
      l = n.default.makeApplicationNoOpTxnFromObject({
        from: u,
        appIndex: e.validatorAppID,
        appArgs: [_("burn")],
        accounts: [c],
        foreignAssets:
          0 == e.asset2ID
            ? [e.asset1ID, e.liquidityTokenID]
            : [e.asset1ID, e.asset2ID, e.liquidityTokenID],
        suggestedParams: A
      }),
      d = T("negative", i, o),
      I = n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: u,
        to: c,
        assetIndex: e.asset1ID,
        amount: d,
        suggestedParams: A
      }),
      p = T("negative", i, r);
    let g;
    g =
      0 === e.asset2ID
        ? n.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: u,
            to: c,
            amount: p,
            suggestedParams: A
          })
        : n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: u,
            to: c,
            assetIndex: e.asset2ID,
            amount: p,
            suggestedParams: A
          });
    const m = n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
      from: c,
      to: u,
      assetIndex: e.liquidityTokenID,
      amount: s,
      suggestedParams: A
    });
    let E = l.fee + I.fee + g.fee;
    const D = n.default.makePaymentTxnWithSuggestedParamsFromObject({
      from: c,
      to: u,
      amount: E,
      note: a,
      suggestedParams: A
    });
    E += m.fee + D.fee;
    const x = n.default.assignGroupID([D, l, I, g, m]);
    return [
      {txn: x[H.FEE_TXN], signers: [c]},
      {txn: x[H.VALIDATOR_APP_CALL_TXN], signers: [u]},
      {txn: x[H.ASSET1_OUT_TXN], signers: [u]},
      {txn: x[H.ASSET2_OUT_TXN], signers: [u]},
      {txn: x[H.LIQUDITY_IN_TXN], signers: [c]}
    ];
  }),
  (exports.generateOptIntoAssetTxns = async function ({
    client: t,
    assetID: e,
    initiatorAddr: s
  }) {
    try {
      const a = await t.getTransactionParams().do();
      return [
        {
          txn: n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: s,
            to: s,
            assetIndex: e,
            amount: 0,
            suggestedParams: a
          }),
          signers: [s]
        }
      ];
    } catch (t) {
      throw new u(
        t,
        "We encountered something unexpected while opting into this asset. Try again later."
      );
    }
  }),
  (exports.generateOptIntoValidatorTxns = async function ({
    client: t,
    validatorAppID: e,
    initiatorAddr: s
  }) {
    const a = await t.getTransactionParams().do();
    return [
      {
        txn: n.default.makeApplicationOptInTxnFromObject({
          from: s,
          appIndex: e,
          suggestedParams: a
        }),
        signers: [s]
      }
    ];
  }),
  (exports.generateOptOutOfValidatorTxns = async function ({
    client: t,
    validatorAppID: e,
    initiatorAddr: s
  }) {
    const a = await t.getTransactionParams().do();
    return [
      {
        txn: n.default.makeApplicationClearStateTxnFromObject({
          from: s,
          appIndex: e,
          suggestedParams: a
        }),
        signers: [s]
      }
    ];
  }),
  (exports.generateRedeemTxns = async function ({
    client: t,
    pool: e,
    assetID: s,
    assetOut: o,
    initiatorAddr: r,
    poolAddress: i
  }) {
    const c = await t.getTransactionParams().do(),
      u = n.default.makeApplicationNoOpTxnFromObject({
        from: i,
        appIndex: e.validatorAppID,
        appArgs: [_("redeem")],
        accounts: [r],
        foreignAssets:
          0 == e.asset2ID
            ? [e.asset1ID, e.liquidityTokenID]
            : [e.asset1ID, e.asset2ID, e.liquidityTokenID],
        suggestedParams: c
      });
    let A;
    A =
      0 === s
        ? n.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: i,
            to: r,
            amount: BigInt(o),
            suggestedParams: c
          })
        : n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: i,
            to: r,
            assetIndex: s,
            amount: BigInt(o),
            suggestedParams: c
          });
    const l = n.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: r,
        to: i,
        amount: u.fee + A.fee,
        note: a,
        suggestedParams: c
      }),
      d = n.default.assignGroupID([l, u, A]);
    return [
      {txn: d[0], signers: [r]},
      {txn: d[1], signers: [i]},
      {txn: d[2], signers: [i]}
    ];
  }),
  (exports.generateSwapTransactions = async function ({
    client: t,
    pool: e,
    swapType: s,
    assetIn: o,
    assetOut: r,
    slippage: i,
    initiatorAddr: c,
    poolAddress: u
  }) {
    const A = await t.getTransactionParams().do(),
      l = [_("swap"), s === exports.SwapType.FixedInput ? _("fi") : _("fo")],
      d = n.default.makeApplicationNoOpTxnFromObject({
        from: u,
        appIndex: e.validatorAppID,
        appArgs: l,
        accounts: [c],
        foreignAssets:
          0 == e.asset2ID
            ? [e.asset1ID, e.liquidityTokenID]
            : [e.asset1ID, e.asset2ID, e.liquidityTokenID],
        suggestedParams: A
      }),
      I = s === exports.SwapType.FixedOutput ? T("positive", i, o.amount) : o.amount;
    let p;
    p =
      0 === o.assetID
        ? n.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: c,
            to: u,
            amount: I,
            suggestedParams: A
          })
        : n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: c,
            to: u,
            assetIndex: o.assetID,
            amount: I,
            suggestedParams: A
          });
    const g = s === exports.SwapType.FixedInput ? T("negative", i, r.amount) : r.amount;
    let m;
    m =
      0 === r.assetID
        ? n.default.makePaymentTxnWithSuggestedParamsFromObject({
            from: u,
            to: c,
            amount: g,
            suggestedParams: A
          })
        : n.default.makeAssetTransferTxnWithSuggestedParamsFromObject({
            from: u,
            to: c,
            assetIndex: r.assetID,
            amount: g,
            suggestedParams: A
          });
    const E = n.default.makePaymentTxnWithSuggestedParamsFromObject({
        from: c,
        to: u,
        amount: d.fee + m.fee,
        note: a,
        suggestedParams: A
      }),
      D = n.default.assignGroupID([E, d, p, m]);
    return [
      {txn: D[0], signers: [c]},
      {txn: D[1], signers: [u]},
      {txn: D[2], signers: [c]},
      {txn: D[3], signers: [u]}
    ];
  }),
  (exports.getAccountExcess = async function ({
    client: t,
    accountAddr: s,
    validatorAppID: a
  }) {
    const o = (
      (await t.accountInformation(s).setIntDecoding("bigint").do())["apps-local-state"] ||
      []
    ).find((t) => t.id == a);
    let r = [];
    if (o && o["key-value"]) {
      const t = A(o["key-value"]);
      for (let s of Object.entries(t)) {
        const [t, a] = s,
          o = e.toByteArray(t);
        41 === o.length &&
          101 === o[32] &&
          r.push({
            poolAddress: n.default.encodeAddress(o.slice(0, 32)),
            assetID: n.default.decodeUint64(o.slice(33, 41), "safe"),
            amount: parseInt(a)
          });
      }
    }
    return r;
  }),
  (exports.getAccountExcessWithinPool = j),
  (exports.getAccountInformation = function (t, e) {
    return new Promise(async (s, n) => {
      try {
        const n = await t.accountInformation(e).do();
        s({...n, minimum_required_balance: F(n)});
      } catch (t) {
        n(new Error(t.message || "Failed to fetch account information"));
      }
    });
  }),
  (exports.getBootstrapProcessTxnCount = function (t) {
    return 0 === t ? 4 : 5;
  }),
  (exports.getBurnLiquidityQuote = function ({pool: t, reserves: e, liquidityIn: s}) {
    const n = BigInt(s),
      a = e.issuedLiquidity && (n * e.asset1) / e.issuedLiquidity,
      o = e.issuedLiquidity && (n * e.asset2) / e.issuedLiquidity;
    return {
      round: e.round,
      liquidityID: t.liquidityTokenID,
      liquidityIn: n,
      asset1ID: t.asset1ID,
      asset1Out: a,
      asset2ID: t.asset2ID,
      asset2Out: o
    };
  }),
  (exports.getPoolAssets = Y),
  (exports.getPoolInfo = X),
  (exports.getPoolPairRatio = function (t, e) {
    const s = W(e);
    let n = null;
    return (
      e &&
        !s &&
        e.asset1 &&
        e.asset2 &&
        "number" == typeof t.asset2 &&
        "number" == typeof t.asset1 &&
        (n = x(t.asset1, e.asset1) / x(t.asset2, e.asset2)),
      n
    );
  }),
  (exports.getPoolReserves = async function (s, a) {
    const o = await s
        .accountInformation(a.account.address())
        .setIntDecoding(t.IntDecoding.BIGINT)
        .do(),
      r = o["apps-local-state"] || [];
    let i = 0n,
      c = 0n,
      u = 0n;
    for (const t of r) {
      if (t.id != a.validatorAppID) continue;
      const s = t["key-value"];
      if (!s) break;
      const o = A(s),
        r = e.fromByteArray(l([V, n.default.encodeUint64(a.asset1ID)])),
        d = e.fromByteArray(l([V, n.default.encodeUint64(a.asset2ID)])),
        I = e.fromByteArray(l([V, n.default.encodeUint64(a.liquidityTokenID)])),
        p = o[r],
        g = o[d],
        m = o[I];
      "bigint" == typeof p && (i = p),
        "bigint" == typeof g && (c = g),
        "bigint" == typeof m && (u = m);
    }
    let E = 0n,
      D = 0n,
      T = 0n;
    for (const t of o.assets) {
      const e = t["asset-id"],
        {amount: s} = t;
      e == a.asset1ID
        ? (E = BigInt(s))
        : e == a.asset2ID
        ? (D = BigInt(s))
        : e == a.liquidityTokenID && (T = BigInt(s));
    }
    if (0 === a.asset2ID) {
      const t = (function (t) {
        const e = t["apps-total-schema"];
        let s = 0n,
          n = 0n;
        e &&
          (e["num-byte-slice"] && (s = e["num-byte-slice"]),
          e["num-uint"] && (n = e["num-uint"]));
        const a = t["apps-local-state"] || [],
          o = t["created-apps"] || [],
          r = t.assets || [];
        return d + I * BigInt(r.length) + p * BigInt(o.length + a.length) + m * n + g * s;
      })(o);
      D = BigInt(o.amount) - t;
    }
    const x = {
      round: Number(o.round),
      asset1: E - i,
      asset2: D - c,
      issuedLiquidity: z - T + u
    };
    if (x.asset1 < 0n || x.asset2 < 0n || x.issuedLiquidity < 0n || x.issuedLiquidity > z)
      throw (
        ((x.asset1 = Number(x.asset1)),
        (x.asset2 = Number(x.asset2)),
        (x.issuedLiquidity = Number(x.issuedLiquidity)),
        new Error(`Invalid pool reserves: ${JSON.stringify(x)}`))
      );
    return x;
  }),
  (exports.getPoolShare = function (t, e) {
    let s = Number(e) / Number(t);
    return Number.isFinite(s) || (s = 0), s;
  }),
  (exports.getPoolsForPair = function (t) {
    return Promise.all(Object.values(C).map((e) => X({...t, contractVersion: e})));
  }),
  (exports.getStakingAppID = function (t) {
    return "testnet" === t ? 51948952 : 649588853;
  }),
  (exports.getSwapQuote = function (t, e, s, n, a) {
    let o;
    if (e.status !== exports.PoolStatus.READY)
      throw new u({pool: e, asset: n}, "Trying to swap on a non-existent pool");
    return (
      (o =
        "fixed-input" === t
          ? (function ({pool: t, reserves: e, assetIn: s, decimals: n}) {
              const a = BigInt(s.amount);
              let o, r, i;
              s.assetID === t.asset1ID
                ? ((o = t.asset2ID), (r = e.asset1), (i = e.asset2))
                : ((o = t.asset1ID), (r = e.asset2), (i = e.asset1));
              const c = (a * K) / $,
                u = i - (r * i) / (r + (a - c));
              if (u > i) throw new Error("Output amount exceeds available liquidity.");
              const A = x(n.assetOut, Number(u)) / x(n.assetIn, Number(a)),
                l = x(n.assetOut, Number(i)) / x(n.assetIn, Number(r)),
                d = f({decimalPlaces: 5}, Math.abs(A / l - 1));
              return {
                round: e.round,
                assetInID: s.assetID,
                assetInAmount: a,
                assetOutID: o,
                assetOutAmount: u,
                swapFee: Number(c),
                rate: A,
                priceImpact: d
              };
            })({pool: e, reserves: s, assetIn: n, decimals: a})
          : (function ({pool: t, reserves: e, assetOut: s, decimals: n}) {
              const a = BigInt(s.amount);
              let o, r, i;
              if (
                (s.assetID === t.asset1ID
                  ? ((o = t.asset2ID), (r = e.asset2), (i = e.asset1))
                  : ((o = t.asset1ID), (r = e.asset1), (i = e.asset2)),
                a > i)
              )
                throw new Error("Output amount exceeds available liquidity.");
              const c = (r * i) / (i - a) - r,
                u = (c * $) / ($ - K),
                A = u - c,
                l = x(n.assetOut, Number(a)) / x(n.assetIn, Number(u)),
                d = x(n.assetOut, Number(i)) / x(n.assetIn, Number(r)),
                I = f({decimalPlaces: 5}, Math.abs(l / d - 1));
              return {
                round: e.round,
                assetInID: o,
                assetInAmount: u,
                assetOutID: s.assetID,
                assetOutAmount: a,
                swapFee: Number(A),
                rate: l,
                priceImpact: I
              };
            })({pool: e, reserves: s, assetOut: n, decimals: a})),
      o
    );
  }),
  (exports.getTxnGroupID = S),
  (exports.getValidatorAppID = P),
  (exports.hasSufficientMinimumBalance = function (t) {
    return t.amount >= t.minimum_required_balance;
  }),
  (exports.isAccountOptedIntoApp = function ({appID: t, accountAppsLocalState: e}) {
    return e.some((e) => e.id === t);
  }),
  (exports.isPoolEmpty = W),
  (exports.isPoolNotCreated = function (t) {
    return t?.status === exports.PoolStatus.NOT_CREATED;
  }),
  (exports.isPoolReady = function (t) {
    return t?.status === exports.PoolStatus.READY;
  }),
  (exports.issueSwap = async function ({
    client: t,
    pool: e,
    swapType: s,
    txGroup: n,
    signedTxns: a,
    initiatorAddr: o
  }) {
    if (e.status !== exports.PoolStatus.READY)
      throw new u(
        {pool: e, swapType: s, txGroup: n},
        "Trying to swap on a non-existent pool"
      );
    try {
      const r = {
          assetID: n[et.ASSET_IN_TXN_INDEX].txn.assetIndex || 0,
          amount: n[et.ASSET_IN_TXN_INDEX].txn.amount
        },
        i = {
          assetID: n[et.ASSET_OUT_TXN_INDEX].txn.assetIndex || 0,
          amount: n[et.ASSET_OUT_TXN_INDEX].txn.amount
        };
      let c;
      return (
        (c =
          s === exports.SwapType.FixedInput
            ? await (async function ({
                client: t,
                pool: e,
                signedTxns: s,
                assetIn: n,
                assetOut: a,
                initiatorAddr: o
              }) {
                const r = await j({client: t, pool: e, accountAddr: o});
                let [{confirmedRound: i, txnID: c}] = await N(t, [s]);
                const u = await j({client: t, pool: e, accountAddr: o});
                let A, l;
                a.assetID === e.asset1ID
                  ? ((A = r.excessAsset1), (l = u.excessAsset1))
                  : ((A = r.excessAsset2), (l = u.excessAsset2));
                let d = l - A;
                return (
                  d < 0n && (d = 0n),
                  {
                    round: i,
                    assetInID: n.assetID,
                    assetInAmount: BigInt(n.amount),
                    assetOutID: a.assetID,
                    assetOutAmount: BigInt(a.amount) + d,
                    excessAmount: {
                      assetID: a.assetID,
                      excessAmountForSwap: d,
                      totalExcessAmount: l
                    },
                    txnID: c
                  }
                );
              })({
                client: t,
                pool: e,
                signedTxns: a,
                assetIn: r,
                assetOut: i,
                initiatorAddr: o
              })
            : await (async function ({
                client: t,
                pool: e,
                signedTxns: s,
                assetIn: n,
                assetOut: a,
                initiatorAddr: o
              }) {
                const r = await j({client: t, pool: e, accountAddr: o});
                let [{confirmedRound: i, txnID: c}] = await N(t, [s]);
                const u = await j({client: t, pool: e, accountAddr: o});
                let A, l;
                n.assetID === e.asset1ID
                  ? ((A = r.excessAsset1), (l = u.excessAsset1))
                  : ((A = r.excessAsset2), (l = u.excessAsset2));
                let d = l - A;
                return (
                  d < 0n && (d = 0n),
                  {
                    round: i,
                    assetInID: n.assetID,
                    assetInAmount: BigInt(n.amount) - d,
                    assetOutID: a.assetID,
                    assetOutAmount: BigInt(a.amount),
                    excessAmount: {
                      assetID: n.assetID,
                      excessAmountForSwap: d,
                      totalExcessAmount: l
                    },
                    txnID: c
                  }
                );
              })({
                client: t,
                pool: e,
                signedTxns: a,
                assetIn: r,
                assetOut: i,
                initiatorAddr: o
              })),
        {...c, groupID: S(n), fees: y(n)}
      );
    } catch (t) {
      const e = new u(
        t,
        "We encountered something unexpected while swapping. Try again later."
      );
      throw (
        ("SlippageTolerance" === e.type &&
          e.setMessage(
            "The swap failed due to too much slippage in the price. Please adjust the slippage tolerance and try again."
          ),
        e)
      );
    }
  }),
  (exports.prepareCommitTransactions = async function ({
    client: e,
    stakingAppID: s,
    program: n,
    requiredAssetID: a,
    liquidityAssetID: o,
    amount: r,
    initiatorAddr: i
  }) {
    const c = await e.getTransactionParams().do(),
      u = (function ({
        suggestedParams: e,
        stakingAppID: s,
        initiatorAddr: n,
        liquidityAssetID: a,
        program: o,
        amount: r
      }) {
        const i = t.encodeUint64(r),
          c = t.encodeUint64(o.id);
        return t.makeApplicationNoOpTxnFromObject({
          appIndex: s,
          from: n,
          suggestedParams: e,
          foreignAssets: [a],
          accounts: [o.accountAddress],
          appArgs: [_("commit"), i],
          note: l([_("tinymanStaking/v1:b"), c, t.encodeUint64(a), i])
        });
      })({
        suggestedParams: c,
        stakingAppID: s,
        program: n,
        liquidityAssetID: o,
        initiatorAddr: i,
        amount: r
      });
    let A = [u];
    if ("number" == typeof a) {
      const e = t.makeApplicationNoOpTxnFromObject({
        appIndex: s,
        from: i,
        suggestedParams: c,
        foreignAssets: [a],
        accounts: [n.accountAddress],
        appArgs: [_("log_balance")]
      });
      return (
        (A = t.assignGroupID([u, e])),
        [
          {txn: A[0], signers: [i]},
          {txn: A[1], signers: [i]}
        ]
      );
    }
    return [{txn: A[0], signers: [i]}];
  }),
  (exports.redeemAllExcessAsset = async function ({
    client: t,
    data: e,
    initiatorSigner: s
  }) {
    try {
      const a = e.map(({txGroup: t, pool: e}) => ({
          txns: t,
          txnFees: y(t),
          groupID: S(t),
          lsig: e.account.lsig
        })),
        o = await s(a.map((t) => t.txns));
      return Promise.all(
        a.map(
          (e, s) =>
            new Promise(async (a, r) => {
              try {
                const r = e.txns.map((t, a) => {
                    if (0 === a) return o[s];
                    const {blob: r} = n.default.signLogicSigTransactionObject(
                      t.txn,
                      e.lsig
                    );
                    return r;
                  }),
                  [{txnID: i, confirmedRound: c}] = await N(t, [r]);
                a({fees: e.txnFees, groupID: e.groupID, txnID: i, confirmedRound: c});
              } catch (t) {
                r(t);
              }
            })
        )
      );
    } catch (t) {
      throw new u(
        t,
        "We encountered something unexpected while redeeming. Try again later."
      );
    }
  }),
  (exports.redeemExcessAsset = async function ({
    client: t,
    pool: e,
    txGroup: s,
    initiatorSigner: a
  }) {
    try {
      const o = await (async function ({txGroup: t, pool: e, initiatorSigner: s}) {
          const [a] = await s([t]),
            {lsig: o} = e.account;
          return t.map((t, e) => {
            if (0 === e) return a;
            const {blob: s} = n.default.signLogicSigTransactionObject(t.txn, o);
            return s;
          });
        })({txGroup: s, pool: e, initiatorSigner: a}),
        [{txnID: r, confirmedRound: i}] = await N(t, [o]);
      return {fees: y(s), confirmedRound: i, txnID: r, groupID: S(s)};
    } catch (t) {
      throw new u(
        t,
        "We encountered something unexpected while redeeming. Try again later."
      );
    }
  }),
  (exports.sendAndWaitRawTransaction = N),
  (exports.signBootstrapTransactions = async function ({
    txGroup: t,
    initiatorSigner: e,
    validatorAppID: s,
    asset1ID: a,
    asset2ID: o
  }) {
    const [r] = await e([t]),
      i = a > o ? {asset1ID: a, asset2ID: o} : {asset1ID: o, asset2ID: a},
      c = U.generateLogicSigAccountForPool({
        asset1ID: i.asset1ID,
        asset2ID: i.asset2ID,
        network: "testnet"
      }),
      u = [];
    return {
      signedTxns: t.map((t, e) => {
        if (e === q.FUNDING_TXN) return u.push(t.txn.txID().toString()), r;
        const {txID: s, blob: a} = n.default.signLogicSigTransactionObject(t.txn, c);
        return u.push(s), a;
      }),
      txnIDs: u
    };
  }),
  (exports.signBurnTxns = async function ({pool: t, txGroup: e, initiatorSigner: s}) {
    const [a, o] = await s([e]),
      {lsig: r} = t.account;
    return e.map((t, e) => {
      if (e === H.FEE_TXN) return a;
      if (e === H.LIQUDITY_IN_TXN) return o;
      const {blob: s} = n.default.signLogicSigTransactionObject(t.txn, r);
      return s;
    });
  }),
  (exports.signSwapTransactions = async function ({
    pool: t,
    txGroup: e,
    initiatorSigner: s
  }) {
    const [a, o] = await s([e]);
    return e.map((e, s) => {
      if (s === et.FEE_TXN_INDEX) return a;
      if (s === et.ASSET_IN_TXN_INDEX) return o;
      const {blob: r} = n.default.signLogicSigTransactionObject(e.txn, t.account.lsig);
      return r;
    });
  }),
  (exports.sumUpTxnFees = y),
  (exports.tinymanContract_v2 = L);
