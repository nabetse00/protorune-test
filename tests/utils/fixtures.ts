import fs from "node:fs";

import * as path from "node:path";
import { expect } from "chai";
//@ts-ignore
import bitcoinjs = require("bitcoinjs-lib");
import {
  buildProgram,
  formatKv,
  TEST_BTC_ADDRESS1,
  TEST_BTC_ADDRESS2,
} from "metashrew-runes/lib/tests/utils/general";
import {
  initCompleteBlockWithRuneEtching,
  runesbyaddress,
} from "metashrew-runes/lib/tests/utils/rune-helpers";
import {
  buildCoinbaseToAddress,
  buildDefaultBlock,
} from "metashrew-runes/lib/tests/utils/block-helpers";
import { constructProtoburnTransaction } from "./protoburn";

// const TEST_PROTOCOL_TAG = parseInt("0x112233445566778899aabbccddeeff10", 16);
const TEST_PROTOCOL_TAG = BigInt("0x400000000000000000");

/**
 * Fixture creates a block with 3 transactions:
 *  - tx 1: coinbase that transfers all bitcoins to ADDRESS1
 *  - tx 2: runestone that has two outputs
 *    - output 0: runestone etch, transfer all runes to pointer = 1 which is ADDRESS1
 *    - output 1: ADDRESS1 p2pkh
 *    - output 2: ADDRESS2 p2pkh
 *  - tx 3: runestone with protoburn
 *    - output 0: runestone with edicts transferring half of the runes to output 0, which has the protoburn.
 *                the protoburn transfers the protorunes to output 1.
 *                The leftover runes get transferred to the pointer, which is also output 0 (the protoburn)
 *                All runes end up getting converted to protorunes and sent to ADDRESS2
 *    - output 1: ADDRESS2 p2pkh
 *    - output 2: ADDRESS1 p2pkh
 *    - note, this will protoburn all the runes that address 1 had and transfer all to ADDRESS2
 *
 * Ending balances if omitBurn=true:
 *  - ADDRESS1 balances
 *    - 1 sat
 *    - 2100000005000000 runes
 *    - 0 protorunes
 *  - ADDRESS2 balances
 *    - 624999999 sat
 *    - 0 runes
 *    - 0 protorunes
 *
 * Ending balances if omitBurn=false:
 *  - ADDRESS1 balances
 *    - 1 sat
 *    - 0 runes
 *    - 0 protorunes
 *  - ADDRESS2 balances
 *    - 624999999 sat
 *    - 0 runes
 *    - 2100000005000000 protorunes
 */
export async function createProtoruneFixture(
  omitBurn: boolean = false,
  premineAmount: bigint = 2100000005000000n,
) {
  const outputs = [
    {
      script: bitcoinjs.payments.p2pkh({
        address: TEST_BTC_ADDRESS1,
        network: bitcoinjs.networks.bitcoin,
      }).output,
      value: 1,
    },
    {
      script: bitcoinjs.payments.p2pkh({
        network: bitcoinjs.networks.bitcoin,
        address: TEST_BTC_ADDRESS2,
      }).output,
      value: 624999999,
    },
  ];
  const pointer1 = 1;
  let block = initCompleteBlockWithRuneEtching(
    outputs,
    pointer1,
    undefined,
    premineAmount,
  );
  const input = {
    inputTxHash: block.transactions?.at(1)?.getHash(), // 0 is coinbase, 1 is the mint
    inputTxOutputIndex: pointer1, // index of output in the input tx that has the runes. In this case it is the default pointer of the mint
  };
  const runeId = {
    block: 840000n,
    tx: 1,
  };
  const amount = premineAmount / 2n;
  const outputIndexToReceiveProtorunes = 2; // 0 is the runestone, 1 is protoburn, 2 is ADDRESS2
  const output = {
    address: TEST_BTC_ADDRESS2,
    btcAmount: 1, //this can be implied to be 1 since runes usually are just inscribed on a satoshi
  };
  // technically this is not a valid transaction since btc in and less than btc out but this is just to test the runes
  const refundOutput = {
    address: TEST_BTC_ADDRESS1,
    btcAmount: 0, // this gives address 1 his remaining bitcoin
  };

  // Constructing tx 2
  // output 0: runestone with protoburns
  // output 1-2: output, and refundOutput
  // This transaction does a protoburn and transfers all protorunes to output 2
  if (!omitBurn) {
    block = constructProtoburnTransaction(
      [input],
      [
        {
          id: runeId,
          amount: amount,
          output: 0, // output 0 is the runestone. first edict corresponds to first protoburn
        },
      ],
      /*outputIndexToReceiveProtorunes=*/ 1, //this goes to the output
      [output, refundOutput], // 0 is script, 1 is address 2 output, 2 is address 1 output
      TEST_PROTOCOL_TAG,
      block,
      /*runeTransferPointer=*/ 0,
    );
  }
  return { input, block, output, refundOutput, runeId, premineAmount, amount };
}
