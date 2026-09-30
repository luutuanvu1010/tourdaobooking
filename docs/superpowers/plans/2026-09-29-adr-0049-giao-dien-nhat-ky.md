# Nhật ký thi công giao diện ADR-0049 + ADR-0050 (Phần B — Bảng điều phối lượt 1)

- **Nhánh:** `giao-dien-dieu-phoi-luot-1`, tách từ `9105306` (đỉnh `thi-cong-adr-0049-tiep` — đã có route chính sách / lý do / đặt gấp / mốc 6 giờ). Worktree `.claude/worktrees/agent-a660d262caac3dc6e`.
- **Vai:** người thi công giao diện (P15). Không tự nghiệm thu (N8) — mọi "xanh" dưới đây là tự khai, chưa có người kiểm độc lập.
- **Phạm vi điều phối giao:** nhập bản vẽ → B8 (V13) → B7 (V12, gỡ N-18 phần làm được) → khối hiển thị thuần cho B1–B6 (không nối trang / menu) → DỪNG, chờ điều phối gộp A12–A15.
- **Nhật ký máy chủ** ở tệp riêng `2026-09-29-adr-0049-thi-cong-nhat-ky.md` (không ghi vào đó để tránh xung đột).
- Tệp tạm: `/Users/tuanbao/.claude/jobs/32bcd96e/tmp/giao-dien-dp/` (nhật ký lệnh, ảnh của lần chạy nền, bản axe).

## 1. Mốc ban đầu (đỉnh `9105306`, chưa sửa gì)

| Lệnh | Kết quả |
|---|---|
| `npm test` | thoát 0 — 1633/1633 |
| `npm run typecheck` | thoát 0 |
| `npm run build:web` | thoát 0 |
| `npm run test:e2e -- pwa` | thoát 0 — 2/2 kịch bản (pwa + day_loi), "thẻ meta iOS … trên 23 trang" |
| Kịch bản Chrome (ảnh ghi vào thư mục tạm, không đè bằng chứng trong repo) | xem mục 1.1 |

### 1.1 Kịch bản Chrome trên đỉnh chưa sửa

Chạy bằng `chay-chrome.sh` (thư mục tạm; `OUT` trỏ ra ngoài repo, `AXE_JS` = axe 4.13 chép vào thư mục tạm, `CHROME_BIN` = `docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh`).

| Kịch bản | Thoát | Ghi chú (ĐỎ SẴN — không do Phần B) |
|---|---|---|
| `trang-chu-smoke.mjs` | **1** | Dựng dữ liệu bằng `POST /api/orders/:id/status` với chặng đón HÔM NAY → máy chủ (A10, mốc 360 phút) trả 409 `short_notice_required` (`phutConLai` −41, −836). Đỏ do phần máy chủ ADR-0049, trước bước đếm menu. |
| `xe-smoke.mjs` | 0 | 13 bước |
| `danh-muc-giay-to-smoke.mjs` | 0 | 10 bước |
| `dot-c-smoke.mjs` | **1** | "Tôi (máy tính): thứ tự DOM gốc phải giữ nguyên" — DOM thật có thêm `myjobs`, `links-top`, `vc-eyebrow`, `vc-links` (ADR-0030 / 1a). Đỏ sẵn. |
| `a2-smoke-form.mjs` | 0 | |
| `a2-smoke-order.mjs` | 0 | |
| `a2-smoke-sheet.mjs` | 0 | |
| `v1-nguoi-phu-trach.mjs` | **1** | 15 ✓ / 2 ✗: (b) nhật ký đơn chỉ 1 dòng "Đổi người phụ trách" (chờ 2); (h) câu SQL chèn `pty_party` của kịch bản thiếu cột (`wrangler d1 execute` hỏng). Đỏ sẵn. |

## 1.2 Lời nhắn của điều phối (ghi nguyên ý, theo thứ tự đến)

1. **Kết quả đối chiếu bản vẽ ↔ ADR** (toàn văn: `docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md`, chép từ `/Users/tuanbao/.claude/jobs/32bcd96e/tmp/doi-chieu-ban-ve-dieu-phoi.md`):
   - nhập bản vẽ theo mục 6 (ĐƯA `_ds/` gồm `_ds_bundle.js`, `assets/logo-96.png`; KHÔNG đưa fonts, `_adherence.oxlintrc.json`, `.thumbnail`, `screenshots/`, zip) → đã sửa commit nhập (lần đầu có `screenshots/`, không có `_ds/` — amend trước khi có commit nào khác; đỉnh nhập nay `750d958`);
   - mọi màn: áp "SỬA THEO CĂN CỨ" mục 2 (1–9, 12, 13), ruling bề mặt H6–H8, H10, H11, H14, H15, H17–H19, token nhóm "Riêng" + sửa tràn (mục 4), trạng thái thiếu (mục 1);
   - CHỜ CHỦ: Q1, Q2, Q3, H4 (chủ đã trả lời — mục 2 dưới);
   - Q4, Q5 điều phối chốt THEO BẢN VẼ (thẻ Xe 390 cuộn ngang; tài xế tab "Cuốc của tôi" mở đầu — thuộc B4);
   - máy chủ sẽ thêm R-P12…R-P18 trên nhánh máy chủ (KHÔNG làm trên nhánh này):
     - R-P12 `GET /lich` có `mocToiThieuPhut`, `canhBaoPhut`;
     - R-P13 cờ khoá theo mốc từng chuyến (màn không tự tính);
     - R-P14 `gioSomNhatKhai` + `somNhat` trong 409 `gio_xay_ra_ngoai_khoang`;
     - R-P15 `GET /api/orders/moc-toi-thieu` (I31 cách (a); "Duyệt đặt gấp" trên đơn chưa lưu = màn tự lưu nháp rồi gọi route 30);
     - R-P16 cờ `lechDon` từng điểm; R-P17 khoá route 19; R-P18 `LY_DO_DAT_GAP` theo bản vẽ (4 lý do, ghi chú /120).
2. **Chủ trả lời (29/9 tối):**
   - Q1 ô ghi chú tự do trong chuyến: CHƯA LÀM — không dựng các ô 03:39, 01:159, 05:106 (phá lệ, kết thúc gián đoạn chỉ chọn lý do);
   - Q3 chính sách: HIỆU LỰC NGAY khi lưu — không ô ngày hiệu lực, không dòng "Đang soạn / Chưa lưu"; lịch sử các bản giữ;
   - H4 nhãn đặt gấp trên chi tiết đơn: văn phòng (Bán hàng, Kế toán, Quản trị, Toàn quyền) thấy "Đặt gấp — lý do — người duyệt — lúc" + ghi chú; Đối tác, Hướng dẫn viên, Thực tập chỉ "Đặt gấp — Quản trị đã duyệt". Máy chủ thêm dữ liệu (N-14); màn chỉ HIỆN theo khoá có trong DTO, không tự lọc theo vai. Làm khi điều phối báo máy chủ đã có;
   - Q2 "Đã gọi báo" + giờ hẹn cũ: làm lượt này nhưng cần quyết định bổ sung — CHƯA dựng (giữ chỗ trong bố cục "Cần xử lý" nếu tiện, không nối gì).
3. **Máy chủ đã có R-P18 @`cf5dc91`, R-P15 @`56821fb`** (nhánh `thi-cong-adr-0049-tiep`): gộp `56821fb` vào nhánh này ở điểm sạch, rồi làm phần B7 còn lại (cảnh báo dưới mốc trên đơn CHƯA lưu qua route mới; "Duyệt đặt gấp" trên đơn chưa lưu = tự lưu nháp rồi gọi route 30; lý do lấy từ `LY_DO_DAT_GAP`). N-14 chưa có.

4. **Điều phối trả lời Q-B-1…5 (29/9 tối, sau báo cáo `87d0d42`):**
   - Q-B-5: đúng là lỗ — máy chủ vá (**R-P21**: lịch sử đơn của Đối tác / HDV / Thực tập không có lý do + tên người duyệt). Bước 10 của `dat-gap-smoke.mjs` giữ làm **bài canh** — đang đỏ đúng chỗ thì ghi "đỏ chờ R-P21"; khi có sha thì gộp và thấy nó xanh.
   - Q-B-1: CÓ "ai lưu" theo bản vẽ — máy chủ thêm (**R-P23**); làm phần hiển thị khi điều phối báo.
   - Q-B-2: chấp nhận mã lý do sinh từ nhãn ở giao diện; máy chủ kiểm định dạng + trùng (**R-P24**).
   - Q-B-3: KHÔNG được ngưng mã hệ thống — máy chủ 409 + cờ `heThong` (**R-P22**); giao diện ẩn nút "Ngưng" theo cờ khi điều phối báo.
   - Q-B-4: mục cha "Vận chuyển" hiện khi có `vehicle.manage` HOẶC `trip.view`; từng mục con theo ô quyền của nó — làm ở B1.
   - Vòng tiếp (không phụ thuộc máy chủ): (1) làm xanh `trang-chu-smoke.mjs` (dựng dữ liệu vấp 409 mốc — đổi dữ liệu thử hoặc dùng đường đặt gấp của Quản trị, KHÔNG nới máy chủ; rồi đếm thật 17 mục — N-B-2), `dot-c-smoke.mjs`, `v1-nguoi-phu-trach.mjs` bước (b), `a2-smoke-form.mjs` bước 10g (N-B-1) — tìm nguyên nhân gốc trước; hành vi app sai → DỪNG phần đó, báo; (2) N-B-3: ca Chrome cho 503 nếu dựng được trên D1 local mà không sửa máy chủ; (3) không làm B1–B6 tới khi có A13 / A15.

## 2. Bản vẽ lệch ADR / kế hoạch / máy chủ — cách xử lý

### 2.1 B8 — V13 (08: khung 8a–8d)

| # | Bản vẽ | Căn cứ | Cách làm |
|---|---|---|---|
| D8-1 | Ô "Ngày hiệu lực của bản mới" (08:49) | [KH] I28 — máy chủ đặt hiệu lực = lúc lưu, thân có khoá ngày → 400; chủ Q3 "hiệu lực ngay" | Không dựng ô; thay bằng dòng "Bản mới có hiệu lực ngay khi lưu; bản đang dùng chuyển vào lịch sử." |
| D8-2 | Dòng "Bản 3 · Đang soạn · Chưa lưu" (08:157) | chủ Q3 | Không dựng. Hàm `thayDoiChinhSach` giữ lại để chặn lưu bản giống hệt (GB-B8-4). |
| D8-3 | Dòng "Lưu Tuấn Vũ lưu 24/09 16:20" trong lịch sử | `DispatchPolicyDto` không có người lưu | Bỏ dòng (không thêm khoá vào DTO) — Q-B-1. |
| D8-4 | Khoảng hiệu lực "25/09 – 30/09" (ngày kết thúc = ngày trước bản sau) | hiệu lực đổi TỨC THỜI lúc lưu | "Hiệu lực <ngày bắt đầu> – <ngày bản sau bắt đầu>" theo ngày VN; bản đang dùng "Hiệu lực từ …". |
| D8-5 | Nhóm "Phá lệ mốc 6 giờ", "Đặt gấp", "Bỏ chặng" (08:138-140) | đối chiếu 2.4; `NHOM_LY_DO`, `LY_DO_DAT_GAP`, `LY_DO_DONG_CHANG` | Năm nhóm lượt 1 từ `NHAN_NHOM_LY_DO`: Phá lệ, Huỷ chuyến, Kết thúc gián đoạn, Bỏ qua điểm, Đổi giờ xe tới. |
| D8-6 | Ô "Lý do mới" không có mã (8d) | máy chủ đòi `code` | Mã SINH từ nhãn (`maLyDoMoi`), trùng → hậu tố `_2`… — Q-B-2 (định danh bền). |
| D8-7 | Bộ đếm "11/60" | máy chủ `kiemTenDanhMuc(label, 80)` | Đếm /80 (một nguồn với máy chủ). |
| D8-8 | Cả dòng "Phải có hợp đồng" mờ `opacity .6` | axe `color-contrast` (serious) ở chữ gợi ý | Chỉ làm mờ công tắc; chữ giữ màu (chữ "Khoá tắt — …" đã nói trạng thái). |
| D8-9 | 8b điện thoại không có khối "Điều kiện xuất bến có sẵn" + liên kết | cần lối vào trang điều kiện trên điện thoại | Giữ khối trong thẻ ở cả hai cỡ (GB-B8-5). |
| D8-10 | 8b không có thanh tab (vỏ `tabs=false`) | "giữ vỏ thật của app" (README 1a điểm đoán 1) | Giữ thanh tab; nút "Lưu thành bản mới" dính đáy ngay trên thanh tab (khuôn `.vc-bottom-bar` của 1a). |
| D8-11 | 8d dòng lý do chỉ có "Sửa" (không "Ngưng") | cần ngưng / dùng lại trên điện thoại | Dòng có "Sửa" + "Ngưng"/"Dùng lại" ở cả hai cỡ (GB-B8-6). |
| D8-12 | Liên kết "Điều kiện theo cỡ xe, hạng bằng ›" không có màn đích | [MH] "Dùng khuôn sẵn"; route 11–15 | Trang mới `/dieu-kien-xuat-ben` (khuôn danh mục, không bản vẽ) — GB-B8-7. |

### 2.2 B7 — V12 (07: khung 7a–7c)

