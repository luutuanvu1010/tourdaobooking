# Kế hoạch thi công — Thông báo lượt 2: Web Push màn hình khoá

- **Nhánh làm việc:** `worktree-thong-bao-he-thong` (nhánh hiện tại, worktree `.claude/worktrees/thong-bao-he-thong`). Số phiên bản nhật ký thay đổi: **chốt khi phát hành**.
- **Thẩm quyền:** ADR-0036 (accepted) thắng đặc tả `docs/superpowers/specs/2026-09-27-thong-bao-he-thong-design.md` §9 ở điểm "mọi tài khoản". ADR-0034 (nguồn tin, ngăn "Của tôi"), ADR-0022 (Bảng tin, `BangTin`).
- **Lỗ đang hở:** `docs/quyen-hoan.json` → `phat_hien: []` (rà 2026-09-27) — không xây trên lỗ nào.

## Mục tiêu
Máy đã bật (iPhone đã cài app / Android / máy tính) rung ở màn hình khoá khi có tin mới thuộc ngăn **"Của tôi"**; mọi tài khoản đang hoạt động (kể cả Đối tác) tự bật/tắt ở trang Tài khoản.

## Kiến trúc (3 câu)
1. Máy tự đăng ký địa chỉ nhận vào `ntf_push_sub` (module `thongbao`); máy chủ chọn người nhận bằng **chính `locHopThongBao`** (không luật quyền mới) rồi gửi **cú gõ cửa không nội dung** ký VAPID ES256 bằng Web Crypto.
2. Service worker nhận cú gõ, tự hỏi `GET /api/thong-bao/moi-nhat` bằng phiên của máy, hiện câu của tin mới nhất (hỏi hỏng → câu chung).
3. ≤ 40 máy gửi thẳng trong `waitUntil`; > 40 máy giao `BangTin` (DO đã có) chia lô 40 bằng alarm; tự tắt đặt cùng chỗ `dongBangTin`.

## Ràng buộc chung
- Không dependency runtime; ký bằng `crypto.subtle` (có ở Worker và Node 22 → test thuần chạy được).
- Không lưu khoá mã hoá của máy, không gửi nội dung; không xoá cứng (hết hiệu lực = `revoked_at`).
- Không ghi SĐT/email/endpoint vào log — chỉ mã trạng thái / tên lỗi.
- Giờ VN chỉ qua `src/shared/vn-date.ts` (không thêm hằng +7 thứ hai).
- Không đổi ô nào của `MATRIX`; hai POST mới dưới `/api/account/` là "ngoại lệ" tự phục vụ trong `docs/quyen-hoan.json`.
- Không đổi `ALLOWED_EDGES` (không nới hàng rào — Điều 9.4): `thongbao` với tới `BangTin` qua hàm **tiêm** ở gốc lắp ráp (khuôn `baoThayDoi`/`dongBangTin`).
- `bangtin` giữ hạng KHONG_DB: DO không đụng D1.
- Mọi task: test đỏ trước → xanh; `npm test` + `npm run typecheck` 0 lỗi; chạm API/migration thì chạy e2e.

## Rủi ro chính
- **iOS thật chưa có văn bản** cho: cookie phiên trong service worker của app đã cài; thân rỗng được Apple nhận → chỉ biết khi thử máy thật (Task 5).
- **Một báo thức cho hai việc** trong DO (đóng kết nối quá hạn + chia lô) — sai là Bảng tin ngừng đóng kết nối cũ hoặc lô treo.
- **Bẫy kiểu `Env`:** `VAPID_PRIVATE_KEY` là bí mật tuỳ chọn → `npm run types` không sinh nếu `.dev.vars` thiếu; thêm tay vào `worker-configuration.d.ts` như `BANG_TIN_HAN_GIAY`.
- **Đổi cặp khoá = mọi địa chỉ cũ chết** (máy phải bật lại) — không xoay khoá tuỳ tiện.
- **Đăng xuất** là route công khai, không đọc phiên → huỷ địa chỉ lúc đăng xuất **dựa vào kỷ luật phía trình duyệt** (Task 4). Lỡ thì máy vẫn rung nhưng SW nhận 401 → chỉ hiện câu chung, không lộ nội dung.

## Lệch có ghi so với đặc tả §9 (Task 5 sửa đặc tả/tài liệu mô tả cho khớp)
- Đối tác đăng ký được (200), không 403 — ADR-0036 điểm 1 (tiêu chí §9.4 số 6 đảo ngược).
- Đường dẫn: `/api/account/thong-bao/may` (GET/POST), `/api/account/thong-bao/may/huy` (POST) — hàng rào `route-write-guard` chỉ nhận "ngoại lệ" dưới `/api/account/`.
- SW hỏi route riêng `GET /api/thong-bao/moi-nhat`, **không** thêm trường vào `tom-tat` (giữ hợp đồng tom-tat đang dùng ở mọi lần tải trang).
- Tự tắt cũng xảy ra khi thêm/gỡ Face ID (các chỗ đang gọi `dongBangTin` ở `src/modules/accounts/index.ts` ~dòng 255, 270, 302, 633) — rộng hơn danh sách ADR, an toàn, người dùng bật lại được. Không hỏi thêm.
- Bật chế độ bảo trì (`dongBangTin("tat-ca")`) **không** tắt địa chỉ (không có trong danh sách ADR).

