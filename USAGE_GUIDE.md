# Hướng dẫn sử dụng Scribd Downloader

## Cách chạy tool

### 1. Cách chạy cơ bản
```bash
npm start [URL] [OPTIONS]
```

### 2. Các tùy chọn (OPTIONS)
- `/d` hoặc không có: Chế độ mặc định (PDF generation)
- `/i`: Chế độ image-based (tạo PDF từ screenshots)

### 3. Ví dụ sử dụng

#### Tải PDF với chế độ mặc định:
```bash
npm start "https://www.scribd.com/document/123456/example-document"
```

#### Tải PDF với chế độ image:
```bash
npm start "https://www.scribd.com/document/123456/example-document" /i
```

#### Tải PDF từ embed URL:
```bash
npm start "https://www.scribd.com/embeds/123456/content"
```

### 4. Cấu hình

Tool sử dụng file `config.ini` để cấu hình:

```ini
[SCRIBD]
rendertime=100

[DIRECTORY]
output=output/Books/Raspberry_Pi
filename=title
```

- `rendertime`: Thời gian chờ giữa các trang (ms)
- `output`: Thư mục lưu file PDF
- `filename`: Tên file (title hoặc id)

### 5. Kết quả

Tool sẽ:
1. ✅ Tự động xử lý cookies dialog
2. ✅ Tải toàn bộ nội dung tài liệu
3. ✅ Tạo file PDF sạch sẽ (không bị che khuất)
4. ✅ Lưu file vào thư mục output

### 6. Xử lý lỗi

Tool có error handling tốt:
- Báo lỗi rõ ràng khi URL không hợp lệ
- Tự động xử lý cookies dialog
- Graceful handling khi không tìm thấy elements

### 7. Logs

Tool sẽ hiển thị:
```
Mode: DEFAULT
Checking for cookie consent dialogs...
Found cookie dialog, attempting to handle...
Clicked accept button
Cookie consent handling completed
Generated: output/Books/Raspberry_Pi/example-document.pdf
```

## Lưu ý

- Đảm bảo có kết nối internet
- URL phải là Scribd document hợp lệ
- Tool tự động xử lý cookies dialog từ tháng 9/2024
