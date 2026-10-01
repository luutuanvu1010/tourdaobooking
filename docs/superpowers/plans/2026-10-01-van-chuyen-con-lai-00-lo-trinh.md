# Vận chuyển — các hạng mục đã duyệt còn lại: LỘ TRÌNH (kế hoạch mẹ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each sub-plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thi công hết các quyết định Vận chuyển chủ đã duyệt mà mã chưa có, theo thứ tự phụ thuộc, mỗi đợt một bản phát hành chạy được.

**Architecture:** Mọi dữ liệu mới thuộc module `van-chuyen` (tiền tố `vc_`), trừ cột chết của `orders` ở Phần C. Luật lõi ở cả trigger lẫn máy chủ (khuôn ADR-0049). Mỗi đợt = máy chủ trước (đỏ→xanh, e2e), giao diện sau; màn mới chờ bản vẽ Claude Design của chủ.

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, giao diện thuần `web/*.ts` (dựng bằng `h()`), `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome.

**Spec:** bản rà `docs/superpowers/specs/2026-10-01-ra-soat-phan-he-van-chuyen.md`; quyết định: ADR-0052, ADR-0053, ADR-0055, ADR-0056, ADR-0057, ADR-0047 §6 (Phần C), ADR-0049, ADR-0040; trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`, `…-luot-duyet-b-kernel-tien.md`; lời chủ: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.

## Phạm vi

**Trong:**

| Đợt | Kế hoạch con | Nội dung | ADR |
|---|---|---|---|
| 1 | `…-01-viec-nho.md` | Mỗi loại giấy tờ xe một dòng hiện hành; văn phòng đổi thứ tự điểm khi xe chạy; gắn người đi kèm lúc xếp; màn ngưỡng nhắc hết hạn; sửa tài liệu cũ | 0056 VK3-B, 0049, 0040 |
| 2 | `…-02-tin-bao-chuyen.md` | Tin báo + Bảng tin khi chuyến đổi (xếp, dời, huỷ, đổi tài xế, xuất bến…) | 0052 D6 |
| 3 | `…-03-khung-ban-gio-lai.md` | Lịch xe vào xưởng (khung bận xe); cảnh báo giờ lái | 0055 VK2-A, VK2-B |
| 4 | `…-04-tien-xe-thue.md` | Bảng giá thuê theo nhà xe (T1); chi phí chuyến chụp lúc giao, thiếu giá không xuất bến (T2) | 0057 T1, T2 |
| 5 | `…-05-xe-dang-chay.md` | A-1: chuyển điểm giữa hai xe (D4); văn phòng thêm điểm / báo huỷ khi xe chạy, LC-15 mới (D5). A-1b: tài xế bổ sung tên (D5b); cứu hộ (D5c) | 0052 D4, D5, D5b, D5c |
| 6 | `…-06-tai-xe-doi-tac.md` | Tài xế đối tác dùng app (D7), Từ chối chuyến (D8), Báo bận (D9) | 0053 |
| 7 | `…-07-xe-rieng-so-cho.md` | Cam kết xe riêng / số chỗ tối thiểu trên chặng | 0056 VK3-A |
| 8 | `…-08-bo-duong-ghi-cu.md` | Bỏ đường ghi chặng kiểu cũ (ngừng ghi kép `pickup_*`, thân cũ bị từ chối) | 0047 §6 (Phần C) |

**Ngoài (không làm trong lộ trình này):**
- ADR-0063, 0064, 0065 (proposed, chưa duyệt).
- BACKLOG Q-B-* (việc nhỏ bảng điều phối), tài xế mất mạng tự gửi lại, ô ghi chú chuyến.
- Phiếu Giám đốc (bỏ mốc 6 giờ, Trưởng ca, giờ lái 10 giờ…): `docs/BACKLOG.md:116-124`.
- Đưa nợ nhà xe vào sổ công nợ (ADR-0057 T4, Q11–Q12 "hỏi lúc trình sổ công nợ").
- ADR-0006 nhiệm vụ theo dịch vụ / ô `task.progress` (hạn `docs/quyen-hoan.json` 2026-11-30): không phải chuyến xe — xem "Cần chủ".

## Thứ tự và phụ thuộc (đã kiểm 2026-10-01)

