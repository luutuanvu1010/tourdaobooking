# Gắn hồ sơ khách vào đơn — lát 1 của N2 (P-4)

> Ngày 2026-09-21. Trạng thái: **bản thảo chờ chủ dự án duyệt** (ba câu hỏi ở §3), chưa có mã.
> Nguồn: báo cáo đối chiếu Oracle TCA bản 2 (`docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md` §6.1, đề xuất P-4); kế hoạch hành động Task 5.
> Nền đã duyệt: ADR-0001 mục 7–8 (các bên trên booking, nhận dạng theo SĐT), ADR-0002 (ranh giới module), ADR-0003 điều 10 (không dựng lại bảng), ADR-0007 (quyền, sửa sau xác nhận).

## 1. Vì sao, và lát 1 gồm gì

Hôm nay mỗi đơn chép tay tên/SĐT khách vào bốn cột chữ `orders.customer_name/phone/email/note` (`migrations/0003_orders.sql:7-10`). Danh bạ hồ sơ (`pty_party`, vai `CUSTOMER`, `AGENT` — `migrations/0011_parties.sql:74-76`) đã có nhưng đơn chưa trỏ vào. Nên chưa trả lời được "khách này đặt mấy lần", "đại lý nào mang về nhiều đơn". Mỗi đơn mới lập kiểu cũ làm việc gộp về sau đắt hơn: phải đoán "đơn nào cùng một người" từ chữ gõ tay, đoán sai là gắn nhầm đơn và không hoàn tác được (ADR-0001 mục 8).

**Lát 1 (đặc tả này):** thêm một cột trỏ hồ sơ người đặt vào đơn + bước "tìm theo SĐT → dùng hồ sơ có sẵn hoặc tạo mới" ở form lập đơn. Chỉ THÊM, gỡ được, không đụng dữ liệu cũ.

**Không làm ở lát 1:** `traveller_party_id` (khách đi tour khác người đặt), backfill đơn cũ, gộp hồ sơ, siết bắt buộc — xem §9.

## 2. Dữ liệu (mục 1 của yêu cầu)

Migration mới, **số kế tiếp tại thời điểm thi công** (dự kiến `0019` nếu B5 `staff_party_required` vào trước, nếu không là `0018`; `0017` đã dùng cho `0017_order_status_audit_guards.sql`). Kiểm lại `migrations/` và `docs/superpowers/plans/` trước khi đặt tên.

```sql
ALTER TABLE orders ADD COLUMN booker_party_id TEXT REFERENCES pty_party(id);   -- NULL được, NO ACTION (mặc định)
CREATE INDEX orders_booker_party_idx ON orders(booker_party_id);
```

- **Để trống được là bắt buộc, không chỉ là lựa chọn:** SQLite chỉ cho `ALTER TABLE … ADD COLUMN … REFERENCES` khi mặc định là NULL (`docs/CHANGE-GUIDE.md` §d bước 1). Muốn `NOT NULL` phải dựng lại bảng `orders` — ADR-0003 điều 10 ưu tiên tuyệt đối không làm vậy, và dựng lại sẽ phải tạo lại mọi trigger đang gắn vào `orders` (`orders_money_*` ở `0007`, `orders_confirm_requires_trip` ở `0008`, `orders_status_transition` ở `0017`). `ADD COLUMN` không đụng các trigger đó.
- **Khoá ngoại `NO ACTION`, không `RESTRICT`/`CASCADE`** (ADR-0002 điều 5). Hồ sơ không bao giờ bị xoá cứng (ngưng bằng `active = 0`), nên khoá ngoại chỉ là lưới.
- **Giữ `customer_name/phone/email/note`** làm **bản chụp lúc đặt** (expand; chưa contract). Ảnh xác nhận PNG, danh sách đơn, tìm đơn tiếp tục đọc bản chụp như hiện nay — không phải sửa.
- **Sổ dữ liệu:** cạnh `orders → parties` **đã được phép** (`src/architecture.test.ts:32`, `ALLOWED_EDGES.orders` có `"parties"`), và bài kiểm khoá ngoại chỉ đòi khai `integrityEdges` khi cạnh KHÔNG có trong `ALLOWED_EDGES` (`src/architecture.test.ts` khoảng dòng 176-190). Mục `orders` trong `docs/data-dictionary.json` không có danh sách cột. **Chưa chắc:** có thể không cần sửa sổ; lúc thi công chạy `npm test` để xác nhận, nếu sổ có chỗ ghi chú cột thì thêm và chạy `npm run dict`.

## 3. Ba câu hỏi cho chủ dự án

