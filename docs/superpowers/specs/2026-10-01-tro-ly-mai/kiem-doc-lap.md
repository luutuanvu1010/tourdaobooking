# Kiểm độc lập — nhánh `tro-ly-mai` (khung chat 1.57 + ADR-0084 trợ lý Mai)

- **Người kiểm:** subagent kiểm độc lập, chỉ đọc (P15, N8). Không thi công phần nào của nhánh này. Không sửa tệp nào trong cây (trừ chính tệp báo cáo này theo yêu cầu), không commit, không lệnh `--remote`.
- **Ngày:** 2026-10-01. **Phạm vi:** `git diff d08aea0c..HEAD` (HEAD = `c4125695`, 21 commit).
- **Chuẩn đối chiếu:** ADR-0084 (accepted, có trang ghép), ADR-0069 điều 5, ADR-0073, ADR-0082, ADR-0070 (câu từ chối), CLAUDE.md, `src/CLAUDE.md`, `web/CLAUDE.md`; báo cáo thi công `bao-cao-thi-cong.md` coi là lời khai chưa kiểm.

## Kết luận

**ĐẠT** — không thấy chỗ nào mã trái ADR-0084 hay ADR đã duyệt khác, không thấy lỗ an toàn / quyền / dữ liệu ra ngoài. Điều kiện trước khi `day-len`: **đánh lại số phiên bản 1.57 → 1.58** (main đã dùng 1.57) và giải hai xung đột gộp (TB-1). Chủ cần quyết 3 điểm (mục "Cần chủ quyết").

Số phát hiện: **Cao 0 — Trung bình 2 — Thấp 7.**

## Lệnh đã tự chạy lại

| Lệnh | Kết quả thật |
|---|---|
| `npm test` | bước 1: `# tests 2508 # pass 2508 # fail 0`; bước 2 (bài đo giờ hook, chạy một mình): `# pass 1 # fail 0`; `npm test: bước 1 thoát 0, bước 2 thoát 0` (khớp lời khai 2508 + 1; bài đo giờ không đỏ) |
| `npm run typecheck` | thoát 0, 0 lỗi (server, `web`, `web/sw`) |
| `npm run build:web` | thoát 0 |
| `npm run test:e2e` | thoát 0; `E2E: 36/36 kịch bản xanh`; `audit-invariants` cuối: "Mọi bất biến đạt, 6 cảnh báo (D1 local, --strict)" (cảnh báo nghiệp vụ của dữ liệu thử, không chặn); `✔ không có nội dung câu hỏi trợ lý trong log Worker`; kịch bản `tro-ly` (gồm bước 12b ADR-0084), `parties`, `gop-ho-so`, `company` xanh. Sau khi chạy: 0 tiến trình nào trỏ tới worktree này (không cần tắt gì; `wrangler dev` của `dac-ta-2fa` không bị đụng) |
| `node --test src/architecture.test.ts` | `# tests 44 # pass 44 # fail 0`; diff `src/architecture.test.ts` rỗng (không thêm cạnh); `"tro-ly": ["audit", "staff"]` giữ nguyên |
| `npm run dict` trên bản sao tạm (git archive HEAD → `/tmp/kd-mai-ban`) | thoát 0; `diff` với `docs/DATA-DICTIONARY.md` của HEAD: **không khác** |
| `git merge-tree --write-tree --name-only HEAD origin/main` | **CONFLICT (content)** ở `src/shared/changelog.ts` và `docs/adr/README.md` (TB-1) |
| `git log --all --name-only --format= -- migrations/` lọc `006x` | `0060_tl_bo_nao`, `0061_aut_session`, `0062_tl_van_nghia`, `0063_ten_vai_tai_xe_taxi`, `0064_pty_person_gender` — **0064 không trùng** nhánh nào; main lớn nhất là 0063 |

## Đột biến tự làm (bản sao tạm `/tmp/kd-mai-ban`, cây thật không đụng)

