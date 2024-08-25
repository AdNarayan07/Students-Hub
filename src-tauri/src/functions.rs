use crate::timer::TimerState;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager, WindowEvent};
use winrt_notification::{Duration as winrtDuration, Sound, Toast};

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

pub fn on_window_event(
    window: &tauri::Window,
    event: &WindowEvent,
    state: &Arc<Mutex<TimerState>>,
) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        let state = state.lock().unwrap();
        if state.timers.values().any(|timer| timer.active) {
            window.hide().unwrap();
            api.prevent_close();
        }
    }
}

pub fn save_data(pathname: &str, data: &String) -> Result<(), std::io::Error> {
    // Construct the path to the JSON file
    let mut path = PathBuf::from(std::env::var("APPDATA").unwrap_or_default());
    path.push("hub.students.adnarayan");
    path.push(pathname);

    // Create the directory if it doesn't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Write the JSON string to the file
    fs::write(path, data)?;

    Ok(())
}

pub fn read_data(pathname: &str) -> Result<String, std::io::Error> {
    // Construct the path to the JSON file
    let mut path = PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| {
        format!(
            "{}\\AppData\\Roaming",
            std::env::var("USERPROFILE").unwrap_or_else(|_| { "C:\\Users\\Public".to_string() })
        )
    }));
    path.push("hub.students.adnarayan");
    path.push(pathname);

    // Read the contents of the file
    let contents = fs::read_to_string(path)?;

    Ok(contents)
}

pub fn read_dir(pathname: &str) -> Result<fs::ReadDir, std::io::Error> {
    let mut path = PathBuf::from(std::env::var("APPDATA").unwrap_or_default());
    path.push("hub.students.adnarayan");
    path.push(pathname);

    fs::read_dir(path)
}

pub fn delete_file(pathname: &str) -> Result<(), std::io::Error> {
    let mut path = PathBuf::from(std::env::var("APPDATA").unwrap_or_default());
    path.push("hub.students.adnarayan");
    path.push(pathname);

    fs::remove_file(path)
}

pub fn notify(title: String, description: String, sound: Option<Sound>, duration: winrtDuration) {
    Toast::new("hub.students.adnarayan")
        .title(&title)
        .text1(&description)
        .sound(sound)
        .duration(duration)
        .show()
        .expect("unable to toast");
}

pub fn duration_to_hms(duration: Duration) -> String {
    let total_seconds = duration.as_secs();
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}
