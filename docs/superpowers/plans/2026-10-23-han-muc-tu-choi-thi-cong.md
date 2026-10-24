# Hạn mức «Từ chối» của hướng dẫn viên (ADR-0032) — Kế hoạch thi công

> **Vai của tệp:** kế hoạch (người lập kế hoạch, phiên 2026-10-23, worktree `han-muc-ke-hoach` tách từ `origin/main` e309acf3). Không thi công trong phiên này.
> **Quyết định nguồn:** `docs/adr/ADR-0032-han-muc-tu-choi.md` (accepted 23/10, «duyệt hết»); trang ghép `docs/superpowers/specs/2026-10-20-han-muc-tu-choi/ADR-0032-nhap.md` (phần «Trang ghép»); thiết kế gốc `docs/superpowers/specs/2026-09-26-don-tu-do-hdv-nhan-tu-choi-design.md` §9A.
> **Xây trên** kế hoạch nút Từ chối `docs/superpowers/plans/2026-10-20-tu-choi-don-thi-cong.md` (nhánh `tu-choi-han-muc`, CHƯA thi công lúc viết): coi như mã Từ chối sẽ có đúng như mục 3 của kế hoạch đó (lô `[0] đóng dòng → [1] nhật ký`, `refuseStatements`, `tuChoiThang(kq)`, mã lý do `BAN_LICH`/`OM_VIEC_RIENG`/`KHONG_PHU_HOP`/`OTHER` ở `src/shared/ly-do-tu-choi.ts`, route `POST /api/orders/:id/handler-refuse` cổng `orders`, ô `dispatch.refuse`). Mọi chỗ dựa vào giả định đó gom ở **mục 10** — phải kiểm lại khi mã Từ chối thật đã gộp.
> **Việc lớn** (dữ liệu: ba bảng mới + đổi hợp đồng `orders`↔`dispatch`; quyền: route mới sau cổng `admin`/`orders`). Bắt buộc người kiểm độc lập chỉ đọc (CLAUDE.md §3).
> **Mọi số dòng** đọc trên `main` e309acf3 (2026-10-23). Người thi công kiểm lại khi bắt đầu (nhánh Từ chối gộp trước sẽ dời số dòng của `dispatch/index.ts`, `dispatch/service.ts`).

**Xây trên lỗ đang hở: không.** Đối chiếu `docs/quyen-hoan.json` (2026-10-23): `thao_tac` hoãn `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue` — không ô nào bị việc này hỏi hay đổi; `phat_hien` mở (TNV-G1/G3/G4, HC-5.19, HC-5.11, HC-4.2) không chạm tiền/sổ/nhật ký tác vụ tự động. **Lưu ý hạn:** mục hoãn sớm nhất hết hạn **2026-11-05** — nếu thi công kéo qua ngày đó, `npm test` đỏ vì sổ hoãn (không do việc này); báo chủ gia hạn hoặc đóng mục trước.

**Không thêm ô quyền nào** (ADR-0032 trang ghép (2)): dùng `admin.manage` (xem), `settings.ops` (đổi/đặt lại), `dispatch.refuse` (của lượt Từ chối), `dispatch.assign` (bảng chọn người). `src/shared/permissions.ts` không đổi.

---

## 1. Mọi đường mở / đóng dòng phụ trách `HANDLE` trên `main` → sự kiện phải ghi

Cách tìm (đã chạy, chỉ đọc): `grep -rn "dsp_assignment" src scripts migrations tests` + `grep -rln "INSERT INTO dsp_assignment\|UPDATE dsp_assignment" .` + lời gọi `handlerChangeStatements|newOrderHandlerStatements|insertHandler|closeHandlerStatement|cauBaoVeNguoiPhuTrach|newOrderHandler|gopHoSo`. **Câu ghi `dsp_assignment` của mã chạy thật chỉ nằm ở `src/modules/dispatch/repository.ts`** (năm câu `defineSql`); còn lại là migration 0014 (gieo lịch sử), trigger 0044 (chỉ chặn) và tệp `*.test.ts` / kịch bản bằng chứng (chèn thẳng vào D1 tạm — không phải đường sản xuất).

| # | Đường | Câu SQL (tệp:dòng) | Ai gọi (tệp:dòng) | Tác động lên `HANDLE` | Sự kiện phải ghi (cùng lô) |
|---|---|---|---|---|---|
| M1 | Lập đơn có chọn người phụ trách | `INSERT_HANDLER` `dispatch/repository.ts:30` → `insertHandlerStatement` `:81` | `newOrderHandlerStatements` `dispatch/service.ts:42-45` ← `newOrderHandler` `dispatch/index.ts:87-92` ← gốc lắp ráp `src/index.ts:67` ← `ctx.newOrderHandler` `src/shared/router.ts:102,430` ← route `POST /api/orders` `orders/index.ts:1109-1111` → `createOrder` `orders/repository.ts:949`, mảng câu nối ở `:987` | MỞ cho người được chọn | **`ASSIGN`** (người = `to.partyId`, người ghi = người lập). Kể cả khi người lập chọn chính mình (ADR điều 1: «được chọn làm người phụ trách ở mọi đường khác … kể cả lúc lập đơn»). |
| M2 | Đổi người (đơn đang có người) — Giao của văn phòng | `CLOSE_HANDLER` `repository.ts:46-51` (chốt) + `INSERT_HANDLER_AFTER_CLOSE` `:32` | `handlerChangeStatements` nhánh `c.from` `dispatch/service.ts:31` ← route `PUT /api/orders/:id/handler` `dispatch/index.ts:157-210` (ghi ở `:191-201`) | ĐÓNG dòng người cũ + MỞ dòng người mới | **`ASSIGN`** cho người MỚI. Người CŨ: **không ghi** — ADR chỉ có năm loại, «bị gỡ» không phải loại nào (bị văn phòng đổi người không phải Từ chối, không phải Huỷ). |
| M3 | Đơn chưa có người: tự Nhận, hoặc Giao cho người khác | `INSERT_HANDLER_IF_NONE` `repository.ts:34-39` (chốt) | `handlerChangeStatements` nhánh không `from` `service.ts:31` ← cùng route `:157-210`; loại xác định bởi `tuNhan` (`service.ts:18`, tính ở `index.ts:190,197`) | MỞ | **`CLAIM`** khi `tuNhan` (người gọi tự đặt mình — `thayDoiCuaHandler` = `"nhan"`); **`ASSIGN`** khi giao cho người khác. |
| D1 | Từ chối (nhánh `tu-choi-han-muc`, chưa có trên `main`) | `CLOSE_HANDLER` (kế hoạch Từ chối 3a) → nay biến thể mới `CLOSE_HANDLER_SAU_CHOT` | `refuseStatements` (kế hoạch Từ chối 3a) ← route `POST /api/orders/:id/handler-refuse` | ĐÓNG dòng của chính người gọi | **`REFUSE`** — câu **đầu lô**, mang điều kiện hạn mức (mục 3, mục 4d). |
| X1 | HDV tự huỷ đơn | (không câu `dsp_*`) | route `POST /api/orders/:id/handler-cancel` `dispatch/index.ts:218-242` → `cancelOrderByHandler` `orders/index.ts:542-550` → `soanHuyDon` `orders/repository.ts:1102-1117` | **Không đóng** — dòng phụ trách vẫn mở trên đơn đã huỷ | **`ABORT`** (chỉ thống kê, Q-P2) — chỉ khi người gọi ĐANG là người phụ trách (xem mục 4c: Toàn quyền đi được route này mà không phụ trách). |
| K1 | Câu bảo vệ «vẫn là người phụ trách» của lô Đã giao | `GUARD_HANDLER` `repository.ts:95-100` (`updated_at = updated_at`) | `cauBaoVeNguoiPhuTrach` `dispatch/index.ts:98` ← `billing/service.ts:571` | Không mở, không đóng | **Không ghi** — không đổi người phụ trách. |
| K2 | Văn phòng huỷ đơn | (không câu `dsp_*`) | `POST /api/orders/:id/status` `orders/index.ts:1575`, `soanHuyDon` ở `:1594` | Không đóng | **Không ghi** — Q-P «Huỷ của văn phòng, bán hàng không tính»; ADR điều 1 chỉ `ABORT` qua `handler-cancel`. |
| K3 | Gộp hồ sơ (ADR-0068) | `cauDoiDon` = đổi NGƯỜI ĐẶT đơn (`orders`), không đụng `dsp_*` — `parties/index.ts:1863` | gốc lắp ráp chặn gộp khi hồ sơ phụ còn phụ trách đơn chưa xong: `src/index.ts:194-197` (`soDonDangPhuTrachCua` `dispatch/index.ts:101`, `repository.ts:109-117`), lời báo `parties/gop.ts:111` | Không đổi dòng nào | **Không ghi.** Sự kiện cũ của hồ sơ phụ ở lại hồ sơ phụ; hồ sơ phụ không có tài khoản (`dispatch/index.ts:99-100`) nên không tự Từ chối được — không lệch hạn mức. Dòng `HANDLE` trên đơn đã huỷ / đã giao của hồ sơ phụ vẫn ở lại (đã có R-PTY-MERGE-4). |
| K4 | Ngưng tài khoản / đổi quyền / ẩn danh hồ sơ | không câu nào ghi `dsp_assignment` (grep rỗng ở `accounts`, `staff`, `auth`, `parties/xoa-an-danh*`) | — | Không đổi | **Không ghi.** Dòng mở của người đã ngưng do `R-DSP-2a/2b` theo dõi như hôm nay. |
| K5 | Đơn «Đã giao» | trigger `dsp_assignment_delivered_lock_ins/upd` `migrations/0044_orders_da_giao.sql:100-105` | — | Chỉ CHẶN | **Không ghi.** Lô Từ chối / Nhận / Giao trên đơn đã giao bị cả lô quay lại (không sinh sự kiện ma). |
| G1 | Gieo lịch sử lúc dựng phân công | `migrations/0014_dispatch.sql:79-83` | đã chạy một lần | MỞ (lịch sử, mốc = ngày lập đơn) | **Không ghi** — ADR điều 1 «không chép dữ liệu cũ: bộ đếm bắt đầu từ 0». Kiểm định kỳ miễn trừ dòng mở trước mốc phát hành (mục 7). |

**Hệ quả đã biết (an toàn về phía chặt hơn, ADR «Hệ quả»):** đơn HDV đang giữ từ TRƯỚC ngày phát hành không có `CLAIM`/`ASSIGN` nên không làm mốc cắt chuỗi. Vì bộ đếm bắt đầu từ 0 và lần phát hành đầu chạy «Chỉ đo», ảnh hưởng chỉ là: sau hai lần Từ chối đầu tiên, HDV cần một lần nhận/được giao MỚI để chuỗi về 0. Ghi vào hướng dẫn Quản trị.

### 1b. Bài kiểm khoá danh sách (đường mới mở `HANDLE` mà không ghi sự kiện → đỏ)

Tệp mới `src/han-muc-duong-handle.test.ts` (bốn lớp; lớp (e) là lưới lúc chạy):

- **(a) Câu SQL:** quét mã đã che chú thích (`scripts/source-mask-lib.mjs`, giữ chuỗi) của mọi `src/**/*.ts` trừ `*.test.ts`: chuỗi `INSERT INTO dsp_assignment` / `UPDATE dsp_assignment` chỉ được có ở `src/modules/dispatch/repository.ts`, và đúng tập tên `defineSql` = {`insert_handler`, `insert_handler_after_close`, `insert_handler_if_none`, `close_handler`, `close_handler_sau_chot`, `guard_handler`}. Tên mới / tệp mới → đỏ với câu «Đường mới mở/đóng dòng phụ trách phải ghi sự kiện (ADR-0032) — thêm dòng vào bảng mục 1 của kế hoạch rồi sửa bài này».
- **(b) Nơi gọi:** trong `src/modules/**/*.ts` (trừ test), `insertHandlerStatement` / `insertHandlerAfterCloseStatement` / `insertHandlerIfNoneStatement` chỉ được gọi trong thân `handlerChangeStatements` hoặc `newOrderHandlerStatements`; `closeHandlerStatement` (và biến thể sau chốt) chỉ trong `handlerChangeStatements` hoặc `refuseStatements`. Lời gọi ở hàm khác → đỏ.
- **(c) Migration:** chỉ `migrations/0014_dispatch.sql` được chứa `INSERT INTO dsp_assignment`; migration sau này chèn dòng phụ trách → đỏ.
- **(d) Hành vi (SQLite thật, khuôn `dispatch/service.test.ts`):** mỗi nhánh của `handlerChangeStatements` (đổi người; nhận; giao đơn chưa có người) và `newOrderHandlerStatements` → đúng một dòng `dsp_release_event` đúng loại, đúng `party_id`, `occurred_at` = `valid_from_at` của dòng `HANDLE` vừa mở; nhánh thua đua → không dòng nào.
- **(e) Lúc chạy:** kiểm định kỳ `R-DSP-6` (mục 7) — mọi dòng `HANDLE` mở sau mốc phát hành phải có `CLAIM`/`ASSIGN` cùng người, cùng đơn, cùng mốc.
- **Thấy chặn thật (ghi `docs/SO-HANG-RAO.md`):** (1) xoá câu sự kiện khỏi `handlerChangeStatements` → (d) đỏ + `R-DSP-6` đỏ trên D1 local sau e2e; (2) thêm một hàm mới gọi `insertHandlerStatement` → (b) đỏ; (3) thêm `defineSql("dispatch","x", "UPDATE dsp_assignment …")` → (a) đỏ. Hoàn nguyên từng lần.
- Giới hạn (ghi sổ hàng rào): (a)–(c) canh QUÊN, không canh CỐ Ý (chỉ đọc văn bản); (e) là lưới thứ hai.

