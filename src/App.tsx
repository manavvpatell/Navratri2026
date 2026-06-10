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
  const [adminBookings, setAdminBookings] = useState<Booking[]>([]);
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Video settings states
  const [videoUrl, setVideoUrl] = useState<string>(
    localStorage.getItem("navratri_festival_video") || 
    "https://assets.mixkit.co/videos/preview/mixkit-bright-gold-particles-in-motion-background-40748-large.mp4"
  );
  const [videoZoom, setVideoZoom] = useState<number>(
    parseFloat(localStorage.getItem("navratri_festival_video_zoom") || "1.15")
  );
  const [videoOffset, setVideoOffset] = useState<number>(
    parseFloat(localStorage.getItem("navratri_festival_video_offset") || "-30")
  );

  // Intro splash screen state
  const [showIntro, setShowIntro] = useState(false);
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);

  // Auto/Force play video loops to bypass strict browser policies
  useEffect(() => {
    const triggerIntroPlay = async () => {
      if (showIntro && introVideoRef.current) {
        try {
          await introVideoRef.current.play();
        } catch (e) {
          console.debug("Intro video autoplay postponed until interaction:", e);
        }
      }
    };
    triggerIntroPlay();
  }, [showIntro]);

  useEffect(() => {
    const triggerMainPlay = async () => {
      if (!showIntro && mainVideoRef.current) {
        try {
          await mainVideoRef.current.play();
        } catch (e) {
          console.debug("Main video autoplay postponed until interaction:", e);
        }
      }
    };
    triggerMainPlay();
  }, [showIntro]);

  // Announcement Timeout
  const announcementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync email input ref to avoid stale closure during real-time stream subscription
  const emailInputRef = useRef(emailInput);
  useEffect(() => {
    emailInputRef.current = emailInput;
  }, [emailInput]);

  // Load all admin bookings when logged in as admin
  useEffect(() => {
    if (user && user.email === "satrang2026@gmail.com") {
      api.getAllBookings().then((all) => {
        if (all) setAdminBookings(all);
      });
    } else {
      setAdminBookings([]);
    }
  }, [user]);

  // Retrieve initial states from full-stack APIs
  useEffect(() => {
    loadInitialData();

    // Sync local authenticated user profile if present
    const storedSim = localStorage.getItem("simulated_user");
    if (storedSim) {
      try {
        const parsed = JSON.parse(storedSim);
        setUser(parsed);
        setEmailInput(parsed.email || "");
        setFullName(parsed.displayName || "");
      } catch (_) {}
    } else {
      setUser(null);
    }

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
        } else if (type === "booking_update") {
          // Sync admin records in real time
          setAdminBookings((prev) => {
            const exists = prev.some((b) => b.id === data.id);
            if (exists) {
              return prev.map((b) => (b.id === data.id ? data : b));
            } else {
              return [data, ...prev];
            }
          });

          // Sync user client cache if email matches current user
          const cached = JSON.parse(localStorage.getItem("navratri_bookings_cache") || "[]");
          const isMine = (data.email && emailInputRef.current && data.email.toLowerCase() === emailInputRef.current.toLowerCase()) || 
                          cached.some((b: Booking) => b.id === data.id);
          
          if (isMine) {
            setBookings((prev) => {
              const exists = prev.some((b) => b.id === data.id);
              let updated;
              if (exists) {
                updated = prev.map((b) => (b.id === data.id ? data : b));
              } else {
                updated = [data, ...prev];
              }
              localStorage.setItem("navratri_bookings_cache", JSON.stringify(updated));
              return updated;
            });
          }
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
      if (announcementTimeoutRef.current) clearTimeout(announcementTimeoutRef.current);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const daysList = await api.getDays();
      setDays(daysList);
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
      if (user && user.email === "satrang2026@gmail.com") {
        const allBookings = await api.getAllBookings();
        if (allBookings) setAdminBookings(allBookings);
      }
    } catch (e) {
      console.warn("Could not query initial database. Using browser local states.");
    }
  };

  const handleEnterCelebration = () => {
    setShowIntro(false);
    triggerAccessibilityAnnouncement("Entering the primary reservation dashboard. Welcome!");
    confetti({
      particleCount: 180,
      spread: 90,
      origin: { y: 0.65 },
      colors: ["#D12E6B", "#F59E0B", "#139D9E", "#FFFFFF"]
    });
  };

  const handleLogout = async () => {
    localStorage.removeItem("simulated_user");
    await api.logout();
    setUser(null);
    setEmailInput("");
    setFullName("");
    setAdminBookings([]);
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedEmail = authEmail.trim();
    if (!trimmedEmail || !authPassword) {
      setAuthError("Email and Password are both required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Please enter a valid email address format (e.g., user@example.com).");
      return;
    }

    try {
      const response = await api.login(trimmedEmail, authPassword);
      if (response && response.success && response.user) {
        localStorage.setItem("simulated_user", JSON.stringify(response.user));
        setUser(response.user);
        setEmailInput(response.user.email || "");
        if (response.user.displayName) {
          setFullName(response.user.displayName);
        }
        setAuthSuccessMsg(response.message || "Logged in successfully!");
        
        // Reset state
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");

        // Close after a brief delay
        setTimeout(() => {
          setShowAuthModal(false);
          setAuthSuccessMsg(null);
        }, 1200);
      } else {
        setAuthError(response.message || "Login failed. Check your details.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials. Please register or try again.");
    }
  };

  const handleCustomRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    const trimmedName = authName.trim();
    const trimmedEmail = authEmail.trim();

    if (!trimmedName || !trimmedEmail || !authPassword) {
      setAuthError("Full Name, Email and Password are all required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setAuthError("Please enter a valid email address format (e.g., user@example.com).");
      return;
    }

    try {
      const response = await api.register(trimmedName, trimmedEmail, authPassword);
      if (response && response.success) {
        setAuthSuccessMsg(response.message || "Registration completed! Please Sign In below.");
        setAuthTab("signin");
        setAuthPassword("");
        setAuthName("");
        setAuthError(null);
      } else {
        setAuthError(response.message || "Registration failed.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Registration failed. Try a different email address.");
    }
  };

  const handleLoginRole = async (role: "admin" | "user", method: "google" | "demo") => {
    try {
      if (method === "google") {
        const loggedUser = await api.loginWithGoogle();
        setUser(loggedUser);
        setEmailInput(loggedUser.email || "");
        setFullName(loggedUser.displayName || "");
      } else {
        const simulatedUser = await api.loginSimulated(role);
        localStorage.setItem("simulated_user", JSON.stringify(simulatedUser));
        setUser(simulatedUser);
        setEmailInput(simulatedUser.email || "");
        setFullName(simulatedUser.displayName || "");
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error("Auth role matching failed: ", err);
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
      
      {/* Cinematic Ambient Intro Splash Screen Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="cinematic-festival-intro"
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, filter: "blur(12px)" }}
            transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
            className="fixed inset-0 z-[120] bg-gradient-to-b from-[#110B29] to-[#050212] flex flex-col items-center justify-center p-4 overflow-hidden select-none"
          >
            {/* Spinning Mandala background watermarker */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none overflow-hidden scale-110 md:scale-100">
              <svg className="w-[600px] h-[600px] text-amber-500 animate-[spin_120s_linear_infinite]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.15">
                <circle cx="50" cy="50" r="45" />
                <circle cx="50" cy="50" r="35" strokeDasharray="3,3" />
                {Array.from({ length: 36 }).map((_, i) => (
                  <line
                    key={i}
                    x1="50"
                    y1="50"
                    x2={50 + 45 * Math.cos((i * 10 * Math.PI) / 180)}
                    y2={50 + 45 * Math.sin((i * 10 * Math.PI) / 180)}
                  />
                ))}
              </svg>
            </div>

            {/* Immersive Full Screen Background Video player */}
            <div className="absolute inset-0 w-full h-full object-cover z-0 overflow-hidden opacity-40">
              <video
                ref={introVideoRef}
                key={videoUrl}
                className="w-full h-full object-cover pointer-events-none select-none"
                style={{
                  width: `${videoZoom * 100}%`,
                  height: `${videoZoom * 100}%`,
                  transform: `translateY(${videoOffset}px)`
                }}
                autoPlay
                loop
                muted
                playsInline
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              >
                <source src={videoUrl} type="video/mp4" referrerPolicy="no-referrer" />
                <source src="https://assets.mixkit.co/videos/preview/mixkit-bright-gold-particles-in-motion-background-40748-large.mp4" type="video/mp4" referrerPolicy="no-referrer" />
                <source src="https://cdn.pixabay.com/video/2020/09/16/50548-462194917_large.mp4" type="video/mp4" referrerPolicy="no-referrer" />
                Your browser does not support HTML5 video loops.
              </video>
            </div>

            {/* Dark Golden Gradient Mask Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050212] via-black/45 to-transparent pointer-events-none z-10" />

            {/* Centered Traditional Experiential Greeting Card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
              className="relative w-full max-w-xl bg-white/[0.03] backdrop-blur-md rounded-[32px] border-2 border-amber-500/25 p-8 md:p-12 text-center shadow-[0_0_50px_rgba(245,158,11,0.15)] z-20 flex flex-col items-center space-y-6 md:space-y-8"
              id="cinematic-card-container"
            >
              {/* Marigold Garland / Lighted Clay Flame decoration overlay */}
              <div className="flex items-center gap-1.5 justify-center text-amber-500 animate-pulse">
                <Sparkles className="w-5 h-5 fill-amber-500" />
                <span className="text-xs font-mono font-black tracking-[0.25em] uppercase text-amber-400">
                  SHREE DURGAYAI NAMAH
                </span>
                <Sparkles className="w-5 h-5 fill-amber-500" />
              </div>

              {/* Sanskrit Traditional Shloka / Invocation Header */}
              <div className="space-y-1 select-none">
                <p className="font-serif text-[#FAF6F0] text-xs md:text-sm font-semibold tracking-wide italic leading-normal">
                  "माँ दुर्गा के पावन पर्व नवरात्रि की हार्दिक शुभकामनाएं"
                </p>
                <div className="h-[1px] w-28 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mx-auto mt-2" />
              </div>

              {/* Grand Main Festival Header */}
              <div className="space-y-2.5">
                <h1 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-white leading-tight drop-shadow-md">
                  Dandiya Raas <br />
                  <span className="bg-gradient-to-r from-amber-400 via-rose-500 to-[#D12E6B] bg-clip-text text-transparent">
                    & Garba Mahotsav
                  </span>
                </h1>
                <p className="text-amber-500/80 uppercase font-mono text-[10px] md:text-xs font-bold tracking-[0.3em] mt-1.5">
                  The Celestial Nine Nights of Divine Grace • 2026
                </p>
              </div>

              {/* Premium Highlights Grid */}
              <div className="grid grid-cols-2 gap-4 w-full text-left pt-2 md:pt-4">
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <span className="text-[10px] text-amber-500/80 font-black uppercase tracking-wider block">SACRED TIMELINE</span>
                  <p className="text-xs font-serif font-bold text-white">Oct 10 - Oct 18, 2026</p>
                  <span className="text-[9px] text-[#A69584] block font-semibold">9 Divine Concert Nights</span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
                  <span className="text-[10px] text-[#139D9E] font-black uppercase tracking-wider block">CELEBRATION ARENA</span>
                  <p className="text-xs font-serif font-bold text-white">VIP Borivali Arena</p>
                  <span className="text-[9px] text-[#A69584] block font-semibold">Mumbai, Maharashtra</span>
                </div>
              </div>

              {/* Informative Guidance */}
              <p className="text-[11px] text-[#A69584] leading-relaxed font-semibold max-w-sm">
                Reserve entry tickets in advance, verify digital passes via secure verification, and checkout on the live dashboard.
              </p>

              {/* Mega CTA Button with Sweep and Glow */}
              <button
                onClick={handleEnterCelebration}
                className="w-full relative group overflow-hidden py-4 px-8 bg-gradient-to-r from-[#D12E6B] via-amber-500 to-[#F59E0B] text-white rounded-2xl font-serif font-black text-xs md:text-sm uppercase tracking-widest transition-all hover:scale-[1.03] shadow-[0_4px_30px_rgba(209,46,107,0.35)] hover:shadow-[0_4px_40px_rgba(245,158,11,0.5)] active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Ticket className="w-4 h-4 fill-white/20 animate-pulse" />
                ENTER FESTIVAL PORTAL
                <ChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            {/* Ambient Footer */}
            <div className="absolute bottom-6 text-[#8C7D72] text-[9.5px] uppercase font-bold tracking-[0.25em] z-20 flex items-center gap-1.5 opacity-65">
              <span>● IMMERSIVE AUDIO-VISUAL THEATER ACTIVE</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <div className="flex flex-col text-left">
                  <span className="max-w-[100px] truncate font-bold hidden sm:inline leading-none mb-0.5">{user.displayName || user.email.split("@")[0]}</span>
                  <span className="text-[9px] text-[#D12E6B] font-extrabold uppercase tracking-wider leading-none">
                    {user.email === "satrang2026@gmail.com" ? "Organizer Admin" : "User Portal"}
                  </span>
                </div>
                <span className="text-[#E9E1D5] font-light">|</span>
                <button
                  onClick={handleLogout}
                  className="text-[10.5px] text-[#D12E6B] hover:opacity-80 font-bold transition-opacity cursor-pointer uppercase tracking-wider"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] text-white rounded-xl text-xs font-bold transition-all hover:shadow-md cursor-pointer shadow-sm active:scale-95"
              >
                <Key className="w-3.5 h-3.5 text-white" /> Login/Signup
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

        {/* Traditional Elegant Hero Section with Live Background Video Loop */}
        {activeTab === "reserve" && (
          <div className="relative rounded-3xl bg-[#130E26] border border-amber-500/20 p-6 md:p-12 overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xl">
            
            {/* Absolute Background Video Player */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
              <video
                ref={mainVideoRef}
                key={videoUrl}
                className="w-full h-full object-cover opacity-70"
                style={{
                  width: `${videoZoom * 100}%`,
                  height: `${videoZoom * 100}%`,
                  transform: `translateY(${videoOffset}px)`
                }}
                autoPlay
                loop
                muted
                playsInline
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              >
                <source src={videoUrl} type="video/mp4" referrerPolicy="no-referrer" />
                <source src="https://assets.mixkit.co/videos/preview/mixkit-bright-gold-particles-in-motion-background-40748-large.mp4" type="video/mp4" referrerPolicy="no-referrer" />
                <source src="https://cdn.pixabay.com/video/2020/09/16/50548-462194917_large.mp4" type="video/mp4" referrerPolicy="no-referrer" />
              </video>
              {/* Semi-transparent dark overlay to ensure maximum text contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/30 md:from-black/85 md:via-[#130E26]/80 md:to-transparent" />
            </div>

            {/* Soft decorative background circles */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] border border-dashed border-amber-500/10 rounded-full pointer-events-none opacity-40 animate-[spin_100s_linear_infinite] z-0" />
            
            {/* Title & details block */}
            <div className="space-y-5 max-w-xl text-center lg:text-left z-10">
              <span className="bg-amber-500/15 text-amber-300 px-3.5 py-1.5 text-xs rounded-full border border-amber-500/30 font-bold tracking-widest uppercase inline-block font-mono">
                💫 SHREE DURGAYAI NAMAH 💫
              </span>
              <h2 className="text-3xl md:text-5xl font-serif font-black tracking-tight text-white leading-tight">
                Traditional Garba <br />& Dandiya Raas 2026
              </h2>
              <div className="h-0.5 w-24 bg-gradient-to-r from-[#D12E6B] to-amber-500 rounded-full mx-auto lg:mx-0" />
              <p className="text-sm md:text-base text-amber-100/90 leading-relaxed font-medium">
                Welcome to Gujarat and Maharashtra's premier celebration portals! Book authenticated entrance permits for the grand nine nights of Navratri with real-time slot management, secure Razorpay verification, and instant door-QR voucher deliveries.
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs font-bold text-amber-200/90 pt-2">
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                  <Calendar className="w-4 h-4 text-amber-400" /> Oct 10 - Oct 18, 2026
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-sm">
                  <MapPin className="w-4 h-4 text-emerald-400" /> VIP Mumbai Arena
                </span>
              </div>
            </div>

            {/* Right side spacer to allow the background video dancers to be fully visible */}
            <div className="hidden lg:block lg:w-96 lg:h-80 z-10 pointer-events-none" />
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
                    onClick={() => setShowAuthModal(true)}
                    className="w-full py-3 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-sm"
                  >
                    Open Login Portal
                  </button>
                </div>
              ) : user.email !== "satrang2026@gmail.com" ? (
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
                      onClick={handleLogout}
                      className="flex-1 py-2.5 bg-[#D12E6B] text-white rounded-xl text-xs font-bold hover:opacity-90 cursor-pointer transition-opacity"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <AdminDashboard
                  days={days}
                  bookings={adminBookings}
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

      {/* Traditional Authenticator/Reg portal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border-2 border-[#D12E6B]/20 w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col text-[#3C2D24]"
              id="auth-modal-window"
            >
              {/* Traditional Marigold Garland/Diyas Banner decoration */}
              <div className="relative bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] p-6 text-white text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowAuthModal(false);
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/35 transition-colors cursor-pointer text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono font-black tracking-[0.2em] uppercase">Festive Gate Security</span>
                <h3 className="font-serif font-black text-xl mt-1">Dandiya Access Portal</h3>
                <p className="text-[11px] text-white/80 font-medium">Register for pass checkout or log in to access your dashboard</p>
              </div>

              {/* Secure Tab Toggles */}
              <div className="grid grid-cols-2 border-b border-[#E9E1D5] text-xs font-serif font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signin");
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`py-3.5 text-center transition-colors cursor-pointer border-r border-[#E9E1D5] ${
                    authTab === "signin"
                      ? "bg-[#FAF6F0] text-[#D12E6B] border-b-2 border-b-[#D12E6B]"
                      : "text-[#8C7D72] hover:bg-gray-50"
                  }`}
                >
                  Sign In (Login)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                  }}
                  className={`py-3.5 text-center transition-colors cursor-pointer ${
                    authTab === "signup"
                      ? "bg-[#FAF6F0] text-[#D12E6B] border-b-2 border-b-[#D12E6B]"
                      : "text-[#8C7D72] hover:bg-gray-50"
                  }`}
                >
                  Create Account (Register)
                </button>
              </div>

              {/* Modal Core Body Content */}
              <div className="p-6 space-y-4">
                
                {/* Reactive Notifications Alerts */}
                {authError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium"
                  >
                    ⚠️ {authError}
                  </motion.div>
                )}

                {authSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium"
                  >
                    ✅ {authSuccessMsg}
                  </motion.div>
                )}

                {authTab === "signin" ? (
                  /* --- SIGN IN FORM --- */
                  <form onSubmit={handleCustomLogin} className="space-y-4">
                    <p className="text-[11px] text-[#8C7D72] font-semibold italic">
                      Admin organizers must sign in here using their master staff profile. Attendees can log in to view bought ticket histories.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B5D52] uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        placeholder="attendee@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E1D5] bg-[#FAF6F0]/20 focus:bg-white focus:outline-none focus:border-[#D12E6B] transition-colors font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B5D52] uppercase tracking-wider block">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E1D5] bg-[#FAF6F0]/20 focus:bg-white focus:outline-none focus:border-[#D12E6B] transition-colors font-mono"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] text-white rounded-xl font-bold font-serif text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-md active:scale-98"
                    >
                      Verify & Log In
                    </button>
                  </form>
                ) : (
                  /* --- SIGN UP (REGISTRATION) FORM --- */
                  <form onSubmit={handleCustomRegister} className="space-y-4">
                    <p className="text-[11px] text-[#8C7D72] font-semibold italic">
                      Register your profile onto the safe decentralized attendee node. Only a valid email can register.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B5D52] uppercase tracking-wider">Full Guest Name</label>
                      <input
                        type="text"
                        placeholder="Karan Sharma"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E1D5] bg-[#FAF6F0]/20 focus:bg-white focus:outline-none focus:border-[#D12E6B] transition-colors font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B5D52] uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        placeholder="karan@gmail.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E1D5] bg-[#FAF6F0]/20 focus:bg-white focus:outline-none focus:border-[#D12E6B] transition-colors font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#6B5D52] uppercase tracking-wider block">Choose Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full text-xs p-3 rounded-xl border border-[#E9E1D5] bg-[#FAF6F0]/20 focus:bg-white focus:outline-none focus:border-[#D12E6B] transition-colors font-mono"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-gradient-to-r from-[#139D9E] to-[#D12E6B] text-white rounded-xl font-bold font-serif text-xs uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer shadow-md active:scale-98"
                    >
                      Complete Registration
                    </button>
                  </form>
                )}

                {/* Secure Google OAuth Backup Separator */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#E9E1D5]"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-[#A69584] uppercase font-bold tracking-wider">or sign in securely with</span>
                  <div className="flex-grow border-t border-[#E9E1D5]"></div>
                </div>

                {/* Google OAuth Login Call */}
                <button
                  type="button"
                  onClick={() => handleLoginRole("user", "google")}
                  className="w-full py-2.5 bg-white border border-[#E9E1D5] hover:border-amber-500 rounded-xl text-xs font-bold font-serif shadow-sm transition-all text-[#3C2D24] hover:shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google logo" className="w-4 h-4" />
                  Sign In with Google Identity
                </button>
              </div>

              {/* Informative Hint Footer */}
              <div className="bg-[#FAF6F0] p-4 text-center border-t border-[#E9E1D5] text-[10px] text-[#8C7D72]">
                🔒 High availability MongoDB & Firestore synchronized core.
              </div>
            </motion.div>
          </div>
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
