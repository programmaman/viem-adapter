import assert from 'node:assert/strict';
import test from 'node:test';
import {
    encodeAbiParameters,
    encodeErrorResult,
    encodeEventTopics,
    getAddress,
    parseAbi,
} from 'viem';
import {
    createViemAbiCodec,
} from '../src/index.js';
import type { Hex } from '../src/index.js';
import {
    ARBITRATOR,
    GROUP_ID,
    OWNER,
    SUBMITTER,
    TEST_ABI,
} from './fixtures.js';

const codec = createViemAbiCodec(TEST_ABI);
const EDGE_ABI = parseAbi([
    'function noOutput()',
    'function smallUnsigned() view returns (uint8)',
    'function smallSigned() view returns (int16)',
    'function mixedSmall() view returns (uint8,address,bool)',
    'function tupleOutput() view returns ((address owner,uint256 amount))',
    'function tupleArrayOutput() view returns ((uint8 status,uint16[] codes)[])',
    'event Mixed(uint256,address named,bool)',
    'event SmallInteger(uint8 status,uint16 amount)',
    'error InvalidState(uint8 current,uint16 required)',
]);
const edgeCodec = createViemAbiCodec(EDGE_ABI);

test('encodes overloaded functions', () => {
    const byNumber = codec.encode('overloaded(uint256)', [4n]);
    const byAddress = codec.encode('overloaded(address)', [OWNER]);

    assert.notEqual(byNumber.slice(0, 10), byAddress.slice(0, 10));
});

test('resolves canonical Solidity aliases through Viem', () => {
    const encoded = codec.encode('canonical(uint)', [4n]);
    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('encodes tuple arguments', () => {
    const encoded = codec.encode(
        'createDispute((bytes32,bytes,uint256,string))',
        [['0x' + '11'.repeat(32), '0x1234', 9n, 'evidence']],
    );

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('accepts SDK-style checksummed addresses', () => {
    const checksummed = getAddress('0x000000000000000000000000000000000000abcd');
    const encoded = codec.encode('overloaded(address)', [checksummed]);

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('accepts tuple arguments by component name', () => {
    const encoded = codec.encode(
        'createDispute((bytes32,bytes,uint256,string))',
        [{
            id: '0x' + '11'.repeat(32),
            evidence: '0x1234',
            fee: 9n,
            uri: 'evidence',
        }],
    );

    assert.match(encoded, /^0x[0-9a-f]+$/);
});

test('decodes one-output functions', () => {
    const data = encodeAbiParameters(
        [{ type: 'address' }],
        [OWNER],
    );

    assert.deepEqual(codec.decode('owner()', data), [OWNER]);
});

test('decodes multi-output functions', () => {
    const data = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'address' }, { type: 'bool' }],
        [7n, OWNER, true],
    );

    assert.deepEqual(codec.decode('multi()', data), [7n, OWNER, true]);
});

test('returns SDK bigint values for integer outputs', () => {
    const data = encodeAbiParameters(
        [{ type: 'uint256' }],
        [7n],
    );

    const [value] = codec.decode('overloaded(uint256)', data);
    assert.equal(typeof value, 'bigint');
});

test('normalizes small signed and unsigned integer outputs to bigint', () => {
    const unsigned = encodeAbiParameters([{ type: 'uint8' }], [7]);
    const signed = encodeAbiParameters([{ type: 'int16' }], [-12]);

    assert.deepEqual(edgeCodec.decode('smallUnsigned()', unsigned), [7n]);
    assert.deepEqual(edgeCodec.decode('smallSigned()', signed), [-12n]);
});

test('normalizes only integer values in multi-output functions', () => {
    const data = encodeAbiParameters(
        [{ type: 'uint8' }, { type: 'address' }, { type: 'bool' }],
        [7, OWNER, true],
    );

    assert.deepEqual(
        edgeCodec.decode('mixedSmall()', data),
        [7n, OWNER, true],
    );
});

test('normalizes zero function outputs to an empty array', () => {
    assert.deepEqual(edgeCodec.decode('noOutput()', '0x'), []);
});

test('wraps a single tuple output without changing its native values', () => {
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

    assert.deepEqual(edgeCodec.decode('tupleOutput()', data), [
        { owner: OWNER, amount: 7n },
    ]);
});

test('normalizes integers recursively inside tuple arrays', () => {
    const data = encodeAbiParameters(
        [{
            type: 'tuple[]',
            components: [
                { name: 'status', type: 'uint8' },
                { name: 'codes', type: 'uint16[]' },
            ],
        }],
        [[{ status: 2, codes: [3, 5] }]],
    );

    assert.deepEqual(edgeCodec.decode('tupleArrayOutput()', data), [[{
        status: 2n,
        codes: [3n, 5n],
    }]]);
});

test('decodes named indexed events', () => {
    const topics = encodeEventTopics({
        abi: TEST_ABI,
        eventName: 'Evidence',
        args: {
            _arbitrator: ARBITRATOR,
            _evidenceGroupId: GROUP_ID,
            _party: SUBMITTER,
        },
    });
    const data = encodeAbiParameters(
        [{ type: 'string' }],
        ['uri'],
    );

    const decoded = codec.decodeEvent(
        'Evidence(address,uint256,address,string)',
        topics as unknown as Hex[],
        data,
    );

    assert.deepEqual(decoded, {
        _arbitrator: ARBITRATOR,
        _evidenceGroupId: GROUP_ID,
        _party: SUBMITTER,
        _evidence: 'uri',
    });
    assert.equal((decoded as Record<string, unknown>).evidenceUri, undefined);
});

test('decodes zero-argument events', () => {
    const topics = encodeEventTopics({
        abi: TEST_ABI,
        eventName: 'Empty',
    });

    assert.deepEqual(
        codec.decodeEvent('Empty()', topics as unknown as Hex[], '0x'),
        {},
    );
});

test('maps unnamed event arguments to positional record keys', () => {
    const topics = encodeEventTopics({ abi: EDGE_ABI, eventName: 'Mixed' });
    const data = encodeAbiParameters(
        [{ type: 'uint256' }, { type: 'address' }, { type: 'bool' }],
        [7n, OWNER, true],
    );

    assert.deepEqual(
        edgeCodec.decodeEvent(
            'Mixed(uint256,address,bool)',
            topics as unknown as Hex[],
            data,
        ),
        { 0: 7n, named: OWNER, 2: true },
    );
});

test('normalizes small integer event arguments to bigint', () => {
    const topics = encodeEventTopics({
        abi: EDGE_ABI,
        eventName: 'SmallInteger',
    });
    const data = encodeAbiParameters(
        [{ type: 'uint8' }, { type: 'uint16' }],
        [1, 500],
    );

    assert.deepEqual(
        edgeCodec.decodeEvent(
            'SmallInteger(uint8,uint16)',
            topics as unknown as Hex[],
            data,
        ),
        { status: 1n, amount: 500n },
    );
});

test('normalizes small integer custom-error arguments to bigint', () => {
    const data = encodeErrorResult({
        abi: EDGE_ABI,
        errorName: 'InvalidState',
        args: [1, 2],
    });

    assert.deepEqual(edgeCodec.decodeError(data), {
        name: 'InvalidState',
        args: [1n, 2n],
    });
});

test('rejects malformed data', () => {
    assert.throws(() => codec.decode('owner()', '0x'));
    assert.throws(() => codec.decodeEvent('Evidence(address,uint256,address,string)', [], '0x'));
});
