import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cancelBooking, checkInBooking, createBooking, getAvailability, getBookings, getRooms, loginWithGoogle, updateAuthProfile } from "../lib/api";
import type { AuthUser, AvailabilitySlot, Booking, Room, RoomFilters, StudentProfile } from "../types";
import { defaultFilters } from "../types";

interface BookingState {
  authUser: AuthUser | null;
  accessToken: string | null;
  profile: StudentProfile | null;
  rooms: Room[];
  filters: RoomFilters;
  availability: Record<string, AvailabilitySlot[]>;
  bookings: Booking[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  setStudentProfile: (profile: StudentProfile) => void;
  loginWithGoogle: (idToken: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => void;
  clearSession: () => void;
  setFilters: (filters: Partial<RoomFilters>) => void;
  setSelectedDate: (date: string) => void;
  fetchRooms: () => Promise<void>;
  fetchAvailability: (roomId: string, date: string) => Promise<void>;
  fetchBookings: () => Promise<void>;
  createBooking: (roomId: string, bookingDate: string, slotId: string) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<void>;
  checkInBooking: (id: string) => Promise<void>;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const localDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function mergePersistedState(persisted: unknown, current: BookingState): BookingState {
  const saved = persisted && typeof persisted === "object" ? persisted as Partial<BookingState> : {};
  return {
    ...current,
    ...saved,
    rooms: current.rooms,
    availability: current.availability,
    isLoading: false,
    error: null,
    selectedDate: /^\d{4}-\d{2}-\d{2}$/.test(String(saved.selectedDate ?? "")) ? String(saved.selectedDate) : current.selectedDate,
    filters: {
      ...defaultFilters,
      ...(saved.filters && typeof saved.filters === "object" ? saved.filters : {}),
      equipment: Array.isArray(saved.filters?.equipment) ? saved.filters.equipment : []
    },
    bookings: Array.isArray(saved.bookings) ? saved.bookings : [],
    profile: saved.profile && typeof saved.profile === "object" ? saved.profile : null,
    authUser: saved.authUser && typeof saved.authUser === "object" ? saved.authUser : null,
    accessToken: typeof saved.accessToken === "string" ? saved.accessToken : localStorage.getItem("vku-auth-token")
  };
}

export const useBookingStore = create<BookingState>()(persist((set, get) => ({
  authUser: null,
  accessToken: localStorage.getItem("vku-auth-token"),
  profile: null,
  rooms: [],
  filters: defaultFilters,
  availability: {},
  bookings: [],
  selectedDate: localDateKey(today),
  isLoading: false,
  error: null,

  setStudentProfile: (profile) => {
    set((state) => ({ profile, authUser: state.authUser ? { ...state.authUser, name: profile.name, studentId: profile.studentId } : state.authUser, error: null }));
    void updateAuthProfile(profile).catch(() => undefined);
  },
  loginWithGoogle: async (idToken) => {
    const result = await loginWithGoogle(idToken);
    localStorage.setItem("vku-auth-token", result.token);
    const profile = { name: result.user.name, studentId: result.user.studentId ?? "" };
    set({ authUser: result.user, accessToken: result.token, profile, error: null });
    return { isNewUser: result.isNewUser };
  },
  signOut: () => { localStorage.removeItem("vku-auth-token"); set({ authUser: null, accessToken: null, profile: null, bookings: [], availability: {} }); },
  clearSession: () => { localStorage.removeItem("vku-auth-token"); set({ authUser: null, accessToken: null, profile: null, bookings: [], availability: {} }); },
  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await getRooms(get().filters);
      set({ rooms, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Unable to load rooms" });
    }
  },

  fetchAvailability: async (roomId, date) => {
    try {
      const slots = await getAvailability(roomId, date);
      set((state) => ({ availability: { ...state.availability, [`${roomId}:${date}`]: slots } }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load availability" });
    }
  },

  fetchBookings: async () => {
    const profile = get().profile;
    if (!profile || !get().authUser) return;
    try {
      const bookings = await getBookings(profile.studentId);
      set({ bookings });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unable to load bookings" });
    }
  },

  createBooking: async (roomId, bookingDate, slotId) => {
    const profile = get().profile;
    if (!profile) throw new Error("Please add your student profile first");
    const booking = await createBooking({ roomId, bookingDate, slotId, studentName: profile.name, studentId: profile.studentId });
    set((state) => ({ bookings: [booking, ...state.bookings], error: null }));
    await get().fetchAvailability(roomId, bookingDate);
    await get().fetchRooms();
    return booking;
  },

  cancelBooking: async (id) => {
    const profile = get().profile;
    if (!profile) return;
    const booking = await cancelBooking(id, profile.studentId);
    set((state) => ({ bookings: state.bookings.map((item) => item.id === id ? booking : item) }));
    await get().fetchRooms();
  },

  checkInBooking: async (id) => {
    const profile = get().profile;
    if (!profile) return;
    const booking = await checkInBooking(id, profile.studentId);
    set((state) => ({ bookings: state.bookings.map((item) => item.id === id ? booking : item) }));
  }
}), {
  name: "vku-reserve-store",
  storage: createJSONStorage(() => localStorage),
  merge: mergePersistedState,
  partialize: (state) => ({ authUser: state.authUser, accessToken: state.accessToken, profile: state.profile, bookings: state.bookings, filters: state.filters })
}));
