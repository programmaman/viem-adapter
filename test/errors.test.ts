import assert from 'node:assert/strict';
import test from 'node:test';
import {
    encodeErrorResult,
    BaseError,
} from 'viem';
import {
    createViemAbiCodec,
    decodeViemError,
    extractViemRevertData,
} from '../src/index.js';
import { TEST_ABI } from './fixtures.js';

const codec = createViemAbiCodec(TEST_ABI);

test('decodes custom errors', () => {
    const data = encodeErrorResult({
        abi: TEST_ABI,
        errorName: 'NotEnoughFee',
        args: [3n, 5n],
    });

    assert.deepEqual(codec.decodeError(data), {
        name: 'NotEnoughFee',
        args: [3n, 5n],
    });
});

test('decodes standard errors', () => {
    const errorData = encodeErrorResult({
        abi: TEST_ABI,
        errorName: 'Error',
        args: ['no'],
    });
    const panicData = encodeErrorResult({
        abi: TEST_ABI,
        errorName: 'Panic',
        args: [0x11n],
    });

    assert.deepEqual(codec.decodeError(errorData), {
        name: 'Error',
        args: ['no'],
    });
    assert.deepEqual(codec.decodeError(panicData), {
        name: 'Panic',
        args: [0x11n],
    });
});

test('returns undefined for unknown selectors', () => {
    assert.equal(codec.decodeError('0x12345678'), undefined);
});

test('extracts nested revert data', () => {
    const data = encodeErrorResult({
        abi: TEST_ABI,
        errorName: 'NotOwner',
    });
    const source = Object.assign(new BaseError('reverted'), { data });
    const error = new BaseError('wrapped', { cause: source });

    assert.equal(extractViemRevertData(error), data);
    assert.deepEqual(decodeViemError(error, codec), {
        name: 'NotOwner',
        args: [],
    });
});

test('ignores non-Viem errors', () => {
    assert.equal(extractViemRevertData(new Error('0x12345678')), undefined);
});
