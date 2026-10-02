# Vận chuyển Đợt 5 — Xe đang chạy: văn phòng thêm điểm / báo huỷ, tài xế bổ sung tên, cứu hộ đơn giản — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thi công ADR-0052 D5 (D5.1, D5.2, D5.3, D5.3a), D5b và D5c **bản đơn giản** (văn phòng "Tạo chuyến cứu hộ" theo đường ADR-0052:133). Nới khoá "xe đang chạy" (LC-15) đúng **ba đường có tên**. Chia hai bản phát hành: **A-1** (D5) và **A-1b** (D5b + D5c đơn giản, sau Đợt 4 T2). D4 (chuyển điểm giữa hai tài xế) **hoãn tới mốc**, xem phụ lục `## HOÃN tới mốc`.

**Architecture:** Dữ liệu mới thuộc `van-chuyen`: cột mới trên `vc_trip_allocation`, `vc_trip_stop`, dòng gieo `vc_reason`. **Không** có bảng mới ở lát làm ngay. Luật lõi nằm ở CẢ trigger (migration mới) lẫn máy chủ. Mỗi lệnh là MỘT `db.batch` theo khuôn cổng → nhật ký → sự kiện → ghi → trạng thái cuối. Riêng D5b: dòng `ord_passenger` do một câu lệnh chưa chạy của `orders` cấp, gác bằng id nhật ký (khuôn `legInsertGuarded`); `van-chuyen` chạy câu đó trong lô của mình. Cứu hộ đơn giản không thêm lệnh ghi mới: văn phòng ghép các lệnh có sẵn (kết thúc gián đoạn, tạo chuyến, xếp, thêm điểm D5.1) và giá của Đợt 4. Phần mới chỉ là một route đọc.

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, `node --test`, e2e `tests/e2e/*.mjs`, giao diện thuần `web/*.ts` (`h()`), kịch bản Chrome.

**Spec:** `docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md` (accepted 30/9; đọc D5, D5b, D5c, D6, "Câu ADR bị thay", tiêu chí 6, 6c, 10, 11); lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` mục "Lời chủ (chat 2026-10-02 chiều)" điểm 1; trang ghép quyết định `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`; ADR-0057 T2 (cổng `THIEU_GIA`, ô `transport.cost.adjust`, route `…/chi-phi/gia-thoa-thuan` thuộc Đợt 4); câu hỏi bản vẽ chung `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`.

**Mức chi tiết (lộ trình L3):** mức GIAO DIỆN gồm bảng, cột, trigger, chữ ký hàm, route, ô quyền và test bắt buộc. Không viết thân hàm. **Mọi `tệp:dòng` dưới đây đo ở HEAD `478058c9` (2026-10-02, worktree `ghi-quyet-dinh-van-chuyen`). Người thi công ĐO LẠI lúc nhận vì Đợt 2–4 sẽ đổi các tệp này.**

---

## Cập nhật 2026-10-02 — theo bản vẽ Claude Design + lời chủ

- **Thu gọn (chủ chốt "ok", lộ trình mẹ "Lời chủ 2026-10-02 chiều" điểm 1).** Phần làm ngay gồm D5 (V11: văn phòng thêm điểm / báo huỷ khi xe chạy, LC-15 mới), D5b (V6: tài xế bổ sung tên) và D5c đơn giản (văn phòng "Tạo chuyến cứu hộ"). D4 (V8 nhờ xe khác đón, V9, V10 hộp duyệt, bảng kiểm luật) và V4 (Dòng dữ liệu / Nhật ký quyết định) chuyển sang phụ lục `## HOÃN tới mốc`, giữ nguyên thiết kế cũ.
- **Bỏ khỏi lát làm ngay:** bảng `vc_transfer_request`, `vc_transfer_check`; cột `transfer_id`; hai cột chính sách `accept_wait_minutes`, `auto_confirm_transfer`; ô `trip.transfer`; mọi route `de-nghi*`, `xe-nhan`; MQ-09 trong lô cũ. Hệ quả: Đợt 5 **không chạm** `vc_dispatch_policy`, và LC-15 mới chỉ có ba đường mở/đóng có tên (D5.1, Kết thúc gián đoạn, D5.3a). Khi làm D4 thì phải dựng lại LC-15 bằng một migration nữa.
- **Cứu hộ đơn giản (D5c), theo đúng ADR-0052:133:** tài xế (hoặc văn phòng bấm thay) **Kết thúc gián đoạn** → chặng về "chưa xếp" → văn phòng bấm **"Tạo chuyến cứu hộ"**. Có hai cách: thêm vào xe cùng ngày có tài xế dùng app (D5.1 / xếp), hoặc tạo chuyến mới. Xe nhà xe chỉ đi đường tạo chuyến mới. Ô giá thoả thuận dùng route chi phí của Đợt 4. Không có đề nghị `ONBOARD`, không có route ghi mới. `[chờ chủ xác nhận câu 5.2b — đang theo khuyến nghị]`
- **Theo bản vẽ, phần bề mặt:** trang mới "Xe đang chạy"; khối "Khách đang chờ" có link "Báo huỷ"; form "Thêm điểm đón / thêm khách"; hộp báo huỷ (4 lý do đúng chữ bản vẽ); dải "Văn phòng vừa thêm điểm" và chip "Văn phòng đã báo huỷ — vẫn tới điểm" ở màn tài xế; form "Bổ sung tên"; khối "Cứu hộ" của văn phòng.
- **Theo DANH-GIA §4, phần còn làm:** gieo nhóm lý do `BAO_HUY_DIEM` và cho hiện ở màn Lý do điều phối (T1, T2). Đưa lý do ra màn qua DTO chi tiết, vì tài xế và Bán hàng không đọc được `GET /ly-do` (cổng `admin`) (T4). Thêm `diem[].themKhiChay`, `suat[].vanPhongBaoHuy` (T4). Thêm route đọc cứu hộ của văn phòng (T15).
- **Theo ADR, không theo bản vẽ:** bỏ nút "Xin Quản trị phá lệ" và câu "mốc 30 phút". Dùng khuôn có sẵn: Bán hàng thấy dòng khoá, Quản trị thấy hộp `moPhaLe` (ADR-0052 D5.1). Chủ đã bỏ câu 5.2a khỏi danh sách hỏi. Đổi câu "Nhập khi khách đã lên xe" thành "Nhập tên cho khách chưa có tên trong đơn" (ADR D5b).
- **Bản vẽ đã nhận 2/10:** `docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html`, dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`. Phần dùng: V11, V6, Cứu hộ (CH.2 khối văn phòng). Phần thuộc HOÃN: V8, V9, V10, V4, CH.1 (tài xế chọn xe cứu hộ).
- Câu còn mở: 5.2b, 5.2c, 5.3 (mục "Cần chủ"). Các câu 5.1, 5.2a, 5.2d, 5.4, 5.5, 5.6a, 5.6b, 5.7 thuộc phụ lục HOÃN.

---

## Phạm vi

**Trong:**

| Lát | Quyết định | Nội dung |
|---|---|---|
| A-1 | D5.1, D5.2, D5.3, D5.3a | Văn phòng thêm điểm / khách vào xe đang chạy; báo huỷ một suất (đặt cờ, không đóng suất); LC-15 mới với ba đường có tên; cập nhật điểm theo đơn trên xe đang chạy (đóng → mở → câu chốt); trang "Xe đang chạy" |
| A-1 | D6 (điểm cắm) | Gọi `ctx.baoThayDoiChuyen` sau lô thành công. Thêm ba hành động D5 vào hàm người nhận **của Đợt 2**, KHÔNG dựng lại D6 |
| A-1b | D5b | Tài xế bổ sung tên khách chưa có tên (ô `trip.passenger.add`; `ord_passenger.source = 'DRIVER'` qua hàm công bố mới của `orders`) |
| A-1b | D5c (đơn giản) | Văn phòng "Tạo chuyến cứu hộ" sau khi chuyến hỏng đã Kết thúc gián đoạn. Có hai cách: thêm vào xe cùng ngày có tài xế dùng app, hoặc tạo chuyến mới (xe công ty hoặc xe nhà xe). Xe nhà xe phải có giá (cổng `THIEU_GIA` của Đợt 4). Ô giá thoả thuận chỉ cho Quản trị / Kế toán / Toàn quyền |

**Ngoài:** D4 và V4 (phụ lục HOÃN); đề nghị cứu hộ `ONBOARD` do tài xế gửi (D5c bản đầy đủ — cần D4); thân D6 (Đợt 2); tiền xe thuê (Đợt 4); mọi đổi mốc 6 giờ; đổi nhãn menu tài xế "Cuốc của tôi" (giữ, câu 6.5 của Đợt 6).

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| P1 | ADR-0052:116, :282: sửa `0042` tại chỗ hay viết migration mới | **migration mới** (bỏ rồi tạo lại trigger) | lộ trình L1; `0042` đã áp remote ở bản 1.38. T0 kiểm lại bằng lệnh chỉ đọc |
| P3 | Ô `trip.passenger.add` | Chỉ thêm vào `MATRIX` ở bản A-1b, cùng lúc với route hỏi nó | Global Constraint của lộ trình: "mỗi ô mới phải được một route máy chủ hỏi trong cùng bản phát hành" |
| P6 | Tên route | Dùng đúng tên ADR-0052:217-220 (`them-diem`, `bao-huy`, `hanh-khach`) | ADR ghi "tên đề xuất, kế hoạch chốt", nên chốt nguyên |
| P7 | Câu ghi `ord_passenger` của tài xế (D5b) | Gác bằng id nhật ký (khuôn `legInsertGuarded(db, l, auditId)` ở `src/modules/orders/chang-hanh-khach-repo.ts`), KHÔNG đọc `vc_trip` | `orders` không đọc `van-chuyen` (`src/architecture.test.ts`). Hệ quả: bài thứ tự lô cần một ngoại lệ có tên, nên phải qua mục đề xuất luật (T16) |
| P8 | D5c khi D4 hoãn | **Đường ADR-0052:133**: Kết thúc gián đoạn → chặng về "chưa xếp" → văn phòng tạo chuyến cứu hộ mới, hoặc thêm vào xe đang chạy bằng D5.1. Không có `scope = 'ONBOARD'`, không có ô mới, không có route ghi mới. Ô của nút "Tạo chuyến cứu hộ" = `trip.dispatch` (ô của tạo chuyến / xếp hiện có) | Chủ chốt "cứu hộ đơn giản (văn phòng Tạo chuyến cứu hộ)". ADR đã mô tả sẵn đường này |
| P9 | "Xe có tài xế dùng app" (danh sách cứu hộ) | Chuyến cùng ngày `PLANNED`/`RUNNING` có dòng lái mở, và tài xế có `loai = "CONG_TY"` theo hàm công bố `taiXeChoDieuPhoi` (`src/modules/parties/index.ts:156`). Đây là **lọc hiển thị**, không phải điều kiện cho phép (`src/CLAUDE.md:22`: vai hồ sơ không bao giờ là điều kiện cho phép). Tài xế đối tác dùng app là việc của Đợt 6: khi Đợt 6 lên thì mở lọc theo ô của họ | Câu 5.2b. Đo lại lúc nhận: nếu tài xế công ty chưa có tài khoản thì vẫn lọt danh sách. T0 kiểm `taiXeChoDieuPhoi` có trả cờ "có tài khoản" không; không có thì ghi "chưa chắc", không tự thêm hàm vào `parties` |
| P10 | Lý do cho tài xế / Bán hàng | **Nhúng vào DTO** chi tiết có sẵn: `ChuyenChiTietResponse.lyDo` (`src/shared/contracts.ts:1295`, đã có) thêm nhóm `BAO_HUY_DIEM`; DTO tài xế chỉ nhận **nhãn** lý do đã báo huỷ (`vanPhongBaoHuy.lyDoNhan`). Không mở `GET /api/van-chuyen/ly-do` (cổng `admin`, `index.ts:605`) | DANH-GIA §4.7; không mở cổng mới |
| P11 | Thứ tự trong cứu hộ | Nhiều lệnh rời nhau (kết thúc gián đoạn → tạo chuyến → xếp / thêm điểm → nhập giá). Mỗi lệnh tự an toàn: chặng còn "chưa xếp" cho tới khi xếp. Có thể sinh một chuyến cứu hộ trống, xử lý bằng nút Huỷ chuyến có sẵn | Không dựng lệnh gộp mới (chủ chọn "đơn giản") |

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu. Không lộ mã thô (`RUNNING`, `WAITING`, `STOP_CHANGED`, `THIEU_GIA`…); nhãn lấy từ `src/shared/dieu-phoi-kieu.ts`.
- Không đụng tiền (ADR-0052:20). Riêng D5c đọc cổng `THIEU_GIA` và gọi route giá của Đợt 4, không tính tiền.
- Dấu thời gian ISO UTC, MỘT mốc giờ mỗi request (`toISOString()` của máy chủ). "Trong ngày chạy" tính bằng `trongNgayChay` (`src/shared/dieu-phoi-kiem.ts`).
- Không xoá cứng. Cột `office_cancel_*` chỉ đặt MỘT lần.
- Migration chỉ thêm tệp mới. Số = lớn nhất ở `main` **và mọi nhánh chưa gộp** + 1 (lộ trình L2; hôm nay lớn nhất ở HEAD là `0069`). Bảng/cột mới thì ghi `docs/data-dictionary.json` và chạy `npm run dict`.
- `van-chuyen` là module nghiêm: SQL đi qua `defineSql` trong `chuyen-repo.ts`; không module nào import `van-chuyen`; `thongbao` không import `van-chuyen` (dùng hàm tiêm).
- Lệnh chuyến là MỘT `db.batch`. Mọi hàm `export function lo…` mới phải có mẫu ở `MAU` của `src/modules/van-chuyen/thu-tu-lo.test.ts` (thiếu thì bài đỏ).
- Mọi lệnh mang `request_id`; lệnh lặp trả kết quả cũ; chuyến không phải của mình trả **404**. Với tài xế: hỏi `can(…, { assigned })` TRƯỚC mọi truy vấn.
- Nhật ký, tin, Bảng tin, phản hồi lệnh: KHÔNG có tên, năm sinh, SĐT, số giấy tờ, `place_key`, dãy ≥ 8 chữ số. Chỉ có mã chuyến, mã đơn, số người, nhãn nơi đã che.
- Thêm ô vào hàng ghim `DRIVER` là NỚI bài ghim, nên chỉ đi qua tệp đề xuất luật cho chủ duyệt; tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt duyệt.
- Cổng / trigger mới phải có dòng ở `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- Giao diện làm đúng bản vẽ ở phần bề mặt (`docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html`). Phần chạm dữ liệu/quyền theo ADR và theo các mốc `[chờ chủ xác nhận …]`. CSS chỉ dùng token (`public/app.css`), ánh xạ token theo bảng ở T10.
- Mỗi lát: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local`, mục `src/shared/changelog.ts` + `src/shared/app-info.test.ts`, người kiểm độc lập chỉ đọc ĐẠT.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên.

## Review Focus

1. **Văn phòng thêm điểm đúng lúc tài xế bấm Kết thúc** → một bên thắng (cổng `version` / dấu lệnh), bên kia nhận 409 với câu dễ hiểu. Không có điểm mới trên chuyến đã kết thúc, không có suất mồ côi. Bài: T5.
2. **Cập nhật điểm theo đơn trên xe đang chạy bị cắt giữa chừng** (lô thiếu câu mở, SQL tay) → `RAISE` ở câu chốt. Không bao giờ gỡ được khách khỏi xe đang chạy. Bài: T1, T4, T7.
3. **Báo huỷ đúng lúc tài xế bấm "Đã đón" / "Khách đã huỷ"** cho cùng suất → một bên thắng. Cờ báo huỷ không bao giờ nằm trên suất đã `BOARDED`. Bài: T1, T5.
4. **Tên khách lọt** qua nhật ký `trip_stops_synced` (nơi đón chữ tự do có số điện thoại), qua phản hồi route ghi tên của tài xế, hay qua DTO cứu hộ → không được có. Bài: T6, T14, T15.
5. **Cứu hộ không mở đường vòng về quyền:** Bán hàng không nhập được giá; tài xế không thấy danh sách cứu hộ; khối cứu hộ không đổi luật mốc 6 giờ. Bài: T15.

---

## Bản đồ tệp

| Tệp | Trách nhiệm | Lát |
|---|---|---|
| `migrations/<N>_xe_dang_chay.sql` (mới) | cột mới, LC-04 suất dựng lại, LC-15 mới (ba đường), câu chốt D5.3a, `office_cancel_once`, gieo nhóm `BAO_HUY_DIEM` | A-1 |
| `src/shared/dieu-phoi-kieu.ts` | sự kiện mới, nhãn tiếng Việt | A-1, A-1b |
| `src/shared/chinh-sach-hien-thi.ts` (+ test) | `NHOM_LY_DO_HIEN` thêm `BAO_HUY_DIEM` | A-1 |
| `src/shared/audit-actions.ts` | hai hành động mới (A-1), một (A-1b) | A-1, A-1b |
| `src/modules/van-chuyen/chuyen-repo.ts` | SQL mới (cổng chạy có version, câu báo huỷ, câu chốt, mở rộng câu chèn suất/điểm) | A-1 |
| `src/modules/van-chuyen/dieu-phoi.ts` | `loThemDiemDangChay`, `loBaoHuy`, nhánh `dangChay` của `loCapNhatDiem`; `loBoSungTen` (A-1b) | A-1, A-1b |
| `src/modules/van-chuyen/dieu-phoi-lenh.ts` | `lenhThemDiemDangChay`, `lenhBaoHuy`, nhánh RUNNING của `lenhCapNhatDiem` | A-1 |
| `src/modules/van-chuyen/dieu-phoi-dto.ts`, `src/shared/contracts.ts` | `diem[].themKhiChay`, `suat[].vanPhongBaoHuy`; DTO cứu hộ | A-1, A-1b |
| `src/modules/van-chuyen/index.ts` | route mới | A-1, A-1b |
| `src/shared/permissions.ts`, `permissions.test.ts` | ô `trip.passenger.add` | A-1b |
| `src/modules/orders/chang-hanh-khach-repo.ts`, `orders/index.ts` | câu ghi hành khách do tài xế (chưa chạy) | A-1b |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | câu kiểm định kỳ mới; thay R-ORD-11 | A-1, A-1b |
| `web/chuyen.ts`, `web/cuoc-chuyen.ts`, `web/xe-dang-chay.ts` (mới) + `public/xe-dang-chay.html`, `web/shell.ts`, `web/account.ts`, `src/shared/sw-policy.ts`, `package.json`, `public/app.css` | giao diện theo bản vẽ | A-1, A-1b |

---

# LÁT A-1 (D5) — không phụ thuộc tiền; SAU Đợt 2 + Đợt 3

### Task 0: Đo nền, chốt số, kiểm điều kiện vào

**Files:** chỉ đọc; ghi kết quả vào `docs/superpowers/plans/<ngày>-van-chuyen-dot-5-nhat-ky.md` (mới).

- [ ] **Step 1: Cổng vào.** Đợt 2 (tin báo: `ctx.baoThayDoiChuyen`, `src/shared/tin-chuyen.ts`) và Đợt 3 (khung bận / giờ lái: `KetQuaTaoSua`, `kiemKhungBanMoi`, các trigger mới trên `vc_trip*`) đã gộp `main`. Thiếu một trong hai thì dừng và báo điều phối. Vì sao: T8 nối vào hàm người nhận của Đợt 2; LC-15 dựng lại phải giữ mọi luật Đợt 3 đã thêm.
- [ ] **Step 2: Số migration.** Chạy `ls migrations` và `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh/worktree chưa gộp (lộ trình L2). Ghi `N`.
- [ ] **Step 3:** Kiểm `0042`, `0043` đã áp remote: `npx wrangler d1 migrations list tourdao-sales-db --remote` (lệnh CHỈ ĐỌC). Nếu `0042` CHƯA áp thì dừng, báo điều phối (P1 đổi).
- [ ] **Step 4:** Đo lại mọi `tệp:dòng` của kế hoạch ở HEAD nhận việc và ghi bảng "đo lại" vào nhật ký. Mốc hôm nay: route `…/chuyen/:id/cap-nhat-diem` ở `index.ts:992`, `…/chuyen/:id/ket-thuc-gian-doan` ở `:1386`, `…/chuyen/:id/thu-tu` ở `:1404`, `GET /lich` ở `:804`, `GET /chuyen/:id` ở `:814`. Trước khi dựng lại trigger LC-04 / LC-15: đọc migration MỚI NHẤT chạm `vc_trip_allocation`, `vc_trip_stop` (`grep -ln "vc_trip_allocation\|vc_trip_stop" migrations/*.sql`) để bản dựng lại giữ mọi luật đang có (kể cả của Đợt 1, 3).
- [ ] **Step 5:** Kiểm Đợt 2 đã CHỐT danh sách hành động nhật ký sinh tin chưa (ADR-0052 D6.1 "chốt trước dòng đầu — một chiều"). Có thì dùng ĐÚNG tên đó ở T2, T8. Chưa thì T2 chốt tên `trip_stop_added_running`, `trip_allocation_office_cancelled`, ghi vào nhật ký Đợt 5 VÀ báo người giữ Đợt 2.
- [ ] **Step 6:** Trên `node:sqlite`, thử `ALTER TABLE vc_trip_allocation ADD COLUMN office_cancel_at TEXT CHECK (…ba cột cùng có/vắng…)` để biết SQLite có nhận CHECK nhắc cột khác không. Không nhận thì luật "ba cột cùng có / cùng vắng" chuyển sang trigger `BEFORE UPDATE` (ghi vào nhật ký).
- [ ] **Step 7:** Commit nhật ký: `git commit -m "Đợt 5 xe đang chạy: đo nền, chốt số migration"`.

