// ADR-0142 Đ7 + thiết kế L9 — THÔNG BÁO của «Bán hàng phụ trách đơn» (Task 6). Hộp thư tính người nhận LÚC ĐỌC theo trạng thái HIỆN TẠI (khuôn `handlerTruoc` giả của ô HDV): lời mời, nhận, từ chối,
// đổi, hoàn thành, và «yêu cầu xác nhận có X chỉ tới X trong thời gian ưu tiên». Mỗi dòng bảng L9 một nhóm ca. Người lập là Đối tác / Thực tập nhận vào hộp thư, KHÔNG có tin nổi, câu KHÔNG tên người làm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { locHopThongBao, loaiTinDon, HANH_DONG_TIN_DON, type DongDon } from "./thong-bao.ts";
import { THAY_DOI, nhanKetNoi, nhanSuKien, thongBaoNoi, type ThayDoiDon } from "./bang-tin.ts";
import { hanhDongCuaThayDoi, nguoiNhanDay } from "./web-push.ts";
import { tinGioHenCho } from "./tin-chuyen.ts";
import type { PermissionCode } from "./permissions.ts";

const NOW = "2026-11-05T03:00:00.000Z";
const ai = (id: string, ...p: PermissionCode[]) => ({ id, permissions: p });
const BH = ai("bh", "SALES"), BH2 = ai("bh2", "SALES"), X = ai("x", "SALES"), QT = ai("qt", "ADMIN"), SA = ai("sa", "SUPER_ADMIN"), KT = ai("kt", "ACCOUNTING"), HDV = ai("hdv", "FIELD");
const DT = ai("dt", "PARTNER"), TT = ai("tt", "INTERN"), LAP = ai("lap", "SALES");
const TAT_CA = [BH, BH2, X, QT, SA, KT, HDV, DT, TT, LAP];
const CON_UU_TIEN = "2026-11-05T03:10:00.000Z"; // sau NOW
const HET_UU_TIEN = "2026-11-05T02:50:00.000Z"; // trước NOW

const don = (o: Partial<DongDon> = {}): DongDon => ({
  id: "e" + Math.random(), orderId: "o1", maDon: "TD-20261105-0001", action: "sales_owner_claimed", actorId: "bh", tenNguoiLam: "Bán Hàng", luc: "2026-11-05T02:00:00.000Z",
  ownerId: "lap", phuTrach: { coNguoi: false, staffId: null }, lapChuaCoNguoi: false, cungLoLap: false, laNhap: false, banHangStaffId: null, loiMoi: null, ...o,
});
const hop = (staff: ReturnType<typeof ai>, d: DongDon[], ngan: "cua-toi" | "tat-ca" = "cua-toi") =>
  locHopThongBao(staff, { don: d, thuCong: [], docDenLuc: "2026-11-04T00:00:00.000Z", now: NOW, ngan });
const ai_nhan = (d: DongDon, ngan: "cua-toi" | "tat-ca" = "tat-ca") => TAT_CA.filter((s) => hop(s, [d], ngan).tin.length > 0).map((s) => s.id).sort();

test("loaiTinDon: năm hành động mới → năm loại tin; HANH_DONG_TIN_DON có đủ năm, không có order_handler_refused", () => {
  assert.equal(loaiTinDon(don({ action: "sales_invited" })), "moi_ban_hang");
  assert.equal(loaiTinDon(don({ action: "sales_owner_claimed" })), "ban_hang_nhan");
  assert.equal(loaiTinDon(don({ action: "sales_invite_refused" })), "ban_hang_tu_choi");
  assert.equal(loaiTinDon(don({ action: "sales_owner_changed" })), "doi_ban_hang");
  assert.equal(loaiTinDon(don({ action: "order_completed" })), "hoan_thanh");
  for (const a of ["sales_invited", "sales_owner_claimed", "sales_owner_changed", "sales_invite_refused", "order_completed"]) assert.ok((HANH_DONG_TIN_DON as readonly string[]).includes(a), a);
  assert.ok(!(HANH_DONG_TIN_DON as readonly string[]).includes("order_handler_refused"), "chủ đã quyết để sau (BACKLOG mục 3)");
});

