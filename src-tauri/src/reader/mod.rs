/*
    reader module: contains functions related to pdf/epub reader
*/

// importing crates and modules
use crate::functions::{read_data, save_data};
use font_loader::system_fonts;
use regex::Regex;
use std::io::Read;
use std::time::{SystemTime, UNIX_EPOCH};
use std::{fs::File, io::Write};
use tauri::Error as TauriError;
use tauri::WebviewWindow;
use tauri_plugin_dialog::{DialogExt, FileResponse};
use zip::{
    write::{ExtendedFileOptions, FileOptions},
    CompressionMethod, ZipArchive, ZipWriter,
};

// open_file_dialog command: opens a file selection dialog box and returns the response when invoked
#[tauri::command]
pub fn open_file_dialog(window: WebviewWindow) -> Option<FileResponse> {
    let dialog = window
        .dialog()
        .file()
        .add_filter("Readables", &vec!["pdf", "epub"])
        .blocking_pick_file();

    return dialog;
}

// load_installed_fonts command: returns name of all the fonts installed on system
#[tauri::command]
pub fn load_installed_fonts() -> Vec<String> {
    let sysfonts = system_fonts::query_all();
    sysfonts
}

// e_pub_data_get command: reads an epub file and return certain data when invoked
#[tauri::command]
pub fn e_pub_data_get(path: &str) -> Result<Vec<String>, TauriError> {
    let opf_data = read_opf_file(path).map_err(TauriError::from)?; // read content.opf

    let title = extract_title(&opf_data).unwrap_or_default(); // extract title

    // extract uid (unique id to load highlights) or generate and save a new one if not found
    let uid = extract_uid(&opf_data).unwrap_or_else(|| {
        let new_uid = generate_uid();
        let updated_opf_data = update_opf_with_uid(&opf_data, &new_uid);

        save_opf_file(path, updated_opf_data).unwrap_or_default(); // Save the updated OPF data
        new_uid
    });

    // read hidhlights file based on the uid
    let highlights =
        read_data(format!("highlights/{}.json", uid).as_str()).unwrap_or_else(|_| "[]".to_string());

    Ok(vec![uid, title, highlights])
}

// e_pub_highlights_save command: saves the highlight data as json file when invoked
#[tauri::command]
pub fn e_pub_highlight_save(uid: String, data: String) {
    println!("saving data: {}", data);
    save_data(format!("highlights/{}.json", uid).as_str(), &data).unwrap_or_default();
}

// function to read content.opf data from an epub file
fn read_opf_file(path: &str) -> Result<String, std::io::Error> {
    let file = File::open(path)?; // read the epub file
    let mut archive = ZipArchive::new(file)?; //unzips the epub file

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.name().ends_with("content.opf") {
            // return the file data with name "content.opf"
            let mut opf_data = String::new();
            file.read_to_string(&mut opf_data)?;
            return Ok(opf_data);
        }
    }

    Err(std::io::Error::new(
        std::io::ErrorKind::NotFound,
        "content.opf not found",
    ))
}

// function to save content.opf data to an epub file
fn save_opf_file(path: &str, updated_opf_data: String) -> Result<(), Box<dyn std::error::Error>> {
    // Open the existing epub file
    let file = File::open(path)?;
    let mut archive = ZipArchive::new(file)?;

    // Create a temporary file to write the new epub contents
    let temp_file_path = format!("{}.tmp", path);
    let temp_file = File::create(&temp_file_path)?;
    let mut zip_writer = ZipWriter::new(temp_file);

    // Write the updated content.opf to the epub archive
    zip_writer.start_file::<_, ExtendedFileOptions>(
        "content.opf",
        FileOptions::default().compression_method(CompressionMethod::Stored),
    )?;
    zip_writer.write_all(updated_opf_data.as_bytes())?;

    // Copy the remaining files from the existing ZIP archive
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if name != "content.opf" {
            zip_writer.start_file::<_, ExtendedFileOptions>(
                name,
                FileOptions::default().compression_method(file.compression()),
            )?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)?;
            zip_writer.write_all(&buffer)?;
        }
    }

    // Finalize the ZIP file
    zip_writer.finish()?;

    // Replace the original file with the temporary file
    std::fs::remove_file(path)?;
    std::fs::rename(temp_file_path, path)?;

    Ok(())
}

// function to extract title from content.opf data
fn extract_title(opf_data: &str) -> Option<String> {
    let re_title = Regex::new(r#"<dc:title>(.*?)</dc:title>"#).ok()?;
    re_title
        .captures(opf_data)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().to_string())
}

// function to extract uid from content.opf data
fn extract_uid(opf_data: &str) -> Option<String> {
    let re_uid =
        Regex::new(r#"<meta\s+name="hub.students.adnarayan"\s+content="([^"]*)"\s*/?>"#).ok()?;
    re_uid
        .captures(opf_data)
        .and_then(|caps| caps.get(1))
        .map(|m| m.as_str().to_string())
}

// function to generate new uid (based on current timestamp)
fn generate_uid() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis()
        .to_string()
}

// function to add uid to content.opf data
fn update_opf_with_uid(opf_data: &str, uid: &str) -> String {
    opf_data.replace(
        "</metadata>",
        &format!(
            "<meta name=\"hub.students.adnarayan\" content=\"{}\"/></metadata>",
            uid
        ),
    )
}