---

## Task 1 — Dữ liệu + route máy (VIỆC LỚN: dữ liệu + quyền → người kiểm độc lập)

**Tệp chạm:** `migrations/0026_thong_bao_may.sql` (mới; số đã kiểm: lớn nhất là `0025`, 0019 giữ cho B5, không nhánh nào có `0026+`), `src/modules/thongbao/repository.ts`, `src/modules/thongbao/index.ts`, `src/shared/contracts.ts`, `src/shared/web-push.ts` (mới — chỉ `kiemDiaChi` ở task này), `docs/quyen-hoan.json`, `docs/data-dictionary.json` + `npm run dict`, `tests/e2e/thongbao.mjs`.

**Việc làm**
```sql
-- 0026 — Thông báo lượt 2 (ADR-0036): địa chỉ nhận thông báo màn hình khoá của từng máy. Chỉ THÊM.
CREATE TABLE ntf_push_sub (
  id            TEXT PRIMARY KEY,
  staff_id      TEXT NOT NULL,                                   -- chủ máy (không khoá ngoại, như ntf_ack)
  endpoint      TEXT NOT NULL CHECK (length(endpoint) BETWEEN 1 AND 1024),
  thiet_bi      TEXT NOT NULL CHECK (length(thiet_bi) BETWEEN 1 AND 40),
  revoked_at    TEXT,                                            -- NULL = đang bật
  revoke_reason TEXT,                                            -- tu-tat | dang-xuat | tai-khoan-doi | het-han | doi-tai-khoan (chữ tự do, không CHECK liệt kê)
  created_at TEXT NOT NULL, created_by TEXT, updated_at TEXT NOT NULL, updated_by TEXT
);
CREATE UNIQUE INDEX ntf_push_sub_endpoint_uq ON ntf_push_sub(endpoint) WHERE revoked_at IS NULL;
CREATE INDEX ntf_push_sub_staff_ix ON ntf_push_sub(staff_id) WHERE revoked_at IS NULL;
```
- `repository.ts` (qua `defineSql`, không DELETE/OR REPLACE): `listMayDangBat(db)` → `{staff_id, endpoint}[]`; `demMay(db, staffId)`; `batMayStatements(db, {id, staffId, endpoint, thietBi, at})` = [huỷ dòng đang bật cùng endpoint của **người khác** (lý do `doi-tai-khoan`, máy dùng chung), `INSERT … SELECT … WHERE NOT EXISTS (endpoint đang bật)`]; `tatMayStatement(db, staffId, endpoint | null, lyDo, at)` (chỉ dòng của `staffId`; `null` = mọi máy); `hetHanStatement(db, endpoints[], at)` (lý do `het-han`).
- `web-push.ts`: `kiemDiaChi(raw)` — `https:` + máy chủ thuộc danh sách dịch vụ đẩy (`*.push.apple.com`, `fcm.googleapis.com`, `*.notify.windows.com`, `updates.push.services.mozilla.com`), dài ≤ 1024; ngoài danh sách → từ chối (máy chủ sẽ POST tới địa chỉ này — chặn dùng làm bàn đạp gọi nơi khác).
- Route (module `thongbao`, cổng `staff`, id luôn lấy từ phiên):
  - `GET /api/account/thong-bao/may` → `{ khoa: string | null, soMay: number }` — `khoa` = `env.VAPID_PUBLIC_KEY` chỉ khi **cả hai** khoá có mặt, không thì `null`.
  - `POST /api/account/thong-bao/may` thân `{ endpoint, thietBi }` → 400 nếu sai; 200 `{ ok: true }` (bật lại cùng máy = không đổi gì).
  - `POST /api/account/thong-bao/may/huy` thân `{ endpoint }` hoặc `{ tatCa: true }` → 200 (lý do `tu-tat` / `dang-xuat` khi `tatCa`).
  - `GET /api/thong-bao/moi-nhat` → `{ tin: { cau, lienKet } | null }` = tin **chưa đọc** đầu tiên của `hop(db, staff, "cua-toi")` (hàm có sẵn trong `thongbao/index.ts`) — không trả gì khác hộp đã trả.
- Kiểu phản hồi mới trong `contracts.ts` (`MayThongBaoResponse`, `MoiNhatResponse`).
- `docs/quyen-hoan.json`: thêm 2 mục `"loai": "ngoại lệ"` cho hai POST (lý do: tự phục vụ địa chỉ máy của chính mình, ADR-0036 điều 1–2). GET không cần.

