// Hàng rào «cỡ chỉ dẫn» và «neo ba khung» (đề xuất docs/superpowers/specs/2026-11-03-rut-gon-claude-md.md bước 1; ADR-0160). Mọi việc ở đây chỉ SIẾT:
//   (1) Cỡ các tệp CLAUDE.md tính theo BYTE không vượt trần. Trần chỉ được HẠ, không bao giờ nâng. Tệp nhỏ hơn trần quá DUNG_SAI thì
//       cũng đỏ, để người rút gọn phải hạ trần (bánh cóc, cùng kiểu src/ratchet-confirm-alert.test.ts). Tệp dài làm AI tuân thủ kém hơn (tài liệu Claude Code,
//       FRAMEWORK §4.6); đếm dòng không bắt được tệp phình vì dòng rất dài.
//   (2) Mọi đường dẫn viết trong dấu `…` của các tệp phải trỏ tới tệp có thật, trừ danh sách loại trừ có lý do (chống chỉ dẫn treo).
//   (3) Số mục §1–§10 của CLAUDE.md gốc và các cụm chữ hook trích không được mất: hook, trợ lý con, kịch bản trỏ vào đó (ADR-0160 Đ5).
//   (4) §2 giữ neo tới ba khung và bốn văn bản nền; Kernel 18 đúng một dòng chỉ đường; mọi điều luật, ADR, trụ cột được trích đều có thật (ADR-0160 Đ1, Đ3).
//   (5) CLAUDE.md con cạnh mã phải được §10 gốc trỏ tới, nằm trong gói gửi trợ lý trên mây (ADR-0145 Đ3), và hỏi chủ khi sửa bằng công cụ.
// Giới hạn đã biết: chỉ kiểm đường dẫn bắt đầu bằng thư mục gốc đã liệt kê, không chứa * < > …; tên rút gọn không có đuôi phải ghi vào LOAI_TRU.
// Bài này canh NEO và TRÍCH DẪN, không canh việc AI có thật sự viết đoạn Đối chiếu hay viết đúng: phần đó dựa vào kỷ luật và người kiểm độc lập.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { duocGui } from "../scripts/goi-ma-tro-ly-may-lib.mjs";

const ROOT = join(import.meta.dirname, "..");
const TEP = ["CLAUDE.md", "src/CLAUDE.md", "web/CLAUDE.md"] as const;
/** CLAUDE.md con cạnh mã (ADR-0160 Đ5): tệp mới ở src/modules/<tên>/ tự vào mọi bài dưới. */
const TEP_CON = readdirSync(join(ROOT, "src/modules"))
  .map((m) => `src/modules/${m}/CLAUDE.md`)
  .filter((p) => existsSync(join(ROOT, p)));

/** Trần byte (2026-11-03: 30.638 / 10.236 / 32.355 byte; gốc hạ khi viết lại, ADR-0160). CHỈ HẠ khi rút gọn; có dung sai nhỏ để sửa số đếm, tên tệp (N9). */
const TRAN_BYTE: Record<(typeof TEP)[number], number> = { "CLAUDE.md": 27800, "src/CLAUDE.md": 10500, "web/CLAUDE.md": 33000 };
/** Tệp nhỏ hơn trần quá chừng này thì đỏ: hạ trần cho sát. */
const DUNG_SAI = 2500;
/** Trần mỗi CLAUDE.md con: chỉ chứa bẫy của đúng một vùng (ngưỡng theo mức 4 KB của FRAMEWORK §4.6). */
const TRAN_CON = 4096;

/** Đường dẫn được phép không có thật trong cây git, kèm lý do. Mỗi mục phải còn được nhắc ở một trong các tệp (bài dưới kiểm). */
const LOAI_TRU: Record<string, string> = {
  "public/js/": "sản phẩm build, bị gitignore (npm run build:web)",
  "public/sw.js": "sản phẩm build, bị gitignore (npm run build:web)",
  "docs/design/van-chuyen-dieu-phoi/project/07": "viết tắt của tệp «07 Bieu mau don - chang don.dc.html» (tên có dấu cách)",
  "docs/design/van-chuyen-dieu-phoi/project/08": "viết tắt của tệp «08 Chinh sach dieu phoi.dc.html» (tên có dấu cách)",
};

