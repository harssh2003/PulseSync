import { useState, useEffect, useCallback } from "react"
import HospitalCard from "../components/HospitalCard"

// ─────────────────────────────────────────────
//  Point this to your Python backend base URL.
//  In development:  http://localhost:5000
//  In production:   https://your-api-domain.com
// ─────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000"

interface HospitalSearchProps {
  onNavigate: (page: string) => void
}

export interface Hospital {
  id: string
  name: string
  location: string        // human-readable vicinity from Places API
  distanceKm: number      // calculated with Haversine from user coords
  rating: number
  reviews: number
  services: string[]      // derived from Google place types + reason context
  beds: number            // -1 = not available via Places API
  doctors: number         // -1 = not available via Places API
  image: string           // Google photo URL or fallback
  type: "hospital" | "clinic" | "doctor"
  openNow: boolean | null
  placeId: string
  lat: number
  lng: number
}

// ── Visit reason → Places API keyword + service labels shown on card ──
const VISIT_REASONS = [
  { id: "all",        label: "All",             icon: "🏥", keyword: "hospital clinic",           services: [] },
  { id: "emergency",  label: "Emergency",        icon: "🚨", keyword: "emergency hospital",        services: ["Emergency"] },
  { id: "general",    label: "General Checkup",  icon: "🩺", keyword: "general physician clinic",  services: ["General Practice"] },
  { id: "specialist", label: "Specialist",       icon: "🔬", keyword: "specialist hospital",       services: ["Specialist"] },
  { id: "diagnostic", label: "Diagnostics",      icon: "🧪", keyword: "diagnostic lab pathology",  services: ["Diagnostics", "Radiology"] },
  { id: "mental",     label: "Mental Health",    icon: "🧠", keyword: "psychiatrist mental health", services: ["Psychiatry"] },
  { id: "dental",     label: "Dental",           icon: "🦷", keyword: "dental clinic dentist",     services: ["Dental"] },
  { id: "maternity",  label: "Maternity",        icon: "🤰", keyword: "maternity gynecologist",    services: ["Maternity", "Gynecology"] },
]

const DISTANCE_OPTIONS = [
  { id: "all", label: "Any",         maxKm: Infinity, radiusM: 10000 },
  { id: "2",   label: "Within 2 km", maxKm: 2,        radiusM: 2000  },
  { id: "5",   label: "Within 5 km", maxKm: 5,        radiusM: 5000  },
  { id: "10",  label: "Within 10 km",maxKm: 10,       radiusM: 10000 },
  { id: "20",  label: "Within 20 km",maxKm: 20,       radiusM: 20000 },
]

const FACILITY_TYPES = [
  { id: "all",      label: "All",       icon: "🏥" },
  { id: "hospital", label: "Hospitals", icon: "🏨" },
  { id: "clinic",   label: "Clinics",   icon: "🏪" },
  { id: "doctor",   label: "Doctors",   icon: "👨‍⚕️" },
]

// ── Haversine distance in km ──
function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function deriveFacilityType(types: string[]): Hospital["type"] {
  if (types.includes("hospital")) return "hospital"
  if (types.includes("doctor") || types.includes("physician")) return "doctor"
  return "clinic"
}

function deriveServices(types: string[], reasonServices: string[]): string[] {
  const derived: string[] = []
  if (types.includes("hospital"))        derived.push("Hospital")
  if (types.includes("doctor"))          derived.push("General Practice")
  if (types.includes("dentist"))         derived.push("Dental")
  if (types.includes("pharmacy"))        derived.push("Pharmacy")
  if (types.includes("physiotherapist")) derived.push("Physiotherapy")
  if (reasonServices.length > 0)         derived.push(...reasonServices)
  return [...new Set(derived.length ? derived : ["Healthcare"])]
}

