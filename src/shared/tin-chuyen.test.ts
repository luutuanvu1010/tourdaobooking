// TIN CHUYẾN (ADR-0052 D6.2) — bảng ca theo vai + mọi tập con quyền (khuôn NT-3, suy kỳ vọng từ can(), không chép tay) + khoá không lộ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, chuyenCuaChangLuc, dangChayLucSuKien, dungDongChuyen, laiLucSuKien, taiXeNhanSuKien, thayDoiCoTheCoTin, thayDoiCuaHanhDongChuyen,
  tinChuyenCho, tinGioHenCho, type DongChuyen, type DongGioHen, type NguoiNhanChuyen,
} from "./tin-chuyen.ts";

const T0 = "2027-03-11T01:00:00.000Z", T1 = "2027-03-11T02:00:00.000Z", T2 = "2027-03-11T03:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const dong = (v: Partial<DongChuyen>): DongChuyen => ({
  id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_edited", actorId: "sales", luc: T1,
  lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }], don: [], xuatBen: null, khanCap: false, ...v,
});
const TX_A = nguoi("tx-a", ["DRIVER"], "p-a"), TX_B = nguoi("tx-b", ["DRIVER"], "p-b");

test("đổi tài xế (trip_edited cùng mốc): A nhận 'không còn lái', B nhận 'được xếp'; văn phòng khác không nhận", () => {
  const d = dong({});
  assert.equal(tinChuyenCho(TX_A, d)?.loai, "go_lai");
  assert.equal(tinChuyenCho(TX_B, d)?.loai, "xep_lai");
  assert.equal(tinChuyenCho(nguoi("sales2", ["SALES"]), d), null);
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
});

test("tài xế bị gỡ KHÔNG thấy tin sau mốc gỡ; tài xế đang lái thấy 'văn phòng vừa sửa'", () => {
  const sau = dong({ id: "ev2", luc: T2 });
  assert.equal(tinChuyenCho(TX_A, sau), null);
  assert.equal(tinChuyenCho(TX_B, sau)?.loai, "doi_chuyen");
});

test("tạo chuyến → tài xế được xếp; huỷ → tài xế có dòng lái đóng ĐÚNG mốc huỷ nhận 'đã bị huỷ'", () => {
  assert.equal(tinChuyenCho(TX_B, dong({ action: "trip_created", lai: [{ partyId: "p-b", tu: T1, den: null }] }))?.loai, "xep_lai");
  assert.equal(tinChuyenCho(TX_B, dong({ action: "trip_cancelled", luc: T2, lai: [{ partyId: "p-b", tu: T1, den: T2 }] }))?.loai, "huy_chuyen");
});

test("hết quyền: tài khoản mất quyền DRIVER (hoặc chỉ DRIVER_PARTNER) không nhận dù có dòng lái", () => {
  assert.equal(tinChuyenCho(nguoi("tx-b", [], "p-b"), dong({})), null);
  assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b"), dong({})), null);
});

test("người tự làm không tự nhận (E3)", () => {
  assert.equal(tinChuyenCho(nguoi("tx-b", ["DRIVER"], "p-b"), dong({ actorId: "tx-b" })), null);
  assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), dong({ action: "trip_ended_interrupted", actorId: "adm" })), null);
});

test("kết thúc gián đoạn → mọi người có trip.dispatch (Bán hàng, Quản trị, Toàn quyền), không Kế toán, không tài xế", () => {
  const d = dong({ action: "trip_ended_interrupted", actorId: "tx-b" });
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) assert.equal(tinChuyenCho(nguoi("x", [p]), d)?.loai, "gian_doan", p);
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
  assert.equal(tinChuyenCho(nguoi("tx-a2", ["DRIVER"], "p-b"), d), null);
});

