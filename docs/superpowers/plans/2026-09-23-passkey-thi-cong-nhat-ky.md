# Nhật ký thi công: đăng nhập bằng Face ID (passkey), ADR-0016 lát 0 + lát 1

- **Kế hoạch:** `docs/superpowers/plans/2026-09-23-passkey.md`
- **Đặc tả:** `docs/superpowers/specs/2026-09-23-passkey-design.md`
- **Nhánh:** `worktree-thi-cong-passkey`, tạo từ `worktree-ke-hoach-passkey` (7ee1cb9). Đã gộp `main` 4e7fcfd trước Task 1 (d0fae5a). Chưa push.
- **Cách làm:** mỗi task giao cho một trợ lý thi công riêng. Sau mỗi task có một trợ lý rà soát (đặc tả + chất lượng); nếu có lỗi thì sửa rồi rà lại phần sửa. Hết các task thì rà cả nhánh, làm một đợt sửa, và cuối cùng mời người kiểm độc lập chỉ đọc (vai `nguoi-kiem-doc-lap`).
- **Trạng thái 2026-09-23:**
  - Task 0–12 xong.
  - **8b CHƯA LÀM**: ngưng tài khoản chưa gỡ Face ID. Việc này chờ chủ quyết A-4 và **CHẶN phát hành**.

## Mốc

| Việc | Commit | Kết quả rà soát |
|---|---|---|
| Task 0: trang thử iPhone | 8abb882 | đạt |
| Lát 0: kết luận | 1e0e7c8 | **ĐI**. Mô phỏng chuyển hướng kiểu Google chưa có kết quả, phải thử lại trước lát 2 |
| Task 1: `auth` sang STRICT | d0fae5a..74c2860 | đạt; `docs/ARCHITECTURE.md` sửa ở commit riêng, **chờ chủ duyệt** |
| Task 2: migration 0023 `aut_passkey` | ..9708383 | đạt; `ARCHITECTURE.md` (tiền tố `aut_`) **chờ chủ duyệt** |
| Task 3: CBOR | ..fb8b30c | đạt |
| Task 4: kiểm WebAuthn | ..4e781f2 | đạt sau 1 vòng sửa (RSA ≥ 2048 bit, e lẻ ≥ 3) |
| Task 5: token thách thức | ..d4956f1 | đạt sau 1 vòng sửa (test không còn chập chờn, chữ ký dạng chuẩn, chặn `.`/`-`) |
| Task 6: nền staff/session/nhật ký/hợp đồng | ..9c35a99 | đạt |
| Task 7: route đăng nhập công khai | ..3b2e705 | đạt |
| Task 8a: route ở `accounts` (trừ nhánh ngưng tài khoản) | ..07a9118 | đạt |
| Task 9: e2e `passkey` | ..b37e8ae | đạt sau 1 vòng sửa (kiểm đúng mã lỗi, thêm ca) |
| Task 10: giao diện | ..10a1c0b | đạt |
| Task 11: kịch bản Chrome, authenticator ảo | ..a5ce1c2 | đạt |
| Task 12: tài liệu, bất biến R-AUT-1, runbook | ..3c41f99 | đạt sau 1 vòng sửa (8b thành điều kiện chặn, sửa thứ tự runbook) |
| Rà toàn nhánh + đợt sửa cuối | ..227b74d | đạt |

Đợt sửa cuối gồm:
- mọi route passkey trả 503 khi tính năng tắt, theo đặc tả §2.3;
- mốc phiên đăng nhập được lấy trước khi kiểm khoá;
- câu xác nhận "Gỡ tất cả" sửa đúng;
- dòng máy ở trang "Tôi" có đường kẻ;
- tài liệu sửa cho khớp mã.

## Phán quyết của điều phối (quyết thay chủ; sai thì sửa lại)

Phán quyết thắng chữ kế hoạch khi hai bên mâu thuẫn. Lý do chi tiết nằm ở bản rà trước (mã A-x, B-x, D-x). Bản đó là tệp nháp gitignore, dưới đây là tóm tắt.

1. **Gộp `main` vào nhánh trước Task 1.**
   - Vì sao: kế hoạch lập trên nền cũ.
   - Nếu sai: hoàn tác bằng reset về 1e0e7c8.
