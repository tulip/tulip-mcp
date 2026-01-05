# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](httpss://semver.org/spec/v2.0.0.html).

## [Unreleased]

---
## [1.1.4] - 2026-01-05
### Security
- Updated `@modelcontextprotocol/sdk` from 1.12.1 to 1.25.1 (fixes DNS rebinding protection vulnerability)
- Updated `qs` from 6.14.0 to 6.14.1 (fixes CVE-2025-15284 - DoS via memory exhaustion)
- Updated `body-parser` from 2.2.0 to 2.2.1 (fixes DoS vulnerability with URL encoding)

## [1.1.3] - 2025-07-07
### Added
- Multi-workspace support in `README.md`
- Support for trailing `/` in instance url

## [1.1.2] - 2025-06-20
### Added
- Ability to specify path to env file as argument in mcp config json
- Changelog

### Changed
- Error handling for server initiation errors

## [1.1.1] - 2025-06-20
### Added
- Ability to load env variables from current working directory

### Removed
- Instructions for manual installation

## [1.1.0] - 2025-06-20
### Added
- `npx` support for easy execution without cloning the repository.
- README.md: Instructions for setup using `npx`

## [1.0.1] - 2025-06-18
### Added
- README.md: Cursor one-click installation
- README.md: Claude Desktop setup steps

### Changed
- Fixed runTableAggregation tool

## [1.0.0] - 2025-06-11
- Initial public release of `@tulip/mcp-server`.
- Support for all major Tulip API functionalities through MCP tools.