---

## 2. Migration

### 2a. Số: **`0117`** — tên đề xuất `migrations/0117_han_muc_tu_choi.sql`

Đã kiểm 2026-10-23 (chỉ đọc, sau `git fetch`): `ls migrations` trên `main` e309acf3 = 105 tệp, lớn nhất **`0116_chiet_khau_theo_loai_khach.sql`** (số `0114` trống — nhánh chiết khấu đã đổi `0114` → `0116`, `docs/HANDOFF-N1.md:26`). Mọi ref (`git for-each-ref refs/remotes/origin refs/heads` — 7 ref: `main`, `origin/main`, `han-muc-ke-hoach`, `tu-choi-han-muc`, `origin/claude/clever-hertz-0f1b61`, `origin/worktree-xac-nhan-don`, `origin/worktree-xac-nhan-don-2`) qua `git ls-tree --name-only <ref> migrations/ | comm -23 - <main>`: **không ref nào có migration ngoài `main`**. `git worktree list`: chỉ hai worktree (`han-muc-ke-hoach`, `tu-choi-han-muc`, cùng commit 59c174fc, không migration mới). Nhánh Từ chối: kế hoạch ghi «không migration» (`2026-10-20-tu-choi-don-thi-cong.md:102`).

**Rủi ro trùng số:** kế hoạch Xác nhận đơn trên `origin/worktree-xac-nhan-don-2` (`docs/superpowers/plans/2026-10-19-xac-nhan-don.md:197`) định tạo `0115_yeu_cau_xac_nhan.sql` ở Đợt 2 (chưa viết) — số `0115` đã bị `main` dùng nên Đợt 2 sẽ lấy số kế tiếp, nhiều khả năng cũng là `0117`. Nhánh nào gộp sau đổi số. Để đổi số rẻ: bài kiểm tìm tệp theo **đuôi** `_han_muc_tu_choi.sql` (khuôn `src/migrations-chiet-khau-theo-loai.test.ts:11`), id dòng gieo KHÔNG mang số (`gieo-han-muc`), không chú thích nào trong mã nhắc số `0117`. Kiểm lại bằng đúng hai lệnh trên ngay trước `npm run day-len`.

### 2b. Nội dung (đề xuất — người thi công giữ đúng nghĩa, được đổi chữ chú thích)

```sql
-- Migration 0117 — ADR-0032 (accepted 2026-10-23): bộ đếm sự kiện phân công + hạn mức Từ chối của HDV. Module dispatch (tiền tố dsp_). CHỈ THÊM.
-- Không SĐT / email / tên khách / chữ tự do (Hiến chương 5.12). Không chép dữ liệu cũ (ADR điều 1).

-- (1) Loại sự kiện — bảng tra cứu khoá mã (ADR-0003 điều 1; khuôn dsp_task_kind 0014). Không CHECK liệt kê ở bảng sự kiện.
CREATE TABLE dsp_release_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO dsp_release_kind (code, name, sort_order) VALUES
  ('CLAIM', 'Tự nhận', 1), ('ASSIGN', 'Được giao', 2), ('REFUSE', 'Từ chối', 3), ('ABORT', 'Tự huỷ đơn', 4), ('RESET', 'Đặt lại', 5);

-- (2) Sổ sự kiện — chỉ thêm (Hiến chương 5.5). `seq` = thứ tự chèn TOÀN BẢNG, máy chủ cấp trong CHÍNH câu chèn (max + 1; D1 chạy lô tuần tự, UNIQUE là lưới):
--     luật «sau dòng đó» (ADR điều 3) so theo `seq`, không so mốc giờ (hai lệnh cùng mili-giây vẫn có thứ tự; rowid không dùng vì VACUUM được đánh lại).
CREATE TABLE dsp_release_event (
  id          TEXT PRIMARY KEY,
  seq         INTEGER NOT NULL CHECK (seq >= 1),
  party_id    TEXT NOT NULL REFERENCES pty_party(id),            -- người (hồ sơ) của sự kiện; cạnh dispatch → parties như dsp_assignment
  order_id    TEXT REFERENCES orders(id),                         -- NULL chỉ ở RESET
  kind_code   TEXT NOT NULL REFERENCES dsp_release_kind(code),
  reason_code TEXT CHECK (reason_code IS NULL OR length(reason_code) BETWEEN 1 AND 40),  -- mã lý do Từ chối (src/shared/ly-do-tu-choi.ts — danh sách mở kiểm ở MÃ)
  occurred_at TEXT NOT NULL,                                      -- giờ máy chủ, ISO UTC (toISOString)
  created_at  TEXT NOT NULL,
  created_by  TEXT,                                               -- cột WHO: TEXT NULL, KHÔNG khoá ngoại (ADR-0003 điều 6)
  CONSTRAINT dsp_release_event_order_ck  CHECK ((kind_code = 'RESET') = (order_id IS NULL)),     -- khuôn dsp_assignment_handle_grain_ck
  CONSTRAINT dsp_release_event_reason_ck CHECK ((kind_code = 'REFUSE') = (reason_code IS NOT NULL))
);
CREATE UNIQUE INDEX dsp_release_event_seq_uq        ON dsp_release_event(seq);
CREATE INDEX        dsp_release_event_party_kind_ix ON dsp_release_event(party_id, kind_code, seq);          -- chuỗi: RESET/REFUSE mới nhất, đếm REFUSE sau mốc
CREATE INDEX        dsp_release_event_party_order_ix ON dsp_release_event(party_id, order_id, kind_code, seq); -- «sau CLAIM/ASSIGN của Y có REFUSE/ABORT của Y không»
CREATE INDEX        dsp_release_event_party_at_ix   ON dsp_release_event(party_id, kind_code, occurred_at);  -- đếm tuần
CREATE INDEX        dsp_release_event_order_ix      ON dsp_release_event(order_id, kind_code, seq);           -- bảng chọn người (điều 10)
CREATE TRIGGER dsp_release_event_no_update BEFORE UPDATE ON dsp_release_event
BEGIN SELECT RAISE(ABORT, 'dsp_release_event_append_only: sổ sự kiện phân công chỉ thêm, không sửa'); END;
CREATE TRIGGER dsp_release_event_no_delete BEFORE DELETE ON dsp_release_event
BEGIN SELECT RAISE(ABORT, 'dsp_release_event_append_only: sổ sự kiện phân công không xoá'); END;

-- (3) Cài đặt hạn mức — chỉ thêm, có hiệu lực (Hiến chương 5.2; khuôn vc_dispatch_policy 0041, ord_pickup_slot_policy 0115). Dòng đang dùng = valid_from_at
--     lớn nhất ≤ lúc hỏi. Ba chế độ là danh sách ĐÓNG gắn với mã (khuôn vc_departure_rule.subject) — CHECK được.
CREATE TABLE dsp_refuse_policy (
  id              TEXT PRIMARY KEY,
  mode            TEXT NOT NULL CHECK (mode IN ('OFF', 'MEASURE', 'BLOCK')),
  max_consecutive INTEGER NOT NULL CHECK (max_consecutive BETWEEN 1 AND 10),
  max_per_week    INTEGER NOT NULL CHECK (max_per_week BETWEEN 1 AND 100),
  valid_from_at   TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL,
  created_by      TEXT
);
-- Gieo «Chỉ đo» 2/15 (ADR điều 6). created_at của dòng gieo = MỐC PHÁT HÀNH mà kiểm định kỳ R-DSP-5/6 dùng để miễn trừ dòng phụ trách mở trước đó.
INSERT INTO dsp_refuse_policy (id, mode, max_consecutive, max_per_week, valid_from_at, created_at, created_by)
VALUES ('gieo-han-muc', 'MEASURE', 2, 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), NULL);
CREATE TRIGGER dsp_refuse_policy_no_update BEFORE UPDATE ON dsp_refuse_policy
BEGIN SELECT RAISE(ABORT, 'dsp_policy_append_only: cài đặt hạn mức Từ chối chỉ thêm dòng mới, không sửa'); END;
CREATE TRIGGER dsp_refuse_policy_no_delete BEFORE DELETE ON dsp_refuse_policy
BEGIN SELECT RAISE(ABORT, 'dsp_policy_append_only: cài đặt hạn mức Từ chối không xoá'); END;
```

Ghi chú thiết kế (để người kiểm đối chiếu ADR):
- Cột đúng ADR điều 1 (người, đơn, loại, lúc, người ghi, mã lý do) + `seq` (cột kỹ thuật cho thứ tự — mục 3a) + `created_at` (ADR-0003). WHO không khoá ngoại.
- Không trigger đọc bộ quyền (lệch có chủ ý 5.1 của ADR điều 5 — ghi `docs/SYSTEM-DESIGN.md` §16, Task H12).
- Không cột `updated_*` (bảng chỉ thêm, khuôn `ord_pickup_slot_policy` có `updated_*` vì khuôn cũ — ở đây bỏ vì trigger cấm sửa; người kiểm xác nhận `architecture.test.ts`/`hang-du-lieu.test.ts` không đòi `updated_*`; nếu đòi thì thêm hai cột hằng = `created_*`).

### 2c. Từ điển dữ liệu

- `docs/data-dictionary.json`: ba mục `tables` (`module: "dispatch"`, `kind: "table"`, `note` nêu ADR-0032, chỉ-thêm, mốc gieo); `hangDuLieu` cho **mọi cột** của ba bảng — tất cả **N1** (khoá, mã, mốc giờ; `party_id` là khoá hồ sơ như `dsp_assignment.party_id` — đối chiếu hạng đang ghi của cột đó, dùng cùng hạng); `integrityEdges` theo khuôn các khoá ngoại `dsp_assignment` nếu tệp có liệt kê cạnh khoá ngoại.
- `npm run dict` → `docs/DATA-DICTIONARY.md`. Bài phải xanh: `src/hang-du-lieu.test.ts` (cột mới chưa có hạng ⇒ đỏ — đây là lần «thấy chặn» miễn phí), `src/architecture.test.ts` (tiền tố `dsp_` → `dispatch`, `TABLE_PREFIX` `:207`).
- `docs/SYSTEM-DESIGN.md` §5 (bảng dữ liệu) thêm ba bảng.

### 2d. Bài kiểm migration — `src/migrations-han-muc-tu-choi.test.ts` (khuôn `src/migrations-chiet-khau-theo-loai.test.ts`)

Áp mọi `migrations/*.sql` lên `DatabaseSync(":memory:")` (khoá ngoại tắt khi áp, bật sau), gieo một hồ sơ + tài khoản + đơn. Mỗi ràng buộc một ca đỏ và một ca xanh:
1. Đúng một tệp `*_han_muc_tu_choi.sql`; ba bảng + năm chỉ mục + bốn trigger tồn tại.
2. `dsp_release_kind` đúng năm mã, đúng thứ tự `sort_order`.
3. `dsp_refuse_policy` có đúng một dòng `gieo-han-muc` = `MEASURE`/2/15.
4. `UPDATE`/`DELETE` `dsp_release_event` → ném `dsp_release_event_append_only`; `UPDATE`/`DELETE` `dsp_refuse_policy` → ném `dsp_policy_append_only` (**tiêu chí ADR 11** — đỏ-xanh: bỏ trigger trong bản sao chuỗi migration của bài → ca đỏ thành xanh giả, ghi sổ hàng rào).
5. `RESET` có `order_id` → CHECK chặn; `REFUSE` thiếu `order_id` → chặn; `REFUSE` thiếu `reason_code` → chặn; `CLAIM` có `reason_code` → chặn; `kind_code = 'XYZ'` → khoá ngoại chặn; `seq` trùng → UNIQUE chặn.
6. `mode = 'ON'` → chặn; `max_consecutive` 0 / 11 → chặn; `max_per_week` 0 / 101 → chặn; `valid_from_at` trùng → chặn.
- **Lệnh:** `node --test src/migrations-han-muc-tu-choi.test.ts src/hang-du-lieu.test.ts src/architecture.test.ts`.

---

## 3. Luật thuần (chuỗi + tuần) và câu SQL cùng luật

### 3a. Thứ tự và định nghĩa (một nguồn cho cả hai bản)

