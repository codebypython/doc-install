# Scribd Downloader - Cookie Dialog Fix

## Vấn đề
Từ tháng 9/2024, Scribd đã thêm cookie consent dialog vào trang web của họ để tuân thủ các quy định về bảo vệ dữ liệu cá nhân (GDPR, CCPA). Điều này khiến các file PDF được tải về bị che khuất một phần nội dung bởi cookies dialog.

## Giải pháp
Tool đã được cải tiến để tự động xử lý cookies dialog:

### 1. Tự động phát hiện và xử lý cookies dialog
- Tool sẽ tự động tìm và click các nút "Accept", "Agree", "Allow" trong cookies dialog
- Hỗ trợ nhiều loại selector khác nhau để phát hiện cookies dialog
- Tự động loại bỏ cookies dialog trước khi tạo PDF

### 2. Các cải tiến chính

#### A. Method `handleCookieConsent()`
- Phát hiện cookies dialog bằng nhiều selector khác nhau
- Tự động click các nút accept/agree
- Loại bỏ cookies dialog khỏi DOM trước khi tạo PDF

#### B. File `CookieSelectors.js`
- Chứa các selector và pattern để phát hiện cookies dialog
- Dễ dàng mở rộng và tùy chỉnh
- Hỗ trợ nhiều ngôn ngữ và format khác nhau

#### C. Cải tiến trong PDF generation
- Loại bỏ cookies dialog trước khi capture nội dung
- Đảm bảo PDF chỉ chứa nội dung tài liệu

### 3. Cách sử dụng

Tool sẽ tự động xử lý cookies dialog, không cần thay đổi cách sử dụng:

```bash
node run.js [URL] [FLAG]
```

Ví dụ:
```bash
node run.js "https://www.scribd.com/document/123456/example" /d
```

### 4. Logging
Tool sẽ hiển thị các thông báo về việc xử lý cookies dialog:
- "Checking for cookie consent dialogs..."
- "Found cookie dialog, attempting to handle..."
- "Clicked accept button"
- "Cookie consent handling completed"

### 5. Tùy chỉnh

Nếu cần thêm selector mới cho cookies dialog, chỉnh sửa file `src/const/CookieSelectors.js`:

```javascript
export const COOKIE_SELECTORS = [
    // Thêm selector mới vào đây
    '[class*="your-custom-selector"]'
]
```

### 6. Xử lý lỗi
- Nếu không thể click cookies dialog, tool sẽ tiếp tục và cố gắng loại bỏ nó khỏi PDF
- Tool sẽ không dừng lại nếu gặp lỗi trong quá trình xử lý cookies

## Kết quả
Sau khi áp dụng các cải tiến này, các file PDF được tải về sẽ:
- Không còn bị che khuất bởi cookies dialog
- Chỉ chứa nội dung tài liệu gốc
- Có chất lượng giống như trước tháng 9/2024
