"use client"

import { useState, useRef, useEffect } from "react"

// ── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: number
  text: string
  sender: "user" | "bot"
  action?: AgentAction | null
}

interface Slot { date: string; time: string }

interface Doctor {
  doctor_id: string
  hospital_id: string
  doctor_name: string
  hospital: string
  specialist: string
  slots: Slot[]
}

interface AgentAction {
  type:
  | "urgency_assessed"
  | "assessment_complete"
  | "show_doctors"
  | "slot_selected"
  | "appointment_booked"
  | "auth_required"
  | "remedies_offered"
  data?: {
    urgency?: string
    urgency_score?: number
    specialist?: string
    doctors?: Doctor[]
    remedies?: string[]
    appointment_id?: string
    appointment_date?: string
    appointment_time?: string
    swapped?: boolean
    original_time?: string
    [key: string]: unknown
  }
}

interface ChatState {
  stage: string
  urgency?: string
  urgency_score?: number
  specialist?: string
  symptoms_summary?: string
  selected_slot?: (Slot & { doctor_id: string; hospital_id: string; doctor_name: string }) | null
  [key: string]: unknown
}

interface ChatbotModalProps {
  onClose: () => void
  isDark?: boolean
  onThemeToggle?: () => void
  onNavigate?: (page: string) => void
}

