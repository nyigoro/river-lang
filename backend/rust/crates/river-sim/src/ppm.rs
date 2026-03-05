#[derive(Debug, Clone, Copy)]
pub struct PpmConfig {
    pub pulses_per_microsecond: u32,
}

impl Default for PpmConfig {
    fn default() -> Self {
        Self {
            pulses_per_microsecond: 1,
        }
    }
}