test("khách vắng → người lập / người phụ trách CÓ trip.view; HDV, Đối tác, Thực tập (không trip.view) không", () => {
  const d = dong({ action: "trip_passenger_no_show", actorId: "tx-b", don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: "pt" }] });
  assert.equal(tinChuyenCho(nguoi("lap", ["SALES"]), d)?.loai, "khach_vang");
  assert.equal(tinChuyenCho(nguoi("pt", ["ADMIN"]), d)?.loai, "khach_vang");
  assert.equal(tinChuyenCho(nguoi("khac", ["SALES"]), d), null);
  for (const p of ["FIELD", "PARTNER", "INTERN"] as const) {
    assert.equal(tinChuyenCho(nguoi("lap", [p]), d), null, `người lập ${p}`);
    assert.equal(tinChuyenCho(nguoi("pt", [p]), d), null, `người phụ trách ${p}`);
  }
  assert.match(tinChuyenCho(nguoi("lap", ["SALES"]), d)!.cau, /DH-0001/);
});

// Mọi tập con quyền (1024): bất biến suy từ can(), không chép tay bảng.
function moiTapCon<T>(m: readonly T[]): T[][] {
  if (m.length === 0) return [[]];
  const [dau, ...con] = m;
  const c = moiTapCon(con);
  return [...c, ...c.map((t) => [dau as T, ...t])];
}
test("mọi tập con quyền × mọi hành động × cờ khẩn cấp: nhận ⇒ qua can(trip.view) (tài xế: assigned + có dòng lái lúc đó); tin khẩn cấp chỉ cho tài xế đang lái; chỉ-DRIVER_PARTNER không bao giờ", () => {
  const tap = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tap.length, 1024);
  for (const permissions of tap) {
    // ADR-0104 Đ1 mục 6: "trip_allocated" nay TRONG danh sách (sinh tin có điều kiện) — hành động ngoài danh sách thử bằng "trip_departed" + một mã lạ.
    for (const action of [...HANH_DONG_TIN_CHUYEN, "trip_departed", "trip_khong_co_that"]) {
      for (const partyId of ["p-b", null]) for (const khanCap of [false, true]) {
        const n = { id: "lap", permissions, partyId };
        const d = dong({ action, actorId: "khac", khanCap, don: [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }] });
        const t = tinChuyenCho(n, d);
        if (!t) continue;
        const laiDung = partyId !== null && laiLucSuKien(d.lai, partyId, d.luc) !== null && can(n, "trip.view", { assigned: true });
        assert.ok(laiDung || can(n, "trip.view"), `nhận mà không có trip.view: ${JSON.stringify(permissions)} ${action}`);
        if (t.loai === "khan_cap") assert.ok(laiDung && khanCap, `tin khẩn cấp cho người không lái / không cờ: ${JSON.stringify(permissions)} ${action}`);
        assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(action), `hành động ngoài danh sách D6.1 sinh tin: ${action}`);
        assert.notDeepEqual(permissions, ["DRIVER_PARTNER"]);
      }
    }
  }
});

test("câu tin không chứa gì ngoài mã chuyến, ngày, mã đơn — khoá DongChuyen không có trường tên/SĐT/nơi", () => {
  const d = dong({ action: "trip_passenger_no_show", don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: null }] });
  const t = tinChuyenCho(nguoi("lap", ["SALES"]), d)!;
  assert.equal(t.cau, "Có khách vắng ở chuyến CX-1103-02 ngày 11/03 (đơn DH-0001)");
  // ADR-0104 Đ1 mục 6 (thêm có tên): `khanCap` — cờ boolean (sự kiện mang luật vượt MOC_TOI_THIEU), không phải dữ kiện người.
  assert.deepEqual(Object.keys(d).sort(), ["action", "actorId", "don", "id", "khanCap", "lai", "luc", "maChuyen", "ngayChay", "tripId", "xuatBen"]);
  assert.doesNotMatch(t.cau, /\d{8,}/);
});

test("đường dẫn: tài xế → /cuoc-chuyen?id=; không còn lái / huỷ → /cuoc; văn phòng → /chuyen?id=", () => {
  assert.equal(tinChuyenCho(TX_B, dong({}))!.lienKet, "/cuoc-chuyen?id=t1");
  assert.equal(tinChuyenCho(TX_A, dong({}))!.lienKet, "/cuoc");
  assert.equal(tinChuyenCho(nguoi("s", ["SALES"]), dong({ action: "trip_ended_interrupted", actorId: "x" }))!.lienKet, "/chuyen?id=t1");
});

