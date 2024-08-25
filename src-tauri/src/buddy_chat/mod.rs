/*
    buddy_chat module: contains functions related to the AI chatbot
*/

// importing crates and modules
use crate::functions::{delete_file, read_data, read_dir, save_data};
use reqwest::{Client, Error as ReqwestError};
use serde::{Deserialize, Serialize};
use serde_json::{Error as SerdeJsonError, Value};
use std::collections::HashMap;
use std::fs::metadata;
use std::time::{Duration, UNIX_EPOCH};
use tauri::ipc::InvokeError;
use thiserror::Error;

// Custom Error struct
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

// implementing InvokeError for AppError struct
impl From<AppError> for InvokeError {
    fn from(error: AppError) -> Self {
        InvokeError::from(format!("{}", error))
    }
}

// Message struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
    role: String,
    content: String,
}

// implementations for Message struct
impl Message {
    pub fn new(role: &str, content: &str) -> Self {
        Self {
            role: role.to_string(),
            content: content.to_string(),
        }
    }
}

// Requestbody struct for making https requests to groq api
#[derive(Serialize, Deserialize)]
struct RequestBody {
    messages: Vec<Message>,
    model: String,
    stream: bool,
    temperature: f32,
    max_tokens: u16,
}

// fetching data from groq api
async fn get_response(
    model: String,
    messages: Vec<Message>,
    max_tokens: u16,
) -> Result<Vec<Value>, AppError> {
    // create request body
    let body = RequestBody {
        messages,
        model,
        stream: false,
        temperature: 0.2,
        max_tokens,
    };

    // fetch response
    let client = Client::new();
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .timeout(Duration::from_secs(5))
        .header(
            "Authorization",
            format!("Bearer {}", crate::env::GROQ_API_KEY), // load GROQ_API_KEY from env.rs
        )
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body)?)
        .send()
        .await?;

    // getting the json data from response
    let body = response.text().await?;
    let json: Value = serde_json::from_str(&body)?;

    if json["error"].is_null() {
        // return result if error is null
        if let Some(choices) = json["choices"].as_array() {
            Ok(choices.clone())
        } else {
            Ok(vec![Value::Null])
        }
    } else {
        // return error
        Err(AppError::APIError(json["error"].clone()))
    }
}

// ask_buddy command: gets response from LLM when invoked
#[tauri::command]
pub async fn ask_buddy(
    active_chat_id: String,
    mut messages: Vec<Message>,
    mut title: String,
) -> Result<(String, Message, String), AppError> {
    // list of available models (sorted best to worst)
    let models: Vec<&str> = vec![
        "llama-3.1-405b-reasoning",
        "llama-3.1-70b-versatile",
        "llama-3.1-8b-instant",
        "llama3-70b-8192",
        "gemma2-9b-it",
        "llama3-8b-8192",
        "gemma-7b-it",
    ];

    // set defalut mutable assistant message and mutable currently used model
    let mut assistant_message: Result<Message, AppError> =
        Err(AppError::StringError("Message is Empty".to_string()));
    let mut current_model = models[0];

    // iterate through models and try to fetch data from groq api
    let mut models_iter = models.iter();
    while let Some(model) = models_iter.next() {
        match get_response(model.to_string(), messages.clone(), 2048).await {
            Ok(choices) => {
                if let Some(message) = choices[0]["message"].as_object() {
                    // set assistant message if found
                    assistant_message = Ok(Message::new(
                        message["role"].as_str().unwrap_or_else(|| "assistant"),
                        message["content"]
                            .as_str()
                            .unwrap_or_else(|| "Empty message!"),
                    ));
                    current_model = model; // set the currently used model
                }
                break; // break the loop on successful request
            }

            Err(e) => {
                println!("Error in Model {}: {}", model, e);
                assistant_message = Err(e) // return error when request is unsuccessful
            }
        }
    }

    match assistant_message {
        Ok(msg) => {
            messages.push(msg.clone()); // push the recieved message to original vector
            if title == "New Chat" {
                // Ask LLM to generate a chat title if the current title is default one ("New Chat")
                let empty_message: Message = Message::new("", "");
                match get_response(
                    String::from("gemma-7b-it"),
                    vec![Message::new("system", "Create a short and catchy title of up to 5 words that captures the essence of the following content. The title should be relevant and engaging for any subject matter. Keep in mind that this content is based on chat between a user and an LLM but don't mention this in title. Also, make sure you don't cut the title in between. Examples: 'Top Study Habits for Success', 'Advantages of Learning a Second Language', 'Improve Your Sleep Quality Fast', 'Blockchain’s Impact on Industries', 'Manage Stress with Effective Strategies', 'What's Up, Buddy?' etc."),
                    Message::new("user", format!("User:{}\nLLM:{}", messages.last().unwrap_or_else(||{&empty_message}).content, msg.content).as_str())], 30
                ).await {
                    Ok(choices)=>{
                        if let Some(response) = choices[0]["message"].as_object() {
                            title = response["content"].as_str().unwrap_or_else(||{"New Chat"}).to_string(); // set new title
                        } else {
                            title = "New Chat".to_string(); // return default title if no response
                        }

                        // read chats lits file
                        match read_data("prev_chats/list.json")  {
                            Ok(data) => {
                                // append new title to chats list data
                                let mut chats_list: HashMap<String, String> = serde_json::from_str(&data).unwrap_or_default();
                                chats_list.insert(active_chat_id.clone(), title.clone());
                                let _= save_data("prev_chats/list.json", &serde_json::to_string(&chats_list).unwrap_or_else(|_e|{"{}".to_string()}))
                                    .inspect_err(|e| println!("Could not save data: {}", e));
                            }
                            Err(_e) => {
                                // if file not found create a new hashmap and save the data
                                let mut chats_list: HashMap<String, String> = HashMap::new();
                                chats_list.insert(active_chat_id.clone(), title.clone());
                                let _= save_data("prev_chats/list.json", &serde_json::to_string(&chats_list).unwrap_or_else(|_e|{"{}".to_string()}))
                                    .inspect_err(|e| println!("Could not save data: {}", e));
                            }
                        }
                    },
                    Err(_e)=>{
                            title = "New Chat".to_string(); // return default title on error
                    }
                }
            }

            // save the updated messsages to data to corresponsing json file
            let _ = save_data(
                format!("prev_chats/{}.json", active_chat_id).as_str(),
                &serde_json::to_string(&messages)?,
            )?;

            // return title, new message from assistant and model used for fetching message
            Ok((title, msg, current_model.to_string()))
        }
        Err(e) => Err(e),
    }
}

