# Changelog - Scroll Fix (99% Stuck Issue)

## Vấn đề
Tool bị stuck ở 99% khi tải tài liệu từ Scribd, mặc dù trước đây (29/12/2025) vẫn hoạt động bình thường.

## Nguyên nhân
1. **Dynamic Content Loading**: Scribd đã thay đổi cách load content, sử dụng lazy loading khiến `scrollHeight` tăng liên tục khi scroll
2. **Static scrollHeight**: Code cũ chỉ lấy `scrollHeight` một lần ở đầu và không cập nhật trong vòng lặp
3. **Không có stuck detection**: Không có cơ chế phát hiện khi scroll bị stuck
4. **Không có max iterations**: Có thể bị infinite loop nếu điều kiện dừng không bao giờ đạt được

## Giải pháp đã áp dụng

### 1. Dynamic scrollHeight Update
- Cập nhật `scrollHeight` sau mỗi lần scroll để theo dõi content được load động
- Cập nhật `clientHeight` và `scrollTop` sau mỗi lần scroll

### 2. Stuck Detection
- Phát hiện khi scroll bị stuck (scrollTop không thay đổi)
- Đếm số lần scroll không thay đổi (`stuckCount`)
- Nếu stuck >= 5 lần, thử các biện pháp khắc phục

### 3. Max Iterations
- Thêm giới hạn tối đa 10,000 iterations để tránh infinite loop
- Cảnh báo nếu đạt max iterations

### 4. Fallback Scroll
- Khi phát hiện stuck, thử scroll trực tiếp bằng JavaScript
- Kiểm tra tolerance (còn < 100px thì coi như đã xong)
- Dừng lại nếu vẫn không thể scroll

### 5. Improved Logging
- Log chi tiết về quá trình scroll
- Hiển thị số iterations và vị trí cuối cùng
- Cảnh báo khi có vấn đề

## Code Changes

### File: `src/service/ScribdDownloader.js`

**Trước:**
```javascript
const height = await container.evaluate(el => el.scrollHeight);
const clientHeight = await container.evaluate(el => el.clientHeight);
let cur = await container.evaluate(el => el.scrollTop);
const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
bar.start(height, 0);
while (cur + clientHeight < height) {
    await page.keyboard.press('PageDown');
    await new Promise(resolve => setTimeout(resolve, rendertime))
    cur = await container.evaluate(el => el.scrollTop);
    bar.update(cur + clientHeight);
}
bar.stop();
```

**Sau:**
```javascript
// Initialize với dynamic updates
let clientHeight = await container.evaluate(el => el.clientHeight);
let cur = await container.evaluate(el => el.scrollTop);
let height = await container.evaluate(el => el.scrollHeight);
let prevScrollTop = 0;
let stuckCount = 0;
const maxStuckIterations = 5;
const maxIterations = 10000;
let iterations = 0;

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
bar.start(height, 0);

while (cur + clientHeight < height && iterations < maxIterations) {
    await page.keyboard.press('PageDown');
    await new Promise(resolve => setTimeout(resolve, rendertime));
    
    // Cập nhật động
    cur = await container.evaluate(el => el.scrollTop);
    height = await container.evaluate(el => el.scrollHeight);
    clientHeight = await container.evaluate(el => el.clientHeight);
    
    // Stuck detection
    if (Math.abs(cur - prevScrollTop) < 1) {
        stuckCount++;
        if (stuckCount >= maxStuckIterations) {
            // Fallback scroll và tolerance check
            // ...
        }
    } else {
        stuckCount = 0;
    }
    
    prevScrollTop = cur;
    iterations++;
    bar.update(Math.min(cur + clientHeight, height));
}
```

## Kết quả mong đợi

1. ✅ Tool không còn bị stuck ở 99%
2. ✅ Tự động phát hiện và xử lý khi scroll bị stuck
3. ✅ Tránh infinite loop với max iterations
4. ✅ Logging chi tiết để debug
5. ✅ Xử lý tốt hơn với dynamic content loading

## Testing

Để test fix này, chạy:
```bash
npm start "https://www.scribd.com/document/959479727/Ebook-Engineering-Software-Products-An-Introduction-to-Modern-Software-Engineering-by-Ian-Sommerville-ISBN-9780135210642-013521064X-online-reading"
```

Tool sẽ:
- Scroll qua tất cả các trang
- Phát hiện và xử lý stuck nếu có
- Hoàn thành việc tải PDF thành công
- Hiển thị log chi tiết về quá trình scroll

## Lưu ý

- Nếu document rất dài (> 10,000 pages), có thể cần tăng `maxIterations`
- Nếu scroll vẫn bị stuck, có thể cần điều chỉnh `maxStuckIterations` hoặc `rendertime`
- Tolerance check (100px) có thể cần điều chỉnh tùy theo document
