// Luật đóng gói mã cho trợ lý chạy trên máy chủ Anthropic (ADR-0145 Đ3): chỉ gửi đúng các thư mục được phép,
// thay số điện thoại, email, tên chủ và đường dẫn tài khoản máy bằng bản giả nhất quán, tự quét lại trước khi nén,
// từ chối gói còn chuỗi cấm (mã Sheet) hoặc không đọc được danh sách chuỗi cấm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { boDau, duocGui, taoBoChe, timChuoiCam } from "../scripts/goi-ma-tro-ly-may-lib.mjs";

const KICH_BAN = fileURLToPath(new URL("../scripts/goi-ma-tro-ly-may.mjs", import.meta.url));
const SDT = /(?<![0-9+])(?:\+84|0)[35789][0-9]{8}(?![0-9])/g;

test("chỉ gửi mã, migration, khung thử và luật; không gửi tài liệu, kịch bản, cấu hình triển khai, tệp bí mật", () => {
  for (const p of [
    "src/modules/billing/rules.ts",
    "src/goi-ma-tro-ly-may.test.ts",
    "src/CLAUDE.md",
    "web/orders.ts",
    "web/tsconfig.json",
    "migrations/0001_init.sql",
    "tests/audit/harness.mjs",
    "package.json",
    "tsconfig.json",
    "CLAUDE.md",
    "docs/ARCHITECTURE.md",
    "docs/data-dictionary.json",
    "scripts/source-mask-lib.mjs",
    "scripts/audit-checks.mjs",
    "scripts/audit-thuong-mai.mjs",
  ]) assert.equal(duocGui(p), true, p);
  for (const p of [
    "wrangler.jsonc",
    "docs/HANDOFF-N1.md",
    "docs/adr/ADR-0001-danh-tinh-party-role-relationship.md",
    "scripts/day-len.mjs",
    "tests/e2e/lib.mjs",
    ".claude/settings.json",
    "playbook/CONSTITUTION.md",
    ".dev.vars",
    "web/.dev.vars",
    "src/.env",
    "src/.env.local",
    "tro-ly-may/tho-san-loi/agent.md",
    "claude-lock.json",
  ]) assert.equal(duocGui(p), false, p);
});

test("số điện thoại: cùng số (0… hay +84…) cùng số giả, giữ đầu số và độ dài, không số gốc nào còn lại", () => {
  const a = "gọi 0987654321 hoặc +84987654321; người khác 0912345678";
  const b = "tệp khác: 0912345678";
  const bo = taoBoChe([a, b]);
  const ra = bo.che(a).text;
  const raB = bo.che(b).text;
  const so = ra.match(SDT) ?? [];
  assert.equal(so.length, 3);
  assert.equal(so[0].length, 10);
  assert.equal(so[1].length, 12);
  assert.ok(so[0].startsWith("098") && so[1].startsWith("+8498") && so[2].startsWith("091"), ra);
  assert.equal(so[0].slice(1), so[1].slice(3), "0… và +84… của cùng một số phải ra cùng số giả");
  assert.notEqual(so[0].slice(1), so[2].slice(1), "hai số khác nhau phải ra hai số giả khác nhau");
  assert.equal(raB, `tệp khác: ${so[2]}`, "cùng một số ở tệp khác phải ra cùng số giả");
  for (const goc of ["0987654321", "84987654321", "0912345678"]) assert.ok(!ra.includes(goc) && !raB.includes(goc), goc);
});

test("chỉ giữ đầu số nhà mạng: phần sau thay bằng số đếm", () => {
  assert.equal(taoBoChe(["0987654321"]).che("0987654321").text, "0980000001");
});

test("số viết có dấu cách, chấm, gạch hay +84 cách quãng: che như số viết liền, giữ nguyên cách viết", () => {
  const dang = [
    "0987654321",
    "0987 654 321",
    "0987.654.321",
    "0987-654-321",
    "+84 987 654 321",
    "+84987654321",
    "+84-987-654-321",
    "84987654321",
    "84 987 654 321",
  ];
  const bo = taoBoChe([dang.join("\n")]);
  const ra = bo.che(dang.join("\n"));
  assert.equal(ra.soSdt, dang.length);
  const dong = ra.text.split("\n");
  const chuSo = (s) => s.replace(/^\+?84/, "").replace(/[^0-9]/g, "").replace(/^0/, "");
  for (let i = 0; i < dang.length; i++) {
    assert.equal(dong[i].replace(/[0-9]/g, "#"), dang[i].replace(/[0-9]/g, "#"), `giữ cách viết: ${dang[i]}`);
    assert.equal(chuSo(dong[i]), chuSo(dong[0]), `cùng số giả: ${dang[i]}`);
    assert.ok(!dong[i].replace(/[^0-9]/g, "").includes("987654321"), `còn số gốc: ${dong[i]}`);
  }
});

