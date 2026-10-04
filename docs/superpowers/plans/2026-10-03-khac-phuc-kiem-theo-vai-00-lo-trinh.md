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
| **V8 — Việc nhỏ đợt sau** (thêm 3/10 khi xếp 78 lỗi) | M4, M5 | Câu báo, nhãn, bố cục, tiện ích ít nghiêm trọng không cần ADR, không chạm quyền / tiền / cấu trúc dữ liệu — danh sách ở §9a | Không | Sau V1 (dùng lại khuôn hộp xác nhận, hàm ngày, lớp né nút nổi của V1) | Mọi đợt khác vùng tệp | 1–2 phiên |

**Đường găng:** V0 lượt A → V2 (hạn 31/10 cùng TNV-G4). V1 bắt đầu ngay, không chờ ai.

---

## 2. Đợt V0 — Giấy tờ trước (soạn 🤖, duyệt 👤)

> **Trạng thái 2026-10-03 (tối):** **ĐÃ DUYỆT.** Chủ trả lời chat 3/10: *"Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ). Duyệt ADR-0097 và ADR-0098. Danh bạ chặn trùng SĐT cho hồ sơ mới, hồ sơ cũ cảnh báo. SĐT nước ngoài: phương án B, ghi mã nợ chuẩn hoá số quốc tế. HT-06: chặn, gộp vào ADR-0096. BH-06: cho ghi như HDV phụ trách (ADR riêng). BH-08: Thực tập như Đối tác, chỉ giá danh mục, không giảm. BH-09: giữ như hôm nay tới ADR-0018 giai đoạn 2."* Đã làm: `TNV-VP01` vào `docs/quyen-hoan.json`; Đ2b/Đ4 vào bản nháp ADR-0092 (toàn văn ADR-0088/0092 **duyệt sau đó cùng ngày** ("1- duyệt" ⇒ `docs/adr/ADR-0088-…`, `ADR-0092-…`; V2 chỉ còn chờ Đợt 1 gộp `main`); dòng "thay câu" đã ghi vào trạng thái 12 ADR cũ ("2- có"); hàng rào tệp luật siết ở phiên riêng ("3: ok")); `docs/adr/` có ADR-0096 (gồm Đ3 LC-21 cho HT-06), ADR-0097, ADR-0098, ADR-0099 (BH-06), ADR-0100 (BH-08), trang ghép lượt C ở cùng thư mục. Ghi chú soạn thảo cũ (trước duyệt): Văn bản ở `docs/superpowers/specs/2026-10-03-v0-luot-duyet/` (mục lục `README.md`): lượt A = `A1-…diff`, `A2-…diff`, `A3-ADR-0096-…md` + `LUOT-A-TRANG-GHEP.md`; lượt B = `B1-ADR-0097-…md`, `B2-ADR-0098-…md` + `LUOT-B-TRANG-GHEP.md`; bản vá giữ chỗ số ADR `adr-README-giu-cho.diff`. Số ADR đo lại 3/10 trên mọi nhánh: 0096–0098 đúng như dự kiến. Mã nợ §2.6 đã vào `docs/BACKLOG.md` §21. Ba chỗ người soạn **lệch** so với chữ của mục này (có ghi lý do trong văn bản): (1) trigger cửa sổ / thứ tự đặt trên cạnh `PLANNED → RUNNING` của `vc_trip`, không trên `vc_trip_event`; (2) ADR-0097 không có ô chữ tự do khi chọn "Khác" (lời chủ 29/9, `BACKLOG.md` §5, mã nợ `BL-GHI-CHU-CHUYEN`); (3) ADR-0097 mở suất mới ở **trạng thái đúng** (không luôn `WAITING`) để suất không treo khi điểm đã `DONE`; ADR-0096 thêm nút đổi thứ tự cho chuyến **kế hoạch** (hôm nay chỉ có khi đang chạy) — là "nút đổi thứ tự để sửa tay" của lời chủ 3a; (4) ADR-0097 **không** gỡ HT-06 (mục 4 dưới và NGUYEN-NHAN-GOC.md §6 câu 3 ghi "HT-04/HT-06 theo ADR đó"): bản đầy đủ cho thấy HT-06 là lý do giữ chuyến + tin MQ-07, không phải sửa sai — phần giữ chờ chủ (`BL-GIO-HEN-SOM`), phần tin đi V5. Người kiểm độc lập V0 (3/10) kết luận "đạt có điều kiện"; các phát hiện đã sửa vào văn bản cùng ngày (commit sau `97bf3e0f`).

Mỗi lượt duyệt tối đa **3** quyết định chạm quyền/dữ liệu, kèm trang ghép (CLAUDE.md §9).