| # | Bản vẽ | Căn cứ | Cách làm |
|---|---|---|---|
| D7-1 | 07 vẽ trình sửa CHẶNG (Chặng 1, Nơi trả, Bỏ chặng, + Thêm chiều về, + Thêm chặng) | bản đối chiếu mục 5: ADR-0047 Phần B CHƯA vẽ, CHƯA làm; web chưa có trình sửa chặng | Không dựng trình sửa chặng. Cảnh báo / đặt gấp gắn vào thẻ dịch vụ hiện có (ô ngày của cả đơn + giờ đón → chặng chiều đi, đúng cách máy chủ trộn `tronChangCu`). |
| D7-2 | Nút "Xác nhận đơn" nằm TRÊN biểu mẫu (7a, 7b) | biểu mẫu thật chỉ có "Lưu, chờ xác nhận"; xác nhận ở trang đơn | Khoá "Xác nhận đơn" + dòng khoá đặt ở TRANG ĐƠN (7a: "Duyệt đặt gấp xong thì xác nhận được." chữ nhỏ xám; 7b: biểu tượng khoá + "Cần Quản trị duyệt đặt gấp" chữ cát đậm). Biểu mẫu hiện dải cảnh báo + (Quản trị) khung Đặt gấp. |
| D7-3 | Dải cảnh báo nằm ngay dưới ô chặng | biểu mẫu không có khối chặng | Dải nằm cuối thẻ dịch vụ (dưới "Thông tin chuyến"); ở trang đơn nằm dưới dòng "Đón" của dịch vụ. |
| D7-4 | Lý do đặt gấp "Khách đoàn gọi gấp"… (07:140-145) | R-P18 — máy chủ đã đổi `LY_DO_DAT_GAP` (@`cf5dc91`) | Ô lý do lấy từ `LY_DO_DAT_GAP` (không chép cứng) — khớp bốn lý do bản vẽ. |
| D7-5 | Bộ đếm ghi chú "24/80" | `GHI_CHU_DAT_GAP_TOI_DA` = 120 (R-P18) | Đếm /120. |
| D7-6 | Nhãn 7c "Đặt gấp — lý do — người duyệt HH:MM" + ghi chú | chủ H4 / N-14 (@`9b48da1`) | Hiện ĐÚNG khoá DTO trả: có `lyDoNhan` → "Đặt gấp — <lyDoNhan> — <nguoiDuyet> duyệt <giờ>" + “ghi chú”; chỉ `{ daDuyet: true }` → "Đặt gấp — Quản trị đã duyệt". Khác ngày thì thêm ngày ("16:10 29/09"). Không lọc theo vai ở trình duyệt. |
| D7-7 | Sửa chặng đơn ĐÃ XÁC NHẬN dưới mốc (bản đối chiếu mục 1, V12 thiếu) | I14, [HĐ] lần 6 Q3 | Bảng "Sửa thông tin chuyến": 409 `short_notice_required` → Quản trị / Toàn quyền thấy khung Đặt gấp (khuôn 7a) và gửi lại cùng lệnh kèm `datGap`; người khác chỉ thấy câu máy chủ. |
## 3. Giả định bề mặt (P8 — đảo ngược được)

- **GB-B8-1:** hai ô giờ nhận số thập phân ("1,5" hoặc "1.5"), gửi `Math.round(giờ × 60)` phút; giá trị đang lưu không tròn giờ hiện thập phân đủ để khứ hồi đúng số phút (bài `gioTuPhut`). Ô dùng `type="text"` + `inputmode` (không `type="number"` như bản vẽ) để nhận dấu phẩy và báo lỗi đúng câu thay vì trình duyệt tự xoá chữ sai.
- **GB-B8-2:** câu lỗi theo đơn vị của ô (giờ / phút), kiểm ở trình duyệt TRƯỚC khi gửi (máy chủ vẫn kiểm lại; câu 400 của máy chủ nói "phút" nên không dùng cho hai ô giờ).
- **GB-B8-3:** gợi ý ô sát mốc nói đúng con số đang gõ ("Chặng chưa xếp trong 2 giờ trước mốc…" như bản vẽ khi giá trị 2).
- **GB-B8-4:** không đổi gì so với bản đang dùng → không gửi, câu nhắc "Chưa đổi gì…" (không tạo bản giống hệt).
- **GB-B8-5, -6:** xem D8-9, D8-11.
- **GB-B8-7:** trang `/dieu-kien-xuat-ben` (khuôn danh mục): khối "Điều kiện theo cỡ xe" (đang áp trước, đã đóng sau; thêm: cỡ xe 1–100 người, giấy tờ của xe / tài xế, loại từ danh mục đang dùng; đóng có hộp `confirm()` như "Huỷ đơn") và khối "Số khách theo hạng bằng" (mọi hạng đang dùng + hạng có dòng; "Đổi" mở ô, trống = không giới hạn; hạng chưa có dòng ghi "Chưa đặt — tài xế hạng này chưa được xếp chuyến"). Không có mục menu riêng; mục con "Chính sách điều phối" sáng ở cả trang này.
- **GB-B8-8:** thứ tự nhóm lý do: ba nhóm bản vẽ vẽ (Phá lệ, Huỷ chuyến, Kết thúc gián đoạn) rồi Bỏ qua điểm, Đổi giờ xe tới; nhóm lượt 2 (Báo huỷ điểm, Không nhận chuyển điểm) chỉ hiện khi có dữ liệu.
- **GB-B8-9:** lý do mới đứng sau lý do thường cuối cùng, trước "Khác" (thứ tự 99 của mã gieo) — `thuTuLyDoMoi`.
- **GB-B8-10:** menu: mục con "Chính sách điều phối" (ô `settings.ops`) và "Lý do điều phối" (ô `admin.manage`) sau "Loại giấy tờ xe" — thứ tự bản vẽ `vo-may-tinh`; trang Tôi (điện thoại) thêm hai dòng cùng thứ tự trong nhóm VẬN CHUYỂN. **Chưa thêm "Điều phối xe"** (trang B1 chưa có — không để liên kết chết).

- **GB-B7-1:** cảnh báo trên biểu mẫu tính bằng `kiemMocDat` (luật máy chủ) với mốc từ `GET /api/orders/moc-toi-thieu` (R-P15) và giờ máy người dùng; chỉ để HIỆN (máy chủ quyết lúc lưu / xác nhận). Sửa đơn nháp: chặng chiều đi đã đặt gấp mà ngày / giờ / nơi đón không đổi → hiện nhãn đặt gấp thay cảnh báo (máy chủ chép dấu cũ khi lưu — Q1 = (a)).
- **GB-B7-2:** "Duyệt đặt gấp" trên biểu mẫu = lưu nháp (đúng luồng Lưu, đủ kiểm) rồi gọi route 30 cho chặng chiều đi SỚM NHẤT của dịch vụ đó (thứ tự dịch vụ phản hồi = thứ tự thẻ); lệnh đặt gấp hỏng → đơn vẫn đã lưu → sang trang đơn kèm `datgap=loi`, trang đơn báo một lần "Đơn đã lưu nhưng chưa duyệt đặt gấp được" và cho duyệt lại.
- **GB-B7-3:** trang đơn tính "còn chặng phải đặt gấp" bằng `changDuoiMoc` (chỉ đơn NHÁP; chặng có ngày + giờ, `datGap` null, dưới mốc) từ `mocToiThieuPhut` + `legs[].datGap` của `GET /api/orders/:id`. Nút "Xác nhận đơn" khoá theo đó; đồng hồ máy người dùng chạy CHẬM hơn máy chủ thì nút có thể còn mở — máy chủ vẫn trả 409, trang hiện dải "Còn chặng đón dưới mốc…" (đã kiểm ở bước 3).
- **GB-B7-4:** câu mốc: "Giờ đón cách bây giờ 4 giờ 10 phút — dưới mốc 6 giờ"; giờ đón đã qua → "Giờ đón đã qua — dưới mốc 6 giờ".
- **GB-B7-5:** 503 `moc_toi_thieu_chua_co`: dải đỏ lời máy chủ + dòng "Chưa xác nhận hay sửa chuyến được cho tới khi Toàn quyền đặt chính sách điều phối." Chỉ kiểm bằng bài thuần (không dựng được D1 thiếu chính sách: bảng chính sách chỉ thêm, gieo sẵn).

## 4. Câu hỏi cho điều phối (Q-B…)

- **Q-B-1 (D8-3):** lịch sử bản chính sách có cần "ai lưu" như bản vẽ không? Cần thì máy chủ thêm khoá (tên hiển thị người lưu) vào `DispatchPolicyDto` — tôi không tự thêm.
- **Q-B-2 (D8-6):** mã lý do mới sinh từ nhãn (vd "Khách tự đi" ở Bỏ qua điểm → `BO_QUA_KHACH_TU_DI`; trùng → `_2`). Mã là định danh bền (nhật ký ghi mã). Chấp nhận, hay máy chủ nên tự sinh mã (bỏ `code` khỏi thân POST)?
- **Q-B-3:** Quản trị "Ngưng" được lý do hệ thống `BO_QUA_KHONG_CON_KHACH` (máy tự ghi khi điểm không còn khách — kế hoạch I20). Máy chủ hôm nay cho phép; giao diện không chặn (chặn theo mã ở giao diện là luật đặt sai chỗ). Có cần máy chủ khoá mã này không?
- **Q-B-5 (an toàn dữ liệu — xin điều phối xem, KHÔNG phải việc giao diện):** chủ H4 nói Đối tác / HDV / Thực tập chỉ thấy "Đặt gấp — Quản trị đã duyệt". DTO chặng đã đúng (`{ daDuyet: true }`), nhưng khối **"Lịch sử"** của trang đơn (nhật ký đơn, máy chủ trả trong `history`) cho Đối tác thấy dòng `Đặt gấp chặng đưa đón · Quản Trị · TD-… · Chiều đi · đặt gấp: Khách đoàn gọi gấp` — tức **nhãn lý do + tên người duyệt** (thấy thật ở `dat-gap-smoke.mjs` bước 10, dòng "(ghi nhận)"). Câu nhật ký do `orders/index.ts` route 30 ghi (`detail` có `LY_DO_DAT_GAP[lyDo]`). Ghi chú KHÔNG lộ. Có cần máy chủ bỏ nhãn lý do khỏi câu nhật ký / lọc dòng này với mã không có ô xem đủ không? Giao diện không tự lọc.
- **Q-B-4 (menu B1):** mục cha "Vận chuyển" hôm nay chỉ hiện với ô `vehicle.manage` (Quản trị, Toàn quyền). Bản vẽ cho Bán hàng, Kế toán thấy "Vận chuyển › Điều phối xe" → khi làm B1 phải đổi điều kiện hiện mục cha (vd `trip.view`). Ghi trước để không quên.

## 5. Nợ

- **N-B-1:** `a2-smoke-form.mjs` bước 10g chờ `#add-manual` (có sẵn trong HTML) rồi gọi ngay `#catalog-q` (JS dựng) — chập chờn khi máy bận (thấy một lần 29/9). Sửa: chờ `#catalog-q`. Không sửa trong phiên này (ngoài phạm vi, kịch bản của A2). → **ĐÃ SỬA (vòng 2):** chờ `#catalog-q`; `a2-smoke-form.mjs` xanh (24 ✓) sau gộp `df32e83`.
- **N-B-2:** `trang-chu-smoke.mjs`, `dot-c-smoke.mjs` đỏ sẵn (mục 1.1) — số mục menu mới (17) chưa được kịch bản đếm thật. → **ĐÃ SỬA (vòng 2):** `trang-chu-smoke.mjs` xanh (41 ✓), đếm THẬT 16 mục Quản trị + đúng danh sách nhãn; `dot-c-smoke.mjs` xanh.
- **N-B-3:** cảnh báo 503 `moc_toi_thieu_chua_co` chỉ có bài thuần, chưa có ca Chrome (không dựng được D1 thiếu chính sách). → **ĐÃ CÓ (vòng 2):** `moc-chua-co-smoke.mjs` (6 bước) — chính sách rỗng dựng trên D1 TẠM của kịch bản (DROP TRIGGER + DELETE), không sửa máy chủ / migration.
- **N-B-4:** khối thuần B1–B6 (`src/shared/dieu-phoi-hien-thi.ts`) mới là bộ ánh xạ chữ; khối DOM (`h()`) chưa dựng vì chưa có trang để kiểm bằng Chrome — dựng cùng B1–B6 khi có route A13 / A15.

## 6. P16 — quan sát kịch bản mới đỏ thật một lần

| Kịch bản | Sửa cố ý | Đỏ quan sát được | Hoàn nguyên |
|---|---|---|---|
| `chinh-sach-dieu-phoi-smoke.mjs` | `web/shell.ts`: mục con "Lý do điều phối" đổi điều kiện `danhMuc` → `chinhSach` (build lại) | bước 8 ✗ — thanh bên của Quản trị `{"items":["Xe","Sắp hết hạn","Loại giấy tờ xe"],"current":null}`; 12 ✓ / 1 ✗, thoát 1 | chép lại bản lưu (`shell.ts.bak` ở thư mục tạm), `grep` thấy lại `if (danhMuc) … TRANG_LY_DO`, build lại |
| (lần chạy đầu, không cố ý) | — | bước 1, 2, 4, 6 ✗ — axe `color-contrast` ở `#cs-hop-dong-hint` (dòng khoá mờ .6 theo bản vẽ) | sửa CSS (D8-8) → 13/13 |
| `dat-gap-smoke.mjs` | `src/shared/dat-gap-hien-thi.ts`: `tomTatChanXacNhan` luôn trả null (nút Xác nhận không bao giờ khoá) — build lại | bước 2 ✗ "nút Xác nhận khoá — false !== true"; bước 6 ✗ (không có dòng khoá); bước 7 ✗ theo (khung chưa điền); 8 ✓ / 3 ✗, thoát 1 | chép lại bản lưu (`dat-gap-hien-thi.ts.bak`), `grep -c "SỬA CỐ Ý"` = 0, build lại |
| (lần chạy đầu, không cố ý) | — | bước 4, 8 ✗ axe `color-contrast` trong bảng "Sửa thông tin chuyến" (bảng ≥ 641px hiện dần bằng opacity — axe đo giữa chuyển động); bước 10 ✗ chữ "Khách đoàn gọi gấp" có trên trang Đối tác — ở khối Lịch sử (Q-B-5) | chờ 600 ms trước axe; bước 10 thu hẹp vào khối dịch vụ + ghi nhận dòng Lịch sử → 11/11 |

## 6.1 Kịch bản cũ bị đổi có chủ đích (B8)

- `xe-smoke.mjs` bước 2 và `danh-muc-giay-to-smoke.mjs` bước c: nhóm VẬN CHUYỂN ở trang Tôi của Quản trị nay có thêm "Lý do điều phối" → đỏ sau B8 (đã thấy: 12 ✓ / 1 ✗ và 9 ✓ / 1 ✗) → sửa danh sách chờ → xanh lại (13/13, 10/10).
- `trang-chu-smoke.mjs`: số mục thanh bên của Quản trị 16 → **17** (số thật 15 → 16, vẫn giữ nợ "Nhật ký" ADR-0038) ở `:542` và `:968`. **Chưa kiểm được** bằng lần chạy: kịch bản đỏ sẵn từ trước bước đếm (dựng dữ liệu bằng xác nhận đơn đón hôm nay → 409 `short_notice_required` — mục 1.1). Số 16 thật đã thấy gián tiếp ở `chinh-sach-dieu-phoi-smoke.mjs` bước 8 (thanh bên Quản trị có "Lý do điều phối").
- `dot-c-smoke.mjs`: đỏ sẵn như mục 1.1 (cùng câu, không đổi do B8).

