import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { requestNotificationPermission } from "./src/lib/notifications";
import { useBookingStore } from "./src/store/useBookingStore";
import { BUILDINGS, EQUIPMENT, EQUIPMENT_LABELS, SLOT_DEFINITIONS, type AvailabilitySlot, type Booking, type Equipment, type Room, type RoomFilters, type StudentProfile } from "./src/types";
import { formatDate, nextSevenDays } from "./src/lib/dates";

WebBrowser.maybeCompleteAuthSession();

type Screen = "rooms" | "bookings";

const logo = require("./assets/logo-vku.jpg");
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const dateOptions = nextSevenDays();

export default function App() {
  const {
    authUser, profile, rooms, filters, availability, bookings, selectedDate, isLoading, error,
    setFilters, setSelectedDate, setStudentProfile, loginWithGoogle, signOut, fetchRooms,
    fetchAvailability, fetchBookings, createBooking, cancelBooking, checkInBooking
  } = useBookingStore();
  const [screen, setScreen] = useState<Screen>("rooms");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [passBooking, setPassBooking] = useState<Booking | null>(null);
  const [profileVisible, setProfileVisible] = useState(false);

  const [, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: googleClientId,
    webClientId: googleClientId,
    selectAccount: true
  });

  useEffect(() => { void fetchRooms(); }, [fetchRooms, filters]);
  useEffect(() => { if (authUser) void fetchBookings(); }, [authUser, fetchBookings]);
  useEffect(() => { if (selectedRoom) void fetchAvailability(selectedRoom.id, selectedDate); }, [selectedRoom, selectedDate, fetchAvailability]);
  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (!idToken) {
        Alert.alert("Google Login", "Google chưa trả về ID token. Hãy kiểm tra OAuth client.");
        return;
      }
      loginWithGoogle(idToken)
        .then(() => {
          const current = useBookingStore.getState().profile;
          if (!current?.studentId) setProfileVisible(true);
        })
        .catch((reason) => Alert.alert("Đăng nhập thất bại", reason instanceof Error ? reason.message : "Không thể đăng nhập Google."));
    }
  }, [response, loginWithGoogle]);

  const activeBookings = useMemo(() => bookings.filter((booking) => booking.status !== "CANCELLED"), [bookings]);
  const selectedSlots: AvailabilitySlot[] = selectedRoom ? availability[`${selectedRoom.id}:${selectedDate}`] ?? SLOT_DEFINITIONS.map((slot) => ({ ...slot, booked: false })) : [];

  async function startBooking() {
    if (!selectedRoom || !selectedSlot) return;
    if (!authUser) {
      Alert.alert("Cần đăng nhập", "Hãy đăng nhập Google trước khi đặt phòng.");
      return;
    }
    if (!profile?.studentId) {
      setProfileVisible(true);
      return;
    }
    const slot = selectedSlots.find((item) => item.id === selectedSlot);
    if (!slot || slot.booked) return;
    try {
      await requestNotificationPermission();
      const booking = await createBooking(selectedRoom.id, selectedDate, selectedSlot);
      setSelectedSlot(null);
      setSelectedRoom(null);
      setPassBooking(booking);
      setScreen("bookings");
    } catch (reason) {
      const status = reason instanceof Error && "status" in reason ? (reason as Error & { status?: number }).status : undefined;
      Alert.alert("Không thể đặt phòng", status === 409 ? "Slot này vừa được người khác đặt." : reason instanceof Error ? reason.message : "Hãy thử lại sau.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image source={logo} style={styles.logo} />
          <View>
            <Text style={styles.brandTitle}>VKU Reserve</Text>
            <Text style={styles.brandSub}>Đặt phòng học và phòng máy</Text>
          </View>
        </View>
        <Pressable style={styles.profileButton} onPress={() => authUser ? setProfileVisible(true) : googleClientId ? promptAsync() : Alert.alert("Thiếu cấu hình", "Thêm EXPO_PUBLIC_GOOGLE_CLIENT_ID trong mobile/.env")}>
          <Ionicons name={authUser ? "person-circle" : "logo-google"} size={20} color="#174a9c" />
          <Text style={styles.profileButtonText}>{authUser ? "Hồ sơ" : "Google"}</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <TabButton icon="business" label="Khám phá" active={screen === "rooms"} onPress={() => setScreen("rooms")} />
        <TabButton icon="calendar" label={`Lịch của tôi (${activeBookings.length})`} active={screen === "bookings"} onPress={() => setScreen("bookings")} />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {screen === "rooms" ? (
        <RoomsScreen rooms={rooms} isLoading={isLoading} filters={filters} setFilters={setFilters} onRefresh={fetchRooms} onSelect={(room) => { setSelectedRoom(room); setSelectedSlot(null); }} />
      ) : (
        <BookingsScreen
          authUserName={authUser?.name}
          bookings={activeBookings}
          onLogin={() => googleClientId ? promptAsync() : Alert.alert("Thiếu cấu hình", "Thêm EXPO_PUBLIC_GOOGLE_CLIENT_ID trong mobile/.env")}
          onShowPass={setPassBooking}
          onCancel={(id) => cancelBooking(id).catch((reason) => Alert.alert("Không thể hủy", reason instanceof Error ? reason.message : "Hãy thử lại."))}
          onCheckIn={(id) => checkInBooking(id).catch((reason) => Alert.alert("Không thể check-in", reason instanceof Error ? reason.message : "Hãy thử lại."))}
        />
      )}

      <RoomModal
        room={selectedRoom}
        selectedDate={selectedDate}
        slots={selectedSlots}
        selectedSlot={selectedSlot}
        onSetDate={(date) => { setSelectedDate(date); setSelectedSlot(null); }}
        onSetSlot={setSelectedSlot}
        onClose={() => setSelectedRoom(null)}
        onBook={startBooking}
      />

      <ProfileModal
        visible={profileVisible}
        profile={profile}
        email={authUser?.email}
        onClose={() => setProfileVisible(false)}
        onSave={(next) => setStudentProfile(next).then(() => setProfileVisible(false)).catch((reason) => Alert.alert("Không lưu được", reason instanceof Error ? reason.message : "Hãy thử lại."))}
        onSignOut={() => { signOut(); setProfileVisible(false); }}
      />

      <PassModal booking={passBooking} onClose={() => setPassBooking(null)} />
    </SafeAreaView>
  );
}

function TabButton({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.tabButton, active && styles.tabButtonActive]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={active ? "#fff" : "#57708f"} />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RoomsScreen({ rooms, isLoading, filters, setFilters, onRefresh, onSelect }: {
  rooms: Room[];
  isLoading: boolean;
  filters: RoomFilters;
  setFilters: (filters: Partial<RoomFilters>) => void;
  onRefresh: () => Promise<void>;
  onSelect: (room: Room) => void;
}) {
  const toggleEquipment = (equipment: Equipment) => {
    setFilters({ equipment: filters.equipment.includes(equipment) ? filters.equipment.filter((item) => item !== equipment) : [...filters.equipment, equipment] });
  };
  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      refreshing={isLoading}
      onRefresh={onRefresh}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.filters}>
          <Text style={styles.sectionKicker}>Khám phá khuôn viên</Text>
          <Text style={styles.screenTitle}>Không gian học tập</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#7c8ca5" />
            <TextInput value={filters.search} onChangeText={(search) => setFilters({ search })} placeholder="Tìm phòng, tòa hoặc thiết bị..." placeholderTextColor="#97a4b8" style={styles.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label="Tất cả" active={filters.building === "ALL"} onPress={() => setFilters({ building: "ALL" })} />
            {BUILDINGS.map((building) => <Chip key={building} label={`Tòa ${building}`} active={filters.building === building} onPress={() => setFilters({ building })} />)}
          </ScrollView>
          <Text style={styles.filterLabel}>Sức chứa tối thiểu: {filters.minCapacity} chỗ</Text>
          <View style={styles.capacityRow}>{[2, 6, 10, 16, 20].map((capacity) => <Chip key={capacity} label={`${capacity}+`} active={filters.minCapacity === capacity} onPress={() => setFilters({ minCapacity: capacity })} />)}</View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {EQUIPMENT.map((equipment) => <Chip key={equipment} label={EQUIPMENT_LABELS[equipment]} active={filters.equipment.includes(equipment)} onPress={() => toggleEquipment(equipment)} />)}
          </ScrollView>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="search" title={isLoading ? "Đang tải phòng..." : "Không tìm thấy phòng"} text="Thử thay đổi bộ lọc hoặc kéo xuống để tải lại." />}
      renderItem={({ item }) => <RoomCard room={item} onPress={() => onSelect(item)} />}
    />
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></Pressable>;
}

function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  return (
    <Pressable style={styles.roomCard} onPress={onPress}>
      <Image source={{ uri: room.photoUrl }} style={styles.roomImage} />
      <View style={styles.roomBody}>
        <View style={styles.rowBetween}>
          <View style={styles.flexOne}>
            <Text style={styles.roomMeta}>Tòa {room.building} · Tầng {room.floor}</Text>
            <Text style={styles.roomName}>{room.name}</Text>
          </View>
          <StatusPill status={room.status} />
        </View>
        <View style={styles.infoRow}>
          <Info icon="people" text={`${room.capacity} chỗ`} />
          <Info icon="hardware-chip" text={`${room.equipment.length} tiện ích`} />
        </View>
        <View style={styles.tagRow}>{room.equipment.slice(0, 3).map((item) => <Text key={item} style={styles.tag}>{EQUIPMENT_LABELS[item]}</Text>)}</View>
      </View>
    </Pressable>
  );
}

