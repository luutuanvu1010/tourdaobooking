# Đợt D — việc cần chủ dự án duyệt (Task 6, Phần C + F-6)

Nguồn: `docs/superpowers/sdd/2026-09-23-dot-d-khung-dieu-huong-doc/task-6-brief.md` mục C và F-6.
Năm mục dưới đây đều đụng **tệp luật** (`web/CLAUDE.md`, ADR đã duyệt) hoặc **màu/chữ mới** — theo Hiến pháp
Điều 9 và `CLAUDE.md` §3 (N9), AI **chỉ đề xuất**, không tự áp dụng. Người thi công Task 5/Task 6 đều làm ĐÚNG khi
không tự sửa các tệp này. Cộng thêm một mục "Nợ đã ghi, chờ chủ chọn" (không phải tệp luật, nhưng cần chủ quyết
hướng đi) ở cuối.

---

## 0. ƯU TIÊN CAO NHẤT — Mục lục ADR (`docs/adr/README.md`) thiếu hàng ADR-0015

**Đề xuất gì:** thêm một hàng cho ADR-0015 vào bảng mục lục `docs/adr/README.md`, ngay sau hàng ADR-0014 (dòng 20).

**Bằng chứng:** `docs/adr/ADR-0015-khung-dieu-huong-doc.md` tồn tại, `Trạng thái: accepted` (chủ dự án duyệt trực tiếp trong phiên chat 2026-09-23), nhưng bảng mục lục ở `docs/adr/README.md` dừng ở ADR-0014 — không có hàng ADR-0015. Kiểm toàn cục xác nhận (Đợt D Task 7).

**Vì sao ưu tiên cao nhất:** `CLAUDE.md` §6 chỉ dẫn: việc kiến trúc thì **đọc mục lục rồi mới đọc ADR liên quan**. Người/AI phiên sau làm đúng chỉ dẫn đó sẽ không bao giờ thấy ADR-0015 trong mục lục, dễ tưởng khung điều hướng dọc (thanh bên, `/` là Trang chủ) chưa được duyệt chính thức và sửa lại — xoá đúng phần vừa được chủ dự án chốt.

**Đề xuất — diff chính xác** (thêm một hàng, không đổi hàng nào khác):
```diff
 | [0014](ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md) | Mã quyền mới `PARTNER`/`SUPER_ADMIN`, ba cấp "người phụ trách"; phạm vi "của mình" thực thi ở máy chủ (thay ADR-0010 điều 1); `FIELD` được sửa số khách/dịch vụ/tiền và huỷ đơn (kèm lý do) sau xác nhận qua dòng điều chỉnh chỉ-thêm; đối tác ngoài "xin nhận rồi nhân viên duyệt"; Admin chỉ quản lý tài khoản cấp dưới (sửa một phần ADR-0007/0009/0010, tinh chỉnh ADR-0013) | hỗn hợp (một chiều cho phần tiền/huỷ đơn) | **accepted** (chủ dự án duyệt 2026-09-22) |
+| [0015](ADR-0015-khung-dieu-huong-doc.md) | Khung điều hướng dọc (thanh bên) thay thanh ngang ở máy tính (≥900px theo ADR, mã chạy từ 641px — xem mục 5 dưới đây), giữ thanh tab dưới đáy ở điện thoại; `/` đổi thành Trang chủ, Đơn hàng dời sang `/orders`; huy hiệu số đếm trên thanh bên chỉ hiện khi có nguồn dữ liệu thật | hai chiều (mã); một chiều (thói quen người dùng/địa chỉ PWA đã lưu) | **accepted** (chủ dự án duyệt trực tiếp trong phiên chat 2026-09-23) |
```

**Vì sao AI không tự thêm dù chỉ là một hàng còn thiếu:** `docs/adr/` thuộc vùng N9 (`CLAUDE.md` §3, §6) — tệp luật, chỉ chủ dự án duyệt mới có hiệu lực, kể cả khi việc thêm chỉ là khôi phục một mục lục cho khớp thực tế đã accepted.

