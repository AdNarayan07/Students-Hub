<h1  align="left"><img  src="https://github.com/AdNarayan07/Students-Hub/blob/master/src-tauri/icons/128x128.png" style="margin: 0 10px"/> Student's Hub</h1>

⚠️ Note: This project is made only for WIndows OS.
## Introduction

**This project aims at providing necessary tools for students.**

The app contains 3 sections:
1. [**Tools:**](https://github.com/AdNarayan07/Students-Hub/tree/master/src/components/tools) Includes the tools frequently used by students.
    - Currently contains only one "Timer" tool, more to be added...

2. [**Reader:**](https://github.com/AdNarayan07/Students-Hub/tree/master/src/components/reader) Renders readadble files with rich features.
    - Currently supports `.pdf` and `.epub` files.

3. [**Chat Bot:**](https://github.com/AdNarayan07/Students-Hub/tree/master/src/components/chatbot) An AI assistant for assisting the students on their queries and doubts.

## Getting Started

[Video Demo On Youtube](https://youtu.be/0yZc4GqBlNs)

### Prerequisites

**Operating System:** Windows

 * **Nodejs:** version 20+
 * **npm:** version 10+

Go to https://nodejs.org/en/download/ for installing nodejs and npm

 * **[Rust & Cargo:](https://www.rust-lang.org/tools/install)** version 1.80+
 * **[Tauri CLI:](https://v2.tauri.app/reference/cli/)** version 2.0.0-rc (will recommend using `cargo` to install)
 * **[GroqCloud API Key:](https://console.groq.com/keys)** [How to get Groq API Key](#how-to-get-groq-api-key)

### Installation

1. Clone the repository:

```sh
git clone https://github.com/AdNarayan07/Students-Hub
```

2. Navigate to the project directory:

```sh
cd Students-Hub
```

3. Install npm dependencies:

```sh
npm install
```

4. Add the Groq API key to `src-tauri/src/env.rs`

```rust
pub const GROQ_API_KEY: &str = "YOUR_API_KEY";
```

### Running the Application
Make sure you have installed `tauri-cli v2.0.0-rc`

Run the following command
```
cargo tauri --version
```
and make sure the command return something like `tauri-cli 2.0.0-rc.3`. There might be problems if the CLI version is not 2.0.0-rc.


- To run the application in dev mode:
```sh
cargo tauri dev
```

- To bundle the package for production:
```sh
cargo tauri build
```

- To bundle the package with debugging mode:
```sh
cargo tauri build --debug
```

## Codebase

<p  align="left">
Backend Developed with

<a href="https://www.rust-lang.org/" style="text-decoration: none">
<img  src="https://img.shields.io/badge/Rust-000000.svg?style=flat&logo=Rust&logoColor=white"  alt="Rust" style = "position: relative; top: 6px">
</a>

<a href="https://v2.tauri.app/" style="text-decoration: none">
<img  src="https://img.shields.io/badge/tauri-%2324C8DB.svg?style=flat&logo=tauri&logoColor=%23FFFFFF"  alt="tauri" style = "position: relative; top: 6px">
</a>

</p>

<p>
Frontend Developed with

<a href="https://react.dev/" style="text-decoration: none">
<img  src="https://img.shields.io/badge/React-61DAFB.svg?style=flat&logo=React&logoColor=black"  alt="React" style = "position: relative; top: 6px">
</a>

<a href="https://vitejs.dev/" style="text-decoration: none">
<img  src="https://img.shields.io/badge/Vite-646CFF.svg?style=flat&logo=Vite&logoColor=white"  alt="Vite" style = "position: relative; top: 6px">
</a>

<a href="https://tailwindcss.com/" style="text-decoration: none">
<img  src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=flat&logo=PostCSS&logoColor=white"  alt="TailwindCSS" style = "position: relative; top: 6px">
</a>

</p>

---

<details style="margin-left: 10px" closed><summary>File tree</summary>

```sh
└──  Students-Hub/
├──  README.md
├──  index.html
├──  package-lock.json
├──  package.json
├──  postcss.config.js
├──  public
│  ├──  // contains images and a css
├──  src
│  ├──  App.jsx
│  ├──  components
│  │  ├──  chatbot
│  │  │  └──  chatbot.jsx
│  │  ├──  common
│  │  │  ├──  active_state_context.jsx
│  │  │  ├──  custom_context_menu.jsx
│  │  │  ├──  sidebar.css
│  │  │  ├──  sidebar.jsx
│  │  │  └──  window_controls.jsx
│  │  ├──  reader
│  │  │  ├──  epub.css
│  │  │  ├──  epub.jsx
│  │  │  ├──  pdf.css
│  │  │  ├──  pdf.jsx
│  │  │  └──  reader.jsx
│  │  └──  tools
│  │  ├──  timer.jsx
│  │  ├──  tools.css
│  │  └──  tools.jsx
│  ├──  index.css
│  └──  main.jsx
├──  src-tauri
│  ├──  .gitignore
│  ├──  Cargo.lock
│  ├──  Cargo.toml
│  ├──  build.rs
│  ├──  capabilities
│  │  └──  default.json
│  ├──  icons
│  │  ├──  // contains app icons
│  ├──  src
│  │  ├──  buddy_chat
│  │  │  └──  mod.rs
│  │  ├──  functions.rs
│  │  ├──  lib.rs
│  │  ├──  main.rs
│  │  ├──  reader
│  │  │  └──  mod.rs
│  │  └──  timer
│  │  ├──  commands.rs
│  │  └──  mod.rs
│  └──  tauri.conf.json
├──  tailwind.config.js
└──  vite.config.js
```
</details>

---

Brief information of each functions:
### [Timer:](https://github.com/AdNarayan07/Students-Hub/tree/master/src-tauri/src/timer)
Reads the list of saved timers from json file and creates a Timer State, a hashmap of Timers. Also, update the file when a timer is created or deleted.

Timer struct has functions to play, pause, start, reset, get data etc.

Front end runs an animation frame to call `get_remaining_ms` command to keep the timers updated. It also contains functions to invoke save, delete, play/pause/reset etc. commands.

When a timer runs out, a desktop notification is sent, using `winrt_notification` crate.

Logic to prevent closing of app is implemented so that when a timer is active, the app runs in bg and closes only when all timers are inactive. This makes sure the user is notified when timer runs out.

### [Reader:](https://github.com/AdNarayan07/Students-Hub/tree/master/src-tauri/src/reader)
Lets the user open a file (currentl supporting `.pdf` and `.epub`). 
Users can also add highlights to the epub file. A metadata `hub.students.adnarayan` is read for UID in epub and if there is none, just add one to it. Then highlights are saved in json file corresponding to the UID.

Frontend uses react-viewer for epub and react-pdf-viewer for pdfs.

### [Buddy Chat:](https://github.com/AdNarayan07/Students-Hub/tree/master/src-tauri/src/buddy_chat)

Fetches groq API to generate content using an LLM.
Saves the chat history.

Frontend enables the users to interact with API and delete the chats as well.
From the reader section, user can provide reference data after selecting a text and right click, and select "Ask Buddy" option.


## How to get Groq API Key
1. Head to https://console.groq.com/ and login to you account.
![login to groq](https://github.com/AdNarayan07/Students-Hub/blob/master/markdown_resources/groq-login.png)
2. Go to https://console.groq.com/keys after login and create a new API key.
![generate API key](https://github.com/AdNarayan07/Students-Hub/blob/master/markdown_resources/groq-generate-api-key.png)
3. Copy the key and keep it safe. It won't be shown again.