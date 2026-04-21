"use client"

import { useState, useRef } from "react"
import { useEffect } from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifyChannel = "email" | "whatsapp" | "both"
type FrequencyType = "daily" | "weekly" | "custom"
type DayOfWeek = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"

interface ReminderTime {
  id: string
  label: string
  time: string
}

interface MedicineReminder {
  id?: string
  medicine_name: string
  dosage_note: string
  times: ReminderTime[]
  frequency: FrequencyType
  days_of_week: DayOfWeek[]
  notify_via: NotifyChannel
  contact_email: string
  contact_whatsapp: string
  start_date: string
  end_date: string
  active: boolean
}

interface RemindersPageProps {
  onNavigate: (page: string) => void
  prefillMedicine?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_TIMES: ReminderTime[] = [
  { id: "morning",   label: "Morning",   time: "08:00" },
  { id: "afternoon", label: "Afternoon", time: "13:00" },
  { id: "evening",   label: "Evening",   time: "18:00" },
  { id: "night",     label: "Night",     time: "21:00" },
]

const DAYS: DayOfWeek[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const today = () => new Date().toISOString().split("T")[0]
const thirtyDaysLater = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split("T")[0]
}

const formatTime12 = (t: string) => {
  const [h, m] = t.split(":").map(Number)
  const ampm = h >= 12 ? "PM" : "AM"
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BellIcon = ({ size = 20, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
)

const PillIcon = ({ size = 18, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M10.5 20H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v3"/>
    <circle cx="18" cy="18" r="3"/>
    <path d="M18 15v6M15 18h6"/>
  </svg>
)

const ClockIcon = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
)

const CheckIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const TrashIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
)

const PlusIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const EditIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const UploadIcon = ({ size = 24, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const PauseIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
  </svg>
)

const PlayIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
)

const SendIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)

const BackIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Medicine", "Schedule", "Notify", "Confirm"]
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  done
                    ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-200"
                    : active
                    ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-300 scale-110"
                    : "bg-sky-50 text-slate-400 border-2 border-sky-100"
                }`}
              >
                {done ? <CheckIcon size={15} color="white" /> : n}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-sky-600" : done ? "text-sky-500" : "text-slate-400"}`}>
                {label}
              </span>
            </div>
            {n < 4 && (
              <div className={`flex-1 h-0.5 mx-2 rounded mb-5 transition-all duration-500 ${step > n ? "bg-gradient-to-r from-sky-400 to-cyan-400" : "bg-sky-100"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg shadow-sky-100/50 border-2 border-sky-100 p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-sky-50">
      <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center text-white">
        {icon}
      </div>
      <span className="font-bold text-slate-800 text-base" style={{ fontFamily: "'Poppins', sans-serif" }}>{title}</span>
    </div>
  )
}

// ─── Existing Reminder Card ───────────────────────────────────────────────────

function ReminderCard({
  reminder,
  onToggle,
  onDelete,
  onTest,
  onEdit,
  animationDelay,
}: {
  reminder: MedicineReminder & { id: string }
  onToggle: () => void
  onDelete: () => void
  onTest: () => void
  onEdit: () => void
  animationDelay?: number
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const channelLabel = reminder.notify_via === "both" ? "📧 Email & 💬 WhatsApp" : reminder.notify_via === "email" ? "📧 Email" : "💬 WhatsApp"

  return (
    <div
      className={`bg-white rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${reminder.active ? "border-sky-100 shadow-lg shadow-sky-100/50" : "border-slate-100 shadow-md opacity-60"}`}
      style={{
        animation: `slideUp 0.6s ease-out forwards`,
        animationDelay: `${animationDelay ?? 0}ms`,
        opacity: 0,
      }}
    >
      {/* Header bar */}
      <div className={`px-5 py-3 rounded-t-2xl flex items-center justify-between ${reminder.active ? "bg-gradient-to-r from-sky-500 to-cyan-500" : "bg-slate-200"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <PillIcon size={16} color="white" />
          </div>
          <span className="font-bold text-white text-base" style={{ fontFamily: "'Poppins', sans-serif" }}>{reminder.medicine_name}</span>
          {!reminder.active && <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-semibold">Paused</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onTest} title="Send test notification"
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <SendIcon size={13} />
          </button>
          <button onClick={onEdit} title="Edit reminder"
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            <EditIcon size={13} color="white" />
          </button>
          <button onClick={onToggle} title={reminder.active ? "Pause" : "Resume"}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
            {reminder.active ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <button onClick={onDelete} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors">Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-lg font-semibold">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete"
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-red-400/70 flex items-center justify-center text-white transition-colors">
              <TrashIcon size={13} color="white" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Reminder times</p>
          <div className="flex flex-wrap gap-2">
            {reminder.times.map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-sky-700 bg-gradient-to-br from-sky-50 to-cyan-50 border border-sky-100 px-3 py-1.5 rounded-full">
                <ClockIcon size={11} color="#0284c7" /> {t.label} · {formatTime12(t.time)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Frequency</p>
          <p className="text-sm font-semibold text-slate-700 capitalize">{reminder.frequency === "daily" ? "Every day" : `${reminder.frequency} (${reminder.days_of_week.join(", ")})`}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notify via</p>
          <p className="text-sm font-semibold text-slate-700">{channelLabel}</p>
        </div>
        {reminder.dosage_note && (
          <div className="col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Dosage</p>
            <p className="text-sm font-semibold text-slate-700">{reminder.dosage_note}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Duration</p>
          <p className="text-sm font-semibold text-slate-700">{reminder.start_date} → {reminder.end_date}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RemindersPage({ onNavigate, prefillMedicine = "" }: RemindersPageProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [editingReminder, setEditingReminder] = useState<(MedicineReminder & { id: string }) | null>(null)
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [testMsg, setTestMsg] = useState("")

  const [reminders, setReminders] = useState<(MedicineReminder & { id: string })[]>([])
  useEffect(() => {
  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem("auth_token") || ""

      const res = await fetch("/api/reminders", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      // ⚠️ IMPORTANT: backend gives data.reminders
      setReminders(data.reminders)

    } catch (err) {
      console.error("Failed to load reminders", err)
    }
  }

  fetchReminders()
}, [])
  // Image scan
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [medicineName, setMedicineName] = useState(prefillMedicine)
  const [dosageNote, setDosageNote] = useState("")
  const [frequency, setFrequency] = useState<FrequencyType>("daily")
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([...DAYS])
  const [activeTimes, setActiveTimes] = useState<Set<string>>(new Set(["morning"]))
  const [timeValues, setTimeValues] = useState<Record<string, string>>({ morning: "08:00", afternoon: "13:00", evening: "18:00", night: "21:00" })
  const [customTimes, setCustomTimes] = useState<ReminderTime[]>([])
  const [channel, setChannel] = useState<NotifyChannel>("email")
  const [email, setEmail] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(thirtyDaysLater())

  // ── Image scan ──────────────────────────────────────────────────────────────

  const handleImageUpload = async (file: File) => {
    setScanLoading(true)
    setScanError("")
    const formData = new FormData()
    formData.append("image", file)
    try {
      const token = localStorage.getItem("auth_token") || ""
      const res = await fetch("/api/prescriptions/analyze-prescription-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to read prescription")
      const found: string[] = data.medicines_found || []
      if (found.length > 0) setMedicineName(found[0])
    } catch (e: any) { setScanError(e.message) }
    finally { setScanLoading(false) }
  }

  // ── Time helpers ────────────────────────────────────────────────────────────

  const toggleTime = (id: string) => {
    setActiveTimes(prev => {
      const n = new Set(prev)
      if (n.has(id)) { if (n.size > 1) n.delete(id) } else n.add(id)
      return n
    })
  }

  const addCustomTime = () => {
    const id = `custom_${Date.now()}`
    setCustomTimes(prev => [...prev, { id, label: "Custom", time: "09:00" }])
    setActiveTimes(prev => new Set([...prev, id]))
    setTimeValues(prev => ({ ...prev, [id]: "09:00" }))
  }

  const removeCustomTime = (id: string) => {
    setCustomTimes(prev => prev.filter(ct => ct.id !== id))
    setActiveTimes(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  // ── Build payload ───────────────────────────────────────────────────────────

  const buildPayload = (): MedicineReminder => {
    const times: ReminderTime[] = [
      ...PRESET_TIMES.filter(pt => activeTimes.has(pt.id)).map(pt => ({ ...pt, time: timeValues[pt.id] || pt.time })),
      ...customTimes.filter(ct => activeTimes.has(ct.id)).map(ct => ({ ...ct, time: timeValues[ct.id] || ct.time })),
    ]
    return {
      medicine_name: medicineName.trim(), dosage_note: dosageNote.trim(),
      times, frequency,
      days_of_week: frequency === "daily" ? DAYS : selectedDays,
      notify_via: channel,
      contact_email: email.trim(), contact_whatsapp: whatsapp.trim(),
      start_date: startDate, end_date: endDate, active: true,
    }
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      const token = localStorage.getItem("auth_token") || ""
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save reminder")
      setReminders(prev => [{ ...buildPayload(), id: data.id || Date.now().toString() }, ...prev])
      setSaved(true)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const startEdit = (reminder: MedicineReminder & { id: string }) => {
    setEditingReminder(reminder)
    // Pre-fill form fields from existing reminder
    setMedicineName(reminder.medicine_name)
    setDosageNote(reminder.dosage_note)
    setFrequency(reminder.frequency)
    setSelectedDays(reminder.days_of_week)
    // Rebuild activeTimes and timeValues from saved times array
    const newActiveTimes = new Set<string>()
    const newTimeValues: Record<string, string> = { morning: "08:00", afternoon: "13:00", evening: "18:00", night: "21:00" }
    const newCustomTimes: ReminderTime[] = []
    reminder.times.forEach(t => {
      newActiveTimes.add(t.id)
      newTimeValues[t.id] = t.time
      if (!PRESET_TIMES.find(p => p.id === t.id)) {
        newCustomTimes.push(t)
      }
    })
    setActiveTimes(newActiveTimes)
    setTimeValues(newTimeValues)
    setCustomTimes(newCustomTimes)
    setChannel(reminder.notify_via)
    setEmail(reminder.contact_email)
    setWhatsapp(reminder.contact_whatsapp)
    setStartDate(reminder.start_date)
    setEndDate(reminder.end_date)
    setStep(1)
    setSaved(false)
    setError("")
    setView("edit")
  }

  const handleUpdate = async () => {
    if (!editingReminder) return
    setSaving(true); setError("")
    try {
      const token = localStorage.getItem("auth_token") || ""
      const res = await fetch(`/api/reminders/${editingReminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update reminder")
      setReminders(prev => prev.map(r =>
        r.id === editingReminder.id ? { ...buildPayload(), id: editingReminder.id } : r
      ))
      setSaved(true)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const resetForm = () => {
    setStep(1); setSaved(false); setError("")
    setMedicineName(""); setDosageNote(""); setFrequency("daily")
    setSelectedDays([...DAYS]); setActiveTimes(new Set(["morning"]))
    setTimeValues({ morning: "08:00", afternoon: "13:00", evening: "18:00", night: "21:00" })
    setCustomTimes([]); setChannel("email"); setEmail(""); setWhatsapp("")
    setStartDate(today()); setEndDate(thirtyDaysLater())
    setEditingReminder(null)
  }

  // ── Reminder actions ────────────────────────────────────────────────────────

  const toggleReminder = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token") || ""
      await fetch(`/api/reminders/${id}/toggle`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
    } catch {}
  }

  const deleteReminder = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token") || ""
      await fetch(`/api/reminders/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch {}
  }

  const testReminder = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token") || ""
      await fetch(`/api/reminders/${id}/test`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      setTestMsg("Test notification sent! ✅")
      setTimeout(() => setTestMsg(""), 3000)
    } catch {}
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const step1Valid = medicineName.trim().length > 0
  const step2Valid = activeTimes.size > 0
  const step3Valid =
    (channel === "email" && email.includes("@")) ||
    (channel === "whatsapp" && whatsapp.length >= 8) ||
    (channel === "both" && email.includes("@") && whatsapp.length >= 8)

  // ── Shared styles ───────────────────────────────────────────────────────────

  const inputCls = "w-full px-4 py-2.5 rounded-xl border-2 border-sky-100 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
  const labelCls = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5"
  const primaryCls = "flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold text-sm shadow-md shadow-sky-200 hover:shadow-lg hover:shadow-sky-300 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
  const ghostCls = "flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-sky-200 text-sky-600 font-semibold text-sm hover:bg-sky-50 transition-all"

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-x-hidden bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">

      {/* ── Hero Header (matches AppointmentBooking style) ── */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-4 bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 px-5 md:px-10 py-16 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-blue-300/30 rounded-full blur-3xl -top-10 -right-10 animate-float"></div>
          <div className="absolute w-80 h-80 bg-sky-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-float-delayed"></div>
        </div>

        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-blue-700 text-sm font-semibold mb-4 shadow-md">
            🔔 Medicine Reminders
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-700 bg-clip-text text-transparent mb-4 leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Never Miss a Dose
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            Set up personalised reminders and receive alerts via email or WhatsApp.
          </p>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-sky-100/50 border-2 border-sky-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-xl flex items-center justify-center text-2xl">
              🔔
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-900">{reminders.filter(r => r.active).length}</p>
              <p className="text-sm text-slate-600 font-medium">Active</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-cyan-100/50 border-2 border-cyan-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-xl flex items-center justify-center text-2xl">
              💊
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-900">{reminders.length}</p>
              <p className="text-sm text-slate-600 font-medium">Total</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg shadow-blue-100/50 border-2 border-blue-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center text-2xl">
              ⏸️
            </div>
            <div>
              <p className="text-2xl font-bold text-sky-900">{reminders.filter(r => !r.active).length}</p>
              <p className="text-sm text-slate-600 font-medium">Paused</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {testMsg && (
        <div className="px-5 py-3 bg-green-50 border-2 border-green-200 text-green-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckIcon size={14} color="#15803d" /> {testMsg}
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className={`transition-all duration-700 delay-150 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl">
              🔔
            </div>
            <h2 className="text-2xl font-bold text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {view === "list" ? "My Reminders" : view === "edit" ? "Edit Reminder" : "New Reminder"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setView("list"); setSaved(false); setEditingReminder(null) }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === "list" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-200" : "border-2 border-sky-200 text-sky-600 hover:bg-sky-50"}`}
            >
              My Reminders {reminders.length > 0 && `(${reminders.length})`}
            </button>
            <button
              onClick={() => { setView("create"); setSaved(false); setStep(1); setEditingReminder(null); resetForm() }}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${view === "create" ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-md shadow-sky-200" : "border-2 border-sky-200 text-sky-600 hover:bg-sky-50"}`}
            >
              + New Reminder
            </button>
          </div>
        </div>

        {/* ══ LIST VIEW ══ */}
        {view === "list" && (
          <>
            {reminders.length === 0 ? (
              <div className="text-center py-20 px-5 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
                <div className="text-7xl mb-5 transition-transform duration-500 hover:scale-110">🔔</div>
                <p className="text-xl font-bold text-slate-800 mb-2">No reminders yet</p>
                <p className="text-base text-slate-600 mb-6">Set up your first medicine reminder so you never miss a dose.</p>
                <button onClick={() => setView("create")} className={primaryCls}>
                  <PlusIcon size={14} color="white" /> Create your first reminder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {reminders.map((r, index) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onToggle={() => toggleReminder(r.id)}
                    onDelete={() => deleteReminder(r.id)}
                    onTest={() => testReminder(r.id)}
                    onEdit={() => startEdit(r)}
                    animationDelay={300 + index * 100}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ CREATE VIEW ══ */}
        {view === "create" && (
          <>
            {saved ? (
              <div className="text-center py-20 px-5 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-200">
                  <CheckIcon size={32} color="white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Reminder saved! 🎉</h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
                  We'll remind you to take <strong className="text-slate-700">{medicineName}</strong> at your scheduled times via {channel === "both" ? "email & WhatsApp" : channel}.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => { resetForm(); setView("list") }} className={ghostCls}>View all reminders</button>
                  <button onClick={resetForm} className={primaryCls}><PlusIcon size={13} color="white" /> Add another</button>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                <StepIndicator step={step} />

                {/* ─ STEP 1 ─ */}
                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<PillIcon size={18} color="white" />} title="Which medicine?" />
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className={labelCls}>Medicine name</label>
                          <input className={inputCls} value={medicineName} onChange={e => setMedicineName(e.target.value)} placeholder="e.g. Metformin, Crocin 500mg…" />
                        </div>
                        <div>
                          {/* <label className={labelCls}>Or scan your prescription</label> */}
                          {/* <div
                            onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-sky-200 rounded-xl p-6 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-all"
                          >
                            {scanLoading ? (
                              <div className="flex items-center justify-center gap-2 text-sky-500">
                                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                                <span className="text-sm font-semibold">Reading prescription…</span>
                              </div>
                            ) : (
                              <>
                                <UploadIcon size={22} color="#0ea5e9" />
                                <p className="mt-2 text-sm font-semibold text-slate-600">Upload prescription image</p>
                                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP — AI will extract medicine names</p>
                              </>
                            )}
                          </div> */}
                          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                          {scanError && <p className="text-xs text-red-500 mt-1.5">{scanError}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Dosage note <span className="normal-case text-slate-400 font-normal tracking-normal">(optional)</span></label>
                          <input className={inputCls} value={dosageNote} onChange={e => setDosageNote(e.target.value)} placeholder="e.g. 1 tablet after meals, 2 puffs before exercise…" />
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-end">
                      <button className={primaryCls} disabled={!step1Valid} onClick={() => setStep(2)}>Next: Schedule →</button>
                    </div>
                  </div>
                )}

                {/* ─ STEP 2 ─ */}
                {step === 2 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<ClockIcon size={18} color="white" />} title="When to take it?" />
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className={labelCls}>Frequency</label>
                          <div className="flex gap-2">
                            {(["daily", "weekly", "custom"] as FrequencyType[]).map(f => (
                              <button key={f} onClick={() => setFrequency(f)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border-2 ${frequency === f ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-sky-500 shadow-md shadow-sky-200" : "bg-white text-slate-500 border-sky-100 hover:border-sky-300 hover:text-sky-600"}`}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                        {frequency !== "daily" && (
                          <div>
                            <label className={labelCls}>Days</label>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map(d => {
                                const sel = selectedDays.includes(d)
                                return (
                                  <button key={d} onClick={() => setSelectedDays(prev => sel ? prev.filter(x => x !== d) : [...prev, d])}
                                    className={`w-11 h-10 rounded-lg text-xs font-bold transition-all border-2 ${sel ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-sky-400 shadow-sm shadow-sky-200" : "bg-white text-slate-500 border-sky-100 hover:border-sky-300"}`}>
                                    {d}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className={labelCls}>Reminder times</label>
                          <div className="flex flex-col gap-2.5">
                            {PRESET_TIMES.map(pt => {
                              const active = activeTimes.has(pt.id)
                              return (
                                <div key={pt.id}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${active ? "bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200" : "bg-white border-sky-100"}`}>
                                  <button onClick={() => toggleTime(pt.id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${active ? "bg-gradient-to-br from-sky-500 to-cyan-500 border-sky-500" : "bg-white border-slate-300"}`}>
                                    {active && <CheckIcon size={10} color="white" />}
                                  </button>
                                  <span className={`text-sm font-semibold w-20 ${active ? "text-sky-700" : "text-slate-500"}`}>{pt.label}</span>
                                  <input type="time" value={timeValues[pt.id] || pt.time}
                                    onChange={e => setTimeValues(prev => ({ ...prev, [pt.id]: e.target.value }))}
                                    className="ml-auto text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer" />
                                </div>
                              )
                            })}
                            {customTimes.map(ct => (
                              <div key={ct.id} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
                                <button onClick={() => toggleTime(ct.id)}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeTimes.has(ct.id) ? "bg-gradient-to-br from-sky-500 to-cyan-500 border-sky-500" : "bg-white border-slate-300"}`}>
                                  {activeTimes.has(ct.id) && <CheckIcon size={10} color="white" />}
                                </button>
                                <input value={ct.label} onChange={e => setCustomTimes(prev => prev.map(t => t.id === ct.id ? { ...t, label: e.target.value } : t))}
                                  className="text-sm font-semibold text-sky-700 bg-transparent border-none outline-none w-24" placeholder="Label" />
                                <input type="time" value={timeValues[ct.id] || ct.time}
                                  onChange={e => setTimeValues(prev => ({ ...prev, [ct.id]: e.target.value }))}
                                  className="ml-auto text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer" />
                                <button onClick={() => removeCustomTime(ct.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                  <TrashIcon size={13} />
                                </button>
                              </div>
                            ))}
                            <button onClick={addCustomTime}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-sky-200 text-sky-500 text-sm font-semibold hover:border-sky-400 hover:bg-sky-50 transition-all">
                              <PlusIcon size={13} color="#0ea5e9" /> Add custom time
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Start date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>End date</label>
                            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(1)}><BackIcon size={15} /> Back</button>
                      <button className={primaryCls} disabled={!step2Valid} onClick={() => setStep(3)}>Next: Notify →</button>
                    </div>
                  </div>
                )}

                {/* ─ STEP 3 ─ */}
                {step === 3 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<BellIcon size={18} color="white" />} title="How to notify you?" />
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className={labelCls}>Notification channel</label>
                          <div className="grid grid-cols-3 gap-3">
                            {([
                              { v: "email", label: "Email", emoji: "📧" },
                              { v: "whatsapp", label: "WhatsApp", emoji: "💬" },
                              { v: "both", label: "Both", emoji: "🔔" },
                            ] as { v: NotifyChannel; label: string; emoji: string }[]).map(o => (
                              <button key={o.v} onClick={() => setChannel(o.v)}
                                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${channel === o.v ? "bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-400 text-sky-700 shadow-md shadow-sky-100" : "bg-white border-sky-100 text-slate-500 hover:border-sky-200"}`}>
                                <span className="text-xl">{o.emoji}</span>
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(channel === "email" || channel === "both") && (
                          <div>
                            <label className={labelCls}>Email address</label>
                            <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                          </div>
                        )}
                        {(channel === "whatsapp" || channel === "both") && (
                          <div>
                            <label className={labelCls}>WhatsApp number <span className="normal-case font-normal text-slate-400 tracking-normal">(with country code)</span></label>
                            <input type="tel" className={inputCls} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+91 98765 43210" />
                            <p className="text-xs text-slate-400 mt-1.5">Sent via Twilio. Ensure the number is registered on WhatsApp.</p>
                          </div>
                        )}
                        <div className="bg-gradient-to-br from-sky-50 to-cyan-50 rounded-xl p-4 border-2 border-sky-100">
                          <p className="text-xs font-bold text-sky-600 uppercase tracking-wide mb-2">Preview notification</p>
                          <p className="text-sm text-sky-800 leading-relaxed">
                            💊 <strong>Reminder:</strong> Time to take your <strong>{medicineName || "medicine"}</strong>{dosageNote ? ` — ${dosageNote}` : ""}. Stay consistent! ✅
                          </p>
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(2)}><BackIcon /> Back</button>
                      <button className={primaryCls} disabled={!step3Valid} onClick={() => setStep(4)}>Review & Confirm →</button>
                    </div>
                  </div>
                )}

                {/* ─ STEP 4 ─ */}
                {step === 4 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<CheckIcon size={18} color="white" />} title="Review your reminder" />
                      <div className="flex flex-col gap-2.5">
                        {[
                          { label: "Medicine", value: medicineName },
                          { label: "Dosage", value: dosageNote || "—" },
                          { label: "Frequency", value: frequency === "daily" ? "Every day" : `${frequency} (${selectedDays.join(", ")})` },
                          {
                            label: "Times", value: Array.from(activeTimes).map(id => {
                              const p = PRESET_TIMES.find(x => x.id === id)
                              const c = customTimes.find(x => x.id === id)
                              const t = timeValues[id]
                              return p ? `${p.label} (${formatTime12(t || p.time)})` : c ? `${c.label} (${formatTime12(t || c.time)})` : id
                            }).join(" · "),
                          },
                          { label: "Duration", value: `${startDate} → ${endDate}` },
                          { label: "Notify via", value: channel === "both" ? `Email (${email}) & WhatsApp (${whatsapp})` : channel === "email" ? `Email — ${email}` : `WhatsApp — ${whatsapp}` },
                        ].map(row => (
                          <div key={row.label} className="flex gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide min-w-[72px] pt-0.5">{row.label}</span>
                            <span className="text-sm font-semibold text-slate-700">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      {error && (
                        <div className="mt-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-sm text-red-600 font-medium">{error}</div>
                      )}
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(3)}><BackIcon /> Back</button>
                      <button className={primaryCls} onClick={handleSave} disabled={saving}>
                        {saving
                          ? <><svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Saving…</>
                          : <><BellIcon size={15} color="white" /> Save Reminder</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

        {/* ══ EDIT VIEW ══ */}
        {view === "edit" && (
          <>
            {saved ? (
              <div className="text-center py-20 px-5 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sky-200">
                  <CheckIcon size={32} color="white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Reminder updated! ✅</h2>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">
                  Your reminder for <strong className="text-slate-700">{medicineName}</strong> has been updated.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => { resetForm(); setEditingReminder(null); setView("list") }} className={ghostCls}>View all reminders</button>
                </div>
              </div>
            ) : (
              <div className="max-w-xl mx-auto">
                <StepIndicator step={step} />

                {step === 1 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<PillIcon size={18} color="white" />} title="Which medicine?" />
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className={labelCls}>Medicine name</label>
                          <input className={inputCls} value={medicineName} onChange={e => setMedicineName(e.target.value)} placeholder="e.g. Metformin, Crocin 500mg…" />
                        </div>
                        <div>
                          <label className={labelCls}>Dosage note <span className="normal-case text-slate-400 font-normal tracking-normal">(optional)</span></label>
                          <input className={inputCls} value={dosageNote} onChange={e => setDosageNote(e.target.value)} placeholder="e.g. 1 tablet after meals…" />
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-end">
                      <button className={primaryCls} disabled={!step1Valid} onClick={() => setStep(2)}>Next: Schedule →</button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<ClockIcon size={18} color="white" />} title="When to take it?" />
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className={labelCls}>Frequency</label>
                          <div className="flex gap-2">
                            {(["daily", "weekly", "custom"] as FrequencyType[]).map(f => (
                              <button key={f} onClick={() => setFrequency(f)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all border-2 ${frequency === f ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-sky-500 shadow-md shadow-sky-200" : "bg-white text-slate-500 border-sky-100 hover:border-sky-300 hover:text-sky-600"}`}>
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                        {frequency !== "daily" && (
                          <div>
                            <label className={labelCls}>Days</label>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map(d => {
                                const sel = selectedDays.includes(d)
                                return (
                                  <button key={d} onClick={() => setSelectedDays(prev => sel ? prev.filter(x => x !== d) : [...prev, d])}
                                    className={`w-11 h-10 rounded-lg text-xs font-bold transition-all border-2 ${sel ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-sky-400 shadow-sm shadow-sky-200" : "bg-white text-slate-500 border-sky-100 hover:border-sky-300"}`}>
                                    {d}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <div>
                          <label className={labelCls}>Reminder times</label>
                          <div className="flex flex-col gap-2.5">
                            {PRESET_TIMES.map(pt => {
                              const active = activeTimes.has(pt.id)
                              return (
                                <div key={pt.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${active ? "bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-200" : "bg-white border-sky-100"}`}>
                                  <button onClick={() => toggleTime(pt.id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${active ? "bg-gradient-to-br from-sky-500 to-cyan-500 border-sky-500" : "bg-white border-slate-300"}`}>
                                    {active && <CheckIcon size={10} color="white" />}
                                  </button>
                                  <span className={`text-sm font-semibold w-20 ${active ? "text-sky-700" : "text-slate-500"}`}>{pt.label}</span>
                                  <input type="time" value={timeValues[pt.id] || pt.time}
                                    onChange={e => setTimeValues(prev => ({ ...prev, [pt.id]: e.target.value }))}
                                    className="ml-auto text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer" />
                                </div>
                              )
                            })}
                            {customTimes.map(ct => (
                              <div key={ct.id} className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50">
                                <button onClick={() => toggleTime(ct.id)}
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${activeTimes.has(ct.id) ? "bg-gradient-to-br from-sky-500 to-cyan-500 border-sky-500" : "bg-white border-slate-300"}`}>
                                  {activeTimes.has(ct.id) && <CheckIcon size={10} color="white" />}
                                </button>
                                <input value={ct.label} onChange={e => setCustomTimes(prev => prev.map(t => t.id === ct.id ? { ...t, label: e.target.value } : t))}
                                  className="text-sm font-semibold text-sky-700 bg-transparent border-none outline-none w-24" placeholder="Label" />
                                <input type="time" value={timeValues[ct.id] || ct.time}
                                  onChange={e => setTimeValues(prev => ({ ...prev, [ct.id]: e.target.value }))}
                                  className="ml-auto text-sm font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer" />
                                <button onClick={() => removeCustomTime(ct.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                  <TrashIcon size={13} />
                                </button>
                              </div>
                            ))}
                            <button onClick={addCustomTime}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-sky-200 text-sky-500 text-sm font-semibold hover:border-sky-400 hover:bg-sky-50 transition-all">
                              <PlusIcon size={13} color="#0ea5e9" /> Add custom time
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className={labelCls}>Start date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>End date</label>
                            <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
                          </div>
                        </div>
                      </div>
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(1)}><BackIcon size={15} /> Back</button>
                      <button className={primaryCls} disabled={!step2Valid} onClick={() => setStep(3)}>Next: Notify →</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<BellIcon size={18} color="white" />} title="How to notify you?" />
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className={labelCls}>Notification channel</label>
                          <div className="grid grid-cols-3 gap-3">
                            {([
                              { v: "email", label: "Email", emoji: "📧" },
                              { v: "whatsapp", label: "WhatsApp", emoji: "💬" },
                              { v: "both", label: "Both", emoji: "🔔" },
                            ] as { v: NotifyChannel; label: string; emoji: string }[]).map(o => (
                              <button key={o.v} onClick={() => setChannel(o.v)}
                                className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-semibold text-sm transition-all ${channel === o.v ? "bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-400 text-sky-700 shadow-md shadow-sky-100" : "bg-white border-sky-100 text-slate-500 hover:border-sky-200"}`}>
                                <span className="text-xl">{o.emoji}</span>
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        {(channel === "email" || channel === "both") && (
                          <div>
                            <label className={labelCls}>Email address</label>
                            <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                          </div>
                        )}
                        {(channel === "whatsapp" || channel === "both") && (
                          <div>
                            <label className={labelCls}>WhatsApp number <span className="normal-case font-normal text-slate-400 tracking-normal">(with country code)</span></label>
                            <input type="tel" className={inputCls} value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+91 98765 43210" />
                          </div>
                        )}
                      </div>
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(2)}><BackIcon /> Back</button>
                      <button className={primaryCls} disabled={!step3Valid} onClick={() => setStep(4)}>Review & Confirm →</button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="flex flex-col gap-5">
                    <Card>
                      <SectionTitle icon={<CheckIcon size={18} color="white" />} title="Review your changes" />
                      <div className="flex flex-col gap-2.5">
                        {[
                          { label: "Medicine", value: medicineName },
                          { label: "Dosage", value: dosageNote || "—" },
                          { label: "Frequency", value: frequency === "daily" ? "Every day" : `${frequency} (${selectedDays.join(", ")})` },
                          {
                            label: "Times", value: Array.from(activeTimes).map(id => {
                              const p = PRESET_TIMES.find(x => x.id === id)
                              const c = customTimes.find(x => x.id === id)
                              const t = timeValues[id]
                              return p ? `${p.label} (${formatTime12(t || p.time)})` : c ? `${c.label} (${formatTime12(t || c.time)})` : id
                            }).join(" · "),
                          },
                          { label: "Duration", value: `${startDate} → ${endDate}` },
                          { label: "Notify via", value: channel === "both" ? `Email (${email}) & WhatsApp (${whatsapp})` : channel === "email" ? `Email — ${email}` : `WhatsApp — ${whatsapp}` },
                        ].map(row => (
                          <div key={row.label} className="flex gap-3 px-4 py-3 rounded-xl bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide min-w-[72px] pt-0.5">{row.label}</span>
                            <span className="text-sm font-semibold text-slate-700">{row.value}</span>
                          </div>
                        ))}
                      </div>
                      {error && (
                        <div className="mt-4 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl text-sm text-red-600 font-medium">{error}</div>
                      )}
                    </Card>
                    <div className="flex justify-between">
                      <button className={ghostCls} onClick={() => setStep(3)}><BackIcon /> Back</button>
                      <button className={primaryCls} onClick={handleUpdate} disabled={saving}>
                        {saving
                          ? <><svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> Updating…</>
                          : <><EditIcon size={15} color="white" /> Update Reminder</>
                        }
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <div
          onClick={() => onNavigate("appointments")}
          className="bg-gradient-to-br from-sky-500 to-cyan-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-sky-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group"
        >
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">📅</div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Appointments</h3>
          <p className="text-sm opacity-90">View and manage your scheduled appointments</p>
        </div>

        <div
          onClick={() => onNavigate("availability")}
          className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-cyan-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group"
        >
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">🩺</div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Find Doctors</h3>
          <p className="text-sm opacity-90">Browse available doctors and specialists</p>
        </div>

        <div
          onClick={() => onNavigate("history")}
          className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group"
        >
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">📋</div>
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>Medical History</h3>
          <p className="text-sm opacity-90">View your complete medical records</p>
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <p className="text-center text-xs text-slate-400 mt-4 max-w-md mx-auto leading-relaxed">
        Reminders are for convenience only. Always follow your doctor's prescription and do not adjust dosage without medical advice.
      </p>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-float { animation: float 20s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 25s ease-in-out infinite; }
      `}</style>
    </div>
  )
}