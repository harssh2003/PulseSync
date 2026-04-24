"use client"
import { useState, useEffect, useCallback } from "react"

const API_BASE_URL = "http://localhost:5000/api"

interface AppointmentBookingProps {
  onNavigate: (page: string) => void
}

// Shape returned by the fixed backend (all names already resolved)
interface Appointment {
  id:               string
  doctor_name:      string   // e.g. "Dr. Arjun Mehta"
  hospital_name:    string   // e.g. "PulseSync Hospital"
  specialty:        string
  doctor_id:        string
  hospital_id:      string
  patient_id:       string
  appointment_date: string
  appointment_time: string
  reason:           string
  notes:            string
  status:           "pending" | "confirmed" | "completed" | "cancelled"
  reschedule_reason?:  string
  reschedule_history?: Array<{ previous_date: string; previous_time: string; reason: string; rescheduled_at: string }>
}

interface AvailSlot {
  time: string
  end: string
  available: boolean
}

interface AvailDateEntry {
  date: string
  slots: AvailSlot[]
}

// ── Status badge ───────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border border-green-200",
  pending:   "bg-yellow-100 text-yellow-700 border border-yellow-200",
  completed: "bg-blue-100 text-blue-700 border border-blue-200",
  cancelled: "bg-red-100 text-red-700 border border-red-200",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  )
}

