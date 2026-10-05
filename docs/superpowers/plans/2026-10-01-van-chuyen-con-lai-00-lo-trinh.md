# Vận chuyển — các hạng mục đã duyệt còn lại: LỘ TRÌNH (kế hoạch mẹ)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each sub-plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thi công hết các quyết định Vận chuyển chủ đã duyệt mà mã chưa có, theo thứ tự phụ thuộc, mỗi đợt một bản phát hành chạy được.

**Architecture:** Mọi dữ liệu mới thuộc module `van-chuyen` (tiền tố `vc_`), trừ cột chết của `orders` ở Phần C. Luật lõi ở cả trigger lẫn máy chủ (khuôn ADR-0049). Mỗi đợt = máy chủ trước (đỏ→xanh, e2e), giao diện sau; màn mới chờ bản vẽ Claude Design của chủ.

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, giao diện thuần `web/*.ts` (dựng bằng `h()`), `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome.

**Spec:** bản rà `docs/superpowers/specs/2026-10-01-ra-soat-phan-he-van-chuyen.md`; quyết định: ADR-0052, ADR-0053, ADR-0055, ADR-0056, ADR-0057, ADR-0047 §6 (Phần C), ADR-0049, ADR-0040; trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`, `…-luot-duyet-b-kernel-tien.md`; lời chủ: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.

## Trạng thái (cập nhật 2026-10-02 chiều)

Bản vẽ Claude Design Đợt 3–7 đã nhận: `docs/design/van-chuyen-dot-3-7/` (đánh giá đối chiếu ở `danh-gia/`). **Câu hỏi còn mở gom một chỗ:** `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`. Kế hoạch con 03–07 đã viết lại theo bản vẽ + khuyến nghị (mục "Cập nhật 2026-10-02" đầu mỗi tệp).

| Đợt | Trạng thái | Nhánh / việc kế |
|---|---|---|
| 1 | ĐÃ LÊN production 1.65 | — |
| 2 Tin báo chuyến | Code xong, kiểm độc lập 2 vòng ĐẠT (1.69, migration 0070 view) | `worktree-agent-a169271206f91c9c4` — chủ `day-len` + `trien-khai` |
| 3 Lịch xe bận | Kế hoạch viết lại (trang lịch tuần); chờ câu 3.1–3.4 (3.2 🔒) | migration 0071 đã cấp |
| 4 Tiền xe thuê | Máy chủ T1+T2 xong, kiểm 2 vòng ĐẠT (1.70, 0072+0073, đã gộp sẵn Đợt 2); GIỮ tới khi có giao diện G1–G5 | `worktree-agent-a76ababaa4a5b3183`; chờ câu 4.x + sổ vàng; lúc gộp kiểm khoá kỳ ADR-0080 |
| 5 Xe đang chạy | THU GỌN (D5, D5b, D5c đơn giản); D4 + V4 hoãn tới mốc | sau Đợt 2 + 3; A-1b sau Đợt 4 |
| 6 Tài xế đối tác | Kế hoạch viết lại (taxi = nhà xe một xe); chờ câu 6.x (6.3 🔒) | sau Đợt 3, 4, 5 (đo lại phụ thuộc đã hoãn) |
| 7 Xe riêng / số chỗ | Kế hoạch viết lại; chờ 7.1–7.2 | sau Đợt 3 + 4 gộp |
| 8 Bỏ đường ghi cũ | Như cũ (cổng đếm thân cũ) | — |
| **Mới: Toạ độ điểm** | Chủ chọn bảng phụ có kiểu (câu 0.1 xác nhận); cần ADR nhỏ (module `locations`, bảng chỉ thêm, vĩ độ −90…90 / kinh độ −180…180 `CHECK`, nguồn, không bắt buộc) trước migration | chưa cấp số; làm sau ADR |
| **Mới: Chia doanh thu taxi** | Chưa ADR; câu 0.2 **ĐÃ TRẢ LỜI 5/10** (a–c, xem "Lời chủ 5/10"); còn mở: hoá đơn / thuế (d — hỏi Kế toán) | sổ riêng, không chạm `vc_trip_cost_line`; kế hoạch Đợt 6 dùng |

