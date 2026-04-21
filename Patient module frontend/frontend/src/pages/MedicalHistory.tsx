"use client"
import { useState, useEffect } from "react"
import MedicalRecordComponent from "../components/MedicalRecord"

interface MedicalHistoryProps {
  onNavigate: (page: string) => void
}

interface MedicalRecord {
  id: number
  type: string
  title: string
  date: string
  hospital: string
  doctor: string
  status: string
  details: string
}

export default function MedicalHistory({ onNavigate }: MedicalHistoryProps) {
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const medicalRecords: MedicalRecord[] = [
    {
      id: 1,
      type: "Lab Report",
      title: "Blood Test Results",
      date: "2024-01-10",
      hospital: "City General Hospital",
      doctor: "Dr. Sarah Johnson",
      status: "normal",
      details: "Complete blood count - All values within normal range",
    },
    {
      id: 2,
      type: "Prescription",
      title: "Hypertension Medication",
      date: "2024-01-08",
      hospital: "City General Hospital",
      doctor: "Dr. Sarah Johnson",
      status: "active",
      details: "Lisinopril 10mg - Once daily",
    },
    {
      id: 3,
      type: "Diagnosis",
      title: "Hypertension",
      date: "2023-12-20",
      hospital: "City General Hospital",
      doctor: "Dr. Sarah Johnson",
      status: "ongoing",
      details: "Stage 1 Hypertension - Under treatment",
    },
    {
      id: 4,
      type: "Imaging",
      title: "Chest X-Ray",
      date: "2023-12-15",
      hospital: "Prime Health Hospital",
      doctor: "Dr. Michael Chen",
      status: "normal",
      details: "No abnormalities detected",
    },
    {
      id: 5,
      type: "Vaccination",
      title: "COVID-19 Booster",
      date: "2023-11-30",
      hospital: "Wellness Clinic & Hospital",
      doctor: "Dr. James Wilson",
      status: "completed",
      details: "Pfizer-BioNTech - Dose 3",
    },
    {
      id: 6,
      type: "Lab Report",
      title: "Lipid Panel",
      date: "2023-11-20",
      hospital: "City General Hospital",
      doctor: "Dr. Sarah Johnson",
      status: "normal",
      details: "Cholesterol levels - Slightly elevated",
    },
  ]

  const categories = ["all", "Lab Report", "Prescription", "Diagnosis", "Imaging", "Vaccination"]

  const categoryIcons = {
    "all": "📋",
    "Lab Report": "🔬",
    "Prescription": "💊",
    "Diagnosis": "🩺",
    "Imaging": "📷",
    "Vaccination": "💉"
  }

  const filteredRecords = medicalRecords.filter(
    (record) => selectedCategory === "all" || record.type === selectedCategory,
  )

  const recordsByType = {
    "Lab Report": medicalRecords.filter(r => r.type === "Lab Report").length,
    "Prescription": medicalRecords.filter(r => r.type === "Prescription").length,
    "Diagnosis": medicalRecords.filter(r => r.type === "Diagnosis").length,
    "Imaging": medicalRecords.filter(r => r.type === "Imaging").length,
    "Vaccination": medicalRecords.filter(r => r.type === "Vaccination").length,
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-full overflow-x-hidden bg-gradient-to-b from-sky-50 via-white to-cyan-50 px-5 md:px-10 py-12 font-['Inter',sans-serif]">
      {/* Header Section with Background */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-8 bg-gradient-to-br from-indigo-100 via-sky-50 to-cyan-100 px-5 md:px-10 py-16 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-indigo-300/30 rounded-full blur-3xl -top-10 -left-10 animate-float"></div>
          <div className="absolute w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl -bottom-10 -right-10 animate-float-delayed"></div>
        </div>

        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-indigo-700 text-sm font-semibold mb-4 shadow-md">
            📄 Your Health Records
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 via-sky-600 to-cyan-700 bg-clip-text text-transparent mb-4 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Medical History
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            Access your complete medical records and documents securely in one place
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Sidebar Filters */}
        <div className={`flex flex-col gap-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          {/* Filter Card */}
          <div className="bg-white p-6 rounded-3xl shadow-xl shadow-indigo-100/50 border-2 border-indigo-100/50 sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">🔍</span>
              <h2 className="text-lg font-bold text-slate-800">Filter Records</h2>
            </div>

            <div className="flex flex-col gap-2">
              {categories.map((category, index) => (
                <button
                  key={category}
                  className={`px-4 py-3.5 rounded-xl cursor-pointer font-semibold text-sm transition-all duration-300 text-left flex items-center justify-between group ${
                    selectedCategory === category
                      ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-lg scale-[1.02]"
                      : "bg-slate-50 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    animation: `slideRight 0.4s ease-out forwards`,
                    animationDelay: `${200 + index * 50}ms`,
                    opacity: 0
                  }}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{categoryIcons[category as keyof typeof categoryIcons]}</span>
                    <span>{category === "all" ? "All Records" : category}</span>
                  </span>
                  {category !== "all" && (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      selectedCategory === category 
                        ? "bg-white/20" 
                        : "bg-slate-200 text-slate-600"
                    }`}>
                      {recordsByType[category as keyof typeof recordsByType]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-6 pt-6 border-t-2 border-slate-200">
              <p className="text-sm text-slate-600 font-medium mb-3">Quick Stats</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Total Records</span>
                  <span className="font-bold text-indigo-600">{medicalRecords.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Filtered</span>
                  <span className="font-bold text-cyan-600">{filteredRecords.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Records Content */}
        <div className="flex flex-col gap-6">
          {/* Results Header */}
          <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedCategory === "all" ? "All Records" : selectedCategory}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Showing <span className="font-bold text-indigo-600">{filteredRecords.length}</span> record{filteredRecords.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-semibold hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
                Export PDF 📥
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                Upload Record ➕
              </button>
            </div>
          </div>

          {/* Records Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((record, index) => (
                <div
                  key={record.id}
                  className="transition-all duration-500"
                  style={{ 
                    animation: `slideUp 0.6s ease-out forwards`,
                    animationDelay: `${300 + index * 100}ms`,
                    opacity: 0
                  }}
                >
                  <MedicalRecordComponent record={record} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-20 px-5 bg-white rounded-3xl shadow-lg border-2 border-slate-100">
                <div className="text-7xl mb-5 transition-transform duration-500 hover:scale-110">📋</div>
                <p className="text-xl font-bold text-slate-800 mb-2">No medical records found</p>
                <p className="text-base text-slate-600 mb-6">Try selecting a different category to view records</p>
                <button 
                  onClick={() => setSelectedCategory("all")}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300 active:scale-95"
                >
                  View All Records
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-5 transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div 
          onClick={() => onNavigate("booking")}
          className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-indigo-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group"
        >
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">📅</div>
          <h3 className="text-lg font-bold mb-2">My Appointments</h3>
          <p className="text-sm opacity-90">View and manage your appointments</p>
        </div>
        
        <div 
          onClick={() => onNavigate("availability")}
          className="bg-gradient-to-br from-cyan-500 to-blue-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-cyan-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group"
        >
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">🩺</div>
          <h3 className="text-lg font-bold mb-2">Book Appointment</h3>
          <p className="text-sm opacity-90">Schedule with expert doctors</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-sky-500 text-white p-6 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-blue-200/50 transition-all duration-300 cursor-pointer hover:-translate-y-2 group">
          <div className="text-3xl mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">🔒</div>
          <h3 className="text-lg font-bold mb-2">Privacy Settings</h3>
          <p className="text-sm opacity-90">Manage your data and preferences</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}