### Câu hỏi A — Có được lập đơn **không gắn** hồ sơ khách không? (mục 2 của yêu cầu)

| Phương án | Được | Mất |
|---|---|---|
| **(a) Được bỏ qua**, đơn hiện nhãn "Chưa gắn hồ sơ khách" | Không chặn việc bán lúc gấp (khách gọi, mất sóng, khách nước ngoài không có số Việt Nam — xem §8); khớp dữ liệu: cột đã được để trống và đơn cũ vẫn trống | Một phần đơn mới vẫn không gắn → lát 2 vẫn phải backfill phần đó |
| (b) Bắt buộc gắn (form chặn nút Lưu) | Mọi đơn mới đều gắn | Luật ở giao diện mà CSDL không giữ được (cột vẫn NULL được) → hai nguồn lệch; khách không có số Việt Nam thì kẹt; thêm thao tác mỗi đơn |
| (c) Bắt buộc, trừ khi tích "Khách không có SĐT Việt Nam" | Gần (b) nhưng có lối thoát có tên | Thêm một ô và một luật; nhân viên dễ tích bừa để đi nhanh |

**Khuyến nghị: (a).** Lý do quyết định: ở lát 1 "đơn không có hồ sơ" đã là trạng thái hợp lệ của dữ liệu (cột NULL được, đơn cũ không backfill). Ép ở giao diện tạo ra một luật mà CSDL không giữ. Việc siết thuộc lát 2 (expand–contract, cần ADR). Nếu muốn đo mức dùng: đếm `booker_party_id IS NULL` trên đơn mới sau vài tuần (§7 thước đo).

### Câu hỏi B — Hồ sơ mới tạo từ form đơn có được gắn vai `CUSTOMER` không, và gắn thế nào? (mục 3)

Hiện trạng: nhân viên bán hàng tạo được hồ sơ (`POST /api/parties` là `"office"`, `src/modules/parties/index.ts:152`) nhưng **không** thêm vai trò được: `POST /api/parties/:id/roles` là `"admin"` (`src/modules/parties/index.ts:225`), khớp ADR-0007 (bảng quyền: "vai trò hồ sơ" chỉ ADMIN). Lưu ý ADR-0001 mục 4: vai trò **không** là cổng chặn chọn người — thiếu vai `CUSTOMER` không làm hỏng gì, chỉ làm bộ lọc "Khách hàng" ở trang Hồ sơ thiếu người.

| Phương án | Được | Mất |
|---|---|---|
| **(a) Route tạo/sửa đơn tự tạo hồ sơ + mở vai `CUSTOMER` trong cùng `db.batch()`** | Một lần bấm Lưu, không để hồ sơ mồ côi khi lưu đơn lỗi; không đổi bảng quyền; có tiền lệ: `staff` đã gọi `newPersonStatements` của `parties` kèm vai `STAFF` (`src/modules/staff/index.ts:102`), và hàm đó ghi cả vai (`src/modules/parties/repository.ts:263-279`) | Vai được mở "ngầm" bởi route không phải của quản trị — đúng một mã `CUSTOMER`, chỉ cho hồ sơ MỚI, ghi nhật ký. Hồ sơ **có sẵn** được chọn thì lát 1 không thêm vai (tránh lỗi trùng khoảng hiệu lực `pty_party_role_open_uq`) |
| (b) Nới `POST /api/parties/:id/roles` cho `office` khi mã là `CUSTOMER` | Dùng lại route có sẵn | Sửa bảng quyền ADR-0007 đã duyệt → cần ADR mới; route có một nhánh quyền theo giá trị đầu vào, dễ sai |
| (c) Không gắn vai ở lát 1 | Đơn giản nhất | Bộ lọc vai "Khách hàng" ở trang Hồ sơ không có ai; "là khách" phải suy từ đơn |

**Khuyến nghị: (a).** Lý do quyết định: không đổi quyền đã duyệt, và tạo hồ sơ + đơn chung một batch là cách duy nhất tránh hồ sơ mồ côi. Giới hạn: `newOrganizationStatements` **không** nhận vai (`src/modules/parties/repository.ts:282-297`), nên ở lát 1 form đơn chỉ **tạo mới** hồ sơ **cá nhân**; đại lý (tổ chức) phải có sẵn trong danh bạ (chọn được, không tạo từ form đơn). Nếu chủ dự án thấy "vai mở ngầm" là không ổn thì (c) là phương án lùi an toàn — không phải (b).

### Câu hỏi C — Đổi khách của đơn **đã xác nhận** được không? (mục 5)

