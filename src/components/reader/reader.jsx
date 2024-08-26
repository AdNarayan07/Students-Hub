/*
 Reader component, currently supports pdf and epub
*/

import { useEffect, useState, lazy } from "react";
import { useActiveState } from "../common/active_state_context";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { confirm } from "@tauri-apps/plugin-dialog";
const EpubViewer = lazy(() => import("./epub"));
const PdfViewer = lazy(() => import("./pdf"));

export default function Reader() {
  const { currentPage } = useActiveState();

  const [FilePath, setFilePath] = useState(null);
  const [FileName, setFileName] = useState(null);
  const [ePubData, set_ePubData] = useState(null);

  // function to get epub data (highlights and titile)
  const get_ePubData = async (path) => {
    try {
      const response = await invoke("e_pub_data_get", { path }); // invoke e_pub_data_get
      let data = {};
      data.uid = response[0];
      data.title = response[1];
      data.highlights = JSON.parse(response[2]);
      set_ePubData(data);
    } catch (error) {
      console.error("Couldn't Load Highlights: ", error);
    }
  };

  // get epub data if filepath/name is changed and the new one is an epub
  useEffect(() => {
    if (FilePath && FileName?.toLowerCase().endsWith(".epub")) {
      get_ePubData(FilePath);
    }
  }, [FilePath, FileName]);

  // function to load file path and name
  const loadFile = async () => {
    try {
      const response = await invoke("open_file_dialog"); // invokes the command to open a file select dialog
      setFileName(response.name);

      // loading very large files is causing application to crash so added this check
      if (response.size / (1024 * 1024) > 100) {
        let continueLoading = await confirm(
          "Loading files larger than 100MB may cause the application to crash. Wanna continue?"
        );
        if (continueLoading) {
          setFilePath(response.path);
        }
      } else setFilePath(response.path);
    } catch (error) {
      console.error("Failed to open PDF:", error);
    }
  };
  
  return (
    <div
      className={
        currentPage === "reader"
          ? "fixed inset-0 flex flex-col"
          : "hidden" + " tools"
      }
    >
      <h1
        data-tauri-drag-region
        className="w-screen flex items-center text-3xl text-[#00002b] font-medium bg-gradient-to-r from-white to-gray-200 py-3 px-20 shadow-lg dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-[#efefff]"
      >
        <img
          src="images/book-svgrepo-com.svg"
          className="h-8 w-8 transform translate-y-0.5"
          alt="Tools Icon"
        />
        <span className="ml-2">Reader</span>
      </h1>
      <div className="flex-1 overflow-hidden inset-0">
        {!FilePath && (
          <div className="flex items-center justify-center w-full h-full">
            <div
              onClick={loadFile}
              className="w-1/2 h-[75%] flex flex-col items-center justify-center bg-gray-300 dark:bg-gray-800 rounded-lg shadow-lg cursor-pointer hover:bg-[#e9f0f9] dark:hover:bg-[#152030] transition-colors duration-300"
            >
              <div className="flex space-x-4 mb-4">
                <img src="images/pdf-file-svgrepo-com.svg" className="h-40" />
                <img src="images/epub-svgrepo-com.svg" className="h-40" />
              </div>
              <span className="text-5xl font-semibold">Click to Open</span>
            </div>
          </div>
        )}
        {FilePath && FileName?.toLowerCase().endsWith(".pdf") && (
          <PdfViewer
            url={convertFileSrc(FilePath)}
            setFileName={setFileName}
            setFilePath={setFilePath}
          />
        )}
        {FilePath && FileName?.toLowerCase().endsWith(".epub") && ePubData && (
          <EpubViewer
            url={convertFileSrc(FilePath)}
            setFileName={setFileName}
            setFilePath={setFilePath}
            ePubData={ePubData}
          />
        )}
      </div>
    </div>
  );
}