| # | Đột biến | Kết quả | Hoàn nguyên |
|---|---|---|---|
| 1 | Bỏ `WHERE h.id = 'gieo-0054'` ở `migrations/0064_pty_person_gender.sql:26` | `not ok 5 - (c) Toàn quyền đã lưu lời dặn ⇒ KHÔNG thêm bản nào` (pass 4, fail 1) | chép lại → 5/5 xanh |
| 2 | Route PUT: `gender: pv.gender ?? null` (vắng ô ⇒ xoá) ở `src/modules/parties/index.ts:926` | `not ok 1 - PUT: đặt NU → lưu… vắng ô ⇒ giữ nguyên…` (pass 3, fail 1) | → 4/4 xanh |
| 3 | Nhật ký ghi kèm giá trị: `" — đổi giới tính ${v.gender}"` (`index.ts:929`) | `not ok 1 - PUT: … nhật ký 'đổi giới tính' KHÔNG kèm giá trị…` | → 4/4 xanh |
| 4 | Câu `xung-ho` (`src/modules/tro-ly/repository.ts:13`) đọc `v_stf_staff_label.label` (tên đầy đủ) làm tên gọi | `not ok 18`, `19`, `20`, `21` của `tro-ly-route.test.ts` (pass 17, fail 4) — khớp dòng sổ hàng rào | → 21/21 xanh |
| 5 | Hai lần **kiểm trần** (`index.ts:489`, `:531`) dùng `xungHo(null, null)` thay người hỏi thật | **vẫn xanh**: `node --test src/modules/tro-ly/*.test.ts src/shared/tro-ly*.test.ts` → `# pass 196 # fail 0` | chép lại (xem T-1) |

Đột biến 4 lặp lại đúng đột biến (2) của dòng sổ hàng rào ADR-0084 → **dòng sổ hàng rào xác nhận được** (đỏ đúng chỗ khai). Mọi đột biến làm ở `/tmp/kd-mai-ban`.

## Kiểm theo từng mục được giao

### 2. Quyền (đường ghi `gender`)
- `PUT /api/parties/:id` (`src/modules/parties/index.ts:905-933`): thứ tự cổng **không đổi** — công ty chủ → `company.legal.write`; hồ sơ gắn tài khoản → `party.staff.write` + `manageable`; còn lại → `party.write`; rồi `DA_GOP()` (hồ sơ đã gộp) **trước** khi đọc thân. Ô giới tính chỉ được đọc sau các cổng này. Không route ghi mới (`route-access.test.ts` chỉ đổi chú thích), không ô quyền mới (`permissions.ts` không đổi).
- Giá trị lạ → 400 "Giới tính chỉ nhận Nam, Nữ hoặc để trống." (`src/shared/xung-ho.ts:72-77`, `rules.ts:384-385`); tổ chức gửi giá trị → 400 "Hồ sơ tổ chức không có giới tính." (công ty chủ là tổ chức nên ô này không áp được). Bài `gioi-tinh-route.test.ts` ca 2, 3 phủ (kể cả 403 khi Bán hàng sửa hồ sơ có tài khoản của người khác).
- Nhật ký: `detail` = `"cá nhân — đổi giới tính"`, không giá trị (`index.ts:929`); đột biến 3 chứng minh bài canh.
- Vắng ô = giữ giá trị (`index.ts:924-926`); đột biến 2 chứng minh bài canh. Khoá lạc quan `expectedUpdatedAt` vẫn chặn ghi đè đồng thời.
- Module `staff` (`staff/index.ts:133, 349`) và `orders/service.ts:397` không gửi giới tính → NULL; `renamePersonStatements` không chạm cột. Đúng ADR.

### 3. Dữ liệu cá nhân ra ngoài
- Máy chủ đọc theo `staff.id` của phiên: `nguoiHoi(db, staff.id)` → `docNguoiHoi` → `SELECT given_name, gender FROM v_stf_staff_xung_ho WHERE id = ?1` (`tro-ly/repository.ts:13-18`, `index.ts:438-441`). Không chỗ nào đọc tên / giới tính từ thân request (đã đọc route `hoi`, `thu`, `khung`).
- View `v_stf_staff_xung_ho` chỉ có `id, given_name, gender` (`migrations/0064…:15-17`) — không họ, tên đệm, SĐT, display_name.
- `thanYeuCau` không có `user` / `safety_identifier` / `metadata` (`src/shared/tro-ly.ts:256-270`); bài thuần + bài route + e2e bước 12b soi `JSON.stringify` thân thật (họ / đệm đặc biệt, SĐT, id tài khoản, id hồ sơ, tên giả trong thân).
- `GET /api/tro-ly/khung` trả `goi` / `xung` đã tính, không `gender` (`index.ts:450-460`; bài "ADR-0084 Đ5 (khung)"; e2e 12b).
- Log: chỉ `{"event":"tro_ly_loi","ly_do":…}`, `tro_ly_nho_bi_tu_choi`, `tro_ly_van_nghia_loi` — không tên (`index.ts:39, 238, 244, 296, 419`); e2e: "không có nội dung câu hỏi trợ lý trong log Worker".
- Tên gọi được làm sạch (ký tự điều khiển, đảo chiều, xuống dòng) → luôn một dòng (`xung-ho.ts:40-42`).

