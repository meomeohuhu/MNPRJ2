import type { Booking } from "../types";

const reminderKey = "vku-reserve-reminders";
const timers = new Map<string, number>();

function readReminderIds(): string[] {
  try { return JSON.parse(localStorage.getItem(reminderKey) || "[]") as string[]; } catch { return []; }
}

function saveReminderId(id: string) {
  const ids = new Set(readReminderIds());
  ids.add(id);
  localStorage.setItem(reminderKey, JSON.stringify([...ids]));
}

function fireReminder(booking: Booking) {
  const body = `${booking.roomName} · ${booking.slotLabel} · ${booking.bookingDate}`;
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    new Notification("VKU Reserve · Check-in soon", { body, icon: "/vku-mark.svg", tag: booking.id });
  } else {
    window.dispatchEvent(new CustomEvent("vku-reserve-reminder", { detail: body }));
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === "undefined" || Notification.permission === "denied") return false;
  if (Notification.permission === "default") await Notification.requestPermission();
  return Notification.permission === "granted";
}

export function scheduleBookingReminder(booking: Booking) {
  if (booking.status === "CANCELLED") return;
  const start = new Date(`${booking.bookingDate}T${booking.slotStart}:00`).getTime();
  const delay = start - Date.now() - 15 * 60 * 1000;
  if (delay <= 0 || delay > 1000 * 60 * 60 * 24 * 8) return;
  window.clearTimeout(timers.get(booking.id));
  timers.set(booking.id, window.setTimeout(() => fireReminder(booking), delay));
  saveReminderId(booking.id);
}

export function scheduleBookingReminders(bookings: Booking[]) {
  bookings.forEach(scheduleBookingReminder);
}