// get_chat_data command: return list of messages from saved data when invoked
#[tauri::command]
pub fn get_chat_data(active_chat_id: String, default_message: &str) -> Vec<Message> {
    // read the file containg chat messages, if unabale to, returns a json array containing a single default "system" message
    let data_string = read_data(format!("prev_chats/{}.json", active_chat_id).as_str())
        .unwrap_or_else(|e| {
            println!("New chat starting, no file found: {}", e);
            let system_message = vec![Message::new("system", default_message)];
            serde_json::to_string(&system_message).unwrap()
        });

    // serialise the file data, if unable to, returns a vector containing single "system" message
    let data: Vec<Message> = serde_json::from_str(&data_string).unwrap_or_else(|e| {
        println!("New chat starting, can't serialise last chats: {}", e);
        vec![Message::new("system", default_message)]
    });

    data
}

// get_chats_list command: returns a Hashmap of chat id and corresponding Title and Last Modified data
#[tauri::command]
pub fn get_chats_list() -> HashMap<String, (String, u128)> {
    // read chats list
    match read_data("prev_chats/list.json") {
        Ok(data) => {
            let chats_list: HashMap<String, String> = serde_json::from_str(&data).unwrap(); // generate hashmap from json data
            let mut chats_list_from_files: HashMap<String, (String, u128)> = HashMap::new(); // generate new mutable hashmap

            // read all saved chats file
            match read_dir("prev_chats") {
                // loop through files of the directory
                Ok(files) => files.for_each(|file| {
                    // get file name
                    let file = file.unwrap();
                    let file_name = file.file_name();
                    let file_name_str = file_name.to_str().unwrap_or_default();
                    let name = file_name_str.split(".").next().unwrap_or_default();

                    // insert chats data in mutable hashmap
                    if name != "list" {
                        // read file metadata to get last modified data, or default to UNIX_EPOCH
                        let mut last_modified = UNIX_EPOCH;
                        if let Ok(meta) = metadata(file.path()) {
                            last_modified = meta.modified().unwrap_or_else(|_| UNIX_EPOCH);
                        }
                        let last_modified_ms = last_modified
                            .duration_since(UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis();

                        // match the title from chats_list to file name
                        let title = chats_list
                            .get(&name.to_string())
                            .unwrap_or(&"New Chat".to_string())
                            .to_string();

                        chats_list_from_files.insert(name.to_string(), (title, last_modified_ms)); // insert data
                    }
                }),
                Err(e) => {
                    println!("Could not read directory: {}", e)
                }
            }
            chats_list_from_files
        }
        Err(_e) => HashMap::new(), // if file not found return empty hashmap
    }
}

// delete_chat command: delete the chat file and remove the entry from chats_list
#[tauri::command]
pub fn delete_chat(id: String) {
    // delete file
    let _ = delete_file(format!("prev_chats/{}.json", id).as_str())
        .inspect_err(|e| println!("Could not delete chat file: {}", e));

    // remove entry from list
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