Hiện trạng: `PUT /api/orders/:id` trả `NOT_EDITABLE` khi đơn không còn nháp (`src/modules/orders/index.ts:86`, thông điệp dòng 18); đơn đã xác nhận chỉ sửa được thông tin chuyến qua `PUT /trip` (`index.ts:99-116`). Bảng quyền ADR-0007 chia sửa sau xác nhận làm hai loại: "thông tin vận hành (ngày giờ, đón, check-in, ghi chú)" và "số khách, dịch vụ, tiền" — **người đặt không nằm trong loại nào**.

| Phương án | Được | Mất |
|---|---|---|
| **(a) Khoá: chỉ đổi khi đơn còn nháp** | Không cần cơ chế mới — đúng hành vi hiện tại của tên/SĐT khách; muốn đổi thì huỷ và lập lại như bây giờ | Sai hồ sơ trên đơn đã xác nhận phải huỷ–lập lại |
| (b) Coi là thông tin vận hành (sửa qua đường giống `PUT /trip`) | Linh hoạt | Người đặt quyết định ai trả tiền/ai được liên hệ — không phải chuyện vận hành; mở rộng nghĩa của bảng ADR-0007 → cần ADR |
| (c) Coi như "số khách/dịch vụ/tiền": sửa được kèm lý do + bản ghi trước → sau | Đúng tinh thần ADR-0007 điều 2 | Bản ghi trước → sau chưa tồn tại — thuộc N3 (ADR-0007 điều 2 hứa ADR riêng) |

**Khuyến nghị: (a), và đây là khuyến nghị chắc nhất trong ba câu.** Lát 1 không có cơ chế "lý do + trước → sau" mà ADR-0007 điều 2 đòi cho mọi sửa sau xác nhận; khoá không tốn thêm gì. Khi N3 làm bản ghi thay đổi, xét lại (c).

## 4. Luồng lập/sửa đơn nháp (mục 2 của yêu cầu, phần giao diện)

Ở khối "Khách hàng" của `public/order-form.html:13-16` / `web/order-form.ts` (hiện đọc/ghi 4 ô ở `collect()` dòng 161-164 và `fill()` dòng 283-286):

1. Nhân viên gõ SĐT. Đủ 10 số → gọi `GET /api/parties/lookup?phone=…` (đã có, `"office"`, `src/modules/parties/index.ts:120-125`; chỉ liên hệ đang mở, tối đa 20, trả **cả cá nhân lẫn tổ chức** kèm cờ `active` — `src/modules/parties/repository.ts:72-78`). Chờ ~400 ms sau lần gõ cuối như trang Hồ sơ (`web/parties.ts:111-128`).
2. **Luôn hiện danh sách hồ sơ trùng số** (ADR-0001 mục 8 bắt buộc): mỗi dòng = tên + loại ("cá nhân"/"tổ chức") + nút **"Dùng hồ sơ này"**. Hồ sơ đã ngưng hiện mờ, không chọn được. Kèm nút **"Tạo hồ sơ mới"** và dòng nhắc "cùng một số có thể thuộc nhiều người (người nhà, công ty)".
3. **"Dùng hồ sơ này"**: điền sẵn Tên/SĐT từ hồ sơ; hai ô **vẫn sửa được** (bản chụp của đơn, không ghi ngược vào hồ sơ). Khối hiện "Đã gắn: <tên> · Bỏ gắn".
4. **"Tạo hồ sơ mới"** (chỉ cá nhân — câu hỏi B): dùng Tên + SĐT đang gõ; hồ sơ được tạo **khi bấm Lưu đơn**, cùng batch với đơn.
5. Không bấm gì → đơn lưu không gắn (nếu câu hỏi A chọn (a)).

Dữ liệu gửi lên (`OrderInput`, `src/shared/contracts.ts:187-199`) thêm **một trong hai**: `bookerPartyId: string` (hồ sơ có sẵn) hoặc `newBooker: { fullName, phone }`; vắng cả hai = không gắn. `OrderDto` thêm `bookerPartyId` + `bookerName` (nhãn từ view) để trang đơn (`web/order.ts:169`) hiện "Hồ sơ: <tên>" có liên kết sang trang Hồ sơ. `OrderSummaryDto` là `Pick<OrderDto, …>` (`contracts.ts:154`): hiện nhãn hồ sơ ở danh sách đơn là việc riêng, **không** làm ở lát 1.

## 5. Ranh giới module và kiểm ở máy chủ (mục 4)