test("dungDongChuyen: ghép mã/ngày/khoảng lái theo chuyến, đơn theo sự kiện vắng; chuyến không có dữ kiện thì bỏ", () => {
  const r = dungDongChuyen(
    [{ id: "e1", tripId: "t1", actorId: "a", action: "trip_passenger_no_show", luc: T1 }, { id: "e2", tripId: "lạ", actorId: "a", action: "trip_created", luc: T1 }],
    { chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [], xuatBen: T0 }], vang: [{ suKienId: "e1", orderId: "o1" }] },
    [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }],
  );
  assert.equal(r.length, 1);
  assert.equal(r[0]!.khanCap, false, "dữ kiện không có khanCap → false");
  assert.deepEqual(r[0]!.don.map((x) => x.maDon), ["DH-1"]);
  assert.equal(r[0]!.xuatBen, T0, "giờ xuất bến của chuyến đi theo dòng (Đợt 5 — tin chỉ khi xe đang chạy)");
});

test("taiXeNhanSuKien: chỉ tài khoản có dòng lái lúc t VÀ qua can(trip.view, assigned)", () => {
  const lai = [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }];
  assert.deepEqual(taiXeNhanSuKien([TX_A, TX_B, nguoi("dt", ["DRIVER_PARTNER"], "p-b")], lai, T2), ["tx-b"]);
});

test("thayDoiCuaHanhDongChuyen: mọi trip_* có loại thay đổi; hành động lạ → 'sua'", () => {
  assert.equal(thayDoiCuaHanhDongChuyen("trip_allocated"), "xep");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passenger_no_show"), "vang"); // vòng sửa 1 (V1): tách khỏi "tien_do" để chuông chỉ gọi lại khi có thể có tin
  assert.equal(thayDoiCuaHanhDongChuyen("trip_zzz"), "sua");
});

test("thayDoiCoTheCoTin: đúng loại thay đổi của 5 hành động sinh tin (D6.1); mọi hành động trip_* khác KHÔNG (chuông không gọi lại vô ích)", () => {
  const moi = ["trip_created", "trip_edited", "trip_cancelled", "trip_allocated", "trip_allocation_removed", "trip_allocation_moved", "trip_stops_synced",
    "trip_passengers_synced", "trip_departed", "trip_stop_arrived", "trip_passenger_boarded", "trip_passenger_no_show", "trip_passenger_cancelled_at_stop",
    "trip_passenger_dropped", "trip_stops_reordered", "trip_ended", "trip_ended_interrupted"];
  for (const a of moi) {
    // Đợt 5: trip_stops_synced sinh tin CHỈ khi xe đang chạy — chuyến chưa chạy giữ loại "cap_nhat" (không gọi lại chuông).
    const coTin = (HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a) && a !== "trip_stops_synced";
    assert.equal(thayDoiCoTheCoTin(thayDoiCuaHanhDongChuyen(a)), coTin, a);
  }
  for (const a of HANH_DONG_TIN_CHUYEN) assert.equal(thayDoiCoTheCoTin(thayDoiCuaHanhDongChuyen(a, true)), true, `${a} khi xe đang chạy`);
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passengers_synced", true), "cap_nhat", "chỉ ba hành động xe đang chạy đổi loại");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passenger_no_show"), "vang");
});

