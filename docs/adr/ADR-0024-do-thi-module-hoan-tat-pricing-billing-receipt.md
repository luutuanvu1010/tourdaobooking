# ADR-0024 — Đồ thị module cho Hoàn tất đơn và sổ công nợ: thêm `pricing`, hiện thực `billing`, thêm `receipt` (không bảng); `orders` giữ sự thật "đơn đã chốt"; trigger chỉ đọc bảng cùng module hoặc view công bố

- **Trạng thái:** **accepted phần điều 6** — chủ dự án duyệt 2026-09-28 ("duyệt T2b", trong phiên điều phối; lời duyệt do điều phối ghi lại nguyên văn), kèm các bổ sung 6.1–6.6 ghi dưới điều 6, theo đề xuất `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md` (người kiểm độc lập: ĐẠT CÓ ĐIỀU KIỆN, đã sửa đủ ba điểm). **Điều 1–5 vẫn proposed** — AI soạn 2026-09-25 (vai lập kế hoạch) từ bản tổng hợp `docs/superpowers/specs/2026-09-25-hoan-tat-phan-bien-tong-hop.md` (§1–§3, §9, §10). Đây là phần "điều phối tự quyết (kỹ thuật)" của bản tổng hợp §7, **cần chủ duyệt cùng lượt 1** vì nó bổ sung đồ thị của ADR-0002 (đã accepted). AI **không tự duyệt** (N3, Điều 7.2). Sau khi accepted chỉ sửa dòng trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này (áp cho điều 6 từ 2026-09-28).
- **Ngày:** 2026-09-25   **Người phê chuẩn:** chủ dự án — điều 6 duyệt 2026-09-28; điều 1–5 chưa duyệt
- **Lượt duyệt:** **lượt 1 của "Hoàn tất đơn"** (D0 + D1 = ADR-0025 + D2 = ADR-0026, đúng 3 quyết định, trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md`). **Chỉ trình khi ADR-0019 đã lên production** (luật "dừng dây chuyền", `CLAUDE.md` §3). **Điều 6 tách ra duyệt riêng** 2026-09-28: một quyết định, trang ghép ở §6 của đề xuất T2b; chủ chọn "2i" — làm "Tour Đảo là hồ sơ" trước phân hệ Vận chuyển (`docs/superpowers/specs/2026-09-27-van-chuyen-ra-soat.md` §6).
- **Loại quyết định:** **cửa một chiều** — tiền tố bảng (`prc_`, `bil_`) và chủ sở hữu bảng khó đổi sau khi có dữ liệu (cùng lý do ADR-0002); cột mới trên `orders` chỉ thêm, không gỡ được mà không dựng lại bảng. Phần luật kiểm (bài kiểm kiến trúc mới) là hai chiều nhưng chỉ được **siết** (Điều 9.4).
- **Xây trên lỗ đang hở: `money.view`, `contact.view`** (`docs/quyen-hoan.json`) — các module ở đây (sổ, biên nhận) trả tiền và liên hệ khách; hai ô đó phải đã được máy chủ hỏi (ADR-0019) trước khi quyết định này được duyệt. **Và `DK-T3-01`** (HIGH, hạn 2026-10-05 — `docs/quyen-hoan.json` (mục `phat_hien`, đã trên `main`)): đối tác tự lập, tự xác nhận và xuất phiếu mang tên Tour Đảo với giá tự gõ/giảm giá tuỳ ý — module `receipt` mới dựng đúng phiếu đó, nên phải vá (hoặc chủ gia hạn có lý do) trước khi duyệt. **Kiểm lại cho điều 6 (2026-09-27):** ADR-0019 Phần B đã lên production bản 1.18; `DK-T3-01` đã vá (bản 1.14); mục `phat_hien` của `docs/quyen-hoan.json` rỗng ⇒ không lỗ nào chặn điều 6 (đề xuất T2b §4). Điều 1–5 vẫn giữ điều kiện này.
- **Liên quan:** **bổ sung** ADR-0002 (đồ thị, bảng sở hữu, cạnh dự kiến `catalog → parties`) như ADR-0008 đã làm — không thay thế; ADR-0003; ADR-0004 (module `billing`, tiền tố `bil_` đã khai); ADR-0020 (không tiêm câu lệnh qua gốc lắp ráp); ADR-0022 (Bảng tin, hạng module "không dùng cơ sở dữ liệu" chủ đã duyệt 25/9 — kế hoạch `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md` dòng 18, 91, 195).

## Nguồn (chủ dự án, phiên chat 2026-09-25)

- *"Theo đúng triết lý Modular monolith thì lúc này lập tức kích hoạt lại luồng tính toán (nếu chưa có thì phải làm)."* (đặc tả gốc §0)
- *"chạy subagent để (1) xem lại spec, (2) nên đưa vào hệ thống thế nào để đúng với kiến trúc Modular Monolith, (3) tách biệt thực thể với vai trò và/hoặc thuộc tính, để sau này sửa logic sẽ dễ."* (bản tổng hợp, đầu tệp)
- Câu 8b của đặc tả Hoàn tất: **duyệt** thêm loại module "không dùng cơ sở dữ liệu" cho Bảng tin.
- H2': *"khoá đơn và ghi sổ ngay khi HDV bấm 'Đã giao – đã thu đủ'"*; *"Kế toán bấm 'Hoàn thành'"* (bản tổng hợp §10) — lý do có **hai** cột mốc trên `orders` (điều 3).

## Sửa những câu nào của quyết định đã duyệt

| Nguồn | Câu hiện hành | Sau ADR-0024 |
|---|---|---|
| ADR-0002, "Đồ thị phụ thuộc mục tiêu", dòng `catalog` | "`catalog` → `parties` (**cạnh dự kiến ở N4**: quy tắc giá theo loại vai trò)." | **Bỏ cạnh dự kiến đó.** Quy tắc giá theo vai (chiết khấu, điều khoản cung ứng) thuộc module mới `pricing` (điều 1). `catalog` giữ nguyên là dữ liệu đồng bộ Sheet, chỉ phụ thuộc `audit` (như mã hôm nay, `src/architecture.test.ts:22`). |
| ADR-0002, "Bảng sở hữu", dòng `catalog`, cột "dự kiến" | "quy tắc giá theo loại vai trò (N4)" | Chuyển sang `pricing` (tiền tố `prc_`). |
| ADR-0002, "Bảng sở hữu", dòng `billing`, cột "dự kiến" | "`bil_payment_method`, `bil_payment_receipt`, `bil_invoice_request`" | Giữ ba tên đó (hoá đơn chưa làm); **thêm** bảng sổ công nợ và tra cứu của ADR-0026. |
| ADR-0002, "Đồ thị", dòng `billing` | "`billing` → `orders`, `parties`, `locations`" | `billing` → `orders`, `parties`, `staff`, `dispatch`, `audit` (điều 2). `locations` bỏ khỏi danh sách dự kiến (chưa có nhu cầu "nơi thu"; thêm lại bằng ADR khi cần). |
| ADR-0002, "Đồ thị", dòng `orders` | "`orders` → `staff`, `parties`, `locations`, `catalog`" | Thêm `orders → pricing` (điều 2). |
| ADR-0002, bảng "Cách mỗi nhu cầu xuyên module…", dòng "`billing` cần tổng tiền của đơn để tính 'còn lại'" | "(1) hàm công khai của `orders`; kết quả tính, không sao chép" | **Giữ**, và nói rõ chiều ngược: số "đã thu / còn phải thu" là số của `billing`; màn hình đơn lấy nó qua route của `billing`, `orders` **không** đọc `bil_` (điều 4). |
| ADR-0002 điều 8 (bài kiểm máy) | chỉ cấm `INSTEAD OF` trong trigger (`src/architecture.test.ts:201-202`) | **Siết thêm** luật trigger (điều 5). |
| Kế hoạch Bảng tin (đã được chủ duyệt, dòng 18/91/195) — hạng `KHONG_DB` | "không tệp nào trong module được nhắc `env.DB`, `.prepare(`, `.batch(`, `.exec(`" | **Không đổi** hạng đó. `receipt` **không** vào `KHONG_DB` mà vào hạng mới `KHONG_BANG` (điều 1) — xem "Xung đột đã thấy". |

**Không đổi:** năm quy tắc của `docs/ARCHITECTURE.md`; tám điều siết của ADR-0002; ADR-0008; mọi cạnh hiện có của `ALLOWED_EDGES`.

## Quyết định

1. **Ba module mới** (thêm vào `ALLOWED_EDGES`, `TABLE_PREFIX`, `VIEW_PREFIX` của `src/architecture.test.ts` và vào `docs/ARCHITECTURE.md`):
   - **`pricing`** — tiền tố bảng `prc_`, tiền tố view `v_prc_`; hạng **nghiêm** (`STRICT`) từ ngày đầu. Sở hữu **chính sách có hiệu lực theo ngày**: nhóm đối tác, loại dịch vụ, quy tắc chiết khấu/hoa hồng, điều khoản cung ứng (người bán, nhà cung cấp, a%). **Bảng của nó thuộc lượt 2 (D4/D5)** — lượt này chỉ lập module và ranh giới. Không đặt các số này trên bảng `catalog_*` (bị Sheet ghi đè mỗi lần đồng bộ, `migrations/0006`) và không phục vụ chúng qua route danh mục của trình duyệt (dễ lộ a%).
   - **`billing`** — tiền tố `bil_`, view `v_bil_` (đã khai sẵn ở `src/architecture.test.ts:57-58`); hạng **nghiêm**. Sở hữu lần thu tiền, phiếu sổ, dòng nợ, bảng tra cứu đi kèm (ADR-0026); route "Đã giao – đã thu đủ", "Hoàn thành", ghi thu, sổ, nộp/trả/hoàn (ADR-0025, ADR-0026).
   - **`receipt`** — **không có bảng, không có câu SQL** (`.prepare(`, `.batch(`, `.exec(` không xuất hiện trong module; không có mục nào trong `docs/data-dictionary.json` thuộc `receipt`). Được chuyển tay cầm cơ sở dữ liệu cho **hàm công bố** của module mình phụ thuộc. Hạng mới **`KHONG_BANG`** — chặt hơn `STRICT` (không SQL), lỏng hơn `KHONG_DB` của Bảng tin (được chuyển tay cầm). Sở hữu `ReceiptDto` (danh sách trắng, ADR-0026 điều 11) và route trả biên nhận.
2. **Cạnh mới** (mọi mũi tên đi xuống, không vòng — bài kiểm "không vòng" hiện có chạy lại):
   ```
   receipt ─▶ billing ─▶ dispatch ─▶ orders ─▶ pricing ─▶ catalog, parties ─▶ locations
      │          └─▶ orders, parties, staff, audit
      └─▶ orders, parties, company
   ```
   - `orders → pricing` (lượt 2 mới dùng; lý do chiều này: tỷ lệ phải **chụp trong luồng của đơn** lúc Xác nhận — H5; ADR-0018 điều 11).
   - `pricing → parties, catalog, audit`.
   - `billing → orders, parties, staff, dispatch, audit`. Cạnh `billing → dispatch` **chỉ** để lấy câu bảo vệ "người này còn là người phụ trách đang mở của đơn" (ADR-0002 điều 4) đặt trong lô ghi "Đã giao" — đóng khe hở: đổi người phụ trách **không** đổi `orders.updated_at`, nên khoá lạc quan của đơn không bắt được (ADR-0025 điều 6).
   - `receipt → orders, billing, parties, company`.
   - `bangtin`: không đổi (ADR-0022; `billing` gọi `ctx.baoThayDoi` do gốc lắp ráp tiêm, không import `bangtin`).
3. **`orders` giữ sự thật "đơn đã chốt"** — hai cột mốc, **chỉ thêm cột** (`ALTER TABLE orders ADD COLUMN`), **không đụng `CHECK (status IN …)`** của `migrations/0003_orders.sql:6`, không dựng lại bảng (ADR-0003 điều 10):
   - `orders.delivered_at` — lúc bấm **"Đã giao – đã thu đủ"** (ADR-0025). Từ mốc này đơn **bị khoá** (trigger của ADR-0025 điều 5).
   - `orders.completed_at` — lúc Kế toán bấm **"Hoàn thành"** (ADR-0025).
   - Kèm `delivered_by`, `completed_by` (TEXT NULL, không khoá ngoại — kiểu cột WHO của ADR-0003 điều 6). Tên cột là **đề xuất**, chốt ở kế hoạch.
   - **Trạng thái hiển thị suy ra**, không lưu: `confirmed` + `delivered_at` ⇒ "Đã giao – đã thu đủ"; + `completed_at` ⇒ "Hoàn thành". View công bố mới **`v_ord_order_state`** (`id`, `status`, `delivered_at`, `completed_at`) — chỉ khoá + cờ trạng thái tối thiểu (ADR-0002 điều 3). `billing` và `dispatch` đọc trạng thái đơn qua view này.
   - **Lệch có chủ ý so với bản tổng hợp §3:** bản đó có **một** cột `completed_at` vừa là khoá vừa là "hoàn thành" — viết trước khi chủ tách hai bước (H2'). Nay khoá gắn với `delivered_at`; `completed_at` chỉ là mốc Kế toán.
4. **`orders` không bao giờ đọc bảng `bil_`** — không trong mã, không trong câu SQL, không trong trigger. Điều kiện nằm ở `billing` (vd "mọi khoản người khác nợ công ty đã về đủ" trước khi "Hoàn thành") được kiểm **trong lô ghi của `billing`**: `billing` lấy câu `UPDATE orders …` **chưa chạy** từ `orders/index.ts` (quy tắc 3 của ADR-0002) và đặt các câu có điều kiện của chính nó trong cùng `db.batch()`; muốn chặn câu của `orders` theo điều kiện ở `bil_` thì đi qua câu bảo vệ đã có tiền lệ (idiom `wonGuard` qua `audit_log`, `ARCHITECTURE.md` "Luật dữ liệu"). Cách nối cụ thể chốt ở kế hoạch; **tiêu chí:** bài kiểm 8(b) của `orders`/`billing` không thấy câu nào của `orders` chạm `bil_*`. Số "đã thu / còn phải thu" hiện trên màn đơn lấy qua route của `billing` (trình duyệt gọi thêm), không qua `orders`.
5. **Luật trigger mới (siết ADR-0002 điều 8):** thân một trigger chỉ được đọc (a) bảng thuộc **cùng module** với bảng đặt trigger, hoặc (b) **view công bố** của module mà module đó được phép phụ thuộc (`ALLOWED_EDGES`). Bài kiểm mới trong `src/architecture.test.ts`: đọc `sqlite_master` (type = trigger), hỏi chính SQLite các quan hệ thân trigger chạm (cách EXPLAIN như điều 8(b) hoặc tương đương, không quét chuỗi), so với sổ. **Đã rà tay 23 trigger hiện có** (`0007`×4, `0008`×7, `0011`×4, `0017`×3, `0021`×2, `0024`×3): đều thoả (vd `lc1_stf_permission_external_partner_only` đọc `staff` + view `v_pty_open_role_group`, cạnh `staff → parties`). **Phải thấy chặn thật một lần** (P16): cài tạm một trigger trên `orders` đọc một bảng `bil_` → đỏ → hoàn nguyên; ghi dòng vào `docs/SO-HANG-RAO.md`.
6. **Tour Đảo là một hồ sơ** — hôm nay `company_profile` là bảng một dòng không có `party_id` (`migrations/0002`). Tạo **hồ sơ tổ chức Tour Đảo** trong `parties`, đánh dấu bằng **một mã vai** (dữ liệu, `pty_role_type`; tên mã chốt ở kế hoạch), và `parties/index.ts` công bố **một** hàm trả id hồ sơ đó. Không viết cứng id trong mã; không thêm cột vào `company_profile`. Bài kiểm dữ liệu: đúng một hồ sơ đang mở vai đó (vào `audit-invariants`).
   - **Bảng hồ sơ nhận thêm một loại thực thể** ("công ty chủ") — bài học F-01 (`CLAUDE.md` §9): hôm nay `party.write` = `any` cho Bán hàng/Kế toán với mọi hồ sơ **không gắn tài khoản**, nghĩa là nếu không chặn thì họ đổi được tên/liên hệ của chính Tour Đảo hoặc gộp nó vào hồ sơ khác. **Quyết định:** hồ sơ công ty chủ **chỉ** sửa/kết thúc vai/gộp qua `admin.manage` **[thay khi duyệt: ô `company.legal.write`, chỉ Toàn quyền — xem 6.4]** (cùng khuôn hồ sơ gắn tài khoản, ADR-0013); route `party.write` và gộp hồ sơ từ chối nó; test hồi quy "Bán hàng sửa hồ sơ công ty chủ → 403".
   - **Bổ sung khi duyệt** (chủ dự án 2026-09-28; chủ chọn phương án (a) ngày 2026-09-27). Chi tiết và lý do: đề xuất T2b `docs/superpowers/specs/2026-09-27-de-xuat-t2b-ho-so-tour-dao.md` §3.
     - **6.1 Một nguồn thật = hồ sơ tổ chức Tour Đảo.** Tên pháp lý, mã số thuế, địa chỉ nằm ở `pty_organization` của hồ sơ đó. Hotline và Zalo là điểm liên hệ loại `PHONE`, phân biệt bằng cột `label` có sẵn (`migrations/0011`). Email là điểm liên hệ loại `EMAIL`. Không thêm loại liên hệ mới.
     - **6.2 Mọi nơi đọc qua một hàm công bố của `parties`** (tên hàm chốt ở kế hoạch).
       - `GET /api/company` giữ đường dẫn, chỉ đổi nguồn đọc, nên biên nhận không phải sửa.
       - Trang đăng nhập **giữ nguyên hình thức chân trang** theo bản thiết kế đã duyệt, chỉ đổi nguồn chữ: tên và mã số thuế lấy từ `GET /api/auth/config` (thêm 2 trường, không thêm request).
       - Chữ tĩnh hiện có chỉ còn là nội dung hiện trước khi tải xong hoặc khi lỗi mạng. Lệch "tỉnh/Tỉnh" sửa theo dữ liệu hồ sơ.
     - **6.3 Phạm vi.** Lượt này không xoá `company_profile`: các cột pháp lý thôi được đọc, còn `logo_url` (thương hiệu, không phải định danh) ở lại. Việc thu hồi hẳn làm theo expand–contract ở lần phát hành sau.
     - **6.4 Người sửa hồ sơ công ty chủ:** ô **`company.legal.write`, chỉ Toàn quyền** (`SUPER_ADMIN`), theo ADR-0038 điều 7. Ô này thay `admin.manage` trong câu "Quyết định" ở trên.
       - Mọi route ghi hồ sơ này (định danh, điểm liên hệ, vai) hỏi ô đó trong thân route.
       - `party.write` từ chối hồ sơ này.
       - Tính năng gộp hồ sơ chưa có trong mã; khi xây, nó phải từ chối hồ sơ này.
       - Nếu phần này lên `main` trước ADR-0038 thì tự khai ô vào `MATRIX`; nhánh gộp sau không khai lặp.
     - **6.5 Chặn gán và kết thúc vai "công ty chủ" bằng hai lớp** (Hiến chương 5.1):
       - (i) `POST /api/parties/:id/roles` và `POST /api/parties/:id/roles/:rid/end` từ chối mã vai này, trừ khi người gọi có `company.legal.write`.
       - (ii) Ở cơ sở dữ liệu: chỉ mục duy nhất một phần trên `pty_party_role(role_type_code)` cho dòng đang mở của mã vai này, cộng trigger cấm đóng vai khi không có dòng mở thay thế trong cùng lô.
       - Có dòng ở `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (P16).
     - **6.6 Phát hành riêng.** Dòng "Dữ liệu" ở mục Hệ quả gộp điều 6 với điều 3. Điều 6 đi bằng migration riêng của nó (số trống kế tiếp lúc thi công); điều 1–5 không phát hành theo.

## Lý do

- **Bỏ vòng `orders ⇄ billing`** mà đặc tả gốc vô tình tạo (bản ghi hoàn tất ở `billing`, trigger của `orders` đọc `bil_`): ba người phản biện độc lập cùng kết luận "đơn đã chốt" là sự thật của `orders`, `billing` giữ tiền và trỏ về nó (bản tổng hợp §1.2). Bài kiểm hôm nay **không bắt được** lỗi này (chỉ soi `INSTEAD OF`) → cần điều 5.
- **Tách `pricing` khỏi `catalog`**: `catalog` là bản sao Sheet bị ghi đè và phục vụ trình duyệt; đặt a%/chiết khấu vào đó là mất dữ liệu mỗi lần đồng bộ và dễ lộ số bí mật.
- **`receipt` không bảng**: biên nhận là **một cách nhìn** dữ liệu của module khác theo danh sách trắng — không có dữ liệu riêng để giữ; không có SQL thì không thể "lấy cả đơn rồi bỏ bớt".
- **Không tiêm câu lệnh qua gốc lắp ráp** (ADR-0020 vừa gỡ kiểu đó); **không phát sự kiện rồi mới tính tiền** (Bảng tin có thể lỡ tin — ADR-0022 điều 7).
- **Hai cột mốc thay vì trạng thái mới**: thêm giá trị vào `CHECK` buộc dựng lại `orders` đang bị nhiều bảng tham chiếu (ADR-0003 điều 10 tránh tuyệt đối).

## Phương án bị loại

- **Bản ghi hoàn tất ở `billing`, trigger `orders` đọc `bil_`** — vòng phụ thuộc ở tầng SQL (bản tổng hợp §1.2).
- **Thêm `'delivered'`, `'completed'` vào `CHECK` của `orders.status`** — dựng lại bảng `orders`.
- **Để quy tắc giá theo vai trong `catalog`** (như ADR-0002 dự kiến) — bị Sheet ghi đè; lộ qua route danh mục.
- **Xếp `receipt` vào `KHONG_DB` và nới hạng đó cho phép nhắc `env.DB`** — nới một hàng rào chủ đã duyệt (cấm, Điều 9.4).
- **Đặt route biên nhận trong `billing`, `receipt` chỉ là hàm thuần** — `billing` phải tự gom dữ liệu đơn/hồ sơ/công ty cho biên nhận, danh sách trắng bị kéo ra ngoài module sở hữu nó.
- **Kiểm "còn là người phụ trách" chỉ bằng `ctx.isAssigned` trước lô ghi** — còn khe giữa lúc kiểm và lúc ghi (đổi người phụ trách không chạm `orders.updated_at`).

## Hệ quả

- **`src/architecture.test.ts`:** `ALLOWED_EDGES` thêm `pricing`, `billing`, `receipt` và cạnh `orders → pricing`; `STRICT` thêm `pricing`, `billing` (khi có `repository.ts`); hằng `KHONG_BANG = ["receipt"]` + bài kiểm (không `.prepare(`/`.batch(`/`.exec(`, không bảng/view trong sổ thuộc `receipt`); `TABLE_PREFIX`/`VIEW_PREFIX` thêm `prc_`/`prc`; bài kiểm trigger (điều 5). Mỗi bài mới phải **thấy chặn thật một lần** và có dòng ở `docs/SO-HANG-RAO.md`.
- **`docs/ARCHITECTURE.md`, `CLAUDE.md` §7** (tệp luật — AI chỉ **đề xuất** diff, chủ duyệt, N9): danh sách module, hạng `KHONG_BANG`, luật trigger.
- **Dữ liệu (một migration, chỉ thêm):** cột mốc trên `orders` (điều 3), view `v_ord_order_state`, mã vai "công ty chủ" + hồ sơ Tour Đảo (dữ liệu có thể gieo bằng runbook thay vì migration — chốt ở kế hoạch). Mục mới ở `docs/data-dictionary.json` + `npm run dict`.
- **`src/modules/parties/index.ts`:** hàm công bố id hồ sơ Tour Đảo; `audit-invariants`: đúng một hồ sơ công ty chủ.
- **Tiêu chí nghiệm thu (kiểm được):** (1) `npm test` xanh với đồ thị mới; (2) bài kiểm trigger đỏ khi cài tạm trigger `orders` đọc `bil_`; (3) bài kiểm `KHONG_BANG` đỏ khi chèn tạm `.prepare(` vào `receipt`; (4) không câu SQL nào của `orders` chạm `bil_*` (8(b)); (5) thêm cột không làm đổi số dòng hay giá trị `orders` hiện có (test migration).
- **Việc lớn** (dữ liệu + luật): người kiểm độc lập chỉ-đọc sau thi công.

## Xung đột đã thấy khi soạn (trình chủ, không tự hoà giải)

- **`receipt` với hạng `KHONG_DB`:** người điều phối định xếp `receipt` vào `KHONG_DB` chủ đã duyệt cho Bảng tin. Nhưng `KHONG_DB` theo kế hoạch Bảng tin cấm cả việc nhắc `env.DB`, trong khi route biên nhận phải chuyển tay cầm đó cho hàm của `orders`/`billing`/`parties`/`company`. AI không được nới hàng rào đã duyệt (Điều 9.4) ⇒ đề xuất hạng mới `KHONG_BANG` (điều 1). Chủ duyệt ADR này là duyệt hạng mới đó.
- **Biên nhận hôm nay dựng ở trình duyệt:** `buildConfirmation(order: OrderDetailDto, …)` ở `src/shared/order-confirmation.ts:220` nhận **cả đơn** và chạy phía trình duyệt. Chuyển sang `ReceiptDto` dựng ở máy chủ là **route mới + sửa `web/`**, không phải sửa nhỏ.
