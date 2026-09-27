# Kế hoạch thi công — Đính kèm ảnh/tệp trong tin thông báo của Toàn quyền

- **Thẩm quyền:** ADR-0041 (accepted 2026-09-28) — thắng mọi điều ở đây nếu lệch. Liên quan: ADR-0034 (tin thủ công, `notice.send`, thu hồi, `nhanThayTinThuCong`), ADR-0036/0039 (màn hình khoá: **không đổi**).
- **Nhánh:** `worktree-thong-bao-he-thong`. **Trước Task 1:** gộp `main` vào nhánh (main có `0027_v_stf_toan_quyen.sql`, nhánh mới tới `0026`). Số phiên bản nhật ký thay đổi: **chốt khi phát hành** (tệp `src/shared/changelog.ts` đang có phiên khác sửa — không đụng trong các task).
- **Lỗ đang hở:** `docs/quyen-hoan.json` → `phat_hien: []` (rà 2026-09-28) — không xây trên lỗ nào.
- **Migration:** số kế tiếp **0028** (lớn nhất trên mọi nhánh: `0027`, kiểm `git log --all --diff-filter=A --name-only -- 'migrations/00[23]*'`). Kiểm lại ngay lúc thi công.
- **Chung mọi task:** test đỏ trước → xanh; `npm test` + `npm run typecheck` 0 lỗi; chạm API/migration thì `npm run test:e2e`. Không dependency runtime. Nhật ký không ghi tên tệp (có thể chứa tên người), chỉ **số tệp**.

## Giả định tự áp từ ADR (ghi lại, không hỏi)

1. Quyền tải = (người gửi, `created_by = staff.id`) **hoặc** (`nhanThayTinThuCong(staff, tags)` và không phải người gửi), **và** tin chưa thu hồi (`valid_to IS NULL`). Không áp cửa sổ 30 ngày của hộp — ADR định nghĩa luật bằng ngoặc đơn "cùng luật `nhanThayTinThuCong`, tin chưa thu hồi".
2. Thu hồi khoá cả người gửi (ADR điều 3 nói chung "tệp không tải được nữa").
3. Mọi trường hợp không được tải → **404** (không lộ tin/tệp tồn tại).
4. Loại tệp: nội dung quyết định, **đuôi thu hẹp**: nội dung văn bản chỉ nhận khi đuôi `.txt`/`.md`; đuôi ảnh/PDF/DOC/DOCX phải mang đúng chữ ký. (Nếu không, tệp `.pdf` chứa HTML sẽ lọt thành TXT.)
5. DOC (`D0 CF 11 E0 A1 B1 1A E1`) không phân biệt được với XLS/PPT cũ — **giới hạn chấp nhận**, ghi ở chú thích mã.
6. Tệp quá cỡ → **413**; quá 5 tệp / sai loại / multipart hỏng → **400**.
7. Popup "Tin quan trọng" dùng chung phần vẽ tin → cũng hiện tệp (bề mặt, đảo ngược được).
8. HEIC chỉ xem trước được trên Safari/iPhone; trình duyệt khác `<img onerror>` → đổi sang nút tải (bề mặt).

## Câu hỏi chờ chủ (một câu, KHÔNG chặn Task 1–2 — mặc định chặt theo ADR)

- **Q1.** Màn "Đã gửi" hiện tin của **mọi** Toàn quyền (và ai có `notice.send` cũng thu hồi được tin người khác), nhưng ADR-0041 chỉ cho **người gửi** tải. Toàn quyền khác (không thuộc nhóm nhận) có được tải tệp từ "Đã gửi" không? Mặc định: **không** (404, nút tải chỉ hiện với tin của chính mình). Đổi sang "có" = một dòng điều kiện + một test e2e.

---

## Task 1 — Dữ liệu + hạ tầng + luật thuần nhận biết tệp  ⚠ VIỆC LỚN (dữ liệu, hạ tầng)

**Tệp chạm:** `migrations/0028_ntf_attachment.sql` (mới), `wrangler.jsonc`, `worker-configuration.d.ts`, `src/shared/tep-dinh-kem.ts` + `.test.ts` (mới), `src/shared/contracts.ts` (thêm `TepDto`), `docs/data-dictionary.json` → `npm run dict`.