// ---- Vận chuyển Đợt 5 (ADR-0052 D5, D6): thay đổi khi xe ĐANG CHẠY → tài xế đang lái nhận tin ----
const XE_CHAY = ["trip_stop_added_running", "trip_allocation_office_cancelled", "trip_stops_synced"] as const;
const dangChay = (v: Partial<DongChuyen>) => dong({ actorId: "sales", luc: T2, xuatBen: T1, ...v });
test("Đợt 5: thêm điểm / báo huỷ / cập nhật điểm khi xe đang chạy → ĐÚNG tài xế có dòng lái lúc đó; tài xế đã bị gỡ, Bán hàng, Kế toán không", () => {
  for (const action of XE_CHAY) {
    assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(action), action);
    const d = dangChay({ action });
    const t = tinChuyenCho(TX_B, d);
    assert.equal(t?.loai, "xe_chay_doi", action);
    assert.equal(t!.lienKet, "/cuoc-chuyen?id=t1");
    assert.match(t!.cau, /CX-1103-02/);
    assert.equal(tinChuyenCho(TX_A, d), null, `${action}: tài xế bị gỡ trước sự kiện`);
    for (const p of ["SALES", "ADMIN", "ACCOUNTING", "SUPER_ADMIN"] as const) assert.equal(tinChuyenCho(nguoi("x", [p]), d), null, `${action}: ${p}`);
    assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b"), d), null, `${action}: chỉ DRIVER_PARTNER`);
    assert.doesNotMatch(t!.cau, /\d{8,}|L:|T:/);
  }
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_stop_added_running" }))!.cau, "Văn phòng vừa thêm khách vào chuyến CX-1103-02 ngày 11/03 — mở để xem điểm, giờ đón và số khách");
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_allocation_office_cancelled" }))!.cau, "Văn phòng báo có khách huỷ ở chuyến CX-1103-02 ngày 11/03 — mở để xem");
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_stops_synced" }))!.cau, "Văn phòng vừa đổi điểm đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem");
});
test("Đợt 5: cập nhật điểm trên chuyến CHƯA chạy (chưa xuất bến, hoặc xuất bến SAU sự kiện) → không ai nhận tin (giữ như Đợt 2)", () => {
  for (const xuatBen of [null, "2027-03-11T04:00:00.000Z"]) {
    const d = dangChay({ action: "trip_stops_synced", xuatBen });
    assert.equal(dangChayLucSuKien(d), false);
    assert.equal(tinChuyenCho(TX_B, d), null);
    assert.equal(tinChuyenCho(nguoi("x", ["SALES"]), d), null);
    assert.equal(thayDoiCuaHanhDongChuyen(d.action, dangChayLucSuKien(d)), "cap_nhat");
  }
  assert.equal(dangChayLucSuKien(dangChay({ action: "trip_stops_synced" })), true);
});

// ---- MQ-07 (ADR-0052 D6.2): giờ hẹn chặng đổi khi đã xếp — người nhận tính từ KHOÁ (người lập, người phụ trách, dòng lái), không đọc detail ----------------
const gh = (v: Partial<DongGioHen> = {}): DongGioHen => ({
  actorId: "khac", luc: T1, maDon: "DH-1", ownerId: "lap", handlerStaffId: null,
  chuyen: [{ tripId: "t1", ma: "CX-1103-02", ngayChay: "2027-03-11", lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }] }], ...v,
});

test("tinGioHenCho: người lập / phụ trách qua trip.call_ack → 'gọi báo khách'; tài xế có dòng lái lúc sự kiện → 'mở để xem'; người làm không tự nhận", () => {
  assert.deepEqual(tinGioHenCho(nguoi("lap", ["SALES"]), gh()), { cau: "Đơn DH-1: giờ hẹn đổi ở chuyến CX-1103-02 ngày 11/03 — gọi báo khách", lienKet: "/chuyen?id=t1" });
  assert.deepEqual(tinGioHenCho(nguoi("pt", ["SALES"]), gh({ handlerStaffId: "pt" }))?.lienKet, "/chuyen?id=t1");
  assert.equal(tinGioHenCho(nguoi("khac-ban", ["SALES"]), gh()), null, "Bán hàng không lập / không phụ trách");
  assert.equal(tinGioHenCho(nguoi("qt", ["ADMIN"]), gh()), null, "Quản trị không lập / không phụ trách (call_ack any không đủ)");
  assert.equal(tinGioHenCho(nguoi("lap", ["FIELD"]), gh()), null, "HDV: không trip.view");
  assert.equal(tinGioHenCho(nguoi("lap", ["PARTNER"]), gh()), null, "Đối tác: không trip.view");
  assert.equal(tinGioHenCho(nguoi("lap", ["ACCOUNTING"]), gh()), null, "Kế toán người lập: trip.view any nhưng call_ack none");
  assert.deepEqual(tinGioHenCho(TX_B, gh()), { cau: "Văn phòng vừa đổi giờ đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem", lienKet: "/cuoc-chuyen?id=t1" });
  assert.equal(tinGioHenCho(TX_A, gh({ luc: T2 })), null, "dòng lái của A đóng ở T1 < lúc sự kiện");
  assert.equal(tinGioHenCho(nguoi("tx-p", ["DRIVER_PARTNER"], "p-b"), gh()), null, "Tài xế đối tác: trip.view none");
  assert.equal(tinGioHenCho(nguoi("lap", ["SALES"]), gh({ actorId: "lap" })), null, "E3");
  assert.equal(tinGioHenCho(nguoi("lap", ["SALES"]), gh({ chuyen: [] })), null, "chặng chưa xếp");
});