### 4. Migration 0064
- Chỉ `ALTER TABLE … ADD COLUMN gender TEXT` (NULL, không CHECK) + 2 view + 1 `INSERT … SELECT` có điều kiện. Không thêm / đổi trigger (bài (a) so danh sách trigger trước / sau).
- `INSERT tl_loi_dan`: điều kiện `h.id = 'gieo-0054'` trên đúng thứ tự "hiện hành" của route (`ORDER BY valid_from_at DESC, created_at DESC, id DESC LIMIT 1` — trùng `tro-ly/repository.ts:73`). Trigger của `tl_loi_dan` chỉ chặn UPDATE / DELETE (`0054…:49-52`) → INSERT không vi phạm chỉ-thêm. Có bản Toàn quyền đã lưu → 0 dòng (bài (c) thứ hai; đột biến 1 chứng minh bài này đỏ khi bỏ điều kiện). Cột NOT NULL đủ; `cau_hoi_mau` chép từ bản gieo nên qua CHECK `json_valid`. Phù hợp ADR-0084 Đ3 / Đ5 ("bản Toàn quyền đã lưu không tự đổi" — bản gieo không phải bản Toàn quyền lưu). Vẫn là **ghi dữ liệu production khi áp** → chủ quyết trước khi áp.
- Hai view theo luật đọc xuyên module: `v_pty_person_xung_ho` (parties công bố) → `v_stf_staff_xung_ho` (staff đọc qua view parties, không JOIN thẳng `pty_*`) → `tro-ly` đọc view staff qua cạnh `tro-ly → staff` có sẵn. `grep pty_ src/modules/tro-ly/*.ts` (trừ test): 0 dòng.
- data-dictionary: hai view có trong `docs/data-dictionary.json` + `DATA-DICTIONARY.md`; sinh lại trên bản sao: khớp. (Từ điển không liệt cột của bảng nên cột `gender` không cần dòng riêng; mô tả cột có ở `SYSTEM-DESIGN.md`.)
- Số 0064: không trùng. Lưu ý `0061_aut_session` (nhánh 2FA) mang số nhỏ hơn mà có thể áp sau — wrangler theo TÊN nên không hỏng.

### 5. Kiến trúc — đạt (bảng lệnh).

### 6. Tiền
- Cả 5 nơi gọi `thanYeuCau` trong `index.ts` (489, 498, 507, 531, 539) đều truyền `nguoi` thật → mức trần trên **có** tính dòng Mai. Bài ghim tiền (`van-nghia-route.test.ts` `haiMuc`, `tro-ly.test.ts`) chỉ thêm tham số người hỏi vào CẢ hai vế → không nới; số kỳ vọng vẫn do cùng hàm thuần tính. Nhưng không bài nào **bắt** được khi kiểm trần dùng người giả (đột biến 5) — T-1.

### 7. Hàng rào mới (`docs/SO-HANG-RAO.md` dòng ADR-0084)
- Đã tái hiện đột biến (2) của dòng sổ (đột biến 4 ở trên): đỏ đúng 4 bài → hoàn nguyên xanh. Dòng sổ ghi "chưa kiểm độc lập" — nay người kiểm độc lập đã quan sát chặn thật ngày 2026-10-01.

### 8. Giao diện
- Không `innerHTML` (`web/tro-ly.ts`, `web/parties.ts`, `web/tro-ly-cai-dat.ts` dựng bằng `h()`); giá trị CSS mới vào token (`--tl-cham-co`, `--tl-cham-nhip`, `--tl-nhay`, `--tl-cham-tre`; `--c-primary-soft`, `--radius-pill` có sẵn); token cũ `--tl-co-net`, lớp `.tl-luu-y`, `.tl-trang-thai` gỡ sạch (grep 0).
- Hai dòng nhắc: đã bỏ khỏi khung (`web/tro-ly.ts:141-142` chỉ còn `ds` và `form, nutMoi`); vẫn có ở Trợ giúp (`src/shared/huong-dan-chung.ts:112-113`).
- `prefers-reduced-motion`: ba chấm ẩn (`public/app.css:2156`); nháy viền "Về góc" bị luật chung `* { animation: none !important }` (`app.css:797`) tắt. Có ảnh `m-giam-chuyen-dong-390.png`.
- Ảnh đã xem: `n-loi-chao-co-ten-390.png` ("Chào chị Một, em là Mai…"), `m-dang-tra-loi-390.png` ("Chào bạn, em là Mai…" + "Mai đang trả lời…"), `danh-ba-gioi-tinh-chon-1040.png` (ô Giới tính "Nữ" cạnh Họ và tên). Chữ có dấu đầy đủ.