Số migration đã cấp: 0070 (Đợt 2), 0071 (Đợt 3), 0072–0073 (Đợt 4). Số kế tiếp lấy theo L2.

## Phạm vi

**Trong:**

| Đợt | Kế hoạch con | Nội dung | ADR |
|---|---|---|---|
| 1 | `…-01-viec-nho.md` | Mỗi loại giấy tờ xe một dòng hiện hành; văn phòng đổi thứ tự điểm khi xe chạy; gắn người đi kèm lúc xếp; màn ngưỡng nhắc hết hạn; sửa tài liệu cũ | 0056 VK3-B, 0049, 0040 |
| 2 | `…-02-tin-bao-chuyen.md` | Tin báo + Bảng tin khi chuyến đổi (xếp, dời, huỷ, đổi tài xế, xuất bến…) | 0052 D6 |
| 3 | `…-03-khung-ban-gio-lai.md` | Lịch xe vào xưởng (khung bận xe); cảnh báo giờ lái | 0055 VK2-A, VK2-B |
| 4 | `…-04-tien-xe-thue.md` | Bảng giá thuê theo nhà xe (T1); chi phí chuyến chụp lúc giao, thiếu giá không xuất bến (T2) | 0057 T1, T2 |
| 5 | `…-05-xe-dang-chay.md` | **(thu gọn 2/10)** A-1: văn phòng thêm điểm / báo huỷ khi xe chạy, LC-15 mới (D5). A-1b: tài xế bổ sung tên (D5b); cứu hộ đơn giản — văn phòng tạo chuyến cứu hộ (D5c). D4 (chuyển điểm giữa hai xe) + V4: HOÃN tới mốc (phụ lục) | 0052 D5, D5b, D5c (D4 hoãn) |
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
Đợt 5 A-1 (D5; D4 HOÃN 2/10) — sau Đợt 2 + Đợt 3       │
Đợt 5 A-1b (D5b, D5c) — SAU Đợt 4 T2 (ADR-0052:135)  ◄──┤
Đợt 6 (ADR-0053) — SAU Đợt 4 T2 (ADR-0053:129), SAU Đợt 3 VK2-A (D9 dùng chung bảng khung bận), SAU Đợt 5 A-1b (ô trip.passenger.add). [2/10: KHÔNG còn chờ ô trip.transfer — thuộc D4 đã hoãn; hàng ghim Tài xế đối tác 9 ô; trip.transfer cho DRIVER_PARTNER gắn lại khi làm D4]
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
| `vc_dispatch_policy` + `INSERT_DISPATCH_POLICY` + `kiemChinhSachMoi` + bài "câu chèn ghi đủ cột" (`chinh-sach.test.ts`) | 03 | 06 (05 khi làm D4 hoãn) | 03 → 06 (2/10: Đợt 5 thu gọn không thêm cột chính sách; Đợt 6 thêm `office_phone` — câu 6.3), mỗi đợt dựng từ bản đã gộp, không viết bài trùng |
| Bài ghim nhóm lý do (`dieu-phoi-kieu.test.ts`) | 03 (8 nhóm) | 06 (10 nhóm) | 03 → 06 |
| `LOAI_SU_KIEN_CHUYEN`; `MAU` của `thu-tu-lo.test.ts` | 05 / chung | 04, 05, 06, 07 | nối thêm theo thứ tự 04 → 05 → 06 → 07 |

