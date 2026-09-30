// NHẮC "GỌI BÁO KHÁCH" KHI GIỜ HẸN ĐỔI — route + lô + quyền (ADR-0051 GB1, GB2; Task A-GB; TC-GB-2, 4, 5, 6, 7, 8, 9, 9b, 9c). Chạy CẢ ứng dụng trên SQLite thật
// (tests/audit/harness.mjs), đồng hồ giả (ngày chạy 2027-03-11 — tests/audit/dieu-phoi-khung.mjs). Tên khách GIẢ có đánh dấu ("Khách Dò Tìm", năm 1990/1991).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, FIELD, INTERN, NGAY, PARTNER, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, don, setup, taoChuyen, tienDo, uuid, xe, xepHet,
} from "../../../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";
import { addDays } from "../../shared/vn-date.ts";

const SALES2 = "12121212-1212-4121-8121-121212121212"; // người phụ trách đơn (không phải người lập)
const SALES3 = "13131313-1313-4131-8131-131313131313"; // Bán hàng khác
const dem = (w: any, sql: string, ...a: unknown[]): number => w.q(sql, ...a)[0].n;
const moc = (w: any, leg: string) => w.q("SELECT seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time FROM vc_leg_appt_ack WHERE leg_id = ? ORDER BY seq", leg);
const nhac = async (w: any, as = SALES) => (await w.call("GET", "/api/van-chuyen/nhac-goi-khach", { as })).json;
const leg = async (w: any, orderId: string) => (await w.call("GET", `/api/orders/${orderId}`, { as: SALES })).json.order.services[0].legs[0];
/** Người lập (Bán hàng) đổi giờ đón của chặng trên đơn đã xác nhận. */
async function doiGio(w: any, orderId: string, gio: string, ngay = NGAY) {
  const l = await leg(w, orderId);
  const r = await w.call("PUT", `/api/orders/${orderId}/legs/${l.id}`, {
    as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: l.pickupPlace, dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "" } },
  });
  assert.equal(r.status, 200, r.text);
}
const baoGoi = (w: any, legId: string, body: Record<string, unknown>, as = SALES) =>
  w.call("POST", `/api/van-chuyen/chang/${legId}/da-goi-bao`, { as, body: { requestId: uuid(), ...body } });
const boDanh = (w: any, legId: string, body: Record<string, unknown>, as = SALES) =>
  w.call("POST", `/api/van-chuyen/chang/${legId}/bo-danh-dau-goi-bao`, { as, body: { requestId: uuid(), ...body } });
function khung() {
  const w = setup();
  seedStaff(w.sqlite, { id: SALES2, phone: "0900000012", name: "Phụ Trách", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SALES3, phone: "0900000013", name: "Bán Khác", perms: ["SALES"] });
  return w;
}

test("TC-GB-2: xếp chặng LẦN ĐẦU → đúng một dòng XEP seq 1 = giờ hẹn đọc trong request; tách đoàn sang chuyến thứ hai → KHÔNG thêm dòng", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const d = await don(w, { soNguoi: 3, gio: "13:00" });
    const c1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const r = await w.call("POST", `/api/van-chuyen/chuyen/${c1.chuyen.id}/phan-bo`, { as: SALES, body: { version: c1.chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 2 }] } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(moc(w, d.legId).map((x: any) => ({ ...x })), [{ seq: 1, kind: "XEP", appt_date: NGAY, appt_time: "13:00", prev_appt_date: null, prev_appt_time: null }]);
    const c2 = await taoChuyen(w, { xe: xe(w), taiXe: "pty-66666666-6666-4666-8666-666666666668" });
    await xepHet(w, c2, d, 1);
    assert.equal(moc(w, d.legId).length, 1, "tách đoàn: chặng đã có mốc — không chụp lại");
  } finally {
    tat();
  }
});

