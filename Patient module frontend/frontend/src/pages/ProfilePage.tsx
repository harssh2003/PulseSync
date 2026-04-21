"use client"

import { useState, useEffect } from "react"

interface ProfilePageProps {
  onNavigate: (page: string) => void
}

interface Appointment {
  id: string
  doctor_id: string
  hospital_id: string
  appointment_date: string
  appointment_time: string
  reason: string
  notes: string
  status: "pending" | "confirmed" | "completed" | "cancelled"
}

const API_BASE_URL = "http://localhost:5000/api"

export default function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("details")
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    bloodType: "O+",
    emergencyContact: "",
    emergencyPhone: "",
    address: "",
  })

  const [editData, setEditData] = useState(userData)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [appointmentFilter, setAppointmentFilter] = useState("all")
  const [appointmentSort, setAppointmentSort] = useState("date-desc")
  const [appointmentSearch, setAppointmentSearch] = useState("")

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = urlParams.get("token")
        const token = urlToken || localStorage.getItem("auth_token")

        if (urlToken) {
          localStorage.setItem("auth_token", urlToken)
        }

        if (!token) {
          setError("No authentication token found")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/auth/get-patient-profile`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.log("[v0] Profile fetch failed, using localStorage data")
          const storedData = localStorage.getItem("userProfileData")
          if (storedData) {
            const parsed = JSON.parse(storedData)
            setUserData({
              name: parsed.name || "",
              email: parsed.email || "",
              phone: parsed.phone || "",
              dateOfBirth: parsed.dateOfBirth || "",
              bloodType: parsed.bloodType || "O+",
              emergencyContact: parsed.emergencyContact || "",
              emergencyPhone: parsed.emergencyPhone || "",
              address: parsed.address || "",
            })
            setEditData({
              name: parsed.name || "",
              email: parsed.email || "",
              phone: parsed.phone || "",
              dateOfBirth: parsed.dateOfBirth || "",
              bloodType: parsed.bloodType || "O+",
              emergencyContact: parsed.emergencyContact || "",
              emergencyPhone: parsed.emergencyPhone || "",
              address: parsed.address || "",
            })
          }
          setLoading(false)
          return
        }

        const data = await response.json()
        const profileData = {
          name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          dateOfBirth: data.date_of_birth || "",
          bloodType: data.blood_type || "O+",
          emergencyContact: data.emergency_contact || "",
          emergencyPhone: data.emergency_phone || "",
          address: data.address || "",
        }
        setUserData(profileData)
        setEditData(profileData)
      } catch (err) {
        console.log("[v0] Error fetching profile:", err)
        setError("Failed to fetch profile data")
      } finally {
        setLoading(false)
      }
    }

    const fetchAppointments = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search)
        const urlToken = urlParams.get("token")
        const token = urlToken || localStorage.getItem("auth_token")

        if (!token) {
          setAppointmentsLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/appointments/patient/appointments`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const allAppointments = [...(data.upcoming || []), ...(data.past || [])]
          setAppointments(allAppointments)
        }
      } catch (err) {
        console.log("[v0] Error fetching appointments:", err)
      } finally {
        setAppointmentsLoading(false)
      }
    }

    fetchProfileData()
    fetchAppointments()
  }, [])

  const medicalRecords = [
    { id: 1, date: "2024-11-01", type: "Blood Test", result: "Normal" },
    { id: 2, date: "2024-10-15", type: "X-Ray", result: "Normal" },
    { id: 3, date: "2024-09-20", type: "ECG", result: "Normal" },
  ]

  const ambulanceHistory = [
    { id: 1, date: "2024-08-10", from: "Home", to: "City General Hospital", status: "completed" },
    { id: 2, date: "2024-07-05", from: "Office", to: "Central Medical Center", status: "completed" },
  ]

  const handleEditSave = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        setError("No authentication token found")
        return
      }

      const response = await fetch(`${API_BASE_URL}/auth/update-patient-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date_of_birth: editData.dateOfBirth,
          blood_type: editData.bloodType,
          address: editData.address,
          emergency_contact: editData.emergencyContact,
          emergency_phone: editData.emergencyPhone,
          phone: editData.phone,
        }),
      })

      if (response.ok) {
        setUserData(editData)
        setIsEditing(false)
        localStorage.setItem("userProfileData", JSON.stringify(editData))
      } else {
        setError("Failed to update profile")
      }
    } catch (err) {
      console.log("[v0] Error updating profile:", err)
      setError("Connection error while updating profile")
    }
  }

  const handleCancel = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        setAppointments(appointments.map((apt) => (apt.id === id ? { ...apt, status: "cancelled" } : apt)))
      }
    } catch (err) {
      console.error("[v0] Error cancelling appointment:", err)
    }
  }

  const getFilteredAndSortedAppointments = () => {
    let filtered = appointments.filter((apt) => {
      if (appointmentFilter === "upcoming") {
        return apt.status !== "completed" && apt.status !== "cancelled"
      } else if (appointmentFilter === "past") {
        return apt.status === "completed" || apt.status === "cancelled"
      } else if (appointmentFilter === "pending") {
        return apt.status === "pending"
      } else if (appointmentFilter === "confirmed") {
        return apt.status === "confirmed"
      }
      return true
    })

    if (appointmentSearch) {
      filtered = filtered.filter(
        (apt) =>
          apt.reason.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
          apt.doctor_id.toLowerCase().includes(appointmentSearch.toLowerCase()),
      )
    }

    filtered.sort((a, b) => {
      if (appointmentSort === "date-desc") {
        return new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
      } else if (appointmentSort === "date-asc") {
        return new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()
      }
      return 0
    })

    return filtered
  }

  const handleSignOut = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user_role")
    localStorage.removeItem("user_id")
    localStorage.removeItem("profile_complete")
    localStorage.removeItem("userProfileData")
    window.location.href = "http://localhost:5173"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  const filteredAppointments = getFilteredAndSortedAppointments()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50 pt-8 pb-12">
      <div className="max-w-4xl mx-auto px-5 md:px-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl p-8 text-white mb-8 shadow-lg">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-4xl font-bold">
              {userData.name ? userData.name.charAt(0) : "P"}
            </div>
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {userData.name || "Patient"}
              </h1>
              <p className="text-sky-100">{userData.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-15 p-4 rounded-lg backdrop-blur-sm">
              <p className="text-xs text-sky-100 font-semibold">Blood Type</p>
              <p className="text-2xl font-bold">{userData.bloodType || "N/A"}</p>
            </div>
            <div className="bg-white bg-opacity-15 p-4 rounded-lg backdrop-blur-sm">
              <p className="text-xs text-sky-100 font-semibold">Phone</p>
              <p className="text-lg font-bold truncate">{userData.phone || "N/A"}</p>
            </div>
            <div className="bg-white bg-opacity-15 p-4 rounded-lg backdrop-blur-sm">
              <p className="text-xs text-sky-100 font-semibold">Appointments</p>
              <p className="text-2xl font-bold">{appointments.length}</p>
            </div>
          </div>
        </div>

        {/* Tabs and Edit Button */}
        <div className="flex justify-between items-center gap-4 mb-6 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {["details", "appointments", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg"
                    : "bg-white text-slate-700 hover:bg-sky-50 border-2 border-sky-100"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {activeTab === "details" && (
            <button
              onClick={() => (isEditing ? handleEditSave() : setIsEditing(true))}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                isEditing
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                  : "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg hover:scale-105"
              }`}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Personal Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.name || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Email</label>
                    <p className="text-lg text-slate-800 font-semibold">{userData.email}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.phone || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData.dateOfBirth}
                        onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{editData.dateOfBirth || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Blood Type</label>
                    {isEditing ? (
                      <select
                        value={editData.bloodType}
                        onChange={(e) => setEditData({ ...editData, bloodType: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
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
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.bloodType || "O+"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Address</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.address || "N/A"}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t-2 border-sky-100 pt-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Contact Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.emergencyContact}
                        onChange={(e) => setEditData({ ...editData, emergencyContact: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.emergencyContact || "N/A"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-2">Contact Phone</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.emergencyPhone}
                        onChange={(e) => setEditData({ ...editData, emergencyPhone: e.target.value })}
                        className="w-full border-2 border-sky-200 rounded-lg px-3 py-2 text-lg focus:outline-none focus:border-sky-500"
                      />
                    ) : (
                      <p className="text-lg text-slate-800 font-semibold">{userData.emergencyPhone || "N/A"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                Appointment History
              </h2>

              {appointmentsLoading ? (
                <p className="text-slate-600">Loading appointments...</p>
              ) : appointments.length > 0 ? (
                <>
                  <div className="mb-6 space-y-4 bg-sky-50 p-4 rounded-xl border-2 border-sky-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Filter by Status</label>
                        <select
                          value={appointmentFilter}
                          onChange={(e) => setAppointmentFilter(e.target.value)}
                          className="w-full p-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:border-sky-500"
                        >
                          <option value="all">All Appointments</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="past">Past</option>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Sort by</label>
                        <select
                          value={appointmentSort}
                          onChange={(e) => setAppointmentSort(e.target.value)}
                          className="w-full p-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:border-sky-500"
                        >
                          <option value="date-desc">Newest First</option>
                          <option value="date-asc">Oldest First</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-2">Search</label>
                        <input
                          type="text"
                          placeholder="Doctor name or reason..."
                          value={appointmentSearch}
                          onChange={(e) => setAppointmentSearch(e.target.value)}
                          className="w-full p-2 border-2 border-sky-200 rounded-lg focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <p className="text-sm text-slate-600 font-medium">
                      Showing <span className="text-sky-600 font-bold">{filteredAppointments.length}</span> of{" "}
                      <span className="text-sky-600 font-bold">{appointments.length}</span> appointments
                    </p>
                  </div>

                  <div className="space-y-4">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="bg-sky-50 p-6 rounded-xl border-2 border-sky-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                            <div>
                              <p className="text-lg font-bold text-slate-800">Dr. {apt.doctor_id}</p>
                              <p className="text-slate-600 font-semibold">{apt.reason}</p>
                            </div>
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full ${
                                apt.status === "confirmed"
                                  ? "bg-green-100 text-green-700"
                                  : apt.status === "pending"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : apt.status === "completed"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-red-100 text-red-700"
                              }`}
                            >
                              {apt.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">
                            {apt.appointment_date} at {apt.appointment_time}
                          </p>
                          {apt.notes && <p className="text-sm text-slate-500 italic mb-3">Notes: {apt.notes}</p>}

                          {apt.status !== "completed" && apt.status !== "cancelled" && (
                            <div className="flex gap-2 pt-3 border-t border-sky-200">
                              <button
                                className="flex-1 px-3 py-2 text-xs bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all"
                                onClick={() => onNavigate("availability")}
                              >
                                Reschedule
                              </button>
                              <button
                                className="flex-1 px-3 py-2 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                onClick={() => handleCancel(apt.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-slate-600 py-8">No appointments match your filters</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-600 py-8">No appointment history</p>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-8">
              {/* Medical Records */}
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Medical Records
                </h2>
                <div className="space-y-3">
                  {medicalRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">{record.type}</p>
                          <p className="text-sm text-slate-600">{record.date}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          {record.result}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambulance History */}
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  Ambulance Usage
                </h2>
                <div className="space-y-3">
                  {ambulanceHistory.map((ambulance) => (
                    <div
                      key={ambulance.id}
                      className="bg-orange-50 p-6 rounded-xl border-2 border-orange-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-slate-800">
                            {ambulance.from} → {ambulance.to}
                          </p>
                          <p className="text-sm text-slate-600">{ambulance.date}</p>
                        </div>
                        <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          {ambulance.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 text-lg"
        >
          Sign Out
        </button>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
