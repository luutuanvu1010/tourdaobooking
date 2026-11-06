// Bảng chia phần + máy gom của lượt kiểm đủ bộ trên GitHub (ADR-0176 Đ1.2–Đ1.4). Quy trình: .github/workflows/kiem.yml. Bài: src/kiem-phan.test.ts.
//
// MỘT nguồn danh sách: tệp kiểm = glob "src/**/*.test.ts" (cùng hàm scripts/chay-test.mjs dùng), kịch bản e2e = `ALL` của tests/e2e/danh-sach.mjs.
// Bảng chia: một PHẦN RIÊNG (Bước 0 sinh lại kho trợ lý, typecheck, bài đo giờ của hook chạy một mình), `npm test` còn lại chia SO_PHAN_TEST phần, e2e chia
// SO_PHAN_E2E phần (mỗi phần một D1 tạm + một wrangler dev, `audit-invariants --strict` cuối phần — tests/e2e/run.mjs --phan). Tất định (cùng mã ⇒ cùng bảng),
// nên bước gom dựng lại bảng từ chính commit đó và so với báo cáo từng phần.
//
// Máy ĐỎ khi (Đ1.3): hợp các phần ≠ toàn bộ; một tệp / kịch bản ở hai phần; thiếu bước riêng; thiếu báo cáo một phần hay báo cáo trùng; phần chạy khác bảng
// chia; phần e2e không báo audit-invariants (hoặc audit đỏ); bất kỳ phần nào đỏ. Tệp này là TỆP ĐIỀU KHIỂN VIỆC KIỂM (Đ2.3): đổi nó thì day-len đòi lý do.
//
// Dòng lệnh (chỉ dùng trên máy GitHub; ở máy vẫn chạy `npm test` / `npm run test:e2e` như cũ):
//   node scripts/kiem-phan.mjs ma-tran                  → in "test=[1,…]" và "e2e=[1,…]" (cho $GITHUB_OUTPUT); bảng chia hỏng ⇒ thoát 1
//   node scripts/kiem-phan.mjs rieng --ket-qua <tệp>    → Bước 0 + typecheck + bài đo giờ (--test-concurrency=1)
//   node scripts/kiem-phan.mjs test <k> --ket-qua <tệp> → phần k của npm test
//   node scripts/kiem-phan.mjs gom <thư mục> --ket-qua <tệp> → gom mọi báo cáo; đỏ ⇒ thoát 1. (Phần e2e: node tests/e2e/run.mjs --phan k --ket-qua <tệp>)
import { spawnSync } from "node:child_process";
import { globSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALL, chiaNhom } from "../tests/e2e/danh-sach.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEP_DO_GIO = "src/claude-guard-thoi-gian.test.ts";
export const BUOC_RIENG = ["buoc-0", "typecheck", TEP_DO_GIO];
export const SO_PHAN_TEST = 4;
export const SO_PHAN_E2E = 6;

/**
 * Tệp điều khiển việc kiểm (ADR-0176 Đ2.3): nằm trong chính commit được kiểm nên đổi chúng có thể làm lượt kiểm bỏ bài mà vẫn "xanh". day-len so băm git của
 * các đường dẫn này giữa commit mới và origin/main (thư mục = mọi tệp bên dưới). `package.json` chỉ so các khoá ở KHOA_PACKAGE (đổi danh sách trang build
 * không phải đổi quy trình kiểm). Bài src/kiem-phan.test.ts khoá: danh sách chứa trọn chuỗi nhập của audit-invariants.mjs.
 */