- Thứ tự sự kiện = `seq` tăng dần (mục 2b). «Sau dòng e» ⇔ `seq > e.seq`.
- Với người P đang Từ chối đơn X:
  - `mocReset` = `seq` lớn nhất của `RESET` của P (0 nếu không có).
  - `mocGiu` = `seq` lớn nhất trong các dòng `CLAIM`/`ASSIGN` của P cho đơn Y ≠ X mà **không** tồn tại dòng `REFUSE`/`ABORT` của P cho Y có `seq` lớn hơn (0 nếu không có).
  - `moc` = max(`mocReset`, `mocGiu`).
  - **`chuoi`** = số dòng `REFUSE` của P có `seq > moc` (kể cả `REFUSE` cũ trên chính X).
  - **`tuan`** = số dòng `REFUSE` của P có `occurred_at ≥ dauTuan` **và** `seq > mocReset` (ADR điều 4: «kể từ `RESET` gần nhất nếu `RESET` nằm trong tuần» — `RESET` cũ hơn đầu tuần tự không cắt gì thêm).
  - **Chặn** ⇔ chế độ `BLOCK` **và** P thuộc nhóm bị giới hạn (ADR điều 2) **và** (`chuoi ≥ max_consecutive` **hoặc** `tuan ≥ max_per_week`).
  - «Lẽ ra bị chặn» (chế độ `MEASURE`) ⇔ cùng vế số như trên, bỏ vế chế độ.
- **Nhóm bị giới hạn** (ADR điều 2): bộ quyền ĐANG hiệu lực lúc bấm có `FIELD` và không có `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN`. Đây là câu hỏi DANH TÍNH (dùng `hasPermission`/mảng quyền, đúng luật `web/CLAUDE.md` mục «Ẩn/hiện phải hỏi bảng quyền»), không phải ô của `MATRIX`.
- **Ranh giới tuần giờ VN → UTC:** `dauTuanIso(now)` = `vnLocalToIso(\`${vnWeekRange(vnToday(now)).from}T00:00\`)` (`src/shared/vn-date.ts:7,30,71`) — tức **Chủ nhật 17:00:00.000Z** của tuần trước theo UTC. So chuỗi được vì mọi `occurred_at` cùng khuôn `toISOString()` (24 ký tự, `Z`). Không cần mốc cuối tuần (sự kiện tương lai không có).

### 3b. Tệp thuần — `src/shared/han-muc-tu-choi.ts` (import kèm đuôi `.ts`; dùng ở máy chủ + giao diện)

- `export type LoaiSuKien = "CLAIM" | "ASSIGN" | "REFUSE" | "ABORT" | "RESET"`.
- `export interface SuKien { seq: number; loai: LoaiSuKien; orderId: string | null; at: string }`.
- `demTuChoi(suKien: readonly SuKien[], orderX: string | null, dauTuan: string): { chuoi: number; tuan: number }` — đúng định nghĩa 3a (orderX null = không loại đơn nào, dùng cho bảng tổng của văn phòng).
- `dauTuanIso(now: Date): string`.
- `biGioiHanTuChoi(permissions: readonly PermissionCode[]): boolean` — ADR điều 2.
- `export type CheDo = "OFF" | "MEASURE" | "BLOCK"`; `quyetDinhHanMuc(cs: { cheDo; lienTiep; moiTuan }, dem, biGioiHan): "cho" | "chan" | "do_vuot"` (`do_vuot` = chế độ «Chỉ đo» và lẽ ra bị chặn).
- `conLai(cs, dem, biGioiHan): { lienTiep: number; tuan: number } | null` — null khi không phải `BLOCK` hoặc không bị giới hạn (ADR điều 9); số không âm.
- `docCaiDat(body): { ok: true; cs } | { ok: false; loi: string }` — `{ cheDo, lienTiep, moiTuan }` đúng kiểu, đúng khoảng 1–10 / 1–100, không khoá lạ; câu lỗi tiếng Việt.
- `NHAN_CHE_DO: Record<CheDo, string>` = «Tắt» / «Chỉ đo» / «Chặn»; `cauConLai(n, m)` = «Bạn còn được từ chối N đơn liên tiếp, M lần trong tuần này»; `CAU_HET_LUOT` = «Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.» (nguyên văn ADR điều 5).
- **Bài `src/shared/han-muc-tu-choi.test.ts` — đỏ trước** (ví dụ của ADR điều 3 + đặc tả §9A mục 2, mỗi ví dụ một ca, dữ liệu ở bộ ca chung 3d):
  1. nhận A–từ chối A, nhận B–từ chối B, nhận C → `chuoi(C)` = 2 → **chặn**.
  2. … có K nhận và giữ nằm giữa (A, K, B) → `chuoi(C)` = 1 → được.
  3. đã từ chối 2, được Giao Y và giữ → `chuoi(Z)` = 0.
  4. đã từ chối 2, được Giao Y rồi từ chối Y → `chuoi` = 3 khi từ chối đơn tiếp theo; khi đang từ chối CHÍNH Y: `ASSIGN` của Y không là mốc → `chuoi(Y)` = 2 → chặn.
  5. đệm K rồi Huỷ K (`ABORT`) → K mất tư cách mốc → chặn.
  6. `RESET` sau hai lần → `chuoi` = 0 và `tuan` chỉ đếm sau `RESET`.
  7. Tuần: 15 lần trong tuần (xen đủ đơn giữ) → lần 16 chặn; cùng dữ liệu với `dauTuan` của thứ Hai tuần sau → `tuan` = 0.
  8. Ranh giới: sự kiện lúc `…T16:59:59.999Z` Chủ nhật (= 23:59:59.999 giờ VN) thuộc tuần cũ; `…T17:00:00.000Z` thuộc tuần mới. `dauTuanIso` cho thứ Hai 00:30 giờ VN, Chủ nhật 23:59 giờ VN, và đúng lúc giao tuần.
  9. Ba chế độ × có/không bị giới hạn → `quyetDinhHanMuc`; `biGioiHanTuChoi` trên 1024 tập con của 10 mã quyền: đúng khi và chỉ khi có `FIELD` và không có bốn mã văn phòng.
  10. `docCaiDat`: biên 1/10/100, 0/11/101, kiểu sai, khoá lạ → lỗi.
- **Thấy chặn thật:** đổi `f.seq > c.seq` thành `≥` (hoặc bỏ vế «Y ≠ X») → ca 4 hoặc 5 đỏ → hoàn nguyên.

### 3c. Câu SQL — `src/modules/dispatch/han-muc-repo.ts` (tệp mới, nửa nghiêm: `defineSql`, đăng ký vào danh sách tệp SQL của `src/architecture.test.ts:87` cạnh `dispatch/repository.ts`)

Hai mảnh SQL dựng MỘT lần lúc nạp tệp (chuỗi tĩnh — `sql-registry.ts:3`), tham số đánh số cố định: `?1` = hồ sơ P, `?2` = đơn X (`''` = không loại đơn nào), `?3` = `dauTuan`, `?4` = lúc lệnh.

```sql
-- CHUOI(P, X)
(SELECT count(*) FROM dsp_release_event r
  WHERE r.party_id = ?1 AND r.kind_code = 'REFUSE'
    AND r.seq > max(
      coalesce((SELECT max(t.seq) FROM dsp_release_event t WHERE t.party_id = ?1 AND t.kind_code = 'RESET'), 0),
      coalesce((SELECT max(c.seq) FROM dsp_release_event c
                 WHERE c.party_id = ?1 AND c.kind_code IN ('CLAIM', 'ASSIGN') AND c.order_id <> ?2
                   AND NOT EXISTS (SELECT 1 FROM dsp_release_event f
                                    WHERE f.party_id = ?1 AND f.order_id = c.order_id AND f.kind_code IN ('REFUSE', 'ABORT') AND f.seq > c.seq)), 0)))
-- TUAN(P, W)
(SELECT count(*) FROM dsp_release_event r
  WHERE r.party_id = ?1 AND r.kind_code = 'REFUSE' AND r.occurred_at >= ?3
    AND r.seq > coalesce((SELECT max(t.seq) FROM dsp_release_event t WHERE t.party_id = ?1 AND t.kind_code = 'RESET'), 0))
-- CS(lúc)
(SELECT mode, max_consecutive AS mc, max_per_week AS mw FROM dsp_refuse_policy WHERE valid_from_at <= ?4 ORDER BY valid_from_at DESC LIMIT 1)
```

Câu dùng (mỗi câu một `defineSql`):
- `dem_tu_choi` (đọc): `SELECT p.mode, p.mc, p.mw, <CHUOI> AS chuoi, <TUAN> AS tuan FROM <CS> p` — 0 dòng ⇒ chưa có cài đặt.
- `chen_tu_choi` (**câu đầu lô Từ chối**): `?5` id, `?6` mã lý do, `?7` người ghi, `?8` bị giới hạn (0/1):
  ```sql
  INSERT INTO dsp_release_event (id, seq, party_id, order_id, kind_code, reason_code, occurred_at, created_at, created_by)
  SELECT ?5, (SELECT coalesce(max(seq), 0) + 1 FROM dsp_release_event), ?1, ?2, 'REFUSE', ?6, ?4, ?4, ?7
  FROM <CS> p
  WHERE EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ?2 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?1)
    AND NOT (?8 = 1 AND p.mode = 'BLOCK' AND (<CHUOI> >= p.mc OR <TUAN> >= p.mw))
  ```
  (vế (a) hạn mức + vế (b) «đang có dòng phụ trách mở» của ADR điều 5; không có dòng cài đặt ⇒ không chèn.)
- `chen_su_kien_sau` (CLAIM/ASSIGN/ABORT, `?1` id, `?2` hồ sơ, `?3` đơn, `?4` loại, `?5` lúc, `?6` người ghi):
  `INSERT … SELECT ?1, (SELECT coalesce(max(seq),0)+1 …), ?2, ?3, ?4, NULL, ?5, ?5, ?6 WHERE changes() > 0` — **chỉ đúng khi đứng NGAY SAU câu nhật ký `changes() > 0` của lô** (CHANGE-GUIDE công thức f).
- `chen_abort_sau` = như trên + `AND EXISTS (SELECT 1 FROM dsp_assignment WHERE order_id = ?3 AND task_kind_code = 'HANDLE' AND valid_to_at IS NULL AND party_id = ?2)` (mục 4c).
- `chen_reset` (`?1` id, `?2` hồ sơ, `?3` lúc, `?4` người ghi): chèn thường.
- `dem_theo_nguoi` (bảng của văn phòng): cùng hai mảnh nhưng hồ sơ = `j.value` của `json_each(?1)` (dựng bằng một hàm sinh chuỗi `manh(p, x)` gọi hai lần lúc nạp tệp — vẫn tĩnh), thêm `huy_tuan` (đếm `ABORT` trong tuần, KHÔNG cắt bởi `RESET` — `RESET` chỉ thuộc hạn mức), `tu_choi_cuoi_luc`, `tu_choi_cuoi_ly_do`.
- `tu_choi_cua_don` (điều 10): `SELECT party_id, occurred_at, reason_code FROM dsp_release_event WHERE order_id = ?1 AND kind_code = 'REFUSE' ORDER BY seq DESC` → lấy dòng mới nhất mỗi người ở mã.
- `chen_cai_dat`, `cai_dat_hien_hanh` (khuôn `slotPolicy`/`slotPolicyInsert` của `orders`).
- `CLOSE_HANDLER_SAU_CHOT` (đặt ở `dispatch/repository.ts` cạnh `CLOSE_HANDLER` — kế hoạch Từ chối 3b): `CLOSE_HANDLER` + `AND changes() > 0`. **Không sửa** `CLOSE_HANDLER` (câu chốt của đổi người).

### 3d. Bảo đảm bản thuần và bản SQL không lệch

1. **Bộ ca chung** `src/shared/han-muc-tu-choi-ca.ts` (chỉ dữ liệu, không logic): mỗi ca = danh sách sự kiện theo thứ tự + X + `dauTuan` + kết quả mong đợi `{ chuoi, tuan }`. Ca 1–8 của 3b nằm ở đây.
2. `src/shared/han-muc-tu-choi.test.ts` chạy `demTuChoi` trên bộ ca.
3. **Bài song sinh** `src/modules/dispatch/han-muc-sql.test.ts` (SQLite thật, schema từ mọi migration, khuôn gói esbuild của `dispatch/service.test.ts:12-29`): với MỖI ca, chèn đúng các sự kiện (seq theo thứ tự), chạy `dem_tu_choi` và `dem_theo_nguoi` → so với kết quả mong đợi; rồi chạy `chen_tu_choi` với `BLOCK`/2/15 (dòng `HANDLE` mở của P trên X được gieo) → chèn ⇔ `quyetDinhHanMuc(...) !== "chan"`.
4. **Ngẫu nhiên có hạt cố định** (cùng tệp): 500 chuỗi sự kiện sinh bằng PRNG hạt cố định (3 người × 6 đơn × 5 loại, mốc giờ trải hai tuần) → `demTuChoi` == `dem_tu_choi` cho mọi (P, X); in hạt + chuỗi khi lệch.
5. **Kế hoạch truy vấn:** `EXPLAIN QUERY PLAN` của `dem_tu_choi` và `chen_tu_choi` không có `SCAN dsp_release_event` (chỉ `SEARCH … USING INDEX`) — bảng sẽ lớn dần, không bao giờ xoá.
- **Thấy chặn thật:** sửa mảnh `CHUOI` (`f.seq > c.seq` → `f.seq >= c.seq`) → bài song sinh đỏ ở ca 4/5 và ở chuỗi ngẫu nhiên → hoàn nguyên.

