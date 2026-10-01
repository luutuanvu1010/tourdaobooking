# Giao diện công ty (ADR-0087) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn quyền tự chỉnh màu, phông, cỡ chữ, độ đậm của cả app ở màn "Giao diện"; áp cho mọi người ngay, có chặn chữ khó đọc và nút "Về mặc định".

**Architecture:** Lưu một tập GHI ĐÈ token (khoá trong danh sách đóng) ở bảng một dòng `gd_setting` của module mới `giao-dien`. Máy chủ dựng `:root{…}` từ tập đó ở route công khai `GET /api/giao-dien.css`; mọi trang nạp nó bằng thẻ `link` ngay sau `/app.css`. Kiểm hợp lệ (khoá, dạng, khoảng, tương phản) là MỘT tệp thuần `src/shared/giao-dien.ts` dùng chung máy chủ ↔ màn chỉnh.

**Tech Stack:** TypeScript, Cloudflare Worker + D1, giao diện thuần (`h()` ở `web/dom.ts`), esbuild, `node --test`, e2e `tests/e2e/*.mjs` trên D1 tạm, kịch bản Chrome qua `a2-cdp.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-02-giao-dien-cong-ty-design.md` (ĐÃ DUYỆT) + `docs/adr/ADR-0087-giao-dien-cong-ty.md` (accepted). Nền: nhánh `thanh-sang-chu-manh` (bản 1.65, token vai `--c-bar-*`, `--c-sidebar-*`, `--c-btn-primary-*`, `--fw-*`…).

## Global Constraints

- Nhánh thi công tách từ `main` SAU KHI `thanh-sang-chu-manh` đã gộp (cần token vai 1.65). Chưa gộp thì tách từ `thanh-sang-chu-manh`.
- Chữ hiển thị, lỗi, nhật ký, commit: tiếng Việt CÓ DẤU; không lộ mã thô (`settings.ops`, `#0c4a6e` chỉ hiện trong ô màu, không trong câu lỗi).
- Không `innerHTML` ở `web/`; dựng bằng `h()`. Ô gõ ≥ 16px. Khối CSS sau mốc `/* ---------- app iPhone (PWA)` chỉ dùng token.
- Module `giao-dien` là module NGHIÊM: SQL qua `defineSql`, câu tĩnh, cột liệt kê tường minh; import nhau kèm đuôi `.ts` trong `src/shared/`.
- Quyền: chỉ ô `settings.ops` (Toàn quyền). Không thêm mã thao tác. Route ghi cổng `admin`, `if (!can(staff, "settings.ops"))` viết thẳng, đứng TRƯỚC đọc thân.
- Migration: CHỈ thêm tệp mới. Số = lớn nhất trong `migrations/` của MỌI nhánh chưa gộp + 1 (lúc viết kế hoạch: `0068` đã có trên `van-chuyen-dot-1` ⇒ `0069`). Kiểm lại bằng `git ls-tree --name-only <nhánh> migrations/` trước khi đặt.
- Tương phản tối thiểu 4,5:1 (WCAG 2.x) cho mọi cặp ở `CAP_TUONG_PHAN` (Task 1).
- Phông chỉ: `be-vietnam-pro` (mặc định), `nunito`, `lexend`, `noto-sans`; mỗi tệp `woff2` đủ chữ Việt, MỘT tệp mỗi độ đậm, không tách `unicode-range` (công thức "Phông chữ", `docs/CHANGE-GUIDE.md` i).
- Nhật ký `giao_dien_changed` nhóm `system`, KHÔNG thuộc `SILENT_AUDIT_ACTIONS` (thêm vào đó = đổi quyền xem, cần chủ duyệt).
- `CLAUDE.md`, `src/CLAUDE.md`, `.claude/`, `docs/adr/` chỉ sửa bằng công cụ sửa tệp (chủ được hỏi); `src/CLAUDE.md` chỉ thêm tên module vào danh sách.
- Mọi bài mới: đỏ trước (ghi lại lệnh + thông báo đỏ trong báo cáo task), xanh sau. `npm run typecheck` 0 lỗi, `npm test` xanh sau mỗi task.
- KHÔNG `git push`, không deploy, không đụng D1 remote.
- **Lệch đặc tả có chủ ý (bề mặt, đảo ngược được):** đặc tả §2 ghi "Nội dung · độ đậm 300–500"; kế hoạch dùng **400–500** vì không có tệp phông nét 300 (luật `src/phong-chu.test.ts`: không để trình duyệt tô giả). Muốn nét 300 thì thêm tệp 300 cho mọi phông trước.

## Review Focus

1. **Chèn CSS qua giá trị** (`"#fff;}body{display:none}"`, `"16px;--x:1"`, chuỗi chứa `<`, `}`, `;`, xuống dòng): PUT phải 400; `dungCss` không bao giờ in giá trị chưa qua kiểm — Task 1 có bài, Task 3 có ca e2e.
2. **Khoá lạ / núm đã bỏ còn nằm trong dòng D1** (giá trị lưu từ phiên bản cũ): `GET /api/giao-dien.css` vẫn 200 và BỎ QUA khoá đó (không 400, không 500) — Task 3 bài + e2e chèn thẳng SQL.
3. **Hai Toàn quyền lưu cùng lúc**: người sau nhận 409 `stale`, không ghi nhật ký thừa — Task 3 e2e.
4. **Chế độ bảo trì đang bật**: trang Đăng nhập / màn bảo trì vẫn lấy được `/api/giao-dien.css` (route công khai) — Task 3 e2e bật bảo trì bằng SQL rồi GET.
5. **Đổi phông sang phông thiếu độ đậm đang chọn** (ví dụ chữ nhấn 700 nhưng phông chỉ có 400–600): không được xảy ra — bài Task 1 ép "mọi độ đậm chọn được có tệp ở MỌI phông"; nếu Task 2 bỏ một tệp phông thì phải thu hẹp khoảng núm. `kiemGiaoDien` vẫn kiểm chéo (phòng thủ).
6. **Kéo màu liên tục trong ô chọn màu**: ô không bị dựng lại (bảng màu không tự đóng), xem trước đổi theo — Task 5 Step 2 + kịch bản Chrome bước 3.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `src/shared/giao-dien.ts` (mới) | Danh sách núm `NUM`, giá trị mặc định `MAC_DINH`, phông `PHONG`, cặp tương phản, `tuongPhan`, `kiemGiaoDien`, `bienCss`, `dungCss`, `docTokensDaLuu` |
| `src/shared/giao-dien.test.ts` (mới) | Bài thuần của tệp trên |
| `src/giao-dien-mac-dinh.test.ts` (mới) | `MAC_DINH` khớp giá trị `:root` của `public/app.css` (dò chuỗi `var()`) |
| `src/token-giao-dien.test.ts` | Dùng `tuongPhan` từ `src/shared/giao-dien.ts` (bỏ bản chép) |
| `public/app.css` | `--fw-heading`; luật nền `h1…th` trỏ `--fw-heading`; `@font-face` 3 phông mới |
| `public/fonts/{nunito,lexend,noto-sans}-{400,500,600,700}.woff2` (mới) | Phông chọn được |
| `src/phong-chu.test.ts`, `tests/e2e/pwa.mjs` | Phông tuỳ chọn không bắt buộc nằm trong `PRECACHE`; đếm số tệp phông |
| `migrations/0069_gd_setting.sql` (mới) | Bảng một dòng |
| `src/modules/giao-dien/repository.ts`, `index.ts` (mới) | SQL + 3 route |
| `src/shared/http.ts` (+ test) | `css()` |
| `src/shared/contracts.ts` | `GiaoDienDto`, `GiaoDienPutBody`, `GiaoDienLoiDto` |
| `src/shared/audit-actions.ts` | `giao_dien_changed` |
| `src/index.ts`, `src/architecture.test.ts`, `src/route-access.test.ts`, `docs/data-dictionary.json` (+ `npm run dict`) | Gắn module |
| `tests/e2e/giao-dien.mjs` (mới), `tests/e2e/run.mjs`, `tests/e2e/README.md` | E2E |
| `public/*.html` (mọi trang) | `<link rel="stylesheet" href="/api/giao-dien.css">` sau `/app.css` |
| `public/giao-dien.html`, `web/giao-dien.ts` (mới) | Màn chỉnh |
| `web/shell.ts`, `web/account.ts`, `web/icons.ts`, `src/shared/sw-policy.ts`, `package.json` | Lối vào, biểu tượng, trang mới |
| `docs/evidence/2026-10-02-giao-dien/kich-ban/giao-dien-smoke.mjs` (mới) | Kịch bản Chrome |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `web/CLAUDE.md` (bảng kịch bản), `src/CLAUDE.md` (tên module), `src/shared/changelog.ts` | Tài liệu, nhật ký phiên bản |

---

### Task 1: Luật thuần `src/shared/giao-dien.ts` + token `--fw-heading`

**Files:**
- Create: `src/shared/giao-dien.ts`, `src/shared/giao-dien.test.ts`, `src/giao-dien-mac-dinh.test.ts`
- Modify: `public/app.css` (khối "ĐỘ ĐẬM CHỮ" + luật nền `h1, h2, h3, h4, h5, h6, b, strong, th`), `src/token-giao-dien.test.ts` (hàm `tuongPhan`)

**Interfaces:**
- Produces:
  - `type LoaiNum = "mau" | "phong" | "co" | "dam"`
  - `interface Num { khoa: string; nhan: string; nhom: "nen-chu" | "thanh" | "nut" | "chu"; loai: LoaiNum; token: string; min?: number; max?: number }`
  - `const NUM: readonly Num[]`, `const MAC_DINH: Readonly<Record<string, string>>` (khoá núm → giá trị mặc định dạng lưu: hex `#rrggbb`, mã phông, số px dạng `"16"`, độ đậm dạng `"500"`)
  - `const PHONG: Readonly<Record<string, { ten: string; stack: string; dam: readonly number[] }>>`
  - `function tuongPhan(a: string, b: string): number` (hai hex `#rrggbb`)
  - `interface LoiGiaoDien { khoa: string | null; message: string }`
  - `function kiemGiaoDien(tokens: unknown): LoiGiaoDien[]` (rỗng = hợp lệ)
  - `function bienCss(tokens: Readonly<Record<string, string>>): [string, string][]` (cặp `[--token, giá trị CSS]`, CHỈ khoá hợp lệ; dùng cho màn xem trước bằng `style.setProperty`)
  - `function dungCss(tokens: Readonly<Record<string, string>>): string` (`:root{…}`)
  - `function docTokensDaLuu(json: string): Record<string, string>` (đọc chuỗi D1, BỎ khoá lạ/sai dạng, không ném)

