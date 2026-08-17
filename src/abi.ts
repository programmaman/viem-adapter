import {
    decodeErrorResult,
    decodeEventLog,
    decodeFunctionResult,
    encodeFunctionData,
    getAbiItem,
    parseAbiItem,
    toEventSelector,
    toFunctionSelector,
    type Abi,
    type AbiEvent,
    type AbiFunction,
    type AbiParameter,
} from 'viem';

import type {
    AbiCodec,
    DecodedError,
    DecodedEvent,
    Hex,
} from './types.js';

const STANDARD_ERRORS = [
    {
        type: 'error',
        name: 'Error',
        inputs: [{ name: 'message', type: 'string' }],
    },
    {
        type: 'error',
        name: 'Panic',
        inputs: [{ name: 'code', type: 'uint256' }],
    },
] as const;

function getFunction(abi: Abi, signature: string): AbiFunction {
    const parsed = parseAbiItem(
        `function ${signature}`,
    ) as AbiFunction;
    const entry = getAbiItem({
        abi,
        name: toFunctionSelector(parsed),
    });

    if (!entry || entry.type !== 'function') {
        throw new Error(`Unknown function signature: ${signature}`);
    }

    return entry;
}

function getEvent(abi: Abi, signature: string): AbiEvent {
    const parsed = parseAbiItem(
        `event ${signature}`,
    ) as AbiEvent;
    const entry = getAbiItem({
        abi,
        name: toEventSelector(parsed),
    });

    if (!entry || entry.type !== 'event') {
        throw new Error(`Unknown event signature: ${signature}`);
    }

    return entry;
}

function hasError(
    abi: Abi,
    name: string,
    inputType: string,
): boolean {
    return abi.some(entry =>
        entry.type === 'error'
        && entry.name === name
        && entry.inputs.length === 1
        && entry.inputs[0]?.type === inputType);
}

function withStandardErrors(inputAbi: Abi): Abi {
    const additions = STANDARD_ERRORS.filter(error =>
        !hasError(inputAbi, error.name, error.inputs[0].type));

    return [...inputAbi, ...additions] as unknown as Abi;
}

function functionResult(
    outputs: readonly AbiParameter[],
    decoded: unknown,
): readonly unknown[] {
    if (outputs.length === 0) return [];
    if (outputs.length === 1) return [normalizeDecodedIntegers(decoded)];
    return normalizeDecodedIntegers(decoded) as readonly unknown[];
}

function normalizeDecodedIntegers(value: unknown): unknown {
    if (value === undefined || value === null) return value;

    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value)) {
            throw new Error(`Unsafe decoded integer: ${value}`);
        }
        return BigInt(value);
    }

    if (Array.isArray(value)) {
        return value.map(normalizeDecodedIntegers);
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                normalizeDecodedIntegers(item),
            ]),
        );
    }

    return value;
}

function eventResult(
    inputs: readonly AbiParameter[],
    args: unknown,
): DecodedEvent {
    if (args === undefined) return {};
    if (!Array.isArray(args)) return normalizeDecodedIntegers(args) as DecodedEvent;

    return Object.fromEntries(inputs.map((input, index) => [
        input.name || String(index),
        normalizeDecodedIntegers(args[index]),
    ]));
}

export function createViemAbiCodec(inputAbi: Abi): AbiCodec {
    const abi = withStandardErrors(inputAbi);

    return {
        encode(signature, args = []) {
            const entry = getFunction(abi, signature);

            return encodeFunctionData({
                abi: [entry],
                functionName: entry.name,
                args,
            } as never) as Hex;
        },

        decode(signature, data) {
            const entry = getFunction(abi, signature);
            const decoded = decodeFunctionResult({
                abi: [entry],
                functionName: entry.name,
                data,
            } as never);

            return functionResult(entry.outputs ?? [], decoded);
        },

        decodeEvent(signature, topics, data) {
            const entry = getEvent(abi, signature);
            const decoded = decodeEventLog({
                abi: [entry],
                eventName: entry.name,
                topics,
                data,
                strict: true,
            } as never);

            return eventResult(entry.inputs, decoded.args);
        },

        decodeError(data): DecodedError | undefined {
            try {
                const decoded = decodeErrorResult({ abi, data } as never) as {
                    readonly errorName: string;
                    readonly args?: readonly unknown[];
                };

                return {
                    name: decoded.errorName,
                    args: decoded.args
                        ? normalizeDecodedIntegers(decoded.args) as readonly unknown[]
                        : [],
                };
            } catch {
                return undefined;
            }
        },
    };
}
