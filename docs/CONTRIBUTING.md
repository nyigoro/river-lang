# Contributing to RIVER-LANG

Thanks for helping build the public RIVER-LANG stack.

## Scope
Public contributions are welcome for:
- `compiler/ts-frontend`
- `backend/rust/crates/river-sim`
- `runtime/c` public bridge surface
- `examples`, `schemas`, `tooling`, and `docs`

Changes to protected silicon/physical-security implementation areas are maintainer-managed until formal disclosure.

## IP and Licensing Terms
By submitting a pull request, you confirm your submission is original or you have rights to contribute it.

All accepted contributions are licensed under Apache-2.0.

For merge eligibility, contributors must agree to the project Contributor Assignment Agreement (CAA), which assigns copyright and related contribution IP to the project steward.

If you cannot agree to assignment terms, do not submit code.

## CAA Signing Flow (Required Once Per Contributor)
1. Read [docs/CAA.md](CAA.md).
2. Add your signer row to [docs/CAA_SIGNERS.md](CAA_SIGNERS.md) with:
   - GitHub username
   - legal name
   - `CAA Version` set to `v1.0`
   - UTC date in `YYYY-MM-DD`
   - evidence link (PR or issue)
3. In your pull request body, check the required CAA attestation line from the PR template.
4. The `CAA Enforcement` GitHub Action must pass before review/merge.

## Contribution Workflow
1. Open an issue describing the change.
2. Create a focused branch.
3. Keep PRs small and testable.
4. Run checks before opening or updating PR:
   - `cd compiler/ts-frontend && npm run check`
   - `cd backend/rust && cargo check --workspace`
5. Include tests for behavior changes.

## Security
Do not post sensitive exploit details or private hardware assumptions in public issues. Report security-sensitive findings privately to maintainers first.
