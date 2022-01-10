"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatorAppSchema = exports.tinymanContract = exports.TinymanContract = void 0;
const ascJson = __importStar(require("./asc.json"));
const base64_js_1 = require("base64-js");
const algosdk_1 = require("algosdk");
class TinymanContract {
    constructor(validatorApp, poolLogicSig) {
        this.poolLogicSigContractTemplate = poolLogicSig.logic.bytecode;
        this.templateVariables = poolLogicSig.logic.variables;
        this.validatorApprovalContract = base64_js_1.toByteArray(validatorApp.approval_program.bytecode);
        this.validatorClearStateContract = base64_js_1.toByteArray(validatorApp.clear_program.bytecode);
        this.schema = {
            numLocalInts: validatorApp.local_state_schema.num_uints,
            numLocalByteSlices: validatorApp.local_state_schema.num_byte_slices,
            numGlobalInts: validatorApp.global_state_schema.num_uints,
            numGlobalByteSlices: validatorApp.global_state_schema.num_byte_slices
        };
    }
    getPoolLogicSig({ validatorAppID, asset1ID, asset2ID }) {
        if (asset1ID === asset2ID) {
            throw new Error("Assets are the same");
        }
        if (asset2ID > asset1ID) {
            const tmp = asset1ID;
            asset1ID = asset2ID;
            asset2ID = tmp;
        }
        let programArray = Array.from(base64_js_1.toByteArray(this.poolLogicSigContractTemplate));
        const variables = {
            asset_id_1: asset1ID,
            asset_id_2: asset2ID,
            validator_app_id: validatorAppID
        };
        let offset = 0;
        this.templateVariables.sort((a, b) => a.index - b.index);
        for (let i = 0; i < this.templateVariables.length; i++) {
            const v = this.templateVariables[i];
            let name = v.name.split("TMPL_")[1].toLowerCase();
            let value = variables[name];
            let start = v.index - offset;
            let end = start + v.length;
            // All of the template variables are ints
            let value_encoded = encodeVarInt(value);
            let diff = v.length - value_encoded.length;
            offset += diff;
            programArray = programArray
                .slice(0, start)
                .concat(value_encoded)
                .concat(programArray.slice(end));
        }
        const program = new Uint8Array(programArray);
        const lsig = new algosdk_1.LogicSigAccount(program);
        return {
            addr: lsig.address(),
            program
        };
    }
}
exports.TinymanContract = TinymanContract;
exports.tinymanContract = new TinymanContract(ascJson.contracts.validator_app, ascJson.contracts.pool_logicsig);
exports.validatorAppSchema = exports.tinymanContract.schema;
function encodeVarInt(number) {
    let buf = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let towrite = number & 0x7f;
        number >>= 7;
        if (number) {
            buf.push(towrite | 0x80);
        }
        else {
            buf.push(towrite);
            break;
        }
    }
    return buf;
}
/* eslint
      no-param-reassign: "off",
      no-bitwise: "off",
      prefer-destructuring: "off"
*/
