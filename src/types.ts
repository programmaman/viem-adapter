export type Hex = `0x${string}`;

export type ReadBlockTag =
    | 'earliest'
    | 'latest'
    | 'pending'
    | 'safe'
    | 'finalized';

export type ReadBlockReference =
    | number
    | bigint
    | ReadBlockTag
    | { readonly blockNumber: number | bigint }
    | { readonly blockHash: Hex; readonly requireCanonical?: boolean };

export interface CallRequest {
    readonly to: string;
    readonly data: Hex;
    readonly from?: string;
    readonly value?: bigint;
    readonly block?: ReadBlockReference;
}

export interface LogFilter {
    readonly address?: string | readonly string[];
    readonly topics?: readonly (string | null | readonly string[])[];
    readonly fromBlock?: number | bigint | ReadBlockTag;
    readonly toBlock?: number | bigint | ReadBlockTag;
    readonly blockHash?: Hex;
}

export interface EvmLog {
    readonly address: string;
    readonly topics: readonly Hex[];
    readonly data: Hex;
    readonly transactionHash?: Hex;
    readonly blockNumber?: number;
}

export interface BlockInfo {
    readonly number: number;
    readonly timestamp: number;
}

export interface RpcClient {
    call(request: CallRequest): Promise<Hex>;
    getLogs(filter: LogFilter): Promise<readonly EvmLog[]>;
    getChainId(): Promise<number>;
    getBlock(reference: ReadBlockReference): Promise<BlockInfo>;
}

export type DecodedEvent = Readonly<Record<string, unknown>>;

export interface DecodedError {
    readonly name: string;
    readonly args: readonly unknown[];
}

export interface AbiCodec {
    encode(signature: string, args?: readonly unknown[]): Hex;
    decode(signature: string, data: Hex): readonly unknown[];
    decodeEvent(signature: string, topics: readonly Hex[], data: Hex): DecodedEvent;
    decodeError(data: Hex): DecodedError | undefined;
}
