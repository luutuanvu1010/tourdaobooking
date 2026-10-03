# Khắc phục kiểm thử theo vai 2/10 — Lộ trình thi công (2026-10-03)

> **Nguồn:** `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` (gốc M1–M5, quyết định của chủ ở mục 8) và `BAO-CAO-LOI.md` cùng thư mục.
> **Vai:** phiên này **lập kế hoạch** (sau khi điều tra xong — hai việc khác nhau, cùng một phiên theo yêu cầu chủ 3/10). Mỗi đợt thi công ở **phiên riêng**, worktree riêng; việc lớn (dữ liệu, quyền, tiền, luật) có **người kiểm độc lập** (Hiến pháp N8, P15; CLAUDE.md §3).
> **Quan hệ với lộ trình đang chạy:** không mở chương trình song song. Các đợt dưới đây **nối vào** lộ trình khắc phục kiểm toán 1–2/10 (`2026-10-02-khac-phuc-audit-00-lo-trinh.md`, Đợt 0–7). Chỗ trùng vùng mã thì **gộp vào đợt cũ** và ghi rõ; chỗ mới thì đánh số **V** để phân biệt.
> **Số ADR / migration ghi ở đây là DỰ KIẾN** (ADR kế tiếp `0096`; migration kế tiếp `0076` — đo 3/10 trên mọi nhánh remote). Chốt theo thứ tự gộp thật, đo lại ngay trước khi tạo tệp (CLAUDE.md §10).
> **Dữ liệu production là demo** (lời chủ 2/10) — không có bước "cầm máu" khẩn; nhưng trước khi thi công V2 phải đo xem đã có cặp số dư âm nào chưa (mục 4.V2, câu chỉ đọc do chủ chạy).

Ký hiệu: 👤 chủ dự án · 🤖 phiên thi công · 🔍 người kiểm độc lập · 🚀 chủ triển khai.

---

## 1. Tổng quan các đợt

| Đợt | Gốc | Việc | Cần ADR? | Điều kiện bắt đầu | Song song được với | Ước |
|---|---|---|---|---|---|---|
| **V0 — Giấy tờ trước** | M1, M2 | Soạn để chủ duyệt: mục sổ dừng dây chuyền VP-01; bổ sung ADR-0092 nháp; ADR-0096 (luật điểm dừng + cửa sổ xuất bến); ADR-0097 (sự kiện điều chỉnh có lý do); ADR-0098 (tra trùng theo SĐT ở máy chủ); mã nợ BACKLOG cho 5 chỗ hoãn | Là ADR | **Ngay** | V1 | 1 phiên soạn + 2 lượt duyệt |
| **V1 — Việc nhỏ không cần ADR** | M4, M5 | HT-24; HT-01 phần tự sắp lại; HT-03 hộp xác nhận + cảnh báo ngày; Kiểu A hộp xác nhận cho "Đã trả cả điểm", "Kết thúc"; Kiểu D (nút nổi, ngày có năm, nhãn phạm vi Trang chủ) | Không | **Ngay** (khác vùng mã với Đợt 0/1: không chạm `orders`, `billing`) | V0, Đợt 1 | 1 phiên thi công + 🔍 cho HT-01 |
| **V2 — VP-01 sổ tiền** | R2, M1, M5 | Chặn lệnh tất toán thứ hai (máy chủ + trigger), `R-BIL-13` mức lỗi, `choXacNhan` lọc theo số dư, giao diện "Đã nộp" trừ phần CK chờ, sổ vàng, e2e | ADR-0092 bổ sung (V0) | 👤 duyệt V0 lượt A; **gộp vào Đợt 2 (b)** hiện có | — (cùng vùng `billing` với Đợt 1 → làm **sau** Đợt 1) | lớn; hạn **31/10** |
| **V3 — Luật lõi chuyến** | M3 | 3a chặn "trả trước đón" (mã giữ + trigger); 3b cửa sổ xuất bến 12 giờ (chính sách Toàn quyền đổi được + trigger + máy chủ); sự kiện điều chỉnh có lý do → HT-03 hoàn tác, HT-04, HT-06 | ADR-0096, ADR-0097 | 👤 duyệt V0 lượt A (0096) và lượt B (0097); **sau V1** (cùng vùng `van-chuyen`) | Đợt 3, Đợt 5 | lớn; 🔍 |
| **V4 — Hồ sơ trùng theo SĐT** | R6, M5 | `resolveBooker` tra trùng theo SĐT chuẩn hoá cho mọi vai; một chuẩn SĐT trên đơn; thông điệp cho Đối tác/Thực tập; bất biến `R-PTY-7` | ADR-0098 | 👤 duyệt V0 lượt B; **sau Đợt 1** (tránh đụng `orders`); **gộp vào Đợt 3** cạnh R6 | V3 | vừa; 🔍 |
| **V5 — Tin tới đúng người** | R4, M1, M2 | Ma trận sự kiện × vai (trang ghép kiểu mới) → chủ duyệt → khách huỷ tại điểm; CREW nhận giờ/điểm hẹn; Kế toán tin tiền; thi công ADR-0062; bài kiểm "mọi hành động có trong ma trận" | Ma trận = quyết định (1 lượt duyệt) | 👤 duyệt ma trận; **gộp vào Đợt 4** | V3, V4 | lớn |
| **V6 — Dữ liệu bẩn còn lại** | M2, M5 | Bất biến `warn`: MST trùng, giá Sheet nhảy > X %, SĐT khác dạng trên đơn cũ; câu hỏi MST UNIQUE mở lại cho chủ | Không (warn) | Bất kỳ | Mọi đợt | nhỏ |
| **V7 — Quy trình, hàng rào** | M1–M5 | Trang ghép thêm 2 mục; mẫu ADR mục "Bấm nhầm thì sao"; bài kiểm quét hoãn phải có mã nợ; smoke Chrome theo vai vào cổng phát hành; kiểm theo vai định kỳ | Diff CLAUDE.md §9 + mẫu ADR (chủ duyệt, N9) | 👤 quyết mục 5 của báo cáo | Mọi đợt | vừa |

