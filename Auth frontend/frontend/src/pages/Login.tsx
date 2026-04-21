"use client"

import type React from "react"

import { useState } from "react"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"

interface LoginProps {
  onSwitchToSignup: () => void
}

const API_BASE_URL = "http://localhost:5000/api"

export default function Login({ onSwitchToSignup }: LoginProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isVisible, setIsVisible] = useState(false)

  // Check visibility on mount
  useState(() => {
    setIsVisible(true)
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      console.log("[v0] Login attempt with:", { email })

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.message || "Login failed. Please try again.")
        setLoading(false)
        return
      }

      console.log("[v0] Login successful - stored values:", {
        role: data.role,
        profile_complete: data.profile_complete,
      })

      setTimeout(() => {
        if (data.role === "patient") {
          if (!data.profile_complete) {
            console.log("[v0] Redirecting patient to complete-profile")
            window.location.href = `http://localhost:3001/complete-profile?token=${data.token}&role=${data.role}&user_id=${data.user_id}&profile_complete=${data.profile_complete}`
          } else {
            console.log("[v0] Redirecting patient to home")
            window.location.href = `http://localhost:3001?token=${data.token}&role=${data.role}&user_id=${data.user_id}&profile_complete=${data.profile_complete}`
          }
        } else if (data.role === "hospital") {
          console.log("[v0] Redirecting hospital to dashboard")
          window.location.href = `http://localhost:3002?token=${data.token}&role=${data.role}&user_id=${data.user_id}&profile_complete=${data.profile_complete}&is_login=true`
        }
      }, 0)
    } catch (err) {
      console.error("[v0] Login error:", err)
      setError("Connection error. Please check if the backend is running on port 5000.")
      setLoading(false)
    }
  }

  return (
    <div className={`auth-container transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      <div className="auth-card">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold gradient-text mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Welcome Back
          </h1>
          <p className="text-slate-600 text-sm">Sign in to your PulseSync account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-10 text-red-700 text-sm animate-fade-in">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input pl-10"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-button text-white font-bold py-3 px-4 rounded-12 mt-8 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span className="text-slate-400 text-sm">Don't have an account?</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        {/* Switch to Signup */}
        <p className="text-center text-slate-600 text-sm">
          <span className="toggle-link" onClick={onSwitchToSignup}>
            Create an account
          </span>
        </p>
      </div>
    </div>
  )
}
