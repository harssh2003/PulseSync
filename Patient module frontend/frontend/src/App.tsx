"use client"

import { useState, useEffect } from "react"
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
import "./App.css"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("home")
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [redirectAttempted, setRedirectAttempted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const tokenFromUrl = params.get("token")
      const roleFromUrl = params.get("role")
      const userIdFromUrl = params.get("user_id")
      const profileCompleteFromUrl = params.get("profile_complete")

      if (tokenFromUrl) {
        // Store in localStorage for future use
        localStorage.setItem("auth_token", tokenFromUrl)
        localStorage.setItem("user_role", roleFromUrl || "patient")
        localStorage.setItem("user_id", userIdFromUrl || "")
        localStorage.setItem("profile_complete", profileCompleteFromUrl || "false")

        console.log("[v0] Patient App received data from URL params:", { roleFromUrl, profileCompleteFromUrl })

        // Determine which page to show based on profile_complete
        if (profileCompleteFromUrl !== "true") {
          console.log("[v0] Profile not complete, showing complete-profile page")
          setCurrentPage("complete-profile")
        } else {
          console.log("[v0] Profile complete, showing home page")
          setCurrentPage("home")
        }
        setIsAuthenticating(false)
      } else {
        // No token in URL, check localStorage
        const authToken = localStorage.getItem("auth_token")
        const profileComplete = localStorage.getItem("profile_complete")

        if (!authToken) {
          if (!redirectAttempted) {
            console.log("[v0] No auth token found, redirecting to auth")
            setRedirectAttempted(true)
            window.location.href = "http://localhost:5173"
          }
          return
        }

        if (profileComplete !== "true") {
          console.log("[v0] Profile not complete, showing complete-profile page")
          setCurrentPage("complete-profile")
        } else {
          console.log("[v0] Profile complete, showing home page")
          setCurrentPage("home")
        }

        setIsAuthenticating(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [redirectAttempted])

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
        return <PrescriptionTracker onNavigate={setCurrentPage} />
      case "reminders":
        return <RemindersPage onNavigate={setCurrentPage} />
      case "history":
        return <MedicalHistory onNavigate={setCurrentPage} />
      case "ambulance":
        return <AmbulanceBooking onNavigate={setCurrentPage} />
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
        <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="main-content">{renderPage()}</main>
        <ChatbotIcon />
      </div>
    </NotificationProvider>
  )
}
