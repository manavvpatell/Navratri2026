/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";

export default function NavratriBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#FAF6F0]">
      {/* Warm Soft Indian Festive Sunrise Glows */}
      <div className="absolute top-0 left-1/4 w-[45rem] h-[45rem] bg-orange-100/40 rounded-full blur-[140px] -translate-y-1/2" />
      <div className="absolute bottom-1/4 right-1/4 w-[35rem] h-[35rem] bg-rose-50/50 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/12 w-[30rem] h-[30rem] bg-amber-50/50 rounded-full blur-[150px] translate-y-1/3" />

      {/* Decorative Circular Mandala Backdrop in Center of screen */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-12 opacity-[0.06] text-amber-900 pointer-events-none">
        <svg
          className="w-[50rem] h-[50rem] animate-[spin_120s_linear_infinite]"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="0.25" fill="none" />
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.2" strokeDasharray="1,1" fill="none" />
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.15" fill="none" />
          {Array.from({ length: 24 }).map((_, i) => (
            <path
              key={i}
              d="M50 50 Q58 35 50 15 Q42 35 50 50"
              transform={`rotate(${i * 15} 50 50)`}
              stroke="currentColor"
              strokeWidth="0.15"
              fill="none"
            />
          ))}
          {Array.from({ length: 48 }).map((_, i) => (
            <circle
              key={i}
              cx="50"
              cy="8"
              r="0.5"
              transform={`rotate(${i * 7.5} 50 50)`}
              fill="currentColor"
            />
          ))}
        </svg>
      </div>

      {/* Top Hanging Festive Paper Lanterns (Kandils) - Left and Right */}
      {/* Left Lantern Set */}
      <div className="absolute top-0 left-4 md:left-12 lg:left-20 xl:left-28 flex flex-col items-center">
        {/* String */}
        <div className="w-[1px] h-12 md:h-20 bg-amber-800/40" />
        {/* SVG Lantern */}
        <svg className="w-14 h-36 text-rose-500 drop-shadow-md" viewBox="0 0 60 120" fill="currentColor">
          {/* Diamond Central Star */}
          <path d="M30 10 L48 28 L30 46 L12 28 Z" fill="#D12E6B" />
          {/* Top Hanging band */}
          <path d="M18 10 H42 L30 2 Z" fill="#F59E0B" />
          {/* Decorative Triangles on Sides */}
          <polygon points="12,28 30,28 30,10" fill="#139D9E" opacity="0.8" />
          <polygon points="48,28 30,28 30,10" fill="#F59E0B" opacity="0.8" />
          <polygon points="12,28 30,28 30,46" fill="#F59E0B" opacity="0.8" />
          <polygon points="48,28 30,28 30,46" fill="#139D9E" opacity="0.8" />
          {/* Hanging tassels/tapes at bottom */}
          {Array.from({ length: 5 }).map((_, idx) => {
            const height = 40 + (idx % 2 === 0 ? 15 : 0);
            const xPos = 16 + idx * 7;
            const colors = ["#D12E6B", "#F59E0B", "#139D9E", "#D12E6B", "#F59E0B"];
            return (
              <rect
                key={idx}
                x={xPos}
                y="46"
                width="3"
                height={height}
                fill={colors[idx]}
                rx="1"
                opacity="0.9"
              />
            );
          })}
        </svg>
      </div>

      {/* Right Lantern Set */}
      <div className="absolute top-0 right-4 md:right-12 lg:right-20 xl:right-28 flex flex-col items-center">
        {/* String */}
        <div className="w-[1px] h-10 md:h-16 bg-amber-800/40" />
        {/* SVG Lantern */}
        <svg className="w-14 h-36 text-sky-500 drop-shadow-md" viewBox="0 0 60 120" fill="currentColor">
          {/* Diamond Central Star */}
          <path d="M30 10 L48 28 L30 46 L12 28 Z" fill="#139D9E" />
          {/* Top Hanging band */}
          <path d="M18 10 H42 L30 2 Z" fill="#D12E6B" />
          {/* Decorative Triangles on Sides */}
          <polygon points="12,28 30,28 30,10" fill="#F59E0B" opacity="0.8" />
          <polygon points="48,28 30,28 30,10" fill="#D12E6B" opacity="0.8" />
          <polygon points="12,28 30,28 30,46" fill="#D12E6B" opacity="0.8" />
          <polygon points="48,28 30,28 30,46" fill="#F59E0B" opacity="0.8" />
          {/* Hanging tassels/tapes at bottom */}
          {Array.from({ length: 5 }).map((_, idx) => {
            const height = 40 + (idx % 2 !== 0 ? 15 : 0);
            const xPos = 16 + idx * 7;
            const colors = ["#139D9E", "#F59E0B", "#D12E6B", "#139D9E", "#F59E0B"];
            return (
              <rect
                key={idx}
                x={xPos}
                y="46"
                width="3"
                height={height}
                fill={colors[idx]}
                rx="1"
                opacity="0.9"
              />
            );
          })}
        </svg>
      </div>

      {/* Beautiful Festive Bunting Flags Garland Arche across top */}
      <div className="absolute top-0 inset-x-0 h-10 flex justify-center pointer-events-none opacity-80 select-none">
        <svg className="w-full max-w-4xl h-12 text-amber-500/20" viewBox="0 0 800 40" fill="none">
          <path d="M0,0 Q400,30 800,0" stroke="#B45309" strokeWidth="0.5" strokeDasharray="1,2" />
          {Array.from({ length: 25 }).map((_, i) => {
            const progress = i / 24;
            const x = progress * 800;
            // Hanging curve equation: y = c * (1 - (2*t - 1)^2)
            const y = 30 * (progress) * (1 - progress) * 4;
            const colors = ["#D12E6B", "#F59E0B", "#139D9E", "#B45309"];
            const color = colors[i % colors.length];
            return (
              <polygon
                key={i}
                points={`${x-8},${y} ${x+8},${y} ${x},${y+14}`}
                fill={color}
                opacity="0.8"
              />
            );
          })}
        </svg>
      </div>

      {/* Repeating Marigold Garlands running across the top header margin */}
      <div className="absolute top-0 inset-x-0 h-6 flex justify-around select-none opacity-70">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="relative flex flex-col items-center">
            {/* Threaded golden marigold flowers */}
            <motion.div
              className="w-4 h-4 rounded-full bg-amber-400 shadow-sm border border-amber-500 flex items-center justify-center"
              animate={{
                scale: [1, 1.05, 1],
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 4 + (i % 3),
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 border border-orange-600" />
            </motion.div>
          </div>
        ))}
      </div>

      {/* Soft floating leaves and confetti in background */}
      <div className="absolute top-48 left-12 w-6 h-6 bg-rose-200/40 rounded-full blur-[2px] animate-pulse" />
      <div className="absolute top-1/3 right-16 w-8 h-8 bg-teal-150/40 rounded-full blur-[3px] animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-10 h-10 bg-amber-100/30 rounded-full blur-[4px] animate-bounce" />

      {/* Glowing Diya oil lamps sitting along page side boards */}
      <div className="absolute bottom-8 left-6 md:left-12 flex items-center gap-2">
        <div className="relative">
          {/* Flame element */}
          <motion.div
            className="absolute top-[-11px] left-[13px] w-2.5 h-4 bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 rounded-full blur-[1px] origin-bottom shadow-[0_0_10px_rgba(245,158,11,0.9)]"
            animate={{
              scaleY: [1, 1.2, 0.9, 1.1, 1],
              scaleX: [1, 0.8, 1.1, 0.9, 1],
              skewX: [0, 4, -4, 2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Diya clay pot */}
          <div className="w-9 h-5 bg-amber-800 rounded-b-xl border-t-2 border-amber-700 shadow-sm flex justify-center">
            <div className="w-6 h-1.5 bg-amber-900 rounded-full mt-[-2px]" />
          </div>
        </div>
        <p className="font-serif text-[10px] uppercase tracking-widest text-amber-800/45 font-semibold">Raas Garba 2026</p>
      </div>

      <div className="absolute bottom-8 right-6 md:right-12 flex items-center gap-2 flex-row-reverse">
        <div className="relative">
          <motion.div
            className="absolute top-[-11px] left-[13px] w-2.5 h-4 bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 rounded-full blur-[1px] origin-bottom shadow-[0_0_10px_rgba(245,158,11,0.9)]"
            animate={{
              scaleY: [1.1, 0.9, 1.2, 1.0, 1.1],
              scaleX: [0.9, 1.1, 0.8, 1.0, 0.9],
              skewX: [0, -3, 3, -1, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="w-9 h-5 bg-amber-800 rounded-b-xl border-t-2 border-amber-700 shadow-sm flex justify-center">
            <div className="w-6 h-1.5 bg-amber-900 rounded-full mt-[-2px]" />
          </div>
        </div>
        <p className="font-serif text-[10px] uppercase tracking-widest text-amber-800/45 font-semibold">Navratri Utsav</p>
      </div>
    </div>
  );
}
