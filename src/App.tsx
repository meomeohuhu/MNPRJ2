import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft, Bell, CalendarDays, Check, CheckCircle2, ChevronRight, CircleUserRound,
  Clock3, DoorOpen, Filter, MapPin, Monitor, Pencil, RefreshCw, Search, ShieldCheck,
  Sparkles, Trash2, UserRound, Users, Wifi, X, Zap
} from "lucide-react";
import { requestNotificationPermission, scheduleBookingReminders } from "./lib/notifications";
import { useBookingStore } from "./store/useBookingStore";
import { BUILDINGS, EQUIPMENT, SLOT_DEFINITIONS, type AuthUser, type AvailabilitySlot, type Booking, type Equipment, type Room, type RoomFilters } from "./types";
import logoVku from "../logo-vku.jpg";

type View = "explore" | "bookings";

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const dateOptions = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + index); return dateKey(date); });
const equipmentLabel: Record<Equipment, string> = { Projector: "Máy chiếu", Whiteboard: "Bảng trắng", "High-spec PC": "Máy tính mạnh", AC: "Điều hòa" };
const isValidBooking = (booking: Partial<Booking>): booking is Booking => Boolean(booking.id && booking.roomName && booking.bookingDate && booking.slotLabel && booking.status);
const normalizeDateInput = (date: string) => String(date || "").slice(0, 10);
const formatDate = (date: string) => {
  const normalized = normalizeDateInput(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return "Chưa rõ ngày";
  const value = new Date(`${normalized}T12:00:00`);
  return Number.isNaN(value.getTime()) ? "Chưa rõ ngày" : new Intl.DateTimeFormat("vi-VN", { weekday: "short", month: "short", day: "numeric" }).format(value);
};
const formatFloor = (floor: string) => String(floor || "").toLowerCase().startsWith("tầng") ? floor : `Tầng ${floor || "?"}`;
function statusLabel(status: Room["status"]) { return status === "OCCUPIED" ? "Đang sử dụng" : "Đang trống"; }

function App() {
  const { authUser, profile, rooms, filters, availability, bookings, selectedDate, isLoading, error, setStudentProfile, signOut, setFilters, setSelectedDate, fetchRooms, fetchAvailability, fetchBookings, createBooking, cancelBooking, checkInBooking, loginWithGoogle } = useBookingStore();
  const [view, setView] = useState<View>("explore");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [passBooking, setPassBooking] = useState<Booking | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { void fetchRooms(); }, [fetchRooms, filters]);
  useEffect(() => { if (profile) void fetchBookings(); }, [profile, fetchBookings]);
  useEffect(() => { scheduleBookingReminders(bookings); }, [bookings]);
  useEffect(() => {
    const refresh = () => { void fetchRooms(); if (profile) void fetchBookings(); };
    const interval = window.setInterval(refresh, 15000);
    document.addEventListener("visibilitychange", refresh);
    const reminder = (event: Event) => setToast((event as CustomEvent<string>).detail);
    window.addEventListener("vku-reserve-reminder", reminder);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("vku-reserve-reminder", reminder); };
  }, [fetchRooms, fetchBookings, profile]);
  useEffect(() => { if (selectedRoom) void fetchAvailability(selectedRoom.id, selectedDate); }, [selectedRoom, selectedDate, fetchAvailability]);
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 5000); return () => window.clearTimeout(timeout); }, [toast]);

  const safeBookings = Array.isArray(bookings) ? bookings.filter(isValidBooking) : [];
  const selectedSlots: AvailabilitySlot[] = selectedRoom ? availability[`${selectedRoom.id}:${selectedDate}`] ?? SLOT_DEFINITIONS.map((slot) => ({ ...slot, booked: false })) : [];
  const selectedBooking = selectedRoom && selectedSlot ? selectedSlots.find((slot) => slot.id === selectedSlot) : undefined;
  const selectRoom = (room: Room) => { setSelectedRoom(room); setSelectedSlot(null); };
  const changeView = (nextView: View) => {
    setSelectedRoom(null);
    setSelectedSlot(null);
    setConfirmOpen(false);
    setView(nextView);
  };
  const beginBooking = () => {
    if (!authUser) { setAuthOpen(true); return; }
    if (!profile?.studentId) { setProfileOpen(true); return; }
    if (!selectedRoom || !selectedBooking || selectedBooking.booked) return;
    setConfirmOpen(true);
  };
  const submitBooking = async () => {
    if (!selectedRoom || !selectedSlot) return;
    try {
      const booking = await createBooking(selectedRoom.id, selectedDate, selectedSlot);
      await requestNotificationPermission();
      setConfirmOpen(false); setSelectedSlot(null); setPassBooking(booking); setToast("Đã đặt phòng thành công. Nhắc lịch đã được lên lịch.");
    } catch (bookingError) {
      setConfirmOpen(false);
      const conflict = bookingError instanceof Error && "status" in bookingError && (bookingError as Error & { status?: number }).status === 409;
      setToast(conflict ? "Slot này vừa được người khác đặt." : bookingError instanceof Error ? bookingError.message : "Không thể đặt phòng.");
      if (selectedRoom) void fetchAvailability(selectedRoom.id, selectedDate);
    }
  };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><img src={logoVku} alt="Logo VKU" /><div><strong>VKU Reserve</strong><span>Đặt phòng học và phòng máy VKU</span></div></div>
      <div className="top-actions"><span className="online-pill"><span /> Trạng thái trực tuyến</span><button className="profile-button" onClick={() => authUser ? setProfileOpen(true) : setAuthOpen(true)}><CircleUserRound size={18} />{authUser ? authUser.name : "Đăng nhập Google"}</button></div>
    </header>
    <main>
      <section className="hero"><div><span className="eyebrow"><Sparkles size={15} /> Đặt phòng trong khuôn viên VKU</span><h1>Tìm không gian<br /><em>tập trung của bạn.</em></h1><p>Kiểm tra tình trạng phòng, đặt phòng học hoặc phòng máy và sử dụng mã QR để check-in nhanh chóng.</p></div><div className="hero-card"><div className="hero-card-icon"><ShieldCheck size={24} /></div><strong>Chống trùng lịch</strong><span>Mọi lượt đặt đều được máy chủ kiểm tra theo thời gian thực.</span></div></section>
      <nav className="view-tabs"><button type="button" className={view === "explore" ? "active" : ""} onClick={() => changeView("explore")}><MapPin size={17} /> Khám phá phòng</button><button type="button" className={view === "bookings" ? "active" : ""} onClick={() => changeView("bookings")}><CalendarDays size={17} /> Lịch của tôi <span className="tab-count">{safeBookings.filter((booking) => booking.status !== "CANCELLED").length}</span></button></nav>
      {view === "explore" ? <ExploreView rooms={rooms} filters={filters} isLoading={isLoading} error={error} showFilters={showFilters} setShowFilters={setShowFilters} setFilters={setFilters} onSelect={selectRoom} onRetry={() => void fetchRooms()} /> : <BookingsView bookings={safeBookings} isSignedIn={Boolean(authUser)} onSignIn={() => setAuthOpen(true)} onCancel={async (id) => { await cancelBooking(id); setToast("Đã hủy đặt phòng."); }} onCheckIn={async (id) => { await checkInBooking(id); setToast("Check-in thành công."); }} onShowPass={setPassBooking} />}
    </main>
    {selectedRoom && view === "explore" && <RoomPanel room={selectedRoom} date={selectedDate} setDate={setSelectedDate} slots={selectedSlots} selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot} onClose={() => setSelectedRoom(null)} onBook={beginBooking} />}
    {authOpen && <AuthModal onClose={() => setAuthOpen(false)} onGoogle={async (idToken) => { const result = await loginWithGoogle(idToken); setAuthOpen(false); setToast(result.isNewUser ? "Đăng ký Google thành công." : "Chào mừng bạn quay lại."); if (!useBookingStore.getState().profile?.studentId) setProfileOpen(true); }} />}
    {profileOpen && <ProfileModal profile={profile} authUser={authUser} onClose={() => setProfileOpen(false)} onSave={(next) => { setStudentProfile(next); setProfileOpen(false); setToast("Đã lưu thông tin sinh viên."); }} onSignOut={() => { signOut(); setProfileOpen(false); setToast("Đã đăng xuất."); }} />}
    {confirmOpen && selectedRoom && selectedBooking && <ConfirmModal room={selectedRoom} date={selectedDate} slot={selectedBooking} profile={profile} onClose={() => setConfirmOpen(false)} onConfirm={() => void submitBooking()} />}
    {passBooking && <PassModal booking={passBooking} onClose={() => setPassBooking(null)} />}
    {toast && <div className="toast"><Bell size={17} />{toast}<button onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>;
}

