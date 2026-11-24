// Lệnh đo KHUNG GỐC tự gieo dữ liệu (ADR-0222 Đ7b) — bản dùng trong lượt kiểm GitHub (phần riêng của scripts/kiem-phan.mjs) và chạy được y hệt trên máy:
//   node scripts/giao-dien/do-khung-ci.mjs [--buoc 20] [--ket-qua <tệp.json>]      (chạy từ GỐC kho)
// Khác `npm run do-khung` (máy thử có sẵn kho dữ liệu giả + tệp tài khoản ngoài kho): lệnh này tự dựng D1 tạm + `wrangler dev` (moi-truong.mjs), tạo tài khoản thử,
// gieo đơn, xe, địa điểm qua API thật, SINH bảng màn từ dữ liệu vừa gieo, rồi gọi NGUYÊN lệnh đo `do-khung-goc.mjs` (tám điều đo giữ nguyên, không chép lại).
// Mỗi trang khai `data-khung-goc` phải có một dòng trong BANG_CI dưới đây; thiếu dòng ⇒ lệnh đo báo ĐO THIẾU (mã 2) ⇒ lượt kiểm đỏ. Chuyển thêm một màn sang
// khung gốc thì thêm dòng ở đây (và gieo dữ liệu nếu trang cần mã bản ghi).
// Mã thoát (giữ nguyên của do-khung-goc.mjs): 0 = mọi ô đạt và không đo thiếu; 1 = có ô không đạt; 2 = không chạy được hoặc ĐO THIẾU.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { docThanTrang, duongCuaTrang } from "../../src/shared/khung-goc.ts";
import { trangDoThieu } from "./cham-khung-goc.mjs";

/**
 * Bảng màn của lượt kiểm: đường dẫn trang (không kèm ?id) → bộ quyền đăng nhập + loại mã bản ghi cần gắn (nếu trang cần).
 * `ma`: "don" = đơn đã xác nhận do Bán hàng lập; "nhap" = đơn nháp do Bán hàng lập; "xe" = xe do Quản trị thêm. Khoá `khoa` trùng bảng màn của máy thử (docs/evidence/2026-11-21-khung-goc-thi-cong/bang-man.json).
 * `sauGieo`: màn đo ở lượt THỨ HAI, sau khi gieo dữ liệu riêng của nó (đơn đang chờ xác nhận) — để dữ liệu đó không lọt vào màn khác lúc đo (đơn chờ hiện cả ở Đơn hàng của
 * Bán hàng, làm phép đo chữ đậm của màn đó đổi theo dữ liệu, khung gốc đợt A 24/11/2026). Hai lượt gộp lại vẫn phải phủ mọi trang đã khai khuôn.
 */
export const BANG_CI = [
  { khoa: "don-hang", trang: "/orders", bo: "SALES" },
  { khoa: "chi-tiet-don", trang: "/order", bo: "SALES", ma: "don" },
  { khoa: "sua-xe", trang: "/xe-sua", bo: "ADMIN", ma: "xe" },
  { khoa: "dia-diem", trang: "/locations", bo: "ADMIN" },
  { khoa: "tao-don", trang: "/order-form", bo: "SALES" },
  { khoa: "sua-don", trang: "/order-form", bo: "SALES", ma: "nhap" },
  { khoa: "tao-don-doi-tac", trang: "/order-form", bo: "PARTNER" },
  { khoa: "cho-xac-nhan", trang: "/cho-xac-nhan", bo: "ADMIN", sauGieo: true },
];
/** Bộ quyền chỉ dùng để GIEO (không có màn đo): Toàn quyền đánh cờ «cần xác nhận» cho một dịch vụ giả. */
const BO_GIEO = ["SUPER_ADMIN"];

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

/** Chia bảng màn (đã gắn mã) thành hai lượt theo cờ `sauGieo` của BANG_CI; lượt rỗng thì bỏ. */
export function chiaLuot(bangMan, bang = BANG_CI) {
  const sau = new Set(bang.filter((d) => d.sauGieo).map((d) => d.khoa));
  return [{ sauGieo: false, bang: bangMan.filter((m) => !sau.has(m.khoa)) }, { sauGieo: true, bang: bangMan.filter((m) => sau.has(m.khoa)) }].filter((l) => l.bang.length);
}

/**
 * Gộp kết quả các lượt đo: `luot` = [{ ketQua: mảng ô đo của do-khung-goc.json, hoặc null khi lượt đó không chạy được }]; `daChuyen` = đường dẫn mọi trang đã khai khuôn.
 * Đo thiếu tính trên các trang ĐÃ ĐO THẬT của mọi lượt (không tin bảng màn). Mã thoát: 2 = có lượt không chạy được hoặc đo thiếu; 1 = có ô không đạt; 0 = đạt.
 */