/** Cụm chữ mà hook, tài liệu trích từ CLAUDE.md gốc: mất cụm là thông báo của hook trỏ vào chỗ không còn. */
const CUM_DUOC_TRICH: [number, string][] = [
  [3, "Không tự tay đổi luật chi phối chính mình"],
  [7, "Bảo mật"],
  [7, "chỉ thêm tệp mới"],
  [8, "CẤM AI tự chạy"],
  [8, "git worktree riêng"],
  [8, "Hook không có công tắc tạm"],
  [10, "Số migration"],
];

/** Neo mà §2 phải giữ: ba khung (chủ dự án 2026-11-03) và bốn văn bản nền. */
const NEO_MUC_2 = [
  "docs/Ref/tieu-chi-doi-chieu.md",
  "docs/Ref/Oracle-crm-triet-ly-va-checklist.md",
  "docs/Ref/MWG-5-tru-cot.md",
  "docs/kernel-18.md",
  "playbook/CONSTITUTION.md",
  "playbook/GOVERNANCE.md",
  "playbook/FRAMEWORK.md",
  "docs/ARCHITECTURE.md",
];

const DANG_DUONG_DAN = /^(docs|src|web|playbook|scripts|tests|migrations|public|\.claude)\/[A-Za-z0-9._/-]*$/;

