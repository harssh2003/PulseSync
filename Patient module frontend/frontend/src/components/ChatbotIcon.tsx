"use client"

import { useState } from "react"
import ChatbotModal from "./ChatbotModal"

export default function ChatbotIcon() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open Pulse health assistant"
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-xl hover:-translate-y-1 z-[999]"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {isOpen && (
        <ChatbotModal
          onClose={() => setIsOpen(false)}
          isDark={isDark}
          onThemeToggle={() => setIsDark((prev) => !prev)}
        />
      )}
    </>
  )
}