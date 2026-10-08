# Technical Report — ReceiptWise

**Course:** Cross-Platform Mobile App Development (VKU)
**Mini-Project:** Mini-Project 3 – OCR Expense Tracker & Receipt Parser
**Student:** Nguyễn Thành Thịnh
**Student ID:** 23IT262
**Submission Date:** 08/10/2026

## 1. General Information & Deliverable Links

ReceiptWise là ứng dụng Flutter Android offline-first cho phép chụp/chọn hóa đơn, crop ảnh, nhận diện chữ bằng Google ML Kit on-device, phân tích total/date/merchant bằng Regex + heuristic, review trước khi lưu SQLite và xem analytics bằng CustomPainter.

- Repository: [GitHub branch receiptwise](https://github.com/meomeohuhu/MNPRJ2/tree/receiptwise). Branch `main` của repository được giữ nguyên vì đang chứa project MNPRJ2 khác.
- APK: chưa build được trong môi trường hiện tại vì Flutter SDK chưa được cài/đưa vào PATH.
- Render static site: source đã chuẩn bị tại `deploy/render-site`; có thể deploy từ branch `receiptwise` bằng `render.yaml`, chưa có public URL vì chưa có quyền kết nối Render.
- Video: chưa quay; kịch bản thực tế tại `docs/video-script.md`.

## 2. Feature Implementation Checklist

| Hạng mục | Trạng thái |
|---|---|
| Material 3, tiếng Việt, light/dark theme | Đã triển khai |
| Camera, flash, focus, gallery, crop | Đã triển khai trong source; cần thiết bị để xác minh |
| OCR offline ML Kit | Đã triển khai trong source; cần thiết bị/model để xác minh |
| Regex/heuristic parser + review | Đã triển khai và có unit tests |
| SQLite CRUD, file persistence, thumbnail | Đã triển khai trong source; cần chạy app để xác minh |
| History, search, category filter, detail | Đã triển khai |
| Donut/weekly chart bằng CustomPainter | Đã triển khai với animation/tap |
| Static landing page và Render config | Đã chuẩn bị |

## 3. Technical Architecture & Project Structure

Presentation nằm trong `lib/features`, reusable widgets trong `lib/core/widgets`, entity trong `lib/models`. `ExpenseProvider` dùng ChangeNotifier điều phối `ExpenseRepository` và refresh sau CRUD. `DatabaseService` mở SQLite version 1; `FileStorageService` lưu ảnh trong application documents và tạo thumbnail. `OcrService` chỉ phụ trách ML Kit; `ReceiptParserService` là pure Dart để test độc lập; `AggregationService` gom theo tháng/tuần/category.

Luồng chính: Camera/Gallery → Crop → OcrService → ReceiptParserService → ReceiptReviewScreen → ExpenseProvider → SQLite + app documents → Dashboard/History/Analytics.

## 4. Empirical Evidence & Screenshots

Ảnh chụp thực tế chưa được tạo vì môi trường không có Flutter SDK/device ở thời điểm chuẩn bị source. Khi có Android device, cần chèn 3–4 ảnh không chỉnh sửa vào phần này: Dashboard, Scanner frame, Review sau OCR và Analytics/History sau khi restart. Không sử dụng ảnh giả làm bằng chứng.

## 5. Technical Challenges & Resolutions

- **OCR không ổn định theo chất lượng ảnh:** thêm crop thật, framing overlay, báo lỗi ảnh không có chữ và buộc review trước khi lưu.
- **Nhiều số tiền trên hóa đơn:** parser chấm điểm keyword thanh toán, giảm điểm VAT/discount/change/unit price và đánh dấu `totalAmount` chưa chắc chắn khi candidate gần nhau.
- **Dữ liệu phải tồn tại sau restart:** dùng SQLite và copy ảnh sang application documents, không giữ đường dẫn temporary cache.
- **Không dùng chart library:** donut và weekly bar được viết bằng Canvas/CustomPainter, có animation và hit testing.
- **Giới hạn môi trường:** Flutter/Dart CLI không có trong PATH nên chưa được phép khẳng định analyze/test/build pass; các bước còn lại được ghi rõ để chạy khi SDK sẵn sàng.
