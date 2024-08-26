import { useActiveState } from "./components/common/active_state_context";
import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// importing components
import Tools from "./components/tools/tools";
import Reader from "./components/reader/reader";
import ChatBot from "./components/chatbot/chatbot";
import Sidebar from "./components/common/sidebar";
import WindowControls from "./components/common/window_controls";

function App() {
  const { setInstalledFonts } = useActiveState();

  // load the names of all installed fonts in system
  useEffect(() => {
    async function loadFonts() {
      try {
        const fonts = await invoke("load_installed_fonts");
        setInstalledFonts(fonts);
      } catch (error) {
        console.error("Failed to load fonts", error);
      }
    }
    loadFonts();
  }, []);

  return (
    <div className="text-black dark:text-white bg-white dark:bg-black">
      <Tools />
      <Reader />
      <ChatBot />
      <Sidebar />
      <WindowControls />
      <div className="hidden rotate-270" />{" "}
      {/*Preloading some tailwind classes which are dynamically used and hance loaded in compile timer*/}
    </div>
  );
}
export default App;
