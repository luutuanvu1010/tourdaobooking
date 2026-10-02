// TIN CHUYẾN (ADR-0052 D6.2) — bảng ca theo vai + mọi tập con quyền (khuôn NT-3, suy kỳ vọng từ can(), không chép tay) + khoá không lộ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, dungDongChuyen, laiLucSuKien, taiXeNhanSuKien, thayDoiCuaHanhDongChuyen, tinChuyenCho,
  type DongChuyen, type NguoiNhanChuyen,
} from "./tin-chuyen.ts";

const T0 = "2027-03-11T01:00:00.000Z", T1 = "2027-03-11T02:00:00.000Z", T2 = "2027-03-11T03:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const dong = (v: Partial<DongChuyen>): DongChuyen => ({
  id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_edited", actorId: "sales", luc: T1,
  lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }], don: [], ...v,
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
  assert.deepEqual(Object.keys(d).sort(), ["action", "actorId", "don", "id", "lai", "luc", "maChuyen", "ngayChay", "tripId"]);
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
    { chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [] }], vang: [{ suKienId: "e1", orderId: "o1" }] },
    [{ orderId: "o1", maDon: "DH-1", ownerId: "lap", handlerStaffId: null }],
  );
  assert.equal(r.length, 1);
  assert.deepEqual(r[0]!.don.map((x) => x.maDon), ["DH-1"]);
});

test("taiXeNhanSuKien: chỉ tài khoản có dòng lái lúc t VÀ qua can(trip.view, assigned)", () => {
  const lai = [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }];
  assert.deepEqual(taiXeNhanSuKien([TX_A, TX_B, nguoi("dt", ["DRIVER_PARTNER"], "p-b")], lai, T2), ["tx-b"]);
});

test("thayDoiCuaHanhDongChuyen: mọi trip_* có loại thay đổi; hành động lạ → 'sua'", () => {
  assert.equal(thayDoiCuaHanhDongChuyen("trip_allocated"), "xep");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passenger_no_show"), "tien_do");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_zzz"), "sua");
});
