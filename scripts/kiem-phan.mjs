// Bảng chia phần + máy gom của lượt kiểm đủ bộ trên GitHub (ADR-0179 Đ1.2–Đ1.4). Quy trình: .github/workflows/kiem.yml. Bài: src/kiem-phan.test.ts.
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
//   node scripts/kiem-phan.mjs ma-tran                  → in "test=[1,…]" và "e2e=[1,…]"; bảng chia hỏng ⇒ thoát 1 (để thử ở máy; từ ADR-0215 quy trình
//                                                          không gọi nữa — máy gom kiểm cùng điều đó)
//   node scripts/kiem-phan.mjs rieng --ket-qua <tệp>    → Bước 0 + typecheck + bài đo giờ (--test-concurrency=1)
//   node scripts/kiem-phan.mjs khung <m> --ket-qua <tệp> → mảnh m của lệnh đo khung gốc trên trang thật (do-khung-ci.mjs --manh m/SO_MANH_KHUNG)
//   node scripts/kiem-phan.mjs test <k> --ket-qua <tệp> → phần k của npm test
//   node scripts/kiem-phan.mjs gom <thư mục> --ket-qua <tệp> → gom mọi báo cáo; đỏ ⇒ thoát 1. (Phần e2e: node tests/e2e/run.mjs --phan k --ket-qua <tệp>)
import { spawnSync } from "node:child_process";
import { globSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALL, chiaNhom } from "../tests/e2e/danh-sach.mjs";
import { BANG_CI, chiaManh } from "./giao-dien/do-khung-ci.mjs";
import { docThanTrang, duongCuaTrang } from "../src/shared/khung-goc.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const TEP_DO_GIO = "src/claude-guard-thoi-gian.test.ts";
export const BUOC_RIENG = ["buoc-0", "typecheck", TEP_DO_GIO];
// Lệnh đo khung gốc trên trang thật (ADR-0222 Đ7b; scripts/giao-dien/do-khung-ci.mjs tự dựng D1 tạm + wrangler dev + gieo dữ liệu). Rút lượt kiểm 25/11/2026:
// chia SO_MANH_KHUNG mảnh (chiaManh: cân theo giây đo từng màn ở scripts/giao-dien/thoi-gian-khung.json, tất định), mỗi mảnh một việc GitHub, mỗi máy THE_KHUNG thẻ đo cùng lúc. Phần riêng chạy ĐẦU việc mảnh 1, TRƯỚC khi dựng
// máy thử (bài đo giờ phải chạy một mình). Máy gom: mỗi mảnh đo đúng phần được giao, HỢP các mảnh phủ mọi trang đã khai khuôn. Bước bề rộng: BUOC_KHUNG_CI
// (máy thử tay vẫn bước 20) — xem docs/SO-HANG-RAO.md dòng «Lệnh đo khung gốc».
export const BUOC_KHUNG_CI = 20;
// Lượt 45541773422 (3 mảnh xoay vòng): mảnh đo 119–207 giây + ~55 giây dựng máy thử, mảnh 1 cả việc 4,8 phút ⇒ 4 mảnh cân theo giây.
export const SO_MANH_KHUNG = 4;
// Đo 25/11 trên Mac, mảnh 5 màn (395 ô): 4 thẻ 85 giây, 8 thẻ 46 giây — phần lớn là chờ trang tải, nên thêm thẻ gần như nhân tốc độ.
export const THE_KHUNG = 8;
/** Trần giờ của một mảnh đo (phút): treo thì đỏ sớm, không chờ GitHub huỷ. */
export const HAN_PHUT_KHUNG = 8;
// Thử đầu-cuối: SO_PHAN_E2E phần chạy trên SO_MAY_E2E máy, mỗi máy chạy CÙNG LÚC các phần của mình (phanCuaMay) — mỗi phần vẫn một D1 tạm + một wrangler dev
// + audit cuối phần (ADR-0179 Đ1.2), chỉ khác là hai phần chung một máy 4 lõi.
export const SO_MAY_E2E = 9;
// Việc 2.4 (kế hoạch 2026-11-15): trần cho MỘT TỆP kiểm (`--test-timeout`; chạy mỗi tệp một tiến trình thì trần áp cho cả tệp — đã đo: tệp treo trong bài, tệp
// treo ở cấp tệp và tệp xong bài mà còn giữ bộ hẹn giờ đều bị cắt đúng trần, báo tên tệp). Trước đây một tệp treo làm «npm test phần 2» chờ tới khi GitHub huỷ
// (7 lượt). 10 phút: gấp ~5 lần tệp chậm nhất trong scripts/thoi-gian-test.json (audit-invariants ~127 giây trên GitHub), vẫn đỏ có tên trước khi bị huỷ.
export const TRAN_TEP_MS = 600_000;
export const CO_TRAN_TEP = `--test-timeout=${TRAN_TEP_MS}`;
// Số phần chỉnh theo số đo (ADR-0179 Đ1.2). Lượt đầu 6/11 (4 + 6 phần, chia theo cỡ tệp): 19 phút, phần npm test chậm nhất 17,5 phút ⇒ 10 + 8 phần,
// chia theo giây thật. 16/11 (ADR-0215 Đ1.3, lượt 43819969293): 10 phần npm test chạy bài 54–333 giây (tổng ~1.280), 8 phần e2e 275–413 giây (e2e là
// phần lâu) ⇒ 7 + 12 phần. 25/11 (rút lượt kiểm ≤ 5 phút): D1 tạm dựng bằng lệnh gộp (~25 giây trên GitHub), hai phần e2e mỗi máy, đo khung chia mảnh;
// lượt 45541773422: npm test 8 phần nhưng mỗi phần chỉ ~430 giây tệp (3 tệp cùng lúc) ⇒ 7 phần, nhường một việc cho mảnh đo khung thứ tư ⇒ SO_PHAN_TEST việc npm test +
// SO_MAY_E2E việc e2e (SO_PHAN_E2E phần) + SO_MANH_KHUNG việc đo khung (mảnh 1 gánh cả phần riêng). Mức tối thiểu ADR (≥ 4, ≥ 6) do MIN_* canh. Kho công
// khai: mỗi lượt ≤ 20 việc chạy cùng lúc (bài src/kiem-phan.test.ts khoá). Danh sách việc ghi thẳng ở ma trận của .github/workflows/kiem.yml — đổi số ở đây
// thì đổi cả ở đó.
export const SO_PHAN_TEST = 7;
export const SO_PHAN_E2E = 18;
/** Các phần e2e của máy r (1…SO_MAY_E2E): chia đều theo thứ tự phần, tất định. */
export function phanCuaMay(r, soPhan = SO_PHAN_E2E, soMay = SO_MAY_E2E) {
  if (!Number.isInteger(r) || r < 1 || r > soMay) throw new Error(`Máy e2e phải là số nguyên 1…${soMay} (nhận ${r})`);
  return Array.from({ length: soPhan }, (_, i) => i + 1).filter((k) => (k - 1) % soMay === r - 1);
}
const MIN_PHAN_TEST = 4;
const MIN_PHAN_E2E = 6;

