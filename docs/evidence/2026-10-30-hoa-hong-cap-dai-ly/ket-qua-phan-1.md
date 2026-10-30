# Kết quả kiểm giao diện phần 1 — trang Hoa hồng xếp theo cấp đại lý (Task 14, 2026-10-30)

Mã kiểm: cây làm việc trên mốc `67a19357` (Task 13) cộng kịch bản Chrome viết lại ở Task 14. Máy: macOS, Node v22.22.3, Chrome qua `chrome-wrap.sh`, axe-core ngoài repo. Mọi kịch bản Chrome chạy trên D1 tạm + `wrangler dev` cục bộ (không `--remote`); mọi tiến trình đã tắt, thư mục D1 tạm đã xoá (đối chiếu danh sách tiến trình và `$TMPDIR/tourdao-a2-*` trước và sau).

| Lệnh | Dòng cuối | Kết quả |
|---|---|---|
| `npm run build:web` | `⚡ Done in 1ms` | ĐẠT |
| `npm run test:e2e -- pwa` | `E2E: 4/4 kịch bản xanh` | ĐẠT |
| `npm run test:e2e -- sua-muc` (có mạng lúc chạy) | `E2E: 4/4 kịch bản xanh` | ĐẠT |
| `AXE_JS=… CHROME_BIN=…/chrome-wrap.sh OUT=docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/anh node docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` | `HOA HONG SMOKE OK` (51 bước ✓, 91 ảnh trong `anh/`) | ĐẠT |
| `HH_PHA=lo-nut HH_KHO=1040 … hoa-hong-smoke.mjs` (P16) | `HOA HONG SMOKE ĐỎ — 2 bước:` (7[1040] và 14b[1040]) | ĐỎ có chủ đích (đúng kỳ vọng) |
| `node docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs` | `UI SMOKE FORM OK` | ĐẠT |
| `node docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs` | `T2B DANH BA SMOKE OK` | ĐẠT |
| `node docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs` | `Error: hết giờ chờ: nhat-ky: thẻ đã dựng xong (máy tính)` | ĐỎ SẴN từ ADR-0038 (đúng chỗ `web/CLAUDE.md` ghi); mọi bước trước đó ✓, gồm `ho-so` 1040 + 390 |
| `node scripts/chup-muc-giao-dien.mjs --so-sanh 20ffe9ad` | `So 20ffe9ad ↔ cây làm việc: GIỐNG HỆT (khung thật + khung tạm 1024 tập, ô Trang chủ 1024 tập, mất mạng, 47 trang × 3 tài khoản).` | ĐẠT (không khác, không chạy `--ghi`) |
| `node scripts/sinh-so-do-trang.mjs` | `Kho trợ lý: khớp mã, không đổi.` — `git status` không có `src/shared/so-do-trang.ts` | ĐẠT |
| `node --test src/shared/tro-ly*.test.ts src/shared/huong-dan*.test.ts src/modules/tro-ly/tro-ly-route.test.ts` (bài Hướng dẫn và Trợ lý; cũng nằm trong `npm test`) | `# fail 0` (158/158) | ĐẠT |
| `npm test` | `── npm test: bước 1 thoát 0, bước 2 thoát 0` | ĐẠT |
| `npm run typecheck` | `tsc --noEmit && tsc --noEmit -p web && tsc --noEmit -p web/sw` thoát 0, không lỗi | ĐẠT |

Ghi chú: `t2b-danh-ba-smoke.mjs` ghi đè hai ảnh của `docs/evidence/2026-10-01-tro-ly-mai/anh/` dù có `OUT`; đã hoàn nguyên bằng `git checkout`, không vào lần lưu.

## Số đo đáng chú ý (từ lượt `HOA HONG SMOKE OK`)

- Khổ 900 và 1040, thanh bên mở (248px ở cả hai khổ), cấp «Vàng» có dòng Người lớn / Trẻ em / Người cao tuổi: `scrollWidth ≤ innerWidth` (không dung sai); bảng «Mức của cấp» cuộn trong `.hh-muc-cap-khung`; ma trận hơn 5 cấp cuộn trong `.hh-ma-tran-khung` ở 1040. Khổ 899 và 390: ma trận ẩn, chip chọn cấp hiện, câu ô «—» không có trong chữ nhìn thấy.
- «Xem dòng ↓»: bậc 1–3 ⇒ thẻ đối tác, 4–6 ⇒ thẻ loại (cả khi ô tìm đang giấu dòng: bộ lọc về rỗng rồi thấy), 7–9 ⇒ thẻ cấp, 10–12 ⇒ thẻ cấp kèm «<cấp> — cấp riêng của đối tác đang tra»; dòng không có trên trang ⇒ toast tông `bien` nguyên văn.
- Khoá cấp: hộp và huy hiệu nguyên văn §5.2; dòng mức của cấp khoá chỉ còn «Ngừng» ở nút và trong «⋯»; lần xếp loại «Đổi cấp» sang cấp Bạc ⇒ `POST …/muc-ta/gan/:id/doi` 200 (tiêu chí 4). Tắt loại: hộp nguyên văn, huy hiệu `xam` «Đã tắt».
- Cấp riêng: đặt, sửa, ngừng chạy trên trang; đặt chồng ngày ⇒ 409 với câu §6.1 nguyên văn trong hộp (tiêu chí 5).
- Bán hàng: ba thẻ, mọi cụm đối tác mở: 0 nút ghi, 0 «⋯». Đối tác mở sau cùng (cả hai khổ): trang 403 «Bạn không có quyền xem trang này.», GET `/api/pricing/hoa-hong` 403 (tiêu chí 7).
- «⋯» bằng bàn phím (tiêu chí 8): Tab tới «⋯», Enter mở, tiêu điểm vào khung, nền `inert`, Esc đóng về «⋯», `aria-haspopup="dialog"`. **Thứ tự Tab trong bảng: Tab đầu tới nút ✕ «Đóng» của `moBangTruot`, Tab thứ hai mới tới nút đầu danh sách** (390: «Đổi», 1040: «Sửa»). Tiêu chí 8 viết «Tab tiếp theo tới nút đầu của danh sách»; kịch bản ghi đúng thứ tự đo được và chấp nhận hai lần Tab. Chờ người kiểm / chủ quyết.
- axe: 0 lỗi nghiêm trọng / nặng; lỗi nhẹ `aria-allowed-role` ở `#hh-cap-ct` (`article` mang `role="tabpanel"`) mọi khổ. Vùng chạm: hai phần tử đo 44,00px khi làm tròn hai chữ số nhưng thật ra dưới 44 một phần rất nhỏ (nút ✕ của hộp, ô «Đến» của hộp Sửa áp dụng cấp) — lọt nhờ dung sai 0,5px của kịch bản.

## Bản gọn ảnh (chủ dự án chọn 30/10)

Nhánh `thi-cong-hoa-hong-cap-dai-ly-gon` chỉ giữ 16 ảnh then chốt trong `anh/`. Bản đủ 93 ảnh nằm ở nhánh dự phòng `thi-cong-hoa-hong-cap-dai-ly`, lần lưu `961e0ef4`. Các bước và dòng kết quả ở trên không đổi.
