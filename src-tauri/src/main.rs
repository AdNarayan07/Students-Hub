#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use study_app_lib::functions::{on_window_event, show_window};
use study_app_lib::{buddy_chat, reader, timer};

pub fn main() {
    let state = timer::commands::init_state();
    let state_clone = Arc::clone(&state);
    if let Some(timers) = timer::commands::load_timers() {
        let mut state = state.lock().unwrap();
        state.timers = timers;
    }

    let mut app = tauri::Builder::default().plugin(tauri_plugin_clipboard_manager::init());

    #[cfg(not(debug_assertions))]
    {
        use tauri_plugin_prevent_default;
        app = app.plugin(tauri_plugin_prevent_default::init());
    }

    app.plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(
            move |app, _args, _cwd| {
                let _ = show_window(app);
            },
        ))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            timer::commands::get_timers,
            timer::commands::create_timer,
            timer::commands::del_timer,
            timer::commands::start_timer,
            timer::commands::timer_play_pause,
            timer::commands::reset_timer,
            timer::commands::get_remaining_ms,
            reader::open_file_dialog,
            reader::load_installed_fonts,
            reader::e_pub_data_get,
            reader::e_pub_highlight_save,
            buddy_chat::ask_buddy,
            buddy_chat::get_chat_data,
            buddy_chat::get_chats_list,
            buddy_chat::delete_chat
        ])
        .on_window_event({
            move |window, event| {
                on_window_event(window, event, &state_clone);
            }
        })
        .manage(state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
