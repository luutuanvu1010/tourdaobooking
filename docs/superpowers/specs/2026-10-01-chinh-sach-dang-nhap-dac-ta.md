# Chính sách đăng nhập — Toàn quyền chọn quyền nào "một máy" / "nhiều máy" (đặc tả)

- **Trạng thái:** **ĐÃ DUYỆT** 2026-10-01 (chủ: "duyêt"). Quyết định chính thức: `docs/adr/ADR-0085-chinh-sach-dang-nhap.md`. Thứ tự: làm **trước** Phần B (áp khuyến nghị — chủ chưa trả lời câu thứ tự).
- **Mốc mã:** `main` = `6d5964ba` (sau bản 1.58 — sổ phiên một máy đã lên production).
- **Sửa:** ADR-0075 điều 3 (miễn luật một máy) và phần lý do của bổ sung "Đồng ý ngoại lệ" ở điều 7.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` `phat_hien` = `[]`).
- **Đã qua một lượt kiểm độc lập thiết kế** (người kiểm chỉ đọc, 2026-10-01): kết luận "có mâu thuẫn cần chủ quyết" — 3 CAO, 5 VỪA, 5 THẤP; mọi mục đã xử lý trong bản này (đối chiếu ở §10).

## 1. Chủ dự án đã chốt (2026-10-01)

Yêu cầu: *"biến [luật một máy] thành 1 tuỳ chọn trong bảng điều khiển của Super Admin, ví dụ có thể vô hiệu hoá hoặc chỉnh sửa quyền này với nhóm người dùng nào đó"*.

| Câu | Chủ chọn |
|---|---|
| Chia nhóm | **Theo quyền app** (không theo vai, không theo từng người) |
| Tài khoản nhiều quyền | **Một quyền "Nhiều máy" là đủ** để được nhiều máy |
| Siết (nhiều → một máy) | **Đăng xuất ngay, giữ phiên mới nhất** |
| Toàn quyền / vai IT | **Luôn được nhiều máy, khoá cứng** |
| Quản trị / Nhân sự đổi vai-quyền làm người khác thành "một máy" | **Đăng xuất máy thừa ngay** (hệ quả của chính sách Toàn quyền đặt; ghi rõ ở Trợ giúp) |
| Đối tác "Nhiều máy" có bắt bảo mật hai lớp? | **Chưa bắt, chỉ cảnh báo** trên màn chính sách |
| Thông báo màn hình khoá của máy bị đăng xuất vì chính sách | **Chỉ tắt máy vừa bị đăng xuất** (dạng hẹp "chỉ-phiên") |
| Công tắc chung "tắt luật một máy" | **Bỏ**, thay bằng nút "Tất cả một máy" / "Tất cả nhiều máy" |
| Chỗ đặt | Mục "Chính sách đăng nhập" trên trang **Phiên đăng nhập** (`/sessions`) — giả định bề mặt (chữ "bảng điều khiển" trong app đang chỉ trang Trợ lý; đổi chỗ đặt không đổi thiết kế) |

## 2. Định nghĩa

- **Quyền đặt được:** 9 quyền app trừ `SUPER_ADMIN`: `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, INTERN, DRIVER, DRIVER_PARTNER, HR`.
- **Chính sách hiện hành:** với mỗi quyền đặt được, "Một máy" hoặc "Nhiều máy". Quyền chưa từng đặt = **Một máy** (bảng trống = đúng hành vi bản 1.58).
- **Được nhiều máy** (thay `isSingleDevice` của ADR-0075 điều 3): tài khoản giữ `SUPER_ADMIN`, **hoặc** vai `IT` còn hiệu lực, **hoặc** ít nhất một quyền **hiệu lực** (`stf_permission` còn hiệu lực = quyền từ vai + chỉnh tay) mà chính sách hiện hành đặt "Nhiều máy". Ngược lại: **một máy**.
- **Siết** một tài khoản = tài khoản đó đổi từ "được nhiều máy" sang "một máy" (do đổi chính sách, hoặc do đổi quyền/vai của chính nó). **Nới** = chiều ngược lại.

## 3. Dữ liệu (một migration mới, chỉ thêm — số = lớn nhất mọi nhánh + 1 lúc thi công)

Bảng `aut_session_policy` (module `auth`, chỉ module `auth` ghi):

| Cột | Ghi chú |
|---|---|
| `id` TEXT PK | ngẫu nhiên |
| `permission_code` TEXT NOT NULL | CHECK trong 9 mã ở §2 (không có `SUPER_ADMIN`) |
| `multi` INTEGER NOT NULL | CHECK 0/1 — 1 = "Nhiều máy" |
| `valid_from_at` TEXT NOT NULL, `valid_to_at` TEXT NULL | hiệu lực theo thời gian (không xoá cứng) |
| `created_by`, `updated_at` NOT NULL, `updated_by` | cột kiểm toán chung (ADR-0003, `architecture.test.ts`) |

- Chỉ mục duy nhất có điều kiện `(permission_code) WHERE valid_to_at IS NULL` — mỗi quyền tối đa một dòng hiện hành.
- Mỗi quyền một dòng có kiểu rõ — **không** JSON (Hiến chương 5.2).
- Cột `aut_session.single` (0065) giữ nghĩa **trạng thái thi hành của phiên**, không phải bản chụp chính sách theo Hiến chương 5.6: siết có thể đổi nó trên phiên đang sống (có chủ ý, ghi ở ADR-0085).
- Từ điển dữ liệu: `docs/data-dictionary.json` + `npm run dict`.

## 4. Luồng

### 4.1 Đọc chính sách
- Mỗi lần cấp phiên (`issueLoginSession`) đọc chính sách hiện hành từ D1 (một câu, ≤ 9 dòng). **Không** lưu đệm trong bộ nhớ Worker (mỗi bản Worker sẽ giữ một bản khác nhau).

### 4.2 Toàn quyền lưu chính sách — `PUT /api/sessions/policy`
1. Cổng `admin` + `can(staff, "auth.session.policy")` trong handler; không có → 403 (chữ Việt).
2. Thân gửi: danh sách `{ permissionCode, multi }` cho các quyền **đổi**, kèm **mã phiên bản đang xem** (`banDangXem` — id dòng hiện hành của từng quyền đổi, hoặc rỗng nếu chưa có dòng). Mã quyền ngoài 9 mã → 400.
3. Một lô:
   1. với mỗi quyền đổi: đóng dòng hiện hành **chỉ khi** id = `banDangXem` (hoặc chưa có dòng khi `banDangXem` rỗng); chèn dòng mới có điều kiện `changes() > 0` của câu đóng. Câu nào thua → cả lô trả 409 "Chính sách vừa được người khác đổi — tải lại" (chỉ mục duy nhất là lưới);
   2. nhật ký `session_policy_changed` (im lặng — `SILENT_AUDIT_ACTIONS`), chi tiết: quyền đổi + giá trị mới + số phiên bị kết thúc + số người; **không** tên, SĐT, IP;
   3. **siết theo tập** (chỉ khi có quyền chuyển sang "Một máy"): **một** câu `UPDATE aut_session` kết thúc (`mat_mien`, `ended_by` = người lưu) mọi phiên sống **trừ phiên mới nhất** của các tài khoản **(a)** nay là "một máy" theo chính sách MỚI **và (b)** đang có ≥ 2 phiên sống; `RETURNING id` (và `staff_id`). Điều kiện (a) đọc quyền/vai qua **view của module staff** (không đọc thẳng bảng `stf_*`) và đọc chính sách **từ chính bảng `aut_session_policy` sau các câu ghi ở bước 1** (không từ tham số gửi lên) — nên nếu câu đóng/chèn thua (người khác vừa lưu), câu siết tính theo chính sách thật đang lưu, không theo bản thua; máy chủ trả 409 khi thấy câu chèn không ghi dòng nào; rồi một câu đánh dấu `single = 1` cho phiên còn lại của các tài khoản đó (lưới cho đăng nhập chạy đua — dọn hạn trước, như ADR-0075 điều 3).
4. Nới: **không ghi gì** lên `aut_session` (chỉ mục duy nhất chỉ đếm `single = 1`; phiên cũ `single = 1` sống cạnh phiên mới `single = 0` không vi phạm).
5. Sau lô: máy của các phiên vừa kết thúc → `ctx.dongBangTin` **một lần**, dạng mới "danh sách phiên, chỉ-phiên" (đóng Bảng tin theo nhãn `phien:<id>`; tắt `ntf_push_sub` có `session_id` trong danh sách — không tắt đăng ký `session_id` NULL, không tắt máy giữ lại). Không gọi lặp theo từng người.
6. Kích thước: số câu trong lô **không** phụ thuộc số người (≤ 2 câu mỗi quyền đổi + 3 câu siết + nhật ký). Danh sách phiên truyền vào câu tắt thông báo bằng `json_each`.

### 4.3 Xem trước — `GET /api/sessions/policy/preview?…`
- Cùng ô quyền. Trả **số phiên sẽ kết thúc** và **số người** cho tập thay đổi đang chọn (cùng điều kiện SQL với 4.2 bước 3, chỉ đếm). Màn hình hiện "Sẽ đăng xuất N máy của M người", rồi hộp xác nhận trong trang (không `confirm()`).

### 4.4 Đổi quyền / vai của một người (Quản trị, Nhân sự, Toàn quyền — route có sẵn)
- `PUT /api/staff/:id/permissions`, `PUT /api/staff/:id/roles`: tính "được nhiều máy" **trước** và **sau** bằng **cùng một bản chính sách** đọc đầu request.
- Siết → câu phiên (kết thúc trừ mới nhất `mat_mien`, đánh dấu `single = 1`) chạy ở **lô thứ hai, chỉ khi lô đổi quyền/vai đã thắng** câu chốt (vd "quản trị viên cuối"). Bỏ điều kiện cài cứng `NOT EXISTS v_stf_toan_quyen` / `requireToanQuyen` (`auth/repository.ts:124-134`, `accounts/index.ts:542`) — thay bằng thứ tự lô.
- Máy bị kết thúc: giữ dạng "giữ-phiên" chủ đã duyệt cho đúng hai route này (không đổi).
- Nới: không ghi gì lên `aut_session`.

### 4.5 Đăng nhập chạy đua với lần lưu chính sách
- Khe còn lại (đăng nhập đọc chính sách cũ "Nhiều máy" ngay trước khi lô siết chạy xong → phiên mới `single = 0`) là **hở đã biết**, tự lành ở lần đăng nhập sau; bắt bằng bất biến cảnh báo `R-AUT-SESSION-3` (§6).

## 5. Giao diện (theo `web/CLAUDE.md`)

- Trang `/sessions`: mục mới **"Chính sách đăng nhập"** đặt trên danh sách phiên, chỉ hiện khi `can(staff, "auth.session.policy")` (hỏi đúng ô này — **không** dùng chung điều kiện `auth.session.viewAll` của trang; luật 1.52).
- Bảng 9 dòng (tên quyền tiếng Việt như màn Quản lý tài khoản), mỗi dòng hai lựa chọn "Một máy" / "Nhiều máy"; dòng **Toàn quyền** hiện "Luôn nhiều máy" (không sửa được) và ghi chú "Vai IT luôn được nhiều máy".
- Nút "Tất cả một máy" / "Tất cả nhiều máy" (chỉ đổi lựa chọn trên màn, chưa lưu).
- Chọn "Nhiều máy" cho **Đối tác** hoặc **Tài xế đối tác** → dải cảnh báo: *"Nhiều máy: nếu ai đó biết PIN, họ đăng nhập song song mà chủ tài khoản không bị đẩy ra để nhận biết. Quyền Đối tác gồm cả lữ hành, HDV độc lập, lễ tân, taxi, cộng tác viên — không chọn riêng được từng loại."*
- Nút "Lưu" → gọi xem trước → hộp xác nhận "Sẽ đăng xuất N máy của M người. Lưu?" → lưu → tải lại. 409 → câu "Chính sách vừa được người khác đổi — đã tải lại".
- Trợ giúp: mục "Mỗi tài khoản một máy" (Phần chung) và mục Toàn quyền đổi thành có điều kiện ("tuỳ quyền, do Toàn quyền đặt ở Phiên đăng nhập → Chính sách đăng nhập"); hướng dẫn Quản trị/Nhân sự thêm một câu: đổi vai/quyền có thể làm người đó bị đăng xuất khỏi máy thừa. Giữ trần thời gian đọc (`huong-dan.test.ts` A4 — phần Quản trị đang sát trần 3150 chữ: rút chỗ khác nếu cần).

## 6. Quy tắc an toàn (bắt buộc, có test)

1. Ô `auth.session.policy`: đủ 10 cột, chỉ `SUPER_ADMIN`; route kiểm `can()` trong handler; Quản trị, Nhân sự → 403 (bài route, không chỉ bài thuần). Hàng rào `route-write-guard` phủ route mới.
2. Mã quyền gửi lên ngoài 9 mã (kể cả `SUPER_ADMIN`) → 400; CSDL CHECK là lưới.
3. Lưu có kiểm phiên bản: hai lần lưu đè nhau → lần sau 409, không mất thay đổi.
4. Đổi quyền/vai: câu chốt thua → **không** phiên nào bị kết thúc (bài route với chính sách "ADMIN = Nhiều máy", gỡ ADMIN của Quản trị cuối).
5. Bài route chứng minh chính sách thật sự được dùng khi cấp phiên (đặt "SALES = Nhiều máy" → hai lần đăng nhập SALES cùng sống; đặt lại "Một máy" → còn đúng phiên mới nhất). Lý do: phép thử đột biến của người kiểm cho thấy hôm nay chỉ một bài thuần bắt việc miễn lan rộng.
6. Siết theo tập: số câu không phụ thuộc số người (bài đếm câu trong lô với 50 tài khoản giả).
7. Nhật ký không chứa tên/SĐT/IP; `session_policy_changed` im lặng.
8. Tắt thông báo dạng "chỉ-phiên danh sách": không tắt đăng ký của máy giữ lại, không tắt đăng ký `session_id` NULL.
9. Bất biến: `R-AUT-SESSION-1` (giữ nguyên nghĩa); thêm `R-AUT-SESSION-3` mức **cảnh báo**: "tài khoản theo chính sách hiện hành là một máy mà có hơn một phiên sống".
10. Không nới luật cho môi trường thử: kịch bản e2e chính sách khôi phục chính sách trong `finally` (chạy nối tiếp trên cùng D1 với `phien`, `passkey`).

## 7. Hàng rào phải đổi (trình chủ — Điều 9.4)

| Hàng rào | Đổi | Loại |
|---|---|---|
| `src/tat-thong-bao-dung-may.test.ts` bảng ghim route gọi `dongBangTin` | thêm `PUT /api/sessions/policy` với dạng **"chỉ-phiên danh sách"** (hẹp nhất; chủ chọn) | **NỚI** có chủ đích — dòng mới ở `docs/SO-HANG-RAO.md`, quan sát chặn thật |
| `docs/SO-HANG-RAO.md` dòng "mất miễn" (cơ chế `NOT EXISTS v_stf_toan_quyen`) | cơ chế đổi thành "lô thứ hai sau câu chốt thắng" | viết lại + quan sát chặn thật lần nữa |
| `src/modules/auth/session-ledger.test.ts` "miễn: SUPER_ADMIN hoặc IT" | thêm tham số chính sách; bảng trống = như cũ | siết (thêm ca) |

## 8. Ảnh hưởng tới Phần B (ADR-0074)

Nội dung không đổi (máy được tin, `PIN_TRUSTED` độc lập với `single`). **Thứ tự thi công:** việc này đổi chữ ký `isSingleDevice`/`issueLoginSession` mà Phần B dùng → làm **tuần tự** (xong việc này rồi mới Phần B, hoặc ngược lại), không song song.

## 9. Rủi ro / chưa kiểm

- Giới hạn hiện hành của Cloudflare (số câu D1 mỗi lần gọi, lời gọi phụ tới Bảng tin): thiết kế không phụ thuộc số người nên không cần con số; vẫn đo lô siết với ≥ 1000 tài khoản giả trên D1 local ở bước thi công.
- Số tài khoản đang có > 1 phiên sống trên production: chưa đọc (chỉ có thể là Toàn quyền/IT hôm nay).
- Quay lui về 1.58 sau khi đã áp migration: an toàn — mã cũ bỏ qua bảng chính sách, mọi người về "một máy" ở lần đăng nhập sau.

## 10. Đối chiếu kết quả kiểm độc lập thiết kế

| Mục | Xử lý |
|---|---|
| CAO-1 câu SQL cài cứng "miễn = Toàn quyền" | §4.4: lô thứ hai sau câu chốt; bỏ `requireToanQuyen`; §6 quy tắc 4; §7 |
| CAO-2 Quản trị/Nhân sự gián tiếp đăng xuất người khác | chủ chọn "đăng xuất ngay"; ghi ở ADR-0085 + Trợ giúp |
| CAO-3 nới hàng rào `dongBangTin` | chủ chọn dạng "chỉ-phiên"; §7 |
| VỪA-1 lô phình theo số người | §4.2 bước 3, 5, 6 (một câu theo tập; một lần `dongBangTin`) |
| VỪA-2 chạy đua, hai Toàn quyền | §4.2 kiểm phiên bản; §4.5; `R-AUT-SESSION-3` |
| VỪA-3 rủi ro Đối tác nhiều máy | chủ chọn "chỉ cảnh báo"; §5 dải cảnh báo |
| VỪA-4 Hiến chương 5.6 | §3 + ADR-0085 điều 5 |
| VỪA-5 e2e trạng thái toàn hệ thống | §6 quy tắc 10 |
| THẤP-1 lưu dữ liệu | §3 |
| THẤP-2 công tắc chung thừa | chủ chọn bỏ; §5 nút "Tất cả" |
| THẤP-3 ô quyền và giao diện | §5, §6 quy tắc 1 |
| THẤP-4 vai IT là điều kiện trực tiếp | kế thừa ADR-0075 điều 3, ghi ở ADR-0085 |
| THẤP-5 chữ "bảng điều khiển" | §1 giả định bề mặt; Trợ giúp ở §5 |

## 11. Tiêu chí nghiệm thu (hành vi kiểm được)

1. Bảng chính sách trống → mọi hành vi giống bản 1.58 (e2e `phien` cũ xanh không sửa).
2. Toàn quyền đặt "Kinh doanh = Nhiều máy" → tài khoản chỉ Kinh doanh đăng nhập máy 2 thì máy 1 **vẫn** dùng được.
3. Đặt lại "Kinh doanh = Một máy" → màn xem trước báo đúng số; sau lưu, tài khoản đó còn đúng phiên mới nhất; máy kia 401 với lời báo "Không còn quyền dùng nhiều máy"; đăng ký thông báo của máy kia tắt, của máy còn lại vẫn bật.
4. Tài khoản Kinh doanh + Kế toán, chỉ Kế toán "Nhiều máy" → được nhiều máy.
5. Quản trị, Nhân sự gọi `GET/PUT /api/sessions/policy` → 403; không thấy mục "Chính sách đăng nhập".
6. Gửi `SUPER_ADMIN` hoặc mã lạ → 400; Toàn quyền và vai IT vẫn nhiều máy dù chính sách thế nào.
7. Hai Toàn quyền lưu cùng lúc từ cùng một bản → một lần 200, một lần 409.
8. "ADMIN = Nhiều máy", Toàn quyền gỡ ADMIN của Quản trị cuối → 409 và **không** phiên nào kết thúc.
9. Quản trị đổi vai của một người từ vai có quyền "Nhiều máy" sang vai chỉ quyền "Một máy" → máy thừa của người đó đăng xuất ngay.
10. Siết với 1000 tài khoản giả (D1 local) → một lô, số câu cố định; không lỗi.
11. Nhật ký `session_policy_changed` chỉ Toàn quyền thấy; không có tên/SĐT/IP.
12. `audit-invariants` có `R-AUT-SESSION-3` (cảnh báo); `typecheck` 0, `npm test`, e2e toàn bộ xanh; kịch bản Chrome mục chính sách (Toàn quyền thấy, tài khoản thiếu ô không thấy).

## 12. Ngoài phạm vi

- Chính sách theo từng tài khoản hoặc theo vai (chủ chọn theo quyền).
- Bắt bảo mật hai lớp cho nhóm "Nhiều máy" (chủ chọn chưa bắt).
- Giới hạn "tối đa N máy" (chỉ có một / nhiều).

## 13. Trang ghép (CLAUDE.md §9)

Lượt duyệt này gồm **3 quyết định chạm quyền/dữ liệu** (trần 3): (Q1) mô hình chính sách — sửa ADR-0075 điều 3, ô `auth.session.policy`, bảng `aut_session_policy`; (Q2) hành vi siết và ai kích hoạt được; (Q3) ngoại lệ hàng rào `dongBangTin` cho route mới. Cả ba ở ADR-0085.

**(1) Bảng chứa những loại thực thể nào**

| Bảng | Chứa |
|---|---|
| `aut_session_policy` (mới) | chính sách theo **mã quyền** — không gắn với người hay hồ sơ nào |
| `aut_session` | phiên của **mọi tài khoản**: nhân viên nội bộ (SALES, ACCOUNTING, ADMIN, FIELD, INTERN, DRIVER, HR, SUPER_ADMIN) **và** tài khoản bên ngoài (PARTNER, DRIVER_PARTNER). Chính sách mới làm cột `single` của cả hai nhóm có thể đổi trên phiên đang sống |
| `ntf_push_sub` | đăng ký thông báo của mọi tài khoản; route mới tắt theo **danh sách mã phiên** |

**(2) Dòng bản đồ quyền chạm các bảng này, áp cho loại nào**

| Ô | Ai giữ | Áp cho |
|---|---|---|
| `auth.session.policy` (mới) | chỉ `SUPER_ADMIN` | đổi chính sách → ảnh hưởng mọi tài khoản giữ quyền bị đổi, kể cả tài khoản bên ngoài |
| `auth.session.viewAll` / `auth.session.revoke` (có) | chỉ `SUPER_ADMIN` | không đổi |
| `account.edit` (có — ADMIN, HR, SUPER_ADMIN) | Quản trị, Nhân sự, Toàn quyền | đổi quyền/vai **nay có thể** đăng xuất máy thừa của người bị đổi (gián tiếp, theo chính sách) — trước đây chỉ khi đổi Toàn quyền/IT (chỉ Toàn quyền làm được) |
| `admin.manage.superadmin` (có) | chỉ `SUPER_ADMIN` | gán/gỡ Toàn quyền, vai IT — không đổi |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng máy chủ | Chỗ giao diện ẩn/hiện |
|---|---|---|
| `GET /api/sessions/policy`, `GET …/preview`, `PUT /api/sessions/policy` | cổng `admin` + `can(…, "auth.session.policy")` trong handler | mục "Chính sách đăng nhập" trên `/sessions` hỏi `can(staff, "auth.session.policy")` |
| Trang `/sessions` | (có) `auth.session.viewAll` | thanh bên + trang Tôi hỏi `auth.session.viewAll` (không đổi) |
| `PUT /api/staff/:id/permissions`, `PUT /api/staff/:id/roles` | (có) câu chốt + ADR-0083; **mới:** lô phiên thứ hai chỉ khi lô quyền/vai thắng | màn Quản lý tài khoản — thêm một câu nhắc trong Trợ giúp (không thêm nút) |
| Cấp phiên (`issueLoginSession`) | đọc chính sách mỗi lần | — |