test("đầu số: che di động 03, 05, 07, 08, 09 và số bàn 02 (10 hay 11 chữ số); để nguyên 01, 04, 06", () => {
  const che = ["0312345678", "0512345678", "0712345678", "0812345678", "0912345678", "0212345678", "02123456789"];
  const de = ["0112345678", "0412345678", "0612345678"];
  const bo = taoBoChe([che.join(" "), de.join(" ")]);
  for (const s of che) assert.notEqual(bo.che(s).text, s, s);
  for (const s of de) assert.equal(bo.che(s).text, s, s);
});

test("số bàn: giữ mã vùng và cách viết, cùng số (0… hay +84…) cùng số giả", () => {
  assert.equal(taoBoChe(["02583812345"]).che("02583812345").text, "02580000001");
  assert.equal(taoBoChe(["0258381234"]).che("0258381234").text, "0258000001");
  const dang = ["02583812345", "(0258) 3812 345", "0258.3812.345", "+84 258 3812 345", "84 258 3812 345"];
  const ra = taoBoChe([dang.join("\n")]).che(dang.join("\n"));
  assert.equal(ra.soSdt, dang.length);
  const dong = ra.text.split("\n");
  const chuSo = (s) => s.replace(/^\+?84/, "").replace(/[^0-9]/g, "").replace(/^0/, "");
  for (let i = 0; i < dang.length; i++) {
    assert.equal(dong[i].replace(/[0-9]/g, "#"), dang[i].replace(/[0-9]/g, "#"), `giữ cách viết: ${dang[i]}`);
    assert.equal(chuSo(dong[i]), chuSo(dong[0]), `cùng số giả: ${dang[i]}`);
    assert.ok(chuSo(dong[i]).startsWith("258"), `giữ mã vùng: ${dong[i]}`);
    assert.ok(!dong[i].replace(/[^0-9]/g, "").includes("3812345"), `còn số gốc: ${dong[i]}`);
  }
});

test("dãy số nằm trong một UUID không bị che, kể cả khi trông như số +84 viết liền; tự quét cũng bỏ qua", () => {
  const vb = "id 123e4567-e89b-42d3-a456-842583123456\nsố 842583123456";
  const bo = taoBoChe([vb]);
  const dong = bo.che(vb).text.split("\n");
  assert.equal(dong[0], "id 123e4567-e89b-42d3-a456-842583123456");
  assert.notEqual(dong[1], "số 842583123456", "cùng dãy đứng riêng là số điện thoại, phải che");
  assert.deepEqual(bo.conSot(dong.join("\n")), []);
});

test("số giả không trùng bất kỳ số gốc nào, kể cả khi số gốc đã giống số thử", () => {
  const goc = ["0900000001", "0900000002", "0900000003"];
  const bo = taoBoChe([goc.join(" ")]);
  const ra = bo.che(goc.join(" ")).text.split(" ");
  assert.equal(new Set(ra).size, 3);
  for (const s of ra) assert.ok(!goc.includes(s), `${s} trùng số gốc`);
});

test("dãy số dài hơn số điện thoại không bị đụng tới", () => {
  const vb = "mã 109876543210 và 09876543210 và 10987654321 và 184987654321 và 1234567890";
  const bo = taoBoChe([vb]);
  assert.equal(bo.che(vb).text, vb);
});

test("tự quét lại: chỉ ra dòng còn chuỗi giống số điện thoại chưa che (kể cả dạng bộ che không bắt), không ra số giả", () => {
  const vb =
    "a: 0987 654 321\nb: 0987_654_321\nc: (098) 7654-321\nd: 0987\t654\t321\ne: không có số; ngày 08 28/10/2026\nf: 0258_3812_345\n" +
    "g: 0258\t3812\t345\nh: 0258 3812 345";
  const bo = taoBoChe([vb]);
  const daChe = bo.che(vb).text;
  assert.deepEqual(bo.conSot(daChe), [2, 4, 6, 7, 8], "a, c đã che; b, d, f, g, h (f–h số bàn) bộ che không bắt nên tự quét phải chỉ ra; e không phải số");
  assert.deepEqual(bo.conSot(bo.che("x 0912345678").text), []);
});

