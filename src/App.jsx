import { useActiveState } from "./components/active_state_context";
import { useEffect, lazy } from "react";
import { invoke } from "@tauri-apps/api/core";

const Tools = lazy(() => import("./components/tools"));
const Reader = lazy(() => import("./components/reader"));
const Sidebar = lazy(() => import("./components/sidebar"));
const ChatBot = lazy(() => import("./components/chatbot"));
const WindowControls = lazy(() => import("./components/window_controls"));

function App() {
  const { setInstalledFonts } = useActiveState();
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
      {/*Preloading some tailwind classes XD*/}
    </div>
  );
}
export default App;
