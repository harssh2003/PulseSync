"use client"

import { useState, useEffect, useCallback } from "react"

interface MyDiagnosticsProps {
  onNavigate?: (page: string) => void
}

interface DiagnosticTest {
  id: string
  hospital_name: string
  test_name: string
  notes: string
  status: "scheduled" | "in-progress" | "completed"
  scheduled_date: string
  has_report: boolean
  report_filename: string
  has_prescription: boolean
  prescription_filename: string
  created_at: string
}

const API_BASE_URL = "http://localhost:5000/api"

function getToken(): string | null {
  return localStorage.getItem("auth_token") || localStorage.getItem("token")
}

function formatDate(d: string) {
  if (!d) return "—"
  const parsed = new Date(d.includes("T") ? d : d + "T00:00:00")
  return parsed.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

const STATUS_CONFIG = {
  scheduled: { label: "Scheduled", icon: "📅", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  "in-progress": { label: "In Progress", icon: "🔄", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completed", icon: "✅", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

export default function MyDiagnostics({ onNavigate }: MyDiagnosticsProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tests, setTests] = useState<DiagnosticTest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")

  // Viewer state
  const [viewUrl, setViewUrl] = useState<string | null>(null)
  const [viewName, setViewName] = useState("")
  const [viewIsImage, setViewIsImage] = useState(false)
  const [fileLoading, setFileLoading] = useState<string | null>(null) // "report-{id}" or "presc-{id}"
  const [currentTestId, setCurrentTestId] = useState<string | null>(null) // Track which test's prescription is open
  const [analyzingPrescription, setAnalyzingPrescription] = useState(false)

  const fetchTests = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = getToken()
      if (!token) { setError("Not authenticated."); setIsLoading(false); return }
      const res = await fetch(`${API_BASE_URL}/diagnostics/patient`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }
      const data = await res.json()
      setTests(data.tests || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load diagnostics")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setIsVisible(true)
    fetchTests()
  }, [fetchTests])

  const openViewer = (url: string, name: string, testId: string | null = null) => {
    const ext = name.split(".").pop()?.toLowerCase() || ""
    setViewUrl(url)
    setViewName(name)
    setViewIsImage(["jpg", "jpeg", "png"].includes(ext))
    setCurrentTestId(testId)
  }

  const closeViewer = () => {
    if (viewUrl) URL.revokeObjectURL(viewUrl)
    setViewUrl(null); setViewName(""); setViewIsImage(false); setCurrentTestId(null)
  }

  const handleAnalyzeWithAI = async () => {
    if (!currentTestId) return
    setAnalyzingPrescription(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/diagnostics/${currentTestId}/prescription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Failed to load prescription")
      const blob = await res.blob()
      const contentType = res.headers.get("content-type") || "image/jpeg"

      // Call the parent's prescription analysis handler
      if (onNavigate) {
        // Store blob in session for the PrescriptionTracker to pick up
        sessionStorage.setItem("pendingPrescriptionBlob", JSON.stringify({
          size: blob.size,
          type: contentType
        }))
        // Store blob itself in a way that can be retrieved
        window.prescriptionBlobToAnalyze = blob
        window.prescriptionMimeToAnalyze = contentType
        onNavigate("prescriptions")
      }
    } catch (err) {
      console.error("[AI Analyze] Error:", err)
      alert("Failed to prepare prescription for analysis. Please try again.")
    } finally {
      setAnalyzingPrescription(false)
    }
  }

  const handleViewReport = async (test: DiagnosticTest) => {
    if (!test.has_report) return
    const key = `report-${test.id}`
    setFileLoading(key)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/diagnostics/${test.id}/report`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      openViewer(URL.createObjectURL(blob), test.report_filename || `${test.test_name} Report.pdf`)
    } catch {
      alert("Failed to load the report. Please try again.")
    } finally {
      setFileLoading(null)
    }
  }

  const handleDownloadPrescription = async (test: DiagnosticTest) => {
    if (!test.has_prescription) return
    const key = `presc-${test.id}`
    setFileLoading(key)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/diagnostics/${test.id}/prescription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const fname = test.prescription_filename || "prescription.pdf"
      // For images, open in viewer; for PDF also open in viewer
      openViewer(URL.createObjectURL(blob), fname, test.id)
    } catch {
      alert("Failed to load the prescription. Please try again.")
    } finally {
      setFileLoading(null)
    }
  }

  const filtered = tests.filter((t) => statusFilter === "all" || t.status === statusFilter)

  const counts = {
    all: tests.length,
    scheduled: tests.filter((t) => t.status === "scheduled").length,
    "in-progress": tests.filter((t) => t.status === "in-progress").length,
    completed: tests.filter((t) => t.status === "completed").length,
  }

  return (
    <div className="flex flex-col gap-8 w-full bg-gradient-to-b from-indigo-50 via-white to-purple-50 px-5 md:px-10 py-12 font-['Inter',sans-serif] min-h-screen">

      {/* Header */}
      <div className="relative -mx-5 md:-mx-10 -mt-12 mb-4 bg-gradient-to-br from-indigo-100 via-purple-50 to-blue-50 px-5 md:px-10 py-16 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden opacity-30">
          <div className="absolute w-64 h-64 bg-indigo-300/30 rounded-full blur-3xl -top-10 -right-10 animate-pulse" />
          <div className="absolute w-80 h-80 bg-purple-300/20 rounded-full blur-3xl -bottom-10 -left-10 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          <div className="inline-block px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-indigo-700 text-sm font-semibold mb-4 shadow-md">
            🔬 My Health Tests
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-600 to-blue-700 bg-clip-text text-transparent mb-4 leading-tight" style={{ fontFamily: "'Poppins', sans-serif" }}>
            My Diagnostics
          </h1>
          <p className="text-lg text-slate-700 max-w-2xl mx-auto font-medium">
            View your scheduled tests, download reports and prescriptions
          </p>
        </div>
      </div>

      {/* Filter Pills */}
      <div className={`flex flex-wrap gap-3 transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        {(["all", "scheduled", "in-progress", "completed"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all shadow-sm ${statusFilter === s
              ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 shadow-md scale-105"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"}`}>
            {s === "all" ? "All Tests" : STATUS_CONFIG[s].icon + " " + STATUS_CONFIG[s].label}
            {" "}<span className={`ml-1 text-xs font-bold ${statusFilter === s ? "opacity-80" : "opacity-50"}`}>({counts[s]})</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading your diagnostics...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-8">
          <span className="text-5xl">⚠️</span>
          <p className="text-slate-700 font-semibold text-lg">Could not load diagnostics</p>
          <p className="text-slate-500 text-sm max-w-sm">{error}</p>
          <button onClick={fetchTests} className="mt-2 px-6 py-2 bg-indigo-500 text-white rounded-xl font-semibold hover:bg-indigo-600 transition-colors">Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-center px-8">
          <span className="text-6xl">🔬</span>
          <p className="text-slate-700 font-semibold text-lg">No diagnostic tests found</p>
          <p className="text-slate-500 text-sm">
            {tests.length === 0
              ? "Your doctor hasn't ordered any tests yet. Tests ordered during appointments will appear here."
              : "No tests match the selected filter."}
          </p>
        </div>
      ) : (
        <div className={`grid gap-5 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          {filtered.map((test, idx) => {
            const sc = STATUS_CONFIG[test.status] || STATUS_CONFIG.scheduled
            return (
              <div key={test.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${idx * 60}ms` }}>
                <div className={`h-1 w-full ${test.status === "completed" ? "bg-gradient-to-r from-emerald-400 to-teal-400" : test.status === "in-progress" ? "bg-gradient-to-r from-blue-400 to-indigo-400" : "bg-gradient-to-r from-amber-400 to-orange-400"}`} />

                <div className="p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                        🔬
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-slate-800">{test.test_name}</h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.cls}`}>
                            {sc.icon} {sc.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mb-1">
                          <span className="font-medium text-slate-600">🏥 {test.hospital_name}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          📅 Scheduled for <span className="font-semibold text-slate-700">{formatDate(test.scheduled_date)}</span>
                        </p>
                        {test.notes && (
                          <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 text-sm text-indigo-800">
                            <span className="font-semibold">📝 Instructions: </span>{test.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions column */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {/* Report */}
                      {test.has_report ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                            ✅ Report available
                          </div>
                          <button
                            onClick={() => handleViewReport(test)}
                            disabled={fileLoading === `report-${test.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-200"
                          >
                            {fileLoading === `report-${test.id}` ? (
                              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Loading…</>
                            ) : (
                              <><span>📄</span> View Report</>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                          ⏳ Report pending
                        </div>
                      )}

                      {/* Prescription */}
                      {test.has_prescription ? (
                        <>
                          <div className="flex items-center gap-1.5 text-xs text-violet-600 font-semibold bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                            💊 Prescription available
                          </div>
                          <button
                            onClick={() => handleDownloadPrescription(test)}
                            disabled={fileLoading === `presc-${test.id}`}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-violet-200"
                          >
                            {fileLoading === `presc-${test.id}` ? (
                              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Loading…</>
                            ) : (
                              <><span>💊</span> View &amp; Download Rx</>
                            )}
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                          ⏳ No prescription yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Document Viewer (sits below navbar, full remaining height) ── */}
      {viewUrl && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col" style={{ top: "84px" }}>
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white border-b border-slate-200 px-5 py-3 shadow-lg gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl flex-shrink-0">{viewIsImage ? "🖼️" : "📄"}</span>
              <span className="font-semibold text-slate-800 text-sm truncate max-w-[160px] md:max-w-md">{viewName}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {currentTestId && (
                <button onClick={handleAnalyzeWithAI} disabled={analyzingPrescription}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-violet-200">
                  {analyzingPrescription ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Preparing…</>
                  ) : (
                    <><span>✨</span> Analyze with AI</>
                  )}
                </button>
              )}
              <a href={viewUrl} download={viewName}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-colors shadow-sm">
                ⬇️
              </a>
              <button onClick={closeViewer}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-sm font-semibold transition-all shadow-sm">
                ✕
              </button>
            </div>
          </div>
          {/* File content */}
          <div className="flex-1 bg-slate-800 overflow-auto flex items-center justify-center min-h-0">
            {viewIsImage
              ? <img src={viewUrl} alt={viewName} className="max-w-full max-h-full object-contain p-4 rounded" />
              : <iframe src={viewUrl} className="w-full h-full border-0" title="Document Viewer" />
            }
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
