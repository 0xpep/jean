// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Check for headless mode environment variable and inject it into args
    if std::env::var("JEAN_HEADLESS").is_ok() {
        std::env::set_var("RUSTFLAGS", "--env=J EAN_HEADLESS=1");
    }
    jean_lib::run()
}