function ExploreView({ rooms, filters, isLoading, error, showFilters, setShowFilters, setFilters, onSelect, onRetry }: { rooms: Room[]; filters: RoomFilters; isLoading: boolean; error: string | null; showFilters: boolean; setShowFilters: (value: boolean) => void; setFilters: (filters: Partial<RoomFilters>) => void; onSelect: (room: Room) => void; onRetry: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({ count: rooms.length, getScrollElement: () => scrollRef.current, estimateSize: () => 315, overscan: 5 });
  const toggleEquipment = (equipment: Equipment) => setFilters({ equipment: filters.equipment.includes(equipment) ? filters.equipment.filter((item) => item !== equipment) : [...filters.equipment, equipment] });
  return <section className="explore-section">
    <div className="section-heading"><div><span className="section-kicker">Khám phá khuôn viên</span><h2>Không gian học tập</h2><p>{rooms.length} phòng phù hợp với bộ lọc của bạn.</p></div><button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}><Filter size={17} /> Bộ lọc {filters.equipment.length || filters.building !== "ALL" ? <b>•</b> : null}</button></div>
    <div className="search-row"><label className="search-box"><Search size={19} /><input value={filters.search} onChange={(event) => setFilters({ search: event.target.value })} placeholder="Tìm phòng, tòa nhà hoặc thiết bị..." /></label><div className="building-chips"><button className={filters.building === "ALL" ? "selected" : ""} onClick={() => setFilters({ building: "ALL" })}>Tất cả</button>{BUILDINGS.map((building) => <button key={building} className={filters.building === building ? "selected" : ""} onClick={() => setFilters({ building })}>Tòa {building}</button>)}</div></div>
    {showFilters && <div className="filter-panel"><label>Sức chứa tối thiểu <span>{filters.minCapacity} chỗ</span><input type="range" min="2" max="20" value={filters.minCapacity} onChange={(event) => setFilters({ minCapacity: Number(event.target.value) })} /></label><div><span className="filter-label">Thiết bị</span><div className="equipment-chips">{EQUIPMENT.map((equipment) => <button key={equipment} className={filters.equipment.includes(equipment) ? "selected" : ""} onClick={() => toggleEquipment(equipment)}>{equipmentLabel[equipment]}</button>)}</div></div></div>}
    {error && <div className="error-banner"><Wifi size={17} /><span>{error}. Hãy kiểm tra Express API và PostgreSQL đang chạy.</span><button onClick={onRetry}><RefreshCw size={16} /> Thử lại</button></div>}
    <div className="room-list" ref={scrollRef}>{isLoading && !rooms.length ? <div className="loading-state"><RefreshCw className="spin" /> Đang tải danh sách phòng...</div> : rooms.length ? <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>{virtualizer.getVirtualItems().map((item) => { const room = rooms[item.index]; return <div key={room.id} ref={virtualizer.measureElement} data-index={item.index} className="virtual-row" style={{ transform: `translateY(${item.start}px)` }}><RoomCard room={room} onSelect={onSelect} /></div>; })}</div> : <div className="empty-state"><DoorOpen size={28} /><strong>Không tìm thấy phòng</strong><span>Hãy thử nới lỏng một vài bộ lọc.</span></div>}</div>
  </section>;
}

