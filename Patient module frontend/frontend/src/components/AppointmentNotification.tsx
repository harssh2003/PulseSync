"use client"

import { useState, useEffect } from "react"

interface AppointmentNotificationProps {
  appointmentId?: string
  doctorName?: string
  appointmentTime?: string
  reason?: string
}

export default function AppointmentNotification({
  appointmentId,
  doctorName = "Your Doctor",
  appointmentTime = "Soon",
  reason = "Your appointment",
}: AppointmentNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 right-4 max-w-sm animate-slide-up">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg p-4 flex items-start gap-3">
        <div className="text-2xl">✓</div>
        <div>
          <h3 className="font-bold text-sm">Appointment Booked!</h3>
          <p className="text-xs opacity-90 mt-1">
            {reason} with {doctorName} at {appointmentTime}
          </p>
          <p className="text-xs opacity-75 mt-1">Check your profile for details</p>
        </div>
        <button onClick={() => setIsVisible(false)} className="ml-auto text-lg hover:opacity-75 transition">
          ×
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
