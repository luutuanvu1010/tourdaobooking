// Lệnh đo KHUNG GỐC tự gieo dữ liệu (ADR-0222 Đ7b) — bản dùng trong lượt kiểm GitHub (phần riêng của scripts/kiem-phan.mjs) và chạy được y hệt trên máy:
//   node scripts/giao-dien/do-khung-ci.mjs [--buoc 20] [--manh k/K] [--song-song N] [--han-phut P] [--ket-qua <tệp.json>]      (chạy từ GỐC kho)
// `--manh k/K` (rút lượt kiểm 25/11/2026): chỉ đo MẢNH k trong K mảnh của BANG_CI (chiaManh, tất định); mỗi mảnh một máy GitHub, tự dựng máy thử và gieo dữ liệu
// như nhau. Mảnh KHÔNG tự phán «đo thiếu» trên cả trang web: nó báo danh sách màn đã đo, máy gom (scripts/kiem-phan.mjs gom) kiểm mảnh đo đúng phần được giao
// và HỢP mọi mảnh phủ mọi trang đã khai khuôn. `--song-song N`: N thẻ đo cùng lúc (do-khung-goc.mjs).
// Khác `npm run do-khung` (máy thử có sẵn kho dữ liệu giả + tệp tài khoản ngoài kho): lệnh này tự dựng D1 tạm + `wrangler dev` (moi-truong.mjs), tạo tài khoản thử,
// gieo đơn, xe, địa điểm qua API thật, SINH bảng màn từ dữ liệu vừa gieo, rồi gọi NGUYÊN lệnh đo `do-khung-goc.mjs` (tám điều đo giữ nguyên, không chép lại).
// Mỗi trang khai `data-khung-goc` phải có một dòng trong BANG_CI dưới đây; thiếu dòng ⇒ lệnh đo báo ĐO THIẾU (mã 2) ⇒ lượt kiểm đỏ. Chuyển thêm một màn sang
// khung gốc thì thêm dòng ở đây (và gieo dữ liệu nếu trang cần mã bản ghi).
// Mã thoát (giữ nguyên của do-khung-goc.mjs): 0 = mọi ô đạt và không đo thiếu; 1 = có ô không đạt; 2 = không chạy được hoặc ĐO THIẾU.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { docThanTrang, duongCuaTrang } from "../../src/shared/khung-goc.ts";
import { trangDoThieu } from "./cham-khung-goc.mjs";

