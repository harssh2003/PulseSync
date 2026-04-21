"use client"

import { useState, useRef, useEffect } from "react"

interface Message {
  id: number
  text: string
  sender: "user" | "bot"
}

interface ChatbotModalProps {
  onClose: () => void
  isDark?: boolean
  onThemeToggle?: () => void
}

export default function ChatbotModal({ onClose, isDark = false, onThemeToggle }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "bot",
      text: `<p>Hello! I'm <strong>Pulse</strong>, your AI health assistant.</p>
             <p class="mt-2">Please describe your symptoms, and I'll do my best to guide you.</p>
             <p class="mt-3 text-xs opacity-70"><strong>Disclaimer:</strong> I am an AI assistant, not a medical professional. Always consult a doctor for serious health concerns.</p>`,
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatboxRef = useRef<HTMLDivElement>(null)

  // Gemini chat history format: role is "user" | "model"
  const chatHistory = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([
    {
      role: "model",
      parts: [{ text: "Hello! I'm Pulse, your AI health assistant. Please describe your symptoms, and I'll do my best to help guide you." }],
    },
  ])

  const addMessage = (sender: "user" | "bot", text: string) => {
    setMessages((prev) => [...prev, { id: prev.length + 1, sender, text }])
  }

  const handleSendMessage = async () => {
    const text = inputValue.trim()
    if (!text || isLoading) return

    setInputValue("")
    addMessage("user", text)
    chatHistory.current.push({ role: "user", parts: [{ text }] })
    setIsLoading(true)

    try {
      // Calls your Flask backend at routes/chatbot.py
      const response = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: chatHistory.current }),
      })

      if (!response.ok) throw new Error(`Server error: ${response.statusText}`)

      const data = await response.json()
      const botText: string = data.response ?? "I'm sorry, I couldn't process that. Please try again."

      chatHistory.current.push({ role: "model", parts: [{ text: botText }] })
      addMessage("bot", botText)
    } catch (error) {
      console.error("Chatbot error:", error)
      addMessage("bot", "<p>I'm sorry, I'm having a little trouble connecting right now. Please try again in a moment.</p>")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const dark = isDark

  return (
    <div
      className={`fixed bottom-24 right-8 w-96 h-[500px] rounded-3xl shadow-2xl flex flex-col border z-[999] animate-fade-in overflow-hidden
        ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-sky-100"}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold">Pulse Assistant</h3>
          <p className="text-xs opacity-90">Your AI Health Assistant</p>
        </div>
        <div className="flex gap-2">
          {onThemeToggle && (
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-full hover:bg-sky-400 transition-colors text-lg"
              aria-label="Toggle theme"
            >
              {dark ? "☀️" : "🌙"}
            </button>
          )}
          <button onClick={onClose} className="text-2xl hover:scale-110 transition-transform" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatboxRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${dark ? "bg-slate-700" : "bg-gray-50"}`}
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.sender === "user"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-none"
                  : dark
                    ? "bg-slate-600 text-white rounded-bl-none"
                    : "bg-white text-slate-800 border border-sky-100 rounded-bl-none"
                }`}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`px-4 py-3 rounded-2xl rounded-bl-none ${dark ? "bg-slate-600" : "bg-white border border-sky-100"}`}>
              <div className="flex gap-1.5 items-center">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full animate-bounce ${dark ? "bg-white" : "bg-slate-400"}`}
                    style={{ animationDelay: `${delay}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div
        className={`p-4 border-t flex gap-3 items-center flex-shrink-0
          ${dark ? "border-slate-600 bg-slate-800" : "border-sky-100 bg-white"}`}
      >
        <input
          type="text"
          placeholder="Tell me about your symptoms..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 border-2 rounded-full text-sm focus:outline-none focus:ring-2 disabled:opacity-50
            ${dark
              ? "border-slate-500 bg-slate-700 text-white placeholder-slate-400 focus:border-sky-400 focus:ring-sky-300"
              : "border-sky-200 bg-white text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-sky-100"
            }`}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading}
          aria-label="Send"
          className="w-10 h-10 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
        >
          →
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}