test("tinGioHenCho × mọi tập con quyền: nhận ⇒ qua can(trip.view) (tài xế: assigned + dòng lái); văn phòng nhận ⇒ là người lập / phụ trách VÀ qua trip.call_ack", () => {
  const tap = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  for (const permissions of tap) {
    for (const partyId of ["p-b", null]) {
      for (const [ownerId, handlerStaffId] of [["n", null], ["khac", "n"], ["khac", null]] as const) {
        const n = { id: "n", permissions, partyId };
        const d = gh({ ownerId, handlerStaffId });
        const t = tinGioHenCho(n, d);
        if (!t) continue;
        const laiDung = partyId !== null && laiLucSuKien(d.chuyen[0]!.lai, partyId, d.luc) !== null && can(n, "trip.view", { assigned: true });
        const vanPhong = (ownerId === "n" || handlerStaffId === "n") && can(n, "trip.view") && can(n, "trip.call_ack", { ownerId, assigned: handlerStaffId === "n" });
        assert.ok(laiDung || vanPhong, `${JSON.stringify(permissions)} ${partyId} ${ownerId}/${handlerStaffId}`);
        assert.ok(!/Khách|SĐT|09\d{8}/.test(t.cau));
      }
    }
  }
});

test("chuyenCuaChangLuc: chỉ suất của ĐÚNG chặng MỞ lúc sự kiện (mở ≤ t, còn mở hoặc đóng ≥ t); mỗi chuyến một lần; chuyến thiếu dữ kiện bỏ", () => {
  const f = {
    chuyen: [
      { tripId: "t1", ma: "CX-2", ngayChay: "2027-03-11", lai: [], xuatBen: null },
      { tripId: "t2", ma: "CX-1", ngayChay: "2027-03-11", lai: [], xuatBen: null },
    ],
    vang: [],
    suatChang: [
      { legId: "leg-1", tripId: "t1", tu: T0, den: null },
      { legId: "leg-1", tripId: "t1", tu: T0, den: null }, // suất thứ hai cùng chuyến
      { legId: "leg-1", tripId: "t2", tu: T0, den: T1 }, // đóng ĐÚNG lúc sự kiện → còn tính
      { legId: "leg-1", tripId: "t3", tu: T0, den: null }, // chuyến không có dữ kiện
      { legId: "leg-1", tripId: "t1", tu: T2, den: null }, // mở SAU sự kiện
      { legId: "leg-2", tripId: "t2", tu: T0, den: null }, // chặng khác
    ],
  };
  assert.deepEqual(chuyenCuaChangLuc(f, "leg-1", T1).map((c) => c.tripId), ["t2", "t1"], "sắp theo mã chuyến");
  assert.deepEqual(chuyenCuaChangLuc(f, "leg-1", T2).map((c) => c.tripId), ["t1"]);
  assert.deepEqual(chuyenCuaChangLuc(f, "leg-9", T1), []);
  assert.deepEqual(chuyenCuaChangLuc({ chuyen: f.chuyen, vang: [] }, "leg-1", T1), [], "không có suatChang (dữ kiện cũ) → []");
});

