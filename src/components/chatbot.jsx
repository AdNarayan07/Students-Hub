import { useState, useEffect, useRef } from "react";
import {
  useActiveState,
  generateUUIDWithTimestamp,
} from "./active_state_context";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";

import { InputSelection, TextSelection } from "./custom_context_menu";

import { invoke } from "@tauri-apps/api/core";

const SavedChats = ({ chatHistory, get_chats, setAdditional }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const { activeChatId, setActiveChatId, setReferenceData } = useActiveState();

  return (
    <div
      className={`absolute inset-0 bg-gray-200 dark:bg-gray-900 h-full w-full flex flex-col transform transition-all duration-300
                    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
                    1/2xl:translate-x-0 1/2xl:w-64 z-20`}
    >
      <div className="flex justify-between align-center p-4 text-lg font-semibold border-b border-gray-700">
        <button
          className={`1/2xl:hidden absolute  my-3 top-0 transform ${
            isSidebarOpen
              ? "mx-3 left-0 translate-x-0 rounded-full rotate-45 p-1.5 bg-gray-400 dark:bg-gray-700"
              : "-mx-3 right-0 translate-x-full p-3"
          } text-white shadow-xl`}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? (
            <svg
              viewBox="0 -0.5 25 25"
              className="h-6 w-6"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7.5 11.25a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5Zm0-1.5a.75.75 0 0 0 0 1.5v-1.5Zm5 1.5a.75.75 0 0 0 0-1.5v1.5ZM13.25 12a.75.75 0 0 0-1.5 0h1.5Zm-1.5 5a.75.75 0 0 0 1.5 0h-1.5Zm0-5a.75.75 0 0 0 1.5 0h-1.5Zm1.5-5a.75.75 0 0 0-1.5 0h1.5ZM7.5 12.75h5v-1.5h-5v1.5Zm5 0h5v-1.5h-5v1.5Zm0-.75h-.75V17h1.5V12h-.75Zm.75 0V7h-1.5v5h1.5Z"
                className="fill-[black] dark:fill-[white]"
              />
            </svg>
          ) : (
            <img src="images/menu-svgrepo-com.svg" className="w-6 h-6" />
          )}
        </button>
        <div className="flex items-center justify-center flex-1">
          Saved Chats
        </div>
        <div
          className="transform -scale-x-100 cursor-pointer flex items-center"
          onClick={() => {
            setIsSidebarOpen(false);
            setActiveChatId(generateUUIDWithTimestamp());
            setReferenceData(null);
            setAdditional({ role: null, content: null });
          }}
        >
          ✎
        </div>
      </div>
      <ul className="flex-1 overflow-y-auto">
        {(function () {
          let sortedChatHistory = Object.entries(chatHistory).sort(
            ([_k1, [_t1, modified1]], [_k2, [_t2, modified2]]) =>
              modified2 - modified1
          );
          return sortedChatHistory.length ? (
            sortedChatHistory.map(([id, [title]]) => (
              <li
                key={id}
                onClick={() => {
                  setReferenceData(null);
                  setActiveChatId(id);
                  setIsSidebarOpen(false);
                  setAdditional({ role: null, content: null });
                }}
                onMouseEnter={() => setHoveredItem(id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`relative cursor-pointer p-3 text-sm dark:hover:bg-gray-800 hover:bg-gray-400 transition-colors duration-200 ${
                  activeChatId === id ? "dark:bg-gray-800 bg-gray-400" : ""
                }`}
              >
                {title.replaceAll("*", "")}
                {/* Delete Button */}
                {hoveredItem === id && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await invoke("delete_chat", { id });
                      get_chats();
                      if (id === activeChatId)
                        setActiveChatId(generateUUIDWithTimestamp());
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 dark:bg-red-1100 bg-red-100 p-2 rounded"
                  >
                    <img
                      src="images/bin-svgrepo-com.svg"
                      className="h-[1rem] w-[1rem]"
                    ></img>
                  </button>
                )}
              </li>
            ))
          ) : (
            <li className="relative p-3 text-sm text-center">
              No Chat History
            </li>
          );
        })()}
      </ul>
    </div>
  );
};
export const ChatBox = ({
  setChatHistory,
  chatHistory,
  additional,
  setAdditional,
  setContextMenu,
}) => {
  const { activeChatId, referenceData, darkTheme } = useActiveState();
  const defaultMessage = `You are a student's assistant, user's Buddy. You have to provide accurate information about the asked topics, answer the questions, do calculations and so on. Try to be as concise as possible unless asked. ${
    referenceData
      ? `Here is some data you can use: \`\`\`${referenceData
          .replace(/\s+/g, " ")
          .trim()}\`\`\``
      : ""
  }`;
  const [referenceMessage, setReferenceMessage] = useState({
    role: "reference",
    content: referenceData?.replace(/\s+/g, " ").trim(),
  });
  const [messages, setMessages] = useState([
    { role: "system", content: defaultMessage },
  ]);
  const [currentModel, setCurrentModel] = useState(null);
  const [chatTitle, setChatTitle] = useState("New Chat");
  const sendButton = useRef(null);

  useEffect(() => {
    async function get_chat_data(activeChatId) {
      sendButton.current.disabled = true;
      let prev_chats = await invoke("get_chat_data", {
        activeChatId,
        defaultMessage,
      });
      let system_chat = prev_chats.filter((e) => e.role === "system")[0];
      const refMsg = system_chat?.content?.match(/```(.*?)```/s)?.[1]?.trim();
      setReferenceMessage({ role: "reference", content: refMsg });
      setMessages(prev_chats);
      setChatTitle(
        chatHistory?.[activeChatId]?.[0]?.replaceAll("*", "") || "New Chat"
      );
      sendButton.current.disabled = false;
    }
    if (activeChatId) {
      get_chat_data(activeChatId);
    }
  }, [activeChatId]);

  const LoadingMessage = () => {
    return `<div className="flex items-center mb-4 px-4 rounded max-w-[90%] bg-gray-200 dark:bg-gray-800 self-start">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="w-full h-10"><circle fill="${
                  darkTheme ? "white" : "black"
                }" stroke="${
      darkTheme ? "white" : "black"
    }" stroke-width="11" r="15" cx="40" cy="100"><animate attributeName="opacity" calcMode="spline" dur="1" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate></circle><circle fill="${
      darkTheme ? "white" : "black"
    }" stroke="${
      darkTheme ? "white" : "black"
    }" stroke-width="11" r="15" cx="100" cy="100"><animate attributeName="opacity" calcMode="spline" dur="1" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate></circle><circle fill="${
      darkTheme ? "white" : "black"
    }" stroke="${
      darkTheme ? "white" : "black"
    }" stroke-width="11" r="15" cx="160" cy="100"><animate attributeName="opacity" calcMode="spline" dur="1" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate></circle></svg>
            </div>`;
  };

  const textareaRef = useRef(null);
  const resizeArea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };
  const handleSubmission = async (e) => {
    e.preventDefault();

    let formData = new FormData(e.target);
    let content = formData.get("message").trim().replace("\n", "  \n");
    if (!content) return;
    sendButton.current.disabled = true;
    setAdditional({ role: "assistant", content: LoadingMessage() });
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);

    e.target.reset();
    resizeArea();

    try {
      let [title, msg, model] = await invoke("ask_buddy", {
        activeChatId,
        messages: newMessages,
        title: chatTitle,
      });
      setChatTitle(title.replaceAll("*", ""));
      setMessages([...newMessages, msg]);
      setCurrentModel(model);
      if (setChatHistory)
        setChatHistory((prevHistory) => ({
          ...prevHistory,
          [activeChatId]: [title.replaceAll("*", ""), Date.now()],
        }));
      setAdditional({ role: null, content: null });
    } catch (e) {
      console.error(e);
      setAdditional({ role: "error", content: e + "\n\nPlease Retry!" });
      setMessages(newMessages.slice(0, -1));
    } finally {
      sendButton.current.disabled = false;
    }
  };

  const onkeydown = (e) => {
    if (e.ctrlKey && (e.key === "z" || e.key == "y")) e.preventDefault();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendButton.current?.click();
    }
  };

  const Greet = () => (
    <div className="flex flex-col items-center justify-center h-full bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
      <img src="images/chat-bot-svgrepo-com.svg" className="w-20 h-20" />

      <div className="text-center p-6 max-w-lg">
        <h1 className="text-4xl font-bold mb-4">Hello Buddy!</h1>
        <p className="text-lg mb-6">
          Your personal study companion. Ask me anything, and I'll help you
          understand your subjects better!
        </p>
      </div>
    </div>
  );
  const CodeBlock = ({ rest, language, value }) => {
    const [copying, setCopying] = useState(false);
    return (
      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            navigator.clipboard
              .writeText(value)
              .then(() => {
                setCopying(true);
                setTimeout(() => {
                  setCopying(false);
                }, 1000);
              })
              .catch((err) => alert("Failed to copy code: " + err));
          }}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "#fff1",
            color: "white",
            border: "none",
            padding: "8px 8px",
            cursor: "pointer",
            borderRadius: "4px",
          }}
          disabled={copying}
        >
          {copying ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"
                  stroke="white"
                  strokeWidth="1.5"
                ></path>{" "}
                <path
                  opacity="0.5"
                  d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"
                  stroke="white"
                  strokeWidth="1.5"
                ></path>
                <path
                  d="M6.08008 14.9998L8.03008 16.9498L11.9201 13.0498"
                  transform="translate(4.5 -1.1)"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="SVGRepo_iconCarrier">
                {" "}
                <path
                  d="M6 11C6 8.17157 6 6.75736 6.87868 5.87868C7.75736 5 9.17157 5 12 5H15C17.8284 5 19.2426 5 20.1213 5.87868C21 6.75736 21 8.17157 21 11V16C21 18.8284 21 20.2426 20.1213 21.1213C19.2426 22 17.8284 22 15 22H12C9.17157 22 7.75736 22 6.87868 21.1213C6 20.2426 6 18.8284 6 16V11Z"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                ></path>{" "}
                <path
                  d="M6 19C4.34315 19 3 17.6569 3 16V10C3 6.22876 3 4.34315 4.17157 3.17157C5.34315 2 7.22876 2 11 2H15C16.6569 2 18 3.34315 18 5"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                ></path>{" "}
              </g>
            </svg>
          )}
        </button>
        <SyntaxHighlighter
          {...rest}
          PreTag="pre"
          language={language}
          style={darkTheme ? vscDarkPlus : vs}
          customStyle={{
            backgroundColor: darkTheme ? "#05081b" : "#eef2fb",
            borderRadius: "5px",
          }}
          children={value}
        />
      </div>
    );
  };

  function oncontextmenuDiv(e) {
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

  const Messages = () => (
    <div
      className={
        "flex-1 flex flex-col-reverse items-end overflow-y-scroll overflow-x-hidden p-4 h-full leading-relaxed"
      }
    >
      {[additional, ...messages.slice().reverse(), referenceMessage].map(
        (message, index) =>
          message.role !== "system" &&
          message.content && (
            <div
              key={index}
              onContextMenu={oncontextmenuDiv}
              className={`markdownDiv mb-4 px-4 rounded max-w-[90%] ${
                message.role === "user" &&
                "bg-emerald-200 dark:bg-emerald-900 self-end"
              } ${
                message.role === "assistant" &&
                "bg-gray-200 dark:bg-gray-800 self-start"
              } ${
                message.role === "reference" &&
                "no-scrollbar self-end rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-none text-xs border-l-4 border-l-emerald-300 dark:border-l-emerald-950 pl-6 -mb-2 text-nowrap overflow-x-auto min-h-10 relative flex items-center"
              }`}
              style={(() => {
                const errorStyles = darkTheme
                  ? { backgroundColor: "#4f0000", color: "#ffeeee" }
                  : { backgroundColor: "#ffeeee", color: "#4f0000" };

                const referenceStyles = {
                  WebkitMaskImage:
                    "linear-gradient(90deg, rgba(0, 0, 0, 1) 90%, rgba(0, 0, 0, 0) 100%)",
                  maskImage:
                    "linear-gradient(90deg, rgba(0, 0, 0, 1) 90%, rgba(0, 0, 0, 0) 100%)",
                  backgroundClip: "text",
                };

                if (message.role === "error")
                  return { ...errorStyles, userSelect: "text" };
                else if (message.role === "reference")
                  return { ...referenceStyles, userSelect: "text" };
                else return { userSelect: "text" };
              })()}
            >
              {message.role === "reference" && (
                <div
                  className="bg-emerald-300 dark:bg-emerald-950 rounded"
                  style={{
                    padding: "0.2rem 0.5rem",
                    marginLeft: "-1.2rem",
                    marginRight: "0.8rem",
                  }}
                >
                  reference
                </div>
              )}
              <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} style={{ color: "deepSkyBlue" }} />
                  ),
                  img: ({ node, ...props }) => (
                    <img
                      {...props}
                      style={{ maxWidth: "450px", maxHeight: "450px" }}
                    />
                  ),
                  code: ({ node, ...props }) => (
                    <code
                      {...props}
                      style={{
                        backgroundColor: darkTheme ? "#00000078" : "#00000028",
                        padding: "5px 8px",
                        borderRadius: "5px",
                      }}
                    />
                  ),
                  blockquote: ({ node, ...props }) => (
                    <blockquote
                      {...props}
                      style={{
                        borderLeft: "3px solid",
                        margin: "0",
                        paddingLeft: "10px",
                        borderRadius: "3px",
                      }}
                    />
                  ),

                  table: ({ node, ...props }) => (
                    <table
                      {...props}
                      className="divide-y divide-x divide-gray-800 dark:divide-gray-100 border"
                      style={{
                        minWidth: "100%",
                        border: "2px solid",
                        margin: "12px 0",
                      }}
                    />
                  ),
                  thead: ({ node, ...props }) => (
                    <thead {...props} style={{ padding: "16px" }} />
                  ),
                  tbody: ({ node, ...props }) => (
                    <tbody
                      {...props}
                      className="divide-y divide-x divide-gray-800 dark:divide-gray-100"
                    />
                  ),
                  th: ({ node, ...props }) => (
                    <th
                      {...props}
                      style={{
                        ...props.style,
                        padding: "8px 16px",
                        whiteSpace: "nowrap",
                        fontWeight: "600",
                      }}
                    />
                  ),
                  td: ({ node, ...props }) => (
                    <td
                      {...props}
                      style={{
                        ...props.style,
                        padding: "8px 16px",
                        whiteSpace: "nowrap",
                      }}
                    />
                  ),

                  pre(props) {
                    const { children, node, ...rest } = props;

                    // Extract the className from the child element, which is likely a <code> tag
                    const match = /language-(\w+)/.exec(
                      children?.props?.className || ""
                    );

                    // Extract the actual code content
                    const codeString = children?.props?.children || "";

                    return (
                      <CodeBlock
                        rest={rest}
                        language={match?.[1]}
                        value={codeString}
                      />
                    );
                  },
                }}
              >
                {message.content}
              </Markdown>
              {message.role === "reference" && (
                <div className="w-6 h-1 flex-shrink-0" />
              )}
            </div>
          )
      )}
    </div>
  );

  function oncontextmenuTextArea(e) {
    e.preventDefault();
    let selection = document.getSelection();
    setContextMenu(
      <InputSelection
        position={{ x: e.screenX, y: e.screenY }}
        selection={selection}
        inputElement={e.target}
        setContextMenu={setContextMenu}
      />
    );
  }

  return (
    <div className="relative h-[calc(100%-2rem)] overflow-hidden m-4 max-w-[50vw] min-w-[600px] max-w-[100vw] flex-1 flex flex-col shadow-2xl bg-white dark:bg-gray-900 rounded">
      {chatTitle && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <img
            src="images/chat-bot-svgrepo-com.svg"
            className="w-[5%] transform translate-y-1"
          />
          <h2 className="text-lg font-bold px-4 flex-1">{chatTitle}</h2>
          {currentModel && (
            <h2 className="bg-gray-200 dark:bg-gray-800 px-4 py-2 text-xs rounded flex-none whitespace-nowrap">
              {currentModel}
            </h2>
          )}
        </div>
      )}
      {messages.filter((e) => e.role !== "system").length >= 1 ||
      referenceMessage.content ||
      additional.content ? (
        <Messages />
      ) : (
        <Greet />
      )}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form
          onSubmit={handleSubmission}
          autoComplete="off"
          className="flex items-end"
        >
          <textarea
            rows={1}
            ref={textareaRef}
            onInput={resizeArea}
            onKeyDown={onkeydown}
            onContextMenu={oncontextmenuTextArea}
            name="message"
            type="text"
            placeholder="Ask your buddy..."
            className="w-full max-h-[30vh] overflow-auto resize-none py-2 px-8 mx-8 text-lg focus:outline-none focus:ring-2 focus:ring-gray-600 bg-gray-200 dark:bg-gray-800 rounded"
          />
          <div>
            <button
              type="submit"
              id="sendMessage"
              ref={sendButton}
              className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-full h-11 w-11 flex text-xl items-center justify-center"
            >
              ⮞
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChatBot = () => {
  const { currentPage, activeChatId } = useActiveState();
  const [chatHistory, setChatHistory] = useState(null);
  const [additional, setAdditional] = useState({ role: null, content: null });

  const [ContextMenu, setContextMenu] = useState(null);
  const get_chats = async () => {
    const list = await invoke("get_chats_list");
    setChatHistory(list);
  };

  useEffect(() => {
    get_chats();
  }, [activeChatId]);

  return (
    <div
      onClick={() => {
        setContextMenu(null);
      }}
      className={
        (currentPage === "chatbot" ? "fixed" : "hidden") +
        " chatbot flex flex-col inset-0"
      }
    >
      {ContextMenu}
      <h1
        data-tauri-drag-region
        className="w-screen flex items-center text-3xl text-[#00002b] font-medium bg-gradient-to-r from-white to-gray-200 py-3 px-20 shadow-lg dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 dark:text-[#efefff]"
      >
        <img
          src="images/chat-bot-svgrepo-com.svg"
          className="h-8 w-8 transform translate-y-1"
          alt="Tools Icon"
        />
        <span className="ml-2">Buddy</span>
      </h1>
      <div className="flex-1 overflow-auto relative flex justify-center items-center">
        {chatHistory && (
          <SavedChats
            chatHistory={chatHistory}
            get_chats={get_chats}
            setAdditional={setAdditional}
          />
        )}
        <ChatBox
          setChatHistory={setChatHistory}
          chatHistory={chatHistory}
          additional={additional}
          setAdditional={setAdditional}
          setContextMenu={setContextMenu}
        />
      </div>
    </div>
  );
};

export default ChatBot;