- `orders` **đọc** nhãn và cờ `active` qua view công bố `v_pty_party_label` (`migrations/0011_parties.sql:143-149`, cột `id, display_name, party_kind, active, sort_key`) — cùng kiểu `ORDER_SELECT` đang JOIN `v_stf_staff_label` (`src/modules/orders/repository.ts:62`). Không JOIN thẳng `pty_*` (ADR-0002 điều 3).
- `orders` **ghi** hồ sơ mới chỉ qua hàm công khai của `parties`: `newPersonStatements` (đã export, `src/modules/parties/index.ts:22`) trả câu lệnh chưa chạy để gộp vào batch của `createOrder`/`updateDraftOrder`. Nếu chọn (a) ở câu hỏi B, truyền `roles: [{ roleTypeCode: "CUSTOMER", locationId: null, from: hôm nay, to: null }]`. SĐT của hồ sơ mới kiểm bằng `validateContact` của `parties` (chuẩn hoá qua `normalizePhone`, `src/shared/phone.ts:3-8`) — cần export thêm hàm kiểm hoặc một hàm dựng sẵn `newCustomerStatements`; quyết khi viết kế hoạch.
- **Không tin `bookerPartyId` từ trình duyệt:** kiểm dạng id hồ sơ (`PARTY_ID_RE`, `src/modules/parties/rules.ts:10` — id có thể mang tiền tố `pty-` nên không dùng `UUID_RE`; cần export qua `parties/index.ts`), rồi chốt ngay trong câu ghi — `INSERT`/`UPDATE orders` chỉ nhận id khi `EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ? AND active = 1)`, để hồ sơ bị ngưng giữa lúc kiểm và lúc ghi cũng không lọt. Khoá ngoại là lưới cuối. Hồ sơ không tồn tại/đã ngưng → 400 "Hồ sơ khách không còn dùng được, hãy chọn lại."
- Không thêm cạnh phụ thuộc mới; `orders` không import gì thêm ngoài `parties` (đã được phép).
- `POST /api/orders` vẫn `order.create`; `PUT` vẫn `order.modify` + chỉ nháp. Không thêm thao tác vào `src/shared/permissions.ts`.

## 6. Nhật ký (mục 6)

- Gắn/bỏ gắn/đổi hồ sơ trên đơn nháp đi cùng hành động `created`/`updated` đã có (chung batch). **Đề xuất** thêm vào `detail` một mẩu "gắn hồ sơ khách" / "đổi hồ sơ khách" — không cần mã hành động mới.
- Hồ sơ tạo từ form đơn ghi thêm `party_created` (đã có trong `src/shared/audit-actions.ts:36`) như route `POST /api/parties` đang làm: `detail` = loại + tên (`src/modules/parties/index.ts:164-165`). **Không** ghi SĐT/email (CLAUDE.md §5).
- Nếu lúc thi công thấy cần mã hành động riêng thì khai ở `src/shared/audit-actions.ts` theo `docs/CHANGE-GUIDE.md` công thức f.

## 7. Truy vấn trả lời câu 1 "ai đặt" (điều kiện chấp nhận ADR-0001)

ADR-0001 (mục Hệ quả, "Điều kiện chấp nhận") đòi đặc tả của đợt ghi truy vấn cụ thể; truy vấn phải đi bằng khoá ngoại, không phân tích chữ.

```sql
-- Người đặt của một đơn
SELECT o.order_code, p.display_name, p.party_kind
FROM orders o LEFT JOIN v_pty_party_label p ON p.id = o.booker_party_id WHERE o.id = ?;

-- Khách/đại lý này đã đặt mấy đơn (không tính đơn huỷ)
SELECT p.id, p.display_name, count(*) AS so_don
FROM orders o JOIN v_pty_party_label p ON p.id = o.booker_party_id
WHERE o.status <> 'cancelled' GROUP BY p.id ORDER BY so_don DESC;
```

Chỉ đúng với đơn đã gắn (đơn cũ và đơn bỏ qua → lát 2 backfill). Câu 2 và 6 của ADR-0001 thuộc phần N2 khác, không thuộc lát này.

## 8. Giả định và điều chưa chắc

