# Đặc tả (bản nháp): Thông báo hệ thống — chuông, hộp thông báo, tin của Toàn quyền, thông báo màn hình khoá

- **Trạng thái:** bản nháp, chờ chủ duyệt. **Duyệt làm hai lượt** (CLAUDE.md §9: tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt):
  - **Lượt 1** — §3–§8: hộp thông báo + tin thủ công. Ba quyết định Q1–Q3 **chủ đã trả lời trong chat 2026-09-27** (ghi ở §2). Văn bản quyết định: `docs/adr/ADR-0034-thong-bao-he-thong-hop-thong-bao.md` (proposed).
  - **Lượt 2** — §9: thông báo lên màn hình khoá (Web Push). Ba quyết định P1–P3 **chưa hỏi**; chỉ hỏi sau khi lượt 1 được duyệt. Có ADR riêng khi hỏi (dự kiến ADR-0035).
- **Ngày:** 2026-09-27. **Người soạn:** AI (phiên lập kế hoạch; không thi công trong phiên này — P15).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` đang rỗng (kiểm 2026-09-27); các mục `thao_tac` hoãn không liên quan (thu tiền, hoá đơn, `task.progress`, `dispatch.guides.view`).
- **Số đã giữ:** migration `0025_*` (số lớn nhất ở `main` và mọi nhánh cục bộ là 0024; `0019` dành cho B5). ADR-0034 (0030–0032 dành cho Đơn tự do, 0033 đã dùng).

## 0. Bài toán bằng lời thường

Hôm nay app có **thông báo nổi** (Bảng tin, ADR-0022): hiện chốc lát trên màn hình **đang mở** khi đơn đổi trạng thái. Không lưu: ai đang tắt app thì lỡ, không xem lại được. Admin cũng không có cách nào gửi một tin cho mọi người.

Chủ muốn: một **chuông** có số chưa đọc; bấm vào ra **danh sách tin** gồm (a) tin do chủ/Toàn quyền soạn, (b) tin tự động khi **trạng thái đơn đổi** (mới lập, có HDV nhận, được xác nhận, bị huỷ…); và **đợt này làm luôn** thông báo lên màn hình khoá iPhone.

## 1. Hiện trạng (đã rà mã, `main` a74048e)

- Bảng tin: module `bangtin` hạng `KHONG_DB` (không bảng), sự kiện đúng 5 khoá, không tên người (`src/shared/bang-tin.ts:12`). Điểm phát `ctx.baoThayDoi` bắn-và-quên sau khi ghi (`src/index.ts:37-49`). Thông báo nổi chỉ cho 5 loại, không cho Đối tác/Thực tập (`src/shared/bang-tin.ts:80-110`).
- Nhật ký `audit_log`: ghi **cùng batch** với thao tác qua `auditStatement` (`src/modules/audit/index.ts:19`) — tiền lệ "module khác đưa câu lệnh vào batch của mình mà vẫn giữ luật chỉ-module-chủ-ghi-bảng".
- Mẫu "đã xem": cột `submitter_seen_at`/`admin_seen_at` của Góp ý (`migrations/0016_feedback.sql`), chấm đếm `GET /api/feedback/badge`.
- Service worker `web/sw/sw.ts`: chỉ `install/activate/fetch`, chưa có `push`.
- Chưa có quyền "gửi thông báo". `SUPER_ADMIN` = `any` ở mọi thao tác (`src/shared/permissions.ts:40`).

## 2. Quyết định của chủ (chat 2026-09-27, nguyên ý)

| # | Câu hỏi | Chủ chọn |
|---|---|---|
| H1 | Hình thức | Chuông + hộp thông báo (xem lại được, đã đọc/chưa đọc); vẫn giữ thông báo nổi |
| H2 | Tin thủ công gửi cho ai | Toàn công ty **hoặc** theo nhóm quyền |
| H3 | Mỗi người nhận tin về đơn nào | **Giữ đúng luật hiện nay** (ai được thấy thông báo nổi về đơn đó) |
| H4 | Màn hình khoá iPhone | **Làm luôn đợt này** |
| Q1 | Ai được soạn/gửi tin thủ công | **Chỉ Toàn quyền** (`SUPER_ADMIN`) |
| Q2 | Tin về đơn có ghi tên người làm không | **Có tên** (chủ trả lời 2026-09-27, lượt hỏi thứ hai: *"1- Có tên"*). Câu hiển thị kèm tên người thao tác, ví dụ "Lan vừa nhận đơn DH-123". Ánh xạ tạm (chờ chủ xác nhận): "mới có HDV xác nhận" = `nhan` (HDV tự nhận đơn); `xac_nhan` = văn phòng xác nhận đơn. |
| Q3 | Ghi tin về đơn chắc chắn hay bắn-và-quên | **Chắc chắn** — ghi cùng batch với thao tác đơn |

Cảnh báo đã nói với chủ trong chat 2026-09-27 (P18, một lần): theo H3, khi ADR-0017 (HDV xem mọi đơn) được thi công ở GĐ2, **mọi HDV sẽ nhận tin về mọi đơn** trong hộp — chỉnh riêng nếu thấy nhiều. Cảnh báo thứ hai nêu trong báo cáo cuối phiên: H4 đưa sớm "giai đoạn 6" của lộ trình ADR-0018.

## 3. Phạm vi lượt 1

**Có:** chuông + số chưa đọc ở khung mọi trang; trang/ngăn "Thông báo"; tin tự động về đơn; màn "Gửi thông báo" cho Toàn quyền (soạn, xem đã gửi, thu hồi); nhật ký gửi/thu hồi.

**Không (YAGNI):** đánh dấu đọc từng tin; ghim/dải trên cùng; tin có ảnh/tệp; hẹn giờ gửi; chọn đích danh từng người; email; tin về đơn cho Đối tác/Thực tập (điều 12 ADR-0014 giữ: họ chỉ có chấm đếm — chưa xây, ngoài phạm vi).

## 4. Hai loại tin

### 4.1 Tin về đơn (tự động)

Sinh ra khi thao tác đơn **đã ghi thành công** (cùng batch — Q3). Loại tin lấy từ bộ `THAY_DOI` có sẵn:

| Loại | Khi nào | Câu hiển thị (kèm tên người thao tác — Q2; mẫu, chờ chủ duyệt chữ) |
|---|---|---|
| `tao` | Lập đơn, đơn có người phụ trách ngay | Lan vừa lập đơn mới DH-… |
| `tao_cho_nhan` | Lập đơn, chưa ai phụ trách | Lan vừa lập đơn DH-…, chưa có người phụ trách |
| `nhan` | Có người tự nhận đơn | Hùng vừa nhận đơn DH-… |
| `giao` | Đổi/giao người phụ trách | Lan vừa giao đơn DH-… cho người khác phụ trách |
| `xac_nhan` | Xác nhận đơn | Lan vừa xác nhận đơn DH-… |
| `huy` | Huỷ đơn (văn phòng hoặc HDV huỷ) | Hùng vừa huỷ đơn DH-… |

`sua`, `chuyen`, `tien` **không** vào hộp (chỉ làm mới màn hình như hôm nay). `tao` là loại **mới so với thông báo nổi** (chủ nêu "mới lập"); thông báo nổi không đổi.

**Ai thấy (H3):** nhãn sự kiện = `nhanSuKien` (ADR-0022) áp lên **ảnh chụp lúc sự kiện** (người lập, người phụ trách trước/sau — lưu kèm tin, §6.1). Lúc đọc, tin hiện với tài khoản T khi (i) một nhãn của tin nằm trong `nhanKetNoi(T)` **tính lại theo quyền hiện tại**, và (ii) T qua điều kiện "được thấy tin về đơn" — điều kiện này hôm nay nằm **bên trong** `thongBaoNoi` (T là văn phòng hoặc HDV; `tao_cho_nhan` cần `dispatch.claim`). Vì `thongBaoNoi` trả `null` cho `tao` (không có câu), phải **tách điều kiện ra một hàm dùng chung** trong `src/shared/bang-tin.ts` (`thongBaoNoi` gọi lại nó — tái cấu trúc, không đổi hành vi thông báo nổi, test hiện có giữ xanh). Không luật quyền viết tay mới. Hệ quả: ai bị rút quyền thì tin cũ tự ẩn. Số trên chuông và danh sách đi qua **cùng một** hàm lọc.

Bấm tin → cùng đường dẫn như thông báo nổi (`/order?id=…` cho văn phòng, `/account` cho HDV); trang đích vẫn tự kiểm quyền.

### 4.2 Tin thủ công (Toàn quyền)

- Trường: **tiêu đề** (≤ 120 ký tự), **nội dung** (chữ thường, ≤ 2000 ký tự, giữ xuống dòng, không định dạng/HTML), **người nhận**: "Toàn công ty" hoặc tick ≥ 1 nhóm quyền trong `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, INTERN, SUPER_ADMIN` (nhãn tiếng Việt từ `PERMISSION_LABELS`).
- Nhãn lưu: `moi-nguoi` hoặc `quyen:<MÃ>`. Lúc đọc, T thấy tin khi có `moi-nguoi`, hoặc T đang có quyền `<MÃ>` (một tài khoản nhiều quyền thấy tin nếu trùng bất kỳ).
- **Thu hồi:** Toàn quyền bấm "Thu hồi" → tin ẩn khỏi hộp của mọi người (đặt `valid_to`, không xoá hẳn). Không sửa nội dung sau khi gửi (muốn sửa: thu hồi, gửi tin mới).
- Nhật ký: `notice_sent`, `notice_revoked` (chỉ mã tin + số nhóm; **không** chép nội dung, vì nội dung có thể chứa SĐT — CLAUDE.md §7).
- Không gửi tin cho tài khoản đã ngưng (tự nhiên: tài khoản ngưng không đăng nhập được).

## 5. Đã đọc

Một mốc cho mỗi tài khoản: `doc_den_luc`. **Mở hộp thông báo = đánh dấu đã đọc mọi tin tới lúc đó.** Số trên chuông = số tin T được thấy có thời điểm > mốc (hiện tối đa "9+"). Tài khoản chưa có mốc: tính từ lúc tài khoản được tạo (không đổ dồn tin cũ lên người mới).

Hộp hiện tin **30 ngày gần nhất**, tối đa 100 tin, mới nhất trên cùng; tin thủ công đã thu hồi không hiện. Tin cũ hơn vẫn nằm trong bảng (không xoá cứng) nhưng không hiện.

Số chưa đọc cập nhật: khi tải trang, và khi Bảng tin báo có thay đổi đơn (đã có kết nối, không thêm kết nối mới). Tin thủ công mới hiện ở lần tải trang kế tiếp — hoặc ngay nếu lượt 2 (Web Push) được duyệt. Không thêm loại sự kiện vào Bảng tin (ADR-0022 điều 4 giữ nguyên).

## 6. Kiến trúc và dữ liệu (cho người lập kế hoạch)

- **Module mới `thongbao`**, tiền tố bảng `ntf_`, hạng **STRICT** (SQL qua `defineSql`). Cách nối với module đơn: xem §6.1 (**chưa chốt**, người lập kế hoạch xác minh).
- **Luật thuần** `src/shared/thong-bao.ts` (+ `.test.ts`): nhãn của người đọc (`nhanKetNoi` ∪ `quyen:*` ∪ `moi-nguoi`), điều kiện hiện tin về đơn (hàm tách từ `thongBaoNoi` — §4.1), câu hiển thị (bảng §4.1), kiểm đầu vào tin thủ công; một hàm lọc duy nhất dùng cho cả số chưa đọc và danh sách.
- **Bảng (migration `0025_thong_bao.sql`, cập nhật `docs/data-dictionary.json` + `npm run dict`; cột ảnh chụp theo §6.1):**
  - `ntf_item` — `id TEXT PK`, `kind TEXT` (`don` | `thu_cong`; không CHECK liệt kê — luật dự án), `order_id TEXT NULL`, `ma_don TEXT NULL`, `thay_doi TEXT NULL`, `nguoi_lap_id TEXT NULL`, `phu_trach_truoc_id TEXT NULL`, `phu_trach_sau_id TEXT NULL`, `co_phu_trach_truoc`/`co_phu_trach_sau INTEGER NULL`, `tieu_de TEXT NULL`, `noi_dung TEXT NULL`, `created_at`, `created_by TEXT NULL` (NULL = hệ thống), `valid_to TEXT NULL` (thu hồi), `updated_at`, `updated_by`.
  - `ntf_item_tag` — `item_id`, `tag`; PK (`item_id`, `tag`); chỉ mục (`tag`, `item_id`). Dùng cho tin thủ công (tin về đơn tính nhãn lúc đọc từ ảnh chụp — §6.1).
  - `ntf_read_mark` — `staff_id TEXT PK`, `doc_den_luc`, `updated_at`.
  - Chỉ mục `ntf_item(created_at)`.
- **Route** (mọi route khai `access`; ghi cần `Origin`):
  - `GET /api/thong-bao` (cổng `staff`) — danh sách đã lọc.
  - `GET /api/thong-bao/chua-doc` (cổng `staff`) — `{ soChuaDoc }`.
  - `POST /api/thong-bao/da-doc` (cổng `staff`) — đặt mốc = giờ máy chủ.
  - `GET /api/thong-bao/da-gui`, `POST /api/thong-bao`, `POST /api/thong-bao/:id/thu-hoi` — cổng `admin`, thân hỏi `can(staff, "notice.send")` trước mọi truy vấn.
- **Quyền:** thao tác mới `notice.send` = `row("none","none","none","none","none","any","none")` (chỉ Toàn quyền — Q1). Thêm dòng `docs/SO-HANG-RAO.md` cho cổng này kèm ngày quan sát chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- **Trang:** `web/thong-bao.ts` (hộp) và `web/gui-thong-bao.ts` (Toàn quyền) khai `PAGES` + `build:web`; chuông trong `web/shell.ts`. Dựng bằng `h()`, không `innerHTML`; nội dung tin thủ công chèn bằng `textContent` (chống chèn mã). Giá trị CSS qua token; ô gõ 16px.
- **Tài liệu mô tả** cập nhật cùng commit: `SYSTEM-DESIGN.md` (§5 bảng, §7 route, §8 quyền), `CHANGE-GUIDE.md` (công thức "thêm loại tin").

### 6.1 Ghi tin về đơn cùng lô — cơ chế CHƯA CHỐT (người lập kế hoạch xác minh trước khi viết kế hoạch)

Sự thật đã kiểm trong mã (2026-09-27):
- Mã đơn được sinh **ngay trong câu INSERT** (`src/modules/orders/repository.ts:606-633`) → mã JS của `orders` không biết `order_code` trước khi lô chạy.
- `orders` không biết người phụ trách: `isAssigned` và `defaultHandlerStatement` do **gốc lắp ráp tiêm** qua `ctx` (`src/shared/router.ts:31-37`, `:118-119`); điểm phát Bảng tin đọc `findOrderRef` + `handlerOf` **sau** khi ghi (`src/index.ts:37-49`).
- View công bố `v_ord_order_label` chỉ có `id, order_code` (`migrations/0009_orders_label_view.sql`) — **không** có người lập. `v_dsp_order_handler` có `order_id, staff_id` (`migrations/0014_dispatch.sql:64`).

Do đó cách "`orders` import hàm của `thongbao` như `auditStatement`" **không đủ** (thiếu mã đơn, người phụ trách). Khuyến nghị:
- **Gốc lắp ráp tiêm** `ctx.tinDonStatements(orderId, thayDoi, handlerTruoc?)` (mẫu `defaultHandlerStatement`) — `orders`/`dispatch` **không** import `thongbao`, chỉ gộp câu lệnh nhận được vào `db.batch()` của mình, đặt **sau** câu ghi đơn/người phụ trách.
- Câu lệnh là `INSERT … SELECT` (SQL thuộc `thongbao`) chụp vào dòng tin: mã đơn từ `v_ord_order_label`, người lập (cần **thêm cột `staff_id` vào view công bố của orders** — migration đổi view, hoặc view mới `v_ord_order_owner`), người phụ trách sau từ `v_dsp_order_handler`; người phụ trách trước do bên gọi truyền vào.
- Nhãn tính **bằng JS lúc đọc** (`nhanSuKien` trên ảnh chụp) — luật một chỗ, không chép sang SQL. Cần đo: hộp 30 ngày có thể vài nghìn dòng lọc bằng JS; nếu chậm, chuyển sang bảng nhãn ghi sẵn.
- Cạnh: `thongbao → orders, dispatch` (chỉ đọc view), `thongbao → staff, audit`. Không vòng vì `orders`/`dispatch` không import `thongbao`.
- `tao` vs `tao_cho_nhan`: suy từ ảnh chụp người phụ trách sau (không có → `tao_cho_nhan`), cùng luật như `src/index.ts:44`.

Phương án dự phòng nếu cách trên vướng: ghi tin ở gốc lắp ráp **sau** lô (bắn-và-quên) — **trái Q3**, phải hỏi lại chủ.

## 7. Ca biên

- Thao tác đơn thất bại / bị chặn tranh chấp → không có tin (cùng batch, `onlyIf`).
- Đơn bị huỷ sau khi có tin "mới lập": cả hai tin cùng hiện (lịch sử), bấm vào thấy trạng thái hiện tại.
- Tài khoản vừa bị rút quyền văn phòng: tin nhãn `tat-ca` biến khỏi hộp ở lần tải tiếp.
- Người phụ trách là hồ sơ không có tài khoản: không có nhãn `nguoi:` cho họ (giống Bảng tin).
- Nội dung tin thủ công chứa SĐT/email: cho phép (chủ tự viết), nhưng nhật ký không chép nội dung.
- Hai Toàn quyền thu hồi cùng lúc: lần hai trả 409 "Tin đã được thu hồi".
- Chế độ bảo trì bật: tài khoản bị chặn không gọi được API → không thấy gì; không có ngoại lệ.

## 8. Tiêu chí nghiệm thu lượt 1 (hành vi kiểm được)

1. Lập đơn bằng tài khoản Bán hàng A → Kế toán B mở chuông thấy "Đơn mới: DH-…" và số chưa đọc = 1; mở hộp → số về 0.
2. Đơn lập bởi Đối tác (chưa ai phụ trách) → HDV có `dispatch.claim` thấy "Có đơn mới chưa có người phụ trách"; Đối tác khác và Thực tập **không** thấy.
3. HDV nhận đơn → người lập thấy "vừa có người nhận"; một HDV khác không liên quan **không** thấy (trước ADR-0017).
4. Batch đơn bị làm hỏng giữa chừng (test) → không có dòng `ntf_item` nào.
5. Toàn quyền gửi tin cho nhóm "Kế toán" → Kế toán thấy, Bán hàng không thấy; tài khoản Bán hàng + Kế toán thấy.
6. Tài khoản Quản trị (không Toàn quyền) gọi `POST /api/thong-bao` → 403; không có dòng mới. Bằng curl thiếu `Origin` → 403.
7. Thu hồi → tin biến khỏi hộp mọi người; `audit_log` có `notice_revoked`, không chứa nội dung.
8. Tin thủ công chứa `<script>` hiện nguyên văn là chữ.
9. Rút quyền văn phòng của B → tin nhãn `tat-ca` không còn trong hộp của B.
10. Số trên chuông luôn bằng số tin chưa đọc mà danh sách hiện (test luật thuần dùng cùng bộ dữ liệu cho cả hai; e2e so hai route).
11. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` xanh; `audit-invariants --db local` đạt; kịch bản Chrome: chuông, hộp, màn gửi (ảnh vào `docs/evidence/`).
12. Việc lớn (dữ liệu + quyền): có báo cáo người kiểm độc lập chỉ đọc.

