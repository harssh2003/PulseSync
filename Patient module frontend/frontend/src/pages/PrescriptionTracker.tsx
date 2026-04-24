import { useState, useEffect, useRef } from "react"
import MedicineAnalysisCard, { sectionConfig, SectionIcons, renderMedicineSection } from "../components/MedicalAnalysisCard"

interface WhereToBuy {
  name: string
  url?: string
  type: "online" | "pharmacy" | "supermarket"
  note?: string
}

interface MedicineAnalysis {
  id: string
  medicineName: string
  why_prescribed: string
  how_it_works: string
  alternatives: string[]
  ingredients: string
  uses: string[]
  dosage: string
  side_effects: { common: string[]; serious: string[] }
  interactions: string[]
  where_to_buy: WhereToBuy[]
  storage_tips: string
}

interface PrescriptionTrackerProps {
  onNavigate: (page: string) => void
  /** Blob of a doctor-uploaded prescription to auto-scan on mount */
  autoPrescriptionBlob?: Blob
  /** MIME type of the blob */
  autoPrescriptionMime?: string
  /** Called after an auto-scan (or any scan) completes with the list of analysed medicine names */
  onAnalysisComplete?: (medicineNames: string[]) => void
}

// ─── Comparison panel ────────────────────────────────────────────────────────

