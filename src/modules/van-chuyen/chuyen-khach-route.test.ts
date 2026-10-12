// CHUYỂN KHÁCH GIỮA HAI XE — route (ADR-0052 D4, D5c; ADR-0111; kế hoạch A5 T7, T8). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả
// (tests/audit/dieu-phoi-khung.mjs). Tên khách, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, DRIVER_PARTNER, FIELD, LOC, NGAY, NGAY_SAU, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, nhaXeKhung, setup, taoChuyen, tienDo, uuid, xe, xeNhaXe } from "../../../tests/audit/dieu-phoi-khung.mjs";

// Kiểm định kỳ mức fail của vận chuyển (scripts/audit-checks.mjs — kể cả R-VC-31…35, R-VC-SUA-1) trên CSDL sau ca: dữ liệu do chính các lô thật ghi phải sạch.
const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
function kiemDinhKySach(w: any) {
  const vc = CHECKS.filter((c) => c.code.startsWith("R-VC-") && c.level === "fail");
  assert.ok(vc.some((c) => c.code === "R-VC-35"), "chống bài rỗng: có các câu chuyển khách");
  for (const c of vc) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${c.code} có vi phạm`);
  }
}
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
    for (const as of [SALES, ACC]) assert.equal((await xeNhan(w, a.id, as)).status, 403, as);
    for (const as of [DRIVER2, SUP, DRIVER_PARTNER]) assert.equal((await xeNhan(w, a.id, as)).status, 404, `${as}: có ô trip.transfer (DRIVER_PARTNER từ nới N4) mà không lái chuyến này`);
    kiemDinhKySach(w);
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
    kiemDinhKySach(w);
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
    // VỪA-1 (kiểm độc lập 12/10, ADR-0052:218, :248; golden TH08-4A/4B): không có ô trip.transfer → 403 ở cổng đầu; có ô mà không lái chuyến (kể cả Toàn quyền) → 404.
    for (const as of [SALES, ACC, ADM]) assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }, as)).status, 403, as);
    for (const as of [DRIVER2, SUP]) assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }, as)).status, 404, as);
    assert.equal(soDong(), 0, "không ghi gì");
    // P4 (G-A5-6): hai đề nghị Chờ cùng một điểm được phép.
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).status, 200);
    assert.equal((await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).status, 200);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_request WHERE status = 'PENDING'").n, 2);
    // Điểm đã tới → không nhờ đón điểm đó nữa.
    denGio("12:50");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    await ma(await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }), "ck_diem_khong_cho");
    kiemDinhKySach(w);
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
    for (const as of [SALES, ACC, ADM]) assert.equal((await rut(w, id, as)).status, 403, `${as}: không có ô trip.transfer`);
    for (const as of [DRIVER2, SUP]) assert.equal((await rut(w, id, as)).status, 404, as);
    const r = await rut(w, id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.ketQua, r.json.deNghi.trangThai], ["DA_RUT", "WITHDRAWN"]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_WITHDRAWN' AND trip_id = ? AND related_trip_id = ?", b.id, a.id).n, 1);
    assert.equal((await tinCua(w, DRIVER2, /đề nghị chuyển khách tới/)).length, 1, "chỉ tin lúc gửi — rút không sinh tin");
    const lai = await rut(w, id);
    assert.equal(lai.status, 409);
    assert.equal(lai.json.error.code, "ck_de_nghi_da_dong");
    // Quá hạn (10 phút): danh sách hiện "Hết giờ chờ" (tính lúc đọc, chưa ghi); bấm Rút lúc đó → chính lệnh đóng Hết hạn (MQ-08), không rút.
    const id2 = (await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).json.deNghi.id;
    denGio("12:51");
    const cuaToi = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER })).json;
    assert.equal(cuaToi.guiDi.find((x: any) => x.id === id2).trangThai, "HET_GIO");
    // T13: lý do Không nhận (nhóm TU_CHOI_NHAN) đi kèm danh sách của tài xế — màn tài xế chọn lý do từ đây.
    assert.deepEqual(cuaToi.lyDo.map((x: any) => x.nhom), ["TU_CHOI_NHAN", "TU_CHOI_NHAN", "TU_CHOI_NHAN", "TU_CHOI_NHAN"]);
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id2).status, "PENDING", "đọc không ghi");
    const muon = await rut(w, id2);
    assert.equal(muon.status, 200, muon.text);
    assert.deepEqual([muon.json.ketQua, muon.json.deNghi.trangThai], ["HET_HAN", "EXPIRED"]);
    kiemDinhKySach(w);
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
    // T14: danh sách xe nhận cho văn phòng gửi thay (chỉ xe ĐANG CHẠY khác, cùng ngày; không xe của chính tài xế xe nhờ) — trip.progress; xe nhờ phải đang chạy.
    const dsXe = await w.call("GET", `${VC}/chuyen/${a.id}/xe-nhan`, { as: SALES });
    assert.equal(dsXe.status, 200, dsXe.text);
    assert.deepEqual(dsXe.json.xe.map((x: any) => x.tripId), [b.id]);
    assert.deepEqual(Object.keys(dsXe.json.xe[0]).sort(), ["choTrong", "diemSapToi", "maChuyen", "tenTaiXe", "tripId"], "đúng năm khoá như danh sách của tài xế");
    assert.equal((await w.call("GET", `${VC}/chuyen/${a.id}/xe-nhan`, { as: ACC })).status, 403, "Kế toán không có trip.progress");
    assert.equal((await w.call("GET", `${VC}/chuyen/${b.id}/xe-nhan`, { as: SALES })).json.xe.length, 1, "xe nhận cũng xem được danh sách của mình (A đang chạy)");
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
    kiemDinhKySach(w);
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
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

// ---- Nhận / Không nhận / Hết hạn / Leo thang / Duyệt / Bác (kế hoạch A5 T7b, T8; NT-A5-5..8, -10..12, -14, -20, -21, -24, -29) ------------------------------
const nhan = (w: any, rid: string, as = DRIVER2, requestId = uuid()) => w.call("POST", `${VC}/de-nghi/${rid}/nhan`, { as, body: { requestId } });
const khongNhan = (w: any, rid: string, lyDo: string | null, as = DRIVER2, requestId = uuid()) =>
  w.call("POST", `${VC}/de-nghi/${rid}/khong-nhan`, { as, body: { requestId, ...(lyDo ? { lyDo } : {}) } });
const duyet = (w: any, rid: string, lyDo: string | null, as = ADM, requestId = uuid()) =>
  w.call("POST", `${VC}/de-nghi/${rid}/duyet`, { as, body: { requestId, ...(lyDo ? { lyDo } : {}) } });
const bac = (w: any, rid: string, lyDo: string | null, as = ADM, requestId = uuid()) =>
  w.call("POST", `${VC}/de-nghi/${rid}/bac`, { as, body: { requestId, ...(lyDo ? { lyDo } : {}) } });
const tat409 = (r: any, code: string) => {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, code, r.text);
};
const ds = (w: any, sql: string, ...a: unknown[]) => (w.sqlite.prepare(sql).all(...a) as any[]).map((x) => ({ ...x }));
/** A (DRIVER) xuất bến 12:40; B (DRIVER2) xuất bến 13:35 — xe nhận đang chạy: mốc tối thiểu không xét (ADR-0052:77). */
async function xeNhanChay(w: any) {
  const { a, b } = await haiXe(w);
  denGio("13:35");
  assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
  // Đồng hồ giả đứng yên: tiến một phút để suất mở khi xác nhận không trùng ĐÚNG mili-giây bản chụp xuất bến của B (R-VC-4 đếm suất mở "≤ lúc chụp").
  denGio("13:36");
  return { a, b };
}
const guiDiem = async (w: any, a: any, b: any) => {
  const r = await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon });
  assert.equal(r.status, 200, r.text);
  return r.json.deNghi.id as string;
};

test("NT-A5-6 nhận, máy tự xác nhận (xe nhận đang chạy): suất nguồn TRANSFERRED, suất đích giữ trạng thái + transfer_id, điểm đón thêm trước điểm trả ghép, điểm nguồn MOVED, bản chốt, đề nghị khác cùng điểm VOID, một sự kiện, tin tới xe nhờ; lệnh lặp; đề nghị đã huỷ → da_huy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    const id2 = await guiDiem(w, a, b); // P4: hai đề nghị Chờ cùng điểm
    for (const as of [DRIVER, SUP, DRIVER_PARTNER]) assert.equal((await nhan(w, id, as)).status, 404, `${as}: không lái xe nhận (kể cả Toàn quyền; DRIVER_PARTNER có ô từ nới N4)`);
    for (const as of [SALES, ACC, ADM, FIELD]) assert.equal((await nhan(w, id, as)).status, 403, `${as}: không có ô trip.transfer`);
    const ma = uuid();
    const r = await nhan(w, id, DRIVER2, ma);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.ketQua, r.json.deNghi.trangThai], ["DA_CHUYEN", "CONFIRMED"]);
    const q = mot(w, "SELECT status, decided_mode, decided_by_party_id, decided_cmd_id, closed_cmd_id FROM vc_transfer_request WHERE id = ?", id);
    assert.deepEqual([q.status, q.decided_mode, q.decided_by_party_id, q.closed_cmd_id], ["CONFIRMED", "MAY", `pty-${DRIVER2}`, q.decided_cmd_id]);
    const cmd = q.decided_cmd_id as string;
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_check WHERE transfer_id = ? AND cmd_id = ?", id, cmd).n, 11, "đủ 11 dòng kiểm của lần bấm");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_check WHERE transfer_id = ? AND ket_qua = 'KHONG_DAT'", id).n, 0);
    assert.deepEqual(ds(w, "SELECT close_reason, closed_transfer_id, closed_cmd_id FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER'", a.id),
      [{ close_reason: "TRANSFERRED", closed_transfer_id: id, closed_cmd_id: cmd }, { close_reason: "TRANSFERRED", closed_transfer_id: id, closed_cmd_id: cmd }]);
    const moB = ds(w, "SELECT id, status, board_stop_id, alight_stop_id, added_after_departure, opened_cmd_id FROM vc_trip_allocation WHERE trip_id = ? AND transfer_id = ? AND valid_to_at IS NULL", b.id, id);
    assert.equal(moB.length, 2);
    for (const s of moB) assert.deepEqual([s.status, s.added_after_departure, s.opened_cmd_id, s.alight_stop_id], ["WAITING", 1, cmd, b.diemTra], "điểm trả bến ghép điểm có sẵn của B");
    const diemB = ds(w, "SELECT id, seq, kind, status, place_key, added_while_running FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", b.id);
    assert.equal(diemB.length, 3, "thêm MỘT điểm đón, điểm trả ghép");
    const len = diemB.find((d) => d.id === moB[0].board_stop_id)!;
    assert.equal(moB[1].board_stop_id, len.id);
    assert.deepEqual([len.kind, len.status, len.added_while_running], ["PICKUP", "PENDING", 1]);
    assert.equal(len.place_key, mot(w, "SELECT place_key FROM vc_trip_stop WHERE id = ?", a.diemDon).place_key, "cùng nơi với điểm nguồn");
    assert.ok(len.seq < diemB.find((d) => d.id === b.diemTra)!.seq, "đón trước trả");
    assert.equal(mot(w, "SELECT status FROM vc_trip_stop WHERE id = ?", a.diemDon).status, "MOVED");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_manifest WHERE trip_id = ? AND check_id IS NULL AND added_after_departure = 1", b.id).n, 2, "bản chốt thêm sau xuất bến");
    assert.deepEqual({ ...mot(w, "SELECT status, closed_cmd_id, decided_cmd_id FROM vc_transfer_request WHERE id = ?", id2) }, { status: "VOID", closed_cmd_id: cmd, decided_cmd_id: null });
    assert.deepEqual(ds(w, "SELECT trip_id, related_trip_id, count FROM vc_trip_event WHERE kind = 'TRANSFER_CONFIRMED'"), [{ trip_id: b.id, related_trip_id: a.id, count: 2 }]);
    const nk = ds(w, "SELECT target_id, detail FROM audit_log WHERE action = 'trip_transfer_confirmed'");
    assert.equal(nk.length, 1);
    for (const lo of ["Khách Dò Tìm", "0912345678", "Khách sạn Dò Tìm"]) assert.ok(!nk[0].detail.includes(lo), `nhật ký lộ "${lo}"`);
    for (const lo of ["Khách Dò Tìm", "0912345678"]) assert.ok(!r.text.includes(lo), `phản hồi lộ "${lo}"`);
    assert.equal((await tinCua(w, DRIVER, /Xe nhận đã nhận khách/)).length, 1, "tài xế xe nhờ có tin");
    assert.equal((await tinCua(w, DRIVER2, /Khách đã chuyển sang/)).length, 0, "người bấm không tự nhận tin");
    const lap = await nhan(w, id, DRIVER2, ma);
    assert.equal(lap.status, 200, lap.text);
    assert.equal(lap.json.ketQua, "DA_CHUYEN");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", ma).n, 1);
    tat409(await nhan(w, id2), "da_huy");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("TH08-4A/4B/4C chạm route THẬT (VỪA-1, kiểm độc lập 12/10): Bán hàng / Quản trị bấm Nhận thay → đúng mã HTTP của tệp vàng (403, không có ô trip.transfer); Toàn quyền → 404 (có ô nhưng không lái xe nhận); không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const vang = JSON.parse(readFileSync(new URL("../../../golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json", import.meta.url), "utf8"));
    const buoc = (ma: string) => vang.cac_tinh_huong.flatMap((t: any) => t.cac_buoc).find((b: any) => b.ma === ma)?.dap_an.http as number;
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    const dongGhi = () => mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind LIKE 'TRANSFER%'").n;
    const truoc = dongGhi();
    const ca = [["TH08-4A-BAN-HANG-NHAN-THAY", SALES], ["TH08-4B-QUAN-TRI-NHAN-THAY", ADM], ["TH08-4C-TOAN-QUYEN-NHAN-THAY", SUP]] as const;
    for (const [ma, as] of ca) {
      assert.ok(buoc(ma), `tệp vàng thiếu bước ${ma}`);
      const r = await nhan(w, id, as);
      assert.equal(r.status, buoc(ma), `${ma}: route thật phải trả đúng mã của tệp vàng — ${r.text}`);
    }
    assert.equal(dongGhi(), truoc, "không ghi gì");
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id).status, "PENDING");
  } finally {
    tat();
  }
});

// NT-A5-20 thua cổng (VỪA-2, kiểm độc lập 12/10). `w.chenTruocLo` (khung thử) giả một người khác đổi dữ liệu giữa lúc route đọc và lúc ghi.
const laLoDeNghi = (stmts: any[]) => stmts.some((x) => /UPDATE vc_transfer_request/.test(x.sql));
const tangVersion = (w: any, tripId: string) => w.sqlite.prepare("UPDATE vc_trip SET version = version + 1 WHERE id = ?").run(tripId);

// N4 (nới có tên — ADR-0053 D7.1 :46 + ADR-0111 N4): tài xế ĐỐI TÁC (nhà xe) dùng ô trip.transfer y như tài xế công ty — vừa là xe nhờ vừa là xe nhận.
const AT_N4 = "2026-09-01T00:00:00.000Z";
function doiTacLaiChoNhaXe(w: any) {
  const nx = nhaXeKhung(w, "Nhà xe Chuyển Khách");
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${DRIVER_PARTNER}`, nx, AT_N4, AT_N4);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', '792200000099', '792200000099', 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(uuid(), `pty-${DRIVER_PARTNER}`, AT_N4, AT_N4);
  return { xe: xeNhaXe(w, nx), nx };
}
test("N4 (ADR-0053:46): tài xế đối tác là XE NHỜ — xuất bến, xem xe nhận, gửi đề nghị, thấy đề nghị của mình, bị xe nhận (công ty) đẩy lên văn phòng, Rút → 409 đã leo thang", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const dt = doiTacLaiChoNhaXe(w);
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: dt.xe });
    // Chuyến xe thuê cần giá mới xuất bến được (điều kiện THIEU_GIA, ADR-0057): gieo một dòng giá thoả thuận — chỉ để chuyến đi được tới bước chuyển khách.
    const lyGia = mot(w, "SELECT code FROM vc_reason WHERE reason_group = 'CHI_PHI_XE' ORDER BY sort_order, code LIMIT 1").code;
    w.sqlite.prepare("INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reason_code, occurred_date, cmd_id, created_at, updated_at) VALUES (?, ?, ?, 'AGREED', 1000000, ?, ?, ?, ?, ?)")
      .run(uuid(), a.id, dt.nx, lyGia, NGAY, uuid(), AT_N4, AT_N4);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    denGio("12:40");
    { const xb = await tienDo(w, "tai-xe", a.id, "xuat-ben", {}, DRIVER_PARTNER); assert.equal(xb.status, 200, xb.text); }
    const ds = await xeNhan(w, a.id, DRIVER_PARTNER, "STOP");
    assert.equal(ds.status, 200, ds.text);
    assert.ok(ds.json.xe.some((x: any) => x.tripId === b.id), "xe nhận của công ty có trong danh sách");
    const g = await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon }, DRIVER_PARTNER);
    assert.equal(g.status, 200, g.text);
    const id = g.json.deNghi.id;
    const cuaToi = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER_PARTNER })).json;
    assert.deepEqual(cuaToi.guiDi.map((x: any) => x.id), [id], "đề nghị của mình hiện ở 'gửi đi'");
    const n = await nhan(w, id, DRIVER2);
    assert.equal(n.status, 200, n.text);
    assert.equal(n.json.ketQua, "LEO_THANG");
    tat409(await rut(w, id, DRIVER_PARTNER), "da_leo_thang");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("N4 (ADR-0053:46): tài xế đối tác là XE NHẬN — thấy đề nghị gửi tới, Không nhận → tin tới xe nhờ; tài xế công ty khác không bấm thay (404)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const dt = doiTacLaiChoNhaXe(w);
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: dt.xe, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    const id = (await gui(w, a.id, { denChuyenId: b.id, phamVi: "STOP", diemId: a.diemDon })).json.deNghi.id;
    assert.equal((await tinCua(w, DRIVER_PARTNER, /đề nghị chuyển khách tới/)).length, 1, "tin tới tài xế đối tác (xe nhận)");
    const cuaToi = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER_PARTNER })).json;
    assert.deepEqual(cuaToi.guiToi.map((x: any) => x.id), [id], "đề nghị gửi tới hiện ở 'gửi tới'");
    assert.equal((await khongNhan(w, id, "TU_CHOI_DAY_CHO", DRIVER2)).status, 404, "tài xế công ty khác không lái xe nhận");
    const k = await khongNhan(w, id, "TU_CHOI_DAY_CHO", DRIVER_PARTNER);
    assert.equal(k.status, 200, k.text);
    assert.deepEqual([k.json.ketQua, k.json.deNghi.trangThai], ["KHONG_NHAN", "DECLINED"]);
    assert.equal((await tinCua(w, DRIVER, /không nhận khách/)).length, 1, "tin Không nhận tới xe nhờ (tài xế công ty)");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-20 thua cổng (1): lô xác nhận thua cổng version một lần → đọc lại và thử LẠI MỘT LẦN → 200 DA_CHUYEN, đúng một sự kiện", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    w.chenTruocLo(laLoDeNghi, () => tangVersion(w, a.id));
    const r = await nhan(w, id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.ketQua, r.json.deNghi.trangThai], ["DA_CHUYEN", "CONFIRMED"], "thử lại một lần phải thắng");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_CONFIRMED' AND trip_id = ?", b.id).n, 1, "đúng một sự kiện");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-20 thua cổng (2): lô xác nhận thua cổng HAI lần liền → lần thử lại cũng thua → 409 stale, đề nghị còn Chờ, không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    w.chenTruocLo(laLoDeNghi, () => tangVersion(w, a.id), 2);
    tat409(await nhan(w, id), "stale");
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id).status, "PENDING");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_CONFIRMED'").n, 0, "thua hai lần: không ghi");
  } finally {
    tat();
  }
});