## 9. Lượt 2 — thông báo lên màn hình khoá (Web Push) — CHỜ DUYỆT, chưa hỏi

Thiết kế để chủ duyệt sau lượt 1. Các điều "chưa kiểm" được tra cứu song song và ghi vào §9.4 trước khi hỏi.

### 9.1 Cách hoạt động (khuyến nghị)

- Người dùng bấm "Bật thông báo trên màn hình khoá" trong trang Tài khoản (iPhone: chỉ hiện khi app đã **cài ra màn hình chính**; nếu chưa, hiện hướng dẫn cài). Trình duyệt hỏi quyền → gửi "địa chỉ nhận" của máy lên máy chủ.
- Khi có tin mới đáng rung (P1), máy chủ gửi một **"cú gõ cửa" không mang nội dung** tới dịch vụ đẩy của Apple/Google. Service worker nhận, **tự hỏi máy chủ** tin mới nhất (bằng phiên đăng nhập của chính máy đó) rồi hiện thông báo. Không nội dung nào đi qua máy chủ Apple/Google. Hỏi không được (phiên hết hạn, mất mạng) → vẫn hiện "Tour Đảo: bạn có thông báo mới" (iOS bắt buộc mỗi lần đẩy phải hiện một thông báo, không thì thu hồi quyền — §9.4).
- Gửi sau khi thao tác đã ghi xong (`ctx.waitUntil`); lỡ một cú gõ không mất tin (tin đã nằm trong hộp — Q3).
- Địa chỉ nhận trả 410 → đánh dấu hết hiệu lực (404 chỉ ghi log — §9.4).

