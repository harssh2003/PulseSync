"use client"

import { useState, useEffect } from "react"
import { useNotification } from "../context/NotificationContext"

interface AppointmentManagementProps {
  onNavigate: (page: string) => void
}

// ─── Shape of what the backend's _enrich_appointment() returns ──────────────
interface Appointment {
  id: string
  // enriched display fields (set by backend – no secondary fetches needed)
  doctor_name: string
  hospital_name: string
  patient_name: string
  specialty: string
  // raw ids
  doctor_id: string
  hospital_id: string
  patient_id: string
  // scheduling
  appointment_date: string
  appointment_time: string
  reason: string
  notes: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  urgency_score?: number
  created_at: string
  updated_at: string
  reschedule_reason?: string
  reschedule_history?: Array<{ previous_date: string; previous_time: string; reason: string; rescheduled_at: string }>
}

const API_BASE_URL = "http://localhost:5000/api"

// ─── Token helper (single source of truth) ───────────────────────────────────
function getToken(): string | null {
  return localStorage.getItem("auth_token") || localStorage.getItem("token")
}

export default function AppointmentManagement({ onNavigate }: AppointmentManagementProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(true)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const { addNotification} = useNotification()

  useEffect(() => {
    setIsVisible(true)
    fetchAppointments()
  }, [])

  // ─── Main fetch – uses enriched data the backend already provides ───────────
  const fetchAppointments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getToken()
      if (!token) {
        setError("Authentication token not found. Please log in again.")
        setIsLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/appointments/hospital/appointments`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        // Surface the actual server error message if available
        let msg = "Failed to fetch appointments"
        try {
          const errBody = await response.json()
          if (errBody?.error) msg = errBody.error
        } catch (_) {}
        throw new Error(`${msg} (HTTP ${response.status})`)
      }

      const data = await response.json()

      // Backend returns { today, upcoming, past } – each already enriched
      const allAppointments: Appointment[] = [
        ...(data.today    ?? []),
        ...(data.upcoming ?? []),
        ...(data.past     ?? []),
      ]

      setAppointments(allAppointments)

      if (data.today && data.today.length > 0) {
        addNotification({
          title: "Today's Appointments",
          message: `You have ${data.today.length} appointment${data.today.length !== 1 ? "s" : ""} scheduled for today`,
          type: "info",
        })
      }
    } catch (err) {
      console.error("[AppointmentManagement] fetchAppointments error:", err)
      setError(err instanceof Error ? err.message : "Failed to load appointments")
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Filtered view for the selected date ─────────────────────────────────
  const filteredAppointments = appointments.filter(
    (apt) => apt.appointment_date === selectedDate && apt.status !== "cancelled",
  )

  // ─── Status actions ───────────────────────────────────────────────────────
  const updateAppointmentStatus = async (appointmentId: string, status: "confirmed" | "cancelled") => {
    try {
      const token = getToken()
      if (!token) {
        setError("Authentication token not found. Please log in again.")
        return
      }

      let endpoint = `${API_BASE_URL}/appointments/${appointmentId}`
      let body: Record<string, string> = {}

      if (status === "confirmed") {
        endpoint += "/confirm"
      } else {
        endpoint += "/cancel"
        const reason = prompt("Please provide a reason for cancellation:")
        if (!reason) return
        body = { reason }
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        let msg = `Failed to ${status} appointment`
        try {
          const errBody = await response.json()
          if (errBody?.error) msg = errBody.error
        } catch (_) {}
        throw new Error(msg)
      }

      setSuccessMessage(`Appointment ${status} successfully!`)
      setTimeout(() => setSuccessMessage(null), 3000)

      const apt = appointments.find((a) => a.id === appointmentId)
      if (apt) {
        addNotification({
          title: `Appointment ${status}`,
          message: `${apt.patient_name}'s appointment on ${apt.appointment_date} at ${apt.appointment_time} is now ${status}`,
          type: status === "confirmed" ? "success" : "warning",
          appointmentId,
        })
      }

      await fetchAppointments()
    } catch (err) {
      console.error("[AppointmentManagement] updateAppointmentStatus error:", err)
      setError(err instanceof Error ? err.message : "Failed to update appointment")
    }
  }

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4" />
          <p className="text-slate-600 font-medium">Loading appointments...</p>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">
      {/* Header */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-8 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-sky-300/30 rounded-full blur-3xl -top-10 -right-10 animate-pulse" />
          <div
            className="absolute w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
        <div
          className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}
        >
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sky-700 text-sm font-semibold mb-4 shadow-md">
            📅 Schedule Optimization
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent mb-4 leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Appointment Management
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            Book, reschedule, and optimize the hospital's appointment calendar
          </p>
        </div>
      </div>

      {/* Alerts */}
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

      {/* Date Picker */}
      <div
        className={`bg-white p-8 rounded-3xl shadow-xl border-2 border-sky-100/50 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
      >
        <label className="block text-sm font-semibold text-slate-700 mb-3">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full p-4 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
        />
        <p className="text-sm text-slate-600 mt-4">
          Showing{" "}
          <span className="text-sky-600 font-bold">{filteredAppointments.length}</span>{" "}
          appointment{filteredAppointments.length !== 1 ? "s" : ""} for {selectedDate}
        </p>
      </div>

      {/* Appointment Cards */}
      <div
        className={`space-y-4 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}
      >
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white p-6 rounded-2xl shadow-lg border-2 border-sky-100 hover:border-sky-300 transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      Patient: {apt.patient_name || apt.patient_id}
                    </h3>
                    <span className="text-xs px-3 py-1 bg-sky-100 text-sky-700 rounded-full font-semibold">
                      {apt.reason}
                    </span>
                    {apt.reschedule_reason && (
                      <span className="text-xs px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
                        🔄 Rescheduled
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 font-semibold">Doctor</p>
                      {/* Uses doctor_name from backend enrichment — no secondary fetch */}
                      <p className="text-slate-700 font-medium">{apt.doctor_name || "—"}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 font-semibold">Hospital</p>
                      <p className="text-slate-700 font-medium">{apt.hospital_name || "—"}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 font-semibold">Specialty</p>
                      <p className="text-slate-700 font-medium">{apt.specialty || "—"}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-xs text-slate-500 font-semibold">Time</p>
                      <p className="text-slate-700 font-medium">{apt.appointment_time}</p>
                    </div>
                  </div>

                  {apt.notes && (
                    <p className="text-xs text-slate-500 italic bg-sky-50 p-2 rounded">
                      Notes: {apt.notes}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  {apt.urgency_score === 4 && (
                    <span className="block px-4 py-1.5 rounded-lg text-xs font-bold mb-2 text-center bg-red-100 text-red-700 animate-pulse border border-red-200 shadow-sm">
                      🚨 Emergency
                    </span>
                  )}
                  {apt.urgency_score === 3 && (
                    <span className="block px-4 py-1.5 rounded-lg text-xs font-bold mb-2 text-center bg-orange-100 text-orange-700 border border-orange-200 shadow-sm">
                      ⚠️ High Priority
                    </span>
                  )}
                  <span
                    className={`block px-4 py-2 rounded-lg text-xs font-semibold mb-3 text-center ${
                      apt.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : apt.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </span>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedAppointment(apt)
                        setIsDetailsModalOpen(true)
                      }}
                      className="px-3 py-2 text-xs bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-all font-semibold"
                    >
                      View Details
                    </button>
                    {apt.status === "pending" && (
                      <button
                        onClick={() => updateAppointmentStatus(apt.id, "confirmed")}
                        className="px-3 py-2 text-xs bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all font-semibold"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => updateAppointmentStatus(apt.id, "cancelled")}
                      className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 px-5 bg-white rounded-2xl shadow-md border border-slate-200 text-slate-500">
            <div className="text-5xl mb-3 opacity-50">📅</div>
            <p className="text-lg font-medium">No appointments scheduled for this date</p>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedAppointment && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setIsDetailsModalOpen(false)} />
          <div className="fixed inset-4 md:inset-20 bg-white rounded-2xl shadow-2xl z-50 p-8 overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2
                className="text-2xl font-bold text-slate-900"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                Appointment Details
              </h2>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-2xl text-slate-500 hover:text-slate-700 font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Patient */}
              <div className="bg-cyan-50 p-6 rounded-xl border-2 border-cyan-200">
                <h3 className="font-bold text-slate-900 mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Name</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedAppointment.patient_name || selectedAppointment.patient_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Patient ID</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.patient_id}</p>
                  </div>
                </div>
              </div>

              {/* Appointment */}
              <div className="bg-sky-50 p-6 rounded-xl border-2 border-sky-200">
                <h3 className="font-bold text-slate-900 mb-4">Appointment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Date</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.appointment_date}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Time</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.appointment_time}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Doctor</p>
                    {/* Backend _enrich_appointment resolves doctor_name from doctor_name field */}
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.doctor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Hospital</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.hospital_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Specialty</p>
                    <p className="text-lg font-semibold text-slate-900">{selectedAppointment.specialty || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Status</p>
                    <p
                      className={`text-lg font-semibold ${
                        selectedAppointment.status === "confirmed"
                          ? "text-green-700"
                          : selectedAppointment.status === "pending"
                            ? "text-yellow-700"
                            : "text-slate-700"
                      }`}
                    >
                      {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Visit details */}
              <div className="bg-green-50 p-6 rounded-xl border-2 border-green-200">
                <h3 className="font-bold text-slate-900 mb-4">Visit Details</h3>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Reason for Visit</p>
                  <p className="text-lg font-semibold text-slate-900 mb-4">{selectedAppointment.reason}</p>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Notes</p>
                    <p className="text-slate-700">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>

              {/* Reschedule info */}
              {selectedAppointment.reschedule_reason && (
                <div className="bg-amber-50 p-6 rounded-xl border-2 border-amber-200">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">🔄</span> Reschedule Information
                  </h3>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-600 uppercase mb-1">Reason for Rescheduling</p>
                    <p className="text-base font-medium text-amber-800 bg-amber-100 px-3 py-2 rounded-lg">
                      {selectedAppointment.reschedule_reason}
                    </p>
                  </div>
                  {selectedAppointment.reschedule_history && selectedAppointment.reschedule_history.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Reschedule History</p>
                      <div className="space-y-2">
                        {selectedAppointment.reschedule_history.map((h, i) => (
                          <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-amber-100">
                            <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800 flex-shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-800">
                                {h.previous_date} at {h.previous_time}
                              </p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Reason: {h.reason}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Changed on: {new Date(h.rescheduled_at).toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                >
                  Close
                </button>
                {selectedAppointment.status === "pending" && (
                  <button
                    onClick={() => {
                      updateAppointmentStatus(selectedAppointment.id, "confirmed")
                      setIsDetailsModalOpen(false)
                    }}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                  >
                    Confirm Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}