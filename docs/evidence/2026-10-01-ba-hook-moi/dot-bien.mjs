// P16 — đột biến có chủ ý: sửa cố ý → bài kiểm phải ĐỎ → hoàn nguyên → xanh lại. Chạy: `node docs/evidence/2026-10-01-ba-hook-moi/dot-bien.mjs` (từ gốc cây làm việc).
// Kịch bản TỰ dựng một bản sao tạm của các tệp hook + bài kiểm (ở thư mục tạm của hệ điều hành), đột biến trên bản sao, rồi xoá — không đụng tệp nào của kho.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KHO = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const M = mkdtempSync(join(tmpdir(), "td-dot-bien-"));
const H = ".claude/hooks";
for (const d of [H, "src", "scripts"]) mkdirSync(join(M, d), { recursive: true });
for (const f of readdirSync(join(KHO, H)).filter((f) => f.endsWith(".mjs"))) cpSync(join(KHO, H, f), join(M, H, f));
for (const f of [".claude/settings.json", "package.json", ".gitignore", "scripts/chay-test.mjs", "src/claude-guard.cases.json", "src/claude-guard.test.ts", "src/claude-guard-luat.test.ts", "src/claude-guard-tep.test.ts", "src/claude-cong-xanh.test.ts", "src/claude-guard-thoi-gian.test.ts"]) cpSync(join(KHO, f), join(M, f));

const BAI = ["src/claude-cong-xanh.test.ts", "src/claude-guard-tep.test.ts", "src/claude-guard-luat.test.ts", "src/claude-guard.test.ts"];
const chay = (tep) => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(process.execPath, ["--test", "--test-reporter=tap", ...tep], { cwd: M, encoding: "utf8", env, maxBuffer: 64 * 1024 * 1024 });
  return { ma: r.status, do: r.stdout.split("\n").filter((d) => /^not ok \d+ - /.test(d)).map((d) => d.replace(/^not ok \d+ - /, "").slice(0, 110)) };
};