**Đường găng:** V0 lượt A → V2 (hạn 31/10 cùng TNV-G4). V1 bắt đầu ngay, không chờ ai.

---

## 2. Đợt V0 — Giấy tờ trước (soạn 🤖, duyệt 👤)

Mỗi lượt duyệt tối đa **3** quyết định chạm quyền/dữ liệu, kèm trang ghép (CLAUDE.md §9).

### Lượt A (3 quyết định)
1. **Diff `docs/quyen-hoan.json` — mục `TNV-VP01`** (mức HIGH, hạn `2026-10-31`, người chịu trách nhiệm: chủ dự án, nguồn: `BAO-CAO-LOI.md` VP-01 + `NGUYEN-NHAN-GOC.md` §3.1). `ke_hoach`: "V2 của lộ trình 3/10; điều kiện đóng: (i) hai test thứ tự → 409; (ii) trigger quan sát chặn thật, dòng `SO-HANG-RAO`; (iii) `R-BIL-13` mức `fail` xanh trên D1 local sau e2e". Mọi đợt chạm `billing` tới khi đóng ghi "xây trên lỗ đang hở: TNV-G4, TNV-VP01".
2. **Diff ADR-0092 nháp** (tệp `2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md`, phần ADR-0092): thêm **Đ2b** — *"Một dòng giữ hộ (`HELD`) được tất toán đúng một lần, bằng một trong hai đường: 'Công ty đã nhận' (dòng đảo) hoặc dòng quyết toán 'Nộp'. Dòng đảo HELD thuộc phạm vi 'không đổi dấu' của Đ2. Lệnh thứ hai bị từ chối 409 kèm câu chỉ đường."*; sửa Đ4 bỏ chữ miễn cho "Công ty đã nhận"; `R-BIL-13` đếm cả dòng đảo HELD; trang ghép mục 3 thêm dòng "cổng `/confirm` và `/settlements` canh cùng một dòng HELD". Ghi lời chủ 3/10 nguyên văn.
3. **ADR-0096 (dự kiến) — Luật thứ tự điểm dừng và cửa sổ xuất bến** (3a, 3b):
   - **Đ1 (3a):** *mọi điểm đón của một suất phải có `seq` nhỏ hơn điểm trả của suất đó*. Vi phạm ⇒ mã giữ mới `TRA_TRUOC_DON` trong `MA_GIU` (`src/shared/ly-do-giu.ts`), câu "Điểm trả {nơi} đứng trước điểm đón của {đoàn}". Hai lớp: `kiemXuatBen` + trigger `vc_trip_departure_stop_order` (chặn sự kiện xuất bến khi tồn tại suất `seq(xuống) < seq(lên)`). Khắc phục tự động khi xếp: `lenhXepLo` đẩy điểm trả dùng chung xuống sau điểm đón mới (V1 làm trước phần này — không cần ADR vì là luật thuần sắp xếp).
   - **Đ2 (3b):** cột mới `departure_window_minutes INTEGER NOT NULL CHECK (BETWEEN 60 AND 2880)` trong `vc_dispatch_policy` (khuôn chính sách có ngày hiệu lực, ADR-0049 D2), **gieo 720** (= 12 giờ). Xuất bến chỉ hợp lệ khi `now ≥ planned_start − window` và chuyến `PLANNED`. Ngoài cửa sổ ⇒ mã giữ `NGOAI_CUA_SO_XUAT_BEN`, câu "Chuyến khởi hành lúc {HH:MM} ngày {D}, chưa tới giờ được xuất bến (được xuất bến từ {HH:MM} ngày {D′})". Hai lớp: trigger `vc_trip_departure_window` đọc dòng chính sách hiệu lực + `kiemXuatBen`. **Toàn quyền** đổi ở bảng điều khiển chính sách điều phối (route hiện có, ô `settings.ops`). **Không có đường phá lệ** (lời chủ 3/10). Viết lại câu "xuất bến sớm tối hôm trước" của ADR-0053 D7.2 thành "xuất bến trong cửa sổ": `trongNgayChay` giữ nguyên nghĩa.
   - Trang ghép: bảng `vc_dispatch_policy` (thêm cột), `vc_trip_event` (trigger mới), quyền `settings.ops` (không đổi ô), cổng `POST …/xuat-ben` (thêm hai lý do giữ), giao diện: chip "Đạt hết" đổi nghĩa (thêm hai điều kiện).

