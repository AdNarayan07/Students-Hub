/*
  pdf reader component, uses react-pdf to render the pdfs
*/

import { pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

import React, { useEffect, useRef, useState } from "react";
import { Document, Page, Thumbnail, Outline } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

import "./pdf.css";

import { TextSelection } from "../common/custom_context_menu";

const PdfViewer = ({ setFileName, setFilePath, url }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const currentPageNumberInputRef = useRef(null);
  const pdfRef = useRef(null);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [outlines, setOutlines] = useState(null);
  const [outlinesOpen, setOutlinesOpen] = useState(false);
  const documentRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(null);
  const [scale, setScale] = useState(0.666);
  const [rotate, setRotate] = useState(0);
  const thumbnailDivRef = useRef(null);
  const [ContextMenu, setContextMenu] = useState(null);

  // set pdfref on loading
  function onDocumentLoadSuccess(pdf) {
    pdfRef.current = pdf;
  }

  // set outlines if any
  function outlineLoadSuccess(outline) {
    setOutlines(outline);
  }

  useEffect(() => {
    if (!pdfRef.current) return;
    const { numPages } = pdfRef.current;
    setNumPages(numPages);
    setPageNumber(1);
  }, [pdfRef.current]);

  // update the page number input as we navigate through pages
  useEffect(() => {
    if (currentPageNumberInputRef.current)
      currentPageNumberInputRef.current.value = pageNumber;
  }, [pageNumber, currentPageNumberInputRef.current]);


  // scroll to top when jumping to a new page
  useEffect(() => {
    documentRef.current?.scrollTo({ top: 0, behavior: "auto" });
    setTimeout(
      () =>
        thumbnailDivRef.current?.scrollTo({
          top: (pageNumber - 1) * 152,
          behavior: "smooth",
        }),
      100
    );
  }, [pageNumber]);

  // change current page number
  function changePage(offset) {
    setPageNumber((prevPageNumber) => {
      if (!numPages) return prevPageNumber;
      const newPageNumber = prevPageNumber + offset;
      if (newPageNumber > 0 && newPageNumber <= numPages) {
        return newPageNumber;
      } else {
        return prevPageNumber;
      }
    });
  }
  function previousPage() {
    changePage(-1);
  }
  function nextPage() {
    changePage(1);
  }

  // function to call when an item like thumbnail or outline is clicked
  function onItemClick({ dest, pageNumber }) {
    setPageNumber(pageNumber); // set current page as returned from item

    if (!pdfRef.current || !dest) return;
    setTimeout(() => {
      pdfRef.current.getPage(pageNumber).then((page) => {
        const viewport = page.getViewport({ scale: 1 });
        const yOffset = dest[2];

        let scrollTop = 0;
        let scrollLeft = 0;

        // scroll to the destination
        switch (rotate % 360) {
          case 0:
            scrollTop = viewport.height - yOffset;
            scrollLeft = 0;
            break;
          case 180:
            scrollTop = yOffset;
            scrollLeft = 0;
            break;
          case 90:
            scrollTop = 0;
            scrollLeft = yOffset;
          case 270:
            scrollTop = 0;
            scrollLeft = viewport.width - yOffset;
            break;
          default:
            console.warn("Unsupported rotation angle");
        }

        if (documentRef.current) {
          documentRef.current.scrollTo({
            top: scrollTop,
            left: scrollLeft,
            behavior: "smooth",
          });
        }
      });
    }, 10);
  }

  // function to open the doc in fullscreen (currently supports only keyboard input)
  const openFullScreen = () => {
    if (documentRef.current?.requestFullscreen) {
      documentRef.current?.requestFullscreen();
    } else if (documentRef.current?.mozRequestFullScreen) {
      // Firefox
      documentRef.current?.mozRequestFullScreen();
    } else if (documentRef.current?.webkitRequestFullscreen) {
      // Chrome, Safari and Opera
      documentRef.current?.webkitRequestFullscreen();
    } else if (documentRef.current?.msRequestFullscreen) {
      // IE/Edge
      documentRef.current?.msRequestFullscreen();
    }
  };

  // zoom and rotate fn
  function zoomIn() {
    if (scale < 5) setScale(scale * 1.5);
  }
  function zoomOut() {
    if (scale > 0.3) setScale((scale * 10) / 15);
  }

  function rotateClock() {
    setRotate((((rotate + 90) % 360) + 360) % 360);
  }
  function rotateAntiCLock() {
    setRotate((((rotate - 90) % 360) + 360) % 360);
  }

  // adding keydown event listener to document
  useEffect(() => {
    function keydownListener(e) {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            previousPage();
            break;

          case "ArrowRight":
            e.preventDefault();
            nextPage();
            break;

          case "f":
            openFullScreen();
            break;

          default:
            break;
        }
      } else if (e.shiftKey) {
        switch (e.key) {
          case "ArrowLeft":
            if (documentRef.current) documentRef.current.scrollLeft -= 100;
            break;

          case "ArrowRight":
            if (documentRef.current) documentRef.current.scrollLeft += 100;
        }
      }
    }

    document.addEventListener("keydown", keydownListener);
    return () => document.removeEventListener("keydown", keydownListener);
  }, [numPages]);

  // adding keyup listener to document
  useEffect(() => {
    function keyupListener(e) {
      if (e.ctrlKey) {
        switch (e.key) {
          case "+":
            zoomIn();
            break;

          case "=":
            zoomIn();
            break;

          case "-":
            zoomOut();
            break;

          case "]":
            rotateClock();
            break;

          case "[":
            rotateAntiCLock();
            break;

          default:
            break;
        }
        return;
      }
    }
    document.addEventListener("keyup", keyupListener);
    return () => document.removeEventListener("keyup", keyupListener);
  }, [scale, rotate]);

  // resize pdf page when the document div is resized
  useEffect(() => {
    const handleResize = () => {
      if (documentRef.current) {
        setPageWidth(documentRef.current.clientWidth);
      }
    };
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (documentRef.current) {
      resizeObserver.observe(documentRef.current);
    }
    handleResize();
    return () => {
      if (documentRef.current) {
        resizeObserver.unobserve(documentRef.current);
      }
    };
  }, [documentRef.current]);

  // loading thumbnails but only when they come into view to prevent lag
  const ThumbnailWrapper = ({ index, onItemClick }) => {
    const [isVisible, setIsVisible] = useState(false);
    const thumbnailRef = useRef(null);

    useEffect(() => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            const timer = setTimeout(() => {
              setIsVisible(true);
              observer.disconnect();
            }, 10);
            entries[0].target.__timer__ = timer;
          } else {
            clearTimeout(entries[0].target.__timer__);
          }
        },
        { threshold: 0.1 }
      );

      if (thumbnailRef.current) {
        observer.observe(thumbnailRef.current);
      }

      return () => observer.disconnect();
    }, []);

    return (
      <div
        ref={thumbnailRef}
        className="relative m-4 rounded min-h-[120px] bg-black/20 p-[10px]"
      >
        {isVisible && (
          <Thumbnail
            pageNumber={index + 1}
            height={100}
            className={`${
              pageNumber === index + 1 ? "" : "opacity-50"
            } flex justify-center`}
            pdf={pdfRef.current}
            onItemClick={onItemClick}
            loading=""
          />
        )}
        <div
          className={`mt-2 text-sm absolute bottom-2 z-100 bg-black/80 pointer-events-none text-white px-2 py-1 rounded mb-2 left-[50%] transform -translate-x-[50%]`}
        >
          {index + 1}
        </div>
      </div>
    );
  };

  // opening custom contextmenu on contextmenu event
  function oncontextmenu(e) {
    e.preventDefault();
    let selection = document.getSelection();
    if (!selection?.toString()) return setContextMenu(null);
    setContextMenu(
      <TextSelection
        position={{ x: e.screenX, y: e.screenY }}
        selection={selection}
        setContextMenu={setContextMenu}
      />
    );
  }

  return (
    <div
      onClick={() => {
        setContextMenu(null); // remove context menu onclick
      }}
      className="pdfReader relative w-[calc(100%-2rem)] h-[calc(100%-2rem)] m-4 overflow-hidden inset-0 flex flex-col bg-gray-100 dark:bg-gray-900"
    >
      <div className="h-20 flex items-center justify-between p-4 bg-gray-300 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-700 rounded shadow mx-4 mt-2">
        <div className="flex gap-2 items-center">
          <button
            className={`p-3 ${
              thumbnailsOpen ? "dark:bg-gray-600 bg-gray-50" : ""
            } dark:hover:bg-gray-700 hover:bg-gray-400 dark:active:bg-gray-600 active:bg-gray-50 rounded-full transition-background duration-150`}
            onClick={() => {
              setThumbnailsOpen(!thumbnailsOpen);
              setOutlinesOpen(false);
            }}
          >
            <img
              src="images/thumbnail-svgrepo-com.svg"
              alt="Expand"
              className="w-4 h-4"
            />
          </button>
          {outlines && (
            <button
              className={`p-2 ${
                outlinesOpen ? "dark:bg-gray-600 bg-gray-50" : ""
              } dark:hover:bg-gray-700 hover:bg-gray-400 dark:active:bg-gray-600 active:bg-gray-50 rounded-full transition-background duration-150`}
              onClick={() => {
                setOutlinesOpen(!outlinesOpen);
                setThumbnailsOpen(false);
              }}
            >
              <img
                src="images/menu-svgrepo-com.svg"
                alt="Expand"
                className="w-6 h-6"
              />
            </button>
          )}
          <button
            className="dark:hover:bg-gray-700 hover:bg-gray-400 dark:active:bg-gray-600 active:bg-gray-50 rounded-full transition-background duration-150"
            onClick={async () => {
              // close the open file
              setFileName(null);
              setFilePath(null);
            }}
          >
            <svg
              viewBox="0 -0.5 25 25"
              className="h-10 w-10 rotate-45"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z"
                className="fill-[red] stroke-[#610000] dark:stroke-[wheat]"
              />
            </svg>
          </button>
        </div>
        {
          <div className={`flex gap-2 items-center ${!numPages && "hidden"}`}>
            <button
              type="button"
              className="dark:bg-red-1100 dark:hover:bg-gray-700 outline bg-red-100 outline-2 p-3 rounded-full"
              onClick={rotateAntiCLock}
            >
              <img src="images/reset-svgrepo-com.svg" className="w-6 h-6" />
            </button>
            <button
              type="button"
              className="p-2 bg-blue-400 dark:bg-blue-1100 rounded-full shadow-md hover:bg-blue-200 dark:hover:bg-gray-700 outline outline-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:outline-0"
              disabled={pageNumber <= 1}
              onClick={previousPage}
            >
              <img
                src="images/arrow-up-svgrepo-com.svg"
                className="w-8 h-8 -rotate-90"
              />
            </button>
            <p
              className="flex items-center text-lg font-semibold px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm"
              style={{ fontFamily: "monospace" }}
            >
              <input
                ref={currentPageNumberInputRef}
                type="number"
                max={numPages}
                maxLength={String(numPages).length}
                min={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    // accept maximum value not greater than total nunber of pages
                    const value =
                      Math.max(
                        1,
                        Math.min(numPages, parseInt(e.target.value, 10))
                      ) || 1;
                    e.target.value = value;
                    setPageNumber(value);
                    e.target.blur();
                  }
                }}
                onFocus={(e) => {
                  e.target.select();
                }}
                onInput={(e) => {
                  // update width on input
                  e.target.style.width =
                    Math.min(String(e.target.value).length + 3, 10) + "ch";
                }}
                className="dark:bg-blue-1100 bg-blue-700 text-white rounded text-center shadow-lg"
                style={{
                  minWidth: String(numPages).length + 3 + "ch",
                  width: String(numPages).length + 3 + "ch",
                  maxWidth: "10ch",
                  padding: "0 1.5ch",
                }}
              />
              <span className="mx-2"> / </span>
              <span
                className="bg-gray-400 rounded text-center text-black"
                style={{
                  width: String(numPages).length + 3 + "ch",
                  padding: "0 1.5ch",
                }}
              >
                {numPages}
              </span>
            </p>
            <button
              type="button"
              className="p-2 bg-blue-400 dark:bg-blue-1100 rounded-full shadow-md hover:bg-blue-200 dark:hover:bg-gray-700 outline outline-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:outline-0"
              disabled={pageNumber >= numPages}
              onClick={nextPage}
            >
              <img
                src="images/arrow-up-svgrepo-com.svg"
                className="w-8 h-8 rotate-90"
              />
            </button>
            <button
              type="button"
              className="dark:bg-red-1100 dark:hover:bg-gray-700 outline bg-red-100 outline-2 p-3 rounded-full"
              onClick={rotateClock}
            >
              <img
                src="images/reset-svgrepo-com.svg"
                className="w-6 h-6 transform -scale-x-100"
              />
            </button>
          </div>
        }
        {
          <div className="flex gap-2 items-center">
            <span
              type="button"
              className="w-10 h-10 text-center font-bold cursor-pointer rounded bg-black/20"
              onClick={zoomIn}
              style={{ fontSize: "40px", lineHeight: "30px" }}
              disabled={scale >= 3}
            >
              +
            </span>
            <p className="flex items-center text-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md shadow-sm">
              {Math.round(scale * 100)} %
            </p>
            <span
              type="button"
              className="w-10 h-10 text-center font-bold cursor-pointer rounded bg-black/20"
              onClick={zoomOut}
              style={{ fontSize: "40px", lineHeight: "30px" }}
              disabled={scale <= 0.2}
            >
              -
            </span>
          </div>
        }
      </div>

      <div className="relative flex-1 overflow-hidden py-2 px-4">
        {pdfRef.current && (
          <div
            ref={thumbnailDivRef}
            className={`w-60 absolute z-10 ${
              thumbnailsOpen ? "" : `transform -translate-x-[150%]`
            } transition-transform duration-300 h-full overflow-y-scroll dark:bg-gray-800 bg-gray-300 shadow-2xl text-white flex flex-col rounded scroll-smooth`}
          >
            {Array.from({ length: numPages }, (_, index) => (
              <ThumbnailWrapper
                key={index + 1}
                index={index}
                pdf={pdfRef.current}
                onItemClick={onItemClick}
              />
            ))}
          </div>
        )}

        {pdfRef.current && (
          <Outline
            className={`p-4 w-60 absolute z-10 ${
              outlinesOpen ? "" : `transform -translate-x-[150%]`
            } transition-transform duration-300 h-full overflow-y-scroll dark:bg-gray-800 bg-gray-300 shadow-2xl flex flex-col rounded`}
            onItemClick={onItemClick}
            pdf={pdfRef.current}
            onLoadSuccess={outlineLoadSuccess}
          />
        )}
        <div
          className={"flex-1 overflow-auto h-full"}
          onContextMenu={oncontextmenu}
        >
          <Document
            inputRef={documentRef}
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            className={`h-full w-full relative ${
              scale >= 1 ? "" : "flex justify-center"
            }`}
            loading={<img src="images/loading.svg" className="w-[50%] h-full"/>}
            onItemClick={onItemClick}
          >
            <Page
              pageNumber={pageNumber}
              devicePixelRatio={
                // adjust dpr for smaller scales for clear image
                scale >= 1
                  ? window.devicePixelRatio
                  : window.devicePixelRatio * 2
              }
              scale={scale}
              width={pageWidth}
              canvasBackground="white"
              loading={<img src="images/loading.svg" className="w-[50%] h-full"/>}
              rotate={rotate}
            />
          </Document>
        </div>
      </div>
      {ContextMenu}
    </div>
  );
};

export default PdfViewer;
