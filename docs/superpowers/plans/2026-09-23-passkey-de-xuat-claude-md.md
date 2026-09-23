# Đề xuất sửa CLAUDE.md / src/CLAUDE.md — đăng nhập nhanh bằng Face ID (ADR-0016)

**Trạng thái: ĐÃ ÁP (chủ duyệt 2026-09-23).** Bốn mục dưới đây đã được áp nguyên văn vào `CLAUDE.md` §10 và `src/CLAUDE.md` theo lệnh của chủ dự án ("ok theo đề xuất"); phần còn lại của tệp giữ làm lịch sử.

> Theo Hiến pháp Điều 9 và `CLAUDE.md` §3 (N9): AI **không tự sửa** các tệp luật này (trừ số đếm/số migration/tên tệp cho khớp mã — hai đề xuất dưới đây đều đổi **nghĩa** quy tắc nên không thuộc ngoại lệ đó). Đây là **đề xuất dạng diff**, chủ dự án đọc rồi tự áp bằng tay (hoặc yêu cầu một phiên khác áp sau khi duyệt). Không tệp nào trong `CLAUDE.md`/`src/CLAUDE.md` bị sửa trực tiếp bởi việc thi công Task 12.

## 1. `CLAUDE.md` §10 (Bẫy hay dính) — `last_login_at` nay ghi ở cả hai đường đăng nhập

**Vì sao:** trước khi có Face ID, chỉ `POST /api/auth/login` (PIN) ghi `staff.last_login_at`. Từ ADR-0016, `POST /api/auth/passkey/login` cũng gọi `recordLogin` (cùng lý do: "Đăng nhập gần nhất" phải đúng bất kể nhân viên đăng nhập bằng PIN hay Face ID). Câu hiện tại ở `CLAUDE.md` chỉ nhắc "route đăng nhập" (số ít, ngầm hiểu PIN) — nên nói rõ có hai đường.

**Tệp:** `CLAUDE.md`, mục `## 10. Bẫy hay dính`.

```diff
- - Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` chỉ ghi ở route đăng nhập (công thức q).
+ - Chế độ bảo trì (`mnt_setting`): **chỉ chủ dùng được**; bật thì **máy chủ** chặn mọi SĐT ngoài `allowed_phones` (kể cả phiên đang mở); chỉ bật khi chủ quyết, sau khi cột "Đăng nhập gần nhất" cho thấy mọi người đã đăng nhập bằng bản mới; chủ bị khoá thì tắt bằng SQL ở `docs/HANDOFF-N1.md`; `last_login_at` ghi ở đăng nhập PIN VÀ đăng nhập Face ID (công thức q, r).
```

Nguồn đối chiếu (mã thật): `src/modules/staff/index.ts` (`recordLogin`, JSDoc đã sửa ở Task 12), `src/modules/auth/index.ts` (cả `POST /api/auth/login` lẫn `POST /api/auth/passkey/login` đều gọi `recordLogin`).

## 2. `CLAUDE.md` §10 — thêm một bẫy mới: cấu hình Face ID production lọt vào local

**Vì sao:** đây là bẫy đã dính thật trong lúc thi công (Task 11, xem ghi chú B-22/ruling ở sổ điều phối `docs/superpowers/plans/2026-09-23-passkey.md`) — `wrangler.jsonc` khai `PASSKEY_RP_ID=booking.tourdao.vn` ở `vars`; nếu kịch bản/dev tự chạy `wrangler dev` mà không ghi đè, nút Face ID sẽ HIỆN nhưng mọi lần gọi WebAuthn thất bại (rpId không khớp origin thật đang mở), dễ nhầm là lỗi mã.

**Tệp:** `CLAUDE.md`, mục `## 10. Bẫy hay dính` — thêm một dòng mới (ví dụ sau dòng Turnstile, vì cùng nhóm "biến môi trường ở đăng nhập"):

```diff
  - Turnstile ở đăng nhập: bật khi có `TURNSTILE_SECRET_KEY`, **tắt** khi vắng; kiểm TRƯỚC bộ chống dò PIN; 403 vẫn có một dòng log (`turnstile_failed`, chỉ mã lý do). Khi deploy: khoá site (`vars`) đi cùng mã, `wrangler secret put TURNSTILE_SECRET_KEY` đặt **SAU** khi nhân viên đã mở app một lần (service worker cache `login.js` cũ). `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET` khỏi `Env`. Chi tiết: `docs/CHANGE-GUIDE.md` công thức l.
+ - Face ID (passkey, ADR-0016): `PASSKEY_RP_ID` phải **đúng** `booking.tourdao.vn` (không phải domain phụ, không có `https://`) — production đọc từ `vars` của `wrangler.jsonc`, **không** phải bí mật. Local/thử LAN phải ghi đè bằng giá trị `localhost`/IP nội bộ trong `.dev.vars` (mẫu `.dev.vars.example`); thiếu ghi đè thì nút Face ID hiện nhưng luôn gọi thất bại (rpId không khớp origin đang mở) — dễ nhầm là lỗi mã. Chi tiết: `docs/CHANGE-GUIDE.md` công thức r.
  - Chế độ bảo trì (`mnt_setting`): ...