function RoomCard({ room, onSelect }: { room: Room; onSelect: (room: Room) => void }) {
  return <article className="room-card" onClick={() => onSelect(room)}><div className="room-photo"><img src={room.photoUrl} alt={room.name} loading="lazy" /><span className={`status-badge ${room.status.toLowerCase()}`}><span />{statusLabel(room.status)}</span><span className="building-badge">Tòa {room.building}</span></div><div className="room-card-body"><div className="room-title"><div><span className="room-location">{formatFloor(room.floor)} · Tòa {room.building}</span><h3>{room.name}</h3></div><ChevronRight size={19} /></div><div className="room-meta"><span><Users size={16} /> Tối đa {room.capacity} người</span><span><Monitor size={16} /> {room.equipment.length} tiện ích</span></div><div className="equipment-row">{room.equipment.slice(0, 3).map((equipment) => <span key={equipment}>{equipmentLabel[equipment]}</span>)}{room.equipment.length > 3 && <span>+{room.equipment.length - 3}</span>}</div></div></article>;
}

function RoomPanel({ room, date, setDate, slots, selectedSlot, setSelectedSlot, onClose, onBook }: { room: Room; date: string; setDate: (date: string) => void; slots: AvailabilitySlot[]; selectedSlot: string | null; setSelectedSlot: (id: string | null) => void; onClose: () => void; onBook: () => void }) {
  return <div className="side-overlay" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><aside className="room-panel"><button className="close-button" onClick={onClose}><X size={19} /></button><div className="panel-photo"><img src={room.photoUrl} alt={room.name} /><span className={`status-badge ${room.status.toLowerCase()}`}><span />{statusLabel(room.status)}</span></div><div className="panel-content"><span className="room-location">{formatFloor(room.floor)} · Tòa {room.building}</span><h2>{room.name}</h2><div className="large-meta"><span><Users size={17} />{room.capacity} chỗ ngồi</span><span><Monitor size={17} />{room.equipment.length} tiện ích</span></div><div className="panel-equipment">{room.equipment.map((equipment) => <span key={equipment}>{equipmentLabel[equipment]}</span>)}</div><div className="divider" /><div className="slot-header"><div><span className="section-kicker">Chọn thời gian</span><h3>Bạn muốn học lúc nào?</h3></div><Clock3 size={20} /></div><div className="date-strip">{dateOptions.map((item) => <button key={item} className={date === item ? "selected" : ""} onClick={() => { setDate(item); setSelectedSlot(null); }}><b>{new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(new Date(`${item}T12:00:00`))}</b><strong>{new Date(`${item}T12:00:00`).getDate()}</strong></button>)}</div><div className="slot-grid">{slots.map((slot) => <button key={slot.id} disabled={slot.booked} className={`${selectedSlot === slot.id ? "selected" : ""} ${slot.booked ? "booked" : ""}`} onClick={() => setSelectedSlot(slot.id)}><span>{slot.label}</span><small>{slot.booked ? "Đã có người đặt" : "Còn trống"}</small></button>)}</div><button className="primary-action book-action" disabled={!selectedSlot || slots.find((slot) => slot.id === selectedSlot)?.booked} onClick={onBook}>Đặt phòng này <ArrowLeft size={17} className="turn-icon" /></button></div></aside></div>;
}