**Nếu không làm:** mục lục tiếp tục im lặng về ADR-0015 — rủi ro đã nêu ở trên.

---

## 1. Bốn token màu `--c-sidebar-*` — AI tự quyết trước khi hỏi, xin duyệt hồi tố

**Đề xuất gì:** chủ dự án duyệt (hoặc yêu cầu đổi) bốn giá trị màu đã thêm vào `public/app.css` khi thi công Đợt D
Task 4 (thanh điều hướng dọc):

```css
--c-sidebar-item: rgba(255, 255, 255, .72);   /* chữ mục sidebar CHƯA chọn */
--c-sidebar-active: rgba(255, 255, 255, .14); /* nền mục sidebar ĐANG chọn */
--c-sidebar-border: rgba(255, 255, 255, .12); /* viền mảnh trong sidebar (đầu/chân, không phải giữa các mục) */
--c-sidebar-badge: rgba(255, 255, 255, .18);  /* nền mặc định huy hiệu số đếm trên sidebar */
```

(`public/app.css` dòng 98–101, trong khối token đầu tệp; chú thích ngay phía trên — dòng 93–95 — đã tự ghi rõ đây
là "GIÁ TRỊ TỰ QUYẾT (P8, bề mặt đảo ngược được)".)

**Vì sao đang ở đây:** `web/CLAUDE.md` mục "Hệ thống thiết kế" ghi: *"Màu/chữ mới (thương hiệu hay chức năng),
hoặc đổi giá trị nhóm đầu: hỏi chủ."* Bốn token trên là màu MỚI (không có sẵn trong ba nhóm token cũ). Người thi
công Task 4 đã tự quyết trước, không hỏi trước khi làm — đây là **thừa nhận đã làm trước khi hỏi**, không phải
xin duyệt trước một việc chưa làm.

**Vì sao chấp nhận được ở mức rủi ro (để chủ cân nhắc, không phải bào chữa):** cả bốn đều là trắng bán trong suốt
(`rgba(255,255,255,alpha)`) chồng lên nền `--c-primary-strong` (navy đậm) của thanh bên — không phải màu thương
hiệu mới, chỉ là độ mờ khác nhau của MỘT màu trắng đã dùng khắp app; giá trị lấy xấp xỉ theo bản mẫu thiết kế
`00 Trang chu v2.dc.html` mà chủ dự án đã duyệt chọn làm chuẩn cho Đợt D (ADR-0015).

**Nếu không làm gì (giữ nguyên, không hỏi lại):** bốn token này tiếp tục là "màu chưa từng được hỏi" — đúng luật
nhưng chưa đúng THỦ TỤC của `web/CLAUDE.md`. Rủi ro thực tế thấp (chỉ là các sắc độ trắng-mờ, không phải màu mới
gây nhầm lẫn thương hiệu), nhưng để lâu thì "hỏi trước khi làm" mất tác dụng như một quy tắc thật.

**Việc chủ cần làm — chọn một:**
1. **Duyệt hồi tố** bốn giá trị trên, giữ nguyên. (Không cần đổi gì trong mã.)
2. **Yêu cầu đổi** một hoặc nhiều giá trị — cho biết giá trị mới, AI áp dụng ở phiên sau (việc lớn về giao diện,
   cần chạy lại `trang-chu-smoke.mjs` + các kịch bản Chrome khác dùng chung khung).

---

## 2. Thêm dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" (`web/CLAUDE.md`)

**Đề xuất gì:** thêm MỘT dòng mới vào bảng ở cuối `web/CLAUDE.md` (sau dòng cuối cùng hiện có, dòng 43):