Không đợt nào DROP trigger trên `vc_trip` của đợt khác (tên không trùng). **Đợt 1–3 song song chỉ an toàn khi** mỗi đợt nhận việc từ `main` mới nhất và đợt gộp sau đo lại các dòng trên.

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| L1 | ADR-0052:282, ADR-0055:92 "sửa `0042`/`0041` tại chỗ hay migration mới" | **migration mới** | `0041`, `0042` đã áp remote (bản 1.38); CLAUDE.md §7 cấm sửa |
| L2 | Số migration, số phiên bản | **không ghi cứng**; lúc thi công = lớn nhất trong `migrations/` của `main` **và mọi nhánh chưa gộp** + 1 (`git ls-tree --name-only <nhánh> migrations/`); phiên bản = lớn nhất ở `origin/main` + 1 lúc gộp | nhiều phiên song song (bài học 1.53/1.57–1.63) |
| L4 (2/10) | Bản vẽ Đợt 5/6 không có tab "Trang chủ" (`/tai-xe`) của tài xế | **giữ tab Trang chủ** của tài xế (không bỏ) | bản vẽ chỉ vẽ phần mới, không nói bỏ; bỏ trang có sẵn là việc lớn hơn phạm vi; Trang chủ riêng cho HDV/Đối tác đã ở BACKLOG mục 18. Hoàn tác: bỏ mục menu |
| L5 (2/10) | Câu 5.2b "xe có tài xế dùng app" | = **tài xế công ty** (`taiXeChoDieuPhoi`) trong Đợt 5; khi Đợt 6 lên thì gồm cả tài xế đối tác có tài khoản | Đợt 6 lên sau Đợt 5; mở rộng một bộ lọc |
| L6 (2/10) | Kiểu chữ nhãn (chip) Đợt 3–7 | **một kiểu chung** theo bản vẽ: viên thuốc, chữ 800 12px, giãn .04em; áp cả nhãn "✈︎" có sẵn | 5 bản vẽ cùng một kiểu; tránh mỗi đợt một lớp CSS. Hoàn tác: một lớp CSS |
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
- Lượt II câu 6 (chủ: *"Bỏ, ghi ADR vì tôi chưa thấy thấu đáo, bỏ nếu bạn khuyến nghị như vậy"*) ⇒ soạn **ADR-0086** (proposed) bỏ `task.progress` + `dispatch.guides.view` (cùng hạn 30/11); AI đã báo ADR-0019 điều 5 từng chủ ý giữ (P18). → chủ **bác** (*"giữ lại đi, tiếp"*): giữ hai ô; hạn 30/11 còn nguyên, cần chủ gia hạn trước hạn.

## Lời chủ (chat 2026-10-02, sau khi Đợt 1 lên 1.65 — năm câu mở của Đợt 1)

1. Tự đóng suất hướng dẫn viên khi tài xế kết thúc chuyến — chủ: *"không, của ai việc nấy. Hệ thống sẽ tự giúp đóng khi các nguy cơ về bỏ qua sai sót là không còn. Tự đóng khi chưa nghiên cứu kỹ là mầm mống của sai sót bị lãng quên."* ⇒ **giữ nguyên** luật 1.65 (`kiemKetThuc` đòi suất `CREW` đã "Đã xuống"; tài xế không kết thúc thay). Không đợt nào được thêm tự đóng nếu chưa có đặc tả + chủ duyệt.
2. Cấm gắn một hướng dẫn viên hai lần — chủ: *"Cái đó là đương nhiên … ngay khi HDV được gán vào chuyến thì đã không rảnh, mà hệ thống chỉ xếp ai đang rảnh, dường như thiếu tham chiếu và/hoặc nhãn."* Đã kiểm mã 2/10, chủ nói đúng: xe và tài xế có chặn trùng giờ hai lớp (`lc03_overlap` ở `migrations/0042_chuyen_xe.sql:357-381` + mã `trung_gio_xe` / `trung_gio_tai_xe` ở `dieu-phoi-route.ts:35-36`), còn người đi kèm thì **không có gì**. `GET /api/van-chuyen/huong-dan-vien` trả mọi HDV đang hoạt động, không có giờ bận; màn `web/chuyen.ts:507` chỉ lọc người đã gắn trên CHÍNH chuyến đó, lọc theo **tên**; route xếp (`index.ts:910-914`) chỉ kiểm "là HDV". ⇒ **việc mới "Người đi kèm bận"** (đã duyệt hướng, chưa có kế hoạch con), làm theo đúng khuôn tài xế:
   - (a) máy chủ + CSDL: cấm một người hai suất `CREW` trên cùng chuyến, và cấm người đó ở hai chuyến chưa huỷ giao giờ nhau ⇒ 409 `trung_gio_nguoi_di_kem` "Hướng dẫn viên đã đi chuyến CX-… lúc …";
   - (b) danh sách chọn trả thêm cho mỗi người `banChuyen` (mã chuyến + giờ) ⇒ màn hiện nhãn "Đang đi CX-… 08:00–11:00", xám, không chọn được; lọc theo `partyId`, bỏ lọc theo tên;
   - (c) khuyến nghị lát đầu chỉ tính bận **theo chuyến xe** (dữ liệu có giờ chính xác). Việc tour / đơn của HDV ("Việc của tôi") chỉ hiện làm nhãn tham khảo "Có N việc hôm đó" nếu đọc được, không chặn — chờ chủ xác nhận khi lập kế hoạch con.
