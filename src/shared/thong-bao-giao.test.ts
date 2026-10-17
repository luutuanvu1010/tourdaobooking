// B-01 (rà soát trước launch): người ĐƯỢC GIAO đơn đọc "cho bạn phụ trách", không đọc "cho người khác" (dễ hiểu nhầm mình không phải đi).
// Mọi người xem khác giữ câu cũ. Chữ chọn theo người đang phụ trách HIỆN TẠI (`d.phuTrach`) — nhật ký chỉ ghi tên, không ghi người được giao —
// và chỉ cho lần đổi người MỚI NHẤT của đơn (kiểm độc lập F-1).
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, type DongDon } from "./thong-bao.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-09-27T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const LAN = ai("lan", "SALES"), MAI = ai("mai", "ACCOUNTING"), TAM = ai("tam", "FIELD");
const giao = (o: Partial<DongDon> = {}): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20260927-0001", action: "order_handler_changed", actorId: "hung",
  tenNguoiLam: "Hùng", luc: "2026-09-27T02:00:00.000Z", ownerId: "lan", phuTrach: { coNguoi: true, staffId: "tam" }, lapChuaCoNguoi: false, cungLoLap: false, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[]) => locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-09-26T00:00:00.000Z", now: NOW, ngan: "tat-ca" });

test("B-01: tin giao đơn — người đang phụ trách đọc 'cho bạn phụ trách', người khác giữ câu cũ", () => {
  // (a) HDV được giao: có tên (order.history.view = assigned)
  assert.equal(hop(TAM, [giao()]).tin[0]!.cau, "Hùng vừa giao đơn TD-20260927-0001 cho bạn phụ trách");
  // (b) cùng người, nhánh không tên (dòng không có người làm)
  assert.equal(hop(TAM, [giao({ actorId: null, tenNguoiLam: null })]).tin[0]!.cau, "Đơn TD-20260927-0001 vừa được giao cho bạn phụ trách");
  // (c) người không phụ trách giữ câu cũ ở cả hai nhánh: chủ đơn và Kế toán (có tên), Kế toán khi dòng không có người làm (không tên)
  assert.equal(hop(LAN, [giao()]).tin[0]!.cau, "Hùng vừa giao đơn TD-20260927-0001 cho người khác phụ trách");
  assert.equal(hop(MAI, [giao()]).tin[0]!.cau, "Hùng vừa giao đơn TD-20260927-0001 cho người khác phụ trách");
  assert.equal(hop(MAI, [giao({ actorId: null, tenNguoiLam: null })]).tin[0]!.cau, "Đơn TD-20260927-0001 vừa đổi người phụ trách");
  // loại tin khác không bị đụng: người phụ trách xem tin "xác nhận" vẫn câu cũ
  assert.equal(hop(TAM, [giao({ action: "confirmed" })]).tin[0]!.cau, "Hùng vừa xác nhận đơn TD-20260927-0001");
});

test("B-01 (kiểm độc lập F-1): chỉ dòng đổi người phụ trách MỚI NHẤT của đơn đọc 'cho bạn' — dòng giao cũ hơn đã có người khác nhận sau", () => {
  const cau = (d: DongDon[]) => hop(TAM, d).tin.map((t) => [t.luc, t.cau]);
  // giao hai lần (lần 1 cho người khác lúc 01:00, lần 2 cho Tâm lúc 02:00): Tâm là người phụ trách hiện tại của CẢ hai dòng
  const lan1 = giao({ luc: "2026-09-27T01:00:00.000Z" }), lan2 = giao({ luc: "2026-09-27T02:00:00.000Z" });
  assert.deepEqual(cau([lan2, lan1]), [
    ["2026-09-27T02:00:00.000Z", "Hùng vừa giao đơn TD-20260927-0001 cho bạn phụ trách"],
    ["2026-09-27T01:00:00.000Z", "Hùng vừa giao đơn TD-20260927-0001 cho người khác phụ trách"],
  ]);
  // giao cho người khác rồi Tâm TỰ NHẬN (dòng tự nhận của chính Tâm không thành tin của Tâm, nhưng vẫn là lần đổi người mới nhất)
  const tuNhan = giao({ action: "order_claimed", actorId: "tam", tenNguoiLam: "Tâm", luc: "2026-09-27T02:00:00.000Z" });
  assert.deepEqual(cau([tuNhan, lan1]), [["2026-09-27T01:00:00.000Z", "Hùng vừa giao đơn TD-20260927-0001 cho người khác phụ trách"]]);
});
