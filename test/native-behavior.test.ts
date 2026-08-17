import assert from 'node:assert/strict';
import test from 'node:test';
import {
    decodeEventLog,
    decodeFunctionResult,
    encodeAbiParameters,
    encodeEventTopics,
    encodeFunctionData,
    getAddress,
    parseAbi,
} from 'viem';
import { ARBITRATOR, GROUP_ID, OWNER, SUBMITTER, TEST_ABI } from './fixtures.js';

const EDGE_ABI = parseAbi([
    'function noOutput()',
    'function smallUnsigned() view returns (uint8)',
    'function tupleOutput() view returns ((address owner,uint256 amount))',
    'function batch((address target,uint256 amount)[] items)',
    'event Mixed(uint256,address named,bool)',
    'event Duplicate(uint256 value,uint256 value)',
]);

test('native Viem accepts checksummed address arguments', () => {
    const address = getAddress('0x000000000000000000000000000000000000abcd');
    const encoded = encodeFunctionData({
        abi: TEST_ABI,
        functionName: 'overloaded',
        args: [address],
    });

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('native Viem accepts named tuple arguments', () => {
    const encoded = encodeFunctionData({
        abi: TEST_ABI,
        functionName: 'createDispute',
        args: [{
            id: ('0x' + '11'.repeat(32)) as `0x${string}`,
            evidence: '0x1234' as `0x${string}`,
            fee: 9n,
            uri: 'evidence',
        }],
    });

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('native Viem returns bigint function outputs', () => {
    const data = encodeAbiParameters([{ type: 'uint256' }], [7n]);
    const decoded = decodeFunctionResult({
        abi: TEST_ABI,
        functionName: 'overloaded',
        data,
    });

    assert.equal(typeof decoded, 'bigint');
});

test('native Viem returns number for uint8 function outputs', () => {
    const data = encodeAbiParameters([{ type: 'uint8' }], [7]);
    const decoded = decodeFunctionResult({
        abi: EDGE_ABI,
        functionName: 'smallUnsigned',
        data,
    });

    assert.equal(decoded, 7);
    assert.equal(typeof decoded, 'number');
});

test('native Viem returns undefined for zero function outputs', () => {
    const decoded = decodeFunctionResult({
        abi: EDGE_ABI,
        functionName: 'noOutput',
        data: '0x',
    });

    assert.equal(decoded, undefined);
});

test('native Viem returns a named object for a single tuple output', () => {
    const data = encodeAbiParameters(
        [{
            type: 'tuple',
            components: [
                { name: 'owner', type: 'address' },
                { name: 'amount', type: 'uint256' },
            ],
        }],
        [{ owner: OWNER, amount: 7n }],
    );
    const decoded = decodeFunctionResult({
        abi: EDGE_ABI,
        functionName: 'tupleOutput',
        data,
    });

    assert.deepEqual(decoded, { owner: OWNER, amount: 7n });
});

test('native Viem accepts arrays of named tuples with checksummed addresses', () => {
    const target = getAddress('0x000000000000000000000000000000000000abcd');
    const encoded = encodeFunctionData({
        abi: EDGE_ABI,
        functionName: 'batch',
        args: [[{ target, amount: 7n }]],
    });

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('native Viem returns named event arguments', () => {
    const topics = encodeEventTopics({
        abi: TEST_ABI,
        eventName: 'Evidence',
        args: {
            _arbitrator: ARBITRATOR,
            _evidenceGroupId: GROUP_ID,
            _party: SUBMITTER,
        },
    });
    const data = encodeAbiParameters([{ type: 'string' }], ['uri']);
    const decoded = decodeEventLog({
        abi: TEST_ABI,
        eventName: 'Evidence',
        topics: topics as [`0x${string}`, ...`0x${string}`[]],
        data,
        strict: true,
    });

    assert.deepEqual(decoded.args, {
        _arbitrator: ARBITRATOR,
        _evidenceGroupId: GROUP_ID,
        _party: SUBMITTER,
        _evidence: 'uri',
    });
});

test('native Viem returns positional args when an event has unnamed inputs', () => {
    const topics = encodeEventTopics({ abi: EDGE_ABI, eventName: 'Mixed' });
    const data = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'address' }, { type: 'bool' }],
        [7n, OWNER, true],
    );
    const decoded = decodeEventLog({
        abi: EDGE_ABI,
        eventName: 'Mixed',
        topics: topics as [`0x${string}`, ...`0x${string}`[]],
        data,
        strict: true,
    });

    assert.deepEqual(decoded.args, [7n, OWNER, true]);
});

test('native Viem collapses duplicate event names to the last value', () => {
    const topics = encodeEventTopics({ abi: EDGE_ABI, eventName: 'Duplicate' });
    const data = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'uint256' }],
        [7n, 9n],
    );
    const decoded = decodeEventLog({
        abi: EDGE_ABI,
        eventName: 'Duplicate',
        topics: topics as [`0x${string}`, ...`0x${string}`[]],
        data,
        strict: true,
    });

    assert.deepEqual(decoded.args, { value: 9n });
});