```
Đợt 1 ─┐ (không phụ thuộc)
Đợt 2 ─┤ (không phụ thuộc; D6 nối bằng hàm tiêm, ADR-0052 D6.3)
Đợt 3 ─┤ (sau ADR-0049 gộp main — đã gộp)          ──┐
Đợt 4: T1 → T2 (T3 ĐÃ CÓ: migrations/0045 cột trip_id)  ──┤
Đợt 5 A-1 (D4, D5) — không chờ tiền                     │
Đợt 5 A-1b (D5b, D5c) — SAU Đợt 4 T2 (ADR-0052:135)  ◄──┤
Đợt 6 (ADR-0053) — SAU Đợt 4 T2 (ADR-0053:129), SAU Đợt 3 VK2-A (D9 dùng chung bảng khung bận), SAU Đợt 5 A-1 (ô trip.transfer) VÀ A-1b (ô trip.passenger.add)
Đợt 8 lần A (bộ đếm thân cũ) — gộp vào Đợt 1 để đồng hồ chạy sớm; lần cắt sau cổng đếm
Đợt 7 VK3-A — sau ADR-0049 gộp main; giao diện chờ chủ vẽ hai ô + nhãn
Đợt 8 Phần C — CỔNG: production không còn nhận thân cũ pickupTime/pickupPlace (đo nhật ký) — xem kế hoạch con
```

- Tiền xe thuê (Đợt 4) **không** chờ khoá kỳ ADR-0080: ADR-0057 T2 chỉ chụp chi phí chuyến + bảng kê cho Kế toán; ghi nợ vào sổ là T4 (để sau). **Có điều kiện** (ADR-0080:61): nếu module khoá kỳ vào `main` TRƯỚC T2 thì migration T2 phải kèm trigger khoá kỳ — Đợt 4 Task 0 kiểm lại.
- **Sửa lời khuyên ngày 1/10:** "báo tài xế" (Đợt 2) làm được ngay; "tài xế đối tác dùng app" (Đợt 6) phải sau bảng giá + chi phí chuyến (Đợt 4).
- Đợt 1–3 chạy song song được (khác tệp chính); Đợt 4 song song Đợt 5 A-1.

## Điểm chạm chung giữa các đợt (đối chiếu 1/10 — kế hoạch DÙNG đã sửa theo kế hoạch SỞ HỮU)

| Tên dùng chung | Sở hữu | Dùng | Luật gộp |
|---|---|---|---|
| `vc_unavailability` (cột `start_ms/end_ms/start_at/end_at`, `subject`), trigger `vc_unavailability_driver_closed`, `kiemKhungBanMoi` + `KHUNG_XE_TOI_DA_NGAY`, `src/shared/khung-ban.ts`, `KiemTaoSuaChuyenVao.khungBan` | 03 | 06 | 03 trước; 06 mở rộng theo `subject`, không tạo hàm/hằng thứ hai |
| `ctx.baoThayDoiChuyen({ tripId, requestId })`, `src/shared/tin-chuyen.ts` (`HANH_DONG_TIN_CHUYEN`, `loaiCho`), bài ghim "chỉ Tài xế đối tác không nhận tin" | 02 | 05, 06 | 02 trước; sau nối thêm hành động; 06 sửa bài ghim trong task mở ô |
| Bài quét "mọi route lệnh chuyến gọi `baoThayDoiChuyen`" | 02 | 04 (ngoại lệ có tên `/chi-phi/`), 05, 06 | mỗi route mới gọi hàm tiêm hoặc vào danh sách ngoại lệ ngay trong task tạo route |
| `transport.cost.adjust`, `THIEU_GIA`, `keHoachChiPhiKhiDoi`, route `…/chi-phi/chup-lai`, `…/gia-thoa-thuan` | 04 | 05 A-1b, 06 | 04 T2 trước |
| `MA_GIU`, `MA_LUAT_PHA_LE` (`ly-do-giu.test.ts`), `ChuyenVao` (`thue`, `coNguonGia`) | 04 | 07 | 04 trước; 07 đo lại giá trị ghim |
| `KetQuaTaoSua = KetQuaKiem & { nhacGioLai }` | 03 | 06, 07 | 03 → 06 → 07 |
| `vc_dispatch_policy` + `INSERT_DISPATCH_POLICY` + `kiemChinhSachMoi` + bài "câu chèn ghi đủ cột" (`chinh-sach.test.ts`) | 03 | 05, 06 | 03 → 05 → 06, mỗi đợt dựng từ bản đã gộp, không viết bài trùng |
| Bài ghim nhóm lý do (`dieu-phoi-kieu.test.ts`) | 03 (8 nhóm) | 06 (10 nhóm) | 03 → 06 |
| `LOAI_SU_KIEN_CHUYEN`; `MAU` của `thu-tu-lo.test.ts` | 05 / chung | 04, 05, 06, 07 | nối thêm theo thứ tự 04 → 05 → 06 → 07 |