test("NT-A5-20 thua cổng (3): lô leo thang thua cổng vì tài xế xe nhờ vừa RÚT → đọc lại thấy đã đóng: 409 ck_de_nghi_da_dong (không phải stale), không leo thang", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const id = await guiDiem(w, a, b);
    w.chenTruocLo(laLoDeNghi, async () => { assert.equal((await rut(w, id)).status, 200); });
    tat409(await nhan(w, id), "ck_de_nghi_da_dong");
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id).status, "WITHDRAWN");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_ESCALATED'").n, 0, "không leo thang đề nghị đã rút");
  } finally {
    tat();
  }
});

test("THẤP-3, THẤP-4 (kiểm độc lập 12/10): DTO đề nghị không lộ mã thô khi lý do bị ngưng dùng (chữ có dấu chung) và che dãy ≥ 8 chữ số ở tên điểm đón (hai lớp che, khuôn tenNoi)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    // THẤP-4: lớp che thứ HAI. Lúc ghi, đơn đã che dãy số dài; để thử lớp ở DTO, gỡ trigger bất biến điểm dừng (chỉ trong CSDL thử) rồi ghi chữ gốc.
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    const id = await guiDiem(w, a, b);
    w.sqlite.exec("DROP TRIGGER vc_trip_stop_identity");
    w.sqlite.prepare("UPDATE vc_trip_stop SET place_text = 'Số 0912345678 Trần Phú' WHERE id = ?").run(a.diemDon);
    let ds = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER })).json.guiDi;
    const dong = ds.find((x: any) => x.id === id);
    assert.ok(dong.tenDiem, "có tên điểm");
    assert.doesNotMatch(dong.tenDiem, /\d{8,}/, `tên điểm lộ dãy số: ${dong.tenDiem}`);
    // THẤP-3: Không nhận với lý do còn dùng → sau đó danh mục ngưng lý do ấy → DTO vẫn có chữ có dấu, không mã thô.
    assert.equal((await khongNhan(w, id, "TU_CHOI_DAY_CHO")).status, 200);
    w.sqlite.prepare("UPDATE vc_reason SET active = 0 WHERE code = 'TU_CHOI_DAY_CHO'").run();
    ds = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER })).json.guiDi;
    const sau = ds.find((x: any) => x.id === id);
    assert.ok(sau.lyDo, "vẫn có chữ lý do");
    assert.doesNotMatch(sau.lyDo, /^[A-Z][A-Z_0-9]+$/, `lý do lộ mã thô: ${sau.lyDo}`);
  } finally {
    tat();
  }
});

