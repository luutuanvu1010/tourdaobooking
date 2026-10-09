// CHUYỂN KHÁCH GIỮA HAI XE — route (ADR-0052 D4, D5c; ADR-0111; kế hoạch A5 T7, T8). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả
// (tests/audit/dieu-phoi-khung.mjs). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, DRIVER2, DRIVER_PARTNER, LOC, NGAY_SAU, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const xeNhan = (w: any, id: string, as = DRIVER, phamVi?: string) => w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}/xe-nhan${phamVi ? `?phamVi=${phamVi}` : ""}`, { as });

test("NT-A5-2 xe nhận: đúng năm khoá; chỉ chuyến cùng ngày, PLANNED / RUNNING, tài xế mở khác người gửi; ONBOARD chỉ RUNNING (Đ4); không khách / biển số / SĐT / mã đơn; 403 / 404", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    await chuyenSan(w, { taiXe: DRIVER, gio: "18:00", bd: "17:30", kt: "19:30", noiDon: "Khách sạn Ba" }); // cùng tài xế người gửi → không liệt kê
    await chuyenSan(w, { taiXe: DRIVER2, ngay: NGAY_SAU, gio: "09:00", bd: "08:30", kt: "10:30", noiDon: "Khách sạn Bốn" }); // khác ngày → không liệt kê
    const truoc = await xeNhan(w, a.id);
    assert.equal(truoc.status, 409, truoc.text);
    assert.equal(truoc.json.error.code, "ck_nguon_khong_chay");
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    const r = await xeNhan(w, a.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["phamVi", "xe"]);
    assert.equal(r.json.phamVi, "STOP");
    assert.deepEqual(r.json.xe.map((x: any) => Object.keys(x).sort()), [["choTrong", "diemSapToi", "maChuyen", "tenTaiXe", "tripId"]]);
    assert.deepEqual([r.json.xe[0].tripId, r.json.xe[0].choTrong, r.json.xe[0].diemSapToi], [b.id, 13, "Khách sạn Hai"]);
    assert.ok(r.json.xe[0].tenTaiXe.length > 0);
    const bienSo = (await chiTiet(w, b.id)).chuyen.xe.bienSo;
    for (const lo of ["Khách Dò Tìm 1", "0912345678", a.don.code, b.don.code, bienSo]) assert.ok(!r.text.includes(lo), `lộ "${lo}"`);
    // Cứu hộ: xe nhận phải đang chạy (ADR-0111 Đ4).
    assert.deepEqual((await xeNhan(w, a.id, DRIVER, "ONBOARD")).json.xe, []);
    denGio("13:20");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
    assert.deepEqual((await xeNhan(w, a.id, DRIVER, "ONBOARD")).json.xe.map((x: any) => x.tripId), [b.id]);
    assert.equal((await xeNhan(w, a.id, DRIVER, "XYZ")).status, 400);
    // Quyền: không có ô trip.transfer → 403 trước mọi truy vấn; có ô mà không lái chuyến (kể cả Toàn quyền) → 404.
    for (const as of [SALES, ACC, DRIVER_PARTNER]) assert.equal((await xeNhan(w, a.id, as)).status, 403, as);
    for (const as of [DRIVER2, SUP]) assert.equal((await xeNhan(w, a.id, as)).status, 404, as);
  } finally {
    tat();
  }
});

// ---- Gửi / Rút (kế hoạch A5 T7b, T8; NT-A5-3, -4, -9, -15, -21) -------------------------------------------------------------------------------------------
const VC = "/api/van-chuyen";
const gui = (w: any, tu: string, than: Record<string, unknown>, as = DRIVER) => w.call("POST", `${VC}/cuoc-cua-toi/${tu}/de-nghi`, { as, body: { requestId: uuid(), ...than } });
const cuuHo = (w: any, tu: string, than: Record<string, unknown>, as = SALES) => w.call("POST", `${VC}/chuyen/${tu}/cuu-ho`, { as, body: { requestId: uuid(), ...than } });
const rut = (w: any, rid: string, as = DRIVER, requestId = uuid()) => w.call("POST", `${VC}/de-nghi/${rid}/rut`, { as, body: { requestId } });
const mot = (w: any, sql: string, ...a: unknown[]) => w.sqlite.prepare(sql).get(...a) as any;
const tinCua = async (w: any, as: string, re: RegExp) => (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && re.test(x.cau));
/** A (DRIVER) đã xuất bến 12:40, B (DRIVER2) chưa chạy, cùng ngày. */
async function haiXe(w: any) {
  const a = await chuyenSan(w);
  const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
  denGio("12:40");
  assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
  return { a, b };
}