- [ ] **Step 1: Thêm token `--fw-heading` (giá trị = `--fw-bold` hiện tại, không đổi gì nhìn thấy)**

Trong khối "ĐỘ ĐẬM CHỮ" của `:root` (`public/app.css`), sau dòng `--fw-heavy`:
```css
  --fw-heading: 500;   /* độ đậm tiêu đề h1–h6 (núm "Tiêu đề" của màn Giao diện, ADR-0087) — luật nền bên dưới trỏ vào đây */
```
Đổi luật nền ngay sau `* { box-sizing: border-box; }`:
```css
h1, h2, h3, h4, h5, h6 { font-weight: var(--fw-heading); }
b, strong, th { font-weight: var(--fw-bold); } /* trình duyệt mặc định tô đậm các thẻ này — kéo về token để đổi một chỗ */
```
Sửa bài "thiếu luật nền" trong `src/token-giao-dien.test.ts` cho khớp hai dòng trên (regex `/\nh1, h2, h3, h4, h5, h6 \{ font-weight: var\(--fw-heading\); \}/` và `/\nb, strong, th \{ font-weight: var\(--fw-bold\); \}/`).

Run: `node --test src/token-giao-dien.test.ts src/phong-chu.test.ts` — Expected: PASS.

- [ ] **Step 2: Viết bài đỏ `src/shared/giao-dien.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { MAC_DINH, NUM, PHONG, bienCss, docTokensDaLuu, dungCss, kiemGiaoDien, tuongPhan } from "./giao-dien.ts";

test("tuongPhan: trắng/đen 21:1, cùng màu 1:1, đối xứng", () => {
  assert.equal(tuongPhan("#ffffff", "#000000").toFixed(2), "21.00");
  assert.equal(tuongPhan("#0c4a6e", "#0c4a6e"), 1);
  assert.equal(tuongPhan("#0c4a6e", "#dcebf6"), tuongPhan("#dcebf6", "#0c4a6e"));
});

test("mặc định hợp lệ; tập rỗng hợp lệ", () => {
  assert.deepEqual(kiemGiaoDien({}), []);
  assert.deepEqual(kiemGiaoDien({ ...MAC_DINH }), []);
});

test("mỗi núm có khoá duy nhất, nhãn tiếng Việt, token bắt đầu --, có giá trị mặc định", () => {
  const khoa = NUM.map((n) => n.khoa);
  assert.equal(new Set(khoa).size, khoa.length);
  for (const n of NUM) {
    assert.match(n.token, /^--[a-z0-9-]+$/);
    assert.ok(MAC_DINH[n.khoa] !== undefined, `thiếu mặc định ${n.khoa}`);
    assert.match(n.nhan, /[àáảãạăâđèéêìíòóôơùúưỳýÀ-ỹ]/i, `nhãn ${n.khoa} phải tiếng Việt có dấu`);
  }
});

test("từ chối: không phải object, khoá lạ, sai dạng màu, ngoài khoảng, phông lạ", () => {
  assert.equal(kiemGiaoDien(null).length, 1);
  assert.equal(kiemGiaoDien([]).length, 1);
  assert.equal(kiemGiaoDien({ "khong-co": "#ffffff" })[0]!.khoa, "khong-co");
  assert.ok(kiemGiaoDien({ "nen-trang": "red" }).some((l) => l.khoa === "nen-trang"));
  assert.ok(kiemGiaoDien({ "nen-trang": "#fff" }).some((l) => l.khoa === "nen-trang"), "chỉ nhận #rrggbb");
  assert.ok(kiemGiaoDien({ "co-noi-dung": "40" }).some((l) => l.khoa === "co-noi-dung"));
  assert.ok(kiemGiaoDien({ "co-noi-dung": "15.5" }).some((l) => l.khoa === "co-noi-dung"), "cỡ là số nguyên px");
  assert.ok(kiemGiaoDien({ "phong-noi-dung": "comic-sans" }).some((l) => l.khoa === "phong-noi-dung"));
});

test("chặn chèn CSS qua giá trị (Review Focus 1)", () => {
  for (const xau of ["#ffffff;}body{display:none}", "16;--x:1", "#ffffff\n", "500}", "be-vietnam-pro;}", "<style>"]) {
    for (const n of NUM) {
      const loi = kiemGiaoDien({ [n.khoa]: xau });
      assert.ok(loi.some((l) => l.khoa === n.khoa), `${n.khoa} nhận "${xau}"`);
    }
  }
  assert.equal(dungCss({ "nen-trang": "#ffffff;}body{display:none}" }), ":root{}");
});

test("chặn tương phản dưới 4,5:1, câu lỗi nêu tên ô bằng tiếng Việt kèm tỉ lệ", () => {
  const loi = kiemGiaoDien({ "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#dddddd" });
  const l = loi.find((x) => x.khoa === "chu-thanh-tren");
  assert.ok(l, JSON.stringify(loi));
  assert.match(l!.message, /khó đọc/);
  assert.match(l!.message, /\d,\d+:1/);
  assert.match(l!.message, /4,5:1/);
});

test("độ đậm: mọi giá trị chọn được ở mọi núm độ đậm đều có tệp phông ở MỌI phông (Review Focus 5); số lẻ bị chặn", () => {
  for (const n of NUM.filter((x) => x.loai === "dam")) {
    for (let d = n.min!; d <= n.max!; d += 100) {
      for (const p of Object.values(PHONG)) assert.ok(p.dam.includes(d), `${p.ten} thiếu độ đậm ${d} mà núm ${n.khoa} cho chọn — thu hẹp khoảng hoặc bỏ phông`);
      assert.deepEqual(kiemGiaoDien({ [n.khoa]: String(d) }), [], `${n.khoa}=${d}`);
    }
  }
  assert.ok(kiemGiaoDien({ "dam-noi-dung": "450" }).some((l) => l.khoa === "dam-noi-dung"));
});

test("bienCss / dungCss: chỉ khoá hợp lệ, đúng token, cỡ thêm px, phông thành chồng phông", () => {
  const css = dungCss({ "nen-thanh-tren": "#123456", "co-noi-dung": "17", "phong-noi-dung": "nunito", "khong-co": "#000000" });
  assert.match(css, /^:root\{.*\}$/s);
  assert.match(css, /--c-bar-bg:#123456;/);
  assert.match(css, /--fs-step-5:17px;/);
  assert.match(css, /--font:"Nunito",/);
  assert.doesNotMatch(css, /khong-co|#000000/);
  assert.deepEqual(bienCss({}), []);
});

test("docTokensDaLuu: JSON hỏng → {}, khoá lạ/sai dạng bị bỏ, khoá đúng giữ (Review Focus 2)", () => {
  assert.deepEqual(docTokensDaLuu("không phải json"), {});
  assert.deepEqual(docTokensDaLuu("[]"), {});
  assert.deepEqual(docTokensDaLuu(JSON.stringify({ "da-bo": "#ffffff", "nen-trang": "#f0f0f0", "nen-the": "x" })), { "nen-trang": "#f0f0f0" });
});
```

Run: `node --test src/shared/giao-dien.test.ts` — Expected: FAIL (`Cannot find module './giao-dien.ts'`).

- [ ] **Step 3: Viết `src/shared/giao-dien.ts`**

