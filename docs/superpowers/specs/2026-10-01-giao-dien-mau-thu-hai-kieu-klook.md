# Tông hiển thị theo người (3 tông: Biển đêm · Nắng đảo · Rõ nét) — hướng làm + lệnh cho Claude Design

- **Ngày:** 2026-10-01. **Trạng thái:** bản nháp định hướng — CHƯA có ADR, CHƯA thi công.
- **Chủ muốn (lời giao việc 1/10):** thêm "phong cách hiển thị" tươi hơn kiểu du lịch Klook (nền nút/thanh xám nhạt hoặc trùng màu nền, chữ nhấn vàng đậm). Làm rõ sau đó: đây là **thêm tông màu, không phải đổi giao diện** — "trong công ty có người lớn tuổi, nhỏ tuổi, tôi muốn cho họ tuỳ chọn phong cách hiển thị khác nhau (giữ những yếu tố thiết kế cốt lõi và bố cục đều giống nhau, chỉ khác màu sắc, độ đậm thôi)".
- **Chủ đã chốt (1/10, qua câu hỏi):**
  1. **Mỗi người tự chọn** tông ở trang Tôi; **Toàn quyền** đặt tông mặc định cho người chưa chọn và bật/tắt tông nào được dùng.
  2. Trang **Đăng nhập cũng theo tông** (máy nhớ lựa chọn của người dùng máy đó).
  3. "Độ đậm" khác ở **cả màu lẫn chữ**: có tông "Rõ nét" cho người lớn tuổi — tương phản mạnh hơn; **cỡ chữ và bố cục giữ nguyên**. (Ý "chữ đậm hơn một bậc" đã bị chủ bỏ ở mục 6.)
  4. Đợt đầu **3 tông**: **Biển đêm** (xanh đậm hiện tại) · **Nắng đảo** (tươi, kiểu Klook, chữ nhấn vàng đậm) · **Rõ nét** (tương phản cao, chữ đậm).
  5. Chủ đã biết: tông mới là lần app đi riêng khỏi màu thương hiệu website tourdao.vn (như lần đổi phông 30/9).
  6. **Chữ thường, nét mỏng (1/10, sau khi xem lệnh):** "chỉ sử dụng chữ thường, mỏng để dễ nhìn và tiết kiệm không gian ở trên điện thoại" ⇒ bỏ ý "Rõ nét đậm hơn một bậc"; cả ba tông dùng chữ mảnh (nội dung 400, nhấn tối đa 500–600, bỏ 700/800), không viết HOA toàn bộ; Rõ nét chỉ khác bằng tương phản + viền. *Giả định (đảo ngược được):* áp cho cả ba tông và cho cả bản Trang chủ kiểu MoMo; nét 300 chỉ cho chữ ≥ 20px (chữ nhỏ nét 300 khó đọc trên điện thoại, cần thêm một tệp phông).
  - (Câu trả lời đầu "1-A" — Toàn quyền chọn chung — đã được chủ đổi thành chọn theo người ở lượt hỏi lại.)
- **Đã tra:** Hiến chương (`docs/ARCHITECTURE.md` Phần I) và `docs/adr/` không có điều nào về theme/màu ⇒ cần **ADR mới do chủ duyệt** trước phần chạm dữ liệu/quyền (lưu lựa chọn theo người + cài đặt chung; ai đổi được; nạp tông sớm chạm ADR-0035).

## Phần 1 — Hướng làm (để soạn ADR)

### 1.1 Hiện trạng (đo 2026-10-01 trên mã tách từ `main` 7ba20349 — main có thể đã tiến, đo lại khi thi công)
- Màu đi gần hết qua token ở đầu `public/app.css` (ngoài `:root` chỉ còn 7 chỗ `#fff` viết cứng; `web/*.ts` không có mã màu cứng).
- **Vướng 1 — màu chính gánh hai vai:** `--c-primary` ~25 chỗ làm **nền** (nút, thanh) và ~87 chỗ làm **màu chữ/viền**. Thanh bên máy tính là nền xanh đậm + chữ trắng mờ (`--c-sidebar-*` = `rgba(255,255,255,…)`). Nắng đảo cần nền trung tính + chữ màu ⇒ chỉ ghi đè `--c-primary` sẽ vỡ.
- **Vướng 2 — độ đậm chữ viết cứng:** 277 chỗ `font-weight` số (700 ×109, 800 ×86, 600 ×73, 500 ×5, 400 ×4). Chủ muốn chữ mảnh ⇒ phải gom vào token độ đậm trước rồi hạ giá trị token (một chỗ), không sửa 277 chỗ hai lần. Viền `1px` viết cứng ~152 chỗ (Rõ nét có thể muốn viền dày hơn — tuỳ bản vẽ).
- Màu cố định ngoài CSS: `<meta name="theme-color">` ở 31 tệp HTML (JS đổi được lúc chạy); `manifest.webmanifest` `theme_color` tĩnh (chấp nhận giữ).
- Vàng/cát hiện mang nghĩa **"nhắc nhở"**; san hô = **hành động chốt**; đỏ = **nguy hiểm**; xanh lá = **đã xác nhận**. Tông nào cũng phải giữ các nghĩa này phân biệt được.

