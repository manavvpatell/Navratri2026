/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { 
  Calendar, MapPin, Sparkles, AlertCircle, ShieldCheck, Ticket, Bell, Settings, Eye, HelpCircle, Key, ChevronRight, Volume2, Info, Map, Megaphone, X, ShieldAlert
} from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./lib/firebase";
import { api } from "./lib/api";
import { INITIAL_NAVRATRI_DAYS } from "./lib/data";
import { Booking, AuditLog, UserNotification, NavratriDay } from "./types";
import NavratriBackground from "./components/NavratriBackground";
import RazorpayGateway from "./components/RazorpayGateway";
import EmailSimulator from "./components/EmailSimulator";
import AdminDashboard from "./components/AdminDashboard";

// Import our beautiful custom generated Garba couple illustration
// @ts-ignore
import garbaCoupleImg from "./assets/images/garba_couple_vector_1781067733943.png";

export default function App() {
  // Application Primary states
  const [days, setDays] = useState<NavratriDay[]>(INITIAL_NAVRATRI_DAYS);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [user, setUser] = useState<any>(null);

  // User input states
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  // UI Flow navigation: "reserve" | "passes" | "notifs" | "admin"
  const [activeTab, setActiveTab] = useState<"reserve" | "passes" | "notifs" | "admin">("reserve");
  const [activeAnnouncement, setActiveAnnouncement] = useState<UserNotification | null>(null);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [showGateway, setShowGateway] = useState(false);

  // Announcement Timeout
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Retrieve initial states from full-stack APIs
  useEffect(() => {
    loadInitialData();

    // Listen to Firebase authentication state dynamically
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setEmailInput(firebaseUser.email || "");
        if (firebaseUser.displayName) {
          setFullName(firebaseUser.displayName);
        }
      } else {
        setUser(null);
      }
    });

    // Establish persistent SSE Stream link for zero-downtime updates
    const stream = api.connectSseStream(
      (type, data) => {
        if (type === "bootstrap") {
          setDays(data.days);
          setNotifications(data.notifications);
        } else if (type === "capacity_update") {
          setDays((prev) =>
            prev.map((d) => (d.day === data.day ? { ...d, currentCapacity: data.currentCapacity } : d))
          );
        } else if (type === "notification") {
          setNotifications((prev) => [data, ...prev]);
          setActiveAnnouncement(data);
          
          if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
          announcementTimeoutRef.current = setTimeout(() => {
            setActiveAnnouncement(null);
          }, 8000);
        } else if (type === "audit_log") {
          setAuditLogs((prev) => [data, ...prev]);
        }
      },
      (isConnected) => {
        setSseConnected(isConnected);
      }
    );

    // Sync bookings locally
    const cachedBookings = JSON.parse(localStorage.getItem("navratri_bookings_cache") || "[]");
    setBookings(cachedBookings);

    return () => {
      stream.close();
      unsubscribeAuth();
      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const daysList = await api.getDays();
      setDays(daysList);
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (e) {
      console.warn("Could not query initial database. Using browser local states.");
    }
  };

  // Sync state between client-only local state and server database
  const handleFullRefresh = async () => {
    await loadInitialData();
    const list = JSON.parse(localStorage.getItem("navratri_bookings_cache") || "[]");
    setBookings(list);
  };

  const currentSelectedDayMeta = days.find((d) => d.day === selectedDay) || days[0];

  // Initiate purchase pass processing
  const handleCheckoutInitiate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !emailInput.trim() || !phoneInput.trim()) {
      alert("Please fill in all details for registration.");
      return;
    }

    try {
      const step = await api.createOrder(fullName, emailInput, phoneInput, selectedDay);
      if (step.success) {
        setActiveOrder({
          orderId: step.orderId,
          amount: step.amount,
          currency: step.currency,
          dayDetails: step.dayDetails,
          customer: { name: fullName, email: emailInput, phone: phoneInput }
        });
        setShowGateway(true);
      }
    } catch (err: any) {
      alert(err.message || "Checkout failed. This day is fully booked!");
    }
  };

  // On Razorpay success, locks capacity and returns QR ticket hashes
  const handlePaymentCleared = async (paymentId: string, signature: string) => {
    if (!activeOrder) return;

    try {
      const result = await api.verifyPayment(
        activeOrder.orderId,
        paymentId,
        signature,
        "success"
      );

      if (result.success) {
        // Redraw bookings list
        const updatedBookings = JSON.parse(localStorage.getItem("navratri_bookings_cache") || "[]");
        setBookings(updatedBookings);

        setShowGateway(false);
        setActiveOrder(null);
        setActiveTab("passes");

        // Confetti burst for festive joy
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#D12E6B", "#F59E0B", "#139D9E"]
        });
      }
    } catch (err: any) {
      alert(err.message || "Payment verification failed.");
    }
  };

  const handlePaymentCanceled = () => {
    if (activeOrder) {
      api.verifyPayment(activeOrder.orderId, undefined, undefined, "failed");
    }
    setShowGateway(false);
    setActiveOrder(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#3C2D24] font-sans relative antialiased overflow-x-hidden">
      
      {/* Background layer elements containing marigold garlands, diyas and lanterns */}
      <NavratriBackground />

      {/* Styled Top Sticky Header exactly matching the uploaded design layout */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E9E1D5] transition-all">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-3 select-none">
            <span className="font-serif text-[#2C1D13] font-bold tracking-wide text-lg sm:text-xl flex items-center gap-1.5">
              <span className="text-[#D12E6B]">✨</span> Dandiya Raas <span className="text-[#139D9E] font-sans font-medium text-xs bg-[#139D9E]/10 border border-[#139D9E]/25 px-2.5 py-0.5 rounded-full ml-1">2026</span>
            </span>
          </div>

          {/* Centered Desktop Navigation styled strictly like the image with clean font-medium links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#8C7D72]">
            <button
              onClick={() => setActiveTab("reserve")}
              className={`hover:text-[#D12E6B] transition-colors relative py-1.5 cursor-pointer ${
                activeTab === "reserve" ? "text-[#D12E6B]" : ""
              }`}
            >
              Home
              {activeTab === "reserve" && (
                <motion.div
                  layoutId="header-underline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#D12E6B] rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("passes")}
              className={`hover:text-[#D12E6B] transition-colors relative py-1.5 cursor-pointer ${
                activeTab === "passes" ? "text-[#D12E6B]" : ""
              }`}
            >
              My Passes ({bookings.length})
              {activeTab === "passes" && (
                <motion.div
                  layoutId="header-underline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#D12E6B] rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("notifs")}
              className={`hover:text-[#D12E6B] transition-colors relative py-1.5 cursor-pointer flex items-center gap-1 ${
                activeTab === "notifs" ? "text-[#D12E6B]" : ""
              }`}
            >
              Venue Bulletins
              {notifications.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-[#D12E6B]" />
              )}
              {activeTab === "notifs" && (
                <motion.div
                  layoutId="header-underline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#D12E6B] rounded-full"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("admin")}
              className={`hover:text-[#D12E6B] transition-colors relative py-1.5 cursor-pointer ${
                activeTab === "admin" ? "text-[#D12E6B]" : ""
              }`}
            >
              Executive Console
              {activeTab === "admin" && (
                <motion.div
                  layoutId="header-underline"
                  className="absolute bottom-0 inset-x-0 h-[2.5px] bg-[#D12E6B] rounded-full"
                />
              )}
            </button>
          </nav>

          {/* Right User Authentication Identity component */}
          <div className="flex items-center gap-3">
            {user ? (
              <div id="user-badge" className="flex items-center gap-2 bg-[#FAF6F0] px-3 py-1.5 rounded-xl border border-[#E9E1D5] text-xs text-[#3C2D24]">
                <img 
                  referrerPolicy="no-referrer"
                  src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName || user.email}`} 
                  alt={user.displayName || "Avatar"} 
                  className="w-5 h-5 rounded-full border border-white" 
                />
                <span className="max-w-[90px] truncate font-bold hidden sm:inline">{user.displayName || user.email.split("@")[0]}</span>
                <span className="text-[#E9E1D5] font-light">|</span>
                <button
                  onClick={async () => {
                    await api.logout();
                  }}
                  className="text-[10.5px] text-[#D12E6B] hover:opacity-80 font-bold transition-opacity cursor-pointer uppercase tracking-wider"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    await api.loginWithGoogle();
                  } catch (err) {
                    alert("Authentication aborted or cancelled by visitor.");
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] text-white rounded-xl text-xs font-bold transition-all hover:shadow-md cursor-pointer shadow-sm active:scale-95"
              >
                <Key className="w-3.5 h-3.5 text-white" /> Access Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Sticky Tab bar (for clean responsive UI structure) */}
      <div className="md:hidden sticky top-[61px] z-20 bg-[#FAF6F0]/95 backdrop-blur border-b border-[#E9E1D5] px-4 py-2 flex justify-around text-xs font-bold text-[#8C7D72]">
        <button onClick={() => setActiveTab("reserve")} className={activeTab === "reserve" ? "text-[#D12E6B]" : ""}>Home</button>
        <button onClick={() => setActiveTab("passes")} className={activeTab === "passes" ? "text-[#D12E6B]" : ""}>My Passes</button>
        <button onClick={() => setActiveTab("notifs")} className={activeTab === "notifs" ? "text-[#D12E6B]" : ""}>Bulletins</button>
        <button onClick={() => setActiveTab("admin")} className={activeTab === "admin" ? "text-[#D12E6B]" : ""}>Console</button>
      </div>

      {/* Main Container Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-6 relative z-10 space-y-12">

        {/* Traditional Elegant Hero Section precisely designed after the attached image card */}
        {activeTab === "reserve" && (
          <div className="relative rounded-3xl bg-white border border-[#E9E1D5] p-6 md:p-12 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-sm">
            {/* Soft decorative background circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] border border-dashed border-[#E9E1D5] rounded-full pointer-events-none opacity-40 animate-[spin_100s_linear_infinite]" />
            
            {/* Title & details block */}
            <div className="space-y-5 max-w-xl text-center lg:text-left z-10">
              <span className="bg-[#D12E6B]/10 text-[#D12E6B] px-3.5 py-1.5 text-xs rounded-full border border-[#D12E6B]/25 font-bold tracking-widest uppercase inline-block font-mono">
                💫 SHREE DURGAYAI NAMAH 💫
              </span>
              <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-[#2C1D13] leading-tight">
                Traditional Garba <br />& Dandiya Raas 2026
              </h2>
              <div className="h-0.5 w-24 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] rounded-full mx-auto lg:mx-0" />
              <p className="text-sm md:text-base text-[#6B5D52] leading-relaxed font-medium">
                Welcome to Gujarat and Maharashtra's premier celebration portals! Book authenticated entrance permits for the grand nine nights of Navratri with real-time slot management, secure Razorpay verification, and instant door-QR voucher deliveries.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs font-bold text-[#8C7D72] pt-2">
                <span className="flex items-center gap-1.5 bg-[#FAF6F0] px-3.5 py-1.5 rounded-full border border-[#E9E1D5]"><Calendar className="w-4 h-4 text-[#D12E6B]" /> Oct 10 - Oct 18, 2026</span>
                <span className="flex items-center gap-1.5 bg-[#FAF6F0] px-3.5 py-1.5 rounded-full border border-[#E9E1D5]"><MapPin className="w-4 h-4 text-[#139D9E]" /> VIP Mumbai Arena</span>
              </div>
            </div>

            {/* Illustrated Garba dancers block - loaded directly from generated graphics */}
            <div className="relative shrink-0 w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center z-10">
              {/* Outer mandala backing ring */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-50 to-rose-50 rounded-full blur-2xl opacity-50" />
              <img
                src={garbaCoupleImg}
                alt="Traditional Garba Couple playing Dandiya illustration"
                className="relative w-auto h-full max-h-[340px] md:max-h-[380px] object-contain drop-shadow-lg transform transition-transform hover:scale-102"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Tab Contents Panels rendering */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: RESERVATION FLOW & 9 DAYS SCHEDULE GRID */}
          {activeTab === "reserve" && (
            <motion.div
              id="view-reserve"
              key="reserve"
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              
              {/* Left Column: 9 Garba Days Cards Grid */}
              <div className="lg:col-span-2 space-y-5">
                <div className="select-none space-y-1">
                  <h3 className="font-serif font-bold text-lg md:text-xl text-[#2C1D13] flex items-center gap-2">
                    Select a Sacred Night
                  </h3>
                  <p className="text-xs text-[#8C7D72] font-semibold">Each night celebrates a distinct form of Maa Durga. Reserve early to lock pass prices!</p>
                </div>

                {/* Grid list container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {days.map((item) => {
                    const isSelected = selectedDay === item.day;
                    const spotsRemaining = item.maxCapacity - item.currentCapacity;
                    const percentFilled = (item.currentCapacity / item.maxCapacity) * 100;
                    const isSoldOut = spotsRemaining <= 0;

                    return (
                      <div
                        key={item.day}
                        onClick={() => {
                          if (!isSoldOut) {
                            setSelectedDay(item.day);
                          }
                        }}
                        className={`group p-5 rounded-2xl border transition-all text-left relative flex flex-col justify-between h-48 cursor-pointer select-none bg-white ${
                          isSoldOut 
                            ? "bg-[#FAF6F0]/40 border-[#E9E1D5] text-[#A69584] cursor-not-allowed opacity-50"
                            : isSelected
                            ? "border-[#D12E6B] shadow-md ring-2 ring-[#D12E6B]/20"
                            : "border-[#E9E1D5] hover:border-amber-500/40 hover:shadow-sm"
                        }`}
                        id={`item-day-${item.day}`}
                        role="button"
                        aria-pressed={isSelected}
                      >
                        <div>
                          {/* Card top banner badge */}
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#FAF6F0] border border-[#E9E1D5] text-[#8C7D72]">
                              Night {item.day}
                            </span>
                            <span className="text-sm font-bold text-[#D12E6B] font-mono">
                              ₹{item.price}
                            </span>
                          </div>

                          {/* Devi festival form */}
                          <h4 className="font-serif font-extrabold text-base text-[#2C1D13] group-hover:text-[#D12E6B] transition-colors leading-tight">
                            Maa {item.devi}
                          </h4>
                          <span className="text-xs text-[#8C7D72] font-semibold mt-1 block">
                            {item.title} Night
                          </span>
                          
                          <span className="text-[11px] text-[#A69584] font-medium block mt-3 italic truncate">
                            🎤 Vocalist: {item.artist}
                          </span>
                        </div>

                        {/* Capacity meter slider bar */}
                        <div className="space-y-1.5 pt-3 border-t border-[#FAF6F0] mt-3">
                          <div className="flex justify-between font-mono text-[9.5px] font-bold text-[#8C7D72]">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-[#A69584]" /> {item.date}</span>
                            <span className={spotsRemaining < 100 ? "text-[#D12E6B] font-bold" : "text-[#139D9E]"}>
                              {isSoldOut ? "SOLD OUT" : `${spotsRemaining} tickets left`}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-[#FAF6F0] rounded-full overflow-hidden border border-[#E9E1D5]/20">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${Math.min(100, percentFilled)}%`,
                                backgroundColor: isSoldOut ? "#A69584" : spotsRemaining < 100 ? "#D12E6B" : "#139D9E"
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Checkout Registration Form Panel */}
              <div className="space-y-5">
                <div className="bg-white p-6 rounded-2xl border border-[#E9E1D5] shadow-sm space-y-5">
                  <h3 className="font-serif font-bold text-lg text-[#2C1D13] border-b border-[#FAF6F0] pb-2.5">
                    Reserve Entry Voucher
                  </h3>

                  {/* Summary of Chosen night details */}
                  <div className="bg-[#FAF6F0] border border-[#E9E1D5] p-4 rounded-xl flex items-start gap-3.5 text-xs select-none relative">
                    <div className="p-3.5 rounded-lg bg-white border border-[#E9E1D5] font-serif font-black text-[#D12E6B] shrink-0 text-center text-base w-12 h-12 flex items-center justify-center">
                      {currentSelectedDayMeta.day}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-serif font-bold text-[#2C1D13] text-sm">
                        Night {currentSelectedDayMeta.day} — Goddess {currentSelectedDayMeta.devi}
                      </h4>
                      <p className="text-[11px] text-[#8C7D72] italic font-medium">Solo concert: {currentSelectedDayMeta.artist}</p>
                      <div className="text-[10px] text-[#A69584] font-bold uppercase mt-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#139D9E]" /> {currentSelectedDayMeta.venue}
                      </div>
                    </div>
                  </div>

                  {/* Interactive form */}
                  <form onSubmit={handleCheckoutInitiate} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1 tracking-wider">
                        Full Name of Attendee
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#FAF6F0] border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1 tracking-wider">
                        Email Address (for ticket receipt)
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="buyer@gmail.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#FAF6F0] border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1 tracking-wider">
                        Phone Contact (Mobile)
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#FAF6F0] border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B]"
                      />
                    </div>

                    <div className="pt-4 border-t border-[#FAF6F0] space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold leading-none select-none">
                        <span className="text-[#8C7D72] uppercase tracking-[0.05em]">Total Permit Price:</span>
                        <span className="text-xl font-bold font-serif text-[#D12E6B]">₹{currentSelectedDayMeta.price.toLocaleString("en-IN")}.00</span>
                      </div>

                      <button
                        type="submit"
                        disabled={currentSelectedDayMeta.maxCapacity - currentSelectedDayMeta.currentCapacity <= 0}
                        className="w-full bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] disabled:from-[#FAF6F0] disabled:to-[#FAF6F0] disabled:text-[#A69584] disabled:border-[#E9E1D5] text-white font-bold py-3.5 px-4 rounded-xl text-center text-xs tracking-wider uppercase transition-all shadow-sm hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer border border-white/10"
                      >
                        <ShieldCheck className="w-4 h-4 text-white" /> Proceed to secure checkout
                      </button>

                      <div className="flex justify-between text-[10px] text-[#8C7D72] font-semibold pt-1">
                        <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-[#139D9E]" /> SECURED SIMULATION BY RAZORPAY</span>
                        <span>TAXES INCLUDED</span>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: MY DIGITAL RESERVED PERMITS */}
          {activeTab === "passes" && (
            <motion.div
              id="view-passes"
              key="passes"
              className="space-y-6 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#2C1D13]">My Entry Passes Cabinet</h3>
                <p className="text-xs text-[#8C7D72] font-semibold">Your successfully registered passes. Open the mailbox drawer (bottom-right) to view printable e-tickets & door QRs.</p>
              </div>

              {bookings.length === 0 ? (
                <div className="bg-white border border-[#E9E1D5] p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 shadow-sm">
                  <div className="p-4 bg-[#FAF6F0] rounded-full border border-[#E9E1D5] text-[#8C7D72]">
                    <Ticket className="w-10 h-10 stroke-[1.5]" />
                  </div>
                  <p className="text-xs text-[#8C7D72] font-semibold max-w-xs">
                    No reserved passes found. Head over to the schedule nights directory to find your favourite Garba performances!
                  </p>
                  <button
                    onClick={() => setActiveTab("reserve")}
                    className="px-5 py-2.5 bg-[#D12E6B] hover:opacity-90 rounded-xl text-xs font-bold text-white cursor-pointer transition-opacity"
                  >
                    Browse Garba Nights
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((b) => {
                    const dayMeta = days.find((d) => d.day === b.day) || days[0];
                    return (
                      <div
                        key={b.id}
                        className={`bg-white border-2 p-5 rounded-2xl flex items-center justify-between gap-4 relative overflow-hidden shadow-sm ${
                          b.status === "success" ? "border-dashed border-[#E9E1D5]" : "border-[#D12E6B]/30"
                        }`}
                      >
                        {/* Ticket tear circle markers for physical coupons realism */}
                        <div className="absolute top-1/2 left-[-8px] -translate-y-1/2 w-4 h-4 bg-[#FAF6F0] border-r border-[#E9E1D5] rounded-full z-10" />
                        <div className="absolute top-1/2 right-[-8px] -translate-y-1/2 w-4 h-4 bg-[#FAF6F0] border-l border-[#E9E1D5] rounded-full z-10" />

                        <div className="space-y-2.5 relative z-10 PL-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              b.status === "success" ? "bg-[#139D9E]/10 text-[#139D9E]" : "bg-[#D12E6B]/10 text-[#D12E6B]"
                            }`}>
                              {b.status === "success" ? "Verified Active Permit" : "Simulation Aborted"}
                            </span>
                            <span className="font-mono text-[10px] text-[#8C7D72] font-bold">VOUCHER: {b.id.substring(0, 8)}...</span>
                          </div>

                          <h4 className="font-serif font-black text-[#2C1D13] text-base">
                            Day {b.day} — Maa {dayMeta.devi} Night
                          </h4>

                          <div className="text-xs text-[#6B5D52] space-y-1 font-semibold">
                            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-[#8C7D72]" /> {dayMeta.date}</p>
                            <p className="flex items-center gap-1.5 text-amber-700"><MapPin className="w-3.5 h-3.5 text-[#B45309]" /> {dayMeta.venue}</p>
                          </div>
                        </div>

                        {/* Cost & Verification trigger */}
                        <div className="text-right shrink-0 pr-2">
                          <p className="font-serif font-bold text-sm text-[#D12E6B]">₹{b.amount}.00</p>
                          {b.status === "success" && (
                            <button
                              onClick={() => {
                                setEmailInput(b.email);
                                triggerAccessibilityAnnouncement(`Loaded ticket of ${b.name}`);
                              }}
                              className="mt-4 inline-flex items-center gap-1 bg-[#FAF6F0] hover:bg-[#E9E1D5] border border-[#E9E1D5] text-[10px] text-[#D12E6B] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" /> View QR Code
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: BULLETIN NOTIFICATION FEED */}
          {activeTab === "notifs" && (
            <motion.div
              id="view-notifs"
              key="notifs"
              className="space-y-6 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center space-y-1">
                <h3 className="font-serif font-bold text-xl text-[#2C1D13]">Live Venue Broadcasts</h3>
                <p className="text-xs text-[#8C7D72] font-semibold">Real-time alerts, weather forecasts, parking directives, or guest artist bulletins posted from the event center.</p>
              </div>

              {notifications.length === 0 ? (
                <div className="bg-white border border-[#E9E1D5] p-6 text-center text-xs text-[#8C7D72] font-medium rounded-2xl">
                  No notifications or broadcast log records found for this session.
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((not) => {
                    let borderClass = "border-[#E9E1D5]";
                    let backgroundClass = "bg-white";
                    if (not.type === "alert") {
                      borderClass = "border-[#D12E6B]/30";
                      backgroundClass = "bg-[#D12E6B]/5";
                    } else if (not.type === "success") {
                      borderClass = "border-[#139D9E]/30";
                      backgroundClass = "bg-[#139D9E]/5";
                    }

                    return (
                      <div key={not.id} className={`p-4 rounded-2xl border flex gap-3.5 text-xs ${borderClass} ${backgroundClass} shadow-sm`}>
                        <div className="mt-0.5 shrink-0">
                          {not.type === "alert" ? (
                            <AlertCircle className="w-5 h-5 text-[#D12E6B]" />
                          ) : (
                            <Bell className="w-5 h-5 text-[#F59E0B]" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-serif font-bold text-[#2C1D13] text-sm">{not.title}</h4>
                          <p className="text-[#6B5D52] leading-relaxed text-[11.5px] font-semibold">{not.body}</p>
                          <span className="text-[10px] text-[#A69584] font-mono font-bold inline-block pt-1.5">
                            {new Date(not.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: DELEGATED EXECUTIVE GATE CONSOLE */}
          {activeTab === "admin" && (
            <motion.div
              id="view-admin"
              key="admin"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              {!user ? (
                <div className="max-w-md mx-auto bg-white border border-[#E9E1D5] p-8 rounded-2xl text-center space-y-5 shadow-sm">
                  <Key className="w-12 h-12 text-[#D12E6B] mx-auto animate-pulse" />
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-lg text-[#2C1D13]">Executive Verification Required</h3>
                    <p className="text-xs text-[#8C7D72] font-semibold">
                      The organizer gate clearance dashboard contains visitor logs, database nodes, and live SSE broadcasts. Authorize access.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await api.loginWithGoogle();
                      } catch (err) {
                        alert("Authentication aborted or cancelled.");
                      }
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
                  >
                    Login with Google
                  </button>
                </div>
              ) : user.email !== "manavgameium@gmail.com" ? (
                <div className="max-w-md mx-auto bg-white border border-[#E9E1D5] p-8 rounded-2xl text-center space-y-5 shadow-sm">
                  <ShieldAlert className="w-12 h-12 text-[#D12E6B] mx-auto" />
                  <div className="space-y-1.5">
                    <h3 className="font-serif font-bold text-lg text-[#D12E6B]">Access Rights Denied</h3>
                    <p className="text-xs text-[#8C7D72] font-semibold">
                      Apologies! The authenticated account <strong className="text-[#2C1D13]">{user.email}</strong> is not listed as active organizer staff for Navratri 2026.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab("reserve")}
                      className="flex-1 py-2.5 bg-[#FAF6F0] border border-[#E9E1D5] rounded-xl text-xs font-bold text-[#8C7D72] hover:bg-[#E9E1D5]/80 cursor-pointer transition-colors"
                    >
                      Return to Festival
                    </button>
                    <button
                      onClick={async () => {
                        await api.logout();
                      }}
                      className="flex-1 py-2.5 bg-[#D12E6B] text-white rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <AdminDashboard
                  days={days}
                  bookings={bookings}
                  auditLogs={auditLogs}
                  onRefreshAll={handleFullRefresh}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Floating Emergency Bulletin Broadcast banner */}
      <AnimatePresence>
        {activeAnnouncement && (
          <motion.div
            id="emergency-broadcast-banner"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 35 }}
            className="fixed bottom-24 left-6 z-50 p-4 max-w-sm bg-white border-2 border-[#D12E6B]/30 rounded-2xl shadow-xl flex items-start gap-3 select-none text-[#3C2D24]"
          >
            <div className="p-2.5 rounded-xl bg-[#D12E6B]/10 shrink-0">
              <Megaphone className="w-5 h-5 text-[#D12E6B] animate-bounce" />
            </div>
            <div className="space-y-1.5 text-xs flex-1">
              <div className="flex justify-between items-center gap-2">
                <span className="font-serif font-black text-[#D12E6B] tracking-wide">ORGANIZER BROADCAST</span>
                <button
                  onClick={() => setActiveAnnouncement(null)}
                  className="p-1 hover:bg-[#FAF6F0] rounded-lg text-[#8C7D72]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="font-bold text-[#2C1D13]">{activeAnnouncement.title}</h4>
              <p className="text-[#6B5D52] font-semibold leading-normal">{activeAnnouncement.body}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Razorpay Simulated Gateway Portal overlay */}
      <RazorpayGateway
        orderData={activeOrder}
        onSuccess={handlePaymentCleared}
        onCancel={handlePaymentCanceled}
      />

      {/* Reactive virtual email receiver client inbox floating container */}
      <EmailSimulator
        bookings={bookings}
        activeEmail={emailInput}
      />

      {/* Elegant, traditional footer design precisely inside details */}
      <footer className="mt-20 border-t border-[#E9E1D5] bg-white p-8 text-center select-none text-[#8C7D72] text-[11px] font-semibold">
        <p className="text-[10px] text-[#D12E6B] uppercase tracking-[0.2em] mb-2 font-black">NAVADURGA Event operations committee</p>
        <p>© 2026 Dandiya Raas Event Org, Mumbai, Vadodara, Ahmedabad. Protected by real-time sync database.</p>
      </footer>
    </div>
  );
}

// Custom simple helper helper func to trigger voice logs
function triggerAccessibilityAnnouncement(msg: string) {
  // Silent execution keeping logs
  console.log(`[Screen Reader] ${msg}`);
}
