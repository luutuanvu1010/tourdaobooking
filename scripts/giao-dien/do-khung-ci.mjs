// Lệnh đo KHUNG GỐC tự gieo dữ liệu (ADR-0222 Đ7b) — bản dùng trong lượt kiểm GitHub (phần riêng của scripts/kiem-phan.mjs) và chạy được y hệt trên máy:
//   node scripts/giao-dien/do-khung-ci.mjs [--buoc 20] [--ket-qua <tệp.json>]      (chạy từ GỐC kho)
// Khác `npm run do-khung` (máy thử có sẵn kho dữ liệu giả + tệp tài khoản ngoài kho): lệnh này tự dựng D1 tạm + `wrangler dev` (moi-truong.mjs), tạo tài khoản thử,
// gieo đơn, xe, địa điểm qua API thật, SINH bảng màn từ dữ liệu vừa gieo, rồi gọi NGUYÊN lệnh đo `do-khung-goc.mjs` (tám điều đo giữ nguyên, không chép lại).
// Mỗi trang khai `data-khung-goc` phải có một dòng trong BANG_CI dưới đây; thiếu dòng ⇒ lệnh đo báo ĐO THIẾU (mã 2) ⇒ lượt kiểm đỏ. Chuyển thêm một màn sang
// khung gốc thì thêm dòng ở đây (và gieo dữ liệu nếu trang cần mã bản ghi).
// Mã thoát (giữ nguyên của do-khung-goc.mjs): 0 = mọi ô đạt và không đo thiếu; 1 = có ô không đạt; 2 = không chạy được hoặc ĐO THIẾU.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Bảng màn của lượt kiểm: đường dẫn trang (không kèm ?id) → bộ quyền đăng nhập + loại mã bản ghi cần gắn (nếu trang cần).
 * `ma`: "don" = đơn đã xác nhận do Bán hàng lập; "xe" = xe do Quản trị thêm. Khoá `khoa` trùng bảng màn của máy thử (docs/evidence/2026-11-21-khung-goc-thi-cong/bang-man.json).
 */
export const BANG_CI = [
  { khoa: "don-hang", trang: "/orders", bo: "SALES" },
  { khoa: "chi-tiet-don", trang: "/order", bo: "SALES", ma: "don" },
  { khoa: "sua-xe", trang: "/xe-sua", bo: "ADMIN", ma: "xe" },
  { khoa: "dia-diem", trang: "/locations", bo: "ADMIN" },
];

/** Dựng bảng màn [{ khoa, tk, trang }] từ BANG_CI và mã vừa gieo. Dòng cần mã mà gieo hỏng thì BỎ (lệnh đo sẽ báo đo thiếu trang đó — không bao giờ đạt giả). */
export function dungBangMan(bang, ma) {
  const ra = [];
  const bo = [];
  for (const d of bang) {
    if (d.ma && !ma[d.ma]) { bo.push(`${d.trang} (thiếu mã ${d.ma})`); continue; }
    ra.push({ khoa: d.khoa, tk: d.bo, trang: d.ma ? `${d.trang}?id=${encodeURIComponent(ma[d.ma])}` : d.trang });
  }
  return { bangMan: ra, bo };
}

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