### Task 1: Migration A-1 — cột, trigger, gieo lý do

**Files:**
- Create: `migrations/<N>_xe_dang_chay.sql`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`)
- Test: `src/modules/van-chuyen/xe-dang-chay-csdl.test.ts` (mới; khung `node:sqlite` như `src/modules/van-chuyen/dieu-phoi.test.ts`)

**Interfaces (DDL — tên cột theo ADR-0052 D5.2, D5.3a):**

```sql
-- cột thêm (không bảng mới ở lát này)
vc_trip_allocation: office_cancel_at TEXT, office_cancel_by TEXT, office_cancel_reason_code TEXT REFERENCES vc_reason(code),   -- ba cột cùng có / cùng vắng (T0 Step 6)
                    opened_cmd_id TEXT, closed_cmd_id TEXT                                                                     -- dấu lệnh D5.3a
vc_trip_stop:       added_while_running INTEGER NOT NULL DEFAULT 0 CHECK (added_while_running IN (0,1))
-- gieo vc_reason (nhóm đã có trong NHOM_LY_DO, dieu-phoi-kieu.ts:14; 0041:107 ghi "chưa gieo") — đúng chữ bản vẽ V11 "Báo huỷ một suất":
--   BAO_HUY_DIEM: "Khách báo không đi", "Khách đổi lịch", "Khách không liên lạc được", "Lý do khác"   (mã chốt lúc viết, khuôn mã của 0041)
```

**Trigger (mỗi cái một tên; câu RAISE có tiền tố mã luật):**

| Tên | Luật | Nguồn |
|---|---|---|
| Bỏ + tạo lại `vc_trip_allocation_identity` (`0042:296-302`, đo lại) | thêm `opened_cmd_id` vào danh sách cột bất biến; `office_cancel_*`, `closed_cmd_id` chỉ đặt một lần | LC-04 |
| `vc_trip_allocation_office_cancel_once` | đặt `office_cancel_*` một lần, chỉ khi `status = 'WAITING'` và suất mở | D5.2 |
| Bỏ + tạo lại `vc_trip_running_locked_alloc_ins` (`0042:529`) | RUNNING: chỉ mở suất khi `added_after_departure = 1` VÀ (sự kiện dấu lệnh hiện hành = `STOP_ADDED_RUNNING` của D5.1, HOẶC `opened_cmd_id` = dấu lệnh và cùng lô đã đóng `STOP_CHANGED` cùng chặng/người) | D5.3 (hai đường mở; đường "đề nghị `CONFIRMED`" thuộc HOÃN) |
| Bỏ + tạo lại `vc_trip_running_locked_alloc_close` (`0042:532`) | RUNNING: chỉ đóng với `TRIP_INTERRUPTED` (giữ nguyên), hoặc `STOP_CHANGED` khi suất `WAITING`, điểm `PENDING`, sự kiện dấu lệnh = `ALLOCATION_STOP_CHANGED`, `closed_cmd_id` = dấu lệnh | D5.3 |
| Bỏ + tạo lại `vc_trip_running_locked_stop_ins` (`0042:539`) | RUNNING: chỉ thêm điểm khi `added_while_running = 1` | D5.3 |
| `vc_trip_stop_changed_balance` (AFTER UPDATE OF version ON vc_trip) | câu chốt D5.3a: với dấu lệnh hiện hành, mỗi (chặng, `passenger_key`) đóng `STOP_CHANGED` = mở cùng dấu lệnh, **cùng `trip_id`**; suất chưa tên đếm riêng theo chặng | D5.3a |

Ghi chú thiết kế: khi D4 được làm (phụ lục HOÃN), ba trigger LC-15 sẽ được bỏ và tạo lại thêm một lần bằng migration mới, để thêm đường `TRANSFERRED` + `transfer_id`. Lát này KHÔNG thêm `transfer_id` "để sẵn".

- [ ] **Step 1: Viết test đỏ** (`xe-dang-chay-csdl.test.ts`), tối thiểu các ca:
  - LC-15 mới: chèn suất vào RUNNING không cờ → RAISE; chèn suất có `added_after_departure = 1` nhưng sự kiện dấu lệnh không phải D5.1 → RAISE; đóng `REMOVED` trên RUNNING → RAISE; đóng `STOP_CHANGED` suất `BOARDED` → RAISE; đóng `STOP_CHANGED` mà không có sự kiện mang dấu lệnh → RAISE; thêm điểm RUNNING không cờ `added_while_running` → RAISE; đổi xe / tài xế RUNNING → RAISE (giữ); lô "Kết thúc gián đoạn" cũ → vẫn được.
  - Câu chốt: lô đúng thứ tự đóng → mở → `UPDATE vc_trip SET version = version WHERE id=? AND last_cmd_id=?` → được; lô bỏ câu mở → RAISE; đóng ở chuyến A, mở ở chuyến B cùng dấu → RAISE; đóng suất chưa tên, mở suất có tên → RAISE; **câu cổng của mọi lệnh khác (`version = version + 1`) KHÔNG bị câu chốt bắt nhầm** (chạy lại một lô xếp / tiến độ cũ → được); mở trước đóng cùng người → UNIQUE LC-01 (ghi rõ thông điệp).
  - `office_cancel_once`: đặt lần hai → RAISE; đặt trên suất `BOARDED` → RAISE; thiếu một trong ba cột → RAISE (CHECK hoặc trigger theo T0 Step 6).
  - Gieo: nhóm `BAO_HUY_DIEM` có đúng 4 dòng đang dùng, nhãn đúng chữ bản vẽ.
- [ ] **Step 2:** `node --test src/modules/van-chuyen/xe-dang-chay-csdl.test.ts` → ĐỎ (cột chưa có).
- [ ] **Step 3:** Viết migration; cập nhật `data-dictionary.json`, `npm run dict`.
- [ ] **Step 4:** Chạy lại → XANH; `npm test` (bài cũ của `0042` và của Đợt 1, 3 vẫn xanh); `npm run db:migrate:local`.
- [ ] **Step 5:** Quan sát chặn thật: bỏ câu chốt → bài "bỏ câu mở" đỏ → hoàn nguyên; bỏ vế `WAITING` ở `office_cancel_once` → bài `BOARDED` đỏ → hoàn nguyên. Ghi ngày + kết quả vào nhật ký.
- [ ] **Step 6:** Commit `"Đợt 5: migration LC-15 mới (ba đường), câu chốt cập nhật điểm, báo huỷ một lần, gieo lý do báo huỷ"`.

### Task 2: Kiểu, nhãn, nhật ký, nhóm lý do hiện

**Files:**
- Modify: `src/shared/dieu-phoi-kieu.ts` (`LOAI_SU_KIEN_CHUYEN` :34 + nhãn; `NHOM_LY_DO` :14 giữ nguyên)
- Modify: `src/shared/audit-actions.ts` (khối `trip_*`, `trip_stops_synced` ở :102)
- Modify: `src/shared/chinh-sach-hien-thi.ts` (`NHOM_LY_DO_HIEN` :177), `src/shared/chinh-sach-hien-thi.test.ts`
- Test: `src/shared/dieu-phoi-kieu.test.ts` (bài có sẵn)

**Interfaces:**

```ts
// dieu-phoi-kieu.ts — LOAI_SU_KIEN_CHUYEN thêm (tên chốt ở T0 Step 5 nếu Đợt 2 đã đặt khác):
//   STOP_ADDED_RUNNING        nhãn "Văn phòng thêm điểm khi xe đang chạy"
//   ALLOCATION_OFFICE_CANCELLED nhãn "Văn phòng báo huỷ khách"
// (ALLOCATION_STOP_CHANGED đã có từ ADR-0050 — đo lại; không thêm trùng)
// chinh-sach-hien-thi.ts
export const NHOM_LY_DO_HIEN: readonly NhomLyDo[] = ["PHA_LE", "HUY_CHUYEN", "KET_THUC_GIAN_DOAN", "BO_QUA_DIEM", "DOI_GIO_XE", "BAO_HUY_DIEM"];
```

**Nhật ký (`audit-actions.ts`, nhóm `trip`):** `trip_stop_added_running` ("Thêm điểm khi xe đang chạy"), `trip_allocation_office_cancelled` ("Văn phòng báo huỷ khách"). `trip_stops_synced` có sẵn và được dùng lại cho D5.3a (detail theo ADR-0052:148, đã che).

- [ ] **Step 1: Test đỏ:** bài nhãn đủ mã (bài có sẵn của `dieu-phoi-kieu.test.ts` tự đỏ khi thêm mã chưa có nhãn); `chinh-sach-hien-thi.test.ts:130` (đo lại) mong `BAO_HUY_DIEM` có trong nhóm luôn hiện, kể cả khi rỗng; `audit-actions` có hai hành động mới, nhóm `trip`.
- [ ] **Step 2:** ĐỎ. **Step 3:** viết. **Step 4:** XANH; `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5: sự kiện và nhật ký thêm điểm / báo huỷ khi xe chạy; hiện nhóm lý do Báo huỷ"`.