test("TC-GB-3 ca bản vẽ + TC-GB-4 KHÔNG TÁI MỐC: đổi 13:00 → 13:15 (vẫn trong khung chuyến) → có mục; dời sang chuyến khác, cập nhật điểm theo đơn → mục VẪN '13:00 → 13:15'; rút → không mục; xếp lại → mục lại", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w, { soNguoi: 2 });
    await doiGio(w, a.don.id, "13:15");
    let ds = await nhac(w);
    assert.equal(ds.muc.length, 1);
    assert.deepEqual([ds.muc[0].gioHenDoi.cu, ds.muc[0].gioHenDoi.moi, ds.muc[0].gioHenDoi.maChuyen], [{ ngay: NGAY, gio: "13:00" }, { ngay: NGAY, gio: "13:15" }, [a.ma]]);
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    assert.ok(!JSON.stringify(lich).includes("GIO_HEN_DOI"), "lịch theo ngày KHÔNG lặp mục (danh sách riêng)");
    // Dời cả hai suất sang chuyến khác (MOVED) → không chụp lại mốc.
    const b = await taoChuyen(w, { xe: xe(w), taiXe: "pty-66666666-6666-4666-8666-666666666668" });
    const ct = await chiTiet(w, a.id);
    const bb = await chiTiet(w, b.chuyen.id);
    const doi = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/doi`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), denChuyenId: b.chuyen.id, denVersion: bb.chuyen.version, suatIds: a.suat } });
    assert.equal(doi.status, 200, doi.text);
    ds = await nhac(w);
    assert.deepEqual([ds.muc[0].gioHenDoi.cu.gio, ds.muc[0].gioHenDoi.moi.gio, ds.muc[0].gioHenDoi.maChuyen], ["13:00", "13:15", [b.chuyen.ma]], "dời: mục vẫn 13:00 → 13:15");
    // Cập nhật điểm theo đơn (STOP_CHANGED — đổi nơi đón): vẫn không tái mốc.
    const l = await leg(w, a.don.id);
    const sua = await w.call("PUT", `/api/orders/${a.don.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { direction: "OUT", pickupDate: NGAY, pickupTime: "13:15", pickupLocationId: null, pickupPlace: "Khách sạn Mới Dò Tìm", dropoffLocationId: l.dropoffLocationId, dropoffPlace: "" } } });
    assert.equal(sua.status, 200, sua.text);
    const cb = await chiTiet(w, b.chuyen.id);
    const cn = await w.call("POST", `/api/van-chuyen/chuyen/${b.chuyen.id}/cap-nhat-diem`, { as: SALES, body: { version: cb.chuyen.version, requestId: uuid() } });
    assert.equal(cn.status, 200, cn.text);
    assert.equal(cn.json.daCapNhat, 2);
    assert.deepEqual((await nhac(w)).muc.map((m: any) => [m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio]), [["13:00", "13:15"]], "cập nhật điểm: mục vẫn 13:00 → 13:15");
    assert.equal(moc(w, a.don.legId).length, 1);
    // Rút hết khỏi xe → không mục; xếp lại → mục "13:00 → 13:15" (nhắc thừa một lần, không nhắc thiếu).
    const cb2 = await chiTiet(w, b.chuyen.id);
    const rut = await w.call("POST", `/api/van-chuyen/chuyen/${b.chuyen.id}/rut`, { as: SALES, body: { version: cb2.chuyen.version, requestId: uuid(), suatIds: cb2.suat.map((s: any) => s.id) } });
    assert.equal(rut.status, 200, rut.text);
    assert.deepEqual((await nhac(w)).muc, []);
    await xepHet(w, { chuyen: { id: b.chuyen.id } }, a.don, 2);
    assert.deepEqual((await nhac(w)).muc.map((m: any) => [m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio]), [["13:00", "13:15"]]);
  } finally {
    tat();
  }
});