**Test đỏ trước**
- `src/shared/web-push.test.ts`: `kiemDiaChi` nhận địa chỉ Apple/FCM thật dạng mẫu; từ chối `http:`, `https://example.com/…`, `https://evil.push.apple.com.example.com/…`, chuỗi > 1024.
- `src/architecture.test.ts` (đã có) phải xanh với bảng mới: 4 cột dấu vết, tiền tố `ntf_` thuộc `thongbao`.
- `src/route-write-guard.test.ts` (đã có): **đỏ** khi mới thêm route mà chưa có mục "ngoại lệ" → thêm mục → xanh.
- `tests/e2e/thongbao.mjs` thêm ca: (a) chưa đăng nhập → 401; (b) POST không `Origin` → 403; (c) tài khoản **chỉ Đối tác** đăng ký → 200, `soMay` = 1; (d) cùng endpoint đăng ký lại → `soMay` vẫn 1; (e) tài khoản B đăng ký cùng endpoint → `soMay` của A = 0; (f) `huy {tatCa:true}` → `soMay` = 0; (g) endpoint `https://example.com/x` → 400; (h) `moi-nhat` sau khi Toàn quyền gửi tin cho nhóm của người đó → `tin.cau` = tiêu đề; sau `da-doc` → `tin: null`.

**Nghiệm thu:** 8 ca e2e trên xanh; `npm test`, `npm run typecheck` 0 lỗi; `node scripts/audit-invariants.mjs --db local` thoát 0; bảng có mặt trong `docs/DATA-DICTIONARY.md`.
**Lệnh kiểm:** `node --test src/shared/web-push.test.ts` · `npm test` · `npm run typecheck` · `npm run db:migrate:local` · `npm run test:e2e -- thongbao`

---

## Task 2 — Luật thuần + ký VAPID (`src/shared/web-push.ts`)

**Tệp chạm:** `src/shared/web-push.ts`, `src/shared/web-push.test.ts`, `src/shared/vn-date.ts` (+ test cạnh).

**Việc làm**
- `vn-date.ts`: `vnHour(now: Date): number` (dùng `VN_OFFSET_MS` có sẵn).
- `web-push.ts`:
  - `trongGioYenLang(now)` = giờ VN ≥ 22 hoặc < 6; `nenGui(quanTrong, now)` = `quanTrong || !trongGioYenLang(now)`.
  - `hanhDongCuaThayDoi(t: ThayDoiDon)`: `tao`/`tao_cho_nhan` → `created`, `nhan` → `order_claimed`, `giao` → `order_handler_changed`, `xac_nhan` → `confirmed`, `huy` → `cancelled`; `sua`/`chuyen`/`tien` → `null` (không phải tin của hộp → không rung).
  - `nguoiNhanDay(taiKhoan: PermissionHolder[], tin: { don: DongDon } | { thuCong: DongThuCong }, now: string): string[]` — với mỗi tài khoản gọi `locHopThongBao(tk, { don, thuCong, docDenLuc: now, now, ngan: "cua-toi" })`, lấy id khi `tin.length > 0`. **Không** tự viết luật ai thấy gì. `luc`/`now` phải là ISO đủ mili-giây (hàm so chuỗi — xem `chuanHoaMocGio`).
  - `chiaLo<T>(ds: T[], co = 40): T[][]`.
  - `taoJwtVapid`, `layJwt` (nhớ trong isolate ≤ 1 giờ theo `aud`), `guiLo` — mẫu dưới.