export const TEP_DIEU_KHIEN = [
  ".github/workflows",
  "package.json",
  // Gói cài trên máy GitHub (npm ci: phiên bản tsc, wrangler) và phạm vi typecheck (kiểm độc lập N2, 2026-11-06).
  "package-lock.json",
  "tsconfig.json",
  "web/tsconfig.json",
  "web/sw/tsconfig.json",
  // Bước 0 của phần riêng: bộ sinh kho trợ lý và các tệp scripts/ nó nạp (bài khoá chuỗi nhập ở src/kiem-phan.test.ts).
  "scripts/sinh-so-do-trang.mjs",
  "scripts/source-mask-lib.mjs",
  "scripts/tro-ly-cau-truc-lib.mjs",
  // Khung chung của e2e (đăng nhập, tài khoản thử).
  "tests/e2e/lib.mjs",
  "scripts/chay-test.mjs",
  "scripts/kiem-phan.mjs",
  "scripts/dem-bai.mjs",
  "tests/e2e/run.mjs",
  "tests/e2e/danh-sach.mjs",
  "tests/e2e/thoi-gian.json",
  "scripts/audit-invariants.mjs",
  "scripts/audit-checks.mjs",
  "scripts/audit-thuong-mai.mjs",
  "src/claude-guard-thoi-gian.test.ts",
  "scripts/release-lib.mjs",
];
/** Khoá của package.json quyết định cách kiểm: lệnh test / typecheck / e2e, phiên bản Node (engines), gói cài (devDependencies — đổi phiên bản tsc, wrangler). */
export const KHOA_PACKAGE = ["scripts.test", "scripts.typecheck", "scripts.test:e2e", "engines", "devDependencies"];

/** Mọi tệp kiểm (cùng glob của `node --test` trong scripts/chay-test.mjs), đường dẫn tương đối dấu "/", đã sắp. */
export function danhSachTest(root = ROOT) {
  return globSync("src/**/*.test.ts", { cwd: root }).map((f) => f.split("\\").join("/")).sort();
}

/** Chia tệp vào n phần theo kích thước (nặng trước, vào phần nhẹ nhất — LPT), mỗi phần sắp theo tên. Tất định. */
function chiaTheoCo(list, n, co) {
  const phan = Array.from({ length: n }, () => ({ tong: 0, tep: [] }));
  const theoCo = [...list].sort((a, b) => co(b) - co(a) || (a < b ? -1 : a > b ? 1 : 0));
  for (const t of theoCo) {
    const nhe = phan.reduce((m, p) => (p.tong < m.tong ? p : m));
    nhe.tong += co(t);
    nhe.tep.push(t);
  }
  return phan.map((p) => p.tep.sort());
}

const coTep = (root) => (f) => {
  try {
    return statSync(join(root, f)).size;
  } catch {
    return 0;
  }
};

/** Bảng chia: { rieng, test: [[tệp…]…], e2e: [[kịch bản…]…] }. Mỗi phần e2e là DÃY CON của ALL (chiaNhom giữ thứ tự ràng buộc). */
export function bangChia({ tests = danhSachTest(), e2e = ALL, soPhanTest = SO_PHAN_TEST, soPhanE2e = SO_PHAN_E2E, kichThuoc = coTep(ROOT) } = {}) {
  return {
    rieng: [...BUOC_RIENG],
    test: chiaTheoCo(tests.filter((t) => t !== TEP_DO_GIO), soPhanTest, kichThuoc),
    e2e: chiaNhom(e2e, soPhanE2e),
  };
}

/** Lỗi của một bảng chia so với toàn bộ (rỗng = đạt). */
export function kiemBangChia(bang, { tests, e2e }) {
  const loi = [];
  for (const b of BUOC_RIENG) if (!bang.rieng?.includes(b)) loi.push(`phần riêng thiếu bước ${b}`);
  if (!tests.includes(TEP_DO_GIO)) loi.push(`không thấy bài đo giờ ${TEP_DO_GIO} trong glob src/**/*.test.ts`);
  if ((bang.test?.length ?? 0) < SO_PHAN_TEST) loi.push(`phần npm test: cần ít nhất ${SO_PHAN_TEST} phần, có ${bang.test?.length ?? 0}`);
  if ((bang.e2e?.length ?? 0) < SO_PHAN_E2E) loi.push(`phần e2e: cần ít nhất ${SO_PHAN_E2E} phần, có ${bang.e2e?.length ?? 0}`);
  const soi = (ten, cacPhan, toan) => {
    const gap = new Map();
    cacPhan.forEach((p, i) => p.forEach((x) => gap.set(x, [...(gap.get(x) ?? []), i + 1])));
    for (const [x, ps] of gap) if (ps.length > 1) loi.push(`${ten}: ${x} nằm ở hai phần trở lên (${ps.join(", ")})`);
    for (const x of toan) if (!gap.has(x)) loi.push(`${ten}: thiếu ${x} (không phần nào chạy)`);
    for (const x of gap.keys()) if (!toan.includes(x)) loi.push(`${ten}: ${x} không có trong danh sách gốc`);
  };
  if (bang.test?.flat().includes(TEP_DO_GIO)) loi.push(`bài đo giờ ${TEP_DO_GIO} chỉ được chạy ở phần riêng (một mình)`);
  soi("npm test", bang.test ?? [], tests.filter((t) => t !== TEP_DO_GIO));
  soi("e2e", bang.e2e ?? [], e2e);
  return loi;
}

