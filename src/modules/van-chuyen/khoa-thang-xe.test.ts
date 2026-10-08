// Khoá sổ tháng (ADR-0080 phần D1; đặc tả 2026-10-08 §8, sửa N2) ở CHI PHÍ XE THUÊ qua ROUTE THẬT trên khung thử (tests/audit/dieu-phoi-khung.mjs): sáu đường ghi
// `vc_trip_cost_line` (đảo khi đổi chuyến, đảo khi huỷ, chụp giá, Kế toán điều chỉnh / đảo tay / lấy lại giá bảng / giá thoả thuận) — dòng ĐẢO và ngày MẶC ĐỊNH sang
// hôm nay, ngày TỰ CHỌN và CHỤP GIÁ vào tháng đã khoá bị chặn bằng 409 cùng một câu; và Review Focus 3: tháng bị khoá GIỮA lúc route kiểm và lúc ghi ⇒ trigger chặn,
// lỗi dịch ra đúng câu của tháng vừa khoá, KHÔNG 500, ở cả bốn nơi bắt lỗi (Kế toán, lô tạo / sửa / huỷ chuyến).
//
// Đồng hồ giả: dựng thế giới LÚC 10/09/2026 (tạo chuyến, bảng giá, dòng chi phí tháng 9 qua route thật), rồi đưa đồng hồ sang 08/10/2026 để khoá được tháng 9.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, SALES, batDongHo, chiTiet, denGio, nhaXeKhung, setup, taiXeNhaXe, uuid, vnMs, xe, xeNhaXe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const CAU_09 = "Tháng 09/2026 đã khoá sổ — ghi vào tháng đang mở (điều chỉnh, có lý do)";
const HOM_NAY = "2026-10-08";
const NGAY_9 = "2026-09-20";

type W = any;
const khoaThang = (p: string) => `INSERT INTO ky_period_close (period, closed_at, closed_by, note, created_at, created_by, updated_at, updated_by) VALUES ('${p}', '2026-10-01T00:00:00.000Z', 'kt', NULL, '2026-10-01T00:00:00.000Z', 'kt', '2026-10-01T00:00:00.000Z', 'kt')`;
/** Chạy `truoc()` đúng một lần ngay trước lô đầu tiên có câu khớp `re` (mô phỏng "người khác khoá tháng giữa lúc route đọc và lúc route ghi"). */
function chenTruocLo(w: W, re: RegExp, truoc: () => void): void {
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => re.test(s.sql))) { w.env.DB.batch = goc; truoc(); }
    return goc(stmts);
  };
}
/** Hàm gieo bảng giá / tuyến / cỡ chép từ tien-xe-route.test.ts (khuôn dùng chung của khung). */
async function tuyenMoi(w: W, ten: string): Promise<string> {
  const r = await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten } });
  assert.equal(r.status, 201, r.text);
  return r.json.tuyen.find((t: any) => t.ten === ten).ma;
}
async function coMoi(w: W, tu: number, den: number): Promise<string> {
  const r = await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: tu, denSoKhach: den } });
  assert.equal(r.status, 201, r.text);
  return r.json.coXe.find((c: any) => c.tuSoKhach === tu && c.denSoKhach === den && c.dangDung).ma;
}
async function themGia(w: W, body: Record<string, unknown>, as = ACC) {
  const r = await w.call("POST", "/api/van-chuyen/bang-gia", { as, body: { requestId: uuid(), tuyen: null, coXe: null, soTien: 1_200_000, tuNgay: "2026-09-01", denNgay: null, ghiChu: null, thayDongId: null, ...body } });
  assert.equal(r.status, 201, r.text);
  return r;
}

