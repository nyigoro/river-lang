use std::fs;
use std::path::PathBuf;

use anyhow::{anyhow, bail, Result};
use geologist_backend::{compile_manifest, emitter::emit_bytes};

fn main() -> Result<()> {
    let mut args = std::env::args().skip(1);
    let input: PathBuf = args
        .next()
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("channel-graph.json"));

    let mut output: Option<PathBuf> = None;
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--out" | "-o" => {
                let next = args.next().ok_or_else(|| anyhow!("--out requires a path"))?;
                output = Some(PathBuf::from(next));
            }
            _ => {
                output = Some(PathBuf::from(arg));
            }
        }
    }

    let output = output.unwrap_or_else(|| input.with_extension("rvr"));
    let source = fs::read_to_string(&input)?;
    let manifest = compile_manifest(&source)?;
    let bytes = emit_bytes(&manifest);
    if bytes.is_empty() {
        bail!("emit_bytes produced empty output");
    }
    fs::write(&output, &bytes)?;
    println!(
        "emitted {} byte(s) from {} -> {}",
        bytes.len(),
        input.display(),
        output.display()
    );
    Ok(())
}
