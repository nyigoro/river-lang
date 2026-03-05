// RIVER-LANG ? river-sim/src/dll_model.rs

use crate::ppm::{
    simulate_dll_lock, DllLockResult, PpmConfig, SkewZone, PHI_SKEW_BER_CLIFF_PS,
    PHI_SKEW_LIMIT_PS,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DllZone {
    Green,
    Yellow,
    Red,
}

#[derive(Debug, Clone, Copy)]
pub struct DelayLineLock {
    pub locked: bool,
    pub skew_ps: u64,
    pub cycles_used: u32,
    pub margin_ps: u32,
    pub zone: DllZone,
}

impl DelayLineLock {
    pub fn stable() -> Self {
        calibrate(0)
    }

    pub fn is_stable(&self) -> bool {
        self.locked
    }
}

pub fn calibrate(skew_ps: u64) -> DelayLineLock {
    let lock: DllLockResult = simulate_dll_lock(&PpmConfig { skew_ps });

    DelayLineLock {
        locked: lock.locked,
        skew_ps,
        cycles_used: lock.cycles_used,
        margin_ps: lock.margin_ps,
        zone: match lock.zone {
            SkewZone::Green => DllZone::Green,
            SkewZone::Yellow => DllZone::Yellow,
            SkewZone::Red => DllZone::Red,
        },
    }
}

pub fn thermal_drift_ps(initial_skew_ps: u64, duration_ns: u64, drift_rate_ps_per_ns: u64) -> u64 {
    initial_skew_ps + (duration_ns * drift_rate_ps_per_ns)
}

pub fn requires_reroute(skew_ps: u64) -> bool {
    skew_ps >= PHI_SKEW_BER_CLIFF_PS
}

pub fn requires_purge(skew_ps: u64) -> bool {
    skew_ps >= PHI_SKEW_LIMIT_PS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_is_green_and_locked() {
        let lock = DelayLineLock::stable();
        assert!(lock.locked);
        assert_eq!(lock.zone, DllZone::Green);
    }

    #[test]
    fn threshold_helpers_work() {
        assert!(!requires_reroute(114));
        assert!(requires_reroute(115));
        assert!(!requires_purge(124));
        assert!(requires_purge(125));
    }

    #[test]
    fn thermal_drift_accumulates_linearly() {
        assert_eq!(thermal_drift_ps(50, 4, 15), 110);
    }
}