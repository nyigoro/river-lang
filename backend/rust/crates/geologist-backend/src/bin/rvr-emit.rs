use std::fs;

use anyhow::Result;
use geologist_backend::{compile_manifest, emitter::emit_bytes};

fn main() -> Result<()> {
    let input = std::env::args().nth(1).unwrap_or_else(|| "../../../../examples/fibonacci.rasm".to_string());
    let source = fs::read_to_string(&input)?;
    let manifest = compile_manifest(&source)?;
    let bytes = emit_bytes(&manifest);
    println!("emitted {} byte(s) from {}", bytes.len(), input);
    Ok(())
}