# RIVER-LANG

RIVER-LANG is a spatial programming stack for modeling computation as verified token flow.

The public repository focuses on language ergonomics, compiler frontend work, simulation, and tooling.

## Public Scope
- TypeScript frontend: lexer, parser, type checks, AST tooling
- Rust simulator: model validation and execution experiments
- C runtime bridge interface for host integration
- Examples, schemas, docs, and language tooling

## Private Scope
Some implementation details are intentionally withheld from the public tree until formal disclosure, including:
- full silicon/master hardware specification
- production DRC and physical-layout strategies
- enclave wipe internals and protected mapping logic

## Repository Layout
- `compiler/ts-frontend` - Geologist frontend in TypeScript
- `backend/rust/crates/river-sim` - simulator in Rust
- `runtime/c` - C runtime bridge surface
- `examples` - canonical `.rasm` programs
- `tooling` - language-server and syntax assets
- `docs` - roadmap and contribution/process docs

## Quick Start
```bash
git clone https://github.com/YOUR-ORG/river-lang.git
cd river-lang

cd compiler/ts-frontend
npm install
npm run check

cd ../../backend/rust
cargo check --workspace
```

## Contributing
Contribution guide: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
Contributors must complete the one-time CAA flow described in that guide.

## Security and Disclosure
If you discover a security-sensitive issue, open a private security report with maintainers instead of posting exploit details publicly.

## License
Apache License 2.0. See [LICENSE](LICENSE).
