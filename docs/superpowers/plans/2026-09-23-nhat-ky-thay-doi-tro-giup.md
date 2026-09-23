# Trang Trợ giúp + Nhật ký thay đổi: kế hoạch thi công

> **Cho AI thi công:** SUB-SKILL BẮT BUỘC: dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để làm theo từng task. Các bước dùng hộp kiểm (`- [ ]`) để theo dõi.

**Mục tiêu:** mọi nhân viên mở được trang "Trợ giúp" để xem phiên bản hiện tại và Nhật ký thay đổi. Có chấm đỏ khi có bản mới. Mỗi lần phát hành, quy trình tự bắt buộc thêm một mục nhật ký, và máy kiểm được việc này.

**Kiến trúc:**
- Nhật ký là một mảng hằng thuần ở `src/shared/changelog.ts` và là **nguồn duy nhất** của số phiên bản. `APP_VERSION`/`APP_RELEASE_DATE` dẫn xuất từ mục đầu.
- Trang tĩnh `/help` dựng từ mảng đó; không có API mới, không có D1.
- "Đã xem" lưu ở `localStorage`, theo từng máy.
- `GET /api/auth/config` lộ thêm `version`. Script chỉ đọc `scripts/kiem-phien-ban.mjs` so số phiên bản ở máy với production, để bắt lỗi quên ghi nhật ký.

**Công nghệ:** TypeScript, Cloudflare Workers, `node --test`, esbuild, giao diện thuần (`h()`), kịch bản Chrome qua CDP (`a2-cdp.mjs`). **Không** thêm dependency.

**Đặc tả:** `docs/superpowers/specs/2026-09-23-nhat-ky-thay-doi-tro-giup-design.md` (ĐÃ DUYỆT 2026-09-23).

**Trạng thái:** CHỜ CHỦ DUYỆT. Thi công ở **phiên mới**, không phải phiên đã lập kế hoạch này (P15).

## Ràng buộc chung (áp cho mọi task)

- Mọi chữ người dùng thấy là tiếng Việt có dấu. Commit tiếng Việt: tiêu đề nói việc, thân nói vì sao, cuối có dòng `Co-Authored-By` và `Claude-Session` theo môi trường.
- Không `innerHTML`; dựng bằng `h()` (`web/dom.ts`). Giá trị CSS mới đi vào token ở `:root` của `public/app.css`. Ô gõ 16px (trang này không có ô gõ).
- `src/shared/` không import `src/modules/`. Trong `src/shared/`, import nội bộ dùng đuôi `.ts` (như `app-info.ts` → `./vn-date.ts`). `web/` import `src/shared` không đuôi (như `web/shell.ts`).
- Số phiên bản dạng `1.N`, so theo **số** (1.10 > 1.9).
- Mỗi gạch nhật ký tối đa **160** ký tự. Từ cấm (không phân biệt hoa thường, theo ranh giới từ): `task`, `commit`, `api`, `route`, `migration`, `worker`, `deploy`, `e2e`, `d1`, `null`, `undefined`; cấm thêm dấu `` ` `` và định danh kiểu `snake_case`.
- Khoá `localStorage`: `td_help_seen`.
- Việc lớn (chạm triển khai + luật). Cuối kế hoạch bắt buộc có người kiểm độc lập (`nguoi-kiem-doc-lap`). Người thi công không tự nghiệm thu.
- **CẤM tự chạy:** `git push`, merge vào main, `wrangler deploy`, `wrangler d1 … --remote` (ghi), `wrangler secret`. **Không sửa `CLAUDE.md`**: Task 7 chỉ viết tệp đề xuất.
- Mọi cơ chế kiểm mới phải **quan sát chặn thật một lần**: sửa cố ý → đỏ → hoàn nguyên, và ghi vào báo cáo (P16).

## Trọng tâm rà soát (lỗi dễ cắn người dùng mà luồng chính không tự lộ ra)

1. **`localStorage` ném lỗi hoặc bị chặn** (Safari riêng tư, chính sách PWA): không hiện chấm, không lỗi console, trang vẫn chạy. Test ở Task 5, bước c của `help-smoke.mjs`.
2. **Giá trị rác trong `td_help_seen`** (`""`, `"abc"`, `"1"`): coi như chưa xem, không ném lỗi. Test đơn vị ở Task 1 (`hasUnseenRelease`, `isNewForViewer`).
3. **So phiên bản theo chữ thay vì theo số:** 1.10 phải mới hơn 1.9, ở cả chấm đỏ lẫn cổng phát hành. Test ở Task 1.
4. **Production chưa có trường `version`** (lần phát hành đầu tiên của tính năng này), trả lỗi HTTP, hoặc mất mạng: script không được báo ĐẠT nhầm. Không có trường thì coi là 1.0 và nói rõ điều đó; lỗi hoặc mất mạng thì thoát 2. Test ở Task 1 (`releaseGate`) và Task 3 (quan sát mã thoát).
5. **Mở `/help` khi mất mạng** (PWA mở từ cache): `initShell()` treo vô hạn khi mất mạng. Vì vậy nhật ký phải được vẽ **trước** `await initShell()`, để vẫn đọc được. Làm ở Task 4, bước kiểm có trong Task 6.

---

## Sơ đồ tệp

| Tệp | Tạo/Sửa | Trách nhiệm |
|---|---|---|
| `src/shared/changelog.ts` (+ `.test.ts`) | Tạo | Dữ liệu nhật ký, so phiên bản, kiểm cách viết, cổng phát hành (thuần) |
| `src/shared/app-info.ts`, `src/shared/app-info.test.ts` | Sửa | Số/ngày phiên bản dẫn xuất từ nhật ký |
| `src/shared/contracts.ts`, `src/modules/auth/index.ts` | Sửa | `AuthConfigResponse.version` |
| `tests/e2e/turnstile.mjs` (+ nơi khác so cả đối tượng config) | Sửa | Kỳ vọng có `version` |
| `scripts/kiem-phien-ban.mjs` | Tạo | Cổng chỉ-đọc so với production |
| `public/help.html`, `web/help.ts`, `web/help-seen.ts` | Tạo | Trang Trợ giúp; nhớ "đã xem" |
| `src/shared/sw-policy.ts`, `package.json` (`build:web`) | Sửa | Đăng ký trang mới |
| `web/shell.ts`, `web/account.ts`, `public/app.css` | Sửa | Mục "Trợ giúp", chấm đỏ |
| `docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs` | Tạo | Kịch bản Chrome |
| `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` | Sửa | Dòng phiên bản đọc từ mã, không ghi cứng |
| `web/CLAUDE.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md`, `docs/SYSTEM-DESIGN.md` | Sửa | Tài liệu + quy trình |
| `docs/superpowers/specs/2026-09-23-de-xuat-claude-md-nhat-ky-thay-doi.md` | Tạo | Đề xuất sửa `CLAUDE.md` §8 (chờ chủ duyệt) |

---

### Task 1: Nhật ký thay đổi thuần + số phiên bản dẫn xuất

**Files:**
- Create: `src/shared/changelog.ts`, `src/shared/changelog.test.ts`
- Modify: `src/shared/app-info.ts:8-12`, `src/shared/app-info.test.ts:7-21`

**Giao diện:**
- Dùng: `isISODate` từ `src/shared/vn-date.ts`.
- Tạo ra (các task sau dựa vào):
  - `type ChangeKind = "moi" | "sua" | "doi"`
  - `CHANGE_KIND_LABEL: Record<ChangeKind, string>`
  - `interface ReleaseNote { version: string; date: string; items: readonly { kind: ChangeKind; text: string }[] }`
  - `CHANGELOG: readonly ReleaseNote[]` (mới nhất ở đầu)
  - `compareVersions(a: string, b: string): number`: ném lỗi nếu sai dạng
  - `hasUnseenRelease(seen: string | null, current: string): boolean`
  - `isNewForViewer(version: string, seen: string | null, latest: string): boolean`
  - `changelogProblems(log: readonly ReleaseNote[]): string[]`: rỗng nghĩa là hợp lệ
  - `releaseGate(local: string, remote: string | null, mode: "truoc" | "sau"): { ok: boolean; message: string }`
  - `APP_VERSION`, `APP_RELEASE_DATE` (giữ tên, nay dẫn xuất)

- [ ] **Bước 1: Viết test đỏ `src/shared/changelog.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGELOG, compareVersions, changelogProblems, hasUnseenRelease, isNewForViewer, releaseGate, type ReleaseNote } from "./changelog.ts";

