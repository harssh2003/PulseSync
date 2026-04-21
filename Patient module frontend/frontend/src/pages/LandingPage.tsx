"use client"
import { useState, useEffect } from "react"

interface LandingPageProps {
  onNavigate: (page: string) => void
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const [searchInput, setSearchInput] = useState("")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleSearch = () => {
    if (searchInput.trim()) {
      onNavigate("search")
    }
  }

  return (
    <div className="flex flex-col bg-gradient-to-b from-sky-50 via-white to-cyan-50 w-full overflow-x-hidden font-['Inter',sans-serif]">
      {/* Hero Section */}
      <section 
        className="flex flex-col justify-center items-center px-5 md:px-10 py-32 bg-cover bg-center min-h-[550px] relative w-full max-w-full md:min-h-[500px] md:py-24 overflow-hidden"
        style={{
          backgroundImage: "url('https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Untitled%20design-jKJ779DCluSGGvpGCq075WEh7cS7tU.jpg')"
        }}
      >
        {/* Light Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-sky-50/80 to-cyan-50/85"></div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-sky-200/30 rounded-full blur-3xl top-0 right-1/4 animate-float"></div>
          <div className="absolute w-72 h-72 bg-cyan-200/30 rounded-full blur-3xl bottom-10 left-1/4 animate-float-delayed"></div>
          <div className="absolute w-64 h-64 bg-blue-200/20 rounded-full blur-3xl top-1/3 right-0 animate-float-slow"></div>
        </div>

        <div className={`flex flex-col gap-6 text-center max-w-[650px] relative z-10 px-5 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-block mx-auto px-4 py-2 bg-gradient-to-r from-sky-100 to-cyan-100 rounded-full text-sky-700 text-sm font-semibold mb-2 animate-fade-in">
            
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent leading-tight animate-fade-in" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Your Health, Our Priority
          </h1>
          <p className="text-lg md:text-xl leading-relaxed text-slate-700 font-medium animate-fade-in-delay" style={{ fontFamily: "'Inter', sans-serif" }}>
            Find hospitals, check doctor availability, and book appointments all in one place
          </p>

          <div className="flex flex-col md:flex-row gap-3 mt-4 w-full animate-fade-in-delay-2">
            <input
              type="text"
              className="flex-1 px-5 py-4 border-2 border-sky-200 bg-white rounded-2xl text-base transition-all duration-300 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 focus:scale-[1.02] shadow-lg shadow-sky-100/50 placeholder-slate-400"
              placeholder="Search hospitals, doctors, or services..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <button 
              className="px-10 py-4 bg-gradient-to-r from-sky-500 to-cyan-500 text-white rounded-2xl text-base font-bold cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(14,165,233,0.3)] hover:scale-105 active:scale-95 shadow-xl shadow-sky-200/50"
              onClick={handleSearch}
            >
              Search Now
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 mt-6 text-sm text-slate-600 animate-fade-in-delay-2">
            <div className="flex items-center gap-2">
              {/* <span className="text-2xl">⚡</span> */}
              <span className="font-medium">Instant Booking</span>
            </div>
            <div className="flex items-center gap-2">
              {/* <span className="text-2xl">🔒</span> */}
              <span className="font-medium">100% Secure</span>
            </div>
            <div className="flex items-center gap-2">
              {/* <span className="text-2xl">💯</span> */}
              <span className="font-medium">Verified Doctors</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-5 md:px-10 max-w-7xl mx-auto w-full">
        <div className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-700 to-cyan-700 bg-clip-text text-transparent mb-4 animate-fade-in">
            Everything You Need
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Experience seamless healthcare management with our comprehensive suite of services
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            className="group bg-white p-8 rounded-3xl shadow-lg shadow-sky-100/50 cursor-pointer transition-all duration-500 text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-200/60 border-2 border-sky-100 hover:border-sky-300 animate-slide-up"
            onClick={() => onNavigate("search")}
          >
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-2xl flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
              🏥
            </div>
            <h3 className="text-xl text-sky-900 mb-3 font-bold group-hover:text-sky-600 transition-colors">Find Hospitals</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Locate nearby hospitals and view their services, ratings, and specialties instantly
            </p>
          </div>

          <div 
            className="group bg-white p-8 rounded-3xl shadow-lg shadow-cyan-100/50 cursor-pointer transition-all duration-500 text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-200/60 border-2 border-cyan-100 hover:border-cyan-300 animate-slide-up delay-100"
            onClick={() => onNavigate("availability")}
          >
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
              📅
            </div>
            <h3 className="text-xl text-cyan-900 mb-3 font-bold group-hover:text-cyan-600 transition-colors">Check Availability</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              View real-time doctor and service availability with instant booking confirmation
            </p>
          </div>

          <div 
            className="group bg-white p-8 rounded-3xl shadow-lg shadow-sky-100/50 cursor-pointer transition-all duration-500 text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-200/60 border-2 border-sky-100 hover:border-sky-300 animate-slide-up delay-200"
            onClick={() => onNavigate("booking")}
          >
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-2xl flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
              📋
            </div>
            <h3 className="text-xl text-sky-900 mb-3 font-bold group-hover:text-sky-600 transition-colors">Book Appointments</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Securely book, manage, and cancel appointments online anytime, anywhere
            </p>
          </div>

          <div 
            className="group bg-white p-8 rounded-3xl shadow-lg shadow-cyan-100/50 cursor-pointer transition-all duration-500 text-center hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-200/60 border-2 border-cyan-100 hover:border-cyan-300 animate-slide-up delay-300"
            onClick={() => onNavigate("history")}
          >
            <div className="w-16 h-16 mx-auto mb-5 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-4xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg">
              📄
            </div>
            <h3 className="text-xl text-cyan-900 mb-3 font-bold group-hover:text-cyan-600 transition-colors">Medical History</h3>
            <p className="text-slate-600 leading-relaxed text-sm">
              Access your complete medical records, results, and prescriptions securely
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-5 md:px-10 bg-gradient-to-r from-sky-50 to-cyan-50">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="animate-fade-in">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mb-2">50K+</div>
            <div className="text-slate-600 font-medium">Active Patients</div>
          </div>
          <div className="animate-fade-in delay-100">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mb-2">500+</div>
            <div className="text-slate-600 font-medium">Partner Hospitals</div>
          </div>
          <div className="animate-fade-in delay-200">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mb-2">2K+</div>
            <div className="text-slate-600 font-medium">Expert Doctors</div>
          </div>
          <div className="animate-fade-in delay-300">
            <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent mb-2">24/7</div>
            <div className="text-slate-600 font-medium">Support Available</div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative mx-5 md:mx-10 my-20 bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600 px-8 md:px-16 py-20 rounded-3xl text-center text-white overflow-hidden shadow-2xl shadow-sky-300/30 animate-fade-in">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-white/10 rounded-full blur-3xl -top-20 -right-20 animate-pulse"></div>
          <div className="absolute w-96 h-96 bg-cyan-300/10 rounded-full blur-3xl -bottom-20 -left-20 animate-pulse delay-1000"></div>
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl mb-4 font-bold">Ready to Get Started?</h2>
          <p className="text-xl mb-10 opacity-95">
            Join thousands of patients managing their health with PulseSync
          </p>
          <button 
            className="px-12 py-5 bg-white text-sky-600 rounded-2xl text-lg font-bold cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-[0_16px_32px_rgba(0,0,0,0.2)] active:scale-95 shadow-xl hover:bg-sky-50"
            onClick={() => onNavigate("search")}
          >
            Find a Hospital Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-50 to-slate-100 pt-16 pb-8 px-5 md:px-10 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-cyan-500 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                  P
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-transparent">
                  PulseSync
                </span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Your trusted healthcare companion for seamless appointment booking and medical management.
              </p>
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-sky-500 hover:text-white hover:scale-110 shadow-sm border border-slate-200">
                  <span className="text-lg">📘</span>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-cyan-500 hover:text-white hover:scale-110 shadow-sm border border-slate-200">
                  <span className="text-lg">🐦</span>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-blue-600 hover:text-white hover:scale-110 shadow-sm border border-slate-200">
                  <span className="text-lg">💼</span>
                </div>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 hover:bg-pink-500 hover:text-white hover:scale-110 shadow-sm border border-slate-200">
                  <span className="text-lg">📷</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300" onClick={() => onNavigate("search")}>Find Hospitals</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300" onClick={() => onNavigate("availability")}>Check Availability</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300" onClick={() => onNavigate("booking")}>Book Appointment</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300" onClick={() => onNavigate("history")}>Medical Records</li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-4">Services</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Emergency Care</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Specialist Consultation</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Lab Tests</li>
                <li className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Health Packages</li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-slate-900 font-bold text-lg mb-4">Contact Us</h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <span>📧</span>
                  <span>support@pulsesync.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📞</span>
                  <span>+91 1800-123-4567</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>📍</span>
                  <span>Mumbai, Maharashtra, India</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>⏰</span>
                  <span>24/7 Support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-slate-300 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-600">
            <p>© 2025 PulseSync. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Privacy Policy</span>
              <span className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Terms of Service</span>
              <span className="cursor-pointer hover:text-sky-600 transition-colors duration-300">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -30px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 30px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 20px); }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 25s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 30s ease-in-out infinite;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.4s forwards;
          opacity: 0;
        }
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  )
}