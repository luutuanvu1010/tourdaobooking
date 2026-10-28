// Đóng gói mã cho trợ lý chạy trên máy chủ Anthropic (ADR-0145 Đ3): lấy đúng các tệp được gửi ở MỘT commit; che số điện
// thoại, email, tên chủ (git user.name) và đường dẫn tài khoản máy; tự quét lại; từ chối nếu còn mã Sheet, nếu không đọc được
// mã Sheet nào, hoặc nếu còn chuỗi giống số điện thoại chưa che; nén thành một tệp .tar.gz kèm NGUON.txt.
// Chỉ đọc kho, không gửi gì đi đâu. Thông báo lỗi chỉ ghi tệp:dòng, không bao giờ in giá trị đã tìm thấy.
// Dùng: `node scripts/goi-ma-tro-ly-may.mjs [--commit main] [--ra <tệp .tar.gz>]`. Luật thuần: scripts/goi-ma-tro-ly-may-lib.mjs.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { dirname, join, resolve } from "node:path";
import { duocGui, taoBoChe, timChuoiCam } from "./goi-ma-tro-ly-may-lib.mjs";

function chay(lenh, args, input) {
  const r = spawnSync(lenh, args, { input, maxBuffer: 1 << 30 });
  if (r.status !== 0) {
    console.error(`${lenh} ${args.join(" ")} lỗi:\n${r.stderr}`);
    process.exit(1);
  }
  return r.stdout;
}
function dung(lyDo) {
  console.error(`Dừng, không tạo gói: ${lyDo}`);
  process.exit(1);
}
const thamSo = (ten, macDinh) => {
  const i = process.argv.indexOf(ten);
  if (i === -1) return macDinh;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) dung(`${ten} cần một giá trị.`);
  return v;
};

const commit = chay("git", ["rev-parse", "--verify", `${thamSo("--commit", "main")}^{commit}`]).toString().trim();
const ra = resolve(thamSo("--ra", join(tmpdir(), `tourdao-ma-nguon-${commit.slice(0, 8)}.tar.gz`)));

const tep = chay("git", ["ls-tree", "-r", "-z", "--name-only", commit]).toString().split("\0").filter((p) => p && duocGui(p));

// Đọc mọi tệp trong một lần gọi: `git cat-file --batch` trả "<oid> blob <cỡ>\n<nội dung>\n" cho từng dòng hỏi.
const lo = chay("git", ["cat-file", "--batch"], tep.map((p) => `${commit}:${p}\n`).join(""));
const noiDung = new Map();
let i = 0;
for (const p of tep) {
  const het = lo.indexOf(10, i);
  const dau = lo.subarray(i, het).toString().split(" ");
  if (dau[1] !== "blob") dung(`không đọc được ${p} ở ${commit}.`);
  const co = Number(dau[2]);
  noiDung.set(p, lo.subarray(het + 1, het + 1 + co));
  i = het + 1 + co + 1;
}

// Chuỗi cấm: mọi giá trị *SHEET*_ID khai trong wrangler.jsonc của cùng commit. Không đọc được cái nào = hàng rào đang tắt: dừng.
const wrangler = spawnSync("git", ["show", `${commit}:wrangler.jsonc`]).stdout?.toString() ?? "";
const chuoiCam = [...wrangler.matchAll(/"[A-Z_]*SHEET[A-Z_]*_ID"\s*:\s*"([^"]+)"/g)].map((m) => m[1]).filter(Boolean);
if (chuoiCam.length === 0) dung("không đọc được mã Sheet nào từ wrangler.jsonc, nên không kiểm được gói có còn mã Sheet hay không.");