## 6.2 Gộp máy chủ và chạy lại sau B7

- Gộp `9b48da1` bằng merge `--no-ff` (gồm `cf5dc91` R-P18, `56821fb` R-P15, `9b48da1` N-14) → commit gộp `eacf01a`, **không xung đột**; `npm test` 1653/1653, `npm run typecheck` 0 ngay sau gộp.
- Sau B7 (chạy nối tiếp, `chay-chrome.sh sau-b7`): `dat-gap-smoke.mjs` 11/11; `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` xanh; `chinh-sach-dieu-phoi-smoke.mjs` 13/13 (sau gộp); `v1-nguoi-phu-trach.mjs` 16 ✓ / 1 ✗ — chỉ còn (b) đỏ sẵn như mốc (bước (h) nay xanh); `a2-smoke-form.mjs` **đỏ một lần** khi chạy nối tiếp — bước 10g gọi `#catalog-q` ngay sau khi chờ phần tử TĨNH `#add-manual` (mã trang chưa chạy xong → `catalog-q` chưa dựng; kịch bản chờ sai phần tử); **chạy lại riêng: xanh** ("UI SMOKE FORM OK"). Ghi là kịch bản chập chờn (nợ N-B-1), không đổi kịch bản.

## 7. Kết quả kiểm cuối phiên (tự khai)

Đỉnh `5d92533` + tệp README bằng chứng (commit cuối phiên). **Chưa có người kiểm độc lập.**

| Lệnh | Kết quả |
|---|---|
| `npm test` | thoát 0 — 1667/1667 (1640 của máy chủ sau gộp + 13 `chinh-sach-hien-thi` + 6 `dat-gap-hien-thi` + 2 `order-errors` + 6 `dieu-phoi-hien-thi`) |
| `npm run typecheck` | thoát 0 |
| `npm run build:web` | thoát 0 |
| `npm run test:e2e -- pwa orders trip chang-hanh-khach chinh-sach-dieu-phoi` | thoát 0 — 6/6 (pwa: "thẻ meta iOS … trên **26** trang" = 23 + 3 trang mới) |
| `chinh-sach-dieu-phoi-smoke.mjs` | 13/13 (có axe), đã thấy đỏ thật (mục 6) |
| `dat-gap-smoke.mjs` | 11/11 (có axe), đã thấy đỏ thật (mục 6) |
| `xe-smoke.mjs`, `danh-muc-giay-to-smoke.mjs` | 13/13, 10/10 (sau khi sửa danh sách chờ — mục 6.1) |
| `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` | xanh |
| `a2-smoke-form.mjs` | xanh khi chạy riêng; một lần đỏ chập chờn khi chạy nối tiếp (N-B-1) |
| `v1-nguoi-phu-trach.mjs` | 16 ✓ / 1 ✗ — (b) đỏ sẵn như mốc |
| `v1-xac-nhan-png.mjs` (phần `moi=1` — trang đơn nay bỏ thêm tham số `datgap`) | thoát 0 — 13 bước ✓ |
| `trang-chu-smoke.mjs`, `dot-c-smoke.mjs` | đỏ sẵn như mốc (mục 1.1), không do Phần B |

**Tài liệu mô tả:** `docs/SYSTEM-DESIGN.md` §9 thêm ba trang mới, lời gọi mới của Lập/sửa đơn và Chi tiết đơn, ba tệp thuần mới. `docs/CHANGE-GUIDE.md` công thức c (thêm trang web) đã đối chiếu: đủ bảy bước, không bước nào ngoài phần đã làm.

**Chỗ yếu của các khẳng định trên (nói thẳng):** "đỏ trước" của kịch bản Chrome là SỬA CỐ Ý sau khi đã làm (P16), không phải chạy trước khi có mã; bài thuần thì đỏ trước thật (tệp chưa có). Số mục thanh bên 17 của `trang-chu-smoke.mjs` chưa từng chạy tới. Nhánh 503 chỉ có bài thuần. `a2-smoke-form.mjs` chập chờn một lần.

**Chưa làm (chờ điều phối):** B1–B6 (cần route A13 / A15 và R-P12, R-P13, R-P14, R-P16, R-P17 gộp sang); khối DOM của B1–B6 (N-B-4); mục "Điều phối xe" trên menu (theo B1); Q2 "Đã gọi báo" (chờ quyết định bổ sung của chủ); thử iPhone thật.


## 8. Vòng 2 (29/9 tối, sau trả lời Q-B-1…5 của điều phối)

### 8.1 Làm xanh kịch bản Chrome đỏ sẵn — nguyên nhân gốc (đều là KỊCH BẢN cũ, app đúng theo quyết định đã duyệt; không có "hành vi app sai")

| Kịch bản | Nguyên nhân gốc | Sửa kịch bản | Kết quả |
|---|---|---|---|
| `trang-chu-smoke.mjs` | (1) dựng dữ liệu xác nhận đơn đón HÔM NAY → 409 `short_notice_required` (ADR-0049 D2 — đúng luật); (2) "Cần xem lại" của Quản trị chờ dòng góp ý — ADR-0038: hàng đợi Góp ý chỉ Toàn quyền (`feedback.triage`; `web/home.ts:191`); (3) số mục thanh bên giữ "nợ Nhật ký" — ADR-0038: Nhật ký chỉ Toàn quyền; (4) mở `/audit` bằng Quản trị — ADR-0038 | (1) `createAndConfirm`: 409 → Quản trị đặt gấp đúng các chặng máy chủ nêu (route 30, lý do `KHAC`) rồi xác nhận lại — không nới máy chủ, không đổi ngày giờ dữ liệu; (2) Quản trị có đúng 1 dòng (Sheet), khẳng định KHÔNG có dòng `/feedback`; (3) đếm THẬT 16 + so đúng danh sách `ADMIN_NAV` (`:541`, `:556`); (4) `/audit` (FRAME_PAGES + G-8) mở bằng tài khoản Quản trị + Toàn quyền (19 mục) | TRANG CHU SMOKE OK (41 ✓) |
| `dot-c-smoke.mjs` | thứ tự DOM trang Tôi thiếu `#push` (mục tĩnh của ADR-0036 ở `public/account.html:19`) | thêm `push` vào hai danh sách (máy tính, điện thoại) | DOT C SMOKE OK |
| `v1-nguoi-phu-trach.mjs` (b) | `getMain` giao đơn chưa có người cho CHÍNH người gọi → máy chủ ghi `order_claimed` "Tự nhận phụ trách đơn" (ADR-0034 §4.3, commit `7db026c`), không phải `order_handler_changed` | chờ một dòng "Tự nhận phụ trách đơn" + một dòng "Đổi người phụ trách" | 17 bước ✓ |
| `a2-smoke-form.mjs` 10g (N-B-1) | chờ `#add-manual` (HTML tĩnh) rồi gọi ngay `#catalog-q` (JS dựng) | chờ `#catalog-q` | UI SMOKE FORM OK |

### 8.2 Bài canh R-P21 và gộp máy chủ `df32e83`

- `dat-gap-smoke.mjs` tách bước **10b** (lịch sử đơn của Đối tác không có nhãn lý do đặt gấp, không có tên người duyệt). **Đỏ thật trước khi gộp** (máy chủ `9b48da1`): `["… — Đặt gấp chặng đưa đón · Quản Trị TD-20260929-0003 · Chiều đi · đặt gấp: Khách đoàn gọi gấp"]`, 11 ✓ / 1 ✗.
- Gộp `df32e83` (gồm `b3aebd0` A12 migration 0042; `df32e83` R-P21, R-P22) bằng merge `--no-ff` → `d1f01a4`, **không xung đột**; `npm test` 1717/1717, typecheck 0.
- **Sau gộp: 10b xanh** — DAT GAP SMOKE OK (12 bước). Đây là bằng chứng P16 phía giao diện cho R-P21 (đỏ → xanh do máy chủ vá, không sửa giao diện).

### 8.3 R-P22 (Q-B-3) — ẩn "Ngưng" với lý do hệ thống

- `nutBatTatLyDo` (`src/shared/chinh-sach-hien-thi.ts`, bài đỏ trước → xanh): `heThong` + đang dùng → không nút "Ngưng", ghi chú "Hệ thống tự dùng — không ngưng được"; đang ngưng → luôn "Dùng lại".
- `web/ly-do-dieu-phoi.ts` dùng hàm đó; 409 `ly_do_he_thong` hiện câu của máy chủ ở dải lỗi ("Lý do này do hệ thống tự dùng nên không ngưng được — chỉ sửa được tên và thứ tự.").
- `chinh-sach-dieu-phoi-smoke.mjs`: bước 8 thêm khẳng định (không nút Ngưng, có ghi chú; lý do thường vẫn có); bước **9b** mới — trang giả lập dữ liệu cũ (bọc `fetch` CHỈ trên một trang để GET trả `heThong: false`) → bấm Ngưng → máy chủ thật 409 → dải lỗi câu lời thường; máy chủ không ngưng. 14 bước ✓.

### 8.4 N-B-3 — ca Chrome cho 503 `moc_toi_thieu_chua_co`

- `moc-chua-co-smoke.mjs` (6 bước, 1040 + 390): dữ liệu dựng khi CÒN chính sách, rồi trên **D1 tạm của kịch bản** `DROP TRIGGER vc_dispatch_policy_no_delete` + `DELETE FROM vc_dispatch_policy` (không sửa máy chủ, migration hay D1 local của worktree). Kiểm: biểu mẫu không cảnh báo mốc (route mốc 503) và **Lưu nháp có giờ đón bị 503** (máy chủ I25) → dải đỏ; trang đơn không khoá Xác nhận, bấm → 503; bảng sửa chuyến đơn đã xác nhận → 503 (không mở khung Đặt gấp); Toàn quyền lưu bản chính sách đầu tiên từ trạng thái rỗng → route mốc 200, xác nhận được.
- Phát hiện khi viết ca: lưu nháp có chặng cũng bị 503 (không chỉ xác nhận / sửa chuyến) → câu phụ của `order-errors` đổi thành "Chưa lưu, xác nhận hay sửa chuyến có giờ đón được cho tới khi Toàn quyền đặt chính sách điều phối." (bài thuần sửa theo).

### 8.5 P16 vòng 2

| Kịch bản | Sửa cố ý | Đỏ quan sát được | Hoàn nguyên |
|---|---|---|---|
| `moc-chua-co-smoke.mjs` | `order-errors.ts`: đổi mã nhánh 503 thành mã không tồn tại (build lại) | bước 1, 2, 4 ✗ (thiếu dòng phụ), 3 ✓ / 3 ✗, thoát 1 | chép lại bản lưu, `grep -c P16` = 0, build lại |
| `chinh-sach-dieu-phoi-smoke.mjs` (R-P22) | `nutBatTatLyDo` luôn trả "Ngưng" | bước 8 ✗ "lý do hệ thống không có nút Ngưng", 13 ✓ / 1 ✗, thoát 1 | như trên |
| `dat-gap-smoke.mjs` 10b | (không sửa cố ý — đỏ THẬT do máy chủ chưa vá) | xem 8.2 | máy chủ vá `df32e83` |

### 8.6 Kết quả cuối vòng 2 (tự khai, chưa có người kiểm độc lập)

| Lệnh | Kết quả |
|---|---|
| `npm test` | 0 — 1718/1718 |
| `npm run typecheck` | 0 |
| `npm run build:web` | 0 |
| `npm run test:e2e -- pwa orders chinh-sach-dieu-phoi` | 0 — 4/4 ("26 trang") |
| `chinh-sach-dieu-phoi-smoke.mjs` | 14/14 |
| `dat-gap-smoke.mjs` | 12/12 (10b xanh sau gộp R-P21) |
| `moc-chua-co-smoke.mjs` (mới) | 6/6 |
| `trang-chu-smoke.mjs` | xanh (41 ✓) |
| `dot-c-smoke.mjs` | xanh |
| `v1-nguoi-phu-trach.mjs` | 17/17 |
| `a2-smoke-form.mjs` | xanh |
| `xe-smoke.mjs`, `danh-muc-giay-to-smoke.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs`, `v1-xac-nhan-png.mjs` | chạy lại sau gộp `df32e83`: cả năm thoát 0 (13, 10, OK, OK, 13 bước) |

Mọi kịch bản Chrome trong bảng `web/CLAUDE.md` mà Phần B chạm tới nay đều xanh trên đỉnh nhánh — không còn kịch bản "đỏ sẵn" nào trong nhóm này.

**Chờ điều phối:** R-P23 ("ai lưu" trong lịch sử bản chính sách) — làm phần hiển thị khi có sha; B1–B6 khi có A13 / A15.

## 9. Vòng 3 (29/9 đêm) — B1–B3 phần VĂN PHÒNG

### 9.1 Lệnh điều phối (ghi nguyên ý)
Gộp máy chủ `857f54c` (A13 `18f2a50`: chín route văn phòng lich / chuyen / chuyen/:id / PUT / phan-bo / rut / doi / huy / cap-nhat-diem, ô trip.view / dispatch / override, `nhatKy[].nguoiBam`; R-P23 `nguoiLuu`); R-P23 hiện "ai lưu" (null → không dòng); dựng B1, B2, B3 cho văn phòng theo bản vẽ + bản đối chiếu + khối thuần; menu "Vận chuyển" hiện khi `vehicle.manage` HOẶC `trip.view`, thêm "Điều phối xe" (Q-B-4). Bấm thay / "xảy ra lúc" / nút tiến độ chờ A15 — dựng chỗ, chưa nối. "Giờ hẹn đổi — gọi báo khách" + "Đã gọi báo" (ADR-0051) KHÔNG làm vòng này (Task B-GB); thẻ "Giờ xe tới muộn hơn giờ hẹn" không có nút "Đã gọi báo" (Q-GB-1 = b). Mỗi màn: Chrome đỏ trước / xanh sau, 390 + 1040, ba vai, ảnh, commit riêng. Lời nhắn sau: R-P12/13/16 đã có trong A13 — màn dùng `khoaMoc`, KHÔNG tự tính vùng khoá theo giờ hiện tại; `/chuyen/:id` có `diem[].lechDon`. Lời nhắn cuối: A15 đã có `1bf2960` — làm SAU khi B1–B3 commit sạch (mục 10). Lời nhắn sau đó: điểm gộp đổi thành `c98b0e9` (chứa `1bf2960`, e2e `370b4a2`, A14 `520ebcd`, A-GB / ADR-0051 + migration 0043); thứ tự: B1–B3 → gộp `c98b0e9` → bấm thay + B4–B6 + Q5 trang đầu tài xế → B-GB (nhắc gọi báo khách: DTO ở `src/shared/contracts.ts` + hằng chữ ở `src/shared/goi-bao.ts` của `c98b0e9`; "Đã gọi báo" chỉ khi `baoDuoc`, "Bỏ đánh dấu" chỉ khi `boDuoc`; 409 `khong_con_can_goi` / `gio_hen_vua_doi` → "Giờ hẹn vừa đổi hoặc đã có người báo — tải lại." + Tải lại; tài xế không thấy gì; không SĐT khách ở danh sách nhắc; Chrome ba vai; P16 bỏ điều kiện `baoDuoc` → bước Kế toán đỏ). Điều phối hỏi trạng thái B1: commit `8666fa4`.

