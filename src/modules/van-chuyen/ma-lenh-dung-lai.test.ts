// C38 (báo cáo đánh giá ERP 2026-10-07, Phần 4.4 + Gói C5): mã lệnh (`requestId` trong thân) dùng lại cho một lệnh KHÁC. LC-11 (ADR-0049) chỉ đòi "lệnh lặp
// không ghi hai lần"; trước đây `eventByRequest` tra `request_id` trên toàn `vc_trip_event` mà không so chuyến, loại lệnh ⇒ lệnh khác mang mã cũ được trả 200
// mà KHÔNG làm gì (bài gốc docs/evidence/2026-10-07-danh-gia-erp-van-chuyen/kich-ban/sc-vanhanh/s7-bam-trung.test.mjs). Nay: chỉ coi là lệnh lặp khi sự kiện cũ
// thuộc ĐÚNG chuyến của lệnh (`trip_id` hoặc `related_trip_id`), ĐÚNG loại lệnh đó sinh ra, và — với lệnh nhắm một suất / một điểm — đúng suất / điểm đó;
// lệch ⇒ 409 `request_id_reused`, không ghi. Gửi lặp ĐÚNG lệnh vẫn 200 như cũ. Lớp vé chung (ADR-0094) KHÔNG bắt ca này: vé khoá theo header + vân tay, không
// theo `requestId` trong thân (ca cuối).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, NGAY, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, tienDo, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";

const DUNG_LAI = "request_id_reused";
const soSuKien = (w: any, rid: string): number => w.q("SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", rid)[0].n;
const dongChuyen = (w: any, id: string) => ({ ...w.q("SELECT status, planned_start_ms, version FROM vc_trip WHERE id = ?", id)[0] });
const trangThaiSuat = (w: any, id: string): string => w.q("SELECT status FROM vc_trip_allocation WHERE id = ?", id)[0].status;
const gio = (tu: string, den: string) => ({ batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den } });
function laDungLai(r: any): void {
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, DUNG_LAI);
  assert.equal(r.json.error.message, "Mã lệnh đã dùng cho thao tác khác — tải lại trang rồi thử lại.");
}

/** Hai chuyến kế hoạch (xe khác, tài xế khác, 16:00–18:00): P có 2 khách đã xếp, Q trống. Đồng hồ 06:00 (ngoài mốc 6 giờ). */
async function haiChuyenKeHoach(w: any) {
  const d = await don(w, { soNguoi: 2, gio: "16:30" });
  const P = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "18:00" });
  const Q = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER2}`, bd: "16:00", kt: "18:00" });
  const sauP = await xepHet(w, P, d, 2);
  return { pId: P.chuyen.id as string, qId: Q.chuyen.id as string, suatP: sauP.suat.filter((s: any) => s.loai === "PASSENGER").map((s: any) => s.id as string) };
}

test("lệnh kế hoạch: mã lệnh của 'sửa chuyến P' dùng cho sửa chuyến Q, huỷ P, tạo chuyến ⇒ 409 request_id_reused, không ghi; gửi lặp đúng lệnh vẫn 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { pId, qId } = await haiChuyenKeHoach(w);
    const rid = uuid();
    const vP = (await chiTiet(w, pId)).chuyen.version;
    const than = { version: vP, requestId: rid, ...gio("16:05", "18:05") };
    assert.equal((await w.call("PUT", `/api/van-chuyen/chuyen/${pId}`, { as: SALES, body: than })).status, 200);
    // Gửi lặp ĐÚNG lệnh (cùng chuyến, cùng loại) ⇒ 200, không ghi lần hai (LC-11 giữ nguyên).
    const lap = await w.call("PUT", `/api/van-chuyen/chuyen/${pId}`, { as: SALES, body: than });
    assert.equal(lap.status, 200, lap.text);
    assert.equal(soSuKien(w, rid), 1);
    // Cùng loại (UPDATED), KHÁC chuyến.
    const q0 = dongChuyen(w, qId);
    laDungLai(await w.call("PUT", `/api/van-chuyen/chuyen/${qId}`, { as: SALES, body: { version: q0.version, requestId: rid, ...gio("16:10", "18:10") } }));
    assert.deepEqual(dongChuyen(w, qId), q0, "chuyến Q không đổi");
    // Cùng chuyến, KHÁC loại (huỷ sinh CANCELLED).
    const p0 = dongChuyen(w, pId);
    laDungLai(await w.call("POST", `/api/van-chuyen/chuyen/${pId}/huy`, { as: SALES, body: { version: p0.version, requestId: rid, lyDo: "HUY_KHAC" } }));
    assert.deepEqual(dongChuyen(w, pId), p0, "chuyến P không bị huỷ");
    // Tạo chuyến (chưa có chuyến) mang mã của lệnh sửa ⇒ trước đây trả 200 kèm CHI TIẾT CHUYẾN P.
    laDungLai(await w.call("POST", "/api/van-chuyen/chuyen", {
      as: SALES, body: { requestId: rid, xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER2}`, ...gio("19:00", "20:00") },
    }));
    assert.equal(soSuKien(w, rid), 1, "không sự kiện mới nào mang mã này");
  } finally {
    tat();
  }
});