test("THẤP-1 (kiểm độc lập vòng 2): chữ nơi gặp được che dãy ≥ 8 chữ số LẦN HAI lúc đọc DTO (lúc ghi đã che; ở đây gieo chuỗi thô vào CSDL thử), ở cả danh sách tài xế lẫn danh sách văn phòng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    denGio("13:35");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
    const r = await cuuHo(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng km 12" } });
    assert.equal(r.status, 200, r.text);
    // Gỡ trigger bất biến nội dung đề nghị (chỉ trong CSDL thử) để ghi chuỗi THÔ như thể lớp che lúc ghi đã bị bỏ.
    for (const t of w.sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'vc_transfer_request' AND sql LIKE '%BEFORE UPDATE%'").all() as { name: string }[]) w.sqlite.exec(`DROP TRIGGER ${t.name}`);
    w.sqlite.prepare("UPDATE vc_transfer_request SET meet_place_text = 'Cây xăng km 12345678901' WHERE id = ?").run(r.json.deNghi.id);
    const taiXe = (await w.call("GET", `${VC}/de-nghi-cua-toi`, { as: DRIVER })).json.guiDi.find((x: any) => x.id === r.json.deNghi.id);
    assert.ok(taiXe?.noiGap, "có chữ nơi gặp");
    assert.doesNotMatch(taiXe.noiGap, /\d{8,}/, `danh sách tài xế lộ dãy số: ${taiXe.noiGap}`);
    assert.match(taiXe.noiGap, /^Cây xăng km/, "vẫn giữ phần chữ");
    const vp = await w.call("GET", `${VC}/de-nghi`, { as: ADM });
    assert.equal(vp.status, 200, vp.text);
    const dong = vp.json.deNghi.find((x: any) => x.id === r.json.deNghi.id);
    assert.ok(dong?.noiGap, "danh sách văn phòng có đề nghị và chữ nơi gặp");
    assert.doesNotMatch(dong.noiGap, /\d{8,}/, `danh sách văn phòng lộ dãy số: ${dong.noiGap}`);
    assert.match(dong.noiGap, /^Cây xăng km/, "vẫn giữ phần chữ");
  } finally {
    tat();
  }
});