### Task 3: SQL + hàm dựng lô (D5)

**Files:**
- Modify: `src/modules/van-chuyen/chuyen-repo.ts` (cạnh `TRIP_GATE_DANG_CHAY` :417)
- Modify: `src/modules/van-chuyen/dieu-phoi.ts` (`NhanCau` :22; `loCapNhatDiem` :261; `congDangChay` :326)
- Test: `src/modules/van-chuyen/thu-tu-lo.test.ts` (`MAU`), `src/modules/van-chuyen/xe-dang-chay-lo.test.ts` (mới)

**Interfaces (SQL — `defineSql("van-chuyen", …)`):**

| Hằng | Việc |
|---|---|
| `TRIP_GATE_DANG_CHAY_VERSION` | cổng chuyến RUNNING có `version` (D5.1, D5.2, D5.3a). Khác `TRIP_GATE_DANG_CHAY` (:417) ở chỗ có kiểm version |
| `ALLOC_OFFICE_CANCEL` | đặt `office_cancel_*` (gác dấu lệnh, `status='WAITING'`, `office_cancel_at IS NULL`) |
| `TRIP_CHOT` | câu chốt `UPDATE vc_trip SET version = version WHERE id = ?1 AND last_cmd_id = ?2` |
| `ALLOC_INSERT` / `ALLOC_CLOSE` mở rộng | thêm `opened_cmd_id`, `closed_cmd_id`; `STOP_INSERT` thêm `added_while_running` |

**Interfaces (hàm dựng lô — `dieu-phoi.ts`):**

```ts
export interface LenhThemDiemDangChay extends LenhChung { tripId: string; version: number; diemMoi: DiemMoi[]; suatMoi: SuatMoi[]; mocXep: { legId: string; ngay: string; gio: string }[];
  manifestMoi: { allocationId: string; passengerRowId: string | null }[]; phaLe: PhaLe | null; policyId: string | null; detail: string }
export function loThemDiemDangChay(db: D1Database, l: LenhThemDiemDangChay): CauCoNhan[];
//   cổng TRIP_GATE_DANG_CHAY_VERSION → nhật ký trip_stop_added_running → sự kiện STOP_ADDED_RUNNING → điểm (added_while_running=1)
//   → suất (added_after_departure=1) → vc_leg_appt_ack XEP khi chặng chưa có (trigger 0043) → manifest
export interface LenhBaoHuy extends LenhChung { tripId: string; version: number; suatId: string; lyDo: string; detail: string }
export function loBaoHuy(db: D1Database, l: LenhBaoHuy): CauCoNhan[];   // D5.2 — chỉ đặt cờ, không đóng suất
// loCapNhatDiem: thêm tham số `dangChay: boolean`. true ⇒ cổng TRIP_GATE_DANG_CHAY_VERSION, suất mở added_after_departure=1, opened/closed_cmd_id = dấu lệnh,
//   điểm mới added_while_running=1, câu TRIP_CHOT đứng CUỐI (nhãn TRANG_THAI_CUOI), KHÔNG bỏ qua điểm (diemBoQua rỗng — khách vẫn trên xe)
```

- [ ] **Step 1: Test đỏ:** dựng trên `MAU` của `thu-tu-lo.test.ts` SAU khi Đợt 2–4 đã gộp (đo lại khoá mẫu, không chép mẫu cũ). Thêm mẫu cho `loThemDiemDangChay` (có / không phá lệ), `loBaoHuy`, nhánh `dangChay` của `loCapNhatDiem`; bài chạy → đỏ vì hàm chưa có. Bài `xe-dang-chay-lo.test.ts` (D1 thật trên `node:sqlite`, gieo chuyến RUNNING): lô thêm điểm → điểm `added_while_running = 1`, suất `added_after_departure = 1`, `version` tăng; lô báo huỷ → cờ đặt, suất vẫn mở và vẫn chiếm chỗ (LC-02 đếm); lô cập nhật điểm RUNNING → đóng/mở cùng dấu, số chỗ không đổi.
- [ ] **Step 2:** `node --test src/modules/van-chuyen/thu-tu-lo.test.ts src/modules/van-chuyen/xe-dang-chay-lo.test.ts` → ĐỎ.
- [ ] **Step 3:** Viết SQL + hàm. Câu chốt `TRIP_CHOT` dùng nhãn `TRANG_THAI_CUOI` (có sẵn :22, luật 4 "đứng cuối, nhiều nhất một"), KHÔNG thêm nhãn mới. Nếu bài thứ tự lô từ chối (câu chốt không phải "trạng thái") thì DỪNG, ghi mục đề xuất luật (T9), không tự nới bài.
- [ ] **Step 4:** XANH; `npm test`, `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5: lô thêm điểm, báo huỷ, cập nhật điểm khi xe đang chạy"`.

### Task 4: Route văn phòng + DTO (D5.1–D5.3a)

**Files:**
- Modify: `src/modules/van-chuyen/index.ts` (khối văn phòng `…/chuyen/:id/*` :814-1040), `src/modules/van-chuyen/dieu-phoi-lenh.ts` (`lenhCapNhatDiem` :279, chặn ở `khongConKeHoach` :30), `src/modules/van-chuyen/dieu-phoi-than.ts` (`docXep` :96), `src/modules/van-chuyen/dieu-phoi-dto.ts` (`lyDoDangDung` :60), `src/shared/contracts.ts` (`ChuyenChiTietResponse` :1288, `CuocChiTietResponse` :1453)
- Test: `src/modules/van-chuyen/xe-dang-chay-route.test.ts` (mới), `tests/e2e/xe-dang-chay.mjs` (mới)

**Route (cổng `office`):**

| Route | Ô | Việc |
|---|---|---|
| `POST /api/van-chuyen/chuyen/:id/them-diem` | `trip.dispatch` (+ `trip.override` khi phá lệ mốc) | Chuyến RUNNING; thân như `docXep` (`chang[].soSuat`). Mốc 6 giờ theo đúng dòng "Xếp" của ADR-0049 D2 (ADR-0052 D5.1: xe đang chạy **luôn** ở trong mốc): chặng đặt gấp thì qua; chặng khác → 409 "Khách không đặt gấp — cần Quản trị phá lệ." trừ khi có `phaLe` + `trip.override`. Số suất thêm ≤ số người của chặng (L-D1) |
| `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy` | `trip.dispatch` | thân `{ requestId, version, lyDo }` (mã thuộc nhóm `BAO_HUY_DIEM`, sai nhóm → 400) |
| `POST /api/van-chuyen/chuyen/:id/cap-nhat-diem` (có sẵn :992) | `trip.dispatch` | Nay chạy cả với RUNNING: chỉ suất `WAITING` ở điểm `PENDING`. Suất khác bị lệch thì bỏ qua, trả `boQua` (số). Không phá lệ thêm |

