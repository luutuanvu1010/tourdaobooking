# Đợt 4 (đường găng 30/11) — nhật ký thi công

> Kế hoạch: `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần VII (chủ duyệt 9/11). Phiên Đợt 4, worktree `modest-lovelace-09b5ba`, nhánh `claude/dot-4-han-30-11-7d0bdb`. Trang hỏi chủ: `docs/superpowers/specs/2026-11-09-dot-4-hoi-chu.md`.

## Mốc đầu phiên (9/11)

- `main` = `origin/main` = `fa3fd859a`. Nhánh này cắt từ nhánh prompt rà soát nên mang theo 23 lần lưu chưa có trên `main`: hồ sơ rà soát trước ngày dùng thật lần 2 (nhánh `claude/kind-wu-98f2cd`), prompt rà soát, kế hoạch sửa sau rà soát và lời duyệt 9/11 (`4ec5e1965`, `2c6b7e70c`). Toàn là tài liệu và một kịch bản Chrome (`52fd54557`); khi chủ `day-len` nhánh này thì các lần lưu đó vào `main` cùng lúc.
- Production (kiểm chỉ đọc 9/11): `GET /api/auth/config` → `version 2.80`; `wrangler d1 migrations list tourdao-sales-db --remote` → «No migrations to apply!» (đã áp tới `0150`).
- Số migration lớn nhất trên `main`: `0150`. Đợt này **không thêm migration**.

## 4.1 TNV-G1

- **Tiền đề của lời giao đã cũ.** Nhánh `claude/nostalgic-aryabhata-066936` không còn (không có ở máy, không có trên GitHub): reflog `main@{90}` ghi «merge claude/nostalgic-aryabhata-066936: Fast-forward», `195e9d3ef` là tổ tiên của `main`, `migrations/0125_tin_duyet_hoan_thu_truoc.sql` có trên `main`; `src/shared/changelog.ts` ghi «29/10 chủ triển khai 2.42 từ main 195e9d3e». Production áp hết migration (trên). Vậy phần «gộp main vào bản sao nhánh, soát số migration» không còn việc; câu «CHƯA gộp, CHƯA triển khai» trong mục TNV-G1 của `docs/quyen-hoan.json` là trạng thái 28/10.
- **Đối chiếu năm điều kiện đóng** (§6 kế hoạch `2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`):
  1. Lên production + `audit-invariants --db remote` đạt: mã đã lên (trên). `audit-invariants --db remote` đọc D1 thật — AI không chạy (phiên 28/10 được thoát 2); đưa chủ lệnh ở trang hỏi.
  2. Nhãn tiền, ảnh thông báo huỷ, ô đếm Trang chủ: đã lên ở 2.42.
  3. Người kiểm độc lập: ĐẠT 28/10 (ghi ở sổ).
  4. Sổ vàng: `node --test src/so-vang-don-huy.test.ts` 9/11 xanh; 7 ca đã xác nhận khớp từng đồng; 6 ca chờ (01, 02, 04, 07, 08, 13) đều «khớp mã». Ca 07 còn vướng đặc tả phiếu chi (bản nháp 28/10, chưa duyệt).
  5. Chạy lại tám tình huống G1 trên `main` hiện tại: giao trợ lý chạy nền (bản chép kịch bản 28/10 đã mất, dựng lại từ bản gốc ngoài kho). **Kết quả 9/11 00:29–00:40: cả tám ca «hết» như 28/10**, `audit-invariants --strict` thoát 0 trên bảy D1 tạm (mỗi D1 một cảnh báo R-CTL-1 không liên quan); mã ADR-0174/0181/0185/0186 không làm hỏng ca nào. Bằng chứng: `docs/evidence/2026-11-09-dot-4-g1-chay-lai/README.md` (bảng, chỗ sửa bản chép, điều ngoài G1); bản chép kịch bản cất ngoài kho ở thư mục ghi chú chung của nhóm phiên, thư mục con `g1-chay-lai-2026-11-09/`. Lẫn dữ liệu ở máy thử `hd` (một lần chạy hỏng tạo thêm 4 đơn, đã bỏ kết quả lần đó; chỉ làm «Sổ của tôi» HDV A 80.000 → 160.000). Chỉ tầng API, không Chrome. **Người kiểm thứ hai (`nguoi-kiem-doc-lap`, chỉ đọc): ĐẠT cho điều kiện 5** — số và mã HTTP của cả tám ca khớp tệp thô; diff bản chép với bản gốc không có chỗ làm yếu phép thử (chỉ thích nghi API: `lyDo`, thu sau xác nhận, `pickupChoice`, Gửi đơn, bộ lọc ca); `audit-*.log` đều kết thúc «Mọi bất biến đạt» (thoát 0 suy từ nội dung, nhật ký không ghi mã thoát); lẫn dữ liệu máy `hd` chỉ chạm số tổng hợp, không chạm số chấm. Năm điểm nhỏ không chặn: chứng cứ tái hiện ngoài kho; nhãn `ket_luan` cũ trong `.jsonl` (đã thêm hai dòng chú thích vào README bằng chứng); chấm bằng mắt như 28/10; BS5 CK muộn chưa thấy thu thành công (400 `bank_txn_required`), BS15 vắng; số thô `/payments daThu`, `receipt.daTra` vẫn gồm CK chưa xác nhận (chỗ người dùng đọc đã tách).

## Lời chủ trong hộp hỏi gom (9/11)

| Câu | Chủ chọn (nguyên văn) | Việc đã làm |
|---|---|---|
| Năm ca vàng 01, 02, 04, 08, 13 | «Chưa, tôi đọc sau (Recommended)» | không đổi trạng thái ca nào |
| TNV-G1 nếu không kịp 30/11 | «Dời hạn tới 31/12 ngay» | `docs/quyen-hoan.json`: `han` 2026-12-31 + câu GIA HẠN 2026-11-09 nối vào `ke_hoach`; các dòng cho phép cũ giữ nguyên văn |
| HC-4.2 | «Chỉ chuẩn bị, chưa ghi sổ (Recommended)» | không đổi sổ; hạn vẫn 2026-11-30 — chủ phải quyết trước 0 giờ 1/12 (đề xuất 31/1/2027) |
| Hai ô quyền | «Giữ, dời hạn tới 30/6/2027 ngay» | `docs/quyen-hoan.json`: `han` 2027-06-30 cho `task.progress` và `dispatch.guides.view`, câu GIA HẠN nối vào `ke_hoach`; KHÔNG sửa `permissions.ts` |

Kiểm sau khi sửa sổ: `python3 -m json.tool` hợp lệ; `node --test src/phat-hien-han.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts src/shared/tro-ly-cau-truc.test.ts` → 40 đạt / 0 đỏ.

**Còn lại trước 0 giờ 1/12:** chỉ HC-4.2 (hạn 30/11). Chủ ra lệnh dời hạn hoặc đợt 2 ADR-0115 xong trước đó; không thì `npm test` đỏ.

## 4.2 HC-4.2

- Giao `nguoi-kiem-doc-lap` (chỉ đọc) đối chiếu ADR-0115, ADR-0092 với mã. **Kết luận 9/11: KHÔNG đóng được.** Người kiểm chạy `node --test src/modules/billing/dieu-chinh-duyet-route.test.ts src/migrations-dieu-chinh-duyet.test.ts src/modules/billing/tach-nhiem-vu-khung.test.ts` → 52 đạt / 0 đỏ; không làm phép thử phá cố ý.
  - **Đã tách hai người (có hàng rào):** điều chỉnh công nợ `dieu_chinh` (tạo yêu cầu `src/modules/billing/index.ts` route `/api/ledger/adjustments` → duyệt `/api/ledger/adjustment-requests/:id/approve`; máy chủ `dieu-chinh.ts`; trigger `bil_adjustment_request_same_person`, `bil_posting_adjustment_approved`, `bil_debt_line_adjustment_match` ở `migrations/0094_bil_dieu_chinh_duyet.sql`; bài `TC2`, `src/migrations-dieu-chinh-duyet.test.ts`; `docs/SO-HANG-RAO.md` ngày quan sát 13/10), kể cả ba loại dòng HOA_HONG / GIAM_GIA_BEN_DAT / GIA_VON; phân định (`bil_attribution_same_person`, `0135`); đường cọc đơn huỷ (`0079`).
  - **Phần hở chưa làm (đợt 2 ADR-0115 điều 3, chủ đã duyệt nguyên tắc):** «Điều chỉnh chi phí xe thuê» `POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh` (`src/modules/van-chuyen/tien-xe-chi-phi.ts` `lenhDieuChinh`, ô `transport.cost.adjust`) một người ghi ngay; `git grep vc_trip_cost_request -- migrations src` = 0 (tự kiểm lại 9/11). Trần 1 tỷ mỗi lệnh, không cộng dồn, có nhật ký `trip_cost_adjusted`, không tin báo. `docs/HANDOFF-N1.md` (mục 1.92) đã ghi «HC-4.2 mới giảm một nửa».
  - **Chủ ý một người theo ADR-0115 điều 3 («dựa vào kỷ luật»):** `dao_lan_thu` («Huỷ khoản thu» — bài dò 8/11 đúng, bài ghim ở `dieu-chinh-duyet-route.test.ts` «lệnh đảo … KHÔNG qua duyệt»), `dao_dong` («Huỷ dòng sổ»), «Sửa khoản thu đã ghi», đảo / chụp lại / giá thoả thuận chi phí chuyến. Ba chỗ sát ranh giới (huỷ dòng của điều chỉnh đã duyệt; cổng `commercial_line_needs_approval` chỉ máy chủ; giá thoả thuận nhập tay) ghi ở phác đặc tả §3.
  - **Ghi chú sổ đã cũ:** `ly_do` của mục còn nói ADR-0092 «chưa triển khai»; ghi chú 17/10 «đã giải phần lớn» chỉ đúng cho công nợ.
  - Phác đặc tả đợt 2: `docs/superpowers/specs/2026-11-09-hc-4-2-phac-dac-ta-dot-2.md`. Đề xuất gia hạn: trang hỏi chủ Phần B.

## 4.3 Hai ô quyền chưa có route (`task.progress`, `dispatch.guides.view`)

- **Không thi công — dừng hỏi chủ.** Kế hoạch 9/11 khuyến nghị bỏ, nhưng không nhắc rằng việc bỏ đúng hai ô này đã được trình một lần: ADR-0086 (1/10) bị chủ **bác** («giữ lại đi, tiếp»), và ADR-0019 điều 5 (đã duyệt) chủ ý giữ hai ô. Bỏ ô bây giờ là đổi nghĩa một ADR đã duyệt, nên cần ADR mới chủ duyệt (CLAUDE.md §2 «không tự hoà giải»; N3). Lời duyệt kế hoạch tự ghi «không thay cho duyệt từng ADR». Đưa vào câu hỏi gom: gia hạn (giữ đúng quyết định 1/10) hoặc soạn ADR mới thay ADR-0086.
- Đã dò phạm vi nếu bỏ: `src/shared/permissions.ts` (hai dòng + chú thích), `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts`, `src/shared/tro-ly-cau-truc.test.ts`, chú thích `src/modules/dispatch/rules.ts`, `docs/quyen-hoan.json`, `docs/SYSTEM-DESIGN.md`. Không migration, không trigger, không chỗ giao diện ẩn/hiện, không có trong bảng tham chiếu.

## Kiểm cuối đợt (9/11)

- Người kiểm độc lập cho phần sửa sổ (`43de00e01`): **ĐẠT** — chỉ ba mục đổi `han` đúng ngày; HC-4.2 và mọi mục khác không đổi trường nào; `ke_hoach` mới bắt đầu bằng đúng chuỗi cũ; mọi `xay_tren_cho_phep*`, `gia_han_*` giữ nguyên; câu nối kiểm được là đúng; 19/19 bài sổ xanh.
- `npm test` thoát 0 (8468 bài, 8464 đạt, 0 đỏ; bước đo giờ hook 1/1). `npm run typecheck` thoát 0.
- Không chạy e2e, kịch bản Chrome: đợt này không đổi mã, API, migration hay giao diện (chỉ tài liệu, bằng chứng và `docs/quyen-hoan.json`). Không cần mục nhật ký thay đổi (`changelog.ts`) vì người dùng không thấy gì mới; **không cần triển khai** sau khi nhập.

## Nhập vào bản chính (chủ chạy, Phần X bước 6)

Đứng ở bất kỳ đâu, chép nguyên khối (lệnh tự từ chối khi còn lệnh nhập/triển khai khác hoặc bản chính vừa đổi):

```bash
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales && if pgrep -f 'scripts/day-le[n].mjs' > /dev/null; then echo "CHƯA CHẠY: còn một lệnh nhập khác đang chạy hoặc đang chờ bạn gõ c. Trả lời lệnh đó trước."; elif pgrep -f 'scripts/trien-kha[i].mjs' > /dev/null; then echo "CHƯA CHẠY: lệnh triển khai đang chạy. Chờ nó xong rồi chạy lại khối này."; elif git fetch origin && [ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] && git merge-base --is-ancestor main claude/dot-4-han-30-11-7d0bdb; then npm run day-len -- claude/dot-4-han-30-11-7d0bdb; else echo "CHƯA CHẠY: bản chính vừa có thay đổi mới. Báo AI gộp lại rồi chạy lại khối này."; fi
```

Nhánh mang theo 23 lần lưu tài liệu của nhánh prompt rà soát (xem «Mốc đầu phiên»). Nếu phiên khác nhập kế hoạch 9/11 trước, lần lưu trùng sẽ tự khớp.

## Việc còn treo

- **HC-4.2 hạn 30/11** chưa dời (chủ chọn chưa ghi sổ). Trước 0 giờ 1/12: chủ ra lệnh dời (đề xuất 31/1/2027) hoặc làm xong đợt 2 ADR-0115 theo phác đặc tả.
- TNV-G1 (hạn mới 31/12): năm ca vàng chờ chủ/Kế toán; ca 07 chờ duyệt đặc tả phiếu chi; chủ chạy `node scripts/audit-invariants.mjs --db remote`.
- Ngoài phạm vi, ghi để điều phối xem: số thô `/payments daThu`, `receipt.daTra` của đơn huỷ còn gồm chuyển khoản chưa xác nhận; G9 (nút Từ chối gửi mã `busy`); biên nhận nháp tiêu đề «XÁC NHẬN ĐƠN DỊCH VỤ [Chờ xác nhận]»; ba chỗ sát ranh giới HC-4.2 ở phác đặc tả §3.

- Gộp bản chính `a5330137a` (phiên soạn ADR lượt A, B; chỉ tài liệu, không trùng tệp) vào nhánh sau kiểm cuối; chạy lại 167 bài đọc sổ hạn, ADR, hàng rào: 167 đạt / 0 đỏ. Bộ đầy đủ 8468 bài chạy trước lần gộp này.