export function gopLuot(luot, daChuyen) {
  const chayDuoc = luot.length > 0 && luot.every((l) => Array.isArray(l.ketQua));
  const ketQua = luot.flatMap((l) => l.ketQua ?? []);
  const doThieu = trangDoThieu(daChuyen, [...new Set(ketQua.map((x) => x.trang))].map((trang) => ({ trang })));
  const khongDat = ketQua.filter((x) => x.loi?.length).length;
  const maThoat = !chayDuoc ? 2 : khongDat ? 1 : doThieu.length ? 2 : 0;
  return { maThoat, soO: ketQua.length, khongDat, doThieu, chayDuoc };
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
    const cacBo = [...new Set([...BANG_CI.map((d) => d.bo), ...BO_GIEO])];
    moi = await dungMoiTruong({ bo: cacBo, hanPhut: 25 });
    console.log(`▶ Máy thử tạm: ${moi.base}; tài khoản: ${moi.boChayDuoc.join(", ")}; lỗi gieo đơn: ${moi.loiGieo.length}`);
    for (const l of moi.loiGieo) console.log(`  ✗ gieo ${l.viec}: ${l.status ?? ""} ${l.loi}`);

    // ---- gieo thêm: một xe, một địa điểm (Quản trị) qua API thật
    const L = await import(pathToFileURL(join(process.cwd(), "tests", "e2e", "lib.mjs")).href);
    const ma = { don: moi.id.donDaXacNhan[0] ?? null, nhap: moi.id.donNhap[0] ?? null, xe: null };
    if (moi.taiKhoan.ADMIN) {
      const ck = await L.session(moi.taiKhoan.ADMIN);
      const xe = await L.call(ck, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-123.45", chassisNumber: "KHUNGDOCI0001", name: "Xe đo khung", passengerCapacity: 16 });
      if (xe.status === 201) ma.xe = xe.body.vehicle.id;
      else console.log(`  ✗ gieo xe: ${xe.status} ${JSON.stringify(xe.body?.error ?? xe.body).slice(0, 300)}`);
      const dd = await L.call(ck, "POST", "/api/locations", { code: "KS_DO_KHUNG", name: "Khách sạn đo khung", locationTypeCode: "HOTEL", address: "12 Trần Phú, Nha Trang", sortOrder: 95 });
      if (dd.status !== 201) console.log(`  ✗ gieo địa điểm: ${dd.status} ${JSON.stringify(dd.body?.error ?? dd.body).slice(0, 300)}`);
    }
    // ---- gieo thêm (lượt hai): một đơn ĐANG CHỜ XÁC NHẬN (khung gốc đợt A), để màn «Đơn chờ xác nhận» được đo khi có danh sách, như người dùng thật thấy. Gieo hỏng thì trang
    // rỗng và phép đo chữ đậm báo vượt trần (không bao giờ đạt giả). Cùng cách kịch bản tests/e2e/gui-don.mjs: dịch vụ giả riêng, Toàn quyền đánh cờ, Bán hàng lập rồi gửi.
    const gieoDonCho = async () => {
      if (!moi.taiKhoan.SALES || !moi.taiKhoan.SUPER_ADMIN) { console.log("  ✗ gieo đơn chờ xác nhận: thiếu tài khoản Bán hàng hoặc Toàn quyền"); return; }
      try {
        const AT = "'2026-01-01T00:00:00.000Z'";
        await L.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('ZDK1','Dịch vụ đo khung cần xác nhận','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT}) ON CONFLICT(code) DO UPDATE SET in_sheet = 1`);
        const sup = await L.session(moi.taiKhoan.SUPER_ADMIN);
        const co = await L.call(sup, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "ZDK1", canXacNhan: true });
        const ban = await L.session(moi.taiKhoan.SALES);
        const o = co.status === 200 ? await L.call(ban, "POST", "/api/orders", L.orderInput({ customerName: "Khách Chờ Xác Nhận", customerPhone: "0905 678 901", services: [L.catalogService({ catalogCode: "ZDK1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: L.vnDate(3) })] })) : co;
        const gui = o.status === 201 ? await L.call(ban, "POST", `/api/orders/${o.body.order.id}/gui-xac-nhan`, {}) : o;
        if (gui.status !== 201) console.log(`  ✗ gieo đơn chờ xác nhận: ${gui.status} ${JSON.stringify(gui.body?.error ?? gui.body).slice(0, 300)}`);
      } catch (e) { console.log(`  ✗ gieo đơn chờ xác nhận: ${String(e?.message ?? e).slice(0, 300)}`); }
    };
    const { bangMan, bo } = dungBangMan(BANG_CI, ma);
    for (const b of bo) console.log(`  ✗ bỏ khỏi bảng màn: ${b}`);

    const tepTk = join(tam, "tai-khoan.json");
    writeFileSync(tepTk, JSON.stringify({ taiKhoan: Object.entries(moi.taiKhoan).map(([khoa, t]) => ({ khoa, sdt: t.phone, pin: t.pin })) }));
    const cacLuot = chiaLuot(bangMan);
    const kqLuot = [];
    for (const [i, l] of cacLuot.entries()) {
      if (l.sauGieo) await gieoDonCho();
      const tepBang = join(tam, `bang-man-${i + 1}.json`);
      writeFileSync(tepBang, JSON.stringify(l.bang));
      const ra = join(tam, `so-do-${i + 1}`);
      console.log(`▶ Lượt ${i + 1}/${cacLuot.length}${l.sauGieo ? " (sau khi gieo đơn chờ xác nhận)" : ""}: đo ${l.bang.length} màn, bề rộng 360–1.920 bước ${buoc}`);
      // Mỗi lượt chỉ là một phần bảng màn nên do-khung-goc tự báo «đo thiếu» (mã 2): mã thoát từng lượt KHÔNG dùng; kết luận đọc từ tệp số đo của mọi lượt (gopLuot).
      spawnSync(process.execPath, ["scripts/giao-dien/do-khung-goc.mjs", "--base", moi.base, "--tk", tepTk, "--bang", tepBang, "--ra", ra, "--buoc", String(buoc)], { stdio: "inherit" });
      const tepSo = join(ra, "do-khung-goc.json");
      kqLuot.push({ ketQua: existsSync(tepSo) ? JSON.parse(readFileSync(tepSo, "utf8")).ketQua : null });
    }
    const daChuyen = readdirSync("public").filter((t) => t.endsWith(".html")).filter((t) => docThanTrang(readFileSync(join("public", t), "utf8")).khuon !== null).map(duongCuaTrang);
    const { maThoat, soO, khongDat, doThieu } = gopLuot(kqLuot, daChuyen);
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