const tenChu = spawnSync("git", ["config", "user.name"]).stdout?.toString().trim() ?? "";
const taiKhoan = userInfo().username;
const laNhiPhan = (b) => b.subarray(0, 8000).includes(0);
const vanBan = [...noiDung].filter(([, b]) => !laNhiPhan(b)).map(([p, b]) => [p, b.toString("utf8")]);
const boChe = taoBoChe(
  vanBan.map(([, t]) => t),
  { thayChuoi: [[tenChu, "Chủ Dự Án"], [taiKhoan ? `/Users/${taiKhoan}/` : "", "/Users/nguoi-dung/"]] },
);

const daChe = [];
const sot = [];
let soSdt = 0;
let soEmail = 0;
let soChuoi = 0;
let soDong = 0;
for (const [p, t] of vanBan) {
  const r = boChe.che(t);
  if (timChuoiCam(r.text, chuoiCam)) dung(`${p} còn mã Sheet (giá trị khai trong wrangler.jsonc).`);
  for (const d of boChe.conSot(r.text)) sot.push(`${p}:${d}`);
  soSdt += r.soSdt;
  soEmail += r.soEmail;
  soChuoi += r.soChuoi;
  soDong += r.text.split("\n").length;
  daChe.push([p, r.text]);
}
if (sot.length) dung(`còn chuỗi giống số điện thoại chưa che ở:\n  ${sot.join("\n  ")}\nSửa luật che (scripts/goi-ma-tro-ly-may-lib.mjs) hoặc dòng đó rồi chạy lại.`);

const thu = mkdtempSync(join(tmpdir(), "goi-ma-"));
const goc = join(thu, "ma-nguon");
try {
  for (const [p, t] of daChe) {
    mkdirSync(dirname(join(goc, p)), { recursive: true });
    writeFileSync(join(goc, p), t);
  }
  for (const [p, b] of noiDung) {
    if (!laNhiPhan(b)) continue;
    mkdirSync(dirname(join(goc, p)), { recursive: true });
    writeFileSync(join(goc, p), b);
  }
  writeFileSync(
    join(goc, "NGUON.txt"),
    [
      "Bản mã Nền tảng Tour Đảo gửi cho trợ lý chạy trên mây (ADR-0145).",
      `Commit: ${commit}`,
      `Ngày đóng gói: ${new Date().toISOString()}`,
      `Số tệp: ${noiDung.size}`,
      `Đã thay ${soSdt} chỗ số điện thoại, ${soEmail} chỗ email và ${soChuoi} chỗ tên chủ hay đường dẫn máy bằng bản giả:`,
      "số điện thoại, email và tên người trong bản này KHÔNG phải của người thật.",
      "Bài kiểm có sẵn so khớp từng chữ số điện thoại, email hay đường dẫn có thể lệch vì việc thay này — đó không phải lỗi của mã.",
      "Bản này chỉ gồm: src/, web/, migrations/, tests/audit/ (khung thử D1), package.json, tsconfig.json, CLAUDE.md,",
      "docs/ARCHITECTURE.md, docs/data-dictionary.json, scripts/source-mask-lib.mjs, scripts/audit-checks.mjs, scripts/audit-thuong-mai.mjs.",
      "Tệp nào CLAUDE.md nhắc tới mà không có ở đây thì đã không được gửi.",
      "Không có node_modules và máy không có mạng: khung thử tests/audit/harness.mjs cần esbuild nên không chạy được;",
      "bài kiểm luật thuần (rules.ts, src/shared/) và node:sqlite chạy được.",
      "",
    ].join("\n"),
  );
  chay("tar", ["-czf", ra, "-C", thu, "ma-nguon"]);
} finally {
  rmSync(thu, { recursive: true, force: true });
}

console.log(`Đã tạo gói: ${ra}`);
console.log(`  commit ${commit}, ${noiDung.size} tệp, khoảng ${soDong.toLocaleString("vi-VN")} dòng, ${(statSync(ra).size / 1024 / 1024).toFixed(1)} MB`);
console.log(`  đã thay ${soSdt} chỗ số điện thoại, ${soEmail} chỗ email, ${soChuoi} chỗ tên chủ / đường dẫn máy; tự quét: sạch; mã Sheet: không còn`);
