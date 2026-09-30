use std::time::Duration;

pub const DOUBLE_TAP_WINDOW: Duration = Duration::from_millis(300);
pub const CANCEL_WINDOW: Duration = Duration::from_millis(1000);
pub const MODIFIER_ONLY_MIN: Duration = Duration::from_millis(300);
pub const DEFAULT_MIN_KEY_TIME: Duration = Duration::from_millis(150);
// Personal fork: gap allowed between releasing the first tap and pressing the
// second one in modifier-only double-press mode ("press Fn twice").
pub const DOUBLE_PRESS_WINDOW: Duration = Duration::from_millis(500);