function BookingsView({ bookings, isSignedIn, onSignIn, onCancel, onCheckIn, onShowPass }: { bookings: Booking[]; isSignedIn: boolean; onSignIn: () => void; onCancel: (id: string) => Promise<void>; onCheckIn: (id: string) => Promise<void>; onShowPass: (booking: Booking) => void }) {
  const active = bookings.filter((booking) => booking.status !== "CANCELLED");
  if (!isSignedIn) return <section className="bookings-section"><div className="empty-bookings"><CircleUserRound size={34} /><h3>Đăng nhập để xem lịch</h3><p>Đăng nhập Google để quản lý các lượt đặt phòng của bạn.</p><button className="primary-action" onClick={onSignIn}>Đăng nhập Google</button></div></section>;
  return <section className="bookings-section"><div className="section-heading"><div><span className="section-kicker">Lịch học của bạn</span><h2>Lịch đã đặt</h2><p>Lưu mã QR và check-in ngay trên điện thoại.</p></div></div>{active.length ? <div className="booking-list">{active.map((booking) => <BookingCard key={booking.id} booking={booking} onCancel={onCancel} onCheckIn={onCheckIn} onShowPass={onShowPass} />)}</div> : <div className="empty-bookings"><CalendarDays size={34} /><h3>Chưa có lượt đặt phòng</h3><p>Chọn một phòng và khung giờ để bắt đầu lịch học.</p></div>}</section>;
}

