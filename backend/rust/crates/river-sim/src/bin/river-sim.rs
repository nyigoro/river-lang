use anyhow::Result;
use river_sim::{simulate_fibonacci_10, validation::verify_fibonacci_10};

fn main() -> Result<()> {
    let value = simulate_fibonacci_10();
    verify_fibonacci_10(value)?;
    println!("simulation ok: Fibonacci(10) = {}", value);
    Ok(())
}