### 9. Các lệch đã khai
- Lệch 1 (dòng Mai trước khối TÀI LIỆU): đúng chữ ADR Đ3 ("nối thêm sau lời nhắc do Toàn quyền soạn"); giữ ADR-0073 B4 (khối tài liệu vẫn cuối). Chấp nhận.
- Lệch 2 (migration ghi dữ liệu có điều kiện): phù hợp ADR; chủ quyết trước khi áp production.
- Lệch 3 (bỏ qua khoá lạ trong thân): đúng "không tin trình duyệt"; bài canh.
- Lệch 4 (viết hoa đầu câu): bề mặt, đảo ngược được.
- Lệch 5 ("Ngày mai hỏi tiếp", dòng gợi ý `{ten}`, `data-tl`): bề mặt; ADR-0066 điều 6 chỉ ghim nguyên văn câu trần THÁNG (`CAU_HET_TRAN_THANG` không đổi).
- Lệch 6 (không thêm ô ở Quản lý tài khoản): đúng trang ghép. Hệ quả T-6.
- Lệch 7 (kịch bản Chrome chờ bong bóng mất): hợp lý.
- **Câu chào mặc định xưng "em" khi gọi "bạn"** → TB-2. **`CAU_TU_CHOI` xưng "Mình"** → T-2.

### 10. Changelog 1.57
- Lời thường, đúng `kind`, `app-info.test.ts` khớp "Phiên bản 1.57". Dòng 5 có chữ "token" — chỉ Toàn quyền thấy ô thử, chấp nhận được. **Nhưng số 1.57 đã bị main dùng** → TB-1.

## Phát hiện

### Trung bình

**TB-1 — Số phiên bản 1.57 trùng main; gộp vào main hiện tại có xung đột.**
- Bằng chứng: `origin/main` nay là `99d0d2fb` (không còn `d08aea0c` như lời giao); `changelog.ts` của main mở đầu bằng `version: "1.57"` (ADR-0083). Lệnh mô phỏng gộp (`git merge-tree --write-tree --name-only HEAD origin/main`) → `CONFLICT (content)` ở `src/shared/changelog.ts` và `docs/adr/README.md`.
- Hậu quả: `day-len` dừng; giải xung đột vội có thể ra hai mục 1.57 hoặc `app-info.test.ts` sai.
- Đề xuất: gộp main mới vào nhánh, đổi mục của nhánh thành **1.58** (`src/shared/changelog.ts:13-26`, `src/shared/app-info.test.ts:21`, chú thích "Số 1.57"), sửa dòng "số ADR kế tiếp" ở `docs/adr/README.md`, chạy lại `npm test` + `npm run typecheck` + e2e trên cây đã gộp. **Người kiểm chưa kiểm cây đã gộp.**

**TB-2 — Câu chào mặc định "Chào bạn, em là Mai…" trái Đ2 ("bạn" thì xưng "mình") — mâu thuẫn NỘI BỘ ADR-0084, không phải lỗi thi công (cần chủ quyết).**
- Bằng chứng: `src/shared/xung-ho.ts:56` và `migrations/0064_pty_person_gender.sql:23` đúng nguyên văn ADR Đ5; Đ2 ghi "NULL hoặc thiếu tên → gọi 'bạn', xưng 'mình'". Migration để `gender` NULL cho MỌI hồ sơ ⇒ ngày đầu **mọi** người dùng thấy "Chào bạn, em là Mai…" rồi Mai trả lời xưng "mình" (ảnh `m-dang-tra-loi-390.png`).
- Hậu quả: xưng hô lệch ngay câu đầu với mọi người dùng cho tới khi bổ sung giới tính.
- Đề xuất (chủ quyết, không tự sửa ADR đã duyệt): (a) chấp nhận; (b) thêm chỗ thay `{xung}` cho câu chào (máy chủ đã trả `xung`) và đổi câu mặc định — cần dòng sửa ADR; (c) đổi Đ2 để "bạn" vẫn xưng "em". Nếu đổi câu chào mặc định thì phải đổi cả câu trong migration 0064 TRƯỚC khi áp production.