### Lượt B (2 quyết định)
4. **ADR-0097 (dự kiến) — Sự kiện điều chỉnh có lý do cho chuyến** (Kiểu A, HT-03 hoàn tác, HT-04, HT-06): không UPDATE lùi trạng thái; **ghi thêm**: sự kiện `CORRECTION` (lý do danh mục `vc_reason` nhóm `DIEU_CHINH`: "Bấm nhầm", "Khách đổi ý tại điểm", "Khác" + ô ghi chú bắt buộc khi "Khác") làm **đóng suất cũ** `close_reason = CORRECTED` và **mở suất mới** `WAITING` cùng chặng; `DEPARTURE_REVOKED` đưa chuyến `RUNNING → PLANNED` chỉ khi **chưa có sự kiện tiến độ nào** sau xuất bến và trong `proxy_backdate_max_minutes`; chỉ **văn phòng** (`trip.progress` không ngữ cảnh), tài xế không có nút — tài xế thấy "Vừa ghi … Sai? Báo văn phòng". Nhật ký trước→sau. Sửa LC-07 (thêm hai cạnh có điều kiện), LC-05 (bản chụp giữ nguyên, thêm bản chụp mới khi xuất bến lại), chỉ mục một-chuyến-đang-chạy (không đổi). Ghi rõ **lý do giữ chứng cứ**: không xoá, không ghi đè. Trang ghép: `vc_trip`, `vc_trip_allocation`, `vc_trip_event`, `vc_reason`; ô quyền `trip.progress`; cổng route mới `POST …/dieu-chinh`, `POST …/thu-hoi-xuat-ben`.
5. **ADR-0098 (dự kiến) — Tra trùng hồ sơ theo số điện thoại ở máy chủ, cho mọi vai** (câu 4): *thay câu* ADR-0014 đ5 ("CTV không tra được… vẫn tạo hồ sơ mới") bằng *"máy chủ tra theo SĐT chuẩn hoá trước khi tạo; đã có ⇒ dùng lại hồ sơ, không tạo thứ hai; Đối tác/Thực tập chỉ nhận thông điệp 'đã có hồ sơ, dùng lại', không nhận chi tiết hồ sơ"*. Khoá là **SĐT**, không phải tên. Hệ quả: `customerPhone` trên đơn qua `normalizePhone` (một chuẩn); số quốc tế → mã nợ BACKLOG. Trang ghép: `pty_party`, `pty_contact`, `orders.booker_party_id`; ô `party.view` **không đổi**; cổng `POST /api/orders` (đường tạo hồ sơ mới) nhận thêm luật.

### Ngoài lượt duyệt (mô tả, không cần duyệt)
6. **Mã nợ BACKLOG** (`docs/BACKLOG.md`, trạng thái `tạm gác`, mỗi mục ghi câu ADR gốc): BL-TIEN-KT "Kế toán tin tiền chỉ làm mới màn" (ADR-0025:71) → chuyển V5; BL-CREW-TIN "HDV CREW không nhận tin chuyến" (ADR-0052:165) → V5; BL-MST-UNIQUE (`doi-chieu-oracle-tca.md:80`) → V6 + câu hỏi chủ; BL-GIA-SHEET "giá Sheet áp ngay không ngưỡng" → V6; BL-SDT-QT "SĐT quốc tế trên đơn" (`n2-lat-1:120`) → sau V4.

**Tiêu chí nghiệm thu V0:** mỗi lượt có trang ghép đủ 3 mục (+ mục "cặp lệnh trên cùng đối tượng" cho lượt A — áp thử đề xuất 5.1 dù chưa thành luật); chủ trả lời "Duyệt"/"Sửa" từng điểm; ADR được duyệt mới có trạng thái `accepted`.

---

## 3. Đợt V1 — Việc nhỏ không cần ADR (🤖 1 phiên; 🔍 cho V1.2)

Nguyên tắc: **test đỏ trước, xanh sau**; không chạm `orders`, `billing`, migration, quyền.

