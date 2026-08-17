import { BaseError } from 'viem';
import type { AbiCodec, DecodedError, Hex } from './types.js';

function isHexData(value: unknown): value is Hex {
    return typeof value === 'string'
        && /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
}

export function extractViemRevertData(error: unknown): Hex | undefined {
    if (!(error instanceof BaseError)) return undefined;

    const source = error.walk(item =>
        item !== null && typeof item === 'object' && 'data' in item);
    if (!source || typeof source !== 'object') return undefined;

    const sourceWithData = source as {
        readonly data?: unknown;
        readonly raw?: unknown;
    };
    const data = sourceWithData.data;
    if (isHexData(data)) return data;
    if (isHexData(sourceWithData.raw)) return sourceWithData.raw;
    if (typeof data !== 'object' || data === null) return undefined;

    const nested = (data as { readonly data?: unknown }).data;
    return isHexData(nested) ? nested : undefined;
}

export function decodeViemError(
    error: unknown,
    codec: AbiCodec,
): DecodedError | undefined {
    const data = extractViemRevertData(error);
    return data === undefined ? undefined : codec.decodeError(data);
}
