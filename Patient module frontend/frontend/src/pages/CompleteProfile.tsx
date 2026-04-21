"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNotification } from "../context/NotificationContext"

interface CompleteProfileProps {
  onNavigate: (page: string) => void
}

const API_BASE_URL = "http://localhost:5000/api"

export default function CompleteProfile({ onNavigate }: CompleteProfileProps) {
  const [formData, setFormData] = useState({
    dateOfBirth: "",
    bloodType: "O+",
    address: "",
    emergencyContact: "",
    emergencyPhone: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [backendAvailable, setBackendAvailable] = useState(true)
  const { addNotification } = useNotification()

  useEffect(() => {
    const checkBackendHealth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/../health`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        setBackendAvailable(response.ok)
      } catch (err) {
        console.log("[v0] Backend not available during health check")
        setBackendAvailable(false)
      }
    }

    checkBackendHealth()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSkip = () => {
    addNotification({
      title: "Complete Your Profile",
      message: "You have skipped filling your profile. Please complete it later for better healthcare service.",
      type: "warning",
    })
    localStorage.setItem("profile_complete", "true")
    onNavigate("home")
  }

  const handleComplete = async () => {
    setError("")
    setLoading(true)

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("Authentication token not found. Please login again.")
        setLoading(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/auth/update-patient-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date_of_birth: formData.dateOfBirth,
          blood_type: formData.bloodType,
          address: formData.address,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.message || "Failed to update profile")
        setLoading(false)
        return
      }

      localStorage.setItem("profile_complete", "true")
      localStorage.setItem("userProfileData", JSON.stringify(formData))

      onNavigate("home")
    } catch (err) {
      console.log("[v0] CompleteProfile error:", err)
      setError("Connection error. Please ensure the backend server is running on localhost:5000.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 pt-12 pb-12 flex items-center justify-center px-5">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-800 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Complete Your Profile
          </h1>
          <p className="text-slate-600 text-lg">Help us know you better for better healthcare experience</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-lg">
          {!backendAvailable && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
              <strong>Note:</strong> Backend server appears to be offline. You can still skip and complete your profile
              later.
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <div className="space-y-6">
            {/* Date of Birth */}
            <div>
              <label className="text-sm font-bold text-slate-700 uppercase block mb-3">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            {/* Blood Type */}
            <div>
              <label className="text-sm font-bold text-slate-700 uppercase block mb-3">Blood Type</label>
              <select
                name="bloodType"
                value={formData.bloodType}
                onChange={handleChange}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option>O+</option>
                <option>O-</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-bold text-slate-700 uppercase block mb-3">Address</label>
              <input
                type="text"
                name="address"
                placeholder="Enter your address"
                value={formData.address}
                onChange={handleChange}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
              />
            </div>

            {/* Emergency Contact Name */}
            <div>
              <label className="text-sm font-bold text-slate-700 uppercase block mb-3">Emergency Contact Name</label>
              <input
                type="text"
                name="emergencyContact"
                placeholder="Name of emergency contact"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
              />
            </div>

            {/* Emergency Contact Phone */}
            <div>
              <label className="text-sm font-bold text-slate-700 uppercase block mb-3">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergencyPhone"
                placeholder="+1 (555) 123-4567"
                value={formData.emergencyPhone}
                onChange={handleChange}
                className="w-full border-2 border-sky-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-sky-500 transition-colors placeholder-slate-400"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 mt-8 flex-col sm:flex-row">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-all duration-300 text-lg disabled:opacity-70"
            >
              Skip for Now
            </button>
            <button
              onClick={handleComplete}
              disabled={loading || !backendAvailable}
              className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 text-lg disabled:opacity-70"
            >
              {loading ? "Saving..." : "Complete Profile"}
            </button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-center text-slate-600 mt-6 text-sm">
          You can update this information anytime in your profile settings
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