### 1.2 Cách làm kỹ thuật (giữ đúng luật hiện có)
1. **Bước 0a — tách vai màu, không đổi gì nhìn thấy:** thêm token theo vai (`--c-bar-bg`, `--c-on-bar`, `--c-btn-bg`, `--c-btn-text`, `--c-emphasis-text`, `--c-link`, `--c-tab-active`, bộ `--c-sidebar-*` đủ cả nền), giá trị = hiện tại; thay 25 + 87 chỗ `--c-primary` theo vai.
2. **Bước 0b — gom độ đậm chữ:** token `--fw-regular/medium/semibold/bold/heavy` (= 400/500/600/700/800), thay 277 chỗ. Giá trị giữ nguyên.
   - Kiểm 0a + 0b: ảnh chụp trước/sau **trùng khít** (Chrome, 390 và 1040). Không đổi hành vi ⇒ làm được **trước** ADR, như việc gom thang cỡ chữ 30/9.
3. **Bước 1 — chữ mảnh + ba khối ghi đè:** hạ giá trị `--fw-*` theo bảng Claude Design (chung cho cả ba tông — đây là đổi nhìn thấy trên toàn app, kiểm lại chữ dài xuống dòng ở 390px); rồi `:root[data-tong="nang-dao"]`, `:root[data-tong="ro-net"]` chỉ đổi giá trị token màu/viền; Biển đêm = `:root` mặc định. Nếu bản vẽ dùng nét 300 → thêm tệp `be-vietnam-pro-300.woff2` (công thức "Phông chữ" ở CHANGE-GUIDE, `src/phong-chu.test.ts`).
4. **Lưu lựa chọn (cần ADR):**
   - Theo người: một cột/bảng thuộc module nhân sự (mã tông, chỉ chính người đó đổi cho mình); đọc về qua `/api/auth/me`.
   - Chung: tông mặc định + danh sách tông được bật — chép khuôn module Bảo trì (`mnt_setting`: một dòng, chỉ Toàn quyền đổi, có nhật ký). Dùng quyền có sẵn hay thêm mã quyền → ghi trong ADR.
   - Tắt một tông đang có người dùng → người đó về tông mặc định (không lỗi).
   - Migration mới + `docs/data-dictionary.json`.
5. **Không nháy màu khi mở, kể cả trang Đăng nhập:** máy nhớ mã tông (bản nhớ trên máy, như "bản nhớ khung" ADR-0035 — thêm trường vào bản nhớ khung **cần ADR**), áp lên `<html>` bằng đoạn chạy sớm nhất trước khi vẽ; sau đăng nhập `/api/auth/me` sửa nếu lệch. Đăng nhập trên máy lạ = tông mặc định. Đổi `theme-color` bằng JS.
6. **Màn chọn tông:** trang Tôi thêm dòng "Phong cách hiển thị" → bảng trượt 3 thẻ xem trước, bấm là đổi ngay. Toàn quyền: màn cài đặt (tông mặc định, bật/tắt từng tông) cạnh Chế độ bảo trì.
7. **Ngoài phạm vi:** ảnh biên nhận PNG gửi khách (giữ màu thương hiệu), manifest, cỡ chữ (không phóng to theo tông).
8. **Kiểm:** test tương phản token viết đỏ trước (≥ 4,5:1 cho Biển đêm/Nắng đảo; ≥ 7:1 cho chữ thường ở Rõ nét); test "mọi token có giá trị ở cả 3 tông"; kịch bản Chrome chụp đủ màn × 3 tông; việc lớn (dữ liệu + quyền) ⇒ người kiểm độc lập.

## Phần 2 — LỆNH (dán vào Claude Design)

Thiết kế **ba tông hiển thị** cho app nội bộ **Island Booking System** (công ty du lịch Tour Đảo, Nha Trang; nhân viên lập, xác nhận và theo dõi đơn tour; cài lên iPhone như app, cũng dùng trên máy tính). Mỗi nhân viên sẽ **tự chọn** tông mình thích — công ty có cả người lớn tuổi lẫn người trẻ. **Ba tông dùng CHUNG bố cục, thành phần, cỡ chữ, độ đậm chữ; chỉ khác màu sắc và độ tương phản.** Chủ muốn **chữ thường, nét mảnh** để dễ nhìn và tiết kiệm chỗ trên điện thoại. Toàn bộ chữ tiếng Việt có dấu.

