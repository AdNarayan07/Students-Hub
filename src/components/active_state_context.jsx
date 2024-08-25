import { createContext, useState, useContext, useEffect } from "react";

const ActiveStateContext = createContext();

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
  const [currentPage, setCurrentPage] = useState("tools");
  const [currentTool, setCurrentTool] = useState("timer");
  const [activeChatId, setActiveChatId] = useState(generateUUIDWithTimestamp());
  const [referenceData, setReferenceData] = useState(null);
  const [installedFonts, setInstalledFonts] = useState([]);
  const [invokeOnClose, setInvokeOnClose] = useState(null);

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