### Lượt A (3 quyết định)
1. **Diff `docs/quyen-hoan.json` — mục `TNV-VP01`** (mức HIGH, hạn `2026-10-31`, người chịu trách nhiệm: chủ dự án, nguồn: `BAO-CAO-LOI.md` VP-01 + `NGUYEN-NHAN-GOC.md` §3.1). `ke_hoach`: "V2 của lộ trình 3/10; điều kiện đóng: (i) hai test thứ tự → 409; (ii) trigger quan sát chặn thật, dòng `SO-HANG-RAO`; (iii) `R-BIL-13` mức `fail` xanh trên D1 local sau e2e". Mọi đợt chạm `billing` tới khi đóng ghi "xây trên lỗ đang hở: TNV-G4, TNV-VP01".
2. **Diff ADR-0092 nháp** (tệp `2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md`, phần ADR-0092): thêm **Đ2b** — *"Một dòng giữ hộ (`HELD`) được tất toán đúng một lần, bằng một trong hai đường: 'Công ty đã nhận' (dòng đảo) hoặc dòng quyết toán 'Nộp'. Dòng đảo HELD thuộc phạm vi 'không đổi dấu' của Đ2. Lệnh thứ hai bị từ chối 409 kèm câu chỉ đường."*; sửa Đ4 bỏ chữ miễn cho "Công ty đã nhận"; `R-BIL-13` đếm cả dòng đảo HELD; trang ghép mục 3 thêm dòng "cổng `/confirm` và `/settlements` canh cùng một dòng HELD". Ghi lời chủ 3/10 nguyên văn.
3. **ADR-0096 (dự kiến) — Luật thứ tự điểm dừng và cửa sổ xuất bến** (3a, 3b): *(Văn bản soạn 3/10: `docs/superpowers/specs/2026-10-03-v0-luot-duyet/A3-…` — chỗ lệch chữ dưới đây ghi ở ghi chú trạng thái đầu §2.)*
   - **Đ1 (3a):** *mọi điểm đón của một suất phải có `seq` nhỏ hơn điểm trả của suất đó*. Vi phạm ⇒ mã giữ mới `TRA_TRUOC_DON` trong `MA_GIU` (`src/shared/ly-do-giu.ts`), câu "Điểm trả {nơi} đứng trước điểm đón của {đoàn}". Hai lớp: `kiemXuatBen` + trigger `vc_trip_departure_stop_order` (chặn sự kiện xuất bến khi tồn tại suất `seq(xuống) < seq(lên)`). Khắc phục tự động khi xếp: `lenhXepLo` đẩy điểm trả dùng chung xuống sau điểm đón mới (V1 làm trước phần này — không cần ADR vì là luật thuần sắp xếp).
   - **Đ2 (3b):** cột mới `departure_window_minutes INTEGER NOT NULL CHECK (BETWEEN 60 AND 2880)` trong `vc_dispatch_policy` (khuôn chính sách có ngày hiệu lực, ADR-0049 D2), **gieo 720** (= 12 giờ). Xuất bến chỉ hợp lệ khi `now ≥ planned_start − window` và chuyến `PLANNED`. Ngoài cửa sổ ⇒ mã giữ `NGOAI_CUA_SO_XUAT_BEN`, câu "Chuyến khởi hành lúc {HH:MM} ngày {D}, chưa tới giờ được xuất bến (được xuất bến từ {HH:MM} ngày {D′})". Hai lớp: trigger `vc_trip_departure_window` đọc dòng chính sách hiệu lực + `kiemXuatBen`. **Toàn quyền** đổi ở bảng điều khiển chính sách điều phối (route hiện có, ô `settings.ops`). **Không có đường phá lệ** (lời chủ 3/10). Viết lại câu "xuất bến sớm tối hôm trước" của ADR-0053 D7.2 thành "xuất bến trong cửa sổ": `trongNgayChay` giữ nguyên nghĩa.
   - Trang ghép: bảng `vc_dispatch_policy` (thêm cột), `vc_trip_event` (trigger mới), quyền `settings.ops` (không đổi ô), cổng `POST …/xuat-ben` (thêm hai lý do giữ), giao diện: chip "Đạt hết" đổi nghĩa (thêm hai điều kiện).

### Lượt B (2 quyết định)
4. **ADR-0097 (dự kiến) — Sự kiện điều chỉnh có lý do cho chuyến** (Kiểu A, HT-03 hoàn tác, HT-04, HT-06): không UPDATE lùi trạng thái; **ghi thêm**: sự kiện `CORRECTION` (lý do danh mục `vc_reason` nhóm `DIEU_CHINH`: "Bấm nhầm", "Khách đổi ý tại điểm", "Khác" + ô ghi chú bắt buộc khi "Khác") làm **đóng suất cũ** `close_reason = CORRECTED` và **mở suất mới** `WAITING` cùng chặng; `DEPARTURE_REVOKED` đưa chuyến `RUNNING → PLANNED` chỉ khi **chưa có sự kiện tiến độ nào** sau xuất bến và trong `proxy_backdate_max_minutes`; chỉ **văn phòng** (`trip.progress` không ngữ cảnh), tài xế không có nút — tài xế thấy "Vừa ghi … Sai? Báo văn phòng". Nhật ký trước→sau. Sửa LC-07 (thêm hai cạnh có điều kiện), LC-05 (bản chụp giữ nguyên, thêm bản chụp mới khi xuất bến lại), chỉ mục một-chuyến-đang-chạy (không đổi). Ghi rõ **lý do giữ chứng cứ**: không xoá, không ghi đè. Trang ghép: `vc_trip`, `vc_trip_allocation`, `vc_trip_event`, `vc_reason`; ô quyền `trip.progress`; cổng route mới `POST …/dieu-chinh`, `POST …/thu-hoi-xuat-ben`. *(Văn bản soạn 3/10: `…/B1-…` — **không** gỡ HT-06, xem ghi chú trạng thái đầu §2.)*
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

| V1.6 | **HT-05** (xếp 3/10): lô "Sửa chuyến" đổi đồng thời xe + tài xế giữa xe công ty ↔ xe nhà xe luôn 409 — đưa câu đóng dòng tài xế cũ lên **trước** câu cập nhật xe / chủ xe, câu mở tài xế mới giữ sau; không sửa migration | `src/modules/van-chuyen/` (lô sửa chuyến) | bài lô + `thu-tu-lo.test.ts`: đổi cả hai chiều công ty ↔ nhà xe → 200 (hôm nay 409) | e2e `dieu-phoi` ca đổi xe + tài xế một lệnh; 🔍 đọc lại thứ tự lô (bài `thu-tu-lo.test.ts` ràng thứ tự này) |
| V1.7 | **HT-08** (xếp 3/10): màn tài xế / chi tiết chuyến dự phóng khoảng nghỉ theo **giờ hiện tại** khi chuyến sắp chạy, hiện "được xuất bến từ HH:MM"; câu từ chối `NGHI_THIEU` nêu giờ đủ nghỉ ("chờ tới HH:MM, hoặc Quản trị phá lệ khoảng nghỉ" — không đổi ai được phá lệ) | `src/shared/dieu-phoi-kiem.ts`, `src/shared/ly-do-giu.ts` (câu), `web/cuoc-chuyen.ts` | `dieu-phoi-kiem.test.ts`: chuyến trước kết thúc muộn → chip không "Đạt hết", có giờ được xuất bến | Kịch bản Chrome màn tài xế |

**Cổng V1:** `npm run typecheck` 0 lỗi; `npm test` xanh; `npm run test:e2e -- dieu-phoi tai-xe-cuoc` xanh; kịch bản Chrome lưu `docs/evidence/2026-10-0x-kiem-theo-vai-v1/`; 🔍 báo cáo ĐẠT cho V1.2; cập nhật `docs/CHANGE-GUIDE.md` công thức z3 (thứ tự điểm) và `SYSTEM-DESIGN.md` §9.

---

## 4. Đợt V2 — VP-01 sổ tiền (🤖 + 🔍; gộp vào Đợt 2 (b); hạn 31/10)

**Điều kiện:** V0 lượt A đã duyệt; Đợt 1 (đơn huỷ) đã gộp `main` hoặc nhánh V2 tách sau khi Đợt 1 gộp (cùng vùng `billing`). Ghi "xây trên lỗ đang hở: TNV-G4, TNV-VP01, F-03" (và F-02 tới khi mục F-02 được xoá khỏi `docs/quyen-hoan.json` — cùng danh sách ở trang ghép lượt A).

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
| V2.8 | **BH-06 (ADR-0099):** ô `payment.receive` của Bán hàng `own` → `ownOrAssigned`; bài "tập con quyền", tài liệu vai & quyền sinh tự động cập nhật cùng commit | `src/shared/permissions.ts:103` | route test Bán hàng phụ trách ghi lần thu → 201 (hôm nay 403) |