/**
 * Bảng màn của lượt kiểm: đường dẫn trang (không kèm ?id) → bộ quyền đăng nhập + loại mã bản ghi cần gắn (nếu trang cần).
 * `ma`: "don" = đơn đã xác nhận do Bán hàng lập; "nhap" = đơn nháp do Bán hàng lập; "xe" = xe do Quản trị thêm; "chuyen" = chuyến ngày mai của xe đó, tài xế là tài khoản Tài xế công ty thử. Khoá `khoa` trùng bảng màn của máy thử (docs/evidence/2026-11-21-khung-goc-thi-cong/bang-man.json).
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
  // Đợt B (24/11/2026): 15 trang Tài xế – Vận chuyển. «chuyen» = chuyến ngày mai do Quản trị tạo, xếp tài xế công ty thử (gieo ở dưới).
  { khoa: "tai-xe", trang: "/tai-xe", bo: "DRIVER" },
  { khoa: "cuoc", trang: "/cuoc", bo: "DRIVER" },
  { khoa: "cuoc-chuyen", trang: "/cuoc-chuyen", bo: "DRIVER", ma: "chuyen" },
  { khoa: "ban", trang: "/ban", bo: "DRIVER_PARTNER" },
  { khoa: "dieu-phoi", trang: "/dieu-phoi", bo: "ADMIN" },
  { khoa: "xe-dang-chay", trang: "/xe-dang-chay", bo: "ADMIN" },
  { khoa: "chuyen", trang: "/chuyen", bo: "ADMIN", ma: "chuyen" },
  { khoa: "chuyen-sua", trang: "/chuyen-sua", bo: "ADMIN", ma: "chuyen" },
  { khoa: "de-nghi", trang: "/de-nghi", bo: "ADMIN" },
  { khoa: "xe", trang: "/xe", bo: "ADMIN" },
  { khoa: "xe-chi-tiet", trang: "/xe-chi-tiet", bo: "ADMIN", ma: "xe" },
  { khoa: "lich-xe-ban", trang: "/lich-xe-ban", bo: "ADMIN" },
  { khoa: "giay-to-sap-het-han", trang: "/giay-to-sap-het-han", bo: "ADMIN" },
  { khoa: "bang-gia-xe", trang: "/bang-gia-xe", bo: "ACCOUNTING" },
  { khoa: "bang-ke-xe", trang: "/bang-ke-xe", bo: "ACCOUNTING" },
  // Đợt C (25/11/2026): 10 trang Tiền. Dữ liệu tiền tối thiểu (hai cấp đại lý có mức, cấp riêng và hạn mức Trả sau cho đối tác thử, giảm phí đưa đón) gieo ở dưới.
  { khoa: "so-cong-no", trang: "/so-cong-no", bo: "ACCOUNTING" },
  { khoa: "phan-dinh", trang: "/phan-dinh", bo: "ACCOUNTING" },
  { khoa: "khoa-thang", trang: "/khoa-thang", bo: "ACCOUNTING" },
  { khoa: "dieu-chinh-cong-no", trang: "/dieu-chinh-cong-no", bo: "ACCOUNTING" },
  { khoa: "chup-bu", trang: "/chup-bu", bo: "ACCOUNTING" },
  { khoa: "hoa-hong", trang: "/hoa-hong", bo: "ACCOUNTING" },
  { khoa: "cap-dai-ly", trang: "/cap-dai-ly", bo: "ACCOUNTING" },
  { khoa: "han-muc-tra-sau", trang: "/han-muc-tra-sau", bo: "ACCOUNTING" },
  { khoa: "nguoi-ban", trang: "/nguoi-ban", bo: "ACCOUNTING" },
  { khoa: "hoa-hong-gioi-han", trang: "/hoa-hong-gioi-han", bo: "SUPER_ADMIN" },
];
/** Bộ quyền chỉ dùng để GIEO (không có màn đo): Toàn quyền đánh cờ «cần xác nhận» cho một dịch vụ giả. */
const BO_GIEO = ["SUPER_ADMIN"];

/** Giây đo từng màn (tổng giây các ô của màn, lượt kiểm GitHub ghi lại — `node scripts/kiem-phan.mjs gom` in ra để chép). Chỉ để CHIA cho cân, không phải cổng. */
let THOI_GIAN_KHUNG = {};
try {
  THOI_GIAN_KHUNG = JSON.parse(readFileSync(new URL("./thoi-gian-khung.json", import.meta.url), "utf8"));
} catch {
  THOI_GIAN_KHUNG = {};
}
/**
 * Chia khoá màn của BANG_CI thành `soManh` mảnh, CÂN THEO GIÂY ĐO (rút lượt kiểm 25/11/2026: chia xoay vòng để mảnh 1 đo 207 giây, mảnh 3 đo 119 giây). Tham
 * lam tất định: màn nặng trước (cùng giây thì theo thứ tự bảng), mỗi màn vào mảnh đang nhẹ nhất (cùng nặng thì mảnh số nhỏ). Màn chưa có số đo tính bằng trung vị
 * các màn đã đo. Tất định theo (bảng, số mảnh, tệp giây): máy gom dựng lại y hệt.
 */
export function chiaManh(bang, soManh, gio = THOI_GIAN_KHUNG) {
  if (!Number.isInteger(soManh) || soManh < 1) throw new Error(`số mảnh đo khung phải là số nguyên ≥ 1 (nhận ${soManh})`);
  const daDo = bang.map((d) => gio[d.khoa]).filter((x) => typeof x === "number" && x > 0).sort((a, b) => a - b);
  const macDinh = daDo.length ? daDo[Math.floor(daDo.length / 2)] : 1;
  const nang = (d) => (typeof gio[d.khoa] === "number" && gio[d.khoa] > 0 ? gio[d.khoa] : macDinh);
  const thuTu = bang.map((d, i) => ({ d, i })).sort((a, b) => nang(b.d) - nang(a.d) || a.i - b.i);
  const ra = Array.from({ length: soManh }, () => []);
  const tai = Array(soManh).fill(0);
  for (const { d, i } of thuTu) {
    let m = 0;
    for (let k = 1; k < soManh; k++) if (tai[k] < tai[m]) m = k;
    ra[m].push({ khoa: d.khoa, i });
    tai[m] += nang(d);
  }
  return ra.map((x) => x.sort((a, b) => a.i - b.i).map((y) => y.khoa));
}
/** Giây đo từng màn của một mảnh: tổng `ms` các ô của màn (đồng hồ thẻ, không chia số thẻ), làm tròn 0,1 giây. */
export const giayTungMan = (ketQua) => {
  const g = {};
  for (const o of ketQua) if (typeof o?.ms === "number") g[o.man] = (g[o.man] ?? 0) + o.ms / 1000;
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Math.round(v * 10) / 10]));
};