/** Nhà xe + tài xế + xe 16 / 29 chỗ, hai tuyến, hai cỡ; giá từ 01/09/2026: NT-CR × C16 = 1.200.000, NT-CR × C29 = 1.000.000; NT-DL không có giá nào. */
async function nen(w: W) {
  const nx = nhaXeKhung(w);
  const tx = taiXeNhaXe(w, nx);
  const x16 = xeNhaXe(w, nx, 16);
  const x29 = xeNhaXe(w, nx, 29);
  const crt = await tuyenMoi(w, "Nha Trang – sân bay Cam Ranh");
  const dl = await tuyenMoi(w, "Nha Trang – Đà Lạt");
  const c16 = await coMoi(w, 10, 16);
  const c29 = await coMoi(w, 17, 29);
  await themGia(w, { nhaXePartyId: nx, tuyen: crt, coXe: c16, soTien: 1_200_000 });
  await themGia(w, { nhaXePartyId: nx, tuyen: crt, coXe: c29, soTien: 1_000_000 });
  return { nx, tx, x16, x29, crt, dl, c16, c29 };
}
async function taoThue(w: W, v: { xe: string; taiXe: string; tuyen?: string | null; ngay?: string; bd?: string; kt?: string; requestId?: string }) {
  const ngay = v.ngay ?? NGAY_9;
  return w.call("POST", "/api/van-chuyen/chuyen", {
    as: SALES,
    body: {
      requestId: v.requestId ?? uuid(), xeId: v.xe, taiXePartyId: v.taiXe, ...(v.tuyen === undefined ? {} : { tuyen: v.tuyen }),
      batDau: { ngay, gio: v.bd ?? "12:30" }, ketThuc: { ngay, gio: v.kt ?? "15:00" },
    },
  });
}
const sua = async (w: W, id: string, body: Record<string, unknown>, as = SALES) => {
  const c = await chiTiet(w, id);
  return w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
};
const huy = async (w: W, id: string) => {
  const c = await chiTiet(w, id);
  return w.call("POST", `/api/van-chuyen/chuyen/${id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
};
const chiPhi = (w: W, id: string) => w.call("GET", `/api/van-chuyen/chuyen/${id}/chi-phi`, { as: ACC });
const ghiCp = async (w: W, id: string, duoi: string, body: Record<string, unknown>) => {
  const pb = body.phienBanChiPhi ?? (await chiPhi(w, id)).json.chiPhi.phienBanChiPhi;
  return w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/${duoi}`, { as: ACC, body: { requestId: uuid(), phienBanChiPhi: pb, ...body } });
};
const khoa = (w: W, period: string) => w.call("POST", `/api/ledger/ky/${period}/khoa`, { as: ACC, body: {} });
/** Dòng chi phí của chuyến theo thứ tự ghi: [loại, số tiền, ngày phát sinh]. */
const dongCp = (w: W, id: string): [string, number, string][] =>
  w.q("SELECT kind, amount, occurred_date d FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", id).map((r: any) => [r.kind, r.amount, r.d]);