**Cổng V2:** 🔍 đọc mã + chạy lại `lo-ghi`, `migrations-billing`, `audit-invariants`, e2e `so-tien`; mỗi hàng rào mới có dòng `SO-HANG-RAO` với ngày thấy chặn thật; đóng `TNV-VP01` (và phần KT04 của TNV-G4) trong `quyen-hoan.json`; `docs/SYSTEM-DESIGN.md` §6 luồng tiền cập nhật.

---

## 5. Đợt V3 — Luật lõi chuyến (ADR-0096, ADR-0097; 🤖 + 🔍)

**Điều kiện:** V0 lượt A (0096) và lượt B (0097) đã duyệt; V1 đã gộp (cùng vùng). Hai phần có thể là hai phiên.

### V3-A (ADR-0096): chặn "trả trước đón" và cửa sổ xuất bến
| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V3.1 | Mã giữ `TRA_TRUOC_DON`, `NGOAI_CUA_SO_XUAT_BEN` vào `MA_GIU`; `kiemXuatBen` thêm hai kiểm; `canhBao` của V1.2 nâng thành giữ | `src/shared/ly-do-giu.ts`, `src/shared/dieu-phoi-kiem.ts:324-426` | `dieu-phoi-kiem.test.ts`: suất `seq(xuống) < seq(lên)` → giữ; xuất bến 13 giờ trước giờ dự kiến → giữ; 11 giờ → không giữ |
| V3.2 | *(Theo ADR-0096 nháp 3/10: cột thêm có `DEFAULT 720` — khuôn `0071`; hai trigger đặt trên cạnh `PLANNED → RUNNING` của `vc_trip`, không trên `vc_trip_event`; nhánh "không tìm được chính sách ⇒ chặn" có bài riêng. Chữ cũ dưới giữ để đối chiếu.)* **Migration `0077_cua_so_xuat_ben.sql` (dự kiến):** cột `departure_window_minutes` (CHECK 60–2880) trên `vc_dispatch_policy`, gieo dòng hiệu lực mới 720; trigger `vc_trip_departure_window` và `vc_trip_departure_stop_order` trên `vc_trip_event` (sự kiện xuất bến) | `migrations/0077_*.sql`, `data-dictionary.json` | `migrations-van-chuyen.test.ts`: chèn sự kiện xuất bến ngoài cửa sổ → RAISE; trả trước đón → RAISE; gỡ trigger thì qua |
| V3.3 | Bảng điều khiển chính sách điều phối (Toàn quyền, `settings.ops`): ô "Cửa sổ xuất bến (giờ)" ghi dòng chính sách mới | `src/modules/van-chuyen/index.ts:636-…`, `web/chinh-sach-dieu-phoi.ts` | route test: Quản trị → 403; Toàn quyền → 201 dòng mới; e2e `chinh-sach-dieu-phoi.mjs` |
| V3.4 | Màn tài xế/văn phòng: chip "Đạt hết" và lý do giữ hiện hai điều kiện mới; câu "được xuất bến từ {giờ} ngày {D′}" | `web/cuoc-chuyen.ts`, `web/chuyen.ts`, `src/shared/ly-do-giu.ts` câu chữ | kịch bản Chrome |

### V3-B (ADR-0097): sự kiện điều chỉnh có lý do
| # | Việc | Tệp | Test đỏ trước |
|---|---|---|---|
| V3.5 | *(Theo ADR-0097 nháp 3/10: khuyến nghị **không** thêm giá trị `close_reason` (trigger không nới được `CHECK`; dựng lại bảng rủi ro) — đóng `REMOVED` + sự kiện `CORRECTION` + cột `corrects_allocation_id`.)* **Migration `0078_dieu_chinh_chuyen.sql` (dự kiến):** nhóm lý do `DIEU_CHINH` trong `vc_reason`; `close_reason` thêm `CORRECTED`; LC-07 thêm cạnh `RUNNING → PLANNED` **chỉ** khi lô có sự kiện `DEPARTURE_REVOKED` mang dấu lệnh hiện hành và không có sự kiện tiến độ sau xuất bến; LC-06 không đổi | `migrations/0078_*.sql` | `migrations-van-chuyen.test.ts`: UPDATE lùi không có sự kiện → RAISE; có sự kiện hợp lệ → qua; đã có "Đã tới" sau xuất bến → RAISE |
| V3.6 | *(Theo ADR-0097 nháp 3/10: suất mới mở ở **trạng thái đúng** theo bảng điều chỉnh được phép, không luôn `WAITING`; đóng trước chèn sau; chạy bước "điểm tự xong"; dòng bản chốt `added_after_departure = 1`.)* Lệnh `lenhDieuChinhSuat` (đóng suất `CORRECTED` + mở suất `WAITING` cùng chặng + sự kiện `CORRECTION` + nhật ký trước→sau) và `lenhThuHoiXuatBen` (`DEPARTURE_REVOKED`), chỉ văn phòng (`trip.progress` không ngữ cảnh), trong `proxy_backdate_max_minutes`; MỘT `db.batch` theo thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái (bài `thu-tu-lo.test.ts`) | `src/modules/van-chuyen/dieu-phoi-tien-do.ts`, `dieu-phoi.ts`, `index.ts` route mới | route test: tài xế → 403; văn phòng → 201; quá kẹp → 409; e2e `van-chuyen.mjs` ca "xuất bến nhầm → thu hồi → xuất bến chuyến đúng" (HT-03), "đã đón nhầm → điều chỉnh → khách vắng" (HT-04/HT-06 theo mô tả đầy đủ khi có) |
| V3.7 | Giao diện văn phòng: nút "Điều chỉnh…" trên suất, "Thu hồi xuất bến" trên chuyến RUNNING chưa có tiến độ; màn tài xế: dòng "Vừa ghi … Sai? Báo văn phòng" (đã có từ V1.4) | `web/chuyen.ts` | kịch bản Chrome |
| V3.8 | Tin chuyến: `trip_corrected`, `trip_departure_revoked` vào `HANH_DONG_TIN_CHUYEN` → tài xế + điều phối (ghép với ma trận V5 nếu V5 đi trước) | `src/shared/tin-chuyen.ts` | `tin-chuyen.test.ts` |

