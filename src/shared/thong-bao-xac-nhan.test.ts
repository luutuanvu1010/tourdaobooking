// ADR-0136 Đ10 (Task 3.5): tin của bước xác nhận. Đây là việc QUYỀN, không phải giao diện: nó quyết ai biết một nháp RIÊNG TƯ đang tồn tại (ADR-0135 Đ4).
// Lúc gửi: mọi người giữ ô `order.confirm.review` (nhãn kết nối `xet-duyet`), trừ người gửi; Đối tác / Thực tập / HDV được chọn sẵn của nháp KHÔNG. Lúc xác nhận / huỷ: người lập (kể cả
// Đối tác, Thực tập) nhận tin của ĐƠN MÌNH LẬP, không kèm tên người làm (ADR-0131 đ3).
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, loaiTinDon, type DongDon } from "./thong-bao.ts";
import { nhanKetNoi, nhanSuKien, laSuKienHopLe, thongBaoNoi } from "./bang-tin.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-10-26T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const LAP = ai("lap", "SALES"), BH = ai("bh", "SALES"), KT = ai("kt", "ACCOUNTING"), HDV = ai("hdv", "FIELD"), QT = ai("qt", "ADMIN");
const DT = ai("dt", "PARTNER"), DT2 = ai("dt2", "PARTNER"), TT = ai("tt", "INTERN"), HR = ai("hr", "HR");
const don = (o: Partial<DongDon>): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20261026-0001", action: "order_confirm_requested", actorId: "lap",
  tenNguoiLam: "Lập", luc: "2026-10-26T02:00:00.000Z", ownerId: "lap", phuTrach: { coNguoi: false, staffId: null }, lapChuaCoNguoi: false, cungLoLap: false, laNhap: true, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi") =>
  locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-10-25T00:00:00.000Z", now: NOW, ngan });

test("loaiTinDon: order_confirm_requested → cho_xac_nhan", () => {
  assert.equal(loaiTinDon(don({})), "cho_xac_nhan");
});

test("lúc GỬI: Kế toán, HDV, Bán hàng khác, Quản trị nhận (ngăn «Của tôi»); người gửi, Đối tác, Thực tập, Nhân sự thì không; câu không có tên người gửi", () => {
  for (const s of [KT, HDV, BH, QT]) {
    const h = hop(s, [don({})]);
    assert.equal(h.tin.length, 1, s.id);
    assert.equal(h.tin[0]!.cau, "Đơn TD-20261026-0001 đang chờ xác nhận", s.id);
    assert.equal(h.tin[0]!.lienKet, "/order?id=o1", `${s.id}: HDV cũng mở được đơn chờ (Đ6)`);
    assert.ok(!JSON.stringify(h).includes("Lập"), "không lộ tên người gửi");
  }
  for (const s of [LAP, DT, TT, HR]) assert.equal(hop(s, [don({})], "tat-ca").tin.length, 0, s.id);
});

test("lúc GỬI: HDV được người lập CHỌN SẴN làm người phụ trách của nháp vẫn KHÔNG nhận tin giao đơn (Review Focus 7), và chỉ nhận tin xét duyệt vì giữ ô xét duyệt", () => {
  const giao = don({ action: "order_handler_changed", phuTrach: { coNguoi: true, staffId: "hdv" } });
  assert.equal(hop(HDV, [giao], "tat-ca").tin.length, 0);
});

test("lúc XÁC NHẬN / HUỶ: người lập giữ quyền Đối tác hoặc Thực tập nhận tin của ĐƠN MÌNH, không tên; Đối tác khác thì không; tin tạo đơn của họ vẫn không", () => {
  for (const [chu, action, cau] of [[DT, "confirmed", "Đơn TD-20261026-0001 vừa được xác nhận"], [TT, "cancelled", "Đơn TD-20261026-0001 vừa bị huỷ"]] as const) {
    const h = hop(chu, [don({ action, ownerId: chu.id, actorId: "kt", tenNguoiLam: "Kế Toán", laNhap: false, phuTrach: { coNguoi: true, staffId: "hdv" } })]);
    assert.equal(h.tin.length, 1, `${chu.id}/${action}`);
    assert.equal(h.tin[0]!.cau, cau);
    assert.ok(!JSON.stringify(h).includes("Kế Toán"));
  }
  const cuaNguoiKhac = don({ action: "confirmed", ownerId: "dt", actorId: "kt", laNhap: false, phuTrach: { coNguoi: true, staffId: "hdv" } });
  assert.equal(hop(DT2, [cuaNguoiKhac], "tat-ca").tin.length, 0);
  assert.equal(hop(DT, [don({ action: "created", ownerId: "dt", actorId: "dt", laNhap: true })], "tat-ca").tin.length, 0);
});

test("nhãn kết nối: `xet-duyet` ⇔ giữ ô xét duyệt (kể cả HDV, không kể Đối tác, Thực tập, Nhân sự)", () => {
  for (const s of [KT, HDV, BH, QT, ai("vu", "SUPER_ADMIN")]) assert.ok(nhanKetNoi(s).includes("xet-duyet"), s.id);
  for (const s of [DT, TT, HR, ai("tx", "DRIVER")]) assert.ok(!nhanKetNoi(s).includes("xet-duyet"), s.id);
});

test("nhãn sự kiện: nháp vừa gửi / rút → người lập + `xet-duyet`, KHÔNG `tat-ca`, không `cho-nhan`, không người phụ trách chọn sẵn; nháp thường vẫn chỉ người lập", () => {
  const phuTrach = { coNguoi: true, staffId: "hdv" };
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: phuTrach, laNhap: true, choXacNhan: true }), ["nguoi:lap", "xet-duyet"]);
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: phuTrach, laNhap: true }), ["nguoi:lap"]);
});

test("Bảng tin: sự kiện `cho_xac_nhan` hợp lệ; thông báo nổi chỉ cho người giữ ô xét duyệt, không tên", () => {
  const ev = { loai: "don", orderId: "o1", maDon: "TD-1", thayDoi: "cho_xac_nhan", luc: NOW };
  assert.ok(laSuKienHopLe(ev));
  assert.deepEqual(thongBaoNoi(KT, ev as never), { cau: "Đơn TD-1 đang chờ xác nhận", lienKet: "/order?id=o1" });
  assert.deepEqual(thongBaoNoi(HDV, ev as never), { cau: "Đơn TD-1 đang chờ xác nhận", lienKet: "/order?id=o1" });
  assert.equal(thongBaoNoi(DT, ev as never), null);
});