Mỗi route POST mới gọi `ctx.baoThayDoiChuyen({ tripId, requestId })` ngay trong task này, SAU `if (r) return r` / `if (!r.ok) return r.res`. Bài quét của Đợt 2 (regex `/api/van-chuyen/(chuyen|cuoc-cua-toi)…`) đã phủ `them-diem`, `bao-huy`. `cap-nhat-diem` đã gọi từ Đợt 2.

**DTO (DANH-GIA §4.7, §4.8; bản vẽ V11 11.2, V6 6.1–6.2):**

```ts
// contracts.ts — văn phòng và tài xế dùng CHUNG khoá (một nguồn: dieu-phoi-dto.ts)
DiemChuyenDto   += { themKhiChay: boolean }                                        // added_while_running
SuatChuyenDto   += { vanPhongBaoHuy: { luc: string; lyDoNhan: string } | null }    // office_cancel_*; KHÔNG người bấm ở DTO tài xế
CuocChiTietResponse.diem[] += { themKhiChay: boolean };  CuocChiTietResponse.suat[] += { vanPhongBaoHuy: { luc: string; lyDoNhan: string } | null }
// ChuyenChiTietResponse.lyDo (:1295, đã có, lyDoDangDung) — đảm bảo trả cả nhóm BAO_HUY_DIEM (Bán hàng mở hộp Báo huỷ không cần GET /ly-do cổng admin)
```

```ts
export async function lenhThemDiemDangChay(db: D1Database, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null>;
export async function lenhBaoHuy(db: D1Database, nen: NenChuyen, suatId: string, b: { version: number; requestId: string; lyDo: string }, staff: StaffProfile, bayGioMs: number): Promise<Response | null>;
// lenhCapNhatDiem: nhánh nen.trip.status === "RUNNING" gọi loCapNhatDiem({ ..., dangChay: true })
```

- [ ] **Step 1: Test đỏ** (tiêu chí ADR-0052:243, 246, 247):
  - Thêm điểm: RUNNING, chặng đặt gấp → 200 + `vc_leg_appt_ack` XEP nếu chưa có + manifest dòng `added_after_departure`; chặng thường, Bán hàng → 409 "cần Quản trị phá lệ"; Bán hàng gửi `phaLe` → 403; Quản trị phá lệ có lý do → 200 + sự kiện có `override_rule_code`; chặng quay về "chưa xếp" sau gián đoạn → xử lý như chặng thường; chuyến `PLANNED` → 409 (dùng `phan-bo`); Kế toán → 403; số suất > số người chặng → 400.
  - Báo huỷ: suất vẫn chiếm chỗ (LC-02 đếm); tài xế bấm "Khách đã huỷ" → hết chiếm; báo lần hai → 409 + RAISE; mã lý do ngoài nhóm → 400; Kế toán → 403.
  - Cập nhật điểm RUNNING: suất `WAITING` / điểm `PENDING` → 200, số chỗ không đổi, `detail` của `trip_stops_synced` không chứa `L:`/`T:`/dãy ≥ 8 số; suất `BOARDED` hoặc điểm đã tới → không đổi (`boQua`); SQL tay → RAISE.
  - Văn phòng đóng suất RUNNING qua `…/rut` hay `…/doi` → 409 (giữ) VÀ RAISE.
  - DTO: `GET /chuyen/:id` và `GET /cuoc-cua-toi/:id` có `themKhiChay`, `vanPhongBaoHuy`; DTO tài xế không có người bấm; `lyDo` của chi tiết văn phòng có nhóm `BAO_HUY_DIEM`.
- [ ] **Step 2:** ĐỎ. **Step 3:** viết. **Step 4:** XANH; e2e `tests/e2e/xe-dang-chay.mjs` → `npm run test:e2e -- xe-dang-chay`.
- [ ] **Step 5:** Commit `"Đợt 5: văn phòng thêm điểm, báo huỷ, cập nhật điểm trên xe đang chạy"`.

### Task 5: Chạy đua (Review Focus 1, 3)

**Files:**
- Modify: `tests/e2e/dieu-phoi-chay-dua.mjs` (có sẵn; bài chạy đua ADR-0049 phủ MỘT chuyến)
- Test: `src/modules/van-chuyen/xe-dang-chay-chay-dua.test.ts` (mới; hai lô dựng sẵn chạy xen kẽ trên `node:sqlite`)

- [ ] **Step 1: Viết các ca** (đỏ trước khi T3–T4 xong; nếu viết sau thì quan sát chặn bằng cách bỏ cổng version → đỏ → hoàn nguyên):
  1. Văn phòng `them-diem` và tài xế `ket-thuc` cùng `version` → đúng một 200, một 409 (`stale` / `xe_da_ket_thuc`, câu tiếng Việt). Không có điểm `added_while_running` trên chuyến `ENDED`; audit-invariants sạch.
  2. Văn phòng `bao-huy` và tài xế "Đã đón" cùng suất → một thắng; không có suất `BOARDED` mang `office_cancel_*`.
  3. Văn phòng `cap-nhat-diem` và tài xế "Đã tới" chính điểm cũ → một thắng; không suất đóng `STOP_CHANGED` mà không mở lại.
  4. Văn phòng `them-diem` và tài xế "Kết thúc gián đoạn" → một thắng; nếu gián đoạn thắng thì chặng thêm vẫn "chưa xếp".
- [ ] **Step 2:** chạy → XANH sau T3–T4; `npm run test:e2e -- dieu-phoi-chay-dua`.
- [ ] **Step 3:** Commit `"Đợt 5: bài chạy đua xe đang chạy — thêm điểm khi kết thúc, báo huỷ khi đón"`.

### Task 6: Hàng rào "không lộ" + kiến trúc + cổng ghi

**Files:**
- Modify: `src/hanh-khach-khong-lo-ten.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/route-write-guard.test.ts`, `src/architecture.test.ts`

- [ ] **Step 1:** `hanh-khach-khong-lo-ten.test.ts`: kiểm regex chọn route điều phối đã bắt `them-diem`, `bao-huy` (dưới `/chuyen/`); thiếu thì SIẾT. Thêm ca `trip_stops_synced` với nơi chữ tự do "Nhà riêng gọi 0905123456" + tên mẫu → `audit_log.detail` không chứa dãy số, tên, `L:`/`T:`. Thêm ca nhật ký `trip_allocation_office_cancelled` không chứa tên.
- [ ] **Step 2:** `giay-to-khong-lo-so.test.ts` thêm ca cho route mới; `route-write-guard.test.ts` phủ route ghi mới (cổng `office`).
- [ ] **Step 3:** `architecture.test.ts`: không có cạnh mới (`ALLOWED_EDGES["van-chuyen"]` giữ nguyên); SQL mới qua `defineSql` trong `chuyen-repo.ts`.
- [ ] **Step 4:** Chạy `npm test` → XANH. Quan sát chặn: thêm tạm `nguoiBam` (tên người báo huỷ) vào `vanPhongBaoHuy` của DTO tài xế → bài khoá DTO tài xế đỏ → hoàn nguyên.
- [ ] **Step 5:** Commit `"Đợt 5: hàng rào không lộ tên cho lệnh xe đang chạy"`.

### Task 7: Kiểm định kỳ (audit-invariants) A-1

**Files:** `scripts/audit-checks.mjs` (sau `R-VC-20` :562; đo lại số lớn nhất), `src/audit-invariants.test.ts`

Câu mới (ADR-0052:221, phần thuộc D5; mức `fail`):
- `R-VC-<k+1>`: suất có `office_cancel_*` mà trạng thái lúc đặt không phải `WAITING` (theo sự kiện `ALLOCATION_OFFICE_CANCELLED`);
- `R-VC-<k+2>`: điểm `added_while_running = 1` trên chuyến chưa từng `RUNNING` (`departed_at IS NULL`);
- `R-VC-<k+3>` (lưới thứ hai D5.3a): suất đóng `STOP_CHANGED` trên chuyến có `departed_at` mà không có suất mở cùng chuyến, chặng, `passenger_key` với `opened_cmd_id = closed_cmd_id`.

- [ ] **Step 1:** Test đỏ mỗi câu: ca sạch → 0; ca gieo lỗi (gỡ trigger trong bài) → 1. **Step 2:** viết câu. **Step 3:** XANH; quan sát chặn (bỏ một vế → đỏ → hoàn nguyên). **Step 4:** Commit `"Đợt 5: kiểm định kỳ báo huỷ, điểm thêm khi chạy, cập nhật điểm khi xe chạy"`.

### Task 8: Điểm cắm D6 (tin báo — Đợt 2 sở hữu)

**Files:** `src/shared/tin-chuyen.ts` của Đợt 2: mảng `HANH_DONG_TIN_CHUYEN` (`…-02-tin-bao-chuyen.md:269`), hàm `loaiCho` (`02:290`; nhánh văn phòng `02:299` đã gửi `trip_ended_interrupted` cho người có `trip.dispatch`), `tinChuyenCho`, bảng câu `CAU`; kiểu `LoaiTinChuyen`; bài `src/shared/tin-chuyen.test.ts`. Route mới đã gọi hàm tiêm ở T4, T14; task này KHÔNG thêm lời gọi.

Nối thêm vào `HANH_DONG_TIN_CHUYEN` (tên chốt ở T2): `trip_stop_added_running`, `trip_allocation_office_cancelled`, `trip_stops_synced` (chỉ khi chuyến RUNNING lúc sự kiện; `DongChuyen` cần cờ trạng thái lúc sự kiện, hoặc dùng `laiLucSuKien` + chuyến đã xuất bến; chốt khi nhận). A-1b thêm `trip_passenger_named` nhưng chỉ ghi nhật ký, không gửi tin, nên KHÔNG thêm vào mảng. Mỗi hành động: một nhánh trong `loaiCho` + một giá trị `LoaiTinChuyen` mới (vd `xe_chay_doi`) + một dòng `CAU`. Câu tin theo bản vẽ V6 6.1: "Văn phòng vừa thêm điểm — Điểm N · <nơi đã che> · <giờ đón> · N khách" (giờ đón + tổng khách, KHÔNG tách người lớn/trẻ em) `[chờ chủ xác nhận câu 5.3 — đang theo khuyến nghị]`.

| Hành động | Người nhận (ADR-0052:157-160) |
|---|---|
| `trip_stop_added_running`, `trip_allocation_office_cancelled`, `trip_stops_synced` (chuyến RUNNING) | tài xế có dòng lái mở lúc sự kiện |

- [ ] **Step 1:** Test đỏ trong `tin-chuyen.test.ts` (thêm ca vào bài có sẵn của Đợt 2, không dựng bộ bài mới): mỗi hành động mới tới đúng tài xế đang lái; tài xế bị gỡ trước sự kiện không nhận; Bán hàng không nhận; tin không chứa tên / SĐT; `trip_stops_synced` trên chuyến `PLANNED` → không ai nhận tin (giữ như Đợt 2). Ca "chỉ `DRIVER_PARTNER` không nhận gì" DÙNG bài có sẵn (`02:152`), chỉ thêm `dong({ action: "trip_stop_added_running" })`. **Step 2–4:** viết, XANH. **Step 5:** Commit `"Đợt 5: nối tin báo cho thay đổi khi xe đang chạy"`.

### Task 9: Đề xuất luật A-1 (nếu cần) + sổ hàng rào + tài liệu + nhật ký phiên bản

**Files:**
- Create (CHỈ khi T3 Step 3 buộc phải có): `docs/superpowers/plans/<ngày>-adr-0052-a1-de-xuat-luat.md` (khuôn `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md`)
- Modify: `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`

**Đề xuất luật A-1:** lát D5 **không** thêm ô cho tài xế, nên không nới ghim `DRIVER`. Mục duy nhất có thể cần là ngoại lệ bài thứ tự lô cho câu chốt (T3 Step 3). Không cần thì không tạo tệp. T0 đã grep: `src/CLAUDE.md`, `CLAUDE.md`, `docs/SYSTEM-DESIGN.md` không có câu "chuyến đang chạy khoá hẳn"; đo lại lúc nhận, có thì thêm mục sửa câu đó.

