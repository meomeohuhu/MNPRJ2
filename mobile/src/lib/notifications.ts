import * as Notifications from "expo-notifications";
import type { Booking } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function scheduleBookingReminder(booking: Booking) {
  if (booking.status === "CANCELLED") return;
  const start = new Date(`${booking.bookingDate}T${booking.slotStart}:00`).getTime();
  const triggerAt = start - 15 * 60 * 1000;
  if (Number.isNaN(triggerAt) || triggerAt <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "VKU Reserve",
      body: `Sắp tới giờ check-in ${booking.roomName} · ${booking.slotLabel}`,
      data: { bookingId: booking.id }
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(triggerAt) }
  });
}
