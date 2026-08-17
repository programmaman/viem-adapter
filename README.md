# @rakelabs/viem-adapter

Viem transport, ABI, and revert-data integration for the Rakelabs SDKs. The SDK
packages remain provider-agnostic; this package adapts a Viem public client to
their `RpcClient` and `AbiCodec` interfaces.

## Install

```bash
npm install @rakelabs/viem-adapter viem
```

## Create SDK dependencies

```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { ABI, Disputes } from '@rakelabs/disputes-sdk';
import {
  createViemAbiCodec,
  createViemRpcClient,
} from '@rakelabs/viem-adapter';

const client = createPublicClient({ chain: mainnet, transport: http() });
const rpcClient = createViemRpcClient(client);
const codec = createViemAbiCodec(ABI);
const disputes = await Disputes.fromRpc(rpcClient, {
  codec,
  walletAddress,
});
```

`createViemRpcClient` maps the public client's read operations to `call`,
`getLogs`, `getChainId`, and `getBlock`. `createViemAbiCodec` handles ABI
encoding, decoding, events, and custom errors.

## Error handling

Use `codec.decodeError(rawData)` for raw revert bytes. Use
`extractViemRevertData(error)` or `decodeViemError(error, codec)` for
Viem- or wallet-wrapped exceptions.

## Signing boundary

The adapter does not own a wallet client and does not broadcast transactions.
SDK methods return unsigned `PreparedTx` values; pass them to the Viem wallet
client or other signer owned by your application.

This package contains no protocol ABIs. Import each ABI from the SDK that owns
the contract you are using.