```

## 3. `src/CLAUDE.md` — module `auth` đã chuyển sang STRICT (không còn LEGACY)

**Vì sao:** mã thật (`src/architecture.test.ts`, dòng `LEGACY = ["accounts", "audit", "catalog", "orders"]`) và tài liệu chuẩn tắc `docs/ARCHITECTURE.md` (mục "Ranh giới SQL của module nghiêm") **đã** liệt `auth` vào nhóm STRICT — mọi câu SQL của `src/modules/auth/repository.ts` đi qua `defineSql` (đăng ký ở `src/shared/sql-registry.ts`), kể cả các câu mới của Face ID (`PK_FIND_ACTIVE`, `PK_INSERT`, `PK_REVOKE_ALL`…) lẫn các câu chống dò PIN cũ (`ATTEMPT_*`). Việc này đã làm ở một task trước (kèm commit "chờ chủ duyệt" cho `docs/ARCHITECTURE.md`, theo đúng quy trình N9). Nhưng `src/CLAUDE.md` (tệp luật riêng, N9 bảo vệ, AI không tự sửa) **vẫn còn ghi `auth` ở nhóm LEGACY** — lệch với mã thật và với `docs/ARCHITECTURE.md`.

**Tệp:** `src/CLAUDE.md`, mục `## Cấu trúc`, dòng "Module 'nghiêm'".

```diff
- - **Module "nghiêm"** (`company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): SQL đi qua `defineSql`, câu tĩnh (`src/shared/sql-registry.ts`), `architecture.test.ts` ép đầy đủ. Module cũ (`accounts`, `audit`, `auth`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu.
+ - **Module "nghiêm"** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`): SQL đi qua `defineSql`, câu tĩnh (`src/shared/sql-registry.ts`), `architecture.test.ts` ép đầy đủ. Module cũ (`accounts`, `audit`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu.
```

**Bằng chứng đối chiếu (chỉ đọc, tự chạy lại được):**
```
grep -n 'LEGACY = \[' src/architecture.test.ts
# LEGACY = ["accounts", "audit", "catalog", "orders"] as const;   (auth KHÔNG còn trong danh sách)
grep -n 'defineSql' src/modules/auth/repository.ts | wc -l
# > 0 (mọi câu của repository.ts đi qua defineSql)
```

## 4. `src/CLAUDE.md` — thêm tiền tố bảng `aut_`

**Vì sao:** migration `0023_auth_passkey.sql` tạo bảng `aut_passkey` (tiền tố `aut_`, module `auth`) — đúng quy tắc "bảng mới có tiền tố module" nhưng danh sách ví dụ ở `src/CLAUDE.md` mục "Dữ liệu" chưa liệt `aut_` (đã lỗi thời so với `docs/ARCHITECTURE.md`, tài liệu này đã có `aut_` từ `0023_auth_passkey`).

**Tệp:** `src/CLAUDE.md`, mục `## Dữ liệu`, dòng "Tên bảng số ít...".

```diff
- - Tên bảng số ít (trừ `orders`); bảng mới có tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_`, `mnt_`, `fbk_`, sau này `bil_`); tra cứu dùng khoá mã `TEXT code`. Danh sách giá trị mở kiểm ở **code**, không `CHECK` liệt kê. Không xoá cứng: `valid_from/to` hoặc `active = 0`; khoá ngoại `NO ACTION`.
+ - Tên bảng số ít (trừ `orders`); bảng mới có tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_`, `mnt_`, `fbk_`, `aut_`, sau này `bil_`); tra cứu dùng khoá mã `TEXT code`. Danh sách giá trị mở kiểm ở **code**, không `CHECK` liệt kê. Không xoá cứng: `valid_from/to` hoặc `active = 0`; khoá ngoại `NO ACTION`.
```

## Cách áp (chủ dự án hoặc một phiên được chủ giao việc "áp đề xuất này")

Không có gì để chạy — chỉ sửa bốn dòng văn bản ở hai tệp bằng tay (hoặc `Edit` nếu một phiên AI được chủ giao đúng việc "áp đề xuất đã duyệt"), rồi đọc lại đoạn xung quanh để chắc không lệch dấu `-`/khoảng trắng. Không migration, không test mới cần chạy (đây là sửa tài liệu luật, không sửa mã).