### 9.2 Dữ liệu (dự kiến, cùng migration hoặc `0026`)

`ntf_push_sub` — `id`, `staff_id`, `endpoint` (địa chỉ nhận), `user_agent_ngan` (để người dùng nhận ra máy), `created_at`, `revoked_at NULL`, `revoke_reason NULL`. Không lưu khoá mã hoá của máy (không cần vì không gửi nội dung — tối thiểu dữ liệu).

Bí mật mới: `VAPID_PRIVATE_KEY` (chủ đặt bằng `wrangler secret put`); khoá công khai trong `vars`.

### 9.3 Ba quyết định sẽ hỏi chủ (lượt 2)

- **P1 — Rung máy cho tin nào.** Khuyến nghị: tin thủ công + tin về đơn **của mình** (mình lập / mình phụ trách) + **đơn chờ nhận** (với ai nhận được). Tin "mọi đơn" (Quản lý/Kế toán thấy mọi đơn) **chỉ vào hộp**, không rung — tránh rung hàng chục lần mỗi ngày. Phương án khác: rung mọi tin trong hộp; hoặc cho mỗi người tự chọn.
- **P2 — Lưu địa chỉ nhận của máy + khi nào xoá hiệu lực:** đăng xuất, ngưng tài khoản, đổi PIN, đổi quyền (giống cách Bảng tin đóng kết nối — `dongCua`).
- **P3 — Khoá bí mật mới + cách gửi không mang nội dung** (như §9.1). Phương án khác: gửi kèm nội dung đã mã hoá (hiện câu đầy đủ ngay cả khi phiên hết hạn, nhưng nội dung đi qua máy chủ Apple dù đã mã hoá, và phải tự viết phần mã hoá vì dự án không dùng thư viện ngoài).

