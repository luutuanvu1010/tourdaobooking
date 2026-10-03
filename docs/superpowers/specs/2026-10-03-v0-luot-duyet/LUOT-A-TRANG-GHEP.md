# Lượt duyệt V0-A — trang ghép (CLAUDE.md §9)

> Ba quyết định trình chủ cùng lượt (lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2, lượt A):
> - **A1** — mục `TNV-VP01` trong sổ dừng dây chuyền: `A1-quyen-hoan-TNV-VP01.diff`.
> - **A2** — ADR-0092 nháp thêm **Đ2b** ("một dòng giữ hộ chỉ tất toán một lần"), sửa **Đ4**: `A2-adr-0092-bo-sung-D2b.diff` (vá vào `docs/superpowers/specs/2026-10-02-luot-duyet-2-sua-sai-sau-da-giao-va-so-khong-doi-dau.md`, bản 3.3 → 3.4).
> - **A3** — ADR-0096 nháp "Luật thứ tự điểm dừng và cửa sổ xuất bến": `A3-ADR-0096-thu-tu-diem-dung-va-cua-so-xuat-ben.md`.
>
> **Đếm quyết định chạm quyền/dữ liệu (trần 3) — cách đếm ghi rõ để chủ rà:** đếm theo **luật con chạm bảng CSDL hoặc ô quyền**. A1 không chạm bảng hay ô quyền (chỉ thêm một hạn vào sổ dừng dây chuyền) ⇒ 0; A2 (Đ2b + sửa Đ4, cùng một luật "một dòng giữ hộ tất toán một lần") ⇒ 1; A3 hai luật con LC-19, LC-20 ⇒ 2. Tổng 3 ⇒ đúng trần. Nếu chủ coi A1 là một quyết định thì lượt A là 4: khi đó tách A1 sang duyệt riêng (A1 không phụ thuộc A2, A3). Câu hỏi HT-06 ("giờ hẹn sớm hơn giờ xuất bến có thành lý do giữ") **không** vào lượt này: nếu chủ chọn "có", phần bổ sung ADR-0096 được soạn và duyệt ở lượt sau.
>
> **Xây trên lỗ đang hở:** A2 chạm `billing` ⇒ "xây trên lỗ đang hở: TNV-G4, TNV-VP01, F-03" (và F-02 cho tới khi mục F-02 được xoá khỏi `docs/quyen-hoan.json` — cùng danh sách ở lộ trình §4). A3 không chạm vùng đang hở.
>
> Mục (4) "cặp lệnh trên cùng đối tượng" là **áp thử** đề xuất 5.1 của `NGUYEN-NHAN-GOC.md` (chưa thành luật — V7.1 của lộ trình).

## (1) Bảng nào chứa loại thực thể nào

| Bảng | Thực thể chứa | Quyết định chạm | Đổi gì |
|---|---|---|---|
| `bil_debt_line` | dòng nợ hai chân: giữ hộ (`HELD`), dòng đảo giữ hộ ("Công ty đã nhận"), quyết toán (`SETTLEMENT`: nộp / trả / bù trừ), điều chỉnh, dòng gắn chuyến (ADR-0057) | A2 | thêm ràng buộc: dòng đảo `HELD` và dòng quyết toán gốc không làm số dư cặp (bên, công ty) trên đơn đổi dấu; hai đường tất toán một dòng `HELD` loại trừ nhau (trigger + máy chủ). Không thêm cột, không đổi kiểu dòng |
| `bil_payment_receipt` | lần thu khách, trả lại khách, dòng đảo lần thu | A2 (đọc) | không đổi; lần thu "Công ty thu – CK" là nguồn sinh dòng `HELD` |
| `bil_posting` | phiếu sổ (DELIVERED, ADJUSTMENT, quyết toán …) | A2 (đọc) | không đổi |
| `vc_dispatch_policy` | chính sách điều phối có ngày hiệu lực, chỉ-thêm (mốc 6 giờ, nghỉ, kẹp khai lùi, giờ lái …) | A3 Đ2 | + cột `departure_window_minutes` (60–2880, mặc định 720) |
| `vc_trip` | chuyến xe (kế hoạch → đang chạy → kết thúc / gián đoạn / huỷ) | A3 Đ1, Đ2 | + hai trigger trên cạnh `PLANNED → RUNNING` (`vc_trip_departure_stop_order`, `vc_trip_departure_window`) |
| `vc_trip_stop` | điểm dừng (đón / trả), `seq` | A3 Đ1 | đổi `seq` điểm `PENDING` khi xếp (tự sắp) và khi văn phòng đổi thứ tự chuyến kế hoạch (route mới) |
| `vc_trip_allocation` | suất: khách (`PASSENGER`) và người đi kèm (`CREW`), điểm lên / xuống cố định | A3 Đ1 (đọc) | không đổi; là đối tượng của luật "đón trước trả" (chỉ suất mở `WAITING`) |
| `vc_trip_event` | sự kiện chuyến chỉ-thêm (`DEPARTED`, `STOPS_REORDERED`, `STOP_ARRIVED` …) | A3 | thêm sự kiện `STOPS_REORDERED` cho chuyến kế hoạch (cùng loại sẵn có) |
| `docs/quyen-hoan.json` (không phải bảng CSDL) | sổ dừng dây chuyền | A1 | + mục `TNV-VP01` |

