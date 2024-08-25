use crate::functions::{delete_file, read_data, read_dir, save_data};
use reqwest::{Client, Error as ReqwestError};
use serde::{Deserialize, Serialize};
use serde_json::{Error as SerdeJsonError, Value};
use std::collections::HashMap;
use std::fs::metadata;
use std::time::{Duration, UNIX_EPOCH};
use tauri::ipc::InvokeError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Standard error: {0}")]
    StdError(#[from] std::io::Error),

    #[error("Reqwest error: {0}")]
    ReqwestError(#[from] ReqwestError),

    #[error("JSON parsing error: {0}")]
    SerdeJsonError(#[from] SerdeJsonError),

    #[error("API error: {0}")]
    APIError(Value),

    #[error("String error: {0}")]
    StringError(String),
}

impl From<AppError> for InvokeError {
    fn from(error: AppError) -> Self {
        InvokeError::from(format!("{}", error))
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    role: String,
    content: String,
}

impl Message {
    pub fn new(role: &str, content: &str) -> Self {
        Self {
            role: role.to_string(),
            content: content.to_string(),
        }
    }
}

#[derive(Serialize, Deserialize)]
struct RequestBody {
    messages: Vec<Message>,
    model: String,
    stream: bool,
    temperature: f32,
    max_tokens: u16,
}

async fn get_response(
    model: String,
    messages: Vec<Message>,
    max_tokens: u16,
) -> Result<Vec<Value>, AppError> {
    let body = RequestBody {
        messages,
        model,
        stream: false,
        temperature: 0.2,
        max_tokens,
    };
    let client = Client::new();
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .timeout(Duration::from_secs(5))
        .header(
            "Authorization",
            format!("Bearer {}", crate::env::GROQ_API_KEY),
        )
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body)?)
        .send()
        .await?;

    let body = response.text().await?;
    let json: Value = serde_json::from_str(&body)?;
    if json["error"].is_null() {
        if let Some(choices) = json["choices"].as_array() {
            Ok(choices.clone())
        } else {
            Ok(vec![Value::Null])
        }
    } else {
        Err(AppError::APIError(json["error"].clone()))
    }
}

#[tauri::command]
pub async fn ask_buddy(
    active_chat_id: String,
    mut messages: Vec<Message>,
    mut title: String,
) -> Result<(String, Message, String), AppError> {
    let models: Vec<&str> = vec![
        "llama-3.1-405b-reasoning",
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "gemma2-9b-it",
        "llama3-8b-8192",
        "gemma-7b-it",
    ];

    let mut models_iter = models.iter();
    let mut assistant_message: Result<Message, AppError> =
        Err(AppError::StringError("Message is Empty".to_string()));
    let mut current_model = models[0];
    while let Some(model) = models_iter.next() {
        match get_response(model.to_string(), messages.clone(), 2048).await {
            Ok(choices) => {
                for choice in choices {
                    if let Some(message) = choice["message"].as_object() {
                        assistant_message = Ok(Message::new(
                            message["role"].as_str().unwrap_or_else(|| "assistant"),
                            message["content"]
                                .as_str()
                                .unwrap_or_else(|| "Empty message!"),
                        ));
                        current_model = model;
                    }
                }
                break;
            }
            Err(e) => {
                println!("Error in Model {}: {}", model, e);
                assistant_message = Err(e)
            }
        }
    }
    match assistant_message {
        Ok(msg) => {
            messages.push(msg.clone());
            if title == "New Chat" {
                let empty_message: Message = Message::new("", "");
                match get_response("gemma-7b-it".to_string(), vec![Message::new("system", "Create a short and catchy title of up to 5 words that captures the essence of the following content. The title should be relevant and engaging for any subject matter. Keep in mind that this content is based on chat between a user and an LLM but don't mention this in title. Also, make sure you don't cut the title in between. Examples: 'Top Study Habits for Success', 'Advantages of Learning a Second Language', 'Improve Your Sleep Quality Fast', 'Blockchain’s Impact on Industries', 'Manage Stress with Effective Strategies', 'What's Up, Buddy?' etc."), Message::new("user", format!("User:{}\nLLM:{}", messages.last().unwrap_or_else(||{&empty_message}).content, msg.content).as_str())], 30).await {
                    Ok(choices)=>{
                        if let Some(response) = choices[0]["message"].as_object() {
                            title = response["content"].as_str().unwrap_or_else(||{"Empty message!"}).to_string();
                        } else {
                            title = "New Chat".to_string();
                        }
                        match read_data("prev_chats/list.json")  {
                            Ok(data) => {
                                let mut chats_list: HashMap<String, String> = serde_json::from_str(&data).unwrap_or_default();
                                chats_list.insert(active_chat_id.clone(), title.clone());
                                let _= save_data("prev_chats/list.json", &serde_json::to_string(&chats_list).unwrap_or_else(|_e|{"{}".to_string()}));
                            }
                            Err(_e) => {
                                let mut chats_list: HashMap<String, String> = HashMap::new();
                                chats_list.insert(active_chat_id.clone(), title.clone());
                                let _= save_data("prev_chats/list.json", &serde_json::to_string(&chats_list).unwrap_or_else(|_e|{"{}".to_string()}));
                            }
                        }
                    },
                    Err(_e)=>{
                            title = "New Chat".to_string();
                    }
                }
            }
            let _ = save_data(
                format!("prev_chats/{}.json", active_chat_id).as_str(),
                &serde_json::to_string(&messages)?,
            )?;
            Ok((title, msg, current_model.to_string()))
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
pub fn get_chat_data(active_chat_id: String, default_message: &str) -> Vec<Message> {
    let data_string = read_data(format!("prev_chats/{}.json", active_chat_id).as_str())
        .unwrap_or_else(|e| {
            println!("New chat starting, no file found: {}", e);
            let system_message = vec![Message::new("system", default_message)];
            serde_json::to_string(&system_message).unwrap()
        });
    let data: Vec<Message> = serde_json::from_str(&data_string).unwrap_or_else(|e| {
        println!("New chat starting, can't serialise last chats: {}", e);
        vec![Message::new("system", default_message)]
    });
    data
}

#[tauri::command]
pub fn get_chats_list() -> HashMap<String, (String, u128)> {
    match read_data("prev_chats/list.json") {
        Ok(data) => {
            let chats_list: HashMap<String, String> = serde_json::from_str(&data).unwrap();
            let mut chats_list_from_files: HashMap<String, (String, u128)> = HashMap::new();
            match read_dir("prev_chats") {
                Ok(files) => files.for_each(|file| {
                    let file = file.unwrap();
                    let file_name = file.file_name();
                    let file_name_str = file_name.to_str().unwrap_or_default();
                    let name = file_name_str.split(".").next().unwrap_or_default();

                    if name != "list" {
                        let mut last_modified = UNIX_EPOCH;
                        if let Ok(meta) = metadata(file.path()) {
                            last_modified = meta.modified().unwrap_or_else(|_| UNIX_EPOCH);
                        }

                        let last_modified_ms = last_modified
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis();
                        let title = chats_list
                            .get(&name.to_string())
                            .unwrap_or(&"New Chat".to_string())
                            .to_string();
                        chats_list_from_files.insert(name.to_string(), (title, last_modified_ms));
                    }
                }),
                Err(e) => {
                    println!("Could not read directory: {}", e)
                }
            }
            chats_list_from_files
        }
        Err(_e) => HashMap::new(),
    }
}

#[tauri::command]
pub fn delete_chat(id: String) {
    let _ = delete_file(format!("prev_chats/{}.json", id).as_str())
        .inspect_err(|e| println!("Could not delete chat file: {}", e));
    match read_data("prev_chats/list.json") {
        Ok(data) => {
            let mut chats_list: HashMap<String, String> =
                serde_json::from_str(&data).unwrap_or_default();
            chats_list.remove(&id);
            let _ = save_data(
                "prev_chats/list.json",
                &serde_json::to_string(&chats_list).unwrap_or_else(|_e| "{}".to_string()),
            );
        }
        Err(e) => {
            println!("Could not remove chatId from list: {}", e)
        }
    }
}
