// src/context/NotificationContext.tsx
import React, {
  createContext, useContext, useEffect,
  useRef, useState, useCallback
} from "react"

export interface Notification {
  id: string
  appointmentId?: string
  prescriptionId?: string
  doctorName?: string
  hospitalName?: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error" | "prescription_uploaded"
  read: boolean
  timestamp: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearNotifications: () => void
  // Legacy alias so any old code calling addNotification doesn't hard-crash
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000"

function typeToTitle(type: string): string {
  switch (type) {
    case "success":               return "Appointment Confirmed"
    case "warning":               return "Appointment Cancelled"
    case "error":                 return "Action Required"
    case "prescription_uploaded": return "💊 Prescription Ready"
    default:                      return "New Notification"
  }
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || localStorage.getItem("auth_token") || ""}`,
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const esRef = useRef<EventSource | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addOrUpdate = useCallback((raw: any) => {
    const notif: Notification = {
      id: raw.id,
      appointmentId:  raw.appointment_id || undefined,
      prescriptionId: raw.prescription_id || undefined,
      doctorName:     raw.doctor_name || undefined,
      hospitalName:   raw.hospital_name || undefined,
      title:   typeToTitle(raw.type),
      message: raw.message,
      type:    raw.type ?? "info",
      read:    raw.read ?? false,
      timestamp: raw.created_at ?? new Date().toISOString(),
    }
    setNotifications(prev => {
      if (prev.some(n => n.id === notif.id)) {
        return prev.map(n => n.id === notif.id ? notif : n)
      }
      return [notif, ...prev]
    })
  }, [])

  const connect = useCallback(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("auth_token")
    if (!token) return

    esRef.current?.close()

    const url = `${API_BASE}/api/notifications/stream?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es

    es.onopen = () => {
      console.log("[SSE] Connected")
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }

    es.onmessage = (event) => {
      try {
        addOrUpdate(JSON.parse(event.data))
      } catch {
        console.warn("[SSE] Parse error:", event.data)
      }
    }

    es.onerror = () => {
      console.warn("[SSE] Lost connection, retrying in 5s…")
      es.close()
      esRef.current = null
      retryTimer.current = setTimeout(connect, 5000)
    }
  }, [addOrUpdate])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryTimer.current) clearTimeout(retryTimer.current)
    }
  }, [connect])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: "PUT", headers: getAuthHeaders(),
      })
    } catch (e) { console.error(e) }
  }, [])

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await fetch(`${API_BASE}/api/notifications/mark-all-read`, {
        method: "POST", headers: getAuthHeaders(),
      })
    } catch (e) { console.error(e) }
  }, [])

  const clearNotification = useCallback(async (id: string) => {
    // Remove immediately from UI
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await fetch(`${API_BASE}/api/notifications/${id}/clear`, {
        method: "POST", headers: getAuthHeaders(),
      })
    } catch (e) { console.error(e) }
  }, [])

  const clearNotifications = useCallback(async () => {
    setNotifications([])
    try {
      await fetch(`${API_BASE}/api/notifications/clear-all`, {
        method: "POST", headers: getAuthHeaders(),
      })
    } catch (e) { console.error(e) }
  }, [])

  // Legacy shim — keeps old code from crashing
  const addNotification = useCallback(
    (n: Omit<Notification, "id" | "timestamp" | "read">) => {
      addOrUpdate({
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
        read: false,
        ...n,
      })
    },
    [addOrUpdate]
  )

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearNotifications,
      addNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotification must be used within NotificationProvider")
  return ctx
}