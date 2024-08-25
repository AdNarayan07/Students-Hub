use crate::functions::{read_data, save_data};
use crate::timer::{Timer, TimerState, TimerType};
use serde_json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::WebviewWindow;

#[tauri::command]
pub fn get_timers(state: tauri::State<Arc<Mutex<TimerState>>>, _type: Option<TimerType>) -> String {
    let state = state.lock().unwrap();
    let filtered_timers: Vec<(u8, Timer)> = match _type {
        Some(timer_type) => state
            .timers
            .iter()
            .filter_map(|(&id, timer)| {
                if timer._type == timer_type {
                    Some((id, timer.to_owned()))
                } else {
                    None
                }
            })
            .collect(),
        None => state
            .timers
            .iter()
            .map(|(&id, timer)| (id, timer.to_owned()))
            .collect(),
    };

    // Sort by duration (in seconds)
    let mut sorted_timers = filtered_timers;
    sorted_timers.sort_by_key(|(_, timer)| timer.duration.as_secs());
    serde_json::to_string(&sorted_timers).expect("Failed to serialize state")
}

#[tauri::command]
pub fn create_timer(
    state: tauri::State<Arc<Mutex<TimerState>>>,
    _type: TimerType,
    seconds: u64,
    name: String,
) -> String {
    let mut state = state.lock().unwrap();
    let id = state.find_available_id(&_type);
    match id {
        Some(id) => {
            let timer = Timer::new(seconds, _type, id, name);

            state.add_timer(timer);

            let json_string =
                serde_json::to_string(&state.timers).expect("Failed to serialize state");
            save_data("data/timers.json", &json_string).expect("couldn't save timers.json");
            return json_string;
        }
        None => "Can't create a new timer of this type".to_string(),
    }
}

#[tauri::command]
pub fn del_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<String> {
    let mut state = state.lock().unwrap();

    if let Some(timer_ref) = state.get_timer(id) {
        if timer_ref.active {
            return None;
        }
    }

    state.remove_timer(id);

    let json_string = serde_json::to_string(&state.timers).expect("Failed to serialize state");
    save_data("data/timers.json", &json_string).expect("couldn't save timers.json");
    return Some(json_string);
}

#[tauri::command]
pub fn start_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<bool> {
    let mut _state = state.lock().unwrap();
    if let Some(timer) = _state.get_timer(id) {
        timer.start();
        return Some(true);
    }
    None
}

#[tauri::command]
pub fn timer_play_pause(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> bool {
    let mut state = state.lock().unwrap();
    if let Some(timer) = state.get_timer(id) {
        timer.toggle_pause();
        return timer.paused;
    }
    false
}

#[tauri::command]
pub fn reset_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<bool> {
    let mut state = state.lock().unwrap();
    if let Some(timer) = state.get_timer(id) {
        timer.reset();
        return Some(false);
    }
    None
}

#[tauri::command]
pub fn get_remaining_ms(
    state: tauri::State<Arc<Mutex<TimerState>>>,
    window: WebviewWindow,
    id: u8,
) -> u128 {
    let mut state = state.lock().unwrap();
    if let Some(timer) = state.get_timer(id) {
        let remaining_ms = timer.remaining_ms();

        if remaining_ms == 0 {
            let has_active_timers = state.timers.values().any(|t| t.active);
            if !has_active_timers {
                if let Ok(false) = window.is_visible() {
                    window.close().expect("Couldn't close window");
                }
            }
        }
        return remaining_ms;
    }
    0
}

pub fn init_state() -> Arc<Mutex<TimerState>> {
    Arc::new(Mutex::new(TimerState::new()))
}

pub fn load_timers() -> Option<HashMap<u8, Timer>> {
    match read_data("data/timers.json") {
        Ok(timers_json) => {
            let timers: HashMap<u8, Timer> =
                serde_json::from_str(&timers_json).expect("Could not deserialise");
            return Some(timers);
        }
        Err(e) => {
            println!("Failed to read timers.json: {}", e);
            return None;
        }
    }
}