```ts
// Giao diện công ty (ADR-0087): luật THUẦN dùng chung máy chủ (module giao-dien) ↔ màn chỉnh (web/giao-dien.ts). Không I/O.
// Một "núm" = một token CSS ở :root của public/app.css; giá trị lưu là tập GHI ĐÈ (chỉ núm đã đổi). Token dẫn xuất trỏ var(núm gốc) trong app.css
// nên tự đi theo (ví dụ --c-selected-text: var(--c-primary)). MAC_DINH phải khớp app.css — bài src/giao-dien-mac-dinh.test.ts canh.

export type LoaiNum = "mau" | "phong" | "co" | "dam";
export interface Num { khoa: string; nhan: string; nhom: "nen-chu" | "thanh" | "nut" | "chu"; loai: LoaiNum; token: string; min?: number; max?: number }

const DU_PHONG = `system-ui, -apple-system, "Segoe UI", "Segoe UI Symbol", Roboto, "Noto Sans", sans-serif`;
export const PHONG: Readonly<Record<string, { ten: string; stack: string; dam: readonly number[] }>> = {
  "be-vietnam-pro": { ten: "Be Vietnam Pro", stack: `"Be Vietnam Pro", ${DU_PHONG}`, dam: [400, 500, 600, 700, 800] },
  nunito: { ten: "Nunito", stack: `"Nunito", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
  lexend: { ten: "Lexend", stack: `"Lexend", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
  "noto-sans": { ten: "Noto Sans", stack: `"Noto Sans", ${DU_PHONG}`, dam: [400, 500, 600, 700] },
};

export const NUM: readonly Num[] = [
  { khoa: "nen-trang", nhan: "Nền trang", nhom: "nen-chu", loai: "mau", token: "--c-surface-alt" },
  { khoa: "nen-the", nhan: "Nền thẻ", nhom: "nen-chu", loai: "mau", token: "--c-surface" },
  { khoa: "chu-chinh", nhan: "Chữ chính", nhom: "nen-chu", loai: "mau", token: "--c-text" },
  { khoa: "chu-phu", nhan: "Chữ phụ", nhom: "nen-chu", loai: "mau", token: "--c-text-muted" },
  { khoa: "vien", nhan: "Viền", nhom: "nen-chu", loai: "mau", token: "--c-border" },
  { khoa: "mau-chinh", nhan: "Màu chính (tiêu đề, liên kết, chữ nhấn)", nhom: "nen-chu", loai: "mau", token: "--c-primary" },
  { khoa: "mau-chinh-nhat", nhan: "Màu chính nhạt (nền mục đang chọn, nút chính)", nhom: "nen-chu", loai: "mau", token: "--c-primary-soft" },
  { khoa: "nen-thanh-tren", nhan: "Nền thanh trên", nhom: "thanh", loai: "mau", token: "--c-bar-bg" },
  { khoa: "chu-thanh-tren", nhan: "Chữ thanh trên", nhom: "thanh", loai: "mau", token: "--c-on-bar" },
  { khoa: "nen-thanh-ben", nhan: "Nền thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-bg" },
  { khoa: "chu-thanh-ben", nhan: "Chữ thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-item" },
  { khoa: "nen-muc-chon", nhan: "Nền mục đang chọn ở thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-active" },
  { khoa: "chu-muc-chon", nhan: "Chữ mục đang chọn ở thanh bên", nhom: "thanh", loai: "mau", token: "--c-sidebar-text-on" },
  { khoa: "nen-nut-chinh", nhan: "Nền nút chính", nhom: "nut", loai: "mau", token: "--c-btn-primary-bg" },
  { khoa: "chu-nut-chinh", nhan: "Chữ nút chính", nhom: "nut", loai: "mau", token: "--c-btn-primary-text" },
  { khoa: "nen-nut-chot", nhan: "Nền nút hành động chốt (Tạo đơn, Xác nhận)", nhom: "nut", loai: "mau", token: "--c-accent" },
  { khoa: "phong-tieu-de", nhan: "Phông tiêu đề", nhom: "chu", loai: "phong", token: "--font-display" },
  { khoa: "phong-noi-dung", nhan: "Phông nội dung", nhom: "chu", loai: "phong", token: "--font" },
  { khoa: "co-tieu-de-trang", nhan: "Cỡ tiêu đề trang", nhom: "chu", loai: "co", token: "--fs-h1", min: 20, max: 32 },
  { khoa: "co-tieu-de-muc", nhan: "Cỡ tiêu đề mục", nhom: "chu", loai: "co", token: "--fs-h2", min: 16, max: 24 },
  { khoa: "co-noi-dung", nhan: "Cỡ chữ nội dung", nhom: "chu", loai: "co", token: "--fs-step-5", min: 14, max: 18 },
  { khoa: "co-nhan", nhan: "Cỡ nhãn, chữ phụ", nhom: "chu", loai: "co", token: "--fs-label", min: 12, max: 16 },
  { khoa: "dam-tieu-de", nhan: "Độ đậm tiêu đề", nhom: "chu", loai: "dam", token: "--fw-heading", min: 400, max: 700 },
  { khoa: "dam-noi-dung", nhan: "Độ đậm chữ nội dung", nhom: "chu", loai: "dam", token: "--fw-regular", min: 400, max: 500 },
  { khoa: "dam-nhan", nhan: "Độ đậm chữ nhấn (nút, tên, số tiền)", nhom: "chu", loai: "dam", token: "--fw-semibold", min: 400, max: 700 },
];
/** Núm "dam-nhan" kéo cả ba mức nhấn (đặc tả §2). */
const KEO_THEO: Readonly<Record<string, readonly string[]>> = { "dam-nhan": ["--fw-bold", "--fw-heavy"], "nen-nut-chinh": ["--c-btn-primary-border", "--c-btn-primary-hover-bg"] };

/** Giá trị mặc định = app.css bản 1.65 (bài src/giao-dien-mac-dinh.test.ts so khớp). Thi công: chép giá trị THẬT từ app.css lúc làm. */
export const MAC_DINH: Readonly<Record<string, string>> = {
  "nen-trang": "#eaf2f8", "nen-the": "#ffffff", "chu-chinh": "#0f172a", "chu-phu": "#475569", vien: "#d3e1ec",
  "mau-chinh": "#0c4a6e", "mau-chinh-nhat": "#dcebf6",
  "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#0c4a6e", "nen-thanh-ben": "#ffffff", "chu-thanh-ben": "#475569",
  "nen-muc-chon": "#dcebf6", "chu-muc-chon": "#0c4a6e",
  "nen-nut-chinh": "#dcebf6", "chu-nut-chinh": "#0c4a6e", "nen-nut-chot": "#c0392b",
  "phong-tieu-de": "be-vietnam-pro", "phong-noi-dung": "be-vietnam-pro",
  // --fs-h1 = 1.5rem = 24px; --fs-h2 = 1.1rem = 17,6px (làm tròn 18 — mặc định KHÔNG ghi đè nên trang vẫn 17,6px; chỉ khi Toàn quyền chọn mới thành số nguyên);
  // --fs-step-5 = 16px; --fs-label → --fs-step-3 = 14px (đo 2026-10-02 trên nhánh thanh-sang-chu-manh).
  "co-tieu-de-trang": "24", "co-tieu-de-muc": "18", "co-noi-dung": "16", "co-nhan": "14",
  "dam-tieu-de": "500", "dam-noi-dung": "400", "dam-nhan": "500",
};

/** Cặp [chữ, nền] phải ≥ 4,5:1 — theo khoá núm, hoặc hex cố định (chữ trắng trên nút chốt; nền san hô nhạt của nút tròn Tạo đơn). */
export const CAP_TUONG_PHAN: readonly [string, string, string][] = [
  ["chu-chinh", "nen-trang", "Chữ chính trên nền trang"],
  ["chu-chinh", "nen-the", "Chữ chính trên nền thẻ"],
  ["chu-phu", "nen-the", "Chữ phụ trên nền thẻ"],
  ["chu-phu", "nen-trang", "Chữ phụ trên nền trang"],
  ["mau-chinh", "nen-the", "Màu chính (liên kết) trên nền thẻ"],
  ["mau-chinh", "mau-chinh-nhat", "Màu chính trên màu chính nhạt (mục đang chọn, dải tóm tắt)"],
  ["chu-thanh-tren", "nen-thanh-tren", "Chữ trên thanh trên"],
  ["chu-thanh-ben", "nen-thanh-ben", "Chữ trên thanh bên"],
  ["chu-phu", "nen-thanh-ben", "Tiêu đề nhóm trên thanh bên"],
  ["chu-muc-chon", "nen-muc-chon", "Chữ mục đang chọn ở thanh bên"],
  ["chu-nut-chinh", "nen-nut-chinh", "Chữ nút chính"],
  ["#ffffff", "nen-nut-chot", "Chữ trắng trên nút hành động chốt"],
];

const HEX = /^#[0-9a-f]{6}$/;
const SO = /^\d{1,3}$/;
const doSang = (h: string): number => {
  const k = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0]! + 0.7152 * k[1]! + 0.0722 * k[2]!;
};
export function tuongPhan(a: string, b: string): number {
  const [x, y] = [doSang(a), doSang(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
const soVN = (r: number): string => r.toFixed(2).replace(".", ",");
const NUM_THEO_KHOA = new Map(NUM.map((n) => [n.khoa, n] as const));

/** Lỗi của MỘT giá trị (null = hợp lệ). Không xét chéo ô. */
function loiMotO(n: Num, v: unknown): string | null {
  if (typeof v !== "string") return `${n.nhan}: giá trị không hợp lệ.`;
  if (n.loai === "mau") return HEX.test(v) ? null : `${n.nhan}: chọn một màu (dạng #rrggbb).`;
  if (n.loai === "phong") return Object.hasOwn(PHONG, v) ? null : `${n.nhan}: phông không có trong danh sách.`;
  if (!SO.test(v)) return `${n.nhan}: phải là số nguyên.`;
  const x = Number(v);
  if (x < n.min! || x > n.max!) return `${n.nhan}: phải từ ${n.min} đến ${n.max}${n.loai === "co" ? "px" : ""}.`;
  if (n.loai === "dam" && x % 100 !== 0) return `${n.nhan}: chỉ chọn 400, 500, 600 hoặc 700.`;
  return null;
}

export function kiemGiaoDien(tokens: unknown): LoiGiaoDien[] {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) return [{ khoa: null, message: "Dữ liệu giao diện không hợp lệ." }];
  const loi: LoiGiaoDien[] = [];
  const t = tokens as Record<string, unknown>;
  for (const [k, v] of Object.entries(t)) {
    const n = NUM_THEO_KHOA.get(k);
    if (!n) { loi.push({ khoa: k, message: "Có một ô không còn được hỗ trợ — tải lại trang." }); continue; }
    const m = loiMotO(n, v);
    if (m) loi.push({ khoa: k, message: m });
  }
  if (loi.length > 0) return loi;
  const gt = (k: string): string => (k.startsWith("#") ? k : ((t[k] as string | undefined) ?? MAC_DINH[k]!));
  for (const [chu, nen, ten] of CAP_TUONG_PHAN) {
    const r = tuongPhan(gt(chu), gt(nen));
    if (r < 4.5) loi.push({ khoa: chu.startsWith("#") ? nen : (t[chu] !== undefined ? chu : nen), message: `${ten} khó đọc (${soVN(r)}:1, cần ít nhất 4,5:1).` });
  }
  for (const n of NUM.filter((x) => x.loai === "dam")) {
    const phong = gt(n.khoa === "dam-tieu-de" ? "phong-tieu-de" : "phong-noi-dung");
    const dam = Number(gt(n.khoa));
    if (!PHONG[phong]!.dam.includes(dam)) loi.push({ khoa: n.khoa, message: `${n.nhan}: phông ${PHONG[phong]!.ten} không có độ đậm ${dam}.` });
  }
  return loi;
}
export interface LoiGiaoDien { khoa: string | null; message: string }

