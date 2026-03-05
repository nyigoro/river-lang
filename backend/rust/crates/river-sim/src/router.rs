#[derive(Debug, Clone)]
pub struct RoutedToken {
    pub node: String,
    pub value: u64,
}

pub fn route_token(node: &str, value: u64) -> RoutedToken {
    RoutedToken {
        node: node.to_string(),
        value,
    }
}