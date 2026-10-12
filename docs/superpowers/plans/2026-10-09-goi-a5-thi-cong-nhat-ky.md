# Gói A5 — chuyển khách giữa hai xe: nhật ký thi công (2026-10-08 → 2026-10-09)

Hồ sơ có ngày. Kế hoạch: `2026-10-08-giai-doan-3-a5-ke-hoach.md`; quyết định: ADR-0111 (áp ADR-0052 D4, D5c); lời chủ lượt 8d-1, 8d-2 và phán quyết điều phối: `2026-10-08-van-chuyen-goi-a-c-thi-cong-nhat-ky.md` (không chép lại ở đây). Nhánh `a5-chuyen-khach`, CHƯA gộp, CHƯA kiểm độc lập (T19).

## Commit theo task

| Task | Commit | Việc |
|---|---|---|
| T0 | `ea30d2db` | Bảng sự kiện: bảy dòng A5 (chưa có mã) |
| T2, T12 | `85b58ea6` | Migration `0093` + bài CSDL + sổ dữ liệu + hai cột chính sách (máy chủ + màn Chính sách điều phối) |
| T3 | `987298c6`, `41f1e5dc` | Luật thuần `kiemChuyen` (11 điều kiện, hết giờ, nơi gặp, tự huỷ, kế hoạch điểm); mười tình huống chạy bằng máy |
| T4 + T7a | `a53cf076` | Ô `trip.transfer` (N1) + GET xe nhận |
| T5 | `9d161c10` | Câu SQL: cổng, đề nghị, dòng kiểm, suất, điểm, bản chốt |
| T7b, T8 (lát 2) | `d486dcaf` | Gửi, rút, văn phòng gửi thay cứu hộ, tin xe nhận, Đ5 ở máy chủ |
| T7c, T8 (lát 3) | `c2167062` | Nhận, Không nhận, hết hạn, leo thang, xác nhận, Duyệt, Bác (N2), danh sách văn phòng |
| T9, T9b, T9c | `cedd6026`, `cff244ef`, `54885937` | Tự huỷ MQ-09 trong lô mọi lệnh G-A5-13; R-VC-SUA-1 (c) khớp trigger thu hồi mới |
| T11 | `ee7386b8` | R-VC-26…30, N3 cho R-VC-16, giấy tờ không lọt qua dòng kiểm |
| T13, T14 | `ff6fa7f2` | Màn tài xế; Chi tiết chuyến; màn `/de-nghi`; route văn phòng `GET /chuyen/:id/xe-nhan` |
| T18 | `adfb27b2` | e2e `tests/e2e/chuyen-khach.mjs` |
| T15 | `9110cb66` | Trợ giúp ba vai |
| T16 | (commit này) | Tài liệu, sổ hàng rào, nhật ký thay đổi 1.85, hai ca CSDL siết thêm |

## Nới có tên (Điều 9.4) — trạng thái

- **N1** đã làm (T4): ghim hàng `DRIVER` thêm `trip.transfer: assigned`.
- **N2** đã làm (lát 3): `lop-vuot.test.ts` NT-3(b) ngoại lệ đúng hai route Duyệt / Bác; câu đỏ trước khi khai: `chuỗi ô vượt luật ngoài biểu thức đổi lớp + [ 'index.ts:1351', 'index.ts:1373' ]`.
- **N3** đã làm (T11): R-VC-16 miễn suất mở bằng đề nghị `ONBOARD` tại đúng địa điểm nơi gặp.
- **N4** CHƯA làm: chờ A4 gộp (ghim `DRIVER_PARTNER` `trip.transfer = assigned`). Danh sách xe nhận hôm nay chỉ tài xế công ty.
- **N5** CHƯA đo: R-VC-17 báo giả hay không — xem kết quả `audit-invariants --strict` cuối e2e đủ bộ.

## Lệch kế hoạch (ADR thắng hoặc chặt hơn — ghi lại, không hỏi)