**Ba tông:**
1. **Biển đêm** — tông hiện tại: xanh biển đậm `#0c4a6e` làm nền nút/thanh, chữ trắng trên nền đậm, san hô `#c0392b` cho hành động chốt. **Giữ nguyên**, chỉ điền lại bảng token (mục D) để đối chiếu.
2. **Nắng đảo** — tươi, sáng, cảm giác du lịch **kiểu Klook**: nền nút, thanh đầu trang, thanh tab, thanh bên chuyển sang **xám rất nhạt hoặc trùng màu nền** (phân tách bằng viền mảnh / bóng mềm thay vì khối màu); **màu nhấn vàng đậm / hổ phách** cho chữ nhấn, biểu tượng đang chọn, liên kết.
3. **Rõ nét** — cho người lớn tuổi, mắt kém: tương phản cao (chữ ≥ **7:1**), chữ tối hơn trên nền sáng hơn, viền và trạng thái đang chọn rõ ràng, ít sắc độ nhạt khó phân biệt. **Cùng độ đậm chữ mảnh như hai tông kia** — rõ nhờ màu, không nhờ chữ đậm. **Không** phóng to chữ, **không** đổi bố cục.

### A. CỐ ĐỊNH (bắt buộc tuân thủ)
1. **Bố cục, thứ tự, nội dung, nhãn chữ của mọi màn giống hệt nhau ở cả ba tông** — chỉ đổi màu, độ dày viền, cách tô biểu tượng. Không thêm/bớt nút hay số liệu.
2. **Chữ thường, nét mảnh (áp cho cả ba tông và mọi màn, kể cả bản Trang chủ kiểu MoMo — thay mọi chữ "đậm" ở bản đó):** nội dung, nhãn, dòng phụ nét **400**; tiêu đề, tên người, số tiền, giờ đón, nút tối đa **500**, cùng lắm **600** cho con số lớn nhất màn; **không dùng 700/800**. Phân cấp bằng cỡ chữ, màu (chữ chính / chữ phụ) và khoảng trắng thay vì chữ đậm. Không viết HOA toàn bộ (kể cả nhãn, huy hiệu, nút). Nét **300** chỉ được dùng cho chữ ≥ 20px (chữ nhỏ nét 300 khó đọc trên điện thoại). Vẫn phải đạt A.4 — chữ mảnh cần màu chữ đủ tối.
3. Phông **Be Vietnam Pro** (có 300–800). Cỡ chữ chỉ dùng 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32px (nội dung 16, nhãn 14, huy hiệu 12, ô gõ 16) — **giống nhau ở cả ba tông**. Khoảng cách 4/8/12/16/24/32/48px; bo góc 8/12/18px, viên thuốc 999px. Vùng chạm ≥ 44×44px. Tận dụng chữ mảnh để gọn: khoảng cách dòng, đệm thẻ không nới ra; chữ dài tiếng Việt vẫn phải xuống dòng đẹp ở 390px.
4. **Tương phản:** Biển đêm, Nắng đảo: mọi chữ ≥ **4,5:1** trên nền của nó (chữ lớn đậm ≥ 3:1). Rõ nét: ≥ **7:1**. Vàng tươi (kiểu `#f5a623`) trên nền trắng chỉ ~2:1 ⇒ **chữ vàng phải là tông vàng/hổ phách ĐẬM**; vàng tươi chỉ làm **nền hoặc mảng tô** với chữ tối phía trên. Ghi tỉ lệ tương phản cạnh mỗi cặp màu.
5. **Nghĩa trạng thái phân biệt rõ ở cả ba tông, kể cả với người mù màu một phần** (không chỉ dựa vào màu — có biểu tượng hoặc chữ đi kèm): *hành động chốt* ("Tạo đơn", "Xác nhận đơn"), *nhắc nhở* (giấy tờ sắp hết hạn, danh mục lệch — **hiện là vàng/cát, sẽ TRÙNG với màu nhấn của Nắng đảo** ⇒ phải dời một trong hai và giải thích), *nguy hiểm / lỗi / tiền còn thiếu* (đỏ), *đã xác nhận / đủ tiền* (xanh lá), *nháp / chờ* (trung tính).
6. Thanh tab dưới đáy (điện thoại) và thanh bên (máy tính) giữ đúng mục, thứ tự, vị trí.
7. **Không** dùng logo, hình minh hoạ, ảnh, tên hay chữ của Klook — chỉ học cảm giác: nhiều khoảng trắng, nền sáng, màu nhấn ấm, thẻ bo tròn nhẹ.