### Thấp

**T-1 — Không bài nào bắt được kiểm trần dùng người hỏi giả.** Đột biến 5 (`index.ts:489`, `:531` dùng `xungHo(null, null)`) → 196/196 xanh. Lời khai "mức trần tính cả dòng Mai" hiện chỉ dựa vào kiểu bắt buộc tham số. Tác động tiền rất nhỏ (tên gọi một từ ⇒ vài chục token). Đề xuất: bài route đặt trần đúng bằng mức trần trên của người có `given_name` dài, kỳ vọng 429 (đỏ khi kiểm bằng "bạn").

**T-2 — `CAU_TU_CHOI` xưng "Mình" (`src/shared/tro-ly-bo-nao.ts:17`) trong khi luật 12 bảo xưng theo dòng "Người đang hỏi".** Luật 2 (câu từ chối nguyên văn, ADR-0070) thắng luật 12 ("Điều 2, 7, 8 luôn thắng") nên mẫu xưng "Mình" khi từ chối người được gọi "anh / chị". Không trái ADR-0084. Chủ quyết có đổi câu của ADR-0070 không.

**T-3 — `POST /api/parties` cũng ghi `gender`** (`index.ts:890`, `rules.ts:367-370`). Cùng route và cổng tạo hồ sơ sẵn có, không route mới; nhưng trang ghép ADR-0084 chỉ nêu PUT. Đề xuất: ghi bổ sung vào SYSTEM-DESIGN / trang ghép (qua chủ).

**T-4 — Dòng 0084 ở `docs/adr/README.md` đảo hai cột cuối** ("accepted 2026-10-01 | một chiều…" trong khi các dòng khác là "loại cửa | trạng thái"). Sửa khi giải TB-1.

**T-5 — `web/tro-ly.ts` hẹn giờ `800` ms cố định** để gỡ lớp `is-ve-goc`, không theo token `--tl-nhay` (0.7s). Vô hại; nên dùng sự kiện `animationend`.

**T-6 — Nhân sự (HCNS) không đặt được giới tính**: không vào Danh bạ (ADR-0071), màn Quản lý tài khoản không có ô. Chỉ Quản trị / Toàn quyền (hoặc người có `party.write` với hồ sơ không gắn tài khoản) bổ sung được. Đúng trang ghép; chủ cần biết ai sẽ điền.

**T-7 — Tên gọi chèn vào dòng Mai không thoát dấu nháy `'`.** `given_name` là MỘT từ (từ cuối họ tên), đã bỏ ký tự điều khiển / xuống dòng; người đặt là nhân viên văn phòng có quyền sửa hồ sơ; trợ lý không đọc được dữ liệu nghiệp vụ. Rủi ro không đáng kể; ghi để biết.

## Điều làm tốt
- Đường dữ liệu ra ngoài khoá bằng view hẹp (không họ / đệm / SĐT) thay vì lọc ở mã — đột biến đọc nhầm nhãn đầy đủ đỏ 4 bài.
- Migration ghi dữ liệu có điều kiện + bài hai chiều; không đụng trigger.
- `thanYeuCau` bắt buộc tham số người hỏi, cả 5 nơi gọi đều truyền đúng.

## Cần chủ quyết (không chặn gộp; mục 1 chặn áp production)
1. Migration 0064 tự thêm câu chào Mai lên production nếu Toàn quyền chưa từng lưu lời dặn (ghi dữ liệu production). Người kiểm thấy an toàn kỹ thuật; quyết TRƯỚC khi áp — nếu chọn đổi câu chào (TB-2) thì đổi luôn trong migration.
2. TB-2: câu chào "Chào bạn, em là Mai" với người chưa ghi giới tính.
3. T-2: câu từ chối xưng "Mình".

## Không kiểm được
- Trạng thái `tl_loi_dan` trên production (bản hiện hành có phải `gieo-0054` không) — cần lệnh `--remote`, bị cấm.
- Mẫu AI thật có xưng hô đúng không (chỉ máy giả); iPhone thật.
- Cây sau khi gộp main mới (TB-1) — chưa chạy test trên cây gộp.
- Kịch bản Chrome: chỉ xem ảnh trong `docs/evidence/2026-10-01-tro-ly-mai/anh/`, không chạy lại.

## Trạng thái cây sau khi kiểm
- `git status --short`: chỉ một tệp mới chưa theo dõi — chính tệp này. Không tệp nào khác bị sửa.
