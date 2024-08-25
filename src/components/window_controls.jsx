import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useState } from "react";
import { useActiveState } from "./active_state_context";

const WindowControls = () => {
  const { invokeOnClose } = useActiveState();
  const [isMaximized, setIsMaximized] = useState(true);
  const minimizeWindow = () => getCurrentWebviewWindow().minimize();
  const toggleMaximization = async () => {
    const isMaximized = await getCurrentWebviewWindow().isMaximized();
    isMaximized
      ? getCurrentWebviewWindow().unmaximize()
      : getCurrentWebviewWindow().maximize();
    setIsMaximized(isMaximized);
  };
  const closeWindow = async () => {
    if (invokeOnClose?.name)
      await invoke(invokeOnClose.name, invokeOnClose.args);
    getCurrentWebviewWindow().close();
  };
  return (
    <div className="flex space-x-2 p-2 fixed top-2 right-2">
      <button
        onClick={minimizeWindow}
        className="w-10 h-8 hover:bg-gray-400 dark:hover:bg-gray-600 rounded flex items-center justify-center"
      >
        <span className="w-3 h-[2px] bg-black dark:bg-white"></span>
      </button>

      <button
        onClick={toggleMaximization}
        className="w-10 h-8 hover:bg-gray-400 dark:hover:bg-gray-600 rounded flex items-center justify-center"
      >
        {
          <img
            src={`images/${
              isMaximized ? "maximize" : "minimize"
            }-svgrepo-com.svg`}
            alt="Expand"
            className="w-6 h-6"
          />
        }
      </button>

      <button
        onClick={closeWindow}
        className="w-10 h-8 hover:bg-red-600 dark:hover:bg-red-800 rounded flex items-center justify-center"
      >
        <svg
          viewBox="0 -0.5 25 25"
          className="h-10 w-10 rotate-45"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z"
            className="fill-[black] dark:fill-[white]"
          />
        </svg>
      </button>
    </div>
  );
};
export default WindowControls;