function BookingCard({ booking, onCancel, onCheckIn, onShowPass }: { booking: Booking; onCancel: (id: string) => Promise<void>; onCheckIn: (id: string) => Promise<void>; onShowPass: (booking: Booking) => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } finally { setBusy(false); } };
  return <article className="booking-card"><div className="booking-accent" /><div className="booking-main"><div className="booking-top"><div><span className="room-location">Tòa {booking.roomBuilding} · {formatFloor(booking.roomFloor)}</span><h3>{booking.roomName}</h3></div><span className={`booking-status ${booking.status.toLowerCase()}`}>{booking.status === "CHECKED_IN" ? "Đã check-in" : "Đã xác nhận"}</span></div><div className="booking-details"><span><CalendarDays size={16} />{formatDate(booking.bookingDate)}</span><span><Clock3 size={16} />{booking.slotLabel}</span><span><MapPin size={16} />Tòa {booking.roomBuilding}</span></div><div className="booking-actions"><button className="outline-action" onClick={() => onShowPass(booking)}><ShieldCheck size={16} /> Xem mã QR</button>{booking.status === "BOOKED" && <button className="primary-small" disabled={busy} onClick={() => void run(() => onCheckIn(booking.id))}><Check size={16} /> Check-in</button>}<button className="danger-small" disabled={busy} onClick={() => void run(() => onCancel(booking.id))}><Trash2 size={16} /> Hủy</button></div></div></article>;
}

function ProfileModal({ profile, authUser, onClose, onSave, onSignOut }: { profile: { name: string; studentId: string } | null; authUser: AuthUser | null; onClose: () => void; onSave: (profile: { name: string; studentId: string }) => void; onSignOut: () => void }) {
  const [name, setName] = useState(profile?.name ?? ""); const [studentId, setStudentId] = useState(profile?.studentId ?? "");
  return <Modal onClose={onClose}><div className="modal-icon"><UserRound size={22} /></div><span className="section-kicker">Thông tin sinh viên</span><h2>Hồ sơ của bạn</h2><p className="modal-copy">Đã đăng nhập bằng <strong>{authUser?.email}</strong>. Nhập MSSV để gắn thông tin vào mỗi lượt đặt phòng.</p><label>Họ và tên<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nguyễn Văn A" /></label><label>Mã số sinh viên<input value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="22IT001" /></label><div className="modal-actions"><button className="secondary-action" onClick={onClose}>Đóng</button><button className="danger-small" onClick={onSignOut}>Đăng xuất</button><button className="primary-action" disabled={!name.trim() || !studentId.trim()} onClick={() => onSave({ name: name.trim(), studentId: studentId.trim() })}><Check size={17} /> Lưu hồ sơ</button></div></Modal>;
}

declare global { interface Window { google?: { accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: Record<string, string | number>) => void; cancel?: () => void } } }; } }

