"use client"

import { useState } from "react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState("details")

  // Mock user data - replace with API call to backend
  const userData = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 (555) 123-4567",
    dateOfBirth: "1990-05-15",
    bloodType: "O+",
    emergencyContact: "Jane Doe",
    emergencyPhone: "+1 (555) 987-6543",
    address: "123 Main Street, New York, NY 10001",
  }

  const appointmentHistory = [
    { id: 1, date: "2024-11-01", hospital: "City General Hospital", doctor: "Dr. Smith", status: "completed" },
    { id: 2, date: "2024-10-15", hospital: "Central Medical Center", doctor: "Dr. Johnson", status: "completed" },
    { id: 3, date: "2024-09-20", hospital: "City General Hospital", doctor: "Dr. Williams", status: "completed" },
  ]

  const medicalRecords = [
    { id: 1, date: "2024-11-01", type: "Blood Test", result: "Normal" },
    { id: 2, date: "2024-10-15", type: "X-Ray", result: "Normal" },
    { id: 3, date: "2024-09-20", type: "ECG", result: "Normal" },
  ]

  const ambulanceHistory = [
    { id: 1, date: "2024-08-10", from: "Home", to: "City General Hospital", status: "completed" },
    { id: 2, date: "2024-07-05", from: "Office", to: "Central Medical Center", status: "completed" },
  ]

  const handleSignOut = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("userRole")
    window.location.href = "http://localhost:3000"
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[200]" onClick={onClose}></div>

      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[201] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-sky-500 to-cyan-500 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
            My Profile
          </h2>
          <button
            onClick={onClose}
            className="text-2xl hover:bg-white hover:bg-opacity-20 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          >
            ×
          </button>
        </div>

        {/* Profile Section */}
        <div className="p-6 border-b-2 border-sky-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {userData.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800" style={{ fontFamily: "'Poppins', sans-serif" }}>
                {userData.name}
              </h3>
              <p className="text-sm text-slate-600">{userData.email}</p>
            </div>
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-sky-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Blood Type</p>
              <p className="text-lg font-bold text-sky-600">{userData.bloodType}</p>
            </div>
            <div className="bg-sky-50 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-semibold">Phone</p>
              <p className="text-xs font-bold text-slate-700 truncate">{userData.phone}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-sky-100 bg-white sticky top-20">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex-1 py-3 font-semibold text-sm transition-all ${
              activeTab === "details" ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-600 hover:text-sky-600"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`flex-1 py-3 font-semibold text-sm transition-all ${
              activeTab === "appointments"
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-slate-600 hover:text-sky-600"
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 font-semibold text-sm transition-all ${
              activeTab === "history" ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-600 hover:text-sky-600"
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Full Name</label>
                <p className="text-slate-800 font-semibold">{userData.name}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Email</label>
                <p className="text-slate-800 font-semibold">{userData.email}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Phone</label>
                <p className="text-slate-800 font-semibold">{userData.phone}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Date of Birth</label>
                <p className="text-slate-800 font-semibold">{userData.dateOfBirth}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Blood Type</label>
                <p className="text-slate-800 font-semibold">{userData.bloodType}</p>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Address</label>
                <p className="text-slate-800 font-semibold">{userData.address}</p>
              </div>
              <div className="pt-2 border-t-2 border-sky-100">
                <label className="text-xs font-bold text-slate-600 uppercase">Emergency Contact</label>
                <p className="text-slate-800 font-semibold">{userData.emergencyContact}</p>
                <p className="text-slate-700">{userData.emergencyPhone}</p>
              </div>
            </div>
          )}

          {/* Appointments Tab */}
          {activeTab === "appointments" && (
            <div className="space-y-3">
              {appointmentHistory.length > 0 ? (
                appointmentHistory.map((apt) => (
                  <div key={apt.id} className="bg-sky-50 p-4 rounded-lg border border-sky-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{apt.hospital}</p>
                        <p className="text-sm text-slate-600">Dr. {apt.doctor}</p>
                      </div>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">
                        {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{apt.date}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-600 py-4">No appointment history</p>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="space-y-4">
              {/* Medical Records */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Medical Records</h4>
                <div className="space-y-2">
                  {medicalRecords.map((record) => (
                    <div key={record.id} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-800">{record.type}</p>
                          <p className="text-xs text-slate-600">{record.date}</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">{record.result}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ambulance History */}
              <div>
                <h4 className="font-bold text-slate-800 mb-3">Ambulance Usage</h4>
                <div className="space-y-2">
                  {ambulanceHistory.map((ambulance) => (
                    <div key={ambulance.id} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {ambulance.from} → {ambulance.to}
                          </p>
                          <p className="text-xs text-slate-600">{ambulance.date}</p>
                        </div>
                        <span className="text-xs font-bold text-green-600">{ambulance.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="w-full mt-8 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
          >
            Sign Out
          </button>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        `}</style>
      </div>
    </>
  )
}
