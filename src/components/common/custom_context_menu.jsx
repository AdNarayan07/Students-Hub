/*
  custom context menu to replace the default one
*/

import {
  useActiveState,
  generateUUIDWithTimestamp,
} from "./active_state_context";

import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

// context menu when a text is selected (but is non editable)
export const TextSelection = ({ position, selection, setContextMenu }) => {
  const { setCurrentPage, setActiveChatId, setReferenceData } =
    useActiveState();

  if (!position.x || !position.y) return null;
  const selectedText = selection.toString();
  return (
    <div
      className="fixed z-40 p-2 bg-transparent backdrop-blur-xl shadow-lg rounded-md"
      style={{
        top: position.y - window.screenY + "px",
        left: position.x - window.screenX + "px",
        mixBlendMode: "difference",
        color: "white",
      }}
      onClick={() => {
        setContextMenu(null);
      }}
      id="textSelectionMenu"
    >
      <ul className="space-y-2">
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={() => {
            // copy the selection
            writeText(selectedText)
              .catch((err) => alert("Failed to copy selection: " + err));
            
            setContextMenu(null);
            selection.removeAllRanges?.();
          }}
        >
          Copy
        </li>
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={() => {
            // go to chat bot page with a new chat and selected text as reference data
            setCurrentPage("chatbot");
            setActiveChatId(generateUUIDWithTimestamp());
            setReferenceData(selectedText);
            setContextMenu(null);
            selection.removeAllRanges?.();
          }}
        >
          Ask Buddy
        </li>
      </ul>
    </div>
  );
};

// context menu for editable text area
export const InputSelection = ({
  position,
  selection,
  inputElement,
  setContextMenu,
}) => {
  if (!position.x || !position.y) return null;
  const selectedText = selection.toString();
  const event = new Event("input", { bubbles: true });

  return (
    <div
      className="fixed z-40 p-2 bg-transparent backdrop-blur-xl shadow-lg rounded-md"
      style={{
        top: position.y - window.screenY - 100 + "px",
        left: position.x - window.screenX + "px",
        mixBlendMode: "difference",
        color: "white",
      }}
      onClick={() => {
        setContextMenu(null);
      }}
      id="textSelectionMenu"
    >
      <ul className="space-y-2">
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={() => {
            // copy the text
            writeText(selectedText)
              .catch((err) => alert("Failed to copy selection: " + err));

            // remove the selection and focus in input
            selection.deleteFromDocument();
            inputElement.focus();

            selection.collapseToStart();
            inputElement.dispatchEvent(event);
            setContextMenu(null);
          }}
        >
          Cut
        </li>
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={() => {
            // copy the text
            writeText(selectedText)
              .catch((err) => alert("Failed to copy selection: " + err));

            inputElement.focus(); // focus in input

            selection.collapseToEnd(); // set cursor at correct location
            setContextMenu(null);
          }}
        >
          Copy
        </li>
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={async () => {
            let clipboardText = await readText(); // read the text from clipboard

            const originalText = inputElement.value;

            const start = inputElement.selectionStart;
            const end = inputElement.selectionEnd;

            // replace the selected text with clipboard text
            const newValue =
              originalText.slice(0, start) +
              clipboardText +
              originalText.slice(end);
            
            // set the new data as input value and set cursor position appropriately
            inputElement.value = newValue;
            const newCursorPosition = start + clipboardText.length;
            inputElement.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );
            selection.collapseToEnd();

            // dispatch input event and focus the element
            inputElement.dispatchEvent(event);
            inputElement.focus();

            setContextMenu(null);
          }}
        >
          Paste
        </li>
      </ul>
    </div>
  );
};