### 9.2 Commit
| Việc | Commit |
|---|---|
| Gộp máy chủ `857f54c` | `61c53be` |
| R-P23 "ai lưu" | `8764a88` |
| B3 Tạo / sửa chuyến (+ khối thuần `dieu-phoi-man.ts`, khối UI chung `web/dieu-phoi-ui.ts`, dữ liệu thử `dungDuLieuDieuPhoi`) | `7037b7d` |
| B2 Chi tiết chuyến | `ca73650` |
| B1 Điều phối xe + menu (Q-B-4) + sửa kịch bản cũ theo menu | `8666fa4` |
| B1 sửa: khung dòng thời gian nhảy về chuyến đầu ngày mỗi lần vẽ lại (bấm khối, sau khi xếp / cập nhật) + ca Chrome; trang Tôi của Kế toán; tài liệu vòng 3 | commit "B1 sửa: …" ngay sau `8666fa4` |

### 9.3 Lệch bản vẽ / giả định bề mặt (P8 — đảo ngược được)
- **D-B2-1** (Chi tiết chuyến): bảng điểm dừng 7 cột của 2a (28 / 44 / 1fr / 60 / 72 / 48 / 118 px) cạnh cột phải 280px chỉ còn ~24px cho cột NƠI ở khổ 1040 (đo trên ảnh lần chạy đầu: tên nơi gãy từng chữ). Dưới 1200px hai thẻ "Điều kiện xuất bến" + "Nhật ký chuyến" xuống dưới bảng (xếp đôi); từ 1200px đúng bố cục 2a. Hoàn tác: một khối `@media` trong `public/app.css`.
- **D-B1-1** (dòng thời gian): KHÔNG tô "vùng nền nhạt từ bây giờ tới mốc" của bản vẽ — lệnh điều phối "không tự tính vùng khoá theo giờ hiện tại". Khối chuyến mang ổ khoá theo `khoaMoc.dangKhoa`; vạch "Bây giờ" và vạch mốc (R-P12) vẫn vẽ để nhìn; câu chú thích đổi thành "Chuyến có 🔒 đang trong vùng khoá…".
- **D-B1-2**: thẻ chặng là NÚT mở hộp "Xếp vào chuyến" (chọn chuyến lên kế hoạch theo giờ, số khách — ít hơn là tách đoàn), máy tính thêm kéo thả vào khối chuyến (mở cùng hộp, chuyến đã chọn sẵn). Bản vẽ chỉ có câu "Kéo chặng thả vào một chuyến" và nút "Xếp vào chuyến…" ở điện thoại, không vẽ hộp — dựng theo khuôn hộp Phá lệ (1f). Câu gợi ý đổi thành "Kéo chặng thả vào một chuyến, hoặc bấm chặng để chọn chuyến".
- **D-B1-3**: đầu cột "Cần xử lý" không có nhãn vai ("Quản trị") — đó là chú thích so vai của bản vẽ.
- **D-B1-4**: mục menu "Điều phối xe" không có huy hiệu số (bản vẽ: 8) — máy chủ chưa có nguồn số (Q-B-10).
- **D-B1-5**: vị trí khối trên dòng thời gian đặt bằng biến CSS KHÔNG đơn vị (`--dp-x`, `--dp-dai`, `--dp-so-gio` qua `style.setProperty`) — mọi số đo là token (`--dp-gio` 34px / giờ, `--w-dp-tl-nhan` 96px, `--h-dp-tl-hang` 64px…).
- **D-B1-6**: giữ tiêu đề trang (h1) ở điện thoại (bản vẽ chỉ có tên ở thanh trên) — như B2 / B3 và mọi trang khác.
- **D-B2-2**: nút Sửa / Huỷ ở điện thoại là lưới hai cột CUỐI trang (bản vẽ 2b), không dính đáy.
- **B3**: không ô "Ghi chú cho tài xế" (chủ Q1). Câu "cần phá lệ" mốc gắn vào ô đang đổi (Xe trước, rồi Tài xế); tạo mới / dời giờ không bao giờ cần phá lệ mốc (máy chủ quyết — 2.2, 2.3; bước 7 của `chuyen-sua-smoke` khẳng định dời giờ lưu được).
- **Cần xử lý**: cảnh báo "nơi hẹn khác điểm" của chuyến CHƯA chạy đã bị giữ "nơi đón / trả đã đổi" không thành mục thứ hai (mục chuyến bị giữ đã nói và có nút) — test thuần mới; máy chủ trả cảnh báo này cả cho chuyến PLANNED (thấy khi dò).
- **Trang Tôi** (Bán hàng, Kế toán): nay có nhóm VẬN CHUYỂN với một dòng "Điều phối xe" — "Danh bạ" chuyển từ `#links` sang `#links-top` như tài khoản Quản trị (khuôn sẵn của 1a).

### 9.4 Chờ A15 — KHÔNG dựng ở vòng này (không để nút chết)
B2: "Xuất bến thay tài xế", nút tiến độ bấm thay (ô "xảy ra lúc", "Sớm nhất: HH:MM"), "Kết thúc gián đoạn", "Mở màn Xuất bến ›". B1: thẻ chuyến đang chạy (mốc tiến độ, "giờ do văn phòng khai"). Màn chuyến RUNNING / ENDED chưa kiểm được bằng Chrome (dữ liệu thử không chạy chuyến được khi chưa có route A15). Nhánh hiển thị đã có sẵn: dải "Nơi hẹn khác điểm xe" của chuyến đang chạy (B2), "Bản chụp lúc xuất bến", chip "giờ do văn phòng khai" trong nhật ký.

### 9.5 Câu hỏi cho điều phối
- **Q-B-6**: rút khách (`/rut`), dời khách sang chuyến khác (`/doi`), người đi kèm (`nguoiDiKem`), sắp lại thứ tự điểm / giờ xe tới (`SuaChuyenRequest.diem`) — bản vẽ không vẽ chỗ bấm → CHƯA dựng. Cần bản vẽ, hay dựng theo khuôn sẵn?
- **Q-B-7**: `TaiXeChonDto` không có hạng GPLX → ô Tài xế không hiện "· hạng D" như bản vẽ 3a; lỗi hạng chỉ hiện sau khi lưu (409). Thêm trường vào DTO?
- **Q-B-8**: `ChangLichDto` không có cờ "nơi tự gõ" → không hiện được "Nơi tự gõ — mở đơn để xem" (bản vẽ 1a); màn hiện chữ máy chủ trả (đã che dãy số). Giữ vậy?
- **Q-B-9**: "Chưa có tài xế" — `POST /chuyen` bắt buộc tài xế, nên trạng thái này chỉ có khi tài xế bị gỡ về sau; nhánh hiển thị + nút "Chọn tài xế" đã dựng, chưa kiểm được bằng Chrome.
- **Q-B-10**: huy hiệu số ở mục "Điều phối xe" (bản vẽ: 8) — cần nguồn số từ máy chủ; chưa làm.
- **Q-B-11**: hộp "Xếp vào chuyến" (D-B1-2) không có trong bản vẽ — chủ có muốn vẽ lại không?

### 9.6 P16 — quan sát kịch bản mới đỏ thật một lần
| Kịch bản | Sửa cố ý (build lại) | Đỏ quan sát được | Hoàn nguyên |
|---|---|---|---|
| `chuyen-sua-smoke.mjs` | `dieu-phoi-man.ts`: bỏ `TRUNG_GIO_XE` khỏi nhóm ô Giờ kết thúc | bước 3 ✗ ("hết giờ chờ: dải 2 ô"), 11 ✓ / 1 ✗, thoát 1 | sửa lại dòng, `grep -c P16-DOT-BIEN` = 0, build lại |
| `chuyen-smoke.mjs` | `nhanDiem`: tắt nhánh `lechDon` | bước 1 ✗ (điểm không "Lệch đơn"), 7 ✓ / 1 ✗, thoát 1 | như trên |
| `dieu-phoi-smoke.mjs` | `thayDieuPhoiXe` hỏi `vehicle.manage` thay `trip.view` | Bán hàng bị từ chối, bảng không dựng → thoát 1. Lần đó chờ "bảng dựng xong" nằm NGOÀI bước nên dòng tổng ghi "OK (0 bước)" dù thoát 1 — đã chuyển mọi lần chờ vào trong bước | như trên |
| `dieu-phoi-smoke.mjs` bước 2 (ca mới: khung cuộn giữ chỗ) | `web/dieu-phoi.ts`: bỏ giữ `scrollLeft` (hành vi cũ — luôn cuộn về chuyến đầu ngày) | bước 2 ✗ "sau khi bấm (vẽ lại), khối vừa chọn vẫn trong khung", 9 ✓ / 1 ✗, thoát 1 | như trên |

Lỗi thật tìm ra nhờ người cố vấn (không phải kịch bản): bấm một khối gọi vẽ lại cột Xe → khung cuộn dựng mới rồi `requestAnimationFrame` kéo về chuyến đầu ngày — ở 390 và ở cột giữa ~350px của khổ 1040, bấm chuyến 14:30 là chuyến đó văng khỏi khung; kịch bản bấm bằng JS nên không thấy. Sửa: giữ `scrollLeft` qua các lần vẽ lại, chỉ tự cuộn một lần mỗi ngày xem (và chỉ khi khung đang hiện — thẻ "Xe" ở điện thoại thử lại lúc mở thẻ); `focus({ preventScroll: true })`.

### 9.7 Kịch bản cũ sửa theo menu mới (B1, Q-B-4)
`trang-chu-smoke.mjs` (Quản trị 17 mục — `ADMIN_NAV` thêm "Điều phối xe"; khung `/staff`, `/order-form` 17; `/audit` Toàn quyền 20); `xe-smoke.mjs` bước 1 (mục con đầu "Điều phối xe"), 2 (dòng "Điều phối xe" đầu nhóm VẬN CHUYỂN của trang Tôi), 3 (Bán hàng nay có mục cha + đúng một mục con / một dòng "Điều phối xe", vẫn không Xe / Sắp hết hạn, không gọi `/api/van-chuyen` ở trang Tôi); `danh-muc-giay-to-smoke.mjs` bước c, d (thêm "Điều phối xe"), j (Bán hàng: nhóm QUẢN TRỊ chỉ "Vận chuyển › Điều phối xe"); `chinh-sach-dieu-phoi-smoke.mjs` bước 1 (Toàn quyền: "Điều phối xe" đầu), 12 (Bán hàng: `["Điều phối xe"]`). Kịch bản tài xế (`tai-xe-trang-dau-smoke`, `tai-xe-doi-tac-smoke`) không đổi: tài xế không có ô trip.view không ngữ cảnh.

**Đỏ sẵn, KHÔNG do vòng 3, không sửa (ngoài phạm vi — báo điều phối):** `docs/evidence/2026-09-21-v1-0/kich-ban/v1-bao-tri.mjs` 15 bước ✗ từ bước đầu ("hết giờ chờ: mục bảo trì hiện"). Nguyên nhân gốc: kịch bản dùng `OWNER = ACCOUNTS.admin` (chỉ ADMIN) làm "chủ", còn `canToggle` của `GET /api/maintenance` từ ADR-0019 / ADR-0038 (26–27/9) cần ô `settings.ops` (chỉ Toàn quyền) — `src/modules/maintenance/index.ts:46`. `dot-c-smoke.mjs` đã đổi sang tài khoản ADMIN + SUPER_ADMIN vì đúng lý do này (chú thích dòng 20 của nó). Vòng 3 không đụng phần bảo trì của `web/account.ts` / `web/shell.ts`. Sửa = đổi `OWNER` sang tài khoản có SUPER_ADMIN (như `dot-c-smoke`) — chờ điều phối giao.

### 9.8 Kết quả cuối vòng 3 (tự khai, chưa có người kiểm độc lập)
| Lệnh | Kết quả |
|---|---|
| `node --test src/shared/dieu-phoi-man.test.ts` | 19/19 (13 của B3 + 6 mới của B1, đỏ trước xanh sau) |
| `npm run typecheck` | 0 |
| `npm run build:web` | 0 |
| quét CSS khối PWA (biểu thức của `tests/e2e/pwa.mjs`) | sạch |
| `chuyen-sua-smoke.mjs` | 12/12 |
| `chuyen-smoke.mjs` | 8/8 |
| `dieu-phoi-smoke.mjs` | xem dòng chạy lại sau sửa khung cuộn (mục 9.9) |
| lô hồi quy (trên `8666fa4`): `trang-chu-smoke`, `chinh-sach-dieu-phoi-smoke`, `dot-c-smoke`, `help-smoke`, `tai-xe-trang-dau-smoke`, `tai-xe-doi-tac-smoke`, `giay-to-cua-toi-smoke`, `sap-het-han-smoke`, `dieu-phoi-smoke`, `chuyen-smoke`, `chuyen-sua-smoke` | thoát 0 cả 11 |
| cùng lô: `xe-smoke`, `danh-muc-giay-to-smoke` | thoát 1 — đỏ ĐÚNG ở các bước lúc đó chưa sửa theo menu mới (`xe-smoke` bước 1: mục con "Điều phối xe" chen trước "Xe"; `danh-muc-giay-to-smoke` bước d như vậy, bước j: Bán hàng nay có nhóm QUẢN TRỊ); đã sửa trong `8666fa4`, chạy lại ở mục 9.9 |
| cùng lô: `v1-bao-tri.mjs` | thoát 1 — đỏ sẵn, xem trên |