function ComparisonPanel({ medA, medB, onClose }: { medA: MedicineAnalysis; medB: MedicineAnalysis; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState("why")
  const sec = sectionConfig.find((s) => s.id === activeSection)!

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        .cmp-panel { font-family: 'Sora', sans-serif; }
        .cmp-sec-btn { transition: all 0.15s ease; cursor: pointer; }
        .cmp-sec-btn:hover { background: #f1f5f9 !important; }
        .cmp-close:hover { background: #fee2e2 !important; color: #dc2626 !important; }
        .cmp-in { animation: cmpIn 0.25s ease; }
        @keyframes cmpIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="cmp-panel" style={{
        background: "white", borderRadius: 20, overflow: "hidden",
        border: "1px solid #e2e8f0", boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
        animation: "cmpIn 0.3s ease",
      }}>
        {/* Comparison header */}
        <div style={{ background: "linear-gradient(135deg, #0c1a35 0%, #1a2e55 100%)", padding: "18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: "rgba(14,165,233,0.25)", border: "1px solid rgba(14,165,233,0.4)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7dd3fc" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", fontWeight: 500 }}>Side-by-side comparison</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginTop: 1 }}>
                  {medA.medicineName} <span style={{ color: "rgba(255,255,255,.3)" }}>vs</span> {medB.medicineName}
                </div>
              </div>
            </div>
            <button className="cmp-close" onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Medicine name columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 0, alignItems: "center" }}>
            <div style={{ background: "rgba(99,102,241,0.18)", border: "1px solid rgba(99,102,241,0.35)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "rgba(165,180,252,.7)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Medicine A</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#c7d2fe" }}>{medA.medicineName}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: "0.05em" }}>VS</span>
            </div>
            <div style={{ background: "rgba(14,165,233,0.18)", border: "1px solid rgba(14,165,233,0.35)", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ fontSize: 10, color: "rgba(125,211,252,.7)", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Medicine B</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#bae6fd" }}>{medB.medicineName}</div>
            </div>
          </div>
        </div>

        {/* Section selector */}
        <div style={{ padding: "12px 20px", background: "#fafafa", borderBottom: "1px solid #f1f5f9", overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sectionConfig.map((s) => {
              const isActive = activeSection === s.id
              return (
                <button key={s.id} className="cmp-sec-btn"
                  onClick={() => setActiveSection(s.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 100,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Sora', sans-serif",
                    background: isActive ? s.accent : "white",
                    color: isActive ? "white" : "#64748b",
                    border: isActive ? `1.5px solid ${s.accent}` : "1.5px solid #e2e8f0",
                    boxShadow: isActive ? `0 2px 8px ${s.accent}33` : "none",
                    transition: "all 0.15s",
                  }}>
                  <span style={{ color: isActive ? "white" : s.accent, display: "flex" }}>{SectionIcons[s.id]}</span>
                  {s.shortLabel}
                </button>
              )
            })}
          </div>
        </div>

        {/* Side-by-side content */}
        <div className="cmp-in" key={activeSection}>
          {/* Section label bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", background: sec.bg, borderTop: `3px solid ${sec.accent}` }}>
            <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: sec.accent, display: "flex" }}>{SectionIcons[sec.id]}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: sec.accent, letterSpacing: "0.04em" }}>{medA.medicineName}</span>
            </div>
            <div style={{ background: `${sec.accent}20` }} />
            <div style={{ padding: "12px 20px 0", display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: sec.accent, display: "flex" }}>{SectionIcons[sec.id]}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: sec.accent, letterSpacing: "0.04em" }}>{medB.medicineName}</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", background: sec.bg }}>
            <div style={{ padding: "16px 20px 22px" }}>
              {renderMedicineSection(activeSection, medA, sec.accent, sec.bg)}
            </div>
            <div style={{ background: `${sec.accent}20` }} />
            <div style={{ padding: "16px 20px 22px" }}>
              {renderMedicineSection(activeSection, medB, sec.accent, sec.bg)}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main tracker ─────────────────────────────────────────────────────────────

export default function PrescriptionTracker({ onNavigate, autoPrescriptionBlob, autoPrescriptionMime = "image/jpeg", onAnalysisComplete }: PrescriptionTrackerProps) {
  const [medicineInput, setMedicineInput] = useState("")
  const [medicines, setMedicines] = useState<MedicineAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [analyzingMedicine, setAnalyzingMedicine] = useState<string | null>(null)
  const [comparingIds, setComparingIds] = useState<string[]>([])

  // ─── Prescription image scan state ──────────────────────────────────────────
  const [scanLoading, setScanLoading] = useState(false)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanFoundMedicines, setScanFoundMedicines] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchPrescriptions() }, [])

  // ── Auto-scan when a doctor-uploaded prescription blob is provided ──────
  useEffect(() => {
    if (!autoPrescriptionBlob) return
    // Convert Blob → File so scanPrescriptionImage can use it
    const ext = autoPrescriptionMime.includes("pdf") ? "pdf"
      : autoPrescriptionMime.includes("png") ? "png"
      : autoPrescriptionMime.includes("webp") ? "webp"
      : "jpg"
    const file = new File([autoPrescriptionBlob], `doctor-prescription.${ext}`, { type: autoPrescriptionMime })
    // Small delay so the page renders first
    const t = setTimeout(() => scanPrescriptionImage(file), 400)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPrescriptionBlob])

  const fetchPrescriptions = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const userId = localStorage.getItem("user_id")
      if (!token || !userId) { setError("Not authenticated. Please log in again."); return }
      const response = await fetch(`http://localhost:5000/api/prescriptions/${userId}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Failed to fetch prescriptions")
      const data = await response.json()
      const formatted = (data.prescriptions || []).map((item: any) => ({
  id: item.id ? item.id.toString() : `${Date.now()}-${Math.random()}`,
  medicineName: item.medicine_name,
  why_prescribed: item.why_prescribed,
  how_it_works: item.how_it_works,
  alternatives: item.alternatives || [],
  ingredients: item.ingredients || "Not available",
  uses: item.uses || [],
  dosage: item.dosage || "Not available",
  side_effects: {
    common: item.side_effects?.common || [],
    serious: item.side_effects?.serious || [],
  },
  interactions: item.interactions || [],
  where_to_buy: (item.where_to_buy || []).map((w: any) =>
    typeof w === "string"
      ? { name: w, type: "pharmacy" as const }
      : { name: w.name, url: w.url, type: w.type ?? "pharmacy", note: w.note }
  ),
  storage_tips: item.storage_tips || "Not available",
}))

setMedicines((prev) => {
  // Merge strategy:
  // 1. For medicines already in-memory (from a scan), upgrade their temp ID
  //    to the real DB ID if the DB now has them — but KEEP all of them.
  // 2. Add any DB records that aren't in-memory at all (e.g. from a previous session).
  // This prevents the sequential-save race condition where a DB fetch mid-scan
  // only returns 1–2 of N medicines and wipes the rest from the UI.
  const dbByName = new Map<string, MedicineAnalysis>(
  formatted.map((m: MedicineAnalysis) => [
    m.medicineName?.toLowerCase(),
    m
  ])
)

  // Update in-memory entries that now have a real DB record (swap temp ID → DB ID)
  const upgraded = prev.map((m) => {
    const dbVersion = dbByName.get(m.medicineName?.toLowerCase())
    if (dbVersion && m.id.startsWith("scan-")) {
      return { ...m, id: dbVersion.id } // keep display data, just fix the ID
    }
    return m
  })

  // Append any DB records not yet in the list (loaded from a previous session)
  const inMemoryNames = new Set(upgraded.map((m) => m.medicineName?.toLowerCase()))
  const brandNew = formatted.filter((m: MedicineAnalysis) => !inMemoryNames.has(m.medicineName?.toLowerCase()))

  return [...upgraded, ...brandNew]
})
    } catch (err) {
      console.error("[v0] Error fetching prescriptions:", err)
      setError("Failed to load prescriptions")
    }
  }

  const analyzeMedicine = async (retry = 2) => {
  if (!medicineInput.trim()) {
    setError("Please enter a medicine name")
    return
  }

  setAnalyzingMedicine(medicineInput)
  setLoading(true)
  setError("")

  try {
    const token = localStorage.getItem("auth_token")
    const userId = localStorage.getItem("user_id")

    if (!token || !userId) {
      setError("Not authenticated. Please log in again.")
      setLoading(false)
      return
    }

    const response = await fetch(`http://localhost:5000/api/prescriptions/analyze`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        medicine_name: medicineInput,
        user_id: userId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to analyze medicine")
    }

    const data = await response.json()

    const newMedicine: MedicineAnalysis = {
      id: `${Date.now()}-${Math.random()}`,
      medicineName: data.medicine_name || medicineInput,
      why_prescribed: data.why_prescribed || "Not available",
      how_it_works: data.how_it_works || "Not available",
      alternatives: data.alternatives || [],
      ingredients: data.ingredients || "Not available",
      uses: data.uses || [],
      dosage: data.dosage || "Not available",
      side_effects: {
        common: data.side_effects?.common || [],
        serious: data.side_effects?.serious || [],
      },
      interactions: data.interactions || [],
      where_to_buy: (data.where_to_buy || []).map((item: any) =>
        typeof item === "string"
          ? { name: item, type: "pharmacy" as const }
          : { name: item.name, url: item.url, type: item.type ?? "pharmacy", note: item.note }
      ),
      storage_tips: data.storage_tips || "Not available",
    }

    setMedicines((prev) => [newMedicine, ...prev])
    setMedicineInput("")
    setSuccessMessage(`"${medicineInput}" analyzed successfully`)
    setTimeout(() => setSuccessMessage(""), 3000)

  } catch (err: any) {
    console.error("[v0] Error analyzing medicine:", err)

    // 🔥 RETRY LOGIC
    if (retry > 0) {
      setError("⚠️ Server busy, retrying...")
      setTimeout(() => analyzeMedicine(retry - 1), 2000)
      return
    }

    // 🔥 GRACEFUL FALLBACK MESSAGE
    if (err.message?.includes("503") || err.message?.includes("UNAVAILABLE")) {
      setError("⚠️ AI service is currently busy. Please try again in a few seconds.")
    } else {
      setError(err.message || "Something went wrong. Please try again.")
    }

  } finally {
    setLoading(false)
    setAnalyzingMedicine(null)
  }
}

  const scanPrescriptionImage = async (file: File, retry = 2) => {
    const token = localStorage.getItem("auth_token")
    if (!token) { setError("Not authenticated. Please log in again."); return }

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setScanPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setScanLoading(true)
    setScanFoundMedicines([])
    setError("")

    try {
      const formData = new FormData()
      formData.append("image", file)

      const response = await fetch("http://localhost:5000/api/prescriptions/analyze-prescription-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to scan prescription")
      }

      const data = await response.json()
      console.log("[Scan] Response:", data) // debug
      const found: string[] = data.medicines_found || []
      setScanFoundMedicines(found)

      // Map and prepend all new analyses
      const newMeds: MedicineAnalysis[] = (data.analyses || []).map((item: any, idx: number) => ({
        id: `scan-${Date.now()}-${idx}`,
        medicineName: item.medicine_name,
        why_prescribed: item.why_prescribed || "Not available",
        how_it_works: item.how_it_works || "Not available",
        alternatives: item.alternatives || [],
        ingredients: item.ingredients || "Not available",
        uses: item.uses || [],
        dosage: item.dosage || "Not available",
        side_effects: {
          common: item.side_effects?.common || [],
          serious: item.side_effects?.serious || [],
        },
        interactions: item.interactions || [],
        where_to_buy: (item.where_to_buy || []).map((w: any) =>
          typeof w === "string"
            ? { name: w, type: "pharmacy" as const }
            : { name: w.name, url: w.url, type: w.type ?? "pharmacy", note: w.note }
        ),
        storage_tips: item.storage_tips || "Not available",
      }))

      // Show ALL scanned medicines immediately from API response.
      // Do NOT re-fetch from DB here — backend saves sequentially with delays,
      // so a DB fetch right now would only return the first saved record.
      if (newMeds.length > 0) {
        setMedicines((prev) => {
          const scannedNames = new Set(newMeds.map((m) => m.medicineName?.toLowerCase()))
          const withoutStale = prev.filter((m) => !scannedNames.has(m.medicineName?.toLowerCase()))
          return [...newMeds, ...withoutStale]
        })
      }

      const failedCount = data.failed?.length ?? 0
      if (newMeds.length === 0 && failedCount > 0) {
        setError(`⚠️ Detected ${found.length} medicines but analysis failed for all. The AI may be busy — please try again.`)
        setScanPreview(null)
      } else {
        setSuccessMessage(
          `Found ${found.length} medicine${found.length !== 1 ? "s" : ""} in prescription` +
          (failedCount > 0 ? ` · ${failedCount} could not be analyzed` : "")
        )
        setTimeout(() => setSuccessMessage(""), 5000)
        // Refresh from DB after enough time for all sequential saves to complete
        const saveDelayMs = found.length * 1500 + 3000
        setTimeout(() => fetchPrescriptions(), saveDelayMs)

        // ── Prescription pipeline: fire callback to auto-redirect to reminders ──
        if (onAnalysisComplete && newMeds.length > 0) {
          const analysedNames = newMeds.map((m) => m.medicineName).filter(Boolean)
          // Wait long enough for the user to see the analysis results, then hand off
          setTimeout(() => onAnalysisComplete(analysedNames), saveDelayMs + 1000)
        }
      }

    } catch (err: any) {

  if (retry > 0) {
    setError("📡 Scanning... retrying due to high load")
    setTimeout(() => scanPrescriptionImage(file, retry - 1), 2000)
    return
  }

  // 🔥 NEW FALLBACK
  setError("⚠️ AI is busy. Try typing manually.")

  // 👉 Show empty detected medicines so UI still reacts
  setScanFoundMedicines(["Try typing manually"])
  {error && (
  <div style={{ marginTop: 10 }}>
    <p style={{ fontSize: 13, color: "#64748b" }}>
      You can manually type the medicine name above 👆
    </p>
  </div>
)}

  setScanPreview(null)
}finally {
      setScanLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) scanPrescriptionImage(file)
    e.target.value = "" // reset so same file can be re-selected
  }

  const removeScanPreview = () => {
    setScanPreview(null)
    setScanFoundMedicines([])
  }

  const removeMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id))
    setComparingIds((prev) => prev.filter((cid) => cid !== id))
  }

  const toggleCompare = (id: string) => {
    setComparingIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : prev.length < 2 ? [...prev, id] : prev
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) analyzeMedicine()
  }

  const comparingMeds = medicines.filter((m) => comparingIds.includes(m.id))
  const showComparison = comparingMeds.length === 2

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        .rx-root { font-family: 'Sora', sans-serif; }
        .rx-input { transition: all 0.2s ease; }
        .rx-input:focus { outline: none; border-color: #0ea5e9; box-shadow: 0 0 0 4px rgba(14,165,233,0.12); background: white; }
        .rx-input:disabled { opacity: 0.5; }
        .rx-btn { transition: all 0.2s ease; }
        .rx-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(14,165,233,.35); }
        .rx-btn:active:not(:disabled) { transform: translateY(0); }
        .rx-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .rx-spin { animation: spin .9s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .card-in { animation: cardIn .35s ease; }
        @keyframes cardIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        .cmp-banner { transition: all 0.2s ease; }
        .chip:hover { background: #e2e8f0 !important; border-color: #cbd5e1 !important; }
        .clear-all-btn:hover { background: #fee2e2 !important; border-color: #fca5a5 !important; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>

      <div className="rx-root" style={{ minHeight: "100vh", background: "#f8fafc", padding: "36px 16px 80px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Page header */}
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0ea5e9", background: "#e0f2fe", padding: "5px 12px", borderRadius: 100, marginBottom: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v3"/><circle cx="18" cy="18" r="3"/><path d="M18 15v6M15 18h6"/></svg>
              AI Drug Analysis
            </div>
            <h1 style={{ fontSize: 34, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 0 8px" }}>Know what you're taking.</h1>
            <p style={{ fontSize: 15, color: "#64748b", margin: 0, lineHeight: 1.65, maxWidth: 460 }}>
              Enter any medicine or drug name and get a complete breakdown — dosage, interactions, side effects, and more.
            </p>
          </div>

          {/* Search card */}
          <div style={{ background: "white", borderRadius: 20, padding: 22, border: "1px solid #e2e8f0", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Medicine or drug name</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, position: "relative", minWidth: 220 }}>
                <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" className="rx-input" value={medicineInput}
                  onChange={(e) => setMedicineInput(e.target.value)} onKeyPress={handleKeyPress}
                  placeholder="e.g. Aspirin, Metformin, Amoxicillin..." disabled={loading}
                  style={{ width: "100%", padding: "12px 14px 12px 42px", fontSize: 14, color: "#0f172a", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, fontFamily: "'Sora', sans-serif", boxSizing: "border-box" }} />
              </div>

              {/* ── Scan prescription button ── */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <button
                className="rx-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={scanLoading || loading}
                title="Scan a prescription photo"
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "12px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: scanLoading ? "#f1f5f9" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: scanLoading ? "#94a3b8" : "white", border: "none",
                  cursor: scanLoading || loading ? "not-allowed" : "pointer",
                  fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap", opacity: loading ? 0.5 : 1,
                }}>
                {scanLoading
                  ? <><svg className="rx-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Scanning…</>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Scan Rx</>
                }
              </button>

              <button className="rx-btn" onClick={() => analyzeMedicine()} disabled={loading || !medicineInput.trim()}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "12px 22px", background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Sora', sans-serif", whiteSpace: "nowrap" }}>
                {loading
                  ? <><svg className="rx-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>Analyzing</>
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>Analyze</>
                }
              </button>
            </div>

            {error && (
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, fontSize: 13, color: "#dc2626" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{error}
              </div>
            )}
            {successMessage && (
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 13, color: "#16a34a" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>{successMessage}
                {onAnalysisComplete && (
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#7c3aed", fontWeight: 600, whiteSpace: "nowrap" }}>
                    ⏳ Setting up reminders…
                  </span>
                )}
              </div>
            )}
            {analyzingMedicine && loading && (
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, fontSize: 13, color: "#0369a1" }}>
                <svg className="rx-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Analyzing <strong style={{ marginLeft: 2 }}>"{analyzingMedicine}"</strong>&nbsp;— this may take a moment
              </div>
            )}

            {/* ── Prescription scan preview ── */}
            {(scanPreview || scanLoading) && (
              <div className="fade-in" style={{ marginTop: 14, borderRadius: 14, overflow: "hidden", border: "1.5px solid #e9d5ff", background: "#faf5ff" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "white" }}>
                      {scanLoading ? "Scanning prescription…" : `${scanFoundMedicines.length} medicine${scanFoundMedicines.length !== 1 ? "s" : ""} detected`}
                    </span>
                  </div>
                  {!scanLoading && (
                    <button onClick={removeScanPreview} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "3px 7px", color: "white", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                      Dismiss
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 14, padding: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                  {/* Image thumbnail */}
                  {scanPreview && (
                    <img src={scanPreview} alt="Prescription"
                      style={{ width: 100, height: 130, objectFit: "cover", borderRadius: 10, border: "1px solid #d8b4fe", flexShrink: 0 }} />
                  )}

                  {/* Found medicines list with per-medicine analysis status */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {scanLoading && scanFoundMedicines.length === 0 ? (
                      // Still reading image — show skeleton
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{ height: 28, borderRadius: 8, background: "#ede9fe", animation: "pulse 1.4s ease infinite", animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {scanFoundMedicines.map((med, i) => {
                          // Check both the medicines list AND scan-prefixed IDs
                          // so a medicine shows Done as soon as it arrives from the API,
                          // regardless of whether the DB fetch has run yet.
                          const isAnalyzed = medicines.some(
                            (m) =>
                              m.medicineName?.toLowerCase() === med.toLowerCase() ||
                              (m.id.startsWith("scan-") && m.medicineName?.toLowerCase() === med.toLowerCase())
                          )
                          const isAnalyzing = scanLoading && !isAnalyzed
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "white", borderRadius: 8, border: `1px solid ${isAnalyzed ? "#bbf7d0" : "#e9d5ff"}`, fontSize: 13, fontWeight: 500, color: isAnalyzed ? "#166534" : "#4c1d95" }}>
                              {isAnalyzed ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              ) : isAnalyzing ? (
                                <svg style={{ animation: "spin .9s linear infinite" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                              <span>{med}</span>
                              {isAnalyzed && <span style={{ marginLeft: "auto", fontSize: 11, color: "#16a34a", fontWeight: 600 }}>Done</span>}
                              {isAnalyzing && <span style={{ marginLeft: "auto", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>Analyzing…</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compare hint banner — shown when 1 card is toggled */}
          {comparingIds.length === 1 && (
            <div className="cmp-banner fade-in" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
              </div>
              <p style={{ fontSize: 13, color: "#1e40af", margin: 0 }}>
                <strong>{medicines.find(m => m.id === comparingIds[0])?.medicineName}</strong> selected for comparison — hit <strong>Compare</strong> on a second medicine to see them side by side.
              </p>
            </div>
          )}

          {/* Results */}
          {medicines.length > 0 ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#94a3b8" }}>
                  {medicines.length} {medicines.length === 1 ? "result" : "results"}
                  {comparingIds.length > 0 && <span style={{ marginLeft: 8, color: "#3b82f6" }}>· {comparingIds.length} selected for comparison</span>}
                </div>
                <button
                  className="clear-all-btn"
                  onClick={() => { setMedicines([]); setComparingIds([]) }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#ef4444", background: "#fef2f2", border: "1.5px solid #fecaca", cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                  Clear all
                </button>
              </div>

              {/* Comparison panel */}
              {showComparison && (
                <div className="card-in" style={{ marginBottom: 20 }}>
                  <ComparisonPanel
                    medA={comparingMeds[0]}
                    medB={comparingMeds[1]}
                    onClose={() => setComparingIds([])}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {medicines.map((medicine) => (
                  <div key={medicine.id} className="card-in">
                    <MedicineAnalysisCard
                      medicine={medicine}
                      onRemove={() => removeMedicine(medicine.id)}
                      isComparing={comparingIds.includes(medicine.id)}
                      onToggleCompare={() => toggleCompare(medicine.id)}
                      compareCount={comparingIds.length}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: "white", borderRadius: 20, padding: "44px 28px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 16px rgba(0,0,0,0.04)" }}>
              <div style={{ width: 56, height: 56, borderRadius: 15, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", border: "1px solid #e2e8f0" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v3"/><circle cx="18" cy="18" r="3"/><path d="M18 15v6M15 18h6"/></svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 7px", letterSpacing: "-0.02em" }}>Search any medicine to begin</h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 auto 22px", maxWidth: 340, lineHeight: 1.65 }}>
                Get AI-powered breakdowns on dosage, side effects, drug interactions, alternatives, and more. Search two to compare them side by side.
              </p>
              <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
                {["Aspirin", "Metformin", "Amoxicillin", "Paracetamol"].map((name) => (
                  <button key={name} className="chip" onClick={() => setMedicineInput(name)}
                    style={{ padding: "6px 15px", borderRadius: 100, fontSize: 12, fontWeight: 500, color: "#334155", background: "#f1f5f9", border: "1.5px solid #e2e8f0", cursor: "pointer", fontFamily: "'Sora', sans-serif", transition: "all 0.15s" }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}