Không đợt nào DROP trigger trên `vc_trip` của đợt khác (tên không trùng). **Đợt 1–3 song song chỉ an toàn khi** mỗi đợt nhận việc từ `main` mới nhất và đợt gộp sau đo lại các dòng trên.

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| L1 | ADR-0052:282, ADR-0055:92 "sửa `0042`/`0041` tại chỗ hay migration mới" | **migration mới** | `0041`, `0042` đã áp remote (bản 1.38); CLAUDE.md §7 cấm sửa |
| L2 | Số migration, số phiên bản | **không ghi cứng**; lúc thi công = lớn nhất trong `migrations/` của `main` **và mọi nhánh chưa gộp** + 1 (`git ls-tree --name-only <nhánh> migrations/`); phiên bản = lớn nhất ở `origin/main` + 1 lúc gộp | nhiều phiên song song (bài học 1.53/1.57–1.63) |
| L3 | Mức chi tiết | Đợt 1–4: tới từng bước có mã. Đợt 5–8: mức **giao diện (interface)** — chữ ký hàm, bảng, route, test bắt buộc; người thi công đo lại mã thật lúc nhận vì các đợt trước sẽ đổi tệp | tránh mã giả viết trên nền chưa có |

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`PLANNED`, `ONBOARD`, `THIEU_GIA`…).
- Tiền = `INTEGER` VNĐ, chỉ tính ở máy chủ; không tin số tiền từ trình duyệt.
- Ngày dân sự giờ Việt Nam (`vnToday`); dấu thời gian ISO UTC, MỘT mốc giờ mỗi request (`toISOString()` của máy chủ).
- Không xoá cứng; bảng chỉ-thêm có dữ liệu; hiệu lực bằng `valid_from/to`.
- Migration chỉ thêm tệp mới, không sửa tệp đã áp remote; bảng/cột mới → `docs/data-dictionary.json` + `npm run dict`.
- Module chỉ import qua `index.ts`; đọc xuyên module qua view `v_<tiền tố>_*`; `orders` KHÔNG import `van-chuyen`/`dispatch` (nối bằng hàm tiêm `ctx.*`); `src/shared/` và `web/` không import `src/modules/`.
- Lệnh chuyến là MỘT `db.batch`: cổng → nhật ký → câu có dấu lệnh → trạng thái cuối (`src/modules/van-chuyen/thu-tu-lo.test.ts`); luật lõi ở cả trigger lẫn máy chủ.
- Mỗi ô `MATRIX` mới phải được một route máy chủ hỏi **trong cùng bản phát hành** (bài "mỗi ô được máy chủ hỏi"); thêm ô vào hàng ghim `DRIVER`/`DRIVER_PARTNER` = **nới bài ghim** ⇒ chỉ qua tệp đề xuất luật, chủ duyệt (Điều 9.4).
- Cổng/hàng rào mới (`THIEU_GIA`, LC-15 mới, trigger một-dòng-giấy-tờ…) phải có dòng ở `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Tên, năm sinh khách chỉ ở chi tiết chuyến văn phòng + DTO tài xế trong ngày chạy; SĐT liên hệ chỉ DTO tài xế; nhật ký không ghi SĐT/email/MST/số giấy tờ; khoá `place_key` không bao giờ hiển thị.
- Giao diện: không `innerHTML`; CSS chỉ token (`public/app.css`); ô gõ 16px; ẩn/hiện theo `can()`; trang mới khai `PAGES` + script `build:web`; chạy kịch bản Chrome 390 + 1040.
- **Màn mới chờ bản vẽ Claude Design của chủ** (bài học Đợt D). Thêm nút/ô nhỏ vào màn có sẵn theo khuôn hiện có thì không cần vẽ.
- Việc lớn (dữ liệu, quyền, tiền) ⇒ người kiểm độc lập chỉ đọc sau mỗi đợt; người thi công không tự nghiệm thu.
- Mỗi đợt: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, mục nhật ký phiên bản `src/shared/changelog.ts` + `src/shared/app-info.test.ts`.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên: chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.

## Review Focus (toàn lộ trình — mỗi dòng có bài ở kế hoạch con sở hữu)

1. **Hai người bấm cùng lúc** trên cùng chuyến (văn phòng thêm điểm khi tài xế vừa kết thúc; hai xe cùng nhận một đề nghị chuyển; Từ chối đúng lúc văn phòng đổi tài xế) ⇒ một bên thắng, bên kia 409 câu dễ hiểu, không dữ liệu nửa vời. Sở hữu: Đợt 5, Đợt 6.
2. **Chuyến xe thuê đổi xe/nhà xe/tuyến sau khi đã chụp giá** ⇒ chụp lại đúng một lần, nhà xe đã thôi thì cả lệnh bị từ chối (ADR-0057:148). Sở hữu: Đợt 4.
3. **Ranh giới ngày/giờ Việt Nam**: khung bận, giờ lái, hạn Từ chối (giờ xuất bến − 720 phút), "trong ngày chạy" tính quanh nửa đêm VN, không lệch 7 giờ UTC. Sở hữu: Đợt 3, Đợt 6.
4. **Tin báo không lộ dữ liệu cá nhân** (tên khách, SĐT) và không tới người hết quyền xem chuyến (tài xế bị rút) ⇒ người nhận tính bằng `can(trip.view)` lúc gửi. Sở hữu: Đợt 2.
5. **Thân cũ từ PWA chưa cập nhật** (còn gửi `pickupTime`) sau Phần C ⇒ 409/400 câu "cập nhật app", không ghi đè chặng mới. Sở hữu: Đợt 8.

## Lời chủ (chat 2026-10-01, hộp hỏi — nguyên văn nhãn)

- Cách thi công: **"Mỗi bước một trợ lý (Recommended)"** ⇒ superpowers:subagent-driven-development, người kiểm từng task + kiểm cả nhánh.
- Người đi kèm lúc xếp: **"Chỉ hướng dẫn viên (Recommended)"** ⇒ Đợt 1 có task (chỉ tài khoản FIELD; tên hiện ở chi tiết chuyến văn phòng + màn tài xế; HDV chưa thấy chuyến). Câu 5 bên dưới ĐÃ TRẢ LỜI.
- Bộ đếm thân cũ: **"Có, cài sớm (Recommended)"** ⇒ Đợt 8 Task 1 chuyển vào Đợt 1. Câu 9 (phần gộp) ĐÃ TRẢ LỜI; ngưỡng 7 ngày theo khuyến nghị.
- Thời điểm T2: **"Chờ có màn nhập giá (Recommended)"** ⇒ T1 lên khi xong; T2 giữ trên nhánh tới khi có màn bảng giá + ô giá thoả thuận; Đợt 5 A-1b và Đợt 6 chờ theo. Câu 2 ĐÃ TRẢ LỜI.

- Lượt I câu 1 (chủ, chat 1/10): *"Trống, hiện chỉ có nhà xe là chính cty Tour Đảo và 1 xe demo thôi"* ⇒ không có chuyến xe thuê cũ; Đợt 4 Task 0 vẫn chạy lại lệnh đếm ngay trước phát hành T2 (dữ liệu có thể đổi).
- Lượt I câu 3 (chủ, chat 1/10 "Tính lại giá theo thời điểm chốt (như vé máy bay)", rồi hộp hỏi ví dụ 800.000đ/900.000đ → **"900.000đ — giá ngày chạy"**) ⇒ giữ đúng ADR-0057 B2: giá = dòng hiệu lực vào **ngày chạy**, đọc bảng giá lúc chụp; dời ngày chạy ⇒ đảo + chụp lại theo bảng giá của ngày mới (phương án A của Đợt 4; ca RF1-g thành bài thật).
- Lượt II câu 4 (chủ: *"Đồng ý"*) ⇒ Đợt 5 P4 chốt: một đề nghị được nhận ⇒ các đề nghị khác cùng điểm thành `VOID` trong cùng lô.
- Lượt II câu 6 (chủ: *"Bỏ, ghi ADR vì tôi chưa thấy thấu đáo, bỏ nếu bạn khuyến nghị như vậy"*) ⇒ soạn **ADR-0086** (proposed) bỏ `task.progress` + `dispatch.guides.view` (cùng hạn 30/11); AI đã báo ADR-0019 điều 5 từng chủ ý giữ (P18). Thi công sau khi chủ duyệt ADR-0086.

## Cần chủ (gom từ 8 kế hoạch con; mỗi lượt tối đa 3 câu chạm dữ liệu/quyền/tiền)

**Lượt I — tiền xe thuê (Đợt 4, hỏi trước khi nhận Đợt 4):**
1. Chuyến xe nhà xe đã có trên production (bảng chuyến lên từ 1.38 — tiền đề C2a của ADR-0057 nay sai): chủ chạy lệnh đếm chỉ-đọc (Task 0 Đợt 4). Có chuyến chưa chạy thì (A, khuyến nghị) để cờ "xe thuê" = 0, câu kiểm định kỳ liệt kê; hay (B) đánh dấu thuê ⇒ bị giữ "chưa có giá".
2. Thời điểm đưa T2 (thiếu giá không xuất bến) lên production: (A, khuyến nghị) T1 lên ngay, T2 giữ trên nhánh tới khi có màn bảng giá + ô giá thoả thuận — kéo Đợt 5 A-1b, Đợt 6 chờ theo.
3. Dời ngày chạy sau khi đã chụp giá: (A, khuyến nghị) tính lại giá; (B) giữ giá như chữ ADR.

**Lượt II — luật chưa có chữ trong ADR:**
4. Đợt 5 (P4): một điểm có nhiều đề nghị chuyển đang chờ, một cái được nhận ⇒ các cái khác tự huỷ trong cùng lô. Khuyến nghị: đồng ý.
5. Đợt 1: gắn người đi kèm lúc xếp xe — (A, khuyến nghị) chỉ tài khoản Hướng dẫn viên, tên hiện ở chi tiết chuyến văn phòng + màn tài xế; (B) bất kỳ ai trong Danh bạ; (C) để sau cùng ADR-0064.
6. Ô quyền chết `task.progress` (hạn 30/11, quá hạn bộ kiểm đỏ): khuyến nghị bỏ khỏi bản đồ quyền (siết) tới khi làm nhiệm vụ đón ADR-0006.

**Lượt III — bề mặt / vận hành (không trả lời thì dùng khuyến nghị; RIÊNG câu 7: không trả lời thì theo đúng chữ ADR):**
7. Đợt 3: mã giữ riêng "Xe có lịch bận trùng giờ" thay vì dùng lại "trùng giờ chuyến khác". ADR-0055 ghi KHÔNG thêm mã ⇒ mặc định (không trả lời) = dùng lại `TRUNG_GIO_XE` theo ADR; khuyến nghị chủ cho phép mã riêng (câu báo đúng hơn).
8. Đợt 2: duyệt câu chữ 6 loại tin; văn phòng xếp/rút khách trên chuyến thì tài xế KHÔNG nhận chuông (đúng ADR, màn tự tải lại); tách "báo khi giờ hẹn đổi sau xếp" (MQ-07) sang lát riêng sau Đợt 5.
9. Đợt 8: gộp bộ đếm thân cũ vào Đợt 1 (khuyến nghị có); ngưỡng cắt 7 ngày liền không còn máy cũ (hoặc 14).
10. Đợt 5: xác nhận bộ ca mẫu xe A/B trước lát chuyển điểm.

**Lúc thi công (không hỏi bây giờ):** tệp đề xuất luật nới bài ghim — Đợt 5 A-1, Đợt 5 A-1b (ô "bổ sung tên", ngoại lệ `GHI_NGOAI`, đổi nghĩa R-ORD-11), Đợt 6 (hàng `DRIVER_PARTNER`, sửa `CLAUDE.md` §10, `web/CLAUDE.md`); Đợt 8 câu mới cho `CLAUDE.md` §10. **Bản vẽ Claude Design** (lệnh vẽ soạn sẵn trong từng kế hoạch con): Đợt 3, 4, 5, 6, 7 — máy chủ các đợt làm trước, không chờ.

**Lệch chữ ADR tiền, không đổi số tiền (người kiểm Đợt 4 soi, điều phối đã xét — không hỏi chủ):** TC-8 khoá ghi chồng đặt ở câu cổng (mạnh hơn chữ ADR C4, vẫn "cả lô hoặc không"); TC-10 câu kiểm `R-VC-COST-3` báo "còn nguồn giá chưa đảo hoặc tổng ≠ 0" thay "có dòng" (chuyến đổi sang xe công ty giữ dòng đã đảo). Người kiểm thấy đổi nghĩa tiền ⇒ quay về chữ ADR và hỏi chủ.

**Tự chốt của người viết kế hoạch đáng soi** (ghi trong từng tệp): Đợt 6 P6-2 (đúng mốc hạn Từ chối: vẫn Từ chối được, chưa thấy khách — siết); Đợt 1 làm luôn mốc nhắc hạn giấy tờ người (bỏ hằng 30); Đợt 4 TC-8/10/11; Đợt 7 C6/C7; Đợt 3 K1–K15.

## Định nghĩa "xong" mỗi đợt

Test đỏ trước xanh sau; `npm test` + typecheck + e2e đủ bộ xanh; kịch bản Chrome (nếu chạm giao diện) + ảnh ở `docs/evidence/`; người kiểm độc lập ĐẠT; mục nhật ký phiên bản; nhật ký thi công `docs/superpowers/plans/<ngày>-van-chuyen-dot-N-nhat-ky.md`; chủ chạy `day-len` + `trien-khai`; `node scripts/kiem-phien-ban.mjs --sau-deploy` ĐẠT.
