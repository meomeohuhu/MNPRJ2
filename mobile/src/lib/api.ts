import { Platform } from "react-native";
import type { AuthUser, AvailabilitySlot, Booking, Room, RoomFilters, StudentProfile } from "../types";

const fallbackApiBase = Platform.select({
  android: "http://10.0.2.2:3001/api",
  default: "http://127.0.0.1:3001/api"
});

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackApiBase ?? "http://127.0.0.1:3001/api";

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options?.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Yêu cầu thất bại (${response.status})`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return payload as T;
}

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export function getRooms(filters: RoomFilters) {
  const query = queryString({
    search: filters.search,
    building: filters.building === "ALL" ? undefined : filters.building,
    minCapacity: filters.minCapacity,
    equipment: filters.equipment.join(",")
  });
  return request<Room[]>(`/rooms${query ? `?${query}` : ""}`);
}

export function getAvailability(roomId: string, date: string) {
  return request<AvailabilitySlot[]>(`/rooms/${encodeURIComponent(roomId)}/availability?date=${date}`);
}

export function getBookings() {
  return request<Booking[]>("/bookings");
}

export function loginWithGoogle(idToken: string) {
  return request<{ token: string; user: AuthUser; isNewUser: boolean }>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken })
  });
}

export function updateAuthProfile(payload: StudentProfile) {
  return request<AuthUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function createBooking(payload: { roomId: string; bookingDate: string; slotId: string }) {
  return request<Booking>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function cancelBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function checkInBooking(id: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}/check-in`, { method: "POST" });
}
