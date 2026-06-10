/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface NavratriDay {
  day: number; // 1 to 9
  title: string; // e.g. "Pratipada"
  devi: string; // Name of Navadurga form, e.g. "Shailaputri"
  colorName: string; // Theme color name, e.g. "Orange"
  colorHex: string; // Hex code for primary
  colorBgHex: string; // Background shade
  date: string; // e.g. "October 11, 2026"
  price: number; // Ticket price in INR
  maxCapacity: number; // Total slots
  currentCapacity: number; // Slots booked
  artist: string; // Featured Dandiya/Garba performer
  venue: string; // Specific Hall/Ground name
}

export interface Booking {
  id: string; // Ticket short ID or unique ID
  name: string;
  email: string;
  phone: string;
  day: number; // 1-9
  ticketHash: string; // Unique cryptographic QR hash
  status: "pending" | "success" | "failed";
  amount: number;
  orderId: string;
  paymentId?: string;
  paymentSignature?: string;
  createdAt: string;
  isScanned?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "security";
  event: string; // e.g. "ORDER_CREATED"
  details: string; // detailed stringified JSON or text
  email: string; // email of initiator or "system" / "guest"
}

export interface UserNotification {
  id: string;
  title: string;
  body: string;
  type: "update" | "success" | "alert" | "info";
  timestamp: string;
  read: boolean;
}

export interface CapacityState {
  [day: number]: {
    maxCapacity: number;
    currentCapacity: number;
  };
}
