use anyhow::{anyhow, Result};

pub fn verify_fibonacci_10(value: u64) -> Result<()> {
    if value == 55 {
        Ok(())
    } else {
        Err(anyhow!("expected 55, got {}", value))
    }
}