function StatusPill({ status }: { status: Room["status"] }) {
  const occupied = status === "OCCUPIED";
  return <Text style={[styles.statusPill, occupied && styles.statusPillBusy]}>{occupied ? "Đang sử dụng" : "Đang trống"}</Text>;
}

function Info({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.infoItem}><Ionicons name={icon} size={15} color="#174a9c" /><Text style={styles.infoText}>{text}</Text></View>;
}

function RoomModal({ room, selectedDate, slots, selectedSlot, onSetDate, onSetSlot, onClose, onBook }: {
  room: Room | null;
  selectedDate: string;
  slots: AvailabilitySlot[];
  selectedSlot: string | null;
  onSetDate: (date: string) => void;
  onSetSlot: (slotId: string | null) => void;
  onClose: () => void;
  onBook: () => void;
}) {
  if (!room) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.bottomSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.rowBetween}>
              <View style={styles.flexOne}>
                <Text style={styles.roomMeta}>Tòa {room.building} · Tầng {room.floor}</Text>
                <Text style={styles.sheetTitle}>{room.name}</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={onClose}><Ionicons name="close" size={22} color="#174a9c" /></Pressable>
            </View>
            <Image source={{ uri: room.photoUrl }} style={styles.sheetImage} />
            <View style={styles.tagRow}>{room.equipment.map((item) => <Text key={item} style={styles.tag}>{EQUIPMENT_LABELS[item]}</Text>)}</View>
            <Text style={styles.filterLabel}>Chọn ngày</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dateOptions.map((date) => <Chip key={date} label={formatDate(date)} active={selectedDate === date} onPress={() => onSetDate(date)} />)}</ScrollView>
            <Text style={styles.filterLabel}>Chọn khung giờ</Text>
            <View style={styles.slotGrid}>
              {slots.map((slot) => (
                <Pressable key={slot.id} disabled={slot.booked} style={[styles.slotButton, selectedSlot === slot.id && styles.slotButtonActive, slot.booked && styles.slotButtonDisabled]} onPress={() => onSetSlot(slot.id)}>
                  <Text style={[styles.slotText, selectedSlot === slot.id && styles.slotTextActive]}>{slot.label}</Text>
                  <Text style={styles.slotSub}>{slot.booked ? "Đã đặt" : "Còn trống"}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable disabled={!selectedSlot} style={[styles.primaryButton, !selectedSlot && styles.disabledButton]} onPress={onBook}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
            <Text style={styles.primaryText}>Đặt phòng này</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function BookingsScreen({ authUserName, bookings, onLogin, onShowPass, onCancel, onCheckIn }: {
  authUserName?: string;
  bookings: Booking[];
  onLogin: () => void;
  onShowPass: (booking: Booking) => void;
  onCancel: (id: string) => void;
  onCheckIn: (id: string) => void;
}) {
  if (!authUserName) return <EmptyState icon="person-circle" title="Đăng nhập để xem lịch" text="Dùng Google để đồng bộ booking trên các thiết bị." action="Đăng nhập Google" onAction={onLogin} />;
  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={<><Text style={styles.sectionKicker}>Lịch học của bạn</Text><Text style={styles.screenTitle}>Lịch đã đặt</Text></>}
      ListEmptyComponent={<EmptyState icon="calendar" title="Chưa có lượt đặt" text="Chọn một phòng và khung giờ để bắt đầu." />}
      renderItem={({ item }) => (
        <View style={styles.bookingCard}>
          <View style={styles.bookingStripe} />
          <View style={styles.bookingBody}>
            <View style={styles.rowBetween}>
              <View style={styles.flexOne}>
                <Text style={styles.roomMeta}>Tòa {item.roomBuilding} · Tầng {item.roomFloor}</Text>
                <Text style={styles.bookingTitle}>{item.roomName}</Text>
              </View>
              <Text style={styles.bookingStatus}>{item.status === "CHECKED_IN" ? "Đã check-in" : "Đã xác nhận"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Info icon="calendar" text={formatDate(item.bookingDate)} />
              <Info icon="time" text={item.slotLabel} />
            </View>
            <View style={styles.actionRow}>
              <Pressable style={styles.outlineButton} onPress={() => onShowPass(item)}><Text style={styles.outlineText}>QR</Text></Pressable>
              {item.status === "BOOKED" ? <Pressable style={styles.smallPrimary} onPress={() => onCheckIn(item.id)}><Text style={styles.smallPrimaryText}>Check-in</Text></Pressable> : null}
              <Pressable style={styles.dangerButton} onPress={() => onCancel(item.id)}><Text style={styles.dangerText}>Hủy</Text></Pressable>
            </View>
          </View>
        </View>
      )}
    />
  );
}

function ProfileModal({ visible, profile, email, onClose, onSave, onSignOut }: {
  visible: boolean;
  profile: StudentProfile | null;
  email?: string;
  onClose: () => void;
  onSave: (profile: StudentProfile) => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [studentId, setStudentId] = useState(profile?.studentId ?? "");
  useEffect(() => {
    setName(profile?.name ?? "");
    setStudentId(profile?.studentId ?? "");
  }, [profile, visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.sheetCompact}>
          <View style={styles.rowBetween}>
            <View style={styles.flexOne}>
              <Text style={styles.sectionKicker}>Thông tin sinh viên</Text>
              <Text style={styles.sheetTitle}>Hồ sơ của bạn</Text>
            </View>
            <Pressable style={styles.iconButton} onPress={onClose}><Ionicons name="close" size={22} color="#174a9c" /></Pressable>
          </View>
          <Text style={styles.helperText}>{email ? `Đăng nhập bằng ${email}` : "Chưa đăng nhập Google"}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Họ và tên" />
          <TextInput style={styles.input} value={studentId} onChangeText={setStudentId} placeholder="MSSV" autoCapitalize="characters" />
          <Pressable disabled={!name.trim() || !studentId.trim()} style={[styles.primaryButton, (!name.trim() || !studentId.trim()) && styles.disabledButton]} onPress={() => onSave({ name: name.trim(), studentId: studentId.trim() })}>
            <Ionicons name="save" size={17} color="#fff" />
            <Text style={styles.primaryText}>Lưu hồ sơ</Text>
          </Pressable>
          {email ? <Pressable style={styles.signOutButton} onPress={onSignOut}><Text style={styles.dangerText}>Đăng xuất</Text></Pressable> : null}
        </View>
      </View>
    </Modal>
  );
}

function PassModal({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  if (!booking) return null;
  const qrValue = `VKU-RESERVE:${booking.passCode}:${booking.id}`;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.qrCard}>
          <Text style={styles.sectionKicker}>Vé đặt phòng</Text>
          <Text style={styles.sheetTitle}>{booking.roomName}</Text>
          <View style={styles.qrBox}><QRCode value={qrValue} size={190} /></View>
          <Text style={styles.passCode}>{booking.passCode}</Text>
          <Text style={styles.helperText}>{formatDate(booking.bookingDate)} · {booking.slotLabel}</Text>
          <Pressable style={styles.primaryButton} onPress={() => Clipboard.setStringAsync(booking.passCode)}>
            <Ionicons name="copy" size={17} color="#fff" />
            <Text style={styles.primaryText}>Copy mã đặt phòng</Text>
          </Pressable>
          <Pressable style={styles.signOutButton} onPress={onClose}><Text style={styles.outlineText}>Đóng</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function EmptyState({ icon, title, text, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptyState}>
      {title.startsWith("Đang tải") ? <ActivityIndicator color="#174a9c" /> : <Ionicons name={icon} size={42} color="#174a9c" />}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {action && onAction ? <Pressable style={styles.primaryButton} onPress={onAction}><Text style={styles.primaryText}>{action}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fb" },
  header: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 44, height: 44, borderRadius: 8, backgroundColor: "#fff" },
  brandTitle: { color: "#133365", fontSize: 18, fontWeight: "900" },
  brandSub: { color: "#6e7f98", fontSize: 12, marginTop: 2 },
  profileButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 38, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe5f4" },
  profileButtonText: { color: "#174a9c", fontSize: 12, fontWeight: "800" },
  tabs: { marginHorizontal: 18, flexDirection: "row", gap: 8, padding: 5, backgroundColor: "#e7eef9", borderRadius: 14 },
  tabButton: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabButtonActive: { backgroundColor: "#174a9c" },
  tabText: { color: "#57708f", fontSize: 12, fontWeight: "800" },
  tabTextActive: { color: "#fff" },
  errorText: { margin: 18, padding: 12, borderRadius: 10, color: "#9b2c2c", backgroundColor: "#fff1f1", fontSize: 12 },
  listContent: { padding: 18, paddingBottom: 42 },
  filters: { gap: 12, marginBottom: 14 },
  sectionKicker: { color: "#d71920", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  screenTitle: { color: "#12376d", fontSize: 28, fontWeight: "900", marginBottom: 2 },
  searchBox: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dde6f5" },
  searchInput: { flex: 1, color: "#1b2f4d", fontSize: 14 },
  chipRow: { gap: 8, paddingRight: 18 },
  capacityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 999, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe5f4" },
  chipActive: { backgroundColor: "#174a9c", borderColor: "#174a9c" },
  chipText: { color: "#57708f", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#fff" },
  filterLabel: { marginTop: 8, color: "#253f66", fontSize: 13, fontWeight: "900" },
  roomCard: { marginBottom: 14, overflow: "hidden", borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dfe8f6" },
  roomImage: { width: "100%", height: 148, backgroundColor: "#dfe8f6" },
  roomBody: { padding: 14, gap: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  flexOne: { flex: 1 },
  roomMeta: { color: "#6b7f9c", fontSize: 12, fontWeight: "700" },
  roomName: { color: "#132f5d", fontSize: 20, fontWeight: "900", marginTop: 4 },
  statusPill: { color: "#174a9c", backgroundColor: "#edf4ff", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 10, fontWeight: "900" },
  statusPillBusy: { color: "#9f1d23", backgroundColor: "#fff0f0" },
  infoRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoText: { color: "#58708f", fontSize: 12, fontWeight: "700" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: { color: "#8a5b00", backgroundColor: "#fff2c6", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 11, fontWeight: "800" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(12,24,42,.38)", justifyContent: "flex-end" },
  bottomSheet: { maxHeight: "92%", padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#fff" },
  sheetCompact: { padding: 18, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: "#fff", gap: 12 },
  sheetTitle: { color: "#12376d", fontSize: 24, fontWeight: "900", marginTop: 3 },
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#edf4ff", alignItems: "center", justifyContent: "center" },
  sheetImage: { width: "100%", height: 160, borderRadius: 16, marginVertical: 14, backgroundColor: "#dfe8f6" },
  dateRow: { gap: 8, paddingVertical: 8 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  slotButton: { width: "47%", padding: 13, borderRadius: 14, borderWidth: 1, borderColor: "#dbe5f4", backgroundColor: "#fff" },
  slotButtonActive: { backgroundColor: "#174a9c", borderColor: "#174a9c" },
  slotButtonDisabled: { opacity: 0.45 },
  slotText: { color: "#163963", fontWeight: "900", fontSize: 13 },
  slotTextActive: { color: "#fff" },
  slotSub: { color: "#6f819b", fontSize: 11, marginTop: 4 },
  primaryButton: { minHeight: 48, marginTop: 14, borderRadius: 14, backgroundColor: "#174a9c", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  disabledButton: { opacity: 0.5 },
  primaryText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  emptyState: { flex: 1, minHeight: 360, alignItems: "center", justifyContent: "center", gap: 8, padding: 22 },
  emptyTitle: { color: "#12376d", fontSize: 20, fontWeight: "900", textAlign: "center" },
  emptyText: { color: "#72849b", fontSize: 13, textAlign: "center", lineHeight: 19 },
  bookingCard: { marginBottom: 13, flexDirection: "row", overflow: "hidden", borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dfe8f6" },
  bookingStripe: { width: 7, backgroundColor: "#d71920" },
  bookingBody: { flex: 1, padding: 15, gap: 12 },
  bookingTitle: { color: "#132f5d", fontSize: 18, fontWeight: "900", marginTop: 3 },
  bookingStatus: { color: "#174a9c", backgroundColor: "#edf4ff", paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, fontSize: 10, fontWeight: "900" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outlineButton: { minWidth: 70, height: 38, borderRadius: 11, borderWidth: 1, borderColor: "#174a9c", alignItems: "center", justifyContent: "center" },
  outlineText: { color: "#174a9c", fontWeight: "900" },
  smallPrimary: { height: 38, paddingHorizontal: 13, borderRadius: 11, backgroundColor: "#174a9c", alignItems: "center", justifyContent: "center" },
  smallPrimaryText: { color: "#fff", fontWeight: "900" },
  dangerButton: { height: 38, paddingHorizontal: 13, borderRadius: 11, backgroundColor: "#fff0f0", alignItems: "center", justifyContent: "center" },
  dangerText: { color: "#d71920", fontWeight: "900" },
  helperText: { color: "#6f819b", fontSize: 12, lineHeight: 18 },
  input: { minHeight: 46, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: "#dbe5f4", color: "#172d52", backgroundColor: "#fff" },
  signOutButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  qrCard: { margin: 22, padding: 20, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", gap: 10 },
  qrBox: { padding: 14, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#dbe5f4" },
  passCode: { color: "#d71920", fontSize: 23, fontWeight: "900", letterSpacing: 1 }
});
