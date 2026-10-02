// ADR-0052 D6.1: nguồn tin chuyến = v_aud_trip_event (chỉ khoá) + dữ kiện van-chuyen theo id (hàm công bố). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app } from "../../../tests/audit/harness.mjs";
import { DRIVER, DRIVER2, SALES, batDongHo, chuyenSan, setup, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

test("v_aud_trip_event: đúng 5 cột khoá, không detail; mỗi lệnh chuyến một dòng, id = id vc_trip_event", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const cot = w.q("SELECT name FROM pragma_table_info('v_aud_trip_event')").map((x: any) => x.name);
    assert.deepEqual(cot, ["id", "trip_id", "staff_id", "action", "created_at"]);
    const dong = w.q("SELECT e.action FROM v_aud_trip_event e JOIN vc_trip_event v ON v.id = e.id WHERE e.trip_id = ? ORDER BY e.created_at", a.id).map((x: any) => x.action);
    // Đồng hồ giả đứng yên ⇒ hai lệnh cùng mốc — so không theo thứ tự (điều cần: mỗi lệnh đúng một dòng, id khớp vc_trip_event).
    assert.deepEqual([...dong].sort(), ["trip_allocated", "trip_created"]);
  } finally {
    tat();
  }
});

test("chuyenChoTinTheoId: mã, ngày, khoảng lái (cả dòng đã đóng); suất vắng → đơn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { soNguoi: 2 });
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    const doi = await w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER2}` } });
    assert.equal(doi.status, 200, doi.text);
    const f = await app.chuyenChoTinTheoId(w.env.DB, { tripIds: [a.id], suKienIds: [] });
    assert.equal(f.chuyen[0].ma, a.ma);
    assert.deepEqual(f.chuyen[0].lai.map((k: any) => [k.partyId, k.den === null]).sort(), [[`pty-${DRIVER}`, false], [`pty-${DRIVER2}`, true]]);
    assert.ok(!JSON.stringify(f).includes("Khách Dò Tìm"));
  } finally {
    tat();
  }
});
