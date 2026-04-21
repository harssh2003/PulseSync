"use client"

import { useState } from "react"

export interface WhereToBuy {
  name: string
  url?: string
  type: "online" | "pharmacy" | "supermarket"
  note?: string
}

interface MedicineAnalysis {
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

interface MedicineAnalysisCardProps {
  medicine: MedicineAnalysis
  onRemove?: () => void
  isComparing?: boolean
  onToggleCompare?: () => void
  compareCount?: number
}

export const sectionConfig = [
  { id: "why",          label: "Why It's Prescribed", shortLabel: "Prescribed for", accent: "#6366f1", bg: "#eef2ff" },
  { id: "how",          label: "How It Works",         shortLabel: "Mechanism",      accent: "#0ea5e9", bg: "#f0f9ff" },
  { id: "dosage",       label: "Dosage & Usage",       shortLabel: "Dosage",         accent: "#10b981", bg: "#f0fdf4" },
  { id: "uses",         label: "Medical Uses",         shortLabel: "Uses",           accent: "#8b5cf6", bg: "#faf5ff" },
  { id: "sideEffects",  label: "Side Effects",         shortLabel: "Side Effects",   accent: "#f59e0b", bg: "#fffbeb" },
  { id: "where",        label: "Where to Buy",         shortLabel: "Availability",   accent: "#64748b", bg: "#f8fafc" },
  { id: "ingredients",  label: "Active Ingredients",   shortLabel: "Ingredients",    accent: "#14b8a6", bg: "#f0fdfa" },
  { id: "alternatives", label: "Alternatives",         shortLabel: "Alternatives",   accent: "#f97316", bg: "#fff7ed" },
  { id: "interactions", label: "Drug Interactions",    shortLabel: "Interactions",   accent: "#ef4444", bg: "#fef2f2" },
  { id: "storage",      label: "Storage Tips",         shortLabel: "Storage",        accent: "#a855f7", bg: "#fdf4ff" },
]

export const SectionIcons: Record<string, React.ReactNode> = {
  why:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  how:          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M12 2v2m0 18v-2m7.07-2.93l-1.41-1.41M5.34 5.34L3.93 3.93M20 12h2M2 12h2"/></svg>,
  dosage:       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z"/></svg>,
  uses:         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  sideEffects:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  interactions: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  ingredients:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0H5m4 0h10m0-11v11m0 0h-4"/></svg>,
  alternatives: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>,
  where:        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  storage:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
}

// ─── Type badge config ─────────────────────────────────────────────────────────
const typeBadge: Record<WhereToBuy["type"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  online: {
    label: "Online",
    color: "#0369a1",
    bg: "#e0f2fe",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
  },
  pharmacy: {
    label: "Pharmacy",
    color: "#065f46",
    bg: "#d1fae5",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  supermarket: {
    label: "Supermarket",
    color: "#7c3aed",
    bg: "#ede9fe",
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
  },
}

// ─── Where to Buy renderer ─────────────────────────────────────────────────────
function WhereToBuySection({ items, medicineName }: { items: WhereToBuy[]; medicineName: string }) {
  const online = items.filter((i) => i.type === "online")
  const inStore = items.filter((i) => i.type !== "online")
  const mapsQuery = encodeURIComponent(`pharmacy near me selling ${medicineName}`)
  const mapsUrl = `https://www.google.com/maps/search/${mapsQuery}`

  const ExternalIcon = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Online retailers */}
      {online.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#64748b", margin: "0 0 8px" }}>
            🛒 Order Online
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {online.map((item, i) => {
              const badge = typeBadge[item.type]
              return (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, padding: "10px 13px", borderRadius: 10,
                    background: "white", border: "1.5px solid #bfdbfe",
                    textDecoration: "none", transition: "all 0.15s",
                    boxShadow: "0 1px 4px rgba(14,165,233,0.07)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#7dd3fc"
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 3px 12px rgba(14,165,233,0.15)"
                    ;(e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "#bfdbfe"
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 4px rgba(14,165,233,0.07)"
                    ;(e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: badge.color }}>
                      {badge.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                      {item.note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{item.note}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, color: "#0369a1", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    Buy now <ExternalIcon />
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* In-store retailers */}
      {inStore.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#64748b", margin: "0 0 8px" }}>
            🏪 In-Store Availability
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {inStore.map((item, i) => {
              const badge = typeBadge[item.type]
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 10, padding: "10px 13px", borderRadius: 10,
                    background: "white", border: "1.5px solid #e2e8f0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: badge.color }}>
                      {badge.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{item.name}</div>
                      {item.note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{item.note}</div>}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "3px 9px", borderRadius: 100 }}>
                    {badge.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Find nearby CTA */}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          padding: "11px 16px", borderRadius: 10,
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600,
          boxShadow: "0 2px 10px rgba(15,23,42,0.2)", transition: "all 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"
          ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 6px 18px rgba(15,23,42,0.3)"
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"
          ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 10px rgba(15,23,42,0.2)"
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        Find a nearby pharmacy selling {medicineName}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    </div>
  )
}

export function renderMedicineSection(section: string, medicine: MedicineAnalysis, accent: string, bg: string) {
  const bodyText: React.CSSProperties = { fontSize: 14, color: "#334155", lineHeight: 1.75, margin: 0 }
  const Dot = () => <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0, marginTop: 6, display: "inline-block" }} />
  const WarnDot = () => <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#ef4444", color: "white", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>!</span>

  switch (section) {
    case "why":         return <p style={bodyText}>{medicine.why_prescribed}</p>
    case "how":         return <p style={bodyText}>{medicine.how_it_works}</p>
    case "dosage":      return <p style={bodyText}>{medicine.dosage}</p>
    case "ingredients": return <p style={bodyText}>{medicine.ingredients}</p>
    case "storage":     return <p style={bodyText}>{medicine.storage_tips}</p>
    case "uses":
      return <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {medicine.uses.map((u, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 14, color: "#334155", lineHeight: 1.6 }}><Dot />{u}</li>
        ))}
      </ul>
    case "alternatives":
      return <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {medicine.alternatives.map((a, i) => (
          <span key={i} style={{ padding: "5px 13px", borderRadius: 100, fontSize: 12, fontWeight: 500, border: `1.5px solid ${accent}40`, color: accent, background: bg }}>{a}</span>
        ))}
      </div>
    case "sideEffects":
      return <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#64748b", margin: "0 0 8px" }}>Common</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {medicine.side_effects.common.map((e, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", flexShrink: 0, marginTop: 5, display: "inline-block" }} />{e}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ borderTop: "1px solid #fde68a", paddingTop: "0.75rem" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" as const, color: "#dc2626", margin: "0 0 8px" }}>Serious</p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            {medicine.side_effects.serious.map((e, i) => (
              <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#991b1b", lineHeight: 1.6 }}><WarnDot />{e}</li>
            ))}
          </ul>
        </div>
      </div>
    case "interactions":
      return <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {medicine.interactions.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 11px", borderRadius: 9, background: "#fef2f2", border: "1px solid #fecaca" }}>
            <WarnDot /><span style={{ fontSize: 13, color: "#7f1d1d" }}>{item}</span>
          </div>
        ))}
      </div>
    case "where":
      return <WhereToBuySection items={medicine.where_to_buy} medicineName={medicine.medicineName} />
    default: return null
  }
}