/**
 * Kết luận của MỘT mảnh: `luot` như gopLuot, `giao` = khoá màn mảnh được giao. Mã 2 = có lượt không chạy được hoặc mảnh không đo đủ màn được giao (gieo hỏng ⇒
 * dòng bị bỏ); 1 = có ô không đạt; 0 = đạt. Việc «hợp các mảnh phủ mọi trang đã khai khuôn» do máy gom làm.
 */
export function gopManh(luot, giao) {
  const chayDuoc = luot.length > 0 && luot.every((l) => Array.isArray(l.ketQua));
  const ketQua = luot.flatMap((l) => l.ketQua ?? []);
  const khoa = [...new Set(ketQua.map((x) => x.man))];
  const trang = [...new Set(ketQua.map((x) => x.trang))];
  const thieuKhoa = giao.filter((k) => !khoa.includes(k));
  const khongDat = ketQua.filter((x) => x.loi?.length).length;
  const maThoat = !chayDuoc ? 2 : khongDat ? 1 : thieuKhoa.length ? 2 : 0;
  return { maThoat, soO: ketQua.length, khongDat, khoa, trang, thieuKhoa, chayDuoc };
}

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
  const manhCo = lay("--manh");
  const [manh, soManh] = manhCo ? manhCo.split("/").map(Number) : [null, null];
  if (manhCo && !(Number.isInteger(manh) && Number.isInteger(soManh) && manh >= 1 && manh <= soManh)) throw new Error(`--manh phải dạng k/K, 1 ≤ k ≤ K (nhận ${manhCo})`);
  const giao = manh ? chiaManh(BANG_CI, soManh)[manh - 1] : BANG_CI.map((d) => d.khoa);
  const bangGiao = BANG_CI.filter((d) => giao.includes(d.khoa));
  const songSong = lay("--song-song", "1");
  const hanPhut = Number(lay("--han-phut", "25"));
  const bat = Date.now();
  const ghi = (bc) => { if (tepKq) writeFileSync(tepKq, `${JSON.stringify(bc, null, 1)}\n`); };
  const tam = mkdtempSync(join(tmpdir(), "tourdao-do-khung-ci-"));
  let moi = null;
  let ketLuan = { ok: false, maThoat: 2, buoc, ...(manh ? { manh, soManh } : {}), loi: null };
  try {
    const { dungMoiTruong } = await import("./moi-truong.mjs");
    // MỌI mảnh dựng ĐỦ tài khoản của cả BANG_CI (+ bộ chỉ dùng để gieo), không chỉ bộ của màn mình: việc gieo cần tài khoản khác màn (chuyến cần Tài xế, đơn chờ
    // xác nhận cần Bán hàng + Toàn quyền, đơn mẫu cần Bán hàng) — thiếu thì màn bị bỏ hoặc đo trên trang thưa hơn bản một máy (đo thử 25/11: mảnh 4/4 chỉ có
    // ADMIN, DRIVER_PARTNER, SUPER_ADMIN ⇒ bỏ /chuyen-sua «thiếu mã chuyen», lượt gieo đơn chờ hỏng). Nhờ vậy mỗi màn đo trên CÙNG dữ liệu dù rơi vào mảnh nào.
    const cacBo = [...new Set([...BANG_CI.map((d) => d.bo), ...BO_GIEO])];
    moi = await dungMoiTruong({ bo: cacBo, hanPhut });
    console.log(`▶ Máy thử tạm: ${moi.base}; tài khoản: ${moi.boChayDuoc.join(", ")}; lỗi gieo đơn: ${moi.loiGieo.length}`);
    for (const l of moi.loiGieo) console.log(`  ✗ gieo ${l.viec}: ${l.status ?? ""} ${l.loi}`);

    // ---- gieo thêm: một xe, một địa điểm (Quản trị) qua API thật
    const L = await import(pathToFileURL(join(process.cwd(), "tests", "e2e", "lib.mjs")).href);
    const ma = { don: moi.id.donDaXacNhan[0] ?? null, nhap: moi.id.donNhap[0] ?? null, xe: null, chuyen: null };
    if (moi.taiKhoan.ADMIN) {
      const ck = await L.session(moi.taiKhoan.ADMIN);
      const xe = await L.call(ck, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-123.45", chassisNumber: "KHUNGDOCI0001", name: "Xe đo khung", passengerCapacity: 16 });
      if (xe.status === 201) ma.xe = xe.body.vehicle.id;
      else console.log(`  ✗ gieo xe: ${xe.status} ${JSON.stringify(xe.body?.error ?? xe.body).slice(0, 300)}`);
      // Hai xe nữa và giấy tờ cho xe đầu (một giấy còn 10 ngày, một giấy còn dài) — để các trang danh sách Xe, Lịch xe bận, Sắp hết hạn có dữ liệu như dùng thật,
      // không đo trên trang gần rỗng (chữ đậm của tiêu đề khối, nút chiếm gần hết chữ — lượt đo đầu 24/11 vượt trần chỉ vì trang thưa).
      const ngayVn = (soNgay) => new Date(Date.now() + 7 * 3600_000 + soNgay * 86_400_000).toISOString().slice(0, 10);
      const xeThem = [];
      for (const [bien, cho] of [["79B-234.56", 29], ["79B-345.67", 7], ["79B-456.78", 45], ["79B-678.90", 16]]) {
        const x = await L.call(ck, "POST", "/api/van-chuyen/xe", { plateNumber: bien, chassisNumber: `KHUNGDOCI${bien.replace(/\D/g, "")}`, name: `Xe đo khung ${cho} chỗ`, passengerCapacity: cho });
        if (x.status === 201) xeThem.push(x.body.vehicle.id);
        else console.log(`  ✗ gieo xe ${bien}: ${x.status} ${JSON.stringify(x.body?.error ?? x.body).slice(0, 200)}`);
      }
      // Giấy tờ: xe đầu đủ hai giấy còn dài (để xếp chuyến được); hai xe sau mỗi xe một giấy sắp hết hạn (trang Sắp hết hạn có dòng).
      const giay = [[ma.xe, "INSPECTION", 300], [ma.xe, "TPL_INSURANCE", 300], [xeThem[0], "INSPECTION", 10], [xeThem[1], "TPL_INSURANCE", 20]];
      for (const [xeId, typeCode, soNgay] of giay) {
        if (!xeId) continue;
        const g = await L.call(ck, "POST", `/api/van-chuyen/xe/${xeId}/giay-to`, { typeCode, number: `${typeCode}-DOKHUNG-${soNgay}`, expiryDate: ngayVn(soNgay) });
        if (g.status !== 201) console.log(`  ✗ gieo giấy tờ xe ${typeCode}: ${g.status} ${JSON.stringify(g.body?.error ?? g.body).slice(0, 200)}`);
      }
      // Một chuyến ngày mai 09:00–11:00 trên xe vừa gieo, tài xế là tài khoản Tài xế công ty thử (Chi tiết chuyến, Sửa chuyến, màn Cho xe chạy của tài xế).
      if (ma.xe && moi.taiKhoan.DRIVER) {
        const me = await L.call(await L.session(moi.taiKhoan.DRIVER), "GET", "/api/auth/me");
        const tx = me.body?.staff?.partyId ?? null;
        // Giấy phép lái xe của tài xế (thiếu thì máy chủ từ chối xếp: «Tài xế chưa đủ điều kiện lái xe này»); cũng là dòng «Giấy tờ của tôi» ở trang đầu tài xế.
        if (tx) {
          const gplx = await L.call(ck, "POST", `/api/parties/${tx}/documents`, { typeCode: "GPLX", number: "791234567890", classCode: "D2", expiryDate: ngayVn(800) });
          if (gplx.status !== 201) console.log(`  ✗ gieo giấy phép lái xe: ${gplx.status} ${JSON.stringify(gplx.body?.error ?? gplx.body).slice(0, 200)}`);
        }
        const mai = ngayVn(1);
        const c = tx ? await L.call(ck, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: ma.xe, taiXePartyId: tx, batDau: { ngay: mai, gio: "09:00" }, ketThuc: { ngay: mai, gio: "11:00" } }) : null;
        if (c?.status === 201) ma.chuyen = c.body.chuyen.id;
        else console.log(`  ✗ gieo chuyến: ${tx ? `${c?.status} ${JSON.stringify(c?.body?.error ?? c?.body).slice(0, 300)}` : "không đọc được hồ sơ tài xế"}`);
      }
      const dd = await L.call(ck, "POST", "/api/locations", { code: "KS_DO_KHUNG", name: "Khách sạn đo khung", locationTypeCode: "HOTEL", address: "12 Trần Phú, Nha Trang", sortOrder: 95 });
      if (dd.status !== 201) console.log(`  ✗ gieo địa điểm: ${dd.status} ${JSON.stringify(dd.body?.error ?? dd.body).slice(0, 300)}`);
    }
    // ---- gieo thêm: dữ liệu tiền tối thiểu cho các trang Tiền (khung gốc đợt C, 25/11/2026), cùng route và hình dữ liệu như kịch bản gieo của máy thử
    // (docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/gieo-tien.mjs): trang Hoa hồng, Cấp độ đại lý, Hạn mức trả sau có bảng thật để đo, không đo trên trang rỗng.
    // Gieo hỏng thì chỉ in lỗi: các trang đó vẫn mở được (trạng thái rỗng theo khuôn chung) và vẫn được đo.
    if (moi.taiKhoan.ACCOUNTING && moi.taiKhoan.SUPER_ADMIN) {
      const kt = await L.session(moi.taiKhoan.ACCOUNTING), tq = await L.session(moi.taiKhoan.SUPER_ADMIN);
      const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
      const thu = async (viec, r, mong = [200, 201]) => { if (!mong.includes(r.status)) console.log(`  ✗ gieo tiền — ${viec}: ${r.status} ${JSON.stringify(r.body?.error ?? r.body).slice(0, 200)}`); return mong.includes(r.status) ? r.body : null; };
      const cap = {};
      // Dòng theo từng dịch vụ như gieo-tien.mjs (soát 25/11: chỉ gieo dòng «mọi dịch vụ» thì trang Hoa hồng thiếu một khối so với trang chủ duyệt, đo lệch hình).
      const dvGieo = ((await L.call(kt, "GET", "/api/catalog")).body?.items ?? []).filter((i) => i.supported && i.unit === "perPax" && i.prices?.adult > 0).map((i) => i.code).slice(0, 3);
      const theoDv = (ty, moiKhach) => dvGieo.map((c, i) => (i === 0 ? { phamVi: "SERVICE", catalogCode: c, kieu: "RATE", tyLeBp: ty + 300 } : { phamVi: "SERVICE", catalogCode: c, kieu: "PER_PAX", moiKhach: moiKhach * i }));
      for (const [ten, ty, giam, goiY, moiKhach] of [["Đại lý vàng", 1500, 50000, { hanMuc: 50_000_000, gioTra: 168, gioAnHan: 24 }, 150000], ["Đại lý bạc", 1000, 30000, { hanMuc: 20_000_000, gioTra: 72, gioAnHan: 12 }, 120000]]) {
        const m = await thu(`tạo cấp ${ten}`, await L.call(kt, "POST", "/api/pricing/muc-ta", { ten }), [201]);
        if (!m?.muc?.code) continue;
        cap[ten] = m.muc.code;
        if (!m.muc.dangBat) await thu(`bật cấp ${ten}`, await L.call(kt, "POST", `/api/pricing/muc-ta/${m.muc.code}/bat`, {}));
        for (const d of [{ phamVi: "ALL", kieu: "RATE", tyLeBp: ty }, ...theoDv(ty, moiKhach)]) await thu(`mức ${ten} (${d.catalogCode ?? "mọi dịch vụ"})`, await L.call(kt, "POST", `/api/pricing/muc-ta/${m.muc.code}/dong`, { ...d, tuNgay: homNay }), [201]);
        await thu(`giảm phí đưa đón ${ten}`, await L.call(kt, "POST", "/api/pricing/giam-phi-don", { tierCode: m.muc.code, amount: giam, validFromDate: homNay }));
        await thu(`gợi ý Trả sau ${ten}`, await L.call(tq, "PUT", `/api/tra-sau/goi-y/${m.muc.code}`, goiY));
      }
      if (cap["Đại lý bạc"]) await thu("gắn vai Công ty lữ hành", await L.call(kt, "POST", "/api/pricing/muc-ta/gan", { loai: "TRAVEL_AGENCY", muc: cap["Đại lý bạc"], tuNgay: homNay }), [201]);
      await thu("mức theo vai Cộng tác viên", await L.call(kt, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: "COLLABORATOR" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000, tuNgay: homNay }), [201]);
      await thu("mức tối đa Quản trị được cấp", await L.call(tq, "POST", "/api/tra-sau/muc-toi-da", { so: 30_000_000 }), [201]);
      const dt = moi.taiKhoan.PARTNER ? (await L.call(await L.session(moi.taiKhoan.PARTNER), "GET", "/api/auth/me")).body?.staff?.partyId ?? null : null;
      if (dt && cap["Đại lý vàng"]) {
        await thu("cấp riêng đối tác thử", await L.call(kt, "POST", `/api/pricing/ho-so/${dt}/muc-rieng`, { muc: cap["Đại lý vàng"], tuNgay: homNay }), [201]);
        await thu("hạn mức Trả sau đối tác thử", await L.call(tq, "POST", "/api/tra-sau/han-muc", { partyId: dt, hanMuc: 20_000_000, gioTra: 72, gioAnHan: 12, lyDo: "Đối tác đo khung, đặt đoàn đều" }), [201]);
      } else console.log("  ✗ gieo tiền — cấp riêng / hạn mức: thiếu hồ sơ đối tác thử hoặc cấp vàng");
    }
    // ---- gieo thêm (lượt hai): một đơn ĐANG CHỜ XÁC NHẬN (khung gốc đợt A), để màn «Đơn chờ xác nhận» được đo khi có danh sách, như người dùng thật thấy. Gieo hỏng thì trang
    // rỗng; lượt đó tính là KHÔNG CHẠY ĐƯỢC (mã 2) — không đo màn ở trạng thái rỗng rồi báo đạt (soát độc lập 24/11). Cùng cách kịch bản tests/e2e/gui-don.mjs:
    // dịch vụ giả riêng, Toàn quyền đánh cờ, Bán hàng lập rồi gửi. Trả true khi đã có một đơn đang chờ xác nhận.
    const gieoDonCho = async () => {
      if (!moi.taiKhoan.SALES || !moi.taiKhoan.SUPER_ADMIN) { console.log("  ✗ gieo đơn chờ xác nhận: thiếu tài khoản Bán hàng hoặc Toàn quyền"); return false; }
      try {
        const AT = "'2026-01-01T00:00:00.000Z'";
        await L.sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES ('ZDK1','Dịch vụ đo khung cần xác nhận','perPax',100000,NULL,NULL,NULL,NULL,NULL,NULL,96,1,${AT},${AT}) ON CONFLICT(code) DO UPDATE SET in_sheet = 1`);
        const sup = await L.session(moi.taiKhoan.SUPER_ADMIN);
        const co = await L.call(sup, "POST", "/api/cai-dat/xac-nhan-don", { pham: "SERVICE", ma: "ZDK1", canXacNhan: true });
        const ban = await L.session(moi.taiKhoan.SALES);
        const o = co.status === 200 ? await L.call(ban, "POST", "/api/orders", L.orderInput({ customerName: "Khách Chờ Xác Nhận", customerPhone: "0905 678 901", services: [L.catalogService({ catalogCode: "ZDK1", catalogPriceSeen: { adult: 100000 }, pax: { adult: 2 }, departDate: L.vnDate(3) })] })) : co;
        const gui = o.status === 201 ? await L.call(ban, "POST", `/api/orders/${o.body.order.id}/gui-xac-nhan`, {}) : o;
        if (gui.status !== 201) { console.log(`  ✗ gieo đơn chờ xác nhận: ${gui.status} ${JSON.stringify(gui.body?.error ?? gui.body).slice(0, 300)}`); return false; }
        return true;
      } catch (e) { console.log(`  ✗ gieo đơn chờ xác nhận: ${String(e?.message ?? e).slice(0, 300)}`); return false; }
    };
    const { bangMan, bo } = dungBangMan(bangGiao, ma);
    for (const b of bo) console.log(`  ✗ bỏ khỏi bảng màn: ${b}`);

    const tepTk = join(tam, "tai-khoan.json");
    writeFileSync(tepTk, JSON.stringify({ taiKhoan: Object.entries(moi.taiKhoan).map(([khoa, t]) => ({ khoa, sdt: t.phone, pin: t.pin })) }));
    const cacLuot = chiaLuot(bangMan);
    const kqLuot = [];
    for (const [i, l] of cacLuot.entries()) {
      if (l.sauGieo && !(await gieoDonCho())) { console.log(`▶ Lượt ${i + 1}/${cacLuot.length}: gieo hỏng, KHÔNG đo — lượt này tính là không chạy được`); kqLuot.push({ ketQua: null }); continue; }
      const tepBang = join(tam, `bang-man-${i + 1}.json`);
      writeFileSync(tepBang, JSON.stringify(l.bang));
      const ra = join(tam, `so-do-${i + 1}`);
      console.log(`▶ Lượt ${i + 1}/${cacLuot.length}${l.sauGieo ? " (sau khi gieo đơn chờ xác nhận)" : ""}: đo ${l.bang.length} màn, bề rộng 360–1.920 bước ${buoc}`);
      // Mỗi lượt chỉ là một phần bảng màn nên do-khung-goc tự báo «đo thiếu» (mã 2): mã thoát từng lượt KHÔNG dùng; kết luận đọc từ tệp số đo của mọi lượt (gopLuot).
      spawnSync(process.execPath, ["scripts/giao-dien/do-khung-goc.mjs", "--base", moi.base, "--tk", tepTk, "--bang", tepBang, "--ra", ra, "--buoc", String(buoc), "--song-song", songSong], { stdio: "inherit" });
      const tepSo = join(ra, "do-khung-goc.json");
      kqLuot.push({ ketQua: existsSync(tepSo) ? JSON.parse(readFileSync(tepSo, "utf8")).ketQua : null });
    }
    console.log(
      manh
        ? `(Dòng «ĐO THIẾU» của từng lượt ở trên chỉ nói lượt đó không đo các trang của mảnh khác — không phải kết luận. Mảnh ${manh}/${soManh} đỏ khi đo thiếu màn được giao; máy gom đỏ khi hợp các mảnh không phủ mọi trang đã khai khuôn.)`
        : "(Dòng «ĐO THIẾU» của từng lượt ở trên chỉ nói lượt đó là một phần bảng màn — kết luận đo thiếu đọc ở dưới, trên hợp mọi lượt.)",
    );
    if (manh) {
      const g = gopManh(kqLuot, giao);
      ketLuan = { ok: g.maThoat === 0, maThoat: g.maThoat, buoc, manh, soManh, khoa: g.khoa, trang: g.trang, soMan: g.khoa.length, soO: g.soO, khongDat: g.khongDat, thieuKhoa: g.thieuKhoa,
        giayMan: giayTungMan(kqLuot.flatMap((l) => l.ketQua ?? [])),
        loi: g.maThoat === 0 ? null : g.maThoat === 1 ? `${g.khongDat} ô không đạt` : g.thieuKhoa.length ? `mảnh ${manh}/${soManh} đo thiếu màn: ${g.thieuKhoa.join(", ")}` : "lệnh đo không chạy được" };
    } else {
      const daChuyen = readdirSync("public").filter((t) => t.endsWith(".html")).filter((t) => docThanTrang(readFileSync(join("public", t), "utf8")).khuon !== null).map(duongCuaTrang);
      const { maThoat, soO, khongDat, doThieu } = gopLuot(kqLuot, daChuyen);
      ketLuan = { ok: maThoat === 0, maThoat, buoc, soMan: bangMan.length, soO, khongDat, doThieu, loi: maThoat === 0 ? null : maThoat === 1 ? `${khongDat} ô không đạt` : doThieu.length ? `đo thiếu: ${doThieu.join(", ")}` : "lệnh đo không chạy được" };
    }
  } catch (e) {
    ketLuan = { ok: false, maThoat: 2, buoc, ...(manh ? { manh, soManh } : {}), loi: String(e?.message ?? e).slice(0, 600) };
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