// ---- ADR-0097 Đ5 (gói A1, V3-B): điều chỉnh kết quả một khách / thu hồi xuất bến → tài xế đang lái + người có trip.dispatch; người bấm không tự nhận ----
test("ADR-0097 Đ5: điều chỉnh kết quả khách (xe đang chạy) → tài xế đang lái 'xe_chay_doi' + Bán hàng / Quản trị / Toàn quyền 'dieu_chinh'; không Kế toán, tài xế đã gỡ, người bấm", () => {
  assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes("trip_allocation_corrected"));
  const d = dangChay({ action: "trip_allocation_corrected", actorId: "sales" });
  const tx = tinChuyenCho(TX_B, d);
  assert.equal(tx?.loai, "xe_chay_doi");
  assert.equal(tx!.cau, "Văn phòng vừa điều chỉnh kết quả một khách ở chuyến CX-1103-02 ngày 11/03 — mở để xem");
  assert.equal(tx!.lienKet, "/cuoc-chuyen?id=t1");
  assert.equal(tinChuyenCho(TX_A, d), null, "tài xế bị gỡ trước sự kiện");
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) {
    const t = tinChuyenCho(nguoi("x", [p]), d);
    assert.equal(t?.loai, "dieu_chinh", p);
    assert.equal(t!.cau, "Chuyến CX-1103-02 ngày 11/03: văn phòng vừa điều chỉnh kết quả một khách — mở để xem");
    assert.equal(t!.lienKet, "/chuyen?id=t1");
  }
  assert.equal(tinChuyenCho(nguoi("sales", ["SALES"]), d), null, "người bấm không tự nhận (E3)");
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
  assert.equal(thayDoiCuaHanhDongChuyen("trip_allocation_corrected", true), "xe_chay");
});
test("ADR-0097 Đ5: thu hồi xuất bến (sau lệnh chuyến không còn giờ xuất bến) → tài xế đang lái 'thu_hoi_xuat_ben' + điều phối 'dieu_chinh'; Bảng tin 'sua'", () => {
  assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes("trip_departure_revoked"));
  const d = dong({ action: "trip_departure_revoked", actorId: "adm", luc: T2, xuatBen: null });
  const tx = tinChuyenCho(TX_B, d);
  assert.equal(tx?.loai, "thu_hoi_xuat_ben");
  assert.equal(tx!.cau, "Văn phòng vừa thu hồi xuất bến chuyến CX-1103-02 ngày 11/03 — chuyến về chưa chạy, bấm Xuất bến lại khi xe thật sự chạy");
  assert.equal(tx!.lienKet, "/cuoc-chuyen?id=t1");
  assert.equal(tinChuyenCho(TX_A, d), null);
  assert.equal(tinChuyenCho(nguoi("x", ["SALES"]), d)?.cau, "Chuyến CX-1103-02 ngày 11/03 vừa được thu hồi xuất bến — mở để xem");
  assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), d), null, "người bấm");
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null);
  assert.equal(thayDoiCuaHanhDongChuyen("trip_departure_revoked", dangChayLucSuKien(d)), "sua");
  assert.doesNotMatch(tx!.cau, /\d{8,}|L:|T:/);
});