```ts
const VAPID_SUB = "https://booking.tourdao.vn"; // Apple nhận https: hoặc mailto:
const b64u = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uChu = (s: string) => b64u(new TextEncoder().encode(s));

/** JWT ES256 cho VAPID. `khoaBiMat` = JSON JWK P-256 (kty, crv, x, y, d) — đúng dạng lệnh tạo khoá ở Task 5 in ra. */
export async function taoJwtVapid(khoaBiMat: string, aud: string, nowSec: number): Promise<string> {
  const { kty, crv, x, y, d } = JSON.parse(khoaBiMat) as JsonWebKey; // bỏ key_ops/ext: importKey sẽ ném nếu key_ops lệch usages
  const key = await crypto.subtle.importKey("jwk", { kty, crv, x, y, d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const dau = `${b64uChu(JSON.stringify({ typ: "JWT", alg: "ES256" }))}.${b64uChu(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: VAPID_SUB }))}`;
  const chuKy = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(dau));
  return `${dau}.${b64u(chuKy)}`; // Web Crypto trả r‖s 64 byte (IEEE P1363) = đúng dạng JWS ES256 — KHÔNG đổi sang DER
}

export interface KhoaVapid { congKhai: string; biMat: string }
export const khoaVapid = (env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string }): KhoaVapid | null =>
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY ? { congKhai: env.VAPID_PUBLIC_KEY, biMat: env.VAPID_PRIVATE_KEY } : null;

/** Gõ cửa từng địa chỉ, tối đa 6 kết nối cùng lúc (trần của Worker). Trả địa chỉ nhận 410. Không ném; không log địa chỉ. */
export async function guiLo(ds: string[], khoa: KhoaVapid, nowMs: number, goi: typeof fetch = fetch): Promise<{ hetHieuLuc: string[] }> {
  const het: string[] = [];
  for (const nhom of chiaLo(ds, 6)) {
    await Promise.all(nhom.map(async (ep) => {
      try {
        const jwt = await layJwt(khoa.biMat, new URL(ep).origin, nowMs);
        // Thân rỗng: KHÔNG đặt Content-Length/Content-Encoding bằng tay (Apple: thân rỗng thì bỏ Content-Encoding). Phải thử máy thật.
        const r = await goi(ep, { method: "POST", headers: { TTL: "3600", Urgency: "high", Authorization: `vapid t=${jwt}, k=${khoa.congKhai}` } });
        await r.body?.cancel();
        if (r.status === 410) het.push(ep);
        else if (!r.ok) console.warn(JSON.stringify({ level: "warn", event: "day_loi", ma: r.status }));
      } catch (e) {
        console.warn(JSON.stringify({ level: "warn", event: "day_loi", name: e instanceof Error ? e.name : "unknown" }));
      }
    }));
  }
  return { hetHieuLuc: het };
}
```

**Test đỏ trước** (`src/shared/web-push.test.ts`, `src/shared/vn-date.test.ts`)
- Khoá thử **sinh lúc chạy** bằng `crypto.subtle.generateKey` (không commit khoá bí mật nào, kể cả khoá thử — giữ `git grep` sạch).
- `taoJwtVapid`: 3 phần; header/claims giải ra **đúng** `{typ,alg}` và `{aud, exp: now+43200, sub}`; chữ ký 64 byte; `crypto.subtle.verify` bằng khoá công khai → `true`; sửa một ký tự phần đầu → `false`. (ECDSA ngẫu nhiên → không so chữ ký cố định.)
- Giờ yên lặng: 14:59Z (21:59 VN) gửi; 15:00Z (22:00 VN) không gửi; 22:59Z (05:59 VN) không; 23:00Z (06:00 VN) gửi; tin quan trọng lúc 15:30Z → gửi.
- `hanhDongCuaThayDoi`: đủ 9 giá trị `THAY_DOI`, ba giá trị trả `null`.
- `nguoiNhanDay`: người lập nhận tin "nhận đơn" của người khác; người làm (actor) không nhận; Kế toán chỉ có `order.view` (tin nằm ở "Tất cả") **không** nhận; đơn chưa có người phụ trách → người có `dispatch.claim` nhận; tin thủ công nhóm `quyen:PARTNER` → chỉ Đối tác nhận, người gửi không nhận; tin đã thu hồi → không ai.
- `guiLo` với `goi` giả: header `Authorization` bắt đầu `vapid t=` và chứa `k=<khoá công khai>`, có `TTL`; 201 → không trả; 410 → trả địa chỉ; 404/403/ném lỗi → không trả, không ném; 13 địa chỉ → không lúc nào quá 6 lời gọi chờ cùng lúc.
- `chiaLo([..81], 40)` → cỡ 40, 40, 1.

**Nghiệm thu:** mọi ca trên xanh; `npm run typecheck` 0 lỗi (tệp dùng được cả ở Worker lẫn `node --test`).
**Lệnh kiểm:** `node --test src/shared/web-push.test.ts src/shared/vn-date.test.ts` · `npm test` · `npm run typecheck`

---

## Task 3 — Gửi: móc điểm phát, chia lô DO, 410, tự tắt (VIỆC LỚN: dữ liệu + hợp đồng module → người kiểm độc lập)

**Tệp chạm:** `src/modules/thongbao/index.ts` (+ `repository.ts`), `src/index.ts`, `src/shared/router.ts` (một hàm tiêm mới), `src/modules/bangtin/index.ts`, `src/modules/bangtin/tram.ts`, `worker-configuration.d.ts`, `.dev.vars.example`, `tests/e2e/run.mjs`, `src/shared/router.test.ts`.