// ── Single appointment card ────────────────────────────────────────────────
function AppointmentCard({
  appointment,
  isPast = false,
  onCancel,
  onReschedule,
  onDelete,
}: {
  appointment: Appointment
  isPast?: boolean
  onCancel?: () => void
  onReschedule?: () => void
  onDelete?: () => void
}) {
  const formattedDate = appointment.appointment_date
    ? new Date(appointment.appointment_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short", year: "numeric", month: "short", day: "numeric",
      })
    : "Date not set"

  const formattedTime = formatTime(appointment.appointment_time)

  return (
    <div className={`bg-white rounded-2xl shadow-md border-2 p-5 flex flex-col gap-3 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      isPast ? "border-slate-100 opacity-80" : "border-sky-100 hover:border-sky-300"
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-base font-bold text-slate-900 leading-tight">
            {appointment.doctor_name}
          </p>
          <p className="text-xs text-cyan-600 font-semibold mt-0.5">
            {appointment.specialty}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            🏥 {appointment.hospital_name}
          </p>
        </div>
        <StatusBadge status={appointment.status} />
      </div>

      {/* Date & Time */}
      <div className="flex items-center gap-2 bg-sky-50 rounded-xl px-3 py-2">
        <span className="text-lg">📅</span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{formattedDate}</p>
          <p className="text-xs text-slate-500">⏰ {formattedTime}</p>
        </div>
      </div>

      {/* Reason */}
      {appointment.reason && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Reason</p>
          <p className="text-sm text-slate-700">{appointment.reason}</p>
        </div>
      )}

      {/* Notes */}
      {appointment.notes && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Notes</p>
          <p className="text-sm text-slate-600 italic">{appointment.notes}</p>
        </div>
      )}

      {/* Reschedule info */}
      {appointment.reschedule_reason && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <p className="text-xs font-semibold text-amber-700">🔄 Rescheduled</p>
          <p className="text-xs text-amber-600 mt-0.5">Reason: {appointment.reschedule_reason}</p>
        </div>
      )}

      {/* Actions */}
      {!isPast && appointment.status !== "cancelled" && appointment.status !== "completed" && (
        <div className="flex gap-2 mt-1">
          {onReschedule && (
            <button
              onClick={onReschedule}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all"
            >
              ✏️ Reschedule
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Delete button for cancelled appointments */}
      {appointment.status === "cancelled" && onDelete && (
        <button
          onClick={onDelete}
          className="mt-1 w-full py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
        >
          🗑️ Delete
        </button>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AppointmentBooking({ onNavigate }: AppointmentBookingProps) {
  const [isVisible, setIsVisible]       = useState(false)
  const [isLoading, setIsLoading]       = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [error, setError]               = useState<string | null>(null)
  const [successMsg, setSuccessMsg]     = useState<string | null>(null)
  // Cancel confirmation modal
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState("")
  // Reschedule modal state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null)
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleSlot, setRescheduleSlot] = useState<AvailSlot | null>(null)
  const [rescheduleAvailDates, setRescheduleAvailDates] = useState<AvailDateEntry[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("auth_token") ?? "" : ""

  const fetchAppointments = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setError("Authentication token not found. Please log in again.")
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch(`${API_BASE_URL}/appointments/patient/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to fetch appointments")
      }

      const data = await res.json()
      const all  = [...(data.upcoming ?? []), ...(data.past ?? [])]

      setAppointments(all)
      setUpcomingCount(data.total_upcoming  ?? 0)
      setCompletedCount(data.total_completed ?? 0)
    } catch (err) {
      console.error("[v0] fetchAppointments error:", err)
      setError(err instanceof Error ? err.message : "Failed to load appointments")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsVisible(true)
    fetchAppointments()
  }, [fetchAppointments])

  // ── Cancel flow ──────────────────────────────────────────────────────────
  const openCancelModal = (id: string) => {
    setCancelTarget(id)
    setCancelReason("")
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${cancelTarget}/cancel`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: cancelReason || "Cancelled by patient" }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to cancel appointment")
      }
      setSuccessMsg("Appointment cancelled successfully.")
      setTimeout(() => setSuccessMsg(null), 3000)
      setCancelTarget(null)
      fetchAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel appointment")
      setTimeout(() => setError(null), 5000)
    }
  }

  // ── Reschedule flow ─────────────────────────────────────────────────────
  const openRescheduleModal = async (apt: Appointment) => {
    setRescheduleTarget(apt)
    setRescheduleReason("")
    setRescheduleDate("")
    setRescheduleSlot(null)
    setRescheduleAvailDates([])

    // Fetch available slots for this doctor
    const token = getToken()
    try {
      setIsLoadingSlots(true)
      const res = await fetch(
        `${API_BASE_URL}/appointments/availability/hospital/${apt.doctor_id}/slots`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      )
      if (!res.ok) throw new Error("Failed to fetch availability")
      const data = await res.json()
      const availabilities = data.availabilities ?? []

      // Build date → available-slots map, filtering past dates and booked slots
      const today = new Date().toISOString().split("T")[0]
      const dateEntries: AvailDateEntry[] = availabilities
        .filter((a: any) => a.date >= today && a.is_available)
        .map((a: any) => ({
          date: a.date,
          slots: (a.slots ?? []).filter((s: AvailSlot) => s.available),
        }))
        .filter((d: AvailDateEntry) => d.slots.length > 0)
        .sort((a: AvailDateEntry, b: AvailDateEntry) => a.date.localeCompare(b.date))

      setRescheduleAvailDates(dateEntries)
    } catch (err) {
      console.error("[Reschedule] Error fetching slots:", err)
      setError("Failed to load available slots for rescheduling.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsLoadingSlots(false)
    }
  }

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleSlot || !rescheduleReason.trim()) return
    const token = getToken()
    try {
      setIsRescheduling(true)
      const res = await fetch(
        `${API_BASE_URL}/appointments/${rescheduleTarget.id}/reschedule`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            new_date: rescheduleDate,
            new_time: rescheduleSlot.time,
            reschedule_reason: rescheduleReason.trim(),
          }),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to reschedule appointment")
      }
      setSuccessMsg("Appointment rescheduled successfully!")
      setTimeout(() => setSuccessMsg(null), 4000)
      setRescheduleTarget(null)
      fetchAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reschedule appointment")
      setTimeout(() => setError(null), 5000)
    } finally {
      setIsRescheduling(false)
    }
  }

  const getRescheduleDateSlots = (): AvailSlot[] => {
    if (!rescheduleDate) return []
    return rescheduleAvailDates.find(d => d.date === rescheduleDate)?.slots ?? []
  }

  // ── Delete flow ─────────────────────────────────────────────────────────
  const deleteAppointment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this cancelled appointment? This action cannot be undone.")) return
    const token = getToken()
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to delete appointment")
      }
      setSuccessMsg("Appointment deleted successfully.")
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchAppointments()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete appointment")
      setTimeout(() => setError(null), 5000)
    }
  }

  // ── Splits ───────────────────────────────────────────────────────────────
  const upcomingApts = appointments.filter(
    (a) => a.status !== "completed" && a.status !== "cancelled"
  )
  const pastApts = appointments.filter(
    (a) => a.status === "completed" || a.status === "cancelled"
  )

  // ── Loading screen ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4" />
          <p className="text-slate-600 font-medium">Loading appointments…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-x-hidden bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-8 bg-gradient-to-br from-blue-100 via-sky-50 to-cyan-100 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-blue-300/30 rounded-full blur-3xl -top-10 -right-10 animate-pulse" />
          <div className="absolute w-80 h-80 bg-sky-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-blue-700 text-sm font-semibold mb-4 shadow-md">
            📋 Your Healthcare Schedule
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-700 bg-clip-text text-transparent mb-4 leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            My Appointments
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            Manage your scheduled appointments and view your medical history
          </p>
        </div>
      </div>

      {/* ── Alerts ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-lg">
          <p className="font-medium">✅ {successMsg}</p>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        {[
          { emoji: "📅", value: upcomingCount,       label: "Upcoming",  color: "sky" },
          { emoji: "✅", value: completedCount,      label: "Completed", color: "cyan" },
          { emoji: "📊", value: appointments.length, label: "Total",     color: "blue" },
        ].map(({ emoji, value, label, color }) => (
          <div key={label} className={`bg-white p-6 rounded-2xl shadow-lg border-2 border-${color}-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 bg-gradient-to-br from-${color}-100 to-${color}-200 rounded-xl flex items-center justify-center text-2xl`}>
                {emoji}
              </div>
              <div>
                <p className={`text-2xl font-bold text-${color}-900`}>{value}</p>
                <p className="text-sm text-slate-600 font-medium">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Upcoming Appointments ───────────────────────────────────────── */}
      <section className={`flex flex-col gap-6 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl">
              📅
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Upcoming Appointments</h2>
          </div>
          <button
            onClick={() => onNavigate("availability")}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            + Book New
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingApts.length > 0 ? (
            upcomingApts.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                onCancel={() => openCancelModal(apt.id)}
                onReschedule={() => openRescheduleModal(apt)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-20 px-5 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
              <div className="text-7xl mb-5">📅</div>
              <p className="text-xl font-bold text-slate-800 mb-2">No upcoming appointments</p>
              <p className="text-base text-slate-600 mb-6">Book an appointment with one of our expert doctors</p>
              <button
                onClick={() => onNavigate("availability")}
                className="px-8 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Book an Appointment
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Past Appointments ───────────────────────────────────────────── */}
      <section className={`flex flex-col gap-6 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl flex items-center justify-center text-white text-xl">
            📜
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Past Appointments</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pastApts.length > 0 ? (
            pastApts.map((apt) => (
              <AppointmentCard
                key={apt.id}
                appointment={apt}
                isPast
                onDelete={apt.status === "cancelled" ? () => deleteAppointment(apt.id) : undefined}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16 px-5 bg-white rounded-2xl shadow-md border border-slate-200 text-slate-500">
              <div className="text-5xl mb-3 opacity-50">📜</div>
              <p className="text-lg font-medium">No past appointments</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Quick Actions ───────────────────────────────────────────────── */}
      <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-400 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        {[
          { emoji: "🩺", title: "Find Doctors",   desc: "Browse available doctors and specialists", page: "availability", from: "sky",  to: "cyan" },
          { emoji: "🏥", title: "Find Hospitals",  desc: "Locate nearby hospitals and clinics",      page: "search",       from: "cyan", to: "blue" },
          { emoji: "📋", title: "Medical History", desc: "View your complete medical records",       page: "history",      from: "blue", to: "indigo" },
        ].map(({ emoji, title, desc, page, from, to }) => (
          <div
            key={title}
            onClick={() => onNavigate(page)}
            className={`bg-gradient-to-br from-${from}-500 to-${to}-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-2 group`}
          >
            <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">{emoji}</div>
            <h3 className="text-lg font-bold mb-2">{title}</h3>
            <p className="text-sm opacity-90">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Cancel Modal ────────────────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Cancel Appointment</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a reason for cancellation (optional).
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling better…"
              rows={3}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-red-400 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={confirmCancel}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
              >
                Confirm Cancellation
              </button>
              <button
                onClick={() => setCancelTarget(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                Keep Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reschedule Modal ──────────────────────────────────────────────── */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-start justify-center pt-24 pb-6 px-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2 flex-shrink-0">
              <div>
                <h2
                  className="text-2xl font-bold text-slate-900"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Reschedule Appointment
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  with <span className="font-semibold text-cyan-600">{rescheduleTarget.doctor_name}</span>
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Current: {rescheduleTarget.appointment_date} at {formatTime(rescheduleTarget.appointment_time)}
                </p>
              </div>
              <button
                onClick={() => setRescheduleTarget(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1">
              {/* Loading */}
              {isLoadingSlots && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500 mb-3" />
                  <p className="text-sm text-slate-500">Loading available slots…</p>
                </div>
              )}

              {!isLoadingSlots && (
                <>
                  {/* Date selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select New Date <span className="text-red-500">*</span>
                    </label>
                    {rescheduleAvailDates.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {rescheduleAvailDates.map((d) => (
                          <button
                            key={d.date}
                            onClick={() => { setRescheduleDate(d.date); setRescheduleSlot(null) }}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              rescheduleDate === d.date
                                ? "bg-amber-500 text-white border-amber-500 shadow-md"
                                : "bg-white text-amber-700 border-amber-200 hover:border-amber-400"
                            }`}
                          >
                            {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                            <span className="block text-xs opacity-75 font-normal">
                              {d.slots.length} slot{d.slots.length !== 1 ? "s" : ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No available dates found for this doctor.</p>
                    )}
                  </div>

                  {/* Time slot selection */}
                  {rescheduleDate && (
                    <div className="mb-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Select New Time <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getRescheduleDateSlots().map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setRescheduleSlot(slot)}
                            className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                              rescheduleSlot?.time === slot.time
                                ? "bg-amber-500 text-white border-amber-500 shadow-md"
                                : "bg-white text-amber-700 border-amber-200 hover:border-amber-400"
                            }`}
                          >
                            {formatTime(slot.time)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reason (mandatory) */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Reason for Rescheduling <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g. Schedule conflict, travel plans, feeling unwell on that day…"
                      rows={3}
                      className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 resize-none"
                    />
                  </div>

                  {/* Reschedule history */}
                  {rescheduleTarget.reschedule_history && rescheduleTarget.reschedule_history.length > 0 && (
                    <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Previous Reschedules</p>
                      {rescheduleTarget.reschedule_history.map((h, i) => (
                        <div key={i} className="text-xs text-slate-600 mb-1">
                          <span className="font-medium">{h.previous_date} at {formatTime(h.previous_time)}</span>
                          <span className="text-slate-400"> — {h.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-3">
                    <button
                      onClick={confirmReschedule}
                      disabled={isRescheduling || !rescheduleDate || !rescheduleSlot || !rescheduleReason.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isRescheduling ? "Rescheduling…" : "Confirm Reschedule"}
                    </button>
                    <button
                      onClick={() => setRescheduleTarget(null)}
                      className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  if (!time) return "Time not set"
  const [h, m] = time.split(":").map(Number)
  if (isNaN(h) || isNaN(m)) return time
  const period   = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`
}