// ---- L9 dòng 1: lời mời có hiệu lực → X ----
test("L9 lời mời: tới X khi lời mời còn mở — kể cả khi đơn đang NHÁP chờ xác nhận (Gửi xác nhận mở lời mời lúc đơn còn nháp); người khác không nhận", () => {
  const d = don({ action: "sales_invited", actorId: "lap", tenNguoiLam: "Người Lập", laNhap: true, loiMoi: { staffId: "x", hanIso: CON_UU_TIEN } });
  assert.deepEqual(ai_nhan(d), ["x"], "đơn nháp + lời mời mở: X PHẢI thấy (nếu đi qua nhanSuKien laNhap thì chỉ còn người lập — lỗi cần tránh)");
  const t = hop(X, [d]).tin[0]!;
  assert.equal(t.loai, "moi_ban_hang");
  assert.equal(t.cuaToi, true);
  assert.equal(t.lienKet, "/order?id=o1");
  assert.equal(t.cau, "Đơn TD-20261105-0001: bạn được mời làm người phụ trách");
});
test("L9 lời mời: khi X đã là Bán hàng phụ trách (đã nhận) vẫn thấy; Y được mời lại sau đó thì X cũ không còn thấy (trạng thái hiện tại)", () => {
  const cu = don({ action: "sales_invited", actorId: "lap", loiMoi: null, banHangStaffId: "x" });
  assert.deepEqual(ai_nhan(cu), ["x"]);
  const doiNguoi = don({ action: "sales_invited", actorId: "lap", loiMoi: { staffId: "bh2", hanIso: CON_UU_TIEN } });
  assert.deepEqual(ai_nhan(doiNguoi), ["bh2"], "chấp nhận (brief): lời mời gửi lại làm sự kiện cũ hiện cho người mới");
});
test("L9 lời mời: lời mời đã khép và không ai là Bán hàng phụ trách → không còn tin; người lập tự mời mình không tự nhận tin của mình", () => {
  assert.deepEqual(ai_nhan(don({ action: "sales_invited", actorId: "lap", loiMoi: null, banHangStaffId: "bh2" })), ["bh2"], "bh2 là Bán hàng phụ trách hiện tại nên (theo trạng thái hiện tại) vẫn thấy");
  assert.deepEqual(ai_nhan(don({ action: "sales_invited", actorId: "lap", loiMoi: null, banHangStaffId: null })), []);
  assert.deepEqual(ai_nhan(don({ action: "sales_invited", actorId: "x", loiMoi: { staffId: "x", hanIso: CON_UU_TIEN } })), []);
});

// ---- L9 dòng 2, 3: có Bán hàng phụ trách / X từ chối → người lập ----
test("L9 nhận phụ trách: người lập có tin (hộp thư); X khi người khác nhận thay KHÔNG có dòng hộp thư; câu không tên cho người không xem được tên", () => {
  const d = don({ action: "sales_owner_claimed", actorId: "bh", banHangStaffId: "bh" });
  assert.deepEqual(ai_nhan(d), ["lap"]);
  assert.equal(hop(LAP, [d]).tin[0]!.loai, "ban_hang_nhan");
  assert.equal(hop(LAP, [d]).tin[0]!.cau, "Đơn TD-20261105-0001 đã có người phụ trách");
  assert.equal(hop(SA, [don({ ...d, ownerId: "sa2" })], "tat-ca").tin.length, 0, "Toàn quyền không phải người lập: không nhận");
});
test("L9 X từ chối: người lập có tin; cả hai ngăn; Quản trị / Bán hàng khác không nhận trong hộp thư", () => {
  const d = don({ action: "sales_invite_refused", actorId: "x", tenNguoiLam: "X" });
  assert.deepEqual(ai_nhan(d), ["lap"]);
  assert.equal(hop(LAP, [d]).tin[0]!.loai, "ban_hang_tu_choi");
  assert.ok(hop(LAP, [d]).tin[0]!.cau.includes("Chờ Bán hàng nhận"));
});