**Sổ hàng rào (mỗi dòng: chặn gì — cơ chế — ngày thấy chặn thật ở T1/T6/T7):** LC-15 mới (ba trigger dựng lại); câu chốt D5.3a; `office_cancel_once`; bài khoá DTO tài xế (`vanPhongBaoHuy` không người bấm); bài chạy đua (T5); ba câu `R-VC` mới.

- [ ] **Step 1:** (nếu cần) soạn tệp đề xuất; không tự nới bài trước khi chủ duyệt (để nhãn "CHỜ CHỦ DUYỆT" trên nhánh như tiền lệ ADR-0049).
- [ ] **Step 2:** Dòng sổ hàng rào; `SYSTEM-DESIGN.md` §5/§6/§7; `CHANGE-GUIDE.md` (công thức z3: ba đường LC-15, thứ tự lô đóng → mở → chốt, bẫy "mở trước đóng = UNIQUE LC-01", ghi rõ "D4 sẽ dựng lại LC-15 thêm một lần").
- [ ] **Step 3:** Mục `changelog.ts` (lời thường: "Văn phòng thêm điểm đón, báo huỷ khách khi xe đang chạy; trang Xe đang chạy"), số phiên bản theo L2; `app-info.test.ts`.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` → xanh/0. Commit từng tệp tài liệu.

### Task 10: Giao diện A-1 — theo bản vẽ đã nhận (V11, thẻ V6)

**Bản vẽ:** `docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html`, mục **V11 — Văn phòng: Xe đang chạy** (5 bảng) và **V6 bổ sung** (bảng 6.1, 6.2, 6.5). Làm đúng 100% phần bề mặt (bố cục, chữ, tone chip, thứ tự khối). Chỗ lệch ADR sửa theo dưới đây.

**Files:**
- Create: `web/xe-dang-chay.ts`, `public/xe-dang-chay.html` (công thức c của `docs/CHANGE-GUIDE.md`: khai `PAGES` ở `src/shared/sw-policy.ts`, script `build:web` ở `package.json`, mục menu ở `web/shell.ts` + `web/account.ts`)
- Modify: `web/chuyen.ts` (chi tiết chuyến văn phòng), `web/cuoc-chuyen.ts` (màn chuyến tài xế), `web/dieu-phoi-ui.ts` (dùng lại `moPhaLe` :110), `web/ly-do-dieu-phoi.ts` (nhóm mới tự hiện qua `NHOM_LY_DO_HIEN`), `public/app.css` (chỉ token)

**Màn và ẩn/hiện:**

| Bảng vẽ | Làm | Ẩn/hiện (`can()` — `src/giao-dien-hoi-bang-quyen.test.ts`) |
|---|---|---|
| 11.1 mục menu "Xe đang chạy" + trang danh sách | trang lọc chuyến `RUNNING` trong ngày, dùng `GET /api/van-chuyen/lich?ngay=` (`index.ts:804`), mỗi thẻ "mã · Đang chạy · biển số · x/y chỗ" mở `web/chuyen.ts`. Giữ tên mục "Điều phối xe" đang có (`shell.ts`); chỉ thêm mục mới | `trip.view` |
| 11.2 "Khách đang chờ" + link "Báo huỷ"; dòng đã báo huỷ: chip "Văn phòng đã báo huỷ" + câu "Vẫn chiếm chỗ cho đến khi tài xế xác nhận" | đọc `suat[].vanPhongBaoHuy` | link: `trip.dispatch` VÀ suất `WAITING` chưa báo huỷ |
| 11.3 "Việc của văn phòng": "Thêm điểm đón / thêm khách" | nút mở form 11.4. Nút "Cứu hộ" thuộc A-1b (T16), ở A-1 KHÔNG dựng (không để nút chết) | `trip.dispatch` |
| 11.4 form thêm: Chặng chờ xếp, Điểm đón (chữ chỉ đọc, suy từ chặng), Số khách (≤ số người chặng); nút "Thêm vào chuyến" | **Theo ADR D5.1, không theo bản vẽ:** bỏ nút "Xin Quản trị phá lệ" và câu "mốc 30 phút trước giờ tới". Chặng không đặt gấp: Bán hàng thấy dòng khoá "Khách không đặt gấp — cần Quản trị phá lệ." (khuôn `dieu-phoi-man.ts`); Quản trị / Toàn quyền thấy hộp `moPhaLe` chọn lý do nhóm `PHA_LE`, không ô ghi chú (chủ chốt Q1) | form: `trip.dispatch`; hộp phá lệ: `trip.override` |
| 11.5 hộp "Báo huỷ một suất": 4 lý do, chú "Thẻ vẫn chiếm chỗ…", nút Báo huỷ / Quay lại; không ô chữ | lý do lấy từ `ChuyenChiTietResponse.lyDo` nhóm `BAO_HUY_DIEM` (T4) | `trip.dispatch` |
| 11.6 (bản vẽ thiếu) | (1) nút có sẵn "Cập nhật điểm theo đơn" (`web/chuyen.ts:92`, gọi :429) hiện cả trên chuyến RUNNING + câu kết quả "Đã cập nhật N · bỏ qua M khách đã lên xe / điểm đã tới"; (2) Kế toán: chỉ xem, không có khối "Việc của văn phòng"; (3) 409 "Xe vừa kết thúc — tải lại" (banner 409 chung) | (1) `trip.dispatch` |
| 6.1 dải "Văn phòng vừa thêm điểm — Điểm N · nơi · giờ · N khách" (màn tài xế) | tính từ `diem[].themKhiChay` + thời điểm xem trước (máy khách nhớ), không bảng mới. Chỉ giờ đón + tổng khách, không tách người lớn/trẻ em `[chờ chủ xác nhận câu 5.3 — đang theo khuyến nghị]` | tài xế đang lái (`trip.view` assigned) |
| 6.2 chip trên điểm: "Mới thêm"; "Văn phòng đã báo huỷ — vẫn tới điểm" | báo huỷ là **theo suất** (D5.2): khi chỉ một phần khách của điểm bị báo huỷ thì hiện "1/2 khách văn phòng đã báo huỷ — vẫn tới điểm". Nút "Khách đã huỷ" của tài xế giữ như cũ | như trên |
| 6.5 (bản vẽ thiếu) tin "Đổi điểm đón X → Y" | dùng khuôn dải 6.1 khi điểm của suất `WAITING` đổi do D5.3a | như trên |

**Ánh xạ token (DANH-GIA §5):** màu dùng đúng token cùng tên ở `public/app.css` (`--c-primary`, `--c-primary-soft`, `--c-green-*`, `--c-sand-*`, `--c-danger-*`, `--c-accent`); tone "end" `#E6EDF3` → `.dp-chip-muted` (`--c-surface-alt`), KHÔNG thêm màu; độ đậm dùng `--fw-semibold`/`--fw-bold`, không viết 700/800; ô gõ giữ `--h-field` (52px), nút dùng `--tap-min`; cỡ chữ theo `--fs-step-N`; nền thanh bên theo quyết định chung của câu 4.5 (Đợt 4), không tự đổi ở đây. Viền 2px của thẻ nổi và cột 340px chỉ thêm token mới ở nhóm "Riêng của Tour Đảo Booking" nếu thật sự dùng.

- [ ] **Step 1:** Dựng từng màn theo bảng trên; không `innerHTML`; ô gõ 16px.
- [ ] **Step 2:** Kịch bản Chrome 390 + 1040 theo bảng `web/CLAUDE.md` "Sửa tệp nào…": `chuyen-smoke.mjs`, `cuoc-smoke.mjs`, `dieu-phoi-smoke.mjs`, `trang-chu-smoke.mjs` (đếm mục thanh bên), `chinh-sach-dieu-phoi-smoke.mjs` (nhóm lý do mới), cộng kịch bản mới `xe-dang-chay-smoke.mjs`. Ảnh vào `docs/evidence/`. Tài khoản tài xế mở SAU CÙNG (chung cookie).
- [ ] **Step 3:** Commit theo màn.

### Task 11: Kiểm độc lập A-1 + nhật ký

- [ ] **Step 1:** Gọi `nguoi-kiem-doc-lap` (chỉ đọc) với ADR-0052, kế hoạch này và nhánh. Trọng tâm: "Điểm cho người kiểm soi kỹ" ADR-0052:277-283 (mục 2–4), Review Focus 1–4, và việc LC-15 chỉ mở đúng ba đường.
- [ ] **Step 2:** Ghi kết quả vào nhật ký thi công Đợt 5. Chỉ báo "đạt" dựa trên báo cáo + test.
- [ ] **Step 3:** Đưa chủ lệnh `npm run day-len -- <nhánh>` và `npm run trien-khai` (đổi app nên cần triển khai). Không tự chạy.

---

# LÁT A-1b (D5b + D5c đơn giản) — CHỈ SAU Đợt 4 T2 (và sau A-1)

### Task 12: Cổng vào A-1b + trang ghép thi công D5b

**Files:**
- Create: `docs/superpowers/specs/<ngày>-trang-ghep-d5b-tai-xe-ghi-hanh-khach.md`

- [ ] **Step 1: Cổng vào (dừng nếu thiếu):** A-1 đã lên `main`. Đợt 4 T2 đã lên `main`: có cổng xuất bến `THIEU_GIA`, ô `transport.cost.adjust`, route `POST …/chuyen/:id/chi-phi/gia-thoa-thuan` (`grep -n "THIEU_GIA\|transport.cost.adjust\|gia-thoa-thuan" src/shared/*.ts src/modules/van-chuyen/index.ts`). Thiếu thì dừng, báo điều phối (ADR-0052:135).
- [ ] **Step 2: Trang ghép** (CLAUDE.md §9 — đường ghi MỚI vào bảng của `orders`; bảng dùng chung nhận người ghi mới). Ba phần bắt buộc, đo trên mã THẬT lúc đó (dựa trang ghép quyết định `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md` §(1)–(3), không chép lại):
  1. `ord_passenger` chứa loại thực thể nào (một loại: khách của đơn; `source` ∈ OFFICE, DRIVER — cùng thực thể, khác người nhập); ai đọc dòng DRIVER (mọi người xem được đơn; tài xế qua DTO chuyến trong ngày chạy).
  2. Mọi dòng bản đồ quyền chạm `ord_passenger`: `order.view`, `order.passenger.write`, `contact.view`, `trip.view`, `trip.passenger.add` (mới) — đủ 10 cột, áp cho loại nào.
  3. Cổng nào canh cửa nào: route tài xế (cổng `staff`, `can(trip.passenger.add, {assigned})` + `trongNgayChay` + đơn có chặng trên chuyến mình); câu ghi của `orders` (không tự kiểm quyền, chỉ gọi sau `can`, bài `orders-cong-bo.test.ts`); trigger `ord_passenger_frozen_update` (`0035`), LC-10 (gắn tên đúng đơn); **chỗ giao diện ẩn/hiện** nút "Bổ sung tên" (`web/cuoc-chuyen.ts`) và màn đơn hiện dòng tài xế nhập; R-ORD-11 đổi nghĩa (T14).
  - Mỗi lượt duyệt ≤ 3 quyết định: trang ghép đi CÙNG tệp đề xuất A-1b (T16).
- [ ] **Step 3:** Commit `"Đợt 5 A-1b: trang ghép đường ghi hành khách của tài xế"`.

### Task 13: Hàm công bố mới của `orders` — câu ghi hành khách do tài xế (chưa chạy)

**Files:**
- Modify: `src/modules/orders/chang-hanh-khach-repo.ts` (tệp DUY NHẤT được nhắc `full_name` — `src/CLAUDE.md`; khuôn `legInsertGuarded`), `src/modules/orders/index.ts` (xuất), `src/orders-cong-bo.test.ts` (thêm vào danh sách hàm hẹp chỉ gọi sau `can`), `src/modules/orders/ham-cong-bo.test.ts`
- Test: `src/modules/orders/hanh-khach-tai-xe.test.ts` (mới)

**Interfaces:**

