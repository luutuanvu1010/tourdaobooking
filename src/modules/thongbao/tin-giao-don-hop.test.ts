// B-01 qua ROUTE THẬT: Bán hàng giao đơn cho hướng dẫn viên → hướng dẫn viên đọc "cho bạn phụ trách" ở hộp thư VÀ ở câu màn hình khoá
// (GET /api/thong-bao/moi-nhat, nơi service worker lấy chữ); Quản trị (không phải người được giao) vẫn đọc câu cũ.
// ADR-0131 đ3: tên người làm ("An") chỉ hiện cho Toàn quyền — HDV, Quản trị, Kế toán đọc câu không tên ở CẢ hộp thư lẫn câu màn hình khoá.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, FIELD, SALES, SUP, batDongHo, chuyenSan, denGio, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";

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
    assert.equal(giaoCuaField[0].cau, `Đơn ${a.don.code} vừa được giao cho bạn phụ trách`);
    const moi = await w.call("GET", "/api/thong-bao/moi-nhat", { as: FIELD });
    assert.equal(moi.status, 200, moi.text);
    assert.equal(moi.json.tin.cau, `Đơn ${a.don.code} vừa được giao cho bạn phụ trách`);
    assert.ok(!moi.text.includes("cho người khác"), moi.text);
    assert.ok(!moi.text.includes("An vừa") && !hopFieldRes.text.includes("An vừa"), "HDV không được thấy tên người giao");
    const admRes = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: ADM });
    const giaoAdm = admRes.json.tin.filter((t: any) => t.loai === "giao" && t.cau.includes(a.don.code));
    assert.ok(giaoAdm.length >= 1, JSON.stringify(admRes.json.tin));
    for (const t of giaoAdm) assert.ok(!t.cau.includes("cho bạn") && !t.cau.includes("An vừa"), t.cau);
    // Kế toán: không tên ở hộp thư lẫn câu màn hình khoá; Toàn quyền: thấy tên người giao.
    const accHop = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: ACC });
    assert.equal(accHop.status, 200, accHop.text);
    const giaoAcc = accHop.json.tin.filter((t: any) => t.loai === "giao" && t.cau.includes(a.don.code));
    assert.ok(giaoAcc.length >= 1, accHop.text);
    for (const t of giaoAcc) assert.equal(t.cau, `Đơn ${a.don.code} vừa đổi người phụ trách`);
    const accMoi = await w.call("GET", "/api/thong-bao/moi-nhat", { as: ACC });
    assert.equal(accMoi.status, 200, accMoi.text);
    assert.ok(!accMoi.text.includes("An vừa"), accMoi.text);
    const supHop = await w.call("GET", "/api/thong-bao?ngan=tat-ca", { as: SUP });
    assert.equal(supHop.status, 200, supHop.text);
    const giaoSup = supHop.json.tin.filter((t: any) => t.loai === "giao" && t.cau.includes(a.don.code));
    assert.ok(giaoSup.length >= 1, supHop.text);
    for (const t of giaoSup) assert.equal(t.cau, `An vừa giao đơn ${a.don.code} cho người khác phụ trách`);
  } finally {
    tat();
  }
});