// ---- ADR-0104 Đ1 mục 6 (kế hoạch NT-11): lệnh khách lớp KHAN_CAP (xếp / rút / dời có sự kiện vượt MOC_TOI_THIEU) → tài xế đang lái ----
const KHAN_CAP = ["trip_allocated", "trip_allocation_removed", "trip_allocation_moved"] as const;
test("NT-11: xếp / rút / dời có điều chỉnh khẩn cấp (khanCap) → ĐÚNG tài xế có dòng lái lúc sự kiện nhận 'khan_cap'; không khanCap → không ai; người tự làm, văn phòng, tài xế đã gỡ không", () => {
  for (const action of KHAN_CAP) {
    const d = dong({ action, actorId: "sales", luc: T2, khanCap: true });
    const t = tinChuyenCho(TX_B, d);
    assert.equal(t?.loai, "khan_cap", action);
    assert.equal(t!.lienKet, "/cuoc-chuyen?id=t1");
    assert.match(t!.cau, /^Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-02 ngày 11\/03 \((xếp thêm khách|rút khách|chuyển khách tới)\) — mở để xem$/, action);
    assert.equal(tinChuyenCho(TX_A, d), null, `${action}: tài xế đã gỡ trước sự kiện`);
    assert.equal(tinChuyenCho(nguoi("sales2", ["SALES"]), d), null, `${action}: văn phòng không nhận`);
    assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), d), null, `${action}: Quản trị không nhận (không tin cho Quản trị — Đ1 mục 5)`);
    assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b"), d), null, `${action}: chỉ-DRIVER_PARTNER`);
    assert.equal(tinChuyenCho({ ...TX_B, id: "sales" }, d), null, `${action}: người tự làm không tự nhận (E3)`);
    assert.equal(tinChuyenCho(TX_B, dong({ action, actorId: "sales", luc: T2, khanCap: false })), null, `${action}: không vượt mốc → không tin`);
  }
});
test("NT-11: dungDongChuyen gắn khanCap theo id sự kiện của dữ kiện (`khanCap` = id sự kiện mang MOC_TOI_THIEU); HANH_DONG_TIN_CHUYEN có ba lệnh khách", () => {
  const f = { chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [], xuatBen: null }], vang: [], khanCap: ["e1"] };
  const r = dungDongChuyen([{ id: "e1", tripId: "t1", actorId: "a", action: "trip_allocated", luc: T1 }, { id: "e2", tripId: "t1", actorId: "a", action: "trip_allocated", luc: T1 }], f, []);
  assert.deepEqual(r.map((x) => [x.id, x.khanCap]), [["e1", true], ["e2", false]]);
  for (const a of KHAN_CAP) assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a), a);
});
// ---- Phiếu kiểm D1 CAO-2 (ADR-0104 Đ1.6 :95, :232): dời điều chỉnh khẩn cấp → cả tài xế chuyến NGUỒN ("chuyển khách đi") ----
test("CAO-2: dời khẩn cấp — tài xế đang lái chuyến NGUỒN lúc sự kiện nhận 'khan_cap' (câu, liên kết chuyến nguồn); tài xế nguồn đã gỡ, người làm, văn phòng, không cờ, hành động khác không; người lái cả hai chuyến nhận tin chuyến đích", () => {
  const nguon = { tripId: "t0", ma: "CX-1103-01", ngayChay: "2027-03-11", lai: [{ partyId: "p-c", tu: T0, den: null }, { partyId: "p-a", tu: T0, den: T1 }] };
  const d = dong({ action: "trip_allocation_moved", actorId: "sales", luc: T2, khanCap: true, nguon });
  const TX_C = nguoi("tx-c", ["DRIVER"], "p-c");
  assert.deepEqual(tinChuyenCho(TX_C, d), { loai: "khan_cap", cau: "Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-01 ngày 11/03 (chuyển khách đi) — mở để xem", lienKet: "/cuoc-chuyen?id=t0" });
  assert.equal(tinChuyenCho(TX_B, d)?.cau, "Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-02 ngày 11/03 (chuyển khách tới) — mở để xem", "tài xế đích giữ nguyên");
  assert.equal(tinChuyenCho(TX_A, d), null, "tài xế nguồn đã gỡ trước sự kiện");
  assert.equal(tinChuyenCho({ ...TX_C, id: "sales" }, d), null, "người tự làm");
  assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), d), null, "văn phòng");
  assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-c"), d), null, "chỉ-DRIVER_PARTNER");
  assert.equal(tinChuyenCho(TX_C, { ...d, khanCap: false }), null, "không vượt mốc");
  assert.equal(tinChuyenCho(TX_C, { ...d, action: "trip_allocated" }), null, "chỉ sự kiện dời");
  const caHai = { ...nguon, lai: [{ partyId: "p-b", tu: T0, den: null }] };
  assert.match(tinChuyenCho(TX_B, { ...d, nguon: caHai })!.cau, /CX-1103-02 .*chuyển khách tới/, "lái cả hai chuyến: một tin — chuyến đích");
});
test("CAO-2: dungDongChuyen gắn chuyến nguồn theo `khanCapNguon` (id sự kiện → chuyến nguồn có trong dữ kiện); sự kiện khác → nguon null", () => {
  const f = {
    chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [], xuatBen: null }, { tripId: "t0", ma: "CX-0", ngayChay: "2027-03-11", lai: [{ partyId: "p", tu: T0, den: null }], xuatBen: null }],
    vang: [], khanCap: ["e1"], khanCapNguon: [{ suKienId: "e1", tripId: "t0" }],
  };
  const r = dungDongChuyen([{ id: "e1", tripId: "t1", actorId: "a", action: "trip_allocation_moved", luc: T1 }, { id: "e2", tripId: "t1", actorId: "a", action: "trip_allocation_moved", luc: T1 }], f, []);
  assert.deepEqual(r.map((x) => [x.id, x.nguon?.tripId ?? null, x.nguon?.ma ?? null]), [["e1", "t0", "CX-0"], ["e2", null, null]]);
});
