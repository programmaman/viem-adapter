import { parseAbi } from 'viem';

export const TEST_ABI = parseAbi([
    'function owner() view returns (address)',
    'function overloaded(uint256) view returns (uint256)',
    'function overloaded(address) view returns (address)',
    'function canonical(uint256) view returns (uint256)',
    'function createDispute((bytes32 id,bytes evidence,uint256 fee,string uri))',
    'function multi() view returns (uint256,address,bool)',
    'event Evidence(address indexed _arbitrator,uint256 indexed _evidenceGroupId,address indexed _party,string _evidence)',
    'event Empty()',
    'error NotOwner()',
    'error NotEnoughFee(uint256 sent,uint256 required)',
    'error Error(string)',
    'error Panic(uint256)',
]);

export const OWNER = '0x0000000000000000000000000000000000000001';
export const ARBITRATOR = '0x0000000000000000000000000000000000000002';
export const SUBMITTER = '0x0000000000000000000000000000000000000003';
export const GROUP_ID = 7n;