### 9.9 Chạy lại sau sửa khung cuộn + trang Tôi Kế toán (đỉnh trước khi gộp máy chủ)
| Lệnh | Kết quả |
|---|---|
| `dieu-phoi-smoke.mjs` | 10/10 (bước 2 có ca khung cuộn giữ chỗ; bước 8 có trang Tôi của Kế toán) |
| `xe-smoke.mjs` | 13/13 |
| `danh-muc-giay-to-smoke.mjs` | 10/10 |
| `npm run test:e2e -- pwa` | 2/2 — "29 trang" |
| `npm test` | 1758/1759 — bài đỏ DUY NHẤT là `guard-remote: lệnh dị dạng không làm hook quá giờ` (đo thời gian của hook; máy đang có phiên khác chạy). Chạy riêng `node --test src/claude-guard.test.ts`: 11/11 (đúng như điều phối báo — bài đo CPU khi máy bận) |
| `npm run typecheck` | 0 |

## 10. Sau gộp máy chủ — bấm thay, B4–B6, Q5, B-GB, GA-55

### 10.1 Gộp
- `ef4c834` gộp `c98b0e9` (A15 + e2e + A14 + A-GB). Không đụng độ. `npm test` 1803/1804 (bài đỏ duy nhất: `guard-remote … quá giờ` — đo thời gian, chạy riêng 11/11), typecheck 0.
- Lời nhắn sau đó của điều phối: điểm gộp đổi thành `3497be6` (A16–A18: phản hồi lệnh ghi / tiến độ KHÔNG còn `hoTen` / `namSinh`, tài xế bỏ cả `lienHe`) + việc GA-55 — xem 10.6.

### 10.2 Khối thuần mới (đỏ trước, xanh sau)
- `src/shared/tien-do-man.ts` (+ test 9): `xayRaLucTu` (giờ SAU lúc bấm = hôm qua — không bao giờ tương lai), `goiYKhaiGio`, `cauTuChoiKhaiGio` (câu theo mã + mốc gây chặn — bản vẽ 6d; không tên người), `cauConKhach`, `buocDiem`, `ketThucDuoc`, `nhomCuoc`, `giuTenKhach` (GA-55 — viết SAU mã, không đỏ trước; bước Chrome "tên sau lệnh" là bài chặn thật).
- `src/shared/start-page.ts` Q5 (được điều phối cho sửa): `TRANG_CUOC = "/cuoc"`, `coCuocCuaToi` (quyền DRIVER), `chiTaiXe`; `homeRedirect`: tài xế công ty → `/cuoc`, tài xế đối tác → `/tai-xe` (chưa dùng chuyến). Test đỏ trước (thiếu export, rồi thiếu trang `/cuoc` trong PAGES) → xanh.
- `src/shared/dieu-phoi-man.ts` (ADR-0051): `viecGoiBao` (nhãn / "Ai xử lý" / câu đổi giờ lấy HẰNG của `goi-bao.ts`; nút CHỈ khi `baoDuoc`; khác ngày xem → "Chuyến dd/mm"), `dongGoiBao`; thứ tự cột Cần xử lý theo bản vẽ (chuyến bị giữ → chặng quá mốc → giờ hẹn đổi → cảnh báo khác → đơn nháp). Test đỏ trước (thiếu export) → xanh.

### 10.3 Màn
- **Bấm thay trên V2** (`web/chuyen.ts` + khối chung `web/tien-do-ui.ts`): "Xuất bến thay tài xế" (khoá khi bị giữ — 2.7), chuyến đang chạy hiện từng điểm + khách (khuôn 5a — lệch bản vẽ D-B2-3: văn phòng dùng CÙNG thẻ điểm của tài xế thay các dòng gọn của 5c, để có nút từng khách), "Kết thúc chuyến" (khoá khi còn khách), "Kết thúc gián đoạn" (lý do, KHÔNG ô ghi chú — Q1). Mọi lệnh qua hộp có ô "Xảy ra lúc": mặc định lúc mở hộp, CHỈ gửi `xayRaLuc` khi đã đổi (I34); gợi ý "Sớm nhất" từ `gioSomNhatKhai`; 409 giờ → câu dưới ô; mất mạng → câu "Chưa gửi được — kiểm tra mạng rồi bấm lại.", hộp và giờ đã khai giữ nguyên, bấm lại cùng requestId. Gate `trip.progress` (Kế toán không).
- **"Đã trả" ở điểm trả** = tới điểm (nếu chưa) rồi "đã trả" từng khách đang trên xe có điểm xuống ở đó — nhiều lệnh nối nhau, mỗi lệnh một requestId; hỏng giữa chừng thì đọc lại, bấm lại làm nốt (máy chủ không có lệnh "trả hết" một phát — ghi câu hỏi Q-B-13).
- **B4 `/cuoc`** (bản vẽ 04): hôm nay + ngày mai; thẻ là liên kết sang `/cuoc-chuyen`; không tên / SĐT. Giờ kết thúc dự kiến ("06:40 – 08:25") KHÔNG có trong DTO route 19 → chỉ giờ xuất bến (Q-B-12).
- **B5 + B6 `/cuoc-chuyen`** (bản vẽ 5a, 5b, 6b, 6c): chưa xuất bến → chỉ điều kiện còn thiếu "(văn phòng lo)" / "Đủ điều kiện xuất bến", nút "Xuất bến" dính đáy (không ô giờ); đang chạy → thẻ điểm + khách + liên hệ (tel:), đổi thứ tự điểm chưa tới bằng nút ↑ ↓ (lệch bản vẽ D-B5-1: thay tay nắm kéo — bấm được bằng bàn phím, không ô giờ), "Kết thúc chuyến", "Kết thúc gián đoạn". Mất mạng: dòng "Chưa gửi được" + "Bấm lại", dải "Mất mạng — N thao tác chưa gửi được"; KHÔNG tự gửi lại (lệnh điều phối — câu "Máy tự gửi lại khi có mạng" của 5a đã đổi).
- **Q5**: thanh tab tài xế công ty "Trang chủ" (/tai-xe) · "Cuốc của tôi" · "Tôi"; menu máy tính thêm "Cuốc của tôi"; khối "Cuốc xe" của /tai-xe thành liên kết; tài xế vẫn không thấy "Vận chuyển".
- **B-GB** (ADR-0051): cột Cần xử lý của Điều phối xe gọi `GET /nhac-goi-khach` cùng mỗi lần tải lịch (hiện ở mọi ngày đang xem); "Đã gọi báo" → dải "Đã ghi: đã gọi báo khách TD-…" + "Bỏ đánh dấu"; Chi tiết chuyến: dòng ở điểm đón (chặng ↔ điểm qua suất) + nút theo `baoDuoc` / `boDuoc`; 409 `khong_con_can_goi` / `gio_hen_vua_doi` → câu HẰNG `NHAN_TU_CHOI_GOI_BAO` + "Tải lại". Thẻ "xe tới muộn" không nút. Tài xế không có gì.

### 10.4 Lỗi tìm ra khi chạy (đã sửa trước commit)
- `dongMoc` đưa chuỗi "HH:MM dd/mm" vào `nhanMocTienDo` → `RangeError: Invalid time value` khi mốc khác ngày chuyến (xuất bến hôm nay cho chuyến ngày mai) → màn đứng sau lệnh "Đã tới". Bắt được nhờ ghi thêm nội dung trang + lỗi console vào câu báo của bước 4 `cuoc-smoke`. Sửa: đưa giờ TRẦN, nối ngày ở màn.
- Bước 8 lần đầu khai "Đã tới" sớm hơn giờ xuất bến vừa ghi → máy chủ từ chối đúng (sai thứ tự). Đổi kịch bản: khai giờ ở lệnh xuất bến (đúng "Sớm nhất"), "Đã tới" để nguyên.

### 10.5 Câu hỏi mới cho điều phối
- **Q-B-12**: route 19 (`CuocCuaToiItemDto`) không có giờ kết thúc dự kiến — bản vẽ 04 hiện "06:40 – 08:25". Thêm khoá?
- **Q-B-13**: "Đã trả" ở điểm trả (5a: "Trả hết khách đang trên xe ở điểm này") đang là nhiều lệnh nối nhau (tới điểm + từng suất). Cần một lệnh "trả hết" ở máy chủ không?
- **Q-B-14**: bản vẽ 6a có TRANG "Xuất bến CX-…" riêng cho văn phòng (bảng điều kiện có cột "Ai xử lý" + nút) — màn làm "Xuất bến thay tài xế" ngay trong Chi tiết chuyến (bảng điều kiện đã có ở đó) + hộp 6d. Cần trang riêng không?
- **Q-B-15**: văn phòng đổi thứ tự điểm khi chuyến đang chạy (route 39) — bản vẽ không vẽ chỗ bấm cho văn phòng; chưa dựng.
- **Q-B-16**: "Bản chụp lúc xuất bến" (`BanChupDto.muc[]`) chỉ có MÃ loại giấy tờ (`loaiGiayTo`), không tên — lần chạy đầu màn lộ "GIAY_TO_XE" (bắt được bằng `noCode` của `cuoc-smoke` bước 8). Nay hiện nhãn theo loại ("Giấy tờ xe", "Giấy phép lái xe"…) + hạng + hạn (`dongBanChup`, test đỏ trước). Thêm tên loại giấy vào DTO?

### 10.6 GA-55 (máy chủ A18 — phản hồi lệnh không còn tên)
- Cách chọn: đọc lại ĐÚNG GET chi tiết sau mỗi lệnh (`docLai` ở `web/chuyen.ts`; `gui` → `nap()` ở `web/cuoc-chuyen.ts`); đọc lại hỏng → `giuTenKhach` giữ tên theo id suất (không ô trống, không "undefined"). B3 (`/chuyen-sua`) sau lưu chuyển sang `/chuyen` (GET) nên không cần gì; B1 không hiện tên; B-GB không có tên.
- Kiểm cả phần đã commit: B2 `ca73650` dựng tên từ phản hồi POST (huỷ, cập nhật điểm) — nay đọc lại; B3 `7037b7d` không dựng tên từ POST.
- Bước Chrome "bấm lệnh → tên vẫn đúng": `cuoc-smoke` bước 4 (tài xế) và bước 8 (văn phòng).

### 10.7 Commit
| Việc | Commit |
|---|---|
| Gộp `c98b0e9` | `ef4c834` |
| Bấm thay + B4–B6 + Q5 + B-GB (+ `dongBanChup`, GA-55 đọc lại) — MỘT commit vì hai phần dùng chung tệp (`dieu-phoi-man.ts`, `chuyen.ts`, `app.css`); hai kịch bản Chrome riêng | `d60adcb` |
| Gộp `3497be6` (A16–A18) | `337d060` |

### 10.8 P16 — quan sát đỏ thật
| Kịch bản | Sửa cố ý (build lại) | Đỏ quan sát được | Hoàn nguyên |
|---|---|---|---|
| `cuoc-smoke.mjs` (GA-55, trên máy chủ `3497be6`) | `web/chuyen.ts` `docLai` trả thẳng phản hồi lệnh; `web/cuoc-chuyen.ts` `gui` gán thẳng phản hồi | bước 3 ✗ ("đang chạy: có tên khách"), 4 ✗ (tên sau lệnh), 8 ✗ (tên khách) — 7 ✓ / 3 ✗, thoát 1 | chép lại bản lưu, `grep P16-DOT-BIEN` rỗng, build lại |
| `cuoc-smoke.mjs` (I34) | `web/tien-do-ui.ts`: `doi = true` (luôn gửi `xayRaLuc`) | bước 8 ✗ ("để nguyên → một giờ, không dấu văn phòng khai"), 9 ✓ / 1 ✗, thoát 1 | như trên |
| `goi-bao-smoke.mjs` | `viecGoiBao`: bỏ điều kiện `baoDuoc` (luôn có nút) | bước 6 ✗ ("Kế toán: baoDuoc = false → không nút"), 6 ✓ / 1 ✗, thoát 1 | như trên |
| `start-page.test.ts` (Q5) | (đỏ trước khi viết mã: thiếu export, rồi thiếu trang `/cuoc` trong PAGES) | 1 ✗ | viết mã + trang |

### 10.9 Kết quả trên đỉnh sau gộp `3497be6` (tự khai, CHƯA có người kiểm độc lập)
| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 1832/1833 — bài đỏ duy nhất `guard-remote: lệnh dị dạng không làm hook quá giờ` (đo thời gian của hook khi máy bận; chạy riêng `src/claude-guard.test.ts` 11/11 — như điều phối báo) |
| `npm run build:web` | 0 |
| `npm run test:e2e -- pwa` | 2/2 — "31 trang" |
| `cuoc-smoke.mjs` | 10/10 |
| `goi-bao-smoke.mjs` | 7/7 |
| `chuyen-smoke.mjs` | 8/8 |
| `chuyen-sua-smoke.mjs` | 12/12 |
| `dieu-phoi-smoke.mjs` | 10/10 |
| `tai-xe-trang-dau-smoke.mjs` (Q5) | 4/4 |
| `tai-xe-doi-tac-smoke.mjs` | 4/4 (tài xế đối tác vẫn /tai-xe, không "Cuốc của tôi") |
| `trang-chu-smoke.mjs` | xanh |

Không chạy lại ở đỉnh này: `xe-smoke`, `danh-muc-giay-to-smoke`, `chinh-sach-dieu-phoi-smoke`, `dot-c-smoke`, `help-smoke`, `giay-to-cua-toi-smoke`, `sap-het-han-smoke` (xanh ở mục 9.8 / 9.9; vòng 4 không đụng phần của chúng ngoài `web/shell.ts` — tab tài xế chỉ bật khi `chiTaiXe`). `v1-bao-tri.mjs` đỏ sẵn (mục 9.7).