const note = (version: string, date: string, text = "Có tính năng mới cho nhân viên.", kind: "moi" | "sua" | "doi" = "moi"): ReleaseNote => ({ version, date, items: [{ kind, text }] });

test("CHANGELOG thật hợp lệ theo mọi luật viết", () => {
  assert.deepEqual(changelogProblems(CHANGELOG), []);
  assert.ok(CHANGELOG.length >= 1);
});

test("compareVersions so theo SỐ, không theo chữ", () => {
  assert.ok(compareVersions("1.10", "1.9") > 0);
  assert.ok(compareVersions("1.9", "1.10") < 0);
  assert.equal(compareVersions("2.0", "2.0"), 0);
  assert.ok(compareVersions("2.0", "1.99") > 0);
  for (const bad of ["1", "1.a", "", "v1.0", "1.0.0"]) assert.throws(() => compareVersions(bad, "1.0"), /phiên bản/i, bad);
});

test("hasUnseenRelease: chưa xem / cũ hơn / rác ⇒ có chấm; bằng hoặc mới hơn ⇒ không", () => {
  assert.equal(hasUnseenRelease(null, "1.3"), true);
  assert.equal(hasUnseenRelease("1.2", "1.3"), true);
  assert.equal(hasUnseenRelease("1.9", "1.10"), true);
  assert.equal(hasUnseenRelease("1.3", "1.3"), false);
  assert.equal(hasUnseenRelease("1.4", "1.3"), false);
  for (const junk of ["", "abc", "1"]) assert.equal(hasUnseenRelease(junk, "1.3"), true, `rác "${junk}" coi như chưa xem`);
});

test("isNewForViewer: chưa từng xem thì chỉ bản mới nhất có nhãn; đã xem X thì mọi bản > X", () => {
  assert.equal(isNewForViewer("1.3", null, "1.3"), true);
  assert.equal(isNewForViewer("1.2", null, "1.3"), false);
  assert.equal(isNewForViewer("1.3", "1.1", "1.3"), true);
  assert.equal(isNewForViewer("1.2", "1.1", "1.3"), true);
  assert.equal(isNewForViewer("1.1", "1.1", "1.3"), false);
  assert.equal(isNewForViewer("1.3", "abc", "1.3"), true, "rác: như chưa từng xem");
});

test("changelogProblems bắt từng loại lỗi viết", () => {
  const ok = [note("1.1", "2026-09-22"), note("1.0", "2026-09-21")];
  assert.deepEqual(changelogProblems(ok), []);
  assert.match(changelogProblems([]).join(), /rỗng/);
  assert.match(changelogProblems([note("1.0", "2026-09-21"), note("1.1", "2026-09-22")]).join(), /tăng dần/, "đảo thứ tự");
  assert.match(changelogProblems([note("1.1", "2026-09-22"), note("1.1", "2026-09-21")]).join(), /tăng dần/, "trùng số");
  assert.match(changelogProblems([note("1.1", "2026-09-20"), note("1.0", "2026-09-21")]).join(), /ngày/, "ngày giảm");
  assert.match(changelogProblems([note("1.0", "2026-02-30")]).join(), /ngày/, "ngày sai lịch");
  assert.match(changelogProblems([note("1.a", "2026-09-21")]).join(), /phiên bản/i);
  assert.match(changelogProblems([{ version: "1.0", date: "2026-09-21", items: [] }]).join(), /ít nhất một/);
  assert.match(changelogProblems([note("1.0", "2026-09-21", "   ")]).join(), /rỗng/);
  assert.match(changelogProblems([note("1.0", "2026-09-21", "a".repeat(161))]).join(), /160/);
  assert.match(changelogProblems([{ version: "1.0", date: "2026-09-21", items: [{ kind: "x" as "moi", text: "Chữ thường." }] }]).join(), /loại/);
});

test("changelogProblems chặn chữ kỹ thuật lộ ra nhân viên", () => {
  for (const bad of ["Thêm API mới.", "Sửa route đăng nhập.", "Chạy migration mới.", "Xong Task 3.", "Đã deploy lại.", "Sửa lỗi `null`.", "Thêm cột last_login_at.", "Sửa e2e.", "Đổi Worker.", "Bảng D1 mới."]) {
    assert.ok(changelogProblems([note("1.0", "2026-09-21", bad)]).length > 0, `phải chặn: ${bad}`);
  }
  for (const good of ["Đăng nhập bằng Face ID.", "Xem nhật ký thay đổi ở trang Trợ giúp.", "Chạm vào ảnh xác nhận để tải về."]) {
    assert.deepEqual(changelogProblems([note("1.0", "2026-09-21", good)]), [], `không chặn nhầm: ${good}`);
  }
});

test("releaseGate trước deploy: chỉ ĐẠT khi bản ở máy mới hơn production", () => {
  assert.equal(releaseGate("1.4", "1.3", "truoc").ok, true);
  assert.equal(releaseGate("1.3", "1.3", "truoc").ok, false);
  assert.equal(releaseGate("1.2", "1.3", "truoc").ok, false);
  assert.equal(releaseGate("1.10", "1.9", "truoc").ok, true);
  const first = releaseGate("1.4", null, "truoc");
  assert.equal(first.ok, true);
  assert.match(first.message, /coi là 1\.0/, "production chưa báo số: nói rõ là coi như 1.0");
  assert.equal(releaseGate("1.4", "rác", "truoc").ok, false, "production trả số lạ: không đạt");
});

test("releaseGate sau deploy: chỉ ĐẠT khi production đúng bằng bản ở máy", () => {
  assert.equal(releaseGate("1.4", "1.4", "sau").ok, true);
  assert.equal(releaseGate("1.4", "1.3", "sau").ok, false);
  assert.equal(releaseGate("1.4", null, "sau").ok, false);
});
```

- [ ] **Bước 2: Chạy, xác nhận đỏ**

Run: `node --test src/shared/changelog.test.ts`
Expected: FAIL, lỗi không tìm thấy module `./changelog.ts`.

- [ ] **Bước 3: Viết `src/shared/changelog.ts`**

```ts
// Nhật ký thay đổi của ứng dụng (đặc tả docs/superpowers/specs/2026-09-23-nhat-ky-thay-doi-tro-giup-design.md). Thuần, không I/O.
// NGUỒN DUY NHẤT của số phiên bản: app-info.ts dẫn xuất APP_VERSION/APP_RELEASE_DATE từ mục đầu. Mỗi lần deploy mã mới = thêm MỘT mục vào ĐẦU mảng,
// số tăng 1 (1.N), lời thường cho nhân viên (công thức "Ghi nhật ký thay đổi" ở docs/CHANGE-GUIDE.md). changelog.test.ts chặn cách viết sai.
import { isISODate } from "./vn-date.ts";

export type ChangeKind = "moi" | "sua" | "doi";
export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { moi: "Mới", sua: "Đã sửa", doi: "Thay đổi" };
export interface ChangeItem { readonly kind: ChangeKind; readonly text: string }
export interface ReleaseNote { readonly version: string; readonly date: string; readonly items: readonly ChangeItem[] }

