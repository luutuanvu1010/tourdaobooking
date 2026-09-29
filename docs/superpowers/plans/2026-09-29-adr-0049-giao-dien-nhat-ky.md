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

## 4. Câu hỏi cho điều phối (Q-B…)

- **Q-B-1 (D8-3):** lịch sử bản chính sách có cần "ai lưu" như bản vẽ không? Cần thì máy chủ thêm khoá (tên hiển thị người lưu) vào `DispatchPolicyDto` — tôi không tự thêm.
- **Q-B-2 (D8-6):** mã lý do mới sinh từ nhãn (vd "Khách tự đi" ở Bỏ qua điểm → `BO_QUA_KHACH_TU_DI`; trùng → `_2`). Mã là định danh bền (nhật ký ghi mã). Chấp nhận, hay máy chủ nên tự sinh mã (bỏ `code` khỏi thân POST)?
- **Q-B-3:** Quản trị "Ngưng" được lý do hệ thống `BO_QUA_KHONG_CON_KHACH` (máy tự ghi khi điểm không còn khách — kế hoạch I20). Máy chủ hôm nay cho phép; giao diện không chặn (chặn theo mã ở giao diện là luật đặt sai chỗ). Có cần máy chủ khoá mã này không?
- **Q-B-4 (menu B1):** mục cha "Vận chuyển" hôm nay chỉ hiện với ô `vehicle.manage` (Quản trị, Toàn quyền). Bản vẽ cho Bán hàng, Kế toán thấy "Vận chuyển › Điều phối xe" → khi làm B1 phải đổi điều kiện hiện mục cha (vd `trip.view`). Ghi trước để không quên.

## 5. Nợ

## 6. P16 — quan sát kịch bản mới đỏ thật một lần

| Kịch bản | Sửa cố ý | Đỏ quan sát được | Hoàn nguyên |
|---|---|---|---|
| `chinh-sach-dieu-phoi-smoke.mjs` | `web/shell.ts`: mục con "Lý do điều phối" đổi điều kiện `danhMuc` → `chinhSach` (build lại) | bước 8 ✗ — thanh bên của Quản trị `{"items":["Xe","Sắp hết hạn","Loại giấy tờ xe"],"current":null}`; 12 ✓ / 1 ✗, thoát 1 | chép lại bản lưu (`shell.ts.bak` ở thư mục tạm), `grep` thấy lại `if (danhMuc) … TRANG_LY_DO`, build lại |
| (lần chạy đầu, không cố ý) | — | bước 1, 2, 4, 6 ✗ — axe `color-contrast` ở `#cs-hop-dong-hint` (dòng khoá mờ .6 theo bản vẽ) | sửa CSS (D8-8) → 13/13 |

## 7. Kết quả kiểm cuối phiên (tự khai)
