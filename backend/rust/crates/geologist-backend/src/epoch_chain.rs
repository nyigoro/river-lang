// RIVER-LANG — geologist-backend/src/epoch_chain.rs
//
// Epoch chain helpers for salt rotation and manifest validation.

const EPOCH_CONTEXT: &str = "river-lang epoch rotation";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct EpochState {
    pub salt: u32,
    pub epoch: u32,
}

impl EpochState {
    pub fn new(epoch: u32, salt: u32) -> Self {
        Self { salt, epoch }
    }

    pub fn advance(&mut self) {
        let next_epoch = self.epoch.wrapping_add(1);
        self.salt = rotate_salt(self.salt, next_epoch);
        self.epoch = next_epoch;
    }
}

pub fn rotate_salt(current_salt: u32, next_epoch: u32) -> u32 {
    let mut key_material = [0_u8; 8];
    key_material[0..4].copy_from_slice(&current_salt.to_le_bytes());
    key_material[4..8].copy_from_slice(&next_epoch.to_le_bytes());

    let derived = blake3::derive_key(EPOCH_CONTEXT, &key_material);
    let salt = u32::from_le_bytes([derived[0], derived[1], derived[2], derived[3]]);
    if salt == 0 { 1 } else { salt }
}

pub fn epoch_chain_valid(manifest_epoch: u32, hardware_epoch: u32, salt: u32) -> bool {
    if manifest_epoch != hardware_epoch {
        return false;
    }
    let seed = if salt == 0 { 1 } else { salt };
    rotate_salt(seed, hardware_epoch) != 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rotate_is_deterministic() {
        let a = rotate_salt(0x1234_5678, 0x5249_5645);
        let b = rotate_salt(0x1234_5678, 0x5249_5645);
        assert_eq!(a, b);
    }

    #[test]
    fn rotate_changes_on_epoch_increment() {
        let a = rotate_salt(0x1234_5678, 0x5249_5645);
        let b = rotate_salt(0x1234_5678, 0x5249_5646);
        assert_ne!(a, b);
    }

    #[test]
    fn chain_valid_rejects_stale() {
        let salt = 0xA5A5_5A5A;
        assert!(epoch_chain_valid(0x1, 0x1, salt));
        assert!(!epoch_chain_valid(0x1, 0x2, salt));
    }
}