### B. ĐƯỢC SÁNG TẠO
- Chọn chính xác tông vàng/hổ phách của Nắng đảo (và một màu phụ nếu cần, ví dụ xanh ngọc biển nhạt cho nền phụ), miễn đạt A.4–A.5.
- Nền của Rõ nét: trắng tinh hay nền đậm chữ sáng — chọn cái dễ đọc nhất cho người lớn tuổi, giải thích lý do.
- Cách phân tách khối (viền mảnh, bóng mềm, nền phân tầng) — mỗi tông được khác nhau.
- Kiểu mục đang chọn trên thanh tab / thanh bên (tô màu, gạch chân, viên thuốc nền nhạt…).
- Dải đầu Trang chủ (nếu đã có bản Trang chủ kiểu MoMo: làm lại bản đó cho từng tông); được dùng hoạ tiết sóng hình học đơn giản.
- Được đề xuất tên khác cho ba tông nếu hay hơn.

### C. Cần vẽ — mỗi màn ở **cả ba tông, đặt cạnh nhau**
Điện thoại rộng **390px**:
1. Trang chủ (lưới biểu tượng, số liệu, Chuyến đón).
2. Danh sách Đơn hàng (thẻ đơn có huy hiệu: nháp, đã xác nhận, còn thiếu tiền).
3. Tạo đơn — nút chốt "Lưu, chờ xác nhận", ô nhập đang chọn / đang lỗi.
4. Chi tiết đơn — nút "Xác nhận đơn", "Huỷ đơn", khối Thanh toán.
5. **Màn chọn tông (MỚI):** trang Tôi có dòng "Phong cách hiển thị" → bảng trượt từ dưới lên với **3 thẻ xem trước** (mỗi thẻ là ảnh thu nhỏ một màn + tên tông + một câu mô tả, ví dụ Rõ nét: "Tương phản cao — dễ đọc"), thẻ đang dùng có dấu ✓; bấm là đổi ngay.
6. Bảng trượt + thông báo nổi (toast) + thanh báo lỗi.
7. **Bảng mẫu thành phần:** nút chính / phụ / chốt / nguy hiểm / vô hiệu, ô nhập, huy hiệu đủ 5 nghĩa đặt cạnh nhau, liên kết, chấm "có bản mới", viên số chuông, mục thanh tab đang chọn.
8. Trang **Đăng nhập** (cùng bố cục hiện có) ở cả ba tông.
Máy tính rộng **1040px**:
9. Trang Đơn hàng với **thanh bên trái** (ở Biển đêm là khối xanh đậm chữ trắng — phần khó nhất với Nắng đảo, bắt buộc vẽ) và thanh trên có ô tìm + nút "Tạo đơn".
10. **Màn cài đặt của Toàn quyền (MỚI, chỉ một tông là đủ):** chọn tông mặc định cho người chưa chọn; bật/tắt từng tông (Biển đêm không tắt được); ghi chú "Người đang dùng tông bị tắt sẽ về tông mặc định".

### D. Bàn giao kèm bản vẽ (bắt buộc)
Một **bảng token cho mỗi tông** (3 bảng, cùng thứ tự dòng để đối chiếu): tên token → giá trị → dùng ở đâu → tỉ lệ tương phản với nền đi kèm.
- Màu đang có: `--c-primary`, `--c-primary-strong`, `--c-primary-soft`, `--c-accent`, `--c-accent-strong`, `--c-accent-soft`, `--c-sand`, `--c-sand-soft`, `--c-sand-text`, `--c-sand-border`, `--c-surface`, `--c-surface-alt`, `--c-card`, `--c-text`, `--c-text-muted`, `--c-text-inverse`, `--c-border`, `--c-green-soft`, `--c-green-text`, `--c-green-border`, `--c-danger`, `--c-danger-text`, `--c-danger-soft`, `--c-danger-border`, `--c-on-dark`, `--c-soft-hover`, `--c-placeholder`, `--c-scrim`, `--c-ntf-unread`, `--c-sidebar-item`, `--c-sidebar-active`, `--c-sidebar-border`, `--c-sidebar-badge`.
- Màu theo vai (mới): `--c-bar-bg`, `--c-on-bar`, `--c-btn-bg`, `--c-btn-text`, `--c-emphasis-text`, `--c-link`, `--c-sidebar-bg`, `--c-sidebar-text`, `--c-tab-active`, `--c-status-bar` (thanh trạng thái iPhone).
- Độ đậm chữ (mới, **chung cho cả ba tông**): `--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`, `--fw-heavy` — ghi giá trị mới theo luật chữ mảnh (ví dụ 400/400/500/500/600), kèm cột "hôm nay là" (400/500/600/700/800) để thấy chỗ nào nhẹ đi.
- Độ dày viền (mới, nếu Rõ nét cần): `--bw` (viền thường), `--bw-strong` (viền ô đang chọn).