// ── API call — routed through your Python backend to avoid CORS ──
async function fetchNearbyPlaces(
  lat: number, lng: number,
  radiusM: number, keyword: string,
  reasonServices: string[]
): Promise<Hospital[]> {
  const placeType = keyword.includes("dental") ? "dentist" : "hospital"

  const res = await fetch(
    `${API_BASE_URL}/api/places/nearby?lat=${lat}&lng=${lng}&radius=${radiusM}&type=${placeType}&keyword=${encodeURIComponent(keyword)}`
  )
  if (!res.ok) throw new Error(`Places API error: ${res.status}`)
  const data = await res.json()

  return (data.results ?? []).map((place: any): Hospital => {
    const dist = calcDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng)
    const photo = place.photos?.[0]?.photo_reference
    return {
      id:          place.place_id,
      placeId:     place.place_id,
      name:        place.name,
      location:    place.vicinity,
      distanceKm:  parseFloat(dist.toFixed(1)),
      rating:      place.rating ?? 0,
      reviews:     place.user_ratings_total ?? 0,
      services:    deriveServices(place.types ?? [], reasonServices),
      beds:        -1,
      doctors:     -1,
      image:       photo ? `${API_BASE_URL}/api/places/photo?ref=${photo}` : "/placeholder-hospital.png",
      type:        deriveFacilityType(place.types ?? []),
      openNow:     place.opening_hours?.open_now ?? null,
      lat:         place.geometry.location.lat,
      lng:         place.geometry.location.lng,
    }
  })
}

