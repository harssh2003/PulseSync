"use client"

interface Appointment {
  id: string
  doctor_name: string
  specialty: string
  hospital_name: string
  appointment_date: string
  appointment_time: string
  status: "confirmed" | "pending" | "completed" | "cancelled"
  reason: string
  notes: string
}

interface AppointmentCardProps {
  appointment: Appointment
  onCancel?: (id: string) => void
  onReschedule?: (id: string) => void
  isPast?: boolean
}

export default function AppointmentCard({ appointment, onCancel, onReschedule, isPast }: AppointmentCardProps) {
  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "confirmed":  return "border-l-green-500"
      case "pending":    return "border-l-amber-500"
      case "completed":  return "border-l-violet-500"
      case "cancelled":  return "border-l-red-500"
      default:           return "border-l-sky-500"
    }
  }

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case "confirmed":  return "bg-green-100 text-green-800"
      case "pending":    return "bg-amber-100 text-amber-800"
      case "completed":  return "bg-violet-100 text-violet-800"
      case "cancelled":  return "bg-red-100 text-red-900"
      default:           return "bg-sky-100 text-sky-800"
    }
  }

  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-md border-l-[5px] transition-all hover:shadow-lg ${getStatusBorderColor(appointment.status)} ${
        appointment.status === "cancelled" ? "opacity-70" : ""
      }`}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 pb-4 border-b border-slate-200 gap-2.5">
        <h3 className="text-lg font-bold text-sky-900 m-0">
          {appointment.doctor_name ? `Dr. ${appointment.doctor_name}` : "Unknown Doctor"}
        </h3>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase ${getStatusBadgeClasses(appointment.status)}`}>
          {appointment.status}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2.5 mb-4">
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Specialty:</strong>{" "}
          {appointment.specialty || "General Practice"}
        </p>
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Hospital:</strong>{" "}
          {appointment.hospital_name || "Unknown Hospital"}
        </p>
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Date & Time:</strong>{" "}
          {appointment.appointment_date} at {appointment.appointment_time}
        </p>
        <p className="m-0 text-sm text-slate-600">
          <strong className="text-sky-900">Reason:</strong>{" "}
          {appointment.reason || "—"}
        </p>
        {appointment.notes && (
          <p className="m-0 text-sm text-slate-600 bg-sky-50 p-2.5 rounded-md border-l-[3px] border-l-sky-500">
            <strong className="text-sky-900">Notes:</strong>{" "}
            {appointment.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {!isPast && appointment.status !== "cancelled" && (
        <div className="flex flex-col md:flex-row gap-2.5 pt-4 border-t border-slate-200">
          <button
            className="flex-1 px-2.5 py-2.5 bg-sky-100 text-sky-700 rounded-md font-semibold cursor-pointer transition-all text-sm hover:bg-sky-200 hover:-translate-y-0.5"
            onClick={() => onReschedule?.(appointment.id)}
          >
            Reschedule
          </button>
          <button
            className="flex-1 px-2.5 py-2.5 bg-red-100 text-red-800 rounded-md font-semibold cursor-pointer transition-all text-sm hover:bg-red-200 hover:-translate-y-0.5"
            onClick={() => onCancel?.(appointment.id)}
          >
            Cancel Appointment
          </button>
        </div>
      )}
    </div>
  )
}