async function chay() {
  const buoc = Number(lay("--buoc", "20"));
  const tepKq = lay("--ket-qua");
  const bat = Date.now();
  const ghi = (bc) => { if (tepKq) writeFileSync(tepKq, `${JSON.stringify(bc, null, 1)}\n`); };
  const tam = mkdtempSync(join(tmpdir(), "tourdao-do-khung-ci-"));
  let moi = null;
  let ketLuan = { ok: false, maThoat: 2, buoc, loi: null };
  try {
    const { dungMoiTruong } = await import("./moi-truong.mjs");
    const cacBo = [...new Set(BANG_CI.map((d) => d.bo))];
    moi = await dungMoiTruong({ bo: cacBo, hanPhut: 25 });
    console.log(`▶ Máy thử tạm: ${moi.base}; tài khoản: ${moi.boChayDuoc.join(", ")}; lỗi gieo đơn: ${moi.loiGieo.length}`);
    for (const l of moi.loiGieo) console.log(`  ✗ gieo ${l.viec}: ${l.status ?? ""} ${l.loi}`);

    // ---- gieo thêm: một xe, một địa điểm (Quản trị) qua API thật
    const L = await import(pathToFileURL(join(process.cwd(), "tests", "e2e", "lib.mjs")).href);
    const ma = { don: moi.id.donDaXacNhan[0] ?? null, xe: null };
    if (moi.taiKhoan.ADMIN) {
      const ck = await L.session(moi.taiKhoan.ADMIN);
      const xe = await L.call(ck, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-123.45", chassisNumber: "KHUNGDOCI0001", name: "Xe đo khung", passengerCapacity: 16 });
      if (xe.status === 201) ma.xe = xe.body.vehicle.id;
      else console.log(`  ✗ gieo xe: ${xe.status} ${JSON.stringify(xe.body?.error ?? xe.body).slice(0, 300)}`);
      const dd = await L.call(ck, "POST", "/api/locations", { code: "KS_DO_KHUNG", name: "Khách sạn đo khung", locationTypeCode: "HOTEL", address: "12 Trần Phú, Nha Trang", sortOrder: 95 });
      if (dd.status !== 201) console.log(`  ✗ gieo địa điểm: ${dd.status} ${JSON.stringify(dd.body?.error ?? dd.body).slice(0, 300)}`);
    }
    const { bangMan, bo } = dungBangMan(BANG_CI, ma);
    for (const b of bo) console.log(`  ✗ bỏ khỏi bảng màn: ${b}`);

    const tepTk = join(tam, "tai-khoan.json");
    const tepBang = join(tam, "bang-man.json");
    writeFileSync(tepTk, JSON.stringify({ taiKhoan: Object.entries(moi.taiKhoan).map(([khoa, t]) => ({ khoa, sdt: t.phone, pin: t.pin })) }));
    writeFileSync(tepBang, JSON.stringify(bangMan));
    const ra = join(tam, "so-do");
    console.log(`▶ Đo ${bangMan.length} màn, bề rộng 360–1.920 bước ${buoc}`);
    const r = spawnSync(process.execPath, ["scripts/giao-dien/do-khung-goc.mjs", "--base", moi.base, "--tk", tepTk, "--bang", tepBang, "--ra", ra, "--buoc", String(buoc)], { stdio: "inherit" });
    const maThoat = r.status ?? 2;
    let soO = 0, khongDat = 0, doThieu = [];
    const tepSo = join(ra, "do-khung-goc.json");
    if (existsSync(tepSo)) {
      const so = JSON.parse(readFileSync(tepSo, "utf8"));
      soO = so.ketQua.length;
      khongDat = so.ketQua.filter((x) => x.loi.length).length;
      doThieu = so.doThieu;
    }
    ketLuan = { ok: maThoat === 0, maThoat, buoc, soMan: bangMan.length, soO, khongDat, doThieu, loi: maThoat === 0 ? null : maThoat === 1 ? `${khongDat} ô không đạt` : doThieu.length ? `đo thiếu: ${doThieu.join(", ")}` : "lệnh đo không chạy được" };
  } catch (e) {
    ketLuan = { ok: false, maThoat: 2, buoc, loi: String(e?.message ?? e).slice(0, 600) };
    console.error(`✗ Không chạy được: ${ketLuan.loi}`);
  } finally {
    await moi?.dung();
    try { rmSync(tam, { recursive: true, force: true }); } catch { /* bỏ */ }
  }
  ketLuan.giay = Math.round((Date.now() - bat) / 1000);
  ghi(ketLuan);
  console.log(`${ketLuan.ok ? "✔" : "✘"} Đo khung gốc: ${ketLuan.ok ? "đạt" : ketLuan.loi} (${ketLuan.giay} giây)`);
  return ketLuan.maThoat;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(await chay());
