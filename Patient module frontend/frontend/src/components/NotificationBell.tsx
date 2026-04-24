"use client"

import { useState } from "react"
import { useNotification } from "../context/NotificationContext"

interface NotificationBellProps {
  /** Called when patient taps "Analyze with AI" on a prescription notification */
  onAnalyzePrescription?: (prescriptionId: string) => void
  /** Optional: if provided the parent can trigger a refetch externally */
  onFetchRef?: (fn: () => void) => void
}

export default function NotificationBell({ onAnalyzePrescription }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification } = useNotification()
  const [isOpen, setIsOpen] = useState(false)

  const TYPE_ICON: Record<string, string> = {
    success:               "✅",
    warning:               "⚠️",
    error:                 "❌",
    info:                  "ℹ️",
    prescription_uploaded: "💊",
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen((o) => !o)}
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
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <>
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-sky-500 hover:text-sky-700 transition-colors"
                    >
                      Mark all read
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <div className="text-4xl mb-2 opacity-40">🔔</div>
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isPrescription = notif.type === "prescription_uploaded"
                  return (
                    <div
                      key={notif.id}
                      className={`flex gap-3 px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                        !notif.read ? "bg-sky-50/60" : ""
                      } ${isPrescription ? "bg-indigo-50/60 hover:bg-indigo-50" : ""}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <span className="text-lg flex-shrink-0 mt-0.5">
                        {TYPE_ICON[notif.type] ?? "ℹ️"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold mb-0.5 ${isPrescription ? "text-indigo-800" : "text-slate-700"}`}>
                          {notif.title}
                        </p>
                        <p className={`text-xs leading-snug ${!notif.read ? "font-medium text-slate-700" : "text-slate-500"}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {notif.timestamp
                            ? new Date(notif.timestamp).toLocaleString("en-IN", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })
                            : ""}
                        </p>

                        {/* ── Prescription AI CTA ── */}
                        {isPrescription && notif.prescriptionId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              markAsRead(notif.id)
                              setIsOpen(false)
                              onAnalyzePrescription?.(notif.prescriptionId!)
                            }}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-bold text-white transition-all"
                            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            </svg>
                            Analyze with AI → Set Reminders
                          </button>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); clearNotification(notif.id) }}
                        className="text-slate-300 hover:text-red-400 transition-colors text-xs flex-shrink-0 mt-0.5"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