export function bienCss(tokens: Readonly<Record<string, string>>): [string, string][] {
  const ra: [string, string][] = [];
  for (const [k, v] of Object.entries(tokens)) {
    const n = NUM_THEO_KHOA.get(k);
    if (!n || loiMotO(n, v) !== null) continue;
    const css = n.loai === "phong" ? PHONG[v]!.stack : n.loai === "co" ? `${v}px` : v;
    ra.push([n.token, css]);
    for (const keo of KEO_THEO[k] ?? []) ra.push([keo, css]);
  }
  return ra;
}
export const dungCss = (tokens: Readonly<Record<string, string>>): string => `:root{${bienCss(tokens).map(([k, v]) => `${k}:${v};`).join("")}}`;

export function docTokensDaLuu(json: string): Record<string, string> {
  let o: unknown;
  try { o = JSON.parse(json); } catch { return {}; }
  if (!o || typeof o !== "object" || Array.isArray(o)) return {};
  const ra: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) { const n = NUM_THEO_KHOA.get(k); if (n && loiMotO(n, v) === null) ra[k] = v as string; }
  return ra;
}
```
Lưu ý thi công:
- Màu và cỡ `MAC_DINH` phải là giá trị DÒ ĐƯỢC của token trong `app.css` lúc thi công (Step 5 canh); `main` đã đổi thì theo `app.css`.
- Đã tính tay: `#ffffff` trên `#c0392b` ≈ 5,4:1; `#475569` trên `#eaf2f8` ≈ 6,8:1 — mặc định đạt mọi cặp (bài "mặc định hợp lệ").

Run: `node --test src/shared/giao-dien.test.ts` — Expected: PASS.

- [ ] **Step 4: `src/token-giao-dien.test.ts` dùng `tuongPhan` chung**

Xoá hàm `doSang`/`tuongPhan` chép tay trong tệp test, `import { tuongPhan as tp } from "./shared/giao-dien.ts";` và giữ hàm `hex()` dò chuỗi; `tuongPhan(chu, nen)` của bài cũ thành `tp(hex(\`var(${chu})\`), hex(\`var(${nen})\`))`.

Run: `node --test src/token-giao-dien.test.ts` — Expected: PASS.

- [ ] **Step 5: Bài đồng bộ `src/giao-dien-mac-dinh.test.ts`**

```ts
// MAC_DINH của src/shared/giao-dien.ts phải bằng giá trị :root của public/app.css (dò chuỗi var()) — app.css là nguồn, đổi mặc định ở đó thì sửa cả hai.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAC_DINH, NUM, PHONG } from "./shared/giao-dien.ts";

const css = readFileSync(new URL("../public/app.css", import.meta.url), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("\n}", css.indexOf(":root")));
const tokens = new Map([...root.matchAll(/\n\s*(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()] as const));
const doRa = (v: string, sau = 0): string => {
  const m = /^var\((--[\w-]+)\)$/.exec(v);
  if (!m) return v;
  assert.ok(sau < 10);
  return doRa(tokens.get(m[1]!) ?? assert.fail(`${m[1]} chưa khai`), sau + 1);
};

test("mọi núm trỏ token có thật ở :root và MAC_DINH khớp giá trị app.css", () => {
  for (const n of NUM) {
    const v = tokens.get(n.token);
    assert.ok(v, `${n.token} chưa khai ở :root`);
    const that = doRa(v!);
    const mong = MAC_DINH[n.khoa]!;
    if (n.loai === "mau") assert.equal(that.toLowerCase(), mong, n.khoa);
    else if (n.loai === "phong") assert.equal(that, PHONG[mong]!.stack, n.khoa);
    else if (n.loai === "dam") assert.equal(that, mong, n.khoa);
    else {
      const px = /^(\d+(?:\.\d+)?)px$/.exec(that)?.[1] ?? String(Number(/^([\d.]+)rem$/.exec(that)?.[1]) * 16);
      assert.equal(String(Math.round(Number(px))), mong, n.khoa);
    }
  }
});
```
Run: `node --test src/giao-dien-mac-dinh.test.ts` — Expected: PASS. Thử phá: đổi `"chu-chinh": "#000000"` → FAIL `chu-chinh`; hoàn nguyên → PASS. Ghi thông báo đỏ vào báo cáo task.

Nếu chồng `--font` trong `app.css` khác `PHONG["be-vietnam-pro"].stack` từng ký tự: sửa `DU_PHONG` cho bằng đúng chuỗi app.css (app.css là nguồn).

- [ ] **Step 6: Kiểm + commit**

Run: `npm run typecheck && npm test` — Expected: 0 lỗi, xanh.
```bash
git add src/shared/giao-dien.ts src/shared/giao-dien.test.ts src/giao-dien-mac-dinh.test.ts src/token-giao-dien.test.ts public/app.css
git commit   # "Luật thuần giao diện công ty: núm, mặc định, kiểm tương phản, dựng CSS (ADR-0087)" + thân "vì sao" + dòng đồng tác giả
```

---

### Task 2: Ba phông chọn được (Nunito, Lexend, Noto Sans)

**Files:**
- Create: `public/fonts/nunito-{400,500,600,700}.woff2`, `public/fonts/lexend-{400,500,600,700}.woff2`, `public/fonts/noto-sans-{400,500,600,700}.woff2`
- Modify: `public/app.css` (đầu tệp, sau 5 `@font-face` Be Vietnam Pro), `src/phong-chu.test.ts`, `tests/e2e/pwa.mjs:58-59`, `docs/CHANGE-GUIDE.md` (công thức "Phông chữ")

**Interfaces:**
- Consumes: `PHONG` (Task 1) — tên phông và danh sách độ đậm phải khớp đúng các tệp tạo ở đây.
- Produces: `@font-face` cho `"Nunito"`, `"Lexend"`, `"Noto Sans"` độ đậm 400–700.

- [ ] **Step 1: Bài đỏ trong `src/phong-chu.test.ts`**

Thêm:
```ts
import { PHONG } from "./shared/giao-dien.ts";
test("mỗi phông chọn được ở màn Giao diện có @font-face cho ĐÚNG các độ đậm khai trong PHONG", () => {
  for (const p of Object.values(PHONG)) {
    const co = new Set(faces.filter((f) => f.includes(`font-family: "${p.ten}"`)).map((f) => Number(/font-weight:\s*(\d+)/.exec(f)?.[1])));
    assert.deepEqual([...co].sort(), [...p.dam].sort(), `${p.ten}: @font-face ${[...co]} ≠ PHONG ${p.dam}`);
  }
});
```
Sửa bài "tệp phông … được service worker nạp sẵn": chỉ đòi `PRECACHE` cho tệp `be-vietnam-pro-*`; phông khác KHÔNG được nằm trong `PRECACHE` (tải khi cần — đặc tả §5).

Run: `node --test src/phong-chu.test.ts` — Expected: FAIL (Nunito/Lexend/Noto Sans chưa có `@font-face`).

- [ ] **Step 2: Tạo tệp phông**

Venv tạm NGOÀI repo (`python3 -m venv /tmp/fontvenv && /tmp/fontvenv/bin/pip install fonttools brotli`). Nguồn TTF tĩnh từ kho `google/fonts` (OFL): `ofl/nunito/static/Nunito-{Regular,Medium,SemiBold,Bold}.ttf`, `ofl/lexend/static/Lexend-{…}.ttf`, `ofl/notosans/static/NotoSans-{…}.ttf` (nếu kho chỉ có bản biến thiên thì dùng `fonttools varLib.instancer <tệp> wght=<400|500|600|700> -o <tĩnh>.ttf` trước). Mỗi tệp chạy ĐÚNG lệnh `pyftsubset` của công thức "Phông chữ" (`docs/CHANGE-GUIDE.md` i — cùng `--unicodes`, `--layout-features`, `--flavor=woff2`), đầu ra `public/fonts/<mã>-<độ đậm>.woff2`. Mỗi tệp phải > 20 KB.

- [ ] **Step 3: `@font-face`**

Sau 5 dòng Be Vietnam Pro ở đầu `public/app.css`, 12 dòng cùng khuôn, ví dụ:
```css
@font-face { font-family: "Nunito"; src: url("/fonts/nunito-400.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }
```
(…500, 600, 700; rồi `"Lexend"` → `/fonts/lexend-*.woff2`; `"Noto Sans"` → `/fonts/noto-sans-*.woff2`). Kèm một dòng chú thích: phông tuỳ chọn của ADR-0087, trình duyệt chỉ tải khi màn Giao diện chọn.

- [ ] **Step 4: `tests/e2e/pwa.mjs`**

Dòng 59: số tệp phông = `5 + 12`; câu báo `app.css phải khai đủ 5 tệp Be Vietnam Pro + 12 tệp phông tuỳ chọn (ADR-0087)`.

- [ ] **Step 5: Kiểm hiển thị tiếng Việt (bài học 30/9)**

Kịch bản Chrome nhỏ (chép khung `a2-cdp.mjs`) mở một trang tĩnh tạm đặt `--font` lần lượt từng phông, gõ chuỗi dựng sẵn ở dạng Unicode TỔ HỢP `"Tiếng Việt: ặ ẩ ở ữ ỹ — Đơn hàng"` (`"Tiếng…"`), đo bằng CDP `CSS.getPlatformFontsForNode` rằng MỌI ký tự vẽ bằng đúng phông đó (không rơi về phông hệ thống). Phông nào trượt: bỏ khỏi `PHONG` + xoá tệp, ghi lý do (đặc tả G1).

- [ ] **Step 6: Kiểm + commit**

Run: `node --test src/phong-chu.test.ts src/shared/giao-dien.test.ts && npm test` — Expected: PASS. Ghi thêm `docs/CHANGE-GUIDE.md` công thức "Phông chữ": danh sách phông tuỳ chọn, chỉ Be Vietnam Pro nạp sẵn. Commit.

---

### Task 3: Module `giao-dien` — bảng, ba route, nhật ký

