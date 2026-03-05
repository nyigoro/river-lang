.PHONY: status ts-check rust-check

status:
	@echo "RIVER-LANG scaffold status"
	@echo "- TypeScript frontend: compiler/ts-frontend"
	@echo "- Rust backend: backend/rust"
	@echo "- C runtime bridge: runtime/c"
	@echo "- C++ HDL layer: hdl/cpp"

ts-check:
	cd compiler/ts-frontend && npm run check

rust-check:
	cd backend/rust && cargo check --workspace