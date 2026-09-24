# Đo lại tốc độ khi máy rảnh — 2026-09-25 khoảng 00:00–00:30 (+07)

Tác tử đo độc lập, chạy một mình sau khi sáu kiểm toán viên đã xong. Mỗi lần chạy chờ load 1 phút ≤ 4,0 (load thực tế 2,4–4,7 trên 10 lõi; lúc đo cũ 5,5–12,9). Mã: HEAD 4620e61 (bản 1.8). Môi trường: `wrangler dev` cục bộ + Chrome headless qua CDP, D1 tạm. Kịch bản: `../kich-ban/do-toc-do.mjs`, `../kich-ban/tai-nhe.mjs`, `../kich-ban/prod-rtt.mjs`. Tệp JSON: `do-toc-do-may-ranh-*.json`, `tai-nhe-may-ranh-*.json`, `prod-rtt-may-ranh.json` (trường `note` "đo khi máy BẬN" trong JSON là chữ viết cứng của kịch bản — load thật ở `uptimeStart`/`uptimeEnd`).

## 1. Fast 3G (562,5 ms; 180 KB/s) + CPU×4, 375×812 — trung vị 3 lượt (ms)

| Trang | FCP lạnh | Sẵn sàng lạnh | TBT lạnh | Sẵn sàng ấm | CLS | Chuỗi API nối đuôi |
|---|---|---|---|---|---|---|
| Đăng nhập | 1648 | 2166 | 98 | 673 | 0 | 1 |
| Trang chủ (Sales) | 1520 | 2697 | 2 | 1246 | 0,007 | 2 |
| Danh sách đơn | 1456 | 2787 | 21 | 1266 | 0 | 3 |
| Một đơn | 1544 | 2761 | 0 | 1275 | 0 | 2 |
| Form lập đơn | 1572 | 2673 | 68 | 1221 | 0 | 2 |
| Form sửa đơn nháp | 1516 | 3383 | 32 | 1840 | 0,035 | 4 |
| Tôi (Sales) | 1488 | 2060 | 32 | 635 | **0,24** | 2 |
| Tôi / Việc của tôi (HDV) | 1456 | 2775 | 13 | 1254 | **0,82** | 2 |
| Hồ sơ | 1468 | 3352 | 0 | 1848 | 0 | 3 |
| Trang chủ Admin (1280×800) | 1480 | 3299 | 3 | 1822 | 0,07 | 2 (+ gọi trùng) |

Lúc mở ấm: thời gian chờ các API nối đuôi chiếm **91–97%** thời gian tới lúc có nội dung; phần còn lại sau lượt API cuối chỉ 13–63 ms. TBT và long task lúc ấm = 0 ở mọi trang.

## 2. Độ trễ 100 ms (≈ RTT production), không giới hạn băng thông, CPU×4 — trung vị 3 lượt

Sẵn sàng ấm: 165–453 ms; API chiếm 65–86%. Form sửa đơn nháp 453 ms (3–4 vòng), Hồ sơ 399 ms (3 vòng), Trang chủ Admin máy tính 418 ms so với 293 ms trên điện thoại (gọi dashboard hai lần). CLS trang Tôi = 0 ở 100–200 ms; 0,64 (HDV) từ 300 ms; 0,82 ở 3G.

## 3. Không giả lập mạng/CPU

Sẵn sàng 36–96 ms, TBT = 0 mọi trang, mỗi lượt API cục bộ 5–15 ms → phần JS/CPU và máy chủ cục bộ là nhỏ.

## 4. Tải nhẹ vào workerd cục bộ (một tiến trình — KHÔNG đại diện Cloudflare thật)

| Kịch bản | n100 c10 (req/s · p50 · p95 ms) | n300 c50 |
|---|---|---|
| GET /api/orders | 265 · 37 · 44 | 292 · 179 · 209 |
| GET /api/orders/dashboard | 205 · 48 · 54 | 211 · 244 · 285 |
| GET /api/auth/me | 478 · 21 · 24 | 488 · 106 · 119 |
| POST tạo đơn đồng thời | 223 · 45 · 57 (0 mã trùng) | 236 · 213 · 269 (0 mã trùng) |
| PUT cùng một đơn nháp | 1×200, còn lại 409 | 1×200, còn lại 409 |
| Đăng nhập sai PIN, SĐT lạ | 62 · 169 · 232 | 63 · 784 · 1284 |

0 lỗi 5xx ở mọi mức. Đăng nhập (băm PIN) đứng ở ~63 yêu cầu/giây trong một tiến trình — gợi ý ~16 ms CPU mỗi lần (CHƯA KIỂM trên Worker thật).

## 5. RTT production (GET công khai, 20 lần, điểm Cloudflare SIN, 00:26 +07)

| Đường dẫn | Trung vị | p90 |
|---|---|---|
| /app.css (tĩnh) | 89,7 ms | 139,8 |
| /icons/logo-96.png | 84,7 | 103 |
| /api/company (Worker + 1 câu D1) | 103,7 | 154,2 |
| /api/auth/config (Worker + 1 câu D1) | 108,4 | 207 |

Worker + 1 câu D1 thêm ~14–19 ms so với tệp tĩnh. Nén br trên production: app.css 23 995 B, orders.js 11 075 B, order.js 26 268 B. (Tác tử đo có dùng thêm `curl -I` — HEAD — tới tệp tĩnh công khai; ghi rõ vì luật đợt này nói "GET".)

## 6. Kết luận của lần đo

(a) Vòng mạng nối đuôi là nguyên nhân chính của thời gian chờ; (b) JS/CPU nhỏ; (c) máy chủ/D1 nhỏ ở những gì đo được (thời gian thật của API cần đăng nhập trên production: CHƯA ĐO); (d) nhảy bố cục chỉ ở trang Tôi khi mạng chậm (≥ 300 ms). Số đo lúc máy bận lệch ≤ ~7% so với lúc rảnh — dùng được.
