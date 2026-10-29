// ADR-0089 (bảng «Thay câu nào»: ADR-0034 đ1, đ4 + tin "duyệt hoàn" cho Kế toán; kế hoạch Đợt 1 NT-V7, Task 11) — chủ dự án 28/10 chọn «Đồng ý, làm trên bản riêng»:
// tin vào hộp của NGƯỜI GHI CHI HOÀN (ô `payment.refund`: Kế toán, Toàn quyền), trừ người duyệt; không đẩy màn hình khoá. Người nhận theo Ô QUYỀN — khuôn ADR-0136 Đ10
// (tin «đang chờ xác nhận», ô `order.confirm.review`). Câu KHÔNG kèm số tiền: nhật ký duyệt chỉ ghi lý do, không ghi số (khuôn tin điều chỉnh ADR-0115).
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, loaiTinDon, type DongDon } from "./thong-bao.ts";
import { THAY_DOI } from "./bang-tin.ts";
import { hanhDongCuaThayDoi } from "./web-push.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-10-28T02:40:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const QT = ai("qt", "ADMIN"), KT = ai("kt", "ACCOUNTING"), KT2 = ai("kt2", "ACCOUNTING"), SA = ai("sa", "SUPER_ADMIN"), QTKT = ai("qtkt", "ADMIN", "ACCOUNTING");
const BH = ai("bh", "SALES"), HDV = ai("hdv", "FIELD"), QT2 = ai("qt2", "ADMIN"), DT = ai("dt", "PARTNER"), TT = ai("tt", "INTERN"), HR = ai("hr", "HR");
const don = (o: Partial<DongDon> = {}): DongDon => ({ id: "e" + Math.random(), orderId: "o1", maDon: "TD-20261028-0001", action: "deposit_refund_approved", actorId: "qt",
  tenNguoiLam: "Quản Trị", luc: "2026-10-28T02:00:00.000Z", ownerId: "bh", phuTrach: { coNguoi: true, staffId: "hdv" }, lapChuaCoNguoi: false, cungLoLap: false, laNhap: false, ...o });
const hop = (staff: ReturnType<typeof ai>, d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi") =>
  locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-10-27T00:00:00.000Z", now: NOW, ngan });

test("loaiTinDon: deposit_refund_approved → duyet_hoan; duyệt CHUYỂN không thành tin (chủ chỉ chọn tin duyệt hoàn)", () => {
  assert.equal(loaiTinDon(don()), "duyet_hoan");
  assert.equal(loaiTinDon(don({ action: "deposit_transfer_approved" })), null);
});

test("người nhận: mọi người giữ ô payment.refund (Kế toán, Toàn quyền, kiêm Quản trị + Kế toán) trừ người duyệt, ở ngăn «Của tôi»; mở thẳng trang đơn", () => {
  for (const s of [KT, KT2, SA, QTKT]) {
    const h = hop(s, [don()]);
    assert.equal(h.tin.length, 1, s.id);
    assert.equal(h.tin[0]!.loai, "duyet_hoan");
    assert.equal(h.tin[0]!.cuaToi, true, s.id);
    assert.equal(h.tin[0]!.chuaDoc, true, s.id);
    assert.equal(h.tin[0]!.lienKet, "/order?id=o1", s.id);
  }
  assert.equal(hop(QTKT, [don({ actorId: "qtkt", tenNguoiLam: "Kiêm" })], "tat-ca").tin.length, 0, "người duyệt không tự nhận tin của mình (kể cả tài khoản kiêm Kế toán)");
});

test("không nhận: Quản trị (kể cả người khác người duyệt), Bán hàng lập đơn, HDV phụ trách, Đối tác, Thực tập, Nhân sự — ở cả hai ngăn", () => {
  for (const s of [QT, QT2, BH, HDV, DT, TT, HR]) {
    assert.equal(hop(s, [don()], "tat-ca").tin.length, 0, s.id);
    assert.equal(hop(s, [don()], "cua-toi").tin.length, 0, s.id);
  }
  assert.equal(hop(DT, [don({ ownerId: "dt" })], "tat-ca").tin.length, 0, "Đối tác lập đơn cũng không nhận (tin là việc của Kế toán)");
  // Người kiểm độc lập 28/10 (V1): Đối tác một mình đã rớt ô payment.refund, nên cổng «không Đối tác» chỉ được thử thật bằng tài khoản LAI (chủ 23/10: không được tồn tại,
  // nhưng R-LC-1 chưa chặn hết) — bỏ `|| holdsPartner(staff)` ở nhánh duyet_hoan thì bài này đỏ.
  const KTDT = ai("ktdt", "ACCOUNTING", "PARTNER");
  assert.equal(hop(KTDT, [don()], "tat-ca").tin.length, 0, "tài khoản lai Kế toán + Đối tác không nhận");
  assert.equal(hop(KTDT, [don()], "cua-toi").tin.length, 0, "tài khoản lai Kế toán + Đối tác không nhận (ngăn Của tôi)");
});

test("câu: không số tiền, không «cọc»; tên người duyệt chỉ cho Toàn quyền (ADR-0131 đ3), Kế toán đọc câu không tên", () => {
  assert.equal(hop(KT, [don()]).tin[0]!.cau, "Đơn TD-20261028-0001 đã được duyệt hoàn thu trước cho khách, chờ ghi chi hoàn");
  assert.equal(hop(SA, [don()]).tin[0]!.cau, "Quản Trị đã duyệt hoàn thu trước đơn TD-20261028-0001 cho khách, chờ ghi chi hoàn");
  for (const s of [KT, SA]) {
    const cau = hop(s, [don()]).tin[0]!.cau;
    assert.ok(!/cọc/i.test(cau) && !/\d{3}\.\d{3}|₫|đồng/.test(cau.replace("TD-20261028-0001", "")), cau);
  }
  assert.ok(!JSON.stringify(hop(KT, [don()])).includes("Quản Trị"), "Kế toán không thấy tên người duyệt");
});

test("không đẩy màn hình khoá (NT-V7, ADR-0045): không sự kiện Bảng tin nào gõ cửa bằng hành động duyệt hoàn", () => {
  assert.deepEqual(THAY_DOI.filter((t) => hanhDongCuaThayDoi(t) === "deposit_refund_approved"), []);
  assert.equal(hanhDongCuaThayDoi("tien"), null, "route duyệt báo Bảng tin bằng `tien` — không gõ cửa");
});
