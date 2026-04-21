"use client"

import { useState } from "react"

interface Doctor {
  id: number | string
  name: string
  specialty: string
  hospital: string
  rating: number
  experience: string
  nextAvailable: string
  slots: string[]
  image: string
}

interface DoctorAvailabilityProps {
  doctor: Doctor
  onNavigate: (page: string) => void
  token?: string | null
}

const API_BASE_URL = "http://localhost:5000/api"

const VISIT_REASONS = [
  "General Checkup",
  "Follow-up Visit",
  "Consultation",
  "Initial Assessment",
  "Treatment",
  "Vaccination",
  "Lab Results Review",
  "Prescription Refill",
  "Emergency",
  "Other",
]

export default function DoctorAvailability({ doctor, onNavigate, token }: DoctorAvailabilityProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [isBooking, setIsBooking] = useState(false)
  const [reason, setReason] = useState("")
  const [otherReason, setOtherReason] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({})

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!selectedSlot) {
      errors.slot = "Please select a time slot"
    }

    if (!reason) {
      errors.reason = "Please select a reason for visit"
    }

    if (reason === "Other" && !otherReason.trim()) {
      errors.otherReason = "Please specify your reason"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleBooking = async () => {
    try {
      if (!validateForm()) {
        return
      }

      setIsBooking(true)
      setError(null)

      const finalReason = reason === "Other" ? otherReason : reason

      let authToken = token
      if (!authToken) {
        const urlParams = new URLSearchParams(window.location.search)
        authToken = urlParams.get("token") || localStorage.getItem("auth_token")
      }
      
      if (!authToken) {
        setError("Authentication token not found. Please login again.")
        setIsBooking(false)
        return
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }

      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`
      }

      const response = await fetch(`${API_BASE_URL}/appointments/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          doctor_id: doctor.name || String(doctor.id),
          hospital_id: doctor.hospital || "1",
          appointment_date: new Date().toISOString().split("T")[0],
          appointment_time: selectedSlot,
          reason: finalReason,
          notes: notes,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to book appointment")
      }

      const data = await response.json()
      alert(`Appointment booked successfully with ${doctor.name} at ${selectedSlot}`)
      setShowBooking(false)
      setSelectedSlot(null)
      setReason("")
      setOtherReason("")
      setNotes("")
      setValidationErrors({})
      onNavigate("booking")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment")
      setIsBooking(false)
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md transition-all hover:shadow-xl">
      {/* Doctor Info */}
      <div className="flex flex-col md:flex-row gap-5 mb-6 pb-6 border-b-2 border-slate-200 items-center md:items-start text-center md:text-left">
        <img
          src={doctor.image || "/placeholder.svg"}
          alt={doctor.name}
          className="w-32 h-32 rounded-xl object-cover bg-sky-50"
        />
        <div className="flex flex-col justify-center gap-2 flex-1">
          <h3 className="text-xl font-bold text-sky-900 m-0">{doctor.name}</h3>
          <p className="text-base text-sky-500 font-semibold m-0">{doctor.specialty}</p>
          <p className="text-sm text-slate-500 m-0">{doctor.hospital}</p>
          <div className="flex gap-4 mt-2 justify-center md:justify-start">
            <span className="text-sm text-slate-600 font-medium">Rating: {doctor.rating}</span>
            <span className="text-sm text-slate-600 font-medium">{doctor.experience}</span>
          </div>
        </div>
      </div>

      {/* Availability Info */}
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-500 m-0">
          Next Available: <strong>{doctor.nextAvailable}</strong>
        </p>

        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}

        {!showBooking ? (
          <button
            className="self-start px-5 py-3 bg-gradient-to-br from-sky-500 to-cyan-500 text-white rounded-lg font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(14,165,233,0.3)]"
            onClick={() => setShowBooking(true)}
          >
            View & Book Slot
          </button>
        ) : (
          <div className="flex flex-col gap-4 p-5 bg-sky-50 rounded-xl">
            <p className="font-semibold text-sky-900 m-0 text-sm">Available Time Slots:</p>

            {validationErrors.slot && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{validationErrors.slot}</div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-2.5">
              {doctor.slots && doctor.slots.length > 0 ? (
                doctor.slots.map((slot, idx) => (
                  <button
                    key={idx}
                    className={`px-2.5 py-2.5 rounded-lg font-medium transition-all ${
                      selectedSlot === slot
                        ? "bg-sky-500 text-white border-2 border-sky-500"
                        : "bg-white text-sky-900 border-2 border-sky-100 hover:border-sky-500 hover:bg-sky-100"
                    }`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    {slot}
                  </button>
                ))
              ) : (
                <p className="col-span-full text-sm text-slate-500 italic">No slots currently available.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason for Visit *</label>
                <select
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setValidationErrors((prev) => ({ ...prev, reason: "" }))
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                    validationErrors.reason ? "border-red-400 bg-red-50" : "border-sky-200"
                  }`}
                >
                  <option value="">Select a reason...</option>
                  {VISIT_REASONS.map((visitReason) => (
                    <option key={visitReason} value={visitReason}>
                      {visitReason}
                    </option>
                  ))}
                </select>
                {validationErrors.reason && <p className="text-xs text-red-600 mt-1">{validationErrors.reason}</p>}
              </div>

              {reason === "Other" && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Please specify your reason *
                  </label>
                  <input
                    type="text"
                    placeholder="Describe your reason for visit..."
                    value={otherReason}
                    onChange={(e) => {
                      setOtherReason(e.target.value)
                      setValidationErrors((prev) => ({ ...prev, otherReason: "" }))
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                      validationErrors.otherReason ? "border-red-400 bg-red-50" : "border-sky-200"
                    }`}
                  />
                  {validationErrors.otherReason && (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.otherReason}</p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Additional Notes (Optional)</label>
                <textarea
                  placeholder="Any additional information for the doctor..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2.5 justify-end">
              <button
                className="px-5 py-2.5 bg-green-500 text-white rounded-lg font-semibold cursor-pointer transition-all hover:bg-green-600 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                onClick={handleBooking}
                disabled={!selectedSlot || !reason || isBooking}
              >
                {isBooking ? "Booking..." : "Confirm Booking"}
              </button>
              <button
                className="px-5 py-2.5 bg-red-500 text-white rounded-lg font-semibold cursor-pointer transition-all hover:bg-red-600 hover:-translate-y-0.5"
                onClick={() => {
                  setShowBooking(false)
                  setSelectedSlot(null)
                  setReason("")
                  setOtherReason("")
                  setNotes("")
                  setValidationErrors({})
                  setError(null)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