2. **Số route: 59 → 69** (kế hoạch ghi 58 → 68), vì `main` đã thêm route dashboard.
3. **Theo đặc tả/ADR khi kế hoạch lệch:**
   - A-1: trùng khoá trả 409 bằng `isPasskeyTaken` riêng.
   - A-2: lời mời đặt sau `</form>`.
   - A-3: ngưng hoặc gỡ khoá thì đẩy `credentials_changed_at`.
   - A-5: thứ tự khi đăng nhập là kiểm → cổng bảo trì → dùng một lần.
   - B-3: `web/api.ts` chỉ chuyển về trang đăng nhập khi gặp 401 `unauthenticated`. Đây là giả định bề mặt, đảo ngược được.
   - B-4: `validateFreshPin` đặt ở `staff/rules.ts`.
   - D-1: luồng bật Face ID hai bước viết một lần trong `web/passkey.ts`.
   - Cùng các neo dòng/tên đã lệch do `main` đổi.
4. **`docs/ARCHITECTURE.md` là tài liệu chuẩn tắc,** nên được sửa bằng hai commit riêng ghi "(chờ chủ duyệt)" (0109cf4, 9708383). `src/CLAUDE.md` và `CLAUDE.md` chỉ được **đề xuất**, ở `docs/superpowers/plans/2026-09-23-passkey-de-xuat-claude-md.md`.
5. **A-4 KHÔNG tự quyết** (CLAUDE.md §2, §3 P8), vì đặc tả và kế hoạch đã duyệt lệch nhau. Task 8 tách làm hai: 8a làm ngay, 8b chờ chủ.
6. **Khoá RSA theo đặc tả §2.5:** n ≥ 2048 bit tính theo bit, e lẻ và ≥ 3. Kế hoạch chỉ đếm byte.
7. **Test chữ ký trong Task 5:** kế hoạch viết dạng chập chờn (khoảng 1/1024 lần chạy). Đã sửa bằng giá trị ngẫu nhiên cố định.
8. **Ẩn nút admin "Gỡ Face ID" trên dòng của chính admin.** Route admin không cấp lại cookie; tự gỡ thì làm ở trang "Tôi".
9. **Kịch bản Chrome cũ chạy với Face ID TẮT** (`PASSKEY_*` rỗng). Chỉ `passkey-smoke.mjs` bật.
10. **Dòng đồng tác giả:** vài commit (b73418d, 9708383, 10a1c0b, a5ce1c2, 6db332c) ghi đúng tên mô hình thật đã viết commit đó. Không viết lại lịch sử; chủ muốn thì amend trước khi push.
11. **Kịch bản e2e `web/CLAUDE.md`:** Task 11 thêm một dòng vào bảng kịch bản Chrome để đăng ký `passkey-smoke.mjs` (commit a5ce1c2). Dòng này do điều phối cho phép. Nó không đổi nghĩa quy tắc, nhưng vẫn là sửa tệp luật, nên **chủ xem lại** (`git show a5ce1c2 -- web/CLAUDE.md`).
12. **I-1 (rà toàn nhánh):** 4 route (xem danh sách, gỡ một, gỡ hết, admin gỡ hết) nay trả 503 khi tắt, đúng đặc tả. Khi tắt, chỉ còn cách "đặt lại PIN" để gỡ khoá.

## 8b: việc còn lại, CHẶN phát hành

Chủ chọn A-4:
- **Phương án 1 (khuyến nghị):** gỡ Face ID trong cùng lô ghi với việc ngưng.
- **Phương án 2:** hai lô liền nhau.

Làm 8b theo mục "Khuyến nghị cho 8b" của bản rà toàn nhánh. Tóm tắt:
- **Bẫy chuỗi lô ghi.** `patchStaffStatements` (`accounts/index.ts`) dựa vào luật "mỗi mắt xích đổi ≥ 1 dòng". Câu gỡ khoá có thể đổi 0 dòng.
  - Chèn câu gỡ vào giữa chuỗi thì nhật ký phía sau lặng lẽ không chạy.
  - Nối vào cuối chuỗi mà không có điều kiện thì Face ID bị gỡ ngay cả khi chốt "admin cuối cùng" thua.