test("TC-GB-5 + TC-GB-8: 'Đã gọi báo' → 200, dòng DA_GOI (seq 2, giờ mới, giờ trước) + nhật ký cùng id, orderId NULL, detail danh sách trắng; mục hết; V2 có daGoiBao; lệnh lặp → 200 không thêm dòng; phiên bản / giờ lệch → 409 gio_hen_vua_doi; hết mục → 409 khong_con_can_goi; đổi giờ nữa → mục lại", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w);
    await doiGio(w, a.don.id, "13:15");
    const v0 = w.q("SELECT version FROM vc_trip WHERE id = ?", a.id)[0].version;
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 2, gioMoi: { ngay: NGAY, gio: "13:15" } })).json.error.code, "gio_hen_vua_doi");
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:10" } })).json.error.code, "gio_hen_vua_doi");
    const rid = uuid();
    const r = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: { requestId: rid, phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["daGoiBao", "gioHenDoi", "legId", "maDon"]);
    assert.equal(r.json.gioHenDoi, null);
    assert.deepEqual({ ...r.json.daGoiBao, luc: undefined }, { cu: { ngay: NGAY, gio: "13:00" }, moi: { ngay: NGAY, gio: "13:15" }, luc: undefined, nguoiBam: "An", phienBan: 2, boDuoc: true });
    assert.deepEqual(moc(w, a.don.legId).map((x: any) => [x.seq, x.kind, x.appt_time, x.prev_appt_time]), [[1, "XEP", "13:00", null], [2, "DA_GOI", "13:15", "13:00"]]);
    const dong = w.q("SELECT id FROM vc_leg_appt_ack WHERE leg_id = ? AND seq = 2", a.don.legId)[0].id;
    const nk = w.q("SELECT action, order_id, target_type, target_id, detail FROM audit_log WHERE id = ?", dong)[0];
    assert.deepEqual({ ...nk }, { action: "trip_appt_called", order_id: null, target_type: "trip", target_id: a.id, detail: `${a.don.code} · chiều đi · giờ hẹn đón 13:00 → 13:15 · ${a.ma}` });
    assert.equal(w.q("SELECT version FROM vc_trip WHERE id = ?", a.id)[0].version, v0, "không chạm version chuyến");
    assert.deepEqual((await nhac(w)).muc, [], "mục hết");
    const ct = await chiTiet(w, a.id);
    assert.deepEqual(ct.goiBao.map((g: any) => [g.legId, g.gioHenDoi, g.daGoiBao?.phienBan]), [[a.don.legId, null, 2]]);
    // Lệnh lặp cùng requestId → 200, không dòng mới; bấm lại (requestId mới) → không còn mục → 409.
    assert.equal((await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: { requestId: rid, phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } } })).status, 200);
    assert.equal(dem(w, "SELECT count(*) n FROM vc_leg_appt_ack WHERE leg_id = ?", a.don.legId), 2);
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 2, gioMoi: { ngay: NGAY, gio: "13:15" } })).json.error.code, "khong_con_can_goi");
    // Đổi giờ lần nữa → mục hiện lại "giờ đã báo → giờ mới"; chuyến ĐANG CHẠY còn khách chờ vẫn bấm được.
    await doiGio(w, a.don.id, "13:30");
    assert.deepEqual((await nhac(w)).muc.map((m: any) => [m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio, m.gioHenDoi.phienBan]), [["13:15", "13:30", 2]]);
    denGio("12:40");
    assert.equal((await tienDo(w, "van-phong", a.id, "xuat-ben")).status, 200);
    const v1 = w.q("SELECT version FROM vc_trip WHERE id = ?", a.id)[0].version;
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 2, gioMoi: { ngay: NGAY, gio: "13:30" } })).status, 200, "chuyến đang chạy");
    assert.equal(w.q("SELECT version FROM vc_trip WHERE id = ?", a.id)[0].version, v1);
  } finally {
    tat();
  }
});