const LUAT = ["src/claude-guard-luat.test.ts"];
const TEP = ["src/claude-guard-tep.test.ts"];
const CONG = ["src/claude-cong-xanh.test.ts"];
const DS = [
  { ten: "H3: tepLuat luôn trả null (không tệp nào là luật)", tep: `${H}/guard-luat-lib.mjs`, tim: "  return LUAT.some((re) => re.test(rel)) ? rel : null;", thay: "  return null;", bai: LUAT },
  { ten: "H3: bỏ canh đích chuyển hướng `>`", tep: `${H}/guard-luat-lib.mjs`, tim: "  for (const g of ghi) {\n    const r = luat(g);\n    if (r) return r;\n  }", thay: "", bai: LUAT },
  { ten: "H3: bỏ ngoại lệ cờ nạp thư viện của perl (-M/-m/-I) ⇒ chặn nhầm lệnh đọc", tep: `${H}/guard-luat-lib.mjs`, tim: "!/^-[MmI]/.test(f) && ", thay: "", bai: LUAT },
  { ten: "H3: móc guard-remote không gọi hàng rào luật", tep: `${H}/guard-remote.mjs`, tim: "verdict = danhGiaGhiLuat(command, { cwd, root: gocKho(dirname(fileURLToPath(import.meta.url))) });", thay: "verdict = { deny: false };", bai: LUAT },
  { ten: "H2: bỏ luật tệp bí mật", tep: `${H}/guard-tep-lib.mjs`, tim: "if (BI_MAT.test(ten) && !TEP_MAU.test(ten)) {", thay: "if (false) {", bai: TEP },
  { ten: "H2: bỏ luật migration đã lên main", tep: `${H}/guard-tep-lib.mjs`, tim: "if (/^migrations\\/[^/]+\\.sql$/.test(rel) && (", thay: "if (false && (", bai: TEP },
  { ten: "H2: bỏ vế origin/main của luật migration", tep: `${H}/guard-tep-lib.mjs`, tim: " || gitDung(dir, [\"cat-file\", \"-e\", `origin/main:${rel}`])", thay: "", bai: TEP },
  { ten: "H2: bỏ luật checkout gốc", tep: `${H}/guard-tep-lib.mjs`, tim: "if (gitDir !== null && that(gitDir) === khoChung && ", thay: "if (false && ", bai: TEP },
  { ten: "H2: gỡ đăng ký móc guard-tep khỏi settings.json", tep: ".claude/settings.json", tim: "guard-tep.mjs", thay: "guard-khong-co.mjs", bai: TEP },
  { ten: "H1: cổng không bao giờ giữ (đỏ cũng cho dừng)", tep: `${H}/cong-xanh-lib.mjs`, tim: "  if (kq.xanh) return { chan: false };", thay: "  return { chan: false };", bai: CONG },
  { ten: "H1: câu nào cũng coi là đã khai", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (cau !== null && chuan(cau).includes(CAU_KHAI))", thay: "if (cau !== null)", bai: CONG },
  { ten: "H1: câu trả lời rỗng không được coi là thiếu (khoá phiên khi không đọc được câu trả lời)", tep: `${H}/cong-xanh-lib.mjs`, tim: " && input.last_assistant_message.trim() !== \"\"", thay: "", bai: CONG },
  { ten: "H1: không nhớ theo dấu vân (bỏ so dấu vân ⇒ dùng kết quả cũ cho mã mới)", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (kq?.dauVan !== tt.dauVan || typeof kq?.xanh !== \"boolean\") {", thay: "if (typeof kq?.xanh !== \"boolean\") {", bai: CONG },
  { ten: "H1: cây sạch-giống-main cũng chạy (mất lối tắt)", tep: `${H}/cong-xanh-lib.mjs`, tim: "  if (!tt.khac) return { chan: false };", thay: "", bai: CONG },
  { ten: "H1: bộ chạy thật bỏ qua kết quả bài kiểm", tep: `${H}/cong-xanh-lib.mjs`, tim: "if (soTep) loiBai = chay(process.execPath", thay: "if (soTep) chay(process.execPath", bai: CONG },
  { ten: "H1: cổng chạy cả bài đo giờ", tep: `${H}/cong-xanh-lib.mjs`, tim: ".filter((f) => f !== TEP_DO_GIO)", thay: "", bai: CONG },
  { ten: "H1: móc nhận cả SubagentStop (trợ lý con bị giữ mà không khai được)", tep: `${H}/cong-xanh.mjs`, tim: "if (input?.hook_event_name !== \"Stop\") process.exit(0);", thay: "if (input?.hook_event_name !== \"Stop\" && input?.hook_event_name !== \"SubagentStop\") process.exit(0);", bai: CONG },
  { ten: "H1: gỡ đăng ký Stop khỏi settings.json", tep: ".claude/settings.json", tim: "\"Stop\": [", thay: "\"StopKhongCo\": [", bai: CONG },
  { ten: "H1: đăng ký thêm cổng cho SubagentStop", tep: ".claude/settings.json", tim: "\"Stop\": [", thay: "\"SubagentStop\": [{ \"hooks\": [{ \"type\": \"command\", \"command\": \"node .claude/hooks/cong-xanh.mjs\" }] }],\n    \"Stop\": [", bai: CONG },
];

let hong = 0;
try {
  const truoc = chay(BAI);
  console.log(`Trước đột biến (bản sao nguyên vẹn): thoát ${truoc.ma}, đỏ ${truoc.do.length}`);
  if (truoc.ma !== 0) hong++;
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
  const sau = chay(BAI);
  console.log(`Sau hoàn nguyên: thoát ${sau.ma}, đỏ ${sau.do.length}`);
  if (sau.ma !== 0) hong++;
} finally {
  rmSync(M, { recursive: true, force: true });
}
console.log(hong === 0 ? `KẾT QUẢ: cả ${DS.length} đột biến đều bị bắt, hoàn nguyên xanh.` : `KẾT QUẢ: ${hong} chỗ KHÔNG đạt (đột biến không bị bắt, hoặc trước/sau chưa xanh).`);
process.exit(hong === 0 ? 0 : 1);
