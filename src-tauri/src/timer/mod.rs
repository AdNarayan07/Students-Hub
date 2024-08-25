pub mod commands;

use crate::functions::{duration_to_hms, notify};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, Instant};
use winrt_notification::{Duration as winrtDuration, LoopableSound, Sound};

#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub enum TimerType {
    Default,
    Test,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Timer {
    _type: TimerType,
    id: u8,
    name: String,
    #[serde(with = "timestamp")]
    pub end_time: Option<Instant>,
    duration: Duration,
    initial_duration: Duration,
    pub active: bool,
    paused: bool,
}

mod timestamp {
    use serde::{self, Deserialize, Serializer};
    use std::time::Instant;

    pub fn serialize<S>(instant: &Option<Instant>, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let timestamp = instant
            .map(|i| i.elapsed().as_millis() as u64)
            .unwrap_or_default();
        serializer.serialize_u64(timestamp)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Option<Instant>, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let timestamp = u64::deserialize(deserializer)?;
        Ok(Some(
            Instant::now() - std::time::Duration::from_millis(timestamp),
        ))
    }
}

impl Timer {
    pub fn new(seconds: u64, _type: TimerType, id: u8, name: String) -> Self {
        Self {
            _type,
            id,
            name,
            end_time: None,
            duration: Duration::new(seconds, 100),
            initial_duration: Duration::new(seconds, 100),
            active: false,
            paused: true,
        }
    }

    pub fn start(&mut self) {
        self.end_time = Some(Instant::now() + self.duration);
        self.active = true;
        self.paused = false;
    }

    pub fn toggle_pause(&mut self) {
        if self.paused {
            // Resuming
            if self.end_time.is_some() {
                self.end_time = Some(Instant::now() + self.duration);
            }
        } else {
            // Pausing
            if let Some(end_time) = self.end_time {
                let remaining_duration = end_time.saturating_duration_since(Instant::now());
                self.duration = remaining_duration;
            }
        }
        self.paused = !self.paused;
    }

    pub fn reset(&mut self) {
        self.end_time = None;
        self.duration = self.initial_duration;
        self.active = false;
        self.paused = true;
    }

    pub fn remaining_ms(&mut self) -> u128 {
        if self.paused {
            return self.duration.as_millis();
        }
        if self.active {
            if let Some(end_time) = self.end_time {
                let remaining_ms = end_time
                    .saturating_duration_since(Instant::now())
                    .as_millis();
                if remaining_ms == 0 {
                    self.reset();
                    notify(
                        format!("Time's Up - {}", self.name),
                        format!(
                            "{} hrs are over! \nClick to Dismiss!",
                            duration_to_hms(self.initial_duration)
                        ),
                        Some(Sound::Loop(LoopableSound::Call7)),
                        winrtDuration::Long,
                    );
                }
                return remaining_ms;
            }
        }
        0
    }
}

#[derive(Serialize, Deserialize)]
pub struct TimerState {
    pub timers: HashMap<u8, Timer>,
}

impl TimerState {
    pub fn new() -> Self {
        Self {
            timers: HashMap::new(),
        }
    }

    pub fn add_timer(&mut self, timer: Timer) {
        self.timers.insert(timer.id, timer);
    }

    pub fn remove_timer(&mut self, id: u8) {
        self.timers.remove(&id);
    }

    pub fn get_timer(&mut self, id: u8) -> Option<&mut Timer> {
        self.timers.get_mut(&id)
    }

    pub fn find_available_id(&mut self, timer_type: &TimerType) -> Option<u8> {
        let range = match timer_type {
            TimerType::Default => 0..10,
            TimerType::Test => 10..20,
        };

        for id in range {
            if !self.timers.contains_key(&id) {
                return Some(id);
            }
        }
        None
    }
}