test("NT-A5-3 gửi STOP: 200, đề nghị Chờ đúng số khách, một sự kiện ở xe nhận (nguồn ở related), một dòng nhật ký, tin tới tài xế xe nhận; không lộ tên", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const r = await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["deNghi", "ketQua"]);
    assert.equal(r.json.ketQua, "DA_GUI");
    const d = r.json.deNghi;
    assert.deepEqual([d.trangThai, d.phamVi, d.soKhach, d.tuChuyenId, d.denChuyenId, d.diemId, d.tenDiem, d.noiGap], ["PENDING", "STOP", 2, a.id, b.id, a.diemDon, "Khách sạn Dò Tìm", null]);
    assert.equal(Date.parse(d.hanLuc) - Date.parse(d.guiLuc), 10 * 60_000, "hạn = giờ gửi + 10 phút (chính sách mặc định)");
    assert.equal(d.kiem, undefined, "DTO tài xế không kèm dòng kiểm");
    const q = mot(w, "SELECT status, pax_count, scope, from_stop_id, proposed_by_party_id, proposed_by_staff_id FROM vc_transfer_request WHERE id = ?", d.id);
    assert.deepEqual({ ...q }, { status: "PENDING", pax_count: 2, scope: "STOP", from_stop_id: a.diemDon, proposed_by_party_id: `pty-${DRIVER}`, proposed_by_staff_id: DRIVER });
    const ev = w.sqlite.prepare("SELECT trip_id, related_trip_id, count FROM vc_trip_event WHERE kind = 'TRANSFER_SENT'").all();
    assert.deepEqual(ev.map((x: any) => ({ ...x })), [{ trip_id: b.id, related_trip_id: a.id, count: 2 }]);
    const nk = w.sqlite.prepare("SELECT target_id, detail FROM audit_log WHERE action = 'trip_transfer_sent'").all() as any[];
    assert.equal(nk.length, 1);
    assert.equal(nk[0].target_id, b.id);
    for (const lo of ["Khách Dò Tìm 1", "0912345678"]) assert.ok(!r.text.includes(lo), `lộ "${lo}"`);
    for (const lo of ["Khách Dò Tìm", "0912345678", "Khách sạn Dò Tìm"]) assert.ok(!nk[0].detail.includes(lo), `nhật ký lộ "${lo}"`);
    assert.equal((await tinCua(w, DRIVER2, /đề nghị chuyển khách tới/)).length, 1, "tài xế xe nhận có tin");
    assert.equal((await tinCua(w, DRIVER, /đề nghị chuyển khách/)).length, 0, "người gửi không tự nhận tin");
    assert.equal((await tinCua(w, SALES, /đề nghị chuyển khách/)).length, 0, "văn phòng không nhận tin gửi");
  } finally {
    tat();
  }
});

test("NT-A5-4 gửi bị chặn: 409 có mã, không ghi gì (chưa chạy, khác ngày, cùng tài xế, điểm đã tới); không lái → 404 kể cả Toàn quyền; P4 gửi lại cùng điểm → được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    const cungTx = await chuyenSan(w, { taiXe: DRIVER, gio: "18:00", bd: "17:30", kt: "19:30", noiDon: "Khách sạn Ba" });
    const khacNgay = await chuyenSan(w, { taiXe: DRIVER2, ngay: NGAY_SAU, gio: "09:00", bd: "08:30", kt: "10:30", noiDon: "Khách sạn Bốn" });
    const soDong = () => mot(w, "SELECT count(*) AS n FROM vc_transfer_request").n + mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind LIKE 'TRANSFER%'").n;
    const ma = async (r: any, code: string) => { assert.equal(r.status, 409, r.text); assert.equal(r.json.error.code, code); };
    await ma(await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }), "ck_nguon_khong_chay");
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    await ma(await gui(w, a.id, { denChuyenId: khacNgay.id, phamVi: "STOP", diemId: a.diemDon }), "ck_khac_ngay");
    await ma(await gui(w, a.id, { denChuyenId: cungTx.id, phamVi: "STOP", diemId: a.diemDon }), "ck_cung_tai_xe");
    await ma(await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemTra }), "ck_diem_khong_cho");
    await ma(await gui(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng" } }), "ck_cuu_ho_chi_xe_dang_chay");
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP" })).status, 400);
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng", diaDiemId: LOC } })).status, 400, "hai nơi gặp");
    for (const as of [DRIVER2, SUP, SALES]) assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }, as)).status, 404, as);
    assert.equal(soDong(), 0, "không ghi gì");
    // P4 (G-A5-6): hai đề nghị Chờ cùng một điểm được phép.
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).status, 200);
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).status, 200);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_request WHERE status = 'PENDING'").n, 2);
    // Điểm đã tới → không nhờ đón điểm đó nữa.
    denGio("12:50");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    await ma(await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }), "ck_diem_khong_cho");
  } finally {
    tat();
  }
});