// ---- L9 dòng 4: Chờ Bán hàng nhận → chỉ Bảng tin, KHÔNG báo đẩy, không hộp thư ----
test("L9 Chờ Bán hàng nhận (cho_ban_hang): không có hành động nhật ký, không gõ cửa màn hình khoá, không người nhận đẩy", () => {
  assert.ok((THAY_DOI as readonly string[]).includes("cho_ban_hang"));
  assert.equal(hanhDongCuaThayDoi("cho_ban_hang"), null);
  for (const t of ["ban_hang_tu_choi", "doi_ban_hang", "hoan_thanh"] as ThayDoiDon[]) assert.equal(hanhDongCuaThayDoi(t), null, t);
  assert.equal(hanhDongCuaThayDoi("moi_ban_hang"), "sales_invited");
  assert.equal(hanhDongCuaThayDoi("ban_hang_nhan"), "sales_owner_claimed");
  // nguoiNhanDay không bao giờ có loại tin cho cho_ban_hang: hành động null ⇒ nơi gọi không dựng DongDon ⇒ danh sách rỗng.
  assert.deepEqual(nguoiNhanDay(TAT_CA, { loDoi: [] }, NOW), []);
});
test("L9 Bảng tin: nhãn cho-ban-hang chỉ cho người nhận Bán hàng phụ trách (Bán hàng, Quản trị, Toàn quyền), không Đối tác / Kế toán / HDV; câu thông báo nổi đúng", () => {
  for (const s of [BH, QT, SA]) assert.ok(nhanKetNoi(s).includes("cho-ban-hang"), s.id);
  for (const s of [KT, HDV, DT, TT]) assert.ok(!nhanKetNoi(s).includes("cho-ban-hang"), s.id);
  assert.ok(!nhanKetNoi(ai("lai", "PARTNER", "SALES")).includes("cho-ban-hang"), "tài khoản lai Đối tác không làm người phụ trách");
  const sk = { loai: "don" as const, orderId: "o1", maDon: "TD-1", thayDoi: "cho_ban_hang" as const, luc: NOW };
  assert.equal(thongBaoNoi(BH, sk)?.cau, "Đơn TD-1 đang Chờ Bán hàng nhận");
  assert.equal(thongBaoNoi(DT, sk), null);
  assert.equal(thongBaoNoi(KT, sk), null);
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: { coNguoi: false, staffId: null }, thayDoi: "cho_ban_hang" }), ["cho-ban-hang"]);
});

// ---- L9 dòng 5, 6: HDV nhận / giao, huỷ → thêm Bán hàng phụ trách ----
test("L9 nhận / giao / huỷ: Bán hàng phụ trách được thêm vào người nhận (hộp thư); hoàn thành đi lối riêng", () => {
  const nhom = { banHangStaffId: "bh2", phuTrach: { coNguoi: true, staffId: "hdv" } };
  for (const action of ["order_claimed", "order_handler_changed", "cancelled"]) {
    const d = don({ action, actorId: "qt", ...nhom });
    assert.ok(hop(BH2, [d]).tin.length === 1, `${action}: Bán hàng phụ trách phải nhận`);
    assert.equal(hop(BH2, [d]).tin[0]!.cuaToi, true, action);
    assert.equal(hop(BH, [d]).tin.filter((t) => t.cuaToi).length, 0, `${action}: Bán hàng khác không phải người phụ trách không có tin "Của tôi"`);
  }
  assert.deepEqual(
    nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: { coNguoi: true, staffId: "hdv" }, thayDoi: "huy", banHang: "bh2" }).filter((t) => t === "nguoi:bh2"),
    ["nguoi:bh2"],
  );
});

// ---- L9 dòng 7: Hoàn thành → Bán hàng phụ trách + người lập ----
test("L9 Hoàn thành: Bán hàng phụ trách và người lập có tin trong hộp thư; người khác (Kế toán đã bấm, Quản trị, HDV) không; cả hai ngăn", () => {
  const d = don({ action: "order_completed", actorId: "kt", tenNguoiLam: "Kế Toán", banHangStaffId: "bh2", phuTrach: { coNguoi: true, staffId: "hdv" } });
  assert.deepEqual(ai_nhan(d, "tat-ca"), ["bh2", "lap"]);
  assert.deepEqual(ai_nhan(d, "cua-toi"), ["bh2", "lap"]);
  for (const s of [BH2, LAP]) {
    const t = hop(s, [d]).tin[0]!;
    assert.equal(t.loai, "hoan_thanh");
    assert.equal(t.cuaToi, true);
    assert.equal(t.cau, "Đơn TD-20261105-0001 đã Hoàn thành");
  }
});
test("L9 Hoàn thành: chưa có Bán hàng phụ trách thì chỉ người lập", () => {
  assert.deepEqual(ai_nhan(don({ action: "order_completed", actorId: "kt", banHangStaffId: null })), ["lap"]);
});

