// ADR-0136 Đ10 qua ROUTE THẬT: «Gửi xác nhận» → mọi người giữ ô `order.confirm.review` đọc «Đơn … đang chờ xác nhận» ở hộp thư VÀ ở câu màn hình khoá
// (GET /api/thong-bao/moi-nhat — nơi service worker lấy chữ sau cú gõ cửa). Lỗi bản 2.36: route ghi `order_confirm_requested` nhưng view hộp thư
// `v_aud_order_event` (0025) không có hành động đó ⇒ báo đẩy vẫn bắn (gõ cửa dựng tin từ HANH_DONG_CUA_THAY_DOI) mà hộp thư không có mục, và màn hình khoá
// hiện câu của tin chưa đọc CŨ HƠN. Chạy cả ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { A, ADM, B, ACC, H, INTERN, LAI, PARTNER, SUP, datCo, lap, setup } from "../../../tests/audit/xac-nhan-khung.mjs";

const cuaDon = (res: any, ma: string) => res.json.tin.filter((t: any) => t.loai === "cho_xac_nhan" && t.maDon === ma);

test("gửi xác nhận → người xét duyệt có tin «đang chờ xác nhận» ở hộp thư và ở câu màn hình khoá; người gửi, Đối tác, Thực tập không có", async () => {
  const w = setup();
  datCo(w, "SERVICE", "ZA1", true);
  // Tin chưa đọc CŨ HƠN trong ngăn «Của tôi» của mọi người nội bộ: thiếu tin chờ xác nhận thì màn hình khoá đọc nhầm câu này.
  const thuCong = await w.call("POST", "/api/thong-bao", { as: SUP, body: { tieuDe: "Tin cũ hơn", noiDung: "Nội dung tin cũ hơn", nguoiNhan: "noi-bo", quanTrong: false, clientRequestId: crypto.randomUUID() } });
  assert.equal(thuCong.status, 201, thuCong.text);
  const o = await lap(w, A);
  assert.ok(typeof o.orderCode === "string" && o.orderCode.length > 0, JSON.stringify(o));
  const g = await w.call("POST", `/api/orders/${o.id}/gui-xac-nhan`, { as: A, body: {} });
  assert.equal(g.status, 201, g.text);
  const cau = `Đơn ${o.orderCode} đang chờ xác nhận`;

  // Bán hàng khác, tài khoản lai Bán hàng + Đối tác, Quản trị, Kế toán, HDV, Toàn quyền: đều giữ ô xét duyệt (permissions.ts — order.confirm.review).
  for (const as of [B, LAI, ADM, ACC, H, SUP]) {
    const hop = await w.call("GET", "/api/thong-bao?ngan=cua-toi", { as });
    assert.equal(hop.status, 200, hop.text);
    const tin = cuaDon(hop, o.orderCode);
    assert.equal(tin.length, 1, `${as}: ${JSON.stringify(hop.json.tin)}`);
    assert.equal(tin[0].cau, cau, as); // Đ10: không bao giờ kèm tên người gửi, kể cả với Toàn quyền
    assert.equal(tin[0].lienKet, `/order?id=${o.id}`, as);
    assert.equal(tin[0].cuaToi, true, as);
    assert.equal(tin[0].chuaDoc, true, as);
    const moi = await w.call("GET", "/api/thong-bao/moi-nhat", { as });
    assert.equal(moi.status, 200, moi.text);
    assert.equal(moi.json.tin?.cau, cau, `${as}: màn hình khoá phải đọc đúng câu tin mới nhất — ${moi.text}`);
  }
  // Người gửi không nhận tin của chính mình; Đối tác, Thực tập không giữ ô xét duyệt — ở cả hai ngăn.
  for (const as of [A, PARTNER, INTERN]) {
    for (const ngan of ["cua-toi", "tat-ca"]) {
      const hop = await w.call("GET", `/api/thong-bao?ngan=${ngan}`, { as });
      assert.equal(hop.status, 200, hop.text);
      assert.equal(cuaDon(hop, o.orderCode).length, 0, `${as} ${ngan}: ${hop.text}`);
    }
  }
});
