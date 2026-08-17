# @rakelabs/viem-adapter

Viem transport and ABI adapter for the Rakelabs SDK packages.

```ts
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { ABI, Disputes } from '@rakelabs/disputes-sdk';
import {
  createViemAbiCodec,
  createViemRpcClient,
} from '@rakelabs/viem-adapter';

const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const rpcClient = createViemRpcClient(client);
const codec = createViemAbiCodec(ABI);

const disputes = await Disputes.fromRpc(rpcClient, {
  codec,
  walletAddress,
});
```

This package does not contain protocol ABIs and does not sign or submit transactions.