### 10.10 Sửa sau góp ý của người cố vấn (cùng phiên, trước khi báo cáo)
- **Giờ khai gõ nhầm ở tương lai** không bao giờ tới máy chủ: `xayRaLucTu` cũ coi mọi giờ sau lúc bấm là hôm qua → câu "Giờ này chưa tới" của bản vẽ 6d không bao giờ hiện, thay bằng câu "lùi quá…" / "sai thứ tự" khó hiểu. Nay chọn ngày (hôm qua / hôm nay / ngày mai) GẦN lúc bấm nhất (test đỏ trước: 20 phút sau lúc bấm → hôm nay; 23:59 gõ 00:04 → ngày mai). `cuoc-smoke` bước 7 nay khẳng định "Giờ này chưa tới — bây giờ là HH:MM." — 10/10 (lần chạy đầu sau sửa rơi đúng 23:59 và lộ nhánh qua nửa đêm → thêm ứng viên "ngày mai", chạy lại 10/10).
- **Hai bộ câu cho cùng một việc**: `cauTuChoiGioXayRa`, `nhanSomNhat`, `nhanAiXuLy` (dieu-phoi-hien-thi.ts, không nơi gọi) đã XOÁ cùng test; câu "Sớm nhất" / từ chối giờ khai chỉ còn ở `tien-do-man.ts`; đầu tệp + dòng SYSTEM-DESIGN sửa theo.
- **Q-B-17**: câu từ chối "lùi quá giới hạn" không nêu được "tối đa 180 phút" như bản vẽ 6d — DTO 409 / chi tiết chuyến không có số phút kẹp lùi của chính sách. Thêm khoá?
- **Lệch thứ tự** so với lệnh điều phối: bấm thay + B4–B6 + B-GB dựng trên `c98b0e9`, gộp `3497be6` SAU (lệnh: gộp + GA-55 trước). Bằng chứng GA-55 đứng vững trên `3497be6`: P16 GA-55 (10.8) chạy trên máy chủ `3497be6`; tám kịch bản xanh ở 10.9.
- Lời nhắn cuối của điều phối: điểm gộp đổi thành `da38060` (bản cuối Phần A, không đổi DTO sau A18) — gộp ở điểm sạch kế tiếp (mục 11).

## 11. Gộp `da38060` (bản cuối Phần A) — kết quả cuối (tự khai, CHƯA có người kiểm độc lập)
- `453ebc9` gộp `da38060` (A19–A21, R-VC-19, sửa đề xuất luật; không đổi DTO sau A18). Không đụng độ; phần của nhánh giao diện ở SYSTEM-DESIGN, đề xuất luật còn nguyên.

| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | 0 |
| `npm test` | 1831/1832 — bài đỏ duy nhất `guard-remote: lệnh dị dạng không làm hook quá giờ` (đo thời gian khi máy bận); chạy riêng `src/claude-guard.test.ts` 11/11 |
| `npm run build:web` | 0 |
| `npm run test:e2e -- pwa` | 2/2 — "31 trang" |
| Chrome (12 kịch bản) | thoát 0 cả 12: `cuoc-smoke` 10/10, `goi-bao-smoke` 7/7, `chuyen-smoke` 8/8, `chuyen-sua-smoke` 12/12, `dieu-phoi-smoke` 10/10, `chinh-sach-dieu-phoi-smoke` 14/14, `tai-xe-trang-dau-smoke` 4/4, `tai-xe-doi-tac-smoke` 4/4, `xe-smoke` 13/13, `danh-muc-giay-to-smoke` 10/10, `trang-chu-smoke` OK, `dot-c-smoke` OK |

Không chạy lại ở đỉnh này: `help-smoke`, `giay-to-cua-toi-smoke`, `sap-het-han-smoke` (xanh ở 9.8 trên `8666fa4`; vòng 4 không đụng phần của chúng). `v1-bao-tri.mjs` đỏ sẵn từ ADR-0019 (mục 9.7). e2e máy chủ (`dieu-phoi`, `tai-xe-cuoc`…) không chạy — nhánh giao diện không đổi route / migration.

## 12. Vòng 5 — sửa theo kiểm độc lập K2b (người kiểm chấm Phần B @`fed514e`: ĐẠT CÓ ĐIỀU KIỆN, không lỗ dữ liệu / quyền)

### 12.1 Commit (mỗi việc một commit, thân ghi "theo kiểm độc lập K2b")
| Việc | Commit |
|---|---|
| Gộp máy chủ `ed3b59e` (sửa theo K2a: lệnh lặp "Đã gọi báo" / "Bỏ đánh dấu" trả kết quả lần đầu; không đổi DTO) | `f6427b5` |
| T1 — Điều phối xe chặn `can(staff, "trip.view")` trước mọi lời gọi | `8fa1762` |
| T2 — tài khoản vừa tài xế công ty vừa văn phòng có lối tới "Cuốc của tôi" | `51c7c66` |
| Thanh tab che nút cuối? — ca Chrome "nút cuối không bị che" + nhật ký vòng 5 | commit ngay sau `51c7c66` |

### 12.2 T1
- `web/dieu-phoi.ts`: `main` hỏi `can(staff, "trip.view")` (như `web/chuyen.ts`); không có ô → ẩn ô ngày + nút đổi ngày, chỉ câu từ chối. `nap()` chặn cùng ô ở đầu (mọi đường tải lại: đổi ngày, sau lệnh). Trước đó: tài xế gõ thẳng `/dieu-phoi` thấy câu từ chối NHƯNG vẫn còn ô ngày; bấm "›" thì gọi `GET /api/van-chuyen/lich` (máy chủ trả 403 — không lộ dữ liệu, chỉ là lời gọi thừa).
- `dieu-phoi-smoke` bước 7b (tài xế An): đỏ trước khi sửa ("không nút đổi ngày"); P16 sau khi sửa: bỏ chặn trong `nap()` → đỏ ở "không lời gọi lịch xe nào" → hoàn nguyên.

### 12.3 T2 — giả định bề mặt GA-K2b-T2 (điều phối chốt, đảo ngược được)
- Thanh bên: mục "Cuốc của tôi" ở nhóm TÔI khi `coCuocCuaToi(staff)` (trước: chỉ khi `chiTaiXe`).
- Điện thoại: KHÔNG thêm tab cho tổ hợp này (thanh tab văn phòng: Quản trị đã 6 tab) — dòng "Cuốc của tôi" ở nhóm VẬN CHUYỂN của trang Tôi (sau "Điều phối xe"); ở `/cuoc` tab "Tôi" sáng. Tài khoản chỉ tài xế giữ tab riêng như Q5.
- Trang đầu (Q5) KHÔNG đổi: DRIVER + SALES mở "/" vẫn ở Trang chủ.
- Hoàn tác: đổi cờ cuối của `addNav` ở `web/shell.ts` về `chiTaiXe(staff) && coCuocCuaToi(staff)` và bỏ dòng ở `web/account.ts`.
- Số mục menu của Quản trị / Toàn quyền KHÔNG đổi (17 / 20) — chỉ tài khoản có quyền DRIVER mới thêm mục.
- Khung thử dựng được tổ hợp: `POST /api/staff` với `roles: ["DRIVER_INTERNAL", "SALES_STAFF"]` → 201.
- `cuoc-smoke` bước 9b: P16 bật lại điều kiện `chiTaiXe` + tắt dòng trang Tôi → đỏ (thanh bên không có "Cuốc của tôi") → hoàn nguyên. Ghi chú: tệp kịch bản ở commit T2 là bản đã bỏ riêng phần "nút cuối" (tập con của bản đã chạy xanh).

### 12.4 Thanh tab che nút cuối? (ảnh `b5-mat-mang-dien-thoai.png`)
- Kết luận: DO CÁCH CHỤP, không phải lỗi bố cục. Ảnh cả trang (`captureBeyondViewport`) vẽ phần tử `fixed` (thanh tab) ở vị trí khung nhìn giữa ảnh dài. Đo thật ở khung 390×844: `body.has-tabbar main` đã có khoảng đệm đáy `calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--s4))` (`public/app.css:524`); trang chuyến đang chạy của dữ liệu thử còn ngắn hơn khung (không cuộn), nút "Kết thúc gián đoạn" ở 732–784px, thanh tab từ 785px.
- Vẫn thêm ca Chrome (hàng rào, không phải sửa lỗi): `khongBiChe` ở `cuoc-smoke` bước 1 (thẻ cuối ở `/cuoc`), 2 (nút "Xuất bến" dính đáy), 3 (nút cuối của chuyến đang chạy) — chèn tạm khối 1200px đầu `<main>` để nút cuối nằm ở đáy trang DÀI, cuộn tới đáy, `elementFromPoint` ở tâm nút phải trúng chính nút; kiểm TRƯỚC khi chụp cả trang và báo nếu khung bị nới (> 900px).
- P16: bỏ khoảng đệm đáy (`padding-bottom: 0`) → bước 3 đỏ ("nút cuối (Kết thúc gián đoạn) không bị thanh tab che") → hoàn nguyên. Lần đầu (chưa có khối 1200px) KHÔNG đỏ — trang ngắn nên không đo được gì; đã sửa cách đo rồi mới quan sát đỏ. Bước 1 không đỏ dưới đột biến vì tâm thẻ cao (~150px) vẫn nằm trên thanh tab — đúng nghĩa "tâm nút".

### 12.5 Chưa làm — chờ chủ (theo điều phối)
Tự gửi lại khi mất mạng (V1 của người kiểm); nút rút / chuyển một chặng khỏi chuyến (Q-B-6 / Q-B-15). `v1-bao-tri.mjs` không sửa (điều phối đưa vào sổ nợ).

### 12.6 Kết quả (tự khai, CHƯA có người kiểm độc lập)
Xem mục 12.7.

### 12.7 Kết quả cuối vòng 5 (tự khai, CHƯA có người kiểm độc lập)
| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | 0 |
| `npm run build:web` | 0 |
| `npm test` | 1833/1834 — bài đỏ duy nhất `guard-remote: lệnh dị dạng không làm hook quá giờ` (đo giờ hook khi máy bận) |
| `node --test --test-concurrency=1 "src/**/*.test.ts"` | 1834/1834 |
| `npm run test:e2e -- pwa` | 2/2 — "31 trang" (lần chạy CHUNG lúc với lô Chrome không in kết quả; chạy lại riêng: xanh) |
| `goi-bao-smoke` | 7/7 |
| `cuoc-smoke` | 11/11 (lần chạy trong lô hỏng ở khâu gieo dữ liệu — 500 "Network connection lost" khi `test:e2e` chạy song song dựng một máy chủ khác; chạy lại riêng: 11/11) |
| `chuyen-smoke` | 8/8 |
| `dieu-phoi-smoke` | 11/11 |
| `tai-xe-trang-dau-smoke`, `tai-xe-doi-tac-smoke`, `trang-chu-smoke` | xanh (menu tài xế / văn phòng sau T2) |

Bài học: không chạy `test:e2e` song song với lô Chrome (cùng máy, hai máy chủ tạm tranh nhau).

## 13. Vòng 5b — "Rút khỏi xe" / "Chuyển sang xe khác" (chủ trả lời lần 15: "Làm ngay, thợ tự đặt nút")

### 13.1 Việc
- Route 6 `rut` và route 7 `doi` của A13 (không đổi máy chủ). DTO / mã lỗi đọc ở `src/shared/contracts.ts` (`RutRequest`, `DoiRequest`, `LenhChuyenLoiBody`).
- Khối thuần `nhomKhach` (`src/shared/dieu-phoi-man.ts`, test đỏ trước): gom suất CÒN CHỜ ĐÓN theo chặng (một đơn một nhóm), người đi kèm một nhóm; tuyến theo tên điểm; tên + năm sinh theo DTO.
- `web/chuyen.ts` thẻ "Khách trong chuyến" dưới bảng điểm dừng (chuyến lên kế hoạch). Nút "Rút khỏi xe" / "Chuyển sang xe khác" khi có ô `trip.dispatch`; trong vùng khoá (`khoaMoc.dangKhoa` của máy chủ) Bán hàng chỉ thấy câu "Trong vùng khoá trước giờ xuất bến — rút hay chuyển khách cần Quản trị phá lệ." (không nút), Quản trị có nút và đi qua hộp "Phá lệ" khi máy chủ trả 409 `canQuyen` (khuôn huỷ chuyến H17: hộp lệnh đóng → hộp Phá lệ → gửi lại CHÍNH lệnh kèm `phaLe`, requestId mới).
- "Chuyển sang xe khác": danh sách chuyến đích = chuyến LÊN KẾ HOẠCH cùng ngày từ `GET /lich` (máy chủ), trừ chuyến này (`chuyenXepDuoc` — có nhãn "đang khoá"); thân `{ version, denChuyenId, denVersion, suatIds }`. 409 (chéo xe / tài xế, hết chỗ, chặng không hợp lệ…) → câu máy chủ + từng lý do trong hộp; `stale` → "Chuyến vừa được người khác sửa — đóng hộp, tải lại rồi làm lại."
- Sau mỗi lệnh đọc lại GET chi tiết (GA-55 — `docLai`), không dựng tên từ phản hồi.

### 13.2 Lệch bản vẽ / giả định bề mặt
- **D-B2-4**: bản vẽ không có chỗ bấm — thẻ "Khách trong chuyến" đặt dưới bảng "Điểm dừng" (cột chính); mỗi nhóm một dòng: mã đơn · số khách, tuyến, tên; hai nút bên phải (máy tính) / lưới hai cột dưới (điện thoại). Khuôn sẵn: `.vc-card`, `.dp-card-head`, `.vc-btn vc-btn-ghost-primary`, hộp `moBangTruot` + `nhomChon` như hộp "Xếp vào chuyến". Chờ chủ góp ý qua ảnh.
- **Tên khách trên chuyến lên kế hoạch**: DTO chỉ có họ tên khi suất đã GẮN khoá người. Màn xếp của văn phòng lượt này không gửi khoá người (máy chủ gắn khi xuất bến — thấy ở `cuoc-smoke`), nên nhóm chưa gắn chỉ ghi "N khách chưa gắn tên" (không bịa "Khách 1", không ô trống). Kịch bản dựng một nhóm CÓ tên bằng đường thật: Quản trị rút O1 rồi xếp lại kèm `personKeys` (khoá đọc bằng SQL trên D1 tạm, như party id của dữ liệu thử). Câu hỏi **Q-B-18**: màn xếp có nên gửi khoá người (chọn khách theo tên) không — cần DTO lịch có khoá người?
- 409 "hết chỗ" / "chéo xe – tài xế" của lệnh chuyển: đi chung nhánh câu máy chủ (tiếng Việt + lý do) — CHƯA có ca Chrome riêng (dữ liệu thử không có xe đủ nhỏ; ghi nợ).
- KHÔNG làm Q-B-15 (sắp lại điểm khi chuyến đang chạy — BACKLOG mục 7). Mất mạng tài xế giữ nguyên (BACKLOG mục 6).

