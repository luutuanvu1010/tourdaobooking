# Tách nhiệm vụ mức (a) «đánh dấu, không chặn» — đặc tả thiết kế (ADR-0187 Đ3)

- **Trạng thái:** đặc tả thi công theo ADR-0187 **accepted** 2026-11-08 (chủ: «Duyệt, mức a»). Không cần chủ duyệt lại nguyên tắc; các điểm AI tự quyết ghi ở mục cuối.
- **Ngày:** 2026-11-08. **Loại:** việc lớn (tiền, dữ liệu, nhật ký). Có người kiểm độc lập chỉ đọc trước khi báo đạt (CLAUDE.md §3).
- **Nhánh:** `claude/keen-ishizaka-248ee0`. Kế hoạch: `docs/superpowers/plans/2026-11-08-tach-nhiem-vu-muc-a.md`. Nhật ký thi công: `…-thi-cong-nhat-ky.md`.

## 1. Kết quả kiểm trước khi thi công (Đ3.3, bước 1 của đề bài)
- **Mã quyền** vừa lập được đơn (`order.create` ≠ none) vừa ghi được tiền (`MA_QUYEN_TIEN`): chỉ **SUPER_ADMIN**. Tài khoản kiêm **SALES + ACCOUNTING** (hoặc ADMIN + ACCOUNTING, INTERN + ACCOUNTING…) là tổ hợp hợp lệ của bản đồ quyền, nên lỗ hở là có thật về mặt luật dù hôm nay có hay không có người như vậy.
- **D1 local** của worktree này chưa có dữ liệu; D1 local của checkout gốc (`.wrangler/state`) chỉ còn hai bảng cũ (`d1_migrations`, `staff`, tháng 9) — không có bảng quyền. **Kết luận local: không có dữ liệu để kiểm.**
- **Production:** AI không được chạy lệnh trên D1 remote. Lệnh **chỉ đọc** chủ tự chạy ở thư mục gốc dự án (`SELECT` thuần, không ghi):

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT l.label AS ten, group_concat(q.permission_code) AS quyen FROM v_stf_quyen_mo q JOIN v_stf_staff_label l ON l.id = q.staff_id GROUP BY q.staff_id HAVING (quyen LIKE '%ACCOUNTING%' OR quyen LIKE '%SUPER_ADMIN%') AND (quyen LIKE '%SALES%' OR quyen LIKE '%ADMIN%' OR quyen LIKE '%INTERN%' OR quyen LIKE '%PARTNER%')"
```

Kết quả rỗng = chưa ai kiêm. Có dòng = từ bản này trở đi mỗi lần người đó ghi tiền cho đơn mình lập sẽ mang dấu.

## 2. Làm gì
1. **Hàm kiểm chung** `tuGhiDonMinhLap(ownerId, staffId)` (thuần, `src/shared/tach-nhiem-vu.ts`): đúng khi người gọi là người lập đơn. Mọi route của nhóm `O_GHI_TIEN` ở `src/modules/billing/index.ts` gọi nó **sau** `can()` và trả cờ `tuGhiDonMinhLap: true` trong thân phản hồi khi đúng (route biết đơn trước thì gọi thẳng; route biết đơn sau khi ghi — theo khoản thu, phân định, nộp gộp — gọi qua `dauTuGhi(db, orderIds, staff)` cùng hàm). Không chặn.
2. **Dấu trong dữ liệu**, cả hai nơi, điền **tự động trong câu chèn** (khuôn `acting_role` ADR-0180), không truyền tay từng chỗ:
   - `audit_log.tu_ghi_don_minh_lap` (1 / NULL): `insertStatement` điền khi hành động thuộc danh sách **hành động ghi tiền** (`HANH_DONG_GHI_TIEN` suy từ `AUDIT_ACTIONS` có cờ `ghiTien: true`) **và** người lập đơn (`v_ord_order_owner`) là `staff_id` của dòng.
   - `bil_posting.tu_ghi_don_minh_lap` (1 / NULL): mọi câu chèn phiếu sổ điền khi `ai.ghiTien` (người gọi đi qua route của nhóm ghi tiền — cờ tĩnh do route đặt qua `nguoiGoi(staff, { ghiTien: true })`) **và** người lập đơn là `created_by`.
3. **Soát**: bảng mới chỉ-thêm `bil_soat_tu_ghi` (khoá = id dòng nhật ký có dấu; `soat_boi`, `soat_luc`). Trigger CSDL: người soát ≠ người ghi, dòng phải có dấu (Hiến chương 5.1: luật tiền ở cả máy chủ và CSDL).
4. **Route** (module billing): `GET /api/ledger/tu-ghi` (ô `ledger.view`, không Đối tác) → danh sách dòng có dấu kèm trạng thái soát; `GET /api/ledger/tu-ghi/dem` → số chưa soát; `POST /api/ledger/tu-ghi/:auditId/da-soat` (ô `ledger.write`, không Đối tác; chính người ghi → 403 `tu_soat`; đã soát → 409) → MỘT lô: dòng soát + nhật ký `ledger_self_write_reviewed`.
5. **Giao diện**: Sổ công nợ thêm nút lọc «Cần người thứ hai soát (n)» cạnh ba nút lọc; bật thì danh sách đổi sang các dòng có dấu, mỗi dòng có nút «Đã soát» khi người xem có `ledger.write`, không Đối tác và không phải người ghi. Trang chủ (thẻ «Đang chờ bạn») thêm dòng «Cần người thứ hai soát» cho người có `ledger.write` (Kế toán, Toàn quyền), bấm sang `/so-cong-no#tu-ghi`.
6. Chữ: dấu «Tự ghi đơn mình lập», bộ lọc «Cần người thứ hai soát», nút «Đã soát» — **nguyên văn ADR-0187 Đ3 mức (a) chủ đã duyệt**, nên coi là đã chốt; ghi vào Bảng tham chiếu với nguồn tên là ADR-0187.

