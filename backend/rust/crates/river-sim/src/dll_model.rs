#[derive(Debug, Clone, Copy)]
pub struct DelayLineLock {
    pub locked: bool,
}

impl DelayLineLock {
    pub fn stable() -> Self {
        Self { locked: true }
    }
}