/** Danh sách kịch bản của phần e2e thứ k (1…SO_PHAN_E2E) — tests/e2e/run.mjs --phan k. */
export function phanE2e(k) {
  if (!Number.isInteger(k) || k < 1 || k > SO_PHAN_E2E) throw new Error(`Phần e2e phải là số nguyên 1…${SO_PHAN_E2E} (nhận ${k})`);
  return bangChia().e2e[k - 1];
}

const giongNhau = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const laDem = (d) => d && ["tests", "pass", "fail", "skipped", "todo"].every((k) => Number.isInteger(d[k]) && d[k] >= 0);

/**
 * Gom báo cáo từng phần thành MỘT kết luận. Báo cáo do chính các phần ghi (scripts/kiem-phan.mjs rieng|test, tests/e2e/run.mjs --phan). Trả về
 * { ok, loi[], baiDo[], tong: { soTep, soBai, soBoQua, soKichBan }, giayE2e } — `tong` là số day-len so với lượt kiểm của origin/main (Đ2.3).
 */
export function gomKetQua(bang, baoCao, toanBo) {
  const loi = [...kiemBangChia(bang, toanBo)];
  const baiDo = [];
  const giayE2e = {};
  let soBai = 0;
  let soBoQua = 0;
  const hop = (x) => x && typeof x === "object" && ["rieng", "test", "e2e"].includes(x.loai);
  if (baoCao.some((x) => !hop(x))) loi.push("có báo cáo không đọc được (không phải JSON đúng dạng)");
  const cua = (loai) => baoCao.filter((x) => hop(x) && x.loai === loai);

  const rieng = cua("rieng");
  if (rieng.length !== 1) loi.push(rieng.length ? "phần riêng có hai báo cáo (trùng)" : "thiếu báo cáo phần riêng (Bước 0, typecheck, bài đo giờ)");
  const r = rieng[0];
  if (r) {
    if (r.buoc0?.ok !== true) loi.push(`Bước 0 (sinh lại kho trợ lý) đỏ${r.buoc0?.doi?.length ? `: tệp sinh đổi ${r.buoc0.doi.join(", ")} — commit các tệp này` : ""}`);
    if (r.typecheck?.ok !== true) loi.push("typecheck đỏ");
    if (r.doGio?.ok !== true || !giongNhau(r.doGio?.tep, [TEP_DO_GIO]) || !laDem(r.doGio?.dem)) loi.push(`bài đo giờ của hook (${TEP_DO_GIO}) đỏ hoặc không báo số bài`);
    if (laDem(r.doGio?.dem)) {
      soBai += r.doGio.dem.tests;
      soBoQua += r.doGio.dem.skipped + r.doGio.dem.todo;
    }
    if (r.typecheck?.ok !== true) baiDo.push("typecheck");
    if (r.buoc0?.ok !== true) baiDo.push("Bước 0 (kho trợ lý)");
    if (r.doGio?.ok !== true) baiDo.push(TEP_DO_GIO);
  }

  const soiPhan = (loai, nhan, cacPhan, danhSachCua, mot) => {
    const bc = cua(loai);
    cacPhan.forEach((ds, i) => {
      const k = i + 1;
      const cuaK = bc.filter((x) => x.phan === k);
      if (cuaK.length === 0) return loi.push(`thiếu báo cáo ${nhan} phần ${k}`);
      if (cuaK.length > 1) return loi.push(`${nhan} phần ${k} có hai báo cáo (trùng)`);
      const x = cuaK[0];
      if (!giongNhau(danhSachCua(x), ds)) loi.push(`${nhan} phần ${k} chạy danh sách khác bảng chia (thiếu hoặc thừa)`);
      mot(x, k);
    });
    for (const x of bc) if (!(Number.isInteger(x.phan) && x.phan >= 1 && x.phan <= cacPhan.length)) loi.push(`${nhan}: báo cáo phần lạ (${x.phan})`);
  };
  soiPhan("test", "npm test", bang.test, (x) => x.tep, (x, k) => {
    if (!laDem(x.dem)) loi.push(`npm test phần ${k} không báo số bài`);
    else {
      soBai += x.dem.tests;
      soBoQua += x.dem.skipped + x.dem.todo;
    }
    if (x.ok !== true || (laDem(x.dem) && x.dem.fail > 0)) {
      loi.push(`npm test phần ${k} đỏ`);
      baiDo.push(...(Array.isArray(x.baiDo) && x.baiDo.length ? x.baiDo : [`npm test phần ${k} (không đọc được tên bài)`]));
    }
  });
  soiPhan("e2e", "e2e", bang.e2e, (x) => (Array.isArray(x.kichBan) ? x.kichBan.map((kb) => kb?.ten) : null), (x, k) => {
    if (x.audit !== true) loi.push(`e2e phần ${k}: audit-invariants ${x.audit === false ? "ĐỎ" : "không chạy / không báo kết quả"}`);
    if (x.audit !== true) baiDo.push(`e2e phần ${k}: audit-invariants`);
    for (const kb of Array.isArray(x.kichBan) ? x.kichBan : []) {
      if (typeof kb?.giay === "number") giayE2e[kb.ten] = kb.giay;
      if (kb?.ok !== true) {
        loi.push(`e2e phần ${k}: kịch bản ${kb?.ten} đỏ`);
        baiDo.push(`e2e ${kb?.ten}`);
      }
    }
    if (x.ok !== true && !loi.some((l) => l.startsWith(`e2e phần ${k}`))) {
      loi.push(`e2e phần ${k} đỏ (kiểm cuối phần: day_loi / H5 / log trợ lý)`);
      baiDo.push(`e2e phần ${k} (kiểm cuối phần)`);
    }
  });

  return { ok: loi.length === 0, loi, baiDo, tong: { soTep: toanBo.tests.length, soBai, soBoQua, soKichBan: toanBo.e2e.length }, giayE2e };
}

