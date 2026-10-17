// B-01 qua ROUTE THẬT: Bán hàng giao đơn cho hướng dẫn viên → hướng dẫn viên đọc "cho bạn phụ trách" ở hộp thư VÀ ở câu màn hình khoá
// (GET /api/thong-bao/moi-nhat, nơi service worker lấy chữ); Quản trị (không phải người được giao) vẫn đọc câu cũ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, FIELD, SALES, batDongHo, chuyenSan, denGio, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

test("giao đơn cho HDV → HDV đọc 'cho bạn phụ trách' ở hộp thư và ở câu màn hình khoá; Quản trị vẫn đọc câu cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("06:10"); // sau mốc lập đơn, nếu không dòng giao đơn bị coi là cùng lô lập (đồng hồ thử đứng yên)
    assert.equal((await w.call("PUT", `/api/orders/${a.don.id}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
    const hopFieldRes = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as: FIELD });
    assert.equal(hopFieldRes.status, 200, hopFieldRes.text);
    const giaoCuaField = hopFieldRes.json.tin.filter((t: any) => t.loai === "giao" && t.cau.includes(a.don.code));
    assert.equal(giaoCuaField.length, 1, JSON.stringify(hopFieldRes.json.tin));
    assert.match(giaoCuaField[0].cau, new RegExp(`^.+ vừa giao đơn ${a.don.code} cho bạn phụ trách$`));
    const moi = await w.call("GET", "/api/thong-bao/moi-nhat", { as: FIELD });
    assert.equal(moi.status, 200, moi.text);
    assert.match(moi.json.tin.cau, new RegExp(`^.+ vừa giao đơn ${a.don.code} cho bạn phụ trách$`));
    assert.ok(!moi.text.includes("cho người khác"), moi.text);
    const admRes = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: ADM });
    const giaoAdm = admRes.json.tin.filter((t: any) => t.loai === "giao" && t.cau.includes(a.don.code));
    assert.ok(giaoAdm.length >= 1, JSON.stringify(admRes.json.tin));
    for (const t of giaoAdm) assert.ok(!t.cau.includes("cho bạn"), t.cau);
  } finally {
    tat();
  }
});