3. Cấm điểm trả đứng trước điểm đón khi đổi thứ tự — chủ: *"chưa quyết được vì chưa hiểu tình huống này trong thực tế sẽ thế nào"* ⇒ **còn mở**. Đã giải thích ví dụ cho chủ 2/10: chỉ xét điểm đón và trả của **cùng một nhóm khách**. Trả khách nhóm A ở sân bay rồi đón nhóm C cũng ở sân bay là bình thường, không chặn. Khuyến nghị: chặn, vì không có tình huống thật nào trả khách trước khi đón chính khách đó.
4. Bản vẽ Claude Design Đợt 3–7: chủ *"sẽ gửi sau"*, xin xem nguyên văn lệnh vẽ ⇒ đã chép ra chat 2/10 (nguồn vẫn là mục lệnh vẽ trong từng kế hoạch con).
5. Đếm xe có hai giấy tờ cùng loại đang hiện hành trên production — chủ: **0** ⇒ trigger `0068` không vướng dữ liệu cũ; không cần dọn.

## Lời chủ (chat 2026-10-02 chiều — mô hình thật + quy mô hợp tác xã)

Bối cảnh chủ nêu: công ty có **5 xe** (2 xe 16 chỗ, 3 xe 4–7 chỗ); **thuê xe theo chuyến** khi cao điểm; dự kiến mở rộng: **taxi / xe hợp đồng tự do làm đối tác, chia sẻ doanh thu** (khách là khách của Tour Đảo); có thể lên **hợp tác xã vài chục – vài trăm xe**.

1. **Thu gọn Đợt 5** — chủ: *"ok"*. Làm ngay: V11 (văn phòng thêm điểm / báo huỷ khi xe chạy, D5), V6 (tài xế bổ sung tên, D5b), cứu hộ đơn giản (văn phòng "Tạo chuyến cứu hộ", D5c). **Hoãn tới mốc**: V8–V10 (tài xế nhờ xe khác đón, hộp đề nghị cần duyệt, bảng kiểm luật — D4), V4 (Dòng dữ liệu / Nhật ký quyết định). Bỏ khỏi danh sách hỏi: câu bản vẽ 5.1, 5.2a, 5.2d, 5.4, 5.5, 5.6a, 5.7. Khi làm D4: tập mã luật để dạng **danh mục** (thêm luật = thêm dòng), không khoá cứng bằng `CHECK`.
   **Mốc bật lại D4 / kiểu "phát chuyến"**: khoảng ≥ 15 xe đối tác hoạt động HOẶC văn phòng xếp > ~40 chuyến/ngày ⇒ viết ADR chọn cách.