```ts
// orders/index.ts — KHÔNG tự kiểm quyền; nơi gọi đứng sau can(trip.passenger.add, { assigned }) + trongNgayChay
export interface HanhKhachTaiXeVao { id: string; orderId: string; fullName: string; birthYear: number; paxCode: "adult"|"child"|"senior"|"infant"|null; at: string; by: string }
export function cauThemHanhKhachTaiXe(db: D1Database, v: HanhKhachTaiXeVao, auditId: string): D1PreparedStatement;
//  INSERT ord_passenger (…, person_key = id, previous_id NULL, source = 'DRIVER') SELECT … WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?auditId)
//  AND đơn đã xác nhận, chưa huỷ AND số người hiện hành của đơn < số khách hiệu lực (không thêm quá số khách — L-A1)
export function kiemHanhKhachTaiXe(body: unknown, namNay: number): { ok: true; value: Omit<HanhKhachTaiXeVao, "id"|"orderId"|"at"|"by"> } | { ok: false; message: string }; // dùng src/shared/hanh-khach.ts
```

- [ ] **Step 1: Test đỏ:** câu chèn đúng `source = 'DRIVER'`, `person_key = id`; không có dòng nhật ký `auditId` → 0 dòng; đơn nháp / huỷ → 0 dòng; đủ người → 0 dòng; `orders-cong-bo.test.ts` bắt nơi gọi `cauThemHanhKhachTaiXe` ngoài thân route sau `can(` → đỏ (thử bằng tệp mẫu); câu SQL không nhắc `vc_` (bài EXPLAIN ranh giới).
- [ ] **Step 2–4:** ĐỎ → viết → XANH, `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5 A-1b: câu ghi hành khách do tài xế nhập (orders cấp, chưa chạy)"`.

### Task 14: Ô `trip.passenger.add` + route tài xế bổ sung tên + thay R-ORD-11 (D5b)

**Files:**
- Modify: `src/shared/permissions.ts` (:169-179), `src/shared/permissions.test.ts` (bảng :26-29; ghim DRIVER :311-334; ghim DRIVER_PARTNER sau :337), `src/modules/van-chuyen/dieu-phoi.ts` (+ `loBoSungTen`), `src/modules/van-chuyen/index.ts` (khối `cuoc-cua-toi` :1044-1257), `src/modules/van-chuyen/thu-tu-lo.test.ts`, `src/hanh-khach-khong-lo-ten.test.ts`, `scripts/audit-checks.mjs` (R-ORD-11 :772), `src/audit-invariants.test.ts`
- Test: `src/modules/van-chuyen/bo-sung-ten.test.ts` (mới), `tests/e2e/tai-xe-cuoc.mjs` (thêm ca)

**Kiểu + nhật ký thêm ở lát này:** `LOAI_SU_KIEN_CHUYEN` thêm `PASSENGER_NAMED` (nhãn "Tài xế bổ sung tên khách"); `audit-actions.ts` thêm `trip_passenger_named` (detail: mã chuyến, mã đơn, số người — không tên). Đối chiếu danh sách Đợt 2 như T0 Step 5.

**Ô quyền (cột theo thứ tự `row(SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR)`):** `"trip.passenger.add": row("none","none","none","none","none","any","none","assigned","none","none")`. SALES `none` (ĐP13), ADMIN `none` (không có route văn phòng). Ghim DRIVER thêm `assigned` (NỚI — chờ duyệt T16); ghim DRIVER_PARTNER `none` (Đợt 6 mới mở theo ADR-0053).

**Route:** `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` (cổng `staff`), thân `{ requestId, suatId, fullName, birthYear, paxCode }`. `paxCode` được null; giao diện gửi loại của suất nếu có (bản vẽ không có ô loại khách). Thứ tự: `can(trip.passenger.add, {assigned})` → chuyến mình đang lái → `trongNgayChay` → suất chưa tên, mở, đúng chuyến → đơn của chặng. Ngoài phạm vi → 404; suất đã có tên → 409. Phản hồi chỉ `{ ok, soNguoi }`, KHÔNG tên. Gọi `ctx.baoThayDoiChuyen({ tripId, requestId })` sau lô thành công ngay trong task này (bài quét Đợt 2 bắt route `cuoc-cua-toi`).

```ts
export interface LenhBoSungTen extends LenhChung { tripId: string; suatId: string; hanhKhach: D1PreparedStatement /* từ cauThemHanhKhachTaiXe */; personKey: string; maDon: string; detail: string }
export function loBoSungTen(db: D1Database, l: LenhBoSungTen): CauCoNhan[];
//  cổng TRIP_GATE_DANG_CHAY (hoặc cổng PLANNED nếu trong ngày chạy chưa xuất bến) → nhật ký trip_passenger_named → sự kiện PASSENGER_NAMED
//  → câu orders (nhãn GHI_NGOAI — gác bằng id nhật ký, không last_cmd_id) → ALLOC_GAN_TEN (chuyen-repo.ts:457) → manifest dòng mới nếu đã xuất bến
```

- [ ] **Step 1: Test đỏ** (ADR-0052:249): đơn không có trên chuyến mình → 404; ngoài ngày chạy → 404; tên thêm có `source='DRIVER'`, gắn đúng suất chưa tên, đúng chặng; suất đã có tên → 409; Bán hàng, Quản trị gọi → 403; nhật ký có số người, mã chuyến, mã đơn, không có tên/năm sinh; bài ghim DRIVER có ĐÚNG **3** ô `assigned` (`trip.view`, `trip.progress`, `trip.passenger.add`); `thu-tu-lo.test.ts` có mẫu `loBoSungTen`; bài "mỗi ô được máy chủ hỏi" thấy `trip.passenger.add`.
- [ ] **Step 2: Bài thứ tự lô** — luật (3) đòi mọi câu sau nhật ký gác `last_cmd_id`; câu của `orders` gác id nhật ký (P7). Thêm ngoại lệ HẸP có tên (khuôn `HO_LENH_MOC`): chỉ hàm `loBoSungTen`, chỉ nhãn `GHI_NGOAI`, chỉ khi câu chứa `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với tham số = dấu lệnh. Đây là NỚI nên để nhãn "CHỜ CHỦ DUYỆT", mục 2 tệp đề xuất A-1b.
- [ ] **Step 3: R-ORD-11** hôm nay `fail` khi CÓ dòng `source='DRIVER'` (`scripts/audit-checks.mjs:772`; sổ `docs/SO-HANG-RAO.md:250`), nên dòng đầu tiên tài xế nhập sẽ làm kiểm định kỳ đỏ. Thay vế DRIVER bằng: "dòng `source='DRIVER'` không có sự kiện `PASSENGER_NAMED` + suất mang `passenger_key` đó trên chuyến tương ứng" (ADR-0052:221). Đổi nghĩa câu kiểm đã ghim là NỚI, nên thành mục 3 tệp đề xuất A-1b; viết lại dòng sổ :250 sau khi duyệt. Test: dòng DRIVER có sự kiện → 0; dòng DRIVER mồ côi → 1.
- [ ] **Step 4:** `hanh-khach-khong-lo-ten.test.ts`: route ghi tên nằm dưới `cuoc-cua-toi` (đã phủ); thêm ca phản hồi không chứa tên vừa gửi.
- [ ] **Step 5:** XANH; e2e; commit `"Đợt 5 A-1b: tài xế bổ sung tên khách chưa có tên (trip.passenger.add)"`.

### Task 15: Cứu hộ đơn giản (D5c) — route đọc cho văn phòng

`[chờ chủ xác nhận câu 5.2b — đang theo khuyến nghị]`: danh sách chỉ gồm xe có tài xế dùng app; xe nhà xe đi đường "Tạo chuyến cứu hộ" (chuyến mới); ô giá thoả thuận chỉ hiện cho Quản trị / Kế toán / Toàn quyền.

**Luồng (ADR-0052:133 — không lệnh ghi mới):**
1. Tài xế xe hỏng bấm **Kết thúc gián đoạn** (có sẵn, `cuoc-cua-toi/:id/ket-thuc-gian-doan` :1214), hoặc văn phòng bấm thay (`chuyen/:id/ket-thuc-gian-doan` :1386, ô `trip.progress`). Chặng về "chưa xếp"; người có `trip.dispatch` nhận tin `gian_doan` (Đợt 2, `02:299`).
2. Văn phòng mở chi tiết chuyến hỏng, bấm **"Tạo chuyến cứu hộ"**. Khối hiện các chặng của chuyến hỏng còn "chưa xếp" và hai cách:
   - (a) **Thêm vào xe cùng ngày có tài xế dùng app** (P9): chuyến `RUNNING` dùng `POST …/chuyen/:id/them-diem` (T4), chuyến `PLANNED` dùng `POST …/chuyen/:id/phan-bo` có sẵn (:899);
   - (b) **Tạo chuyến mới** bằng `POST /api/van-chuyen/chuyen` có sẵn (:823), chọn xe công ty hoặc xe nhà xe, rồi xếp các chặng bằng `phan-bo`. Với xe nhà xe: bước **"Nhập giá thoả thuận"** đứng ngay cạnh, gọi `POST …/chuyen/:id/chi-phi/gia-thoa-thuan` của Đợt 4 (thân theo Đợt 4 — đo lại `rented`, `phienBanChiPhi`), chỉ hiện khi `can(staff, "transport.cost.adjust")`. Người không có ô này thấy dòng "Xe nhà xe cần Quản trị / Kế toán nhập giá trước khi xuất bến". Xuất bến khi thiếu giá vẫn bị cổng `THIEU_GIA` chặn, không phá lệ.
3. Mốc 6 giờ giữ nguyên: chặng không đặt gấp thì Bán hàng gặp dòng khoá "cần Quản trị phá lệ" (ADR-0052:133 "Quản trị / Toàn quyền phá lệ mốc kèm lý do, như lượt 1"). Khối cứu hộ KHÔNG nới luật mốc.
4. Kế toán không có `trip.dispatch` nên không thấy khối cứu hộ. Kế toán nhập giá ở khối Chi phí chuyến của Đợt 4 trên trang chi tiết chuyến cứu hộ mới.

**Files:** `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/dieu-phoi-doc.ts` (dùng `taiXeChoDieuPhoi` qua `docChung`, lời gọi ở :30), `src/modules/van-chuyen/dieu-phoi-dto.ts`, `src/shared/contracts.ts`; test `src/modules/van-chuyen/cuu-ho.test.ts` (mới), `tests/e2e/cuu-ho.mjs` (mới).

**Route (cổng `office`):**

| Route | Ô | Trả |
|---|---|---|
| `GET /api/van-chuyen/chuyen/:id/cuu-ho` | `trip.dispatch` | chuyến `:id` phải là `ENDED_INTERRUPTED` (khác → 409 "Chỉ tạo chuyến cứu hộ sau khi xe đã Kết thúc gián đoạn"); không có → 404 |

```ts
// contracts.ts — DTO KHÔNG tên khách, KHÔNG SĐT, KHÔNG mã đơn khách; văn phòng thấy tên tài xế (đã thấy ở bảng điều phối)
export interface CuuHoResponse {
  chuyenHong: { id: string; ma: string; ngay: string; soKhachCanChuyen: number };
  changChoXep: { legId: string; soNguoi: number; noiDon: string /* nhãn đã che */; gioHen: string | null; datGap: boolean }[];
  //   = chặng có suất đóng TRIP_INTERRUPTED trên :id VÀ hiện không có suất mở nào (suy từ dữ liệu có sẵn — KHÔNG thêm cột "cứu từ chuyến")
  xeNhan: { tripId: string; maChuyen: string; trangThai: "PLANNED" | "RUNNING"; tenTaiXe: string; choTrong: number; diemSapToi: string | null /* "nơi · giờ" */ }[]; // P9: chỉ tài xế CONG_TY; không có dòng nhà xe
}
```

- [ ] **Step 1: Test đỏ** (ADR-0052:245 tiêu chí 6c; tiêu chí 9 phần "đường lượt 1"):
  - chuyến `RUNNING` / `PLANNED` → 409; chuyến `ENDED_INTERRUPTED` → 200, `changChoXep` đúng các chặng vừa về "chưa xếp" (chặng đã xếp lại sang xe khác thì không còn);
  - `xeNhan` chỉ chuyến cùng ngày `PLANNED`/`RUNNING`, có dòng lái mở, tài xế `CONG_TY`; không có chuyến hỏng; không có chuyến tài xế nhà xe;
  - Kế toán → 403; tài xế gọi qua cổng `staff` → 403/404;
  - bài khoá DTO: `Object.keys` của mỗi phần tử đúng như interface; không có `fullName`/`birthYear`/SĐT/`maDon`;
  - e2e `cuu-ho.mjs`: gián đoạn → tạo chuyến xe nhà xe → xếp chặng đặt gấp → xuất bến 409 `THIEU_GIA` → Quản trị phá lệ vẫn 409 → Kế toán nhập giá thoả thuận → xuất bến 200; nhánh (a): thêm chặng vào chuyến `RUNNING` có tài xế công ty → 200 (đi qua T4); Bán hàng gọi route giá → 403.
- [ ] **Step 2–4:** ĐỎ → viết → XANH. Route GET không gọi `baoThayDoiChuyen`.
- [ ] **Step 5:** Commit `"Đợt 5 A-1b: cứu hộ đơn giản — văn phòng xem chặng cần chuyển và xe nhận"`.

### Task 16: Đề xuất luật A-1b + sổ + giao diện + kiểm độc lập

**Files:** `docs/superpowers/plans/<ngày>-adr-0052-a1b-de-xuat-luat.md` (mới, khuôn như T9), `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, `web/cuoc-chuyen.ts` (V6: "Suất của khách", form "Bổ sung tên"; câu hướng dẫn cứu hộ), `web/chuyen.ts` (khối "Cứu hộ" + bước "Nhập giá thoả thuận").

