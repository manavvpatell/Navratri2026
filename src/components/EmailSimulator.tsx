/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import QRCode from "qrcode";
import { Mail, X, CheckCircle, MapPin, Calendar, Clock, Sparkles, Printer, UserCircle } from "lucide-react";
import { Booking, NavratriDay } from "../types";
import { INITIAL_NAVRATRI_DAYS } from "../lib/data";

interface EmailSimulatorProps {
  bookings: Booking[];
  activeEmail: string;
  onCloseEmail?: () => void;
}

export default function EmailSimulator({ bookings, activeEmail }: EmailSimulatorProps) {
  const [open, setOpen] = useState(false);
  const [inbox, setInbox] = useState<Booking[]>([]);
  const [selectedMail, setSelectedMail] = useState<Booking | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync state: filter bookings matching the signed-up customer, and update inbox list
  useEffect(() => {
    const successful = bookings.filter((b) => b.status === "success");
    setInbox(successful);

    if (successful.length > 0) {
      setSelectedMail(successful[0]);
      if (successful[0].email === activeEmail) {
        setOpen(true);
      }
    }
  }, [bookings, activeEmail]);

  // Generate QR code dynamically
  useEffect(() => {
    if (selectedMail && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        selectedMail.ticketHash,
        {
          width: 140,
          margin: 1.5,
          color: {
            dark: "#1E1B4B", // Deep Indigo
            light: "#FAF6F0", // Cream paper background
          },
        },
        (error) => {
          if (error) console.error("QR Code rendering failed", error);
        }
      );
    }
  }, [selectedMail, open]);

  // Retrieve details for a given booking day
  const getDayMetadata = (dayNum: number): NavratriDay => {
    return INITIAL_NAVRATRI_DAYS.find((d) => d.day === dayNum) || INITIAL_NAVRATRI_DAYS[0];
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !selectedMail) return;

    const dayMeta = getDayMetadata(selectedMail.day);
    const canvas = qrCanvasRef.current;
    const qrDataUrl = canvas ? canvas.toDataURL() : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Garba Ticket Pass ${selectedMail.id}</title>
          <style>
            body { font-family: 'Outfit', Arial, sans-serif; padding: 40px; color: #3C2D24; background: #FAF6F0; }
            .ticket { border: 2px dashed #B45309; padding: 30px; max-width: 500px; margin: 0 auto; border-radius: 16px; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { text-align: center; border-bottom: 2px solid #E9E1D5; padding-bottom: 15px; margin-bottom: 20px; }
            .title { font-size: 22px; font-weight: bold; color: #D12E6B; margin: 0; font-family: 'Playfair Display', Georgia, serif; }
            .meta { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #B45309; font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 13px; }
            .label { font-weight: bold; color: #6B5D52; }
            .value { text-align: right; font-weight: 500; color: #2C1D13; }
            .qr-container { text-align: center; margin-top: 25px; }
            .qr-img { width: 150px; height: 150px; border-radius: 8px; border: 1px solid #E9E1D5; }
            .footer { font-size: 10px; color: #8C7D72; text-align: center; margin-top: 30px; border-top: 1px solid #E9E1D5; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <span class="meta">NAVRATRI GARBA UTASV 2026</span>
              <h2 class="title">Garba Entrance Ticket</h2>
            </div>
            <div class="row">
              <span class="label">Pass ID</span>
              <span class="value" style="font-family: monospace; font-weight: bold;">${selectedMail.id}</span>
            </div>
            <div class="row">
              <span class="label">Attendee</span>
              <span class="value">${selectedMail.name}</span>
            </div>
            <div class="row">
              <span class="label">Night booked</span>
              <span class="value">Day ${selectedMail.day} (${dayMeta.devi} Night)</span>
            </div>
            <div class="row">
              <span class="label">Date</span>
              <span class="value">${dayMeta.date}</span>
            </div>
            <div class="row">
              <span class="label">Featured Artist</span>
              <span class="value">${dayMeta.artist}</span>
            </div>
            <div class="row">
              <span class="label">Venue Arena</span>
              <span class="value">${dayMeta.venue}</span>
            </div>
            <div class="qr-container">
              <img class="qr-img" src="${qrDataUrl}" alt="Digital QR Gate Key" />
              <div style="font-size: 10px; font-family: monospace; color:#8C7D72; margin-top: 5px;">${selectedMail.ticketHash}</div>
            </div>
            <div class="footer">
              <p>Present this physical print or digital QR key on mobile at entry gates. Ticket is non-refundable. Organizers reserve right of admission.</p>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      {/* Floating simulator envelope button in the corner - styled inside the theme */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          onClick={() => setOpen(!open)}
          className="relative group p-4 rounded-full bg-gradient-to-r from-[#D12E6B] to-[#F59E0B] hover:opacity-90 text-white font-semibold shadow-xl active:scale-95 transition-all flex items-center justify-center border border-white/20 pointer-events-auto cursor-pointer"
          animate={inbox.length > 0 && !open ? { y: [0, -6, 0] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          id="btn-mailbox"
        >
          <Mail className="w-6 h-6 text-white" />
          <span className="sr-only">Toggle Mail Simulator Inbox</span>
          {inbox.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#139D9E] border border-white text-[10px] font-bold text-white shadow animate-pulse">
              {inbox.length}
            </span>
          )}
          {/* Tooltip prompt */}
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-white border border-[#E9E1D5] text-xs text-[#3C2D24] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none font-medium">
            📧 Real-Time Email Mailbox
          </span>
        </motion.button>
      </div>

      {/* Slide-over Simulator Inbox Container rewritten to match beautiful cream theme */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="email-simulator-panel"
            className="fixed inset-y-0 right-0 w-full md:w-[680px] bg-[#FAF6F0] border-l border-[#E9E1D5] shadow-2xl z-50 flex flex-col pointer-events-auto text-[#3C2D24]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
          >
            {/* Header with quick close */}
            <div className="bg-white p-4 border-b border-[#E9E1D5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#D12E6B]/10 text-[#D12E6B] rounded-xl border border-[#D12E6B]/20">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#2C1D13] flex items-center gap-1.5">
                    Real-Time Ticket Mailbox Simulator
                  </h3>
                  <p className="text-xs text-[#8C7D72]">Verifying instant automatic e-ticket arrivals on checkout success</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 px-2.5 hover:bg-[#FAF6F0] rounded-xl text-[#8C7D72] hover:text-[#2C1D13] transition-colors cursor-pointer"
                id="btn-close-mail-panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Panel: Inbox menu (Left) and Email body (Right) */}
            <div className="flex-1 flex overflow-hidden">
              {/* Inbox Menu items */}
              <div className="w-1/3 border-r border-[#E9E1D5] bg-white/60 overflow-y-auto">
                <div className="p-3 text-[10px] uppercase font-mono tracking-wider font-bold text-[#8C7D72] border-b border-[#E9E1D5]">
                  Inbox folder ({inbox.length})
                </div>

                {inbox.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#8C7D72] mt-12 font-medium">
                    No ticket confirmation messages found. Complete a ticket reservation checkout!
                  </div>
                ) : (
                  <div className="divide-y divide-[#E9E1D5]">
                    {inbox.map((b) => {
                      const isSelected = selectedMail?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setSelectedMail(b)}
                          className={`w-full text-left p-3.5 hover:bg-[#FAF6F0]/80 transition-colors flex flex-col gap-1 cursor-pointer border-l-4 ${
                            isSelected ? "bg-white border-[#D12E6B] text-[#2C1D13]" : "border-transparent text-[#8C7D72]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs truncate max-w-[80px] text-[#3C2D24]">{b.name}</span>
                            <span className="font-mono text-[9px] bg-[#FAF6F0] px-1.5 py-0.5 rounded border border-[#E9E1D5] text-[#D12E6B] font-bold">
                              Day {b.day}
                            </span>
                          </div>
                          <span className="text-[10px] truncate">Ticket ID: {b.id.substring(0, 10)}...</span>
                          <span className="text-[9px] text-[#A69584]">
                            {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Email Detailed View */}
              <div className="flex-1 bg-white/40 overflow-y-auto p-4 flex flex-col justify-between">
                {selectedMail ? (
                  <div id="selected-email-board" className="space-y-4 h-full flex flex-col justify-between">
                    {/* Header Info */}
                    <div className="bg-white p-4 border border-[#E9E1D5] rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#8C7D72] w-12">From:</span>
                        <span className="font-bold text-[#D12E6B]">passes@dandiyautsav2026.com</span>
                        <span className="text-[9px] bg-[#139D9E]/10 text-[#139D9E] py-0.5 px-2 rounded-full border border-[#139D9E]/20 font-bold ml-2">VERIFIED EVENT</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#8C7D72] w-12">To:</span>
                        <span className="font-medium text-[#3C2D24]">{selectedMail.email}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#2C1D13] font-bold border-t border-[#E9E1D5] pt-2 text-xs md:text-sm">
                        <span className="font-serif">🎫 Ticket Confirmed: Navratri Celebration Pass [{selectedMail.id}]</span>
                        <button
                          onClick={handlePrint}
                          className="flex items-center gap-1.5 bg-[#FAF6F0] hover:bg-[#E9E1D5] px-2.5 py-1 rounded-lg text-xs text-[#D12E6B] transition-colors border border-[#E9E1D5] cursor-pointer font-bold"
                          title="Print Ticket"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </button>
                      </div>
                    </div>

                    {/* Email Html Inner Content - Luxurious Golden Print Layout */}
                    <div className="flex-1 my-4 bg-white p-6 border-2 border-dashed border-[#E9E1D5] rounded-2xl space-y-5 text-sm leading-relaxed max-w-lg mx-auto shadow-sm text-[#3C2D24] relative overflow-hidden">
                      {/* Traditional Visual Watermarks */}
                      <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-[#FAF6F0] rounded-full border border-[#E9E1D5] pointer-events-none" />

                      {/* Gilded Header inside Mail */}
                      <div className="text-center border-b border-[#E9E1D5] pb-4">
                        <div className="flex justify-center gap-1.5 text-[#F59E0B] mb-1">
                          <Sparkles className="w-4 h-4 fill-amber-500" />
                          <span className="font-serif uppercase tracking-[0.2em] font-bold text-xs text-[#B45309]">SHREE DURGADEVI UTSAV</span>
                          <Sparkles className="w-4 h-4 fill-amber-500" />
                        </div>
                        <h1 className="font-serif text-xl font-bold text-[#2C1D13]">Navratri Garba entry pass</h1>
                        <p className="text-[10px] text-[#8C7D72] font-mono tracking-wider font-semibold">DIGITAL ENTRY PERMIT</p>
                      </div>

                      {/* Content Intro */}
                      <div className="space-y-1.5">
                        <p className="font-serif font-bold text-base text-[#D12E6B]">Jai Ambe! Joyous celebrations!</p>
                        <p className="text-xs text-[#6B5D52]">
                          Namaste <span className="font-bold text-[#2C1D13]">{selectedMail.name}</span>! Your entry pass is confirmed and queued on the master transaction ledger. Please present this unique QR ticket code at the gate readers.
                        </p>
                      </div>

                      {/* Structured Details Grid */}
                      <div className="p-4 bg-[#FAF6F0] rounded-xl border border-[#E9E1D5] space-y-3 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b border-[#E9E1D5]">
                          <span className="text-[#6B5D52] flex items-center gap-1.5 font-medium">
                            <Calendar className="w-4 h-4 text-[#D12E6B]" /> Festival Night
                          </span>
                          <span className="font-bold text-[#2C1D13] bg-white border border-[#E9E1D5] px-2.5 py-1 rounded-lg">
                            Day {selectedMail.day} ({getDayMetadata(selectedMail.day).title})
                          </span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-[#E9E1D5]">
                          <span className="text-[#6B5D52] flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-4 h-4 text-[#F59E0B]" /> Devi Form / Performer
                          </span>
                          <div className="text-right">
                            <span className="font-serif font-bold text-[#D12E6B] block">Form: {getDayMetadata(selectedMail.day).devi}</span>
                            <span className="text-[10px] text-[#8C7D72] font-semibold">{getDayMetadata(selectedMail.day).artist}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-start pb-1">
                          <span className="text-[#6B5D52] flex items-center gap-1.5 mt-0.5 min-w-[80px] font-medium">
                            <MapPin className="w-4 h-4 text-[#139D9E]" /> Arena Location
                          </span>
                          <span className="text-[#3C2D24] text-right font-medium leading-normal block">
                            {getDayMetadata(selectedMail.day).venue}
                          </span>
                        </div>
                      </div>

                      {/* QR Ticket block */}
                      <div className="flex flex-col items-center gap-2 border-t border-[#E9E1D5] pt-4">
                        <div className="p-2 border border-[#E9E1D5] rounded-2xl bg-[#1E1B4B] flex shadow-md">
                          <canvas ref={qrCanvasRef} className="rounded-xl" />
                        </div>
                        <div className="text-center font-mono text-[9.5px] text-[#8C7D72] mt-1">
                          <span className="block text-[#D12E6B] font-bold tracking-widest uppercase mb-1">Encrypted Door Token</span>
                          HASH: {selectedMail.ticketHash}
                        </div>
                      </div>

                      {/* Footer check in instruction */}
                      <div className="border-t border-[#E9E1D5] pt-3 text-[10px] text-[#8C7D72] text-center space-y-1">
                        <p>🌸 Outer gates open at 6:30 PM. Mandatory ID proof required for validation.</p>
                        <p className="font-bold text-[#3C2D24]">Navratri 2026 Executive Council</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-[#8C7D72] gap-2">
                    <CheckCircle className="w-12 h-12 stroke-[1] text-[#139D9E]" />
                    <p className="text-xs font-medium">Select a ticket email from the list folder to inspect receipt.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