test("gửi lặp đúng lệnh vẫn 200: tạo chuyến (cùng chuyến cũ) và dời khách (sự kiện nằm ở chuyến ĐÍCH, related_trip_id = chuyến nguồn); mã dời dùng cho rút ⇒ 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { pId, qId, suatP } = await haiChuyenKeHoach(w);
    const ridTao = uuid();
    const thanTao = { requestId: ridTao, xeId: xe(w, 16), taiXePartyId: `pty-${DRIVER2}`, ...gio("19:00", "20:00") };
    const t1 = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: thanTao });
    assert.equal(t1.status, 201, t1.text);
    const t2 = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: thanTao });
    assert.equal(t2.status, 200, t2.text);
    assert.equal(t2.json.chuyen.id, t1.json.chuyen.id);
    const ridDoi = uuid();
    const thanDoi = { version: dongChuyen(w, pId).version, requestId: ridDoi, suatIds: [suatP[0]], denChuyenId: qId, denVersion: dongChuyen(w, qId).version };
    const d1 = await w.call("POST", `/api/van-chuyen/chuyen/${pId}/doi`, { as: SALES, body: thanDoi });
    assert.equal(d1.status, 200, d1.text);
    const d2 = await w.call("POST", `/api/van-chuyen/chuyen/${pId}/doi`, { as: SALES, body: thanDoi });
    assert.equal(d2.status, 200, d2.text);
    assert.equal(soSuKien(w, ridDoi), 1);
    // Mã của lệnh dời (ALLOCATION_MOVED, trip_id = Q) dùng cho "rút" trên Q ⇒ khác loại.
    const suatQ = w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL", qId)[0].id;
    laDungLai(await w.call("POST", `/api/van-chuyen/chuyen/${qId}/rut`, { as: SALES, body: { version: dongChuyen(w, qId).version, requestId: ridDoi, suatIds: [suatQ] } }));
    assert.equal(w.q("SELECT count(*) AS n FROM vc_trip_allocation WHERE id = ? AND valid_to_at IS NULL", suatQ)[0].n, 1, "suất trên Q không bị rút");
  } finally {
    tat();
  }
});