**Mục đề xuất A-1b (3 — đúng trần):** (1) ghim DRIVER thêm `trip.passenger.add: assigned` + sửa `src/CLAUDE.md:22` ("Quyền `DRIVER` … chỉ có `trip.view`, `trip.progress`" → thêm `trip.passenger.add`); (2) ngoại lệ `GHI_NGOAI` ở bài thứ tự lô (T14 Step 2); (3) đổi nghĩa R-ORD-11 + dòng sổ :250 (T14 Step 3). Kèm trang ghép T12.

**Giao diện theo bản vẽ** (`docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html`):

| Bảng vẽ | Làm | Ẩn/hiện |
|---|---|---|
| V6 6.3 "Suất của khách": "Suất N · Điểm · Đã có tên/Chưa có tên", chip Đủ tên/Thiếu tên, link "Bổ sung tên" | không hiện tên | link: `can(staff,"trip.passenger.add",{assigned})` VÀ suất mở chưa tên VÀ `trongNgayChay` |
| V6 6.4 form "Bổ sung tên — Suất N": Họ tên*, Năm sinh*; Lưu / Đóng; banner 409 | **Theo ADR D5b:** câu "Nhập khi khách đã lên xe." đổi thành "Nhập tên cho khách chưa có tên trong đơn."; ô 16px; không có ô loại khách (gửi loại của suất hoặc null); sau Lưu thì đọc lại `GET cuoc-cua-toi/:id` | như trên |
| 11.3 nút "Cứu hộ" (danger) ở "Việc của văn phòng" trên chuyến **đang chạy** | Đặt đúng chỗ bản vẽ. Bấm thì mở hộp "Kết thúc gián đoạn" bấm thay có sẵn (`web/chuyen.ts:301`, route :1386, nhóm lý do `KET_THUC_GIAN_DOAN`), thêm một dòng giải thích "Xe hỏng: kết thúc gián đoạn rồi xếp khách sang xe cứu hộ". Thành công thì chuyển thẳng sang khối cứu hộ CH.2. Trên chuyến đã `ENDED_INTERRUPTED` thì khối CH.2 hiện luôn (nút "Tạo chuyến cứu hộ") | nút trên xe chạy: `trip.progress` VÀ `trip.dispatch` (Bán hàng, Quản trị, Toàn quyền; Kế toán không có cả hai); khối trên chuyến đã gián đoạn: `trip.dispatch` |
| CH.2 văn phòng "Cứu hộ <mã> · N khách cần chuyển" + danh sách xe + form "Nhập giá thoả thuận" (Số tiền, Ghi chú thoả thuận), Lưu giá | **Theo khuyến nghị 5.2b:** danh sách lấy từ `GET …/cuu-ho` (T15), bỏ km (không có dữ liệu đường đi) và bỏ dòng "Xe nhà xe … · cần giá thoả thuận" trong danh sách. Xe nhà xe nằm ở nhánh "Tạo chuyến mới"; form giá đứng cạnh nhánh đó; ô "Ghi chú thoả thuận" theo trường của Đợt 4 | khối: `trip.dispatch`; form giá: `transport.cost.adjust` |
| CH.1 banner tài xế "Xe hỏng — chuyển khách … Văn phòng sẽ được báo ngay" | Lát này tài xế KHÔNG chọn xe cứu hộ (đó là D4, thuộc HOÃN). Chỉ đặt một dòng hướng dẫn trong hộp "Kết thúc gián đoạn" có sẵn (`web/cuoc-chuyen.ts:191`): "Xe hỏng? Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ." Câu này đúng vì Đợt 2 gửi tin `trip_ended_interrupted` cho người có `trip.dispatch` (`02:299`) `[chờ chủ xác nhận câu 5.2c — đang theo khuyến nghị]` | tài xế đang lái |

- [ ] **Step 1:** Soạn tệp đề xuất + dòng sổ (bài quét "nơi gọi `cauThemHanhKhachTaiXe` đứng sau `can(trip.passenger.add)`", ngoại lệ GHI_NGOAI, R-ORD-11 mới, bài khoá `CuuHoResponse` — mỗi dòng có ngày thấy chặn thật).
- [ ] **Step 2:** Giao diện theo bảng; Chrome 390 + 1040 (`cuoc-smoke.mjs`, `chuyen-smoke.mjs`, `cap-nhat-khach-smoke.mjs`, kịch bản mới `cuu-ho-smoke.mjs`); ảnh vào `docs/evidence/`.
- [ ] **Step 3:** `npm test`, typecheck, e2e đủ bộ, audit local; changelog ("Tài xế bổ sung tên khách chưa có tên; văn phòng tạo chuyến cứu hộ").
- [ ] **Step 4:** `nguoi-kiem-doc-lap` chỉ đọc; ghi nhật ký; đưa chủ `day-len` + `trien-khai`.

---

## Cần chủ (chỉ câu đang mở — mã câu chung ở `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`)

1. **Câu 5.2b** (tiền/quyền): cứu hộ, danh sách chỉ xe có tài xế dùng app; xe nhà xe đi "Tạo chuyến cứu hộ"; ô giá chỉ Quản trị / Kế toán / Toàn quyền. Kế hoạch đang theo khuyến nghị (T15, T16). Cần trả lời trước khi nhận A-1b.
2. **Câu 5.2c** (chữ): câu tài xế thấy khi xe hỏng. Lát này đổi thành "Bấm Kết thúc gián đoạn — văn phòng nhận tin ngay và xếp xe cứu hộ" (T16).
3. **Câu 5.3** (dữ liệu tài xế thấy): giờ đón + tổng khách, không tách người lớn/trẻ em (T8, T10).
4. **Duyệt tệp đề xuất luật A-1b** (lúc thi công, không hỏi bây giờ): nới ghim tài xế ("bổ sung tên"), sửa `src/CLAUDE.md:22`, ngoại lệ hẹp cho câu ghi tên khách, đổi nghĩa R-ORD-11. A-1 chỉ cần tệp đề xuất nếu T3 Step 3 vướng.

## Điều chưa chắc

- **Nơi gặp xe cứu hộ:** khi xếp lại chặng sau gián đoạn, điểm đón sinh từ nơi đón **gốc** của chặng (khách sạn), không phải chỗ xe hỏng. Bản đơn giản không có cột "nơi gặp" (cột `meet_*` thuộc D4/`ONBOARD`, đã hoãn). Hôm nay văn phòng chỉ báo tài xế cứu hộ bằng lời/điện thoại. Kế hoạch KHÔNG thêm cột. Nếu chủ cần thì đây là luật mới (một chiều nếu thành cột), cần chủ quyết.
- **"Tài xế dùng app" (P9):** `taiXeChoDieuPhoi` gồm cả người chưa có tài khoản. T0 kiểm có cờ tài khoản không; không có thì danh sách có thể lẫn tài xế công ty chưa đăng nhập app, và ghi chú lại.
- **CHECK "ba cột cùng có/vắng" qua `ADD COLUMN`**: kiểm ở T0 Step 6; không được thì chuyển sang trigger.
- **Tên hành động nhật ký** phải trùng danh sách Đợt 2 đã chốt (một chiều): T0 Step 5.
- **Câu chốt dùng nhãn `TRANG_THAI_CUOI`** có qua bài thứ tự lô không: T3 Step 3 (không qua thì thêm mục đề xuất).
- **Đợt 4 T2 đã lên `main` chưa**: cổng vào A-1b (T12 Step 1).

---

## Phụ lục A — Bản vẽ đã nhận 2/10