**Việc làm**
- `thongbao/index.ts` export `dayGoCua(env, tin, giaoLo)` (gốc lắp ráp import được — gốc không phải module; không module nào import `thongbao`). Thứ tự thoát sớm **trước mọi lần đọc D1**: không có `khoaVapid(env)` → thôi; `!nenGui(quanTrong, now)` → thôi; `listMayDangBat` rỗng → thôi. Rồi: `listStaffAccounts` (lọc `active`) chỉ cho các `staff_id` có máy → `nguoiNhanDay` → địa chỉ của người được chọn → **≤ 40**: `guiLo` thẳng; **> 40**: `giaoLo(ds)` (DO). Gộp `hetHieuLuc` (của `guiLo` hoặc danh sách trễ DO trả về) → `hetHanStatement`.
- **Hàm tiêm mới** `giaoLoDay(env, ds: string[]) => Promise<string[]>` ở `router.ts` (`AppOptions.injected` + `Ctx`, khuôn `dongBangTin`; bản ctx trả `Promise` vì route cần kết quả) — bản thật ở `src/index.ts` gọi `xepHangDay` của `bangtin`; không có binding → trả `[]`. Lý do không thêm cạnh `thongbao → bangtin`: không nới `ALLOWED_EDGES` (Điều 9.4); khuôn tiêm đã có tiền lệ.
- **Tin về đơn** — `src/index.ts`, trong `baoThayDoi` sau `phatDon`: `hanhDongCuaThayDoi(thayDoi)` null → thôi; dựng một `DongDon` (`id: "day"`, `action`, `actorId: actor.id` — dùng `_actor` đang để dành, `tenNguoiLam: null`, `luc: new Date().toISOString()`, `ownerId: ref.staffId`, `phuTrach: handlerSau`, `lapChuaCoNguoi: thayDoi === "tao_cho_nhan"`, `cungLoLap: false`) → `dayGoCua(env, { don, quanTrong: false }, …)`, chạy **độc lập** với `phatDon` (`Promise.allSettled` hoặc hai `try` riêng — DO ném thì vẫn gõ cửa, và ngược lại). Đã ở trong `waitUntil` của router; lỗi vào `bang_tin_loi` như cũ.
- **Tin thủ công** — `POST /api/thong-bao`: chỉ khi vừa ghi mới (`win === id`), `exec.waitUntil(dayGoCua(env, { thuCong, quanTrong }, ctx.giaoLoDay).catch(log))`; `thuCong` dựng từ giá trị vừa ghi (`nhan = tags`, `nguoiGuiId = staff.id`, `thuHoi: false`, `daHieuLuc: null`). Lỗi gửi không đổi phản hồi 201.
- **Tự tắt** — `src/index.ts`: `dongBangTin: (env, muc) => Promise.allSettled([dongCua(env, muc), typeof muc === "object" ? tatMayStatement(env.DB, muc.staffId, null, "tai-khoan-doi", now).run() : null])` — tắt địa chỉ chạy **cả khi không có** `BANG_TIN`; `"tat-ca"` (bảo trì) không tắt; mỗi kết quả `rejected` ghi một dòng `bang_tin_loi` (chỉ `name`) — `allSettled` không được nuốt lỗi router đang ghi. Phủ: đổi PIN, đặt lại PIN, đổi quyền/vai, ngưng, đổi SĐT, Face ID (xem "Lệch có ghi"). `tatMayStatement` cần export từ `thongbao/index.ts`.
- **DO `BangTin`** (`tram.ts`) — sửa chú thích đầu tệp ("không lưu gì ngoài MỘT báo thức" → thêm hàng đợi gõ cửa). `bangtin/index.ts` thêm `xepHangDay(env, ds)` (khuôn `phatDon`). Mẫu:

```ts
const HANG = "day:lo:";   // mỗi khoá một lô ≤ 40 địa chỉ (giá trị nhỏ, dưới mọi trần kích thước)
const HET = "day:het";    // địa chỉ nhận 410 ở lượt DO — trả về cho thongbao ở lần xếp hàng kế (DO không đụng D1: KHONG_DB)

async xepHangDay(ds: string[]): Promise<string[]> {
  const t = Date.now().toString(36).padStart(10, "0");
  const lo: Record<string, string[]> = {};
  chiaLo(ds, 40).forEach((x, i) => { lo[`${HANG}${t}-${String(i).padStart(4, "0")}`] = x; });
  await this.ctx.storage.put(lo);                       // put(object) ≤ 128 khoá/lần: 1.000 máy = 25 khoá
  const bt = await this.ctx.storage.getAlarm();
  if (bt === null || bt > Date.now()) await this.ctx.storage.setAlarm(Date.now());
  const het = (await this.ctx.storage.get<string[]>(HET)) ?? [];
  if (het.length) await this.ctx.storage.delete(HET);
  return het;
}

async alarm(): Promise<void> {
  const ds = this.ctx.getWebSockets();
  const keHoach = keHoachTram(ds.map((ws) => this.xet(ws)), null, Date.now());
  for (const i of keHoach.dong) dong(ds[i]!, MA_QUA_HAN, "het-han");
  let ke = keHoach.baoThucKe;
  try {
    if (await this.guiMotLo()) ke = Math.min(ke ?? Infinity, Date.now() + 1000);
  } catch (e) {
    console.warn(JSON.stringify({ level: "warn", event: "day_loi", viec: "lo", name: e instanceof Error ? e.name : "unknown" })); // không ném: alarm ném là bị gọi lại
  }
  if (ke !== null) await this.ctx.storage.setAlarm(ke);   // đặt cả khi không còn kết nối nào
}

/** Gửi MỘT lô; true = còn lô sau. Xoá lô TRƯỚC khi gửi: hỏng giữa chừng thì lỡ (N4 cho phép), không gửi lặp vô hạn. */
private async guiMotLo(): Promise<boolean> {
  const ds = await this.ctx.storage.list<string[]>({ prefix: HANG, limit: 2 });
  const dau = [...ds][0];
  if (!dau) return false;
  await this.ctx.storage.delete(dau[0]);
  const khoa = khoaVapid(this.env);
  if (khoa) {
    const { hetHieuLuc } = await guiLo(dau[1], khoa, Date.now());
    if (hetHieuLuc.length) await this.ctx.storage.put(HET, [...((await this.ctx.storage.get<string[]>(HET)) ?? []), ...hetHieuLuc].slice(-500));
  }
  return ds.size > 1;
}
```
- Kiểu `Env`: `VAPID_PUBLIC_KEY?: string` (sẽ có trong `vars` — Task 5) và `VAPID_PRIVATE_KEY?: string` thêm **tay** vào `worker-configuration.d.ts` kèm chú thích như `BANG_TIN_HAN_GIAY`; `.dev.vars.example` thêm hai dòng trống kèm hướng dẫn: đặt **cả hai** `VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY` (`.dev.vars` đè `vars` — chỉ đặt bí mật thì khoá công khai production đi cặp khoá bí mật local → mọi lần gửi 403); JWK bọc trong nháy đơn.
- `tests/e2e/run.mjs`: ép `"--var", "VAPID_PUBLIC_KEY:"` và `"--var", "VAPID_PRIVATE_KEY:"` (rỗng) như cách đặt `BANG_TIN_HAN_GIAY` — e2e không phụ thuộc `.dev.vars` của máy và **không bao giờ** gọi dịch vụ đẩy thật với địa chỉ giả của Task 1.

**Test đỏ trước**
- `src/shared/router.test.ts`: `giaoLoDay` được chuyển vào `ctx`; thiếu hàm tiêm → lỗi kiểu (typecheck) — theo khuôn ca `dongBangTin` có sẵn.
- `src/architecture.test.ts` (có sẵn) xanh **không sửa**: `bangtin` vẫn KHONG_DB, `ALLOWED_EDGES` không đổi, `tram.ts` chỉ `src/index.ts` import.
- Luật chọn người/giờ/chia lô đã khoá ở Task 2. Phần vỏ (`tram.ts`, `dayGoCua`) không chạy được dưới `node --test` → kiểm bằng e2e.
- `tests/e2e/thongbao.mjs`: (a) A đăng ký máy → A đổi PIN → **thăm dò** `GET …/may` tới 3 giây → `soMay` = 0 (tắt chạy trong `waitUntil` sau phản hồi); (b) Toàn quyền ngưng tài khoản B có máy → bật lại B → `soMay` = 0; (c) bật bảo trì rồi tắt → `soMay` **không** đổi; (d) gửi tin thủ công / lập đơn khi e2e **không có khoá VAPID** → 201 như cũ, không dòng `day_loi` (thoát sớm).

**Nghiệm thu:** ca e2e trên xanh; toàn bộ e2e cũ (`bangtin`, `thongbao`, `orders`, `dispatch`) vẫn xanh (DO đổi alarm không làm hỏng Bảng tin); `npm test` + typecheck 0 lỗi. Không thử được gửi thật ở e2e (địa chỉ phải thuộc dịch vụ đẩy thật) — gửi thật kiểm ở Task 5.
**Lệnh kiểm:** `npm test` · `npm run typecheck` · `npm run test:e2e -- thongbao bangtin orders dispatch`

---

## Task 4 — Giao diện: nút bật ở Tài khoản, service worker, đăng xuất

**Tệp chạm:** `web/account.ts`, `web/shell.ts` (`logout`), `web/sw/sw.ts`, `public/app.css` (chỉ nếu cần token mới — một trợ lý khác đang sửa tệp này và `web/*`: **gộp sau khi họ xong**, không sửa chồng), `web/push-ui.test.ts` hoặc luật thuần cạnh `src/shared/web-push.ts`.

