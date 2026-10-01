// P16 — đột biến có chủ ý trên BẢN SAO giống hệt (đã `diff -r` với nhánh): sửa cố ý → bài kiểm phải ĐỎ → hoàn nguyên → xanh lại.
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const M = "/Users/tuanbao/.claude/jobs/d04f7aa9/tmp/m";
const H = ".claude/hooks";
const chay = (tep) => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...tep], { cwd: M, encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024 });
  return { ma: r.status, do: r.stdout.split("\n").filter((d) => /^not ok \d+ - /.test(d)).map((d) => d.replace(/^not ok \d+ - /, "").slice(0, 110)) };
};

const DS = [
  { ten: "H3: tepLuat luôn trả null (không tệp nào là luật)", tep: `${H}/guard-luat-lib.mjs`, tim: "  return LUAT.some((re) => re.test(rel)) ? rel : null;", thay: "  return null;", bai: ["src/claude-guard-luat.test.ts"] },
  { ten: "H3: bỏ canh đích chuyển hướng `>`", tep: `${H}/guard-luat-lib.mjs`, tim: "  for (const g of ghi) {\n    const r = luat(g);\n    if (r) return r;\n  }", thay: "", bai: ["src/claude-guard-luat.test.ts"] },
  { ten: "H3: móc guard-remote không gọi hàng rào luật", tep: `${H}/guard-remote.mjs`, tim: "verdict = danhGiaGhiLuat(command, { cwd, root: gocKho(dirname(fileURLToPath(import.meta.url))) });", thay: "verdict = { deny: false };", bai: ["src/claude-guard-luat.test.ts"] },
  { ten: "H2: bỏ luật tệp bí mật", tep: `${H}/guard-tep-lib.mjs`, tim: "if (BI_MAT.test(ten) && !TEP_MAU.test(ten)) {", thay: "if (false) {", bai: ["src/claude-guard-tep.test.ts"] },
  { ten: "H2: bỏ luật migration đã lên main", tep: `${H}/guard-tep-lib.mjs`, tim: "if (/^migrations\\/[^/]+\\.sql$/.test(rel) && (", thay: "if (false && (", bai: ["src/claude-guard-tep.test.ts"] },
  { ten: "H2: bỏ luật checkout gốc", tep: `${H}/guard-tep-lib.mjs`, tim: "if (gitDir !== null && that(gitDir) === khoChung && ", thay: "if (false && ", bai: ["src/claude-guard-tep.test.ts"] },
  { ten: "H2: gỡ đăng ký móc guard-tep khỏi settings.json", tep: ".claude/settings.json", tim: "guard-tep.mjs", thay: "guard-khong-co.mjs", bai: ["src/claude-guard-tep.test.ts"] },
  { ten: "H1: cổng không bao giờ giữ (đỏ cũng cho dừng)", tep: `${H}/cong-xanh-lib.mjs`, tim: "  if (kq.xanh) return { chan: false };", thay: "  return { chan: false };", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: câu nào cũng coi là đã khai", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (cau !== null && chuan(cau).includes(CAU_KHAI))", thay: "if (cau !== null)", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: không nhớ theo dấu vân (bỏ so dấu vân ⇒ dùng kết quả cũ cho mã mới)", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (kq?.dauVan !== tt.dauVan || typeof kq?.xanh !== \"boolean\") {", thay: "if (typeof kq?.xanh !== \"boolean\") {", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: cây sạch-giống-main cũng chạy (mất lối tắt)", tep: `${H}/cong-xanh-lib.mjs`, tim: "  if (!tt.khac) return { chan: false };", thay: "", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: bộ chạy thật bỏ qua kết quả bài kiểm", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (soTep) loiBai = chay(process.execPath", thay: "if (soTep) chay(process.execPath", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: cổng chạy cả bài đo giờ", tep: `${H}/cong-xanh-lib.mjs`, tim: ".filter((f) => f !== TEP_DO_GIO)", thay: "", bai: ["src/claude-cong-xanh.test.ts"] },
  { ten: "H1: gỡ đăng ký Stop khỏi settings.json", tep: ".claude/settings.json", tim: "\"Stop\": [", thay: "\"StopKhongCo\": [", bai: ["src/claude-cong-xanh.test.ts"] },
];

let hong = 0;
for (const d of DS) {
  const p = join(M, d.tep);
  const goc = readFileSync(p, "utf8");
  if (!goc.includes(d.tim)) {
    console.log(`✘ KHÔNG TÌM THẤY chỗ đột biến: ${d.ten}`);
    hong++;
    continue;
  }
  writeFileSync(p, goc.replace(d.tim, d.thay));
  let r;
  try {
    r = chay(d.bai);
  } finally {
    writeFileSync(p, goc);
  }
  const dat = r.ma !== 0 && r.do.length > 0;
  if (!dat) hong++;
  console.log(`${dat ? "ĐỎ đúng" : "✘ VẪN XANH (hàng rào không được canh)"} — ${d.ten}`);
  for (const t of r.do) console.log(`      not ok: ${t}`);
}
const sau = chay(["src/claude-cong-xanh.test.ts", "src/claude-guard-tep.test.ts", "src/claude-guard-luat.test.ts"]);
console.log(`Sau hoàn nguyên: thoát ${sau.ma}, đỏ ${sau.do.length}`);
console.log(hong === 0 && sau.ma === 0 ? "KẾT QUẢ: mọi đột biến đều bị bắt, hoàn nguyên xanh." : `KẾT QUẢ: ${hong} đột biến KHÔNG bị bắt hoặc hoàn nguyên chưa xanh.`);
process.exit(hong === 0 && sau.ma === 0 ? 0 : 1);