// ---- Dòng «Đổi»: người mới + người lập (người cũ chỉ Bảng tin + đẩy lúc sự kiện) ----
test("Đổi Bán hàng phụ trách: người mới và người lập có tin; người cũ KHÔNG có dòng hộp thư; người đổi (Quản trị) không tự nhận", () => {
  const d = don({ action: "sales_owner_changed", actorId: "qt", tenNguoiLam: "Quản Trị", banHangStaffId: "bh2" });
  assert.deepEqual(ai_nhan(d), ["bh2", "lap"]);
  assert.equal(hop(BH2, [d]).tin[0]!.loai, "doi_ban_hang");
  assert.equal(hop(BH, [d], "tat-ca").tin.length, 0, "người cũ (bh) không có dòng hộp thư");
  assert.deepEqual(ai_nhan(don({ action: "sales_owner_changed", actorId: "qt", banHangStaffId: null })), ["lap"], "bỏ trống: chỉ người lập");
});
test("Đổi: Bảng tin gắn nhãn người mới, người cũ và người lập (người cũ nhận ở Bảng tin / đẩy lúc sự kiện, như HDV cũ)", () => {
  const nhan = nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: { coNguoi: false, staffId: null }, thayDoi: "doi_ban_hang", banHang: "bh2", banHangTruoc: "bh" });
  assert.deepEqual(nhan, ["nguoi:bh", "nguoi:bh2", "nguoi:lap"]);
});

// ---- Dòng «Gửi yêu cầu xác nhận» ----
const yeuCau = (o: Partial<DongDon> = {}) => don({ action: "order_confirm_requested", actorId: "lap", tenNguoiLam: "Lập", laNhap: true, yeuCauDaKhep: false, ...o });
test("L9 yêu cầu xác nhận có X: CHỈ X nhận trong thời gian ưu tiên — người khác giữ order.confirm.review không nhận", () => {
  const d = yeuCau({ loiMoi: { staffId: "x", hanIso: CON_UU_TIEN } });
  assert.deepEqual(ai_nhan(d), ["x"]);
  for (const s of [BH, BH2, QT, SA]) assert.equal(hop(s, [d], "tat-ca").tin.length, 0, s.id);
});
test("L9 yêu cầu xác nhận: hết thời gian ưu tiên thì mọi người giữ ô nhận lại (trạng thái hiện tại); không có X thì như ADR-0136 Đ10", () => {
  assert.deepEqual(ai_nhan(yeuCau({ loiMoi: { staffId: "x", hanIso: HET_UU_TIEN } })), ["bh", "bh2", "qt", "sa", "x"]);
  assert.deepEqual(ai_nhan(yeuCau({ loiMoi: null })), ["bh", "bh2", "qt", "sa", "x"]);
});
test("Bảng tin của yêu cầu có X: nhãn là nguoi:X (không xet-duyet); không có X: như cũ", () => {
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: { coNguoi: false, staffId: null }, laNhap: true, choXacNhan: true, thayDoi: "cho_xac_nhan", nguoiMoi: "x" }), ["nguoi:lap", "nguoi:x"]);
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: { coNguoi: false, staffId: null }, laNhap: true, choXacNhan: true, thayDoi: "cho_xac_nhan" }), ["nguoi:lap", "xet-duyet"]);
});
test("Bảng tin của lời mời: chỉ X (kể cả đơn nháp); từ chối: chỉ người lập; nhận thay: người lập + X bị nhận thay + người mới", () => {
  const trong = { coNguoi: false, staffId: null };
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: trong, laNhap: true, thayDoi: "moi_ban_hang", nguoiMoi: "x" }), ["nguoi:x"]);
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: trong, thayDoi: "ban_hang_tu_choi" }), ["nguoi:lap"]);
  assert.deepEqual(nhanSuKien({ ownerId: "lap", handlerTruoc: null, handlerSau: trong, thayDoi: "ban_hang_nhan", banHang: "bh2", nguoiMoi: "x" }), ["nguoi:bh2", "nguoi:lap", "nguoi:x"]);
});

