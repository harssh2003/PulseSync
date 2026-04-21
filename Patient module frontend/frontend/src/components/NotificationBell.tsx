"use client"

import { useState, useEffect, useCallback } from "react"

const API_BASE_URL = "http://localhost:5000/api"

interface Notification {
  id:             string
  appointment_id: string
  message:        string
  type:           "info" | "success" | "warning" | "error"
  read:           boolean
  created_at:     string
}

interface NotificationBellProps {
  /** Optional: if provided the parent can trigger a refetch externally */
  onFetchRef?: (fn: () => void) => void
}

// ── Standalone fetch helper — can be imported by other components ──────────
export async function fetchAppointmentNotifications(): Promise<Notification[]> {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("auth_token") ?? ""
    : ""

  if (!token) return []

  try {
    const res = await fetch(`${API_BASE_URL}/appointments/notifications`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.notifications ?? []
  } catch (err) {
    console.error("[v0] fetchAppointmentNotifications error:", err)
    return []
  }
}

// ── Bell component ─────────────────────────────────────────────────────────
export default function NotificationBell({ onFetchRef }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen]               = useState(false)
  const [isLoading, setIsLoading]         = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const data = await fetchAppointmentNotifications()
    setNotifications(data)
    setIsLoading(false)
  }, [])

  // Expose refresh to parent if requested
  useEffect(() => {
    onFetchRef?.(refresh)
  }, [onFetchRef, refresh])

  // Poll every 30 s
  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = async (id: string) => {
    const token = localStorage.getItem("auth_token") ?? ""
    try {
      await fetch(`${API_BASE_URL}/appointments/notifications/${id}/read`, {
        method:  "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err) {
      console.error("[v0] markRead error:", err)
    }
  }

  const clearNotification = async (id: string) => {
    const token = localStorage.getItem("auth_token") ?? ""
    try {
      await fetch(`${API_BASE_URL}/appointments/notifications/${id}/clear`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (err) {
      console.error("[v0] clearNotification error:", err)
    }
  }

  const TYPE_ICON: Record<string, string> = {
    success: "✅",
    warning: "⚠️",
    error:   "❌",
    info:    "ℹ️",
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setIsOpen((o) => !o)
          if (!isOpen) refresh()
        }}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-md hover:shadow-lg border border-slate-100 transition-all hover:-translate-y-0.5"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                {isLoading && (
                  <div className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={async () => {
                      for (const n of notifications) await clearNotification(n.id)
                    }}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="text-4xl mb-2 opacity-40">🔔</div>
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                      !notif.read ? "bg-sky-50/60" : ""
                    }`}
                    onClick={() => markRead(notif.id)}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {TYPE_ICON[notif.type] ?? "ℹ️"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!notif.read ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {notif.created_at
                          ? new Date(notif.created_at).toLocaleString("en-IN", {
                              month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearNotification(notif.id) }}
                      className="text-slate-300 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                      aria-label="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}