/**
 * Tệp điều khiển việc kiểm (ADR-0179 Đ2.3): nằm trong chính commit được kiểm nên đổi chúng có thể làm lượt kiểm bỏ bài mà vẫn "xanh". day-len so băm git của
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
  // Khung chung của e2e (đăng nhập, tài khoản thử) và cách dựng D1 tạm (một lệnh gộp migration).
  "tests/e2e/lib.mjs",
  "scripts/d1-tam.mjs",
  "scripts/chay-test.mjs",
  "scripts/kiem-phan.mjs",
  "scripts/dem-bai.mjs",
  "tests/e2e/run.mjs",
  "tests/e2e/danh-sach.mjs",
  "tests/e2e/thoi-gian.json",
  "scripts/thoi-gian-test.json",
  "scripts/giao-dien/thoi-gian-khung.json",
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

/** Giây thật từng tệp kiểm (chép từ dòng «Giây thật từng tệp kiểm» của việc gom). Thiếu tệp ⇒ {}. */
function docThoiGianTest() {
  try {
    return JSON.parse(readFileSync(join(ROOT, "scripts", "thoi-gian-test.json"), "utf8"));
  } catch {
    return {};
  }
}
/** Trọng số chia phần: giây thật nếu có; tệp chưa có số (tệp mới) thì cỡ tệp × (trung vị giây/byte của các tệp đã đo). Tất định. */
function trongSoTest(tests, kichThuoc, tg) {
  const tiLe = tests.filter((t) => typeof tg[t] === "number" && kichThuoc(t) > 0).map((t) => tg[t] / kichThuoc(t)).sort((a, b) => a - b);
  const heSo = tiLe.length ? tiLe[Math.floor(tiLe.length / 2)] : 1;
  return (t) => (typeof tg[t] === "number" ? tg[t] : kichThuoc(t) * heSo);
}

