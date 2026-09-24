export const BUILDINGS = ["A", "B", "C", "V"] as const;
export type Building = (typeof BUILDINGS)[number];

export const EQUIPMENT = ["Projector", "Whiteboard", "High-spec PC", "AC"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  Projector: "Máy chiếu",
  Whiteboard: "Bảng trắng",
  "High-spec PC": "Máy tính mạnh",
  AC: "Điều hòa"
};

export const SLOT_DEFINITIONS = [
  { id: "07:30-09:30", label: "07:30–09:30", start: "07:30", end: "09:30" },
  { id: "09:30-11:30", label: "09:30–11:30", start: "09:30", end: "11:30" },
  { id: "13:00-15:00", label: "13:00–15:00", start: "13:00", end: "15:00" },
  { id: "15:00-17:00", label: "15:00–17:00", start: "15:00", end: "17:00" }
] as const;

export type SlotDefinition = (typeof SLOT_DEFINITIONS)[number];

export interface Room {
  id: string;
  name: string;
  building: Building;
  floor: string;
  capacity: number;
  photoUrl: string;
  equipment: Equipment[];
  status: "AVAILABLE" | "OCCUPIED";
}

export type AvailabilitySlot = SlotDefinition & {
  booked: boolean;
  bookingId?: string;
};

export type BookingStatus = "BOOKED" | "CHECKED_IN" | "CANCELLED";

export interface Booking {
  id: string;
  passCode: string;
  roomId: string;
  roomName: string;
  roomBuilding: Building;
  roomFloor: string;
  studentName: string;
  studentId: string;
  bookingDate: string;
  slotId: string;
  slotLabel: string;
  slotStart: string;
  slotEnd: string;
  status: BookingStatus;
  createdAt: string;
  checkedInAt?: string | null;
}

export interface StudentProfile {
  name: string;
  studentId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  studentId?: string | null;
}

export interface RoomFilters {
  search: string;
  building: Building | "ALL";
  minCapacity: number;
  equipment: Equipment[];
}

export const defaultFilters: RoomFilters = {
  search: "",
  building: "ALL",
  minCapacity: 2,
  equipment: []
};