**Lỗi kèm theo (xếp 3/10, §10):** V3-A thêm HT-02 và HT-16 ("Đã tới" / "Đã trả" ở điểm trả trước điểm đón — ADR-0096 Đ1.4), VP-17 (kiểm chéo các ô chính sách điều phối, cùng route với ô cửa sổ xuất bến), HT-09 (tách đoàn, sau khi chủ trả lời `BL-TACH-DOAN`).

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
| V4.6 | **BH-08 (ADR-0100):** luật giá ADR-0027 Đ2 (giá danh mục, giảm = 0) áp cho người có quyền Thực tập ở lập / sửa / xác nhận; form lập đơn khoá ô giá như Đối tác | `src/modules/orders/index.ts:185-186, :999-1000`, `price-guards.ts`, `web/order-form.ts` | route test Thực tập giảm giá → 403 (hôm nay 201) |
| V4.7 | **ADR-0098 Đ7 (Danh bạ):** tạo hồ sơ mới trùng SĐT → 409 kèm danh sách; thêm / sửa SĐT trùng trên hồ sơ có sẵn → cảnh báo "Vẫn lưu" có nhật ký; Đ3b ẩn tên hồ sơ với người không có `party.view` | `src/modules/parties/`, `web/parties.ts`, `orders/repository.ts`, `web/order.ts` | route test Danh bạ 409; route test Đối tác `GET /api/orders/:id` không có `bookerName` |

**Cổng V4:** 🔍 (dữ liệu + quyền: kiểm Đối tác không đọc được chi tiết hồ sơ qua đường mới — route test 403 giữ nguyên); e2e `orders`, `booker`, `nhap-tay-va-gia-doi-tac`; `audit-invariants` sau e2e.

---

## 7. Đợt V5 — Tin tới đúng người (gộp vào Đợt 4; 🤖 soạn ma trận → 👤 duyệt → 🤖 thi công)

1. **Ma trận sự kiện × vai** (`docs/superpowers/specs/2026-10-xx-ma-tran-su-kien-vai.md`): hàng = mọi hành động nhóm `order_*`, `trip_*`, `payment_*`, `ledger_*` trong `src/shared/audit-actions.ts`; cột = 10 quyền + "người lập" + "người phụ trách" + "tài xế bao mốc" + "CREW bao mốc"; ô = `chuông` / `hộp` / `làm mới` / `—` ; **ô `—` phải ghi "cố ý: …" hoặc mã nợ**. Đây là trang ghép kiểu mới (đề xuất 5.1 áp thử). Một lượt duyệt.
2. Thi công theo ma trận: `trip_passenger_cancelled_at_stop` → người lập/phụ trách + điều phối; `loaiCho` xét cả dòng **CREW** cho giờ/điểm hẹn (DTO tin **không** chứa tên khách — tách "được báo" khỏi "được xem"); tin tiền cho Kế toán (`payment_recorded`, `ledger_settlement`, `order_delivered`) vào hộp; thi công ADR-0062 (view `v_aud_order_change`, migration dự kiến `0079`); MQ-07 khi `order_leg_updated` ghi được chặng.
3. **Bài kiểm "vắng mặt"**: mọi hành động nhóm trên phải có hàng trong ma trận (đọc tệp ma trận, so với `AUDIT_ACTIONS`) — đỏ khi thêm hành động mà quên ma trận.

**Lỗi kèm theo (xếp 3/10, §10):** HT-10, HT-23, VP-11, HT-06 (phần tin MQ-07), HT-12, HT-11, BH-17, HT-20, HT-21, BH-18, BH-19 (phần báo người lập). Ma trận phải có hàng cho từng hành động liên quan các lỗi này.

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

## 9a. Đợt V8 — Việc nhỏ đợt sau (🤖; thêm 3/10 khi xếp 78 lỗi)

Nguyên tắc như V1: test đỏ trước, xanh sau; **không** đổi ô quyền, tiền, cấu trúc dữ liệu, migration (VP-02, VP-18, VP-21, VP-26 chạm màn / luật kiểm của **tài khoản** nhưng không đổi ai được làm gì — người kiểm độc lập đọc lại; VP-23 chạm giấy tờ của người ⇒ thêm ca vào `src/giay-to-khong-lo-so.test.ts` theo CLAUDE.md §10); câu chữ tiếng Việt có dấu, gọi hệ thống là "Nền tảng". Lỗi nào khi làm hoá ra chạm luật / hợp đồng giữa các phần thì dừng, chuyển thành câu hỏi chủ (CLAUDE.md §3). Mỗi lỗi một bài (thuần hoặc kịch bản Chrome) ghi ở bảng §10.

- **Câu báo đúng tình huống:** HT-17 (tiêu đề lỗi xe đang có lịch bận), VP-23 (cảnh báo CCCD đã hết hạn khi thêm; câu 403 xem giấy tờ), VP-26 (câu gộp hồ sơ vào hồ sơ nhân viên không quản lý được), BH-25 (lỗi đồng bộ Sheet không hiện cho Bán hàng kèm hướng dẫn chỉ quản trị làm được), VP-02 (khoá nút "Tạo tài khoản" từ cú bấm đầu; phát lại của `web/api.ts` không xoá màn đang hiện PIN).
- **Trang theo quyền:** BH-27, VP-15 (mở trang không có quyền bằng đường dẫn thì chặn trước khi dựng), BH-26 (nhãn vai), VP-12 (Trang chủ Kế toán không hiện ô không hợp vai), BH-10 phần "bấm ô ra danh sách đã lọc" (phần nhãn phạm vi ở V1.5c).
- **Bố cục khổ 390 / 1280:** BH-12, BH-22, VP-14, HT-19, VP-25.
- **Chữ và nhãn:** BH-13 ("ngày đi" khi đơn không đưa đón), BH-24 ("app" → "Nền tảng", một kiểu ghi phiên bản), BH-28 (lưu nháp không tự bật hộp xác nhận), HT-18 (bản chụp xuất bến ghi loại giấy tờ, ghi đã phá lệ khoảng nghỉ — chỉ phần hiển thị; nội dung bản chụp đã ghi không sửa).
- **Riêng tư:** BH-20 (Góp ý / Báo lỗi che dãy số dài trước khi lưu và gửi email trích đoạn, khuôn `maskLongDigits`) — chạm dữ liệu cá nhân ⇒ có 🔍 người kiểm độc lập.
- **Tiện ích:** VP-18 (tên tài khoản dùng cùng luật tên người `validatePersonFullName`), VP-21 (tìm / lọc / sắp danh sách tài khoản).

---

## 10. Bảng truy vết: lỗi → đợt → bằng chứng "đã hết"