// ── Urgency config ─────────────────────────────────────────────────────────
const URGENCY = {
  emergency: { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", icon: "🚨", label: "Emergency" },
  high: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", icon: "⚠️", label: "High Priority" },
  medium: { bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700", icon: "📋", label: "Moderate" },
  low: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", icon: "✅", label: "Low Priority" },
}

// ── Sub-components ─────────────────────────────────────────────────────────
function UrgencyBanner({ urgency, specialist }: { urgency: string; specialist?: string }) {
  const cfg = URGENCY[urgency as keyof typeof URGENCY]
  if (!cfg) return null
  return (
    <div className={`rounded-xl border px-3 py-2 ${cfg.bg} ${cfg.border} flex items-center gap-2`}>
      <span className="text-lg">{cfg.icon}</span>
      <div>
        <p className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</p>
        {specialist && <p className="text-xs text-slate-500">Recommend: {specialist}</p>}
      </div>
    </div>
  )
}

function DoctorCard({
  doctor,
  onSelectSlot,
}: {
  doctor: Doctor
  onSelectSlot: (doctor: Doctor, slot: Slot) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-sky-100 shadow-sm overflow-hidden">
      <button
        className="w-full p-3 flex items-start justify-between gap-2 hover:bg-sky-50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{doctor.doctor_name}</p>
          <p className="text-xs text-cyan-600 font-semibold">{doctor.specialist}</p>
          <p className="text-xs text-slate-400 truncate">🏥 {doctor.hospital}</p>
        </div>
        <span className="text-slate-400 text-xs pt-1">{open ? "▲" : "▼ slots"}</span>
      </button>

      {open && (
        <div className="px-3 pb-3 border-t border-sky-50">
          <p className="text-xs text-slate-500 font-semibold mt-2 mb-1.5">Available slots:</p>
          <div className="grid grid-cols-2 gap-1.5">
            {doctor.slots.slice(0, 6).map((slot, i) => (
              <button
                key={i}
                onClick={() => onSelectSlot(doctor, slot)}
                className="text-xs bg-sky-50 hover:bg-sky-500 hover:text-white text-sky-700 font-semibold py-2 px-2 rounded-lg border border-sky-200 transition-all"
              >
                <span className="block">
                  {new Date(slot.date + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                </span>
                <span className="block opacity-75">{formatTime12h(slot.time)}</span>
              </button>
            ))}
          </div>
          {doctor.slots.length > 6 && (
            <p className="text-xs text-slate-400 mt-1.5 text-center">+{doctor.slots.length - 6} more slots available</p>
          )}
        </div>
      )}
    </div>
  )
}

function BookingSuccess({
  date,
  time,
  swapped,
  originalTime,
  onViewAppointments,
}: {
  date: string
  time: string
  swapped?: boolean
  originalTime?: string
  onViewAppointments?: () => void
}) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 space-y-2">
      <p className="font-bold text-sm mb-1">✅ Appointment Booked!</p>
      <p>📅 {new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short", month: "short", day: "numeric"
      })} at {formatTime12h(time)}</p>
      {swapped && originalTime && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 mt-1">
          <p className="font-bold text-amber-700 text-xs">⚡ Slot Preponed by Smart Queuing</p>
          <p className="text-amber-600 text-xs mt-0.5">
            Your appointment was moved from <span className="font-semibold">{formatTime12h(originalTime)}</span> to{" "}
            <span className="font-semibold">{formatTime12h(time)}</span> — an earlier slot — because your condition was flagged as high priority.
          </p>
          <p className="text-amber-500 text-xs mt-1 italic">If this time doesn't work for you, you can reschedule from My Appointments.</p>
        </div>
      )}
      {onViewAppointments && (
        <button
          onClick={onViewAppointments}
          className="mt-2 w-full py-1.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          View My Appointments →
        </button>
      )}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export default function ChatbotModal({ onClose, isDark = false, onThemeToggle, onNavigate }: ChatbotModalProps) {
  const [messages, setMessages] = useState<Message[]>([{
    id: 1,
    sender: "bot",
    text: `<p>Hello! I'm <strong>Pulse</strong>, your AI health assistant.</p>
           <p class="mt-2">Tell me about your symptoms and I'll assess the situation — and can <strong>find doctors and book an appointment</strong> for you.</p>
           <p class="mt-3 text-xs opacity-60"><strong>Disclaimer:</strong> I'm an AI assistant, not a medical professional.</p>`,
  }])

  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatState, setChatState] = useState<ChatState>({ stage: "symptom_collection" })
  const chatboxRef = useRef<HTMLDivElement>(null)

  const chatHistory = useRef<Array<{ role: string; parts: Array<{ text: string }> }>>([{
    role: "model",
    parts: [{ text: "Hello! I'm Pulse. Tell me your symptoms and I'll help assess and book an appointment." }],
  }])

  const addMessage = (sender: "user" | "bot", text: string, action?: AgentAction | null) =>
    setMessages(prev => [...prev, { id: prev.length + 1, sender, text, action: action ?? null }])

  const getAuthHeader = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      sessionStorage.getItem("token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Core send function
  const sendMessage = async (text: string, stateOverride?: Partial<ChatState>) => {
    if (!text.trim() || isLoading) return

    setInputValue("")
    addMessage("user", text)
    chatHistory.current.push({ role: "user", parts: [{ text }] })
    setIsLoading(true)

    const stateToSend = stateOverride ? { ...chatState, ...stateOverride } : chatState

    try {
      const resp = await fetch("http://localhost:5000/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          history: chatHistory.current,
          state: stateToSend,
        }),
      })

      if (!resp.ok) throw new Error(resp.statusText)
      const data = await resp.json()

      const botText: string = data.response ?? "I'm sorry, I couldn't process that."
      const action: AgentAction | null = data.action ?? null
      const newState: ChatState = data.new_state ?? chatState

      chatHistory.current.push({ role: "model", parts: [{ text: botText }] })
      addMessage("bot", botText, action)
      setChatState(newState)
    } catch (err) {
      console.error("Chatbot error:", err)
      addMessage("bot", "<p>I'm having trouble connecting right now. Please try again in a moment.</p>")
    } finally {
      setIsLoading(false)
    }
  }

  // When patient taps a slot → tell backend which slot was selected
  const handleSelectSlot = (doctor: Doctor, slot: Slot) => {
    const selectedSlot = {
      ...slot,
      doctor_id: doctor.doctor_id,
      hospital_id: doctor.hospital_id,
      doctor_name: doctor.doctor_name,
    }
    // Send a natural confirmation message with the slot pre-selected in state
    sendMessage(
      `I'd like to book with ${doctor.doctor_name} on ${slot.date} at ${slot.time}`,
      { selected_slot: selectedSlot, stage: "doctors_shown" }
    )
  }

  useEffect(() => {
    if (chatboxRef.current)
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight
  }, [messages, isLoading])

  const dark = isDark

  return (
    <div className={`fixed bottom-24 right-8 w-96 h-[570px] rounded-3xl shadow-2xl flex flex-col border z-[999] animate-fade-in overflow-hidden
      ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-sky-100"}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div>
          <h3 className="text-lg font-bold">Pulse Assistant</h3>
          <p className="text-xs opacity-90">AI Health Agent · Can book appointments</p>
        </div>
        <div className="flex gap-2">
          {onThemeToggle && (
            <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-sky-400 transition-colors">
              {dark ? "☀️" : "🌙"}
            </button>
          )}
          <button onClick={onClose} className="text-2xl hover:scale-110 transition-transform">✕</button>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatboxRef} className={`flex-1 overflow-y-auto p-4 space-y-4 ${dark ? "bg-slate-700" : "bg-gray-50"}`}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            {/* Bubble */}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.sender === "user"
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-br-none"
                  : dark
                    ? "bg-slate-600 text-white rounded-bl-none"
                    : "bg-white text-slate-800 border border-sky-100 rounded-bl-none"}`}
              dangerouslySetInnerHTML={{ __html: msg.text }}
            />

            {/* Action cards rendered under bot messages */}
            {msg.sender === "bot" && msg.action && (
              <div className="mt-2 w-full max-w-[85%] space-y-2">

                {/* Urgency banner */}
                {(msg.action.type === "urgency_assessed" || msg.action.type === "assessment_complete" || msg.action.type === "remedies_offered") &&
                  msg.action.data?.urgency && (
                    <UrgencyBanner
                      urgency={msg.action.data.urgency}
                      specialist={msg.action.data.specialist}
                    />
                  )}

                {/* Remedies — book appointment option */}
                {msg.action.type === "remedies_offered" && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-bold text-emerald-700">💊 Home Remedies</p>
                    {msg.action.data?.remedies && msg.action.data.remedies.length > 0 && (
                      <ul className="text-xs text-slate-700 space-y-1 pl-1">
                        {(msg.action.data.remedies as string[]).map((r: string, i: number) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="border-t border-emerald-200 pt-2 mt-1">
                      <p className="text-xs text-slate-500 mb-1.5">Would you still like to see a specialist?</p>
                      <button
                        onClick={() => sendMessage("Yes, I'd like to book an appointment")}
                        className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        📅 Book an Appointment
                      </button>
                    </div>
                  </div>
                )}

                {/* Doctor cards */}
                {(msg.action.type === "assessment_complete" || msg.action.type === "show_doctors") &&
                  msg.action.data?.doctors && msg.action.data.doctors.length > 0 && (
                    <div className="space-y-2">
                      <p className={`text-xs font-semibold ${dark ? "text-slate-300" : "text-slate-500"}`}>
                        Tap a doctor to see available slots:
                      </p>
                      {msg.action.data.doctors.map(doc => (
                        <DoctorCard
                          key={doc.doctor_id}
                          doctor={doc}
                          onSelectSlot={handleSelectSlot}
                        />
                      ))}
                    </div>
                  )}

                {/* No doctors found */}
                {(msg.action.type === "assessment_complete" || msg.action.type === "show_doctors") &&
                  msg.action.data?.doctors?.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                      <p className="font-semibold">No doctors available right now</p>
                      <p className="mt-0.5">Please visit the hospital search page to find nearby doctors.</p>
                    </div>
                  )}

                {/* Booking success */}
                {msg.action.type === "appointment_booked" &&
                  msg.action.data?.appointment_date && (
                    <BookingSuccess
                      date={msg.action.data.appointment_date}
                      time={msg.action.data.appointment_time ?? ""}
                      swapped={msg.action.data.swapped}
                      originalTime={msg.action.data.original_time}
                      onViewAppointments={onNavigate ? () => { onNavigate("appointments"); onClose() } : undefined}
                    />
                  )}

                {/* Not logged in */}
                {msg.action.type === "auth_required" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                    <p className="font-semibold">Login required</p>
                    <p className="mt-0.5">Please log in to book an appointment.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className={`px-4 py-3 rounded-2xl rounded-bl-none ${dark ? "bg-slate-600" : "bg-white border border-sky-100"}`}>
              <div className="flex gap-1.5 items-center">
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full animate-bounce ${dark ? "bg-white" : "bg-slate-400"}`}
                    style={{ animationDelay: `${delay}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`p-4 border-t flex gap-3 items-center flex-shrink-0
        ${dark ? "border-slate-600 bg-slate-800" : "border-sky-100 bg-white"}`}
      >
        <input
          type="text"
          placeholder="Describe your symptoms..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !isLoading && sendMessage(inputValue)}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 border-2 rounded-full text-sm focus:outline-none focus:ring-2 disabled:opacity-50
            ${dark
              ? "border-slate-500 bg-slate-700 text-white placeholder-slate-400 focus:border-sky-400 focus:ring-sky-300"
              : "border-sky-200 bg-white text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:ring-sky-100"}`}
        />
        <button
          onClick={() => sendMessage(inputValue)}
          disabled={isLoading}
          className="w-10 h-10 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-full flex items-center justify-center hover:scale-110 disabled:opacity-50 transition-all font-bold"
        >
          →
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTime12h(time: string): string {
  if (!time) return ""
  if (time.includes("AM") || time.includes("PM")) return time
  const [hStr, mStr] = time.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`
}