**Việc làm**
- Bảng `ntf_attachment` (chủ: module `thongbao`): `id TEXT PK`, `notice_id TEXT NOT NULL REFERENCES ntf_notice(id)`, `ten TEXT CHECK length 1..200`, `loai TEXT CHECK IN ('jpg','png','heic','pdf','doc','docx','txt','md')`, `dung_luong INTEGER CHECK 1..10485760`, `thu_tu INTEGER CHECK 0..4`, 4 cột dấu vết; `UNIQUE(notice_id, thu_tu)`; trigger chặn UPDATE/DELETE (chỉ-thêm, như `ntf_ack`). Khoá R2 **không lưu** — suy ra `ntf/<notice_id>/<id>`.
- `wrangler.jsonc`: `"r2_buckets": [{ "binding": "TEP", "bucket_name": "tourdao-sales-tep" }]`. `worker-configuration.d.ts`: thêm tay `TEP: R2Bucket` (**bẫy:** `npm run types` khi thiếu `.dev.vars` làm mất `SESSION_SECRET`).
- `TepDto { id; ten; loai; dungLuong; laAnh }`.
- `src/shared/tep-dinh-kem.ts`: `TOI_DA_TEP = 5`, `TOI_DA_BYTE = 10 * 1024 * 1024`, `nhanLoaiTep(ten, dau, toanBo?)`, `chuanHoaTenTep(ten)` (bỏ đường dẫn, ký tự điều khiển, CR/LF, `"`; cắt 200 ký tự; rỗng → `tep`), `loaiNoiDung(loai)` (MIME phục vụ), `xemTaiCho(loai)` (jpg/png/heic).

**Mã mẫu (phần dễ sai):**
```ts
const bat = (b: Uint8Array, sig: number[], o = 0) => sig.every((x, i) => b[o + i] === x);
const ascii = (b: Uint8Array, s: number, e: number) => String.fromCharCode(...b.subarray(s, e));
const HEIF = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
// dau = 16 byte đầu; toanBo chỉ cần cho docx (tìm "word/") và txt/md (UTF-8) — gọi file.arrayBuffer() đúng hai trường hợp đó.
export function nhanLoaiTep(ten: string, dau: Uint8Array, toanBo?: Uint8Array): LoaiTep | null {
  const duoi = ten.toLowerCase().split(".").pop() ?? "";
  if (["jpg", "jpeg"].includes(duoi)) return bat(dau, [0xff, 0xd8, 0xff]) ? "jpg" : null;
  if (duoi === "png") return bat(dau, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? "png" : null;
  if (["heic", "heif"].includes(duoi)) return ascii(dau, 4, 8) === "ftyp" && HEIF.has(ascii(dau, 8, 12)) ? "heic" : null;
  if (duoi === "pdf") return ascii(dau, 0, 5) === "%PDF-" ? "pdf" : null;
  if (duoi === "doc") return bat(dau, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ? "doc" : null; // cũng khớp XLS/PPT: giới hạn chấp nhận
  if (duoi === "docx") return bat(dau, [0x50, 0x4b, 0x03, 0x04]) && !!toanBo && coChuoi(toanBo, "[Content_Types].xml") && coChuoi(toanBo, "word/") ? "docx" : null;
  if (duoi === "txt" || duoi === "md") {
    if (!toanBo || toanBo.includes(0)) return null;
    try { new TextDecoder("utf-8", { fatal: true }).decode(toanBo); } catch { return null; }
    return duoi;
  }
  return null; // đuôi khác (kể cả .html/.svg) → từ chối
}
```

**Test đỏ trước** (`tep-dinh-kem.test.ts`): mỗi loại một ca đúng; `.pdf` nội dung `<html>` → null; `.txt` có byte 0 → null; `.txt` UTF-8 hỏng (`0xC3 0x28`) → null; `.docx` là zip không có `word/` (xlsx) → null; `.svg`/`.html` → null; `.jpeg` hoa `ẢNH.JPG` → jpg; `chuanHoaTenTep("../a\r\n\"b.pdf")` không còn `/`, CR, LF, `"`; tên tiếng Việt giữ nguyên dấu.

