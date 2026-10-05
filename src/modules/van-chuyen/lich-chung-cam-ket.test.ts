// ĐỢT 7 TASK 8a (ADR-0056 VK3-A): DTO lịch chung (`GET /api/van-chuyen/lich`) trả hai cờ cam kết `xeRieng` / `choToiThieu` của từng chặng, và KHÔNG BAO GIỜ lộ
// khoá phá lệ (`commitment_override_key`, hay khoá `khoa`) dù chuyến đã phá lệ cam kết. Chạy CẢ ứng dụng trên SQLite thật (tests/audit/dieu-phoi-khung.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, NGAY, SALES, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

test("Lịch chung: chặng mang xeRieng / choToiThieu đúng giá trị đã lưu; chặng không cam kết = false / null; JSON không chứa khoá phá lệ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}` });
    const a = await don(w, { soNguoi: 2 });
    const b = await don(w, { soNguoi: 2 });
    const c = await don(w, { soNguoi: 2 });
    const sua = async (o: any, over: Record<string, unknown>) => {
      const ord = (await w.call("GET", `/api/orders/${o.id}`, { as: ADM })).json.order;
      const l = ord.services.flatMap((s: any) => s.legs).find((x: any) => x.id === o.legId);
      const leg = { pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over };
      const r = await w.call("PUT", `/api/orders/${o.id}/legs/${o.legId}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg } });
      assert.equal(r.status, 200, r.text);
    };
    await sua(a, { exclusiveVehicle: true });
    await sua(b, { minVehicleSeats: 16 });
    // B cần ≥ 16 chỗ, xe 15 ⇒ xếp B phải phá lệ; sau đó chuyến mang khoá phá lệ thật trong cột
    const id = t.chuyen.id as string;
    const xep = async (legId: string, as: string, extra: Record<string, unknown> = {}) =>
      w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as, body: { version: (await chiTiet(w, id)).chuyen.version, requestId: uuid(), chang: [{ legId, soSuat: 2 }], ...extra } });
    assert.equal((await xep(b.legId, SALES)).json.error.code, "can_pha_le_cam_ket");
    assert.equal((await xep(b.legId, ADM, { camKetPhaLe: { lyDo: "PHA_LE_SU_CO" } })).status, 200);
    assert.ok(w.q("SELECT commitment_override_key k FROM vc_trip WHERE id = ?", id)[0].k, "chuyến có khoá phá lệ trong cột");

    const r = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    assert.equal(r.status, 200, r.text);
    const chang = (legId: string) => r.json.chang.find((x: any) => x.legId === legId);
    assert.equal(chang(a.legId).xeRieng, true);
    assert.equal(chang(a.legId).choToiThieu, null);
    assert.equal(chang(b.legId).xeRieng, false);
    assert.equal(chang(b.legId).choToiThieu, 16);
    assert.equal(chang(c.legId).xeRieng, false);
    assert.equal(chang(c.legId).choToiThieu, null);
    assert.ok(!r.text.includes("commitment_override_key"), "JSON không chứa commitment_override_key");
    assert.ok(!/"khoa"\s*:/.test(r.text), 'JSON không có khoá "khoa"');
    assert.ok(!r.text.includes(":CX:") && !r.text.includes(":XR:"), "JSON không chứa chuỗi khoá phá lệ");
  } finally {
    tat();
  }
});
