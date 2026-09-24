import type { AuthUser, AvailabilitySlot, Booking, Room, RoomFilters } from "../types";

const API_BASE = "/api";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("vku-auth-token");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.errors?.join(", ") || `Request failed (${response.status})`) as Error & { status?: number };
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

export function getBookings(studentId: string) {
  return request<Booking[]>(`/bookings?studentId=${encodeURIComponent(studentId)}`);
}

export function loginWithGoogle(idToken: string) {
  return request<{ token: string; user: AuthUser; isNewUser: boolean }>("/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });
}

export function updateAuthProfile(payload: { name: string; studentId: string }) {
  return request<AuthUser>("/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
}

export function createBooking(payload: { roomId: string; studentName: string; studentId: string; bookingDate: string; slotId: string }) {
  return request<Booking>("/bookings", { method: "POST", body: JSON.stringify(payload) });
}

export function cancelBooking(id: string, studentId: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}?studentId=${encodeURIComponent(studentId)}`, { method: "DELETE" });
}

export function checkInBooking(id: string, studentId: string) {
  return request<Booking>(`/bookings/${encodeURIComponent(id)}/check-in`, { method: "POST", body: JSON.stringify({ studentId }) });
}
