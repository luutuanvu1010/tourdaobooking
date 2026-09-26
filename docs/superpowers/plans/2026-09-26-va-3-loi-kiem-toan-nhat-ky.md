# Nhật ký thi công — vá 3 phát hiện kiểm toán còn mở (DK-T3-01, DK-T3-02, DK-T4-02)

- **Ngày:** 2026-09-26. **Nhánh:** `va-3-loi-kiem-toan` (worktree `.claude/worktrees/va-3-loi-kiem-toan`, từ `origin/main` 823c1b1). **Vai phiên:** thi công (điều phối) — người thi công là subagent; kiểm độc lập bằng `nguoi-kiem-doc-lap` (chỉ đọc).
- **Nguồn:** `docs/quyen-hoan.json` mục `phat_hien` (hạn 2026-10-05, quá hạn → `npm test` đỏ); báo cáo `docs/AUDIT-2026-09-24-DIEM-KHUAT.md` + bằng chứng `docs/evidence/diem-khuat-2026-09-24/` (nhánh `claude/tourdao-sales-audit-62ea81`).
- **Quyết định của chủ:** ADR-0027 (nguyên văn lời chủ ở đó). DK-T3-02 không cần hỏi: làm đúng `ke_hoach` đã ghi trong sổ.

## Tiêu chí nghiệm thu (hành vi kiểm được)
1. **DK-T3-02:** Quản trị/Toàn quyền `POST /api/staff/<chính mình>/reset-pin` → 403, không ghi gì (PIN, `credentials_changed_at`, nhật ký giữ nguyên), phiên và PIN cũ vẫn dùng được; đặt lại PIN cho cấp dưới vẫn 200; trang Quản lý tài khoản không có nút "Đặt lại PIN" ở hàng/thẻ "(bạn)".
2. **DK-T4-02:** chạm lý do huỷ → hộp hỏi lại có mã đơn, tên khách, "không thể hoàn tác"; bấm Thôi/không đồng ý thì không gọi máy chủ; vùng huỷ là khối riêng tách khỏi nút lưu; máy chủ trả 409 `departed` khi ngày đi (lớn nhất) < hôm nay giờ VN, 200 khi ngày đi = hôm nay; "Việc của tôi" không hiện nút huỷ cho đơn đã qua ngày đi.
3. **DK-T3-01:** mọi tài khoản: dịch vụ nhập tay mới → 400, sửa tên/dòng tiền dịch vụ nhập tay cũ → 400, đổi ngày/số khách của nó → 200; tài khoản có quyền Đối tác (kể cả kèm quyền khác): đơn giá ≠ giá danh mục → 403, giảm giá > 0 → 403, ở lập, sửa **và** xác nhận (kể cả nháp dựng sẵn); Bán hàng cùng thân yêu cầu → 201.
4. Mỗi luật có test đỏ trước (trên mã chưa vá) → xanh sau; `npm test`, `npm run typecheck` (0 lỗi), toàn bộ e2e xanh; kịch bản Chrome của trang đã đổi xanh.
5. Mỗi mục `phat_hien` bị xoá trong **cùng commit** vá nó; `src/phat-hien-han.test.ts` xanh (kể cả khi mảng rỗng).
6. Người kiểm độc lập chỉ-đọc báo cáo trước khi coi là đạt.

## Diễn biến và ruling
- **R1 (điều phối):** DK-T3-02 và phần hộp hỏi lại của DK-T4-02 không phụ thuộc câu trả lời của chủ → giao chạy nền trước khi hỏi (bài học 23/9, CLAUDE.md §3).
- **R2 (điều phối):** trong route `reset-pin` chặn tự đặt lại **riêng**, không sửa `mayManage` (unlock và gỡ Face ID cũng dùng hàm đó — ngoài phạm vi).
- **R3 (điều phối):** kiểm toán tái hiện hai đường (dịch vụ nhập tay; danh mục + giảm giá lớn); điều phối tìm thêm đường thứ ba tương đương (đơn giá thoả thuận thấp trên dòng danh mục) và phát hiện bước **xác nhận** không kiểm lại giá → câu hỏi cho chủ ghi rõ "áp cả lập, sửa và xác nhận".
- **R4 (điều phối):** hai quyết định đã duyệt va nhau (ADR-0014 điều 3 "phiếu luôn giá bán lẻ" ↔ ADR-0018 §9 "được giảm giá cho khách") → không tự hoà giải, hỏi chủ. Chủ giải (ADR-0027 quyết định 2).
- **R5 (điều phối):** app chưa có bảng mức chiết khấu → trần "bằng mức chiết khấu" chưa có số → hỏi thêm một câu; chủ chọn "tạm không cho giảm".
- **R6 (điều phối):** luật ngừng nhập tay đặt thành kiểm riêng sau `validateOrder` (không đổi cách `validateService` phân tích) để các test đơn vị cũ dùng dịch vụ nhập tay không vỡ vô cớ; e2e chuyển sang danh mục giả `ZE*`.
- **R7 (chủ, 26/9):** người kiểm độc lập (ĐẠT CÓ ĐIỀU KIỆN) chứng minh tài khoản `PARTNER`+`FIELD` gán qua đường quản trị cũ lọt R2/R3 (đơn giá 1đ → 201) vì vị từ cũ là "mọi quyền đều là PARTNER" (định nghĩa của điều phối viên, chưa trình chủ). Chủ chọn "Có quyền Đối tác là áp" → `holdsPartner`; e2e mục 8 đỏ `201 !== 403` trước, xanh sau.
- Người thi công lần 1 bị hàng rào chặn `git reset --hard` (định gộp commit) → thêm commit sửa lời riêng (3c7fdb3); không lách.

