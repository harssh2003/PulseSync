"use client"

import { useState, useEffect } from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import "./App.css"

type Page = "login" | "signup"

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("login")
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Only check auth status, don't redirect automatically
    // Redirection should happen from Login/Signup pages after successful auth
    setIsCheckingAuth(false)
  }, [])

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {currentPage === "login" ? (
        <Login onSwitchToSignup={() => setCurrentPage("signup")} />
      ) : (
        <Signup onSwitchToLogin={() => setCurrentPage("login")} />
      )}
    </div>
  )
}

export default App