/**
 * Bảng chia: { rieng, test: [[tệp…]…], e2e: [[kịch bản…]…], khung: [[khoá màn…]…] }. Mỗi phần e2e là DÃY CON của ALL (chiaNhom giữ thứ tự ràng buộc); mảnh đo
 * khung theo chiaManh của do-khung-ci.mjs trên BANG_CI.
 */
export function bangChia({ tests = danhSachTest(), e2e = ALL, soPhanTest = SO_PHAN_TEST, soPhanE2e = SO_PHAN_E2E, kichThuoc = coTep(ROOT), thoiGianTest = docThoiGianTest(), manKhung = BANG_CI, soManhKhung = SO_MANH_KHUNG } = {}) {
  return {
    rieng: [...BUOC_RIENG],
    test: chiaTheoCo(tests.filter((t) => t !== TEP_DO_GIO), soPhanTest, trongSoTest(tests, kichThuoc, thoiGianTest)),
    e2e: chiaNhom(e2e, soPhanE2e),
    khung: chiaManh(manKhung, soManhKhung),
  };
}

/** Lỗi của một bảng chia so với toàn bộ (rỗng = đạt). */
export function kiemBangChia(bang, { tests, e2e, manKhung = BANG_CI }) {
  const loi = [];
  for (const b of BUOC_RIENG) if (!bang.rieng?.includes(b)) loi.push(`phần riêng thiếu bước ${b}`);
  if (!tests.includes(TEP_DO_GIO)) loi.push(`không thấy bài đo giờ ${TEP_DO_GIO} trong glob src/**/*.test.ts`);
  if ((bang.test?.length ?? 0) < MIN_PHAN_TEST) loi.push(`phần npm test: cần ít nhất ${MIN_PHAN_TEST} phần, có ${bang.test?.length ?? 0}`);
  if ((bang.e2e?.length ?? 0) < MIN_PHAN_E2E) loi.push(`phần e2e: cần ít nhất ${MIN_PHAN_E2E} phần, có ${bang.e2e?.length ?? 0}`);
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
  if (!(bang.khung?.length >= 1)) loi.push("đo khung gốc: không có mảnh nào");
  soi("đo khung gốc", bang.khung ?? [], manKhung.map((d) => d.khoa));
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
  const giayKhung = {};
  const giayTep = {};
  const giayTuong = {};
  const chep = (dich) => (m) => {
    if (m && typeof m === "object") for (const [k, v] of Object.entries(m)) if (typeof v === "number") dich[k] = v;
  };
  const congGiay = chep(giayTep);
  const congTuong = chep(giayTuong);
  let soBai = 0;
  let soBoQua = 0;
  const hop = (x) => x && typeof x === "object" && ["rieng", "test", "e2e", "khung"].includes(x.loai);
  if (baoCao.some((x) => !hop(x))) loi.push("có báo cáo không đọc được (không phải JSON đúng dạng)");
  const cua = (loai) => baoCao.filter((x) => hop(x) && x.loai === loai);

  const rieng = cua("rieng");
  if (rieng.length !== 1) loi.push(rieng.length ? "phần riêng có hai báo cáo (trùng)" : "thiếu báo cáo phần riêng (Bước 0, typecheck, bài đo giờ)");
  const r = rieng[0];
  if (r) {
    if (r.buoc0?.ok !== true) loi.push(`Bước 0 (sinh lại kho trợ lý) đỏ${r.buoc0?.doi?.length ? `: tệp sinh đổi ${r.buoc0.doi.join(", ")} — commit các tệp này` : ""}`);
    if (r.typecheck?.ok !== true) loi.push("typecheck đỏ");
    if (r.doGio?.ok !== true || !giongNhau(r.doGio?.tep, [TEP_DO_GIO]) || !laDem(r.doGio?.dem)) loi.push(`bài đo giờ của hook (${TEP_DO_GIO}) đỏ hoặc không báo số bài`);
    congGiay(r.doGio?.giayTep);
    if (laDem(r.doGio?.dem)) {
      soBai += r.doGio.dem.tests;
      soBoQua += r.doGio.dem.skipped + r.doGio.dem.todo;
    }
    if (r.typecheck?.ok !== true) baiDo.push("typecheck");
    if (r.buoc0?.ok !== true) baiDo.push("Bước 0 (kho trợ lý)");
    if (r.doGio?.ok !== true) baiDo.push(TEP_DO_GIO);
  }

  // Đo khung gốc (ADR-0222 Đ7b), chia mảnh: mỗi mảnh đúng MỘT báo cáo, XANH chỉ khi mã thoát 0, đo ít nhất một ô, và đo ĐÚNG các màn bảng chia giao cho nó;
  // rồi HỢP các trang đã đo phải phủ mọi trang đã khai khuôn của chính commit này (`toanBo.daChuyen`) — mảnh không tự phán «đo thiếu» được. Mã 2 là ĐỎ.
  const khung = cua("khung");
  const trangDaDo = new Set();
  (bang.khung ?? []).forEach((giao, i) => {
    const m = i + 1;
    const cuaM = khung.filter((x) => x.manh === m);
    if (cuaM.length !== 1) {
      loi.push(cuaM.length ? `đo khung gốc mảnh ${m} có hai báo cáo (trùng)` : `thiếu báo cáo đo khung gốc mảnh ${m}`);
      baiDo.push(`đo khung gốc mảnh ${m}`);
      return;
    }
    const k = cuaM[0];
    const dungPhan = Array.isArray(k.khoa) && giongNhau([...k.khoa].sort(), [...giao].sort()) && k.soManh === bang.khung.length;
    const ok = k.ok === true && k.maThoat === 0 && Number.isInteger(k.soO) && k.soO > 0 && dungPhan;
    if (Array.isArray(k.trang)) for (const t of k.trang) trangDaDo.add(t);
    if (!ok) {
      loi.push(`đo khung gốc trên trang thật đỏ (mảnh ${m}): ${!dungPhan && k.maThoat === 0 ? "đo khác phần được giao" : k.loi ?? (k.maThoat === 0 ? "không đo ô nào" : `mã thoát ${k.maThoat}`)}`);
      baiDo.push(`đo khung gốc mảnh ${m} (scripts/giao-dien/do-khung-ci.mjs)${k.loi ? `: ${k.loi}` : ""}`);
    }
  });
  for (const x of khung) if (!(Number.isInteger(x.manh) && x.manh >= 1 && x.manh <= (bang.khung?.length ?? 0))) loi.push(`đo khung gốc: báo cáo mảnh lạ (${x.manh})`);
  const doThieu = (toanBo.daChuyen ?? []).filter((t) => !trangDaDo.has(t));
  if (!Array.isArray(toanBo.daChuyen) || !toanBo.daChuyen.length) loi.push("đo khung gốc: không đọc được danh sách trang đã khai khuôn");
  else if (doThieu.length) {
    loi.push(`đo khung gốc trên trang thật đỏ: đo thiếu ${doThieu.join(", ")}`);
    baiDo.push(`đo khung gốc: đo thiếu ${doThieu.join(", ")}`);
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
    congGiay(x.giayTep);
    congTuong(x.giayTuong);
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

  for (const k of khung) for (const [man, g] of Object.entries(k?.giayMan ?? {})) if (typeof g === "number") giayKhung[man] = g;
  return { ok: loi.length === 0, loi, baiDo, tong: { soTep: toanBo.tests.length, soBai, soBoQua, soKichBan: toanBo.e2e.length }, giayE2e, giayKhung, giayTep, giayTuong };
}

/** Đường dẫn mọi trang đã khai khuôn khung gốc (`data-khung-goc`) của commit đang có — cùng cách do-khung-ci.mjs tính, để máy gom kiểm hợp các mảnh đo. */
export function trangDaKhaiKhuon(root = ROOT) {
  const thu = join(root, "public");
  return readdirSync(thu).filter((t) => t.endsWith(".html")).filter((t) => docThanTrang(readFileSync(join(thu, t), "utf8")).khuon !== null).map(duongCuaTrang).sort();
}

/** Tệp mà đồng hồ tường hơn tổng giây các bài từ 15 giây (tiến trình con treo sau bài cuối), nặng nhất trước — in ở bước gom để biết tệp nào làm chậm phần. */
export function tepChoLau(kq, nguong = 15) {
  return Object.entries(kq.giayTuong ?? {})
    .map(([tep, giayTuong]) => ({ tep, giayTuong, giayBai: kq.giayTep?.[tep] ?? 0 }))
    .filter((x) => x.giayTuong - x.giayBai >= nguong)
    .sort((a, b) => b.giayTuong - b.giayBai - (a.giayTuong - a.giayBai));
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
  const r = spawnSync(process.execPath, ["--test", CO_TRAN_TEP, ...them, "--test-reporter=spec", "--test-reporter-destination=stdout", `--test-reporter=${REPORTER}`, `--test-reporter-destination=${tepDem}`, ...files], { cwd: ROOT, stdio: "inherit" });
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
  const toanBo = { tests: danhSachTest(), e2e: ALL, daChuyen: trangDaKhaiKhuon() };
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
    const bc = { loai: "rieng", buoc0, typecheck: { ok: tc.status === 0 }, doGio: { ok: dg.ok, tep: [TEP_DO_GIO], dem: dg.dem, giayTep: dg.dem?.giayTep ?? {} } };
    ghi(tepKq, bc);
    return bc.buoc0.ok && bc.typecheck.ok && bc.doGio.ok ? 0 : 1;
  }
  if (lenh === "khung") {
    const m = Number(thamSo);
    if (!bang.khung[m - 1]) throw new Error(`Mảnh đo khung phải là 1…${bang.khung.length}`);
    console.log(`▶ đo khung gốc trên trang thật, mảnh ${m}/${bang.khung.length}: ${bang.khung[m - 1].join(", ")} (bước ${BUOC_KHUNG_CI}, ${THE_KHUNG} thẻ cùng lúc)`);
    const tepKhung = `${tepKq}.khung`;
    const dk = spawnSync(process.execPath, ["scripts/giao-dien/do-khung-ci.mjs", "--manh", `${m}/${bang.khung.length}`, "--song-song", String(THE_KHUNG), "--han-phut", String(HAN_PHUT_KHUNG), "--buoc", String(BUOC_KHUNG_CI), "--ket-qua", tepKhung], { cwd: ROOT, stdio: "inherit" });
    let doKhung;
    try {
      doKhung = JSON.parse(readFileSync(tepKhung, "utf8"));
    } catch {
      doKhung = { ok: false, maThoat: dk.status ?? 2, loi: "lệnh đo không ghi kết quả" };
    }
    if (dk.status !== 0) doKhung.ok = false;
    const bc = { ...doKhung, loai: "khung", manh: m };
    ghi(tepKq, bc);
    return bc.ok ? 0 : 1;
  }
  if (lenh === "test") {
    const k = Number(thamSo);
    const tep = bang.test[k - 1];
    if (!tep) throw new Error(`Phần npm test phải là 1…${bang.test.length}`);
    console.log(`▶ npm test phần ${k}/${bang.test.length}: ${tep.length} tệp`);
    const r = chayNodeTest(tep, `${tepKq}.dem`);
    ghi(tepKq, { loai: "test", phan: k, tep, ok: r.ok, dem: r.dem, baiDo: r.dem?.baiDo ?? [], giayTep: r.dem?.giayTep ?? {}, giayTuong: r.dem?.giayTuong ?? {} });
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
    console.log(`Giây đo từng màn khung gốc (chép vào scripts/giao-dien/thoi-gian-khung.json khi cần chia lại):\n${JSON.stringify(kq.giayKhung)}`);
    const choLau = tepChoLau(kq);
    if (choLau.length) console.log(`Tệp chờ lâu (đồng hồ tường hơn giây các bài ≥ 15 giây):\n${choLau.map((x) => `  ${x.tep}: ${x.giayTuong} giây tường, ${x.giayBai} giây bài`).join("\n")}`);
    console.log(`Giây thật từng tệp kiểm (chép vào scripts/thoi-gian-test.json khi cần chia lại): có trong tệp ket-qua-tong, khoá giayTuong — đồng hồ tường cả tệp, gồm việc làm ngoài bài (${Object.keys(kq.giayTuong).length} tệp).`);
    return kq.ok ? 0 : 1;
  }
  console.error("Dùng: node scripts/kiem-phan.mjs ma-tran | rieng --ket-qua <tệp> | khung <m> --ket-qua <tệp> | test <k> --ket-qua <tệp> | gom <thư mục> --ket-qua <tệp>");
  return 2;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = await dongLenh(process.argv.slice(2));
}
