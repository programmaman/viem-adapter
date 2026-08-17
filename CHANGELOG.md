# Changelog

## Unreleased

## 0.1.0

### Added

- Initial Viem RPC, ABI, and revert-data adapter.

### Changed

- Replaced the generic RPC request adapter with explicit native Viem public-client operations.
- Map SDK calls to Viem `call`, `getLogs`, `getChainId`, and `getBlock` methods.
- Added ABI-aware extraction and decoding for supported Viem revert-data shapes while preserving native errors.
- Kept event and integer normalization consistent with the SDK codecs.
