// RIVER-LANG ? river-sim/src/ppm.rs
//
// 16-pulse PPM frame model for 64-bit sector map transport.

pub const T_SLOT_PS: u64 = 250;
pub const SLOTS_PER_PULSE: usize = 16;
pub const PULSES_PER_FRAME: usize = 16;
pub const T_FRAME_PS: u64 = T_SLOT_PS * SLOTS_PER_PULSE as u64 * PULSES_PER_FRAME as u64;

pub const PHI_SKEW_BER_CLIFF_PS: u64 = 115;
pub const PHI_SKEW_LIMIT_PS: u64 = 125;
pub const DLL_WARMUP_PULSES: usize = 8;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SectorMap(pub u64);

impl SectorMap {
    pub fn all_clean() -> Self {
        Self(u64::MAX)
    }

    pub fn all_dirty() -> Self {
        Self(0)
    }
}

#[derive(Debug, Clone, Copy)]
pub struct PpmConfig {
    pub skew_ps: u64,
}

impl Default for PpmConfig {
    fn default() -> Self {
        Self { skew_ps: 0 }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkewZone {
    Green,
    Yellow,
    Red,
}

#[derive(Debug, Clone, Copy)]
pub struct DllLockResult {
    pub locked: bool,
    pub cycles_used: u32,
    pub margin_ps: u32,
    pub zone: SkewZone,
}

pub fn encode_sector_map(map: SectorMap) -> [u8; PULSES_PER_FRAME] {
    let mut frame = [0_u8; PULSES_PER_FRAME];
    for (index, slot) in frame.iter_mut().enumerate() {
        *slot = ((map.0 >> (index * 4)) & 0xF) as u8;
    }
    frame
}

pub fn decode_sector_map(frame: [u8; PULSES_PER_FRAME]) -> SectorMap {
    let mut value = 0_u64;
    for (index, pulse) in frame.iter().enumerate() {
        value |= ((*pulse & 0xF) as u64) << (index * 4);
    }
    SectorMap(value)
}

pub fn simulate_dll_lock(config: &PpmConfig) -> DllLockResult {
    if config.skew_ps >= PHI_SKEW_LIMIT_PS {
        return DllLockResult {
            locked: false,
            cycles_used: DLL_WARMUP_PULSES as u32,
            margin_ps: 0,
            zone: SkewZone::Red,
        };
    }

    let cycles = ((config.skew_ps / 25) + 2).min(6) as u32;
    let locked = cycles <= DLL_WARMUP_PULSES as u32;

    let zone = if config.skew_ps < PHI_SKEW_BER_CLIFF_PS {
        SkewZone::Green
    } else {
        SkewZone::Yellow
    };

    let remaining = DLL_WARMUP_PULSES as u32 - cycles;
    let margin_ps = remaining * (SLOTS_PER_PULSE as u32) * (T_SLOT_PS as u32);

    DllLockResult {
        locked,
        cycles_used: cycles,
        margin_ps,
        zone,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn frame_round_trip_is_lossless() {
        let source = SectorMap(0xDEAD_BEEF_CAFE_BABE);
        let encoded = encode_sector_map(source);
        let decoded = decode_sector_map(encoded);
        assert_eq!(source, decoded);
    }

    #[test]
    fn pulse_values_fit_in_4_bits() {
        let frame = encode_sector_map(SectorMap(0xABCD_EF01_2345_6789));
        assert!(frame.iter().all(|pulse| *pulse <= 0xF));
    }

    #[test]
    fn dll_lock_zones() {
        let green = simulate_dll_lock(&PpmConfig { skew_ps: 50 });
        let yellow = simulate_dll_lock(&PpmConfig { skew_ps: 120 });
        let red = simulate_dll_lock(&PpmConfig { skew_ps: 130 });

        assert!(green.locked && green.zone == SkewZone::Green);
        assert!(yellow.locked && yellow.zone == SkewZone::Yellow);
        assert!(!red.locked && red.zone == SkewZone::Red);
    }
}