### 9.4 Kết quả tra cứu (2026-09-27, tài liệu chính thức; chưa thử trên máy thật)

- **iOS** [đã xác nhận từ nguồn]: cần iOS/iPadOS **16.4+** và app **đã cài ra màn hình chính**; xin quyền phải gọi ngay trong xử lý cú chạm của người dùng. **Không có đẩy im lặng**: service worker phải gọi `showNotification` cho **mọi** lần đẩy, nếu không Safari **thu hồi quyền** (webkit.org/blog/12945, developer.apple.com "Sending web push notifications in web apps and browsers"). → Nhánh dự phòng "bạn có thông báo mới" là bắt buộc và phải có test.
- **Thân rỗng** [xác nhận gián tiếp]: Apple ghi "payload rỗng thì có thể bỏ Content-Encoding" — ngầm cho phép; chưa thử gửi thật. Header: `TTL` bắt buộc (RFC 8030, thiếu → 400); `Urgency`, `Topic` tuỳ chọn; `Authorization: vapid t=<JWT>, k=<khoá công khai>` — JWT ES256, `aud` = origin dịch vụ đẩy, `exp` ≤ 24 giờ, không làm mới quá 1 lần/giờ.
- **Mã lỗi Apple** [đã xác nhận]: **410** = địa chỉ nhận hết hạn → đánh dấu hết hiệu lực; 404 = đường dẫn sai (không phải hết hạn) → ghi log, không thu hồi; 403 xác thực; 429 gửi quá nhiều.
- **Cookie trong service worker** [mặc định đã xác nhận; iOS thật chưa]: `fetch` cùng nguồn mặc định gửi cookie, `SameSite=Lax` không chặn. Hành vi thật của iOS với app đã cài chưa có văn bản → **phải thử iPhone thật**; 401 → vẫn hiện thông báo chung.
- **Giới hạn Worker (gói trả phí)** [đã xác nhận]: 10.000 lần gọi ra ngoài mỗi lượt (chỉnh được); nhưng `ctx.waitUntil` chỉ sống **30 giây** sau phản hồi và chỉ **6 kết nối** chờ cùng lúc. Gửi ~1000 máy (tin thủ công cho nhóm Đối tác) trong một lượt là rủi ro [suy luận, chưa đo] → đề xuất **Cloudflare Queues** (binding mới — thêm vào P3) hoặc chia lô bằng Durable Object sẵn có. Tin về đơn (vài chục máy) gửi thẳng được.
- **Ký VAPID bằng Web Crypto** [đã xác nhận]: ECDSA P-256 trả chữ ký r‖s 64 byte — đúng dạng JWS ES256, dùng thẳng; khoá công khai 65 byte base64url không `=`. Không cần thư viện ngoài.
- **Bẫy triển khai**: service worker mới chỉ tới máy nhân viên sau khi họ mở app một lần (như Turnstile) — nút "Bật thông báo" chỉ hoạt động từ lần mở thứ hai.