test("NT-A5-7, -11 nhận dưới mốc (xe nhận chưa chạy) → leo thang (suất không đổi, tin tới người có trip.override); danh sách văn phòng có dòng kiểm + hộp; Duyệt: chỉ trip.override, lý do nhóm PHA_LE, NGUOI; lệnh lặp Nhận sau duyệt vẫn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const id = await guiDiem(w, a, b);
    const maNhan = uuid();
    const r = await nhan(w, id, DRIVER2, maNhan);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.ketQua, r.json.deNghi.trangThai], ["LEO_THANG", "ESCALATED"]);
    const q = mot(w, "SELECT decided_mode, decided_by_party_id, decided_cmd_id, closed_cmd_id FROM vc_transfer_request WHERE id = ?", id);
    assert.deepEqual([q.decided_mode, q.decided_by_party_id, q.closed_cmd_id], [null, `pty-${DRIVER2}`, null]);
    assert.deepEqual(ds(w, "SELECT rule_code, rule_tier FROM vc_transfer_check WHERE transfer_id = ? AND ket_qua = 'KHONG_DAT'", id), [{ rule_code: "MOC_TOI_THIEU", rule_tier: "CAU_HINH" }]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", a.id).n, 2, "suất không đổi");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind = 'TRANSFER_ESCALATED' AND trip_id = ? AND related_trip_id = ?", b.id, a.id).n, 1);
    for (const as of [ADM, SUP]) assert.equal((await tinCua(w, as, /cần văn phòng duyệt/)).length, 1, `${as} có tin cần duyệt`);
    for (const as of [SALES, DRIVER, DRIVER2]) assert.equal((await tinCua(w, as, /cần văn phòng duyệt/)).length, 0, `${as} không có tin cần duyệt`);
    tat409(await rut(w, id), "da_leo_thang");
    tat409(await nhan(w, id), "ck_de_nghi_da_dong");
    const dsVp = await w.call("GET", `${VC}/de-nghi?ngay=${NGAY}`, { as: ACC });
    assert.equal(dsVp.status, 200, dsVp.text);
    const dto = dsVp.json.deNghi.find((x: any) => x.id === id);
    assert.equal(dto.kiem.length, 11);
    assert.equal(dto.hop, "DUYET_HOAC_BAC");
    // T14: lý do cho hộp Duyệt (PHA_LE) / Bác (TU_CHOI_NHAN) đi kèm danh sách — màn văn phòng không gọi route danh mục lý do (chỉ Quản trị).
    assert.deepEqual([...new Set(dsVp.json.lyDo.map((x: any) => x.nhom))].sort(), ["PHA_LE", "TU_CHOI_NHAN"]);
    assert.ok(dsVp.json.lyDo.every((x: any) => x.code && x.nhan), "mỗi lý do có mã + nhãn");
    assert.equal((await w.call("GET", `${VC}/de-nghi?ngay=${NGAY}`, { as: DRIVER })).status, 403, "danh sách văn phòng: tài xế không xem");
    // Duyệt (NT-A5-11).
    for (const as of [SALES, ACC, DRIVER2]) assert.equal((await duyet(w, id, "PHA_LE_SU_CO", as)).status, 403, as);
    assert.equal((await duyet(w, id, null)).status, 400, "thiếu lý do");
    assert.equal((await duyet(w, id, "TU_CHOI_KHAC")).status, 400, "lý do sai nhóm");
    const maDuyet = uuid();
    const d = await duyet(w, id, "PHA_LE_SU_CO", ADM, maDuyet);
    assert.equal(d.status, 200, d.text);
    const lapDuyet = await duyet(w, id, "PHA_LE_SU_CO", ADM, maDuyet);
    assert.deepEqual([lapDuyet.status, lapDuyet.json.ketQua], [200, "DA_CHUYEN"], "lệnh lặp Duyệt");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", maDuyet).n, 1);
    assert.deepEqual([d.json.ketQua, d.json.deNghi.trangThai], ["DA_CHUYEN", "CONFIRMED"]);
    const q2 = mot(w, "SELECT decided_mode, decided_by, decided_by_party_id, decided_cmd_id, closed_cmd_id, override_reason_code FROM vc_transfer_request WHERE id = ?", id);
    assert.deepEqual([q2.decided_mode, q2.decided_by, q2.decided_by_party_id, q2.override_reason_code, q2.closed_cmd_id], ["NGUOI", ADM, `pty-${DRIVER2}`, "PHA_LE_SU_CO", q2.decided_cmd_id]);
    assert.notEqual(q2.decided_cmd_id, q.decided_cmd_id);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_check WHERE transfer_id = ? AND cmd_id = ?", id, q2.decided_cmd_id).n, 11, "duyệt chạy lại kiểm");
    const moB = ds(w, "SELECT status, added_after_departure FROM vc_trip_allocation WHERE trip_id = ? AND transfer_id = ? AND valid_to_at IS NULL", b.id, id);
    assert.deepEqual(moB, [{ status: "WAITING", added_after_departure: 0 }, { status: "WAITING", added_after_departure: 0 }]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_manifest WHERE trip_id = ?", b.id).n, 0, "xe nhận chưa xuất bến: không bản chốt");
    assert.equal((await tinCua(w, DRIVER, /Xe nhận đã nhận khách/)).length, 1);
    assert.equal((await tinCua(w, DRIVER2, /Khách đã chuyển sang/)).length, 1);
    const lap = await nhan(w, id, DRIVER2, maNhan);
    assert.equal(lap.status, 200, `lệnh lặp Nhận sau khi duyệt: ${lap.text}`);
    tat409(await duyet(w, id, "PHA_LE_SU_CO"), "ck_de_nghi_da_dong");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-12, -29 đơn huỷ sau khi xếp: chặng không còn hiệu lực (tầng LOI) → leo thang chỉ Bác; Duyệt → 409 không ghi; Bác: trip.override, lý do nhóm Không nhận, REJECTED, tin tới hai xe; Bán hàng duyệt / bác → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const huy = await w.call("POST", `/api/orders/${a.don.id}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
    assert.equal(huy.status, 200, huy.text);
    const id = await guiDiem(w, a, b);
    const r = await nhan(w, id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ketQua, "LEO_THANG");
    assert.deepEqual(ds(w, "SELECT rule_code, rule_tier FROM vc_transfer_check WHERE transfer_id = ? AND ket_qua = 'KHONG_DAT'", id), [{ rule_code: "CHANG_KHACH_HIEU_LUC", rule_tier: "LOI" }]);
    const dto = (await w.call("GET", `${VC}/de-nghi?ngay=${NGAY}`, { as: ADM })).json.deNghi.find((x: any) => x.id === id);
    assert.equal(dto.hop, "CHI_BAC");
    const soKiem = mot(w, "SELECT count(*) AS n FROM vc_transfer_check").n;
    tat409(await duyet(w, id, "PHA_LE_SU_CO"), "luat_loi_khong_duyet");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_check").n, soKiem, "duyệt bị chặn: không ghi gì");
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id).status, "ESCALATED");
    for (const as of [SALES, ACC, DRIVER, DRIVER2]) assert.equal((await bac(w, id, "TU_CHOI_KHAC", as)).status, 403, as);
    assert.equal((await bac(w, id, null)).status, 400, "thiếu lý do");
    assert.equal((await bac(w, id, "PHA_LE_SU_CO")).status, 400, "lý do sai nhóm");
    const maBac = uuid();
    const k = await bac(w, id, "TU_CHOI_KHAC", ADM, maBac);
    assert.equal(k.status, 200, k.text);
    assert.deepEqual([(await bac(w, id, "TU_CHOI_KHAC", ADM, maBac)).status, mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", maBac).n], [200, 1], "lệnh lặp Bác");
    assert.deepEqual([k.json.ketQua, k.json.deNghi.trangThai], ["DA_BAC", "REJECTED"]);
    const q = mot(w, "SELECT reject_reason_code, decided_by, decided_mode, closed_cmd_id, decided_cmd_id FROM vc_transfer_request WHERE id = ?", id);
    assert.deepEqual([q.reject_reason_code, q.decided_by, q.decided_mode, q.closed_cmd_id], ["TU_CHOI_KHAC", ADM, null, q.decided_cmd_id]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", a.id).n, 2, "suất không đổi");
    assert.equal((await tinCua(w, DRIVER, /không duyệt/)).length, 1);
    assert.equal((await tinCua(w, DRIVER2, /không duyệt/)).length, 1);
    tat409(await bac(w, id, "TU_CHOI_KHAC"), "ck_de_nghi_da_dong");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-8, -10, -5 không nhận (lý do nhóm Không nhận, tin tới xe nhờ); nhận / không nhận / rút muộn → 200 HET_HAN, ghi EXPIRED; gửi lại cùng điểm đóng đề nghị quá hạn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    assert.equal((await khongNhan(w, id, null)).status, 400, "thiếu lý do");
    assert.equal((await khongNhan(w, id, "PHA_LE_SU_CO")).status, 400, "lý do sai nhóm");
    assert.equal((await khongNhan(w, id, "TU_CHOI_DAY_CHO", DRIVER)).status, 404, "người gửi không bấm Không nhận");
    for (const as of [SALES, ACC, ADM]) assert.equal((await khongNhan(w, id, "TU_CHOI_DAY_CHO", as)).status, 403, `${as}: không có ô trip.transfer`);
    assert.equal((await khongNhan(w, id, "TU_CHOI_DAY_CHO", SUP)).status, 404, "Toàn quyền có ô nhưng không lái xe nhận");
    const maKhong = uuid();
    const k = await khongNhan(w, id, "TU_CHOI_DAY_CHO", DRIVER2, maKhong);
    assert.equal(k.status, 200, k.text);
    const lapKhong = await khongNhan(w, id, "TU_CHOI_DAY_CHO", DRIVER2, maKhong);
    assert.deepEqual([lapKhong.status, lapKhong.json.ketQua], [200, "KHONG_NHAN"], "lệnh lặp Không nhận");
    assert.deepEqual([k.json.ketQua, k.json.deNghi.trangThai], ["KHONG_NHAN", "DECLINED"]);
    const q = mot(w, "SELECT decline_reason_code, decided_by_party_id, decided_mode, closed_cmd_id, decided_cmd_id FROM vc_transfer_request WHERE id = ?", id);
    assert.deepEqual([q.decline_reason_code, q.decided_by_party_id, q.decided_mode, q.closed_cmd_id], ["TU_CHOI_DAY_CHO", `pty-${DRIVER2}`, null, q.decided_cmd_id]);
    assert.equal((await tinCua(w, DRIVER, /không nhận khách/)).length, 1, "Đ3 (d): tin tới xe nhờ");
    tat409(await khongNhan(w, id, "TU_CHOI_DAY_CHO"), "ck_de_nghi_da_dong");
    // Nhận muộn (NT-A5-10).
    const id2 = await guiDiem(w, a, b);
    denGio("13:46");
    const muon = await nhan(w, id2);
    assert.equal(muon.status, 200, muon.text);
    assert.deepEqual([muon.json.ketQua, muon.json.deNghi.trangThai], ["HET_HAN", "EXPIRED"]);
    assert.equal(mot(w, "SELECT decided_cmd_id FROM vc_transfer_request WHERE id = ?", id2).decided_cmd_id, null, "hết hạn không đụng cột quyết định");
    assert.equal((await tinCua(w, DRIVER, /hết giờ chờ/)).length, 1);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", a.id).n, 2);
    // Không nhận muộn, rút muộn → cũng đóng Hết hạn.
    const id3 = await guiDiem(w, a, b);
    const id4 = await guiDiem(w, a, b);
    denGio("13:57");
    const kMuon = await khongNhan(w, id3, "TU_CHOI_DAY_CHO");
    assert.deepEqual([kMuon.status, kMuon.json.ketQua], [200, "HET_HAN"]);
    const rMuon = await rut(w, id4);
    assert.deepEqual([rMuon.status, rMuon.json.ketQua, rMuon.json.deNghi.trangThai], [200, "HET_HAN", "EXPIRED"]);
    // Gửi lại cùng điểm khi còn đề nghị Chờ quá hạn → đề nghị cũ đóng Hết hạn (MQ-08), đề nghị mới Chờ.
    const id5 = await guiDiem(w, a, b);
    denGio("14:08");
    const id6 = await guiDiem(w, a, b);
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id5).status, "EXPIRED");
    assert.equal(mot(w, "SELECT status FROM vc_transfer_request WHERE id = ?", id6).status, "PENDING");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-14 cứu hộ ONBOARD: suất Đã lên sang xe nhận tại điểm nơi gặp MỚI (vẫn Đã lên), suất Chờ ở nơi đón gốc; xe nhờ kết thúc gián đoạn được ngay; xe nhận bấm Đã tới nơi gặp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 3 });
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("13:00");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    for (const s of a.suat.slice(0, 2)) assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${s}/don`)).status, 200);
    denGio("13:35");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
    denGio("13:36"); // R-VC-4: suất mở khi xác nhận không trùng mili-giây bản chụp xuất bến của B
    const g = await gui(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng Phước Đồng" } });
    assert.equal(g.status, 200, g.text);
    const id = g.json.deNghi.id;
    assert.equal(g.json.deNghi.soKhach, 3);
    const r = await nhan(w, id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ketQua, "DA_CHUYEN");
    const moB = ds(w, "SELECT status, board_stop_id FROM vc_trip_allocation WHERE trip_id = ? AND transfer_id = ? AND valid_to_at IS NULL ORDER BY status", b.id, id);
    assert.deepEqual(moB.map((x) => x.status), ["BOARDED", "BOARDED", "WAITING"]);
    const noiGap = mot(w, "SELECT kind, status, place_text, location_id FROM vc_trip_stop WHERE id = ?", moB[0].board_stop_id);
    assert.deepEqual({ ...noiGap }, { kind: "PICKUP", status: "PENDING", place_text: "Cây xăng Phước Đồng", location_id: null });
    assert.equal(moB[1].board_stop_id, moB[0].board_stop_id);
    assert.notEqual(moB[2].board_stop_id, moB[0].board_stop_id, "suất Chờ lên ở nơi đón gốc (điểm khác nơi gặp)");
    assert.equal(mot(w, "SELECT status FROM vc_trip_stop WHERE id = ?", a.diemDon).status, "ARRIVED", "cứu hộ không đổi điểm nguồn sang MOVED");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", a.id).n, 0);
    const kt = await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" });
    assert.equal(kt.status, 200, kt.text);
    assert.equal(mot(w, "SELECT status FROM vc_trip WHERE id = ?", a.id).status, "ENDED_INTERRUPTED");
    denGio("13:50");
    assert.equal((await tienDo(w, "tai-xe", b.id, `diem/${moB[0].board_stop_id}/da-toi`, {}, DRIVER2)).status, 200);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-24 tắt công tắc tự đồng ý SAU khi gửi: Nhận → leo thang (không có dòng KHONG_DAT); hạn chờ vẫn theo dòng lúc gửi; dòng kiểm ghi chính sách hiện hành", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await xeNhanChay(w);
    const id = await guiDiem(w, a, b);
    const cu = mot(w, "SELECT * FROM vc_dispatch_policy ORDER BY valid_from_at DESC LIMIT 1");
    denGio("13:36");
    const luc = new Date(Date.now()).toISOString();
    const moi = { ...cu, id: uuid(), auto_confirm_transfer: 0, accept_wait_minutes: 60, valid_from_at: luc, created_at: luc, updated_at: luc };
    const cot = Object.keys(moi);
    w.sqlite.prepare(`INSERT INTO vc_dispatch_policy (${cot.join(", ")}) VALUES (${cot.map(() => "?").join(", ")})`).run(...cot.map((k) => (moi as any)[k]));
    const r = await nhan(w, id);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ketQua, "LEO_THANG");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_transfer_check WHERE transfer_id = ? AND ket_qua = 'KHONG_DAT'", id).n, 0);
    assert.deepEqual(ds(w, "SELECT DISTINCT policy_row_id FROM vc_transfer_check WHERE transfer_id = ?", id), [{ policy_row_id: moi.id }]);
    // Đề nghị gửi SAU khi tắt: hạn 60 phút theo dòng mới; đề nghị đầu (gửi lúc dòng cũ) vẫn hạn 10 phút.
    assert.equal(Date.parse(r.json.deNghi.hanLuc) - Date.parse(r.json.deNghi.guiLuc), 10 * 60_000);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("NT-A5-13 (MQ-09) tự huỷ: xe nhờ Đã tới điểm nguồn → đề nghị Chờ VÀ Leo thang của điểm đó thành VOID trong lô Đã tới (không sự kiện riêng); Nhận / Duyệt sau đó → 409 da_huy; huỷ xe nhận → đề nghị Chờ tới xe đó VOID", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const cho = await guiDiem(w, a, b);
    const leo = await guiDiem(w, a, b);
    const r = await nhan(w, leo);
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.ketQua, "LEO_THANG", "B chưa chạy, dưới mốc ⇒ leo thang");
    const truoc = mot(w, "SELECT count(*) AS n FROM vc_trip_event").n;
    denGio("13:00");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
    const cmdA = mot(w, "SELECT last_cmd_id FROM vc_trip WHERE id = ?", a.id).last_cmd_id;
    assert.deepEqual(ds(w, "SELECT status, closed_cmd_id FROM vc_transfer_request WHERE id IN (?, ?)", cho, leo), [
      { status: "VOID", closed_cmd_id: cmdA },
      { status: "VOID", closed_cmd_id: cmdA },
    ]);
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event").n, truoc + 1, "chỉ sự kiện STOP_ARRIVED của lô Đã tới");
    tat409(await nhan(w, cho), "da_huy");
    tat409(await duyet(w, leo, "PHA_LE_SU_CO"), "da_huy");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
  const tat2 = batDongHo();
  try {
    // Phía xe nhận (thế giới mới): đề nghị Chờ tới B, rồi văn phòng huỷ B ⇒ VOID trong lô huỷ.
    const w = setup();
    const { a, b } = await haiXe(w);
    const g = { json: { deNghi: { id: await guiDiem(w, a, b) } } };
    const vB = mot(w, "SELECT version FROM vc_trip WHERE id = ?", b.id).version;
    const h = await w.call("POST", `${VC}/chuyen/${b.id}/huy`, { as: SALES, body: { version: vB, requestId: uuid(), lyDo: "HUY_KHAC", phaLe: { lyDo: "PHA_LE_SU_CO" } } });
    assert.equal(h.status, 200, h.text);
    assert.deepEqual({ ...mot(w, "SELECT status, closed_cmd_id FROM vc_transfer_request WHERE id = ?", g.json.deNghi.id) },
      { status: "VOID", closed_cmd_id: mot(w, "SELECT last_cmd_id FROM vc_trip WHERE id = ?", b.id).last_cmd_id });
    assert.equal((await nhan(w, g.json.deNghi.id)).status, 404, "chuyến huỷ đã đóng tài xế: DRIVER2 không còn lái B");
    assert.equal(mot(w, "SELECT count(*) AS n FROM vc_trip_event WHERE kind LIKE 'TRANSFER_%' AND kind <> 'TRANSFER_SENT'").n, 0, "tự huỷ không có sự kiện riêng");
  } finally {
    tat2();
  }
});

