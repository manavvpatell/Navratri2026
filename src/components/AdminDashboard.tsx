/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Megaphone, Landmark, Users, Search, Activity, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Send, ScanLine, X
} from "lucide-react";
import { api } from "../lib/api";
import { Booking, AuditLog, NavratriDay } from "../types";

interface AdminDashboardProps {
  days: NavratriDay[];
  bookings: Booking[];
  auditLogs: AuditLog[];
  onRefreshAll: () => void;
}

export default function AdminDashboard({ 
  days, 
  bookings, 
  auditLogs, 
  onRefreshAll
}: AdminDashboardProps) {
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalRegistrations: 0,
    activeUsersSimulated: 12,
    dailyStats: [] as any[],
    isMongoOffline: false
  });

  const [loading, setLoading] = useState(false);

  // Announcement States
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementType, setAnnouncementType] = useState<"update" | "success" | "alert" | "info">("update");
  const [announcementStatus, setAnnouncementStatus] = useState("");

  // Scan Verification simulator States
  const [qrToVerify, setQrToVerify] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
    booking?: Booking;
  } | null>(null);

  // Search Filter for Log state
  const [logSearch, setLogSearch] = useState("");
  const [logLevelFilter, setLogLevelFilter] = useState("all");

  useEffect(() => {
    fetchStats();
  }, [bookings, days]);

  const fetchStats = async () => {
    try {
      const liveStats = await api.getDashboardStats();
      setStats({
        ...liveStats,
        isMongoOffline: liveStats.isMongoOffline ?? false
      });
    } catch (err) {
      console.error("Failed to query metrics", err);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementBody.trim()) return;

    setLoading(true);
    setAnnouncementStatus("");

    try {
      const res = await api.announceVenueUpdate(announcementTitle, announcementBody, announcementType);
      if (res.success) {
        setAnnouncementStatus("Broadcast pushed successfully! Active visitor screens notified in real-time.");
        setAnnouncementTitle("");
        setAnnouncementBody("");
        onRefreshAll();
        setTimeout(() => setAnnouncementStatus(""), 4000);
      }
    } catch (err: any) {
      setAnnouncementStatus("Failed to submit push alert.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyQRScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrToVerify.trim()) return;

    try {
      const res = await api.verifyQrAtGate(qrToVerify.trim());
      setVerifyResult(res);
      onRefreshAll();
    } catch (err) {
      setVerifyResult({ success: false, message: "Connection lost during gate clearance scan." });
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.event.toLowerCase().includes(logSearch.toLowerCase()) || 
      log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.email.toLowerCase().includes(logSearch.toLowerCase());
    const matchesLevel = logLevelFilter === "all" || log.level === logLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-[#E9E1D5] p-6 space-y-8 z-10 relative text-[#3C2D24]">
      
      {/* Top action header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#E9E1D5] pb-5">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#2C1D13] tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-6 rounded bg-[#D12E6B] block" />
            Navratri Event Operations Dashboard
          </h2>
          <p className="text-xs text-[#8C7D72]">High-performance visitor logging and gate-clearance manager</p>
        </div>
        <button
          onClick={() => {
            onRefreshAll();
            fetchStats();
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FAF6F0] hover:bg-[#E9E1D5] rounded-xl text-xs font-bold text-[#D12E6B] border border-[#E9E1D5] transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-Sync Live Streams
        </button>
      </div>

      {stats.isMongoOffline && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/95 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-[#5C3A21] text-xs shadow-sm"
        >
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-800 flex items-center gap-2">
              MongoDB Atlas Whitelist Notice — Connection Handshake Timeout
            </h4>
            <p className="leading-relaxed">
              The sandboxed container is currently unable to complete the TLS/SSL handshake with your cluster `cluster0.0aaktxk.mongodb.net`. 
              This is usually caused by restricted IP Access Lists on your MongoDB Atlas Dashboard.
            </p>
            <div className="bg-white/80 p-2.5 rounded-lg border border-amber-500/10 text-xs font-semibold text-[#3C2D24] mt-2 space-y-1">
              <p className="font-serif font-bold text-amber-900">How to authorize the container connection:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[#6B5D52] font-mono text-[11px] leading-relaxed">
                <li>Sign in to your <strong className="text-amber-800">MongoDB Atlas Dashboard</strong>.</li>
                <li>Navigate to <strong className="text-amber-800">Security &rarr; Network Access</strong> on the left sidebar.</li>
                <li>Click <strong className="text-amber-800">Add IP Address</strong>.</li>
                <li>Select <strong className="text-amber-800">Allow Access from Anywhere</strong> (which adds <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-700">0.0.0.0/0</code>) and save!</li>
              </ol>
            </div>
            <p className="text-[10px] text-[#8C7D72] italic pt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-pulse" />
              <strong>Offline-First Resilience Active:</strong> The service is maintaining perfect data consistency in high-speed, local cache & server in-memory registries. You can buy/verify tickets and use all operations normally!
            </p>
          </div>
        </motion.div>
      )}

      {/* Numerical Stats overview rewritten in clean light design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E9E1D5] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8C7D72] block tracking-widest">Payments Collected</span>
            <span className="text-2xl font-bold font-mono text-[#139D9E]">
              ₹{stats.totalPayments.toLocaleString("en-IN")}.00
            </span>
          </div>
          <div className="p-3 bg-[#139D9E]/10 text-[#139D9E] rounded-xl border border-[#139D9E]/20">
            <Landmark className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E9E1D5] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8C7D72] block tracking-widest">Passes Checked Out</span>
            <span className="text-2xl font-bold font-serif text-[#2C1D13]">
              {stats.totalRegistrations} Digital Keys
            </span>
          </div>
          <div className="p-3 bg-[#D12E6B]/10 text-[#D12E6B] rounded-xl border border-[#D12E6B]/20">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E9E1D5] flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#8C7D72] block tracking-widest">Simulated Traffic Load</span>
            <span className="text-2xl font-bold font-mono text-amber-700">
              {(stats.activeUsersSimulated * 115).toLocaleString()} RPS
            </span>
          </div>
          <div className="p-3 bg-amber-500/10 text-[#B45309] rounded-xl border border-amber-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Middle Layout: Gate Verification scanner & Announcement broadcaster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Gate Scanner QR Simulator */}
        <div className="bg-[#FAF6F0]/80 p-5 rounded-2xl border border-[#E9E1D5] space-y-4">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#D12E6B]" />
            <h3 className="font-serif font-bold text-base text-[#2C1D13]">Gate ticket validation (QR Hash scanner)</h3>
          </div>
          <p className="text-xs text-[#6B5D52] leading-relaxed">
            Verify attendee tickets instantly before granting venue clearance. Paste a ticket hash identifier to simulated-verify guest credentials.
          </p>

          <form onSubmit={handleVerifyQRScan} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Paste ticket QR hash token here..."
              value={qrToVerify}
              onChange={(e) => setQrToVerify(e.target.value)}
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-white border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B] font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#D12E6B] hover:opacity-90 rounded-lg text-xs font-bold text-white transition-opacity cursor-pointer"
            >
              Scan Ticket
            </button>
          </form>

          {/* Verification scanner display outcomes */}
          <AnimatePresence mode="wait">
            {verifyResult && (
              <motion.div
                className={`p-4 rounded-xl border text-xs relative ${
                  verifyResult.success 
                    ? "bg-[#139D9E]/10 border-[#139D9E]/30 text-[#139D9E]"
                    : "bg-[#D12E6B]/10 border-[#D12E6B]/30 text-[#D12E6B]"
                }`}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                <button
                  type="button"
                  onClick={() => setVerifyResult(null)}
                  className="absolute top-2 right-2 text-[#8C7D72] hover:text-[#2C1D13]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-2 items-start">
                  {verifyResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-[#139D9E] shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-[#D12E6B] shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">{verifyResult.message}</p>
                    {verifyResult.booking && (
                      <div className="mt-2 pt-2 border-t border-[#E9E1D5] font-mono text-[10.5px] space-y-1 text-[#3C2D24]">
                        <div><span className="text-[#8C7D72]">Holder:</span> {verifyResult.booking.name}</div>
                        <div><span className="text-[#8C7D72]">Email:</span> {verifyResult.booking.email}</div>
                        <div><span className="text-[#8C7D72]">Day booked:</span> Day {verifyResult.booking.day}</div>
                        <div><span className="text-[#8C7D72]">Pass ID:</span> {verifyResult.booking.id}</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick list of mock successes for testing gate scanner */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase text-[#8C7D72] font-bold tracking-wider block">Active Database Passes (Click to auto-fill)</span>
            {bookings.filter(b => b.status === "success").length === 0 ? (
              <p className="text-[11px] text-[#8C7D72] italic font-medium">No active confirmed tickets available. Perform a registration checkout first.</p>
            ) : (
              <div className="flex gap-1.5 flex-wrap max-h-24 overflow-y-auto pr-1">
                {bookings.filter(b => b.status === "success").map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setQrToVerify(b.ticketHash);
                    }}
                    type="button"
                    className="px-2.5 py-1 text-[10.5px] font-mono font-semibold bg-white border border-[#E9E1D5] text-[#3C2D24] rounded-lg hover:border-[#D12E6B] transition-colors cursor-pointer truncate max-w-[150px]"
                    title={`Click to copy ${b.name}'s ticket hash`}
                  >
                    🚀 {b.name.split(" ")[0]} (D{b.day})
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Event Alert Push Broadcasts */}
        <div className="bg-[#FAF6F0]/80 p-5 rounded-2xl border border-[#E9E1D5] space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-[#139D9E]" />
            <h3 className="font-serif font-bold text-base text-[#2C1D13]">Real-Time Announcement Broadcast</h3>
          </div>
          <p className="text-xs text-[#6B5D52] leading-relaxed">
            Publish event alerts, parking adjustments, or performer delays. Pushes instantly to all active user screens via fullstack SSE links without reloading.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1">Alert Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP Entrance Relocated"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B]"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1">Tone category</label>
                <select
                  value={announcementType}
                  onChange={(e: any) => setAnnouncementType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B] font-medium"
                >
                  <option value="update">Standard Bulletin</option>
                  <option value="success">Capacity Sold-Out</option>
                  <option value="alert">Critical Access Alert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#8C7D72] mb-1">Bulletin content description</label>
              <textarea
                required
                rows={2}
                placeholder="Write message copy here..."
                value={announcementBody}
                onChange={(e) => setAnnouncementBody(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-white border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B]"
              />
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] text-[#8C7D72] font-semibold">⚡ Stream link state: Live & Encrypted</span>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-[#139D9E] hover:opacity-90 rounded-lg text-xs font-bold text-white transition-opacity flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" /> Push Broadcast
              </button>
            </div>
          </form>

          {announcementStatus && (
            <div className="text-[11.5px] p-2.5 rounded-lg font-semibold bg-[#139D9E]/10 border border-[#139D9E]/20 text-[#139D9E]">
              {announcementStatus}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Stream section */}
      <div className="border-t border-[#E9E1D5] pt-6 space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-700" />
            <h3 className="font-serif font-bold text-base text-[#2C1D13]">Audit logs & Clearance history</h3>
          </div>

          {/* Filtering row */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <span className="absolute inset-y-0 left-2.5 flex items-center text-[#8C7D72]">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search events, guest emails..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#FAF6F0] border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B] w-full md:w-48"
              />
            </div>

            <select
              value={logLevelFilter}
              onChange={(e) => setLogLevelFilter(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-lg bg-[#FAF6F0] border border-[#E9E1D5] text-[#3C2D24] focus:outline-none focus:border-[#D12E6B] font-medium"
            >
              <option value="all">Levels: All</option>
              <option value="info">Info</option>
              <option value="warning">Warnings</option>
              <option value="error">Errors</option>
              <option value="security">Security</option>
            </select>
          </div>
        </div>

        {/* Custom Log board */}
        <div className="bg-[#FAF6F0]/60 border border-[#E9E1D5] rounded-xl overflow-hidden shadow-inner">
          <div className="max-h-60 overflow-y-auto divide-y divide-[#E9E1D5] scrollbar-thin">
            {filteredLogs.length === 0 ? (
              <p className="p-4 text-center text-xs text-[#8C7D72] italic font-medium">No event ledger matches standard search criteria.</p>
            ) : (
              filteredLogs.map((log) => {
                let badgeStyle = "bg-sky-500/10 text-sky-700 border-sky-500/20";
                if (log.level === "warning") badgeStyle = "bg-amber-500/10 text-amber-700 border-amber-500/20";
                if (log.level === "error") badgeStyle = "bg-rose-500/10 text-rose-700 border-rose-500/20";
                if (log.level === "security") badgeStyle = "bg-purple-500/10 text-purple-700 border-purple-500/20";
                
                return (
                  <div key={log.id} className="p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-white/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border uppercase font-bold tracking-wide ${badgeStyle}`}>
                        {log.level}
                      </span>
                      <span className="font-bold text-[#3C2D24]">{log.event}</span>
                      <span className="text-[10px] text-[#8C7D72] truncate max-w-[140px] md:max-w-none">({log.email})</span>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-[#6B5D52] font-medium text-[11px]">{log.details}</span>
                      <span className="text-[10px] text-[#A69584] font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
