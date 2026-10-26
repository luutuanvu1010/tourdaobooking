// ADR-0135 Đ4 (Task 2.3): hộp thông báo — tin của đơn NHÁP (`created`, `order_handler_changed`, …) chỉ tới người lập; HDV chọn sẵn không nhận. Khi đơn đã xác nhận
// (`laNhap` false), tin `xác nhận` tới người phụ trách như cũ (Review Focus 7).
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, type DongDon } from "./thong-bao.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-10-26T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const LAN = ai("lan", "SALES"), MAI = ai("mai", "ACCOUNTING"), HDV = ai("hdv", "FIELD"), SUP = ai("sup", "SUPER_ADMIN"), ADM = ai("adm", "ADMIN");
const dong = (o: Partial<DongDon> = {}): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20261026-0001", action: "order_handler_changed", actorId: "nguoi-khac",
  tenNguoiLam: "Hùng", luc: "2026-10-26T02:00:00.000Z", ownerId: "lan", phuTrach: { coNguoi: true, staffId: "hdv" }, lapChuaCoNguoi: false, cungLoLap: false, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[]) => locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-10-25T00:00:00.000Z", now: NOW, ngan: "tat-ca" });

test("tin của đơn nháp: Kế toán, Quản trị, Toàn quyền, HDV chọn sẵn KHÔNG nhận bất kỳ tin nào", () => {
  for (const action of ["created", "order_handler_changed", "order_claimed", "confirmed", "cancelled"]) {
    for (const staff of [MAI, ADM, SUP, HDV]) {
      assert.deepEqual(hop(staff, [dong({ action, laNhap: true })]).tin, [], `${staff.id} nhận tin ${action} của đơn nháp`);
    }
  }
});

test("tin của đơn nháp: người LẬP vẫn nhận tin do người khác làm (không bị chặn quá tay)", () => {
  assert.equal(hop(LAN, [dong({ action: "order_handler_changed", laNhap: true })]).tin.length, 1);
});

test("đơn đã xác nhận (laNhap vắng / false): luật cũ giữ nguyên — HDV phụ trách nhận tin xác nhận", () => {
  assert.equal(hop(HDV, [dong({ action: "confirmed" })]).tin.length, 1);
  assert.equal(hop(HDV, [dong({ action: "confirmed", laNhap: false })]).tin.length, 1);
  assert.equal(hop(SUP, [dong({ action: "confirmed" })]).tin.length, 1);
});