test("email: phần trước @ thay bằng tên giả nhất quán (không phân biệt hoa thường), giữ miền; example.* và tên gói không đụng", () => {
  const vb = [
    "a: Tuan.Bao@Gmail.com",
    "b: tuan.bao@gmail.com",
    "c: khac@tourdao.vn",
    "d: thu@example.com",
    "e: x@sub.example.org",
    '"@anthropic-ai/sdk" esbuild@0.25.0 wrangler@latest',
    "f: lo@xexample.com",
  ].join("\n");
  const bo = taoBoChe([vb]);
  const { text, soEmail } = bo.che(vb);
  const dong = text.split("\n");
  const [, a] = dong[0].split(": ");
  const [, b] = dong[1].split(": ");
  assert.ok(a.endsWith("@Gmail.com") && b.endsWith("@gmail.com"), text);
  assert.equal(a.split("@")[0], b.split("@")[0]);
  assert.ok(!/tuan|bao/i.test(text), text);
  assert.ok(dong[2].endsWith("@tourdao.vn") && !dong[2].includes("khac@"), dong[2]);
  assert.equal(dong[3], "d: thu@example.com");
  assert.equal(dong[4], "e: x@sub.example.org");
  assert.equal(dong[5], '"@anthropic-ai/sdk" esbuild@0.25.0 wrangler@latest');
  assert.ok(dong[6].endsWith("@xexample.com") && !dong[6].includes("lo@"), "miền chỉ GIỐNG example vẫn phải che");
  assert.equal(soEmail, 4);
});

test("email: không che chuỗi chỉ giống email ở biên (miền dính chữ số, phần trước @ dính ngay sau một email khác)", () => {
  const bo = taoBoChe([]);
  assert.equal(bo.che("ma a@b.co1").text, "ma a@b.co1");
  assert.equal(bo.che("a@b.com_c@d.com").text, "nguoi1@b.com_c@d.com");
});

test("thay chuỗi thêm (tên chủ, đường dẫn tài khoản máy): cả bản có dấu, bản bỏ dấu, không phân biệt hoa thường", () => {
  assert.equal(boDau("Lưu Tuấn Vũ Đặng"), "Luu Tuan Vu Dang");
  const vb = "chủ: Nguyễn Văn Ấn; NGUYEN VAN AN; /Users/abc/kho và /Users/abcd/khac";
  const bo = taoBoChe([vb], { thayChuoi: [["Nguyễn Văn Ấn", "Chủ Dự Án"], ["/Users/abc/", "/Users/nguoi-dung/"]] });
  const r = bo.che(vb);
  assert.equal(r.text, "chủ: Chủ Dự Án; Chủ Dự Án; /Users/nguoi-dung/kho và /Users/abcd/khac");
  assert.equal(r.soChuoi, 3);
});

test("đếm số chỗ đã che để báo cho chủ", () => {
  const vb = "0987654321, 0987 654 321, ai@gmail.com";
  const r = taoBoChe([vb]).che(vb);
  assert.equal(r.soSdt, 2);
  assert.equal(r.soEmail, 1);
});

test("tìm chuỗi cấm (mã Sheet) trong gói", () => {
  assert.equal(timChuoiCam("abc 1XPxSheetId def", ["1XPxSheetId"]), "1XPxSheetId");
  assert.equal(timChuoiCam("không có gì", ["1XPxSheetId"]), null);
  assert.equal(timChuoiCam("bỏ qua chuỗi rỗng", [""]), null);
});

// ---- Chạy kịch bản thật trên một kho git tạm ----

function khoTam(tep) {
  const dir = mkdtempSync(join(tmpdir(), "goi-ma-thu-"));
  for (const [p, noiDung] of Object.entries(tep)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), noiDung);
  }
  const git = (...a) => spawnSync("git", ["-c", "user.name=Người Thử", "-c", "user.email=t@example.com", ...a], { cwd: dir });
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "thử");
  // Tên chủ mà kịch bản đọc (`git config user.name`): đặt riêng cho kho tạm, để bài không phụ thuộc cấu hình máy.
  spawnSync("git", ["config", "user.name", TEN_CHU_THU], { cwd: dir });
  return dir;
}
const TEN_CHU_THU = "Người Thử Nghiệm";
const WRANGLER = '{ "vars": { "SERVICES_SHEET_ID": "SHEETMAUXYZ123" } }';
function chayKichBan(dir) {
  const ra = join(dir, "ra.tar.gz");
  const r = spawnSync(process.execPath, [KICH_BAN, "--ra", ra], { cwd: dir, encoding: "utf8" });
  return { ...r, ra };
}