**Việc làm**
- Trang Tài khoản — mục "Thông báo trên điện thoại" (dựng bằng `h()`, chữ tiếng Việt có dấu):
  - `GET /api/account/thong-bao/may` → `khoa === null` → **ẩn cả mục**.
  - Không có `serviceWorker`/`PushManager`/`Notification`: iPhone chưa cài (không `display-mode: standalone`, không `navigator.standalone`) → "Để nhận thông báo: bấm Chia sẻ → Thêm vào MH chính, rồi mở app từ biểu tượng." ; máy khác → "Trình duyệt này không hỗ trợ thông báo."
  - `Notification.permission === "denied"` → "Bạn đã chặn thông báo. Mở Cài đặt → Thông báo → Tour Đảo Booking để bật lại."
  - Đã có `pushManager.getSubscription()` → "Đang bật trên máy này" + nút "Tắt" (`unsubscribe()` + `POST …/may/huy {endpoint}`).
  - Chưa bật → nút **"Bật thông báo trên điện thoại"**: trong **chính cú chạm** gọi `Notification.requestPermission()` → `reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uSangBytes(khoa) })` → `POST …/may { endpoint, thietBi }` (`thietBi`: "iPhone" / "Android" / "Máy tính" suy từ userAgent — hàm thuần có test).
- `logout()` (`web/shell.ts`): **trước** `/api/auth/logout`: nếu có subscription → `POST …/may/huy {tatCa:true}` + `unsubscribe()`, mỗi bước bọc `catch`, tổng chờ ≤ 2 giây. **Dựa vào kỷ luật** (route đăng xuất công khai không đọc phiên).
- Service worker (mẫu):

```ts
const CAU_CHUNG = "Bạn có thông báo mới";
self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let cau = CAU_CHUNG, lienKet = "/";
    try {
      const r = await fetch("/api/thong-bao/moi-nhat", { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (r.ok) {
        const b = (await r.json()) as MoiNhatResponse;
        if (b.tin) { cau = b.tin.cau; lienKet = b.tin.lienKet ?? "/"; }
      }
    } catch { /* 401, mất mạng, quá giờ → vẫn hiện câu chung: iOS thu hồi quyền nếu một lần đẩy không hiện gì */ }
    await self.registration.showNotification("Tour Đảo", { body: cau, tag: "thong-bao", renotify: true, data: { lienKet }, icon: "/icons/icon-192.png" }); // renotify: cùng tag mà thiếu cờ này thì tin thứ hai thay tin cũ LẶNG LẼ (không rung)
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = (event.notification.data as { lienKet?: string } | null)?.lienKet ?? "/";
  const url = new URL(raw, self.location.origin);
  const dich = url.origin === self.location.origin ? url.href : self.location.origin + "/"; // chỉ mở trang cùng nguồn
  event.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) {
      try { await (c as WindowClient).focus(); await (c as WindowClient).navigate(dich); return; }
      catch { /* navigate() ném với cửa sổ chưa do SW điều khiển; iOS chưa chắc hỗ trợ → rơi xuống openWindow */ }
    }
    await self.clients.openWindow(dich);
  })());
});
```
  (Đường dẫn biểu tượng: dùng đúng tệp đang có trong `PRECACHE`/manifest — tra `src/shared/sw-policy.ts`.)
- Service worker mới chỉ tới máy sau khi người dùng mở app một lần (bẫy như Turnstile) — ghi vào nhật ký thay đổi ở Task 5.

**Test đỏ trước:** luật thuần `thietBiTu(userAgent)` và `b64uSangBytes` (độ dài 65, byte đầu `0x04` với khoá mẫu) ở `src/shared/web-push.test.ts`; `src/shared/sw-policy.test.ts` vẫn xanh (`/api/thong-bao/moi-nhat` → `pass`, không cache).
**Nghiệm thu:** kịch bản Chrome (máy tính, `npm run dev` với khoá local ở `.dev.vars`): bật → trình duyệt hỏi quyền → "Đang bật trên máy này", `soMay` = 1; Toàn quyền ở cửa sổ khác gửi tin cho nhóm đó → Chrome hiện thông báo đúng tiêu đề; bấm → mở đúng trang; bấm "Tắt" → `soMay` = 0; đăng xuất → đăng nhập lại → `soMay` = 0. Không `innerHTML`; ô gõ 16px; typecheck 0 lỗi.
**Lệnh kiểm:** `npm test` · `npm run typecheck` · `npm run build:web` · kịch bản Chrome trên (ảnh vào `docs/evidence/`).

---

## Task 5 — Tài liệu, khoá VAPID, thử iPhone thật (VIỆC LỚN: triển khai + bí mật → người kiểm độc lập kiểm tài liệu/lệnh; chủ tự chạy lệnh)

**Tệp chạm:** `wrangler.jsonc` (`vars.VAPID_PUBLIC_KEY`), `docs/SYSTEM-DESIGN.md` (§5 bảng, §7 route, §9 SW), `docs/CHANGE-GUIDE.md` (công thức "Web Push": khoá, bẫy kiểu `Env`, bẫy SW), đặc tả §9 (ghi "Lệch có ghi" ở trên thành dòng lịch sử — tài liệu mô tả, không đổi quyết định), `docs/SO-HANG-RAO.md` (dòng cho `kiemDiaChi`: chặn địa chỉ ngoài dịch vụ đẩy, kèm ngày quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên), mục nhật ký thay đổi (số phiên bản chốt khi phát hành), `docs/HANDOFF-N1.md` (bước triển khai).