export default function MedicineAnalysisCard({ medicine, onRemove, isComparing, onToggleCompare, compareCount = 0 }: MedicineAnalysisCardProps) {
  const [activeSection, setActiveSection] = useState<string | null>("why")
  const [showAll, setShowAll] = useState(false)

  const visibleSections = showAll ? sectionConfig : sectionConfig.slice(0, 6)
  const active = sectionConfig.find((s) => s.id === activeSection)
  const canCompare = !isComparing && compareCount >= 2

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap');
        .med-card { font-family: 'Sora', sans-serif; }
        .sec-btn { transition: all 0.18s ease; cursor: pointer; }
        .sec-btn:hover { transform: translateY(-1px); }
        .cmp-btn { transition: all 0.18s ease; }
        .rm-btn { transition: all 0.18s ease; cursor: pointer; }
        .rm-btn:hover { background: #fee2e2 !important; color: #dc2626 !important; border-color: rgba(252,165,165,.4) !important; }
        .content-in { animation: slideUp .22s ease; }
        @keyframes slideUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="med-card" style={{
        background: "white", borderRadius: 20, overflow: "hidden",
        border: isComparing ? "2px solid #0ea5e9" : "1px solid #e2e8f0",
        boxShadow: isComparing ? "0 0 0 4px rgba(14,165,233,0.1)" : "0 4px 24px rgba(0,0,0,0.06)",
        transition: "border 0.2s, box-shadow 0.2s",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,.15)", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10.5 20H4a2 2 0 01-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 011.66.9l.82 1.2a2 2 0 001.66.9H20a2 2 0 012 2v3"/><circle cx="18" cy="18" r="3"/><path d="M18 15v6M15 18h6"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,.4)", marginBottom: 2, fontWeight: 500 }}>Medicine Analysis</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "white", letterSpacing: "-0.02em" }}>{medicine.medicineName}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="cmp-btn"
              onClick={onToggleCompare}
              disabled={canCompare}
              title={isComparing ? "Remove from comparison" : canCompare ? "You can only compare 2 at once" : "Add to comparison"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8, fontFamily: "'Sora', sans-serif",
                border: isComparing ? "1px solid rgba(14,165,233,0.6)" : "1px solid rgba(255,255,255,.2)",
                background: isComparing ? "rgba(14,165,233,0.25)" : "rgba(255,255,255,.08)",
                color: isComparing ? "#7dd3fc" : canCompare ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.65)",
                fontSize: 12, fontWeight: 600,
                cursor: canCompare ? "not-allowed" : "pointer",
                opacity: canCompare ? 0.45 : 1,
                transition: "all 0.18s",
              }}
            >
              {isComparing
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="18"/><rect x="14" y="3" width="7" height="18"/></svg>
              }
              {isComparing ? "Comparing" : "Compare"}
            </button>

            <button className="rm-btn" onClick={onRemove} title="Remove"
              style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* Nav */}
        <div style={{ padding: "13px 18px", background: "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {visibleSections.map((sec) => {
              const isActive = activeSection === sec.id
              return (
                <button key={sec.id} className="sec-btn"
                  onClick={() => setActiveSection(isActive ? null : sec.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "6px 13px", borderRadius: 100,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Sora', sans-serif",
                    background: isActive ? sec.accent : "white",
                    color: isActive ? "white" : "#475569",
                    border: isActive ? `1.5px solid ${sec.accent}` : "1.5px solid #e2e8f0",
                    boxShadow: isActive ? `0 2px 10px ${sec.accent}33` : "none",
                  }}>
                  <span style={{ color: isActive ? "white" : sec.accent, display: "flex" }}>{SectionIcons[sec.id]}</span>
                  {sec.shortLabel}
                </button>
              )
            })}
            {!showAll && sectionConfig.length > 6 && (
              <button className="sec-btn" onClick={() => setShowAll(true)}
                style={{ display: "flex", alignItems: "center", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 500, color: "#64748b", background: "white", border: "1.5px dashed #cbd5e1", fontFamily: "'Sora', sans-serif" }}>
                +{sectionConfig.length - 6} more
              </button>
            )}
            {showAll && (
              <button className="sec-btn" onClick={() => setShowAll(false)}
                style={{ display: "flex", alignItems: "center", padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 500, color: "#64748b", background: "white", border: "1.5px dashed #cbd5e1", fontFamily: "'Sora', sans-serif" }}>
                Show less
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        {activeSection && active ? (
          <div className="content-in" style={{ padding: 22, background: active.bg, borderTop: `3px solid ${active.accent}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
              <span style={{ color: active.accent, display: "flex" }}>{SectionIcons[active.id]}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: active.accent }}>{active.label}</span>
            </div>
            {renderMedicineSection(activeSection, medicine, active.accent, active.bg)}
          </div>
        ) : (
          <div style={{ padding: "18px 22px" }}>
            <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", margin: 0 }}>Select a section above to explore details</p>
          </div>
        )}
      </div>
    </>
  )
}