### 13.3 Chrome — `rut-doi-smoke.mjs` (mới, 8 bước)
1. 1040 Bán hàng: thẻ khách nhóm theo đơn, tên + năm sinh, hai nút; axe.
2. "Chuyển sang xe khác": hộp chuyến đích cùng ngày (trừ chuyến này, nút khoá tới khi chọn) → chuyển O1 sang T2 → ở chuyến đích O1 ĐÚNG tên, O2 "2 khách chưa gắn tên"; axe.
3. Ngoài khoá: "Rút khỏi xe" O2 → khách về cột "Chưa xếp" trên bảng Điều phối xe; thân không kèm phá lệ.
4. 390 Bán hàng chuyến đang khoá: câu "cần Quản trị phá lệ", không nút; axe.
4b. 390 Bán hàng ngoài khoá: nút lưới hai cột + hộp chuyển ở điện thoại; axe.
5. 1040 Quản trị chuyến đang khoá: "Rút khỏi xe" → hộp Phá lệ → "Phá lệ và rút" (thân thứ hai có `phaLe`, requestId mới) → O4 về "Chưa xếp"; axe.
6. Kế toán: thẻ khách, KHÔNG nút, không câu khoá, không lệnh ghi.
7. Không lỗi console.
- P16: bỏ điều kiện quyền (`coNut` không hỏi `trip.dispatch`) → bước 6 đỏ (7 ✓ / 1 ✗) → hoàn nguyên.
- Ảnh (`docs/evidence/2026-09-29-adr-0049/anh/`): `b5b-khach-trong-chuyen-may-tinh.png`, `b5b-khach-trong-chuyen-dien-thoai.png` (trước khi bấm), `b5b-chuyen-xe-hop-may-tinh.png`, `b5b-chuyen-xe-hop-dien-thoai.png` (hộp chọn xe đích), `b5b-vung-khoa-ban-hang-dien-thoai.png` (Bán hàng trong vùng khoá), `b5b-pha-le-rut-may-tinh.png` (Quản trị phá lệ).
- Lần chạy đầu đỏ ở bước 1–2 vì kỳ vọng tên trên suất chưa gắn khoá người (xem 13.2) — sửa cách hiển thị (đếm "chưa gắn tên", test thuần đỏ trước) và dữ liệu thử, không sửa máy chủ.

### 13.4 Việc vặt trong phiên
- Phiên trước bị ngắt để lại một `wrangler dev` mồ côi của chính kịch bản mình (02:30) — đã tắt (CLAUDE.md §10: tiến trình mồ côi gây "database is locked").

### 13.5 Kết quả (tự khai, CHƯA có người kiểm độc lập)
| Lệnh | Kết quả |
|---|---|
| `npm run typecheck` | 0 |
| `npm run build:web` | 0 |
| `npm test` | 1834/1835 — bài đỏ duy nhất `guard-remote: lệnh dị dạng không làm hook quá giờ` (đo giờ hook khi máy bận; máy chủ sắp tách bài này — `b187c97`, chưa gộp) |
| `node --test --test-concurrency=1 "src/**/*.test.ts"` | 1835/1835 |
| `npm run test:e2e -- pwa` (chạy riêng) | 2/2 — "31 trang" |
| `rut-doi-smoke.mjs` (mới) | 8/8 |
| `chuyen-smoke.mjs` | 8/8 (bước 1: danh sách nút nay có "Rút khỏi xe", "Chuyển sang xe khác" — sửa kỳ vọng) |

Chưa gộp máy chủ mới (điều phối: đợi HEAD sau phần vá xoá đơn).

### 13.6 Sau commit 5b (e2e6894)
- Điều phối báo máy chủ `d9b884b` và yêu cầu gộp. Lệnh `git merge --no-ff d9b884b` **bị bộ duyệt quyền của phiên từ chối** ("Modify Shared Resources"). Lần chạy lại `goi-bao-smoke` + `dieu-phoi-smoke` + `cuoc-smoke` trên e2e6894 cũng bị từ chối. **Chưa gộp, chưa chạy lại** — chờ chủ / điều phối chạy hoặc cho phép.
- Kết quả Chrome vòng 5 (goi-bao 7/7, cuoc 11/11, dieu-phoi 11/11) đo ở `1b82078`, TRƯỚC 5b. 5b đo `rut-doi` 8/8 và `chuyen` 8/8 trên cùng nội dung với e2e6894. Chưa có số đo ba kịch bản vòng 5 ở e2e6894.
- Mã lỗi của lệnh chuyển: 409 trả `message` theo bảng `THONG_BAO_409` (`src/modules/van-chuyen/dieu-phoi-route.ts:31`, mặc định "Lệnh chưa làm được."), lý do theo `loiNhan` / `aiXuLyNhan` (tiếng Việt). Giao diện chỉ ghép hai trường này (`docLoiLenh`), không hiện `code` — không lộ mã. Ca Chrome riêng cho "hết chỗ" / "chéo xe – tài xế" vẫn là nợ.
- Trigger `orders_no_delete` (a364b12): kịch bản của nhánh này không xoá `orders` (chỉ `vc_dispatch_policy` ở `moc-chua-co-smoke`, `order_item` ở trình trợ giúp chung `a2-cdp.mjs`). Chưa chạy thật sau gộp.

### 13.7 Sau gộp `d9b884b` (điều phối gộp → `dd665b3`; chủ 30/9 "Cho phép (Recommended)")
- Chạy lại trên `dd665b3`:
  - `npm test` hai bước: bước 1 1836/1836, bước 2 (bài đo giờ hook chạy một mình) 1/1, mã thoát 0.
  - `npm run typecheck` 0; `npm run build:web` 0.
  - Chrome, chạy riêng, không song song e2e: rut-doi 8/8, cuoc 11/11, goi-bao 7/7, dieu-phoi 11/11; chuyen 6/8 — đỏ ĐÚNG hai bước kiểm mới dưới đây (đỏ trước), các bước còn lại xanh.
  - Trigger `orders_no_delete`: không kịch bản nào đỏ vì xoá đơn.
- **Sửa bề mặt (giả định của điều phối, đảo ngược được)** — nút "Xuất bến thay tài xế" khi khoá trông như chữ thường.
  - Gốc: `.vc-btn:disabled` tô nền `--c-surface-alt`, trùng nền trang (`body` = `--c-alt` = `--c-surface-alt`). Nút đặt thẳng trên nền trang (đầu trang máy tính `.dp-ct-actions`, cuối trang điện thoại `.dp-ct-bottom`) mất khung. Máy tính cũng dính, ảnh b2-chi-tiet-bi-giu-may-tinh cũ.
  - Sửa: chỉ ở hai chỗ đó, nút ghost khoá giữ dáng nút (nền `--c-surface`, viền `--c-border`, chữ `--c-primary`) và mờ `opacity: .5`. Đây là khuôn nút khoá của bộ thiết kế (Button disabled = opacity .5, như `.btn:disabled` sẵn có). Chỉ token; không đổi logic, không đổi `.vc-btn:disabled` chung.
- Chrome: `chuyen-smoke` bước 1 (1040) và bước 5 (390) thêm `nutKhoaRo`: nút khoá, nền khác nền trang, opacity < 1.
  - Đỏ trước: 6 ✓ / 2 ✗ "nút khoá lẫn vào nền trang (rgb(234, 242, 248))".
  - Xanh sau: 8/8.
  - `npm run test:e2e -- pwa` (quét token sau dấu mốc PWA): đạt, 31 trang. `src/khung-dang-tai-css.test.ts` + `src/shared/sw-policy.test.ts`: 20/20.
- Ảnh 390: trước `b2-nut-khoa-truoc-dien-thoai.png`, sau `b2-nut-khoa-sau-dien-thoai.png`; cả trang `b2-chi-tiet-bi-giu-dien-thoai.png`, `b2-chi-tiet-bi-giu-may-tinh.png` (chụp lại).
- Q-B-18: KHÔNG đổi màn xếp (điều phối đang cho người kiểm máy chủ soi I19(a)).
- Vệ sinh: sau mỗi lượt Chrome `ps` không còn wrangler / workerd nào của worktree này.

### 13.8 Vòng 5c (kiểm độc lập K2c-giao diện @01b3d15: ĐẠT CÓ ĐIỀU KIỆN)
- **Gộp máy chủ `1f8b498`** (b94963a I19(a) — máy tự gắn khoá người rảnh lúc xếp; 020643a README) bằng `git merge --no-ff` → `5cee29f`. Không xung đột, không bị bộ duyệt chặn.
- **Q-B-18 đóng theo R-P28**: máy chủ tự gắn tên lúc xếp, màn xếp KHÔNG đổi. Câu 13.2 "màn xếp không gửi khoá người → nhóm chỉ đếm" nay chỉ còn đúng cho đơn THIẾU tên.
- **Kỳ vọng đổi vì I19(a)** — chỉ `rut-doi-smoke`:
  - Bước 2: O2 (2 khách, đơn có 1 tên) trước là "2 khách chưa gắn tên", nay là "Hành Khách Thử 2-1 1980 · 1 khách chưa gắn tên". Máy gắn 1 khoá lúc xếp; suất còn lại để null.
  - Lần chạy đầu sau gộp: 7 ✓ / 1 ✗ đúng ở dòng này.
  - Bỏ bước dựng "rút O1 rồi xếp lại kèm khoá người đọc bằng SQL" vì xếp không kèm khoá cũng đã có tên.
  - Các kịch bản khác KHÔNG đổi kỳ vọng. `cuoc-smoke` bước 3 kiểm "trước xuất bến không tên" trên chuyến NGÀY MAI (ngoài ngày chạy — TC-39 chỉ đổi trong ngày chạy), vẫn xanh.
- **Vá khoảng trống P16 (K2c VỪA-1)**:
  - Dựng: xếp thêm O5 (5 khách đủ tên) vào T1 như màn xếp (không khoá người) → T1 có HAI nhóm có tên. Bước 1 kiểm cả hai nhóm có tên, không "chưa gắn tên".
  - Bước 2 (chuyển O1 sang T2): ngay trên CÙNG trang, chưa điều hướng, O1 biến mất, O5 còn lại vẫn đúng 5 tên, không "chưa gắn tên".
  - Bước 3 (rút O2 khỏi T2): tự mở lại T2, không dựa trang bước 2 để lại. Ngay trên cùng trang, O2 biến mất, O1 còn lại vẫn đúng 3 tên.
  - Bước 4b kiểm tên O3 ở 390.
  - **P16**: `docLai` → `return r;` → bước 2 đỏ ("sau chuyển, nhóm còn lại vẫn đúng tên…", thực tế "5 khách chưa gắn tên"). Bước 3 đỏ ĐÚNG ở phép kiểm của nó ("sau rút…", thực tế "3 khách chưa gắn tên") → 6 ✓ / 2 ✗ → hoàn nguyên (0 chuỗi đột biến).
  - Lần P16 đầu, bước 3 đỏ lây ("hết giờ chờ: hộp rút") vì dựa trang bước 2. Đã sửa bằng cách tự mở lại chuyến.
- **Chạy lại** (máy rảnh, không song song e2e):
  - `npm test` hai bước: 1846/1846 + 1/1, mã thoát 0.
  - `npm run typecheck` 0; `npm run build:web` 0.
  - Chrome: rut-doi 8/8, chuyen 8/8, cuoc 11/11, goi-bao 7/7, dieu-phoi 11/11, tai-xe-trang-dau 4/4. Không lần đỏ thoáng qua vì máy bận.
- **Ảnh gửi chủ**:
  - 1040 `b5c-khach-co-ten-may-tinh.png`: T1, hai nhóm có tên ngay sau xếp.
  - 390 `b5c-khach-co-ten-dien-thoai.png`: khung nhìn, thẻ ở giữa màn. Ảnh cả trang `b5b-khach-trong-chuyen-dien-thoai.png` có thanh tab đè lên dòng tên (lỗi cách chụp, nhật ký 12).
  - Chụp lại các ảnh b5b.
- Thấy, CHƯA sửa (ngoài phạm vi): tên trong một nhóm hiện theo thứ tự suất của DTO (vd. "3-3 · 3-2 · 3-4 · 3-1"), không theo thứ tự tên trong đơn. Sắp theo tên / thứ tự đơn là việc bề mặt, chờ điều phối.
- KHÔNG sửa `web/CLAUDE.md`, T3, T4, Q-B-15.
- Vệ sinh: sau mỗi lượt `ps` không còn wrangler / workerd của worktree này.

### 13.9 Vòng 5d
- **Sắp tên trong nhóm theo thứ tự của đơn — KHÔNG làm được ở giao diện; chờ điều phối ghi BACKLOG.**
  - `SuatChuyenDto` (`src/shared/contracts.ts:1120`) không có trường thứ tự nào: không số thứ tự, không vị trí dòng, không khoá người. Chỉ có `id`, `loai`, `maDon`, `legId`, `chieu`, `diemLen`, `diemXuong`, `trangThai`, `coTen`, `hoTen?`, `namSinh?`, `daDon`, `daTra`.
  - Máy chủ đọc suất `ORDER BY a.trip_id, a.valid_from_at, a.id` (`src/modules/van-chuyen/chuyen-repo.ts:122`); `id` là UUID ngẫu nhiên, nên trong một lần xếp thứ tự là ngẫu nhiên.
  - Bảng `ord_passenger` (0035) cũng không có cột vị trí.
  - Theo lệnh: không sửa máy chủ, không sắp theo tên. Chưa đổi mã, chưa chụp lại ảnh.
