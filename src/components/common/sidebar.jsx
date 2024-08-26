/*
 Side bar to navigate between pages (tools, reader and chatbot)
*/

import { useActiveState } from "./active_state_context";
import "./sidebar.css";

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useActiveState();

  return (
    <div className={`sidebar fixed top-0 left-0 w-20 h-screen`}>
      <button
        className={`sidebar_button z-[-10] absolute top-2.5 left-[-2rem] p-2 dark:bg-gray-700 bg-gray-300 rounded-full`}
      >
        <img
          src="images/menu-svgrepo-com.svg"
          alt="Expand"
          className="w-6 h-6"
        />
      </button>
      <div className="w-full h-full bg-gray-300 dark:bg-gray-800 flex flex-col shadow-[4px_0_6px_rgba(0,0,0,0.1)]">
        <div className="flex-grow">
          <div className="p-4">
            <ul className="space-y-4">
              <li>
                <button
                  onClick={() => setCurrentPage("tools")}
                  className={`flex shadow-lg items-center p-2 w-full rounded-lg ${
                    currentPage === "tools"
                      ? "dark:bg-gray-600 bg-gray-100"
                      : "dark:hover:bg-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <img src="images/tools-svgrepo-com.svg" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage("reader")}
                  className={`flex shadow-lg items-center p-2 w-full rounded-lg ${
                    currentPage === "reader"
                      ? "dark:bg-gray-600 bg-gray-100"
                      : "dark:hover:bg-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <img src="images/book-svgrepo-com.svg" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentPage("chatbot")}
                  className={`flex shadow-lg items-center p-2 w-full rounded-lg ${
                    currentPage === "chatbot"
                      ? "dark:bg-gray-600 bg-gray-100"
                      : "dark:hover:bg-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <img src="images/chat-bot-svgrepo-com.svg" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
