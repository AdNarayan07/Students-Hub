import { invoke } from "@tauri-apps/api/core";

import { useActiveState } from "./active_state_context";
import { useEffect } from "react";
let timers = new Map();

window.play_pause_start_timer = async function (id) {
  if (timers.get(id)?.active) {
    timers.get(id).paused = await invoke("timer_play_pause", { id });
  } else {
    const response = await invoke("start_timer", { id });
    if (response === null) {
      alert("No timer found in the backend with this id!");
    }
    timers.get(id).active = response;
    timers.get(id).paused = false;
  }
  fetch_and_display_timers(id);
};

window.reset_timer = async function (id) {
  const response = await invoke("reset_timer", { id });
  if (response === null)
    return alert("No timer found in the backend with this id!");
  fetch_and_display_timers(id);
  timers.get(id).active = response;
};

window.delete_timer = async function (id) {
  const response = await invoke("del_timer", { id });
  if (response === null) return alert("Couldn't delete timer!");
  document.getElementById("timer" + id).remove();
  timers.delete(id);
  show_hide_new_timer_button(timers);
};

function show_hide_new_timer_button(timers) {
  if (
    !document.getElementById("show_hide_create_timer_button") ||
    !document.getElementById("create_timer_form")
  )
    return;
  if (timers.size < 10) {
    document.getElementById("show_hide_create_timer_button").style.display = "";
    document.getElementById("create_timer_form").style.display = "";
  } else {
    document.getElementById("show_hide_create_timer_button").style.display =
      "none";
    document.getElementById("create_timer_form").style.display = "none";
  }
}

async function fetch_and_display_timers(timer_id = undefined) {
  const timers_string = await invoke("get_timers", { type: "Default" });
  timers = new Map(JSON.parse(timers_string));
  const timersList = document.getElementById("timers");
  if (!timersList) return ``;
  if (!timer_id) timersList.innerHTML = "";
  if (!timers.size)
    return (timersList.innerHTML = `
    <li class="col-span-full flex items-center justify-center">
        <div class="relative flex items-center justify-center p-4 rounded-lg shadow-lg bg-gray-100 dark:bg-gray-800 dark:text-gray-200">
            <div class="text-xl flex items-center">
                No Timers! Click 
                <div class="relative inline-flex mx-2 dark:bg-blue-900 dark:outline-white bg-blue-100 outline-2 p-1.5 rounded-full h-10 w-10">
                <svg viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z" class="fill-[black] dark:fill-[white]"/></svg>
                </div> 
                to add one!!
            </div>
        </div>
    </li>`);
  timers.forEach((timer, id) => {
    if (timer_id && timer_id != id) return;
    const duration = formatDuration(timer.duration);
    let li = document.getElementById("timer" + id);
    if (!li) {
      li = document.createElement("li");
      li.id = "timer" + id;
      li.className =
        "relative bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col items-center";
      timersList.appendChild(li);
    } else {
      li.innerHTML = ``;
    }
    if (!timer.active) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className =
        "absolute right-2 top-2 reset-btn dark:bg-red-1100 hover:outline bg-red-100 outline-1 p-2 rounded-full";
      deleteBtn.addEventListener("click", () => delete_timer(id));
      const deleteImg = document.createElement("img");
      deleteImg.src = "images/bin-svgrepo-com.svg";
      deleteImg.className = "h-[1rem] w-[1rem]";
      deleteBtn.appendChild(deleteImg);
      li.appendChild(deleteBtn);
    }
    const nameElem = document.createElement("h3");
    nameElem.className = "text-xl w-full";
    nameElem.textContent = timer.name;
    li.appendChild(nameElem);

    const durationElem = document.createElement("div");
    durationElem.className =
      "duration flex items-center justify-center space-x-1 overflow-x-auto p-2 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md my-6";
    durationElem.innerHTML = duration;
    li.appendChild(durationElem);

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "mt-2 flex";

    const playPauseBtn = document.createElement("button");
    playPauseBtn.className =
      "play-pause-btn dark:bg-blue-1100 bg-blue-100 hover:bg-blue-1000 hover:outline outline-1 p-4 rounded-full mr-2";
    playPauseBtn.addEventListener("click", () => play_pause_start_timer(id));
    const playPauseImg = document.createElement("img");
    playPauseImg.src = `images/${
      timer.paused ? "play" : "pause"
    }-svgrepo-com.svg`;
    playPauseImg.className = "h-[1.5rem] w-[1.5rem]";
    playPauseBtn.appendChild(playPauseImg);
    buttonContainer.appendChild(playPauseBtn);

    const resetBtn = document.createElement("button");
    resetBtn.className =
      "reset-btn dark:bg-red-1100 hover:outline bg-red-100 outline-1 p-4 rounded-full";
    resetBtn.addEventListener("click", () => reset_timer(id));
    const resetImg = document.createElement("img");
    resetImg.src = "images/reset-svgrepo-com.svg";
    resetImg.className = "h-[1.5rem] w-[1.5rem]";
    resetBtn.appendChild(resetImg);
    buttonContainer.appendChild(resetBtn);

    li.appendChild(buttonContainer);
  });
  show_hide_new_timer_button(timers);
}