**Nghiệm thu:** `npm run db:migrate:local` áp 0028 sạch; `UPDATE ntf_attachment …` bị trigger chặn; test thuần xanh; `docs/DATA-DICTIONARY.md` có `ntf_attachment`; `npm run typecheck` 0 lỗi.
**Lệnh:** `node --test src/shared/tep-dinh-kem.test.ts && npm test && npm run typecheck && npm run db:migrate:local`

---

## Task 2 — Máy chủ: gửi kèm tệp, tải tệp, DTO, e2e  ⚠ VIỆC LỚN (quyền + dữ liệu)

**Tệp chạm:** `src/modules/thongbao/index.ts`, `repository.ts`, `src/shared/contracts.ts` (`TinDto.tep: TepDto[]`, `TinDaGuiDto.tep: TepDto[]`), `src/route-access.test.ts` (ảnh chụp thêm route mới), `tests/e2e/thongbao.mjs`, `docs/SYSTEM-DESIGN.md` (bảng API).

**Việc làm**
- `POST /api/thong-bao` (giữ `"admin"` + `if (!can(staff, "notice.send")) return FORBIDDEN()` đứng **đầu** thân — luật (4) của `route-write-guard`):
  - `content-type` là `multipart/form-data` → `request.formData()`; trường `du-lieu` = JSON của `GuiThongBaoRequest` (qua `kiemTinThuCong`), trường `tep` lặp lại. Còn lại → `readJson` như cũ (không phá giao diện cũ đang cache).
  - `Content-Length` > `5 × 10MB + 1MB` → 413 **trước** khi parse. Mỗi tệp: `size > TOI_DA_BYTE` → 413; > 5 tệp / sai loại / `size = 0` → 400 (lời tiếng Việt nêu tên tệp lỗi).
  - Chỉ đọc `file.slice(0,16)` cho loại nhị phân; đọc cả tệp chỉ cho docx/txt/md. `env.TEP.put(key, file, { httpMetadata: { contentType } })` truyền thẳng `File`, không chép thêm buffer.
- **Thứ tự gửi (mã mẫu):**
```ts
// kiểm hết → findByRequest (bấm hai lần tuần tự: trả id cũ, KHÔNG đặt R2) → đặt R2 → batch D1 → gỡ R2 khi lỗi/thua → gõ cửa khi thắng
const cu = await findByRequest(env.DB, staff.id, req); if (cu) return json({ id: cu }, 200);
const id = crypto.randomUUID(), keys = teps.map((t) => `ntf/${id}/${t.id}`);
try { await Promise.all(teps.map((t, i) => env.TEP.put(keys[i]!, t.file, { httpMetadata: { contentType: loaiNoiDung(t.loai) } }))); }
catch (e) { await goR2(env, keys); ghiLoi(e); return error(500, "internal", "Không tải tệp lên được, thử lại."); }
try { await env.DB.batch([insertNotice…, ...targets, ...teps.map((t, i) => insertTepStatement(env.DB, id, t, i, at, staff.id)), audit…]); }
catch (e) { await goR2(env, keys); throw e; }                 // ADR-0041 điều 2: tệp mồ côi không có dữ liệu nghiệp vụ
const win = await findByRequest(env.DB, staff.id, req);
if (win !== id) await goR2(env, keys);                       // bên thua đồng thời: tin 0 dòng → tệp của nó cũng 0 dòng → gỡ R2
```
  - `insertTepStatement` **phải có điều kiện** `INSERT … SELECT … WHERE EXISTS (SELECT 1 FROM ntf_notice WHERE id = ?1)` — nếu INSERT thường, bên thua vấp khoá ngoại → cả batch lỗi → trả 500 thay vì 200 với id bên thắng.
  - `goR2` = `env.TEP.delete(keys)` bọc `catch` (chỉ log tên lỗi). Audit `notice_sent` detail: `"<n> nhóm nhận, <m> tệp"` — không tên tệp.