2. **Toạ độ điểm đón / trả** — chủ: *"Có, cho bổ sung vào 1 trường linh động (Flex field)"*. ⚠ Xung đột **Hiến chương 5.2** (`docs/ARCHITECTURE.md:93` — cấm flexfield/JSON không lược đồ; ADR-0060 chủ từng giữ luật này). Đã hỏi lại chủ 2/10 với phương án hợp luật: **bảng phụ có kiểu** (vd `loc_location_geo`: vĩ độ / kinh độ có `CHECK` khoảng, nguồn, không bắt buộc) — không đụng bảng lõi, thêm sau được; hoặc chủ sửa Hiến chương 5.2. **Chờ chủ.**
3. **Cách điều xe ở quy mô hợp tác xã** — chủ: *"kết hợp cả giao chuyến cả để tài xế tự nhận"* ⇒ hướng: văn phòng giao (kiểu A, đang có) **+** phát chuyến cho tài xế rảnh tự nhận (kiểu C, chưa có ADR); tài xế nhờ tài xế (kiểu B, ADR-0052 D4) là đường phụ khi sự cố. ADR kiểu C viết khi tới mốc ở mục 1.
4. **Chia sẻ doanh thu với taxi đối tác** — chưa ADR nào có. Khuyến nghị (chủ chưa trả lời): Đợt 4 giữ nguyên (thuê theo chuyến = chi phí cố định); chia doanh thu làm **sổ riêng** bằng ADR riêng sau khi chủ chốt: (a) % trên giá bán chặng hay sau phí; (b) ai thu tiền khách; (c) trả theo chuyến hay theo kỳ (nối sổ công nợ / khoá kỳ); (d) hợp đồng, hoá đơn, thuế (hỏi Kế toán). Không chen vào `vc_trip_cost_line`.

## Lời chủ 5/10 (sau Đợt 5 tầng 1+2 lên 1.79)

Nguyên văn: "a- cho tài xế tự bổ sung tên khách, chỉ tài xế công ty. b- không, c-chấp nhận, d- bạn đã hiểu đúng, đối tác tự thu tiền, e- giữ". Phần thuộc lộ trình:
- **Câu 0.2 — chia doanh thu taxi đối tác: ĐÃ TRẢ LỜI (vế d).** Khách trả **giá khách lẻ** cho đối tác; công ty nhận **tối thiểu 5% giá đó**; tính **theo từng chuyến**; **đối tác tự thu tiền khách**. Ứng với các điểm hỏi 2/10: (a) % trên giá bán (giá khách lẻ), không phải sau phí; (b) đối tác thu; (c) theo chuyến. **Còn mở:** (d) hợp đồng / hoá đơn / thuế (chưa hỏi — hỏi Kế toán trước ADR) và các điểm e–h của `2026-10-02-van-chuyen-cau-hoi-ban-ve.md` chưa được hỏi riêng. Kế hoạch Đợt 6 dùng câu trả lời này khi viết ADR sổ riêng (không chen `vc_trip_cost_line`).
- Đợt 5: (a) tầng 3 tài xế bổ sung tên duyệt — CHỈ tài xế công ty (bản 1.80); (b) cập nhật điểm lúc xe chạy làm một điểm hết khách: máy không tự bỏ điểm; (c) chấp nhận danh sách xe cứu hộ gồm tài xế công ty chưa từng đăng nhập.
- Đợt 4: (e) giữ ADR-0057 C7 — Quản trị ghi / đảo chi phí xe thuê, không tính là "tài khoản giữ quyền tiền" của ADR-0090.

## Cần chủ (gom từ 8 kế hoạch con; mỗi lượt tối đa 3 câu chạm dữ liệu/quyền/tiền)

> **Lịch sử (1/10).** Lượt I–III dưới đây ĐÃ TRẢ LỜI hoặc đã theo mặc định (xem "Lời chủ" 1/10, 2/10). Câu 7 (mã giữ riêng "xe có lịch bận") và câu 8 (câu chữ tin) theo mặc định đã ghi; câu 10 (ca mẫu xe A/B) thuộc phần Đợt 5 đã HOÃN. **Câu đang mở: `2026-10-02-van-chuyen-cau-hoi-ban-ve.md`.**

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