/** Mới nhất ở ĐẦU. */
export const CHANGELOG: readonly ReleaseNote[] = [
  {
    version: "1.3",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Đăng nhập bằng Face ID hoặc vân tay: bật một lần ở trang Tôi, lần sau chạm một cái là vào, không cần gõ số điện thoại và mã PIN." },
      { kind: "moi", text: "Quên mã PIN: đặt mã PIN mới ngay trên máy đã bật Face ID, không cần nhờ quản trị viên." },
      { kind: "doi", text: "Quản trị viên thấy ai đã bật Face ID và gỡ được khi cần. Ngưng tài khoản hoặc đặt lại mã PIN sẽ gỡ luôn Face ID của người đó." },
    ],
  },
  {
    version: "1.2",
    date: "2026-09-23",
    items: [
      { kind: "moi", text: "Trang chủ mới cho nhân viên văn phòng: đơn còn thiếu tiền, đơn nháp chưa xác nhận, đơn chưa có người phụ trách, chuyến đón hôm nay và doanh thu tuần." },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-22",
    items: [
      { kind: "doi", text: "Giao diện mới cho các trang: dễ đọc hơn trên điện thoại, bố cục hai cột trên máy tính." },
      { kind: "moi", text: "Ghi được người đặt tour trên từng đơn." },
      { kind: "moi", text: "Hướng dẫn viên có mục \"Việc của tôi\" ở trang Tôi và ghi được điều chỉnh số khách, số tiền cho đơn đã xác nhận mà mình phụ trách." },
      { kind: "doi", text: "Quyền \"Thực hiện\" đổi tên thành \"Hướng dẫn viên\"." },
      { kind: "sua", text: "Sửa lỗi không tạo được tài khoản nhân viên mới." },
    ],
  },
  {
    version: "1.0",
    date: "2026-09-21",
    items: [
      { kind: "moi", text: "Lập đơn dịch vụ tour từ bảng giá chung, ghi thông tin chuyến cho từng dịch vụ và xác nhận đơn." },
      { kind: "moi", text: "Gửi ảnh xác nhận đơn cho khách; giao người phụ trách cho từng đơn." },
      { kind: "moi", text: "Đăng nhập bằng số điện thoại và mã PIN, có bước xác minh chống dò mã." },
      { kind: "moi", text: "Cài app lên màn hình chính điện thoại; gửi ý kiến cho quản trị viên ở mục Góp ý / Báo lỗi." },
    ],
  },
];

const VERSION_RE = /^(\d+)\.(\d+)$/;
function parseVersion(v: string): [number, number] | null {
  const m = VERSION_RE.exec(v);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** So hai số phiên bản `X.Y` theo SỐ (1.10 > 1.9). Sai dạng thì ném lỗi. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) throw new Error(`Số phiên bản không hợp lệ (cần dạng X.Y): "${pa ? b : a}"`);
  return pa[0] - pb[0] || pa[1] - pb[1];
}

/** Chấm đỏ: chưa từng xem, giá trị lưu là rác, hoặc đã xem bản cũ hơn ⇒ true. */
export function hasUnseenRelease(seen: string | null, current: string): boolean {
  if (seen === null || !parseVersion(seen)) return true;
  return compareVersions(seen, current) < 0;
}

/** Nhãn "Mới cập nhật" trên từng bản: chưa từng xem (hoặc rác) ⇒ chỉ bản mới nhất; đã xem X ⇒ mọi bản mới hơn X. */
export function isNewForViewer(version: string, seen: string | null, latest: string): boolean {
  if (seen === null || !parseVersion(seen)) return version === latest;
  return compareVersions(version, seen) > 0;
}

export const MAX_ITEM_LENGTH = 160;
const FORBIDDEN_WORDS = ["task", "commit", "api", "route", "migration", "worker", "deploy", "e2e", "d1", "null", "undefined"];
const FORBIDDEN_RE = new RegExp(`(^|[^\\p{L}\\p{N}_])(${FORBIDDEN_WORDS.join("|")})(?=$|[^\\p{L}\\p{N}_])`, "iu");
const SNAKE_RE = /[A-Za-z0-9]+_[A-Za-z0-9]+/;
const KINDS = new Set<string>(Object.keys(CHANGE_KIND_LABEL));

/** Mọi lỗi viết của nhật ký (rỗng = hợp lệ). Dùng ở changelog.test.ts. */
export function changelogProblems(log: readonly ReleaseNote[]): string[] {
  const out: string[] = [];
  if (log.length === 0) return ["Nhật ký rỗng: cần ít nhất một bản."];
  log.forEach((n, i) => {
    const at = `bản #${i} (${n.version})`;
    if (!parseVersion(n.version)) out.push(`${at}: số phiên bản không hợp lệ, cần dạng X.Y`);
    if (!isISODate(n.date)) out.push(`${at}: ngày không hợp lệ "${n.date}"`);
    if (n.items.length === 0) out.push(`${at}: cần ít nhất một gạch`);
    n.items.forEach((it, j) => {
      const t = it.text.trim();
      if (!KINDS.has(it.kind)) out.push(`${at} gạch ${j}: loại không hợp lệ "${it.kind}"`);
      if (!t) out.push(`${at} gạch ${j}: chữ rỗng`);
      if (t.length > MAX_ITEM_LENGTH) out.push(`${at} gạch ${j}: dài ${t.length} ký tự, tối đa ${MAX_ITEM_LENGTH}`);
      const bad = FORBIDDEN_RE.exec(t);
      if (bad) out.push(`${at} gạch ${j}: có chữ kỹ thuật "${bad[2]}"`);
      if (t.includes("`")) out.push(`${at} gạch ${j}: có dấu \``);
      if (SNAKE_RE.test(t)) out.push(`${at} gạch ${j}: có định danh kiểu snake_case`);
    });
    const next = log[i + 1];
    if (next && parseVersion(n.version) && parseVersion(next.version) && compareVersions(n.version, next.version) <= 0) out.push(`${at}: số phiên bản phải tăng dần nghiêm ngặt (mới nhất ở đầu), bản sau là ${next.version}`);
    if (next && isISODate(n.date) && isISODate(next.date) && n.date < next.date) out.push(`${at}: ngày ${n.date} sớm hơn bản cũ hơn (${next.date})`);
  });
  return out;
}

/** Cổng phát hành (scripts/kiem-phien-ban.mjs). "truoc": bản ở máy phải MỚI HƠN production; "sau": production phải BẰNG bản ở máy. remote null = production chưa báo số (coi là 1.0). */
export function releaseGate(local: string, remote: string | null, mode: "truoc" | "sau"): { ok: boolean; message: string } {
  const note = remote === null ? " (production chưa báo số phiên bản: coi là 1.0)" : "";
  const prod = remote ?? "1.0";
  if (!parseVersion(prod)) return { ok: false, message: `CHƯA ĐẠT: production trả số phiên bản lạ "${prod}".` };
  const cmp = compareVersions(local, prod);
  if (mode === "truoc") {
    return cmp > 0
      ? { ok: true, message: `ĐẠT: bản ở máy ${local} mới hơn production ${prod}${note}.` }
      : { ok: false, message: `CHƯA ĐẠT: bản ở máy ${local} không mới hơn production ${prod}${note}. Thêm mục mới vào đầu CHANGELOG (src/shared/changelog.ts).` };
  }
  return remote !== null && cmp === 0
    ? { ok: true, message: `ĐẠT: production đang chạy đúng bản ${local}.` }
    : { ok: false, message: `CHƯA ĐẠT: production báo ${prod}${note}, bản ở máy là ${local}.` };
}
```

- [ ] **Bước 4: Chạy, xác nhận xanh**

Run: `node --test src/shared/changelog.test.ts`
Expected: PASS mọi test. Nếu gạch lịch sử nào bị chặn nhầm, **sửa câu**, không nới luật.

- [ ] **Bước 5: Viết lại test phiên bản ở `src/shared/app-info.test.ts` cho đỏ**

Thay test đầu và test `formatReleaseLine: đúng dòng…` (dòng 7–21) bằng:

```ts
import { CHANGELOG } from "./changelog.ts";

test("số phiên bản và ngày phát hành DẪN XUẤT từ mục đầu của nhật ký (một nguồn)", () => {
  assert.equal(APP_NAME, "Tour Đảo Booking");
  assert.equal(APP_VERSION, CHANGELOG[0]?.version);
  assert.equal(APP_RELEASE_DATE, CHANGELOG[0]?.date);
  assert.ok(isISODate(APP_RELEASE_DATE));
});

