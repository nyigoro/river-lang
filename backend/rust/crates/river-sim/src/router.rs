// RIVER-LANG ? river-sim/src/router.rs
//
// Three-stage kinetic valve model:
//   1) DIR_BIT stage (downstream vs upstream)
//   2) PATH_HASH comparator
//   3) TAG_GEN collision latch

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub dir_bit: u8,     // 0 = downstream, 1 = upstream
    pub path_hash: u32,
    pub tag_gen: u16,
    pub payload: u64,
    pub crc: u16,
}

impl Token {
    pub fn new_downstream(path_hash: u32, tag_gen: u16, payload: u64) -> Self {
        Self {
            dir_bit: 0,
            path_hash,
            tag_gen,
            payload,
            crc: Self::compute_crc(payload),
        }
    }

    pub fn new_upstream(path_hash: u32, tag_gen: u16, thirst_code: u8) -> Self {
        Self {
            dir_bit: 1,
            path_hash,
            tag_gen,
            payload: thirst_code as u64,
            crc: 0,
        }
    }

    pub fn is_upstream(&self) -> bool {
        self.dir_bit == 1
    }

    pub fn compute_crc(payload: u64) -> u16 {
        let mut x = payload;
        x ^= x >> 32;
        x ^= x >> 16;
        x ^= x >> 8;
        (x & 0x7FFF) as u16
    }

    pub fn crc_valid(&self) -> bool {
        if self.is_upstream() {
            true
        } else {
            self.crc == Self::compute_crc(self.payload)
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ThirstCode {
    DryInput = 0x01,
    HashMism = 0x02,
    HashColl = 0x03,
    PurgeReq = 0x04,
    CrcFail = 0x05,
    PurgeAll = 0xFF,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RouteDecision {
    AcceptToAlu(Token),
    PropagateCry(Token),
    Evaporate { reason: &'static str },
    EvaporateAndCry { cry: Token, reason: ThirstCode },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LatchState {
    Empty,
    Occupied(u16),
    Purged,
}

#[derive(Debug, Clone)]
pub struct TagLockLatch {
    pub state: LatchState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LatchDecision {
    Accept,
    Collision,
}

impl TagLockLatch {
    pub fn new() -> Self {
        Self {
            state: LatchState::Empty,
        }
    }

    pub fn accept(&mut self, tag: u16) -> LatchDecision {
        match self.state {
            LatchState::Empty | LatchState::Purged => {
                self.state = LatchState::Occupied(tag);
                LatchDecision::Accept
            }
            LatchState::Occupied(current) if current == tag => LatchDecision::Accept,
            LatchState::Occupied(_) => LatchDecision::Collision,
        }
    }

    pub fn purge(&mut self) {
        self.state = LatchState::Purged;
    }
}

#[derive(Debug)]
pub struct NodeWire {
    pub node_id: u32,
    pub expected_hash: u32,
    pub latch: TagLockLatch,
}

impl NodeWire {
    pub fn new(node_id: u32, expected_hash: u32) -> Self {
        Self {
            node_id,
            expected_hash,
            latch: TagLockLatch::new(),
        }
    }

    pub fn route(&mut self, token: Token) -> RouteDecision {
        // Stage 1: DIR_BIT split + CRC check
        if !token.crc_valid() {
            let cry = Token::new_upstream(self.expected_hash, token.tag_gen, ThirstCode::CrcFail as u8);
            return RouteDecision::EvaporateAndCry {
                cry,
                reason: ThirstCode::CrcFail,
            };
        }

        if token.is_upstream() {
            return RouteDecision::PropagateCry(token);
        }

        // Stage 2: hash comparator
        if token.path_hash != self.expected_hash {
            let cry = Token::new_upstream(self.expected_hash, token.tag_gen, ThirstCode::HashMism as u8);
            return RouteDecision::EvaporateAndCry {
                cry,
                reason: ThirstCode::HashMism,
            };
        }

        // Stage 3: TAG lock latch
        if token.tag_gen == 0xFFFF {
            self.latch.purge();
            let cry = Token::new_upstream(self.expected_hash, 0, ThirstCode::PurgeAll as u8);
            return RouteDecision::EvaporateAndCry {
                cry,
                reason: ThirstCode::PurgeAll,
            };
        }

        match self.latch.accept(token.tag_gen) {
            LatchDecision::Accept => RouteDecision::AcceptToAlu(token),
            LatchDecision::Collision => {
                let cry =
                    Token::new_upstream(self.expected_hash, token.tag_gen, ThirstCode::HashColl as u8);
                RouteDecision::EvaporateAndCry {
                    cry,
                    reason: ThirstCode::HashColl,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn wire() -> NodeWire {
        NodeWire::new(0x00A0, 0xDEAD_1234)
    }

    #[test]
    fn upstream_is_propagated() {
        let mut w = wire();
        let token = Token::new_upstream(0xDEAD_1234, 1, ThirstCode::DryInput as u8);
        assert!(matches!(w.route(token), RouteDecision::PropagateCry(_)));
    }

    #[test]
    fn crc_fail_generates_cry() {
        let mut w = wire();
        let mut token = Token::new_downstream(0xDEAD_1234, 1, 99);
        token.crc ^= 0x1;
        assert!(matches!(
            w.route(token),
            RouteDecision::EvaporateAndCry {
                reason: ThirstCode::CrcFail,
                ..
            }
        ));
    }

    #[test]
    fn hash_mismatch_generates_cry() {
        let mut w = wire();
        let token = Token::new_downstream(0xABCD_0001, 1, 99);
        assert!(matches!(
            w.route(token),
            RouteDecision::EvaporateAndCry {
                reason: ThirstCode::HashMism,
                ..
            }
        ));
    }

    #[test]
    fn tag_collision_generates_cry() {
        let mut w = wire();
        let first = Token::new_downstream(0xDEAD_1234, 1, 10);
        let second = Token::new_downstream(0xDEAD_1234, 2, 11);

        assert!(matches!(w.route(first), RouteDecision::AcceptToAlu(_)));
        assert!(matches!(
            w.route(second),
            RouteDecision::EvaporateAndCry {
                reason: ThirstCode::HashColl,
                ..
            }
        ));
    }
}