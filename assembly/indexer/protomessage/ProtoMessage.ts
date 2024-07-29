import { Block } from "metashrew-as/assembly/blockdata";
import { RunesTransaction } from "metashrew-runes/assembly/indexer/RunesTransaction";
import { MessageContext } from "./MessageContext";
import { BalanceSheet } from "metashrew-runes/assembly/indexer/BalanceSheet";
import { ProtoStone } from "../ProtoStone";
import { Field } from "../fields/ProtoruneField";
import { fieldTo, fieldToArrayBuffer, stripNullRight } from "metashrew-runes/assembly/utils";
import { encodeHexFromBuffer } from "metashrew-as/assembly/utils/hex";
import { console } from "metashrew-as/assembly/utils/logging";

export class ProtoMessage {
  public vout: u32;
  public calldata: ArrayBuffer;
  public pointer: u32;
  public refund_pointer: u32;
  public protocolId: u128;
  constructor(
    vout: u32,
    pointer: u32,
    refund_pointer: u32,
    _calldata: ArrayBuffer,
    protocolId: u128,
  ) {
    this.vout = vout;
    this.pointer = pointer;
    this.refund_pointer = refund_pointer;
    const calldata = Uint8Array.wrap(stripNullRight(_calldata)).reverse()
      .buffer;
    this.calldata = calldata;
    this.protocolId = protocolId;
  }
  handle<T extends MessageContext>(
    tx: RunesTransaction,
    block: Block,
    height: u64,
    i: u32,
  ): void {
    const context = instantiate<T>(
      changetype<T>(0).protocolTag(),
      tx,
      block,
      height,
      i,
      this.vout,
      this.pointer,
      this.refund_pointer,
      this.calldata,
    );

    changetype<T>(context).run();
  }
  static from(protostone: ProtoStone, vout: u32): ProtoMessage {
    if (
      !protostone.fields.has(Field.MESSAGE) ||
      !protostone.fields.has(Field.POINTER) ||
      !protostone.fields.has(Field.REFUND)
    )
      return changetype<ProtoMessage>(0);

    let calldata: ArrayBuffer = fieldToArrayBuffer(
      protostone.fields.get(Field.MESSAGE),
    );
    return new ProtoMessage(
      vout,
      fieldTo<u32>(protostone.fields.get(Field.POINTER)),
      fieldTo<u32>(protostone.fields.get(Field.REFUND)),
      calldata,
    );
  }
}