---

## 4. Hợp đồng `orders` ↔ `dispatch` và thứ tự từng lô

Nguyên tắc: `dispatch` dựng câu CHƯA chạy, module kia đặt vào lô (Hiến chương 5.3; `src/CLAUDE.md` «Ranh giới module»). `orders` vẫn KHÔNG import `dispatch` (`src/CLAUDE.md:16`) — câu tới qua `ctx` (lập đơn) hoặc qua tham số do route của `dispatch` truyền (huỷ). Không cạnh phụ thuộc mới: `dispatch` → `orders`, `parties`, `staff`, `audit` đã khai (`src/architecture.test.ts:41`).

### 4a. Lập đơn có người phụ trách (M1) — **không đổi chữ ký**, chỉ mảng câu dài thêm

`newOrderHandlerStatements` (`dispatch/service.ts:42-45`) trả `[INSERT_HANDLER, nhật ký order_handler_changed changes()>0, sự kiện ASSIGN changes()>0]`. `createOrder` chỉ trải mảng sau dòng `created` (`orders/repository.ts:987`), không đọc chỉ số câu nào của phần này ⇒ hợp đồng `NewOrderHandler` (`src/shared/router.ts:52`) giữ nguyên. Mốc: `at` của chính lần thử (`createOrder` gọi lại khi trùng mã — id sự kiện sinh mỗi lần gọi như `newRow`, `service.ts:47`). Chú thích `router.ts:96-102` và `dispatch/index.ts:79-86` thêm «và dòng sự kiện `ASSIGN` (ADR-0032)».
- Thứ tự toàn lô: `[booker.before…, INSERT orders, dịch vụ…, chặng…, hành khách…, nhật ký created, INSERT_HANDLER, nhật ký changes()>0, ASSIGN changes()>0]`.
- Kiểm: `grep -rn "statements(" src/modules/orders/don-moi-chon-hdv.test.ts src/modules/dispatch/*.test.ts` — bài nào đếm đúng 2 câu thì sửa kỳ vọng (đã thấy `don-moi-chon-hdv.test.ts:84` chỉ đếm dòng phân công — không đổi).

### 4b. Nhận / Giao (M2, M3) — `handlerChangeStatements` (`dispatch/service.ts:28-32`)

- Đổi người: `[CLOSE_HANDLER (chốt), INSERT_HANDLER_AFTER_CLOSE, nhật ký changes()>0, ASSIGN(to) changes()>0]`.
- Chưa có người: `[INSERT_HANDLER_IF_NONE (chốt), nhật ký changes()>0, CLAIM|ASSIGN(to) changes()>0]` (loại theo `c.tuNhan`).
- Câu sự kiện ở **cuối** lô ⇒ chỉ số câu chốt không đổi; route vẫn đọc `results[0]` (`dispatch/index.ts:206`). `changes()` của câu sự kiện nói về câu nhật ký ngay trước (nhật ký luôn chèn 1 dòng khi chạy; dòng do trigger phụ không tính vào `changes()`).
- Mốc sự kiện = `c.at` = `valid_from_at` của dòng mở (R-DSP-6 dựa vào đẳng thức này).

### 4c. HDV huỷ (X1) — **đổi chữ ký `cancelOrderByHandler`** (ADR-0007 đ4(b))

- `orders/index.ts:542`: thêm tham số `cauSauHuy: readonly D1PreparedStatement[]` **đứng TRƯỚC `noiChuyen`**. Lý do vị trí: bài NT-6 `src/dong-bo-chuyen-guard.test.ts:107-119` tìm chuỗi `noiChuyen: NoiChuyen` rồi dấu `)` kế tiếp để lấy thân hàm — tham số đặt sau `noiChuyen` mà kiểu có ngoặc (vd hàm `(at) => …`) sẽ làm bài này bắt sai thân. Kiểu mảng (không ngoặc tròn) và đặt trước là an toàn.
- Thân: `const huy = soanHuyDon(…); const cauDon = [...huy.cau, ...cauSauHuy];` rồi truyền `cauDon` cho `noiChuyen` (thay `huy.cau`, `:548`). `daHuy` vẫn đọc `kq[1]` (`orders/repository.ts:1119`); máy đồng bộ chuyến tự lấy `soCauDon = cauDon.length` (`van-chuyen/dong-bo-don.ts:30-32,81-85`, `src/shared/dong-bo-chuyen.ts:374-376`) và cổng khúc chuyến hỏi theo `auditIdDon` (`van-chuyen/dieu-phoi.ts:585-611`), không theo `changes()` ⇒ nối thêm câu trước khúc chuyến không đổi nghĩa khúc chuyến.
- Lô: `[dòng lý do huỷ, đổi trạng thái (thắng = kq[1]), nhật ký order_cancelled_by_field changes()>0, ABORT changes()>0 AND EXISTS dòng HANDLE mở của người gọi, …khúc chuyến]`.
- Route `handler-cancel` (`dispatch/index.ts:218-242`): dựng `cauSauHuy = assigned && staff.partyId ? [abortStatement(db, { partyId: staff.partyId, orderId, at: new Date().toISOString(), actorId: staff.id })] : []`. **Vì sao cần cả `assigned` lẫn `EXISTS`:** ô `order.cancel` của Toàn quyền là `any` nên Toàn quyền KHÔNG phụ trách vẫn đi được route này (`index.ts:223`) — không có `ABORT` cho người không giữ đơn (ADR điều 1: «người phụ trách tự Huỷ»); `EXISTS` chặn thêm ca đổi người giữa lúc đọc và ghi.
- Kiểm: `src/dong-bo-chuyen-guard.test.ts` (NT-6), `src/shared/bang-su-kien-van-chuyen.ts:294` (dòng mô tả `cancelOrderByHandler`), `src/modules/van-chuyen/dong-bo-chuyen-route.test.ts`, `src/dong-bo-chuyen-ghep.test.ts` — chạy lại; bài nào đếm số câu đơn của lô huỷ HDV = 3 thì sửa thành 4.

### 4d. Từ chối (D1) — lô của nhánh Từ chối, ADR-0032 chen câu đầu

`refuseStatements(db, { orderId, partyId, actorId, at, lyDo, dauTuan, biGioiHan })`:

| Chỉ số | Câu | Vai |
|---|---|---|
| [0] **mới** | `chen_tu_choi` (3c) | **Câu chốt** — chèn ⇔ đang phụ trách VÀ (không chặn hạn mức) |
| [1] | `CLOSE_HANDLER_SAU_CHOT` (`CLOSE_HANDLER` + `AND changes() > 0`) | đóng dòng của người gọi |
| [2] | nhật ký `order_handler_refused` `changes() > 0` (không đổi) | |

`tuChoiThang(kq)` đổi sang đọc `kq[1]` (kế hoạch Từ chối 3b). Route không đọc chỉ số câu nào. Bài «khuôn cho ADR-0032» của nhánh Từ chối (`service.test.ts`, kế hoạch Từ chối 3b cuối) được thay bằng bài thật.

### 4e. Lô khác

- Đặt lại: `[RESET(P1), RESET(P2)…, nhật ký refuse_counter_reset]` (một lô; tất cả hoặc không).
- Cài đặt: `[chen_cai_dat, nhật ký refuse_policy_changed]`; UNIQUE `valid_from_at` → 409 `stale` (khuôn `orders/index.ts:838-856`).
- Nhật ký chạm hạn mức: **lô riêng một câu** sau khi đã biết lý do (ADR điều 5).

### 4f. Bài kiến trúc

`src/architecture.test.ts` phải xanh không đổi `ALLOWED_EDGES`: (1) `orders` không import `dispatch` (câu tới qua tham số / `ctx`); (2) chỉ `dispatch` ghi `dsp_*` (EXPLAIN trên câu đăng ký — câu `ABORT` đăng ký dưới `dispatch` dù chạy trong lô của `orders`); (3) `dispatch` không đọc `audit_log` (sổ sự kiện là nguồn của điều 10 — đúng ADR); (4) tệp `han-muc-repo.ts` có trong danh sách tệp SQL nghiêm (`:87`). `grep -rn "dsp_release\|v_dsp_" src/modules/orders` phải rỗng.

---

## 5. Route, nhật ký, xếp loại lịch sử rút gọn

### 5a. Route mới (đều ở module `dispatch`, `src/modules/dispatch/index.ts`; DTO ở `src/shared/contracts.ts`)

| Route | Cổng | Kiểm trong thân (theo thứ tự) | Trả |
|---|---|---|---|
| `GET /api/dispatch/han-muc-tu-choi` | `admin` | `if (!can(staff, "admin.manage")) return 403` (nguyên văn cấp thân — luật (4) `src/route-write-guard.test.ts:103`) | `{ caiDat: { cheDo, lienTiep, moiTuan, tuLuc } \| null, doiDuoc: can(staff,"settings.ops"), nguoi: [{ partyId, ten, biGioiHan, tuChoiTuan, huyTuan, chuoi, tuChoiCuoi: { luc, lyDo } \| null }] }`. Danh sách = tài khoản **đang hoạt động có quyền `FIELD`** (`listStaffAccounts`, đã import `index.ts:11`), sắp theo tên. Không SĐT, không tên khách, không mã đơn. |
| `POST /api/dispatch/han-muc-tu-choi/chinh-sach` | `admin` | `if (!can(staff, "settings.ops")) return 403` → `docCaiDat` lỗi → 400 `invalid_input` → chèn (`valid_from_at` = max(lúc ghi, mới nhất + 1 ms)) | 200 bản mới; UNIQUE → 409 `stale` |
| `POST /api/dispatch/han-muc-tu-choi/dat-lai` | `admin` | `if (!can(staff, "settings.ops")) return 403` → thân đúng MỘT trong `{ partyId }` / `{ tatCa: true }` (khác → 400) → `partyId` không thuộc danh sách trên → 404 `not_found` «Không tìm thấy hướng dẫn viên.» | 200 `{ soNguoi }` |
| `GET /api/orders/:id/han-muc-tu-choi` («còn N lần», ADR điều 9) | `orders` | `if (!can(staff, "dispatch.refuse", { assigned: true })) return 403` (sàng sớm — Kế toán, Đối tác, Thực tập) → id sai dạng → 404 → `findHandlerOf` ≠ người gọi → 403 (cùng chốt «chỉ người đang phụ trách» của route Từ chối) | `{ conLai: { lienTiep, tuan } \| null }` — null khi chế độ ≠ «Chặn» hoặc người gọi không bị giới hạn. Không trả số của người khác. |
| `GET /api/orders/:id/tu-choi-truoc` (bảng chọn người, ADR điều 10) | `orders` | id → 404; `findOrderOwner` không có → 404; `if (!can(staff, "dispatch.assign", { ownerId: order.staffId, assigned }))` → 403 — ĐÚNG điều kiện mở bảng chọn người ở giao diện (`handlerControls`, `src/shared/handler-view.ts:51`) | `{ tuChoi: { [partyId]: { luc, lyDo } } }` — lần Từ chối mới nhất CỦA ĐƠN NÀY mỗi người. Nguồn `dsp_release_event`, KHÔNG `audit_log`. |

**Ai gọi được «còn N lần»?** Chỉ người đang phụ trách chính đơn đó và có `dispatch.refuse` (`assigned`): HDV, Bán hàng, Quản trị đang phụ trách; Toàn quyền đang phụ trách. Người không bị giới hạn nhận `conLai: null` (giao diện không hiện dòng). Không ai đọc được số của người khác qua route này.

