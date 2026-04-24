"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useNotification } from "../context/NotificationContext"

interface PatientRecordsProps {
  onNavigate: (page: string) => void
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Appointment {
  id: string
  patient_id: string
  patient_name: string
  doctor_name: string
  hospital_name: string
  appointment_date: string
  appointment_time: string
  reason: string
  notes: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
  urgency_score?: number
  reschedule_reason?: string
  reschedule_history?: Array<{
    previous_date: string
    previous_time: string
    reason: string
    rescheduled_at: string
  }>
}

interface PatientRow {
  patient_id: string
  patient_name: string
  latestAppointmentDate: string
  latestAppointmentTime: string
  latestStatus: "upcoming" | "confirmed" | "completed" | "cancelled" | "pending"
  reason: string
  urgency_score: number
  appointments: Appointment[]
  appointmentId: string
}

type ModalMode = "details" | "discharge" | "reschedule" | "cancel" | "schedule-test" | "upload-prescription"

const API_BASE_URL = "http://localhost:5000/api"

function getToken(): string | null {
  return localStorage.getItem("auth_token") || localStorage.getItem("token")
}

const TODAY = new Date().toISOString().split("T")[0]

function deriveStatus(apt: Appointment): PatientRow["latestStatus"] {
  if (apt.status === "cancelled") return "cancelled"
  if (apt.status === "completed") return "completed"
  if (apt.appointment_date >= TODAY) return "upcoming"
  if (apt.status === "confirmed") return "confirmed"
  return "pending"
}

function formatDate(d: string) {
  if (!d) return "—"
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

function formatTime(t: string) {
  if (!t) return ""
  if (t.includes("AM") || t.includes("PM")) return t
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}:${String(m).padStart(2, "0")} ${period}`
}

const URGENCY_LABEL: Record<number, string> = { 1: "Low", 2: "Moderate", 3: "High", 4: "Emergency" }
const URGENCY_COLOR: Record<number, string> = {
  1: "bg-emerald-50 text-emerald-700 border-emerald-200",
  2: "bg-amber-50 text-amber-700 border-amber-200",
  3: "bg-orange-50 text-orange-700 border-orange-200",
  4: "bg-red-50 text-red-700 border-red-200",
}

const STATUS_STYLES: Record<PatientRow["latestStatus"], string> = {
  upcoming: "bg-sky-100 text-sky-700 border border-sky-200",
  confirmed: "bg-violet-100 text-violet-700 border border-violet-200",
  completed: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  cancelled: "bg-rose-100 text-rose-600 border border-rose-200",
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
}

const STATUS_LABEL: Record<PatientRow["latestStatus"], string> = {
  upcoming: "📅 Upcoming",
  confirmed: "✅ Confirmed",
  completed: "🏁 Completed",
  cancelled: "✕ Cancelled",
  pending: "⏳ Pending",
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PatientRecords({ onNavigate }: PatientRecordsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action modal
  const [modalPatient, setModalPatient] = useState<PatientRow | null>(null)
  const [modalMode, setModalMode] = useState<ModalMode>("details")

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleTime, setRescheduleTime] = useState("")
  const [rescheduleReason, setRescheduleReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  // ── Upload prescription state ──────────────────────────────────────────────
  const [rxFile, setRxFile] = useState<File | null>(null)
  const [rxPreview, setRxPreview] = useState<string | null>(null)
  const rxFileInputRef = useRef<HTMLInputElement>(null)

  // Schedule Test form
  const [testCatalogue, setTestCatalogue] = useState<string[]>([])
  const [selectedTest, setSelectedTest] = useState("")
  const [customTest, setCustomTest] = useState("")
  const [testDate, setTestDate] = useState("")
  const [testNotes, setTestNotes] = useState("")

  const { addNotification } = useNotification()

  // ─── Fetch patients ───────────────────────────────────────────────────────
  const fetchPatients = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) { setError("Not authenticated. Please log in."); setIsLoading(false); return }

      const res = await fetch(`${API_BASE_URL}/appointments/hospital/appointments`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      const all: Appointment[] = [
        ...(data.today || []),
        ...(data.upcoming || []),
        ...(data.past || []),
      ]

      const map = new Map<string, PatientRow>()
      for (const apt of all) {
        const pid = apt.patient_id
        if (!map.has(pid)) {
          map.set(pid, {
            patient_id: pid,
            patient_name: apt.patient_name || "Unknown Patient",
            latestAppointmentDate: apt.appointment_date,
            latestAppointmentTime: apt.appointment_time,
            latestStatus: deriveStatus(apt),
            reason: apt.reason || "—",
            urgency_score: apt.urgency_score || 1,
            appointments: [apt],
            appointmentId: apt.id,
          })
        } else {
          const existing = map.get(pid)!
          existing.appointments.push(apt)
          if (apt.appointment_date >= existing.latestAppointmentDate) {
            existing.latestAppointmentDate = apt.appointment_date
            existing.latestAppointmentTime = apt.appointment_time
            existing.latestStatus = deriveStatus(apt)
            existing.reason = apt.reason || existing.reason
            existing.urgency_score = apt.urgency_score || existing.urgency_score
            existing.appointmentId = apt.id
          }
        }
      }

      setPatients(Array.from(map.values()))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load patients")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // ─── Fetch test catalogue ─────────────────────────────────────────────────
  const fetchCatalogue = useCallback(async () => {
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/diagnostics/catalogue`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTestCatalogue(data.tests || [])
      }
    } catch {
      // catalogue is optional — silently ignore
    }
  }, [])

  useEffect(() => {
    setIsVisible(true)
    fetchPatients()
    fetchCatalogue()
  }, [fetchPatients, fetchCatalogue])

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openModal = (patient: PatientRow, mode: ModalMode) => {
    setModalPatient(patient)
    setModalMode(mode)
    setActionMsg(null)
    setRescheduleDate("")
    setRescheduleTime("")
    setRescheduleReason("")
    setSelectedTest("")
    setCustomTest("")
    setTestDate("")
    setTestNotes("")
  }

  const closeModal = () => {
    setModalPatient(null)
    setActionMsg(null)
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
  const handleDischarge = async () => {
    if (!modalPatient) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/appointments/${modalPatient.appointmentId}/status`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      })
      if (!res.ok) throw new Error("Failed to discharge patient")
      setActionMsg({ type: "success", text: "Patient marked as discharged (completed)." })
      addNotification({ message: `${modalPatient.patient_name} has been discharged.`, type: "success" })
      await fetchPatients()
    } catch (e: unknown) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Action failed" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!modalPatient || !rescheduleDate || !rescheduleTime || !rescheduleReason.trim()) {
      setActionMsg({ type: "error", text: "Please fill in all fields." })
      return
    }
    setActionLoading(true)
    setActionMsg(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/appointments/${modalPatient.appointmentId}/reschedule`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          new_date: rescheduleDate,
          new_time: rescheduleTime,
          reschedule_reason: rescheduleReason,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Reschedule failed")
      }
      setActionMsg({ type: "success", text: `Appointment rescheduled to ${formatDate(rescheduleDate)} at ${formatTime(rescheduleTime)}.` })
      addNotification({ message: `${modalPatient.patient_name}'s appointment rescheduled.`, type: "info" })
      await fetchPatients()
    } catch (e: unknown) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Reschedule failed" })
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!modalPatient) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/appointments/${modalPatient.appointmentId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by hospital" }),
      })
      if (!res.ok) throw new Error("Cancel failed")
      setActionMsg({ type: "success", text: "Appointment cancelled." })
      addNotification({ message: `${modalPatient.patient_name}'s appointment was cancelled.`, type: "warning" })
      await fetchPatients()
    } catch (e: unknown) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Cancel failed" })
    } finally {
      setActionLoading(false)
    }
  }

  // ── Schedule Diagnostic Test ───────────────────────────────────────────────
  const handleScheduleTest = async () => {
    if (!modalPatient) return
    const resolvedTest = (selectedTest === "__custom__" ? customTest : selectedTest).trim()
    if (!resolvedTest) {
      setActionMsg({ type: "error", text: "Please select or enter a test name." })
      return
    }
    if (!testDate) {
      setActionMsg({ type: "error", text: "Please select a scheduled date." })
      return
    }

    setActionLoading(true)
    setActionMsg(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/diagnostics/schedule`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id:      modalPatient.patient_id,
          patient_name:    modalPatient.patient_name,
          appointment_id:  modalPatient.appointmentId,
          test_name:       resolvedTest,
          scheduled_date:  testDate,
          notes:           testNotes.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to schedule test")
      }
      setActionMsg({ type: "success", text: `${resolvedTest} scheduled for ${formatDate(testDate)}. Patient notified via app and WhatsApp.` })
      addNotification({ message: `${resolvedTest} scheduled for ${modalPatient.patient_name}.`, type: "success" })
      // Reset form
      setSelectedTest("")
      setCustomTest("")
      setTestDate("")
      setTestNotes("")
    } catch (e: unknown) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Scheduling failed" })
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Filter ───────────────────────────────────────────────────────────────
  const handleUploadPrescription = async () => {
    if (!modalPatient || !rxFile) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const token = getToken()
      const formData = new FormData()
      formData.append("prescription", rxFile)
      const res = await fetch(
        `${API_BASE_URL}/appointment-prescriptions/${modalPatient.appointmentId}/upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to upload prescription")
      }
      setActionMsg({
        type: "success",
        text: `Prescription uploaded. ${modalPatient.patient_name} will be notified to analyze it with AI and set up reminders.`,
      })
      addNotification({
        message: `Prescription uploaded for ${modalPatient.patient_name}. Patient notified.`,
        type: "success",
      })
      setRxFile(null)
      setRxPreview(null)
    } catch (e: unknown) {
      setActionMsg({ type: "error", text: e instanceof Error ? e.message : "Upload failed" })
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = patients.filter((p) => {
    const matchSearch = p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.reason.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === "all" || p.latestStatus === statusFilter
    return matchSearch && matchStatus
  })

  const statusCounts = patients.reduce((acc, p) => {
    acc[p.latestStatus] = (acc[p.latestStatus] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif] min-h-screen">

      {/* ── Hero Header ── */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-4 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-sky-300/30 rounded-full blur-3xl -top-10 -right-10 animate-pulse" />
          <div className="absolute w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sky-700 text-sm font-semibold mb-4 shadow-md">
            📋 Electronic Health Records
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent mb-4 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Patient Records
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            All patients who have booked or attended an appointment with your hospital
          </p>
        </div>
      </div>

      {/* ── Status Summary Pills ── */}
      {!isLoading && !error && (
        <div className={`flex flex-wrap gap-3 transition-all duration-500 delay-75 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
          {(["all", "upcoming", "confirmed", "completed", "pending", "cancelled"] as const).map((s) => {
            const count = s === "all" ? patients.length : (statusCounts[s] || 0)
            const active = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all shadow-sm ${active
                    ? "bg-sky-600 text-white border-sky-600 shadow-sky-200 shadow-md scale-105"
                    : "bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-700"
                  }`}
              >
                {s === "all" ? "All" : STATUS_LABEL[s as PatientRow["latestStatus"]].replace(/^.{1,3}\s/, "")}{" "}
                <span className={`ml-1 text-xs font-bold ${active ? "opacity-80" : "opacity-50"}`}>({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Search ── */}
      <div className={`bg-white p-6 rounded-3xl shadow-xl border-2 border-sky-100/50 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 hover:border-sky-300 placeholder-slate-400 text-slate-800"
            placeholder="Search by patient name or reason for visit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <p className="text-sm text-slate-500 mt-3">
          Showing <span className="text-sky-600 font-bold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{patients.length}</span> unique patient{patients.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Table ── */}
      <div className={`bg-white rounded-3xl shadow-xl border-2 border-sky-100/50 overflow-hidden transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Loading patient records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-8">
            <span className="text-5xl">⚠️</span>
            <p className="text-slate-700 font-semibold text-lg">Could not load patients</p>
            <p className="text-slate-500 text-sm max-w-sm">{error}</p>
            <button onClick={fetchPatients} className="mt-2 px-6 py-2 bg-sky-500 text-white rounded-xl font-semibold hover:bg-sky-600 transition-colors">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-center px-8">
            <span className="text-5xl">👤</span>
            <p className="text-slate-700 font-semibold text-lg">No patients found</p>
            <p className="text-slate-500 text-sm">
              {patients.length === 0
                ? "No appointments have been booked with your hospital yet."
                : "No patients match your current filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-sky-50 to-cyan-50 border-b border-sky-200">
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Patient</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Next / Last Visit</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Status</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Reason for Visit</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Priority</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Visits</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-800 text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient, idx) => (
                  <tr key={patient.patient_id} className="border-b border-slate-100 hover:bg-sky-50/60 transition-colors" style={{ animationDelay: `${idx * 40}ms` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow">
                          {patient.patient_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800 whitespace-nowrap">{patient.patient_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm whitespace-nowrap">
                      <span className="font-medium">{formatDate(patient.latestAppointmentDate)}</span>
                      {patient.latestAppointmentTime && (
                        <span className="block text-xs text-slate-400 mt-0.5">{formatTime(patient.latestAppointmentTime)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[patient.latestStatus]}`}>
                        {STATUS_LABEL[patient.latestStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm max-w-[200px]">
                      <span className="line-clamp-2">{patient.reason}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${URGENCY_COLOR[patient.urgency_score] || URGENCY_COLOR[1]}`}>
                        {URGENCY_LABEL[patient.urgency_score] || "Low"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm font-medium text-center">
                      {patient.appointments.length}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openModal(patient, "details")}
                        className="px-4 py-1.5 bg-sky-50 hover:bg-sky-500 text-sky-600 hover:text-white border border-sky-200 hover:border-sky-500 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Action Modal ── */}
      {modalPatient && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-sky-100 animate-fade-in">

            {/* Modal header */}
            <div className="bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-5 rounded-t-3xl flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-white font-bold text-lg leading-tight break-words">{modalPatient.patient_name}</h2>
                <p className="text-sky-100 text-xs mt-0.5">
                  {modalPatient.appointments.length} appointment{modalPatient.appointments.length !== 1 ? "s" : ""} on record
                </p>
              </div>
              <button onClick={closeModal} className="text-white/80 hover:text-white text-2xl leading-none flex-shrink-0">✕</button>
            </div>

            {/* Mode tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50 overflow-x-auto">
              {(["details", "schedule-test", "reschedule", "discharge", "upload-prescription", "cancel"] as ModalMode[]).map((m) => {
                const icons: Record<ModalMode, string> = { details: "📋", "schedule-test": "🔬", reschedule: "🗓️", discharge: "🏁", "upload-prescription": "💊", cancel: "✕" }
                const labels: Record<ModalMode, string> = { details: "Details", "schedule-test": "Schedule Test", reschedule: "Reschedule", discharge: "Discharge", "upload-prescription": "Upload Rx", cancel: "Cancel Appt." }
                const colors: Record<ModalMode, string> = {
                  details: "text-sky-600 border-sky-500",
                  "schedule-test": "text-purple-600 border-purple-500",
                  reschedule: "text-violet-600 border-violet-500",
                  discharge: "text-emerald-600 border-emerald-500",
                  "upload-prescription": "text-indigo-600 border-indigo-500",
                  cancel: "text-rose-600 border-rose-400",
                }
                return (
                  <button
                    key={m}
                    onClick={() => { setModalMode(m); setActionMsg(null) }}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${modalMode === m
                        ? `${colors[m]} bg-white`
                        : "text-slate-500 border-transparent hover:text-slate-700"
                      }`}
                  >
                    {icons[m]} {labels[m]}
                  </button>
                )
              })}
            </div>

            <div className="p-6 space-y-4">

              {/* Feedback */}
              {actionMsg && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${actionMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                  }`}>
                  {actionMsg.type === "success" ? "✅ " : "⚠️ "}{actionMsg.text}
                </div>
              )}

              {/* ── DETAILS tab ── */}
              {modalMode === "details" && (
                <div className="space-y-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-3">Latest Appointment</p>
                    <Row label="Date" value={formatDate(modalPatient.latestAppointmentDate)} />
                    <Row label="Time" value={formatTime(modalPatient.latestAppointmentTime)} />
                    <Row label="Status">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[modalPatient.latestStatus]}`}>
                        {STATUS_LABEL[modalPatient.latestStatus]}
                      </span>
                    </Row>
                    <Row label="Reason" value={modalPatient.reason} />
                    <Row label="Priority">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${URGENCY_COLOR[modalPatient.urgency_score] || URGENCY_COLOR[1]}`}>
                        {URGENCY_LABEL[modalPatient.urgency_score] || "Low"}
                      </span>
                    </Row>
                  </div>

                  {modalPatient.appointments.length > 1 && (
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Appointment History</p>
                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {[...modalPatient.appointments]
                          .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date))
                          .map((apt) => (
                            <div key={apt.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm">
                              <div>
                                <span className="font-medium text-slate-700">{formatDate(apt.appointment_date)}</span>
                                <span className="text-slate-400 ml-2 text-xs">{formatTime(apt.appointment_time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs max-w-[100px] truncate">{apt.reason}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[deriveStatus(apt)]}`}>
                                  {deriveStatus(apt)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SCHEDULE TEST tab ── */}
              {modalMode === "schedule-test" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Schedule a diagnostic test for <strong>{modalPatient.patient_name}</strong>.
                    They will be notified instantly via in-app notification and WhatsApp.
                  </p>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Test Name</label>
                    <select
                      value={selectedTest}
                      onChange={(e) => setSelectedTest(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-slate-800 bg-white"
                    >
                      <option value="">— Select a test —</option>
                      {testCatalogue.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value="__custom__">✏️ Enter custom test name…</option>
                    </select>
                  </div>

                  {selectedTest === "__custom__" && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Custom Test Name</label>
                      <input
                        type="text"
                        value={customTest}
                        onChange={(e) => setCustomTest(e.target.value)}
                        placeholder="e.g. Sleep Study, Nerve Conduction Test…"
                        className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-slate-800"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Scheduled Date</label>
                    <input
                      type="date"
                      min={TODAY}
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Notes / Instructions (optional)</label>
                    <textarea
                      rows={3}
                      value={testNotes}
                      onChange={(e) => setTestNotes(e.target.value)}
                      placeholder="e.g. Fasting required for 8 hours before the test…"
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-100 text-slate-800 resize-none text-sm"
                    />
                  </div>

                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-purple-700 flex gap-2">
                    <span>💬</span>
                    <span>The patient will receive an <strong>in-app notification</strong> and a <strong>WhatsApp message</strong> with test details and instructions.</span>
                  </div>

                  <button
                    onClick={handleScheduleTest}
                    disabled={actionLoading}
                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {actionLoading ? "Scheduling…" : "🔬 Schedule Test & Notify Patient"}
                  </button>
                </div>
              )}

              {/* ── RESCHEDULE tab ── */}
              {modalMode === "reschedule" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">
                    Schedule a new appointment time for <strong>{modalPatient.patient_name}</strong>.
                    The patient will be notified automatically.
                  </p>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">New Date</label>
                    <input
                      type="date"
                      min={TODAY}
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">New Time</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Reason for Reschedule</label>
                    <textarea
                      rows={3}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="e.g. Doctor unavailable on original date..."
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 text-slate-800 resize-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleReschedule}
                    disabled={actionLoading}
                    className="w-full py-3 bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {actionLoading ? "Rescheduling..." : "🗓️ Confirm Reschedule"}
                  </button>
                </div>
              )}

              {/* ── DISCHARGE tab ── */}
              {modalMode === "discharge" && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800">
                    <p className="font-bold text-base mb-1">Mark as Discharged</p>
                    <p>
                      This will mark <strong>{modalPatient.patient_name}</strong>'s latest appointment as{" "}
                      <strong>Completed</strong>. This indicates the patient has been treated and is no
                      longer under active care for this visit.
                    </p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    ⚠️ The patient will receive a notification. This action can be reviewed in appointment history.
                  </div>
                  <button
                    onClick={handleDischarge}
                    disabled={actionLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {actionLoading ? "Processing..." : "🏁 Confirm Discharge"}
                  </button>
                </div>
              )}

              {/* ── UPLOAD PRESCRIPTION tab ── */}
              {modalMode === "upload-prescription" && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-sm text-indigo-900">
                    <p className="font-bold text-base mb-1">💊 Upload Prescription</p>
                    <p>
                      Upload a prescription for <strong>{modalPatient.patient_name}</strong>. They'll receive a notification with an <strong>"Analyze with AI"</strong> button — one tap will analyze all medicines and automatically set up reminders.
                    </p>
                  </div>

                  {/* File drop zone */}
                  <div
                    className="border-2 border-dashed border-indigo-300 rounded-2xl p-6 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
                    onClick={() => rxFileInputRef.current?.click()}
                  >
                    <input
                      ref={rxFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        setRxFile(f)
                        if (f.type.startsWith("image/")) {
                          const reader = new FileReader()
                          reader.onload = (ev) => setRxPreview(ev.target?.result as string)
                          reader.readAsDataURL(f)
                        } else {
                          setRxPreview(null)
                        }
                        e.target.value = ""
                      }}
                    />
                    {rxPreview ? (
                      <img src={rxPreview} alt="Prescription preview" className="mx-auto max-h-40 rounded-xl object-contain mb-2 shadow" />
                    ) : rxFile ? (
                      <div className="text-indigo-600 font-semibold text-sm mb-1">📄 {rxFile.name}</div>
                    ) : (
                      <>
                        <div className="text-4xl mb-2">📎</div>
                        <p className="text-sm font-semibold text-indigo-700">Click to select prescription</p>
                        <p className="text-xs text-slate-400 mt-1">JPG · PNG · WEBP · PDF &nbsp;(max 15 MB)</p>
                      </>
                    )}
                  </div>

                  {rxFile && (
                    <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-xs text-indigo-700">
                      <span className="font-medium truncate max-w-[220px]">{rxFile.name}</span>
                      <button
                        onClick={() => { setRxFile(null); setRxPreview(null) }}
                        className="ml-3 text-rose-500 hover:text-rose-700 font-bold flex-shrink-0"
                      >✕ Remove</button>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                    ✨ After upload, <strong>{modalPatient.patient_name}</strong> will get a notification. Tapping <em>"Analyze with AI → Set Reminders"</em> will scan every medicine and create scheduled reminders automatically.
                  </div>

                  <button
                    onClick={handleUploadPrescription}
                    disabled={actionLoading || !rxFile}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {actionLoading ? "Uploading…" : "💊 Upload & Notify Patient"}
                  </button>
                </div>
              )}

              {/* ── CANCEL tab ── */}
              {modalMode === "cancel" && (
                <div className="space-y-4">
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-800">
                    <p className="font-bold text-base mb-1">Cancel Appointment</p>
                    <p>
                      Are you sure you want to cancel{" "}
                      <strong>{modalPatient.patient_name}</strong>'s appointment on{" "}
                      <strong>{formatDate(modalPatient.latestAppointmentDate)}</strong>?
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                    💡 If you want to move the appointment instead, use the <strong>Reschedule</strong> tab above.
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white rounded-xl font-bold transition-colors shadow-sm"
                  >
                    {actionLoading ? "Cancelling..." : "✕ Confirm Cancellation"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .animate-fade-in { animation: fade-in 0.25s ease-out forwards; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

function Row({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-400 font-medium flex-shrink-0">{label}</span>
      <span className="text-slate-700 font-semibold text-right">{children ?? value ?? "—"}</span>
    </div>
  )
}
