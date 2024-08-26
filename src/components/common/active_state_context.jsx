/*
  file to manage shared states across all components (plus a custom uuid generator)
*/

import { createContext, useState, useContext, useEffect } from "react";

const ActiveStateContext = createContext();

// generate a custom uuid
export function generateUUIDWithTimestamp() {
  function randomValue() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  const timestamp = Date.now().toString(16);
  return `${timestamp}-${randomValue()}-${randomValue()}-${randomValue()}-${randomValue()}${randomValue()}${randomValue()}`;
}

export const ActiveStateProvider = ({ children }) => {
  const [currentPage, setCurrentPage] = useState("tools"); // which page is showing currently
  const [currentTool, setCurrentTool] = useState("timer"); // which tool is showing currently
  const [activeChatId, setActiveChatId] = useState(generateUUIDWithTimestamp()); // currently active chat (for chatbot)
  const [referenceData, setReferenceData] = useState(null); // reference data for chatbot
  const [installedFonts, setInstalledFonts] = useState([]); // installled fonts in system
  const [invokeOnClose, setInvokeOnClose] = useState(null); // ideally it should be an array of invoke calls, but currently this is being used on only one command so let it be a single value for now

  // current system theme state
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const [darkTheme, setDarkTheme] = useState(mediaQuery.matches);
  useEffect(() => {
    mediaQuery.addEventListener("change", () =>
      setDarkTheme(mediaQuery.matches)
    );
  }, []);

  return (
    <ActiveStateContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        currentTool,
        setCurrentTool,
        installedFonts,
        setInstalledFonts,
        activeChatId,
        setActiveChatId,
        referenceData,
        setReferenceData,
        invokeOnClose,
        setInvokeOnClose,
        darkTheme,
      }}
    >
      {children}
    </ActiveStateContext.Provider>
  );
};

export const useActiveState = () => {
  return useContext(ActiveStateContext);
};