**Hướng dẫn chủ tạo khoá** (chạy ở thư mục `tourdao-sales` — checkout `main` đã gộp, KHÔNG phải AI chạy). Một lần chạy sinh **cả cặp**: khoá công khai in ra màn hình, khoá bí mật đi thẳng vào `wrangler secret put`, **không bao giờ hiện**:
```
node -e 'const s=crypto.subtle;s.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]).then(async k=>{const j=await s.exportKey("jwk",k.privateKey);console.error("KHOA CONG KHAI:",Buffer.from(await s.exportKey("raw",k.publicKey)).toString("base64url"));process.stdout.write(JSON.stringify({kty:j.kty,crv:j.crv,x:j.x,y:j.y,d:j.d}))})' | npx wrangler secret put VAPID_PRIVATE_KEY
```
- Chép dòng "KHOA CONG KHAI" vào `vars.VAPID_PUBLIC_KEY` của `wrangler.jsonc` (AI làm trên nhánh khi chủ đưa; khoá công khai không phải bí mật).
- Máy local: cặp **riêng** (bỏ `| npx wrangler …`, chép phần in ra vào `.dev.vars`) — không dùng khoá production ở local.
- **Thứ tự triển khai:** mã + khoá công khai đi cùng lần `npm run trien-khai` (migration 0026 do quy trình áp) → đợi nhân viên mở app một lần (SW mới) → **rồi** chủ chạy lệnh đặt bí mật ở trên. Thiếu bí mật = nút ẩn, không gửi gì, không lỗi.
- **Không xoay khoá** trừ khi lộ: đổi cặp khoá thì mọi máy đã bật phải bật lại.
- Tắt khẩn cấp: `npx wrangler secret delete VAPID_PRIVATE_KEY` (chủ chạy) → hết gửi, nút ẩn; bảng ở lại.

**Kịch bản thử tay trên iPhone thật** (sau khi đặt bí mật; điền kết quả vào nhật ký phát hành):
1. Tài khoản nội bộ A: cài app ra màn hình chính, mở app → Tài khoản → "Bật thông báo trên điện thoại" → cho phép → thấy "Đang bật trên máy này".
2. Khoá màn hình. Toàn quyền gửi tin thường cho nhóm của A (ban ngày) → màn hình khoá hiện **đúng tiêu đề** trong ≤ 1 phút (tiêu chí §9.4-1; đồng thời xác nhận cookie trong SW và thân rỗng được Apple nhận).
3. Người khác lập đơn giao A phụ trách → A rung với câu "… vừa lập đơn mới …"; Kế toán (chỉ ngăn "Tất cả") **không** rung (§9.4-2).
4. Bấm thông báo → app mở đúng trang đơn.
5. A đổi PIN → gửi tin lại → **không** rung (§9.4-4); bật lại được.
6. Đăng xuất A trên máy khác → máy của A không rung nữa, hoặc nếu rung thì chỉ hiện "Bạn có thông báo mới" (§9.4-5).
7. Tài khoản chỉ-Đối-tác: làm bước 1–2 với tin nhóm Đối tác (ADR điểm 1).
8. Gửi hai tin liền nhau, không mở tin đầu → **cả hai** lần đều rung (cờ `renotify`; hành vi iOS chưa kiểm).
9. Sau 22:00 giờ VN: tin thường không rung, tin quan trọng rung (§9.4-3; luật đã khoá bằng test Task 2).
10. `git grep -n "\"d\":"` và `git grep -n VAPID_PRIVATE_KEY` chỉ ra chú thích/tên biến, không ra giá trị khoá (§9.4-7).

**Nghiệm thu:** tài liệu mô tả khớp mã (route, bảng, SW); dòng `SO-HANG-RAO.md` có ngày quan sát; người kiểm độc lập đọc lại lệnh khoá + thứ tự triển khai + tiêu chí; bước 1–10 do chủ/AI ghi kết quả thật (không ghi "đạt" khi chưa thử).
**Lệnh kiểm:** `npm test` · `npm run typecheck` · `npm run test:e2e` (toàn bộ) · `node scripts/audit-invariants.mjs --db local`

---

## Kiểm độc lập (CLAUDE.md §3)
- **Task 1** (bảng mới, route ghi tự phục vụ, mục "ngoại lệ"), **Task 3** (ghi dữ liệu nền, hợp đồng router, DO), **Task 5** (khoá bí mật, triển khai): subagent `nguoi-kiem-doc-lap` chỉ đọc sau khi thi công xong từng task — người thi công không tự nghiệm thu.
- **Task 2, 4:** test xanh + tóm tắt; Task 4 thêm kịch bản Chrome.