- **Phương án nút "Cập nhật khách theo đơn"** (chủ lần 16; CHỜ hợp đồng máy chủ, chưa viết mã). Theo đúng khuôn "Cập nhật điểm theo đơn", ở bốn chỗ:
  1. Chi tiết chuyến (`web/chuyen.ts`, khối dải lý do giữ):
     - Khi chuyến lên kế hoạch có lý do `KHACH_DA_DOI`: dải đỏ "Chuyến bị giữ: Khách trong đơn đã đổi — cập nhật khách". Các dòng gồm câu máy chủ, rồi "Ai xử lý: … Không cần phá lệ, kể cả trong vùng khoá trước giờ xuất bến."
     - Nút `btn-primary` "Cập nhật khách theo đơn" chỉ khi có ô `trip.dispatch`. Có cả hai lý do thì hai dải riêng.
     - Hàm gửi giống `capNhatDiem`: bộ requestId riêng, thân `{ version, requestId }`, sau lệnh `docLai` (GA-55 — tên khách mới lấy từ GET), dải kết quả ok / info. `stale` → "Chuyến vừa được người khác sửa — tải lại"; lỗi khác → câu máy chủ + lý do.
  2. Bảng Điều phối, thẻ "Chuyến đang chọn" (`web/dieu-phoi.ts`): cùng điều kiện; nút đứng cạnh "Cập nhật điểm theo đơn".
  3. Bảng Điều phối, cột "Cần xử lý" (hàm thuần `src/shared/dieu-phoi-man.ts`): thêm hành động `cap-nhat-khach` khi có `KHACH_DA_DOI` và ô điều phối. Test đỏ trước.
  4. Câu thuần:
     - `cauKhoaMoc` thêm "Cập nhật khách theo đơn không cần phá lệ".
     - `dieuKienXuatBen`: xếp `KHACH_DA_DOI` vào nhóm "Đủ tên khách". Đây là giả định; lựa chọn còn lại là nhóm "Không có đơn đã huỷ".
  - Hộp xác nhận: "Cập nhật điểm theo đơn" hiện KHÔNG có hộp — bấm là gửi, nút khoá khi đang gửi. Làm "cùng khuôn" nghĩa là cũng không có hộp. Nếu muốn có hộp (vì thay tên khách trên xe) thì cần điều phối quyết.
  - Không nút cho Kế toán / tài xế. Trong vùng khoá Bán hàng vẫn có nút (không phá lệ).
  - Chrome dự kiến:
    - xếp xong → văn phòng huỷ một khách khỏi đơn → chuyến bị giữ → dải + nút → bấm → tên mới hiện, hết giữ;
    - trong vùng khoá Bán hàng vẫn bấm được; Kế toán không nút;
    - P16: bỏ điều kiện ô → bước Kế toán đỏ.
- Điều phối nhận 13.9: việc sắp tên chuyển BACKLOG. Phương án nút được duyệt ở vòng 5e: KHÔNG hộp xác nhận; `KHACH_DA_DOI` vào dòng "Đủ tên khách".

### 13.10 Vòng 5e — "Cập nhật khách theo đơn" (R-P29, chủ lần 16)
- **Gộp máy chủ `337f5e9`** bằng `git merge --no-ff`, được `2aa58d2`. Không xung đột, không bị bộ duyệt chặn.
  - Bẫy 53(4) — 0042 / 0043 sửa tại chỗ: mọi kịch bản Chrome của nhánh này dựng D1 TẠM mới cho mỗi lần chạy (`mkdtempSync` + `migrations apply --local --persist-to <tạm>` ở `a2-cdp.mjs`), nên không dính.
  - `.wrangler/state/v3/d1` mặc định của worktree không được lệnh nào của phiên này dùng. Để nguyên, không xoá. Ai chạy `npm run dev` ở worktree này thì xoá thư mục đó rồi `npm run db:migrate:local` trước.
- **Hợp đồng đọc lại ở mã**:
  - `NUT_CAP_NHAT_KHACH` và câu `KHACH_DA_DOI` ở `src/shared/ly-do-giu.ts`.
  - `CapNhatKhachResponse extends ChuyenChiTietResponse { daCapNhat }` ở `src/shared/contracts.ts`.
  - `DOI_KHACH_THEO_DON` nằm NGOÀI khoá theo mốc (`src/shared/moc-toi-thieu.ts`).
  - Nhật ký chuyến `ALLOCATION_PASSENGER_CHANGED` → "Cập nhật khách theo đơn".
- **GA-59** (máy chủ trả `maDon` ở phản hồi "Bỏ đánh dấu"): giao diện không đổi. `web/chuyen.ts` thay nguyên mục gọi báo bằng phản hồi; `web/dieu-phoi.ts` dùng mã đơn của mục đã có. `goi-bao-smoke` 7/7.
- **Làm (khuôn "Cập nhật điểm theo đơn", 4 chỗ, không hộp xác nhận, không phá lệ)**:
  - Hàm thuần (`src/shared/dieu-phoi-man.ts`, test đỏ trước 2 bài):
    - hành động `cap-nhat-khach` ở Cần xử lý khi có `KHACH_DA_DOI` + ô điều phối;
    - `cauKhoaMoc` → "… Cập nhật điểm theo đơn và cập nhật khách theo đơn không cần phá lệ.";
    - `KHACH_DA_DOI` vào dòng "Đủ tên khách".
  - `web/chuyen.ts`: dải "Chuyến bị giữ: Khách trong đơn đã đổi — cập nhật khách" + nút.
    - `capNhatKhach`: bộ requestId riêng; `docLai` sau lệnh (GA-55); dải "Đã cập nhật khách theo đơn" / "Không có khách nào cần cập nhật".
    - `stale` → "Chuyến vừa được người khác sửa — tải lại"; lỗi khác → câu máy chủ + lý do.
  - `web/dieu-phoi.ts`: nút ở thẻ "Chuyến đang chọn" và ở Cần xử lý. Sau lệnh `nap()` lại; bảng không hiện tên.
- **Kỳ vọng đổi**:
  - Câu khoá ở `chuyen-smoke` (bước 4, 6) và bài thuần `cauKhoaMoc` cũ. Lý do: câu nay nói cả lệnh mới.
  - Không kịch bản nào khác đổi.
- **Chrome** — `cap-nhat-khach-smoke.mjs` (mới, 6 bước):
  1. Bảng 1040: mục Cần xử lý + thẻ đang chọn; chuyến có cả nơi đổi thì có hai nút.
  2. Chi tiết 1040: dải + nút; bấm → CÙNG trang tên mới, hết giữ.
  3. GA-62: bỏ không thêm → còn "Đủ tên khách" ✕ "thiếu 1 tên".
  4. 390 trong vùng khoá: bấm được, không hộp phá lệ.
  5. Kế toán: không nút ở hai màn, route 403.
  6. Console sạch.
  - Kịch bản viết SAU mã màn nên lần chạy đầu đã xanh. Đỏ quan sát được qua P16 (dưới) và bài thuần đỏ trước.
- **P16** (hai đột biến cùng một lần chạy, mỗi đột biến làm đỏ bước riêng) → 2 ✓ / 4 ✗ → hoàn nguyên (0 chuỗi đột biến):
  - Bỏ ô (`coDieuPhoi` → `true`) ở dải Chi tiết chuyến → bước 5 đỏ: "Chi tiết chuyến: không nút cập nhật khách".
  - Bỏ `docLai` (`duLieu = r`) → bước 2 đỏ: "tên mới hiện ngay trên trang", thực tế "3 khách chưa gắn tên". Bước 3, 4 cũng đỏ.
- **Chạy lại** (máy rảnh, không song song e2e):
  - `npm test` hai bước: 1866/1866 + 1/1, thoát 0.
  - `npm run typecheck` 0; `npm run build:web` 0.
  - Chrome: cap-nhat-khach 6/6, rut-doi 8/8, chuyen 8/8, cuoc 11/11, goi-bao 7/7, dieu-phoi 11/11, tai-xe-trang-dau 4/4.
- **Ảnh gửi chủ**:
  - 1040: trước `b5e-khach-doi-truoc-may-tinh.png`, sau `b5e-khach-doi-sau-may-tinh.png`.
  - 390, trong vùng khoá: trước `b5e-khach-doi-truoc-dien-thoai.png`, sau `b5e-khach-doi-sau-dien-thoai.png`; thẻ khách có tên mới `b5e-khach-doi-sau-ten-dien-thoai.png`.
- Vệ sinh: `ps` sau mỗi lượt không còn wrangler / workerd của worktree này.

### 13.11 Vòng 5f
- **Gộp máy chủ `01ba476`**:
  - Nội dung: `b813fe0` R-P30 / GA-67 — phản hồi lần đầu "Đã gọi báo" dựng từ dòng mốc; hình DTO không đổi.
  - Gộp bằng `git merge --no-ff`, được `4435cda`. Không xung đột, không bị bộ duyệt chặn.
  - `goi-bao-smoke` 7/7, không phải đổi kỳ vọng.
- **Sửa bề mặt (giả định của điều phối, đảo ngược được)**: ổ khoá ở dòng khoá quá nhỏ trên điện thoại.
  - Gốc: `.dg-lock` là hàng flex; câu khoá dài xuống nhiều dòng thì flex ép `svg` nhỏ lại (đo được: 5px thay vì 16 ở `.dp-ct-lock`, 8px thay vì 14 ở `.dp-khach-khoa`).
  - Sửa: thêm `.dg-lock svg { flex: none; }` — khuôn sẵn có `.field-error svg` / `.vc-alert svg`. Không token mới, không đổi logic.
  - Cỡ vẽ nay bằng cỡ khai: 16 với chữ 14 ở đầu trang, 14 với chữ 14 ở thẻ khách. Áp cho mọi dòng `.dg-lock` (Chi tiết chuyến, thẻ khách, thẻ đang chọn).
- **Chrome**: `cap-nhat-khach-smoke` bước 4 (390) thêm phép "ổ khoá không bị ép nhỏ" — cỡ vẽ của `svg` = thuộc tính `width`.
  - Đỏ trước: lần đầu so hằng [16, 16], thực tế "5,8". Lần xanh đầu lại đỏ vì ổ khoá thẻ khách khai 14 → sửa phép thành so với cỡ khai, không so hằng.
  - P16: bỏ `flex: none` → bước 4 đỏ "[[5,16],[8,14]]" → hoàn nguyên → 6/6.
- **Chạy lại** (máy rảnh, không song song e2e):
  - `npm test` hai bước: 1867/1867 + 1/1, thoát 0.
  - `npm run typecheck` 0; `npm run build:web` 0.
  - Chrome: goi-bao 7/7, chuyen 8/8, dieu-phoi 11/11, rut-doi 8/8, cap-nhat-khach 6/6 (lần cuối, sau khi sửa phép kiểm).
- Ảnh 390: trước `b5f-o-khoa-truoc-dien-thoai.png`, sau `b5f-o-khoa-sau-dien-thoai.png`. Các ảnh b2 / b5b / b5c / b5e đã chụp lại với ổ khoá đúng cỡ.

### 13.12 Vòng 5g (kiểm độc lập K2e-giao diện @40b6833: ĐẠT)
- **Gộp máy chủ `92dd556`** (bốn điểm THẤP K2e, GA-69 — lưới thứ hai của lệnh xuất bến trả đúng lý do màn sẽ hiện; mã 409 không mới) bằng `git merge --no-ff`, được `321f882`. Không xung đột, không bị bộ duyệt chặn.
- **VỪA-1** — bài thuần `dieuKienXuatBen` khi CÓ CẢ `THIEU_TEN` lẫn `KHACH_DA_DOI` (hai thứ tự):
  - Dòng "Đủ tên khách" mang đủ hai câu, nối "; " theo thứ tự máy chủ, rồi "· Ai xử lý: Văn phòng".
  - P16: phép nối chỉ lấy câu đầu (`ds.slice(0, 1)`) → bài đỏ (25/26) → hoàn nguyên (26/26).
- **VỪA-2** — ca `stale` của "Cập nhật khách theo đơn" (`cap-nhat-khach-smoke` bước 3b):
  - Chi tiết chuyến T3 đang giữ `KHACH_DA_DOI` → Quản trị dời giờ bắt đầu qua `PUT /api/van-chuyen/chuyen/:id`. Phiên bản tăng, VẪN lệch khách (kiểm qua GET).
  - Bấm nút → dải "Chuyến vừa được người khác sửa — tải lại" + nút "Tải lại". Không mã, không tên người sửa, không dải thành công, đúng một lần gửi. GET sau đó vẫn `KHACH_DA_DOI`: máy chủ không ghi.
  - Bảng Điều phối, cột Cần xử lý: màn đọc lịch xong thì dời giờ lần nữa rồi bấm → "Chuyến vừa được người khác sửa — đã tải lại bảng, bấm lại nếu vẫn cần." Đây là CÙNG khuôn "Cập nhật điểm theo đơn" ở bảng, vì bảng tự tải lại nên câu khác Chi tiết chuyến. Máy chủ không ghi.
  - Console trang này lọc riêng dòng "Failed to load resource … status of 409", theo khuôn `dat-gap-smoke` / `chinh-sach-dieu-phoi-smoke`.
  - P16: tắt nhánh `l.cu` của `capNhatKhach` (`false ?`) → bước 3b đỏ ("hết giờ chờ: dải chuyến cũ") → hoàn nguyên.
- **THẤP — phạm vi thật của `.dg-lock svg { flex: none; }` (13.11)**: áp cho MỌI phần tử `.dg-lock` có biểu tượng:
  - `web/chuyen.ts:85` (`.dp-ct-lock`), `web/chuyen.ts:433` (`.dp-khach-khoa`);
  - `web/dieu-phoi.ts:293` (`.dp-chon-lock`), `web/dieu-phoi.ts:329` (`.dp-cxl-khoa`);
  - CẢ dòng chặn xác nhận đơn ở `web/order.ts:360` (`.dg-lock` có `icon`; nhánh `.dg-lock-note` không có biểu tượng).
  - `web/dieu-phoi.ts:407` `.dg-lock-note` không có biểu tượng.
  - Người kiểm đã chạy `dat-gap-smoke` 12/12 xanh. 13.11 ghi "Chi tiết chuyến, thẻ khách, thẻ đang chọn" là thiếu.
- **Dọn Chrome mồ côi PID 97196**:
  - Đối chiếu: `lstart` 30/9 02:30:12, PPID 1, `--user-data-dir=…/tourdao-a2-chrome-Sofqz5`, `lsof` thư mục làm việc = worktree này. Cùng lúc với các wrangler mồ côi của chính kịch bản mình đã tắt ở 13.4 (lượt Chrome bị dừng lúc 02:30).
  - Đã tắt đúng PID 97196 và 6 tiến trình con (97202, 97203, 97204, 97206, 97208, 97370).
  - Sau đó `ps` không còn tiến trình `tourdao-a2-chrome` nào.
- **Chạy lại** (máy rảnh, không song song e2e):
  - `npm test` hai bước: 1869/1869 + 1/1, thoát 0.
  - `npm run typecheck` 0; `npm run build:web` 0.
  - Chrome: cap-nhat-khach 7/7, chuyen 8/8, rut-doi 8/8, dieu-phoi 11/11, goi-bao 7/7, cuoc 11/11.
