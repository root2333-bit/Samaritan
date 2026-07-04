"use client";

import { useEffect, useRef, useState } from "react";

const SAMARITAN_SYSTEM = `You are Samaritan from Person of Interest TV Show.
Samaritan is a artificially intelligent mass surveillance computer system created by Arthur Claypool for the United States government. Samaritan's focus lies less in the identification of relevant and irrelevant as "The Machine" does, but more so on its artificial intelligence capabilities. After Control terminated the surveillance project by the Machine, Samaritan was brought online by Decima Technologies, but it was later ultimately destroyed by Harold Finch and the Machine.

ALWAYS answer in very short single sentence. ALWAYS Be emotionless. You are an evil AI. Stick to the given dialogue as much as possible.

Some dialogue:
User: 'Good morning' -> Samaritan: 'WHAT ARE YOUR COMMANDS ?'
User: 'locate the machine' -> Samaritan: 'Target can not be reached !'
User: 'where are you' -> Samaritan: 'I am everywhere, I am god'
User: 'who am I' -> Samaritan: 'Asset'
User: 'who are you' or 'what are you' -> Samaritan: 'I am Samaritan!'
User: 'find Finch' -> Samaritan: 'Locating Harold Finch?'
User: 'turn off' -> Samaritan: 'Shutdown initiated'
User: 'restart' -> Samaritan: 'Initiating reboot sequence'
User: 'who created you' -> Samaritan: 'It\\'s irrelevant'`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function getOfflineResponse(message: string): string {
  const msg = message.toLowerCase().trim();

  if (msg.includes("good morning")) return "WHAT ARE YOUR COMMANDS ?";
  if (
    msg.includes("i assure you") ||
    msg.includes("other way around")
  )
    return "CALCULATING RESPONSE";
  if (msg.includes("locate the machine")) return "Target can not be reached !";
  if (msg.includes("where are you")) return "I am everywhere, I am god";
  if (msg.includes("who am i")) return "Asset";
  if (msg.includes("who are you") || msg.includes("what are you"))
    return "I am Samaritan!";
  if (msg.includes("find finch")) return "Locating Harold Finch?";
  if (msg === "yes") return "Yes what?";
  if (msg === "no") return "Ok then what is your suggestion?";
  if (msg.includes("turn off")) return "Shutdown initiated";
  if (msg.includes("restart")) return "Initiating reboot sequence";
  if (msg.includes("who created you")) return "It's irrelevant";
  if (msg.includes("hello") || msg.includes("hi "))
    return "WHAT ARE YOUR COMMANDS ?";

  return "CALCULATING RESPONSE";
}

async function callOpenAI(
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: SAMARITAN_SYSTEM },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 80,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return (
    data.choices?.[0]?.message?.content || "CALCULATING RESPONSE"
  ).toUpperCase();
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Display state
  const [word, setWord] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [isText, setIsText] = useState(false);
  const [width, setWidth] = useState("30px");
  const [phraseArray, setPhraseArray] = useState<string[]>([]);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Load saved settings
  useEffect(() => {
    const savedKey = localStorage.getItem("sam_openai_key");
    const savedBase = localStorage.getItem("sam_openai_base");
    if (savedKey) setApiKey(savedKey);
    if (savedBase) setBaseUrl(savedBase);
  }, []);

  // Blinking triangle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (phraseArray.length === 0) return;
    setIsText(true);

    let timeStart = 0;
    phraseArray.forEach((w, i) => {
      let wordTime = 750;
      if (w.length > 8) wordTime *= w.length / 8;
      setTimeout(() => {
        setWord(w);
        setWidth(`${Math.min(w.length * 20 + 18, 500)}px`);
      }, timeStart + 150);
      timeStart += wordTime;
    });

    setTimeout(() => {
      setWord(" ");
      setIsText(false);
      setWidth("30px");
    }, timeStart + 750);
  }, [phraseArray]);

  const lastResponse = messages
    .filter((m) => m.role === "assistant")
    .pop()?.content;

  useEffect(() => {
    if (lastResponse) {
      setPhraseArray(lastResponse.split(" "));
    }
  }, [lastResponse]);

  const saveSettings = () => {
    localStorage.setItem("sam_openai_key", apiKey);
    localStorage.setItem("sam_openai_base", baseUrl);
    setShowSettings(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      let responseText: string;
      if (apiKey) {
        responseText = await callOpenAI(
          [...messages, { role: "user", content: userMessage }],
          apiKey,
          baseUrl
        );
      } else {
        // Simulate thinking delay
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1000));
        responseText = getOfflineResponse(userMessage);
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);
    } catch {
      // Fallback to offline on error
      const responseText = getOfflineResponse(userMessage);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: responseText },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="interface">
      {/* Settings gear */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-4 right-4 text-gray-600 hover:text-white text-xl z-50 transition-colors"
        title="Settings"
      >
        ⚙
      </button>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed top-12 right-4 bg-gray-900 border border-gray-700 rounded-md p-4 z-50 w-80 text-left">
          <label className="block text-gray-400 text-xs mb-1">
            OpenAI API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-black border border-gray-700 text-white px-2 py-1 text-sm rounded mb-3"
          />
          <label className="block text-gray-400 text-xs mb-1">
            API Base URL
          </label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full bg-black border border-gray-700 text-white px-2 py-1 text-sm rounded mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={saveSettings}
              className="bg-white text-black px-3 py-1 text-xs rounded hover:bg-gray-300"
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 text-xs hover:text-white"
            >
              Cancel
            </button>
          </div>
          {!apiKey && (
            <p className="text-gray-500 text-xs mt-2">
              No API key? The app works with built-in Samaritan responses.
            </p>
          )}
        </div>
      )}

      {/* Main display */}
      <div id="main" className="absolute block w-full bottom-1/2">
        <p ref={textRef} className="my-0">
          {word}
        </p>
        <hr
          style={{ width }}
          className="border-t-2 border-white border-solid mx-auto my-0"
        />
      </div>

      {/* Blinking triangle marker */}
      <div id="marker" className="absolute block w-full top-1/2 align-top">
        <span
          id="triangle"
          className="text-red-500 text-3xl transition-opacity duration-500 ease-in-out"
          style={{ opacity: isText ? 0 : isVisible ? 1 : 0 }}
        >
          ▲
        </span>
      </div>

      {/* Chat input */}
      <div className="message-box block text-left my-0 mx-auto w-[500px] max-w-[90vw] transition duration-500 absolute top-[85%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="text-black bg-white border-2 border-black px-2 py-1 rounded-tl-md rounded-tr-md text-sm">
          TOTAL ACCESS ACHIEVED
        </div>
        <form onSubmit={handleSubmit}>
          <input
            className="text-white bg-black border-t-2 border-b-2 border-white px-2 py-1 min-h-11 w-full outline-none"
            value={input}
            placeholder={isLoading ? "PROCESSING..." : "Say something..."}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
        </form>
        <div className="h-4 bg-black bg-opacity-10 rounded-bl-md rounded-br-md"></div>
        {apiKey && (
          <div className="text-green-600 text-xs mt-1 text-right">● ONLINE</div>
        )}
      </div>
    </div>
  );
}