**Route Từ chối (nhánh Từ chối, kế hoạch Từ chối T4 bước 1–12) — chèn thêm:**
- Bước **9b** (sau đọc lý do hợp lệ, trước lô): đọc `dem_tu_choi(P = staff.partyId, X = orderId, dauTuan, now)`. 0 dòng → **503 `refuse_policy_missing`** «Chưa có cài đặt hạn mức Từ chối — báo Toàn quyền.» (khuôn «thiếu → chặn, không đoán» của mốc 6 giờ; không xảy ra khi migration còn nguyên). `quyetDinhHanMuc` = `chan` → **lô riêng** nhật ký `refuse_limit_hit` → **409 `refuse_limit`** + `CAU_HET_LUOT`.
- Bước 10: lô 4d. Câu đầu không chèn (`kq[0]` = 0): đọc lại `findHandlerOf` + `dem_tu_choi`; còn là người phụ trách VÀ `chan` → lô riêng `refuse_limit_hit` → 409 `refuse_limit` (ca «hết lượt giữa lúc đọc và lúc ghi»); còn lại → 409 `stale`.
- Sau thắng: nếu bước 9b ra `do_vuot` (chế độ «Chỉ đo») → lô riêng `refuse_limit_hit` cờ «chỉ đo», RỒI `baoThayDoi`, RỒI `return json`. **Bẫy `src/bang-tin-guard.test.ts` (luật (1), `:6-8`):** `baoThayDoi(` phải đứng sau `return` áp chót và trước `return` cuối — mọi `return` 409/503 thêm vào phải đứng TRƯỚC; lời ghi nhật ký «chỉ đo» không có `return`.
- `biGioiHan` = `biGioiHanTuChoi(staff.permissions)` (bộ quyền của phiên — ADR điều 2 «đang hiệu lực lúc bấm»).

### 5b. Nhật ký (`src/shared/audit-actions.ts`)

| Hành động | Nhãn | Nhóm | `order_id` / đích | `detail` (không tên, không SĐT) |
|---|---|---|---|---|
| `refuse_limit_hit` | «Chạm hạn mức Từ chối» | `order` | đơn đang Từ chối | «Liên tiếp 2/2 · tuần 5/15 · Chặn» hoặc «… · Chỉ đo (không chặn)» |
| `refuse_policy_changed` | «Đổi hạn mức Từ chối» | `system` | không đơn, `targetType: "system"` | «Chế độ: Chỉ đo → Chặn; liên tiếp 2 → 3; mỗi tuần 15 → 15» (trước → sau, ADR điều 7) |
| `refuse_counter_reset` | «Đặt lại số lần Từ chối» | `staff` | `targetType: "party"`, `targetId` = hồ sơ (một người) / không đích (tất cả) | «Đặt lại cho một hướng dẫn viên» / «Đặt lại cho tất cả (N người)». Tên người được đặt lại KHÔNG chép vào `detail`: đích là mã hồ sơ, trang Nhật ký (chỉ Toàn quyền) dựng nhãn từ đích như các dòng `party` khác (khuôn ADR-0131; giữ `detail` sạch tên) |

**Xếp loại lớp rút gọn (ADR-0131 — hàng rào typecheck `_phanLoaiNoiBoDay` `src/shared/lich-su-noi-bo.ts:9-13`, `_phanLoaiDay` `src/shared/lich-su-doi-tac.ts`):** cả ba vào danh sách **ẨN** của cả hai lớp (`LICH_SU_NOI_BO_AN` cạnh `dispatch_policy_changed` `:85`; `LICH_SU_DOI_TAC_AN` cạnh `:77`). Lý do: ADR-0131 — người khác chỉ thấy «đơn đã đổi gì»; chạm hạn mức không đổi đơn, và dòng của nó luôn nói về chính người bấm; ADR-0032 điều 5 «tên người bấm chỉ Toàn quyền thấy» và «Không thêm thông báo … chạm hạn mức chỉ ghi nhật ký» ⇒ Toàn quyền đọc ở trang Nhật ký. Cập nhật danh sách chủ duyệt trong `src/shared/lich-su-noi-bo.test.ts` và bài `src/lich-su-don-khong-ten.test.ts`, `src/lich-su-don-doi-tac.test.ts` (giả định G3, mục 12).

Hộp thông báo (`v_aud_*`, danh sách đóng `migrations/0025_thong_bao.sql:53-56`, `src/shared/thong-bao.ts:10`): **không thêm** (ADR «Điều không đổi»).

### 5c. Bài kiểm sẽ đổi kỳ vọng (đã grep trên e309acf3; số cộng dồn sau khi nhánh Từ chối gộp)

| Bài | Chỗ | Đổi gì |
|---|---|---|
| `src/route-access.test.ts` | `SNAPSHOT` (cạnh `:128-130` và `:165-167`); tên bài `:500` («363 route» — sau Từ chối 364) | thêm 5 route (3 `admin`, 2 `orders`); **364 → 369** |
| `src/shared/bang-su-kien-van-chuyen.ts` (bài (d) `src/bang-su-kien-van-chuyen.test.ts:240`) | `NGOAI_PHAM_VI_ROUTE` `:425-458` (khuôn `"POST /api/van-chuyen/chinh-sach-dieu-phoi": "cấu hình"` `:436`) | thêm hai route POST của `dispatch`: `"…/han-muc-tu-choi/chinh-sach": "cấu hình"`, `"…/han-muc-tu-choi/dat-lai": "cấu hình — không đổi chuyến"` |
| `src/shared/audit-actions.test.ts`, `src/shared/lich-su-noi-bo.test.ts`, `src/lich-su-don-khong-ten.test.ts`, `src/lich-su-don-doi-tac.test.ts` | danh sách | ba hành động mới vào nhóm ẩn |
| `src/audit-invariants.test.ts` | `:111-120` (danh sách mã R-DSP + mức) | thêm `R-DSP-5`, `R-DSP-6` (sau `R-DSP-4` của nhánh Từ chối) |
| `src/architecture.test.ts` | danh sách tệp SQL nghiêm `:80-90` | thêm `modules/dispatch/han-muc-repo.ts` |
| `src/dong-bo-chuyen-guard.test.ts` | NT-6 `:107-119` | không đổi kỳ vọng — chạy lại xác nhận chữ ký mới (4c) không làm hỏng bộ bóc |
| `src/modules/dispatch/service.test.ts` | các bài lô Nhận/Giao/lập đơn | số câu lô +1; bài «khuôn cho ADR-0032» của nhánh Từ chối → bài thật |
| `src/hang-du-lieu.test.ts`, `src/architecture.test.ts` | — | xanh sau khi thêm từ điển (2c) |
| **Phải xanh, không đổi kỳ vọng** | `src/permission-enforcement.test.ts` (không ô mới; `admin.manage`, `settings.ops`, `dispatch.refuse`, `dispatch.assign` đều đã được hỏi), `src/route-write-guard.test.ts` (luật (1b), (4)), `src/bang-tin-guard.test.ts` (không route ghi `/api/orders*` mới; route Từ chối giữ đúng một `baoThayDoi`), `src/shared/permissions.test.ts` (không đổi `MATRIX`), `src/giao-dien-hoi-bang-quyen.test.ts`, `src/bang-tu-giao-dien.test.ts`, `src/muc-hien-mo-duoc-1/2/3.test.ts` (không mục điều hướng mới — xem 6a), `src/shared/sw-policy.test.ts` (không trang mới), `src/goi-trang-nhe.test.ts` nếu gói trang Đơn hàng lớn lên | chạy lại |
| e2e | mới `tests/e2e/han-muc-tu-choi.mjs` + khai ở `ALL` và bảng thời gian `tests/e2e/run.mjs:79,100` | Task H11 |

Router: hai đường `GET /api/orders/:id/<chữ cố định>` khớp theo vị trí đoạn — kiểm không có route `GET /api/orders/:id/:x` nào khai trước nuốt mất (bài `src/route-access.test.ts` + gọi thật trong harness).

---

## 6. Giao diện (luật `web/CLAUDE.md`: không `innerHTML`, dựng bằng `h()`; giá trị CSS vào token; ô gõ 16px; ẩn/hiện hỏi `can(staff, "<ô>")`; chữ tiếng Việt, không mã thô)

### 6a. Thẻ «Hạn mức Từ chối của hướng dẫn viên» trên `/chinh-sach-dieu-phoi` (`web/chinh-sach-dieu-phoi.ts`, `public/chinh-sach-dieu-phoi.html`)

- Hiện khi `can(staff, "admin.manage")`. Trang hôm nay mở cho `quanLyXe && (settings.ops || dispatch.policy.lead)` (`src/shared/muc-giao-dien.ts:90-94`) = Quản trị, Toàn quyền — cả hai có `admin.manage` ⇒ **không ai vào trang mà thiếu thẻ**, không đổi mục điều hướng; ghi kết luận này vào sổ thi công (trang ghép ADR đã nêu «phải xét lại»).
- Bảng: Tên · Từ chối tuần này · Huỷ tuần này · Chuỗi hiện tại · Lần Từ chối gần nhất («HH:MM DD/MM — <nhãn lý do>», giờ VN bằng hàm có sẵn `vnDateTimeText`). Người không bị giới hạn: chữ phụ «không áp hạn mức». 390px: bảng → thẻ (mốc bảng→thẻ dùng chung, khuôn Đợt A).
- Chỉ khi `can(staff, "settings.ops")`: ba nút chọn chế độ «Tắt / Chỉ đo / Chặn» (kèm một câu giải thích mỗi chế độ), hai ô số `inputmode="numeric"` 16px «Số đơn liên tiếp tối đa», «Số lần mỗi tuần tối đa», nút «Lưu cài đặt»; mỗi hàng nút «Đặt lại»; nút «Đặt lại tất cả» có hộp xác nhận («Đặt lại số lần Từ chối của N hướng dẫn viên?»). Quản trị thấy bảng, không thấy ô/nút.
- Lỗi 409 `stale` → tải lại thẻ kèm thông báo; 400 → câu máy chủ dưới ô.
- Chữ tránh từ đã loại (`src/shared/bang-tu-giao-dien.ts`); không lộ `OFF`/`MEASURE`/`BLOCK`/`REFUSE`.

### 6b. Dòng «còn N lần» trong hộp Từ chối (`web/tu-choi-sheet.ts` — tệp của nhánh Từ chối, T7)

- Mở hộp → gọi `GET /api/orders/:id/han-muc-tu-choi`; `conLai` ≠ null → dòng nhỏ `cauConLai(lienTiep, tuan)` trên danh sách lý do; null hoặc lỗi mạng → không hiện dòng (không chặn bấm).
- Hết lượt (`lienTiep = 0` hoặc `tuan = 0`): nút vẫn hiện và bấm được (ADR điều 9 «hiện câu này khi bấm»); máy chủ trả 409 `refuse_limit` → hiện nguyên câu máy chủ «Bạn đã từ chối đủ số lần cho phép. Hãy gọi văn phòng.», hộp **không** đóng, không tải lại. `handlerFailure(e, "refuse")` (`src/shared/handler-view.ts:65`) thêm nhánh `refuse_limit` → `reload: false`; bài ở `src/shared/handler-view.test.ts`.

### 6c. Dòng phụ ở bảng chọn người (`web/handler-sheet.ts`, ADR điều 10)

- Khi mở bảng (đang gọi `/api/dispatch/assignees` ở `:136`) gọi song song `GET /api/orders/:id/tu-choi-truoc`; lỗi → bỏ qua (danh sách vẫn hiện).
- Dưới tên người có mục trong `tuChoi[partyId]`: «Đã từ chối đơn này lúc HH:MM DD/MM — <nhãn lý do>» (nhãn từ `LY_DO_TU_CHOI` của `src/shared/ly-do-tu-choi.ts`, không phân tích chữ). Không ẩn người đã hết lượt (trang ghép (3)). Hàm dựng chữ thuần ở `src/shared/handler-view.ts` (có bài).
- Bảng chọn người lúc LẬP đơn (`web/assignee-picker.ts`) không có «đơn này» ⇒ không đổi.

### 6d. Chrome + ảnh cho chủ

- Kịch bản mới `docs/evidence/2026-10-23-han-muc-tu-choi/kich-ban/han-muc-tu-choi-smoke.mjs` (390 + 1040, không cần mạng ngoài; thứ tự mở: Quản trị → HDV → Toàn quyền **sau cùng** vì chung kho cookie): (1) Toàn quyền thấy thẻ, đổi «Chặn» 2/15, đặt lại một người; (2) Quản trị thấy bảng, không thấy ô/nút; (3) Bán hàng không vào được trang (như hôm nay); (4) HDV mở hộp Từ chối thấy «còn 2 … 15 …», từ chối hai đơn, đơn thứ ba bấm → câu «Hãy gọi văn phòng», hộp còn mở; (5) Bán hàng mở bảng đổi người của đơn vừa bị từ chối → thấy dòng phụ đúng lý do; đơn khác không có dòng. Chạy thêm `chinh-sach-dieu-phoi-smoke.mjs` (`docs/evidence/2026-09-29-adr-0049/kich-ban/`), `v1-nguoi-phu-trach.mjs` (`docs/evidence/2026-09-21-v1-0/kich-ban/`, vì `web/handler-sheet.ts`), `hdv-viec-cua-toi-smoke.mjs` (`docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/`, vì hộp Từ chối).
- Ảnh 390 + 1040 vào `docs/evidence/2026-10-23-han-muc-tu-choi/`: thẻ (Toàn quyền, Quản trị), hộp Từ chối có dòng «còn N lần», hộp khi hết lượt, bảng chọn người có dòng phụ. **Trình chủ xem trước phát hành** (khuôn Q5 của kế hoạch Từ chối).
- Bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» ở `web/CLAUDE.md` cần dòng mới cho thẻ hạn mức + dòng phụ bảng chọn người — `web/CLAUDE.md` là tệp luật (N9): **đề xuất bằng diff trong báo cáo thi công, chủ duyệt mới sửa**, không tự sửa.
- `src/shared/so-do-trang.ts` là tệp SINH (`node scripts/sinh-so-do-trang.mjs`, tự chạy ở `build:web`/`npm test`) — commit bản sinh lại khi trang có nút mới.

