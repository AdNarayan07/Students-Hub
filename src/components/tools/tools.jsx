/*
 Tools component (currenly has only one tool, more to come)
*/

import { lazy } from "react";
import { useActiveState } from "../common/active_state_context";
import "./tools.css";
const Timer = lazy(() => import("./timer"));

export default function Tools() {
  const { currentPage, currentTool, setCurrentTool } = useActiveState();
  return (
    <div
      className={
        currentPage === "tools"
          ? "fixed inset-0 flex flex-col"
          : "hidden" + " tools"
      }
    >
      <h1
        data-tauri-drag-region
        className="z-10 w-screen flex items-center text-3xl text-[#00002b] font-medium bg-gradient-to-r from-white to-gray-200 py-3 px-20 shadow-lg dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-[#efefff]"
      >
        <img src="images/tools-svgrepo-com.svg" className="h-8 w-8" />
        <span className="ml-2">Tools</span>
      </h1>
      <div className="tab-container">
        {/* toggle buttons, + placeholder too */}
        <ul className="tabs">
          <li
            className={currentTool === "tool2" ? "active" : ""}
            onClick={() => setCurrentTool("tool2")}
          >
            <div>
              <span>Tool 2</span>
            </div>
          </li>
          <li
            className={currentTool === "tool3" ? "active" : ""}
            onClick={() => setCurrentTool("tool3")}
          >
            <div>
              <span>Tool 3</span>
            </div>
          </li>
          <li
            className={currentTool === "tool4" ? "active" : ""}
            onClick={() => setCurrentTool("tool4")}
          >
            <div>
              <span>Tool 4</span>
            </div>
          </li>
          <li
            className={currentTool === "timer" ? "active" : ""}
            onClick={() => setCurrentTool("timer")}
          >
            <div>
              <img src="images/timer-svgrepo-com.svg" className="h-10 w-10" />
              <span>Timer</span>
            </div>
          </li>
        </ul>
      </div>
      <Timer />
      {/* Placeholder div */}
      <div
        className={
          currentTool === "timer"
            ? "hidden"
            : "flex justify-center items-center text-4xl font-semibold w-full h-64"
        }
      >
        New tools coming soon...
      </div>
    </div>
  );
}