**Files:**
- Create: `migrations/0069_gd_setting.sql`, `src/modules/giao-dien/repository.ts`, `src/modules/giao-dien/index.ts`, `src/modules/giao-dien/index.test.ts`, `tests/e2e/giao-dien.mjs`
- Modify: `src/shared/http.ts` (+ `src/shared/http.test.ts` nếu có, không thì tạo), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/index.ts:54`, `src/architecture.test.ts` (`ALLOWED_EDGES`, `STRICT`, `TABLE_PREFIX`), `src/route-access.test.ts` (danh sách module + 3 route), `docs/data-dictionary.json` + `npm run dict`, `tests/e2e/run.mjs` (`ALL` + bảng thời gian), `tests/e2e/README.md`

**Interfaces:**
- Consumes: `kiemGiaoDien`, `dungCss`, `docTokensDaLuu`, `NUM` (Task 1); `auditStatement` (`src/modules/audit`); `can` (`src/shared/permissions`); `route`, `AppModule` (`src/shared/router`).
- Produces:
  - `css(body: string, status?: number, headers?: HeadersInit): Response` ở `src/shared/http.ts`
  - Contracts: `interface GiaoDienDto { tokens: Record<string, string>; version: number }`, `interface GiaoDienPutBody { tokens: Record<string, string>; version: number }`, `interface GiaoDienLoiBody { error: { code: "invalid_input"; message: string; loi: { khoa: string | null; message: string }[] } }`
  - Route: `GET /api/giao-dien` (admin), `PUT /api/giao-dien` (admin), `GET /api/giao-dien.css` (public)
  - Nhật ký: `giao_dien_changed` (`label: "Đổi giao diện"`, `group: "system"`)

- [ ] **Step 1: Migration**

Kiểm số: `ls migrations | tail -3` và `git ls-tree --name-only <mỗi nhánh chưa gộp> migrations/ | tail -1`. `migrations/0069_gd_setting.sql`:
```sql
-- Module: giao-dien (ADR-0087) — giao diện công ty do Toàn quyền chỉnh. Bảng một dòng `gd_setting` (id = 'default').
--   tokens   JSON {"<khoá núm>": "<giá trị>"} — chỉ núm đã đổi khỏi mặc định của public/app.css; '{}' = mặc định. Máy chủ kiểm bằng src/shared/giao-dien.ts
--            trước khi ghi; khi đọc, khoá lạ/sai dạng bị BỎ QUA (docTokensDaLuu) nên dòng cũ không bao giờ làm hỏng trang.
--   version  khoá lạc quan: PUT gửi version đang xem; lệch → 409. Cũng là ETag của GET /api/giao-dien.css.
--   created_by / updated_by: cột WHO (ADR-0003, TEXT NULL, không khoá ngoại). Lịch sử ở audit_log (`giao_dien_changed`).
-- Đường thoát khẩn (giao diện hỏng, không vào được màn chỉnh): UPDATE gd_setting SET tokens = '{}', version = version + 1 WHERE id = 'default';
CREATE TABLE gd_setting (
  id         TEXT PRIMARY KEY CHECK (id = 'default'),
  tokens     TEXT NOT NULL DEFAULT '{}',
  version    INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
INSERT INTO gd_setting (id, tokens, version, created_at, updated_at)
VALUES ('default', '{}', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
```
Thêm `{ "name": "gd_setting", "module": "giao-dien", "kind": "table" }` vào `tables`, `"giao-dien"` vào `modules` của `docs/data-dictionary.json`; chạy `npm run dict`. Ghi đường thoát khẩn vào `docs/HANDOFF-N1.md` mục hoàn tác (một dòng).

- [ ] **Step 2: Bài đỏ cho `css()` và route (thuần, không D1)**

`src/shared/http.test.ts` (tạo nếu chưa có):
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { css } from "./http.ts";
test("css(): text/css utf-8, mặc định no-cache (hỏi lại theo ETag), giữ header thêm", async () => {
  const r = css(":root{}", 200, { etag: '"v3"' });
  assert.equal(r.headers.get("content-type"), "text/css; charset=utf-8");
  assert.equal(r.headers.get("cache-control"), "no-cache");
  assert.equal(r.headers.get("etag"), '"v3"');
  assert.equal(await r.text(), ":root{}");
});
```
Run: `node --test src/shared/http.test.ts` — Expected: FAIL (`css` không có).

- [ ] **Step 3: `css()` ở `src/shared/http.ts`** (đặt sau `json()`)

```ts
/** Phản hồi CSS (route DUY NHẤT hiện có: GET /api/giao-dien.css, ADR-0087). `no-cache` = trình duyệt được giữ nhưng phải hỏi lại (ETag → 304). */
export function css(body: string, status = 200, headers: HeadersInit = {}): Response {
  return new Response(body, { status, headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache", ...headers } });
}
```
Run lại — PASS. `src/shared/http.ts` không import gì mới.

- [ ] **Step 4: `src/modules/giao-dien/repository.ts`**

```ts
// SQL của bảng module giao-dien sở hữu (gd_setting — một dòng, id = 'default', ADR-0087). Câu tĩnh qua defineSql, cột tường minh.
import { defineSql } from "../../shared/sql-registry.ts";

export interface GiaoDienRow { tokens: string; version: number }

const FIND = defineSql("giao-dien", "find", "SELECT tokens, version FROM gd_setting WHERE id = 'default'");
const UPDATE = defineSql(
  "giao-dien",
  "update",
  "UPDATE gd_setting SET tokens = ?1, version = version + 1, updated_at = ?2, updated_by = ?3 WHERE id = 'default' AND version = ?4",
);

/** Dòng duy nhất, hoặc null nếu bị xoá tay (migration luôn gieo). */
export const findGiaoDien = (db: D1Database): Promise<GiaoDienRow | null> => db.prepare(FIND).first<GiaoDienRow>();

/** Câu (CHƯA chạy) ghi khi `version` khớp — người gọi gộp với câu nhật ký `onlyIf: "changes() > 0"` trong một db.batch(). */
export const updateGiaoDienStatement = (db: D1Database, v: { tokens: string; at: string; by: string; version: number }): D1PreparedStatement =>
  db.prepare(UPDATE).bind(v.tokens, v.at, v.by, v.version);
```

- [ ] **Step 5: `src/modules/giao-dien/index.ts`**

```ts
// Module giao-dien — giao diện công ty do Toàn quyền chỉnh (ADR-0087). Sở hữu `gd_setting`. Luật thuần ở src/shared/giao-dien.ts (dùng chung màn chỉnh).
// Route: GET/PUT /api/giao-dien (cổng admin + ô settings.ops = chỉ Toàn quyền); GET /api/giao-dien.css (CÔNG KHAI — trang Đăng nhập cần trước khi có phiên;
// chỉ chứa màu/phông/cỡ, không dữ liệu cá nhân). Phụ thuộc: chỉ `audit`.
import { auditStatement } from "../audit";
import type { GiaoDienDto } from "../../shared/contracts";
import { NUM, docTokensDaLuu, dungCss, kiemGiaoDien } from "../../shared/giao-dien";
import { css, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { findGiaoDien, updateGiaoDienStatement } from "./repository";

const NHAN = new Map(NUM.map((n) => [n.khoa, n.nhan] as const));

/** Chi tiết nhật ký: "Nền thanh trên: #ffffff → #0c4a6e; Phông nội dung: mặc định → nunito". Chỉ khoá + giá trị (không dữ liệu cá nhân). */
export function chiTietDoi(cu: Readonly<Record<string, string>>, moi: Readonly<Record<string, string>>): string {
  const khoa = [...new Set([...Object.keys(cu), ...Object.keys(moi)])].filter((k) => cu[k] !== moi[k]).sort();
  if (khoa.length === 0) return "Không đổi";
  return khoa.map((k) => `${NHAN.get(k) ?? k}: ${cu[k] ?? "mặc định"} → ${moi[k] ?? "mặc định"}`).join("; ");
}

export const giaoDienModule: AppModule = {
  name: "giao-dien",
  routes: [
    route("GET", "/api/giao-dien.css", "public", async ({ env, request }) => {
      const row = await findGiaoDien(env.DB);
      const version = row?.version ?? 0;
      const etag = `"v${version}"`;
      if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag, "cache-control": "no-cache" } });
      return css(dungCss(row ? docTokensDaLuu(row.tokens) : {}), 200, { etag });
    }),

    route("GET", "/api/giao-dien", "admin", async ({ env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được xem cài đặt giao diện.");
      const row = await findGiaoDien(env.DB);
      return json({ tokens: row ? docTokensDaLuu(row.tokens) : {}, version: row?.version ?? 0 } satisfies GiaoDienDto);
    }),

    route("PUT", "/api/giao-dien", "admin", async ({ request, env, staff }) => {
      if (!can(staff, "settings.ops")) return error(403, "forbidden", "Chỉ người phụ trách hệ thống được đổi giao diện.");
      const body = await readJson(request);
      const version = body?.version;
      if (!body || !Number.isInteger(version)) return error(400, "invalid_input", "Thiếu phiên bản giao diện đang xem — tải lại trang.");
      const loi = kiemGiaoDien(body.tokens);
      if (loi.length > 0) return json({ error: { code: "invalid_input", message: loi.map((l) => l.message).join(" "), loi } }, 400);
      const tokens = body.tokens as Record<string, string>;
      const db = env.DB;
      const cu = await findGiaoDien(db);
      if (!cu || cu.version !== version) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      const at = new Date().toISOString();
      const [upd] = await db.batch([
        updateGiaoDienStatement(db, { tokens: JSON.stringify(tokens), at, by: staff.id, version: version as number }),
        auditStatement(db, { staffId: staff.id, action: "giao_dien_changed", at, targetType: "system", targetId: "giao-dien", detail: chiTietDoi(docTokensDaLuu(cu.tokens), tokens) }, "changes() > 0"),
      ]);
      if (!upd || upd.meta.changes === 0) return error(409, "stale", "Giao diện vừa được người khác đổi — tải lại để xem bản mới.");
      return json({ tokens, version: (version as number) + 1 } satisfies GiaoDienDto);
    }),
  ],
};
```
Kiểm khi viết: chữ ký `auditStatement(db, entry, onlyIf)` đúng như `src/modules/audit/index.ts:19`; kiểu `AuditInput` có `targetType: "system"`; route `public` nhận `request` trong ngữ cảnh (đối chiếu `src/modules/company/index.ts:18`). Sai tên trường thì theo mã thật, ghi lại trong báo cáo.

`src/modules/giao-dien/index.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiTietDoi } from "./index.ts";
test("chiTietDoi: nêu nhãn tiếng Việt, cũ → mới, 'mặc định' khi vắng; không đổi → 'Không đổi'", () => {
  assert.equal(chiTietDoi({}, {}), "Không đổi");
  assert.equal(chiTietDoi({ "nen-thanh-tren": "#ffffff" }, {}), "Nền thanh trên: #ffffff → mặc định");
  assert.equal(chiTietDoi({}, { "phong-noi-dung": "nunito" }), "Phông nội dung: mặc định → nunito");
});
```
(Nếu `index.ts` import `../audit` không chạy được dưới `node --test` vì đuôi, dời `chiTietDoi` sang `src/modules/giao-dien/rules.ts` thuần và test ở `rules.test.ts` — đúng khuôn `rules.ts` của `src/CLAUDE.md`.)

- [ ] **Step 6: Gắn module + nhật ký + hợp đồng**

- `src/shared/audit-actions.ts`: sau `tro_ly_settings_changed`:
  ```ts
  // ADR-0087 điều 6: Toàn quyền đổi giao diện công ty — detail = các ô đổi (nhãn: cũ → mới), không dữ liệu cá nhân. KHÔNG im lặng (ADR-0038).
  giao_dien_changed: { label: "Đổi giao diện", group: "system" },
  ```
- `src/shared/contracts.ts`: ba interface ở mục Interfaces (đặt cạnh khối "Chế độ bảo trì", có chú thích ADR-0087).
- `src/index.ts`: import `giaoDienModule` và thêm vào mảng `modules` (sau `maintenanceModule`).
- `src/architecture.test.ts`: `ALLOWED_EDGES` thêm `"giao-dien": ["audit"], // ADR-0087: ghi nhật ký giao_dien_changed`; `STRICT` thêm `{ module: "giao-dien", file: "modules/giao-dien/repository.ts" }`; `TABLE_PREFIX` thêm `gd_: "giao-dien"`.
- `src/route-access.test.ts`: thêm `{ entry: "./modules/giao-dien/index.ts", exportName: "giaoDienModule" }` và ba dòng route (`GET /api/giao-dien.css` `public` kèm chú thích lý do công khai; `GET`/`PUT /api/giao-dien` `admin`); sửa tổng số route nếu bài đếm.

Run: `npm run typecheck && npm test` — Expected: xanh (đọc kỹ đỏ của `route-write-guard`, `cong-quyen`, `permission-enforcement` nếu có — sửa theo luật của bài, KHÔNG nới bài).

- [ ] **Step 7: E2E `tests/e2e/giao-dien.mjs`**

```js
// Giao diện công ty (ADR-0087, module giao-dien): quyền, kiểm hợp lệ, khoá lạc quan, CSS công khai + ETag, nhật ký, đường bảo trì. Khôi phục '{}' ở finally.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, session, sql, sqlRows } from "./lib.mjs";

const getCss = (etag) => fetch(`${BASE}/api/giao-dien.css`, { headers: etag ? { "if-none-match": etag } : {} });
const restore = () => sql("UPDATE gd_setting SET tokens = '{}', version = version + 1 WHERE id = 'default'");
let r;
try {
  const OWNER = await session(ACCOUNTS.superAdmin);
  const ADMIN = await session(ACCOUNTS.admin);
  const SALES = await session(ACCOUNTS.salesA);

  // 1) CSS công khai, chưa đăng nhập, mặc định rỗng
  let c = await getCss();
  assert.equal(c.status, 200);
  assert.match(c.headers.get("content-type"), /^text\/css/);
  assert.equal(await c.text(), ":root{}");
  const etag0 = c.headers.get("etag");
  assert.equal((await getCss(etag0)).status, 304, "cùng ETag → 304");
  console.log("✓ CSS công khai, mặc định rỗng, 304 theo ETag");

  // 2) Quyền: Quản trị, Bán hàng 403 cả GET lẫn PUT; Toàn quyền 200
  for (const [ten, ck] of [["Quản trị", ADMIN], ["Bán hàng", SALES]]) {
    assert.equal((await call(ck, "GET", "/api/giao-dien")).status, 403, ten);
    assert.equal((await call(ck, "PUT", "/api/giao-dien", { tokens: {}, version: 1 })).status, 403, ten);
  }
  r = await call(OWNER, "GET", "/api/giao-dien");
  assert.equal(r.status, 200);
  const v0 = r.body.version;
  console.log("✓ chỉ Toàn quyền đọc/ghi");

  // 3) Kiểm hợp lệ: tương phản, chèn CSS, khoá lạ → 400, không ghi, không nhật ký
  const moc = new Date().toISOString();
  for (const tokens of [{ "nen-thanh-tren": "#ffffff", "chu-thanh-tren": "#eeeeee" }, { "nen-trang": "#ffffff;}body{display:none}" }, { "khong-co": "#000000" }]) {
    r = await call(OWNER, "PUT", "/api/giao-dien", { tokens, version: v0 });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.ok(Array.isArray(r.body.error.loi) && r.body.error.loi.length > 0);
  }
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'giao_dien_changed' AND at >= '${moc}'`))[0].n, 0);
  console.log("✓ 400 khi khó đọc / chèn CSS / ô lạ — không ghi");

  // 4) Áp dụng: 200, version + 1, CSS mới, ETag đổi, đúng một dòng nhật ký có nhãn
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: { "nen-thanh-tren": "#0c4a6e", "chu-thanh-tren": "#ffffff" }, version: v0 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.version, v0 + 1);
  c = await getCss(etag0);
  assert.equal(c.status, 200);
  assert.match(await c.text(), /--c-bar-bg:#0c4a6e;.*--c-on-bar:#ffffff;/s);
  const nk = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'giao_dien_changed' AND at >= '${moc}'`);
  assert.equal(nk.length, 1);
  assert.match(nk[0].detail, /Nền thanh trên: mặc định → #0c4a6e/);
  console.log("✓ áp dụng: CSS mới + ETag mới + một dòng nhật ký");

  // 5) Lưu chồng: gửi version cũ → 409, không thêm nhật ký
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: {}, version: v0 });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, "stale");
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'giao_dien_changed' AND at >= '${moc}'`))[0].n, 1);
  console.log("✓ 409 khi lưu chồng");

  // 6) Dòng D1 có khoá lạ / giá trị hỏng (từ bản cũ): CSS vẫn 200, bỏ qua phần hỏng
  await sql(`UPDATE gd_setting SET tokens = '{"da-bo":"#000000","nen-trang":"x","nen-the":"#fafafa"}', version = version + 1 WHERE id = 'default'`);
  c = await getCss();
  assert.equal(c.status, 200);
  assert.equal(await c.text(), ":root{--c-surface:#fafafa;}");
  console.log("✓ dòng cũ hỏng không làm hỏng CSS");

  // 7) Bảo trì đang bật: CSS công khai vẫn 200
  await sql(`UPDATE mnt_setting SET enabled = 1, ends_at = '${new Date(Date.now() + 600_000).toISOString()}' WHERE id = 'default'`);
  assert.equal((await getCss()).status, 200, "bảo trì không chặn CSS");
  await sql("UPDATE mnt_setting SET enabled = 0, ends_at = NULL WHERE id = 'default'");
  console.log("✓ bảo trì không chặn CSS");

  // 8) Về mặc định
  r = await call(OWNER, "GET", "/api/giao-dien");
  r = await call(OWNER, "PUT", "/api/giao-dien", { tokens: {}, version: r.body.version });
  assert.equal(r.status, 200);
  assert.equal(await (await getCss()).text(), ":root{}");
  console.log("✓ về mặc định");
} finally {
  await restore();
  await sql("UPDATE mnt_setting SET enabled = 0, ends_at = NULL WHERE id = 'default'");
}
```
Đối chiếu tên cột `audit_log` (`action`, `at`, `detail`) với `migrations/` trước khi chạy; sai thì theo mã thật. `tests/e2e/run.mjs`: thêm `"giao-dien"` vào `ALL` TRƯỚC `"maintenance"` (kịch bản tự bật/tắt bảo trì và khôi phục ở `finally`), thêm thời gian ước tính vào bảng thời gian; một dòng vào bảng của `tests/e2e/README.md`.

Run: `npm run test:e2e -- giao-dien pwa` — Expected: mọi ✓, `audit-invariants` cuối đạt. Thử đỏ một ca (ví dụ tạm bỏ `if (!can(...))` ở GET) → ✘ đúng bước 2 → hoàn nguyên.

- [ ] **Step 8: Commit** (migration + module + e2e + tài liệu dữ liệu một commit; thân nói vì sao bảng một dòng, vì sao route CSS công khai).

---

### Task 4: Mọi trang nạp `/api/giao-dien.css`

**Files:**
- Modify: mọi `public/*.html` (lúc viết kế hoạch: 33 tệp), `tests/e2e/pwa.mjs` (`NEEDLES`), `docs/CHANGE-GUIDE.md` (công thức c "Trang mới" bước 1)

**Interfaces:**
- Consumes: route `GET /api/giao-dien.css` (Task 3).

- [ ] **Step 1: Bài đỏ** — `tests/e2e/pwa.mjs` thêm vào `NEEDLES`:
```js
  '<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/api/giao-dien.css">',
```
(chuỗi liền nhau để ép THỨ TỰ: giao diện công ty đứng ngay sau app.css). Thêm bài thuần `src/giao-dien-the-link.test.ts` quét `public/*.html` cùng điều kiện (để `npm test` đỏ, không chỉ e2e):
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
test("mọi trang nạp /api/giao-dien.css NGAY SAU /app.css (ADR-0087)", () => {
  const thieu = readdirSync(new URL("../public/", import.meta.url)).filter((f) => f.endsWith(".html"))
    .filter((f) => !readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8").includes('<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/api/giao-dien.css">'));
  assert.deepEqual(thieu, []);
});
```
Run: `node --test src/giao-dien-the-link.test.ts` — Expected: FAIL liệt kê 33 tệp.

- [ ] **Step 2:** Thay trong từng tệp `<link rel="stylesheet" href="/app.css">` → `<link rel="stylesheet" href="/app.css"><link rel="stylesheet" href="/api/giao-dien.css">` (script Node đọc/ghi từng tệp, khớp đúng 1 lần mỗi tệp; script đặt ở thư mục tạm của phiên, không vào repo).

- [ ] **Step 3:** `node --test src/giao-dien-the-link.test.ts` PASS; `npm run test:e2e -- pwa` PASS; ghi bước "thêm thẻ link giao diện" vào công thức c của `docs/CHANGE-GUIDE.md`. Commit.

---

### Task 5: Màn "Giao diện" (`/giao-dien`)

**Files:**
- Create: `public/giao-dien.html`, `web/giao-dien.ts`, `docs/evidence/2026-10-02-giao-dien/kich-ban/giao-dien-smoke.mjs`
- Modify: `src/shared/sw-policy.ts` (`PAGES`, `PRECACHE` + `/js/giao-dien.js`), `package.json` (`build:web` thêm `web/giao-dien.ts`), `web/shell.ts` (hằng `TRANG_GIAO_DIEN = "/giao-dien"`, mục thanh bên sau "Trợ lý Hỗ trợ" theo cờ `chinhSach`, thêm vào điều kiện `active` của tab "Tôi" dòng 70), `web/account.ts` (dòng sau "Trợ lý Hỗ trợ": `can(staff, "settings.ops") && h("a", { class: "row-link", href: "/giao-dien" }, "Giao diện", icon("next", 20))`), `web/icons.ts` (biểu tượng `palette`), `public/app.css` (khối `.gd-*`, chỉ token), `web/CLAUDE.md` (dòng bảng kịch bản — sửa bằng công cụ sửa tệp)

**Interfaces:**
- Consumes: `NUM`, `PHONG`, `MAC_DINH`, `kiemGiaoDien`, `bienCss`, `type LoiGiaoDien` (Task 1); `GET`/`PUT /api/giao-dien`, `GiaoDienDto` (Task 3); `api`, `ApiError` (`web/api.ts`); `h`, `byId`, `replaceChildren` (`web/dom.ts`); `initShell`, `showError` (`web/shell.ts`); `can` (`src/shared/permissions`).

- [ ] **Step 1: Trang khung + khai trang (đỏ trước)**

Thêm `"/giao-dien"` vào `PAGES` và `"/giao-dien"`, `"/js/giao-dien.js"` vào `PRECACHE` → `node --test src/shared/sw-policy.test.ts` FAIL (thiếu `public/giao-dien.html` / thiếu trong `build:web`). Tạo `public/giao-dien.html` bằng cách chép NGUYÊN `<head>` của `public/locations.html` (đã có thẻ link giao diện từ Task 4), `<title>Giao diện — Island Booking System</title>`, thân:
```html
<body data-title="Giao diện">
<header id="topbar"></header>
<main class="gd">
  <h1>Giao diện</h1>
  <p class="muted">Đổi màu, phông và cỡ chữ cho cả công ty. Thay đổi hiện ngay trên máy bạn; bấm "Áp dụng cho mọi người" thì mọi người thấy ở lần mở trang kế tiếp.</p>
  <div id="error" class="alert" role="alert" hidden></div>
  <div class="gd-luoi">
    <form id="gd-form" class="gd-o" autocomplete="off"></form>
    <aside id="gd-xem-truoc" class="gd-xem card" aria-label="Xem trước"></aside>
  </div>
  <div class="form-actions gd-nut">
    <button id="gd-ap-dung" class="btn btn-primary" type="button" disabled>Áp dụng cho mọi người</button>
    <button id="gd-bo" class="btn" type="button" disabled>Bỏ thay đổi</button>
    <button id="gd-mac-dinh" class="btn" type="button">Về mặc định toàn bộ</button>
  </div>
  <div id="gd-xac-nhan" class="card" hidden></div>
</main>
<script type="module" src="/js/giao-dien.js"></script>
</body></html>
```
Thêm `web/giao-dien.ts` vào `build:web`. Run `node --test src/shared/sw-policy.test.ts` — PASS sau khi tạo `web/giao-dien.ts` (Step 2).

- [ ] **Step 2: `web/giao-dien.ts`**

```ts
// Màn "Giao diện" (ADR-0087, chỉ Toàn quyền — ô settings.ops): chỉnh núm → xem trước NGAY trên chính trang (style.setProperty trên <html>,
// chỉ máy này) → "Áp dụng cho mọi người" (PUT /api/giao-dien, khoá lạc quan version). Kiểm bằng CÙNG tệp thuần với máy chủ.
import { MAC_DINH, NUM, PHONG, bienCss, kiemGiaoDien, type LoiGiaoDien, type Num } from "../src/shared/giao-dien";
import { can } from "../src/shared/permissions";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

const NHOM: readonly [Num["nhom"], string][] = [["nen-chu", "Màu nền và chữ"], ["thanh", "Thanh tác vụ"], ["nut", "Nút"], ["chu", "Phông và cỡ chữ"]];
const errorEl = byId("error");
const formEl = byId("gd-form") as HTMLFormElement;
const xemEl = byId("gd-xem-truoc");
const apDungBtn = byId("gd-ap-dung") as HTMLButtonElement;
const boBtn = byId("gd-bo") as HTMLButtonElement;
const macDinhBtn = byId("gd-mac-dinh") as HTMLButtonElement;
const xacNhanEl = byId("gd-xac-nhan");

let daLuu: Record<string, string> = {}; // bản trên máy chủ
let dangSua: Record<string, string> = {}; // bản đang chỉnh (ghi đè)
let version = 0;
const daApLenTrang = new Set<string>();

const giaTri = (k: string): string => dangSua[k] ?? MAC_DINH[k]!;
const giongNhau = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

/** Áp bản đang chỉnh lên CHÍNH trang này (xem trước thật) — gỡ token cũ trước rồi đặt lại. */
function apXemTruoc(): void {
  const root = document.documentElement;
  for (const t of daApLenTrang) root.style.removeProperty(t);
  daApLenTrang.clear();
  for (const [t, v] of bienCss(dangSua)) { root.style.setProperty(t, v); daApLenTrang.add(t); }
}