---

## 7. `audit-invariants` (`scripts/audit-checks.mjs`, sau `R-DSP-4` của nhánh Từ chối; bài `src/audit-invariants.test.ts`)

**Mốc phát hành** = `(SELECT created_at FROM dsp_refuse_policy WHERE id = 'gieo-han-muc')` — dòng gieo do migration chèn lúc áp, nên mốc nằm sẵn trong CSDL, không phụ thuộc số migration. Thiếu dòng gieo → kiểm `R-DSP-7` (dưới) đỏ, tránh hai câu kia lặng lẽ ra 0.

- **`R-DSP-5`** (ADR «Hệ quả»): «`REFUSE` chỉ có khi trước đó có `CLAIM`/`ASSIGN` cùng người cùng đơn».
  ```sql
  SELECT count(*) FROM dsp_release_event r
  WHERE r.kind_code = 'REFUSE'
    AND NOT EXISTS (SELECT 1 FROM dsp_release_event c WHERE c.party_id = r.party_id AND c.order_id = r.order_id
                    AND c.kind_code IN ('CLAIM', 'ASSIGN') AND c.seq < r.seq)
    AND NOT EXISTS (SELECT 1 FROM dsp_assignment a WHERE a.order_id = r.order_id AND a.party_id = r.party_id AND a.task_kind_code = 'HANDLE'
                    AND a.valid_from_at < (SELECT created_at FROM dsp_refuse_policy WHERE id = 'gieo-han-muc')
                    AND a.valid_from_at <= r.occurred_at)
  ```
  Vế thứ hai = **miễn trừ đơn có người phụ trách từ TRƯỚC ngày phát hành** (dòng mở trước mốc không có `CLAIM`/`ASSIGN` vì bộ đếm bắt đầu từ 0). Mức **`fail`**: sau mốc, mọi đường mở đều ghi sự kiện cùng lô.
- **`R-DSP-6`** (lưới lúc chạy của bài khoá 1b): dòng `HANDLE` mở **từ mốc** mà không có `CLAIM`/`ASSIGN` cùng người, cùng đơn, `occurred_at = valid_from_at`.
  ```sql
  SELECT count(*) FROM dsp_assignment a
  WHERE a.task_kind_code = 'HANDLE' AND a.order_id IS NOT NULL
    AND a.valid_from_at >= (SELECT created_at FROM dsp_refuse_policy WHERE id = 'gieo-han-muc')
    AND NOT EXISTS (SELECT 1 FROM dsp_release_event e WHERE e.party_id = a.party_id AND e.order_id = a.order_id
                    AND e.kind_code IN ('CLAIM', 'ASSIGN') AND e.occurred_at = a.valid_from_at)
  ```
  Mức **`warn-unless-strict`**, `note`: «khe giữa lúc áp migration và lúc `wrangler deploy` bản mới: mã cũ có thể mở dòng phụ trách không ghi sự kiện — rà tay các dòng báo ra trong khe đó; ngoài khe là lỗi mã» (`npm run trien-khai` deploy NGAY sau migration nên khe là vài phút).
- **`R-DSP-7`**: dòng gieo `gieo-han-muc` tồn tại — `SELECT CASE WHEN EXISTS (SELECT 1 FROM dsp_refuse_policy WHERE id = 'gieo-han-muc') THEN 0 ELSE 1 END`, mức `fail`.
- **Bài (SQLite thật), đỏ trước:** R-DSP-5 — (a) `REFUSE` không có `CLAIM` trước, dòng phụ trách mở SAU mốc → 1; (b) có `CLAIM` trước → 0; (c) dòng phụ trách mở TRƯỚC mốc (giả bằng `valid_from_at` cũ) → 0; (d) `CLAIM` có `seq` lớn hơn `REFUSE` → 1. R-DSP-6 — (a) dòng mở sau mốc không sự kiện → 1; (b) có `ASSIGN` cùng mốc → 0; (c) dòng mở trước mốc → 0. R-DSP-7 — xoá dòng gieo (tắt trigger trong bài) → 1. Bài «danh sách kiểm» `:111-120` cập nhật mức.
- **Lệnh:** `node --test src/audit-invariants.test.ts`; sau e2e: `node scripts/audit-invariants.mjs --db local --strict` (thoát 1 = vi phạm, 2 = không chạy được).

---

## 8. Tiêu chí nghiệm thu (viết TRƯỚC khi làm — P20; gốc = 11 tiêu chí của ADR-0032, đánh số HM-1…HM-11 theo đúng thứ tự ADR, thêm HM-12…HM-16)

Quy ước: «HDV» = tài khoản chỉ `FIELD`; «đơn hợp lệ» = đã xác nhận, ngày đi ≥ ngày kia (qua hạn Q-E của Từ chối), chưa huỷ, chưa giao. «Chặn 2/15» = đã đặt bằng route cài đặt.

- **HM-1** Chặn 2/15: HDV nhận–từ chối đơn A → 200, nhận–từ chối B → 200; nhận C, `POST /api/orders/C/handler-refuse` → **409 `refuse_limit`**, câu đúng nguyên văn ADR. Sau đó: dòng `HANDLE` của HDV trên C **vẫn mở**; số dòng `REFUSE` của HDV vẫn **2**; **đúng 1** dòng `audit_log` `refuse_limit_hit` (`order_id` = C, `staff_id` = HDV, `detail` không tên/không dãy ≥ 8 chữ số/không `@`); không dòng `order_handler_refused` mới.
- **HM-2** Như HM-1 nhưng giữa B và C, HDV nhận đơn K và giữ (hoặc văn phòng Giao K) → từ chối C → **200**; có dòng `REFUSE` thứ 3.
- **HM-3** (a) Từ chối 2 lần, văn phòng Giao Y cho HDV, HDV từ chối chính Y → **409 `refuse_limit`**. (b) Từ chối A, nhận K, HDV huỷ K (`handler-cancel`), từ chối B, nhận C → từ chối C → **409** (K mất tư cách mốc).
- **HM-4** Chặn 2/3 (route cài đặt): ba lần Từ chối trong tuần, mỗi lần xen một đơn giữ → lần thứ 4 → **409 `refuse_limit`**. Với mặc định 15: bài SQL/thuần — lần 16 bị chặn. Sang tuần: gieo thẳng 15 dòng `REFUSE` có `occurred_at` thuộc tuần trước (Chủ nhật 16:59:59.999Z) → từ chối → **200**; gieo một dòng lúc 17:00:00.000Z cùng Chủ nhật → được tính vào tuần mới.
- **HM-5** «Chỉ đo» 2/15: lần thứ 3 → **200**, dòng `HANDLE` đóng, dòng `REFUSE` thứ 3 có; **1** dòng `refuse_limit_hit` có chữ «Chỉ đo». «Tắt»: lần thứ 3 → 200, **0** dòng `refuse_limit_hit`. Cả ba chế độ: sự kiện vẫn ghi.
- **HM-6** Tài khoản `SALES`, `ADMIN`, `SUPER_ADMIN`, `ACCOUNTING`+`FIELD`, `SALES`+`FIELD` đang phụ trách, Chặn 2/15, từ chối lần 3, 4 → **200**; dòng `REFUSE` vẫn ghi cho họ. (`ACCOUNTING` thuần không có `dispatch.refuse` → 403 của lượt Từ chối, không thuộc hạn mức.)
- **HM-7** (a) Toàn quyền `POST …/dat-lai {partyId: HDV}` → 200; HDV từ chối được ngay (200); HDV2 đã hết lượt vẫn **409**. (b) `{tatCa: true}` → 200, `soNguoi` = số tài khoản FIELD đang hoạt động, mỗi người đúng một dòng `RESET`, một dòng `refuse_counter_reset`. (c) Quản trị gọi `POST …/chinh-sach` hoặc `…/dat-lai` → **403**; Bán hàng, Kế toán, HDV → **403** ở cổng `admin`. (d) Bán hàng, Kế toán, HDV gọi `GET /api/dispatch/han-muc-tu-choi` → **403**; Quản trị → **200**, `doiDuoc: false`; Toàn quyền → 200, `doiDuoc: true`. (e) thân sai (`cheDo: "ON"`, `lienTiep: 0`, khoá lạ, cả `partyId` lẫn `tatCa`) → **400**; `partyId` không phải FIELD đang hoạt động → **404**. (f) đổi cài đặt ghi đúng 1 dòng `refuse_policy_changed` có «trước → sau».
- **HM-8** HDV huỷ đơn đang phụ trách qua `handler-cancel` → 200; **1** dòng `ABORT` (người = HDV, đơn đúng); chuỗi/tuần không đổi (HM-1 lặp lại sau một lần huỷ cho cùng kết quả). Toàn quyền KHÔNG phụ trách huỷ qua cùng route → 200 và **0** dòng `ABORT`.
- **HM-9** HDV đã hết lượt (Chặn): văn phòng `PUT /api/orders/:id/handler` giao đơn cho HDV → **200**, đơn thuộc HDV, có dòng `ASSIGN`.
- **HM-10** HDV từ chối đơn D (lý do «Bận lịch khác»). Bán hàng là người lập D mở bảng chọn người: `GET /api/orders/D/tu-choi-truoc` → 200 có mục của HDV đúng `lyDo: "BAN_LICH"` và `luc`; đơn E → `tuChoi` rỗng; HDV gọi → **403**; Kế toán (không `dispatch.assign`) → **403**. **Bài khoá nguồn:** `grep` thân route + hàm đọc không có `audit_log` / hàm của module `audit`; bài harness xoá mọi dòng `audit_log` của D rồi gọi lại → kết quả không đổi.
- **HM-11** `UPDATE`/`DELETE` trên `dsp_release_event`, `dsp_refuse_policy` → lỗi trigger (bài migration đỏ-xanh, 2d mục 4). `npm test`, `npm run typecheck` (0 lỗi), `npm run build:web`, `npm run test:e2e` xanh; `node scripts/audit-invariants.mjs --db local --strict` thoát 0; **người kiểm độc lập chỉ đọc báo ĐẠT**.
- **HM-12 (đua)** (a) Chặn 2/15, chuỗi = 1: HDV gửi đồng thời Từ chối hai đơn khác nhau (`Promise.all`, 5 vòng, đặt lại giữa các vòng) → mỗi vòng đúng một 200 và một 409 `refuse_limit`; tổng `REFUSE` tăng đúng 1/vòng. (b) Harness: `moc.truocLo` (`tests/audit/harness.mjs:72`) chèn một `REFUSE` khác của HDV ngay trước lô → câu đầu không chèn → **409 `refuse_limit`**, dòng phụ trách vẫn mở, **không** dòng `REFUSE` ma. (c) Văn phòng đổi người đúng lúc HDV từ chối → 409 `stale`, **không** dòng `REFUSE`.
- **HM-13 (sự kiện mọi đường mở)** Lập đơn có chọn HDV → 1 `ASSIGN`; tự Nhận → 1 `CLAIM`; giao đơn chưa có người → 1 `ASSIGN`; đổi người A→B → 1 `ASSIGN` cho B, 0 dòng cho A; mọi nhánh thua → 0 dòng. Bài khoá 1b xanh, `R-DSP-6` = 0 sau e2e.
- **HM-14 («còn N lần»)** Chặn 2/15, HDV vừa từ chối 1 đơn: `GET /api/orders/:id/han-muc-tu-choi` trên đơn đang giữ → `{ conLai: { lienTiep: 1, tuan: 14 } }`; «Chỉ đo» → `conLai: null`; Bán hàng đang phụ trách → `null`; HDV không phụ trách đơn đó → 403; Kế toán → 403.
- **HM-15 (không lộ)** Mọi phản hồi mới và `detail` của ba hành động không chứa SĐT, email, tên khách, mã đơn của đơn khác; lớp lịch sử rút gọn (nội bộ, Đối tác) không trả ba hành động mới (bài `lich-su-*`).
- **HM-16 (giao diện, Chrome 390 + 1040)** đúng các bước 6d; ẩn/hiện hỏi `can(staff, "admin.manage")` / `can(staff, "settings.ops")` (bài `src/giao-dien-hoi-bang-quyen.test.ts`); không lộ mã thô; ảnh đã trình chủ.

---

## 9. Danh sách task (mỗi task: đỏ trước → xanh sau)

