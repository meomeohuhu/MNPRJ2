# ReceiptWise — OCR Expense Tracker & Receipt Parser

Mini-Project 3 — Cross-Platform Mobile App Development (VKU)

ReceiptWise là ứng dụng Flutter Android giúp chụp hóa đơn, nhận diện chữ offline bằng Google ML Kit, phân tích số tiền/ngày/cửa hàng bằng Regex + heuristic, cho người dùng xác nhận rồi lưu giao dịch trong SQLite.

## Tính năng

- Dashboard tổng chi tiêu tháng/tuần, số hóa đơn và giao dịch gần đây.
- Camera preview, flash, tap-to-focus, chọn ảnh từ gallery và crop ảnh thật.
- OCR offline với `google_mlkit_text_recognition`.
- Receipt parser thuần Dart: định dạng tiền Việt, keyword total, ngày và merchant có điểm tin cậy.
- Review bắt buộc trước khi lưu, cho phép sửa trường OCR không chắc chắn.
- CRUD SQLite, tìm kiếm, lọc danh mục, ảnh gốc và thumbnail trong application documents.
- Donut chart và weekly bar chart được vẽ hoàn toàn bằng `CustomPainter`, có animation và tương tác.
- Light/dark theme, Material 3, giao diện tiếng Việt.

## Công nghệ

Flutter 3.x, Dart 3, Provider + ChangeNotifier, sqflite, camera, image_picker, image_cropper, google_mlkit_text_recognition, path_provider, image và intl.

## Kiến trúc

`presentation/features` chứa màn hình; `models` chứa entity; `services` chứa OCR/parser/database/file/aggregation; `repositories` cô lập SQLite; `providers` điều phối state; `core` chứa theme, constant, formatter và reusable widgets.

## Yêu cầu môi trường

- Flutter 3.x với Dart SDK >= 3.4.0.
- Android Studio/Android SDK, Android API phù hợp và thiết bị Android có camera hoặc gallery.
- Android minSdk 24.

## Chạy dự án

```bash
flutter pub get
dart format .
flutter analyze
flutter test
flutter run
flutter build apk --release
```

APK sau khi build nằm tại `build/app/outputs/flutter-apk/app-release.apk`.

## Test OCR offline

1. Mở Quét hóa đơn.
2. Chụp ảnh hoặc chọn ảnh hóa đơn từ gallery.
3. Crop đúng vùng hóa đơn rồi chờ ML Kit trả text.
4. Kiểm tra/sửa merchant, tổng tiền, ngày, danh mục ở màn hình Xác nhận hóa đơn.
5. Tắt Wi-Fi/4G sau khi app và model thiết bị đã được chuẩn bị, rồi thử lại bằng gallery.

Không có Firebase, cloud OCR, backend hay API key trong dự án.

## Render static site

Landing page nằm tại `deploy/render-site`. Cấu hình Render nằm ở `render.yaml`. Link APK/GitHub/Video đang để trạng thái chưa cấu hình vì chưa có release URL hoặc video thực tế; không sử dụng URL giả.

## Repository

ReceiptWise được upload tại branch [`receiptwise`](https://github.com/meomeohuhu/MNPRJ2/tree/receiptwise) của repository được cung cấp. Branch `main` hiện giữ project MNPRJ2 có sẵn và không bị ghi đè.

## Tác giả

Nguyễn Thành Thịnh — 23IT262