- **Phương án 1:** thêm câu gỡ mới đặt CUỐI lô, có điều kiện riêng: `… WHERE staff_id = ?1 AND valid_to_at IS NULL AND EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)`. Câu này đọc qua view, vì cạnh `auth → staff` đã được phép. Sau nó là touch `credentials_changed_at` (…, true), rồi dòng nhật ký `passkey_removed` với `changes() > 0`.
- **Phương án 2:** chỉ chạy lô thứ hai khi `results[guardIndex].meta.changes > 0`. Thứ tự: gỡ → touch(…, true) → nhật ký.
- **Cả hai phương án:**
  - Thêm e2e: ngưng tài khoản → khoá bị gỡ, `passkeyCount` = 0, nhật ký đúng một dòng. Kích hoạt lại → khoá cũ vẫn `passkey_unknown`.
  - Sửa `tests/e2e/passkey.mjs` (khoảng dòng 196–210), chỗ đang khẳng định "kích hoạt lại thì còn 2 khoá". Thêm assert có chú thích `// 8b`.
  - Sửa chú thích tương ứng ở `src/audit-invariants.test.ts`.
  - Bỏ mục CSS "`.card` lồng" khỏi "Việc còn treo" ở `docs/HANDOFF-N1.md`, vì đã sửa ở 227b74d.
  - Kiểm độc lập riêng cho 8b trước khi gộp.

## Việc còn nợ, không chặn (đã phân loại "để sau")

- Pin-by-passkey có nên gỡ khoá "sai PIN quá nhiều" (`unlockPhone`) như admin reset-pin không? Đặc tả không nói, **chủ quyết**.
- Khi Face ID tắt, nút admin "Gỡ Face ID (n)" vẫn hiện; bấm vào nhận 503 kèm lời giải thích. Có thể ẩn theo `config.passkey`.
- Chưa có hàng rào máy nào chặn triển khai trước khi 8b xong; việc này **dựa vào kỷ luật** (P16). Lý do phải cẩn thận: `wrangler.jsonc` đã khai giá trị production cho `PASSKEY_*`, nên gộp rồi deploy là Face ID bật ngay.
- `docs/HANDOFF-N1.md` (khoảng dòng 241) ghi "2 công khai, 6 tự phục vụ, 1 admin", cộng lại chỉ ra 9. Đúng là 2 + 7 + 1 = 10.
- `verifyAssertion` chưa so `userHandle`. Phòng thủ thêm thì tốt, nhưng không khai thác được, vì khoá được tra theo `credential_id` UNIQUE và chữ ký được kiểm bằng khoá công khai đã lưu.
- e2e `catalog.mjs:29` đỏ vì giá thật trên Google Sheet đã đổi (TTB03: 1.300.000 so với 1.000.000 ghi cứng). Không liên quan Face ID.
- Các điểm nhỏ khác đều đã phân loại "để sau": thiếu vài ca test âm, JSDoc, kiểu `satisfies`, dọn CSS inline, v.v.

## Kiểm độc lập (vai `nguoi-kiem-doc-lap`, HEAD 227b74d): ĐẠT CÓ ĐIỀU KIỆN

Kết quả người kiểm tự chạy:

| Lệnh | Kết quả |
|---|---|
| `npm test` | 540/540 |
| `npm run typecheck` | 0 lỗi |
| `npm run build:web` | OK |
| `npm run test:e2e` (đủ bộ) | 16/17; `catalog` đỏ vì dữ liệu Sheet, không liên quan. Đuôi `audit-invariants --strict` xanh, kể cả R-AUT-1 |
| `passkey-smoke.mjs` | 9/9 |
| `dot-c-smoke.mjs` | 6/6 |
| `v1-dang-nhap.mjs` | 15/15 |
| `v1-bao-tri.mjs` | 17/17 |

Người kiểm cố ý phá 3 chỗ trên một bản sao để xác nhận các bài kiểm chặn thật:
- bỏ kiểm "tắt" ở một route → `passkey-off.test.ts` đỏ;
- thêm cạnh `auth → audit` → `architecture.test.ts` đỏ;
- bỏ kiểm cờ UV → `webauthn.test.ts` đỏ.

Tiêu chí đặc tả §4:
- Tiêu chí 1–3 và 5–11: có bằng chứng.
- Tiêu chí 4 **chưa đủ**, đúng khoảng hở 8b.

Lưu ý: `audit-invariants` xanh trên D1 tạm của e2e **không** có nghĩa 8b đã xong. Nó xanh vì kịch bản đã kích hoạt lại tài khoản trước khi kết thúc.

Chưa kiểm:
- trạng thái production (người kiểm không chạy lệnh remote);
- iPhone thật với bản đầy đủ, vì lát 0 mới chỉ thử trang thử riêng.