test("TC-GB-6: quyền — người lập / người phụ trách / Quản trị / Toàn quyền 200; Bán hàng khác, Kế toán 403 (baoDuoc false ở danh sách); thứ tự mã 403 → 404 → 403 cố định; HDV, Đối tác, Thực tập, Tài xế → 403 ở cổng", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    // Đơn do SALES lập, người phụ trách = SALES2.
    const d = await don(w, { soNguoi: 1, handler: SALES2 });
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, c, d, 1);
    await doiGio(w, d.id, "13:15");
    const muc = async (as: string) => (await nhac(w, as)).muc[0].gioHenDoi.baoDuoc;
    assert.deepEqual([await muc(SALES), await muc(SALES2), await muc(SALES3), await muc(ACC), await muc(ADM)], [true, true, false, false, true]);
    for (const as of [SALES3, ACC]) {
      const r = await baoGoi(w, d.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } }, as);
      assert.equal(r.status, 403, `${as}: ${r.text}`);
    }
    assert.equal((await baoGoi(w, uuid(), { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } })).status, 404, "chặng lạ → 404");
    assert.equal((await baoGoi(w, uuid(), {}, ACC)).status, 403, "Kế toán: 403 TRƯỚC 404");
    for (const as of [FIELD, PARTNER, INTERN, DRIVER]) {
      for (const [m, p] of [["GET", "/api/van-chuyen/nhac-goi-khach"], ["POST", `/api/van-chuyen/chang/${d.legId}/da-goi-bao`], ["POST", `/api/van-chuyen/chang/${d.legId}/bo-danh-dau-goi-bao`]]) {
        assert.equal((await w.call(m, p, { as, body: m === "GET" ? undefined : {} })).status, 403, `${as} ${p}`);
      }
    }
    const r2 = await baoGoi(w, d.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } }, SALES2);
    assert.equal(r2.status, 200, `người phụ trách (không phải người lập): ${r2.text}`);
    // Đơn huỷ: Kế toán / Bán hàng khác vẫn 403 (không 409); người lập → 409 khong_con_can_goi.
    const d2 = await don(w, { soNguoi: 1 });
    await xepHet(w, c, d2, 1);
    await doiGio(w, d2.id, "13:20");
    assert.equal((await w.call("POST", `/api/orders/${d2.id}/status`, { as: ADM, body: { status: "cancelled", reason: "Khách huỷ" } })).status, 200);
    assert.equal((await baoGoi(w, d2.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:20" } }, ACC)).status, 403);
    assert.equal((await baoGoi(w, d2.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:20" } }, SALES3)).status, 403);
    assert.equal((await baoGoi(w, d2.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:20" } })).json.error.code, "khong_con_can_goi");
    // Quản trị bỏ đánh dấu dòng người phụ trách vừa bấm; Toàn quyền bấm lại — cả hai được (any).
    assert.equal((await boDanh(w, d.legId, { phienBan: 2 }, ADM)).status, 200);
    assert.equal((await baoGoi(w, d.legId, { phienBan: 3, gioMoi: { ngay: NGAY, gio: "13:15" } }, SUP)).status, 200);
  } finally {
    tat();
  }
});

test("TC-GB-7: 'Bỏ đánh dấu' → dòng BO_DANH_DAU khôi phục đúng giờ trước, mục hiện lại 'A → B'; phiên bản không phải DA_GOI cuối → 409; khách đã lên xe → 409", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w, { soNguoi: 1 });
    await doiGio(w, a.don.id, "13:15");
    assert.equal((await boDanh(w, a.don.legId, { phienBan: 1 })).json.error.code, "gio_hen_vua_doi", "dòng cuối là XEP");
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } })).status, 200);
    const r = await boDanh(w, a.don.legId, { phienBan: 2 });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(moc(w, a.don.legId).map((x: any) => [x.seq, x.kind, x.appt_time, x.prev_appt_time]), [[1, "XEP", "13:00", null], [2, "DA_GOI", "13:15", "13:00"], [3, "BO_DANH_DAU", "13:00", "13:15"]]);
    assert.deepEqual((await nhac(w)).muc.map((m: any) => [m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio, m.gioHenDoi.phienBan]), [["13:00", "13:15", 3]]);
    assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'trip_appt_call_undone'")[0].detail, /bỏ đánh dấu đã gọi báo giờ hẹn đón 13:00 → 13:15/);
    // Bấm lại → hết mục; khách lên xe → bỏ đánh dấu 409.
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 3, gioMoi: { ngay: NGAY, gio: "13:15" } })).status, 200);
    denGio("12:40");
    await tienDo(w, "van-phong", a.id, "xuat-ben");
    denGio("13:12");
    await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`);
    await tienDo(w, "van-phong", a.id, `phan-bo/${a.suat[0]}/don`);
    assert.equal((await boDanh(w, a.don.legId, { phienBan: 4 })).json.error.code, "khong_con_can_goi");
  } finally {
    tat();
  }
});

test("TC-GB-9 / 9b: danh sách nhắc đúng tập khoá, không tên khách / năm sinh / SĐT / người lập; khối goiBao của V2 không mang tên; DTO tài xế không có khoá mới; nhật ký không tên", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w);
    await doiGio(w, a.don.id, "13:15");
    const ds = await nhac(w);
    assert.deepEqual(Object.keys(ds).sort(), ["den", "muc", "tu"]);
    assert.deepEqual(Object.keys(ds.muc[0]).sort(), ["chieu", "gioHenDoi", "legId", "ngayChuyen", "noiDon", "orderCode"]);
    assert.deepEqual(Object.keys(ds.muc[0].gioHenDoi).sort(), ["baoDuoc", "cu", "maChuyen", "moi", "phienBan"]);
    const CAM = /Khách Dò Tìm|199[01]|0912345678|Khách Liên Hệ|"(nguoi|fullName|birthYear|hoTen|namSinh|staffId|nguoiLap)"|\b[LT]:[0-9a-f-]{8,}/;
    assert.doesNotMatch(JSON.stringify(ds), CAM);
    await baoGoi(w, a.don.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } });
    const ct = await chiTiet(w, a.id);
    assert.doesNotMatch(JSON.stringify(ct.goiBao), CAM);
    assert.deepEqual(Object.keys(ct.goiBao[0].daGoiBao).sort(), ["boDuoc", "cu", "luc", "moi", "nguoiBam", "phienBan"]);
    for (const d of w.q("SELECT detail FROM audit_log WHERE action LIKE 'trip_appt_%'")) assert.doesNotMatch(d.detail, CAM);
    const tx = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER })).text;
    assert.doesNotMatch(tx, /gioHenDoi|daGoiBao|phienBan|goiBao/, "tài xế không có khoá mới");
  } finally {
    tat();
  }
});

test("TC-GB-9c: phạm vi danh sách nhắc theo NGÀY CHUYẾN — hôm nay + 14 có, + 15 không; ngày đón dời xa (+ 9 — trần nghiệp vụ \"7 ngày sau ngày đi\") trên chuyến ngày kia vẫn có; Kế toán 200", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const n14 = addDays(NGAY, 14);
    const n15 = addDays(NGAY, 15);
    const a = await chuyenSan(w, { ngay: n14 });
    const b = await chuyenSan(w, { ngay: n15, taiXe: "66666666-6666-4666-8666-666666666668" });
    await doiGio(w, a.don.id, "13:15", addDays(n14, 5)); // ngày đón dời ra NGOÀI khoảng 14 ngày — chuyến vẫn trong khoảng → vẫn có mục
    await doiGio(w, b.don.id, "13:15", n15);
    const c = await chuyenSan(w, { ngay: addDays(NGAY, 2), xe: xe(w) });
    await doiGio(w, c.don.id, "13:00", addDays(NGAY, 9));
    const ds = await nhac(w, ACC);
    assert.deepEqual([ds.tu, ds.den], [addDays(NGAY, -1), n14]);
    assert.deepEqual(ds.muc.map((m: any) => [m.legId, m.ngayChuyen, m.gioHenDoi.moi.ngay]).sort(), [[a.don.legId, n14, addDays(n14, 5)], [c.don.legId, addDays(NGAY, 2), addDays(NGAY, 9)]].sort());
    assert.ok(ds.muc.every((m: any) => m.gioHenDoi.baoDuoc === false), "Kế toán thấy, không nút");
  } finally {
    tat();
  }
});

// Kiểm độc lập K2a T2 — ADR-0051 bước 4: "requestId đã có dòng → 200, trả kết quả của LẦN ĐẦU". Phản hồi lệnh lặp dựng từ ĐÚNG dòng mốc mang requestId đó,
// không đọc trạng thái mới nhất (lệnh khác chen vào giữa không làm đổi phản hồi lệnh lặp). Ca giờ hẹn / tập chuyến đổi giữa hai lần gửi: hai bài GA-59 dưới.
test("K2a T2: lệnh lặp 'Đã gọi báo' / 'Bỏ đánh dấu' (cùng requestId) trả ĐÚNG phản hồi lần đầu dù lệnh khác đã chen vào; không thêm dòng", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w);
    await doiGio(w, a.don.id, "13:15");
    const dem0 = () => dem(w, "SELECT count(*) n FROM vc_leg_appt_ack WHERE leg_id = ?", a.don.legId);
    // A: "Đã gọi báo" R1 → lưu phản hồi lần đầu.
    const r1 = uuid();
    const lan1 = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: { requestId: r1, phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } } });
    assert.equal(lan1.status, 200, lan1.text);
    assert.notEqual(lan1.json.daGoiBao, null);
    // B chen vào: "Bỏ đánh dấu" R2 → lưu phản hồi lần đầu của R2.
    denGio("06:05");
    const r2 = uuid();
    const lan2 = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.equal(lan2.status, 200, lan2.text);
    assert.notEqual(lan2.json.gioHenDoi, null);
    const soDong = dem0();
    // Gọi lại R1 → đúng phản hồi lần đầu (dấu "đã gọi báo" của dòng R1), không phải trạng thái hiện tại (mục đã hiện lại).
    const lap1 = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: { requestId: r1, phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } } });
    assert.equal(lap1.status, 200, lap1.text);
    assert.deepEqual(lap1.json, lan1.json, "lệnh lặp R1 = phản hồi lần đầu");
    // Chen tiếp: "Đã gọi báo" R3 → gọi lại R2 → đúng phản hồi lần đầu của "Bỏ đánh dấu".
    denGio("06:10");
    const r3 = uuid();
    assert.equal((await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: { requestId: r3, phienBan: 3, gioMoi: { ngay: NGAY, gio: "13:15" } } })).status, 200);
    const lap2 = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.equal(lap2.status, 200, lap2.text);
    assert.deepEqual(lap2.json, lan2.json, "lệnh lặp R2 = phản hồi lần đầu");
    assert.equal(dem0(), soDong + 1, "lệnh lặp không thêm dòng (chỉ R3 thêm)");
  } finally {
    tat();
  }
});

// GA-59 (chủ lần 16 "Sửa cho khớp ADR" — ADR-0051 bước 4): lệnh lặp "Bỏ đánh dấu" trả ĐÚNG phản hồi lần đầu kể cả khi giữa hai lần gửi giờ hẹn đổi thêm và
// tập chuyến chở khách chờ đổi. Kết quả lần đầu (`moi`, `maChuyen` — hoặc "không còn mục") lưu trên CHÍNH dòng mốc (`bo_gio_hen_doi`, 0043).
test("GA-59: lệnh lặp 'Bỏ đánh dấu' = đúng phản hồi lần đầu dù giờ hẹn đổi thêm (trước VÀ sau lần đầu) và khách đã dời sang chuyến khác; bản chụp trên dòng không có tên", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w, { soNguoi: 1 });
    await doiGio(w, a.don.id, "13:15");
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } })).status, 200);
    await doiGio(w, a.don.id, "13:30"); // đổi SAU khi đã gọi báo, TRƯỚC khi bỏ đánh dấu → "mới" của lần đầu là 13:30, không phải giờ lúc gọi báo (13:15)
    const r2 = uuid();
    const lan = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.equal(lan.status, 200, lan.text);
    assert.deepEqual(lan.json, {
      legId: a.don.legId, maDon: a.don.code, daGoiBao: null,
      gioHenDoi: { cu: { ngay: NGAY, gio: "13:00" }, moi: { ngay: NGAY, gio: "13:30" }, phienBan: 3, maChuyen: [a.ma], baoDuoc: true },
    });
    // Giữa hai lần gửi: giờ hẹn đổi thêm + khách dời sang chuyến khác.
    await doiGio(w, a.don.id, "13:45");
    const b = await taoChuyen(w, { xe: xe(w), taiXe: "pty-66666666-6666-4666-8666-666666666668" });
    const ct = await chiTiet(w, a.id);
    const bb = await chiTiet(w, b.chuyen.id);
    const doi = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/doi`, {
      as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), denChuyenId: b.chuyen.id, denVersion: bb.chuyen.version, suatIds: a.suat },
    });
    assert.equal(doi.status, 200, doi.text);
    assert.deepEqual((await nhac(w)).muc.map((m: any) => [m.gioHenDoi.moi.gio, m.gioHenDoi.maChuyen]), [["13:45", [b.chuyen.ma]]], "chống bài rỗng: trạng thái hiện tại ĐÃ khác lần đầu");
    const lap = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.equal(lap.status, 200, lap.text);
    assert.deepEqual(lap.json, lan.json, "lệnh lặp = phản hồi lần đầu");
    const chup = w.q("SELECT bo_gio_hen_doi AS s FROM vc_leg_appt_ack WHERE request_id = ?", r2)[0].s;
    assert.deepEqual(JSON.parse(chup), { moi: { ngay: NGAY, gio: "13:30" }, maChuyen: [a.ma] }, "bản chụp chỉ giờ + mã chuyến");
    assert.ok(!/Dò Tìm|1990|1991|0900/.test(chup), "không tên / năm sinh / SĐT");
    assert.deepEqual(w.q("SELECT bo_gio_hen_doi AS s FROM vc_leg_appt_ack WHERE leg_id = ? AND kind <> 'BO_DANH_DAU'", a.don.legId).map((x: any) => x.s), [null, null],
      "chỉ dòng BO_DANH_DAU mang bản chụp");
  } finally {
    tat();
  }
});