test("formatReleaseLine: dòng phiên bản của bản mới nhất", () => {
  assert.equal(formatReleaseLine(), "Phiên bản 1.3 · ngày 23 tháng 9 năm 2026");
});
```

Run: `node --test src/shared/app-info.test.ts`
Expected: FAIL (`APP_VERSION` vẫn là `"1.0"`).

- [ ] **Bước 6: Dẫn xuất trong `src/shared/app-info.ts`**

Thay dòng 1–12 (chú thích đầu tệp đến `APP_RELEASE_DATE`) bằng:

```ts
// Thông tin BẢN PHÁT HÀNH của ứng dụng: tên, số phiên bản, ngày phát hành. Là hằng trong mã (thuộc về bản phát hành, không phải dữ liệu
// vận hành) nên KHÔNG nằm ở D1. Thuần, không I/O — server và giao diện dùng chung một nguồn.
// Số phiên bản và ngày KHÔNG viết tay ở đây: dẫn xuất từ mục đầu của nhật ký thay đổi (src/shared/changelog.ts, công thức j ở docs/CHANGE-GUIDE.md).
// Thông tin pháp lý của công ty (tên, MST, địa chỉ…) KHÔNG ở đây mà ở bảng `company_profile`, đọc qua module `company` (GET /api/company).
import { CHANGELOG } from "./changelog.ts";
import { isISODate } from "./vn-date.ts";

const LATEST = CHANGELOG[0];
if (!LATEST) throw new Error("Nhật ký thay đổi rỗng: cần ít nhất một bản (src/shared/changelog.ts).");

/** Tên ứng dụng. Phải trùng `name` trong `public/manifest.webmanifest` (nguồn khai; `src/shared/app-info.test.ts` kiểm). */
export const APP_NAME = "Tour Đảo Booking";
/** Số phiên bản hiển thị (không kèm chữ "Phiên bản"), dẫn xuất từ nhật ký. */
export const APP_VERSION: string = LATEST.version;
/** Ngày phát hành, `YYYY-MM-DD` (giờ Việt Nam), dẫn xuất từ nhật ký. */
export const APP_RELEASE_DATE: string = LATEST.date;
```

- [ ] **Bước 7: Chạy toàn bộ và typecheck**

Run: `npm test && npm run typecheck`
Expected: mọi test xanh, 0 lỗi.

- [ ] **Bước 8: Quan sát chặn thật (P16).** Làm lần lượt, mỗi lần chạy `node --test src/shared/changelog.test.ts` thấy **đỏ**, rồi hoàn nguyên:
  - (a) đổi `"1.3"` thành `"1.2"`;
  - (b) thêm `API` vào một gạch;
  - (c) đổi ngày bản 1.1 thành `2026-09-24`.

  Ghi ba lần đỏ vào báo cáo task. Sau cùng `git diff src/shared/changelog.ts` phải rỗng so với bước 3.

- [ ] **Bước 9: Commit**

```bash
git add src/shared/changelog.ts src/shared/changelog.test.ts src/shared/app-info.ts src/shared/app-info.test.ts
git commit -m "Nhật ký thay đổi thuần làm nguồn duy nhất của số phiên bản

Số phiên bản viết tay đã đứng ở 1.0 qua nhiều lần deploy. Gom về một mảng
nhật ký có luật viết được test chặn (tăng dần, lời thường, không chữ kỹ
thuật); ghi bù lịch sử 1.0 → 1.3."
```

---

### Task 2: Cấu hình công khai lộ `version`

**Files:**
- Modify: `src/shared/contracts.ts:54-59`, `src/modules/auth/index.ts:102-104`, `tests/e2e/turnstile.mjs:34`, và mọi kỳ vọng khác so cả đối tượng `/api/auth/config`

**Giao diện:**
- Dùng: `APP_VERSION` (Task 1).
- Tạo ra: `AuthConfigResponse.version: string`.

- [ ] **Bước 1: Tìm mọi nơi so cả đối tượng cấu hình**

Run: `grep -rn "api/auth/config" tests/e2e docs/evidence --include=*.mjs`
Ghi lại các dòng có `deepEqual` trên thân trả về. Dòng đã biết: `tests/e2e/turnstile.mjs:34`.

- [ ] **Bước 2: Sửa kỳ vọng e2e cho đỏ.** Ở đầu `tests/e2e/turnstile.mjs` thêm `import { APP_VERSION } from "../../src/shared/app-info.ts";` và ở dòng 34 thêm `version: APP_VERSION` vào đối tượng kỳ vọng. Các nơi khác tìm được ở bước 1 sửa y như vậy.

Run: `npm run build:web && npm run test:e2e -- turnstile`
Expected: FAIL ở `deepEqual`, vì thân thiếu `version`.

- [ ] **Bước 3: Thêm trường.**
  - `src/shared/contracts.ts`, trong `AuthConfigResponse`, thêm vào sau `passkey: boolean;`:

    ```ts
      /** Số phiên bản đang chạy (= APP_VERSION, từ nhật ký thay đổi). Công khai; scripts/kiem-phien-ban.mjs so với bản ở máy trước/sau deploy. */
      version: string;
    ```

  - `src/modules/auth/index.ts`, trong đối tượng của route `/api/auth/config`, thêm `version: APP_VERSION`, cùng `import { APP_VERSION } from "../../shared/app-info.ts";` (theo kiểu import sẵn có của tệp; module `auth` là STRICT nhưng `src/shared` được phép).

- [ ] **Bước 4: Chạy lại**

Run: `npm test && npm run typecheck && npm run test:e2e -- turnstile passkey maintenance`
Expected: xanh.

- [ ] **Bước 5: Commit**

```bash
git add src/shared/contracts.ts src/modules/auth/index.ts tests/e2e
git commit -m "Cấu hình công khai báo số phiên bản đang chạy

Để máy kiểm được production đang chạy bản nào và bản sắp deploy đã có mục
nhật ký mới chưa, chỉ bằng một GET."
```

---

### Task 3: Cổng phát hành `scripts/kiem-phien-ban.mjs`

**Files:**
- Create: `scripts/kiem-phien-ban.mjs`

**Giao diện:**
- Dùng: `CHANGELOG`, `releaseGate` (Task 1); trường `version` (Task 2).
- Tạo ra: lệnh `node scripts/kiem-phien-ban.mjs [--sau-deploy]`, mã thoát 0 = ĐẠT, 1 = CHƯA ĐẠT, 2 = không chạy được. Biến `PROD_URL` (mặc định `https://booking.tourdao.vn`) để thử trên máy.

- [ ] **Bước 1: Viết script**

```js
// Cổng phát hành CHỈ ĐỌC (đặc tả nhật ký thay đổi §4): so số phiên bản ở máy (mục đầu src/shared/changelog.ts) với production (GET /api/auth/config).
//   node scripts/kiem-phien-ban.mjs              trước deploy: ĐẠT khi bản ở máy MỚI HƠN production (bắt lỗi quên ghi nhật ký)
//   node scripts/kiem-phien-ban.mjs --sau-deploy  sau deploy: ĐẠT khi production BẰNG bản ở máy
// Mã thoát: 0 ĐẠT · 1 CHƯA ĐẠT · 2 KHÔNG CHẠY ĐƯỢC (mạng/HTTP/thân lạ — không phải "đạt"). PROD_URL=… để thử trên máy.
import { CHANGELOG, releaseGate } from "../src/shared/changelog.ts";

const base = process.env.PROD_URL ?? "https://booking.tourdao.vn";
const mode = process.argv.includes("--sau-deploy") ? "sau" : "truoc";
const local = CHANGELOG[0]?.version;
if (!local) {
  console.error("KHÔNG CHẠY ĐƯỢC: nhật ký thay đổi rỗng.");
  process.exit(2);
}
let remote;
try {
  const r = await fetch(`${base}/api/auth/config`, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const body = await r.json();
  remote = typeof body?.version === "string" ? body.version : null;
} catch (e) {
  console.error(`KHÔNG CHẠY ĐƯỢC: không đọc được ${base}/api/auth/config (${e?.message ?? e}).`);
  process.exit(2);
}
const gate = releaseGate(local, remote, mode);
console.log(gate.message);
process.exit(gate.ok ? 0 : 1);
```

- [ ] **Bước 2: Quan sát ba mã thoát thật (P16)**
  - Production hiện chưa có `version`, và bản ở máy là 1.3 > 1.0.

    Run: `node scripts/kiem-phien-ban.mjs; echo "exit=$?"`
    Expected: `ĐẠT: … (production chưa báo số phiên bản: coi là 1.0).` và `exit=0`.

  - Run: `node scripts/kiem-phien-ban.mjs --sau-deploy; echo "exit=$?"`
    Expected: `CHƯA ĐẠT…` và `exit=1`.

  - Run: `PROD_URL=http://127.0.0.1:9 node scripts/kiem-phien-ban.mjs; echo "exit=$?"`
    Expected: `KHÔNG CHẠY ĐƯỢC…` và `exit=2`.

  - Chạy thử "quên tăng số" trên máy: chạy `npm run dev` ở nền, rồi `PROD_URL=http://localhost:8787 node scripts/kiem-phien-ban.mjs; echo "exit=$?"`. Server ở máy cùng bản 1.3, nên kỳ vọng `CHƯA ĐẠT` và `exit=1`. Tắt `wrangler dev` sau khi xong.

  Ghi cả bốn kết quả vào báo cáo.

