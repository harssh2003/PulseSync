  "use client"

  import type React from "react"

  import { useState } from "react"
  import { Mail, Lock, User, Eye, EyeOff, Stethoscope, Heart, Building2, FileText, MapPin } from "lucide-react"

  interface SignupProps {
    onSwitchToLogin: () => void
  }

  const API_BASE_URL = "http://localhost:5000/api"

  export default function Signup({ onSwitchToLogin }: SignupProps) {
    const [role, setRole] = useState<"patient" | "hospital">("patient")
    const [fullName, setFullName] = useState("")
    const [doctorName, setDoctorName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const [hospitalRegistration, setHospitalRegistration] = useState("")
    const [department, setDepartment] = useState("")
    const [licenseNumber, setLicenseNumber] = useState("")
    const [hospitalAddress, setHospitalAddress] = useState("")
    const [staffPosition, setStaffPosition] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isVisible, setIsVisible] = useState(false)

    useState(() => {
      setIsVisible(true)
    })

    const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault()
      setError("")
      setSuccess("")

      // Validation
      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters")
        return
      }

      setLoading(true)

      try {
        const signupData = {
          email,
          password,
          fullName,
          role,
          ...(role === "hospital" && {
            doctorName,
            registrationNumber: hospitalRegistration,
            department: department ? department.charAt(0).toUpperCase() + department.slice(1) : department,
            licenseNumber,
            address: hospitalAddress,
            staffPosition,
          }),
        }

        console.log("[v0] Signup data:", signupData)

        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(signupData),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || data.message || "Signup failed. Please try again.")
          setLoading(false)
          return
        }

        console.log("[v0] Signup successful - stored values:", {
          role: data.role,
          profile_complete: data.profile_complete,
          storedRole: localStorage.getItem("user_role"),
          storedProfileComplete: localStorage.getItem("profile_complete"),
        })

        setSuccess("Account created successfully! Redirecting...")

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
            console.log("[v0] Redirecting hospital to complete-profile or dashboard")
            window.location.href = `http://localhost:3002?token=${data.token}&role=${data.role}&user_id=${data.user_id}&profile_complete=${data.profile_complete}&is_login=false`
          }
        }, 0)
      } catch (err) {
        console.error("[v0] Signup error:", err)
        setError("Connection error. Please check if the backend is running on port 5000.")
        setLoading(false)
      }
    }

    return (
      <div className={`auth-container transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="auth-card">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2" style={{ fontFamily: "'Poppins', sans-serif" }}>
              Get Started
            </h1>
            <p className="text-slate-600 text-sm">Create your PulseSync account</p>
          </div>

          {/* Role Selection */}
          <div className="mb-8">
            <label className="form-label">Select Your Role</label>
            <div className="role-selector">
              <div className={`role-option ${role === "patient" ? "selected" : ""}`} onClick={() => setRole("patient")}>
                <Heart size={24} className="mx-auto mb-2 text-sky-600" />
                <p className="font-semibold text-slate-700">Patient</p>
              </div>
              <div className={`role-option ${role === "hospital" ? "selected" : ""}`} onClick={() => setRole("hospital")}>
                <Building2 size={24} className="mx-auto mb-2 text-cyan-600" />
                <p className="font-semibold text-slate-700">Hospital</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-10 text-red-700 text-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-10 text-green-700 text-sm animate-fade-in">
              {success}
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name / Hospital Name Field */}
            <div className="form-group">
              <label className="form-label">{role === "patient" ? "Full Name" : "Hospital Name"}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={role === "patient" ? "John Doe" : "City Hospital"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="form-input pl-12"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="form-input pl-12"
                />
              </div>
            </div>

            {role === "hospital" && (
              <>
                {/* Doctor Name — NEW FIELD */}
                <div className="form-group">
                  <label className="form-label">Doctor's Full Name</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="e.g., Dr. Harsh Mishra"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      required
                      className="form-input pl-12"
                    />
                  </div>
                </div>

                {/* Hospital Registration Number */}
                <div className="form-group">
                  <label className="form-label">Hospital Registration Number</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="e.g., HR-2024-001"
                      value={hospitalRegistration}
                      onChange={(e) => setHospitalRegistration(e.target.value)}
                      required
                      className="form-input pl-12"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <div className="relative">
                    <Stethoscope
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                      className="form-input pl-12"
                    >
                      <option value="">Select Department</option>
                      <option value="Cardiology">Cardiology</option>
                      <option value="Neurology">Neurology</option>
                      <option value="Orthopedics">Orthopedics</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Administration">Administration</option>
                    </select>
                  </div>
                </div>

                {/* License Number */}
                <div className="form-group">
                  <label className="form-label">Medical License Number</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="e.g., LIC-2024-123456"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      required
                      className="form-input pl-12"
                    />
                  </div>
                </div>

                {/* Hospital Address */}
                <div className="form-group">
                  <label className="form-label">Hospital Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="123 Medical Street, City"
                      value={hospitalAddress}
                      onChange={(e) => setHospitalAddress(e.target.value)}
                      required
                      className="form-input pl-12"
                    />
                  </div>
                </div>

                {/* Staff Position */}
                <div className="form-group">
                  <label className="form-label">Your Position</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={staffPosition}
                      onChange={(e) => setStaffPosition(e.target.value)}
                      required
                      className="form-input pl-12"
                    >
                      <option value="">Select Position</option>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="administrator">Administrator</option>
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="form-input pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-button text-white font-bold py-3 px-4 rounded-12 mt-6 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                "Sign Up"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-slate-400 text-sm">Already have an account?</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Switch to Login */}
          <p className="text-center text-slate-600 text-sm">
            <span className="toggle-link" onClick={onSwitchToLogin}>
              Sign in instead
            </span>
          </p>
        </div>
      </div>
    )
  }