test("NT-A5-9 rút: chỉ tài xế xe nhờ, chỉ khi Chờ và chưa quá hạn; không tin; rút hai lần → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const id = (await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).json.deNghi.id;
    for (const as of [DRIVER2, SUP, SALES, ACC]) assert.equal((await rut(w, id, as)).status, 404, as);
    const r = await rut(w, id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.ketQua, r.json.deNghi.trangThai], ["DA_RUT", "WITHDRAWN"]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_WITHDRAWN' AND trip_id = ? AND related_trip_id = ?", b.id, a.id).n, 1);
    assert.equal((await tinCua(w, DRIVER2, /đề nghị chuyển khách tới/)).length, 1, "chỉ tin lúc gửi — rút không sinh tin");
    const lai = await rut(w, id);
    assert.equal(lai.status, 409);
    assert.equal(lai.json.error.code, "ck_de_nghi_da_dong");
    // Quá hạn (10 phút) → không rút (đề nghị đã hết giờ chờ).
    const id2 = (await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).json.deNghi.id;
    denGio("12:51");
    const muon = await rut(w, id2);
    assert.equal(muon.status, 409, muon.text);
    assert.equal(muon.json.error.code, "ck_het_gio");
    assert.equal((await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER })).json.guiDi.find((x: any) => x.id === id2).trangThai, "HET_GIO");
  } finally {
    tat();
  }
});

test("NT-A5-15 văn phòng gửi thay cứu hộ: chỉ ONBOARD (STOP → 403), người bấm ở proposed_by_staff_id, người gửi = tài xế xe nhờ; chữ nơi gặp che số, chỉ ở DTO đề nghị", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    denGio("13:35");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
    assert.equal((await cuuHo(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).status, 403);
    assert.equal((await cuuHo(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng" } }, ACC)).status, 403, "Kế toán không có trip.progress");
    const maCuuHo = uuid();
    const r = await w.call("POST", `${VC}/chuyen/${a.id}/cuu-ho`, { as: SALES, body: { requestId: maCuuHo, denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng km 12345678901" } } });
    assert.equal(r.status, 200, r.text);
    const lap = await w.call("POST", `${VC}/chuyen/${a.id}/cuu-ho`, { as: SALES, body: { requestId: maCuuHo, denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng km 12345678901" } } });
    assert.equal(lap.status, 200, `lệnh lặp đúng lệnh: ${lap.text}`);
    assert.equal(lap.json.deNghi.id, r.json.deNghi.id);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", maCuuHo).n, 1);
    const d = r.json.deNghi;
    assert.deepEqual([d.phamVi, d.soKhach, d.diemId, d.trangThai], ["ONBOARD", 2, null, "PENDING"]);
    assert.ok(!d.noiGap.includes("12345678901") && d.noiGap.startsWith("Cây xăng km"), d.noiGap);
    const q = mot(w, "SELECT proposed_by_party_id p, proposed_by_staff_id s FROM vc_transfer_request WHERE id = ?", d.id);
    assert.deepEqual([q.p, q.s], [`pty-${DRIVER}`, SALES]);
    const nk = mot(w, "SELECT detail FROM audit_log WHERE action = 'trip_transfer_sent'").detail as string;
    assert.ok(nk.includes("văn phòng gửi thay") && !nk.includes("Cây xăng"), nk);
    assert.equal((await tinCua(w, DRIVER2, /đề nghị chuyển khách tới/)).length, 1);
  } finally {
    tat();
  }
});

test("NT-A5-21 mã lệnh dùng lại: cùng mã + cùng thân → kết quả cũ, đúng một sự kiện; cùng mã khác phạm vi / khác lệnh / khác đề nghị → 409 request_id_reused", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const ma = uuid();
    const goi = (than: Record<string, unknown>) => w.call("POST", `${VC}/cuoc-cua-toi/${a.id}/de-nghi`, { as: DRIVER, body: { requestId: ma, ...than } });
    const r1 = await goi({ denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon });
    const r2 = await goi({ denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon });
    assert.equal(r1.status, 200, r1.text);
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.deNghi.id, r1.json.deNghi.id);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", ma).n, 1);
    const khacPhamVi = await goi({ denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng" } });
    assert.equal(khacPhamVi.status, 409, khacPhamVi.text);
    assert.equal(khacPhamVi.json.error.code, "request_id_reused");
    const khacLenh = await rut(w, r1.json.deNghi.id, DRIVER, ma);
    assert.equal(khacLenh.status, 409);
    assert.equal(khacLenh.json.error.code, "request_id_reused");
    // Rút lặp đúng lệnh → 200; mã rút dùng lại cho đề nghị KHÁC cùng cặp chuyến → 409 (G-A5-22).
    const id2 = (await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).json.deNghi.id;
    const maRut = uuid();
    assert.equal((await rut(w, r1.json.deNghi.id, DRIVER, maRut)).status, 200);
    assert.equal((await rut(w, r1.json.deNghi.id, DRIVER, maRut)).status, 200);
    const cheo = await rut(w, id2, DRIVER, maRut);
    assert.equal(cheo.status, 409);
    assert.equal(cheo.json.error.code, "request_id_reused");
  } finally {
    tat();
  }
});
