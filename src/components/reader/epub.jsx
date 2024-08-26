/*
  epub reader component, uses react-reader to display epub files
*/


import { ReactReader, ReactReaderStyle } from "react-reader";
import { useEffect, useState, useRef } from "react";

import { useActiveState } from "../common/active_state_context";
import { TextSelection } from "../common/custom_context_menu";

import { invoke } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
import "./epub.css";

const EpubViewer = ({ url, setFileName, setFilePath, ePubData }) => {
  const { installedFonts, setInvokeOnClose } = useActiveState();
  const [location, setLocation] = useState(null);
  const [fontSize, setFontSize] = useState(
    parseInt(localStorage.getItem("ebookFontSize")) || 16 // load the preferred font size or use default
  );
  const [fontFace, setFontFace] = useState(
    localStorage.getItem("ebookFontFace") || installedFonts[0] // load the preferred font family or use first one in the system installed fonts (only for the book)
  );
  const [highlights, setHighlights] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [undoneActions, setUndoneActions] = useState([]);
  const [ContextMenu, setContextMenu] = useState(null);

  const [mode, setMode] = useState("select");
  const modeRef = useRef(mode);
  const rendition = useRef(undefined);
  // a list of modes and their corresponding icons
  const EpubModes = {
    select: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 16 16"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path d="M10 5h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4v1h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4v1zM6 5V4H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v-1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4z"></path>{" "}
          <path d="M8 1a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13A.5.5 0 0 1 8 1z"></path>{" "}
        </g>
      </svg>
    ),
    "h_#9dff00": (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M5.25 2C4.00736 2 3 3.00736 3 4.25V7.25C3 8.49264 4.00736 9.5 5.25 9.5H18.75C19.9926 9.5 21 8.49264 21 7.25V4.25C21 3.00736 19.9926 2 18.75 2H5.25Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M5 11.75V11H19V11.75C19 12.9926 17.9926 14 16.75 14H7.25C6.00736 14 5 12.9926 5 11.75Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M7.50294 15.5H16.5013L16.5017 16.7881C16.5017 17.6031 16.0616 18.3494 15.36 18.7463L15.2057 18.8259L8.57101 21.9321C8.10478 22.1504 7.57405 21.8451 7.50953 21.3536L7.503 21.2529L7.50294 15.5Z"
            fill="#9dff00"
          ></path>{" "}
        </g>
      </svg>
    ),
    h_green: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M5.25 2C4.00736 2 3 3.00736 3 4.25V7.25C3 8.49264 4.00736 9.5 5.25 9.5H18.75C19.9926 9.5 21 8.49264 21 7.25V4.25C21 3.00736 19.9926 2 18.75 2H5.25Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M5 11.75V11H19V11.75C19 12.9926 17.9926 14 16.75 14H7.25C6.00736 14 5 12.9926 5 11.75Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M7.50294 15.5H16.5013L16.5017 16.7881C16.5017 17.6031 16.0616 18.3494 15.36 18.7463L15.2057 18.8259L8.57101 21.9321C8.10478 22.1504 7.57405 21.8451 7.50953 21.3536L7.503 21.2529L7.50294 15.5Z"
            fill="green"
          ></path>{" "}
        </g>
      </svg>
    ),
    h_blue: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M5.25 2C4.00736 2 3 3.00736 3 4.25V7.25C3 8.49264 4.00736 9.5 5.25 9.5H18.75C19.9926 9.5 21 8.49264 21 7.25V4.25C21 3.00736 19.9926 2 18.75 2H5.25Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M5 11.75V11H19V11.75C19 12.9926 17.9926 14 16.75 14H7.25C6.00736 14 5 12.9926 5 11.75Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M7.50294 15.5H16.5013L16.5017 16.7881C16.5017 17.6031 16.0616 18.3494 15.36 18.7463L15.2057 18.8259L8.57101 21.9321C8.10478 22.1504 7.57405 21.8451 7.50953 21.3536L7.503 21.2529L7.50294 15.5Z"
            fill="blue"
          ></path>{" "}
        </g>
      </svg>
    ),
    h_red: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M5.25 2C4.00736 2 3 3.00736 3 4.25V7.25C3 8.49264 4.00736 9.5 5.25 9.5H18.75C19.9926 9.5 21 8.49264 21 7.25V4.25C21 3.00736 19.9926 2 18.75 2H5.25Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M5 11.75V11H19V11.75C19 12.9926 17.9926 14 16.75 14H7.25C6.00736 14 5 12.9926 5 11.75Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M7.50294 15.5H16.5013L16.5017 16.7881C16.5017 17.6031 16.0616 18.3494 15.36 18.7463L15.2057 18.8259L8.57101 21.9321C8.10478 22.1504 7.57405 21.8451 7.50953 21.3536L7.503 21.2529L7.50294 15.5Z"
            fill="red"
          ></path>{" "}
        </g>
      </svg>
    ),
    h_magenta: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M5.25 2C4.00736 2 3 3.00736 3 4.25V7.25C3 8.49264 4.00736 9.5 5.25 9.5H18.75C19.9926 9.5 21 8.49264 21 7.25V4.25C21 3.00736 19.9926 2 18.75 2H5.25Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M5 11.75V11H19V11.75C19 12.9926 17.9926 14 16.75 14H7.25C6.00736 14 5 12.9926 5 11.75Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M7.50294 15.5H16.5013L16.5017 16.7881C16.5017 17.6031 16.0616 18.3494 15.36 18.7463L15.2057 18.8259L8.57101 21.9321C8.10478 22.1504 7.57405 21.8451 7.50953 21.3536L7.503 21.2529L7.50294 15.5Z"
            fill="magenta"
          ></path>{" "}
        </g>
      </svg>
    ),
    erase: (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g id="SVGRepo_bgCarrier"></g>
        <g id="SVGRepo_tracerCarrier"></g>
        <g id="SVGRepo_iconCarrier">
          {" "}
          <path
            d="M21.0303 22H13.9902C13.5702 22 13.2402 21.66 13.2402 21.25C13.2402 20.84 13.5802 20.5 13.9902 20.5H21.0303C21.4503 20.5 21.7803 20.84 21.7803 21.25C21.7803 21.66 21.4503 22 21.0303 22Z"
            fill="currentColor"
          ></path>{" "}
          <path
            d="M15.41 16.3401L10.66 21.0901C9.54997 22.2001 7.77002 22.2601 6.59002 21.2701C6.52002 21.2101 6.46002 21.1501 6.40002 21.0901L5.53003 20.2201L3.73999 18.4301L2.88 17.5701C2.81 17.5001 2.75 17.4301 2.69 17.3601C1.71 16.1801 1.78 14.4201 2.88 13.3201L6.57 9.64008L7.63 8.58008L15.41 16.3401Z"
            fill="#c39cae"
          ></path>{" "}
          <path
            d="M21.1208 10.6399L15.4108 16.3399L7.63086 8.57994L13.3409 2.87994C14.5109 1.70994 16.4308 1.70994 17.6008 2.87994L21.1208 6.38994C22.2908 7.55994 22.2908 9.46994 21.1208 10.6399Z"
            fill="currentColor"
          ></path>{" "}
        </g>
      </svg>
    ),
  };

  // function to add to highlights
  function setRenderSelection(cfiRange, contents) {
    if (rendition.current && modeRef.current.startsWith("h")) { // if highlight mode is on then only apply highlight
      try {
        setHighlights((list) => {
          const newSelection = {
            color: modeRef.current.split("_")[1],
            cfiRange,
          };

          // do not add same highlight range twice
          const alreadyExists = list.some(
            (item) => item.cfiRange === newSelection.cfiRange
          );
          if (!alreadyExists) {
            // add the "add" highlighlights action to recent actions
            setRecentActions((list) =>
              list.concat({ action: "add", data: newSelection })
            );
            return list.concat(newSelection);
          }
          return list;
        });

        // clear the selections
        const selection = contents.window.getSelection();
        selection?.removeAllRanges();
        setUndoneActions([]); // clear the undone actions (i.e. nothing to redo)
      } catch (e) {
        console.error(e);
      }
    }
  }

  //function to re-render annotations (highlights)
  let reRenderAnnotations = () => {
    try {
      rendition.current
        ?.views()
        .forEach((view) => (view.pane ? view.pane.render() : null));
    } catch (e) {
      console.error(e);
    }
  };

  // change font face and size then re-render annotations
  useEffect(() => {
    rendition.current?.themes.fontSize(fontSize + "px");
    rendition.current?.themes.override("font-family", fontFace);
    reRenderAnnotations();
  }, [fontSize, fontFace]);

  // reset onselected listener when mode is changed
  useEffect(() => {
    modeRef.current = mode;
    rendition.current
      ?.views()
      ?._views[0]?.document?.body?.setAttribute("class", mode);
    document?.body?.classList?.toggle("erase-mode", mode === "erase");
    rendition.current?.off("selected", setRenderSelection); // Remove old listener
    rendition.current?.on("selected", setRenderSelection); // Add new listener
    return () => rendition.current?.off("selected", setRenderSelection); // Cleanup listener on unmount
  }, [mode]);

  // render updated highlights when a highlight is added or removed
  useEffect(() => {
    try {
      // clear prev highlights
      Object.entries(
        rendition?.current?.annotations?._annotations || {}
      )?.forEach((value) => {
        const { type, cfiRange } = value[1];
        rendition?.current?.annotations?.remove(cfiRange, type);
      });

      // add new highlights
      highlights?.forEach((selection) => {
        if (!selection) return;
        const { color, cfiRange } = selection;
        rendition.current?.annotations?.add(
          "highlight",
          cfiRange,
          {},
          (e) => {
            // if current mode is erase, remove the highlight on click
            if (modeRef.current === "erase") {
              setHighlights((list) =>
                list.filter(
                  (item) =>
                    !(item.color === color && item.cfiRange === cfiRange)
                )
              );
              // add the remove action to list of recent actions
              setRecentActions((list) =>
                list.concat({ action: "remove", data: { color, cfiRange } })
              );
            }
          },
          "hl",
          { fill: color, "fill-opacity": "0.25", "mix-blend-mode": "normal" }
        );
      });
    } catch (e) {
      console.error(e);
    } finally {
      // set the invokeOnClose command so that if close button is pressed, the highlights will be saved before closing
      setInvokeOnClose({
        name: "e_pub_highlight_save",
        args: { uid: ePubData.uid, data: JSON.stringify(highlights) },
      });
    }
    return () => {
      setInvokeOnClose(null); // set the command to null on dismount
    };
  }, [highlights]);

  const readerStyles = {
    ...ReactReaderStyle,
    tocButtonExpanded: {
      ...ReactReaderStyle.tocButtonExpanded,
      background: "#0000",
    },
  };

  // function to change font size
  function changeFontSize(amount) {
    let newFontSize = fontSize + amount;
    if (newFontSize < 10 || newFontSize > 36) return; // limit the range of font size
    setFontSize(newFontSize);
    localStorage.setItem("ebookFontSize", newFontSize);
  }

  // undo recent action
  const undo = () => {
    if (!recentActions?.length) return;
    try {
      let clonedRecentActions = Array.from(recentActions);
      let removedRecentAction = clonedRecentActions.pop(); // gets the most recent action + removes it from original array
      if (!removedRecentAction) return;

      const { action, data } = removedRecentAction;
      setHighlights((list) => {
        // if recent action was remove, add the highlight back and vice versa, if it was clear, add all cleared highlights back
        if (action === "remove") return list.concat(data);
        if (action === "add")
          return list.filter((item) => !(item.cfiRange === data.cfiRange));
        if (action === "clear") return data;
        return list;
      });

      // update the recent and undone actions
      setRecentActions(clonedRecentActions);
      setUndoneActions((list) => list.concat(removedRecentAction));
    } catch (e) {
      console.error(e);
    }
  };

  // redo recent undone actions
  const redo = () => {
    try {
      if (!undoneActions?.length) return;
      let clonedUndoneActions = Array.from(undoneActions);
      let removedUndoneSelection = clonedUndoneActions.pop(); // gets the most recent undone action + removes it from original array
      if (!removedUndoneSelection) return;

      const { action, data } = removedUndoneSelection;
      setHighlights((list) => {
        // if undone action was add, add the highlight back and vice versa, if it was clear, again clear them
        if (action === "remove")
          return list.filter((item) => !(item.cfiRange === data.cfiRange));
        if (action === "add") return list.concat(data);
        if (action === "clear") return [];
        return list;
      });

      // update the recent and undone actions
      setUndoneActions(clonedUndoneActions);
      setRecentActions((list) => list.concat(removedUndoneSelection));
    } catch (e) {
      console.error(e);
    }
  };

  // function to clear all highlights
  const clear = async () => {
    try {
      if (!highlights?.length) return;
      let confirmClear = await confirm("Clear All Highlights?"); // confirm it first
      if (confirmClear) {
        setRecentActions((list) =>
          list.concat({ action: "clear", data: highlights }) // add the action to recent actions
        );
        // clear undone actions ang the highlights
        setUndoneActions([]);
        setHighlights([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // hotkeys for undo redo and clear
  useEffect(() => {
    const keyupListener = (e) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case "z":
            undo();
            break;

          case "y":
            redo();
            break;

          case "x":
            clear();
            break;
        }
      }
    };
    document.addEventListener("keyup", keyupListener);
    rendition.current?.on("keyup", keyupListener);
    return () => {
      document.removeEventListener("keyup", keyupListener);
      rendition.current?.off("keyup", keyupListener);
    };
  }, [highlights]);

  // hotkeys for changing font size
  useEffect(() => {
    const keydownListener = (e) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case "+":
            changeFontSize(2);
            break;

          case "=":
            changeFontSize(2);
            break;

          case "-":
            changeFontSize(-2);
            break;
        }
      }
    };
    document.addEventListener("keydown", keydownListener);
    rendition.current?.on("keydown", keydownListener);
    return () => {
      document.removeEventListener("keydown", keydownListener);
      rendition.current?.off("keydown", keydownListener);
    };
  }, [fontSize]);

  return (
    <div
      onClick={() => setContextMenu(null)}
      className="epubReader relative w-[calc(100%-2rem)] h-[calc(100%-2rem)] m-4 overflow-auto inset-0 flex flex-col"
    >
      <div className="h-20 flex items-center space-x-4 p-4 border-b border-gray-300 dark:border-gray-700 shadow-lg w-[calc(100%-2rem)]">
        <div className="flex w-[50%] h-[inherit]">
          <div className="mr-2 flex items-center">
            <button
              className="dark:hover:bg-gray-700 hover:bg-gray-400 dark:active:bg-gray-600 active:bg-gray-50 rounded-full transition-background duration-150"
              onClick={async () => {
                await invoke("e_pub_highlight_save", {
                  uid: ePubData.uid,
                  data: JSON.stringify(highlights),
                });
                setLocation(null);
                setFileName(null);
                setFilePath(null);
              }}
            >
              <svg
                viewBox="0 -0.5 25 25"
                className="h-10 w-10 rotate-45"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z"
                  className="fill-[red] stroke-[#610000] dark:stroke-[wheat]"
                />
              </svg>
            </button>
          </div>
          <div className="z-10 flex xl:items-center h-12 hover:h-max xl:hover:h-12 overflow-hidden gap-4 py-1.5 px-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md transform translate-y-4 xl:overflow-auto flex-col xl:flex-row xl:pt-0 xl:px-4 xl:py-0 xl:translate-x-0">
            {/* mapping through the modes and rendering the buttons */}
            {Object.entries(EpubModes).map(([key, icon]) => (
              <label key={key} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="modeRadio"
                  value={key}
                  checked={mode === key}
                  onChange={() => setMode(key)}
                  className="hidden"
                />
                <div
                  className={`p-2 border rounded-full flex items-center justify-center transition-transform transform
              ${
                mode === key
                  ? "bg-blue-600 text-white dark:bg-blue-1100"
                  : "bg-gray-200 text-gray-900 dark:bg-gray-500 dark:text-[#000141]"
              }
              hover:bg-blue-500 dark:hover:bg-gray-700`}
                >
                  {icon}
                </div>
              </label>
            ))}
          </div>

          <div className="z-10 ml-5 flex xl:items-center h-12 hover:h-max xl:hover:h-12 overflow-hidden gap-4 py-1.5 px-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md transform translate-y-4 xl:overflow-auto flex-col xl:flex-row xl:pt-0 xl:px-4 xl:py-0 xl:translate-x-0">
            {[
              {
                key: "undo",
                action: undo,
                label: (
                  <img
                    src={`images/undo-svgrepo-com.svg`}
                    className="w-5 h-5 min-w-5 min-h-5"
                  />
                ),
              },
              {
                key: "redo",
                action: redo,
                label: (
                  <img
                    src={`images/undo-svgrepo-com.svg`}
                    className="w-5 h-5 min-w-5 min-h-5 transform -scale-x-100"
                  />
                ),
              },
              {
                key: "clear",
                action: clear,
                label: (
                  <img
                    src={`images/bin-svgrepo-com.svg`}
                    className="w-5 h-5 min-w-5 min-h-5"
                  />
                ),
              },
            ].map(({ key, label, action }) => (
              <button
                key={key}
                onClick={action}
                className={`p-2 hover:outline-[1px] outline-0 outline rounded-full flex items-center justify-center transition-transform transform disabled:opacity-50 disabled:outline-0
          ${
            key === "clear"
              ? "dark:bg-red-1100 bg-red-100"
              : "dark:bg-blue-1100 bg-blue-600"
          }
          `}
                disabled={(() => {
                  if (key === "undo") return !recentActions?.length;
                  if (key === "redo") return !undoneActions?.length;
                  if (key === "clear") return !highlights?.length;
                  return false;
                })()}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-row justify-end w-[50%]">
          <button
            disabled={fontSize >= 36}
            onClick={() => changeFontSize(2)}
            className="px-2 py-2 mx-0.5 bg-blue-500 dark:bg-gray-700 rounded-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 dark:hover:bg-gray-800 focus:outline outline-1"
          >
            <svg
              className="h-8 w-8 fill-[white]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m12.81 4.41.068.11.053.114 5.5 14.005a1 1 0 0 1-1.813.837l-.049-.106L15.245 16H8.754L7.431 19.37a1 1 0 0 1-1.186.602l-.11-.037a1 1 0 0 1-.602-1.185l.036-.111 5.5-14.005c.3-.763 1.304-.837 1.741-.223ZM12 7.735l-2.461 6.265h4.921L12 7.734Zm5.683-4.664a.75.75 0 0 1 .636 0l.097.055 2.251 1.496.088.068a.75.75 0 0 1-.821 1.236l-.097-.055L18 4.65l-1.836 1.22-.097.055a.75.75 0 0 1-.82-1.236l.087-.068 2.25-1.496.098-.055Z" />
            </svg>
          </button>
          <button
            disabled={fontSize <= 10}
            onClick={() => changeFontSize(-2)}
            className="px-2 py-2 mx-0.5 bg-blue-500 dark:bg-gray-700 rounded-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 dark:hover:bg-gray-800 focus:outline outline-1"
          >
            <svg
              className="h-7 w-7 fill-[white]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path d="m12.798 7.394.068.104.057.117 3.75 9a1 1 0 0 1-1.795.875l-.051-.105L13.833 15h-3.667l-.993 2.385a1 1 0 0 1-1.197.577l-.11-.039a1 1 0 0 1-.578-1.197l.039-.11 3.75-9c.308-.74 1.28-.813 1.72-.222ZM12 10.6 11 13h2l-1-2.4Zm8.877-7.263a.75.75 0 0 1-.122.971l-.088.069-2.25 1.495a.75.75 0 0 1-.734.055l-.097-.055-2.251-1.495a.75.75 0 0 1 .733-1.304l.097.054 1.836 1.219 1.836-1.219a.75.75 0 0 1 1.04.21Z" />
            </svg>
          </button>
          <select
            id="font-dropdown"
            value={fontFace || ""}
            onChange={(e) => {
              setFontFace(e.target.value);
              localStorage.setItem("ebookFontFace", e.target.value);
              e.target.blur();
            }}
            className="block w-auto ml-10 h-12 p-2.5 text-gray-900 dark:text-gray-300 bg-transparent shadow-lg cursor-pointer"
            style={{ fontFamily: fontFace }}
          >
            {/* map through the installed fonts */}
            {installedFonts.map((option, index) => (
              <option
                key={index}
                value={option}
                style={{ fontFamily: option }}
                className="dark:bg-blue-1100"
              >
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <ReactReader
        url={url}
        location={location}
        locationChanged={(epubcfi) => setLocation(epubcfi)}
        readerStyles={readerStyles}
        title={ePubData.title}
        epubOptions={{
          allowScriptedContent: true,
          stylesheet: document.URL + "/styles/epub.css",
        }}
        getRendition={(_rendition) => {
          rendition.current = _rendition;
          rendition.current.themes.fontSize(fontSize + "px");
          rendition.current.themes.override("font-family", fontFace);
          rendition.current.on("selected", setRenderSelection);
          rendition.current.on("relocated", reRenderAnnotations);
          rendition.current.on("rendered", (_section, iframe) => {
            const document = iframe.document;
            document.addEventListener("contextmenu", (e) => {
              e.preventDefault();
              let selection = document.getSelection();
              if (!selection?.toString()) return setContextMenu(null);
              setContextMenu(
                <TextSelection
                  position={{ x: e.screenX, y: e.screenY }}
                  selection={selection}
                  setContextMenu={setContextMenu}
                />
              );
            });
            document.addEventListener("click", (e) => {
              setContextMenu(null);
            });
            wrapTextNodes();
            function wrapTextNodes(element = document.body) {
              var textNodes = [];
              var xpathResult = document.evaluate(
                "//*/text()",
                document,
                null,
                6,
                null
              );
              for (var i = 0; i < xpathResult.snapshotLength; i++) {
                textNodes.push(xpathResult.snapshotItem(i));
              }
              textNodes.forEach((node) => {
                node.parentNode.classList.add("text-node");
              });
            }
            document?.body?.setAttribute("class", modeRef.current);
          });
          ePubData.highlights?.forEach((selection) => {
            if (!selection) return;
            const { color, cfiRange } = selection;
            setHighlights((list) =>
              list.concat({
                color,
                cfiRange,
              })
            );
          });
        }}
      />
      {ContextMenu}
    </div>
  );
};

export default EpubViewer;