test("NT-A5-13 (MQ-09, G-A5-13) cập nhật điểm theo đơn khi xe nhờ đang chạy: suất của điểm nguồn đổi sang nơi mới → đề nghị Chờ của điểm đó VOID trong cùng lô; Nhận → 409 da_huy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { a, b } = await haiXe(w);
    const id = await guiDiem(w, a, b);
    const o = (await w.call("GET", `/api/orders/${a.don.id}`, { as: ADM })).json.order;
    const l = o.services[0].legs[0];
    const sua = await w.call("PUT", `/api/orders/${a.don.id}/legs/${l.id}`, {
      as: ADM, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Khách sạn Đổi Nơi", dropoffLocationId: LOC, dropoffPlace: "" }, datGap: { lyDo: "KHAC" } },
    });
    assert.equal(sua.status, 200, sua.text);
    const v = mot(w, "SELECT version FROM vc_trip WHERE id = ?", a.id).version;
    const r = await w.call("POST", `${VC}/chuyen/${a.id}/cap-nhat-diem`, { as: SALES, body: { version: v, requestId: uuid() } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.daCapNhat, 2, "chống bài rỗng: hai suất của điểm nguồn đổi");
    assert.deepEqual({ ...mot(w, "SELECT status, closed_cmd_id FROM vc_transfer_request WHERE id = ?", id) },
      { status: "VOID", closed_cmd_id: mot(w, "SELECT last_cmd_id FROM vc_trip WHERE id = ?", a.id).last_cmd_id });
    tat409(await nhan(w, id), "da_huy");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

const daHuyBoi = (w: any, rid: string, trip: string) =>
  assert.deepEqual({ ...mot(w, "SELECT status, closed_cmd_id FROM vc_transfer_request WHERE id = ?", rid) },
    { status: "VOID", closed_cmd_id: mot(w, "SELECT last_cmd_id FROM vc_trip WHERE id = ?", trip).last_cmd_id });
const phienBan = (w: any, trip: string) => mot(w, "SELECT version FROM vc_trip WHERE id = ?", trip).version as number;
const thuHoi = async (w: any, trip: string) =>
  w.call("POST", `${VC}/chuyen/${trip}/thu-hoi-xuat-ben`, { as: SALES, body: { version: phienBan(w, trip), requestId: uuid(), lyDo: "DIEU_CHINH_BAM_NHAM" } });

test("NT-A5-13 (MQ-09) mỗi lệnh còn lại của G-A5-13 làm đề nghị đang chờ VOID cùng lô, có trong lô thật (trigger nhận): Kết thúc gián đoạn xe nhờ; Kết thúc xe nhận; Báo huỷ suất ở điểm nguồn; Điều chỉnh suất của xe nhờ (ONBOARD); Thu hồi xuất bến xe nhờ / xe nhận; kiểm định kỳ sạch", async (t) => {
  await t.test("Kết thúc gián đoạn xe nhờ", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await haiXe(w);
      const id = await guiDiem(w, a, b);
      const kt = await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" });
      assert.equal(kt.status, 200, kt.text);
      daHuyBoi(w, id, a.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
  await t.test("Kết thúc xe nhận (xe nhận không khách, đã chạy)", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const a = await chuyenSan(w);
      const b = (await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "12:30", kt: "16:00" })).chuyen;
      denGio("12:40");
      assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
      const xb = await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2);
      assert.equal(xb.status, 200, xb.text);
      const id = await guiDiem(w, a, b);
      denGio("12:45");
      const kt = await tienDo(w, "tai-xe", b.id, "ket-thuc", {}, DRIVER2);
      assert.equal(kt.status, 200, kt.text);
      daHuyBoi(w, id, b.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
  await t.test("Báo huỷ suất ở điểm nguồn", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await haiXe(w);
      const id = await guiDiem(w, a, b);
      const bh = await w.call("POST", `${VC}/chuyen/${a.id}/phan-bo/${a.suat[0]}/bao-huy`, { as: SALES, body: { version: phienBan(w, a.id), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } });
      assert.equal(bh.status, 200, bh.text);
      daHuyBoi(w, id, a.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
  await t.test("Điều chỉnh suất của xe nhờ — đề nghị cứu hộ ONBOARD (tập khách trên xe đổi)", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const a = await chuyenSan(w);
      const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
      denGio("12:40");
      assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
      denGio("12:50");
      assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
      assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).status, 200);
      denGio("13:35");
      assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben", {}, DRIVER2)).status, 200);
      const g = await gui(w, a.id, { denChuyenId: b.id, phamVi: "ONBOARD", noiGap: { chu: "Cây xăng Phước Đồng" } });
      assert.equal(g.status, 200, g.text);
      const dc = await w.call("POST", `${VC}/chuyen/${a.id}/phan-bo/${a.suat[0]}/dieu-chinh`, {
        as: SALES, body: { version: phienBan(w, a.id), requestId: uuid(), trangThai: "NO_SHOW", lyDo: "DIEU_CHINH_BAM_NHAM" },
      });
      assert.equal(dc.status, 201, dc.text.slice(0, 300));
      daHuyBoi(w, g.json.deNghi.id, a.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
  await t.test("Thu hồi xuất bến xe nhờ", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await haiXe(w);
      const id = await guiDiem(w, a, b);
      const th = await thuHoi(w, a.id);
      assert.equal(th.status, 201, th.text.slice(0, 300));
      daHuyBoi(w, id, a.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
  await t.test("Thu hồi xuất bến xe nhận (sự kiện gửi đề nghị ở xe nhận không là tiến độ — Đ5)", async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { a, b } = await xeNhanChay(w);
      const id = await guiDiem(w, a, b);
      const th = await thuHoi(w, b.id);
      assert.equal(th.status, 201, th.text.slice(0, 300));
      daHuyBoi(w, id, b.id);
      kiemDinhKySach(w);
    } finally {
      tat();
    }
  });
});