```markdown
| `web/shell.ts`, khối "Đợt D Task 4" của `public/app.css` (thanh điều hướng dọc + thanh công việc), `main`/`--w-main`/`--w-form` | `trang-chu-smoke.mjs` ở `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/`, mục G — quét ÍT NHẤT 3 trang (đã làm: `/staff` — danh sách thường + nhánh ≤640px; `/order-form?id=<đơn nháp>` — breadcrumb DÀI, bộc lộ lỗi "nút đè tiêu đề"; `/audit` — ô chọn "Lọc hành động" rộng, bộc lộ lỗi tràn ngang), nhiều khổ 640…1920 mỗi trang, huy hiệu, chân thanh bên ghim, lời gọi huy hiệu theo khổ, ô tìm kiếm — + `a2-smoke-form.mjs` (nút Lưu trong khung nhìn) + `v1-bao-tri.mjs` (dải bảo trì ở hàng 2 của lưới). Khung này dùng chung cho CẢ 13 TRANG nên đổi nó là đổi mọi trang — CHỈ quét một trang từng để lọt 2 lỗi thật (kiểm độc lập Task 4 vòng 1) |
```

**Vì sao:** dòng đề xuất gốc (soạn ở `task-4-fix-1-report.md` §4, người thi công Fix vòng 1) chỉ nói "quét 9 khổ",
không nói RÕ phải quét NHIỀU TRANG. Người kiểm độc lập Task 5 (8 hướng) chỉ ra: cả hai lỗi họ tìm được ("nút đè
tiêu đề" ở `/order-form`, tràn ngang ở `/audit`) đều nằm trong phạm vi mà lưới TỰ NHẬN đã phủ ("khung dùng chung
cho cả 12/13 trang") — nhưng vì lưới CHỈ chạy một trang (`/staff`) nên cả hai lỗi lọt qua. Bản giao việc Task 6
brief F cũng lặp lại đúng yêu cầu này. Dòng đề xuất trên đã cập nhật để nói rõ "ÍT NHẤT 3 trang" và liệt kê đích
danh 3 trang hiện `trang-chu-smoke.mjs` đang quét (mục G, đã đúng theo yêu cầu này từ vòng sửa 2 — chỉ còn thiếu
ghi vào tệp luật).

**Nếu không làm:** `web/CLAUDE.md` tiếp tục không nói rõ "phải quét nhiều trang" — người sửa `web/shell.ts` sau
này có thể lại chỉ chạy một trang, tái phát đúng lỗ hổng vừa vá.

---

## 3. `web/CLAUDE.md` dòng 43 — trỏ nhầm tệp VÀ số bước lỗi thời (gộp F-6 mục 4)

**Trạng thái hiện tại (dòng 43):**
```markdown
| `web/home.ts`, `public/home.html`, khối `.dash-*` của `public/app.css`, hàm `getDashboard()`/route `GET /api/orders/dashboard` (`src/modules/orders/`) | `trang-chu-smoke.mjs` ở `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/` (12 bước; ghim "dịch vụ quyết định hôm nay" quyết cả giờ LẪN nơi đón, ghim thứ tự khai route dashboard trước `/api/orders/:id`, đo xuống dòng ô số liệu ở 390px và chiều cao tab bar) |
```

**Hai lỗi:**
1. `public/home.html` sai — Đợt D Task 5 đổi tên tệp tĩnh: Trang chủ nay là `public/index.html` (`home.html` chỉ
   còn là trang chuyển hướng meta refresh về `/`). **7/8 hướng kiểm độc lập Task 5 phát hiện lỗi này** (F-6 mục 4
   của brief). Người thi công Task 5 **đúng khi không tự sửa** (tệp luật, N9).
2. "12 bước" lỗi thời — kịch bản đã lớn hơn nhiều qua các vòng sửa/Task 6. **Đừng chép một con số cứng vào tệp luật**
   (bản nháp trước của mục này ghi 33, đã lỗi thời ngay trong cùng đợt vì các vòng sửa sau thêm khẳng định mới).
   Đề xuất viết là "nhiều bước, đếm bằng lệnh" và để người đọc tự đếm:
   `grep -c "^\s*ok(" docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`.

**Đề xuất — diff thay thế dòng 43:**
```markdown
| `web/home.ts`, `public/index.html`, khối `.dash-*` của `public/app.css`, hàm `getDashboard()`/route `GET /api/orders/dashboard` (`src/modules/orders/`) | `trang-chu-smoke.mjs` ở `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/` (đã lớn hơn nhiều sau các vòng sửa Task 4/5/6 — không ghi cứng số bước, xem đầu kịch bản; ghim "dịch vụ quyết định hôm nay" quyết cả giờ LẪN nơi đón, ghim thứ tự khai route dashboard trước `/api/orders/:id`, đo xuống dòng ô số liệu ở 390px, chiều cao tab bar, và ba lỗ hổng lưới kiểm A-1/A-2/A-3 đã vá ở Task 6) |
```
Cố ý **không ghi số bước cụ thể** trong đề xuất thay thế: con số này đã lỗi thời ít nhất hai lần rồi (script còn
lớn thêm ở các đợt sau), ghi cứng một số mới sẽ lại sai trong vài tuần. Nếu chủ dự án muốn giữ một con số, khuyến
nghị: **33** (đo được lúc soạn đề xuất này, 2026-09-23 — `grep -noE '(^|[^a-zA-Z_.])ok\(' docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs | wc -l`).

**Nếu không làm:** người đọc `web/CLAUDE.md` sau này lần theo dòng này sẽ tìm nhầm `public/home.html` (nay chỉ là
trang chuyển hướng rỗng) và tưởng kịch bản chỉ có 12 bước — dễ bỏ sót phần lớn phép kiểm khi sửa lại `web/home.ts`.

---

## 4. ADR-0015 tự mâu thuẫn ở phần đầu (F-6 mục 5) — ADR đã duyệt, KHÔNG tự sửa

**Trạng thái hiện tại** (`docs/adr/ADR-0015-khung-dieu-huong-doc.md` dòng 3–4):
```markdown
- **Trạng thái:** **accepted** — chủ dự án duyệt trực tiếp trong phiên chat 2026-09-23 (qua `AskUserQuestion`: "Duyệt việc đổi thanh menu ngang → thanh menu dọc cho CẢ APP không?" → "Duyệt, làm đi"). AI soạn 2026-09-23, chỉ đổi dòng trạng thái này sau khi có câu trả lời thật của chủ, không tự duyệt. Thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-23   **Người phê chuẩn:** chủ dự án (chưa duyệt)
```
Dòng 3 nói ĐÃ duyệt (accepted); dòng 4 vẫn còn chỗ điền cũ "(chưa duyệt)" — nói ngược nhau trong cùng một tài liệu.
7/8 hướng kiểm độc lập Task 5 nêu đúng lỗi này.

**Đề xuất — diff MỘT dòng (dòng 4):**
```diff
- **Ngày:** 2026-09-23   **Người phê chuẩn:** chủ dự án (chưa duyệt)
+ **Ngày:** 2026-09-23   **Người phê chuẩn:** chủ dự án (đã duyệt — xem dòng "Trạng thái" phía trên)
```

**Vì sao AI không tự sửa dù là lỗi hiển nhiên:** ADR đã `accepted` là **tài liệu chuẩn tắc** — `CLAUDE.md` §8 và
Hiến pháp Điều 9 cấm AI tự sửa, kể cả khi chỉ là sửa lỗi chính tả/định dạng rõ ràng. Sửa nội dung ADR phải qua ADR
mới hoặc chủ dự án tự sửa/uỷ quyền rõ ràng.

**Xác nhận nguồn duyệt (để phiên sau khỏi phải nghi ngờ lại):** điều phối viên phiên trước đã **tự xác nhận** ADR-
0015 được chủ dự án duyệt thật, trong phiên chat 2026-09-23, qua công cụ `AskUserQuestion` — câu hỏi "Duyệt việc
đổi thanh menu ngang → thanh menu dọc cho CẢ APP không?", chủ dự án trả lời "Duyệt, làm đi". Người kiểm độc lập
Task 5 nêu đúng rằng bản thân họ (đọc mã tĩnh, không có lịch sử phiên chat) không có cách tự xác minh điều này —
ghi lại ở đây để không ai phải nghi ngờ lại nguồn duyệt trong các phiên sau.

**Nếu không làm:** dòng 4 tiếp tục nói ngược dòng 3 — người đọc nhanh (kể cả AI phiên sau) có thể hiểu nhầm ADR
chưa được duyệt thật, dẫn tới hỏi lại chủ một việc đã chốt (đúng bài học đã ghi ở `CLAUDE.md` §3, "Trang chủ mới
2026-09-23: một câu hỏi lúc đêm treo ~5 giờ").

---

## 5. Dòng lịch sử / ADR mới cho ngưỡng 641px (Task 7, phần B)

**Đề xuất gì:** chủ dự án ra một dòng lịch sử/ADR mới ghi nhận chính thức: ngưỡng hiện thanh bên dọc là **641px**
(không phải 900px như ADR-0015 điều 1 ghi), theo quyết định 9 mà chủ đã chốt ngày 2026-09-23 sau khi ADR-0015
accepted (`docs/superpowers/specs/2026-09-23-trang-chu-moi-quyet-dinh.md` dòng 76).

**Vì sao:** mã đã chạy đúng 641px và được đo lại xác nhận nhiều vòng độc lập — đây là **mã đúng, ADR-0015 là tài
liệu chuẩn tắc lỗi thời** (`CLAUDE.md` §2). Đã ghi ở `docs/SYSTEM-DESIGN.md` §16 (lệch có chủ ý), nhưng đó chỉ là
tài liệu MÔ TẢ; ADR-0015 (tài liệu CHUẨN TẮC) không được AI tự sửa (N9) nên cần chủ ra quyết định chính thức.

**Việc chủ cần làm — chọn một:**
1. **ADR mới nhỏ** trỏ về ADR-0015, chỉ sửa điều 1 (900px → 641px), ghi lý do khoảng hở 641–899px.
2. **Tự sửa** dòng ngưỡng trong ADR-0015 (chủ dự án được quyền sửa tài liệu do mình duyệt; AI thì không).
3. **Để nguyên**, chỉ dựa vào dòng ghi ở `docs/SYSTEM-DESIGN.md` §16 làm nguồn sự thật — rủi ro: người đọc ADR-0015
   trực tiếp (không qua §16) vẫn thấy 900px.

**Nếu không làm:** rủi ro đã nêu ở phần B — người/AI phiên sau đọc ADR rồi "sửa mã cho khớp tài liệu", đổi lại
900px, tái tạo đúng lỗ hổng mất lối điều hướng ở dải 641–899px mà hai vòng sửa trước đã trả giá để vá.

---

## 6. Token `--ls-eyebrow` — chưa hỏi chủ trước khi thêm, xin duyệt hồi tố

**Đề xuất gì:** chủ dự án duyệt (hoặc yêu cầu đổi) giá trị token màu/chữ mới sau đây, đã thêm vào `public/app.css`
dòng 102 khi thi công Đợt D Task 4:
```css
--ls-eyebrow: .08em; /* giãn chữ tiêu đề nhóm viết hoa (BÁN HÀNG/QUẢN TRỊ/TÔI) */
```
Dùng ở luật `.sidebar-group-title` trong `public/app.css` (tìm bằng `grep -n "sidebar-group-title" public/app.css`;
**đừng trích theo số dòng** — các số dòng trong đợt này đã lệch một lần khi thêm chú thích phía trên) — khoảng giãn
chữ (`letter-spacing`) cho ba nhãn nhóm viết hoa trên thanh bên.

**Vì sao đang ở đây:** `web/CLAUDE.md` mục "Hệ thống thiết kế" ghi: *"Màu/chữ mới (thương hiệu hay chức năng), hoặc
đổi giá trị nhóm đầu: hỏi chủ."* `--ls-eyebrow` là một giá trị chữ MỚI, nằm ở ranh giới "được tự thêm" (kích thước
giao diện điện thoại/PWA, nhóm "Riêng của Tour Đảo Booking") và "phải hỏi chủ" (chữ mới). Người thi công Task 4 tự
quyết trước, không hỏi trước khi làm.

**Vì sao rủi ro thấp:** chỉ là khoảng giãn chữ nhỏ (0.08em ≈ gần như không nhận ra bằng mắt thường ở cỡ chữ 12px),
lấy theo bản mẫu `00 Trang chu v2.dc.html`, không phải màu thương hiệu mới.

**Việc chủ cần làm — chọn một:**
1. **Duyệt hồi tố**, giữ nguyên `.08em`.
2. **Yêu cầu đổi** giá trị khác hoặc bỏ hẳn giãn chữ — việc lớn về giao diện, cần chạy lại `trang-chu-smoke.mjs`.

---

## Nợ đã ghi, chờ chủ chọn (không phải tệp luật — chỉ cần chủ quyết hướng)

### `/audit` tràn ngang ở khổ điện thoại — lỗi CŨ, có từ trước Đợt D

Đo được (cả bản trước Đợt D lẫn bản hiện tại, ra số giống hệt — không phải hồi quy):
```
/audit @ 390px: ô chọn "Lọc hành động" rộng 394px trong hộp nội dung chỉ 358px
              → trang nở ra innerWidth 410px thay vì 390px (thò 36px)
```
Nguyên nhân: ô `<select>` `width: auto` tự rộng theo tuỳ chọn dài nhất trong danh sách hành động nhật ký.

Ba phương án:
- **(a) Để nguyên, ghi nợ cho đợt sau.** Không đổi gì; bề mặt điện thoại (đã được chủ duyệt/kiểm nhiều vòng) giữ
  nguyên 100%, đúng cổng nghiệm thu của Đợt D ("bề mặt điện thoại không đổi một chỉ số nào"). **Khuyến nghị.**
- **(b) Cho ô chọn co lại** (`max-width: 100%` áp cho MỌI khổ, không chỉ ≥641px như hiện nay). Sửa được ngay bằng
  một dòng CSS, nhưng đây CHÍNH LÀ thay đổi một chỉ số của bề mặt điện thoại — phá vỡ bảo chứng "không đổi một
  chỉ số nào" mà Đợt D dùng làm cổng nghiệm thu; cần một vòng kiểm riêng cho khổ điện thoại nếu làm.
- **(c) Rút ngắn chữ trong các tuỳ chọn** của ô chọn "Lọc hành động" (`src/shared/audit-actions.ts`) để tuỳ chọn
  dài nhất không còn đẩy `<select>` quá 358px. Không đụng CSS/bề mặt điện thoại, nhưng đổi chữ hiển thị cho ADMIN
  ở MỌI khổ màn hình (không chỉ điện thoại) — cần chủ duyệt chữ mới.

**Việc chủ cần làm:** chọn (a), (b), hoặc (c). Nếu chọn (b)/(c), đây là việc lớn (giao diện) cho một phiên riêng,
có kiểm độc lập theo `CLAUDE.md` §3.

### `web/catalog.ts:71` — cùng loại lỗi chữ đã sửa ở Task 3, chưa sửa ở đây

Dòng cảnh báo xung đột giá "Giá đang bán vẫn là giá ghi đè." hiện ra **không kiểm `it.hidden`** — nếu dịch vụ đã bị
ẩn (không còn bán) NHƯNG vẫn có xung đột giá (Sheet đổi giá sau khi đã ghi đè), câu chữ vẫn nói "vẫn đang bán",
sai sự thật. Task 3 (`src/shared/dashboard-review.ts`, khối "Cần xem lại" ở Trang chủ) đã sửa đúng lỗi CÙNG LOẠI
này bằng cách rẽ nhánh `c.hidden ? "đã ẩn, không bán" : "giá ghi đè vẫn đang bán"` — trang `/catalog` (danh sách
đầy đủ của admin) chưa áp cùng cách sửa. Không phải "việc lớn" (chỉ đổi câu chữ hiển thị, không đụng dữ liệu/
quyền/tiền) nhưng ghi lại đây để chủ quyết có ưu tiên sửa cùng đợt sau không.

### `summarizeCatalogConflicts` chỉ nêu dịch vụ ĐẦU theo mã, có thể che dịch vụ khác lệch giá quan trọng hơn

`src/shared/dashboard-review.ts` dòng 46–51: hàm lọc `items.filter(i => i.conflicts.length > 0)` rồi chỉ lấy
`withConflicts[0]` (dịch vụ ĐẦU TIÊN theo thứ tự mã) để hiện trên khối "Cần xem lại" của Trang chủ. Nếu một dịch
vụ ĐÃ ẨN đứng trước (theo mã) một dịch vụ ĐANG BÁN, cả hai đều lệch giá Sheet, khối "Cần xem lại" sẽ chỉ báo dịch
vụ đã ẩn (ít khẩn cấp hơn) và **che mất** cảnh báo về dịch vụ đang bán thật (khẩn cấp hơn — khách đang trả sai
giá). `moreCount` có báo "còn N dịch vụ khác" nhưng không nói RÕ dịch vụ nào quan trọng hơn. Ghi nợ, không phải
việc lớn nhưng cần chủ quyết có ưu tiên sửa (vd ưu tiên dịch vụ CHƯA ẩn khi chọn "dịch vụ đầu tiên").

### (Ngoài phạm vi Đợt D, chỉ báo để chủ biết) `GET /api/locations` mở cho MỌI tài khoản đã đăng nhập

Route `GET /api/locations` (`src/modules/locations/index.ts` dòng 30) khai `access: "staff"` — mức truy cập lỏng
nhất, nghĩa là **bất kỳ tài khoản đã đăng nhập nào** (kể cả `FIELD`/`PARTNER`) gọi được, trong khi mục "Địa điểm"
trên thanh điều hướng chỉ hiện cho quản trị (`isOffice`/quyền ADMIN). Không phải bí mật nhạy cảm (chỉ là danh sách
địa điểm đón/trả), nhưng lệch giữa "ai thấy mục trên giao diện" và "ai gọi được API".

**Xác nhận có từ TRƯỚC Đợt D:** `git log --oneline 4e7fcfd..109d05f -- src/modules/locations/` rỗng — không commit
nào trong 38 commit của Đợt D đụng tới thư mục này. **Không phải lỗi của đợt này, KHÔNG sửa ở đây.**

**Câu hỏi cho chủ:** đây là chủ ý (mọi nhân viên/đối tác cần đọc được danh sách địa điểm, chỉ ai có quyền mới sửa)
hay cần siết lại `access` xuống `"office"`? Nếu cần siết, đây là việc lớn (đụng quyền, `CLAUDE.md` §3), cần một
phiên riêng có kiểm độc lập.

---

*Soạn bởi AI thi công Task 6 (Đợt D), 2026-09-23; bổ sung mục 0, 5, 6 và mục này bởi AI thi công Task 7 (vòng sửa
sau kiểm toàn cục), 2026-09-23. Đây là tệp ĐỀ XUẤT — không tự có hiệu lực cho tới khi chủ dự án duyệt từng mục.*
