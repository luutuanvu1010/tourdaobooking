// HÀNG RÀO ĐỌC MÃ NGUỒN (ADR-0074 Phần B Task 8; người kiểm Task 3+4, mục I1): phiên MỚI chỉ được cấp qua `issueLoginSession`, và hàm đó chỉ được gọi
// trong ĐÚNG bốn route đăng nhập — mỗi route đi qua cổng của mình TRƯỚC khi cấp phiên:
//   POST /api/auth/login             — PIN; cổng lớp hai `loginStep` (mfa / enroll / blocked_no_factor trả sớm, chưa cấp phiên)
//   POST /api/auth/mfa/verify        — bước hai; cookie chờ purpose "verify" + mã đúng
//   POST /api/auth/mfa/enroll/confirm — bật lại trong cửa sổ 24 giờ; cookie chờ purpose "enroll" (congBatLai) + mã của khoá mới đúng
//   POST /api/auth/passkey/login     — Face ID (được miễn bước hai: máy + sinh trắc học — đặc tả §4.2)
// Module khác (accounts, staff…) hay route mới gọi `issueLoginSession`, tự ký token phiên (`createSessionToken`) hay tự chèn dòng phiên
// (`insertSessionStatement`) là lách cổng lớp hai → bài này đỏ. Thêm route đăng nhập mới có chủ đích: thêm vào BON_CUA kèm cổng của nó, người kiểm duyệt.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const GOC = new URL("../../..", import.meta.url).pathname;
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === "vendor" ? [] : walk(p);
    return p.endsWith(".ts") && !p.endsWith(".test.ts") && !p.endsWith(".d.ts") ? [p] : [];
  });
}
/**
 * Bỏ chú thích để chữ trong lời giải thích không làm bài đỏ nhầm: khối `/* … *\/` mở ĐẦU dòng, rồi `// …` đứng sau khoảng trắng / đầu dòng. KHÔNG bỏ
 * `/*` giữa dòng (chuỗi đường dẫn kiểu "/api/account/*" trong chú thích dòng sẽ nuốt cả tệp — bài thành rỗng; đã gặp khi quan sát chặn 2026-10-15).
 */
const boChuThich = (s: string): string => s.replace(/^\s*\/\*[\s\S]*?\*\//gm, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const TEP = [...walk(join(GOC, "src")), ...walk(join(GOC, "web"))].map((p) => ({ ten: relative(GOC, p), ma: boChuThich(readFileSync(p, "utf8")) }));
const tepNhac = (ten: string): string[] => TEP.filter((t) => new RegExp(`\\b${ten}\\b`).test(t.ma)).map((t) => t.ten).sort();

/** Bốn cửa cấp phiên và mẩu cổng phải đứng TRƯỚC lời gọi issueLoginSession trong thân route. */
const BON_CUA: Record<string, readonly string[]> = {
  "POST /api/auth/login": ["verifyPinThrottled(", "loginStep(", 'if (step === "blocked_no_factor") return', 'if (step === "enroll") {', 'if (step === "mfa") {'],
  "POST /api/auth/mfa/verify": ['p.purpose !== "verify") return', 'if (kq !== "ok") return'],
  "POST /api/auth/mfa/enroll/confirm": ["congBatLai(", 'if (moi.kq !== "ok") return'],
  "POST /api/auth/passkey/login": ["checkPasskeyAssertion(", "if (!checked.ok) return"],
};

test("cấp phiên mới: chỉ src/modules/auth nhắc issueLoginSession / createSessionToken / insertSessionStatement (module khác không lách được cổng lớp hai)", () => {
  assert.ok(TEP.length > 100, `quét quá ít tệp (${TEP.length}) — bài rỗng?`);
  assert.deepEqual(tepNhac("issueLoginSession"), ["src/modules/auth/index.ts"]);
  assert.deepEqual(tepNhac("createSessionToken"), ["src/modules/auth/index.ts", "src/modules/auth/session.ts"]);
  assert.deepEqual(tepNhac("insertSessionStatement"), ["src/modules/auth/index.ts", "src/modules/auth/repository.ts"]);
});

test("auth/index.ts: issueLoginSession được gọi ĐÚNG ở bốn route đăng nhập, mỗi route qua cổng của mình TRƯỚC khi cấp phiên; token phiên chỉ ký ở issueLoginSession và reissueSessionCookie", () => {
  const src = TEP.find((t) => t.ten === "src/modules/auth/index.ts")!.ma;
  const RE_ROUTE = /route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g;
  const moc = [...src.matchAll(RE_ROUTE)].map((m) => ({ ten: `${m[1]} ${m[2]}`, tu: m.index ?? 0 }));
  assert.ok(moc.length >= 8, `thấy quá ít route (${moc.length})`);
  const capPhien: string[] = [];
  let goiTrongRoute = 0;
  moc.forEach((r, i) => {
    const than = src.slice(r.tu, i + 1 < moc.length ? moc[i + 1]!.tu : src.length);
    const goi = (than.match(/\bissueLoginSession\(/g) ?? []).length;
    if (goi === 0) return;
    capPhien.push(r.ten);
    goiTrongRoute += goi;
    assert.equal(goi, 1, `${r.ten}: cấp phiên đúng một chỗ`);
    const viTri = than.indexOf("issueLoginSession(");
    for (const cong of BON_CUA[r.ten] ?? []) {
      const o = than.indexOf(cong);
      assert.ok(o >= 0 && o < viTri, `${r.ten}: thiếu cổng «${cong}» trước khi cấp phiên`);
    }
  });
  assert.deepEqual(capPhien.sort(), Object.keys(BON_CUA).sort(), "route cấp phiên phải đúng bốn cửa đã duyệt");
  // Ngoài thân route: chỉ đúng một chỗ — lời khai hàm.
  const tatCa = (src.match(/\bissueLoginSession\(/g) ?? []).length;
  assert.equal(tatCa - goiTrongRoute, 1, "ngoài bốn route chỉ có lời khai `export async function issueLoginSession(`");
  assert.match(src, /export async function issueLoginSession\(/);
  // Ký token phiên: đúng hai chỗ (cấp mới trong issueLoginSession; cấp lại cookie cho phiên ĐANG CÓ — reissueSessionCookie, ADR-0075 điều 5).
  const ky = [...src.matchAll(/\bcreateSessionToken\(/g)].map((m) => m.index ?? 0);
  assert.equal(ky.length, 2, "createSessionToken chỉ gọi ở issueLoginSession và reissueSessionCookie");
  const thanHam = (ten: string) => { const a = src.indexOf(`function ${ten}(`); return [a, src.indexOf("\n}\n", a)] as const; };
  const [a1, b1] = thanHam("issueLoginSession");
  const [a2, b2] = thanHam("reissueSessionCookie");
  for (const k of ky) assert.ok((k > a1 && k < b1) || (k > a2 && k < b2), "createSessionToken gọi ngoài hai hàm được phép");
  const chen = [...src.matchAll(/\binsertSessionStatement\(/g)].map((m) => m.index ?? 0);
  assert.equal(chen.length, 1);
  assert.ok(chen[0]! > a1 && chen[0]! < b1, "dòng phiên chỉ chèn trong issueLoginSession");
});