- [ ] **Bước 3: Commit**

```bash
git add scripts/kiem-phien-ban.mjs
git commit -m "Cổng phát hành chỉ đọc: so số phiên bản ở máy với production

Bắt lỗi quên ghi nhật ký trước deploy và xác nhận production đã lên đúng
bản sau deploy; mã thoát 2 khi không đọc được để không bao giờ báo đạt nhầm."
```

---

### Task 4: Trang Trợ giúp `/help`

**Files:**
- Create: `public/help.html`, `web/help.ts`, `web/help-seen.ts`
- Modify: `src/shared/sw-policy.ts:15` (`PAGES`), `package.json:11` (`build:web`), `public/app.css` (token + vài luật)

**Giao diện:**
- Dùng: `CHANGELOG`, `CHANGE_KIND_LABEL`, `isNewForViewer`, `hasUnseenRelease` (Task 1); `APP_NAME`, `APP_VERSION`, `formatLongDate`, `formatReleaseLine` (`app-info.ts`); `initShell` (`web/shell.ts`); `h`, `byId`, `replaceChildren` (`web/dom.ts`).
- Tạo ra (Task 5 dùng), trong `web/help-seen.ts`:
  - `readHelpSeen(): string | null`
  - `markHelpSeen(version: string): void`
  - `helpHasNews(): boolean`
  - `newDot(): HTMLElement`

- [ ] **Bước 1: Đăng ký trang cho đỏ.** Thêm `"/help"` vào cuối `PAGES` ở `src/shared/sw-policy.ts`.

Run: `node --test src/shared/sw-policy.test.ts`
Expected: FAIL, vì test đối chiếu `PAGES` với `public/*.html` và chưa có `help.html`.

- [ ] **Bước 2: Viết `public/help.html`.** Phần `<head>` giống hệt `public/feedback.html` (các thẻ meta mà `pwa.mjs` kiểm), chỉ đổi `<title>`:

```html
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#0c4a6e"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Tour Đảo"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/app.css"><title>Trợ giúp — Tour Đảo Booking</title></head>
<body data-title="Trợ giúp" data-back="/account">
<header id="topbar"></header>
<main>
  <h1>Trợ giúp</h1>
  <p id="release" class="muted"></p>
  <div id="error" class="alert" role="alert" hidden></div>
  <section class="card">
    <h2>Nhật ký thay đổi</h2>
    <div id="changelog"></div>
  </section>
  <section class="card">
    <h2>Cần hỗ trợ?</h2>
    <p class="muted">Gặp lỗi hoặc có góp ý, hãy gửi cho quản trị viên. Chúng tôi phản hồi ngay trong app.</p>
    <a class="btn btn-primary" href="/feedback?new=1&amp;from=%2Fhelp">Góp ý / Báo lỗi</a>
  </section>
</main>
<script type="module" src="/js/help.js"></script>
</body></html>
```

- [ ] **Bước 3: Viết `web/help-seen.ts`**

```ts
// Nhớ "đã xem nhật ký thay đổi" THEO TỪNG MÁY (localStorage, không lên máy chủ — đặc tả §3.3). localStorage bị chặn/ném lỗi ⇒ coi như ĐÃ xem (không chấm, không lỗi).
import { APP_VERSION } from "../src/shared/app-info";
import { hasUnseenRelease } from "../src/shared/changelog";
import { h } from "./dom";

const KEY = "td_help_seen";

export function readHelpSeen(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return APP_VERSION;
  }
}

export function markHelpSeen(version: string): void {
  try {
    localStorage.setItem(KEY, version);
  } catch {
    /* bị chặn: bỏ qua, lần sau vẫn không hiện chấm vì readHelpSeen coi như đã xem */
  }
}

export function helpHasNews(): boolean {
  return hasUnseenRelease(readHelpSeen(), APP_VERSION);
}

/** Chấm đỏ nhỏ báo có bản mới. */
export function newDot(): HTMLElement {
  return h("span", { class: "new-dot", role: "img", "aria-label": "Có bản mới" });
}
```

- [ ] **Bước 4: Viết `web/help.ts`.** Nhật ký được vẽ **trước** `await initShell()`, để khi mất mạng (lúc đó `initShell` treo) vẫn đọc được (trọng tâm 5). Việc đánh dấu đã xem cũng làm trước, để khung không vẽ chấm trên chính trang này.

```ts
import { APP_NAME, APP_VERSION, formatLongDate, formatReleaseLine } from "../src/shared/app-info";
import { CHANGELOG, CHANGE_KIND_LABEL, isNewForViewer, type ChangeKind } from "../src/shared/changelog";
import { byId, h, replaceChildren } from "./dom";
import { markHelpSeen, readHelpSeen } from "./help-seen";
import { initShell } from "./shell";

const KIND_CLASS: Record<ChangeKind, string> = { moi: "badge badge-confirmed", sua: "badge badge-draft", doi: "badge badge-cancelled" };

const seenBefore = readHelpSeen();
markHelpSeen(APP_VERSION);
replaceChildren(byId("release"), `${APP_NAME} · ${formatReleaseLine()}`);
replaceChildren(
  byId("changelog"),
  ...CHANGELOG.map((note) =>
    h(
      "section",
      { class: "release-note" },
      h("h3", null, `Phiên bản ${note.version} — ngày ${formatLongDate(note.date)}`, isNewForViewer(note.version, seenBefore, APP_VERSION) && h("span", { class: "badge badge-new" }, "Mới cập nhật")),
      h("ul", { class: "release-items" }, ...note.items.map((it) => h("li", null, h("span", { class: KIND_CLASS[it.kind] }, CHANGE_KIND_LABEL[it.kind]), " ", it.text))),
    ),
  ),
);
await initShell();
```

- [ ] **Bước 5: CSS.** Trong `:root` của `public/app.css`, cạnh `--fs-badge`, thêm `--dot-size: 8px;`. Cuối tệp thêm:

```css
/* Trang Trợ giúp + chấm đỏ "có bản mới" (đặc tả nhật ký thay đổi 2026-09-23) */
.new-dot { display: inline-block; width: var(--dot-size); height: var(--dot-size); margin-left: var(--s1); vertical-align: middle; border-radius: var(--radius-pill); background: var(--c-danger); }
#tabbar .tab-icon { position: relative; }
#tabbar .tab-icon .new-dot { position: absolute; top: 0; right: calc(var(--dot-size) * -1); margin-left: 0; }
.badge-new { margin-left: var(--s1); color: var(--c-danger-text); background: var(--c-danger-soft); }
.release-note + .release-note { margin-top: var(--s3); padding-top: var(--s3); border-top: 1px solid var(--c-line); }
.release-note h3 { margin: 0 0 var(--s2); }
.release-items { margin: 0; padding-left: var(--s4); }
.release-items li + li { margin-top: var(--s1); }
```

Trước khi dùng, kiểm các token `--s1`…`--s4` có thật: `grep -n "^\s*--s[0-9]" public/app.css`. Thiếu token nào thì dùng token gần nhất đang có; không viết số thô.

- [ ] **Bước 6: Thêm `web/help.ts` vào `build:web`.** Trong `package.json`, chèn ` web/help.ts` ngay sau ` web/home.ts` trong danh sách esbuild.

- [ ] **Bước 7: Chạy**

Run: `npm run build:web && npm test && npm run typecheck && npm run test:e2e -- pwa`
Expected: xanh. `pwa.mjs` kiểm thẻ meta của mọi trang trong `PAGES`, kể cả `/help`.

- [ ] **Bước 8: Commit**