## 10. Giả định (bề mặt, đảo được)

- Tên mục: "Thông báo"; màn gửi: "Gửi thông báo" (trong nhóm Quản trị, chỉ Toàn quyền thấy).
- Chuông đặt ở thanh trên của khung, cạnh tên người dùng; số dạng chấm đỏ theo token hiện có.
- 30 ngày / 100 tin / "9+".
- Mở hộp = đọc hết (không đánh dấu từng tin).

## 11. Phụ thuộc và thứ tự

- Không phụ thuộc GĐ2 (ADR-0017/0019 Phần C) hay Đơn tự do (ADR-0030..0032); nhưng khi các việc đó thêm loại thay đổi đơn mới (ví dụ HDV từ chối), chúng **phải** gộp câu lệnh ghi tin (§6.1) vào lô nếu muốn tin vào hộp — ghi vào `CHANGE-GUIDE.md`.
- Chạm `orders/repository.ts` và `dispatch/service.ts` — dễ xung đột với nhánh GĐ2 đang mở; người lập kế hoạch kiểm nhánh trước khi thi công.

## 12. Trang ghép (CLAUDE.md §9)

**(1) Bảng chứa loại thực thể nào**

| Bảng | Chứa |
|---|---|
| `ntf_item` | hai loại: tin về đơn (`kind=don`, có `order_id`, `ma_don`, `thay_doi`, mã người thao tác — tên đọc qua `v_stf_staff_label`; không tiền, không SĐT) và tin thủ công (`kind=thu_cong`, có tiêu đề, nội dung, người gửi) |
| `ntf_item_tag` | nhãn người nhận của mỗi tin: `tat-ca`, `cho-nhan`, `nguoi:<id>` (tin đơn); `moi-nguoi`, `quyen:<MÃ>` (tin thủ công) |
| `ntf_read_mark` | mốc đã đọc của mỗi tài khoản |
| (lượt 2) `ntf_push_sub` | địa chỉ nhận thông báo của từng máy, theo tài khoản |

