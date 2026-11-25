// Gieo dữ liệu TIỀN lên MÁY THỬ CỤC BỘ (wrangler dev, D1 giả) để ảnh 10 trang Tiền có con số thật — đợt C khung gốc, 25/11/2026.
// Gieo gì (theo thứ tự, mỗi bước kiểm "có rồi thì bỏ qua", nên chạy lại được):
//   1) hai cấp độ đại lý «Đại lý vàng», «Đại lý bạc» kèm mức hoa hồng (mọi dịch vụ + vài dịch vụ, phần trăm và số tiền mỗi khách); gắn vai «Công ty lữ hành» theo «Đại lý bạc»;
//   2) mức hoa hồng riêng của vai người dùng (Lễ tân khách sạn 8 %, Cộng tác viên 50.000 đ/khách cho một dịch vụ);
//   3) cấp riêng cho hai hồ sơ đối tác (Đại lý Biển Xanh Thử → vàng, Cộng Tác Thử → bạc);
//   4) giảm phí đưa đón theo cấp, số gợi ý Trả sau theo cấp, mức tối đa Quản trị được cấp;
//   5) Trả sau: Đại lý Biển Xanh Thử có hạn mức + một đơn đang nợ trong hạn; Lữ Hành Thử có một đơn thời hạn trả 1 giờ (thành «quá hạn» sau 1 giờ);
//   6) nhà cung cấp «Quầy vé Hòn Tằm Thử» bán một dịch vụ, tỷ lệ mua lại 85 %;
//   7) một yêu cầu điều chỉnh công nợ CHỜ DUYỆT do Toàn quyền gửi (Kế toán duyệt được);
//   8) hai phiếu phân định trách nhiệm: một chờ phân định, một đã phân định chờ ghi sổ;
//   9) chụp bù: KHÔNG gieo được qua API (lệnh Xác nhận luôn chụp mức trong cùng lô) — chỉ in lý do;
//  10) khoá sổ tháng: CHỈ khi có cờ --khoa-thang (không mở lại được): ghi một khoản thu ngày cuối tháng trước rồi khoá tháng trước nữa,
//      để trang thấy cả «đã khoá» lẫn «tháng khoá được kế tiếp» kèm bảng kiểm. Đừng dùng cờ này trên D1 chung với tests/e2e/khoa-thang.mjs.
// Chạy (đứng ở gốc kho): node docs/evidence/2026-11-25-khung-goc-dot-c/kich-ban/gieo-tien.mjs [--base http://127.0.0.1:8881] [--khoa-thang]
// Chỉ gọi tới máy thử cục bộ (từ chối địa chỉ khác). Phiên đăng nhập đọc từ ~/tourdao-dot-c-2026-11-25/phien.json (mỗi tài khoản chỉ đăng nhập một nơi);
// phiên chết mới đăng nhập lại bằng ~/tourdao-dot-c-2026-11-25/tai-khoan.json và ghi cookie mới vào phien.json. Tệp này không chứa số điện thoại, mã PIN hay cookie.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { dangNhap } from "../../../../scripts/giao-dien/cdp.mjs";

const CHO_PHEP = "http://127.0.0.1:8881";
const thamSo = process.argv.slice(2);
const viTriBase = thamSo.indexOf("--base");
const BASE = (viTriBase >= 0 ? thamSo[viTriBase + 1] : CHO_PHEP)?.replace(/\/+$/, "");
const KHOA_THANG = thamSo.includes("--khoa-thang");
try {
  if (new URL(BASE).origin !== CHO_PHEP || BASE !== CHO_PHEP) throw new Error();
} catch {
  console.error(`Từ chối: kịch bản chỉ gọi máy thử cục bộ ${CHO_PHEP}.`);
  process.exit(2);
}
const KHO = join(homedir(), "tourdao-dot-c-2026-11-25");
const TEP_PHIEN = join(KHO, "phien.json");
const TEP_TK = join(KHO, "tai-khoan.json");