1. **Khách nước ngoài / số không phải Việt Nam:** form đơn nhận SĐT rộng (`PHONE_RE`, `src/modules/orders/rules.ts:39`) nhưng tra cứu và liên hệ hồ sơ chỉ nhận số Việt Nam 10 số (`normalizePhone`; lookup trả 400 — `src/modules/parties/index.ts:121-122`). Với số nước ngoài: giao diện không gọi lookup, không tạo được hồ sơ kèm số → đơn không gắn (hợp với câu hỏi A (a)). Mở rộng chuẩn hoá số quốc tế là việc riêng.
2. **Đơn qua đại lý:** ADR-0001 mục 7 cho `booker_party_id` là tổ chức. Khi đó tên/SĐT trên đơn thường là của khách đi tour chứ không phải đại lý. Giả định lát 1: chọn hồ sơ đại lý thì **không** điền đè Tên/SĐT (nhân viên gõ khách đi tour như cũ); tên khách đi tour thành hồ sơ riêng là `traveller_party_id` — lát sau. **Cần chủ dự án xác nhận.**
3. Giả định bán hàng gõ SĐT trước tên; nếu thói quen ngược lại, lookup vẫn chạy khi ô SĐT đủ số (thứ tự ô không đổi).
4. Lookup trả tối đa 20 hồ sơ; số hotline chung có thể vượt — chấp nhận ở lát 1.
5. Giả định bước thêm (tối đa một lần bấm) chấp nhận được với bán hàng — **chưa hỏi** (Việc tiếp theo, bước 2).

## 9. Kiểm thử (mục 7)

- **Luật thuần** (`src/modules/orders/rules.test.ts`): `validateOrder` nhận `bookerPartyId` đúng dạng / sai dạng; `bookerPartyId` và `newBooker` cùng lúc → lỗi; `newBooker` thiếu tên, SĐT sai.
- **Migration** (`node:sqlite`, mẫu `src/modules/orders/migration.test.ts`, `src/migrations-0017.test.ts`): cột tồn tại, NULL được, khoá ngoại trỏ `pty_party(id)`, có chỉ mục; đơn cũ giữ nguyên; các trigger `orders_*` còn đủ; `PRAGMA foreign_key_check` 0 dòng.
- **e2e** (`tests/e2e/orders.mjs` + `tests/e2e/parties.mjs`): tạo đơn gắn hồ sơ có sẵn; tạo đơn kèm hồ sơ mới (hồ sơ có vai `CUSTOMER` nếu B = (a); lỗi lưu đơn thì không có hồ sơ mồ côi); id hồ sơ lạ/đã ngưng → 400; đổi hồ sơ trên nháp; đơn đã xác nhận → 409 `not_editable`; nhật ký không chứa SĐT.
- **Bẫy thi công:** `createOrder` bind tham số bằng tay theo vị trí (`src/modules/orders/repository.ts:299-311`, `docs/CHANGE-GUIDE.md` a1 bước 4) — thêm cột phải thêm đúng một `?` và một đối số.
- **Chrome:** chạm `web/order-form.ts`, `web/order.ts` → chạy lại ba `a2-smoke-*.mjs` (CLAUDE.md §3). Cuối cùng `npm test`, `npm run typecheck`, `npm run test:e2e` xanh.

## 10. Thước đo trước khi làm (mục 8) — chỉ đọc, cần chủ dự án cho phép

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS don, count(DISTINCT customer_phone) AS so_khac_nhau, count(DISTINCT replace(replace(replace(customer_phone,' ',''),'.',''),'-','')) AS so_khac_nhau_bo_dau FROM orders"
```

Để biết quy mô trùng hôm nay (cột thứ ba bỏ dấu cách/chấm/gạch, gần với chuẩn hoá). Chưa chạy — phiên này không đụng D1 remote.

## 11. Lát 2 — ngoài phạm vi, chỉ nêu (mục 9)

Backfill đơn cũ từ `customer_phone` (đoán theo chữ → cần quy tắc và bước duyệt tay); gộp hồ sơ (`pty_party.merged_into_id`, ADR-0001 mục 8; chưa có cột này); siết bắt buộc `booker_party_id` (dựng lại bảng hoặc trigger); `traveller_party_id`. Đều là **cửa một chiều**, cần ADR riêng trước khi làm.

## 12. Việc tiếp theo

1. ~~Viết đặc tả~~ (bản này).
2. **Chủ dự án** hỏi ý một nhân viên bán hàng về bước thêm khi lập đơn (§4) và về đơn qua đại lý (§8 mục 2); ghi kết quả vào đây.
3. **Chủ dự án** duyệt câu hỏi A, B, C (§3) và cho phép (hoặc không) chạy truy vấn thước đo §10.
4. Sau khi duyệt: viết kế hoạch thi công `docs/superpowers/plans/<ngày>-n2-lat-1-khach-tren-don.md` bằng skill `superpowers:writing-plans` (task TDD, mã đầy đủ); migration lấy số kế tiếp **tại thời điểm đó**.
