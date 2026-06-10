/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Booking, AuditLog, UserNotification, NavratriDay } from "../types";
import { INITIAL_NAVRATRI_DAYS } from "./data";
import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class NavratriApiService {
  private baseUri = "/api";

  constructor() {
    // Prime local state with initial samples if missing
    if (!localStorage.getItem("navratri_days_cache")) {
      localStorage.setItem("navratri_days_cache", JSON.stringify(INITIAL_NAVRATRI_DAYS));
    }
    if (!localStorage.getItem("navratri_bookings_cache")) {
      localStorage.setItem("navratri_bookings_cache", JSON.stringify([]));
    }
  }

  // Auth Operations
  async register(name: string, email: string, password: string): Promise<any> {
    const res = await fetch(`${this.baseUri}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    if (res.ok) {
      return await res.json();
    } else {
      const errorData = await res.json();
      throw new Error(errorData.message || "Registration failed.");
    }
  }

  async login(email: string, password: string): Promise<any> {
    const res = await fetch(`${this.baseUri}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (res.ok) {
      return await res.json();
    } else {
      const errorData = await res.json();
      throw new Error(errorData.message || "Login failed.");
    }
  }

  async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      // Create local log
      await this.logActivity("AUTH_GOOGLE_SUCCESS", `Logged in successfully: ${credential.user.displayName}`, credential.user.email || "guest");
      return credential.user;
    } catch (err) {
      console.error("Auth: Google login failed", err);
      throw err;
    }
  }

  async loginSimulated(role: "admin" | "user"): Promise<any> {
    const mockUser = role === "admin" ? {
      uid: "mock-admin-id",
      email: "manavgameium@gmail.com",
      displayName: "Manav Organizer",
      photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=Manav"
    } : {
      uid: "mock-user-id",
      email: "guest@gmail.com",
      displayName: "Festive Guest",
      photoURL: "https://api.dicebear.com/7.x/initials/svg?seed=Festive"
    };

    try {
      // Log in database
      await this.logActivity("AUTH_SIMULATED_SUCCESS", `Logged in as Simulated ${role === "admin" ? "Admin" : "User"}`, mockUser.email);
    } catch (e) {
      console.warn("Could not log simulated auth activity to server.");
    }
    return mockUser;
  }

  async logout(): Promise<void> {
    try {
      const email = auth.currentUser?.email || "anonymous";
      await signOut(auth);
      await this.logActivity("AUTH_LOGOUT", `Logged out user`, email);
    } catch (err) {
      console.error("Auth: Logout failed", err);
    }
  }

  // Sync state helpers
  private getLocalDays(): NavratriDay[] {
    return JSON.parse(localStorage.getItem("navratri_days_cache") || "[]");
  }

  private saveLocalDays(days: NavratriDay[]) {
    localStorage.setItem("navratri_days_cache", JSON.stringify(days));
  }

  private getLocalBookings(): Booking[] {
    return JSON.parse(localStorage.getItem("navratri_bookings_cache") || "[]");
  }

  private saveLocalBooking(b: Booking) {
    const list = this.getLocalBookings();
    const idx = list.findIndex(item => item.id === b.id || item.orderId === b.orderId);
    if (idx !== -1) {
      list[idx] = b;
    } else {
      list.push(b);
    }
    localStorage.setItem("navratri_bookings_cache", JSON.stringify(list));
  }

  // Log activity helper that writes to backend REST API
  private async logActivity(action: string, details: string, email: string = "system") {
    try {
      await fetch(`${this.baseUri}/logs/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, details, email })
      });
    } catch (err) {
      console.warn("Could not save client audit log on server.", err);
    }
  }

  // --- PUBLIC API INTERFACES ---

  // Fetches current Garba capacity days
  async getDays(): Promise<NavratriDay[]> {
    try {
      const res = await fetch(`${this.baseUri}/days`);
      if (res.ok) {
        const data = await res.json();
        this.saveLocalDays(data);
        return data;
      }
    } catch (e) {
      console.warn("API: getDays failed, reverting to local backup caches.", e);
    }
    return this.getLocalDays();
  }

  // Initiates ticket order (Razorpay prep step)
  async createOrder(name: string, email: string, phone: string, day: number) {
    try {
      const res = await fetch(`${this.baseUri}/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, day })
      });
      if (res.ok) {
        return await res.json();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to generate checkout order.");
      }
    } catch (e: any) {
      console.warn("API: createOrder failed.", e);
      throw e;
    }
  }

  // Verifies payment transaction signature and locks ticket capacity
  async verifyPayment(orderId: string, paymentId?: string, signature?: string, status: "success" | "failed" = "success") {
    try {
      const res = await fetch(`${this.baseUri}/payment/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentId, signature, status })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.booking) {
          this.saveLocalBooking(data.booking);
        }
        return data;
      }
    } catch (e) {
      console.warn("API: verifyPayment failed.", e);
    }
    return { success: false, message: "Verify transaction failed." };
  }

  // Fetches audit logs from server
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res = await fetch(`${this.baseUri}/logs`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("API: getAuditLogs failed.", e);
    }
    return [];
  }

  // Fetches all bookings for administrator views
  async getAllBookings(): Promise<Booking[]> {
    try {
      const res = await fetch(`${this.baseUri}/bookings`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("API: getAllBookings failed.", e);
    }
    return [];
  }

  // Fetches administrative dashboards metrics
  async getDashboardStats() {
    try {
      const res = await fetch(`${this.baseUri}/stats`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("API: getDashboardStats failed.", e);
    }
    return {
      totalPayments: 0,
      totalRegistrations: 0,
      dailyStats: [],
      activeUsersSimulated: 5
    };
  }

  // Publishes custom notifications (push updates) from administrator
  async announceVenueUpdate(title: string, body: string, type: "update" | "success" | "alert" | "info" = "update") {
    try {
      const res = await fetch(`${this.baseUri}/notifications/announce`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, type })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("API: announceVenueUpdate failed.");
    }
    return { success: false, message: "Server connection failed." };
  }

  // Validates a ticket via its unique QR/Barcode hash
  async verifyQrAtGate(qrHash: string) {
    try {
      const res = await fetch(`${this.baseUri}/bookings/verify-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrHash })
      });
      if (res.ok || res.status === 400 || res.status === 404) {
        return await res.json();
      }
    } catch (e) {
      console.warn("API: verifyQrAtGate failed.", e);
    }
    return { success: false, message: "Gate Scanner: Server transaction timeout." };
  }

  // Listens to real-time events via Live Server SSE Stream
  connectSseStream(
    onMessage: (type: string, data: any) => void,
    onStatusChange?: (connected: boolean) => void
  ): { close: () => void } {
    let sse: EventSource | null = null;

    const establish = () => {
      try {
        sse = new EventSource("/api/stream");
        if (onStatusChange) onStatusChange(true);

        sse.onmessage = (event) => {
          try {
            const { type, data } = JSON.parse(event.data);
            onMessage(type, data);
          } catch (err) {
            console.error("SSE parse error", err);
          }
        };

        sse.onerror = () => {
          if (onStatusChange) onStatusChange(false);
          if (sse) sse.close();
        };
      } catch (err) {
        if (onStatusChange) onStatusChange(false);
      }
    };

    establish();

    return {
      close: () => {
        if (sse) sse.close();
      }
    };
  }
}

export const api = new NavratriApiService();