/** Các đường dẫn cần kiểm trong một đoạn văn: chữ trong dấu `…`, bỏ hậu tố :dòng, bỏ mẫu glob / chỗ trống. Thuần, không I/O. */
export function duongDanCanKiem(noiDung: string): string[] {
  const ra = new Set<string>();
  for (const m of noiDung.matchAll(/`([^`\n]+)`/g)) {
    const s = (m[1] ?? "").trim().replace(/:\d+(-\d+)?$/, "");
    if (!DANG_DUONG_DAN.test(s) || /[*<>…]/.test(s)) continue;
    ra.add(s);
  }
  return [...ra].sort();
}

/** Phần của mục `## n.` trong một văn bản, tới mục `## ` kế tiếp; rỗng nếu không có. Thuần. */
export function muc(noiDung: string, n: number): string {
  const dau = noiDung.search(new RegExp(`^## ${n}\\. `, "m"));
  if (dau < 0) return "";
  const sau = noiDung.slice(dau + 1).search(/^## /m);
  return sau < 0 ? noiDung.slice(dau) : noiDung.slice(dau, dau + 1 + sau);
}

/** Các chỗ trích trong một đoạn: `HC 1.4, 2.1, K4`, `ADR-0001`, `P5`, `N8`, `Oracle 1`, `T1`. Thuần. */
export function choTrich(s: string): { hc: string[]; adr: string[]; hienPhap: string[]; oracle: string[]; mwg: string[] } {
  return {
    hc: [...s.matchAll(/\bHC ((?:K\d+|\d+\.\d+)(?:, (?:K\d+|\d+\.\d+))*)/g)].flatMap((m) => (m[1] ?? "").split(", ")),
    adr: [...s.matchAll(/\bADR-(\d{4})\b/g)].map((m) => m[1] ?? ""),
    hienPhap: [...s.matchAll(/(?<![\w-])([PN]\d{1,2})\b/g)].map((m) => m[1] ?? ""),
    oracle: [...s.matchAll(/\bOracle (\d+)\b/g)].map((m) => m[1] ?? ""),
    mwg: [...s.matchAll(/(?<![\w-])T(\d+)\b/g)].map((m) => m[1] ?? ""),
  };
}

const doc = (ten: string): string => readFileSync(join(ROOT, ten), "utf8");
const tatCaTep = (): string[] => [...TEP, ...TEP_CON];

/** Đoạn «### Ba khung…» của §2, tới hết §2. */
const khoiBaKhung = (): string => {
  const m2 = muc(doc("CLAUDE.md"), 2);
  const dau = m2.indexOf("### Ba khung");
  return dau < 0 ? "" : m2.slice(dau);
};

/** Mọi chỗ trích trong đoạn `s` phải có thật; trả về danh sách chỗ treo. */
function trichTreo(s: string): string[] {
  const hc = doc("docs/ARCHITECTURE.md");
  const hp = doc("playbook/CONSTITUTION.md");
  const oracle = doc("docs/Ref/Oracle-crm-triet-ly-va-checklist.md");
  const mwg = doc("docs/Ref/MWG-5-tru-cot.md");
  const adr = readdirSync(join(ROOT, "docs/adr"));
  const c = choTrich(s);
  return [
    ...c.hc.filter((ma) => (ma.startsWith("K") ? !hc.includes(`| ${ma} |`) : !new RegExp(`\\*\\*${ma.replace(".", "\\.")}(\\*\\*)? `).test(hc))).map((x) => `HC ${x}`),
    ...c.adr.filter((so) => !adr.some((f) => f.startsWith(`ADR-${so}-`))).map((x) => `ADR-${x}`),
    ...c.hienPhap.filter((ma) => !new RegExp(`^\\*\\*${ma}\\.`, "m").test(hp)),
    ...c.oracle.filter((n) => !new RegExp(`^${n}\\. \\*\\*`, "m").test(oracle)).map((x) => `Oracle ${x}`),
    ...c.mwg.filter((n) => !new RegExp(`^## T${n} · `, "m").test(mwg)).map((x) => `T${x}`),
  ];
}

test("cỡ ba tệp CLAUDE.md không vượt trần và trần sát cỡ thật (chỉ được hạ)", () => {
  for (const ten of TEP) {
    const byte = Buffer.byteLength(doc(ten), "utf8");
    const tran = TRAN_BYTE[ten];
    assert.ok(byte <= tran, `${ten}: ${byte} byte > trần ${tran}. Chuyển bớt chữ sang tài liệu / CLAUDE.md con thay vì nâng trần (ADR-0160).`);
    assert.ok(byte >= tran - DUNG_SAI, `${ten}: ${byte} byte nhỏ hơn trần ${tran} quá ${DUNG_SAI} byte. Hạ TRAN_BYTE cho sát (bánh cóc, không nâng lại).`);
  }
});

test("mỗi CLAUDE.md con không quá trần; được §10 gốc trỏ tới; nằm trong gói trợ lý trên mây; sửa bằng công cụ phải hỏi chủ", () => {
  const muc10 = muc(doc("CLAUDE.md"), 10);
  assert.ok(TEP_CON.length >= 5, `chỉ thấy ${TEP_CON.length} CLAUDE.md con: bộ tìm có thể hỏng (2026-11-03 có 5)`);
  for (const ten of TEP_CON) {
    const byte = Buffer.byteLength(doc(ten), "utf8");
    assert.ok(byte <= TRAN_CON, `${ten}: ${byte} byte > trần ${TRAN_CON}. Tệp con chỉ chứa bẫy của đúng một vùng; chi tiết đưa sang docs/CHANGE-GUIDE.md.`);
    assert.ok(muc10.includes(`\`${ten}\``), `§10 của CLAUDE.md gốc phải trỏ tới ${ten}: AI tìm rộng bằng grep -r và trợ lý trên mây chỉ biết tệp con qua chỉ mục này`);
    assert.equal(duocGui(ten), true, `${ten} phải nằm trong gói trợ lý trên mây (ADR-0145 Đ3)`);
  }
  const hoi: string[] = JSON.parse(doc(".claude/settings.json")).permissions.ask;
  assert.ok(hoi.includes("Edit(src/modules/**/CLAUDE.md)"), "thiếu luật ask cho CLAUDE.md con ở .claude/settings.json: AI sửa luật mà chủ không được hỏi");
});

test("đường dẫn viết trong các tệp CLAUDE.md đều trỏ tới tệp có thật (trừ danh sách loại trừ)", () => {
  const treo: string[] = [];
  let tong = 0;
  for (const ten of tatCaTep()) {
    for (const p of duongDanCanKiem(doc(ten))) {
      tong++;
      if (p in LOAI_TRU) continue;
      if (!existsSync(join(ROOT, p))) treo.push(`${ten} → ${p}`);
    }
  }
  assert.ok(tong >= 150, `chỉ thấy ${tong} đường dẫn để kiểm: bộ trích có thể hỏng (đã biết ≥ 200 ngày 2026-11-03)`);
  assert.deepEqual(treo, [], `chỉ dẫn treo (tệp không còn): sửa chữ trong CLAUDE.md hoặc, nếu là sản phẩm build / viết tắt, thêm vào LOAI_TRU kèm lý do:\n${treo.join("\n")}`);
});

test("mỗi mục loại trừ còn được nhắc trong các tệp (hết nhắc thì xoá mục)", () => {
  const tatCa = new Set<string>();
  for (const ten of tatCaTep()) for (const p of duongDanCanKiem(doc(ten))) tatCa.add(p);
  const thua = Object.keys(LOAI_TRU).filter((p) => !tatCa.has(p));
  assert.deepEqual(thua, [], `mục LOAI_TRU không còn được nhắc, xoá đi: ${thua.join(", ")}`);
});

test("giữ mục §1–§10; mọi chỗ trích CLAUDE.md §N ở hook, trợ lý con, kịch bản, tài liệu sống còn trỏ được; cụm chữ được trích còn đúng mục", () => {
  const goc = doc("CLAUDE.md");
  for (let n = 1; n <= 10; n++) assert.notEqual(muc(goc, n), "", `CLAUDE.md gốc mất mục ${n}: hàng trăm chỗ trỏ theo số mục`);
  assert.match(goc, /^## 8\. Git, triển khai, an toàn$/m, "hook guard-remote trích đúng tên mục này");
  const nguon = [
    ...readdirSync(join(ROOT, ".claude/hooks")).filter((f) => f.endsWith(".mjs")).map((f) => `.claude/hooks/${f}`),
    ...readdirSync(join(ROOT, ".claude/agents")).filter((f) => f.endsWith(".md")).map((f) => `.claude/agents/${f}`),
    ...readdirSync(join(ROOT, "scripts")).filter((f) => f.endsWith(".mjs")).map((f) => `scripts/${f}`),
    "src/CLAUDE.md",
    "web/CLAUDE.md",
    "docs/ARCHITECTURE.md",
    "docs/CHANGE-GUIDE.md",
    "docs/HANDOFF-N1.md",
    "docs/SYSTEM-DESIGN.md",
    "RANG_BUOC_NGOAI.md",
  ];
  let dem = 0;
  const hong: string[] = [];
  for (const t of nguon) {
    for (const m of doc(t).matchAll(/(?<![\w/.-])CLAUDE\.md`?\s*§\s*(\d+)/g)) {
      dem++;
      if (muc(goc, Number(m[1])) === "") hong.push(`${t} → §${m[1]}`);
    }
  }
  assert.ok(dem >= 10, `chỉ thấy ${dem} chỗ trích: bộ tìm có thể hỏng (2026-11-03 có hơn 10)`);
  assert.deepEqual(hong, [], `chỗ trích trỏ vào mục không còn:\n${hong.join("\n")}`);
  for (const [n, cum] of CUM_DUOC_TRICH) assert.ok(muc(goc, n).includes(cum), `§${n} mất cụm «${cum}» mà hook hoặc tài liệu trích`);
});

test("§2 giữ neo ba khung và bốn văn bản nền; Kernel 18 đúng một dòng chỉ đường trong CLAUDE.md gốc", () => {
  const m2 = muc(doc("CLAUDE.md"), 2);
  assert.notEqual(khoiBaKhung(), "", "§2 mất khối «### Ba khung»: lệnh của chủ dự án 2026-11-03 (ADR-0160 Đ1)");
  for (const p of NEO_MUC_2) assert.ok(m2.includes(`\`${p}\``), `§2 mất neo tới ${p}`);
  for (const khung of ["Oracle", "MWG", "Kernel 18"]) assert.ok(khoiBaKhung().includes(khung), `khối ba khung mất ${khung}`);
  const soLan = doc("CLAUDE.md").split("docs/kernel-18.md").length - 1;
  assert.equal(soLan, 1, "KERNEL-18: luật phiên «chỉ thêm một dòng chỉ đường», không chép nội dung; CLAUDE.md gốc chỉ nhắc tờ khai đúng một lần");
});

test("mọi điều luật, ADR, nguyên lý, trụ cột trích trong khối ba khung và bảng tiêu chí đều có thật", () => {
  assert.deepEqual(trichTreo(khoiBaKhung()), [], "khối ba khung ở CLAUDE.md §2 trích chỗ không có thật");
  assert.deepEqual(trichTreo(doc("docs/Ref/tieu-chi-doi-chieu.md")), [], "docs/Ref/tieu-chi-doi-chieu.md trích chỗ không có thật");
  const c = choTrich(khoiBaKhung());
  assert.ok(c.hc.length >= 5 && c.oracle.length >= 5 && c.mwg.length >= 4, "khối ba khung phải trích đủ HC, Oracle, MWG: bộ trích có thể hỏng");
});

test("mỗi dòng bảng tiêu chí có nguồn khung và trỏ luật đang có, hoặc ghi rõ chưa phải luật", () => {
  const dong = doc("docs/Ref/tieu-chi-doi-chieu.md").split("\n").filter((l) => /^\| C\d+ \|/.test(l));
  assert.ok(dong.length >= 10, `chỉ thấy ${dong.length} dòng tiêu chí: bảng có thể hỏng (2026-11-03 có 15)`);
  for (const l of dong) {
    const o = l.split("|").map((x) => x.trim());
    assert.match(o[3] ?? "", /Oracle|MWG|Kernel 18/, `dòng thiếu nguồn khung: ${l}`);
    const c = choTrich(o[4] ?? "");
    const coLuat = c.hc.length + c.adr.length + c.hienPhap.length > 0;
    assert.ok(coLuat || (o[4] ?? "").includes("chưa phải luật"), `dòng không trỏ luật và không ghi «chưa phải luật»: ${l}`);
  }
});

test("bản chụp MWG trong kho đủ năm trụ cột và hai nguyên tắc bất di bất dịch", () => {
  const mwg = doc("docs/Ref/MWG-5-tru-cot.md");
  for (let n = 1; n <= 5; n++) assert.match(mwg, new RegExp(`^## T${n} · `, "m"));
  assert.ok(mwg.includes("AI không được tự viết → tự review → tự phê duyệt → tự deploy."));
  assert.ok(mwg.includes("Con người giữ độc quyền mọi quyết định chạm đến tiền, pháp lý và khách hàng thật."));
});

test("bộ trích đường dẫn: bắt mục thiếu, bỏ glob, bỏ hậu tố dòng", () => {
  const mau = "xem `docs/a.md` và `docs/nhat-ky/*.md`, `src/x.ts:12-30`, `<tên>/y`, `lệnh chạy`, `docs/…`";
  assert.deepEqual(duongDanCanKiem(mau), ["docs/a.md", "src/x.ts"]);
  assert.deepEqual(duongDanCanKiem("không có gì"), []);
});

test("bộ tách mục và bộ trích: đúng biên mục, đúng danh sách có dấu phẩy, không dính chữ khác", () => {
  const vb = "# đầu\n## 1. Một\nchữ một\n### con\nchữ con\n## 2. Hai\nchữ hai\n";
  assert.equal(muc(vb, 1), "## 1. Một\nchữ một\n### con\nchữ con\n");
  assert.equal(muc(vb, 2), "## 2. Hai\nchữ hai\n");
  assert.equal(muc(vb, 3), "");
  assert.deepEqual(choTrich("HC 1.4, 2.1, K4; ADR-0001; N8, P7; Oracle 2; MWG T1, T5"), {
    hc: ["1.4", "2.1", "K4"],
    adr: ["0001"],
    hienPhap: ["N8", "P7"],
    oracle: ["2"],
    mwg: ["1", "5"],
  });
  assert.deepEqual(choTrich("ADR-00011 DK-T2-01 XP12 HC-5.11"), { hc: [], adr: [], hienPhap: [], oracle: [], mwg: [] });
  assert.deepEqual(choTrich("Oracle 10; MWG T6"), { hc: [], adr: [], hienPhap: [], oracle: ["10"], mwg: ["6"] }, "số ngoài khoảng phải được bắt để bài trích dẫn báo treo");
});