- Văn phòng gửi `STOP` → 403 (ADR-0052 :248; kế hoạch NT-A5-15 ghi 400). Route văn phòng trả 200 (không 201).
- **Sửa 12/10 theo phiếu kiểm độc lập (VỪA-1): 404 → 403 cho khớp ADR.** Bốn route tài xế gửi / rút / nhận / không nhận trước đây mở cổng bằng `trip.view` rồi trả 404 cho Bán hàng, Kế toán, Quản trị; ADR-0052:218, :248 và tệp vàng TH08-4A/4B ghi 403 ("không có ô `trip.transfer`"). Nay cổng đầu là `can(trip.transfer, { assigned: true })` → 403; có ô mà không lái chuyến (kể cả Toàn quyền, TH08-4C) vẫn 404.
- Rút / Nhận / Không nhận muộn → 200 `HET_HAN` ghi `EXPIRED` (thay 409); đề nghị đã tự huỷ → 409 `da_huy`; khách đổi từ lúc gửi → 409 `ck_khach_doi`; Duyệt bị chặn → 409 `luat_loi_khong_duyet` (theo tệp vàng).
- R-VC-28 phủ cả `MAY` lẫn `NGUOI` (kế hoạch: `NGUOI`). R-VC-30 không xét "tập khách đổi khi điểm còn Chờ" (máy chủ chặn lúc quyết).
- Móc tự huỷ ngoài danh sách hàm của kế hoạch: `loCapNhatDiem` khi xe nhờ đang chạy (đường "bỏ qua điểm nguồn" thật); tự huỷ theo suất phủ cả `ONBOARD` của chuyến có suất.
- Route mới ngoài kế hoạch: `GET /chuyen/:id/xe-nhan` (văn phòng gửi thay cần danh sách xe nhận; route của tài xế đòi lái xe). Hai phản hồi danh sách kèm `lyDo` (route danh mục lý do chỉ cho Quản trị).
- Giao diện: Rút chỉ khi Chờ (bản vẽ có ở Chờ duyệt — máy chủ trả 409 `da_leo_thang`); nhãn tầng "Bắt buộc" / "Cấu hình" (bản vẽ "Luật lõi"). Mục menu và tiêu đề màn "Đề nghị chuyển khách" (kế hoạch T15 gọi "[[Đề nghị cần duyệt]]").
- Bốn hàng rào của mục 4 kế hoạch chưa có ca đỏ riêng (mã luật lạ qua khoá ngoại, Leo thang → Hết hạn): thêm ca 9/10, thấy đỏ (sổ hàng rào).

## Câu hỏi cho chủ (không chặn phần đã làm)

1. Đổi tài xế hoặc xe của xe NHẬN (khi chưa chạy) có cần tự huỷ đề nghị đang chờ tới xe đó không? Hôm nay: không huỷ; lúc tài xế mới bấm Nhận, máy kiểm lại 11 điều kiện với tài xế / xe mới.
2. Lý do Không nhận thứ tư ghi "Khác" (luật mỗi nhóm đúng một "Khác") thay "Lý do khác" như tệp tình huống — giữ "Khác"?
3. Duyệt nhãn chữ mới (danh sách trong báo cáo cuối của người thi công).

## Chưa kiểm

- Trần `db.batch` của lô xác nhận trên D1 production (N = 16, 45 chỉ đo trên D1 giả / local).
- Chưa đột biến kịch bản e2e; chưa thử iPhone thật; kiểm độc lập (T19) chưa làm.

## Sửa theo phiếu kiểm độc lập (2026-10-12): đạt có điều kiện

| Mục | Việc | Commit / nơi ghi |
|---|---|---|
| VỪA-1 | Cổng đầu bốn route tài xế đổi `trip.view` → `trip.transfer` (404 → 403 cho văn phòng; Toàn quyền không lái vẫn 404); bài chạm route thật so thẳng tệp vàng TH08 | `660fb24d` |
| VỪA-2 | Móc khung thử `w.chenTruocLo`; ba bài ép thua cổng cho nhánh thử lại của Nhận / Duyệt | `b8c65e28` |
| VỪA-3 | Bài trần lô xác nhận N = 100 (công thức 19 + D + R + 3N, ≤ 900 câu) | `df83f7b7` |
| THẤP-1 | Xoá khoá cam kết chuyến NGUỒN (ADR-0111 Đ2) không làm: nguồn luôn đang chạy; ghi lệch cho chủ ở `docs/SYSTEM-DESIGN.md` §16 | `8b6569db` |
| THẤP-2 | Sổ hàng rào: đường dẫn `lop-vuot.test.ts`, ngày quan sát theo lịch commit, bằng chứng độc lập M1–M15 | commit kế tiếp |
| THẤP-3, -4 | Lý do ngưng dùng hiện "Lý do khác" (không lộ mã); `tenDiem` qua `tenNoi` (hai lớp che); nơi gặp che số ở DTO | `8b6569db` |

**Nợ mới (chưa có bài):** ba ca NT-A5-20 còn lại — Nhận đúng lúc xe nhờ bấm "Đã tới"; văn phòng thêm điểm đúng lúc xe nhận Nhận; hai đề nghị cùng làm xe nhận vượt chỗ. Nay chỉ có luật thuần và cổng version của lô.

**Câu hỏi thêm cho chủ (người kiểm bổ sung):** đề nghị đã LEO THANG rồi mới đổi tài xế xe nhận — Duyệt vẫn qua vì `ck_nguoi_nhan` chỉ chạy ở cạnh rời PENDING (`0093`), nên khách sang xe của người chưa từng đồng ý. Không sai tiền / dữ liệu; khuyến nghị giữ như hiện tại; không sửa mã.

**Chữ giao diện chờ chủ duyệt (chưa đổi):** nhãn tầng "Cấu hình" (màn Đang chạy) khó hiểu với người văn phòng — đề xuất chữ thường hơn, giữ "Bắt buộc"; nhóm lý do "Không nhận chuyển điểm" dùng chung cho Không nhận, Bác và cứu hộ; nhãn "Khác" thay "Lý do khác".
