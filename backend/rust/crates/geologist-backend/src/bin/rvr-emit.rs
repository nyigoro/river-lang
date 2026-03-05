use std::fs;
use std::path::PathBuf;

use anyhow::Result;
use geologist_backend::{compile_manifest, emitter::emit_bytes};

fn main() -> Result<()> {
    let input: PathBuf = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("channel-graph.json"));
    let source = fs::read_to_string(&input)?;
    let manifest = compile_manifest(&source)?;
    let bytes = emit_bytes(&manifest);
    println!("emitted {} byte(s) from {}", bytes.len(), input.display());
    Ok(())
}
