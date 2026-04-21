"use client"

interface MedicalRecordData {
  id: number
  type: string
  title: string
  date: string
  hospital: string
  doctor: string
  status: string
  details: string
}

interface MedicalRecordProps {
  record: MedicalRecordData
}

export default function MedicalRecord({ record }: MedicalRecordProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Lab Report":
        return "🧪"
      case "Prescription":
        return "💊"
      case "Diagnosis":
        return "📋"
      case "Imaging":
        return "🖼️"
      case "Vaccination":
        return "💉"
      default:
        return "📄"
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "normal":
        return "border-t-green-500"
      case "active":
        return "border-t-sky-500"
      case "ongoing":
        return "border-t-amber-500"
      case "completed":
        return "border-t-violet-500"
      default:
        return "border-t-sky-500"
    }
  }

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "normal":
        return "bg-green-100 text-green-800"
      case "active":
        return "bg-sky-100 text-sky-700"
      case "ongoing":
        return "bg-amber-100 text-amber-800"
      case "completed":
        return "bg-violet-100 text-violet-800"
      default:
        return "bg-sky-100 text-sky-700"
    }
  }

  return (
    <div className={`bg-white rounded-xl p-5 shadow-md border-t-4 transition-all hover:shadow-lg ${getStatusBorderColor(record.status)}`}>
      {/* Record Header */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-4 pb-4 border-b border-slate-200 gap-2.5">
        <div className="flex gap-4 flex-1">
          <span className="text-4xl flex items-center">{getTypeIcon(record.type)}</span>
          <div className="flex flex-col gap-1">
            <h4 className="text-base font-bold text-sky-900 m-0">{record.title}</h4>
            <p className="text-xs text-slate-400 font-semibold m-0">{record.type}</p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase ${getStatusBadgeClasses(record.status)}`}>
          {record.status}
        </span>
      </div>

      {/* Record Details */}
      <div className="flex flex-col gap-2.5 mb-4">
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Date:</strong> {record.date}
        </p>
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Hospital:</strong> {record.hospital}
        </p>
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Doctor:</strong> {record.doctor}
        </p>
        <p className="m-0 text-sm text-slate-600 bg-sky-50 p-2.5 rounded-md border-l-[3px] border-l-sky-500">
          <strong className="text-sky-900">Details:</strong> {record.details}
        </p>
      </div>

      {/* Record Actions */}
      <div className="flex flex-col md:flex-row gap-2.5 pt-4 border-t border-slate-200">
        <button className="flex-1 px-2.5 py-2.5 border-2 border-slate-200 bg-white rounded-md font-semibold cursor-pointer transition-all text-sm text-sky-900 hover:border-sky-500 hover:bg-sky-100 hover:-translate-y-0.5">
          Download
        </button>
        <button className="flex-1 px-2.5 py-2.5 border-2 border-slate-200 bg-white rounded-md font-semibold cursor-pointer transition-all text-sm text-sky-900 hover:border-sky-500 hover:bg-sky-100 hover:-translate-y-0.5">
          Share
        </button>
      </div>
    </div>
  )
}