- Tệp: `docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html` (6 mục, 29 bảng vẽ); dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`. Đánh giá đối chiếu: DANH-GIA Đợt 5 (bảng lệch §2, câu chủ §3, sửa kế hoạch §4, token §5).
- Dùng ở lát làm ngay: **V11** (T10), **V6** 6.1–6.2, 6.5 (T10) và 6.3–6.4 (T16), **Cứu hộ CH.2** khối văn phòng (T16, theo 5.2b).
- Thuộc phụ lục HOÃN: **V8, V9, V10, V4**, Cứu hộ **CH.1** (tài xế chọn xe cứu hộ), CH.3.
- Lệnh vẽ cũ (1/10) không dùng nữa; nguồn còn giữ ở lịch sử git của tệp này.

---

## HOÃN tới mốc

**Mốc bật lại** (lộ trình mẹ, lời chủ 2026-10-02 chiều điểm 1 và 3): khoảng **≥ 15 xe đối tác hoạt động HOẶC văn phòng xếp > ~40 chuyến/ngày**. Tới mốc thì viết **ADR mới** chọn cách điều xe ở quy mô hợp tác xã. Hướng chủ đã nêu: văn phòng giao (kiểu A, đang có) **+** phát chuyến cho tài xế rảnh tự nhận (kiểu C, chưa có ADR); tài xế nhờ tài xế (kiểu B, ADR-0052 D4) là đường phụ khi có sự cố.

**Phần hoãn:** D4 (V8 nhờ xe khác đón, V9 đề nghị gửi tới tôi, V10 hộp đề nghị cần duyệt + bảng kiểm luật), D5c bản đầy đủ (đề nghị `ONBOARD` do tài xế gửi / văn phòng bấm thay qua `trip.progress`), V4 (Dòng dữ liệu + Nhật ký quyết định). Các câu bản vẽ thuộc đây: **5.1, 5.2a, 5.2d, 5.4, 5.5, 5.6a, 5.6b, 5.7** (chủ đã bỏ khỏi danh sách hỏi; hỏi lại khi tới mốc).

**Luật khi làm lại (bắt buộc):**
- **Tập mã luật để dạng DANH MỤC thêm dòng**, ví dụ một bảng `vc_transfer_rule(code, nhan, tang, don_vi, valid_from/to)` mà `vc_transfer_check.rule_code` REFERENCES tới. Thêm luật = thêm dòng, KHÔNG khoá cứng bằng `CHECK (rule_code IN …)`. Điều này **lệch ADR-0052 D4.1** (ADR ghi `CHECK` định trọn ngay, "cửa một chiều"), nên phải có **ADR mới trước mọi migration**, không chỉ sửa kế hoạch.
- Đề nghị cứu hộ `ONBOARD` và mọi đường `TRANSFERRED` cần một migration nữa bỏ và tạo lại ba trigger LC-15 của lát A-1 (thêm đường thứ tư "đề nghị `CONFIRMED`"), thêm cột `transfer_id`.
- Dựng chính sách (`accept_wait_minutes`, `auto_confirm_transfer`) trên chuỗi `vc_dispatch_policy` lúc đó (Đợt 3 → Đợt 6 đã gộp); bài "câu chèn chính sách đủ cột" của Đợt 3 sẽ tự đỏ.
- Ô `trip.transfer` (ADR-0052 D4.3; cột `DRIVER_PARTNER` theo ADR-0053) và tệp đề xuất nới ghim DRIVER (ghim lúc đó có 3 ô `assigned` → 4).
- Áp các mục DANH-GIA §4 thuộc D4: 1 (`deNghiDaGui[]`), 2 (khoá `de-nghi-gui-toi` + lý do nhúng), 3 (`xe-nhan` 4 khoá, giờ gộp vào `diemSapToi`), 4 (`GET /de-nghi` trả `kiem[]`, `duocDuyetThay`, không đếm ngược cho `ESCALATED`), 5 (`NHAN_LUAT_CHUYEN`), 6 phần `TU_CHOI_NHAN`, 10 (trang "Đề nghị cần duyệt"), 13–15 phần D4, 17 (V4 kế hoạch riêng, chỉ đọc).

**Thiết kế cũ giữ nguyên (đã duyệt ADR-0052 D4, chép từ bản kế hoạch 1/10, đo ở HEAD `0ba370d6`):**

*Tự chốt cũ:* P2 bảng định trọn `STOP`/`ONBOARD`, route đầu chỉ nhận `STOP`; P4 (chủ đồng ý, Lượt II câu 4) xác nhận một đề nghị thì mọi đề nghị `PENDING`/`ESCALATED` khác cùng `from_stop_id` → `VOID` trong cùng lô; P5 hai cột chính sách có `DEFAULT`, bù bằng bài "đủ cột" của Đợt 3.

*DDL:*

```sql
-- vc_transfer_request
id TEXT PK, from_trip_id, to_trip_id REFERENCES vc_trip(id) CHECK(from_trip_id <> to_trip_id),
scope TEXT NOT NULL CHECK (scope IN ('STOP','ONBOARD')),
from_stop_id REFERENCES vc_trip_stop(id), meet_location_id, meet_place_text,   -- CHECK theo scope (ADR-0052:58)
pax_count INTEGER NOT NULL CHECK (pax_count BETWEEN 1 AND 1000),
proposed_by_party_id NOT NULL, proposed_by_staff_id NOT NULL, proposed_at NOT NULL, request_id UNIQUE,
status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','WITHDRAWN','DECLINED','EXPIRED','VOID','CONFIRMED','ESCALATED','REJECTED')),
decided_mode CHECK (IN ('MAY','NGUOI')), decided_by, decided_at, policy_id REFERENCES vc_dispatch_policy(id) NOT NULL,
decline_reason_code, override_reason_code, reject_reason_code REFERENCES vc_reason(code), created_*/updated_*
-- vc_transfer_check (chỉ-thêm; rule_code: DANH MỤC khi làm lại — xem luật trên)
id PK, transfer_id NOT NULL REFERENCES vc_transfer_request(id), cmd_id NOT NULL,
rule_code ('SUC_CHUA_DICH','SUC_CHUA_NGUON','TRUNG_GIO_DICH','KHOANG_NGHI_DICH','MOC_TOI_THIEU','HANG_BANG_DICH','GIAY_TO_DICH','KHONG_CHEO','DIEM_CHUA_TOI'),
ket_qua CHECK IN ('DAT','KHONG_DAT','CANH_BAO'), gia_tri INTEGER, gioi_han INTEGER, policy_row_id, rule_tier CHECK IN ('LOI','CAU_HINH'), created_*
vc_trip_allocation: transfer_id
vc_dispatch_policy: accept_wait_minutes INTEGER NOT NULL DEFAULT 10 CHECK BETWEEN 1 AND 120, auto_confirm_transfer INTEGER NOT NULL DEFAULT 1 CHECK IN (0,1)
```

*Trigger:* `vc_transfer_request_no_delete`, `…_identity`, `…_status_forward` (đúng đồ thị ADR-0052:61, không có `ESCALATED → EXPIRED`), `…_decided_once`; `vc_transfer_check_no_delete`, `…_no_update`; `vc_transfer_request_lc14` (nguồn `RUNNING`; đích `PLANNED`/`RUNNING` cùng `service_date`; người gửi = tài xế đang mở của nguồn; tài xế đích mở và khác; `STOP` ⇒ điểm nguồn `PENDING` + mọi suất mở `WAITING`); `vc_transfer_request_confirm_core` (`ESCALATED → CONFIRMED` đòi `override_reason_code` và không có dòng kiểm `KHONG_DAT` + `LOI`).

*Luật thuần (`src/shared/dieu-phoi-chuyen-diem.ts`):* `kiemChuyen(v): DongKiem[]` (luôn trả đủ bộ mã; đích RUNNING thì `MOC_TOI_THIEU` = `DAT`), `quyetDinhSauKiem`, `duocDuyetThay` (mọi `KHONG_DAT` đều `CAU_HINH`), `hetHanDeNghi` (chỉ `PENDING`), `XeNhanDto` đúng bốn khoá `maChuyen, tenTaiXe, choTrong, diemSapToi`; `TANG_LUAT`: `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU` = `CAU_HINH`, còn lại `LOI`.

*Hàm lô:* `loGuiDeNghi`, `loDongDeNghi` (rút / không nhận / hết hạn đóng lười / bác), `loXacNhanChuyen` (cổng nguồn → `CONG_DOI` đích → nhật ký → sự kiện → `TRANSFER_SET_STATUS` → dòng kiểm → [CONFIRMED] đóng `TRANSFERRED` → mở đích giữ trạng thái → điểm đích → điểm nguồn `MOVED` → manifest → VOID đề nghị khác); `loDaToi`/`loKetThuc`/`loKetThucGianDoan` thêm `deNghiVoid` (MQ-09). SQL: `TRIP_GATE_CHAY_HOAC_CHO`, `TRIP_GATE_DOI_CHAY`, `TRANSFER_INSERT`, `TRANSFER_SET_STATUS`, `TRANSFERS_VOID_BY_STOP`, `TRANSFERS_VOID_BY_TRIP`, `TRANSFER_CHECK_INSERT`.

*Ô + route:* `"trip.transfer": row("none","none","none","none","none","any","none","assigned","none","none")` (route chốt thêm "đang lái chuyến nguồn / đích", áp cả Toàn quyền). Tài xế (cổng `staff`): `GET …/cuoc-cua-toi/:id/xe-nhan`, `POST …/cuoc-cua-toi/:id/de-nghi`, `POST /de-nghi/:rid/rut`, `…/nhan` (hết hạn → `EXPIRED` + 409 `de_nghi_het_han`; thua cổng thì tự thử lại ĐÚNG MỘT lần), `…/khong-nhan` (nhóm `TU_CHOI_NHAN`), `GET /de-nghi-gui-toi`. Văn phòng: `GET /de-nghi?ngay=` (`trip.view`), `POST /de-nghi/:rid/duyet`, `…/bac` (`trip.override`); cứu hộ `POST …/chuyen/:id/cuu-ho` (`trip.progress`, chỉ `ONBOARD`). Bài quét tin của Đợt 2 phải mở regex thêm `de-nghi`.

*Kiểm định kỳ:* đề nghị `CONFIRMED` mà số suất `TRANSFERRED` ≠ số suất mở cùng `transfer_id`; suất `TRANSFERRED` không có `transfer_id` / trỏ đề nghị không `CONFIRMED`; `CONFIRMED` + `NGUOI` có `KHONG_DAT` + `LOI`.

*Tin (ADR-0052:157-160):* `trip_transfer_proposed` → tài xế đích; `_confirmed/_rejected/_expired/_declined/_withdrawn/_voided` → tài xế nguồn + đích; `_escalated` → người có `trip.override`.

*Chạy đua:* A gửi cùng điểm cho B và C, hai bên nhận (cả hai thứ tự) → đúng một `CONFIRMED`; nhận đúng lúc A rút; nhận đúng lúc A bấm "Đã tới"; văn phòng thêm điểm vào B đúng lúc B nhận (tự thử lại một lần); hai đề nghị khác điểm đổ vào B vượt chỗ → đề nghị sau `ESCALATED`.

*Cần chủ cũ (hỏi lại khi tới mốc):* bộ ca mẫu xe A/B (ADR-0052:274, lộ trình Lượt III câu 10); "một điểm chỉ một đề nghị đang chờ?" (ADR không nói).

---

## Tự rà sau cập nhật 2/10

Đối chiếu từng mục §4 của DANH-GIA Đợt 5:

| §4 | Nội dung | Kết quả |
|---|---|---|
| 1 | `deNghiDaGui[]` cho tài xế A | Không áp: thuộc D4 → phụ lục HOÃN |
| 2 | Khoá `de-nghi-gui-toi` + lý do nhúng | Không áp: D4 → HOÃN |
| 3 | `xe-nhan` giữ 4 khoá, giờ gộp vào `diemSapToi` | Không áp cho tài xế (D4 → HOÃN). Ý "giờ gộp vào chữ `diemSapToi`" dùng cho `CuuHoResponse.xeNhan` (T15) |
| 4 | `GET /de-nghi` trả `kiem[]`, không đếm ngược `ESCALATED` | Không áp: D4 → HOÃN |
| 5 | `NHAN_LUAT_CHUYEN` | Không áp: D4 → HOÃN |
| 6 | Gieo `TU_CHOI_NHAN`, `BAO_HUY_DIEM`; thêm vào `NHOM_LY_DO_HIEN` | Áp phần `BAO_HUY_DIEM`: gieo 4 dòng đúng chữ bản vẽ (T1), hiện ở màn Lý do điều phối (T2). `TU_CHOI_NHAN` → HOÃN. Nhóm lý do bác (câu 5.5) → HOÃN |
| 7 | Đưa lý do ra màn cho tài xế / Bán hàng (`GET /ly-do` là cổng `admin`) | Áp: P10. `ChuyenChiTietResponse.lyDo` có nhóm `BAO_HUY_DIEM`; tài xế nhận nhãn qua `vanPhongBaoHuy.lyDoNhan` (T4); phá lệ dùng `lyDo` có sẵn + `moPhaLe` (T10) |
| 8 | DTO `diem[].themKhiChay`, `suat[].vanPhongBaoHuy`, danh sách đề nghị của chuyến | Áp hai trường đầu (T4). Danh sách đề nghị → HOÃN |
| 9 | Trang "Xe đang chạy" | Áp (T10): công thức c, `GET /lich`, ô `trip.view` |
| 10 | Trang "Đề nghị cần duyệt" | Không áp: D4 → HOÃN (câu 5.6a/5.6b) |
| 11 | Văn phòng chọn xe cứu hộ (route `office`) | Áp dạng đơn giản (T15): `GET …/chuyen/:id/cuu-ho`, ô `trip.dispatch` (không `trip.progress` vì không còn bấm thay `ONBOARD`), chỉ xe tài xế dùng app (5.2b) |
| 12 | Luồng xe nhà xe: "Tạo chuyến cứu hộ" + giá theo `transport.cost.adjust` | Áp (T15 luồng 2b, T16 giao diện) — dùng route giá Đợt 4 |
| 13 | Chữ theo ADR | Áp phần còn làm: "Nhập khi khách đã lên xe" → "Nhập tên cho khách chưa có tên trong đơn" (T16); câu tài xế khi xe hỏng (5.2c, T16). Phần D4 ("Quản trị duyệt", "(A)", "10 phút", banner luật lõi, V4 "Tự động") → HOÃN |
| 14 | Trạng thái bản vẽ thiếu | Áp phần còn làm (T10): "Cập nhật điểm theo đơn" trên xe đang chạy + câu "bỏ qua N"; tin "Đổi điểm đón X → Y" ở màn tài xế; Bán hàng dòng khoá / Quản trị `moPhaLe`; Kế toán chỉ xem; 409 "xe vừa kết thúc". Phần D4 (REJECTED/VOID/WITHDRAWN, `de_nghi_het_han`, chờ C nhận, nút "Xe hỏng — chuyển khách" chọn xe) → HOÃN |
| 15 | Ẩn nút "Nhờ xe khác đón" khi điểm có đề nghị chờ | Không áp: D4 → HOÃN |
| 16 | Đổi nhãn menu tài xế "Cuốc của tôi" → "Chuyến của tôi" + mục "Đề nghị gửi tới tôi" | Không áp: mục đề nghị thuộc D4; đổi nhãn ngược câu 6.5 của Đợt 6 (tên mục giữ "Cuốc của tôi") |
| 17 | V4 tách khỏi Đợt 5 | Áp: V4 nằm ở phụ lục HOÃN, không còn trong task giao diện |

Ngoài §4: câu 5.2a (nút "Xin Quản trị phá lệ") chủ đã bỏ khỏi danh sách hỏi. Form thêm điểm làm **theo ADR D5.1** (khuôn có sẵn), không theo bản vẽ (T10, 11.4). Đây là chỗ kế hoạch đi ngược bản vẽ ở phần bề mặt có chạm quyền, cần điều phối biết.