> **Bản đầy đủ** (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md`, commit `230f097f`) đã vào kho; bảng dưới xếp **đủ 78 lỗi** (xếp ngày 3/10, đợt V0). Cột "Đợt": **V…** = đợt của lộ trình này; **Đợt n** = đợt của lộ trình 2/10 (`2026-10-02-khac-phuc-audit-00-lo-trinh.md`); **VC-05** = kế hoạch 05 "xe đang chạy" của lộ trình Vận chuyển 1/10. **BL-…** = mã nợ ở `docs/BACKLOG.md` §21: phần đó **chờ chủ quyết**, chưa thi công được cho tới khi chủ trả lời. Mức là mức sau kiểm độc lập (NT = nghiêm trọng, TB = trung bình, ÍT = ít nghiêm trọng).

| # | Mã | Mức | Đợt | Bài đỏ → xanh / kịch bản chứng minh "đã hết" |
|---:|---|---|---|---|
| 1 | VP-01 | NT | V0-A, V2 | `lo-ghi.test.ts` hai ca thứ tự → 409, sổ = 0; `migrations-billing.test.ts` trigger tất toán lần hai; `audit-invariants.test.ts` R-BIL-13; e2e `so-tien` nhánh ngược |
| 2 | HT-24 | TB | V1.1 — **V1.1 ✅ thi công 3/10** (`9d57f418`) | `tien-do-man.test.ts` chuyến `RUNNING` xuất bến hôm qua → nhóm Hôm nay; Chrome `cuoc-qua-nua-dem-smoke.mjs` — V1 xanh: `tien-do-man.test.ts` ca HT-24; Chrome `docs/evidence/2026-10-03-kiem-theo-vai-v1/kich-ban/v1-smoke.mjs` bước 3 |
| 3 | HT-03 | TB | V1.3 (hộp + cảnh báo ngày), V3-A (cửa sổ, ADR-0096), V3-B (thu hồi, ADR-0097) — **V1.3 ✅ thi công 3/10** (`59782d3a`) | hàm thuần hộp xác nhận; `dieu-phoi-kiem.test.ts` 13 giờ trước → giữ; trigger LC-20; route thu hồi; e2e `van-chuyen` "xuất bến nhầm → thu hồi" — V1 xanh: `xac-nhan-xuat-ben.test.ts`; Chrome `v1-smoke.mjs` bước 1–2 |
| 4 | HT-01 | TB | V1.2 (tự sắp), V3-A (chặn + nút đổi thứ tự chuyến kế hoạch) — **V1.2 ✅ thi công 3/10** (`29be5435 — 🔍 kiểm độc lập ĐẠT`) | `dieu-phoi-route.test.ts` hai chặng cùng nơi trả → đón, đón, trả; `dieu-phoi-kiem.test.ts` `TRA_TRUOC_DON`; trigger LC-19; e2e `dieu-phoi` — V1 xanh: `thu-tu-diem.test.ts`, `dieu-phoi-route.test.ts`, `dieu-phoi-lich-chung.test.ts` ca `TRA_TRUOC_DON` |
| 5 | BH-08 | TB | V4.6 (ADR-0100 accepted 3/10: luật giá ADR-0027 Đ2 áp cho Thực tập; cùng vùng `orders`) | route test Thực tập giá dưới danh mục / giảm giá > 0 → 403 ở lập, sửa, xác nhận; e2e `nhap-tay-va-gia-doi-tac` ca Thực tập |
| 6 | VP-05 | TB | Đợt 2 (ADR-0092 đ6 ô mã giao dịch) + Đợt 4b (chọn người thu, ô ghi chú ở màn Kế toán) | route test ô mã giao dịch được miễn luật 8 chữ số; Chrome form "Ghi lần thu" vai Kế toán |
| 7 | VP-03 | TB | Đợt 4 (R9: lệnh mang phiên bản đã thấy) | route test `PATCH /api/staff/:id` với giá trị cũ đã thấy lệch → 409; Chrome hai tab sửa cùng tài khoản |
| 8 | BH-19 | TB | V5 (báo người lập khi nháp bị người nhận sửa) + chính sách "Nhận đơn nháp": `BL-NHAN-NHAP` | `thong-bao.test.ts` ca nháp bị sửa → người lập có tin; phần chính sách: chờ chủ |
| 9 | BH-02 | TB | V4 (ADR-0098 Đ4) | `orders/rules.test.ts` 19 chữ số → 400, `"0912 345 678"` → chuẩn; số nước ngoài theo Q-98-2 / `BL-SDT-QT` |
| 10 | BH-07 | TB | Đợt cũ: ADR-0063 (proposed, lượt duyệt 2a — giữ chỗ ở `docs/adr/README.md`) | route test sửa số khách sau xác nhận theo ADR-0063 D1 (khi duyệt) |
| 11 | BH-06 | TB | V2.8 (ADR-0099 accepted 3/10: ô `payment.receive` Bán hàng → `ownOrAssigned`; cùng vùng sổ giữ hộ) | route test Bán hàng phụ trách ghi lần thu → 201, người không phụ trách → 403; sổ có dòng giữ hộ trên người ghi |
| 12 | HT-05 | TB | V1.6 | bài lô + `thu-tu-lo.test.ts` đổi xe + tài xế công ty ↔ nhà xe → 200 |
| 13 | HT-04 | TB | V3-B (ADR-0097 Đ2) | route điều chỉnh: tài xế 403, văn phòng 201; e2e "đã đón nhầm → điều chỉnh thành vắng"; trigger LC-15 ngoại lệ `CORRECTION` |
| 14 | HT-02 | TB | V3-A (ADR-0096 Đ1.4) | route "Đã tới" điểm trả khi còn khách chờ lên ở điểm đón trước → 409 |
| 15 | HT-08 | TB | V1.7 | `dieu-phoi-kiem.test.ts` chip không "Đạt hết" khi chưa đủ nghỉ theo giờ hiện tại, có giờ được xuất bến |
| 16 | HT-06 | TB | V5 (tin MQ-07 tới tài xế) + V3-A (ADR-0096 Đ3 LC-21, chủ quyết 3/10 "chặn") | `tin-chuyen.test.ts` MQ-07; `dieu-phoi-kiem.test.ts` giờ hẹn 06:30 trên chuyến 07:00 → giữ `GIO_HEN_TRUOC_KHOI_HANH` |
| 17 | HT-10 | TB | V5 (`trip_passenger_cancelled_at_stop` vào ma trận) | `tin-chuyen.test.ts` khách huỷ tại điểm → người lập / phụ trách có tin, không tên / SĐT; bài "vắng mặt" của ma trận |
| 18 | HT-13 | TB | Đợt 4 (ADR-0062 báo văn phòng khi HDV đổi số khách) + quyền HDV nhập tên: `BL-HDV-TEN` | e2e `thongbao` HDV tăng số khách → người lập có tin; câu 403 nói đúng "nhờ văn phòng" |
| 19 | HT-09 | TB | V3-A (cùng vùng xếp) sau khi chủ quyết: `BL-TACH-DOAN` | `dieu-phoi-kiem.test.ts` tách đoàn giữ thứ tự nhập; Chrome ô chọn người khi tách |
| 20 | VP-02 | TB | V8 | Chrome bấm đúp "Tạo tài khoản" → một tài khoản, PIN còn trên màn |
| 21 | VP-04 | TB | Đợt 2 (lệnh nộp / trả để vết theo từng đơn) + ghi số tiền vào nhật ký: `BL-NK-TIEN` | `lo-ghi.test.ts` nộp phân bổ hai đơn → mỗi đơn có dòng lịch sử |
| 22 | BH-04 | TB | V8 sau khi chủ quyết lưu tạm form trên máy: `BL-NHAP-MAY` | Chrome "bị đăng xuất giữa lúc lập đơn → đăng nhập lại → khôi phục" |
| 23 | HT-23 | TB | V5 (cột CREW của ma trận, `BL-CREW-TIN`) | `tin-chuyen.test.ts` HDV đi kèm nhận tin giờ / điểm hẹn, DTO không tên khách |
| 24 | VP-10 | TB | Đợt 4b (màn sổ Kế toán: lọc theo tiền, ngày thu, tổng, xuất bảng tính) | Chrome màn sổ Kế toán (theo bản vẽ) |
| 25 | VP-11 | TB | V5 (`BL-TIEN-KT`) | `thong-bao.test.ts` "Công ty thu – CK" chờ xác nhận → Kế toán có tin |
| 26 | VP-09 | TB | V8 sau khi chủ duyệt thêm ngày đón vào dữ liệu tóm tắt đơn: `BL-NGAY-DON-CHANG` | hàm thuần dựng nhãn ngày đón khi khác ngày đi; Chrome danh sách đơn |
| 27 | BH-03 | TB | Đợt 7 (tìm đơn không dấu, SĐT chuẩn hoá) | `orders` test tìm "nguyen" ra "Nguyễn", "0912 345 678" ra đơn |
| 28 | VP-07 | ÍT | V6 (`R-CAT-1` warn gồm cả ghi đè giá) + `BL-GIA-SHEET` | `audit-invariants.test.ts` giá đổi > 50 % → 1 cảnh báo |
| 29 | BH-05 | ÍT | V4 (ADR-0098) | `orders` service test Đối tác tạo đơn SĐT đã có → không hồ sơ mới; R-PTY-7 |
| 30 | VP-08 | ÍT | V6 (`R-PTY-8` warn) + `BL-MST-UNIQUE` | `audit-invariants.test.ts` hai tổ chức cùng MST → 1 cảnh báo |
| 31 | VP-06 | ÍT | V1.5 (ngày có năm) + cận dưới ngày thu theo khoá kỳ ADR-0080 (đã duyệt, lượt 2 sổ tiền) — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | `vn-date.test.ts` ca khác năm; bài khoá kỳ khi thi công ADR-0080 — V1 xanh: `vn-date.test.ts`, `src/ngay-mot-ham.test.ts` (phần ngày có năm) |
| 32 | BH-09 | ÍT | không thi công — chủ chọn giữ như hôm nay tới ADR-0018 giai đoạn 2 (`BL-QUYEN-BH09`) | — (hành vi hiện tại đúng ADR-0014 điều 6) |
| 33 | HT-14 | ÍT | VC-05 (cứu hộ ADR-0052 D5c, lộ trình Vận chuyển 1/10) | e2e cứu hộ: kết thúc gián đoạn có khách trên xe → chặng ghi "đang trên xe gián đoạn CX-…" |
| 34 | HT-07 | ÍT | chờ chủ (chủ ý của bản 1.39): `BL-TEN-TRUOC-XB` | — (kịch bản Chrome đang ghim hành vi cũ; đổi khi chủ quyết) |
| 35 | HT-12 | ÍT | V5 (nhãn "Ai xử lý" chỉ người làm được) | `tin-chuyen.test.ts` / hàm nhãn: HDV phụ trách không được gán việc họ không bấm được |
| 36 | HT-11 | ÍT | V5 | `thong-bao.test.ts` người vừa được giao nhận "… giao đơn X cho bạn" |
| 37 | BH-17 | ÍT | V5 | `thong-bao.test.ts` người được chọn phụ trách lúc lập đơn nhận tin "giao cho bạn" |
| 38 | BH-10 | ÍT | V1.5c (nhãn phạm vi) + V8 (bấm ô ra danh sách đã lọc) — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | hàm thuần nhãn ô Trang chủ; Chrome bấm từng ô — V1 xanh: `src/shared/pham-vi-so.test.ts`; Chrome `v1-smoke.mjs` bước 6 (phần nhãn phạm vi) |
| 39 | BH-01 | ÍT | Đợt 7 (cùng hàm tìm không dấu) | test hàm tìm dịch vụ "tour dao" ra "Tour Đảo" |
| 40 | BH-20 | ÍT | V8 (riêng tư, 🔍) | `feedback` test nội dung có 10 chữ số → lưu và email đã che |
| 41 | BH-21 | ÍT | V4 (ADR-0098: SĐT trùng hồ sơ nhân viên cũng dùng lại) | `orders` service test "thông tin của tôi" → `booker_party_id` = hồ sơ nhân viên, không hồ sơ mới |
| 42 | VP-22 | ÍT | V4 (ADR-0098 Đ7.2 — sửa SĐT trên cái đã có ⇒ cảnh báo) | route test đổi SĐT đăng nhập sang số của hồ sơ khác → cảnh báo, "Vẫn lưu" có nhật ký |
| 43 | VP-16 | ÍT | V6 (`R-LOC-1` warn: hai địa điểm đang dùng cùng tên chuẩn hoá) | `audit-invariants.test.ts` hai địa điểm trùng tên → 1 cảnh báo |
| 44 | VP-17 | ÍT | V3-A (cùng route chính sách với ADR-0096 Đ2.3: kiểm chéo các ô chính sách) | `chinh-sach.test.ts` giờ lái / ngày < lái liên tục → 400 |
| 45 | VP-18 | ÍT | V8 | `accounts` route test tên "A" / chỉ emoji → 400 |
| 46 | VP-19 | ÍT | V4 (ADR-0098 Đ7.1 — hồ sơ người mới trùng số ⇒ dùng hồ sơ có sẵn) | route test Nhân sự tạo tài khoản với SĐT khớp hồ sơ khách → dùng lại, không hồ sơ thứ hai |
| 47 | VP-23 | ÍT | V8 | route test CCCD hết hạn → 201 kèm cảnh báo; câu 403 đúng vai |
| 48 | HT-16 | ÍT | V3-A (cùng chỗ với HT-02) | route "Đã trả" khách chưa đón → câu "Khách chưa lên xe — bấm Đã đón trước" |
| 49 | HT-17 | ÍT | V8 | test câu lỗi tạo chuyến khi xe có lịch bận nêu "lịch bận" |
| 50 | HT-20 | ÍT | V5 | `tin-chuyen.test.ts` chỉ phá lệ khoảng nghỉ → không tin "vừa sửa chuyến" |
| 51 | HT-21 | ÍT | V5 | `thong-bao.test.ts` HDV không nhận tin đơn mở ra "Không tìm thấy" (tách "được báo" khỏi "được xem") |
| 52 | BH-14 | ÍT | Đợt 7 (câu báo đúng lý do) | test câu khi chỉ xem đơn người khác: không nói "thay đổi" |
| 53 | BH-15 | ÍT | Đợt 7 | test câu khi Thực tập nhận đơn mình lập |
| 54 | BH-16 | ÍT | Đợt 7 | test câu sửa đơn đã huỷ nói "đã huỷ" |
| 55 | VP-20 | ÍT | Đợt 3 (đăng nhập tài khoản ngưng, D4) — câu chữ phải cân lộ thông tin "số này có tài khoản": hỏi chủ trong đặc tả Đợt 3 | `auth` test tài khoản ngưng → câu theo quyết định của chủ |
| 56 | VP-26 | ÍT | V8 | route test gộp → câu nói đúng "hồ sơ nhân viên … không gộp được" |
| 57 | BH-25 | ÍT | V8 | Chrome Bán hàng không thấy lỗi đồng bộ kèm hướng dẫn quản trị |
| 58 | BH-18 | ÍT | V5 | `thong-bao.test.ts` không sinh tin trùng cho cùng một sự kiện |
| 59 | VP-13 | ÍT | V1.5a — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | Chrome 1280 + 390: nút "Hỗ trợ" không giao số tiền / nút — V1 xanh: `src/thanh-hanh-dong-cuoi.test.ts`; Chrome `v1-smoke.mjs` bước 5 |
| 60 | BH-23 | ÍT | V1.5a — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | như trên — V1 xanh: `src/thanh-hanh-dong-cuoi.test.ts`; Chrome `v1-smoke.mjs` bước 5 |
| 61 | HT-22 | ÍT | V1.5a — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | Chrome 390 cuộn cuối `/cuoc-chuyen` — V1 xanh: `src/thanh-hanh-dong-cuoi.test.ts`; Chrome `v1-smoke.mjs` bước 5 |
| 62 | BH-12 | ÍT | V8 | Chrome 390 thẻ đơn hiện số khách |
| 63 | BH-22 | ÍT | V8 | Chrome 390 `scrollWidth ≤ 390` ở bộ lọc đơn |
| 64 | VP-14 | ÍT | V8 | Chrome 390 Nhật ký không kéo ngang |
| 65 | HT-19 | ÍT | V8 | Chrome 1280 bảng điều phối có dấu hiệu cuộn; tiêu đề nhóm không lặp "NHÀ XE" |
| 66 | VP-25 | ÍT | V8 | hàm thuần định dạng tiền viết tắt một đơn vị |
| 67 | VP-24 | ÍT | chờ chủ (biên nhận gửi khách là hợp đồng `ReceiptDto` danh sách trắng, ADR-0026): `BL-BIEN-NHAN-LAN-THU` | — |
| 68 | HT-18 | ÍT | V8 (chỉ phần hiển thị) | Chrome bản chụp xuất bến ghi loại giấy tờ |
| 69 | HT-15 | ÍT | chờ chủ (phạm vi ngày tài xế xem, ADR-0049 D3): `BL-CUOC-XA` | — |
| 70 | BH-11 | ÍT | Đợt 7 (câu báo đúng lý do / đúng người) | test câu "Đang giữ đơn" chỉ hiện cho đơn có việc của HDV |
| 71 | BH-13 | ÍT | V8 | test nhãn ngày khi đơn "Không đưa đón" |
| 72 | BH-24 | ÍT | V8 (+ V1.5b hàm ngày) — **V1.5 ✅ thi công 3/10** (`b95b15f4`) | bài quét chữ "app" trong chuỗi giao diện; `vn-date.test.ts` — V1 xanh: `src/ngay-mot-ham.test.ts` (phần định dạng ngày) |
| 73 | BH-26 | ÍT | V8 | hàm thuần nhãn vai |
| 74 | BH-27 | ÍT | V8 | Chrome Thực tập mở `/catalog` → trang chặn, không nút quản trị |
| 75 | BH-28 | ÍT | V8 | Chrome lưu nháp không bật hộp xác nhận |
| 76 | VP-12 | ÍT | V8 | Chrome Trang chủ Kế toán không có ô "Doanh thu của tôi", "Cần xác nhận đơn" |
| 77 | VP-15 | ÍT | V8 | Chrome Quản trị mở `/audit` → chặn trước khi dựng |
| 78 | VP-21 | ÍT | V8 | Chrome ô tìm / lọc / sắp danh sách tài khoản |

**Tiến độ V1** (gộp từ `main` 3/10, phiên thi công khác — PR #16/#17): V1.1–V1.5 đã thi công (commit `9d57f418`, `29be5435`, `59782d3a`, `66f7a6f6`, `b95b15f4`), kịch bản Chrome `docs/evidence/2026-10-03-kiem-theo-vai-v1/`; V1.4 (Kiểu A — hộp xác nhận "Đã trả" cả điểm, "Kết thúc chuyến") không có dòng lỗi riêng ở bảng (bài `xac-nhan-tien-do.test.ts`, Chrome `v1-smoke.mjs` bước 4, 4c). V1.6 (HT-05), V1.7 (HT-08) xếp thêm 3/10 **chưa** làm.

**Đếm** (sau lời chủ 3/10; số dòng có mặt đợt đó, một lỗi có thể ở hai đợt): đếm lại bằng lệnh `awk` trên bảng khi lập kế hoạch từng đợt. Không còn lỗi **chưa xếp**; BH-09 "không thi công" theo lời chủ. Dòng còn phần **chờ chủ** (mã BL): BH-19, HT-13, HT-09, VP-04, BH-04, VP-09, HT-07, VP-24, HT-15 (+ BL-SDT-QT, BL-MST-UNIQUE, BL-GIA-SHEET là nợ có đợt).

Kiểu lặp lại của bản tóm tắt (A–D) nay được phủ qua từng dòng trên: A → HT-03, HT-04, HT-02 (V1.3–1.4, V3); B → HT-10, HT-23, VP-11, HT-06 (V5); C → BH-02, BH-05, VP-08, VP-07 (V4, V6); D → BH-10, VP-09, BH-23, VP-13, HT-22 (V1.5, V8).

### 10.1. Ba câu quyền (đã trả lời 3/10: BH-06 phương án A ⇒ ADR-0099; BH-08 phương án A ⇒ ADR-0100; BH-09 phương án A — giữ như hôm nay)

Lời thường, mỗi phương án một dòng; khuyến nghị là của người soạn, không phải quyết định.

**BH-06 (`BL-QUYEN-BH06`) — Nhân viên Bán hàng đang phụ trách đơn của đồng nghiệp có được ghi tiền khách đưa không?** (Hôm nay: xác nhận đơn được, ghi tiền thì bị chặn; HDV phụ trách lại ghi được.)
- (A) **Cho ghi** — giống HDV phụ trách: khách đưa tiền cho ai thì người đó ghi, sổ tự ghi "người đó đang giữ tiền của công ty". Được: khớp thực tế quầy. Mất: thêm một người cầm tiền phải theo dõi. — **khuyến nghị**
- (B) **Giữ như hôm nay** — chỉ người lập đơn (và Kế toán) ghi; người phụ trách nhờ người lập hoặc Kế toán ghi hộ. Được: ít người đụng tiền. Mất: chậm, dễ quên ghi.
- (C) Cho ghi nhưng **chỉ "Công ty thu – chuyển khoản"**, tiền mặt vẫn phải qua người lập. Được: không thêm người giữ tiền mặt. Mất: luật khó nhớ.

**BH-08 (`BL-QUYEN-BH08`) — Thực tập có bị giới hạn giá và giảm giá không?** (Hôm nay: Thực tập đặt giá tuỳ ý, giảm tuỳ ý rồi tự xác nhận — giống hệt Bán hàng; Đối tác thì bị khoá giá danh mục, không giảm.)
- (A) **Thực tập như Đối tác** — chỉ giá danh mục, không giảm giá; muốn khác giá thì nhờ Bán hàng. Được: chặn lỗ ngay, việc nhỏ. Mất: Thực tập kém linh hoạt. — **khuyến nghị**
- (B) **Thực tập được giảm nhưng có trần** (ví dụ tối đa 10 %), giá dưới danh mục thì bị chặn. Được: vẫn linh hoạt. Mất: phải chốt con số trần, cần thêm một ô chính sách.
- (C) **Đơn của Thực tập phải có người khác xác nhận** (Bán hàng / Quản trị bấm), giá tự do. Được: có người duyệt mọi đơn. Mất: chậm, tốn người.
- Ghi chú: người kiểm lưu ý Bán hàng cũng tự đặt giá như vậy; nếu muốn siết **mọi vai nội bộ** thì là câu khác (BACKLOG §15 câu 11 — trần giảm giá nhân viên).

**BH-09 (`BL-QUYEN-BH09`) — Đối tác có còn được tự xác nhận đơn mình lập không?** (Hôm nay được — đúng ADR-0014 điều 6; đích ADR-0018 giai đoạn 2 là "Đối tác không bao giờ là người nhận", chưa làm.)
- (A) **Giữ như hôm nay** tới khi làm ADR-0018 giai đoạn 2 (Đối tác đã bị khoá giá danh mục, không giảm, mốc 6 giờ). Được: không đổi gì, không chậm khách. Mất: đơn đối tác không có người của Tour Đảo nhìn qua trước khi chốt. — **khuyến nghị**
- (B) **Làm ngay phần này của ADR-0018:** đơn Đối tác ở "Chờ xác nhận" tới khi người nội bộ nhận và xác nhận. Được: luôn có người Tour Đảo chịu trách nhiệm đơn. Mất: khách đối tác chờ lâu hơn; cần đặc tả + ADR riêng.
- (C) Cho tự xác nhận nhưng **báo ngay Quản trị** mỗi đơn Đối tác vừa xác nhận. Được: có người biết mà không chặn. Mất: thêm tin báo.

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
- ~~**ADR-0092 chưa duyệt** ⇒ V2 không được bắt đầu~~ — **đã duyệt 3/10** (ADR-0088, ADR-0092 accepted). V2 nay chỉ còn chờ Đợt 1 (đơn huỷ) gộp `main` (cùng vùng `billing`). Nếu tới 20/10 V2 chưa bắt đầu được, báo chủ để gia hạn `TNV-VP01` có lý do.
- **Cùng vùng mã:** V1 ∥ Đợt 1 được (van-chuyen/web vs orders/billing); V3 sau V1; V4 sau Đợt 1; V2 sau Đợt 1. Không hai phiên cùng sửa `van-chuyen` hay `billing` cùng lúc.
- **Số dư âm đã có trên production (demo):** đo trước V2 bằng câu SELECT ở mục 4; dọn bằng route đảo, không SQL tay.
- ~~**Bản đầy đủ 78 lỗi chưa có trong kho**~~ — **đã có** (`BAO-CAO-LOI-DAY-DU.md`, commit `230f097f`); đợt V0 (3/10) đã xếp đủ 78 lỗi ở §10. Còn: 13 dòng có phần chờ chủ (mã BL ở `docs/BACKLOG.md` §21).

---

## 13. Cần chủ dự án (để bắt đầu)

1. **Duyệt lộ trình này** (hoặc sửa thứ tự/ưu tiên).
2. **Duyệt V0 lượt A** khi phiên soạn trình: mục `TNV-VP01`, diff ADR-0092, ADR-0096.
3. **Duyệt V0 lượt B:** ADR-0097, ADR-0098.
4. **Quyết mục 5 của báo cáo** (ba luật quy trình) để mở V7.
5. ~~Bổ sung bản đầy đủ 78 lỗi vào kho~~ — đã có (3/10). Thay bằng: **trả lời ba câu quyền §10.1** (BH-06, BH-08, BH-09) và các câu còn mã BL ở §10.
6. **Chạy câu SELECT chỉ đọc** ở mục 4 trước V2 và dán kết quả vào sổ thi công V2.
7. (V6) Trả lời lại câu MST có thành khoá duy nhất không.