function AuthModal({ onClose, onGoogle }: { onClose: () => void; onGoogle: (idToken: string) => Promise<void> }) {
  const buttonRef = useRef<HTMLDivElement>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null); const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  useEffect(() => {
    if (!clientId || !buttonRef.current) return;
    const render = () => { if (!window.google || !buttonRef.current) return; window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => { setLoading(true); void onGoogle(response.credential).catch((reason) => setError(reason instanceof Error ? reason.message : "Đăng nhập Google thất bại.")).finally(() => setLoading(false)); } }); buttonRef.current.innerHTML = ""; window.google.accounts.id.renderButton(buttonRef.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "pill", width: 320 }); };
    if (window.google) { render(); return; }
    let attempts = 0; const interval = window.setInterval(() => { attempts += 1; if (window.google) { window.clearInterval(interval); render(); } if (attempts >= 30) window.clearInterval(interval); }, 300);
    return () => window.clearInterval(interval);
  }, [clientId, onGoogle]);
  return <Modal onClose={onClose}><div className="auth-brand"><div className="modal-icon"><ShieldCheck size={22} /></div><span className="section-kicker">Tài khoản VKU Reserve</span><h2>Chào mừng bạn đến<br /><em>không gian học tập.</em></h2><p className="modal-copy">Đăng ký hoặc đăng nhập an toàn bằng tài khoản Google. Lịch đặt phòng của bạn sẽ được đồng bộ trên các thiết bị.</p></div>{clientId ? <div className="google-button-wrap"><div ref={buttonRef} />{loading && <span className="auth-loading"><RefreshCw className="spin" size={16} /> Đang đăng nhập...</span>}</div> : <div className="config-warning"><Zap size={17} /><span>Hãy thêm <code>VITE_GOOGLE_CLIENT_ID</code> vào file môi trường để bật đăng nhập Google.</span></div>}{error && <div className="error-banner compact">{error}</div>}<div className="auth-note"><ShieldCheck size={15} /> Mật khẩu Google không được lưu trên VKU Reserve.</div></Modal>;
}

function ConfirmModal({ room, date, slot, profile, onClose, onConfirm }: { room: Room; date: string; slot: { label: string }; profile: { name: string; studentId: string } | null; onClose: () => void; onConfirm: () => void }) {
  return <Modal onClose={onClose}><div className="modal-icon success"><CheckCircle2 size={22} /></div><span className="section-kicker">Sắp hoàn tất</span><h2>Xác nhận đặt phòng</h2><div className="confirm-summary"><strong>{room.name}</strong><span>{formatDate(date)} · {slot.label}</span><span>{profile?.name} · {profile?.studentId}</span></div><p className="modal-copy">Sau khi xác nhận, hệ thống sẽ tạo mã đặt phòng và mã QR riêng cho bạn.</p><div className="modal-actions"><button className="secondary-action" onClick={onClose}>Quay lại</button><button className="primary-action" onClick={onConfirm}><ShieldCheck size={17} /> Xác nhận</button></div></Modal>;
}

function PassModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard?.writeText(booking.passCode); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  return <Modal onClose={onClose}><div className="pass-heading"><div className="modal-icon success"><Check size={22} /></div><div><span className="section-kicker">Đặt phòng thành công</span><h2>Vé đặt phòng của bạn</h2></div></div><div className="qr-wrap"><QRCodeSVG value={`VKU-RESERVE:${booking.passCode}:${booking.id}`} size={190} bgColor="#ffffff" fgColor="#173b30" includeMargin /></div><div className="pass-code"><span>MÃ ĐẶT PHÒNG</span><strong>{booking.passCode}</strong><button onClick={() => void copy()}>{copied ? <Check size={17} /> : <Pencil size={17} />}</button></div><div className="pass-info"><span><DoorOpen size={16} />{booking.roomName}</span><span><CalendarDays size={16} />{formatDate(booking.bookingDate)} · {booking.slotLabel}</span></div><p className="modal-copy centered"><Bell size={15} /> Nhắc check-in trước 15 phút đã được lên lịch.</p><button className="primary-action full-width" onClick={onClose}>Hoàn tất</button></Modal>;
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal-card"><button className="close-button" onClick={onClose}><X size={19} /></button>{children}</div></div>; }

export default App;