// ─────────────────────────────── dòng lệnh (máy GitHub) ───────────────────────────────

function layCo(argv, ten) {
  const i = argv.indexOf(ten);
  return i === -1 ? undefined : argv[i + 1];
}
const ghi = (tep, obj) => writeFileSync(tep, `${JSON.stringify(obj, null, 1)}\n`);
const REPORTER = pathToFileURL(join(ROOT, "scripts", "dem-bai.mjs")).href;

/** node --test cho danh sách tệp, in kết quả kiểu spec ra màn hình và đếm bài bằng scripts/dem-bai.mjs. */
function chayNodeTest(files, tepDem, them = []) {
  const r = spawnSync(process.execPath, ["--test", ...them, "--test-reporter=spec", "--test-reporter-destination=stdout", `--test-reporter=${REPORTER}`, `--test-reporter-destination=${tepDem}`, ...files], { cwd: ROOT, stdio: "inherit" });
  let dem = null;
  try {
    dem = JSON.parse(readFileSync(tepDem, "utf8"));
  } catch {
    dem = null;
  }
  return { ok: r.status === 0, dem };
}

async function dongLenh(argv) {
  const [lenh, thamSo] = argv;
  const tepKq = layCo(argv, "--ket-qua");
  const toanBo = { tests: danhSachTest(), e2e: ALL };
  const bang = bangChia({ tests: toanBo.tests });
  if (lenh === "ma-tran") {
    const loi = kiemBangChia(bang, toanBo);
    for (const l of loi) console.error(`✘ ${l}`);
    if (loi.length) return 1;
    console.log(`test=${JSON.stringify(bang.test.map((_, i) => i + 1))}`);
    console.log(`e2e=${JSON.stringify(bang.e2e.map((_, i) => i + 1))}`);
    console.error(`Bảng chia: ${toanBo.tests.length} tệp kiểm (${bang.test.map((p) => p.length).join(" + ")} + 1 bài đo giờ), ${ALL.length} kịch bản e2e (${bang.e2e.map((p) => p.length).join(" + ")}).`);
    return 0;
  }
  if (!tepKq && lenh !== undefined) throw new Error("Thiếu --ket-qua <tệp>");
  if (lenh === "rieng") {
    let buoc0;
    try {
      const { ghiTatCa } = await import("./sinh-so-do-trang.mjs");
      const doi = ghiTatCa();
      buoc0 = { ok: doi.length === 0, doi };
    } catch (e) {
      buoc0 = { ok: false, doi: [], loi: e instanceof Error ? e.message : String(e) };
    }
    console.log(`▶ Bước 0: ${buoc0.ok ? "kho trợ lý khớp mã" : `ĐỎ ${buoc0.loi ?? `— tệp sinh đổi: ${buoc0.doi.join(", ")}`}`}`);
    console.log("▶ typecheck");
    const tc = spawnSync("npm", ["run", "typecheck"], { cwd: ROOT, stdio: "inherit" });
    console.log(`▶ bài đo giờ của hook, MỘT MÌNH (${TEP_DO_GIO}, --test-concurrency=1)`);
    const dg = chayNodeTest([TEP_DO_GIO], `${tepKq}.dem`, ["--test-concurrency=1"]);
    const bc = { loai: "rieng", buoc0, typecheck: { ok: tc.status === 0 }, doGio: { ok: dg.ok, tep: [TEP_DO_GIO], dem: dg.dem } };
    ghi(tepKq, bc);
    return bc.buoc0.ok && bc.typecheck.ok && bc.doGio.ok ? 0 : 1;
  }
  if (lenh === "test") {
    const k = Number(thamSo);
    const tep = bang.test[k - 1];
    if (!tep) throw new Error(`Phần npm test phải là 1…${bang.test.length}`);
    console.log(`▶ npm test phần ${k}/${bang.test.length}: ${tep.length} tệp`);
    const r = chayNodeTest(tep, `${tepKq}.dem`);
    ghi(tepKq, { loai: "test", phan: k, tep, ok: r.ok, dem: r.dem, baiDo: r.dem?.baiDo ?? [] });
    return r.ok ? 0 : 1;
  }
  if (lenh === "gom") {
    const thuMuc = thamSo;
    const baoCao = [];
    for (const f of readdirSync(thuMuc, { recursive: true }).map(String).filter((f) => f.endsWith(".json")).sort()) {
      try {
        baoCao.push(JSON.parse(readFileSync(join(thuMuc, f), "utf8")));
      } catch {
        baoCao.push(`không đọc được ${f}`);
      }
    }
    const kq = gomKetQua(bang, baoCao, toanBo);
    ghi(tepKq, { sha: process.env.GITHUB_SHA ?? null, ...kq });
    console.log(`── Gom: ${baoCao.length} báo cáo; ${kq.tong.soTep} tệp kiểm, ${kq.tong.soBai} bài, ${kq.tong.soBoQua} bài bỏ qua, ${kq.tong.soKichBan} kịch bản e2e`);
    for (const l of kq.loi) console.log(`✘ ${l}`);
    console.log(kq.ok ? "✔ KIỂM ĐỦ BỘ: XANH" : `✘ KIỂM ĐỦ BỘ: ĐỎ (${kq.loi.length} lỗi)`);
    console.log(`Giây thật từng kịch bản e2e (chép vào tests/e2e/thoi-gian.json khi cần chia lại):\n${JSON.stringify(kq.giayE2e)}`);
    return kq.ok ? 0 : 1;
  }
  console.error("Dùng: node scripts/kiem-phan.mjs ma-tran | rieng --ket-qua <tệp> | test <k> --ket-qua <tệp> | gom <thư mục> --ket-qua <tệp>");
  return 2;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await dongLenh(process.argv.slice(2));
}