// ─────────────────────────────────────────────
export default function HospitalSearch({ onNavigate }: HospitalSearchProps) {
  const [searchTerm, setSearchTerm]             = useState("")
  const [selectedReason, setSelectedReason]     = useState("all")
  const [selectedDistance, setSelectedDistance] = useState("all")
  const [selectedType, setSelectedType]         = useState("all")
  const [isVisible, setIsVisible]               = useState(false)

  const [userLat, setUserLat]       = useState<number | null>(null)
  const [userLng, setUserLng]       = useState<number | null>(null)
  const [userCity, setUserCity]     = useState<string>("")
  const [hospitals, setHospitals]   = useState<Hospital[]>([])
  const [loading, setLoading]       = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [apiError, setApiError]     = useState<string | null>(null)

  useEffect(() => { setIsVisible(true) }, [])

  const requestLocation = useCallback(() => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        try {
          const geoRes = await fetch(`${API_BASE_URL}/api/places/geocode?lat=${latitude}&lng=${longitude}`)
          const geoData = await geoRes.json()
          const city = geoData.results?.[0]?.address_components?.find(
            (c: any) => c.types.includes("locality")
          )?.long_name ?? "Your Location"
          setUserCity(city)
        } catch {
          setUserCity("Your Location")
        }
      },
      (err) => {
        setLocationError(
          err.code === 1
            ? "Location access denied. Please allow it in your browser settings."
            : "Unable to retrieve your location. Please try again."
        )
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Re-fetch whenever location or reason/distance changes
  useEffect(() => {
    if (userLat === null || userLng === null) return
    const reason  = VISIT_REASONS.find((r) => r.id === selectedReason) ?? VISIT_REASONS[0]
    const distOpt = DISTANCE_OPTIONS.find((d) => d.id === selectedDistance) ?? DISTANCE_OPTIONS[0]
    setLoading(true)
    setApiError(null)
    fetchNearbyPlaces(userLat, userLng, distOpt.radiusM, reason.keyword, reason.services)
      .then(setHospitals)
      .catch((err) => {
        console.error(err)
        setApiError("Could not load nearby places. Check your API key and proxy setup.")
      })
      .finally(() => setLoading(false))
  }, [userLat, userLng, selectedReason, selectedDistance])

  const maxKm = DISTANCE_OPTIONS.find((d) => d.id === selectedDistance)?.maxKm ?? Infinity

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      !searchTerm ||
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.services.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch && (selectedType === "all" || h.type === selectedType) && h.distanceKm <= maxKm
  })

  const hasActiveFilters = !!searchTerm || selectedReason !== "all" || selectedDistance !== "all" || selectedType !== "all"
  const clearFilters = () => { setSearchTerm(""); setSelectedReason("all"); setSelectedDistance("all"); setSelectedType("all") }

  return (
    <div
      className="flex flex-col gap-8 w-full max-w-full overflow-x-hidden px-5 md:px-10 py-12"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "linear-gradient(160deg, #f0f9ff 0%, #ffffff 50%, #ecfdf5 100%)" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        .reason-pill { transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1); }
        .reason-pill:hover { transform: translateY(-2px); }
        .reason-pill.active { transform: translateY(-2px) scale(1.04); }
        .dist-btn { transition: all 0.2s ease; }
        .dist-btn:hover { transform: translateY(-1px); }
        .dist-btn.active { box-shadow: 0 4px 14px rgba(14,165,233,0.35); }
        .facility-tab.active { box-shadow: 0 2px 8px rgba(14,165,233,0.25); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.9s linear infinite; }
      `}</style>

      {/* Header */}
      <div
        className="relative -mx-5 md:-mx-10 -mt-12 px-5 md:px-10 py-16 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 60%, #10b981 100%)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute w-96 h-96 bg-white rounded-full blur-3xl -top-20 -right-20" />
          <div className="absolute w-72 h-72 bg-white rounded-full blur-3xl -bottom-16 -left-16" />
        </div>
        <div className={`text-center relative z-10 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-5"}`}>
          {userCity && (
            <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold mb-4 border border-white/30">
              📍 {userCity}
            </div>
          )}
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 leading-tight" style={{ fontFamily: "'Sora', sans-serif" }}>
            Find Care Near You
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Real hospitals, clinics & doctors — powered by your location
          </p>
        </div>
      </div>

      {/* Location gate */}
      {userLat === null && (
        <div className={`bg-white rounded-3xl shadow-lg border border-slate-100 p-10 text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
          <div className="text-6xl mb-5">📍</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: "'Sora', sans-serif" }}>
            Enable Location Access
          </h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm leading-relaxed">
            We use your GPS to find real hospitals, clinics, and doctors near you — just like Google Maps. Your location is never stored.
          </p>
          {locationError && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 px-4 py-3 rounded-xl max-w-sm mx-auto">{locationError}</p>
          )}
          <button
            onClick={requestLocation}
            className="px-8 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-2xl font-bold text-base hover:shadow-xl hover:scale-105 transition-all"
          >
            Share My Location
          </button>
          <p className="text-xs text-slate-400 mt-4">You'll see a browser permission prompt</p>
        </div>
      )}

      {/* Filters + results */}
      {userLat !== null && (
        <>
          {/* Step 1: Visit reason */}
          <div className={`transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold">1</span>
              Why are you visiting?
            </h2>
            <div className="flex flex-wrap gap-3">
              {VISIT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReason(r.id)}
                  className={`reason-pill flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 text-sm font-semibold cursor-pointer ${
                    selectedReason === r.id
                      ? "active bg-sky-500 border-sky-500 text-white shadow-lg"
                      : "bg-white border-slate-200 text-slate-600 hover:border-sky-300"
                  }`}
                >
                  <span>{r.icon}</span>{r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Distance */}
          <div className={`transition-all duration-700 delay-150 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-sm font-bold">2</span>
              How far are you willing to travel?
            </h2>
            <div className="flex flex-wrap gap-3">
              {DISTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedDistance(opt.id)}
                  className={`dist-btn px-5 py-2.5 rounded-xl border-2 text-sm font-semibold cursor-pointer ${
                    selectedDistance === opt.id
                      ? "active bg-sky-500 border-sky-500 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-sky-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search + facility type */}
          <div className={`bg-white rounded-3xl shadow-lg shadow-sky-100/40 border border-slate-100 p-6 transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"}`}>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
                <input
                  type="text"
                  className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 hover:border-sky-200 bg-slate-50 focus:bg-white placeholder-slate-400 font-medium"
                  placeholder="Search by name or area..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                {FACILITY_TYPES.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedType(opt.id)}
                    className={`facility-tab flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      selectedType === opt.id ? "active bg-white text-sky-600 shadow" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <span>{opt.icon}</span>{opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading
                  ? <span className="text-sky-500 font-medium">Searching nearby...</span>
                  : <><span className="text-sky-600 font-bold text-base">{filteredHospitals.length}</span> result{filteredHospitals.length !== 1 ? "s" : ""} found</>
                }
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-sky-500 hover:text-sky-700 font-semibold transition-colors">
                  Clear all ✕
                </button>
              )}
            </div>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="spinner w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full" />
              <p className="text-slate-500 font-medium text-sm">Finding places near you...</p>
            </div>
          ) : apiError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-red-700 font-semibold mb-1">Something went wrong</p>
              <p className="text-red-500 text-sm">{apiError}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
              {filteredHospitals.length > 0 ? (
                filteredHospitals.map((hospital, index) => (
                  <div
                    key={hospital.id}
                    className={`transition-all duration-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                    style={{ transitionDelay: `${250 + index * 80}ms` }}
                  >
                    <HospitalCard hospital={hospital} onNavigate={onNavigate} />
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-20 px-5 bg-white rounded-3xl shadow border border-slate-100">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-xl font-bold text-slate-800 mb-2">No results found</p>
                  <p className="text-slate-500 mb-6 text-sm">Try a different visit reason, expanding the distance, or changing facility type.</p>
                  <button onClick={clearFilters} className="px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all">
                    Reset All Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}