function oNhap(n: Num, loiCuaO: string | undefined): HTMLElement {
  const id = `gd-${n.khoa}`;
  const doi = (v: string) => { if (v === MAC_DINH[n.khoa]) delete dangSua[n.khoa]; else dangSua[n.khoa] = v; capNhat(); };
  let input: HTMLElement;
  if (n.loai === "mau") input = h("input", { id, type: "color", value: giaTri(n.khoa), oninput: (e: Event) => doi((e.target as HTMLInputElement).value) });
  else if (n.loai === "phong") input = h("select", { id, onchange: (e: Event) => doi((e.target as HTMLSelectElement).value) },
    ...Object.entries(PHONG).map(([ma, p]) => h("option", { value: ma, selected: ma === giaTri(n.khoa) }, p.ten)));
  else if (n.loai === "dam") input = h("select", { id, onchange: (e: Event) => doi((e.target as HTMLSelectElement).value) },
    ...[400, 500, 600, 700].filter((d) => d >= n.min! && d <= n.max!).map((d) => h("option", { value: String(d), selected: String(d) === giaTri(n.khoa) }, String(d))));
  else input = h("input", { id, type: "number", inputmode: "numeric", min: String(n.min), max: String(n.max), step: "1", value: giaTri(n.khoa),
    onchange: (e: Event) => doi((e.target as HTMLInputElement).value) });
  return h("div", { class: `gd-dong${dangSua[n.khoa] !== undefined ? " is-doi" : ""}` },
    h("label", { for: id }, n.nhan, n.loai === "co" && h("span", { class: "muted" }, ` (${n.min}–${n.max}px)`)),
    input,
    dangSua[n.khoa] !== undefined && h("button", { type: "button", class: "btn-link", onclick: () => doi(MAC_DINH[n.khoa]!) }, "Về mặc định"),
    loiCuaO && h("p", { class: "gd-loi", role: "alert" }, loiCuaO));
}