```bash
git add public/help.html web/help.ts web/help-seen.ts src/shared/sw-policy.ts package.json public/app.css
git commit -m "Trang Trợ giúp: phiên bản, nhật ký thay đổi, lối tắt Góp ý

Nhân viên cần chỗ xem có gì mới sau mỗi lần phát hành. Nhật ký vẽ trước khi
khung xác thực phiên để vẫn đọc được khi mất mạng."
```

---

### Task 5: Đường vào + chấm đỏ

**Files:**
- Modify: `web/shell.ts` (`tabsFor`, `tabBar`, `initShell`), `web/account.ts:37-43`

**Giao diện:**
- Dùng: `helpHasNews`, `newDot` (Task 4).

- [ ] **Bước 1: `web/shell.ts`**
  - Thêm `import { helpHasNews, newDot } from "./help-seen";`.
  - Trong `tabsFor`, tab Tôi coi `/help` là của mình: `active: (p) => p === "/account" || p === "/audit" || p === "/help"`.
  - Trong `tabBar`, gắn chấm vào icon tab Tôi khi có bản mới. Thay phần thân `map` bằng:

    ```ts
    ...tabsFor(admin, office, canCreate).map((t) =>
      h("a", { href: t.href, class: t.icon === "plus" ? "tab tab-new" : "tab", "aria-current": t.active(path) ? "page" : false }, h("span", { class: "tab-icon" }, icon(t.icon), t.href === "/account" && helpHasNews() && newDot()), h("span", null, t.label)),
    ),
    ```

  - Trong `initShell`, ngay sau `nav.append(feedbackLink);`, thêm:

    ```ts
    nav.append(h("a", { href: "/help" }, "Trợ giúp", helpHasNews() && newDot()));
    ```

- [ ] **Bước 2: `web/account.ts`.** Import `helpHasNews`, `newDot` từ `./help-seen`. Trong `replaceChildren(byId("links"), …)`, thêm dòng này ngay sau dòng "Góp ý / Báo lỗi":

```ts
  h("a", { class: "row-link", href: "/help" }, "Trợ giúp", helpHasNews() && newDot(), icon("next", 20)),
```

- [ ] **Bước 3: Chạy**

Run: `npm run build:web && npm test && npm run typecheck`
Expected: xanh.

- [ ] **Bước 4: Commit**

```bash
git add web/shell.ts web/account.ts
git commit -m "Mục Trợ giúp ở menu máy tính và trang Tôi, chấm đỏ khi có bản mới

Không thêm tab dưới đáy để giữ gọn; chấm đỏ ở tab Tôi dẫn người dùng điện
thoại tới trang Tôi, nơi có dòng Trợ giúp."
```

---

### Task 6: Kịch bản Chrome + bỏ ghi cứng dòng phiên bản

**Files:**
- Create: `docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs`
- Modify: `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs:36-38`, `web/CLAUDE.md` (bảng kịch bản)

**Giao diện:**
- Dùng: `startEnv`, `ACCOUNTS`, `ok` (`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`); `CHANGELOG` và `formatReleaseLine` từ mã nguồn.

- [ ] **Bước 1: Viết `help-smoke.mjs`**

```js
// Kiểm trang Trợ giúp + chấm đỏ bằng Chrome thật (môi trường A2: D1 tạm + wrangler dev + Chrome headless qua CDP). KHÔNG cần mạng ngoài.
// Chạy từ GỐC repo: npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs
//   a  mỗi quyền (SALES, ACCOUNTING, ADMIN, FIELD) mở /help: đúng dòng phiên bản, đủ số bản, bản đầu là bản mới nhất, nút Góp ý đúng đích
//   b  máy tính 1040: menu trên có "Trợ giúp"; điện thoại 390: trang Tôi có dòng "Trợ giúp"; thanh tab của SALES không thêm tab
//   c  chấm đỏ: chưa xem ⇒ có ở tab Tôi + dòng Trợ giúp; mở /help ⇒ tắt; lưu bản cũ ⇒ hiện lại; lưu rác ⇒ hiện; localStorage ném lỗi ⇒ không chấm, không lỗi
//   d  console sạch, không lỗi CSP; vùng chạm ≥ 44px, không tràn ngang ở 390 và 320 trên /help
import assert from "node:assert/strict";
import { join } from "node:path";
import { ACCOUNTS, ok, startEnv } from "../../2026-09-20-a2/kich-ban/a2-cdp.mjs";
import { CHANGELOG } from "../../../../src/shared/changelog.ts";
import { APP_NAME, formatReleaseLine } from "../../../../src/shared/app-info.ts";

const OUT = process.env.OUT ?? "docs/evidence/2026-09-23-nhat-ky-thay-doi";
const M = { width: 390, height: 844, mobile: true };
const NARROW = { width: 320, height: 568, mobile: true };
const DESK = { width: 1040, height: 800, mobile: false };
ACCOUNTS.field = { name: "Hướng Dẫn", phone: "0900000205", pin: "246813", permissions: ["FIELD"] }; // startEnv gieo mọi ACCOUNTS vào D1 tạm

const failures = [];
async function step(id, name, fn) {
  try {
    await fn();
    ok(`${id}) ${name}`);
  } catch (e) {
    failures.push(id);
    console.log(`✗ ${id}) ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ")}`);
  }
}
const q = (sel) => `document.querySelector(${JSON.stringify(sel)})`;
const reload = async (p) => {
  await p.send("Page.reload", {});
  await p.waitFor("document.readyState === 'complete'", "tải lại xong");
};
const goto = async (p, path) => {
  await p.send("Page.navigate", { url: env.base + path });
  await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
};
const dots = (p) => p.ev(`({ tab: !!${q("#tabbar a[href='/account'] .new-dot")}, link: !!${q("#links a[href='/help'] .new-dot")}, nav: !!${q(".topnav a[href='/help'] .new-dot")} })`);
const measure = (p) =>
  p.ev(`(() => {
    const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
    const ctl = [...document.querySelectorAll('button, a[href]')].filter(shown).filter((el) => !el.closest('.topnav'));
    return { tapDuoi44: ctl.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().height)), tranNgang: document.documentElement.scrollWidth - innerWidth };
  })()`);