## (2) Dòng bản đồ quyền chạm các bảng trên (`src/shared/permissions.ts`)

Thứ tự cột: Bán hàng, Kế toán, Quản trị, HDV, Đối tác, Toàn quyền, Thực tập, Tài xế, Tài xế đối tác, Nhân sự.

| Ô | Dòng | Ai | Lượt A đổi gì |
|---|---|---|---|
| `ledger.write` | `:114` | Kế toán, Toàn quyền | **không đổi ô**; hai lệnh của ô này ("Công ty đã nhận", "Nộp") nay loại trừ nhau trên một dòng `HELD` (A2) |
| `ledger.view` | — | `any` / `own` | không đổi; "Sổ của tôi" của người khai không còn ra số âm do VP-01 |
| `payment.receive` | — | các vai lập lần thu | không đổi; lần thu "Công ty thu – CK" vẫn sinh dòng `HELD` (ADR-0026 đ4) |
| `settings.ops` | `:141` | **chỉ Toàn quyền** | không đổi ô; thêm một ô nhập "Cửa sổ xuất bến (giờ)" trên route sẵn có (A3 Đ2) |
| `trip.dispatch` | `:170` | Bán hàng, Quản trị, Toàn quyền | không đổi ô; **thêm việc**: đổi thứ tự điểm của chuyến **kế hoạch** (route mới, A3 Đ1.3b) |
| `trip.progress` | `:175` | Bán hàng, Quản trị, Toàn quyền (văn phòng, không ngữ cảnh); Tài xế `assigned` | không đổi ô; lệnh Xuất bến / Đã tới / Đổi thứ tự (đang chạy) nhận thêm luật chặn |
| `trip.override` | `:171` | Quản trị, Toàn quyền | **không** dùng: hai luật mới không phá lệ được (không vào `MA_LUAT_PHA_LE`) |
| `trip.view` | `:169` | văn phòng 4 vai; Tài xế `assigned` | không đổi; hai lý do giữ mới hiện cho mọi người đang xem được chuyến |

Không thêm mã quyền, không đổi giá trị ô nào.

## (3) Cổng nào canh cửa nào — gồm chỗ giao diện ẩn/hiện