test("GA-59: 'Bỏ đánh dấu' khi giờ hẹn đã về đúng giờ cũ → lần đầu KHÔNG còn mục (gioHenDoi null, bản chụp JSON null) — lệnh lặp y hệt dù giờ đổi tiếp", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w, { soNguoi: 1 });
    await doiGio(w, a.don.id, "13:15");
    assert.equal((await baoGoi(w, a.don.legId, { phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } })).status, 200);
    await doiGio(w, a.don.id, "13:00"); // về lại giờ lúc xếp
    const r2 = uuid();
    const lan = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.equal(lan.status, 200, lan.text);
    assert.deepEqual(lan.json, { legId: a.don.legId, maDon: a.don.code, gioHenDoi: null, daGoiBao: null });
    await doiGio(w, a.don.id, "13:20");
    assert.equal((await nhac(w)).muc.length, 1, "chống bài rỗng: nay lại có mục");
    const lap = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/bo-danh-dau-goi-bao`, { as: SALES, body: { requestId: r2, phienBan: 2 } });
    assert.deepEqual([lap.status, lap.json], [200, lan.json], "lệnh lặp = phản hồi lần đầu");
    assert.equal(w.q("SELECT bo_gio_hen_doi AS s FROM vc_leg_appt_ack WHERE request_id = ?", r2)[0].s, "null");
  } finally {
    tat();
  }
});

// R-P30 (GA-67 — cùng nguyên tắc chủ lần 16 "Sửa cho khớp ADR", ADR-0051 bước 4): phản hồi LẦN ĐẦU "Đã gọi báo" dựng từ CHÍNH dòng mốc vừa ghi — cùng đường với
// lệnh lặp. Khung thử chạy yêu cầu gần như lần lượt nên bài dựng ĐUA CHẮC CHẮN bằng một CHẶN ở `env.DB.batch` (khuôn bài đua LC-01 — xep-gan-ten.test.ts): ngay
// sau lô "Đã gọi báo", TRƯỚC khi route đọc lại để trả lời, chen vào (1) đổi giờ hẹn, (2) người khác bấm "Bỏ đánh dấu" dòng vừa ghi.
test("R-P30 (GA-67): 'Đã gọi báo' — lệnh khác chen giữa lô và lần đọc sau lô (đổi giờ hẹn + người khác bỏ đánh dấu) → phản hồi lần đầu = dấu của CHÍNH lệnh này; lệnh lặp y hệt", async () => {
  const tat = batDongHo();
  try {
    const w = khung();
    const a = await chuyenSan(w, { soNguoi: 1 });
    await doiGio(w, a.don.id, "13:15");
    const goc = w.env.DB.batch;
    let chen = 0;
    w.env.DB.batch = async (stmts: any[]) => {
      const kq = await goc(stmts);
      if (chen === 0 && /^\s*INSERT INTO vc_leg_appt_ack/.test(stmts[0]?.sql ?? "") && stmts[0].args[3] === "DA_GOI") {
        chen++;
        await doiGio(w, a.don.id, "13:40");
        const bo = await boDanh(w, a.don.legId, { phienBan: 2 }, ADM);
        assert.equal(bo.status, 200, bo.text);
      }
      return kq;
    };
    const r1 = uuid();
    const than = { requestId: r1, phienBan: 1, gioMoi: { ngay: NGAY, gio: "13:15" } };
    let lan: any;
    try {
      lan = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: than });
    } finally {
      w.env.DB.batch = goc;
    }
    assert.equal(chen, 1, "chống bài rỗng: đã chen đúng một lần sau lô 'Đã gọi báo'");
    assert.equal(lan.status, 200, lan.text);
    assert.deepEqual(moc(w, a.don.legId).map((x: any) => [x.seq, x.kind]), [[1, "XEP"], [2, "DA_GOI"], [3, "BO_DANH_DAU"]], "chống bài rỗng: trạng thái mốc ĐÃ khác ngay sau lô");
    assert.equal(lan.json.gioHenDoi, null);
    assert.deepEqual({ ...lan.json.daGoiBao, luc: undefined }, {
      cu: { ngay: NGAY, gio: "13:00" }, moi: { ngay: NGAY, gio: "13:15" }, luc: undefined, nguoiBam: lan.json.daGoiBao.nguoiBam, phienBan: 2, boDuoc: true,
    }, "kết quả của CHÍNH lệnh: dấu 'đã gọi báo 13:00 → 13:15', phiên bản 2");
    assert.ok(lan.json.daGoiBao.nguoiBam, "nhãn người bấm = người ghi dòng");
    assert.equal(lan.json.maDon, a.don.code);
    const lap = await w.call("POST", `/api/van-chuyen/chang/${a.don.legId}/da-goi-bao`, { as: SALES, body: than });
    assert.deepEqual([lap.status, lap.json], [200, lan.json], "lệnh lặp = phản hồi lần đầu");
  } finally {
    tat();
  }
});

