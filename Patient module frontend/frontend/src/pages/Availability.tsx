"use client"

import { useState, useEffect, useCallback } from "react"

interface AvailabilityProps {
  onNavigate: (page: string) => void
}

interface TimeSlot {
  time: string
  end: string
  available: boolean
}

interface DateSlots {
  date: string
  slots: TimeSlot[]
  total_slots: number
  available_slots: number
}

interface Doctor {
  id: string
  name: string
  specialty: string
  hospital: string
  position: string
  rating: number
  experience: string
  email: string
  image: string
  nextAvailable: string
  slots: TimeSlot[]
  dates: DateSlots[]
  availability_date: string | null
}

interface BookingState {
  doctor: Doctor | null
  selectedDate: string
  selectedSlot: TimeSlot | null
  reason: string
  notes: string
  isSubmitting: boolean
}

const API_BASE_URL = "http://localhost:5000/api"

export default function Availability({ onNavigate }: AvailabilityProps) {
  const [selectedSpecialty, setSelectedSpecialty] = useState("all")
  const [isVisible, setIsVisible]  = useState(false)
  const [doctors, setDoctors]      = useState<Doctor[]>([])
  const [isLoading, setIsLoading]  = useState(true)
  const [error, setError]          = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Booking modal state
  const [booking, setBooking] = useState<BookingState>({
    doctor: null,
    selectedDate: "",
    selectedSlot: null,
    reason: "",
    notes: "",
    isSubmitting: false,
  })

  // ── Resolve token once, synchronously from localStorage ────────────────
  const getToken = () => {
    if (typeof window === "undefined") return ""
    const urlToken = new URLSearchParams(window.location.search).get("token")
    if (urlToken) {
      localStorage.setItem("auth_token", urlToken)
      return urlToken
    }
    return localStorage.getItem("auth_token") ?? ""
  }

  // ── Fetch hospitals / doctors ───────────────────────────────────────────
  const fetchDoctors = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const token = getToken()

      const response = await fetch(`${API_BASE_URL}/auth/doctors/availability`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to fetch doctors")
      }

      const data = await response.json()
      setDoctors(data.doctors ?? [])
    } catch (err) {
      console.error("[v0] Error fetching doctors:", err)
      setError(err instanceof Error ? err.message : "Failed to load doctors")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsVisible(true)
    fetchDoctors()
  }, [fetchDoctors])

  // ── Book appointment ────────────────────────────────────────────────────
  const handleBookAppointment = async () => {
    const { doctor, selectedDate, selectedSlot, reason, notes } = booking

    if (!doctor || !selectedSlot) {
      setError("Please select a time slot.")
      return
    }
    if (!reason.trim()) {
      setError("Please enter a reason for your visit.")
      return
    }

    try {
      setBooking((b) => ({ ...b, isSubmitting: true }))
      setError(null)

      const token = getToken()
      const appointmentDate = selectedDate || doctor.availability_date || new Date().toISOString().split("T")[0]

      const payload = {
        doctor_id:        doctor.id,
        hospital_id:      doctor.id,
        appointment_date: appointmentDate,
        appointment_time: selectedSlot.time,
        reason:           reason.trim(),
        notes:            notes.trim(),
      }

      const response = await fetch(`${API_BASE_URL}/appointments/create`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to book appointment")
      }

      setSuccessMessage(
        `Appointment booked with ${doctor.name} on ${appointmentDate} at ${selectedSlot.time}!`
      )
      setTimeout(() => setSuccessMessage(null), 5000)

      // Close modal & refresh
      setBooking({ doctor: null, selectedDate: "", selectedSlot: null, reason: "", notes: "", isSubmitting: false })
      fetchDoctors()
    } catch (err) {
      console.error("[v0] Error booking appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to book appointment")
      setTimeout(() => setError(null), 5000)
      setBooking((b) => ({ ...b, isSubmitting: false }))
    }
  }

  // ── Get slots for currently selected date in booking modal ─────────────
  const getSelectedDateSlots = (): TimeSlot[] => {
    if (!booking.doctor || !booking.selectedDate) return []
    const dateEntry = booking.doctor.dates?.find(d => d.date === booking.selectedDate)
    return dateEntry?.slots ?? []
  }

  const isSelectedDateFullyBooked = (): boolean => {
    if (!booking.doctor || !booking.selectedDate) return false
    const dateEntry = booking.doctor.dates?.find(d => d.date === booking.selectedDate)
    if (!dateEntry) return true // No entry = no availability
    return dateEntry.available_slots === 0
  }

  const specialties = ["all", ...Array.from(new Set(doctors.map((d) => d.specialty)))]
  const filteredDoctors = doctors.filter(
    (d) => selectedSpecialty === "all" || d.specialty === selectedSpecialty
  )

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-x-hidden bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-8 bg-gradient-to-br from-cyan-100 via-sky-50 to-blue-100 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-cyan-300/30 rounded-full blur-3xl -top-10 -left-10 animate-pulse" />
          <div className="absolute w-80 h-80 bg-sky-300/20 rounded-full blur-3xl -bottom-10 -right-10 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-cyan-700 text-sm font-semibold mb-4 shadow-md">
            📅 Real-Time Availability
          </div>
          <h1
            className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-cyan-700 via-sky-600 to-blue-700 bg-clip-text text-transparent mb-4 leading-tight"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Check Doctor Availability
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            View real-time availability and book your appointment with expert doctors
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
          <p className="font-medium">✅ {successMessage}</p>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className={`bg-white p-8 rounded-3xl shadow-xl border-2 border-cyan-100/50 transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🔍</span>
          <h2 className="text-xl font-bold text-sky-900">Filter Hospitals / Doctors</h2>
        </div>
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="p-4 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 bg-slate-50 focus:bg-white"
        >
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "All Specialties" : s}
            </option>
          ))}
        </select>
        <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600 font-medium">
            Found <span className="text-cyan-600 font-bold">{filteredDoctors.length}</span> hospital
            {filteredDoctors.length !== 1 ? "s" : ""} available
          </p>
          <button
            onClick={() => setSelectedSpecialty("all")}
            className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold flex items-center gap-1"
          >
            Clear filters ✕
          </button>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4" />
          <p className="text-slate-600 font-medium">Loading available hospitals…</p>
        </div>
      )}

      {/* ── Doctor Cards Grid ───────────────────────────────────────────── */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor, index) => (
              <div
                key={doctor.id}
                className={`bg-white rounded-2xl shadow-lg border-2 border-slate-100 hover:border-cyan-300 transition-all duration-500 hover:-translate-y-1 flex flex-col ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${200 + index * 80}ms` }}
              >
                {/* Card Header */}
                <div className="bg-gradient-to-br from-cyan-50 to-sky-100 p-5 rounded-t-2xl text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md">
                    {doctor.name.charAt(0)}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{doctor.name}</h3>
                  <p className="text-xs text-cyan-600 font-semibold mt-0.5">{doctor.specialty}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <span className="text-yellow-400 text-xs">⭐</span>
                    <span className="text-xs font-semibold text-slate-600">{doctor.rating}</span>
                    <span className="text-xs text-slate-400 ml-1">· {doctor.experience}</span>
                  </div>
                </div>

                {/* Available dates summary */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    Available Dates
                  </p>

                  {doctor.dates && doctor.dates.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {doctor.dates.slice(0, 5).map((d) => (
                        <span
                          key={d.date}
                          className="px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200"
                        >
                          {formatDate(d.date)} · {d.available_slots} slot{d.available_slots !== 1 ? "s" : ""}
                        </span>
                      ))}
                      {doctor.dates.length > 5 && (
                        <span className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 border border-slate-100">
                          +{doctor.dates.length - 5} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4 flex-1">
                      No slots currently available.
                    </p>
                  )}

                  <button
                    onClick={() =>
                      setBooking((b) => ({
                        ...b,
                        doctor,
                        selectedDate: doctor.dates?.[0]?.date ?? "",
                        selectedSlot: null,
                      }))
                    }
                    disabled={!doctor.dates || doctor.dates.length === 0}
                    className="mt-auto w-full py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {doctor.dates && doctor.dates.length > 0 ? "Book Appointment" : "Unavailable"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-20 px-5 text-slate-500 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
              <div className="text-7xl mb-5">👨‍⚕️</div>
              <p className="text-xl font-bold text-slate-800 mb-2">No hospitals found</p>
              <p className="text-base mb-6">Try adjusting your filters or check back later.</p>
              <button
                onClick={() => setSelectedSpecialty("all")}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-sky-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Booking Modal ───────────────────────────────────────────────── */}
      {booking.doctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-start justify-center pt-24 pb-6 px-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative flex flex-col max-h-[80vh]">
            {/* Sticky header with close button */}
            <div className="flex items-center justify-between p-6 pb-2 flex-shrink-0">
              <div>
                <h2
                  className="text-2xl font-bold text-slate-900"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  Book Appointment
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  with <span className="font-semibold text-cyan-600">{booking.doctor.name}</span>
                </p>
              </div>
              <button
                onClick={() =>
                  setBooking({ doctor: null, selectedDate: "", selectedSlot: null, reason: "", notes: "", isSubmitting: false })
                }
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto px-6 pb-6 pt-2 flex-1">

            {/* Date selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Date <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {booking.doctor.dates && booking.doctor.dates.length > 0 ? (
                  booking.doctor.dates.map((d) => (
                    <button
                      key={d.date}
                      onClick={() => setBooking((b) => ({ ...b, selectedDate: d.date, selectedSlot: null }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        booking.selectedDate === d.date
                          ? "bg-cyan-500 text-white border-cyan-500 shadow-md"
                          : "bg-white text-cyan-700 border-cyan-200 hover:border-cyan-400"
                      }`}
                    >
                      {formatDateFull(d.date)}
                      <span className="block text-xs opacity-75 font-normal">
                        {d.available_slots} slot{d.available_slots !== 1 ? "s" : ""}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No available dates</p>
                )}
              </div>
            </div>

            {/* Slot selection */}
            {booking.selectedDate && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Select Time Slot <span className="text-red-500">*</span>
                </label>

                {/* Fully booked banner */}
                {isSelectedDateFullyBooked() && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm font-semibold text-amber-700">⚠️ All slots are booked for this date</p>
                    <p className="text-xs text-amber-600 mt-0.5">Please try another date or check back later.</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {getSelectedDateSlots().map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setBooking((b) => ({ ...b, selectedSlot: slot }))}
                      className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        booking.selectedSlot?.time === slot.time
                          ? "bg-cyan-500 text-white border-cyan-500 shadow-md"
                          : "bg-white text-cyan-700 border-cyan-200 hover:border-cyan-400"
                      }`}
                    >
                      {formatTime(slot.time)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Reason for Visit <span className="text-red-500">*</span>
              </label>
              <select
                value={booking.reason}
                onChange={(e) => setBooking((b) => ({ ...b, reason: e.target.value }))}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              >
                <option value="">Select reason…</option>
                <option>General Checkup</option>
                <option>Follow-up Visit</option>
                <option>Prescription Refill</option>
                <option>New Symptoms</option>
                <option>Test Results Review</option>
                <option>Other</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Additional Notes (optional)
              </label>
              <textarea
                value={booking.notes}
                onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))}
                placeholder="Any additional information for the doctor…"
                rows={3}
                className="w-full p-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 resize-none"
              />
            </div>

            <button
              onClick={handleBookAppointment}
              disabled={booking.isSubmitting || !booking.selectedSlot || !booking.reason}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white rounded-xl font-semibold text-base hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booking.isSubmitting ? "Booking…" : "Confirm Appointment"}
            </button>
            </div>{/* end scrollable body */}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatTime(time: string): string {
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

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}