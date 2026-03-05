// RIVER-LANG ? river-sim/src/lib.rs

pub mod dll_model;
pub mod ppm;
pub mod router;
pub mod spatial_mapper_sim;
pub mod validation;

use dll_model::calibrate;
use ppm::{decode_sector_map, encode_sector_map, SectorMap};
use validation::{simulate_fibonacci, simulate_fibonacci_10_through_router};

pub fn sim_fibonacci(n: u64) -> u64 {
    simulate_fibonacci(n)
}

pub fn simulate_fibonacci_10() -> u64 {
    simulate_fibonacci(10)
}

pub fn sim_fibonacci_10_validated() -> bool {
    simulate_fibonacci_10_through_router().ok
}

pub fn sim_dll_calibrate(skew_ps: u64) -> (bool, &'static str, u32) {
    let lock = calibrate(skew_ps);
    let zone = match lock.zone {
        dll_model::DllZone::Green => "Green",
        dll_model::DllZone::Yellow => "Yellow",
        dll_model::DllZone::Red => "Red",
    };

    (lock.locked, zone, lock.cycles_used)
}

pub fn sim_ppm_roundtrip(sector_map: u64) -> bool {
    let original = SectorMap(sector_map);
    let pulses = encode_sector_map(original);
    let decoded = decode_sector_map(pulses);
    original == decoded
}