function capNhat(): void {
  apXemTruoc();
  const loi = kiemGiaoDien(dangSua);
  const loiTheoO = new Map<string, string>();
  for (const l of loi) if (l.khoa) loiTheoO.set(l.khoa, l.message);
  const dangFocus = document.activeElement?.id;
  replaceChildren(formEl, ...NHOM.map(([nhom, ten]) => h("fieldset", { class: "card gd-nhom" }, h("legend", null, ten),
    ...NUM.filter((n) => n.nhom === nhom).map((n) => oNhap(n, loiTheoO.get(n.khoa))))));
  if (dangFocus) (document.getElementById(dangFocus) as HTMLElement | null)?.focus();
  const coDoi = !giongNhau(dangSua, daLuu);
  apDungBtn.disabled = !coDoi || loi.length > 0;
  boBtn.disabled = !coDoi;
}

function dungXemTruoc(): void {
  replaceChildren(xemEl,
    h("div", { class: "gd-xem-thanh" }, h("span", null, "Thanh trên"), h("span", { class: "gd-xem-chuong" }, "Thông báo")),
    h("div", { class: "gd-xem-ben" }, h("span", { class: "sidebar-item" }, "Trang chủ"), h("span", { class: "sidebar-item", "aria-current": "page" }, "Đơn hàng")),
    h("h2", null, "Tiêu đề mục"),
    h("p", null, "Chữ nội dung: Chị Nguyễn Thu Hà · Tour 4 đảo · 6 khách."),
    h("p", { class: "muted" }, "Chữ phụ: Đón tại khách sạn lúc 07:30."),
    h("div", { class: "gd-xem-nut" }, h("button", { type: "button", class: "btn btn-primary" }, "Nút chính"), h("button", { type: "button", class: "btn" }, "Nút phụ"),
      h("button", { type: "button", class: "btn btn-accent" }, "Xác nhận đơn")));
}

