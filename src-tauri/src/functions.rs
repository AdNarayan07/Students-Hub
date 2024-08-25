/*
    functions.rs contains some common functions
*/

// importing crates and modules
use crate::timer::TimerState;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, WindowEvent};
use winrt_notification::{Duration as winrtDuration, Sound, Toast};

// function to show, then unminimize and focus on the hidden app window
pub fn show_window(app: &AppHandle) {
    let windows = app.webview_windows();

    windows
        .values()
        .next()
        .expect("Sorry, no window found")
        .show()
        .expect("Can't Show");

    windows
        .values()
        .next()
        .expect("Sorry, no window found")
        .unminimize()
        .expect("Can't Unmiinimize");

    windows
        .values()
        .next()
        .expect("Sorry, no window found")
        .set_focus()
        .expect("Can't Bring Window to Focus");
}

// handing window event
pub fn on_window_event(
    window: &tauri::Window,
    event: &WindowEvent,
    state: &Arc<Mutex<TimerState>>,
) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let state = state.lock().unwrap();

        // check if any timer is active
        if state.timers.values().any(|timer| timer.active) {
            window.hide().unwrap(); // hide the window instead of closing
            api.prevent_close();
        }
    }
}

// function to generate a default path for saving necessary data
fn generate_data_path(pathname: &str) -> PathBuf {
    // try to load %APPDATA% path, if unabele to, finally hardcode to default user
    let mut path = PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| {
        format!(
            "{}\\AppData\\Roaming",
            std::env::var("USERPROFILE").unwrap_or_else(|_| { "C:\\Users\\Default".to_string() })
        )
    }));

    path.push("hub.students.adnarayan"); // push package name to path
    path.push(pathname); // push the relative file pathname
    path
}

// function to save the data
pub fn save_data(pathname: &str, data: &String) -> Result<(), std::io::Error> {
    let path = generate_data_path(pathname); // generate path

    // Create the directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(path, data)?; // Write the JSON string to the file

    Ok(())
}

// function to read data from a file
pub fn read_data(pathname: &str) -> Result<String, std::io::Error> {
    let path = generate_data_path(pathname); // generate path

    fs::read_to_string(path)
}

// function to read contents of a directory
pub fn read_dir(pathname: &str) -> Result<fs::ReadDir, std::io::Error> {
    let path = generate_data_path(pathname); // generate path

    fs::read_dir(path)
}

// function to delete a file
pub fn delete_file(pathname: &str) -> Result<(), std::io::Error> {
    let path = generate_data_path(pathname); // generate path

    fs::remove_file(path)
}

// function to toast a notification
pub fn notify(title: String, description: String, sound: Option<Sound>, duration: winrtDuration) {
    // use powershell id for sending notification on dev mode and app package id in build mode
    let app_id = if cfg!(dev) {
        Toast::POWERSHELL_APP_ID
    } else {
        "hub.students.adnarayan"
    };

    // showing notification
    Toast::new(app_id)
        .title(&title)
        .text1(&description)
        .sound(sound)
        .duration(duration)
        .show()
        .expect("unable to toast");
}

// function to formst duration to readable HH:MM:SS format
pub fn duration_to_hms(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}