const env = await startEnv();
try {
  await step("a", "mỗi quyền mở /help: dòng phiên bản, đủ bản, bản đầu mới nhất, nút Góp ý", async () => {
    for (const key of ["salesA", "accounting", "admin", "field"]) {
      const p = await env.as(ACCOUNTS[key], "/help", M);
      try {
        await p.waitFor(`${q("#changelog")}?.children.length > 0`, `nhật ký hiện (${key})`, 10000);
        assert.equal(await p.ev(`${q("h1")}.textContent`), "Trợ giúp", key);
        assert.equal(await p.ev(`${q("#release")}.textContent`), `${APP_NAME} · ${formatReleaseLine()}`, key);
        assert.equal(await p.ev(`document.querySelectorAll('.release-note').length`), CHANGELOG.length, key);
        assert.match(await p.ev(`${q(".release-note h3")}.textContent`), new RegExp(`^Phiên bản ${CHANGELOG[0].version.replace(".", "\\.")} — `), key);
        assert.equal(await p.ev(`${q("main a.btn-primary")}.getAttribute('href')`), "/feedback?new=1&from=%2Fhelp", key);
        if (key === "salesA") await p.shot(join(OUT, "anh/a-tro-giup-390.png"));
      } finally {
        p.close();
      }
    }
  });

  await step("b", "đường vào: menu máy tính, dòng ở trang Tôi, thanh tab không thêm tab", async () => {
    const d = await env.as(ACCOUNTS.salesA, "/", DESK);
    try {
      await d.waitFor(`!!${q(".topnav a[href='/help']")}`, "menu có Trợ giúp", 10000);
      assert.equal((await d.ev(`${q(".topnav a[href='/help']")}.textContent`)).trim().startsWith("Trợ giúp"), true);
      await d.shot(join(OUT, "anh/b-menu-may-tinh-1040.png"));
    } finally {
      d.close();
    }
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "trang Tôi có dòng Trợ giúp", 10000);
      assert.deepEqual(await p.ev(`[...document.querySelectorAll('#tabbar .tab')].map((a) => a.textContent.trim())`), ["Trang chủ", "Đơn hàng", "Đơn mới", "Tôi"]);
    } finally {
      p.close();
    }
  });

  await step("c", "chấm đỏ: chưa xem, đã xem, bản cũ, rác, localStorage bị chặn", async () => {
    const p = await env.as(ACCOUNTS.salesA, "/account", M);
    try {
      await p.ev("localStorage.clear(), true");
      await reload(p);
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
      assert.deepEqual(await dots(p), { tab: true, link: true, nav: true }, "chưa xem ⇒ có chấm");
      await p.shot(join(OUT, "anh/c-cham-do-390.png"));
      await goto(p, "/help");
      assert.equal(await p.ev("localStorage.getItem('td_help_seen')"), CHANGELOG[0].version);
      assert.equal(await p.ev(`!!${q(".release-note .badge-new")}`), true, "chưa từng xem ⇒ bản mới nhất có nhãn Mới cập nhật");
      await goto(p, "/account");
      await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
      assert.deepEqual(await dots(p), { tab: false, link: false, nav: false }, "đã xem ⇒ tắt");
      for (const stored of [CHANGELOG[1]?.version ?? "0.9", "rác"]) {
        await p.ev(`localStorage.setItem('td_help_seen', ${JSON.stringify(stored)}), true`);
        await reload(p);
        await p.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện", 10000);
        assert.deepEqual(await dots(p), { tab: true, link: true, nav: true }, `lưu "${stored}" ⇒ có chấm`);
      }
    } finally {
      p.close();
    }
    const b = await env.openPage(M);
    try {
      await b.send("Page.addScriptToEvaluateOnNewDocument", { source: "Object.defineProperty(window, 'localStorage', { get() { throw new Error('bị chặn'); } });" });
      const c = await env.login(ACCOUNTS.salesA);
      await b.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
      await goto(b, "/account");
      await b.waitFor(`!!${q("#links a[href='/help']")}`, "dòng Trợ giúp hiện dù localStorage bị chặn", 10000);
      assert.deepEqual(await dots(b), { tab: false, link: false, nav: false }, "bị chặn ⇒ không chấm");
      await goto(b, "/help");
      await b.waitFor(`${q("#changelog")}?.children.length > 0`, "nhật ký vẫn hiện khi localStorage bị chặn", 10000);
      assert.deepEqual(b.consoleErrors, [], "không lỗi console khi localStorage bị chặn");
    } finally {
      b.close();
    }
  });

  await step("d", "console sạch, không CSP; vùng chạm ≥ 44px, không tràn ngang ở 390 và 320", async () => {
    for (const [label, vp] of [["390", M], ["320", NARROW]]) {
      const p = await env.as(ACCOUNTS.salesA, "/help", vp);
      try {
        await p.waitFor(`${q("#changelog")}?.children.length > 0`, `nhật ký hiện (${label})`, 10000);
        const m = await measure(p);
        assert.deepEqual([m.tapDuoi44, m.tranNgang <= 0], [[], true], `đo ${label}: ${JSON.stringify(m)}`);
        const csp = p.logEntries.filter((e) => /Content Security Policy|Refused to/i.test(e.text));
        assert.deepEqual([csp.length, p.consoleErrors.length], [0, 0], `console ${label}`);
        await p.shot(join(OUT, `anh/d-tro-giup-${label}.png`));
      } finally {
        p.close();
      }
    }
  });
} finally {
  await env.stop();
}