async function napLai(): Promise<void> {
  const r = await api<Api.GiaoDienDto>("/api/giao-dien");
  daLuu = { ...r.tokens };
  dangSua = { ...r.tokens };
  version = r.version;
  capNhat();
}

function hoiXacNhan(): void {
  replaceChildren(xacNhanEl,
    h("p", null, "Áp dụng giao diện này cho mọi người? Mọi người sẽ thấy ở lần mở trang kế tiếp."),
    h("div", { class: "actions" },
      h("button", { type: "button", class: "btn btn-primary", onclick: () => void apDung() }, "Áp dụng"),
      h("button", { type: "button", class: "btn", onclick: () => { xacNhanEl.hidden = true; } }, "Thôi")));
  xacNhanEl.hidden = false;
}

async function apDung(): Promise<void> {
  xacNhanEl.hidden = true;
  showError(errorEl, null);
  apDungBtn.disabled = true;
  try {
    const r = await api<Api.GiaoDienDto>("/api/giao-dien", { method: "PUT", body: { tokens: dangSua, version } });
    daLuu = { ...r.tokens };
    version = r.version;
    showError(errorEl, null);
  } catch (err) {
    if (err instanceof ApiError && err.code === "stale") { await napLai(); showError(errorEl, err.message); }
    else showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
  } finally { capNhat(); }
}

void (async () => {
  const staff = await initShell();
  if (!staff) return;
  if (!can(staff, "settings.ops")) { showError(errorEl, "Chỉ người phụ trách hệ thống được đổi giao diện."); formEl.hidden = true; return; }
  dungXemTruoc();
  apDungBtn.onclick = hoiXacNhan;
  boBtn.onclick = () => { dangSua = { ...daLuu }; capNhat(); };
  macDinhBtn.onclick = () => { dangSua = {}; capNhat(); };
  try { await napLai(); } catch (err) { showError(errorEl, err instanceof ApiError ? err.message : "Không tải được cài đặt giao diện."); }
})();
```
**Bắt buộc sửa so với khối mã trên (Review Focus 6):** không dựng lại cả form trong `capNhat()` — ô chọn màu đang mở sẽ đóng mỗi lần kéo. Tách: `dungForm()` dựng form MỘT lần (gọi ở `napLai`, "Bỏ thay đổi", "Về mặc định toàn bộ", và "Về mặc định" của từng ô); `capNhat()` chỉ gọi `apXemTruoc()`, đặt/gỡ lớp `is-doi`, thay nội dung `p.gd-loi` của từng dòng (giữ sẵn một `p.gd-loi` rỗng `hidden` mỗi dòng), hiện/ẩn nút "Về mặc định" của dòng, và bật/tắt hai nút dưới. Bỏ đoạn giữ focus (không còn cần).

Đối chiếu khi viết (theo mã thật, ghi lại chỗ khác): chữ ký `api()` ở `web/api.ts` (cách truyền `method`/`body`), kiểu trả của `initShell()`, cách `h()` nhận sự kiện (`onclick` hay `on: {…}`), `Api.GiaoDienDto` có được xuất lại từ `contracts` qua `web/api.ts` không. Kiểu `LoiGiaoDien` không dùng thì bỏ import.

- [ ] **Step 3: CSS `.gd-*`** (khối mới trước mốc PWA hoặc sau, chỉ token; giá trị mới thêm token vào nhóm "Riêng" của `:root`):
```css
.gd-luoi { display: grid; gap: var(--s4); }
.gd-nhom { display: flex; flex-direction: column; gap: var(--s3); }
.gd-dong { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: var(--s1) var(--s3); }
.gd-dong label { margin: 0; }
.gd-dong input[type="color"] { width: var(--tap-min); height: var(--tap-min); padding: 0; margin: 0; }
.gd-dong select, .gd-dong input[type="number"] { width: var(--w-gd-o); margin: 0; }
.gd-dong.is-doi label { color: var(--c-primary); }
.gd-loi { grid-column: 1 / -1; margin: 0; font-size: var(--fs-label); color: var(--c-danger-text); }
.gd-xem { display: flex; flex-direction: column; gap: var(--s3); }
.gd-xem-thanh { display: flex; justify-content: space-between; padding: var(--s3); background: var(--c-bar-bg); color: var(--c-on-bar); border: 1px solid var(--c-bar-border); border-radius: var(--radius-sm); }
.gd-xem-ben { display: flex; flex-direction: column; gap: 1px; padding: var(--s2); background: var(--c-sidebar-bg); border: 1px solid var(--c-sidebar-border); border-radius: var(--radius-sm); }
.gd-xem-nut { display: flex; flex-wrap: wrap; gap: var(--s2); }
@media (min-width: 900px) { .gd-luoi { grid-template-columns: minmax(0, 1fr) var(--w-gd-xem); align-items: start; } .gd-xem { position: sticky; top: calc(var(--bar-h) + var(--s4)); } }
```
Token mới ở `:root` (nhóm "Riêng"): `--w-gd-o: 160px;` `--w-gd-xem: 360px;` (kèm chú thích ADR-0087).

- [ ] **Step 4: Lối vào**

`web/icons.ts` thêm `palette` (lưới 24×24, nét `currentColor`, ví dụ `[["path", { d: "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-.4-.2-.7-.4-1-.2-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8z" }], ["circle", { cx: "7.5", cy: "10.5", r: "1.2" }], ["circle", { cx: "10.5", cy: "7", r: "1.2" }], ["circle", { cx: "15", cy: "7.5", r: "1.2" }]]`). `web/shell.ts`: sau dòng "Trợ lý Hỗ trợ" (≈263) `if (chinhSach) management.push({ href: TRANG_GIAO_DIEN, label: "Giao diện", icon: "palette", active: (p) => p === TRANG_GIAO_DIEN });`; thêm `|| p === TRANG_GIAO_DIEN` vào `active` của tab "Tôi". `web/account.ts`: dòng ở mục Interfaces.

- [ ] **Step 5: Kịch bản Chrome `giao-dien-smoke.mjs`** (khung `a2-cdp.mjs`, D1 tạm, mở theo thứ tự Bán hàng → Toàn quyền — trang của tài khoản nào mở SAU CÙNG):
1. Bán hàng: thanh bên KHÔNG có "Giao diện"; mở thẳng `/giao-dien` → thấy câu "Chỉ người phụ trách hệ thống…", không có ô chỉnh.
2. Toàn quyền 1040: mục "Giao diện" có ở thanh bên; trang có 4 nhóm; nút "Áp dụng" khoá khi chưa đổi.
3. Đổi "Nền thanh trên" sang `#0c4a6e` (đặt `value` + phát `input`) → `getComputedStyle(#topbar).backgroundColor` = `rgb(12, 74, 110)` ngay (xem trước); ô "Chữ thanh trên" hiện lỗi "khó đọc"; "Áp dụng" khoá.
4. Đổi "Chữ thanh trên" sang `#ffffff` → lỗi mất, "Áp dụng" mở; bấm → hộp xác nhận trong trang → "Áp dụng" → không lỗi.
5. Tải lại `/orders` (cùng Toàn quyền) → thanh trên `rgb(12, 74, 110)` NGAY ở khung đầu (đo trước `DOMContentLoaded` xong không cần — đo ngay sau `Page.loadEventFired`).
6. Giả lập mất mạng tới `/api/giao-dien.css` (CDP `Network.setBlockedURLs`) → tải lại → thanh trên trắng (mặc định), trang không vỡ.
7. "Về mặc định toàn bộ" → Áp dụng → `/orders` thanh trên trắng.
8. 390: trang `/giao-dien` không tràn ngang (`document.documentElement.scrollWidth <= 390`), ô gõ ≥ 16px; axe không có `serious`/`critical`.
Thêm dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`.

- [ ] **Step 6:** `npm run build:web && npm run typecheck && npm test` xanh; chạy `giao-dien-smoke.mjs` (ghi ✓/✘), `trang-chu-smoke.mjs` (đếm mục thanh bên Quản trị/Toàn quyền đổi +1 — sửa con số trong kịch bản, ghi lý do), `quyen-thieu-quan-tri-smoke.mjs` (tài khoản chỉ Toàn quyền thấy "Giao diện"). Commit.

---

### Task 6: Tài liệu, nhật ký phiên bản, kiểm độc lập

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng `gd_setting`, §7 ba route, §9 trang `/giao-dien`), `docs/CHANGE-GUIDE.md` (công thức mới "Thêm một núm giao diện": thêm dòng `NUM` + `MAC_DINH` + cặp tương phản nếu là màu chữ/nền; token phải có ở `:root`), `src/CLAUDE.md` (thêm `giao-dien` vào danh sách module và module nghiêm — công cụ sửa tệp, chủ được hỏi), `src/shared/changelog.ts` + `src/shared/app-info.test.ts` (bản kế tiếp, lời thường: "Toàn quyền đổi được màu, phông, cỡ chữ của cả app ở Tôi → Giao diện."), `docs/HANDOFF-N1.md` (đường thoát khẩn `gd_setting`)

- [ ] **Step 1:** Viết tài liệu như trên. `npm run dict` nếu chưa chạy.
- [ ] **Step 2:** `npm run typecheck && npm test && npm run test:e2e` — xanh (ghi số).
- [ ] **Step 3: Kiểm độc lập** (việc lớn: dữ liệu + quyền) — giao `nguoi-kiem-doc-lap` chỉ đọc: đọc mã thật, chạy lại test/e2e/kịch bản Chrome, soi riêng Review Focus 1–5 và hàng rào quyền (`route-write-guard`, `permission-enforcement`, `cong-quyen`). Chỉ báo "đạt" dựa trên báo cáo đó.
- [ ] **Step 4:** Commit; báo chủ theo 4 mục; đưa lệnh `npm run day-len -- <nhánh>` một lần, kèm "có migration 0069 — chạy `npm run trien-khai`".
