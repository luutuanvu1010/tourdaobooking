// TIN CHUYẾN (ADR-0052 D6.2) — bảng ca theo vai + mọi tập con quyền (khuôn NT-3, suy kỳ vọng từ can(), không chép tay) + khoá không lộ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, dangChayLucSuKien, dungDongChuyen, laiLucSuKien, taiXeNhanSuKien, thayDoiCoTheCoTin, thayDoiCuaHanhDongChuyen, tinChuyenCho,
  type DongChuyen, type NguoiNhanChuyen,
} from "./tin-chuyen.ts";

const T0 = "2027-03-11T01:00:00.000Z", T1 = "2027-03-11T02:00:00.000Z", T2 = "2027-03-11T03:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const dong = (v: Partial<DongChuyen>): DongChuyen => ({
  id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_edited", actorId: "sales", luc: T1,
  lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }], don: [], xuatBen: null, ...v,
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
test("mọi tập con quyền × mọi hành động: nhận ⇒ qua can(trip.view) (tài xế: assigned + có dòng lái lúc đó); chỉ-DRIVER_PARTNER không bao giờ", () => {
  const tap = moiTapCon(PERMISSION_CODES as readonly PermissionCode[]);
  assert.equal(tap.length, 1024);
  for (const permissions of tap) {
    for (const action of [...HANH_DONG_TIN_CHUYEN, "trip_allocated", "trip_departed"]) {
      for (const partyId of ["p-b", null]) {
        const n = { id: "lap", permissions, partyId };
        const d = dong({ action, actorId: "khac", don: [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }] });
        const t = tinChuyenCho(n, d);
        if (!t) continue;
        const laiDung = partyId !== null && laiLucSuKien(d.lai, partyId, d.luc) !== null && can(n, "trip.view", { assigned: true });
        assert.ok(laiDung || can(n, "trip.view"), `nhận mà không có trip.view: ${JSON.stringify(permissions)} ${action}`);
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
  assert.deepEqual(Object.keys(d).sort(), ["action", "actorId", "don", "id", "lai", "luc", "maChuyen", "ngayChay", "tripId", "xuatBen"]);
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
