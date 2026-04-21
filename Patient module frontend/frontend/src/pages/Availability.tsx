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
  availability_date: string | null
}

interface BookingState {
  doctor: Doctor | null
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
  // FIX: token is read inside the function (not from state) so there is no
  //      race condition between useEffect and useState.
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
    const { doctor, selectedSlot, reason, notes } = booking

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
      const appointmentDate = doctor.availability_date ?? new Date().toISOString().split("T")[0]

      const payload = {
        doctor_id:        doctor.id,
        hospital_id:      doctor.id,   // hospital user IS the doctor in this system
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
      setBooking({ doctor: null, selectedSlot: null, reason: "", notes: "", isSubmitting: false })
      fetchDoctors()
    } catch (err) {
      console.error("[v0] Error booking appointment:", err)
      setError(err instanceof Error ? err.message : "Failed to book appointment")
      setTimeout(() => setError(null), 5000)
      setBooking((b) => ({ ...b, isSubmitting: false }))
    }
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

                {/* Slots */}
                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                    Available Slots
                  </p>

                  {doctor.slots && doctor.slots.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {doctor.slots.slice(0, 6).map((slot, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setBooking((b) => ({
                              ...b,
                              doctor,
                              selectedSlot: slot,
                            }))
                          }
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                            booking.doctor?.id === doctor.id &&
                            booking.selectedSlot?.time === slot.time
                              ? "bg-cyan-500 text-white border-cyan-500"
                              : "bg-white text-cyan-700 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50"
                          }`}
                        >
                          {formatTime(slot.time)}
                        </button>
                      ))}
                      {doctor.slots.length > 6 && (
                        <span className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 border-2 border-slate-100">
                          +{doctor.slots.length - 6} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic mb-4 flex-1">
                      No slots currently available.
                    </p>
                  )}

                  <p className="text-xs text-slate-500 mb-3">
                    📅 Next: <span className="font-semibold text-slate-700">{doctor.nextAvailable}</span>
                  </p>

                  <button
                    onClick={() =>
                      setBooking((b) => ({
                        ...b,
                        doctor,
                        selectedSlot: doctor.slots[0] ?? null,
                      }))
                    }
                    disabled={!doctor.slots || doctor.slots.length === 0}
                    className="mt-auto w-full py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {doctor.slots && doctor.slots.length > 0 ? "Book Appointment" : "Unavailable"}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            {/* Close */}
            <button
              onClick={() =>
                setBooking({ doctor: null, selectedSlot: null, reason: "", notes: "", isSubmitting: false })
              }
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            >
              ✕
            </button>

            <h2
              className="text-2xl font-bold text-slate-900 mb-1"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Book Appointment
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              with <span className="font-semibold text-cyan-600">{booking.doctor.name}</span>
            </p>

            {/* Slot selection */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select Time Slot <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {booking.doctor.slots.map((slot, i) => (
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

            {/* Date display */}
            {booking.doctor.availability_date && (
              <div className="mb-4 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                <p className="text-sm text-cyan-700 font-semibold">
                  📅 Date:{" "}
                  {new Date(booking.doctor.availability_date + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
                </p>
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
  // Handle both "09:00" and "9:00 AM" formats
  if (time.includes("AM") || time.includes("PM")) return time
  const [hStr, mStr] = time.split(":")
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (isNaN(h) || isNaN(m)) return time
  const period = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 === 0 ? 12 : h % 12
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`
}