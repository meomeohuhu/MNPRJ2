import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cancelBooking, checkInBooking, createBooking, getAvailability, getBookings, getRooms, loginWithGoogle, setApiToken, updateAuthProfile } from "../lib/api";
import { localDateKey } from "../lib/dates";
import { scheduleBookingReminder } from "../lib/notifications";
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
  setFilters: (filters: Partial<RoomFilters>) => void;
  setSelectedDate: (date: string) => void;
  setStudentProfile: (profile: StudentProfile) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => void;
  fetchRooms: () => Promise<void>;
  fetchAvailability: (roomId: string, date: string) => Promise<void>;
  fetchBookings: () => Promise<void>;
  createBooking: (roomId: string, bookingDate: string, slotId: string) => Promise<Booking>;
  cancelBooking: (id: string) => Promise<void>;
  checkInBooking: (id: string) => Promise<void>;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

export const useBookingStore = create<BookingState>()(persist((set, get) => ({
  authUser: null,
  accessToken: null,
  profile: null,
  rooms: [],
  filters: defaultFilters,
  availability: {},
  bookings: [],
  selectedDate: localDateKey(today),
  isLoading: false,
  error: null,

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
  setSelectedDate: (selectedDate) => set({ selectedDate }),

  setStudentProfile: async (profile) => {
    const updated = await updateAuthProfile(profile);
    set({ profile: { name: updated.name, studentId: updated.studentId ?? profile.studentId }, authUser: updated, error: null });
  },

  loginWithGoogle: async (idToken) => {
    const result = await loginWithGoogle(idToken);
    setApiToken(result.token);
    set({
      accessToken: result.token,
      authUser: result.user,
      profile: { name: result.user.name, studentId: result.user.studentId ?? "" },
      error: null
    });
  },

  signOut: () => {
    setApiToken(null);
    set({ accessToken: null, authUser: null, profile: null, bookings: [], availability: {} });
  },

  fetchRooms: async () => {
    set({ isLoading: true, error: null });
    try {
      const rooms = await getRooms(get().filters);
      set({ rooms, isLoading: false });
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "Không tải được danh sách phòng" });
    }
  },

  fetchAvailability: async (roomId, date) => {
    try {
      const slots = await getAvailability(roomId, date);
      set((state) => ({ availability: { ...state.availability, [`${roomId}:${date}`]: slots } }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Không tải được lịch phòng" });
    }
  },

  fetchBookings: async () => {
    if (!get().authUser) return;
    try {
      const bookings = await getBookings();
      set({ bookings, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Không tải được lịch đặt phòng" });
    }
  },

  createBooking: async (roomId, bookingDate, slotId) => {
    const booking = await createBooking({ roomId, bookingDate, slotId });
    await scheduleBookingReminder(booking).catch(() => undefined);
    set((state) => ({ bookings: [booking, ...state.bookings], error: null }));
    await get().fetchAvailability(roomId, bookingDate);
    await get().fetchRooms();
    return booking;
  },

  cancelBooking: async (id) => {
    const booking = await cancelBooking(id);
    set((state) => ({ bookings: state.bookings.map((item) => item.id === id ? booking : item) }));
    await get().fetchRooms();
  },

  checkInBooking: async (id) => {
    const booking = await checkInBooking(id);
    set((state) => ({ bookings: state.bookings.map((item) => item.id === id ? booking : item) }));
  }
}), {
  name: "vku-reserve-mobile",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    accessToken: state.accessToken,
    authUser: state.authUser,
    profile: state.profile,
    filters: state.filters,
    bookings: state.bookings
  }),
  onRehydrateStorage: () => (state) => {
    setApiToken(state?.accessToken ?? null);
  }
}));
