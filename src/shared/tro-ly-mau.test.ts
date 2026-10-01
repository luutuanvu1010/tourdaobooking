// Danh sách mẫu đóng + giá + chi phí (ADR-0073 Đ1, Đ7b). Thuần. Hàng rào "mẫu ngoài danh sách bị từ chối" canh ở tro-ly-bo-nao.test.ts (kiemBoNao);
// ở đây canh: giá micro-USD số nguyên, chi phí theo MẪU của lượt, lượt cũ (mẫu NULL) tính giá nano, trần tháng kiểm cả chi phí tối đa trước khi gọi.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DANH_SACH_MAU, DO_DAI, DO_DAI_NHAN, MAU_MAC_DINH, MUC_NHAN, TOKEN_VAO_UOC_MOT_CAU, chiPhiMicroUsd, chiPhiToiDa, timMau, uocMotCauMicroUsd, vuotTranThang,
} from "./tro-ly-mau.ts";

test("DANH_SACH_MAU: đúng ba mẫu theo thứ tự rẻ → khôn; giá là số nguyên micro-USD / 1 triệu token; có ngày tra + nguồn; mức suy nghĩ không rỗng", () => {
  assert.deepEqual(DANH_SACH_MAU.map((m) => m.ma), ["gpt-5-nano", "gpt-5-mini", "gpt-5"]);
  assert.equal(MAU_MAC_DINH, "gpt-5-nano");
  for (const m of DANH_SACH_MAU) {
    for (const v of [m.gia.vao, m.gia.vaoDem, m.gia.ra]) assert.ok(Number.isInteger(v) && v > 0, `${m.ma}: ${v}`);
    assert.ok(m.gia.vaoDem <= m.gia.vao && m.gia.vao <= m.gia.ra, m.ma);
    assert.match(m.ngayTraGia, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(m.nguonGia, /^https:\/\/developers\.openai\.com\//);
    assert.ok(m.mucSuyNghi.length > 0);
    for (const x of m.mucSuyNghi) assert.ok(x in MUC_NHAN, x);
    assert.ok(m.ten.length > 0 && !/_/.test(m.ten));
  }
  assert.deepEqual(DANH_SACH_MAU[0]!.gia, { vao: 50_000, vaoDem: 5_000, ra: 400_000 }, "nano: 0,05 / 0,005 / 0,40 USD");
  assert.deepEqual(DO_DAI, ["low", "medium", "high"]);
  assert.deepEqual(Object.values(DO_DAI_NHAN), ["Ngắn", "Vừa", "Dài"]);
});

test("timMau: mã có trong danh sách ⇒ mẫu; lạ / rỗng / null ⇒ null", () => {
  assert.equal(timMau("gpt-5-mini")?.ma, "gpt-5-mini");
  for (const x of ["gpt-4o", "", null, undefined, "GPT-5"]) assert.equal(timMau(x), null, String(x));
});

test("chiPhiMicroUsd: theo giá MẪU của lượt, làm tròn LÊN, số nguyên; mẫu null / lạ ⇒ giá nano (lượt cũ — B8)", () => {
  const u = { vao: 5000, vaoDem: 1000, ra: 700 };
  assert.equal(chiPhiMicroUsd(u, "gpt-5-nano"), 485); // 4000×0,05 + 1000×0,005 + 700×0,40
  assert.equal(chiPhiMicroUsd(u, null), 485);
  assert.equal(chiPhiMicroUsd(u, "mau-la"), 485);
  assert.equal(chiPhiMicroUsd(u), 485);
  const mini = DANH_SACH_MAU[1]!.gia;
  assert.equal(chiPhiMicroUsd(u, "gpt-5-mini"), Math.ceil((4000 * mini.vao + 1000 * mini.vaoDem + 700 * mini.ra) / 1_000_000));
  assert.equal(chiPhiMicroUsd({ vao: 1, vaoDem: 0, ra: 0 }, "gpt-5-nano"), 1, "0,05 → làm tròn lên 1");
  assert.equal(chiPhiMicroUsd(null, "gpt-5"), 0);
  assert.ok(Number.isInteger(chiPhiMicroUsd({ vao: 12345, vaoDem: 777, ra: 999 }, "gpt-5")));
});

test("chiPhiToiDa + uocMotCauMicroUsd: token vào ước × giá vào + token ra tối đa × giá ra; ước một câu = 6.000 token vào", () => {
  const g = DANH_SACH_MAU[2]!.gia;
  assert.equal(chiPhiToiDa("gpt-5", 3000, 4000), Math.ceil((3000 * g.vao + 4000 * g.ra) / 1_000_000));
  assert.equal(TOKEN_VAO_UOC_MOT_CAU, 6000);
  assert.equal(uocMotCauMicroUsd("gpt-5-nano", 1200), 780); // 6000×0,05 + 1200×0,40
  assert.ok(uocMotCauMicroUsd("gpt-5", 4000) > uocMotCauMicroUsd("gpt-5-mini", 4000));
  assert.ok(uocMotCauMicroUsd("gpt-5-mini", 4000) > uocMotCauMicroUsd("gpt-5-nano", 4000));
});

test("vuotTranThang (Đ7b): đã chạm trần ⇒ vượt; đã dùng + tối đa > trần ⇒ vượt; bằng trần đúng ⇒ không", () => {
  assert.equal(vuotTranThang(5_000_000, 0, 5_000_000), true);
  assert.equal(vuotTranThang(0, 40_001, 40_000), true);
  assert.equal(vuotTranThang(0, 40_000, 40_000), false);
  assert.equal(vuotTranThang(39_000, 780, 40_000), false);
  assert.equal(vuotTranThang(0, 0, 0), true, "trần 0 = không cho câu nào");
});
