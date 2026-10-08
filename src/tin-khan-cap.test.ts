// TIN ĐIỀU CHỈNH KHẨN CẤP CHO TÀI XẾ (ADR-0104 Đ1 mục 6; kế hoạch NT-11, T1.7). Máy chủ thật (khung thử harness + D1 node:sqlite; chính sách gieo: mốc
// 360 phút), đồng hồ giả 2027-03-11 06:00 giờ VN. Lệnh khách (xếp / rút / dời) mang luật vượt `MOC_TOI_THIEU` trên chuyến có dòng lái mở → tài xế đang lái
// có tin (không tên, không SĐT); cùng lệnh không vượt mốc → không tin; người làm, văn phòng không nhận. Nguồn: hộp thông báo `GET /api/thong-bao` +
// dữ kiện `chuyenChoTinTheoId` (khoá `khanCap` = id sự kiện) + dòng gõ cửa `dongChuyenTheoId`.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app } from "../tests/audit/harness.mjs";
import { ADM, DRIVER, DRIVER2, NGAY_SAU, SALES, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe } from "../tests/audit/dieu-phoi-khung.mjs";

const PL = { lyDo: "PHA_LE_SU_CO" };
const goi = (w: any, as: string, m: string, duoi: string, body: Record<string, unknown>) => w.call(m, `/api/van-chuyen/chuyen${duoi}`, { as, body: { requestId: uuid(), ...body } });
const phienBan = async (w: any, id: string) => (await chiTiet(w, id, ADM)).chuyen.version;
const xep = async (w: any, as: string, tripId: string, chang: unknown[], extra: Record<string, unknown> = {}) =>
  goi(w, as, "POST", `/${tripId}/phan-bo`, { version: await phienBan(w, tripId), chang, ...extra });
const tinKhanCap = async (w: any, as: string): Promise<string[]> =>
  (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && /điều chỉnh khẩn cấp/.test(x.cau)).map((x: any) => x.cau);

test("NT-11 (ADR-0104 Đ1 mục 6): xếp / rút dưới mốc có điều chỉnh khẩn cấp → tài xế đang lái có tin; Bán hàng (người làm), Quản trị không; câu không tên, không SĐT", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const x = await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    const tin1 = await tinKhanCap(w, DRIVER);
    assert.deepEqual(tin1, [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${t.chuyen.ma} ngày 11/03 (xếp thêm khách) — mở để xem`]);
    assert.deepEqual(await tinKhanCap(w, SALES), [], "người làm không tự nhận");
    assert.deepEqual(await tinKhanCap(w, ADM), [], "không tin cho Quản trị");
    const rut = await goi(w, SALES, "POST", `/${t.chuyen.id}/rut`, { version: await phienBan(w, t.chuyen.id), suatIds: [x.json.suat[0].id], phaLe: PL });
    assert.equal(rut.status, 200, rut.text);
    assert.equal((await tinKhanCap(w, DRIVER)).filter((c) => /rút khách/.test(c)).length, 1);
    // Dữ kiện chuyến cho tin: `khanCap` = id sự kiện mang MOC_TOI_THIEU trong số id được hỏi.
    const ev = w.q("SELECT id FROM vc_trip_event WHERE trip_id = ? AND kind IN ('ALLOCATED', 'ALLOCATION_REMOVED') ORDER BY rowid", t.chuyen.id).map((r: any) => r.id);
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [t.chuyen.id], suKienIds: ev });
    assert.deepEqual([...f.khanCap].sort(), [...ev].sort());
    // Đường gõ cửa (gốc lắp ráp): dòng của lệnh xếp mang khanCap.
    const kq = await app.dongChuyenTheoId(w.env.DB, ev[0], (q: any) => app.chuyenChoTinTheoId(w.env.DB, q));
    assert.equal(kq?.dong.khanCap, true);
    assert.doesNotMatch(JSON.stringify(tin1), /Khách|09\d{8}/);
  } finally {
    tat();
  }
});

test("NT-11: cùng lệnh KHÔNG vượt mốc → không tin — xếp chuyến ngoài mốc; xếp chặng đặt gấp vào chuyến dưới mốc (không cờ mốc)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { ngay: NGAY_SAU, gio: "09:00", soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "12:00" }); // ngoài mốc
    assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: a.legId, soSuat: 2 }])).status, 200);
    const gap = await don(w, { gio: "13:00", soNguoi: 2 });
    assert.equal((await w.call("POST", `/api/orders/${gap.id}/legs/${gap.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    assert.equal((await xep(w, SALES, t2.chuyen.id, [{ legId: gap.legId, soSuat: 2 }])).status, 200);
    assert.deepEqual(await tinKhanCap(w, DRIVER), []);
    assert.deepEqual(await tinKhanCap(w, DRIVER2), []);
  } finally {
    tat();
  }
});

test("NT-11: dời có điều chỉnh khẩn cấp → tài xế chuyến ĐÍCH (sự kiện ghi ở đích) có tin; tài xế chuyến NGUỒN không (giả định — câu hỏi ở báo cáo thi công)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:10", kt: "15:00" });
    const x = await xep(w, ADM, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    const d = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, {
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id), phaLe: PL,
    });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(await tinKhanCap(w, DRIVER2), [`Văn phòng vừa điều chỉnh khẩn cấp chuyến ${dich.chuyen.ma} ngày 11/03 (chuyển khách tới) — mở để xem`]);
    assert.equal((await tinKhanCap(w, DRIVER)).filter((c) => /chuyển khách/.test(c)).length, 0, "tài xế nguồn không có tin dời");
  } finally {
    tat();
  }
});
