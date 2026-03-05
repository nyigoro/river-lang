$ErrorActionPreference = "Stop"

Write-Host "Bootstrapping RIVER-LANG scaffold..."

Push-Location "compiler/ts-frontend"
if (Get-Command npm -ErrorAction SilentlyContinue) {
  npm install
} else {
  Write-Warning "npm not found; skipping TypeScript dependency install."
}
Pop-Location

Push-Location "backend/rust"
if (Get-Command cargo -ErrorAction SilentlyContinue) {
  cargo check --workspace
} else {
  Write-Warning "cargo not found; skipping Rust workspace check."
}
Pop-Location

Write-Host "Bootstrap finished."