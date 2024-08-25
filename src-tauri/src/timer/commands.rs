/*
    timer module:
    commands.rs declares pub/tauri commands related to timer functionality
*/

// importing crates and modules
use crate::functions::{read_data, save_data};
use crate::timer::{Timer, TimerState, TimerType};
use serde_json;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::WebviewWindow;

// get_timers command: returns the list of times of given type when invoked
#[tauri::command]
pub fn get_timers(state: tauri::State<Arc<Mutex<TimerState>>>, _type: Option<TimerType>) -> String {
    let state = state.lock().unwrap();
    let filtered_timers: Vec<(u8, Timer)> = match _type {
        // return filtered timers if a type is provided
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
        // return all timers if no type is provided
        None => state
            .timers
            .iter()
            .map(|(&id, timer)| (id, timer.to_owned()))
            .collect(),
    };

    // Sort by duration (in seconds)
    let mut sorted_timers = filtered_timers;
    sorted_timers.sort_by_key(|(_, timer)| timer.duration.as_secs());
    serde_json::to_string(&sorted_timers).unwrap_or_default()
}

// create_timer command: creates a new timer when invoked
#[tauri::command]
pub fn create_timer(
    state: tauri::State<Arc<Mutex<TimerState>>>,
    _type: TimerType,
    seconds: u64,
    name: String,
) -> Result<String, String> {
    let mut state = state.lock().unwrap();
    let id = state.find_available_id(&_type);
    match id {
        Some(id) => {
            // if an id is available, create a timer
            let timer = Timer::new(seconds, _type, id, name);
            state.add_timer(timer);

            let json_string = serde_json::to_string(&state.timers).unwrap_or_default(); // serialize data
            let _ = save_data("data/timers.json", &json_string); // save the data to file
            return Ok(json_string);
        }
        None => Err("Can't create a new timer of this type".to_string()),
    }
}

// del_timer command: delete timer with given id when invoked
#[tauri::command]
pub fn del_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<String> {
    let mut state = state.lock().unwrap();

    if let Some(timer_ref) = state.get_timer(id) {
        if timer_ref.active {
            return None; // do not delete the timer if it's active
        }
    }

    state.remove_timer(id);

    let json_string = serde_json::to_string(&state.timers).expect("Failed to serialize state"); // serialize data
    save_data("data/timers.json", &json_string).expect("couldn't save timers.json"); // save the data to file
    Some(json_string)
}

// start_timer command: starts the timer with given id when invoked
#[tauri::command]
pub fn start_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<bool> {
    let mut _state = state.lock().unwrap();
    if let Some(timer) = _state.get_timer(id) {
        timer.start(); // start timer if found
        return Some(true);
    }
    None
}

// timer_play_pause command: toggles play/pause timer when invoked
#[tauri::command]
pub fn timer_play_pause(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> bool {
    let mut state = state.lock().unwrap();
    if let Some(timer) = state.get_timer(id) {
        timer.toggle_pause(); // toggle the timer play/pause if found
        return timer.paused;
    }
    false
}

// timer_play_pause command: resets the timer with given id when invoked
#[tauri::command]
pub fn reset_timer(state: tauri::State<Arc<Mutex<TimerState>>>, id: u8) -> Option<bool> {
    let mut state = state.lock().unwrap();
    if let Some(timer) = state.get_timer(id) {
        timer.reset(); // reset timer if found
        return Some(false);
    }
    None
}

// get_remaining_ms command: returns the remaining time in the timer when invoked
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
            // if 0 timer remaining and there are no active timers and the window is hidden, close the window
            let has_active_timers = state.timers.values().any(|t| t.active); // get if the timer state has any active timers
            if !has_active_timers {
                if let Ok(false) = window.is_visible() {
                    let _ = window.close();
                }
            }
        }
        return remaining_ms;
    }
    0 // defaults to 0 if no timer found
}

// function to initiate timer state
pub fn init_state() -> Arc<Mutex<TimerState>> {
    Arc::new(Mutex::new(TimerState::new()))
}

// function to load the timers from saved data
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