**(2) Dòng bản đồ quyền chạm các bảng này, áp cho loại nào**

| Ô quyền | Áp cho | Dùng ở |
|---|---|---|
| `notice.send` (mới; chỉ `SUPER_ADMIN`) | ghi/thu hồi tin `thu_cong`; đọc danh sách đã gửi | 3 route cổng `admin` |
| `order.view` (không ngữ cảnh) | tin `don` nhãn `tat-ca` — qua `nhanKetNoi` | đọc hộp |
| `dispatch.claim` | tin `don` nhãn `cho-nhan` và loại `tao_cho_nhan` — qua `nhanKetNoi` + hàm điều kiện tách từ `thongBaoNoi` | đọc hộp |
| `isOffice` / `FIELD` | điều kiện chung của tin `don` (Đối tác/Thực tập không thấy) — cùng hàm điều kiện | đọc hộp |
| mã quyền đang có của tài khoản | tin `thu_cong` nhãn `quyen:<MÃ>` | đọc hộp |
| (không ô nào) | `ntf_read_mark` — mỗi tài khoản chỉ ghi mốc của chính mình (id lấy từ phiên, không từ yêu cầu) | `POST /api/thong-bao/da-doc` |
| (không ô nào; ghi do module đơn) | tin `don` chỉ sinh trong batch của thao tác đơn đã qua kiểm quyền của chính thao tác đó (câu lệnh do gốc lắp ráp tiêm — §6.1) | `orders`, `dispatch` |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Kiểm trong thân |
|---|---|---|
| `GET /api/thong-bao`, `/chua-doc`, `POST /da-doc` | `staff` (mọi tài khoản đăng nhập) | lọc theo nhãn tính lại từ quyền hiện tại |
| `GET /api/thong-bao/da-gui`, `POST /api/thong-bao`, `POST /api/thong-bao/:id/thu-hoi` | `admin` | `can(staff,"notice.send")` trước mọi truy vấn |
| ghi tin `don` | cổng của route đơn tương ứng | không có route ghi riêng |
| (lượt 2) đăng ký/huỷ địa chỉ nhận | `staff` | chỉ cho chính mình |