**Phụ thuộc:** H1–H5, H7 (trừ phần chạm route Từ chối), H9 làm được ngay từ `main` (không cần mã Từ chối). H6, H8 (route «còn N lần» hỏi `dispatch.refuse`), H10 phần hộp Từ chối, H11 khối Từ chối **cần mã Từ chối đã gộp `main`** (hoặc dựng worktree trên nhánh `tu-choi-han-muc` sau khi nhánh đó được người kiểm báo ĐẠT, rồi gộp `main` lại trước khi trình kiểm). Thứ tự: H0 → H1 → H2 → H3 → (H4, H5 song song) → H7 → H9 → [chờ Từ chối] → H6 → H8 → H10 → H11 → H12 → H13 → H14.

### H0 — Chuẩn bị
- Worktree riêng `.claude/worktrees/<tên>` từ `origin/main` mới nhất; không sửa checkout gốc.
- Sổ `docs/superpowers/plans/2026-10-23-han-muc-tu-choi-thi-cong-nhat-ky.md` (ruling, nợ, giả định G1–G6 của mục 12, kết luận 6a).
- Mốc: `npm test`, `npm run typecheck`. Kiểm lại số migration (2a, hai lệnh) và mọi số dòng của kế hoạch. Đọc mã Từ chối đã gộp (nếu có) theo danh sách mục 10.

