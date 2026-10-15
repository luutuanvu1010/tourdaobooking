// HÀNG RÀO ĐỌC MÃ NGUỒN (ADR-0074 Phần B Task 8; đặc tả §6 quy tắc 5 — không lộ; Minor của người kiểm Task 7): ở phía trình duyệt, khoá TOTP, phiếu bật
// (`setupToken`), liên kết `otpauth://`, mã 6 số và mã dự phòng CHỈ sống trong biến và chỉ đi tới máy chủ qua THÂN yêu cầu POST. Bài quét ba tệp giao diện
// của bảo mật hai lớp và chặn khi một biến "nhạy" đi vào:
//   (1) đối số của nơi lưu / in / điều hướng: localStorage / sessionStorage / indexedDB / document.cookie, console.*, history.pushState|replaceState,
//       location.assign|replace|href =, new URL / URLSearchParams, navigator.sendBeacon, postMessage;
//   (2) biểu thức `${…}` của chuỗi mẫu (đường dẫn API, chữ hiển thị ghép) và đối số ĐẦU (đường dẫn) của `api(`;
//   (3) thuộc tính `href` — trừ ĐÚNG MỘT chỗ có chủ ý: nút "Mở ứng dụng xác thực" `href: k.otpauth` (liên kết otpauth:// mang khoá là cách duy nhất để
//       iPhone thêm tài khoản vào ứng dụng xác thực trên chính máy đó — đặc tả, Review Focus 1 của kế hoạch).
// KHÔNG canh: chép vào bộ nhớ tạm ("Chép khoá", "Chép" mã dự phòng) và tải tệp .txt — đó là thao tác người dùng tự bấm, có chủ ý; mã QR vẽ trên canvas.
// Giới hạn: quét theo TÊN biến (danh sách NHAY dưới đây) — đổi tên biến sang tên lạ thì bài không thấy; bài chống rỗng bắt ca tên cũ biến mất.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const TEP = ["web/hai-lop-ui.ts", "web/login.ts", "web/account.ts"] as const;
const doc = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url), "utf8")
  .replace(/^\s*\/\*[\s\S]*?\*\//gm, "")
  .replace(/(^|\s)\/\/.*$/gm, "$1");

/** Tên biến / thuộc tính mang khoá, phiếu bật, mã: đặt theo mã thật (web/hai-lop-ui.ts, web/login.ts, web/account.ts, contracts MfaTotpStartResponse…). */
const NHAY = /\b(secret|setupToken|otpauth|recoveryCodes|codes|maHienTai|currentCode|maCu|code)\b|\b(ma|o)\.value\b/;
/** Ngoại lệ có tên, chép NGUYÊN VĂN đối số: `code` ở đây là mã lỗi của Turnstile (không phải mã xác thực), cắt 32 ký tự. */
const CHO_PHEP = new Set(['"Turnstile báo lỗi, mã:", typeof code === "string" ? code.slice(0, 32) : "không rõ"']);

/** Đối số trong ngoặc tròn bắt đầu ở `mo` (vị trí của "("), cân ngoặc, bỏ qua chuỗi. */
function doiSo(src: string, mo: number): string {
  let sau = 0;
  let i = mo;
  let chuoi: string | null = null;
  for (; i < src.length; i++) {
    const c = src[i]!;
    if (chuoi) { if (c === "\\") i++; else if (c === chuoi) chuoi = null; continue; }
    if (c === '"' || c === "'" || c === "`") { chuoi = c; continue; }
    if (c === "(") sau++;
    else if (c === ")" && --sau === 0) break;
  }
  return src.slice(mo + 1, i);
}

const SINK = /\b(?:localStorage|sessionStorage)\.setItem\s*\(|\bindexedDB\b[^;]*\(|\bconsole\.(?:log|info|debug|warn|error|trace|table|dir)\s*\(|\bhistory\.(?:pushState|replaceState)\s*\(|\blocation\.(?:assign|replace)\s*\(|\bnew\s+(?:URL|URLSearchParams)\s*\(|\bnavigator\.sendBeacon\s*\(|\bpostMessage\s*\(/g;

test("không lộ khoá / mã ở trình duyệt: không đi vào bộ nhớ trình duyệt, console, điều hướng, URL (đối số của các lời gọi đó)", () => {
  let soSink = 0;
  for (const f of TEP) {
    const src = doc(f);
    for (const m of src.matchAll(SINK)) {
      soSink++;
      const ds = doiSo(src, (m.index ?? 0) + m[0].length - 1).trim();
      if (CHO_PHEP.has(ds)) continue;
      assert.doesNotMatch(ds, NHAY, `${f}: «${m[0]}${ds.slice(0, 120)})» mang khoá/mã ra ngoài biến`);
    }
    assert.doesNotMatch(src, /\blocation\.href\s*=[^=][^;\n]*\b(secret|setupToken|otpauth|codes|code)\b/, `${f}: gán location.href bằng khoá/mã`);
    assert.doesNotMatch(src, /document\.cookie\s*=/, `${f}: giao diện không tự ghi cookie`);
  }
  assert.ok(soSink >= 8, `bài rỗng? chỉ thấy ${soSink} lời gọi lưu/in/điều hướng trong ba tệp`);
});

test("không lộ khoá / mã qua chuỗi mẫu `${…}` hay đường dẫn của api(): chỉ đi trong THÂN yêu cầu", () => {
  for (const f of TEP) {
    const src = doc(f);
    for (const m of src.matchAll(/\$\{([^{}]*)\}/g)) assert.doesNotMatch(m[1]!, NHAY, `${f}: chuỗi mẫu ghép khoá/mã: \${${m[1]}}`);
    for (const m of src.matchAll(/\bapi(?:<[^>(]*>)?\s*\(/g)) {
      const ds = doiSo(src, (m.index ?? 0) + m[0].length - 1);
      const duongDan = ds.split(/,\s*\{/)[0]!;
      assert.doesNotMatch(duongDan, NHAY, `${f}: đường dẫn api() mang khoá/mã: ${duongDan}`);
    }
  }
});

test("href mang khoá: đúng MỘT chỗ có chủ ý — nút «Mở ứng dụng xác thực» (href: k.otpauth) ở web/hai-lop-ui.ts", () => {
  const thay: string[] = [];
  for (const f of TEP) {
    for (const m of doc(f).matchAll(/\bhref\s*[:=]\s*([^,})\n]+)/g)) if (NHAY.test(m[1]!)) thay.push(`${f}: ${m[1]!.trim()}`);
  }
  assert.deepEqual(thay, ["web/hai-lop-ui.ts: k.otpauth"]);
});

test("chống bài rỗng: tên biến nhạy còn có thật trong mã (đổi tên → sửa NHAY cùng lúc)", () => {
  const ui = doc("web/hai-lop-ui.ts");
  for (const ten of ["k.secret", "k.setupToken", "k.otpauth", "codes"]) assert.ok(ui.includes(ten), `web/hai-lop-ui.ts không còn «${ten}»`);
  assert.ok(doc("web/account.ts").includes("recoveryCodes"));
  assert.ok(doc("web/login.ts").includes("setupToken"));
});
