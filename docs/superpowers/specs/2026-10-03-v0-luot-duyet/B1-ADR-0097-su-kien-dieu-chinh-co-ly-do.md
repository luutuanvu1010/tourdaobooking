# ADR-0097 (nháp): Sự kiện điều chỉnh có lý do cho chuyến xe

- **Trạng thái:** **proposed** — AI soạn 2026-10-03 (đợt V0 của lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2.4), theo lời chủ chat 2026-10-03 câu 3 ("ok theo khuyến nghị làm 1-2-3") — nguyên văn ở `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §8. **Chờ chủ "Duyệt"** trong lượt duyệt V0-B (trang ghép: `LUOT-B-TRANG-GHEP.md` cùng thư mục). Khi được duyệt: chép sang `docs/adr/ADR-0097-su-kien-dieu-chinh-co-ly-do.md`, ghi dòng "thay câu" vào dòng trạng thái ADR cũ (không sửa thân).
- **Số:** 0097 (0095 lớn nhất trên mọi nhánh + 1 = 0096 cho ADR thứ tự điểm/cửa sổ xuất bến; 0097 kế tiếp), đo 2026-10-03.
- **Ngày:** 2026-10-03
- **Phạm vi:** module `van-chuyen` — `vc_trip`, `vc_trip_allocation`, `vc_trip_event`, `vc_reason`; trigger LC-07, LC-15; lệnh tiến độ `src/modules/van-chuyen/dieu-phoi-tien-do.ts`; tin chuyến `src/shared/tin-chuyen.ts`; màn chuyến của văn phòng (`web/chuyen.ts`), màn tài xế (`web/cuoc-chuyen.ts`).
- **Gỡ lỗi:** HT-03 phần "gỡ" (xuất bến nhầm không thu hồi được), HT-04 (bấm nhầm "Đã đón" / "Khách đã huỷ" không sửa được, kể cả văn phòng), Kiểu A "bấm nhầm không sửa được" — `docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md` mục 3, 13; NGUYEN-NHAN-GOC.md §3.3, §3.5.

## Lời chủ dự án

Chat 2026-10-03: *"3-ok theo khuyến nghị làm 1-2-3"*. Khuyến nghị được chọn (NGUYEN-NHAN-GOC.md §6 câu 3): *"HT-01 (sắp lại điểm, cảnh báo) → HT-03 hộp xác nhận + cảnh báo ngày → ADR 'sự kiện điều chỉnh có lý do' (gộp HT-03 hoàn tác, Kiểu A) → HT-04/HT-06 theo ADR đó."*

Tiền lệ chủ đã chọn: ADR-0051 Q-GB-2 — *"Bấm nhầm 'Đã gọi báo' … thì sửa thế nào? → **Chủ chọn (a) 'Có nút Bỏ đánh dấu'**"* (`ADR-0051:465`), với dòng đảo chỉ-thêm (`:126`). ADR-0040 `:35`: *"gia hạn = thêm dòng mới, không sửa đè. Sửa sai phải có lý do (danh sách đóng), nhật ký trước→sau."*

## Bối cảnh

- Luật lõi LC-04 / LC-07 (ADR-0049 `:126-128`, trigger `0042:438-459`): suất chỉ đi tiến; bước lùi duy nhất `NO_SHOW → BOARDED`; chuyến `PLANNED → RUNNING → ENDED | ENDED_INTERRUPTED`. Không có đường `BOARDED → WAITING`, `CANCELLED_AT_STOP → …`, `DROPPED → BOARDED`, `RUNNING → PLANNED`. LC-15 khoá kế hoạch chuyến đang chạy, chỉ trừ lô "Kết thúc gián đoạn" (`0042:525-554`).
- Lý do của chỉ-thêm (ADR-0049 `:93-96`): danh sách hành khách là chứng cứ. Lý do đó biện minh cho **không ghi đè**, không biện minh cho **không có đường sửa sai chỉ-thêm** (NGUYEN-NHAN-GOC.md §2 (iii)).
- Đường vòng hôm nay cho xuất bến nhầm là "Kết thúc gián đoạn" với lý do không đúng sự thật (`dieu-phoi-tien-do.ts:188-207`) ⇒ để lại **chứng cứ sai** và đóng băng chuyến (LC-06). Nút ở màn tài xế đều một chạm (`web/cuoc-chuyen.ts:122-189, 275-277`).

## Quyết định

### Đ1 — Không ghi đè; sửa sai bằng **sự kiện điều chỉnh chỉ-thêm**

Không có `UPDATE` lùi trạng thái nào. Mỗi lần sửa sai là **một lô** ghi thêm: sự kiện điều chỉnh + dòng mới; dòng cũ được **đóng** (không xoá, không sửa nội dung). Bản ghi sai còn nguyên để làm chứng cứ "đã ghi gì, ai sửa, vì sao".

### Đ2 — Điều chỉnh kết quả một suất (`CORRECTION`) — HT-04, Kiểu A

1. **Ai:** chỉ **văn phòng bấm thay** — người có ô `trip.progress` **không ngữ cảnh** (hôm nay: Bán hàng, Quản trị, Toàn quyền — `src/shared/permissions.ts:175`), cổng `office`. **Tài xế không có nút** (tài xế xem "Vừa ghi … — Sai? Báo văn phòng", V1.4 của lộ trình).
2. **Khi nào:** chuyến đang `RUNNING`. Chuyến đã kết thúc / gián đoạn / huỷ thì không sửa (LC-06 giữ nguyên — chứng cứ đã đóng).
3. **Làm gì (một lô, thứ tự cổng → nhật ký → câu có dấu lệnh → trạng thái — bài `thu-tu-lo.test.ts`):** đóng suất cũ với `close_reason = 'CORRECTED'` (giá trị mới) và **mở suất mới cùng chặng, cùng người, cùng điểm lên / xuống**, ở **trạng thái đúng**, cột mới `corrects_allocation_id` trỏ về suất cũ; ghi sự kiện `CORRECTION` (lý do, trạng thái trước → sau) và nhật ký `trip_allocation_corrected`.
4. **Bảng điều chỉnh được phép** (ngoài bảng này ⇒ 409 câu tiếng Việt):

   | Đã ghi (nhầm) | Sửa thành | Điều kiện |
   |---|---|---|
   | Đã đón (`BOARDED`) | Chưa xử lý (`WAITING`) | điểm lên chưa `DONE` |
   | Đã đón | Vắng (`NO_SHOW`) / Khách huỷ tại điểm (`CANCELLED_AT_STOP`) | — |
   | Khách huỷ tại điểm | Đã đón / Vắng | — |
   | Khách huỷ tại điểm / Vắng | Chưa xử lý | điểm lên chưa `DONE` |
   | Vắng | Khách huỷ tại điểm | — (Vắng → Đã đón đã có sẵn bằng nút "Đã đón") |
   | Đã trả (`DROPPED`) | Còn trên xe (`BOARDED`) | điểm xuống chưa `DONE` |

   Điều kiện "điểm chưa `DONE`" để kết quả mới **còn làm tiếp được** (không đẻ ra suất treo làm chuyến không kết thúc được — LC-16).
5. **Lý do bắt buộc, danh sách đóng:** nhóm mới `DIEU_CHINH` trong `vc_reason`: `DIEU_CHINH_BAM_NHAM` "Bấm nhầm", `DIEU_CHINH_KHACH_DOI_Y` "Khách đổi ý tại điểm", `DIEU_CHINH_KHAC` "Khác". **Không có ô chữ tự do** — theo lời chủ 2026-09-29 chọn *"Chưa làm"* ô ghi chú gõ tự do trong chuyến xe (`docs/BACKLOG.md` §5: chữ tự do có thể chứa tên/SĐT khách). *Lệch có chủ ý so với lộ trình §2.4* (lộ trình ghi "ô ghi chú bắt buộc khi 'Khác'"): lời chủ có trước và chưa được đổi, nên ADR theo lời chủ; "Khác" chọn được không kèm chữ, như lý do huỷ của ADR-0030.
6. **Phản hồi và nhật ký không kèm tên khách** (CLAUDE.md §10 bẫy Điều phối xe): "CX-…: một suất Đã đón → Vắng · Bấm nhầm · văn phòng bấm thay".

### Đ3 — Thu hồi xuất bến (`DEPARTURE_REVOKED`) — HT-03

1. **Ai:** như Đ2.1 (văn phòng, `trip.progress` không ngữ cảnh). Tài xế không có nút.
2. **Điều kiện (đủ cả ba):** chuyến `RUNNING`; **chưa có sự kiện tiến độ nào** sau lô xuất bến (không "Đã tới", không lệnh suất, không đổi thứ tự); giờ thu hồi ≤ giờ xuất bến + `proxy_backdate_max_minutes` của chính sách hiện hành (hôm nay 180 phút, `migrations/0041_chinh_sach_dieu_phoi.sql:23,32`). Quá điều kiện ⇒ 409 chỉ đường: chuyến đã có tiến độ thì sửa từng suất (Đ2) hoặc "Kết thúc gián đoạn" nếu xe thật sự không chạy tiếp.
3. **Làm gì (một lô):** sự kiện `DEPARTURE_REVOKED` (lý do nhóm `DIEU_CHINH`), nhật ký `trip_departure_revoked`, chuyển `RUNNING → PLANNED`, `departed_at` / `departed_ms` về `NULL` (CHECK của `vc_trip` đòi vậy ở `PLANNED`, `0042:50-56`).
4. **Giữ chứng cứ:** bản chụp lúc xuất bến (`vc_trip_departure_check`, `_item`, `vc_trip_manifest` — LC-05) và sự kiện `DEPARTED` **giữ nguyên**; xuất bến lại tạo bản chụp mới mang dấu lệnh mới. Trigger `vc_trip_departed_after_plan` (`0042:400-403`) tự buộc lần xuất bến sau muộn hơn sự kiện thu hồi.
5. **Hệ quả tự nhiên:** xe và tài xế được nhả khỏi chỉ mục "một chuyến đang chạy" (`0042:61`, `0042:383-389`); tên khách trên màn tài xế đóng lại nếu chưa tới ngày chạy (ADR-0053 D7.2, `trongNgayChay` giữ nguyên nghĩa).

### Đ4 — Trigger (lớp CSDL)

- **LC-07 chuyến** (`vc_trip_status_forward`, `0042:440-443`): thêm **một** cạnh `RUNNING → PLANNED`, **chỉ** khi sự kiện mang `last_cmd_id` của lô có loại `DEPARTURE_REVOKED` **và** không tồn tại sự kiện tiến độ nào của chuyến sau sự kiện `DEPARTED` cuối. Mọi `UPDATE` lùi khác vẫn `RAISE`.
- **LC-07 suất:** **không đổi** (không thêm cạnh lùi; sửa bằng đóng + mở mới).
- **LC-15** (`0042:529-538`): thêm ngoại lệ thứ hai cùng khuôn ngoại lệ "Kết thúc gián đoạn": chèn suất mới và đóng suất với `close_reason = 'CORRECTED'` được phép trên chuyến đang chạy **chỉ** khi sự kiện của `last_cmd_id` là `CORRECTION`; suất mới phải có `corrects_allocation_id` trỏ một suất vừa đóng `CORRECTED` cùng chặng, cùng người, cùng điểm lên/xuống.
- **LC-06** (đóng băng chuyến đã kết thúc): không đổi.
- Mỗi trigger mới có một lần quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên) và dòng `docs/SO-HANG-RAO.md` (Hiến pháp P16).

### Đ5 — Tin và nhật ký

- Hai hành động mới `trip_allocation_corrected`, `trip_departure_revoked` vào `src/shared/audit-actions.ts` và vào danh sách tin chuyến `HANH_DONG_TIN_CHUYEN` (`src/shared/tin-chuyen.ts:7`). Người nhận: **tài xế đang lái chuyến** (dòng lái mở) + người có `trip.dispatch` (khuôn tin "gián đoạn" `tin-chuyen.ts:38`). Tin không chứa tên / SĐT khách. Thêm vào danh sách đóng này là cửa một chiều của ADR-0052 (`:210`) ⇒ chính ADR này là văn bản cho phép.
- Người lập / phụ trách đơn **không** nhận tin điều chỉnh suất ở ADR này; việc báo người của đơn khi kết quả khách đổi thuộc ma trận sự kiện × vai (đợt V5 — mã nợ `BL-CREW-TIN`, `BL-TIEN-KT` cùng đợt).

## Bấm nhầm thì sao

(Mục áp thử theo đề xuất 5.3 của NGUYEN-NHAN-GOC.md.)
- **Điều chỉnh nhầm:** điều chỉnh tiếp một lần nữa (Đ2) — mỗi lần là một sự kiện có lý do; chuỗi `corrects_allocation_id` giữ toàn bộ lịch sử.
- **Thu hồi nhầm:** bấm Xuất bến lại (mọi kiểm xuất bến chạy lại, bản chụp mới).
- **Tài xế bấm nhầm:** báo văn phòng; văn phòng sửa bằng Đ2/Đ3. Hộp xác nhận trước các nút chốt của tài xế là V1.3–V1.4 (không cần ADR).

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ khi duyệt, không sửa thân)

| Văn bản | Câu cũ | Thay / bổ sung |
|---|---|---|
| ADR-0049 `:128` LC-07 | "Trạng thái chỉ đi tiến" | + ngoại lệ có điều kiện `RUNNING → PLANNED` qua `DEPARTURE_REVOKED` (Đ3); suất vẫn chỉ đi tiến, sửa bằng đóng + mở mới (Đ2) |
| ADR-0049 `:133` LC-15 | "Ngoại lệ duy nhất: lô 'Kết thúc gián đoạn'" | + ngoại lệ thứ hai: lô `CORRECTION` (Đ4) |
| ADR-0049 `:126` LC-04 | "chỉ đóng dòng, gắn tên, đổi trạng thái đi tiến" | không đổi chữ; Đ2 dùng đúng "đóng dòng" + chèn dòng mới |
| ADR-0049 `:93-96`, `:119` | "không ai phá lệ" | không đổi: điều chỉnh **không** là phá lệ — nó là luật lõi mới có điều kiện, cũng không ai vượt được |
| ADR-0052 D6.1 / `:210` (danh sách tin chuyến đóng) | 5 hành động | + `trip_allocation_corrected`, `trip_departure_revoked` (Đ5) |
| ADR-0049 nhóm lý do (`0041:108-132`) | 5 nhóm (+ `BAN_XE` của 0071) | + nhóm `DIEU_CHINH` (3 mã) |

## Cửa một chiều / hai chiều

- Cột `corrects_allocation_id`, giá trị `close_reason` `CORRECTED`, nhóm lý do mới, sửa trigger: migration thêm (dự kiến `0078_dieu_chinh_chuyen.sql`, số chốt lúc gộp). Sự kiện và dòng ghi theo lệnh mới là **chỉ-thêm** (một chiều về dữ liệu); luật gỡ được bằng migration sau (hai chiều).
- Thêm hành động vào danh sách tin chuyến đóng: một chiều theo ADR-0052 `:210`.
- `close_reason` có `CHECK` liệt kê (`0042:133`) ⇒ thêm giá trị mới cần dựng lại bảng hoặc trigger thay `CHECK` — người lập kế hoạch V3-B chọn cách theo `docs/CHANGE-GUIDE.md` (migration không sửa tệp cũ) và có người kiểm độc lập.

## Hệ quả

- Route mới (cổng `office`, `can(trip.progress)` không ngữ cảnh, đi qua lớp vé chống ghi trùng ADR-0094): `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/dieu-chinh`, `POST /api/van-chuyen/chuyen/:id/thu-hoi-xuat-ben`. Route test: tài xế → 403; văn phòng → 201; quá điều kiện → 409; lệnh lặp cùng vé → "đã ghi".
- e2e `van-chuyen.mjs`: "xuất bến nhầm → thu hồi → xuất bến chuyến đúng" (HT-03); "đã đón nhầm → điều chỉnh thành vắng" (HT-04); "khách huỷ nhầm → điều chỉnh thành đã đón → đã trả → kết thúc" (HT-04); `audit-invariants` sau e2e.
- Bất biến mới `R-VC-SUA-1` (lỗi): mọi suất `CORRECTED` có đúng một suất kế tiếp trỏ về nó (`corrects_allocation_id`) cùng chặng, cùng người, cùng điểm; mọi `DEPARTURE_REVOKED` đứng sau một `DEPARTED` và trước mọi sự kiện tiến độ của lần chạy đó.
- `docs/SYSTEM-DESIGN.md` §6 (máy trạng thái chuyến vẽ lại), `docs/CHANGE-GUIDE.md` công thức z3 + bẫy 53, `docs/DATA-DICTIONARY.md` cập nhật cùng lần thi công (đợt V3-B).
- **Không** gỡ HT-06 (giờ hẹn đổi sớm hơn giờ xuất bến): lỗi đó thuộc bộ lý do giữ chuyến và tin MQ-07, không phải sửa sai (xem bảng truy vết của lộ trình §10).
- Xây trên lỗ đang hở: không.