/** Chuyến 12:30–15:00 chở hai đơn (A đón 13:00, B đón 13:10), đã xuất bến 12:35, đã tới A (12:40) và B (12:44). */
async function chuyenDangChay(w: any) {
  const dA = await don(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A" });
  const dB = await don(w, { soNguoi: 2, gio: "13:10", noiDon: "Khách sạn B" });
  const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
  await xepHet(w, c, dA, 2);
  const sau = await xepHet(w, c, dB, 2);
  const id = c.chuyen.id as string;
  const suatCua = (legId: string) => sau.suat.filter((s: any) => s.loai === "PASSENGER" && s.legId === legId);
  const sA = suatCua(dA.legId);
  const sB = suatCua(dB.legId);
  denGio("12:35");
  assert.equal((await tienDo(w, "tai-xe", id, "xuat-ben")).status, 200);
  denGio("12:40");
  assert.equal((await tienDo(w, "tai-xe", id, `diem/${sA[0].diemLen}/da-toi`)).status, 200);
  denGio("12:44");
  assert.equal((await tienDo(w, "tai-xe", id, `diem/${sB[0].diemLen}/da-toi`)).status, 200);
  return { id, sA: sA.map((s: any) => s.id as string), sB: sB.map((s: any) => s.id as string) };
}

test("lệnh tiến độ (bài s7): mã của 'đã đón A0' dùng cho 'vắng B0' (tài xế) và 'đã đón B0' (văn phòng bấm thay — cùng loại, KHÁC suất) ⇒ 409; lặp đúng lệnh ⇒ 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { id, sA, sB } = await chuyenDangChay(w);
    const ridCu = uuid();
    assert.equal((await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/don`, { requestId: ridCu })).status, 200);
    denGio("12:45");
    laDungLai(await tienDo(w, "tai-xe", id, `phan-bo/${sB[0]}/vang`, { requestId: ridCu }));
    assert.equal(trangThaiSuat(w, sB[0]), "WAITING");
    laDungLai(await tienDo(w, "van-phong", id, `phan-bo/${sB[0]}/don`, { requestId: ridCu }));
    assert.equal(trangThaiSuat(w, sB[0]), "WAITING");
    // Điểm: mã của "đã đón A0" dùng cho "kết thúc" ⇒ khác loại.
    laDungLai(await tienDo(w, "tai-xe", id, "ket-thuc", { requestId: ridCu }));
    // Gửi lặp ĐÚNG lệnh (cùng suất, cùng loại) ⇒ 200.
    const lap = await tienDo(w, "tai-xe", id, `phan-bo/${sA[0]}/don`, { requestId: ridCu });
    assert.equal(lap.status, 200, lap.text);
    assert.equal(soSuKien(w, ridCu), 1);
    assert.equal(trangThaiSuat(w, sA[0]), "BOARDED");
  } finally {
    tat();
  }
});

// Khung thử chạy các request gần như tuần tự nên lần gửi sau gặp sự kiện ở bước tra của ROUTE; đường chạy lô (`chayLo` — thua cổng / đụng UNIQUE khi đồng
// thời thật) kiểm bằng D1 giả ở lenh-lap.test.ts.
test("hai lệnh KHÁC nhau cùng mã gửi cùng lúc (Promise.all) — một lệnh ghi, lệnh kia 409 request_id_reused (trước đây cả hai 200, một lệnh lặng lẽ không làm gì)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { id, sB } = await chuyenDangChay(w);
    const rid = uuid();
    const [r1, r2] = await Promise.all([
      tienDo(w, "tai-xe", id, `phan-bo/${sB[0]}/don`, { requestId: rid }),
      tienDo(w, "tai-xe", id, `phan-bo/${sB[1]}/vang`, { requestId: rid }),
    ]);
    assert.equal(soSuKien(w, rid), 1);
    const thang = [r1, r2].filter((r) => r.status === 200);
    const thua = [r1, r2].filter((r) => r.status !== 200);
    assert.equal(thang.length, 1, `${r1.status} ${r1.text} | ${r2.status} ${r2.text}`);
    laDungLai(thua[0]);
    // Đúng một suất đổi trạng thái.
    const doi = [trangThaiSuat(w, sB[0]) === "BOARDED", trangThaiSuat(w, sB[1]) === "NO_SHOW"].filter(Boolean).length;
    assert.equal(doi, 1);
  } finally {
    tat();
  }
});

test("lớp vé chung (ADR-0094) KHÔNG bắt ca này: mã lệnh dùng lại kèm VÉ MỚI (idempotency-key) vẫn tới route ⇒ 409 request_id_reused của route (không phải 422 của lớp vé)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { pId, qId } = await haiChuyenKeHoach(w);
    const rid = uuid();
    const r1 = await w.call("PUT", `/api/van-chuyen/chuyen/${pId}`, {
      as: SALES, body: { version: dongChuyen(w, pId).version, requestId: rid, ...gio("16:05", "18:05") }, headers: { "idempotency-key": uuid() },
    });
    assert.equal(r1.status, 200, r1.text);
    await w.choNen();
    const q0 = dongChuyen(w, qId);
    const r2 = await w.call("PUT", `/api/van-chuyen/chuyen/${qId}`, {
      as: SALES, body: { version: q0.version, requestId: rid, ...gio("16:10", "18:10") }, headers: { "idempotency-key": uuid() },
    });
    laDungLai(r2);
    assert.equal(r2.headers.get("idempotent-replayed"), null, "không phải phát lại của lớp vé");
    assert.deepEqual(dongChuyen(w, qId), q0);
  } finally {
    tat();
  }
});

test("bài quét: route lệnh chuyến của van-chuyen không tự tra `eventByRequest` để quyết 'lệnh lặp' — phải qua `traLenhLap` (so chuyến + loại lệnh)", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  // Ngoại lệ có tên DUY NHẤT: route tạo chuyến đọc lại sự kiện VỪA ghi (của chính lệnh này) để lấy id chuyến mới — sau khi đã qua traLenhLap.
  const goi = [...src.matchAll(/eventByRequest\(env\.DB, [^)]*\)/g)].map((m) => m[0]);
  assert.deepEqual(goi, ["eventByRequest(env.DB, t.requestId)"], `còn chỗ tự tra lệnh lặp: ${goi.join(" | ")}`);
  assert.ok(/lap\?\.trip_id \?\? \(await eventByRequest\(env\.DB, t\.requestId\)\)!\.trip_id/.test(src), "ngoại lệ chỉ là lần đọc lại sau khi tạo");
  const n = [...src.matchAll(/await traLenhLap\(env\.DB, /g)].length;
  assert.ok(n >= 29, `chỉ thấy ${n} lời gọi traLenhLap`);
});
