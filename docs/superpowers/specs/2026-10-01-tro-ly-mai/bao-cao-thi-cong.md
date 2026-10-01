# Báo cáo thi công ADR-0084 — trợ lý "Mai" gọi tên + xưng hô, ô Giới tính

- **Ngày:** 2026-10-01. **Nhánh:** `tro-ly-mai` (worktree `.claude/worktrees/tro-ly-tim-theo-nghia`), nền `30da19e1`. Chưa push, chưa gộp, chưa triển khai.
- **Vai:** người thi công (P15). **Chưa có người kiểm độc lập** — việc này chạm dữ liệu (migration, cột mới, dữ liệu ra ngoài) nên theo CLAUDE.md §3 cần subagent kiểm độc lập chỉ đọc trước khi báo "đạt" (N8).
- **Yêu cầu chuẩn:** `docs/adr/ADR-0084-tro-ly-mai-goi-ten-xung-ho.md` Đ1–Đ6 + trang ghép.

## Commit (cũ → mới)

| Commit | Việc |
|---|---|
| `1fa7dbe6` | Luật thuần `src/shared/xung-ho.ts` (+ test): `xungHo`, `dongMai`, `thayTen`, `kiemGioiTinh`, `CAU_CHAO_MAC_DINH` |
| `74458b48` | Migration `0064_pty_person_gender.sql` (số tạm) + `src/migrations-pty-person-gender.test.ts`; hai view; câu chào Mai có điều kiện; `data-dictionary.json` + `npm run dict`; bài gieo 0054 đọc lời dặn trên CSDL chỉ áp tới 0054 |
| `a69ce63f` | `parties`: rules/repository/route nhận + trả `gender`; nhật ký "đổi giới tính"; DTO `gender`; `src/modules/parties/gioi-tinh-route.test.ts` |
| `c2811e39` | Danh bạ: ô "Giới tính" ở form tạo + sửa hồ sơ người (`web/parties.ts`) |
| `a49a14aa` | Trợ lý: `docNguoiHoi` (view `v_stf_staff_xung_ho`), `thanYeuCau(…, nguoi, …)` bắt buộc, dòng Mai, khung trả `goi`/`xung`, lời nhắc mặc định theo vai Mai; sửa giá trị kỳ vọng của các bài ghim |
| `97d4bc76` | Bài hàng rào: hồ sơ thử có tên hiển thị đầy đủ (để đột biến "đọc nhãn đầy đủ" đỏ) |
| `0f661f35` | `web/tro-ly.ts` thay `{ten}`; câu chào dự phòng = câu Mai; gợi ý `{ten}` ở trang cài đặt trợ lý |
| `989e230b` | e2e `tests/e2e/tro-ly.mjs` bước 12b |
| `25aec69b` | Chrome: `khung-tro-ly-smoke.mjs` bước n; sửa `bang-dieu-khien-tro-ly-smoke.mjs`; ảnh |
| `f66183c5` | Chrome: `t2b-danh-ba-smoke.mjs` bước A2; ảnh các kịch bản Danh bạ chạy lại |
| `53e9e7e6` | Nhật ký phiên bản 1.57: một dòng |
| `377ae8d3` | `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (z5), `docs/SO-HANG-RAO.md` |
| `801d7cac` | Câu hết trần ngày "Ngày mai hỏi tiếp" (thay "Mai hỏi tiếp") |

## Đã làm, theo ADR

- **Đ1** — `pty_person.gender TEXT` NULL, không CHECK; giá trị kiểm ở `kiemGioiTinh`: `NAM` / `NU` / `""`|`null` (= xoá); khi sửa, **vắng ô = giữ giá trị đang lưu** (các nơi gọi cũ như staff, e2e không gửi ô này); lạ ⇒ 400 "Giới tính chỉ nhận Nam, Nữ hoặc để trống."; tổ chức gửi giá trị ⇒ 400 "Hồ sơ tổ chức không có giới tính.". Đường ghi: `PUT /api/parties/:id` và `POST /api/parties` (cá nhân). Cổng `can` giữ nguyên, không thêm ô quyền, không thêm route ghi. Nhật ký `party_updated`: "cá nhân — đổi giới tính", chỉ khi giá trị thật sự đổi; không ghi giá trị. `newPersonStatements` có `gender` tuỳ chọn (mặc định NULL), nên nơi gọi của module staff không đổi. Không trigger nào bị thêm hay đổi; trigger gộp hồ sơ (ADR-0068) vẫn chặn (bài migration (a)).
- **Đ2** — `xungHo` đúng bảng ADR; tên gọi được bỏ ký tự điều khiển, gộp khoảng trắng, cắt hai đầu, nên luôn nằm trên một dòng.
- **Đ3** — Dòng `Tên bạn là Mai, trợ lý của Tour Đảo. Người đang hỏi: gọi là '{goi}', xưng '{xung}'.` do máy chủ nối, luôn có (kể cả khi lời nhắc đã tuỳ biến). Ô thử dùng hồ sơ của chính Toàn quyền. Lời nhắc mặc định đổi dòng đầu thành "Bạn là Mai, trợ lý "Hỗ trợ"…" và thêm luật 12 trỏ tới dòng do app nối. Mức trần tính cả dòng Mai: `thanYeuCau` bắt buộc tham số người hỏi, nên cả 5 nơi gọi (2 lần kiểm trần, lần gọi thật, lần gọi lại phòng thủ, ô thử) đều mang dòng này; có bài "tên dài ⇒ ước token lớn hơn".
- **Đ4** — Chỉ gửi `given_name`. Máy chủ đọc theo `staff.id` của phiên, qua view `v_stf_staff_xung_ho`; view này không có họ, tên đệm, SĐT. Thân yêu cầu vẫn không có `user` / `safety_identifier` / `metadata`.
- **Đ5** — `GET /api/tro-ly/khung` trả `goi`/`xung` đã tính (không trả giới tính thô; khi không được dùng thì trả "bạn"/"mình"). `web/tro-ly.ts` thay mọi `{ten}`; câu không có `{ten}` giữ nguyên văn. Câu chào mặc định đúng văn bản ADR (`CAU_CHAO_MAC_DINH`).
- **Đ6** — Hai dòng nhắc đã bỏ ở commit trước (`30da19e1`). Lần này sửa kịch bản `bang-dieu-khien-tro-ly-smoke.mjs` bước c: nay khẳng định dòng nhắc **không còn**. Bước này đã đỏ sẵn từ khi bỏ dòng nhắc.
- **Kiến trúc** — Không thêm cạnh vào `ALLOWED_EDGES`. Dùng hai view: `v_pty_person_xung_ho` (parties) và `v_stf_staff_xung_ho` (staff, đọc view của parties). `tro-ly` đọc view của staff qua cạnh `tro-ly → staff` có sẵn. `src/architecture.test.ts` xanh. SQL mới qua `defineSql`, câu tĩnh.

## Lệch / diễn giải so với lời giao (cần người kiểm xem)

1. **Vị trí dòng Mai:** lời giao ghi "nối thêm vào **cuối** `instructions`, SAU lời nhắc tuỳ biến". Dòng Mai được đặt ngay sau lời nhắc tuỳ biến, **trước** dòng nhóm vai và khối "TÀI LIỆU:". Lý do:
   - Hàng rào B4 (ADR-0073) và các bài hiện có ghim khối tài liệu ở cuối.
   - Máy giả e2e đọc tài liệu từ "TÀI LIỆU:" cuối cùng.
   - Nếu dòng Mai đứng sau tài liệu, mẫu AI dễ hiểu nó là một phần tài liệu.
   - Cách đặt này vẫn đúng chữ của ADR Đ3 ("nối thêm sau lời nhắc do Toàn quyền soạn").
2. **Migration ghi dữ liệu có điều kiện:** `0064` thêm một bản `tl_loi_dan` câu chào Mai, chỉ khi bản hiện hành vẫn là bản gieo `gieo-0054`. Lý do: nếu chỉ đổi hằng số thì production vẫn giữ câu chào cũ, không đạt Đ3/Đ5 ("câu chào mặc định đổi theo vai Mai; bản Toàn quyền đã lưu không tự đổi"). Đây là **ghi dữ liệu production khi áp migration** — xem "Cần chủ quyết".
3. **Bỏ qua thân yêu cầu thay vì báo lỗi:** thân hỏi / ô thử mang `ten`, `gioiTinh`, `goi`… thì bị lờ đi (không 400), giống cách các khoá lạ khác đang được xử lý.
4. **Viết hoa đầu câu khi thay `{ten}`** ("Anh Vũ cần…", "Bạn cần…"): giả định bề mặt, đảo ngược được (`thayTen`). Câu chào ADR viết `{ten}` ở đầu câu thứ hai; nếu không viết hoa sẽ ra "anh Vũ cần…".
5. **Thêm ngoài danh sách việc (bề mặt, đảo ngược được):**
   - dòng gợi ý cách dùng `{ten}` ở trang cài đặt trợ lý;
   - câu hết trần ngày đổi "Mai hỏi tiếp" → "Ngày mai hỏi tiếp" (vì "Mai" nay là tên trợ lý; câu này không bị ADR nào ghim nguyên văn);
   - thuộc tính `data-tl="loi-chao"` trên bong bóng chào.
6. **Quản lý tài khoản:** **không** thêm ô Giới tính ở màn Quản lý tài khoản (`web/staff.ts`, đổi tên qua `PATCH /api/staff/:id`). Lý do: trang ghép của ADR chỉ nêu `PUT /api/parties/:id`, và lời giao cấm thêm route ghi. Muốn đặt giới tính cho nhân viên thì dùng Danh bạ (Quản trị / Toàn quyền sửa được hồ sơ có tài khoản theo luật cấp bậc sẵn có; tài khoản chỉ có Nhân sự không xem được Danh bạ — ADR-0071).
7. **Kịch bản Chrome đã sửa ngoài phần ADR:** ba chỗ chờ "có trả lời" trong `bang-dieu-khien-tro-ly-smoke.mjs` nay chờ bong bóng "đang trả lời" mất trước. Từ bản 1.57, bong bóng này cũng mang lớp `tl-tin-tro-ly`, nên điều kiện cũ đã đúng ngay lúc vừa gửi (đếm sai).

## Đã kiểm (người thi công tự chạy; chưa kiểm độc lập)

| Lệnh | Kết quả |
|---|---|
| `node --test src/shared/xung-ho.test.ts` | 8/8 xanh (đỏ trước khi có tệp) |
| `node --test src/migrations-pty-person-gender.test.ts` | 5/5 xanh (đỏ 0/5 trước migration) |
| `node --test src/modules/parties/rules.test.ts src/modules/parties/gioi-tinh-route.test.ts` | xanh (bài rules đỏ trước khi sửa; bài route đỏ 2/4 trước khi sửa repository) |
| `node --test src/modules/tro-ly/*.test.ts src/shared/tro-ly*.test.ts src/architecture.test.ts` | xanh (bài route ADR-0084 đỏ trước khi sửa) |
| `npm run typecheck` | 0 lỗi |
| `npm run build:web` | xanh |
| `npm test` | 2507/2507 + bài đo giờ 1/1, thoát 0 |
| `npm run test:e2e` (toàn bộ) | 36/36 kịch bản xanh (gồm `tro-ly` bước 12b, `parties`, `gop-ho-so`, `audit-invariants`); không nội dung câu hỏi trong log Worker |
| `npm run db:migrate:local` | không chạy — e2e và kịch bản Chrome tự áp migration lên D1 tạm |
| Chrome `khung-tro-ly-smoke.mjs` (OUT=`docs/evidence/2026-10-01-tro-ly-mai`) | mọi bước đạt, gồm bước n mới (ảnh `n-loi-chao-co-ten-390.png`, `-1040.png`) |
| Chrome `2026-09-30-tro-ly/tro-ly-smoke.mjs` | mọi bước đạt |
| Chrome `bang-dieu-khien-tro-ly-smoke.mjs` | mọi bước đạt (sau khi sửa các chỗ ở mục lệch 7 và số bản lời dặn) |
| Chrome `t2b-danh-ba-smoke.mjs` | đạt, gồm bước A2 mới (ảnh `danh-ba-gioi-tinh-chon-1040.png`, `danh-ba-gioi-tinh-390.png`) |
| Chrome `giay-to-nguoi-smoke.mjs`, `nha-xe-danh-ba-smoke.mjs`, `help-smoke.mjs` | đạt |
| Chrome `dot-a-smoke.mjs` | các bước hồ sơ / nhân viên / dịch vụ / địa điểm đạt. Đỏ ở "nhat-ky: thẻ đã dựng xong" — **đỏ sẵn từ ADR-0038** (ghi ở `web/CLAUDE.md`), không do việc này |
| Tắt `wrangler dev` | không còn tiến trình nào của worktree này (các tiến trình đang chạy thuộc worktree `dac-ta-2fa`) |

**Đột biến của hàng rào** (đã ghi vào `docs/SO-HANG-RAO.md`, ngày quan sát 2026-10-01):

1. Route hỏi lấy `body.goi` / `body.xung` → `not ok 18 - HÀNG RÀO ADR-0084 (hỏi)…`. Hoàn nguyên → xanh.
2. Câu `xung-ho` đọc `v_stf_staff_label.label` (tên đầy đủ, có họ) → bài 18–21 đỏ. Hoàn nguyên → 21/21 xanh.

## Chưa làm / chưa kiểm

- **Chưa có người kiểm độc lập** (bắt buộc với việc lớn).
- Chưa chạy với OpenAI thật: chưa biết mẫu AI có xưng "em" và gọi "anh/chị + tên" đều đặn hay không.
- Chưa thử trên iPhone thật.
- Chưa kiểm chất lượng câu từ chối: `CAU_TU_CHOI` vẫn xưng "Mình chỉ hướng dẫn…", lệch với cách xưng "em". Câu này gắn với danh sách từ chối của ADR-0070 nên không đổi.
- Câu chào mặc định của ADR luôn xưng "em", kể cả khi người dùng được gọi là "bạn" (khi chưa ghi giới tính, câu chào ra "Chào bạn, em là Mai…" còn trợ lý xưng "mình" trong câu trả lời). Đây là văn bản ADR nên giữ nguyên.
- Số migration `0064` là số tạm; người gộp đánh lại nếu cần (bài tìm tệp theo đuôi tên).

## Cần chủ quyết

1. **Migration 0064 tự thêm câu chào Mai trên production** nếu Toàn quyền chưa từng lưu lời dặn. Khuyến nghị: giữ nguyên. Nếu không muốn, bỏ câu `INSERT INTO tl_loi_dan` khỏi migration; khi đó Toàn quyền tự sửa câu chào trên trang cài đặt. Phải quyết **trước khi** áp migration lên production.
2. Có muốn đổi `CAU_TU_CHOI` ("Mình chỉ hướng dẫn…") sang xưng "em" không? Câu này nằm trong danh sách từ chối của ADR-0070; đổi thì cần chủ duyệt.