- `GET /api/thong-bao/:id/tep/:tepId` — access **`"staff"`** (người nhận có thể là Đối tác). `UUID_RE` cả hai id; tra tin + tệp một câu; luật ở "Giả định 1"; mọi từ chối → `NOT_FOUND()`. **Hàng rào:** luật (1b)/(4) không phủ GET `"staff"` → kiểm quyền ở thân route này **dựa vào kỷ luật + e2e**, ghi rõ ở chú thích route.
```ts
const tenAscii = t.ten.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
return new Response(obj.body, { headers: {
  "content-type": loaiNoiDung(t.loai),                        // từ D1, không tin R2/trình duyệt; txt/md = "text/plain; charset=utf-8"
  "content-disposition": `${xemTaiCho(t.loai) ? "inline" : "attachment"}; filename="${tenAscii}"; filename*=UTF-8''${encodeURIComponent(t.ten)}`,
  "x-content-type-options": "nosniff", "cache-control": "private, no-store", "content-security-policy": "default-src 'none'; sandbox",
} });
```
  - Không có đối tượng trong R2 (lệch) → 404 + một dòng log tên lỗi.
- `hop()` và `GET /api/thong-bao/da-gui`: một truy vấn `listTep(db, ids)` cho cả danh sách tin (không N+1), gắn `tep` (thứ tự `thu_tu`). Tin về đơn: `tep: []`. `tom-tat`, `moi-nhat`, Web Push: **không đổi**.

**Test đỏ trước (e2e `tests/e2e/thongbao.mjs`, wrangler dev mô phỏng R2 ở máy):**
1. Toàn quyền gửi tin nhóm `quyen:FIELD` kèm 1 PNG + 1 PDF → 201; HDV thấy `tep` 2 mục trong `/api/thong-bao`; tải PNG → 200, `inline`, `image/png`, `nosniff`, `no-store`, byte khớp; PDF → `attachment`.
2. Tài khoản ngoài nhóm (vd Kế toán thuần) tải → 404. Người gửi tải → 200. (Q1) Toàn quyền khác không thuộc nhóm → 404.
3. Thu hồi tin → HDV tải → 404; người gửi tải → 404.
4. Tệp `gia.pdf` nội dung `<html><script>` → 400; `a.svg` → 400; 6 tệp → 400; một tệp 10MB+1 byte → 413. Sau mỗi lần từ chối: không tin mới trong `da-gui`.
5. Gửi lại cùng `clientRequestId` kèm tệp → 200 cùng id, số tệp của tin vẫn 2.
6. Gửi JSON cũ (không tệp) → 201, `tep: []` (tương thích).
7. `audit-invariants --db local` cuối kịch bản đạt.

**Nghiệm thu:** 7 ca trên xanh; `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/architecture.test.ts` xanh (chỉ `thongbao` dùng `env.TEP` và ghi `ntf_attachment`); log không chứa tên tệp.
**Lệnh:** `npm test && npm run typecheck && npm run test:e2e -- thongbao`
**Người kiểm độc lập** (subagent `nguoi-kiem-doc-lap`, chỉ đọc) **sau Task 2, phủ cả Task 1 + 2**: đọc migration, luật tải, thứ tự R2→D1, header; chạy lại lệnh; thử cố ý bỏ điều kiện `valid_to` → e2e ca 3 phải đỏ → hoàn nguyên.

---

## Task 3 — Giao diện: chọn tệp khi gửi, xem/tải khi đọc  (việc thường: test + tóm tắt)

**Tệp chạm:** `web/gui-thong-bao.ts`, `web/thong-bao-ui.ts`, `web/thong-bao-logic.ts` (+ test nếu thêm luật thuần), `web/api.ts`, `public/app.css` (token), `src/shared/sw-policy.test.ts`; ảnh `docs/evidence/thong-bao/dinh-kem-*.png`.

