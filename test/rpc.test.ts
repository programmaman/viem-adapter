import assert from 'node:assert/strict';
import test from 'node:test';
import { createViemRpcClient, type ViemRpcClient } from '../src/index.js';

function createClient(calls: unknown[]): ViemRpcClient {
    return {
        call: async (request: never) => {
            calls.push(['call', request]);
            return { data: '0xresult' };
        },
        getLogs: async (filter: never) => {
            calls.push(['logs', filter]);
            return [{ address: '0x1', topics: ['0x2'], data: '0x3', transactionHash: '0x4', blockNumber: 7n }];
        },
        getChainId: async () => {
            calls.push(['network']);
            return 1;
        },
        getBlock: async (reference: never) => {
            calls.push(['block', reference]);
            return { number: 8n, timestamp: 9n };
        },
    } as unknown as ViemRpcClient;
}

test('uses native client methods for calls, logs, network, and blocks', async () => {
    const calls: unknown[] = [];
    const rpc = createViemRpcClient(createClient(calls));

    assert.equal(await rpc.call({ to: '0x1', data: '0x2', block: 'latest' }), '0xresult');
    assert.deepEqual(await rpc.getLogs({ address: '0x1' }), [{
        address: '0x1', topics: ['0x2'], data: '0x3', transactionHash: '0x4', blockNumber: 7,
    }]);
    assert.equal(await rpc.getChainId(), 1);
    assert.deepEqual(await rpc.getBlock('latest'), { number: 8, timestamp: 9 });
    assert.deepEqual(calls, [
        ['call', { to: '0x1', data: '0x2', blockTag: 'latest' }],
        ['logs', { address: '0x1' }],
        ['network'],
        ['block', { blockTag: 'latest' }],
    ]);
});

test('preserves native client rejection', async () => {
    const error = new Error('client failed');
    const client = createClient([]);
    client.call = async () => Promise.reject(error) as never;

    await assert.rejects(
        createViemRpcClient(client).call({ to: '0x1', data: '0x2' }),
        (received: unknown) => received === error,
    );
});
