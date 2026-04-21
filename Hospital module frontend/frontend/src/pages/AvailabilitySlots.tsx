"use client"

import type React from "react"
import { useState, useEffect } from "react"

interface AvailabilitySlotsProps {
  onNavigate: (page: string) => void
}

interface TimeSlot {
  time: string
  end: string
  available: boolean
}

interface DoctorAvailability {
  id: string
  doctor_id: string
  doctor_name: string
  date: string
  start_time: string
  end_time: string
  duration_minutes: number
  is_available: boolean
  slots: TimeSlot[]
  created_at: string
}

const API_BASE_URL = "http://localhost:5000/api"

export default function AvailabilitySlots({ onNavigate }: AvailabilitySlotsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [availabilities, setAvailabilities] = useState<DoctorAvailability[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // We no longer expose doctor_id in the form — the backend reads it from the
  // JWT token (request.user_id).  The form only collects scheduling info.
  const [formData, setFormData] = useState({
    date: "",
    start_time: "",
    end_time: "",
    duration_minutes: 30,
  })

  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") ?? "" : ""
  const token  = typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : ""

  useEffect(() => {
    setIsVisible(true)
    fetchAvailabilities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fetch all slots for this hospital ──────────────────────────────────
  const fetchAvailabilities = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(
        `${API_BASE_URL}/appointments/availability/hospital/${userId}/slots`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to fetch availability slots")
      }

      const data = await response.json()
      setAvailabilities(data.availabilities ?? [])
    } catch (err) {
      console.error("[v0] Error fetching availabilities:", err)
      setError(err instanceof Error ? err.message : "Failed to load availability slots")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Input handler ───────────────────────────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "duration_minutes" ? parseInt(value, 10) : value,
    }))
  }

  // ── Validate times before submitting ───────────────────────────────────
  const validateTimes = (): string | null => {
    if (!formData.date)       return "Please select a date."
    if (!formData.start_time) return "Please select a start time."
    if (!formData.end_time)   return "Please select an end time."
    if (formData.start_time >= formData.end_time)
      return "End time must be after start time."
    return null
  }

  // ── Create availability slot ────────────────────────────────────────────
  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateTimes()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      // doctor_id is the logged-in hospital user — backend also reads it from
      // the JWT, but we send it explicitly so create_availability can upsert
      // correctly by (doctor_id, date).
      const payload = {
        ...formData,
        doctor_id: userId,  // hospital user acts as the "doctor" here
      }

      const response = await fetch(`${API_BASE_URL}/appointments/availability/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to create availability slot")
      }

      setSuccessMessage("Availability slot created successfully!")
      setTimeout(() => setSuccessMessage(null), 3000)

      // Reset form (keep doctor_id implicit)
      setFormData({ date: "", start_time: "", end_time: "", duration_minutes: 30 })

      fetchAvailabilities()
    } catch (err) {
      console.error("[v0] Error creating availability:", err)
      setError(err instanceof Error ? err.message : "Failed to create availability slot")
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Toggle slot on / off ────────────────────────────────────────────────
  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments/availability/${id}/toggle`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to update availability status")
      }

      setSuccessMessage(
        `Availability ${currentStatus ? "disabled" : "enabled"} successfully!`
      )
      setTimeout(() => setSuccessMessage(null), 3000)
      fetchAvailabilities()
    } catch (err) {
      console.error("[v0] Error toggling availability:", err)
      setError(err instanceof Error ? err.message : "Failed to update availability status")
      setTimeout(() => setError(null), 5000)
    }
  }

  // ── Loading screen ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4" />
          <p className="text-slate-600 font-medium">Loading availability slots…</p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-8 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-sky-300/30 rounded-full blur-3xl -top-10 -right-10 animate-pulse" />
          <div
            className="absolute w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
        <div
          className={`text-center relative z-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"
          }`}
        >
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sky-700 text-sm font-semibold mb-4 shadow-md">
            ⏰ Schedule Management
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent mb-4 leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Doctor Availability Slots
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            Manage your availability slots for patient appointments
          </p>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* ── Add Availability Form ───────────────────────────────────────── */}
      <div
        className={`bg-white p-8 rounded-3xl shadow-xl border-2 border-sky-100/50 transition-all duration-700 delay-100 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <h2
          className="text-2xl font-bold text-slate-900 mb-6"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Add New Availability Slot
        </h2>

        <form onSubmit={handleAddAvailability} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Slot Duration
              </label>
              <select
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleInputChange}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                required
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                required
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
          </div>

          {/* Preview of generated slots */}
          {formData.start_time && formData.end_time && formData.start_time < formData.end_time && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-sky-700 mb-2">
                Slots that will be created:
              </p>
              <div className="flex flex-wrap gap-2">
                {generateSlotPreview(formData.start_time, formData.end_time, formData.duration_minutes).map(
                  (slot) => (
                    <span
                      key={slot}
                      className="px-3 py-1 bg-white border border-sky-300 rounded-lg text-xs font-semibold text-sky-700"
                    >
                      {slot}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Creating…" : "Add Availability Slot"}
          </button>
        </form>
      </div>

      {/* ── Current Slots List ──────────────────────────────────────────── */}
      <div
        className={`space-y-4 transition-all duration-700 delay-200 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <h2
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          Current Availability Slots
        </h2>

        {availabilities.length > 0 ? (
          availabilities.map((slot) => (
            <div
              key={slot.id}
              className="bg-white p-6 rounded-2xl shadow-lg border-2 border-sky-100 hover:border-sky-300 transition-all hover:-translate-y-1"
            >
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {slot.doctor_name || "Your Schedule"}
                  </h3>
                  <p className="text-sm text-slate-600">
                    📅 {new Date(slot.date + "T00:00:00").toLocaleDateString("en-IN", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-slate-600">
                    ⏰ {slot.start_time} – {slot.end_time} &nbsp;·&nbsp;{slot.duration_minutes} min slots
                  </p>

                  {/* Individual time slots */}
                  {slot.slots && slot.slots.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {slot.slots.map((s, i) => (
                        <span
                          key={i}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            s.available
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-400 line-through"
                          }`}
                        >
                          {s.time}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      slot.is_available
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {slot.is_available ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleToggleAvailability(slot.id, slot.is_available)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      slot.is_available
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-sky-100 text-sky-700 hover:bg-sky-200"
                    }`}
                  >
                    {slot.is_available ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 px-5 bg-white rounded-2xl shadow-md border border-slate-200 text-slate-500">
            <div className="text-5xl mb-3 opacity-50">⏰</div>
            <p className="text-lg font-medium">No availability slots created yet</p>
            <p className="text-sm mt-1">Use the form above to add your first slot.</p>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}

// ── Helper: generate slot time labels for the preview ─────────────────────
function generateSlotPreview(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const labels: string[] = []
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  let current = sh * 60 + sm
  const end = eh * 60 + em

  while (current < end) {
    const next = Math.min(current + durationMinutes, end)
    const fmtSlot = (mins: number) => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      const period = h >= 12 ? "PM" : "AM"
      const displayH = h % 12 === 0 ? 12 : h % 12
      return `${displayH}:${m.toString().padStart(2, "0")} ${period}`
    }
    labels.push(`${fmtSlot(current)} – ${fmtSlot(next)}`)
    current = next
  }
  return labels
}