**Việc làm**
- `api.ts`: `body instanceof FormData` → gửi thẳng, **không** đặt `content-type` (trình duyệt tự thêm boundary).
- Trang Gửi thông báo: nút "Đính kèm ảnh/tệp" (`<input type=file multiple accept=".jpg,.jpeg,.png,.heic,.pdf,.doc,.docx,.txt,.md">`, ẩn sau nút); danh sách tệp đã chọn: tên + dung lượng ("1,2 MB") + nút "Bỏ" từng tệp; chặn phía máy (chỉ để báo sớm, máy chủ vẫn quyết): > 5 tệp → "Tối đa 5 tệp mỗi tin."; > 10MB → "«tên» lớn hơn 10 MB."; đuôi lạ → "«tên» không thuộc loại được gửi (ảnh JPG/PNG/HEIC, PDF, DOC, DOCX, TXT, MD)." Có tệp → gửi `FormData` (`du-lieu` + `tep`); không tệp → JSON như cũ. Lỗi 400/413 từ máy chủ hiện nguyên câu tiếng Việt. Màn "Đã gửi": tên tệp + nút tải (Q1: chỉ tin của chính mình).
- Hộp đọc tin (và popup Tin quan trọng): ảnh → `<img loading=lazy src=/api/thong-bao/<id>/tep/<tepId>>` bấm để mở cỡ lớn; `onerror` (HEIC ngoài Safari) → đổi thành dòng tải. Tệp khác → biểu tượng + tên + dung lượng + nút "Tải về" (`<a href download>`). Dựng bằng `h()`, không `innerHTML`; CSS qua token.
- `sw-policy.test.ts`: thêm ca `routeFor("<origin>/api/thong-bao/<id>/tep/<id>")` = `"pass"` (tệp không bao giờ vào cache service worker).

**Nghiệm thu:** Kịch bản Chrome (wrangler dev local): Toàn quyền chọn 1 PNG + 1 PDF + bỏ 1 tệp → gửi; chọn tệp 11MB → thấy lời báo, không gửi; HDV mở hộp → thấy ảnh xem trước + nút tải PDF, tải được; sau thu hồi → tin biến mất khỏi hộp. Ảnh: `dinh-kem-chon-tep.png`, `dinh-kem-loi-qua-co.png`, `dinh-kem-hop-doc.png`, `dinh-kem-da-gui.png` (trang của tài khoản nào mở SAU CÙNG — kho cookie chung). Ô chọn/nút cỡ chữ ≥ 16px.
**Lệnh:** `npm test && npm run typecheck && npm run build:web` + kịch bản Chrome.

---

## Task 4 — Tài liệu + lệnh cho chủ + thứ tự triển khai  (việc thường; phần triển khai do người kiểm Task 2 đọc lại)

**Tệp chạm:** `docs/SYSTEM-DESIGN.md` (§5 bảng mới, §7 route mới, §8 quyền tải), `docs/CHANGE-GUIDE.md` (công thức "thêm tệp đính kèm / binding R2", bẫy: local R2 tự mô phỏng, production cần bucket có sẵn), `docs/HANDOFF-N1.md` (runbook lần phát hành này), nhật ký thi công của kế hoạch này.

**Thứ tự triển khai cho chủ (bucket TRƯỚC mã — thiếu bucket thì `wrangler deploy` hỏng):**
1. Ở thư mục repo gốc `tourdao-sales` (sau khi đã `npm run day-len -- worktree-thong-bao-he-thong`):
```
npx wrangler r2 bucket create tourdao-sales-tep
```
2. Kiểm (chỉ đọc) bucket đã có:
```
npx wrangler r2 bucket list
```
3. Triển khai như thường (áp `0028` + deploy + hai cổng phiên bản):
```
npm run trien-khai
```
4. Sau deploy: Toàn quyền gửi thử một tin nhóm nhỏ kèm 1 ảnh + 1 PDF, người nhận mở trên iPhone thật; thu hồi tin thử.

**Hoàn tác:** lùi Worker về bản trước vẫn chạy được (bảng `ntf_attachment` và bucket chỉ thêm, mã cũ không đọc). Tệp của tin thu hồi nằm lại trong kho (ADR-0041, không xoá cứng).

**Nghiệm thu:** tài liệu mô tả khớp mã (route, bảng, header); runbook có đúng 3 lệnh trên theo thứ tự; `npm test` xanh (các test đối chiếu tài liệu nếu có).
