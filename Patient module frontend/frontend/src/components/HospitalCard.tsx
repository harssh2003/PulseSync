import type { Hospital } from "../pages/HospitalSearch"

interface HospitalCardProps {
  hospital: Hospital
  onNavigate: (page: string) => void
}

const TYPE_CONFIG = {
  hospital: { label: "Hospital", icon: "🏨", color: "bg-sky-100 text-sky-700" },
  clinic:   { label: "Clinic",   icon: "🏪", color: "bg-emerald-100 text-emerald-700" },
  doctor:   { label: "Doctor",   icon: "👨‍⚕️", color: "bg-violet-100 text-violet-700" },
}

export default function HospitalCard({ hospital, onNavigate }: HospitalCardProps) {
  const typeConfig = TYPE_CONFIG[hospital.type] ?? TYPE_CONFIG.clinic

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-md transition-all flex flex-col hover:-translate-y-2 hover:shadow-xl h-full">
      {/* Image */}
      <div className="w-full h-48 overflow-hidden bg-sky-50 relative flex-shrink-0">
        <img
          src={hospital.image}
          alt={hospital.name}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder-hospital.png" }}
        />
        {/* Facility type badge */}
        <span className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${typeConfig.color}`}>
          <span>{typeConfig.icon}</span> {typeConfig.label}
        </span>
        {/* Open/Closed badge */}
        {hospital.openNow !== null && (
          <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${hospital.openNow ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
            {hospital.openNow ? "Open Now" : "Closed"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <h3 className="text-base font-bold text-sky-900 leading-snug line-clamp-2">{hospital.name}</h3>
        <p className="text-slate-500 text-xs line-clamp-2">📍 {hospital.location}</p>

        {/* Rating + Distance */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5 items-center">
            {hospital.rating > 0 ? (
              <>
                <span className="font-semibold text-amber-500 text-sm">⭐ {hospital.rating.toFixed(1)}</span>
                <span className="text-slate-400 text-xs">({hospital.reviews.toLocaleString()})</span>
              </>
            ) : (
              <span className="text-slate-400 text-xs">No ratings yet</span>
            )}
          </div>
          <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
            {hospital.distanceKm} km
          </span>
        </div>

        {/* Services */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-semibold text-slate-600">Services:</p>
          <div className="flex flex-wrap gap-1.5">
            {hospital.services.slice(0, 4).map((service, idx) => (
              <span key={idx} className="bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full text-xs font-medium border border-sky-100">
                {service}
              </span>
            ))}
            {hospital.services.length > 4 && (
              <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-xs font-medium">
                +{hospital.services.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          className="mt-auto px-3 py-3 bg-gradient-to-br from-sky-500 to-cyan-500 text-white rounded-xl font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(14,165,233,0.3)] text-sm"
          onClick={() => onNavigate("availability")}
        >
          View & Book →
        </button>
      </div>
    </div>
  )
}