// ---------------------------------------------------------------- tiện ích
const che = (s) => String(s).replace(/"(phone|customerPhone|primaryPhone|sdt|pin|value)":"[^"]*"/g, '"$1":"***"').replace(/(?<!\d)0\d{9}(?!\d)/g, "***");
const ketQua = {};
const ghi = (muc, cau) => {
  (ketQua[muc] ??= []).push(cau);
  console.log(`[${muc}] ${cau}`);
};
const vnNgay = (them = 0) => new Date(Date.now() + 7 * 3600_000 + them * 86400_000).toISOString().slice(0, 10);
const HOM_NAY = vnNgay(0);
const soDienThoai = () => `09${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
const dong = (n) => n.toLocaleString("vi-VN");

let phien = JSON.parse(readFileSync(TEP_PHIEN, "utf8"));
const conSong = new Set();

async function goi(khoa, method, path, body) {
  const url = `${BASE}${path}`;
  if (!url.startsWith(`${CHO_PHEP}/`)) throw new Error("từ chối địa chỉ ngoài máy thử");
  const p = phien[khoa];
  if (!p) throw new Error(`phien.json không có phiên «${khoa}»`);
  const headers = { cookie: `${p.name}=${p.value}` };
  if (method !== "GET") Object.assign(headers, { origin: CHO_PHEP, "content-type": "application/json" });
  for (let lan = 0; ; lan++) {
    try {
      const r = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
      const t = await r.text();
      let j = null;
      try { j = t ? JSON.parse(t) : null; } catch { j = { raw: t.slice(0, 300) }; }
      return { status: r.status, body: j, headers: r.headers };
    } catch (e) {
      if (lan >= 2) throw e;
      await new Promise((res) => setTimeout(res, 400));
    }
  }
}

/** Phiên còn sống (GET /api/auth/me = 200); chết thì đăng nhập lại bằng tai-khoan.json và ghi cookie mới (gộp, không xoá khoá khác). */
async function damBaoPhien(khoa) {
  if (conSong.has(khoa)) return;
  if (phien[khoa] && (await goi(khoa, "GET", "/api/auth/me")).status === 200) {
    conSong.add(khoa);
    return;
  }
  const tk = JSON.parse(readFileSync(TEP_TK, "utf8")).taiKhoan.find((x) => x.khoa === khoa);
  if (!tk) throw new Error(`tai-khoan.json không có tài khoản «${khoa}»`);
  let cookie;
  try {
    cookie = await dangNhap(BASE, tk.sdt, tk.pin);
  } catch {
    throw new Error(`đăng nhập lại tài khoản «${khoa}» không được (chi tiết đã ẩn)`);
  }
  phien = { ...JSON.parse(readFileSync(TEP_PHIEN, "utf8")), [khoa]: cookie };
  writeFileSync(TEP_PHIEN, JSON.stringify(phien, null, 1));
  conSong.add(khoa);
  console.log(`(đã đăng nhập lại «${khoa}» và ghi cookie mới vào phien.json)`);
}

/** Gọi và đòi đúng mã trạng thái; sai thì ném lỗi (thân đã che số). */
async function phai(khoa, method, path, body, mong = [200, 201]) {
  await damBaoPhien(khoa);
  const r = await goi(khoa, method, path, body);
  const ds = Array.isArray(mong) ? mong : [mong];
  if (!ds.includes(r.status)) throw new Error(`${khoa} ${method} ${path} ⇒ ${r.status} ${che(JSON.stringify(r.body)).slice(0, 500)}`);
  return r.body;
}

/** Chạy một mục; lỗi chỉ ghi lại, không dừng các mục sau. */
async function muc(so, ten, fn) {
  try {
    await fn();
  } catch (e) {
    ghi(so, `KHÔNG xong (${ten}): ${che(e?.message ?? e)}`);
  }
}

// ---------------------------------------------------------------- dữ liệu nền
for (const k of ["toanquyen", "ketoan", "quantri", "sales", "hdv"]) await damBaoPhien(k);
const NV_HDV = (await phai("hdv", "GET", "/api/auth/me")).staff;
const DANH_MUC = new Map((await phai("sales", "GET", "/api/catalog")).items.filter((i) => i.supported && i.unit === "perPax" && i.prices?.adult > 0).map((i) => [i.code, i]));
/** Mã dịch vụ đầu tiên có trong danh mục theo thứ tự ưu tiên (danh mục thật đồng bộ từ Sheet; lượt kiểm GitHub có thể khác). */
const chonMa = (...uuTien) => uuTien.find((m) => DANH_MUC.has(m)) ?? [...DANH_MUC.keys()][0];
const CONG_TY = (await phai("ketoan", "GET", "/api/pricing/cung-ung")).congTyChu?.partyId;
const hoSoDoiTac = async () => (await phai("ketoan", "GET", "/api/pricing/cap-dai-ly")).hoSo;
const idHoSo = async (ten) => (await hoSoDoiTac()).find((x) => x.ten === ten)?.partyId ?? null;

const dichVu = (ma, nguoiLon, ngayDi) => {
  const it = DANH_MUC.get(ma);
  const gia = Object.fromEntries(Object.entries(it.prices).filter(([, v]) => v !== null && v !== undefined));
  return { kind: "catalog", catalogCode: ma, pax: { adult: nguoiLon }, catalogPriceSeen: gia, departDate: ngayDi, pickupChoice: "KHONG_DON" };
};
/** Bán hàng lập đơn rồi xác nhận; trả đơn đã đọc lại. */
async function lapVaXacNhan({ khach, ma, nguoiLon, ngayDi, them = {} }) {
  const lap = await phai("sales", "POST", "/api/orders", { customerName: khach, customerPhone: soDienThoai(), services: [dichVu(ma, nguoiLon, ngayDi)], ...them }, 201);
  const id = lap.order.id;
  await phai("sales", "POST", `/api/orders/${id}/status`, { status: "confirmed" }, 200);
  return (await phai("sales", "GET", `/api/orders/${id}`)).order;
}
/** Đơn hôm nay do HDV phụ trách, Kế toán thu đủ cho công ty, HDV bấm «Khách đã trả đủ». */
async function donDaGiao(khach, ma, nguoiLon) {
  const don = await lapVaXacNhan({ khach, ma, nguoiLon, ngayDi: HOM_NAY, them: { handlerStaffId: NV_HDV.id } });
  const tt = await phai("ketoan", "GET", `/api/orders/${don.id}/payments`);
  await phai("ketoan", "POST", `/api/orders/${don.id}/payments`, { soTien: tt.phaiThu, hinhThuc: "CASH", nguoiThu: "cong_ty" }, 201);
  await phai("hdv", "POST", `/api/orders/${don.id}/delivered`, {}, 200);
  return don;
}

const VANG = "Đại lý vàng";
const BAC = "Đại lý bạc";
const dsCap = async () => (await phai("ketoan", "GET", "/api/pricing/muc-ta")).muc;
const maCap = {};

// ---------------------------------------------------------------- 1) hai cấp độ đại lý + mức
await muc(1, "cấp độ đại lý", async () => {
  const TD = chonMa("TD2", "TD1", "TDMCT1");
  const ATV = chonMa("ATV", "DTE1");
  const DT = chonMa("DTE1", "DTMSC");
  const KHUON = {
    [VANG]: [
      { phamVi: "ALL", kieu: "RATE", tyLeBp: 1500 },
      { phamVi: "SERVICE", catalogCode: TD, kieu: "RATE", tyLeBp: 1800 },
      { phamVi: "SERVICE", catalogCode: ATV, kieu: "PER_PAX", moiKhach: 200000 },
      { phamVi: "SERVICE", catalogCode: DT, kieu: "PER_PAX", moiKhach: 300000 },
    ],
    [BAC]: [
      { phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 },
      { phamVi: "SERVICE", catalogCode: TD, kieu: "RATE", tyLeBp: 1200 },
      { phamVi: "SERVICE", catalogCode: ATV, kieu: "PER_PAX", moiKhach: 120000 },
    ],
  };
  for (const [ten, dongMau] of Object.entries(KHUON)) {
    let cap = (await dsCap()).find((m) => m.ten === ten);
    if (!cap) {
      cap = (await phai("ketoan", "POST", "/api/pricing/muc-ta", { ten }, 201)).muc;
      ghi(1, `tạo cấp «${ten}» (${cap.code})`);
    } else ghi(1, `cấp «${ten}» đã có (${cap.code}), bỏ qua tạo`);
    if (!cap.dangBat) {
      await phai("ketoan", "POST", `/api/pricing/muc-ta/${cap.code}/bat`, {}, 200);
      ghi(1, `bật lại cấp «${ten}»`);
    }
    maCap[ten] = cap.code;
    for (const d of dongMau) {
      const co = (cap.dong ?? []).some((x) => x.phamVi === d.phamVi && (x.catalogCode ?? null) === (d.catalogCode ?? null) && x.conHieuLuc !== false && !x.daHuy);
      const nhan = `${d.phamVi === "ALL" ? "mọi dịch vụ" : d.catalogCode} · ${d.kieu === "RATE" ? `${d.tyLeBp / 100} %` : `${dong(d.moiKhach)} đ/khách`}`;
      if (co) { ghi(1, `«${ten}»: dòng ${nhan} đã có, bỏ qua`); continue; }
      const r = await phai("ketoan", "POST", `/api/pricing/muc-ta/${cap.code}/dong`, { ...d, tuNgay: HOM_NAY }, [201, 409]);
      ghi(1, r?.error ? `«${ten}»: dòng ${nhan} trùng (409), bỏ qua` : `«${ten}»: thêm dòng ${nhan}`);
    }
  }
  // Gắn vai «Công ty lữ hành» theo «Đại lý bạc» (thẻ «Vai người dùng đang theo cấp này»).
  const bac = (await dsCap()).find((m) => m.code === maCap[BAC]);
  if ((await dsCap()).some((m) => (m.gan ?? []).some((g) => g.loai.code === "TRAVEL_AGENCY" && g.conHieuLuc !== false && g.denNgay === null))) ghi(1, "vai «Công ty lữ hành» đã gắn một cấp, bỏ qua");
  else {
    const r = await phai("ketoan", "POST", "/api/pricing/muc-ta/gan", { loai: "TRAVEL_AGENCY", muc: bac.code, tuNgay: HOM_NAY }, [201, 409]);
    ghi(1, r?.error ? `gắn vai «Công ty lữ hành» → «${BAC}»: 409 (${r.error.message})` : `gắn vai «Công ty lữ hành» → «${BAC}» từ hôm nay`);
  }
});

// ---------------------------------------------------------------- 2) mức riêng của vai người dùng
await muc(2, "mức theo vai", async () => {
  const SM = chonMa("SM1", "SM2", "SD1");
  const MAU = [
    { doiTuong: { loai: "VAI", code: "HOTEL_RECEPTION" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 800, nhan: "Lễ tân khách sạn · mọi dịch vụ · 8 %" },
    { doiTuong: { loai: "VAI", code: "COLLABORATOR" }, phamVi: "SERVICE", catalogCode: SM, kieu: "PER_PAX", moiKhach: 50000, nhan: `Cộng tác viên · ${SM} · 50.000 đ/khách` },
  ];
  const ds = (await phai("ketoan", "GET", "/api/pricing/hoa-hong")).dong;
  for (const x of ds.filter((d) => d.doiTuong.loai === "VAI" && d.conHieuLuc && !d.daHuy)) ghi(2, `đã có sẵn: ${x.doiTuong.ten} · ${x.phamVi === "ALL" ? "mọi dịch vụ" : x.catalogCode} · ${x.kieu === "RATE" ? `${x.tyLeBp / 100} %` : `${dong(x.moiKhach)} đ/khách`}`);
  for (const { nhan, ...m } of MAU) {
    if (ds.some((d) => d.doiTuong.loai === "VAI" && d.doiTuong.code === m.doiTuong.code && d.phamVi === m.phamVi && (d.catalogCode ?? null) === (m.catalogCode ?? null) && d.conHieuLuc && !d.daHuy)) {
      ghi(2, `${nhan}: đã có, bỏ qua`);
      continue;
    }
    const r = await phai("ketoan", "POST", "/api/pricing/hoa-hong", { ...m, tuNgay: HOM_NAY }, [201, 409]);
    ghi(2, r?.error ? `${nhan}: trùng (409), bỏ qua` : `thêm ${nhan}`);
  }
});

// ---------------------------------------------------------------- 3) cấp riêng cho hai hồ sơ đối tác
await muc(3, "cấp riêng hồ sơ", async () => {
  for (const [ten, cap] of [["Đại lý Biển Xanh Thử", VANG], ["Cộng Tác Thử", BAC]]) {
    const hs = (await hoSoDoiTac()).find((x) => x.ten === ten);
    if (!hs) { ghi(3, `không thấy hồ sơ «${ten}» trên màn Cấp độ đại lý, bỏ qua`); continue; }
    if (hs.cap?.nguon === "RIENG") { ghi(3, `«${ten}» đã có cấp riêng «${hs.cap.cap?.ten}», bỏ qua`); continue; }
    if (!maCap[cap]) throw new Error(`chưa có mã cấp «${cap}» (mục 1 hỏng)`);
    await phai("ketoan", "POST", `/api/pricing/ho-so/${hs.partyId}/muc-rieng`, { muc: maCap[cap], tuNgay: HOM_NAY }, 201);
    ghi(3, `«${ten}» (${hs.partyId}) → cấp riêng «${cap}» từ hôm nay`);
  }
});

// ---------------------------------------------------------------- 4) giảm phí đưa đón, gợi ý Trả sau, mức tối đa
await muc(4, "giảm phí / gợi ý / mức tối đa", async () => {
  const GIAM = { [VANG]: 50000, [BAC]: 30000 };
  const dsGiam = (await phai("ketoan", "GET", "/api/pricing/giam-phi-don")).dong;
  for (const [ten, so] of Object.entries(GIAM)) {
    const ma = maCap[ten];
    if (!ma) continue;
    if (dsGiam.some((d) => d.tierCode === ma && d.validToDate === null)) { ghi(4, `giảm phí đưa đón «${ten}» đã có, bỏ qua`); continue; }
    const r = await phai("ketoan", "POST", "/api/pricing/giam-phi-don", { tierCode: ma, amount: so, validFromDate: HOM_NAY }, [200, 201, 409]);
    ghi(4, r?.error ? `giảm phí đưa đón «${ten}»: 409 (${r.error.message})` : `giảm phí đưa đón «${ten}»: ${dong(so)} đ/khách từ hôm nay`);
  }
  const GOI_Y = { [VANG]: { hanMuc: 50_000_000, gioTra: 168, gioAnHan: 24 }, [BAC]: { hanMuc: 20_000_000, gioTra: 72, gioAnHan: 12 } };
  const dsGoiY = (await phai("toanquyen", "GET", "/api/tra-sau/goi-y")).goiY;
  for (const [ten, g] of Object.entries(GOI_Y)) {
    const ma = maCap[ten];
    if (!ma) continue;
    const cu = dsGoiY.find((x) => x.cap === ma);
    if (cu && cu.hanMuc === g.hanMuc && cu.gioTra === g.gioTra && cu.gioAnHan === g.gioAnHan) { ghi(4, `gợi ý Trả sau «${ten}» đã có, bỏ qua`); continue; }
    await phai("toanquyen", "PUT", `/api/tra-sau/goi-y/${ma}`, g, 200);
    ghi(4, `gợi ý Trả sau «${ten}»: ${dong(g.hanMuc)} đ · trả trong ${g.gioTra} giờ · ân hạn ${g.gioAnHan} giờ`);
  }
  const hm = await phai("toanquyen", "GET", "/api/tra-sau/han-muc");
  if (hm.mucToiDa !== null && hm.mucToiDa !== undefined) ghi(4, `mức tối đa Quản trị được cấp đã có (${dong(hm.mucToiDa)} đ), bỏ qua`);
  else {
    await phai("toanquyen", "POST", "/api/tra-sau/muc-toi-da", { so: 30_000_000 }, 201);
    ghi(4, "mức tối đa Quản trị được cấp: 30.000.000 đ");
  }
});

// ---------------------------------------------------------------- 5) Trả sau: hạn mức + đơn đang nợ (+ một đơn sắp quá hạn)
await muc(5, "Trả sau", async () => {
  const dsHm = async () => (await phai("toanquyen", "GET", "/api/tra-sau/han-muc")).danhSach;
  const donNo = async (pid) => (await phai("toanquyen", "GET", `/api/tra-sau/han-muc/${pid}/don`)).don;
  const datHanMuc = async (pid, than) => phai("toanquyen", "POST", "/api/tra-sau/han-muc", { partyId: pid, ...than }, 201);

  // (a) Đại lý Biển Xanh Thử: hạn mức 50 triệu, trả trong 168 giờ, ân hạn 24 giờ; một đơn Trả sau đang nợ trong hạn.
  const BX = await idHoSo("Đại lý Biển Xanh Thử");
  if (!BX) throw new Error("không thấy hồ sơ «Đại lý Biển Xanh Thử»");
  if ((await dsHm()).some((x) => x.partyId === BX && x.coHanMuc !== false)) ghi(5, `Đại lý Biển Xanh Thử (${BX}) đã có hạn mức, bỏ qua`);
  else {
    await datHanMuc(BX, { hanMuc: 50_000_000, gioTra: 168, gioAnHan: 24, lyDo: "Đại lý quen, đặt đoàn đều mỗi tuần" });
    ghi(5, `Đại lý Biển Xanh Thử (${BX}): bật Trả sau 50.000.000 đ · 168 giờ · ân hạn 24 giờ`);
  }
  if ((await donNo(BX)).length > 0) ghi(5, "Đại lý Biển Xanh Thử đã có đơn đang nợ, bỏ qua lập đơn");
  else {
    const ma = chonMa("TD2", "TDMCT1");
    const don = await lapVaXacNhan({ khach: "Trần Minh Khoa", ma, nguoiLon: 4, ngayDi: vnNgay(5), them: { bookerPartyId: BX, paymentTerm: "CREDIT" } });
    ghi(5, `đơn Trả sau ${don.orderCode} (${ma} × 4 người lớn, ${dong(don.total)} đ) đã xác nhận, hạn trả ${don.hanTra}`);
  }

  // (b) Lữ Hành Thử: đơn Trả sau xác nhận khi thời hạn trả 1 giờ, ân hạn 0 ⇒ thành «quá hạn» sau 1 giờ; sau đó đổi hạn mức về 72 giờ (đơn giữ hạn trả đã chốt).
  const LH = await idHoSo("Lữ Hành Thử");
  if (!LH) throw new Error("không thấy hồ sơ «Lữ Hành Thử»");
  const noLH = (await (async () => ((await dsHm()).some((x) => x.partyId === LH && x.coHanMuc !== false) ? donNo(LH) : []))());
  if (noLH.length > 0) ghi(5, `Lữ Hành Thử (${LH}) đã có đơn Trả sau đang nợ (${noLH.map((d) => d.trangThai).join(", ")}), bỏ qua`);
  else {
    await datHanMuc(LH, { hanMuc: 15_000_000, gioTra: 1, gioAnHan: 0, lyDo: "Thử luồng quá hạn trên máy thử" });
    const ma = chonMa("BCT24", "BCT4");
    const don = await lapVaXacNhan({ khach: "Lê Thị Thu Hà", ma, nguoiLon: 6, ngayDi: vnNgay(3), them: { bookerPartyId: LH, paymentTerm: "CREDIT" } });
    await datHanMuc(LH, { hanMuc: 15_000_000, gioTra: 72, gioAnHan: 0, lyDo: "Đưa thời hạn trả về 72 giờ cho đơn mới" });
    ghi(5, `Lữ Hành Thử (${LH}): hạn mức 15.000.000 đ; đơn ${don.orderCode} (${dong(don.total)} đ) hạn trả ${don.hanTra} (giờ UTC) — từ lúc đó là «quá hạn»; hạn mức đã đổi về 72 giờ cho đơn mới`);
  }
});

// ---------------------------------------------------------------- 6) nhà cung cấp có tỷ lệ mua lại
await muc(6, "nhà cung cấp", async () => {
  const TEN_NCC = "Quầy vé Hòn Tằm Thử";
  const ma = chonMa("SM2", "SM3", "SD2");
  const cu = await phai("ketoan", "GET", "/api/pricing/cung-ung");
  let ncc = cu.nhaCungCap.find((x) => x.ten === TEN_NCC)?.partyId;
  if (!ncc) {
    ncc = (await phai("ketoan", "GET", `/api/parties?q=${encodeURIComponent(TEN_NCC)}&limit=5`)).parties.find((p) => p.displayName === TEN_NCC)?.id;
    if (!ncc) {
      ncc = (await phai("ketoan", "POST", "/api/parties", { kind: "ORGANIZATION", displayName: TEN_NCC }, 201)).party.id;
      ghi(6, `tạo hồ sơ tổ chức «${TEN_NCC}» (${ncc})`);
    }
    await phai("quantri", "POST", `/api/parties/${ncc}/roles`, { roleTypeCode: "SUPPLIER" }, 201);
    ghi(6, `Quản trị gắn vai «Nhà cung cấp» cho «${TEN_NCC}»`);
  } else ghi(6, `nhà cung cấp «${TEN_NCC}» đã có (${ncc}), bỏ qua tạo`);
  if (cu.dong.some((d) => d.nguoiBan?.partyId === ncc && d.catalogCode === ma && d.conHieuLuc)) { ghi(6, `điều khoản «${TEN_NCC}» bán ${ma} đã có, bỏ qua`); return; }
  await phai("ketoan", "POST", "/api/pricing/cung-ung", { phamVi: "SERVICE", catalogCode: ma, nguoiBanPartyId: ncc, tyLeMuaBp: 8500, tuNgay: HOM_NAY, ghiChu: "Giá mua lại theo hợp đồng quầy vé" }, 201);
  ghi(6, `điều khoản: «${TEN_NCC}» bán ${ma}, tỷ lệ mua lại 85 % từ hôm nay`);
});

// ---------------------------------------------------------------- 7) điều chỉnh công nợ chờ duyệt (Toàn quyền gửi, Kế toán duyệt)
await muc(7, "điều chỉnh chờ duyệt", async () => {
  const LY_DO = "Hướng dẫn viên đã chi hộ khách tiền vé cano, bù trừ phần đang giữ hộ";
  const ds = (await phai("ketoan", "GET", "/api/ledger/adjustment-requests")).yeuCau;
  const co = ds.find((y) => y.lyDo === LY_DO && y.trangThai === "cho_duyet");
  if (co) { ghi(7, `yêu cầu chờ duyệt đã có (${co.maDon}, ${dong(co.soTien)} đ), bỏ qua`); return; }
  if (!CONG_TY) throw new Error("không đọc được hồ sơ công ty chủ");
  const ma = chonMa("SD3", "SD4", "LPDK");
  const don = await lapVaXacNhan({ khach: "Phan Thị Hồng Nhung", ma, nguoiLon: 2, ngayDi: HOM_NAY, them: { handlerStaffId: NV_HDV.id } });
  const giu = Math.min(300000, don.total);
  await phai("hdv", "POST", `/api/orders/${don.id}/payments`, { soTien: giu, hinhThuc: "CASH", nguoiThu: "toi" }, 201);
  const so = Math.round(giu / 2 / 1000) * 1000;
  const r = await phai("toanquyen", "POST", "/api/ledger/adjustments", { loai: "dieu_chinh", orderId: don.id, benNo: CONG_TY, benDuocNo: NV_HDV.partyId, loaiDong: "SETTLEMENT", soTien: so, lyDo: LY_DO }, 201);
  const sau = (await phai("ketoan", "GET", "/api/ledger/adjustment-requests")).yeuCau.find((y) => y.id === r.yeuCauId);
  ghi(7, `đơn ${don.orderCode}: HDV giữ hộ ${dong(giu)} đ; Toàn quyền gửi yêu cầu giảm ${dong(so)} đ — trạng thái «${sau?.trangThai}», Kế toán duyệt được: ${sau?.coTheDuyet}`);
});

// ---------------------------------------------------------------- 8) phân định trách nhiệm
await muc(8, "phân định", async () => {
  const LY_DO_1 = "Khách phản ánh xe đón trễ 40 phút, xin hoàn một phần";
  const LY_DO_2 = "Khách phản ánh thiếu suất ăn trưa trên tour";
  const ds = await phai("ketoan", "GET", "/api/ledger/phan-dinh");
  const chuoi = JSON.stringify(ds.phieu);
  // (a) phiếu chờ phân định
  if (chuoi.includes(LY_DO_1)) ghi(8, "phiếu «chờ phân định» đã có, bỏ qua");
  else {
    const don = await donDaGiao("Võ Hoàng Long", chonMa("TDSNO", "LPHL", "LPDK"), 2);
    const q = await phai("ketoan", "POST", "/api/ledger/phan-dinh", { orderId: don.id, soTien: 200000, lyDo: LY_DO_1 }, 201);
    ghi(8, `đơn ${don.orderCode} đã «Khách đã trả đủ»; Kế toán lập đề nghị phân định 200.000 đ (${q.id}) — chờ phân định`);
  }
  // (b) phiếu đã phân định (Quản trị, bên chịu = HDV), chờ Kế toán ghi sổ
  if (chuoi.includes(LY_DO_2)) ghi(8, "phiếu «chờ ghi sổ» đã có, bỏ qua");
  else {
    const don = await donDaGiao("Đinh Quốc Bảo", chonMa("LPDK", "LPHL", "TDSNO"), 3);
    const q = await phai("ketoan", "POST", "/api/ledger/phan-dinh", { orderId: don.id, soTien: 150000, lyDo: LY_DO_2 }, 201);
    const r = await phai("quantri", "POST", `/api/ledger/phan-dinh/${q.id}/quyet`, { truongHop: "T6", benChiuPartyId: NV_HDV.partyId, soTien: 150000, coTienRa: true, lyDo: "Đã nghe hướng dẫn viên và khách trình bày" }, 201);
    ghi(8, `đơn ${don.orderCode}: đề nghị 150.000 đ, Quản trị phân định (trường hợp T6, bên chịu: ${NV_HDV.fullName}) — chờ Kế toán ghi sổ (${r.id})`);
  }
});

// ---------------------------------------------------------------- 9) chụp bù
ghi(9, "không gieo: danh sách chờ chụp bù chỉ gồm đơn đã xác nhận mà CHƯA có bản chụp mức nào, còn lệnh Xác nhận qua API luôn chụp mức trong cùng lô — chỉ đơn cũ trước migration 0113 mới có; muốn có phải chèn SQL (không làm)");

// ---------------------------------------------------------------- 10) khoá sổ tháng (chỉ với --khoa-thang)
await muc(10, "khoá tháng", async () => {
  if (!KHOA_THANG) { ghi(10, "bỏ qua (không có cờ --khoa-thang; khoá tháng không mở lại được)"); return; }
  const thangCua = (ngay) => ngay.slice(0, 7);
  const lui = (thang, n) => { const [y, m] = thang.split("-").map(Number); const d = new Date(Date.UTC(y, m - 1 - n, 1)); return d.toISOString().slice(0, 7); };
  const THANG_NAY = thangCua(HOM_NAY);
  const T1 = lui(THANG_NAY, 1);
  const T2 = lui(THANG_NAY, 2);
  let ky = await phai("ketoan", "GET", "/api/ledger/ky");
  if (ky.daKhoa.length > 0) { ghi(10, `đã có tháng khoá (${ky.daKhoa.join(", ")}), kế tiếp ${ky.keTiep ?? "—"}; bỏ qua`); return; }
  if (ky.keTiep === null) {
    // Dòng sổ sớm nhất đang ở tháng này ⇒ ghi một khoản thu có ngày phát sinh = ngày cuối tháng trước (chỉ Kế toán chọn được ngày khác hôm nay).
    const cuoiT1 = new Date(Date.UTC(Number(THANG_NAY.slice(0, 4)), Number(THANG_NAY.slice(5, 7)) - 1, 0)).toISOString().slice(0, 10);
    const don = await lapVaXacNhan({ khach: "Hoàng Gia Huy", ma: chonMa("BCT4", "BCT1"), nguoiLon: 2, ngayDi: vnNgay(4) });
    const so = Math.min(200000, don.total);
    await phai("ketoan", "POST", `/api/orders/${don.id}/payments`, { soTien: so, hinhThuc: "CASH", nguoiThu: "cong_ty", ngayPhatSinh: cuoiT1 }, 201);
    ghi(10, `đơn ${don.orderCode}: Kế toán ghi khoản thu ${dong(so)} đ ngày phát sinh ${cuoiT1}`);
    ky = await phai("ketoan", "GET", "/api/ledger/ky");
  }
  const r = await phai("ketoan", "POST", `/api/ledger/ky/${T2}/khoa`, { ghiChu: `Khoá sổ tháng ${T2.slice(5)}/${T2.slice(0, 4)} trên máy thử` }, 201);
  ghi(10, `khoá tháng ${T2} ⇒ đã khoá: ${r.daKhoa.join(", ")}; tháng khoá được kế tiếp: ${r.keTiep ?? "—"}${r.bangKiem ? " (có bảng kiểm)" : ""}${r.keTiep === T1 ? "" : ` — khác dự kiến ${T1}`}`);
});

// ---------------------------------------------------------------- tóm tắt
console.log("\n==== TÓM TẮT ====");
for (let i = 1; i <= 10; i++) {
  const ds = ketQua[i] ?? [];
  const hong = ds.some((c) => c.startsWith("KHÔNG xong"));
  console.log(`${i}) ${hong ? "CÓ LỖI" : "xong / đã có"} — ${ds.length} dòng`);
}
process.exit(Object.values(ketQua).flat().some((c) => c.startsWith("KHÔNG xong")) ? 1 : 0);
