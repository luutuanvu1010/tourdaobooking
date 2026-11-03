// Cạnh tranh giữ vé (ADR-0153; kế hoạch Task 3, Step 1/4): hai lô cùng giữ vé CUỐI CÙNG ⇒ đúng một lô thắng. Hai lô được SOẠN trước (như hai request đọc cùng lúc)
// rồi mới chạy lần lượt — D1 chạy một lô trọn vẹn rồi mới tới lô kia, nên thứ tự này là cách duy nhất hai lô thật gặp nhau.
import { test } from "node:test";
import assert from "node:assert/strict";
import { soanCapVe } from "./cap-ve.ts";
import { AT, chayLo, d1That, dem, nhatKyThu, taoCsdl, themLo, themVe } from "../../khung-thu-ve.test.ts";

const mot = { adult: 1, child: 0, senior: 0, infant: 0 };
const dich = (orderId: string, serviceId: string) => ({ orderId, serviceId, catalogCode: "V2D", ngayDi: "2026-10-24", pax: mot });

test("haiLoCungGiuMotVe_chiMotThang: vé cuối cùng chỉ thuộc một dịch vụ", async () => {
  const d = taoCsdl();
  themVe(d, themLo(d));
  const a = soanCapVe(d1That(d), dich("o-1", "s-1"), "s-1", AT, nhatKyThu(d1That(d))).cau;
  const b = soanCapVe(d1That(d), dich("o-2", "s-2"), "s-2", AT, nhatKyThu(d1That(d))).cau;
  const ra = chayLo(d, a);
  const rb = chayLo(d, b);
  assert.equal(ra[0]! > 0 ? 1 : 0, 1, "lô đầu giữ được vé");
  assert.equal(rb.every((x) => x === 0) || rb[0] === 0, true, "lô sau không đổi vé nào");
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE released_at IS NULL"), 1);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_ticket WHERE status = 'ALLOCATED'"), 1);
});

test("nhiều lô song song trên kho 3 vé: tổng vé giữ không bao giờ vượt kho, mỗi vé một chỗ", async () => {
  const d = taoCsdl();
  const lo = themLo(d);
  for (let i = 0; i < 3; i++) themVe(d, lo);
  const lo5 = [1, 2, 3, 4, 5].map((i) => soanCapVe(d1That(d), dich(`o-${i}`, `s-${i}`), "s", AT, nhatKyThu(d1That(d))).cau);
  for (const l of lo5) chayLo(d, l);
  assert.equal(dem(d, "SELECT count(*) AS c FROM vdt_allocation WHERE released_at IS NULL"), 3);
  assert.equal(dem(d, "SELECT count(DISTINCT ticket_id) AS c FROM vdt_allocation WHERE released_at IS NULL"), 3);
});

test("chốt chặn cuối là chỉ mục duy nhất: câu chèn phân bổ lách qua cổng trạng thái vẫn bị CSDL chặn", async () => {
  const d = taoCsdl();
  const t = themVe(d, themLo(d));
  chayLo(d, soanCapVe(d1That(d), dich("o-1", "s-1"), "s-1", AT, nhatKyThu(d1That(d))).cau);
  assert.throws(
    () => d.prepare(`INSERT INTO vdt_allocation (id, ticket_id, order_id, order_service_id, pax_group, slot_no, allocated_at, created_at, updated_at) VALUES ('x', ?, 'o-2', 's-2', 'ADULT', 1, ?, ?, ?)`).run(t, AT, AT, AT),
    /UNIQUE/i,
  );
});
