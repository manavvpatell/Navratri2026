/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Smartphone, ShieldCheck, Landmark, ArrowLeft, Loader2, Info } from "lucide-react";

interface RazorpayGatewayProps {
  orderData: {
    orderId: string;
    amount: number;
    currency: string;
    dayDetails: {
      day: number;
      devi: string;
      title: string;
    };
    customer: {
      name: string;
      email: string;
      phone: string;
    };
  } | null;
  onSuccess: (paymentId: string, signature: string) => void;
  onCancel: () => void;
}

export default function RazorpayGateway({ orderData, onSuccess, onCancel }: RazorpayGatewayProps) {
  if (!orderData) return null;

  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbank" | null>(null);
  const [loadingStep, setLoadingStep] = useState<"idle" | "submitting" | "otp" | "completing">("idle");
  const [testOutcome, setTestOutcome] = useState<"success" | "fail">("success");

  // Card details states
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState(orderData.customer.name || "");

  // UPI details states
  const [upiId, setUpiId] = useState("");

  // OTP Verification state
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  // Validate and proceed to simulated secure banking OTP gate
  const handleProceedToOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStep("submitting");

    setTimeout(() => {
      setLoadingStep("otp");
    }, 1800);
  };

  const handleVerifyOTP = () => {
    if (testOutcome === "fail") {
      setLoadingStep("idle");
      alert("Simulated transaction denied by bank issuer. Check funds or retry.");
      return;
    }

    if (otp !== "1234" && otp !== "123456" && otp.length < 4) {
      setOtpError("Incorrect verification token format. Enter 1234 or click 'Auto-Fill OTP'.");
      return;
    }

    setLoadingStep("completing");

    setTimeout(() => {
      const mockPayId = "pay_rzp_" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const mockSig = "sig_rzp_" + Math.random().toString(36).substring(2, 14).toUpperCase();
      onSuccess(mockPayId, mockSig);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        id="razorpay-frame"
        className="w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[540px] text-slate-100"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Header Block mimicking actual Razorpay colors */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
              RP
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-200">Navratri Event Org.</h3>
              <p className="text-[10px] text-slate-400">Garba Pass Booking 2026</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-500 block">Amount</span>
            <span className="text-base font-bold text-emerald-400">
              ₹{(orderData.amount).toLocaleString("en-IN")}.00
            </span>
          </div>
        </div>

        {/* Dynamic validation loader shield */}
        {loadingStep === "submitting" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-900">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mb-4" />
            <h4 className="font-semibold text-base">Contacting Acquiring Bank</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs">
              Configuring secure 3D-Secure payment channel. Do not close this browser tab or click back.
            </p>
            <div className="mt-8 flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-950 px-3 py-1.5 rounded-full border border-slate-800">
              <ShieldCheck className="w-3 h-3 text-emerald-500" /> PCI-DSS Complaint Encryption Enabled
            </div>
          </div>
        )}

        {/* Completing purchase step */}
        {loadingStep === "completing" && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-900">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              className="mb-4"
            >
              <Loader2 className="w-12 h-12 text-emerald-500" />
            </motion.div>
            <h4 className="font-semibold text-lg text-emerald-400">Locking Garba Capacity...</h4>
            <p className="text-xs text-slate-400 mt-2 max-w-xs">
              Matching signatures and generating unique encrypted ticket QR hash token for Day {orderData.dayDetails.day}.
            </p>
          </div>
        )}

        {/* Bank secure OTP gateway */}
        {loadingStep === "otp" && (
          <div className="flex-1 flex flex-col p-6 justify-between bg-slate-950">
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                <div className="flex justify-between font-mono text-slate-400">
                  <span>ID: {orderData.orderId}</span>
                  <span className="text-emerald-500">SECURE BANK PORTAL</span>
                </div>
                <div className="h-[1px] bg-slate-800 my-2" />
                <p className="text-slate-300">
                  A high-speed OTP check-token has been triggered to <span className="font-semibold text-amber-400">{orderData.customer.email}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1.5 font-medium">
                  Enter 2-Factor Authentication Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter OTP (e.g. 1234)"
                    value={otp}
                    onChange={(e) => {
                      setOtp(e.target.value);
                      setOtpError("");
                    }}
                    className="flex-1 text-center font-mono py-2.5 rounded bg-slate-900 border border-slate-700 focus:outline-none focus:border-emerald-500 text-lg tracking-[0.5em]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setOtp("1234")}
                    className="px-3 bg-slate-900 hover:bg-slate-800 text-xs rounded border border-slate-700 text-sky-400 font-mono"
                  >
                    Auto-Fill
                  </button>
                </div>
                {otpError && (
                  <p className="text-rose-500 text-[11px] mt-1.5 font-medium">{otpError}</p>
                )}
                <p className="text-[10px] text-slate-500 mt-2">
                  * Simulation Mode: Type <span className="font-mono font-semibold">1234</span> as OTP to approve instantly.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleVerifyOTP}
                className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded text-sm font-semibold tracking-wide transition-colors uppercase text-slate-100"
              >
                Approve & Complete Pass Booking
              </button>
              <button
                type="button"
                onClick={() => setLoadingStep("idle")}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-300 py-1.5"
              >
                Back to Checkout Selection
              </button>
            </div>
          </div>
        )}

        {/* Standard Checkout selections */}
        {loadingStep === "idle" && (
          <div className="flex-1 flex flex-col h-full bg-slate-900 justify-between">
            {/* Upper detailed checkout panel */}
            <div className="overflow-y-auto flex-1">
              {/* Event details mini card */}
              <div className="bg-slate-950 p-3 mx-4 mt-4 rounded-lg border border-slate-800 text-xs flex gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-sm">
                  D{orderData.dayDetails.day}
                </div>
                <div>
                  <div className="font-semibold text-slate-200">
                    Day {orderData.dayDetails.day} : {orderData.dayDetails.devi}
                  </div>
                  <div className="text-[10px] text-slate-400">{orderData.dayDetails.title} Night Performance</div>
                </div>
              </div>

              {/* Back selection header */}
              {paymentMethod && (
                <button
                  onClick={() => setPaymentMethod(null)}
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 mx-4 mt-3"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to payment alternatives
                </button>
              )}

              {/* Dynamic form selector */}
              {!paymentMethod ? (
                <div className="p-4 space-y-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-1">
                    Select secure gateway channel
                  </p>

                  <button
                    onClick={() => setPaymentMethod("card")}
                    className="w-full p-4 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center gap-4 transition-all text-left"
                  >
                    <div className="p-2.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-xs text-slate-100">Credit / Debit Cards</h4>
                      <p className="text-[10px] text-slate-400">All major banks supported (Visa, MC, RuPay)</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("upi")}
                    className="w-full p-4 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center gap-4 transition-all text-left"
                  >
                    <div className="p-2.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-xs text-slate-100">UPI / Mobile Wallets</h4>
                      <p className="text-[10px] text-slate-400">Instant validation via GPay, PhonePe, Paytm</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("netbank")}
                    className="w-full p-4 rounded-lg bg-slate-950/60 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center gap-4 transition-all text-left"
                  >
                    <div className="p-2.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-xs text-slate-100">Net Banking</h4>
                      <p className="text-[10px] text-slate-400">Pre-authorized corporate links</p>
                    </div>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleProceedToOTP} className="p-4 space-y-3">
                  {/* Cards Form details */}
                  {paymentMethod === "card" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Your Name (matching card)"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-800 focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={19}
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={(e) => {
                            // Strip spaces and style nicely
                            const plain = e.target.value.replace(/\D/g, "");
                            const matched = plain.match(/.{1,4}/g);
                            setCardNumber(matched ? matched.join(" ") : "");
                          }}
                          className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-800 focus:outline-none focus:border-sky-500 font-mono tracking-wider"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            placeholder="MM/YY"
                            value={expiry}
                            onChange={(e) => {
                              const plain = e.target.value.replace(/\D/g, "");
                              if (plain.length > 2) {
                                setExpiry(`${plain.substring(0, 2)}/${plain.substring(2, 4)}`);
                              } else {
                                setExpiry(plain);
                              }
                            }}
                            className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-800 focus:outline-none focus:border-sky-500 font-mono text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase text-slate-400 mb-1">
                            CVV / Code
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={3}
                            placeholder="•••"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, ""))}
                            className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-800 focus:outline-none focus:border-sky-500 font-mono text-center tracking-widest"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* UPI Form */}
                  {paymentMethod === "upi" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 mb-1">
                          UPI Address ID
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="username@okhdfcbank"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded bg-slate-950 border border-slate-800 focus:outline-none focus:border-sky-500 font-mono"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {["@oksbi", "@okhdfc", "@apl", "@paytm"].map((suf) => (
                          <button
                            key={suf}
                            type="button"
                            onClick={() => {
                              const username = upiId.split("@")[0] || "member";
                              setUpiId(`${username}${suf}`);
                            }}
                            className="px-2 py-1 bg-slate-950 hover:bg-slate-800 rounded border border-slate-800 text-[10px] text-slate-300 font-mono"
                          >
                            {suf}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NetBanking Bank choice */}
                  {paymentMethod === "netbank" && (
                    <div className="space-y-2">
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">
                        Select Bank Entity
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {["State Bank of India", "HDFC Bank Ltd", "ICICI Bank Ltd", "Axis Bank"].map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => alert(`Redirect link established for ${b}. Proceed.`)}
                            className="p-3 text-center rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors"
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Settings outcome simulation toggle for debugging */}
                  <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Info className="w-3.5 h-3.5 text-sky-400" /> Gateway Simulation
                    </span>
                    <div className="flex gap-1.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setTestOutcome("success")}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                          testOutcome === "success" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Success
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestOutcome("fail")}
                        className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                          testOutcome === "fail" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Fail
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-sky-600 hover:bg-sky-500 py-3 rounded text-sm font-semibold tracking-wide transition-colors uppercase text-slate-100 mt-4 shadow-lg flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-300" /> Secure Checkout
                  </button>
                </form>
              )}
            </div>

            {/* Cancel & details lock */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-500 hover:text-slate-300 transition-colors py-1 px-2.5"
              >
                Cancel booking
              </button>
              <div className="flex items-center gap-1 text-slate-600 font-mono text-[9px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> PCI SECURE GATEWAY
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