function formatDuration(duration) {
  const totalSeconds = duration.secs;
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds / 60) % 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const centiseconds = String(Math.floor(duration.nanos / 10000000)).padStart(
    2,
    "0"
  ); // Convert nanos to centiseconds
  const span = `<span class="text-4xl font-bold  bg-gray-300 dark:bg-gray-700 px-2 py-1 rounded-md">`;
  return `
        ${span}${hours[0]}</span>
        ${span}${hours[1]}</span>
        <span class="text-3xl font-bold text-gray-700 dark:text-gray-400">:</span>
        ${span}${minutes[0]}</span>
        ${span}${minutes[1]}</span>
        <span class="text-3xl font-bold text-gray-700 dark:text-gray-400">:</span>
        ${span}${seconds[0]}</span>
        ${span}${seconds[1]}</span>
        <span class="text-2xl font-bold text-gray-700 dark:text-gray-400 bg-gray-300 dark:bg-gray-700 px-1 py-1 rounded-md ml-2 mt-1.5">.${centiseconds}</span>
    `;
}

function updateDisplay() {
  if (timers && timers.size) {
    timers.forEach(async (timer, id) => {
      if (timer.active && !timer.paused) {
        const remaining_ms = await invoke("get_remaining_ms", {
          id: parseInt(id),
        });
        if (remaining_ms == 0) {
          fetch_and_display_timers(id);
        } else {
          const secs = Math.floor(remaining_ms / 1000);
          const nanos = (remaining_ms % 1000) * 1000000;
          const formatted_duration = formatDuration({ secs, nanos });
          let duration_container = document.querySelector(
            `li#timer${id} > div.duration`
          );
          if (duration_container)
            duration_container.innerHTML = formatted_duration;
        }
      }
    });
  }

  requestAnimationFrame(updateDisplay);
}

function selectAllContent(element) {
  const range = document.createRange();
  const selection = window.getSelection();

  selection.removeAllRanges();

  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA")
    return element.select();

  range.selectNodeContents(element);
  selection.addRange(range);
}

function digit_change(direction, target, upto5 = false) {
  target = document.getElementById(target);
  let current_digit = parseInt(target.value);

  let next_digit;
  if (direction === "up") {
    next_digit = (current_digit + 1) % (upto5 ? 6 : 10);
  } else if (direction === "down") {
    next_digit = (current_digit - 1 + (upto5 ? 6 : 10)) % (upto5 ? 6 : 10);
  }
  target.value = next_digit;
}

function show_hide_create_timer_form() {
  let button = document.getElementById("show_hide_create_timer_button");
  let form = document.getElementById("create_timer_form");
  let force_rotate = form.classList.toggle("hidden");
  button.classList.toggle("rotate-[225deg]", !force_rotate);
  button.classList.toggle("bg-red-100", !force_rotate);
  button.classList.toggle("dark:bg-red-900", !force_rotate);
  button.classList.toggle("bg-blue-100", force_rotate);
  button.classList.toggle("dark:bg-blue-900", force_rotate);
  Array.from(document.getElementsByClassName("digit_span")).forEach(
    (e) => (e.value = "0")
  );
  let name_field = document.getElementById("new_timer_name");
  name_field.focus();
  name_field.value = "New Timer";
}

function handle_keydown(event, upto5) {
  selectAllContent(event.target);
  switch (event.key) {
    case "ArrowUp":
      event.preventDefault();
      digit_change("up", event.target.id, upto5);
      break;

    case "ArrowDown":
      event.preventDefault();
      digit_change("down", event.target.id, upto5);
      break;

    case "Enter":
      event.preventDefault();
      document.getElementById("new_timer_create").focus();
      break;

    default:
      break;
  }
}

async function create_timer(h10, h1, m10, m1, s10, s1, name) {
  let hours = parseInt(h10 + h1);
  let minutes = parseInt(m10 + m1);
  let seconds = parseInt(s10 + s1);

  let total_seconds = hours * 3600 + minutes * 60 + seconds;
  if (total_seconds >= 100 * 3600) return alert("limit exceeded");
  if (!total_seconds) return alert("Zero Time!");
  await invoke("create_timer", {
    type: "Default",
    seconds: total_seconds,
    name,
  });
  await fetch_and_display_timers();
  show_hide_create_timer_form();
}