## Commit
| SHA | Việc |
|---|---|
| 0245f7d | DK-T3-02: chặn tự đặt lại PIN (máy chủ + ẩn nút) + e2e `admin.mjs` + khung thử phá `tests/audit/doi-tac.test.mjs`; xoá mục sổ |
| f8d290c | DK-T4-02 giao diện: hộp hỏi lại + vùng huỷ riêng + nút "Thôi" |
| 3c7fdb3 | Sửa lời tài liệu DK-T3-02 (còn đường đặt PIN bằng Face ID) |
| c302f27, 97bb97a | Bằng chứng Chrome `docs/evidence/2026-09-26-va-3-loi-kiem-toan/` (7/7 ✓ trên mã vá, 7/7 ✗ trên 823c1b1) |
| 8b46b46 | DK-T4-02 máy chủ: `tripDeparted` + 409 `departed`; ẩn nút huỷ đơn đã qua ngày đi; xoá mục sổ |
| 91c3488 | DK-T3-01 phần 1: ngừng nhập tay (mọi tài khoản, bản cũ chỉ xem) + tài khoản chỉ Đối tác đúng giá danh mục ở lập/sửa/xác nhận |
| e72089b | DK-T3-01 phần 2: tài khoản chỉ Đối tác không giảm giá (trần `PARTNER_DISCOUNT_CAP` = 0 chờ bảng chiết khấu) ở lập/sửa/xác nhận; xoá mục sổ → `phat_hien` rỗng |
| e8000e3 | Sửa các kịch bản Chrome cũ còn tạo dịch vụ nhập tay (khung `a2-cdp.mjs` thêm `legacyManual`, thử lại khi ECONNRESET) |
| 236a085 | ADR-0027, nhật ký này, mục nhật ký phiên bản 1.14, sổ hàng rào (3 dòng), trạng thái HANDOFF §1.5 |

| (commit sau) | R2/R3 áp cho mọi tài khoản CÓ quyền Đối tác (`holdsPartner`) theo R7; e2e mục 8 |

## Việc còn treo (không thuộc phạm vi, đã báo chủ)
- App chưa tính **số đối tác phải trả Tour Đảo** (giá vốn cố định) — làm cùng đợt chiết khấu/sổ công nợ (ADR-0018 §11, ADR-0024…0026); khi có bảng chiết khấu, thay trần 0 bằng mức của đối tác.
- Đối tác (và Thực tập) nhận 403 ở `/api/catalog` → chưa lập được đơn trên giao diện; mở danh mục là quyết định quyền riêng.
- Tài khoản Thực tập vẫn tự đặt giá/giảm giá qua API.
- Đơn Đối tác đã xác nhận trước bản vá không bị rà lại; chủ có thể rà bằng một câu SQL chỉ-đọc (xem báo cáo cuối phiên).
- Toàn quyền duy nhất quên PIN mà chưa có Face ID: chỉ cứu được bằng SQL (hệ quả của DK-T3-02).
- Đề xuất (tệp luật, chờ chủ): thêm dòng vào bảng "sửa tệp nào → chạy kịch bản Chrome nào" của `web/CLAUDE.md` trỏ `web/staff.ts`, `web/account.ts` sang `va3-smoke.mjs`.
- Có từ trước: "Việc của tôi" hiện ngày khởi hành dạng thô `2026-09-29`; ca "P4 FINDING HDV" của `tests/audit/doi-tac.test.mjs` đỏ từ trước bản vá.

## Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)
- `npm test` 817/817; `npm run typecheck` 0 lỗi; `npm run test:e2e` 20/20 (audit-invariants: đạt, 2 cảnh báo R-ORD-6a/6b do `dispatch.mjs` cố ý chèn dữ liệu hỏng).
- Chrome: va3-smoke 8/8, a2-smoke-form 24, a2-smoke-order 11, a2-smoke-sheet 14, dot-a-smoke 10/10, dot-c-smoke 6, v1-nguoi-phu-trach 15/15, v1-xac-nhan-png 11/11, trang-chu-smoke 40 ✓.
- Còn vỡ từ trước (bản 1.12, ADR-0021, không do nhánh này): `a2-evidence.mjs` (ô ngày theo dịch vụ đã bỏ); `2026-09-19-pwa/kich-ban/*` (dạng API trước A1). `tests/audit` 35/36 — ca P4 đỏ cả trên 823c1b1.