| Cửa | Hôm nay | Sau lượt A |
|---|---|---|
| `POST /api/ledger/company-receipts/:id/confirm` ("Công ty đã nhận", `ledger.write`) | chỉ đòi dòng `HELD` chưa bị đảo (`service.ts:331-355`) | + người khai còn nợ trên đơn ≥ số dòng `HELD`; không thì 409 "Khoản này đã được ghi nộp — …" (máy chủ + trigger) |
| `POST /api/ledger/settlements` chiều `nop` (`ledger.write`) | không so số đang giữ (`service.ts:361-397`) | ≤ số bên đó đang nợ trên đơn (ADR-0092 đ2); sau "Công ty đã nhận" thì phần đã tất toán không nộp được nữa |
| **Hai cổng trên canh cùng một dòng `HELD`** | độc lập | loại trừ (A2 Đ2b) |
| Nút "Xác nhận đã nhận" (`web/order.ts:524-532`) | hiện theo `choXacNhan` (dòng `HELD` chưa đảo) | `choXacNhan` lọc theo điều kiện số dư của Đ2b ⇒ ẩn với khoản đã nộp |
| Nút "Đã nộp về công ty" (`web/order.ts:553-563`) | hiện theo `dangGiu` | không đổi điều kiện hiện; số gửi đi trừ phần chuyển khoản chờ xác nhận (V2.6 của lộ trình) |
| `POST /api/van-chuyen/cuoc-cua-toi/:id/xuat-ben` (tài xế, `trip.progress` `assigned`) và `POST /api/van-chuyen/chuyen/:id/xuat-ben` (văn phòng bấm thay) | `kiemXuatBen` + trigger LC-05 | + giữ `TRA_TRUOC_DON`, `NGOAI_CUA_SO_XUAT_BEN` (máy chủ) + hai trigger trên `vc_trip` |
| `POST …/cuoc-cua-toi/:id/thu-tu` và `POST …/chuyen/:id/thu-tu` (đổi thứ tự khi đang chạy) | chỉ đòi điểm `PENDING`, `seq` không trùng | + 409 khi làm suất `WAITING` bị "trả trước đón" (máy chủ; CSDL: bất biến `R-VC-THU-TU`) |
| **Route mới** đổi thứ tự chuyến kế hoạch (cổng `office`, `can(trip.dispatch)`, qua lớp vé ADR-0094) | không có (nút ↑↓ chỉ khi đang chạy) | có; cùng luật 409 |
| Lệnh xếp / dời / cập nhật điểm (`POST /api/van-chuyen/chuyen` …`/phan-bo`, `/doi`, `/cap-nhat-diem`, `trip.dispatch`) | điểm mới `seq = max + 1`, không sắp | tự sắp lại điểm `PENDING` cho đúng luật trong cùng lô |
| `POST …/diem/:sid/da-toi` (tài xế + văn phòng) | không xét thứ tự | 409 ở điểm trả khi còn khách chờ lên có điểm xuống ở đó và điểm đón chưa tới (A3 Đ1.4) |
| `POST /api/van-chuyen/chinh-sach-dieu-phoi` (cổng `office` + `settings.ops`) | các ô chính sách hiện có | + `departureWindowMinutes` (bắt buộc, 60–2880) |
| **Chip "Đạt hết" / "N chưa đạt"** màn tài xế (`web/cuoc-chuyen.ts:268`), nút "Xuất bến" (`:275`, khoá khi còn thiếu) | đổi nghĩa: chỉ phản ánh các kiểm hiện có | "Đạt hết" nay gồm thêm hai điều kiện; trước giờ mở cửa sổ, chip hiện lý do kèm giờ được xuất bến; nút khoá |
| **Nút "Xuất bến thay tài xế"** màn văn phòng (`web/chuyen.ts:60-67`, khoá khi `lyDoGiu` không rỗng) | như trên | khoá thêm theo hai lý do mới |
| **Nút ↑/↓ đổi thứ tự** màn văn phòng (`web/chuyen.ts:281-300`) | chỉ dựng khi chuyến đang chạy | dựng cả khi chuyến kế hoạch (người có `trip.dispatch`) |
| **Ô "Cửa sổ xuất bến (giờ)"** màn chính sách (`web/chinh-sach-dieu-phoi.ts`, chặn theo `settings.ops` `:237`) | không có | có; chỉ Toàn quyền thấy |

## (4) Cặp lệnh trên cùng đối tượng: độc lập / loại trừ / có thứ tự

**Đối tượng: một dòng giữ hộ `HELD` (A2).**

| Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|
| "Công ty đã nhận" × "Đã nộp" | **loại trừ** — chỉ một đường tất toán một dòng `HELD` | máy chủ + trigger (Đ2b) |
| Ghi lần thu "Công ty thu – CK" × "Công ty đã nhận" | **có thứ tự** — lần thu sinh dòng `HELD` trước | sẵn có (cần dòng `HELD` chưa đảo) |
| "Công ty đã nhận" × "Công ty đã nhận" (lần hai) | **loại trừ** | sẵn có: UNIQUE `reverses_line_id` |
| "Đã nộp" × "Đã nộp" (lần hai, cùng khoản) | **loại trừ** theo số: lần hai vượt số đang nợ | Đ2 (≤ đang nợ) + lớp vé chống gửi lặp (ADR-0094) |
| "Đã nộp" × đảo lần nộp (`dao_dong`) × "Công ty đã nhận" | **có thứ tự** — đường sửa khi Kế toán đi nhầm "Nộp": đảo lần nộp trước, rồi mới xác nhận | Đ2b (câu 409 chỉ đúng đường này) |
| "Công ty đã nhận" (bấm nhầm) × sửa sai | **có thứ tự, đường riêng** — dòng đảo không đảo được (`service.ts:475`); khuyến nghị: điều chỉnh tăng nợ (ADR-0092 đ5b) rồi "Nộp" | Đ2b (khuyến nghị, chủ duyệt cùng A2) |
| Đảo lần thu (`dao_lan_thu`, sinh dòng đảo HELD) × "Đã nộp" | **loại trừ theo số dư** — đã nộp bù thì đảo lần thu làm số dư đổi dấu ⇒ 409; phải đảo lần nộp trước | Đ2b (mọi dòng đảo HELD chịu "không đổi dấu") + trigger |
| "Công ty đã nhận" × Hoàn thành đơn | **có thứ tự** — Hoàn thành chỉ khi không còn ai nợ công ty | sẵn có (`bil_posting_completed_settled`) |
| "Công ty đã nhận" × "Thay lần thu" (ADR-0088) | **chưa phân tích ở lượt này** (mã nợ `BL-THAY-CTY-NHAN`) — thuộc lượt duyệt 2a (ADR-0088), cùng tệp với ADR-0092; người soạn kế hoạch V2 phải điền ô này trước khi thi công | — |

**Đối tượng: một chuyến và các điểm, suất của nó (A3).**

| Cặp lệnh | Quan hệ | Ai canh |
|---|---|---|
| Xếp / dời / cập nhật điểm × Xuất bến | **có thứ tự** — xuất bến kiểm thứ tự cuối cùng | `kiemXuatBen` + trigger LC-19 |
| Đổi thứ tự (kế hoạch) × Xuất bến | **có thứ tự** | như trên; lô xuất bến kiểm `version` (cổng `TRIP_GATE`) nên đổi thứ tự xen giữa ⇒ 409 `stale` |
| Đổi thứ tự (tài xế) × Đổi thứ tự (văn phòng bấm thay), cùng lúc khi đang chạy | **loại trừ** theo phiên bản — người sau nhận 409 `stale` | sẵn có (`chayLo`) |
| Toàn quyền đổi cửa sổ × Xuất bến | **độc lập** — xuất bến dùng dòng chính sách hiệu lực tại giờ xuất bến | trigger LC-20 đọc dòng theo `departed_at` |
| Sửa giờ khởi hành × Xuất bến | **có thứ tự** — xuất bến không sớm hơn lần sửa kế hoạch cuối | sẵn có (`vc_trip_departed_after_plan`); cửa sổ tính theo giờ dự kiến **mới** |
| "Đã tới" điểm trả × "Đã đón" ở điểm đón của cùng suất | **có thứ tự** — đón trước | Đ1.4 (máy chủ) |
| Xuất bến chuyến A × Xuất bến chuyến B, cùng xe hoặc cùng tài xế | **loại trừ** | sẵn có (`vc_trip_one_running_vehicle`, `vc_trip_driver_one_running`) |
| Xuất bến × "Thu hồi xuất bến" | **có thứ tự** — thuộc ADR-0097, lượt duyệt V0-B | — |

## Loại cửa

- A1: hai chiều (sổ; xoá mục khi đóng).
- A2: luật và mã hai chiều; dòng sổ chỉ-thêm (một chiều về dữ liệu). Việc lớn (tiền) — người kiểm độc lập khi thi công (V2).
- A3: cột + trigger qua migration thêm, gỡ được bằng migration sau; con số cửa sổ hai chiều. Việc lớn (dữ liệu) — người kiểm độc lập khi thi công (V3-A).

## Chủ trả lời

Mỗi mục một chữ: **"Duyệt"** hoặc **"Sửa: …"**. Ví dụ: "A1 Duyệt, A2 Duyệt, A3 Sửa: cửa sổ tối đa 24 giờ". Chưa có chữ "Duyệt" thì A2, A3 giữ `proposed` và không thi công V2, V3-A.