| # | Việc | Tệp | Test đỏ trước | Tiêu chí nghiệm thu |
|---|---|---|---|---|
| V1.1 | **HT-24**: chuyến `RUNNING` có `gioXuatBen.ngay < homNay` vào nhóm "Hôm nay", xếp đầu, nhãn "xuất bến {ngày}" | `src/shared/tien-do-man.ts:212-235` | `tien-do-man.test.ts`: `nhomCuoc([RUNNING ngày D−1], D)` → nhóm Hôm nay có thẻ, `moChay: true` (hôm nay `[[],[],[]]`) | Màn `/cuoc` lúc 00:01 vẫn hiện chuyến đang chạy; kịch bản Chrome `cuoc-qua-nua-dem-smoke.mjs` với đồng hồ giả |
| V1.2 | **HT-01 tự sắp**: sau khi dựng điểm trong `lenhXepLo`, với mỗi điểm trả dùng lại có điểm đón mới `seq` lớn hơn ⇒ đổi `seq` các điểm `PENDING` để mọi đón của suất đứng trước trả của suất, giữ thứ tự tương đối còn lại | `src/modules/van-chuyen/dieu-phoi-route.ts:108-117`, `dieu-phoi-lenh.ts:142-150` | `dieu-phoi-route.test.ts` (mới): hai chặng cùng nơi trả → `[ĐÓN A, ĐÓN B, TRẢ]`; e2e `dieu-phoi.mjs`: xếp hai đơn cùng Bến tàu → `thuTu` đón < trả | 🔍 đọc lại thuật toán + chạy e2e; `canhBao` (không chặn, chờ ADR-0096) khi vẫn còn `seq(xuống) < seq(lên)` sau sắp |
| V1.3 | **HT-03 giao diện**: bảng trượt xác nhận trước "Xuất bến" ở màn tài xế (mã chuyến, **ngày chạy**, giờ dự kiến, biển số, số khách); dòng cảnh báo đỏ khi `ngayChay ≠ homNay` ở màn tài xế và màn văn phòng; không dùng `confirm()` của trình duyệt | `web/cuoc-chuyen.ts:275-277`, `web/chuyen.ts:256-272`, hàm thuần mới `src/shared/xac-nhan-xuat-ben.ts` | test hàm thuần dựng nội dung hộp (có/không cảnh báo theo ngày); kịch bản Chrome `/cuoc-chuyen` bấm Xuất bến → hộp hiện, chưa gọi API | Bấm nhầm một chạm không còn xuất bến được; văn phòng thấy cảnh báo ngày |
| V1.4 | **Kiểu A hộp xác nhận**: "Đã trả cả điểm", "Kết thúc chuyến" ở màn tài xế dùng cùng khuôn bảng trượt; sau mỗi lệnh suất một chạm hiện dòng "Vừa ghi {…} — Sai? Báo văn phòng" | `web/cuoc-chuyen.ts:122-189` | kịch bản Chrome | Không hành động chốt nào ở màn tài xế còn một chạm, trừ "Đã tới" và từng khách (đã có bước lùi/đường sửa ở V3) |
| V1.5 | **Kiểu D**: (a) nút Hỗ trợ né mọi phần tử mang lớp chung `.thanh-hanh-dong-cuoi` (đặt lớp cho `.dp-run-end`, `.form-actions`, `.vc-bottom-bar`); (b) một hàm `ngayNgan(iso, homNay)` ở `src/shared/vn-date.ts` tự thêm năm khi khác năm hiện tại, thay `dayMonth`/`formatDm`/`ngayNgan` cũ; bài kiểm cấm `slice(8, 10)`/`slice(5, 7)` trên chuỗi ngày ngoài tệp đó; (c) Trang chủ: nhãn "Toàn công ty" / "Của tôi" trên từng ô | `web/tro-ly.ts:329`, `public/app.css:2656`, `web/format.ts:39-42`, `src/shared/trip-form.ts:27`, `src/shared/tin-chuyen.ts:43`, `web/home.ts:84-98` | `vn-date.test.ts` ca khác năm; bài kiểm kiến trúc quét `slice(8, 10)`; kịch bản Chrome 390 cuộn cuối `/cuoc-chuyen` đo nút nổi không giao nút Kết thúc | Ba luật giao diện mới (đề xuất vào `web/CLAUDE.md` ở V7) đã có bài kiểm thuần |

**Cổng V1:** `npm run typecheck` 0 lỗi; `npm test` xanh; `npm run test:e2e -- dieu-phoi tai-xe-cuoc` xanh; kịch bản Chrome lưu `docs/evidence/2026-10-0x-kiem-theo-vai-v1/`; 🔍 báo cáo ĐẠT cho V1.2; cập nhật `docs/CHANGE-GUIDE.md` công thức z3 (thứ tự điểm) và `SYSTEM-DESIGN.md` §9.

---

## 4. Đợt V2 — VP-01 sổ tiền (🤖 + 🔍; gộp vào Đợt 2 (b); hạn 31/10)

**Điều kiện:** V0 lượt A đã duyệt; Đợt 1 (đơn huỷ) đã gộp `main` hoặc nhánh V2 tách sau khi Đợt 1 gộp (cùng vùng `billing`). Ghi "xây trên lỗ đang hở: TNV-G4, TNV-VP01, F-03".

**Đo trước (👤 chạy, chỉ đọc, dán kết quả vào sổ thi công):**
```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT party_id, order_id, balance FROM v_bil_party_balance WHERE balance < 0"
```
Có dòng ⇒ ghi vào kế hoạch con một bước "dọn dữ liệu demo" (đảo lần nộp sai bằng route, không SQL tay).

| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V2.1 | `ghiQuyetToan` chiều `nop`: với từng đơn, `amount ≤` số bên đó đang nợ công ty trên đơn (`soDuTheoBen`); vượt ⇒ 409 `settlement_exceeds_held` câu tiếng Việt. Chiều `tra` đối xứng | `src/modules/billing/service.ts:361-397` | `lo-ghi.test.ts`: xác nhận rồi nộp 1.000.000 → 409 (hôm nay 201) |
| V2.2 | `xacNhanCongTyNhan`: thêm điều kiện số người khai đang nợ trên đơn `≥ amount` dòng HELD; không thì 409 `held_already_settled` "Khoản này đã được ghi nộp — nếu tiền cũng đã về tài khoản thì đảo lần nộp trước" | `service.ts:331-355` | `lo-ghi.test.ts`: nộp rồi xác nhận → 409; `GET /api/ledger/mine` = 0 (hôm nay 200 và −1.000.000) — khuôn sẵn ở bài tái hiện của phiên điều tra |
| V2.3 | `tienCuaDon.choXacNhan` chỉ gồm lần thu có HELD chưa đảo **và** người khai còn nợ ≥ số đó — một nguồn sự thật | `service.ts:164-200` | `lo-ghi.test.ts`: sau nộp, `keToan.choXacNhan` rỗng |
| V2.4 | **Migration `0076_bil_khong_doi_dau.sql` (dự kiến):** trigger `BEFORE INSERT ON bil_debt_line` (a) `kind_code='SETTLEMENT' AND reverses_line_id IS NULL`: số dư cặp (creditor, debtor, order) sau khi cộng không đổi dấu ⇒ `RAISE(ABORT,'settlement_sign_flip')`; (b) `reverses_line_id IS NOT NULL AND kind_code='HELD'`: số dư hiện tại của gốc.debtor với công ty trên đơn `≥` gốc.amount ⇒ không thì `RAISE(ABORT,'held_already_settled')`. Chỉ đọc bảng `bil_*` (Hiến chương 5.3) | `migrations/0076_*.sql`, `docs/data-dictionary.json` + `npm run dict` | `migrations-billing.test.ts`: chèn SQL thẳng dòng đảo HELD khi số dư 0 → RAISE; SETTLEMENT vượt → RAISE; gỡ trigger thì qua (P16, ghi `SO-HANG-RAO`) |
| V2.5 | `R-BIL-13` mức `fail` trong `scripts/audit-checks.mjs`: cặp (bên, công ty, đơn) có số dư âm **mà** tồn tại dòng HELD gốc còn hiệu lực hoặc SETTLEMENT công ty→bên vượt tổng HELD; loại trừ ca âm hợp lệ (REFUND người ứng, công ty nợ đại lý) theo loại dòng | `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | dữ liệu B1–B3 (gỡ trigger) → 1; đúng luồng → 0; REFUND người ứng → 0 |
| V2.6 | Giao diện `web/order.ts`: nút "Đã nộp" gửi số đang giữ **trừ** phần CK chờ xác nhận (hoặc Kế toán nhập số, kẹp ≤ số đó); dòng `dangGiu` ghi "gồm {X} ₫ chuyển khoản chờ xác nhận" | `web/order.ts:441-594` | kịch bản Chrome trang đơn vai Kế toán |
| V2.7 | Sổ vàng SV-SC-05 "khai CK → nộp bù → xác nhận bị từ chối" (trạng thái `cho_xac_nhan` để 👤/Kế toán duyệt); e2e `so-tien.mjs` nhánh thứ tự ngược; `audit-invariants --strict` cuối bộ | `golden/so-cong-no-luot-1.json`, `tests/e2e/so-tien.mjs` | — |

**Cổng V2:** 🔍 đọc mã + chạy lại `lo-ghi`, `migrations-billing`, `audit-invariants`, e2e `so-tien`; mỗi hàng rào mới có dòng `SO-HANG-RAO` với ngày thấy chặn thật; đóng `TNV-VP01` (và phần KT04 của TNV-G4) trong `quyen-hoan.json`; `docs/SYSTEM-DESIGN.md` §6 luồng tiền cập nhật.

---

## 5. Đợt V3 — Luật lõi chuyến (ADR-0096, ADR-0097; 🤖 + 🔍)

**Điều kiện:** V0 lượt A (0096) và lượt B (0097) đã duyệt; V1 đã gộp (cùng vùng). Hai phần có thể là hai phiên.

### V3-A (ADR-0096): chặn "trả trước đón" và cửa sổ xuất bến
| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V3.1 | Mã giữ `TRA_TRUOC_DON`, `NGOAI_CUA_SO_XUAT_BEN` vào `MA_GIU`; `kiemXuatBen` thêm hai kiểm; `canhBao` của V1.2 nâng thành giữ | `src/shared/ly-do-giu.ts`, `src/shared/dieu-phoi-kiem.ts:324-426` | `dieu-phoi-kiem.test.ts`: suất `seq(xuống) < seq(lên)` → giữ; xuất bến 13 giờ trước giờ dự kiến → giữ; 11 giờ → không giữ |
| V3.2 | **Migration `0077_cua_so_xuat_ben.sql` (dự kiến):** cột `departure_window_minutes` (CHECK 60–2880) trên `vc_dispatch_policy`, gieo dòng hiệu lực mới 720; trigger `vc_trip_departure_window` và `vc_trip_departure_stop_order` trên `vc_trip_event` (sự kiện xuất bến) | `migrations/0077_*.sql`, `data-dictionary.json` | `migrations-van-chuyen.test.ts`: chèn sự kiện xuất bến ngoài cửa sổ → RAISE; trả trước đón → RAISE; gỡ trigger thì qua |
| V3.3 | Bảng điều khiển chính sách điều phối (Toàn quyền, `settings.ops`): ô "Cửa sổ xuất bến (giờ)" ghi dòng chính sách mới | `src/modules/van-chuyen/index.ts:636-…`, `web/chinh-sach-dieu-phoi.ts` | route test: Quản trị → 403; Toàn quyền → 201 dòng mới; e2e `chinh-sach-dieu-phoi.mjs` |
| V3.4 | Màn tài xế/văn phòng: chip "Đạt hết" và lý do giữ hiện hai điều kiện mới; câu "được xuất bến từ {giờ} ngày {D′}" | `web/cuoc-chuyen.ts`, `web/chuyen.ts`, `src/shared/ly-do-giu.ts` câu chữ | kịch bản Chrome |

### V3-B (ADR-0097): sự kiện điều chỉnh có lý do
| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V3.5 | **Migration `0078_dieu_chinh_chuyen.sql` (dự kiến):** nhóm lý do `DIEU_CHINH` trong `vc_reason`; `close_reason` thêm `CORRECTED`; LC-07 thêm cạnh `RUNNING → PLANNED` **chỉ** khi lô có sự kiện `DEPARTURE_REVOKED` mang dấu lệnh hiện hành và không có sự kiện tiến độ sau xuất bến; LC-06 không đổi | `migrations/0078_*.sql` | `migrations-van-chuyen.test.ts`: UPDATE lùi không có sự kiện → RAISE; có sự kiện hợp lệ → qua; đã có "Đã tới" sau xuất bến → RAISE |
| V3.6 | Lệnh `lenhDieuChinhSuat` (đóng suất `CORRECTED` + mở suất `WAITING` cùng chặng + sự kiện `CORRECTION` + nhật ký trước→sau) và `lenhThuHoiXuatBen` (`DEPARTURE_REVOKED`), chỉ văn phòng (`trip.progress` không ngữ cảnh), trong `proxy_backdate_max_minutes`; MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái (bài `thu-tu-lo.test.ts`) | `src/modules/van-chuyen/dieu-phoi-tien-do.ts`, `dieu-phoi.ts`, `index.ts` route mới | route test: tài xế → 403; văn phòng → 201; quá kẹp → 409; e2e `van-chuyen.mjs` ca "xuất bến nhầm → thu hồi → xuất bến chuyến đúng" (HT-03), "đã đón nhầm → điều chỉnh → khách vắng" (HT-04/HT-06 theo mô tả đầy đủ khi có) |
| V3.7 | Giao diện văn phòng: nút "Điều chỉnh…" trên suất, "Thu hồi xuất bến" trên chuyến RUNNING chưa có tiến độ; màn tài xế: dòng "Vừa ghi … Sai? Báo văn phòng" (đã có từ V1.4) | `web/chuyen.ts` | kịch bản Chrome |
| V3.8 | Tin chuyến: `trip_corrected`, `trip_departure_revoked` vào `HANH_DONG_TIN_CHUYEN` → tài xế + điều phối (ghép với ma trận V5 nếu V5 đi trước) | `src/shared/tin-chuyen.ts` | `tin-chuyen.test.ts` |

**Cổng V3:** 🔍 đọc lại luật lõi ở **cả trigger lẫn máy chủ**; `SO-HANG-RAO` cho mỗi trigger; `CHANGE-GUIDE` công thức z3 và bẫy 53 cập nhật; `SYSTEM-DESIGN` §6 máy trạng thái chuyến vẽ lại; ADR-0053 D7.2 ghi dòng "thay câu" trỏ ADR-0096.

---

## 6. Đợt V4 — Hồ sơ trùng theo SĐT (ADR-0098; 🤖 + 🔍; gộp vào Đợt 3 cạnh R6)

| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V4.1 | `resolveBooker` nhánh `new`: `normalizePhone` → `findPartiesByPhone` (hàm công bố của `parties`); có ⇒ dùng `party_id` đó (không tạo); trả về đơn kèm cờ `bookerReused: true` để giao diện báo "Khách này đã có hồ sơ, dùng lại" | `src/modules/orders/service.ts:391-401`, `src/modules/parties/index.ts` (hàm công bố) | `orders` test: Đối tác tạo đơn SĐT đã có → không có hồ sơ mới, `booker_party_id` = hồ sơ cũ (hôm nay tạo mới) |
| V4.2 | `customerPhone` trên đơn qua `normalizePhone` (bỏ `PHONE_RE`); số không chuẩn ⇒ 400 câu tiếng Việt; số quốc tế: mã nợ BL-SDT-QT, tạm từ chối kèm hướng dẫn nhập số liên hệ VN | `src/modules/orders/rules.ts:90,113-116`, `web/order-form.ts:336` | `orders/rules.test.ts`: `"0912 345 678"` → chuẩn; `"+84…"` → 400 có câu; 19 ký tự → 400 |
| V4.3 | Giao diện `booker-picker.ts`: Đối tác/Thực tập không còn câu "Không tra được hồ sơ — vẫn lưu đơn được"; thay bằng "Nhập số điện thoại, hệ thống tự dùng lại hồ sơ nếu đã có" | `web/booker-picker.ts:65` | kịch bản Chrome vai Đối tác |
| V4.4 | Bất biến `R-PTY-7` (`fail` từ mốc migration V4; dòng cũ `warn`): hai hồ sơ **đang hoạt động** cùng SĐT liên hệ chuẩn hoá | `scripts/audit-checks.mjs` | `audit-invariants.test.ts` |
| V4.5 | Dòng "thay câu" ở ADR-0014 trỏ ADR-0098; `SYSTEM-DESIGN` §6 luồng lập đơn | docs | — |

**Cổng V4:** 🔍 (dữ liệu + quyền: kiểm Đối tác không đọc được chi tiết hồ sơ qua đường mới — route test 403 giữ nguyên); e2e `orders`, `booker`, `nhap-tay-va-gia-doi-tac`; `audit-invariants` sau e2e.

---

## 7. Đợt V5 — Tin tới đúng người (gộp vào Đợt 4; 🤖 soạn ma trận → 👤 duyệt → 🤖 thi công)

1. **Ma trận sự kiện × vai** (`docs/superpowers/specs/2026-10-xx-ma-tran-su-kien-vai.md`): hàng = mọi hành động nhóm `order_*`, `trip_*`, `payment_*`, `ledger_*` trong `src/shared/audit-actions.ts`; cột = 10 quyền + "người lập" + "người phụ trách" + "tài xế bao mốc" + "CREW bao mốc"; ô = `chuông` / `hộp` / `làm mới` / `—` ; **ô `—` phải ghi "cố ý: …" hoặc mã nợ**. Đây là trang ghép kiểu mới (đề xuất 5.1 áp thử). Một lượt duyệt.
2. Thi công theo ma trận: `trip_passenger_cancelled_at_stop` → người lập/phụ trách + điều phối; `loaiCho` xét cả dòng **CREW** cho giờ/điểm hẹn (DTO tin **không** chứa tên khách — tách "được báo" khỏi "được xem"); tin tiền cho Kế toán (`payment_recorded`, `ledger_settlement`, `order_delivered`) vào hộp; thi công ADR-0062 (view `v_aud_order_change`, migration dự kiến `0079`); MQ-07 khi `order_leg_updated` ghi được chặng.
3. **Bài kiểm "vắng mặt"**: mọi hành động nhóm trên phải có hàng trong ma trận (đọc tệp ma trận, so với `AUDIT_ACTIONS`) — đỏ khi thêm hành động mà quên ma trận.

**Cổng V5:** 🔍 cho phần quyền nhận tin (không lộ tên/SĐT khách cho CREW, Đối tác); e2e `thongbao`, `tin-chuyen`, `bangtin`.

---

## 8. Đợt V6 — Dữ liệu bẩn còn lại (🤖; mức `warn`, không cần ADR)

- `R-PTY-8` warn: hai tổ chức đang hoạt động cùng `tax_code`. Kèm **câu hỏi mở lại cho chủ**: nay có đại lý thật, MST có nên thành khoá duy nhất (UNIQUE từng phần theo `active = 1`)? Hoãn ngày 21/9 ghi "CRM lập đơn, MST không phải khoá nhận dạng".
- `R-CAT-1` warn: lần đồng bộ Sheet làm giá một dịch vụ đổi > 50 % hoặc về 0; cộng cảnh báo ở Trang chủ Quản trị (đã có khung `catalog_changed`). **Không** thêm bước duyệt giá (chủ chưa quyết — ghi BL-GIA-SHEET).
- `R-ORD-SDT` warn: đơn có `customer_phone` không khớp `^0\d{9}$` (dòng cũ trước V4).
- Mỗi bất biến: ca vi phạm thật → 1, dữ liệu khoẻ → 0; dòng `SO-HANG-RAO` ghi rõ "chỉ phát hiện, không chặn".

---

## 9. Đợt V7 — Quy trình và hàng rào (👤 quyết mục 5 báo cáo trước; 🤖 chỉ đề xuất diff — N9)

| # | Đề xuất | Hình thức | Hàng rào máy |
|---|---|---|---|
| V7.1 | Trang ghép thêm mục (4) **cặp lệnh trên cùng đối tượng** và (5) **một ngày của một vai** | Diff `CLAUDE.md` §9 | Bài kiểm: tệp `*trang-ghep*` mới (sau ngày hiệu lực) phải có 5 tiêu đề mục |
| V7.2 | Mẫu ADR thêm mục bắt buộc **"Bấm nhầm thì sao"** (hoàn tác / điều chỉnh có lý do / cố ý không có vì…) | Diff `docs/adr/README.md` (mẫu) | Bài kiểm: ADR mới có tiêu đề mục đó |
| V7.3 | **Mã nợ cho mọi hoãn**: câu "lượt 1 chưa", "giả định bề mặt", "LỆCH — HOÃN", "để sau" trong `docs/adr/`, `docs/superpowers/specs/` phải đi kèm `BL-…` có trong `BACKLOG.md` | Luật ở `CLAUDE.md` §3 | `src/no-co-ma.test.ts` quét và đỏ khi thiếu mã (áp cho tệp mới sau ngày hiệu lực; tệp cũ liệt kê ngoại lệ có hạn) |
| V7.4 | **Smoke Chrome theo vai** vào `npm run trien-khai` sau e2e: 3 vai (Bán hàng, Kế toán, Tài xế) × 3 màn chính, khổ 390 + 1280, có ca **nhảy ngày** và **cuộn tới cuối**; thất bại ⇒ dừng triển khai | `scripts/trien-khai.mjs`, thư mục `tests/chrome/` | Tự chặn (quan sát một lần cố ý làm đỏ) |
| V7.5 | **Kiểm thử theo vai định kỳ**: trước mỗi bản có màn mới, ba người đóng vai; **bản đầy đủ** (bước tái hiện, tệp:dòng) lưu `docs/superpowers/specs/<ngày>-kiem-theo-vai/` — lần 2/10 còn thiếu bản đầy đủ: 👤 bổ sung | Quy trình (`CLAUDE.md` §9) | Dựa vào kỷ luật (ghi rõ) |
| V7.6 | Ghi khe hở hàng rào: `git push` bị chặn ở shell nhưng ghi qua kết nối GitHub thì không | Dòng `SO-HANG-RAO` | Dựa vào kỷ luật tới khi có deny cho công cụ GitHub ghi |

---

## 10. Bảng truy vết: lỗi → đợt → bằng chứng "đã hết"

| Lỗi | Đợt | Bài đỏ → xanh | Kịch bản chạy lại |
|---|---|---|---|
| VP-01 | V0-A, V2 | `lo-ghi.test.ts` (2 ca thứ tự), `migrations-billing.test.ts` (2 trigger), `audit-invariants.test.ts` R-BIL-13 | e2e `so-tien` nhánh ngược; tình huống VP-01 của báo cáo chạy lại trên bản thử → 409, sổ = 0 |
| HT-24 | V1.1 | `tien-do-man.test.ts` | Chrome `cuoc-qua-nua-dem-smoke.mjs` |
| HT-01 | V1.2 (tự sắp), V3.1–3.2 (chặn) | `dieu-phoi-route.test.ts`, `dieu-phoi-kiem.test.ts`, `migrations-van-chuyen.test.ts` | e2e `dieu-phoi` hai đoàn cùng Bến tàu |
| HT-03 | V1.3 (hộp + cảnh báo), V3.2–3.3 (cửa sổ), V3.5–3.6 (thu hồi) | hàm hộp; `dieu-phoi-kiem.test.ts` cửa sổ; trigger; route thu hồi | e2e `van-chuyen` "xuất bến nhầm → thu hồi" |
| HT-04, HT-06 | V3.5–3.7 | route điều chỉnh | e2e `van-chuyen` (mô tả đầy đủ hai lỗi này **chưa có trong kho** — 👤 bổ sung bản đầy đủ) |
| Kiểu A | V1.4, V3-B | Chrome; route | — |
| Kiểu B | V5 | `tin-chuyen.test.ts`, `thong-bao.test.ts`, bài "vắng mặt" | e2e `thongbao`, `tin-chuyen` |
| Kiểu C (SĐT, trùng hồ sơ) | V4 | `orders/rules.test.ts`, `orders` service test, R-PTY-7 | e2e `orders`, `booker` |
| Kiểu C (MST, giá Sheet) | V6 | `audit-invariants.test.ts` | `audit-invariants --db local` sau e2e |
| Kiểu D | V1.5 | `vn-date.test.ts`, bài kiến trúc quét `slice` | Chrome 390 cuộn cuối |
| BH-06, BH-08, BH-09 (quyền, báo cáo nêu "cần bạn quyết") | **chưa xếp** | — | Mô tả đầy đủ chưa có trong kho → 👤 bổ sung rồi xếp đợt |

---

## 11. Cổng "XONG" của chương trình V

- [ ] Mọi dòng bảng truy vết có bài đỏ → xanh; dòng "cần chủ" ghi rõ chưa làm.
- [ ] Chạy lại **ít nhất 39 tình huống nghiêm trọng/trung bình** của đợt kiểm theo vai trên bản thử (ba người đóng vai hoặc kịch bản Chrome tương ứng): 0 nghiêm trọng; trung bình thuộc đợt đã làm → ĐÃ HẾT.
- [ ] Sổ dừng dây chuyền: `TNV-VP01` đã đóng (cùng TNV-G4).
- [ ] Mỗi hàng rào mới (3 trigger, 3 bất biến, bài "vắng mặt", bài quét `slice`, smoke Chrome) có dòng `SO-HANG-RAO` với ngày thấy chặn thật.
- [ ] Gốc M1–M5 được thêm vào `2026-10-02-khac-phuc-audit-goc-va-phuong-an.md` §2 (một dòng mỗi gốc, trỏ về báo cáo 3/10) — chủ duyệt vì tài liệu đó là kế hoạch đã trình.
- [ ] 🔍 người kiểm độc lập ký báo cáo kết thúc.
- [ ] `docs/SYSTEM-DESIGN.md` §14, `docs/HANDOFF-N1.md` "Việc còn treo", `checklist` của lộ trình 2/10 cập nhật.

---

## 12. Rủi ro và cách tránh

- **Va số migration** (`0076`–`0079` dự kiến; `0072`, `0073` đang giữ cho nhánh Vận chuyển): đo `ls migrations` trên mọi nhánh chưa gộp ngay trước khi tạo tệp và trước `day-len`.
- **Lớp vé chống ghi trùng (ADR-0094, bản 1.76):** mọi route ghi mới (V3.6 điều chỉnh/thu hồi, V2 không thêm route) phải đi qua lớp vé của router; đọc `docs/CHANGE-GUIDE.md` công thức lớp vé trước khi thêm route.
- **ADR-0092 chưa duyệt** ⇒ V2 không được bắt đầu; nếu tới 20/10 chưa duyệt, báo chủ để gia hạn `TNV-VP01` có lý do.
- **Cùng vùng mã:** V1 ∥ Đợt 1 được (van-chuyen/web vs orders/billing); V3 sau V1; V4 sau Đợt 1; V2 sau Đợt 1. Không hai phiên cùng sửa `van-chuyen` hay `billing` cùng lúc.
- **Số dư âm đã có trên production (demo):** đo trước V2 bằng câu SELECT ở mục 4; dọn bằng route đảo, không SQL tay.
- **Bản đầy đủ 78 lỗi chưa có trong kho:** HT-04, HT-06, BH-06/08/09 và 51 lỗi ít nghiêm trọng chưa xếp đợt được; 👤 đưa bản đầy đủ vào `docs/superpowers/specs/2026-10-02-kiem-theo-vai/` để phiên lập kế hoạch bổ sung.

---

## 13. Cần chủ dự án (để bắt đầu)

1. **Duyệt lộ trình này** (hoặc sửa thứ tự/ưu tiên).
2. **Duyệt V0 lượt A** khi phiên soạn trình: mục `TNV-VP01`, diff ADR-0092, ADR-0096.
3. **Duyệt V0 lượt B:** ADR-0097, ADR-0098.
4. **Quyết mục 5 của báo cáo** (ba luật quy trình) để mở V7.
5. **Bổ sung bản đầy đủ 78 lỗi** vào kho (cho HT-04, HT-06, BH-06/08/09 và 51 lỗi nhẹ).
6. **Chạy câu SELECT chỉ đọc** ở mục 4 trước V2 và dán kết quả vào sổ thi công V2.
7. (V6) Trả lời lại câu MST có thành khoá duy nhất không.
