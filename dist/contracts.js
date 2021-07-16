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
exports.getPoolLogicSig = exports.encodeVarInt = exports.VALIDATOR_APP_SCHEMA = exports.validatorClearStateContract = exports.validatorApprovalContract = void 0;
const base64_js_1 = require("base64-js");
const algosdk_1 = require("algosdk");
const contractsJson = __importStar(require("./contracts.json"));
const poolLogicSigContractTemplate = contractsJson.contracts.pool_logicsig.logic.program;
const templateVariables = contractsJson.contracts.pool_logicsig.logic.variables;
const validator_app = contractsJson.contracts.validator_app;
exports.validatorApprovalContract = base64_js_1.toByteArray(validator_app.approval_program.program);
exports.validatorClearStateContract = base64_js_1.toByteArray(validator_app.clear_program.program);
exports.VALIDATOR_APP_SCHEMA = {
    numLocalInts: validator_app.local_state_schema.num_uints,
    numLocalByteSlices: validator_app.local_state_schema.num_byte_slices,
    numGlobalInts: validator_app.global_state_schema.num_uints,
    numGlobalByteSlices: validator_app.global_state_schema.num_byte_slices,
};
function encodeVarInt(number) {
    let buf = [];
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
exports.encodeVarInt = encodeVarInt;
function getPoolLogicSig({ validatorAppID, asset1ID, asset2ID, }) {
    if (asset1ID === asset2ID) {
        throw new Error('Assets are the same');
    }
    if (asset2ID > asset1ID) {
        const tmp = asset1ID;
        asset1ID = asset2ID;
        asset2ID = tmp;
    }
    let programArray = Array.from(base64_js_1.toByteArray(poolLogicSigContractTemplate));
    const variables = {
        'asset_id_1': asset1ID,
        'asset_id_2': asset2ID,
        'validator_app_id': validatorAppID,
    };
    let offset = 0;
    templateVariables.sort((a, b) => a.index - b.index);
    for (let i = 0; i < templateVariables.length; i++) {
        const v = templateVariables[i];
        let name = v.name.split('TMPL_')[1].toLowerCase();
        let value = variables[name];
        let start = v.index - offset;
        let end = start + v.length;
        // All of the template variables are ints
        let value_encoded = encodeVarInt(value);
        let diff = v.length - value_encoded.length;
        offset += diff;
        programArray = programArray.slice(0, start).concat(value_encoded).concat(programArray.slice(end));
    }
    const program = new Uint8Array(programArray);
    const lsig = algosdk_1.makeLogicSig(program);
    return {
        addr: lsig.address(),
        program,
    };
}
exports.getPoolLogicSig = getPoolLogicSig;