## 3. Không làm
- Không chặn (mức b), không đổi ô nào của bản đồ quyền, không thêm mã quyền.
- Không gắn dấu cho `payment.receive` (Bán hàng khai khoản thu đơn mình là luồng bình thường, không thuộc `O_GHI_TIEN`). Hệ quả có tên: khoản thu lên **đơn đã huỷ** (nhánh `ledger.write` của `POST /api/orders/:id/payments`) có cờ trong phản hồi và dấu trên phiếu sổ, nhưng dòng nhật ký `payment_recorded` **không** mang dấu (hành động dùng chung với luồng thường).
- Nộp / trả tiền theo bên (`POST /api/ledger/settlements`): phiếu `SETTLEMENT` mang dấu CHỈ khi gộp đúng một đơn (`order_id` có); gộp nhiều đơn `order_id` NULL ⇒ không dấu phiếu. Dòng nhật ký `ledger_settlement` ghi theo BÊN (không có mã đơn) nên **không bao giờ mang dấu** ⇒ nộp/trả do chính người lập đơn ghi KHÔNG vào danh sách «Cần người thứ hai soát» dù thân phản hồi vẫn trả cờ (kiểm độc lập 8/11 phát hiện; chờ chủ quyết — nhật ký thi công «Chờ chủ» 3).
- Không làm Đ2.2, Đ2.3, Đ1-vào-Hiến-chương của ADR-0187 (các bước sau).

## 4. Trang ghép (CLAUDE.md §9)
1. **Bảng chạm:** `audit_log` + một cột dấu; `bil_posting` + một cột dấu; bảng mới `bil_soat_tu_ghi` (chỉ chứa: id dòng nhật ký, người soát, lúc soát — không tiền, không dữ liệu cá nhân); view mới `v_aud_tu_ghi` (id, order_id, staff_id, action, created_at của dòng có dấu) để billing đọc xuyên module.
2. **Dòng bản đồ quyền chạm:** không đổi ô nào. Điều kiện phụ theo đối tượng (người lập ≠ người gọi) đặt sau `can()`. Soát dùng lại ô `ledger.write` (any: Kế toán, Toàn quyền) cộng điều kiện «khác người ghi» ở máy chủ và trigger.
3. **Cổng canh cửa:** cổng chính ở route và trigger; giao diện chỉ ẩn/hiện bằng cùng ô (`can(staff, "ledger.view")`, `can(staff, "ledger.write")`, `holdsPartner`). Chỗ giao diện đổi nghĩa: không có (chỉ thêm bộ lọc, thẻ).

## 5. Tiêu chí nghiệm thu (kiểm được)
1. Bài quét tĩnh: mọi route ở `billing/index.ts` hỏi `can()` với một ô của `O_GHI_TIEN` đều gọi `tuGhiDonMinhLap(` hoặc `dauTuGhi(`; bỏ một lời gọi → đỏ.
2. Khung thử SQLite thật: tài khoản SALES + ACCOUNTING lập đơn, xác nhận, bấm Hoàn thành → 200 `{ tuGhiDonMinhLap: true }`, `audit_log.order_completed` có dấu 1, `bil_posting` COMPLETED có dấu 1; Kế toán khác làm cùng việc → không dấu, không cờ.
3. Đánh dấu nhập kế toán (không có phiếu sổ) đơn mình lập → dòng nhật ký có dấu; `GET /api/ledger/tu-ghi` liệt kê dòng đó.
4. «Đã soát»: người ghi tự bấm → 403; Kế toán khác → 201 + dòng soát + nhật ký `ledger_self_write_reviewed`; bấm lần hai → 409; chèn thẳng SQL dòng soát cùng người → trigger từ chối.
5. Nhật ký không mang dấu khi hành động ngoài danh sách (vd `created`, `payment_recorded` của Bán hàng).
6. `npm test`, `npm run typecheck` xanh; e2e `tests/e2e/tach-nhiem-vu.mjs` xanh trên API thật (tài khoản lai gieo SQL).
7. Trần gói (`src/goi-trang-nhe.test.ts`): nếu nới thì = số đo + 100 kèm lý do.
8. Người kiểm độc lập (`nguoi-kiem-doc-lap`) báo ĐẠT.

## 6. Điểm AI tự quyết (bề mặt, đảo ngược được — ghi lại theo P8)
- Dấu trên nhật ký điền **theo danh sách hành động**, không theo route: hệ quả có tên ở mục 3. Lý do: ~45 chỗ gọi ghi nhật ký, truyền tay dễ quên hơn (bài học ADR-0180).
- Mỏ neo của việc soát là **dòng nhật ký** (phủ cả bốn thao tác, kể cả thao tác không sinh phiếu sổ), không phải phiếu sổ.
- Danh sách soát trả cả dòng đã soát (tối đa 50 dòng gần nhất) để Kế toán thấy ai đã soát; dòng chưa soát trả hết.
