import type { PublicClient } from 'viem';
import type {
    BlockInfo,
    CallRequest,
    EvmLog,
    Hex,
    LogFilter,
    ReadBlockReference,
    RpcClient,
} from './types.js';

export type ViemRpcClient = Pick<
    PublicClient,
    'call' | 'getLogs' | 'getChainId' | 'getBlock'
>;

export function createViemRpcClient(client: ViemRpcClient): RpcClient {
    return {
        async call(request) {
            const result = await client.call({
                to: request.to as `0x${string}`,
                data: request.data,
                ...(request.from === undefined ? {} : { account: request.from as `0x${string}` }),
                ...(request.value === undefined ? {} : { value: request.value }),
                ...toViemBlockArgs(request.block),
            } as never);

            return (result.data ?? '0x') as Hex;
        },

        async getLogs(filter) {
            const logs = await client.getLogs({
                ...(filter.address === undefined ? {} : { address: filter.address }),
                ...(filter.topics === undefined ? {} : { topics: filter.topics }),
                ...(filter.fromBlock === undefined ? {} : { fromBlock: toViemLogBound(filter.fromBlock) }),
                ...(filter.toBlock === undefined ? {} : { toBlock: toViemLogBound(filter.toBlock) }),
                ...(filter.blockHash === undefined ? {} : { blockHash: filter.blockHash }),
            } as never);

            return logs.map((log): EvmLog => ({
                address: log.address,
                topics: log.topics as Hex[],
                data: log.data as Hex,
                ...(log.transactionHash === undefined ? {} : { transactionHash: log.transactionHash as Hex }),
                ...(log.blockNumber === undefined ? {} : { blockNumber: toSafeNumber(log.blockNumber, 'log block number') }),
            }));
        },

        getChainId() {
            return client.getChainId();
        },

        async getBlock(reference): Promise<BlockInfo> {
            const block = await client.getBlock(toViemBlockArgs(reference) as never);
            return {
                number: toSafeNumber(block.number, 'block number'),
                timestamp: toSafeNumber(block.timestamp, 'block timestamp'),
            };
        },
    };
}

function toViemBlockArgs(reference: ReadBlockReference | undefined): Record<string, unknown> {
    if (reference === undefined) return {};
    if (typeof reference === 'number' || typeof reference === 'bigint') {
        return { blockNumber: BigInt(reference) };
    }
    if (typeof reference === 'string') return { blockTag: reference };
    if ('blockNumber' in reference) return { blockNumber: BigInt(reference.blockNumber) };
    return {
        blockHash: reference.blockHash,
        ...(reference.requireCanonical === undefined
            ? {} : { requireCanonical: reference.requireCanonical }),
    };
}

function toViemLogBound(value: number | bigint | string): bigint | string {
    return typeof value === 'number' || typeof value === 'bigint'
        ? BigInt(value)
        : value;
}

function toSafeNumber(value: number | bigint, name: string): number {
    const result = typeof value === 'bigint' ? value : BigInt(value);
    if (result < 0n || result > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(`Invalid ${name}`);
    }
    return Number(result);
}