const demDong = (w: W): number => Number(w.q("SELECT count(*) n FROM vc_trip_cost_line")[0].n);
const demChuyen = (w: W): number => Number(w.q("SELECT count(*) n FROM vc_trip")[0].n);
const chenCp = (w: W, trip: string, kind: string, amount: number, reason: string, ngay: string) => {
  const carrier = w.q("SELECT carrier_party_id c FROM vc_trip WHERE id = ?", trip)[0].c;
  w.sqlite.prepare(`INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, occurred_date, cmd_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), trip, carrier, kind, amount, reason, ngay, uuid(), new Date().toISOString(), new Date().toISOString());
};
/** Đếm số lô có câu ghi chi phí xe được GỬI đi từ lúc gọi hàm — để chứng minh route chặn TRƯỚC khi gửi lô (lớp kiểm thứ nhất), không đợi trigger. */
function demLoChiPhi(w: W): () => number {
  let n = 0;
  const goc = w.env.DB.batch;
  w.env.DB.batch = async (stmts: { sql: string }[]) => {
    if (stmts.some((s) => /INSERT INTO vc_trip_cost_line/.test(s.sql))) n++;
    return goc(stmts);
  };
  return () => n;
}
const laCau09 = (r: { status: number; json: any; text: string }, ten: string) => {
  assert.equal(r.status, 409, `${ten}: ${r.text}`);
  assert.equal(r.json?.error.code, "period_closed", ten);
  assert.equal(r.json?.error.message, CAU_09, ten);
};

/** Thế giới dựng lúc 10/09/2026 (chuyến + dòng chi phí tháng 9 qua route thật) rồi đồng hồ sang 08/10/2026. `khoaTruoc` ⇒ khoá luôn tháng 9 bằng route Kế toán. */
async function theGioi(dung: (w: W, n: Awaited<ReturnType<typeof nen>>) => Promise<void>, khoaTruoc = true): Promise<W> {
  const w = setup();
  const n = await nen(w);
  await dung(w, n);
  denGio("06:00", HOM_NAY);
  if (khoaTruoc) {
    const k = await khoa(w, "2026-09");
    assert.equal(k.status, 201, k.text);
    assert.deepEqual(k.json.daKhoa, ["2026-09"]);
  }
  return w;
}
async function voiDongHo(f: () => Promise<void>): Promise<void> {
  const tat = batDongHo(vnMs("2026-09-10", "06:00"));
  try { await f(); } finally { tat(); }
}

test("ca 1 (COST_REVERSE — đổi chuyến): dòng gốc tháng 9 đã khoá ⇒ dòng đảo mang HÔM NAY; chụp mới ở tháng mở ⇒ 200", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => {
    id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; // SNAPSHOT 1.200.000 ngày 20/09
    chenCp(ww, id, "ADJUSTMENT", 150_000, "CPX_PHU_THU_CHO", "2026-09-22");
  });
  const s = await sua(w, id, { batDau: { ngay: "2026-10-15", gio: "12:30" }, ketThuc: { ngay: "2026-10-15", gio: "15:00" } });
  assert.equal(s.status, 200, s.text);
  assert.deepEqual(dongCp(w, id), [
    ["SNAPSHOT", 1_200_000, NGAY_9], ["ADJUSTMENT", 150_000, "2026-09-22"],
    ["REVERSAL", -150_000, HOM_NAY], ["REVERSAL", -1_200_000, HOM_NAY], ["SNAPSHOT", 1_200_000, "2026-10-15"],
  ], "hai dòng đảo mang hôm nay (tháng 9 đã khoá); dòng chụp mới mang ngày chạy mới (tháng 10 còn mở)");
}));

test("ca 2 (COST_REVERSE — huỷ chuyến): dòng gốc tháng 9 đã khoá ⇒ lô huỷ đảo hết, dòng đảo mang HÔM NAY, tổng 0, chuyến CANCELLED", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => {
    id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    chenCp(ww, id, "ADJUSTMENT", -200_000, "CPX_NHAP_SAI", "2026-09-22");
  });
  const h = await huy(w, id);
  assert.equal(h.status, 200, h.text);
  assert.deepEqual(dongCp(w, id), [
    ["SNAPSHOT", 1_200_000, NGAY_9], ["ADJUSTMENT", -200_000, "2026-09-22"], ["REVERSAL", 200_000, HOM_NAY], ["REVERSAL", -1_200_000, HOM_NAY],
  ]);
  assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "CANCELLED");
}));

test("ca 3 (COST_SNAPSHOT): đổi sang xe thuê / tạo chuyến mới mà NGÀY CHẠY thuộc tháng 9 đã khoá ⇒ 409 cả lệnh, không dòng chi phí, không đổi chuyến", () => voiDongHo(async () => {
  let id = "";
  let nenThue: Awaited<ReturnType<typeof nen>> | undefined;
  const w = await theGioi(async (ww, n) => {
    nenThue = n;
    id = (await taoThue(ww, { xe: xe(ww, 16), taiXe: `pty-${DRIVER}` })).json.chuyen.id; // xe công ty: chưa có dòng chi phí nào
  });
  const n = nenThue!;
  const truocDong = demDong(w);
  const soLo = demLoChiPhi(w);
  const xeCu = w.q("SELECT vehicle_id v FROM vc_trip WHERE id = ?", id)[0].v;
  // Quản trị + phá lệ (chuyến đã qua giờ, đổi xe bị khoá theo mốc) ⇒ lý do DUY NHẤT còn lại là tháng đã khoá.
  const doi = await sua(w, id, { xeId: n.x16, taiXePartyId: n.tx, tuyen: n.crt, phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM);
  laCau09(doi, "đổi sang xe thuê");
  assert.equal(soLo(), 0, "kế hoạch chặn TRƯỚC khi gửi lô");
  assert.equal(demDong(w), truocDong, "không dòng chi phí nào");
  assert.equal(w.q("SELECT vehicle_id v FROM vc_trip WHERE id = ?", id)[0].v, xeCu, "chuyến giữ nguyên xe");
  // Tạo chuyến xe thuê mới ngày 25/09: cả lô tạo chuyến bị từ chối, không chuyến mới.
  const truocChuyen = demChuyen(w);
  const tao = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, ngay: "2026-09-25", bd: "08:00", kt: "10:00" });
  laCau09(tao, "tạo chuyến");
  assert.equal(soLo(), 0, "kế hoạch chặn TRƯỚC khi gửi lô");
  assert.equal(demChuyen(w), truocChuyen);
  assert.equal(demDong(w), truocDong);
  // Cùng lệnh nhưng ngày chạy ở tháng MỞ (15/10) ⇒ chụp bình thường.
  const ok = await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, ngay: "2026-10-15" });
  assert.equal(ok.status, 201, ok.text);
  assert.deepEqual(dongCp(w, ok.json.chuyen.id), [["SNAPSHOT", 1_200_000, "2026-10-15"]]);
}));

test("ca 4 (COST_ADJUST_KT — ngày tự chọn): Kế toán chọn ngày thuộc tháng đã khoá ⇒ 409; chọn ngày tháng mở ⇒ 201", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => { id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; });
  const truoc = demDong(w);
  const soLo = demLoChiPhi(w);
  laCau09(await ghiCp(w, id, "dieu-chinh", { soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null, ngay: "2026-09-25" }), "điều chỉnh ngày 25/09");
  assert.equal(soLo(), 0, "route chặn TRƯỚC khi gửi lô");
  assert.equal(demDong(w), truoc, "bị chặn không để lại dòng");
  const ok = await ghiCp(w, id, "dieu-chinh", { soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null, ngay: "2026-10-03" });
  assert.equal(ok.status, 201, ok.text);
  assert.deepEqual(dongCp(w, id).at(-1), ["ADJUSTMENT", 50_000, "2026-10-03"]);
}));

test("ca 5 (COST_ADJUST_KT — ngày mặc định): ngày chạy ở tháng đã khoá ⇒ ngày mặc định là HÔM NAY (201), không 409; tháng mở ⇒ vẫn là ngày chạy", () => voiDongHo(async () => {
  let a = "";
  let b = "";
  const w = await theGioi(async (ww, n) => {
    a = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; // ngày chạy 20/09
    b = (await taoThue(ww, { xe: n.x29, taiXe: n.tx, tuyen: n.crt, ngay: "2026-10-12", bd: "09:00", kt: "11:00" })).json.chuyen.id; // ngày chạy 12/10 (tạo lúc 10/09, giá từ 01/09 mở)
  });
  const dc = await ghiCp(w, a, "dieu-chinh", { soTien: 70_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null });
  assert.equal(dc.status, 201, dc.text);
  assert.deepEqual(dongCp(w, a).at(-1), ["ADJUSTMENT", 70_000, HOM_NAY]);
  const dc2 = await ghiCp(w, b, "dieu-chinh", { soTien: 30_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null });
  assert.equal(dc2.status, 201, dc2.text);
  assert.deepEqual(dongCp(w, b).at(-1), ["ADJUSTMENT", 30_000, "2026-10-12"], "tháng 10 còn mở ⇒ giữ ngày chạy");
}));

test("ca 6 (COST_REVERSE_KT): Kế toán đảo tay dòng gốc tháng 9 đã khoá ⇒ dòng đảo mang HÔM NAY (201), kể cả đảo giá bảng", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => {
    id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id;
    chenCp(ww, id, "ADJUSTMENT", 150_000, "CPX_PHU_THU_CHO", "2026-09-22");
  });
  const cp = (await chiPhi(w, id)).json.chiPhi;
  const dieuChinh = cp.dong.find((d: any) => d.loai === "ADJUSTMENT");
  const giaBang = cp.dong.find((d: any) => d.loai === "SNAPSHOT");
  const d1 = await ghiCp(w, id, "dao", { dongId: dieuChinh.id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
  assert.equal(d1.status, 201, d1.text);
  const d2 = await ghiCp(w, id, "dao", { dongId: giaBang.id, lyDo: "CPX_NHAP_SAI", ghiChu: null });
  assert.equal(d2.status, 201, d2.text);
  assert.deepEqual(dongCp(w, id), [
    ["SNAPSHOT", 1_200_000, NGAY_9], ["ADJUSTMENT", 150_000, "2026-09-22"], ["REVERSAL", -150_000, HOM_NAY], ["REVERSAL", -1_200_000, HOM_NAY],
  ]);
}));

test("ca 7 (COST_SNAPSHOT_KT, COST_AGREED_KT): lấy lại giá bảng / giá thoả thuận cho chuyến có ngày chạy ở tháng đã khoá ⇒ 409, không dòng nào", () => voiDongHo(async () => {
  let a = "";
  let b = "";
  let nx = "";
  let dl = "";
  let c16 = "";
  const w = await theGioi(async (ww, n) => {
    nx = n.nx; dl = n.dl; c16 = n.c16;
    a = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.dl })).json.chuyen.id; // NT-DL chưa có giá ⇒ chưa có dòng chi phí (thiếu giá)
    b = (await taoThue(ww, { xe: n.x29, taiXe: taiXeNhaXe(ww, n.nx), bd: "16:00", kt: "17:00" })).json.chuyen.id; // không tuyến ⇒ thiếu giá (tài xế riêng: không vướng khoảng nghỉ)
  });
  assert.equal(demDong(w), 0, "hai chuyến đều thiếu giá");
  // Quản trị thêm giá NT-DL × C16 từ 01/09 ⇒ "lấy lại giá bảng" cho chuyến a CÓ giá khớp (ngày chạy 20/09): chỉ tháng khoá chặn.
  await themGia(w, { nhaXePartyId: nx, tuyen: dl, coXe: c16, soTien: 900_000, tuNgay: "2026-09-01" }, ADM);
  const soLo = demLoChiPhi(w);
  laCau09(await ghiCp(w, a, "chup-lai", {}), "lấy lại giá bảng");
  laCau09(await ghiCp(w, b, "gia-thoa-thuan", { soTien: 1_350_000, ghiChu: "đã chốt với anh Hùng" }), "giá thoả thuận");
  assert.equal(soLo(), 0, "route chặn TRƯỚC khi gửi lô");
  assert.equal(demDong(w), 0, "không dòng chi phí nào");
}));

test("ca 8 (Review Focus 3 — Kế toán): tháng 9 bị khoá GIỮA lúc route kiểm và lúc ghi ⇒ trigger chặn, 409 đúng câu của tháng 9, không 500, không dòng mới", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => { id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; }, false); // world RIÊNG: chưa khoá tháng nào
  assert.equal(Number(w.q("SELECT count(*) n FROM ky_period_close")[0].n), 0);
  const truoc = demDong(w);
  chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")));
  const r = await ghiCp(w, id, "dieu-chinh", { soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null, ngay: "2026-09-25" });
  laCau09(r, "điều chỉnh, tháng khoá giữa chừng");
  assert.equal(Number(w.q("SELECT count(*) n FROM ky_period_close")[0].n), 1, "lần khoá giả đã xảy ra đúng một lần");
  assert.equal(demDong(w), truoc, "lô bị huỷ cả khối");
}));

test("ca 8b (Review Focus 3 — đảo tay): tháng 9 khoá GIỮA lúc route kiểm và lúc ghi dòng đảo ⇒ 409 đúng câu, không 500, không dòng đảo", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => { id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; }, false);
  const truoc = demDong(w);
  const gocId = (await chiPhi(w, id)).json.chiPhi.dong[0].id;
  chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")));
  laCau09(await ghiCp(w, id, "dao", { dongId: gocId, lyDo: "CPX_NHAP_SAI", ghiChu: null }), "đảo tay, tháng khoá giữa chừng");
  assert.equal(demDong(w), truoc);
}));

test("ca 9 (Review Focus 3 — lô huỷ chuyến): tháng 9 khoá giữa lúc đọc và lúc ghi ⇒ 409 đúng câu, không 500, chuyến vẫn PLANNED, không dòng đảo", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => { id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; }, false);
  const truoc = demDong(w);
  chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")));
  laCau09(await huy(w, id), "huỷ chuyến");
  assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "PLANNED");
  assert.equal(demDong(w), truoc);
}));

test("ca 10 (Review Focus 3 — lô sửa chuyến): tháng 9 khoá giữa chừng ⇒ 409 đúng câu, không 500, chuyến giữ nguyên tuyến, không dòng nào mới", () => voiDongHo(async () => {
  let id = "";
  let dl = "";
  const w = await theGioi(async (ww, n) => { dl = n.dl; id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; }, false);
  const truoc = demDong(w);
  const tuyenCu = w.q("SELECT route_code r FROM vc_trip WHERE id = ?", id)[0].r;
  chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")));
  laCau09(await sua(w, id, { tuyen: dl }), "sửa chuyến");
  assert.equal(w.q("SELECT route_code r FROM vc_trip WHERE id = ?", id)[0].r, tuyenCu);
  assert.equal(demDong(w), truoc);
}));

test("ca 11 (Review Focus 3 — lô tạo chuyến): tháng 9 khoá giữa lúc đọc và lúc ghi ⇒ 409 đúng câu, không 500, không chuyến mới, không dòng chi phí", () => voiDongHo(async () => {
  let nenThue: Awaited<ReturnType<typeof nen>> | undefined;
  const w = await theGioi(async (_ww, n) => { nenThue = n; }, false);
  const n = nenThue!;
  const truocChuyen = demChuyen(w);
  const truocDong = demDong(w);
  chenTruocLo(w, /INSERT INTO vc_trip_cost_line/, () => w.sqlite.exec(khoaThang("2026-09")));
  laCau09(await taoThue(w, { xe: n.x16, taiXe: n.tx, tuyen: n.crt, ngay: "2026-09-25", bd: "08:00", kt: "10:00" }), "tạo chuyến");
  assert.equal(demChuyen(w), truocChuyen);
  assert.equal(demDong(w), truocDong);
}));

test("gửi lại cùng requestId SAU khi tháng bị khoá vẫn trả kết quả cũ (200), không 409: kiểm tháng khoá đứng SAU kiểm 'đã ghi'", () => voiDongHo(async () => {
  let id = "";
  const w = await theGioi(async (ww, n) => { id = (await taoThue(ww, { xe: n.x16, taiXe: n.tx, tuyen: n.crt })).json.chuyen.id; }, false);
  const rid = uuid();
  const pb = (await chiPhi(w, id)).json.chiPhi.phienBanChiPhi;
  const body = { requestId: rid, phienBanChiPhi: pb, soTien: 50_000, lyDo: "CPX_CAU_DUONG", ghiChu: null, ngay: "2026-09-25" };
  const mot = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ACC, body });
  assert.equal(mot.status, 201, mot.text);
  assert.equal((await khoa(w, "2026-09")).status, 201);
  const lai = await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ACC, body });
  assert.equal(lai.status, 200, lai.text);
  assert.equal(dongCp(w, id).length, 2, "lệnh lặp không ghi thêm");
}));

// ---- Hàng rào tĩnh (khuôn billing/lo-dich-khoa-ky.test.ts): không đường ghi chi phí xe nào được thêm mà quên khoá tháng ---------------------------------------
const docMa = (tep: string): string =>
  readFileSync(new URL(`./${tep}`, import.meta.url), "utf8").split("\n").filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join("\n");
const TEP_MA = readdirSync(new URL(".", import.meta.url)).filter((t) => t.endsWith(".ts") && !t.endsWith(".test.ts"));

test("hàng rào tĩnh 1: đúng SÁU câu INSERT INTO vc_trip_cost_line (một nơi: tien-xe-repo.ts) và mỗi hằng chỉ được dùng ở tien-xe-lo.ts / tien-xe-chi-phi.ts", () => {
  const soCau = TEP_MA.map((t) => [t, (docMa(t).match(/INSERT INTO vc_trip_cost_line/g) ?? []).length] as const).filter(([, n]) => n > 0);
  assert.deepEqual(soCau, [["tien-xe-repo.ts", 6]], "câu ghi chi phí xe mới = một ĐƯỜNG GHI mới: thêm dòng vào bảng đường ghi của Task 8 (ngày lấy từ đâu, luật khi tháng khoá) và một ca vào khoa-thang-xe.test.ts");
  for (const hang of ["COST_REVERSE", "COST_SNAPSHOT", "COST_ADJUST_KT", "COST_REVERSE_KT", "COST_SNAPSHOT_KT", "COST_AGREED_KT"]) {
    const dung = TEP_MA.filter((t) => t !== "tien-xe-repo.ts" && new RegExp(`\\b${hang}\\b`).test(docMa(t)));
    assert.ok(dung.length > 0, `${hang}: không thấy nơi dùng — đổi tên hằng?`);
    for (const t of dung) assert.ok(["tien-xe-lo.ts", "tien-xe-chi-phi.ts"].includes(t), `${hang} được dùng ở ${t}: đường ghi mới phải qua khoá tháng`);
  }
});

test("hàng rào tĩnh 2: mỗi nơi bắt lỗi của lô có dòng chi phí xe dịch lỗi khoá tháng (loiKhoaThangXe ĐẦU catch) — Kế toán, tạo / sửa / huỷ chuyến", () => {
  const chiPhi = docMa("tien-xe-chi-phi.ts");
  assert.equal((chiPhi.match(/\bdb\.batch\(/g) ?? []).length, 1, "tien-xe-chi-phi.ts: một lô ghi duy nhất (chayGhi)");
  assert.equal((chiPhi.match(/\bloiKhoaThangXe\(db, e,/g) ?? []).length, 1, "tien-xe-chi-phi.ts: chayGhi dịch lỗi khoá tháng");
  const lenh = docMa("dieu-phoi-lenh.ts");
  assert.equal((lenh.match(/\bchiPhi: kh\b/g) ?? []).length, (lenh.match(/\bchayLoChiPhiXe\(db, lo,/g) ?? []).length, "dieu-phoi-lenh.ts: mỗi lô mang chiPhi (sửa, huỷ) chạy qua chayLoChiPhiXe");
  assert.equal((lenh.match(/\bchiPhi: kh\b/g) ?? []).length, 2, "dieu-phoi-lenh.ts: đúng hai lô mang chi phí (sửa chuyến, huỷ chuyến) — thêm lô thứ ba thì thêm vào đây");
  assert.equal((lenh.match(/\bloiKhoaThangXe\(db, e,/g) ?? []).length, 1, "dieu-phoi-lenh.ts: chayLoChiPhiXe dịch lỗi khoá tháng");
  const index = docMa("index.ts");
  assert.equal((index.match(/\bchiPhi: kh\b/g) ?? []).length, (index.match(/\bloiKhoaThangXe\(env\.DB, e,/g) ?? []).length, "index.ts: lô tạo chuyến mang chiPhi dịch lỗi khoá tháng");
  assert.ok((index.match(/\bchiPhi: kh\b/g) ?? []).length > 0, "không thấy lô tạo chuyến — đổi tên biến?");
});
