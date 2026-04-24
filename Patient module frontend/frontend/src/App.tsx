"use client"

import { useState, useEffect, useCallback } from "react"
import Navigation from "./components/Navigation"
import LandingPage from "./pages/LandingPage"
import HospitalSearch from "./pages/HospitalSearch"
import Availability from "./pages/Availability"
import AppointmentBooking from "./pages/AppointmentBooking"
import MedicalHistory from "./pages/MedicalHistory"
import AmbulanceBooking from "./pages/AmbulanceBooking"
import ProfilePage from "./pages/ProfilePage"
import CompleteProfile from "./pages/CompleteProfile"
import PrescriptionTracker from "./pages/PrescriptionTracker"
import ChatbotIcon from "./components/ChatbotIcon"
import { NotificationProvider } from "./context/NotificationContext"
import RemindersPage from "./pages/RemindersPage"
import MyDiagnostics from "./pages/MyDiagnostics"
import "./App.css"

const API_BASE = "http://localhost:5000"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [redirectAttempted, setRedirectAttempted] = useState(false)

  // ── Prescription pipeline state ──────────────────────────────────────────
  /**
   * When the patient taps "Analyze with AI" on a prescription notification,
   * we fetch the prescription file from the backend, then pass it to
   * PrescriptionTracker as a Blob so it triggers an auto-scan.
   */
  const [pendingPrescriptionBlob, setPendingPrescriptionBlob] = useState<Blob | null>(null)
  const [pendingPrescriptionMime, setPendingPrescriptionMime] = useState<string>("image/jpeg")

  /**
   * After PrescriptionTracker finishes its scan it calls onAnalysisComplete
   * with the list of medicine names found.  We store those here and redirect
   * to RemindersPage, which consumes them via prefillMedicines.
   */
  const [prefillMedicines, setPrefillMedicines] = useState<string[]>([])

  // ── Auth bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get("token")
      const roleFromUrl = params.get("role")
      const userIdFromUrl = params.get("user_id")
      const profileCompleteFromUrl = params.get("profile_complete")

      if (tokenFromUrl) {
        localStorage.setItem("auth_token", tokenFromUrl)
        localStorage.setItem("user_role", roleFromUrl || "patient")
        localStorage.setItem("user_id", userIdFromUrl || "")
        localStorage.setItem("profile_complete", profileCompleteFromUrl || "false")

        if (profileCompleteFromUrl !== "true") {
          setCurrentPage("complete-profile")
        } else {
          setCurrentPage("home")
        }
        setIsAuthenticating(false)
      } else {
        const authToken = localStorage.getItem("auth_token")
        const profileComplete = localStorage.getItem("profile_complete")

        if (!authToken) {
          if (!redirectAttempted) {
            setRedirectAttempted(true)
            window.location.href = "http://localhost:5173"
          }
          return
        }

        if (profileComplete !== "true") {
          setCurrentPage("complete-profile")
        } else {
          setCurrentPage("home")
        }
        setIsAuthenticating(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [redirectAttempted])

  // ── Prescription pipeline handler ────────────────────────────────────────
  /**
   * Called by NotificationBell when patient taps "Analyze with AI".
   * Fetches the raw prescription file and navigates to PrescriptionTracker
   * with the blob attached for auto-scan.
   */
  const handleAnalyzePrescription = useCallback(async (prescriptionId: string) => {
    try {
      const token = localStorage.getItem("auth_token") || ""
      const res = await fetch(
        `${API_BASE}/api/appointment-prescriptions/${prescriptionId}/file`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error("Could not fetch prescription file")
      const contentType = res.headers.get("content-type") || "image/jpeg"
      const blob = await res.blob()
      setPendingPrescriptionBlob(blob)
      setPendingPrescriptionMime(contentType)
      setPrefillMedicines([])
      setCurrentPage("prescriptions")
    } catch (err) {
      console.error("[prescription-pipeline] fetch failed:", err)
      // Still navigate — patient can manually upload
      setPendingPrescriptionBlob(null)
      setCurrentPage("prescriptions")
    }
  }, [])

  // ── Handle prescription blob passed from MyDiagnostics ──────────────────────
  useEffect(() => {
    if (currentPage === "prescriptions" && window.prescriptionBlobToAnalyze) {
      setPendingPrescriptionBlob(window.prescriptionBlobToAnalyze)
      setPendingPrescriptionMime(window.prescriptionMimeToAnalyze || "image/jpeg")
      setPrefillMedicines([])
      // Clean up
      delete window.prescriptionBlobToAnalyze
      delete window.prescriptionMimeToAnalyze
    }
  }, [currentPage])

  /**
   * Called by PrescriptionTracker after AI analysis completes.
   * Receives the list of analysed medicine names, stores them, then
   * automatically navigates to RemindersPage which pre-fills all of them.
   */
  const handleAnalysisComplete = useCallback((medicineNames: string[]) => {
    setPrefillMedicines(medicineNames)
    setPendingPrescriptionBlob(null)
    setCurrentPage("reminders")
  }, [])

  // ── Page renderer ────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case "complete-profile":
        return <CompleteProfile onNavigate={setCurrentPage} />
      case "home":
        return <LandingPage onNavigate={setCurrentPage} />
      case "search":
        return <HospitalSearch onNavigate={setCurrentPage} />
      case "availability":
        return <Availability onNavigate={setCurrentPage} />
      case "booking":
        return <AppointmentBooking onNavigate={setCurrentPage} />
      case "prescriptions":
        return (
          <PrescriptionTracker
            onNavigate={setCurrentPage}
            autoPrescriptionBlob={pendingPrescriptionBlob ?? undefined}
            autoPrescriptionMime={pendingPrescriptionMime}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )
      case "reminders":
        return (
          <RemindersPage
            onNavigate={setCurrentPage}
            prefillMedicines={prefillMedicines.length > 0 ? prefillMedicines : undefined}
          />
        )
      case "history":
        return <MedicalHistory onNavigate={setCurrentPage} />
      case "ambulance":
        return <AmbulanceBooking onNavigate={setCurrentPage} />
      case "mydiagnostics":
        return <MyDiagnostics onNavigate={setCurrentPage} />
      case "profile":
        return <ProfilePage onNavigate={setCurrentPage} />
      default:
        return <LandingPage onNavigate={setCurrentPage} />
    }
  }

  if (isAuthenticating) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-50 to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <NotificationProvider>
      <div className="app">
        <Navigation
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onAnalyzePrescription={handleAnalyzePrescription}
        />
        <main className="main-content">{renderPage()}</main>
        <ChatbotIcon />
      </div>
    </NotificationProvider>
  )
}
