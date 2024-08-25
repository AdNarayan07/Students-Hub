import {
  useActiveState,
  generateUUIDWithTimestamp,
} from "./active_state_context";

import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

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
            writeText(selectedText)
              .catch((err) => alert("Failed to copy selection: " + err));

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
            writeText(selectedText)
              .catch((err) => alert("Failed to copy selection: " + err));

            inputElement.focus();

            selection.collapseToEnd();
            setContextMenu(null);
          }}
        >
          Copy
        </li>
        <li
          className="cursor-pointer px-4 py-2 text-sm hover:bg-gray-700 rounded"
          onClick={async () => {

            let clipboardText = await readText();

            const originalText = inputElement.value;

            const start = inputElement.selectionStart;
            const end = inputElement.selectionEnd;

            const newValue =
              originalText.slice(0, start) +
              clipboardText +
              originalText.slice(end);
            inputElement.value = newValue;
            const newCursorPosition = start + clipboardText.length;
            inputElement.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );

            selection.collapseToEnd();
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