### H1 — Migration `0117` + từ điển
**Tệp:** `migrations/0117_han_muc_tu_choi.sql`, `src/migrations-han-muc-tu-choi.test.ts` (mới), `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh).
- **Đỏ trước:** bài 2d (chưa có tệp → đỏ ca 1); `src/hang-du-lieu.test.ts` đỏ khi có migration mà chưa có hạng (ghi «thấy chặn»).
- **Lệnh:** `node --test src/migrations-han-muc-tu-choi.test.ts src/hang-du-lieu.test.ts src/architecture.test.ts`; `npm run dict`; `npm run db:migrate:local` (D1 local, không remote).

### H2 — Luật thuần + bộ ca chung
**Tệp:** `src/shared/han-muc-tu-choi.ts`, `src/shared/han-muc-tu-choi-ca.ts`, `src/shared/han-muc-tu-choi.test.ts` (mới).
- **Đỏ trước:** mười nhóm ca của 3b.
- **Lệnh:** `node --test src/shared/han-muc-tu-choi.test.ts`; `npm run typecheck`.
- **Thấy chặn thật:** đột biến 3b cuối.

### H3 — SQL đếm + câu chèn có điều kiện + bài song sinh
**Tệp:** `src/modules/dispatch/han-muc-repo.ts` (mới), `src/modules/dispatch/repository.ts` (+ `CLOSE_HANDLER_SAU_CHOT` nếu nhánh Từ chối chưa thêm), `src/modules/dispatch/han-muc-sql.test.ts` (mới), `src/architecture.test.ts` (danh sách tệp SQL).
- **Đỏ trước:** bài song sinh 3d (bộ ca + 500 chuỗi ngẫu nhiên + EXPLAIN QUERY PLAN).
- **Lệnh:** `node --test src/modules/dispatch/han-muc-sql.test.ts src/architecture.test.ts`.
- **Thấy chặn thật:** đột biến 3d cuối.

### H4 — Sự kiện `CLAIM`/`ASSIGN` (M1–M3) + bài khoá đường `HANDLE`
**Tệp:** `src/modules/dispatch/service.ts` (`handlerChangeStatements`, `newOrderHandlerStatements` — câu cuối lô), `src/modules/dispatch/service.test.ts`, `src/han-muc-duong-handle.test.ts` (mới, 1b), chú thích `src/shared/router.ts:96-102`, `src/modules/dispatch/index.ts:79-86`.
- **Đỏ trước:** 1b (d) — nhánh nào thiếu sự kiện đỏ; harness `src/modules/dispatch/nhan-don.test.ts`/`src/modules/orders/don-moi-chon-hdv.test.ts` thêm ca HM-13.
- **Lệnh:** `node --test src/modules/dispatch/service.test.ts src/han-muc-duong-handle.test.ts src/modules/dispatch/nhan-don.test.ts src/modules/orders/don-moi-chon-hdv.test.ts`; `npm test`.
- **Thấy chặn thật:** ba đột biến 1b.

### H5 — Sự kiện `ABORT` (đổi hợp đồng `cancelOrderByHandler`)
**Tệp:** `src/modules/orders/index.ts` (`cancelOrderByHandler` `:542-550`, tham số `cauSauHuy` trước `noiChuyen`), `src/modules/dispatch/index.ts` (route `handler-cancel` `:218-242`), `src/modules/dispatch/han-muc-repo.ts` (`chen_abort_sau`), bài harness mới `src/modules/dispatch/huy-abort.test.ts` (khuôn `huy-don-khac.test.ts`).
- **Đỏ trước:** HM-8 (HDV → 1 `ABORT`; Toàn quyền không phụ trách → 0; thua khoá lạc quan → 0).
- **Lệnh:** `node --test src/modules/dispatch/huy-abort.test.ts src/modules/dispatch/huy-don-khac.test.ts src/dong-bo-chuyen-guard.test.ts src/dong-bo-chuyen-ghep.test.ts src/modules/van-chuyen/dong-bo-chuyen-route.test.ts src/architecture.test.ts`; `npm test`.

### H6 — `REFUSE` đầu lô Từ chối + hạn mức ở route + ba hành động nhật ký (cần mã Từ chối)
**Tệp:** `src/modules/dispatch/service.ts` (`refuseStatements` thêm [0], `tuChoiThang` đọc `kq[1]`), route `POST /api/orders/:id/handler-refuse` ở `src/modules/dispatch/index.ts` (bước 9b, xử lý sau lô — 5a), `src/shared/audit-actions.ts`, `src/shared/lich-su-noi-bo.ts`, `src/shared/lich-su-doi-tac.ts` (+ bốn bài 5c), `src/modules/dispatch/tu-choi.test.ts` (harness của nhánh Từ chối — thêm ca), `src/modules/dispatch/service.test.ts` (thay bài «khuôn cho ADR-0032»).
- **Đỏ trước:** thêm ba hành động → `npm run typecheck` đỏ ở `_phanLoaiNoiBoDay`/`_phanLoaiDay` (hàng rào ADR-0131, ghi «thấy chặn»); harness HM-1, HM-2, HM-3, HM-5, HM-6, HM-12 (b)(c).
- **Lệnh:** `node --test src/modules/dispatch/tu-choi.test.ts src/modules/dispatch/service.test.ts src/shared/audit-actions.test.ts src/shared/lich-su-noi-bo.test.ts src/lich-su-don-khong-ten.test.ts src/lich-su-don-doi-tac.test.ts src/bang-tin-guard.test.ts`; `npm test`; `npm run typecheck`.
- **Thấy chặn thật:** (1) đặt câu `REFUSE` SAU câu đóng → HM-1 đỏ (dòng phụ trách bị đóng khi hết lượt); (2) bỏ vế `EXISTS` → HM-12 (c) đỏ (dòng ma); (3) bỏ vế `?8 = 1` → HM-6 đỏ.

### H7 — Route quản trị: xem / cài đặt / đặt lại
**Tệp:** `src/modules/dispatch/index.ts` (3 route `admin`), `src/shared/contracts.ts` (DTO), `src/shared/bang-su-kien-van-chuyen.ts` (`NGOAI_PHAM_VI_ROUTE`), `src/route-access.test.ts`, harness mới `src/modules/dispatch/han-muc-route.test.ts`.
- **Đỏ trước:** HM-7 (a)–(f) ở harness; `route-access` đỏ khi chưa thêm SNAPSHOT; bài (d) `bang-su-kien-van-chuyen` đỏ khi chưa khai ngoài phạm vi.
- **Lệnh:** `node --test src/modules/dispatch/han-muc-route.test.ts src/route-access.test.ts src/route-write-guard.test.ts src/permission-enforcement.test.ts src/bang-su-kien-van-chuyen.test.ts`; `npm test`.
- **Thấy chặn thật:** bỏ dòng `if (!can(staff, "settings.ops"))` ở `dat-lai` → `route-write-guard` luật (4) đỏ + HM-7 (c) đỏ → hoàn nguyên.

### H8 — Route «còn N lần» + route bảng chọn người (route «còn N lần» cần ô `dispatch.refuse`)
**Tệp:** `src/modules/dispatch/index.ts` (2 route `orders`), `src/shared/contracts.ts`, `src/route-access.test.ts`, `src/modules/dispatch/han-muc-route.test.ts`.
- **Đỏ trước:** HM-10, HM-14.
- **Lệnh:** như H7.

### H9 — Kiểm định kỳ `R-DSP-5/6/7`
**Tệp:** `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`.
- **Đỏ trước:** các ca mục 7.
- **Lệnh:** `node --test src/audit-invariants.test.ts`; sau H11: `node scripts/audit-invariants.mjs --db local --strict`.
- **Thấy chặn thật:** chèn tay trên D1 local một `REFUSE` không có `CLAIM` (sau mốc) → `--strict` thoát 1 nêu `R-DSP-5` → hoàn nguyên bằng cách dựng lại D1 local (bảng chỉ-thêm, không xoá được dòng — dùng D1 tạm của `dev-iphone`/e2e, không D1 local chính).

### H10 — Giao diện
**Tệp:** `web/chinh-sach-dieu-phoi.ts`, `public/chinh-sach-dieu-phoi.html`, `web/tu-choi-sheet.ts`, `web/handler-sheet.ts`, `src/shared/handler-view.ts` (+ `handler-view.test.ts`), `src/shared/han-muc-tu-choi.ts` (chữ hiển thị), khối CSS sau mốc PWA của `public/app.css` (chỉ token), `src/shared/so-do-trang.ts` (sinh lại), kịch bản + ảnh 6d.
- **Đỏ trước:** `handler-view.test.ts` (nhánh `refuse_limit` không tải lại; chữ dòng phụ); `src/giao-dien-hoi-bang-quyen.test.ts` nếu lỡ hỏi `hasPermission` cho ẩn/hiện.
- **Lệnh:** `npm run build:web`; `node --test src/shared/handler-view.test.ts src/giao-dien-hoi-bang-quyen.test.ts src/bang-tu-giao-dien.test.ts src/muc-hien-mo-duoc-1.test.ts src/muc-hien-mo-duoc-2.test.ts src/muc-hien-mo-duoc-3.test.ts`; `npm run test:e2e -- pwa` (quét CSS khối PWA); Chrome theo 6d.

### H11 — e2e
**Tệp:** `tests/e2e/han-muc-tu-choi.mjs` (mới), `tests/e2e/run.mjs` (`ALL` `:79`, bảng thời gian `:100`), có thể `tests/e2e/dispatch.mjs` (ca `ASSIGN`/`CLAIM`/`ABORT`).
- Đầu kịch bản: đặt «Chặn» 2/15 bằng route + `RESET` mọi HDV thử; **cuối kịch bản (trong `finally`) đặt lại «Chỉ đo» 2/15** — D1 của một nhóm dùng chung cho các kịch bản sau cùng nhóm (`run.mjs:84`). Bẫy: đơn thử phải qua cổng xác nhận mới (chọn Đón/Không đón — dữ liệu gieo của `tests/e2e/lib.mjs`).
- Phủ HM-1, HM-2, HM-3, HM-5, HM-6, HM-7, HM-8, HM-9, HM-10, HM-12 (a), HM-13, HM-14 qua API thật; đăng nhập qua `login()`/`session()`.
- **Lệnh:** `npm run test:e2e -- han-muc-tu-choi dispatch`, rồi đủ bộ `npm run test:e2e` (cần mạng; tắt `wrangler dev` mồ côi), `node scripts/audit-invariants.mjs --db local --strict`.

### H12 — Tài liệu, nhật ký thay đổi, hướng dẫn, sổ hàng rào
- `docs/SYSTEM-DESIGN.md`: §5 (ba bảng), §6 (luồng Từ chối có hạn mức, sự kiện ở Nhận/Giao/lập đơn/HDV huỷ), §7 (5 route, mã 409 `refuse_limit`, 503 `refuse_policy_missing`), §8 (ai xem/đổi/đặt lại; nhóm bị giới hạn), **§16** (dòng lệch có chủ ý Hiến chương 5.1 của ADR-0032 điều 5: luật đếm ở điều kiện câu ghi, không ở trigger; gỡ khi có view bộ quyền đọc được từ trigger).
- `docs/CHANGE-GUIDE.md`: công thức «đường mới mở dòng phụ trách» (phải ghi sự kiện cùng lô + sửa bài 1b + bảng mục 1); thứ tự lô Từ chối 4d; bẫy `cancelOrderByHandler` tham số trước `noiChuyen`; bẫy e2e đổi cài đặt trên D1 chung.
- `src/shared/changelog.ts`: mục mới (số = mục đầu trên `origin/main` lúc gộp + 1), lời thường: «Hướng dẫn viên chỉ được từ chối tối đa 2 đơn liên tiếp và 15 lần mỗi tuần (đang ở chế độ chỉ đo — chưa chặn). Toàn quyền xem số lần, đổi con số, bật chặn và đặt lại ở trang Chính sách điều phối.»
- Hướng dẫn: `src/shared/huong-dan-hdv.ts` (hạn mức, «Hãy gọi văn phòng»), `src/shared/huong-dan-quan-tri.ts` (đọc bảng số lần, đặt lại, ba chế độ; hệ quả «đơn giữ từ trước phát hành không cắt chuỗi»), `src/shared/huong-dan-ban-hang.ts` (dòng «đã từ chối đơn này lúc…»); `node --test src/shared/huong-dan.test.ts` (A2: `[[Tên nút]]` phải có nguyên văn trong `web/`).
- `docs/SO-HANG-RAO.md`: bài khoá 1b, bài song sinh 3d, trigger chỉ-thêm, `R-DSP-5/6/7`, câu đầu lô — mỗi dòng có ngày + đột biến + dòng đỏ.
- `docs/HANDOFF-N1.md`: runbook phát hành có migration `0117` (mục H14).
- **Lệnh:** `node --test src/shared/changelog.test.ts src/shared/huong-dan.test.ts`; `npm test`; `npm run typecheck`.

### H13 — Người kiểm độc lập (chỉ đọc) — bắt buộc
Giao `nguoi-kiem-doc-lap`: kiểm HM-1…HM-16; tự chạy `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local --strict`; đọc migration đối chiếu ADR điều 1, 7; đọc lô 4b/4c/4d từng câu (`changes()` nói về câu NGAY TRƯỚC); đối chiếu bảng mục 1 với `grep` thật; tự làm ít nhất ba đột biến (đổi thứ tự câu đầu lô Từ chối; bỏ câu sự kiện ở lập đơn; đổi `>` thành `>=` trong mảnh chuỗi) và xem bài đỏ; xem ảnh Chrome. Chỉ báo cáo. Chỉ báo «đạt» khi người kiểm nói ĐẠT **và** test xanh.

### H14 — Phát hành (CHỦ tự chạy — AI chuẩn bị)
- Có **migration** `0117` ⇒ đúng runbook `docs/HANDOFF-N1.md`: mục nhật ký thay đổi (A.0) → `npm run day-len -- <nhánh>` → `npm run trien-khai` (cổng chỉ-đọc, `kiem-phien-ban.mjs`, điểm khôi phục Time Travel, test + typecheck + e2e, migration, deploy NGAY, `audit-invariants --db remote`, `kiem-phien-ban.mjs --sau-deploy`). AI chỉ đưa nguyên lệnh + thư mục.
- Phát hành CHUNG với nút Từ chối được (ADR «Phụ thuộc») — khuyến nghị chung một lần (mục 12, Q-PH).
- Sau phát hành: chế độ «Chỉ đo» đang chạy; nhắc chủ: sau 1–2 tuần xem bảng số lần, rồi tự bấm «Chặn» khi thấy hợp lý (không cần phát hành mã). Rà `R-DSP-6` (khe migration → deploy).

---

## 10. Phải kiểm lại khi mã Từ chối thật đã gộp (giả định từ kế hoạch Từ chối mục 3)

| # | Giả định | Kiểm ở đâu | Nếu khác |
|---|---|---|---|
| T-1 | `refuseStatements(db, {orderId, partyId, actorId, at, lyDo})` ở `dispatch/service.ts` trả `[đóng (chốt), nhật ký changes()>0]` | đọc hàm | giữ nguyên ý 4d: câu `REFUSE` phải đứng ĐẦU, câu đóng thêm `changes() > 0` |
| T-2 | `tuChoiThang(kq)` là chỗ DUY NHẤT đọc chỉ số kết quả; route không đọc `kq[0]` | `grep -n "kq\[\|results\[" src/modules/dispatch/index.ts` | sửa route để đi qua `tuChoiThang` trước khi chen câu |
| T-3 | `CLOSE_HANDLER_SAU_CHOT` CHƯA có (ADR-0032 thêm); `CLOSE_HANDLER` không bị sửa | `dispatch/repository.ts` | nếu nhánh Từ chối đã thêm biến thể thì dùng lại, không thêm trùng tên (`defineSql` ném lỗi khi trùng tên khác nội dung) |
| T-4 | Mã lý do = `BAN_LICH`, `OM_VIEC_RIENG`, `KHONG_PHU_HOP`, `OTHER` ở `src/shared/ly-do-tu-choi.ts` (`LY_DO_TU_CHOI`) | đọc tệp | mã là hợp đồng với `dsp_release_event.reason_code` — dùng đúng mã thật; dài > 40 ký tự thì nới CHECK trước khi viết migration |
| T-5 | Route `POST /api/orders/:id/handler-refuse`, cổng `orders`, thứ tự bước 1–12 (403 sàng → 404 → … → 400 → lô → 409 stale → `baoThayDoi` → 200) | đọc route | đặt bước 9b đúng sau đọc lý do, trước lô; giữ luật `bang-tin-guard` |
| T-6 | Chốt «chỉ người đang phụ trách» so `current.staff_id === staff.id`; `current.party_id` = `staff.partyId` | đọc route | sự kiện dùng `current.party_id` (đã đọc) cho chắc; ghi ruling |
| T-7 | Đơn nháp → 409 `order_not_confirmed` TRƯỚC hạn mức (Q1 (a)) | đọc route | hạn mức không chặn thay cho lỗi nháp |
| T-8 | Hành động `order_handler_refused` đã xếp «giu» (nội bộ) / ẩn (Đối tác) theo Q2 (a) | `lich-su-noi-bo.ts`, `lich-su-doi-tac.ts` | không đổi; ba hành động mới xếp ẩn |
| T-9 | `R-DSP-4` đã dùng cho LC-8 | `scripts/audit-checks.mjs` | đặt R-DSP-5/6/7 sau; số khác thì đánh lại |
| T-10 | Nhánh Từ chối không thêm migration | `git diff --name-only origin/main -- migrations` | nếu có thì số của việc này = số đó + 1 |
| T-11 | Số route sau Từ chối = 364; `NGOAI_PHAM_VI_ROUTE` có `handler-refuse`; `bang-tin-guard` 9 route | `route-access.test.ts`, `bang-su-kien-van-chuyen.ts`, `bang-tin-guard.test.ts` | cộng dồn đúng số thật |
| T-12 | `web/tu-choi-sheet.ts` có chỗ cho một dòng phụ trên danh sách lý do; `handlerFailure` có kiểu `"refuse"` | đọc tệp | thêm theo khuôn đã có; không đổi bố cục nhánh Từ chối khi không cần |
| T-13 | Ô `dispatch.refuse` = SALES/ADMIN/FIELD `assigned`, SUPER_ADMIN `any` | `src/shared/permissions.ts` | route «còn N lần» hỏi đúng ô đó |
| T-14 | Bài «khuôn cho ADR-0032» ở `dispatch/service.test.ts` (bảng tạm, biến thể câu đóng viết trong bài) | đọc bài | thay bằng bài thật trên `dsp_release_event`; xoá bản giả |
| T-15 | Mục nhật ký thay đổi, hướng dẫn HDV của nhánh Từ chối | `changelog.ts`, `huong-dan-hdv.ts` | số phiên bản và câu chữ nối tiếp, không ghi đè |

---

## 11. Va chạm với nhánh khác

| Nhánh | Chạm chung | Cách xử lý |
|---|---|---|
| `tu-choi-han-muc` (nút Từ chối) | `dispatch/service.ts`, `dispatch/index.ts`, `dispatch/repository.ts`, `audit-actions.ts`, `lich-su-*.ts`, `route-access.test.ts`, `bang-su-kien-van-chuyen.ts`, `audit-checks.mjs`, `web/tu-choi-sheet.ts`, `handler-view.ts` | việc này đứng SAU (mục 9, mục 10). Không sửa tệp của nhánh đó trước khi nó gộp. |
| `origin/worktree-xac-nhan-don-2` (Xác nhận đơn, Đợt 2–5 chưa làm) | **số migration** (kế hoạch của họ ghi `0115_yeu_cau_xac_nhan` — số đã bị dùng, sẽ đổi, dễ trùng `0117`); `cancelOrderByHandler` (ADR-0137 gửi thư khi huỷ — kế hoạch Từ chối mục 7); `route-access.test.ts`; `audit-actions.ts`; `contracts.ts` | ai gộp sau đổi số migration (bài tìm theo đuôi, 2a); gộp chữ ký `cancelOrderByHandler` bằng tay giữ CẢ hai tham số, `cauSauHuy` trước `noiChuyen`; đếm route cộng dồn. Báo phiên Xác nhận đơn ở sổ điều phối. |
| `origin/claude/clever-hertz-0f1b61`, `origin/worktree-xac-nhan-don` | không thấy chạm (migration cũ hơn `main`) | không làm gì |

---

## 12. Giả định đã ghi (bề mặt / áp nguyên tắc đã duyệt — không hỏi) và câu hỏi cho chủ

**Giả định (ghi vào sổ thi công, người kiểm xét lại):**
- **G1** Cột `seq` (thứ tự chèn) thêm vào `dsp_release_event` để luật «sau dòng đó» không phụ thuộc mốc giờ trùng mili-giây — cột kỹ thuật thi hành đúng ADR điều 3, không đổi nghĩa.
- **G2** `CHECK (mode IN ('OFF','MEASURE','BLOCK'))` — danh sách đóng gắn với mã (khuôn `vc_departure_rule.subject`); loại sự kiện vẫn là bảng tra cứu như ADR điều 1.
- **G3** Ba hành động nhật ký mới ẨN ở cả hai lớp lịch sử rút gọn; Toàn quyền đọc ở trang Nhật ký (áp ADR-0131 + ADR-0032 điều 5 «tên người bấm chỉ Toàn quyền thấy», «không báo văn phòng»). Là hướng SIẾT (ít lộ hơn), đảo được bằng một dòng xếp loại.
- **G4** Bảng số lần và «Đặt lại tất cả» áp cho **tài khoản đang hoạt động có quyền `FIELD`** (kể cả tài khoản lai — hiện «không áp hạn mức»). `RESET` cho người không bị giới hạn vô hại.
- **G5** «Huỷ tuần này» đếm `ABORT` trong tuần, không bị `RESET` cắt (`RESET` chỉ thuộc hạn mức Từ chối).
- **G6** Không có dòng cài đặt → 503 `refuse_policy_missing` (không đoán); thực tế không xảy ra vì dòng gieo + trigger cấm xoá + `R-DSP-7`.
- **G7** Ghi `refuse_limit_hit` «chỉ đo» ở lô riêng SAU lô Từ chối thắng, theo số đã đọc trước lô (ADR không nói lô nào cho chế độ «Chỉ đo»; số đo chỉ để xem, không chặn).

**Câu hỏi bắt buộc cho chủ: không có.** ADR-0032 đã chốt mọi điều chạm dữ liệu/quyền (ai bị giới hạn, luật chuỗi/tuần, ba chế độ, ai xem/đổi/đặt lại, nguồn dòng phụ bảng chọn người, không thông báo mới). Các điểm trên là cách thi hành.

**Một lựa chọn lúc phát hành (không chặn thi công) — Q-PH. Phát hành cùng nút Từ chối hay tách?**
- (a) **Cùng một lần** — *khuyến nghị*: HDV gặp nút Từ chối lần đầu đã có bộ đếm (ở chế độ chỉ đo), số liệu đếm ngay từ ngày đầu; một lần áp cơ sở dữ liệu.
- (b) Nút Từ chối trước, hạn mức sau vài ngày — nút ra sớm hơn, nhưng các lần Từ chối của những ngày đầu không được đếm.

---

## 13. Trang ghép

Lượt thi công này chỉ áp ADR-0032 (một ADR, đã có trang ghép ở `docs/superpowers/specs/2026-10-20-han-muc-tu-choi/ADR-0032-nhap.md`). Cập nhật hiện trạng sau khi đọc mã:
- **(1) Bảng chứa gì:** ba bảng mới đúng trang ghép; `audit_log` nhận thêm ba hành động (ẩn ở lớp rút gọn — G3); `dsp_assignment` không đổi cấu trúc.
- **(2) Dòng quyền:** không ô mới. `dispatch.assign` nay còn canh thêm một cửa ĐỌC (`GET /api/orders/:id/tu-choi-truoc`) — đúng điều kiện giao diện mở bảng chọn người (`handler-view.ts:51`); `dispatch.refuse` canh thêm cửa đọc «còn N lần».
- **(3) Cổng ↔ cửa:** như trang ghép, cộng: `handler-cancel` ghi `ABORT` chỉ khi người gọi đang phụ trách (Toàn quyền huỷ hộ không sinh `ABORT`); chỗ giao diện đổi nghĩa: thẻ mới trên `/chinh-sach-dieu-phoi` (không ai vào trang mà thiếu `admin.manage` — 6a), dòng phụ ở `web/handler-sheet.ts`, dòng «còn N lần» ở `web/tu-choi-sheet.ts`.