test("kịch bản: gói đúng phạm vi, đã che, có NGUON.txt", () => {
  const dir = khoTam({
    "wrangler.jsonc": WRANGLER,
    "src/a.ts": 'export const SO = "0987 654 321"; // ai@gmail.com\n',
    "docs/HANDOFF-N1.md": "không được gửi",
  });
  try {
    const r = chayKichBan(dir);
    assert.equal(r.status, 0, r.stderr);
    const x = join(dir, "x");
    mkdirSync(x);
    assert.equal(spawnSync("tar", ["-xzf", r.ra, "-C", x]).status, 0);
    const a = readFileSync(join(x, "ma-nguon/src/a.ts"), "utf8");
    assert.ok(!a.replace(/[^0-9]/g, "").includes("987654321") && !a.includes("ai@"), a);
    assert.ok(existsSync(join(x, "ma-nguon/NGUON.txt")));
    assert.ok(!existsSync(join(x, "ma-nguon/docs/HANDOFF-N1.md")));
    assert.ok(!existsSync(join(x, "ma-nguon/wrangler.jsonc")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("kịch bản: che tên chủ (git user.name, có dấu và không dấu) và đường dẫn tài khoản máy", () => {
  const nha = `/Users/${userInfo().username}/kho`;
  const dir = khoTam({
    "wrangler.jsonc": WRANGLER,
    "src/a.ts": `// ${TEN_CHU_THU}; ${boDau(TEN_CHU_THU).toUpperCase()}; ${nha}\n`,
  });
  try {
    const r = chayKichBan(dir);
    assert.equal(r.status, 0, r.stderr);
    const x = join(dir, "x");
    mkdirSync(x);
    assert.equal(spawnSync("tar", ["-xzf", r.ra, "-C", x]).status, 0);
    assert.equal(readFileSync(join(x, "ma-nguon/src/a.ts"), "utf8"), "// Chủ Dự Án; Chủ Dự Án; /Users/nguoi-dung/kho\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("kịch bản: dừng khi không đọc được tên chủ (git user.name rỗng), vì khi đó tên chủ không được che", () => {
  const dir = khoTam({ "wrangler.jsonc": WRANGLER, "src/a.ts": "export const A = 1;\n" });
  try {
    spawnSync("git", ["config", "user.name", ""], { cwd: dir });
    const r = chayKichBan(dir);
    assert.equal(r.status, 1);
    assert.ok(!existsSync(r.ra));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("kịch bản: dừng, không tạo gói khi còn mã Sheet", () => {
  const dir = khoTam({ "wrangler.jsonc": WRANGLER, "src/a.ts": 'const ID = "SHEETMAUXYZ123";\n' });
  try {
    const r = chayKichBan(dir);
    assert.equal(r.status, 1);
    assert.ok(!existsSync(r.ra));
    assert.ok(!r.stderr.includes("SHEETMAUXYZ123"), "thông báo lỗi không được in mã Sheet");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("kịch bản: dừng khi không đọc được mã Sheet nào từ wrangler.jsonc (hàng rào không được tắt âm thầm)", () => {
  const dir = khoTam({ "src/a.ts": "export const A = 1;\n" });
  try {
    const r = chayKichBan(dir);
    assert.equal(r.status, 1);
    assert.ok(!existsSync(r.ra));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("kịch bản: dừng khi tự quét còn thấy chuỗi giống số điện thoại chưa che", () => {
  const dir = khoTam({ "wrangler.jsonc": WRANGLER, "src/a.ts": 'const S = "0987_654_321";\n' });
  try {
    const r = chayKichBan(dir);
    assert.equal(r.status, 1);
    assert.ok(!existsSync(r.ra));
    assert.match(r.stderr, /src\/a\.ts:1/);
    assert.ok(!r.stderr.replace(/[^0-9]/g, "").includes("987654321"), "thông báo lỗi không được in số");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