export default function Timer() {
  const { currentTool } = useActiveState();

  useEffect(() => {
    fetch_and_display_timers();
    requestAnimationFrame(updateDisplay);
  }, []);

  function DigitInput({ id, nextId, upto5 }) {
    const handleBeforeInput = (event) => {
      if (!/^\d*$/.test(event.data)) event.preventDefault();
    };

    function handle_input(event) {
      if (upto5 && parseInt(event.nativeEvent.data) > 5) event.data = 5;
      let next_element = document.getElementById(nextId);
      if (next_element) next_element.focus();
      else selectAllContent(event.target);
      if (event.data) event.target.value = event.data;
    }

    return (
      <div className="flex flex-col items-center justify-center font-bold">
        <button onClick={() => digit_change("up", id, upto5)}>
          <img src="images/arrow-up-svgrepo-com.svg" className="h-8 w-8" />
        </button>
        <input
          autoComplete="off"
          defaultValue={0}
          id={id}
          className="w-[1em] digit_span text-4xl bg-gray-300 dark:bg-gray-700 px-2 py-1 rounded-md"
          onInput={handle_input}
          onBeforeInput={handleBeforeInput}
          onFocus={(event) => event.target.select()}
          onClick={(event) => event.target.select()}
          onPaste={(event) => event.preventDefault()}
          onKeyDown={(event) => handle_keydown(event, upto5)}
        />
        <button
          onClick={() => digit_change("down", id, upto5)}
          className="rotate-180"
        >
          <img src="images/arrow-up-svgrepo-com.svg" className="h-8 w-8" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="timer_container"
      className={
        currentTool === "timer"
          ? "relative w-full h-full overflow-auto inset-0 flex flex-col"
          : "hidden"
      }
    >
      <ul
        id="timers"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 m-4"
      ></ul>
      <button
        id="show_hide_create_timer_button"
        onClick={show_hide_create_timer_form}
        className="fixed right-10 bottom-10 z-10 dark:bg-blue-900 hover:outline dark:outline-white bg-blue-100 outline-2 p-1.5 rounded-full transition-all duration-500"
      >
        <svg
          viewBox="0 -0.5 25 25"
          className="h-10 w-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z"
            className="fill-[black] dark:fill-[white]"
          />
        </svg>
      </button>

      <div
        id="create_timer_form"
        className="z-[2] hidden fixed inset-0 flex items-center justify-center backdrop-blur-xl"
      >
        <div className="relative flex flex-col items-center bg-black/10 dark:bg-white/5 p-20 rounded-lg shadow-md">
          <h4 className="absolute top-0 left-0 px-4 py-2 w-full bg-gray-400 dark:bg-black rounded-t-lg text-sm">
            Create New Timer
          </h4>
          <div className="relative flex items-center">
            <input
              autoComplete="off"
              id="new_timer_name"
              defaultValue="New Timer"
              type="text"
              className="text-base font-semibold p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-300 pr-10"
              onFocus={(event) => event.target.select()}
              onKeyDown={(e) => {
                if (e.key === "Enter") document.getElementById("h10").focus();
              }}
            />
            <img
              src="images/edit-svgrepo-com.svg"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4"
            />
          </div>

          <div className="duration flex items-center justify-center space-x-1 overflow-x-auto p-2 bg-gray-200 dark:bg-gray-900 rounded-lg shadow-md my-6">
            <DigitInput id="h10" nextId="h1" />
            <DigitInput id="h1" nextId="m10" />
            <span className="text-3xl font-bold text-gray-700 dark:text-gray-400">
              :
            </span>
            <DigitInput id="m10" nextId="m1" upto5={true} />
            <DigitInput id="m1" nextId="s10" />
            <span className="text-3xl font-bold text-gray-700 dark:text-gray-400">
              :
            </span>
            <DigitInput id="s10" nextId="s1" upto5={true} />
            <DigitInput id="s1" nextId="new_timer_create" />
          </div>

          <button
            id="new_timer_create"
            onClick={() =>
              create_timer(
                document.getElementById("h10").value,
                document.getElementById("h1").value,
                document.getElementById("m10").value,
                document.getElementById("m1").value,
                document.getElementById("s10").value,
                document.getElementById("s1").value,
                document.getElementById("new_timer_name").value
              )
            }
            className="dark:bg-blue-1100 bg-blue-100 hover:bg-blue-1000 hover:outline outline-2 p-2 rounded-full"
          >
            <img src="images/tick-svgrepo-com.svg" className="h-8 w-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