// ---- Đối tác / Thực tập là người lập ----
test("Đối tác / Thực tập là người lập: có tin trong hộp thư (nhận, từ chối, đổi, hoàn thành), CÂU KHÔNG có tên người làm, KHÔNG có tin nổi", () => {
  for (const nguoiLap of [DT, TT]) {
    for (const action of ["sales_owner_claimed", "sales_invite_refused", "sales_owner_changed", "order_completed"]) {
      const d = don({ action, ownerId: nguoiLap.id, actorId: "qt", tenNguoiLam: "Quản Trị Viên", banHangStaffId: "bh2" });
      const h = hop(nguoiLap, [d]);
      assert.equal(h.tin.length, 1, `${nguoiLap.id} ${action}`);
      assert.ok(!JSON.stringify(h).includes("Quản Trị Viên"), `${nguoiLap.id} ${action}: không tên người làm`);
      assert.equal(h.tin[0]!.lienKet, "/order?id=o1");
    }
    for (const thayDoi of ["ban_hang_nhan", "ban_hang_tu_choi", "doi_ban_hang", "cho_ban_hang", "moi_ban_hang", "hoan_thanh"] as ThayDoiDon[]) {
      assert.equal(thongBaoNoi(nguoiLap, { loai: "don", orderId: "o1", maDon: "TD-1", thayDoi, luc: NOW }), null, `${nguoiLap.id} ${thayDoi}: không tin nổi`);
    }
  }
});
test("Tên người làm chỉ hiện cho Toàn quyền (ADR-0131 đ3) — tin nhận phụ trách của người lập là Toàn quyền", () => {
  const d = don({ action: "sales_owner_claimed", ownerId: "sa", actorId: "bh", tenNguoiLam: "Bán Hàng", banHangStaffId: "bh" });
  assert.equal(hop(SA, [d]).tin[0]!.cau, "Bán Hàng đã nhận phụ trách đơn TD-20261105-0001");
});
test("Hộp thư nhận tin về đơn của chính mình: Bán hàng khác Đối tác lai (PARTNER + SALES) cũng không thấy tên", () => {
  const lai = ai("lai", "PARTNER", "SALES");
  const d = don({ action: "sales_owner_claimed", ownerId: "lai", actorId: "bh", tenNguoiLam: "Bán Hàng", banHangStaffId: "bh" });
  assert.ok(!JSON.stringify(hop(lai, [d])).includes("Bán Hàng"));
});

// ---- Thông báo nổi ----
test("thongBaoNoi: câu của các loại mới (khong tên người), người không đủ quyền không có", () => {
  const sk = (thayDoi: ThayDoiDon) => ({ loai: "don" as const, orderId: "o1", maDon: "TD-1", thayDoi, luc: NOW });
  assert.equal(thongBaoNoi(X, sk("moi_ban_hang"))?.cau, "Đơn TD-1: bạn được mời làm người phụ trách");
  assert.equal(thongBaoNoi(LAP, sk("ban_hang_nhan"))?.cau, "Đơn TD-1 đã có người phụ trách");
  assert.equal(thongBaoNoi(LAP, sk("ban_hang_tu_choi"))?.cau, "Đơn TD-1: người được mời đã từ chối");
  assert.equal(thongBaoNoi(BH2, sk("doi_ban_hang"))?.cau, "Đơn TD-1 vừa đổi người phụ trách");
  assert.equal(thongBaoNoi(BH2, sk("moi_ban_hang"))?.lienKet, "/order?id=o1");
  assert.equal(thongBaoNoi(BH2, sk("hoan_thanh")), null, "Hoàn thành chỉ làm mới màn hình (ADR-0025 đ8), tin nằm ở hộp thư");
});

// ---- Giờ hẹn của chuyến: Bán hàng phụ trách = người gọi báo khách ----
test("tin giờ hẹn chuyến (MQ-07): Bán hàng phụ trách của đơn nhận 'gọi báo khách' như người lập / người phụ trách", () => {
  const chuyen = [{ tripId: "t1", ma: "CX-1", ngayChay: "2026-11-06", lai: [] }];
  const d = { actorId: "qt", luc: NOW, maDon: "TD-1", ownerId: "lap", handlerStaffId: null, banHangStaffId: "bh2", chuyen };
  const nBH = { id: "bh2", permissions: ["SALES"] as PermissionCode[], partyId: "p-bh2" };
  assert.ok(tinGioHenCho(nBH, d), "Bán hàng phụ trách phải nhận");
  assert.equal(tinGioHenCho({ ...nBH, id: "bh3", partyId: "p-bh3" }, d), null, "Bán hàng khác không phụ trách không nhận");
});