if (failures.length) {
  console.log(`\n${failures.length} bước ✗: ${failures.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nHELP SMOKE OK — mọi bước ✓");
}
```

Ghi chú cho người thi công:
- Tên thuộc tính (`p.shot`, `p.logEntries`, `p.consoleErrors`, `env.login`, `env.as`) lấy đúng theo `a2-cdp.mjs` và `passkey-smoke.mjs`. Lệch thì theo mã thật, và ghi vào báo cáo.
- Nếu `env.as` dùng `127.0.0.1` (`env.base`) thì `localStorage` gắn với origin đó; giữ mọi `goto` trên cùng `env.base`.

- [ ] **Bước 2: Chạy, xác nhận xanh; rồi quan sát đỏ (P16).**

Run: `npm run build:web && CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/help-smoke.mjs`
Expected: `HELP SMOKE OK`.

Sau đó tạm bỏ `try/catch` trong `readHelpSeen`, build lại và chạy: bước c phải ✗. Hoàn nguyên, build lại, chạy lại phải xanh. Ghi vào báo cáo.

- [ ] **Bước 3: `v1-dang-nhap.mjs` không ghi cứng dòng phiên bản.** Thêm `import { formatReleaseLine } from "../../../../src/shared/app-info.ts";` và sửa dòng 38 thành `release: formatReleaseLine(),`. Sửa chú thích dòng 35 (chữ "Chữ đúng theo đặc tả…") cho biết dòng phiên bản đọc từ nhật ký thay đổi.

Run (cần mạng, khoảng 9 phút): `npm run build:web && AXE_JS=<…/axe.min.js> CHROME_BIN=docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh ONLY=a node docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs`
Expected: bước a ✓, với dòng "Phiên bản 1.3 · ngày 23 tháng 9 năm 2026". Không có `axe-core` thì ghi "chưa chạy" vào báo cáo; **không** báo xanh.

- [ ] **Bước 4: Đăng ký kịch bản ở `web/CLAUDE.md`.** Thêm một hàng vào bảng "đổi tệp → kịch bản Chrome":

```markdown
| `web/help.ts`, `web/help-seen.ts`, `public/help.html`, mục "Trợ giúp"/chấm đỏ ở `web/shell.ts`/`web/account.ts`, `src/shared/changelog.ts` | `help-smoke.mjs` ở `docs/evidence/2026-09-23-nhat-ky-thay-doi/kich-ban/` (4 bước, không cần mạng) |
```

- [ ] **Bước 5: Commit**

```bash
git add docs/evidence/2026-09-23-nhat-ky-thay-doi docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs web/CLAUDE.md
git commit -m "Kịch bản Chrome trang Trợ giúp; dòng phiên bản ở kịch bản đăng nhập đọc từ mã

Mỗi lần phát hành số phiên bản đổi; ghi cứng trong kịch bản sẽ làm nó đỏ
giả mỗi lần."
```

---

### Task 7: Quy trình phát hành + tài liệu + đề xuất luật

**Files:**
- Modify: `docs/CHANGE-GUIDE.md` (công thức j ở khoảng dòng 294–309, bảng §1, ma trận §3), `docs/HANDOFF-N1.md` (trước mục "Điều kiện TRƯỚC khi triển khai", khoảng dòng 95), `docs/SYSTEM-DESIGN.md` (§7 API: cấu hình công khai; §9 giao diện: danh sách trang)
- Create: `docs/superpowers/specs/2026-09-23-de-xuat-claude-md-nhat-ky-thay-doi.md`

- [ ] **Bước 1: `docs/CHANGE-GUIDE.md` công thức j.** Thay đoạn "Số phiên bản: hằng ở `src/shared/app-info.ts` …" và đoạn "**Đổi số phiên bản / ngày phát hành:** …" bằng:

```markdown
- Số phiên bản: KHÔNG viết tay. `APP_VERSION`/`APP_RELEASE_DATE` ở `src/shared/app-info.ts` dẫn xuất từ mục đầu của `CHANGELOG` (`src/shared/changelog.ts`) — xem công thức "Ghi nhật ký thay đổi". Màn đăng nhập (`#release`), trang Trợ giúp (`/help`) và `GET /api/auth/config` (`version`) cùng đọc nguồn này.

**Đổi số phiên bản / ngày phát hành:** thêm mục mới vào đầu `CHANGELOG` (công thức "Ghi nhật ký thay đổi"); không sửa `app-info.ts`.
```

Trong phần **Bẫy** của công thức j, xoá câu nói `v1-dang-nhap.mjs` ghi cứng dòng phiên bản. Thay bằng: "`v1-dang-nhap.mjs` đọc dòng phiên bản từ `formatReleaseLine()`; dữ liệu công ty trong `EXPECT` vẫn ghi cứng."

- [ ] **Bước 2: Thêm công thức mới cuối §2 của `docs/CHANGE-GUIDE.md`.** Lấy chữ cái kế tiếp chưa dùng: kiểm bằng `grep -n "^### [a-z]\." docs/CHANGE-GUIDE.md`.

```markdown
### <chữ kế tiếp>. Ghi nhật ký thay đổi khi phát hành (mỗi lần deploy mã mới)

**Khi nào:** MỖI lần deploy mã mới lên production (bước A.0 của runbook ở `docs/HANDOFF-N1.md`). Không ghi khi chỉ deploy lại đúng bản đang chạy hoặc lùi về bản cũ.

**Làm:** thêm MỘT mục vào ĐẦU `CHANGELOG` ở `src/shared/changelog.ts`: `version` = số của mục đầu hiện tại + 0.1 theo số (1.9 → 1.10), `date` = ngày deploy dự kiến (giờ Việt Nam), `items` = vài gạch loại `moi` (Mới) / `sua` (Đã sửa) / `doi` (Thay đổi). Deploy không có gì người dùng thấy: một gạch `doi` "Cải thiện độ ổn định và an toàn bên trong, không đổi cách dùng."

**Cách viết:** cho nhân viên bán hàng/kế toán/hướng dẫn viên; nói điều họ THẤY hoặc LÀM ĐƯỢC khác đi; mỗi gạch một câu ≤ 160 ký tự; không tên tệp, không mã, không chữ kỹ thuật (test chặn `task`, `commit`, `api`, `route`, `migration`, `worker`, `deploy`, `e2e`, `d1`, `null`, `undefined`, dấu `` ` ``, `snake_case`). Bị chặn nhầm thì sửa câu, không nới danh sách (trừ khi chủ đồng ý).

**Kiểm:** `node --test src/shared/changelog.test.ts src/shared/app-info.test.ts` → `node scripts/kiem-phien-ban.mjs` phải ĐẠT (thoát 0; 1 = quên tăng số; 2 = không đọc được production, KHÔNG phải đạt). Sau `wrangler deploy`: `node scripts/kiem-phien-ban.mjs --sau-deploy` phải ĐẠT.

**Bẫy:** trang Trợ giúp và chấm đỏ cập nhật sau deploy + một lần mở lại app (service worker stale-while-revalidate). "Đã xem" lưu theo từng máy (`localStorage` `td_help_seen`).
```

Thêm vào bảng §1 dòng "Phát hành bản mới / ghi có gì mới → công thức <chữ>". Thêm vào ma trận §3 dòng "`src/shared/changelog.ts` → `node --test src/shared/changelog.test.ts` + `help-smoke.mjs` nếu đổi cách hiển thị".

- [ ] **Bước 3: `docs/HANDOFF-N1.md`.** Chèn ngay trước `## Điều kiện TRƯỚC khi triển khai`:

```markdown
## Mọi lần phát hành: bước A.0 — nhật ký thay đổi (từ 2026-09-23)

Trước bước "A. Trước khi deploy" của MỌI runbook:
1. AI thêm mục mới vào đầu `CHANGELOG` (`src/shared/changelog.ts`) theo công thức "Ghi nhật ký thay đổi" ở `docs/CHANGE-GUIDE.md`, commit cùng nhánh sẽ deploy. Chủ đọc lướt mục này khi duyệt phát hành.
2. `node scripts/kiem-phien-ban.mjs` phải ĐẠT (thoát 0).
Sau `CI=1 npx wrangler deploy`: `node scripts/kiem-phien-ban.mjs --sau-deploy` phải ĐẠT. Mục "TRẠNG THÁI TRIỂN KHAI" ghi thêm "Phiên bản X".
```

- [ ] **Bước 4: `docs/SYSTEM-DESIGN.md`.** Tìm dòng mô tả `GET /api/auth/config` (`grep -n "api/auth/config" docs/SYSTEM-DESIGN.md`) và thêm `version` (số phiên bản đang chạy, từ nhật ký thay đổi) vào danh sách trường. Tìm danh sách trang ở §9 (`grep -n "/feedback" docs/SYSTEM-DESIGN.md`) và thêm "`/help` — Trợ giúp: phiên bản, nhật ký thay đổi (`src/shared/changelog.ts`), lối tắt Góp ý; mọi tài khoản; chấm đỏ theo `localStorage` `td_help_seen`". Số trang tăng 12 → 13: sửa mọi chỗ ghi "12 trang" ở tài liệu mô tả (`grep -rn "12 trang\|12/12" docs/SYSTEM-DESIGN.md docs/PWA-IPHONE.md docs/CHANGE-GUIDE.md`).

- [ ] **Bước 5: Tệp đề xuất sửa `CLAUDE.md` (KHÔNG sửa `CLAUDE.md`).** Tạo `docs/superpowers/specs/2026-09-23-de-xuat-claude-md-nhat-ky-thay-doi.md`, trong đó chép **nguyên văn** câu hiện tại ở `CLAUDE.md` §8 (dòng bắt đầu "**Đừng khẳng định trạng thái production…**", phần "Chỉ deploy từ `main` đã gộp …") và câu đề xuất:

```markdown
# Đề xuất sửa CLAUDE.md §8: thêm nhật ký thay đổi vào chuỗi deploy (CHỜ CHỦ DUYỆT, N9)

**Hiện tại:** <chép nguyên văn câu "Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: … → ghi trạng thái.">

**Đề xuất:** Chỉ deploy từ `main` đã gộp, theo `docs/HANDOFF-N1.md`: cổng chỉ-đọc → **mục nhật ký thay đổi mới + `node scripts/kiem-phien-ban.mjs` ĐẠT** → điểm khôi phục Time Travel → test + typecheck + e2e xanh → migration → `wrangler deploy` ngay → **`kiem-phien-ban.mjs --sau-deploy`** + `audit-invariants --db remote` → ghi trạng thái (kèm số phiên bản).

**Vì sao:** số phiên bản từng đứng ở 1.0 qua 9 lần deploy vì bước tăng số không nằm trong chuỗi deploy. Dòng này đưa bước ghi nhật ký vào đúng chỗ AI đọc trước mỗi lần phát hành. Việc chạy script trước `wrangler deploy` vẫn **dựa vào kỷ luật** (không có hook chặn).
```

- [ ] **Bước 6: Kiểm và commit**

Run: `npm test && npm run typecheck`
Expected: xanh.

```bash
git add docs/CHANGE-GUIDE.md docs/HANDOFF-N1.md docs/SYSTEM-DESIGN.md docs/superpowers/specs/2026-09-23-de-xuat-claude-md-nhat-ky-thay-doi.md
git commit -m "Quy trình phát hành: bước A.0 nhật ký thay đổi; tài liệu; đề xuất CLAUDE.md (chờ chủ duyệt)

Đưa việc ghi nhật ký và cổng số phiên bản vào runbook để mỗi lần phát hành
không quên; sửa CLAUDE.md là luật nên chỉ đề xuất."
```

---

## Sau Task 7: kiểm độc lập (bắt buộc, việc lớn)

- Gọi subagent `nguoi-kiem-doc-lap` (chỉ đọc). Phạm vi: toàn bộ diff của nhánh so với `main`, cùng đặc tả. Yêu cầu nó:
  - **(a)** tự chạy lại `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa turnstile passkey maintenance`, `help-smoke.mjs`, `node scripts/kiem-phien-ban.mjs` (và `--sau-deploy`, và `PROD_URL=http://127.0.0.1:9`), rồi báo mã thoát;
  - **(b)** đối chiếu từng tiêu chí 1–9 ở đặc tả §7 với bằng chứng có thật;
  - **(c)** soi riêng:
    - nhật ký được vẽ trước `initShell`;
    - `localStorage` bị chặn thì không lỗi;
    - so phiên bản theo số;
    - lời văn các mục 1.0–1.3 có chữ kỹ thuật không, có đúng với tính năng đã lên production không (đối chiếu các mục "TRẠNG THÁI TRIỂN KHAI" của `docs/HANDOFF-N1.md`);
    - `CLAUDE.md` không bị sửa;
  - **(d)** trên một bản sao, sửa cố ý một luật (ví dụ bỏ `api` khỏi danh sách từ cấm) và xác nhận test đỏ, rồi **không** sửa gì ở nhánh.
- Chỉ báo "đạt" khi có báo cáo "đạt" của người kiểm cộng với test xanh.
- Sau đó dừng. Gộp, đẩy, phát hành do chủ dự án quyết. **Lần phát hành mang tính năng này là bản 1.4**: phiên phát hành thêm mục 1.4 theo bước A.0, không phải phiên thi công.
