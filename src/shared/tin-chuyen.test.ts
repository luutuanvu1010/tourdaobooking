// TIN CHUYẾN (ADR-0052 D6.2) — bảng ca theo vai + mọi tập con quyền (khuôn NT-3, suy kỳ vọng từ can(), không chép tay) + khoá không lộ.
// NỚI có tên (ADR-0112 Đ6, 2026-10-12): bài "Đợt 5: cập nhật điểm trên chuyến CHƯA chạy … không ai nhận tin" viết lại thành bài ngược (tài xế đang lái nhận đúng
// câu) — chỉ bài đó khoá hành vi cũ; bài mới ADR-0112 Đ1–Đ5 ở cuối mục "Đợt 5".
// NỚI có tên (kế hoạch A4 §3.1 hàng T6, NT-14; ADR-0053 D7.5 :79; SO-HANG-RAO "tin chuyến — chỉ-DRIVER_PARTNER không nhận"): sau khi tài xế đối tác có
// `trip.view` assigned, tài xế đối tác ĐANG LÁI nhận ĐÚNG như tài xế công ty (cùng hàm, cùng câu — câu tin tài xế không có mã đơn, không tên); không lái → không.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PERMISSION_CODES, can, type PermissionCode } from "./permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, HANH_DONG_TIN_KHACH, HANH_DONG_TIN_THUONG, MOC_TIN_CAP_NHAT, chuyenCuaChangLuc, dangChayLucSuKien, dongCoTheSinhTin, dungDongChuyen, laiLucSuKien, taiXeNhanSuKien, thayDoiCoTheCoTin, thayDoiCuaHanhDongChuyen,
  tinChuyenCho, tinGioHenCho, type DongChuyen, type DongGioHen, type NguoiNhanChuyen,
} from "./tin-chuyen.ts";
import { THAY_DOI_CHUYEN, nhanKetNoi, nhanSuKienChuyen } from "./bang-tin.ts";
import { readFileSync } from "node:fs";

const T0 = "2027-03-11T01:00:00.000Z", T1 = "2027-03-11T02:00:00.000Z", T2 = "2027-03-11T03:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const dong = (v: Partial<DongChuyen>): DongChuyen => ({
  id: "ev", tripId: "t1", maChuyen: "CX-1103-02", ngayChay: "2027-03-11", action: "trip_edited", actorId: "sales", luc: T1,
  lai: [{ partyId: "p-a", tu: T0, den: T1 }, { partyId: "p-b", tu: T1, den: null }], don: [], xuatBen: null, khanCap: false, vuotMoc: false, ...v,
});
const TX_A = nguoi("tx-a", ["DRIVER"], "p-a"), TX_B = nguoi("tx-b", ["DRIVER"], "p-b");
const TX_DT = nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b");

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

test("hết quyền: tài khoản mất quyền DRIVER không nhận dù có dòng lái; chỉ DRIVER_PARTNER có dòng lái → nhận như tài xế công ty (A4 T6, D7.5)", () => {
  assert.equal(tinChuyenCho(nguoi("tx-b", [], "p-b"), dong({})), null);
  assert.deepEqual(tinChuyenCho(TX_DT, dong({})), tinChuyenCho(TX_B, dong({})));
  assert.equal(tinChuyenCho(TX_DT, dong({}))?.loai, "xep_lai");
  assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-z"), dong({})), null, "tài xế đối tác không lái chuyến này");
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

test("A4 T7 (ADR-0053 D8.4 bước 5): tài xế Từ chối → 'tu_choi' tới mọi người có trip.dispatch (Bán hàng, Quản trị, Toàn quyền); không Kế toán, không tài xế (kể cả chính người từ chối — E3); câu không tên, không lý do, không mã đơn; liên kết màn văn phòng", () => {
  const d = dong({ action: "trip_driver_refused", actorId: "tx-dt", lai: [{ partyId: "p-b", tu: T0, den: T1 }], don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: "pt" }] });
  for (const p of ["SALES", "ADMIN", "SUPER_ADMIN"] as const) {
    const t = tinChuyenCho(nguoi("x", [p]), d);
    assert.equal(t?.loai, "tu_choi", p);
    assert.equal(t!.cau, "Tài xế đã từ chối chuyến CX-1103-02 ngày 11/03 — cần xếp người khác");
    assert.equal(t!.lienKet, "/chuyen?id=t1");
    assert.doesNotMatch(t!.cau, /DH-|TCC_|Bận/);
  }
  assert.equal(tinChuyenCho(nguoi("kt", ["ACCOUNTING"]), d), null, "Kế toán: trip.view any nhưng không trip.dispatch");
  assert.equal(tinChuyenCho(TX_DT, d), null, "chính người từ chối (E3)");
  assert.equal(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-b"), d), null);
  assert.equal(tinChuyenCho(TX_A, d), null);
  assert.equal(tinChuyenCho(nguoi("lap", ["FIELD"]), d), null, "HDV / người lập không trip.dispatch");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_driver_refused", false), "sua", "Bảng tin: chuyến đổi (mất tài xế) — chuông văn phòng gọi lại");
  // NT-7 (ADR-0052 D6.4 — hành vi đã duyệt): Bảng tin của sự kiện Từ chối mang nhãn `dieu-xe` (chỉ mã chuyến + loại thay đổi + giờ), nên Kế toán (trip.view any)
  // vẫn thấy màn tự tải lại; không bao giờ `tat-ca`. Tài xế vừa từ chối (dòng lái đóng đúng mốc) nhận `nguoi:<id>` — màn của chính họ tải lại.
  const nhan = nhanSuKienChuyen(taiXeNhanSuKien([TX_DT, nguoi("kt", ["ACCOUNTING"]), TX_A], d.lai, d.luc));
  assert.ok(nhan.includes("dieu-xe"), JSON.stringify(nhan));
  assert.ok(!nhan.includes("tat-ca"));
  assert.ok(nhan.every((x) => x === "dieu-xe" || x === "nguoi:tx-dt"), JSON.stringify(nhan));
  assert.ok(nhanKetNoi({ id: "kt", permissions: ["ACCOUNTING"] }).includes("dieu-xe"), "Kế toán kết nối nhóm dieu-xe");
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
test("mọi tập con quyền × mọi hành động × cờ khẩn cấp: nhận ⇒ qua can(trip.view) (tài xế: assigned + có dòng lái lúc đó); tin khẩn cấp chỉ cho tài xế đang lái; người nhận CHỈ qua nhánh tài xế không bao giờ thấy mã đơn (A4 NT-14)", () => {
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
        // A4 T6 (NT-14, thay vế "chỉ-DRIVER_PARTNER không bao giờ"): ai nhận mà KHÔNG có trip.view any (chỉ nhánh tài xế) → câu không có mã đơn.
        if (!can(n, "trip.view")) {
          assert.ok(laiDung, `${JSON.stringify(permissions)} ${action}`);
          assert.doesNotMatch(t.cau, /DH-1/, `câu tin tài xế lộ mã đơn: ${JSON.stringify(permissions)} ${action}`);
        }
      }
    }
  }
});

test("câu tin không chứa gì ngoài mã chuyến, ngày, mã đơn — khoá DongChuyen không có trường tên/SĐT/nơi", () => {
  const d = dong({ action: "trip_passenger_no_show", don: [{ orderId: "o1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: null }] });
  const t = tinChuyenCho(nguoi("lap", ["SALES"]), d)!;
  assert.equal(t.cau, "Có khách vắng ở chuyến CX-1103-02 ngày 11/03 (đơn DH-0001)");
  // ADR-0104 Đ1 mục 6 (thêm có tên): `khanCap` — cờ boolean (sự kiện mang luật bị bỏ qua — CAO-C), không phải dữ kiện người.
  // CAO-C (thêm có tên, lời chủ 2026-10-08): `vuotMoc` — cờ boolean (luật bị bỏ qua là MOC_TOI_THIEU — chọn câu "khẩn cấp"), không phải dữ kiện người.
  assert.deepEqual(Object.keys(d).sort(), ["action", "actorId", "don", "id", "khanCap", "lai", "luc", "maChuyen", "ngayChay", "tripId", "vuotMoc", "xuatBen"]);
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
  // A4 T6 (NT-14): tài xế đối tác có dòng lái lúc t → cũng nhận; không dòng lái → không.
  assert.deepEqual(taiXeNhanSuKien([TX_A, TX_B, nguoi("dt", ["DRIVER_PARTNER"], "p-b"), nguoi("dt2", ["DRIVER_PARTNER"], "p-z")], lai, T2), ["tx-b", "dt"]);
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
    // Đợt 5: trip_stops_synced sinh tin CHỈ khi xe đang chạy — chuyến chưa chạy giữ loại "cap_nhat".
    // ADR-0104 Đ2.10 (NỚI có tên N7, kế hoạch mục 6): "cap_nhat" nay cũng là loại của trip_order_synced (sinh tin cho tài xế đang lái) ⇒ chuông MÁY CÓ QUYỀN
    // TÀI XẾ gọi lại cả sau cập nhật điểm / khách trên chuyến chưa chạy (một lần đọc /tom-tat thừa, không tin nào); máy văn phòng vẫn không (dòng dưới + CAO-3).
    const capNhat = thayDoiCuaHanhDongChuyen(a) === "cap_nhat";
    const coTin = ((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a) && a !== "trip_stops_synced") || capNhat;
    assert.equal(thayDoiCoTheCoTin(thayDoiCuaHanhDongChuyen(a), true), coTin, a); // phiếu D1 CAO-3: máy có quyền Tài xế (đối số thứ hai)
    if (capNhat) assert.equal(thayDoiCoTheCoTin("cap_nhat", false), false, `${a}: máy văn phòng không gọi lại`);
  }
  for (const a of HANH_DONG_TIN_CHUYEN) assert.equal(thayDoiCoTheCoTin(thayDoiCuaHanhDongChuyen(a, true), true), true, `${a} khi xe đang chạy`);
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
    assert.deepEqual(tinChuyenCho(TX_DT, d), t, `${action}: tài xế đối tác đang lái nhận như tài xế công ty (A4 T6)`);
    assert.doesNotMatch(t!.cau, /\d{8,}|L:|T:/);
  }
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_stop_added_running" }))!.cau, "Văn phòng vừa thêm khách vào chuyến CX-1103-02 ngày 11/03 — mở để xem điểm, giờ đón và số khách");
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_allocation_office_cancelled" }))!.cau, "Văn phòng báo có khách huỷ ở chuyến CX-1103-02 ngày 11/03 — mở để xem");
  assert.equal(tinChuyenCho(TX_B, dangChay({ action: "trip_stops_synced" }))!.cau, "Văn phòng vừa đổi điểm đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem");
});
// NỚI có tên (ADR-0112 Đ6, Hiến pháp Điều 9.4): bài này từng khoá "cập nhật điểm trên chuyến CHƯA chạy → không ai nhận tin" (Đợt 2 / Đợt 5). Nay là bài
// NGƯỢC: tài xế đang lái nhận đúng câu của xe đang chạy (từ mốc phát hành — Đ5); vẫn không ai khác nhận. Chỉ bài này khoá hành vi cũ (đã quét `src/**/*.test.ts`).
test("ADR-0112 Đ2 (thay bài Đợt 5 'chưa chạy → không ai nhận'): cập nhật điểm trên chuyến CHƯA chạy (chưa xuất bến, hoặc xuất bến SAU sự kiện) → tài xế đang lái nhận ĐÚNG câu của xe đang chạy; người khác không", () => {
  for (const xuatBen of [null, "2027-03-11T04:00:00.000Z"]) {
    const d = dangChay({ action: "trip_stops_synced", xuatBen });
    assert.equal(dangChayLucSuKien(d), false);
    assert.deepEqual(tinChuyenCho(TX_B, d), { loai: "xe_chay_doi", cau: "Văn phòng vừa đổi điểm đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem", lienKet: "/cuoc-chuyen?id=t1" });
    assert.equal(tinChuyenCho(TX_A, d), null, "tài xế đã bị gỡ trước sự kiện");
    assert.equal(tinChuyenCho(nguoi("x", ["SALES"]), d), null);
    assert.equal(thayDoiCuaHanhDongChuyen(d.action, dangChayLucSuKien(d)), "cap_nhat", "Bảng tin: chuyến chưa chạy vẫn loại 'cap_nhat'");
  }
  assert.equal(dangChayLucSuKien(dangChay({ action: "trip_stops_synced" })), true);
});

// ---- ADR-0112 (accepted 2026-10-09): nút tay "Cập nhật khách / điểm theo đơn" báo tài xế đang lái khi xe CHƯA chạy ------------------------------------------
const NOI_BAM = "van-phong-bam";
const CAU_KHACH = "Đơn vừa đổi khách ở chuyến CX-1103-02 ngày 11/03 — mở để xem";
const CAU_DIEM = "Văn phòng vừa đổi điểm đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem";
const nutTay = (action: string, v: Partial<DongChuyen> = {}) => dong({ action, actorId: NOI_BAM, luc: T2, xuatBen: null, ...v });

test("ADR-0112 Đ1: trip_passengers_synced → tài xế có dòng lái lúc sự kiện nhận 'khach_doi' đúng câu của máy đồng bộ; thuộc nhóm tin THƯỜNG, không thuộc ba lệnh khách", () => {
  assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes("trip_passengers_synced"));
  assert.ok(HANH_DONG_TIN_THUONG.includes("trip_passengers_synced"));
  assert.ok(!(HANH_DONG_TIN_KHACH as readonly string[]).includes("trip_passengers_synced"));
  assert.equal(dongCoTheSinhTin({ action: "trip_passengers_synced", khanCap: false }), true, "gõ cửa luôn xét (nhóm thường)");
  const d = nutTay("trip_passengers_synced");
  assert.deepEqual(tinChuyenCho(TX_B, d), { loai: "khach_doi", cau: CAU_KHACH, lienKet: "/cuoc-chuyen?id=t1" });
  assert.deepEqual(tinChuyenCho(TX_B, d)!.cau, tinChuyenCho(TX_B, nutTay("trip_order_synced"))!.cau, "cùng câu với máy đồng bộ (trip_order_synced)");
  assert.equal(thayDoiCuaHanhDongChuyen("trip_passengers_synced"), "cap_nhat");
});

test("ADR-0112 Đ3: cả hai nút — chỉ tài xế có dòng lái lúc sự kiện; tài xế bị gỡ trước sự kiện, người bấm, văn phòng, HDV, Đối tác, Thực tập, Hành chính nhân sự không; tài xế đối tác như máy đồng bộ", () => {
  for (const action of ["trip_passengers_synced", "trip_stops_synced"]) {
    const d = nutTay(action);
    assert.ok(tinChuyenCho(TX_B, d), `${action}: tài xế đang lái nhận`);
    assert.equal(tinChuyenCho(TX_A, d), null, `${action}: tài xế đã bị gỡ trước sự kiện`);
    assert.equal(tinChuyenCho({ ...TX_B, id: NOI_BAM }, d), null, `${action}: người bấm là tài xế đang lái — không tự nhận (E3)`);
    for (const p of ["SALES", "ADMIN", "ACCOUNTING", "SUPER_ADMIN", "FIELD", "PARTNER", "INTERN", "HR"] as const) assert.equal(tinChuyenCho(nguoi("x", [p]), d), null, `${action}: ${p}`);
    // Tài xế đối tác: GIỐNG HỆT máy đồng bộ (cùng hàm `loaiCho`, cùng ô trip.view). ADR-0112 Đ3 viết "không nhận" theo ô `none` của lúc soạn (9/10); từ A4 T6
    // (ADR-0053 D7.5) ô là `assigned` nên tài xế đối tác ĐANG LÁI nhận như tài xế công ty — đúng câu "nếu sau này ô đó mở, họ tự nhận qua cùng hàm".
    assert.deepEqual(tinChuyenCho(TX_DT, d), tinChuyenCho(TX_B, d), `${action}: tài xế đối tác đang lái nhận như tài xế công ty`);
    assert.equal(tinChuyenCho(nguoi("dt-khac", ["DRIVER_PARTNER"], "p-z"), d), null, `${action}: tài xế đối tác không lái chuyến này`);
  }
});

test("ADR-0112 Đ5: sự kiện TRƯỚC mốc phát hành không ra tin (cả hai nút, xe chưa chạy); xe ĐANG CHẠY giữ nguyên không mốc", () => {
  assert.match(MOC_TIN_CAP_NHAT, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, "mốc đúng dạng ISO đủ mili-giây (so chuỗi)");
  assert.equal(new Date(MOC_TIN_CAP_NHAT).toISOString(), MOC_TIN_CAP_NHAT);
  const truoc = "2026-01-01T03:00:00.000Z";
  const lai = [{ partyId: "p-b", tu: "2026-01-01T01:00:00.000Z", den: null }];
  for (const action of ["trip_passengers_synced", "trip_stops_synced"]) {
    assert.equal(tinChuyenCho(TX_B, nutTay(action, { luc: truoc, lai })), null, `${action}: trước mốc`);
    assert.ok(tinChuyenCho(TX_B, nutTay(action, { luc: MOC_TIN_CAP_NHAT, lai: [{ partyId: "p-b", tu: "2026-01-01T01:00:00.000Z", den: null }] })), `${action}: đúng mốc trở đi`);
  }
  // Xe đang chạy (đã xuất bến trước sự kiện): tin cập nhật điểm như cũ, KHÔNG phụ thuộc mốc.
  const chay = tinChuyenCho(TX_B, nutTay("trip_stops_synced", { luc: truoc, lai, xuatBen: "2026-01-01T02:00:00.000Z" }));
  assert.equal(chay?.loai, "xe_chay_doi");
});

test("ADR-0112 Đ4: câu tin của hai nút không có tên khách, SĐT, nơi đón, mã đơn — chỉ mã chuyến và ngày", () => {
  for (const action of ["trip_passengers_synced", "trip_stops_synced"]) {
    const t = tinChuyenCho(TX_B, nutTay(action, { don: [{ orderId: "o-1", maDon: "DH-0001", ownerId: "lap", handlerStaffId: null }] }))!;
    assert.doesNotMatch(t.cau, /DH-0001|\d{8,}|L:|T:/);
    assert.match(t.cau, /^(Đơn vừa đổi khách ở|Văn phòng vừa đổi điểm đón ở) chuyến CX-1103-02 ngày 11\/03 — mở để xem$/);
  }
  assert.ok([CAU_KHACH, CAU_DIEM].every((c) => c.includes("CX-1103-02")));
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
  // G17 (A4 T6, NT-14): tài xế đối tác đang lái nhận tin đổi giờ đón QUA CÙNG HÀM — câu không mã đơn; không lái → không.
  assert.deepEqual(tinGioHenCho(nguoi("tx-p", ["DRIVER_PARTNER"], "p-b"), gh()), { cau: "Văn phòng vừa đổi giờ đón ở chuyến CX-1103-02 ngày 11/03 — mở để xem", lienKet: "/cuoc-chuyen?id=t1" });
  assert.doesNotMatch(tinGioHenCho(nguoi("tx-p", ["DRIVER_PARTNER"], "p-b"), gh())!.cau, /DH-1/);
  assert.equal(tinGioHenCho(nguoi("tx-p", ["DRIVER_PARTNER"], "p-z"), gh()), null, "tài xế đối tác không lái");
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
    const d = dong({ action, actorId: "sales", luc: T2, khanCap: true, vuotMoc: true });
    const t = tinChuyenCho(TX_B, d);
    assert.equal(t?.loai, "khan_cap", action);
    assert.equal(t!.lienKet, "/cuoc-chuyen?id=t1");
    assert.match(t!.cau, /^Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-02 ngày 11\/03 \((xếp thêm khách|rút khách|chuyển khách tới)\) — mở để xem$/, action);
    assert.equal(tinChuyenCho(TX_A, d), null, `${action}: tài xế đã gỡ trước sự kiện`);
    assert.equal(tinChuyenCho(nguoi("sales2", ["SALES"]), d), null, `${action}: văn phòng không nhận`);
    assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), d), null, `${action}: Quản trị không nhận (không tin cho Quản trị — Đ1 mục 5)`);
    assert.deepEqual(tinChuyenCho(TX_DT, d), t, `${action}: tài xế đối tác đang lái nhận như tài xế công ty (A4 T6, D7.5)`);
    assert.equal(tinChuyenCho({ ...TX_B, id: "sales" }, d), null, `${action}: người tự làm không tự nhận (E3)`);
    assert.equal(tinChuyenCho(TX_B, dong({ action, actorId: "sales", luc: T2, khanCap: false })), null, `${action}: không vượt mốc → không tin`);
  }
});
test("NT-11 + CAO-C: dungDongChuyen gắn khanCap (id sự kiện có bỏ qua luật) và vuotMoc (id sự kiện mang MOC_TOI_THIEU) theo dữ kiện; HANH_DONG_TIN_CHUYEN có ba lệnh khách", () => {
  // CAO-C: `khanCap` = id sự kiện mang BẤT KỲ luật bị bỏ qua (cờ tin); `vuotMoc` = tập con mang MOC_TOI_THIEU (câu "khẩn cấp"). Vắng `vuotMoc` → false.
  const f = { chuyen: [{ tripId: "t1", ma: "CX-1", ngayChay: "2027-03-11", lai: [], xuatBen: null }], vang: [], khanCap: ["e1", "e3"], vuotMoc: ["e1"] };
  const tho = ["e1", "e2", "e3"].map((id) => ({ id, tripId: "t1", actorId: "a", action: "trip_allocated", luc: T1 }));
  const r = dungDongChuyen(tho, f, []);
  assert.deepEqual(r.map((x) => [x.id, x.khanCap, x.vuotMoc]), [["e1", true, true], ["e2", false, false], ["e3", true, false]]);
  assert.deepEqual(dungDongChuyen(tho, { ...f, vuotMoc: undefined }, []).map((x) => x.vuotMoc), [false, false, false], "dữ kiện không có vuotMoc → false");
  for (const a of KHAN_CAP) assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a), a);
});
// ---- CAO-C (lời chủ 2026-10-08 "Báo mọi lệnh có bỏ qua luật (Recommended)"; lệch có chủ ý với chữ ADR-0104 :95 — SYSTEM-DESIGN §16) ----
test("CAO-C: xếp / rút / dời có bỏ qua luật KHÁC mốc (khanCap, không vuotMoc) → tài xế đang lái nhận câu TRUNG TÍNH (không 'khẩn cấp', không '6 giờ'); dời: tài xế nguồn cũng nhận câu trung tính; người làm, văn phòng, tài xế đã gỡ không", () => {
  for (const action of KHAN_CAP) {
    const d = dong({ action, actorId: "adm", luc: T2, khanCap: true, vuotMoc: false });
    const t = tinChuyenCho(TX_B, d);
    assert.equal(t?.loai, "khan_cap", action);
    assert.equal(t!.lienKet, "/cuoc-chuyen?id=t1");
    assert.match(t!.cau, /^Văn phòng vừa điều chỉnh chuyến CX-1103-02 ngày 11\/03 \((xếp thêm khách|rút khách|chuyển khách tới)\) — mở để xem$/, action);
    assert.doesNotMatch(t!.cau, /khẩn cấp|6 giờ|phá lệ/, action);
    assert.equal(tinChuyenCho(TX_A, d), null, `${action}: tài xế đã gỡ`);
    assert.equal(tinChuyenCho(nguoi("adm2", ["ADMIN"]), d), null, `${action}: văn phòng`);
    assert.equal(tinChuyenCho({ ...TX_B, id: "adm" }, d), null, `${action}: người tự làm`);
  }
  const nguon = { tripId: "t0", ma: "CX-1103-01", ngayChay: "2027-03-11", lai: [{ partyId: "p-c", tu: T0, den: null }] };
  const d = dong({ action: "trip_allocation_moved", actorId: "sales", luc: T2, khanCap: true, vuotMoc: false, nguon });
  assert.deepEqual(tinChuyenCho(nguoi("tx-c", ["DRIVER"], "p-c"), d), { loai: "khan_cap", cau: "Văn phòng vừa điều chỉnh chuyến CX-1103-01 ngày 11/03 (chuyển khách đi) — mở để xem", lienKet: "/cuoc-chuyen?id=t0" });
  assert.equal(tinChuyenCho(nguoi("tx-c", ["DRIVER"], "p-c"), { ...d, vuotMoc: true })?.cau, "Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-01 ngày 11/03 (chuyển khách đi) — mở để xem", "nguồn, có mốc: câu khẩn cấp");
});

// ---- Phiếu kiểm D1 CAO-3: dòng xếp / rút / dời KHÔNG khẩn cấp không làm chuông văn phòng gọi lại, không gõ cửa ----
test("CAO-3: thayDoiCoTheCoTin — tập CỤ THỂ (viết tay, không suy từ danh sách): máy có quyền Tài xế gọi lại chuông ở tao/sua/huy/gian_doan/vang/xe_chay + xep/rut/doi; máy KHÔNG có quyền Tài xế bỏ xep/rut/doi", () => {
  // ADR-0104 Đ2.10 (NỚI có tên N7): + "cap_nhat" (máy đồng bộ chuyến theo đơn — tin "khach_doi" chỉ cho tài xế đang lái) — máy văn phòng KHÔNG thêm.
  const TAI_XE = ["tao", "sua", "huy", "gian_doan", "vang", "xe_chay", "xep", "rut", "doi", "cap_nhat"];
  const VAN_PHONG = ["tao", "sua", "huy", "gian_doan", "vang", "xe_chay"];
  for (const t of THAY_DOI_CHUYEN) {
    assert.equal(thayDoiCoTheCoTin(t, true), TAI_XE.includes(t), `có quyền Tài xế: ${t}`);
    assert.equal(thayDoiCoTheCoTin(t, false), VAN_PHONG.includes(t), `không quyền Tài xế: ${t}`);
  }
  // Chuông (web/thong-bao-ui.ts) truyền "máy có quyền Tài xế" bằng CHÍNH vị từ menu "Cuốc của tôi" — không hằng true.
  const chuong = readFileSync(new URL("../../web/thong-bao-ui.ts", import.meta.url), "utf8");
  assert.match(chuong, /const coTheLai = coCuocCuaToi\(staff\);/);
  assert.match(chuong, /thayDoiCoTheCoTin\(e\.thayDoi, coTheLai\)/);
  // Phiếu kiểm hẹp D1 THẤP-1 (K5): đúng MỘT lời gọi — không vế thứ hai nào (vd. "|| thayDoiCoTheCoTin(e.thayDoi, true)") nới chuông lại cho mọi máy.
  assert.equal(chuong.split("thayDoiCoTheCoTin(").length - 1, 1, "chuông gọi thayDoiCoTheCoTin đúng một lần");
});
test("CAO-3: dongCoTheSinhTin — ba lệnh khách chỉ khi sự kiện mang cờ khẩn cấp; hành động sinh tin khác luôn; hành động ngoài danh sách không; gốc lắp ráp gõ cửa qua hàm này", () => {
  for (const a of ["trip_allocated", "trip_allocation_removed", "trip_allocation_moved"]) {
    assert.equal(dongCoTheSinhTin({ action: a, khanCap: false }), false, `${a} không cờ`);
    assert.equal(dongCoTheSinhTin({ action: a, khanCap: true }), true, `${a} có cờ`);
  }
  for (const a of ["trip_created", "trip_edited", "trip_cancelled", "trip_ended_interrupted", "trip_passenger_no_show", "trip_departure_revoked"]) {
    assert.equal(dongCoTheSinhTin({ action: a, khanCap: false }), true, a);
  }
  for (const a of ["trip_departed", "trip_ended", "trip_stop_arrived"]) assert.equal(dongCoTheSinhTin({ action: a, khanCap: true }), false, a);
  const goc = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
  assert.match(goc, /\["day", dongCoTheSinhTin\(dong\) \? dayGoCua\(env, \{ chuyen: dong/, "baoThayDoiChuyen gõ cửa chỉ khi dòng có thể sinh tin");
});

// ---- Phiếu kiểm D1 CAO-2 (ADR-0104 Đ1.6 :95, :232): dời điều chỉnh khẩn cấp → cả tài xế chuyến NGUỒN ("chuyển khách đi") ----
test("CAO-2: dời khẩn cấp — tài xế đang lái chuyến NGUỒN lúc sự kiện nhận 'khan_cap' (câu, liên kết chuyến nguồn); tài xế nguồn đã gỡ, người làm, văn phòng, không cờ, hành động khác không; người lái cả hai chuyến nhận tin chuyến đích", () => {
  const nguon = { tripId: "t0", ma: "CX-1103-01", ngayChay: "2027-03-11", lai: [{ partyId: "p-c", tu: T0, den: null }, { partyId: "p-a", tu: T0, den: T1 }] };
  const d = dong({ action: "trip_allocation_moved", actorId: "sales", luc: T2, khanCap: true, vuotMoc: true, nguon });
  const TX_C = nguoi("tx-c", ["DRIVER"], "p-c");
  assert.deepEqual(tinChuyenCho(TX_C, d), { loai: "khan_cap", cau: "Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-01 ngày 11/03 (chuyển khách đi) — mở để xem", lienKet: "/cuoc-chuyen?id=t0" });
  assert.equal(tinChuyenCho(TX_B, d)?.cau, "Văn phòng vừa điều chỉnh khẩn cấp chuyến CX-1103-02 ngày 11/03 (chuyển khách tới) — mở để xem", "tài xế đích giữ nguyên");
  assert.equal(tinChuyenCho(TX_A, d), null, "tài xế nguồn đã gỡ trước sự kiện");
  assert.equal(tinChuyenCho({ ...TX_C, id: "sales" }, d), null, "người tự làm");
  assert.equal(tinChuyenCho(nguoi("adm", ["ADMIN"]), d), null, "văn phòng");
  assert.deepEqual(tinChuyenCho(nguoi("tx-dt", ["DRIVER_PARTNER"], "p-c"), d), tinChuyenCho(TX_C, d), "tài xế đối tác lái chuyến nguồn nhận như tài xế công ty (A4 T6)");
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

// ---- ADR-0104 Đ2.10 (kế hoạch T2.15): máy đồng bộ chuyến theo đơn (`trip_order_synced`) → tài xế đang lái nhận tin "khach_doi" ----
test("Đ2.10: trip_order_synced → ĐÚNG tài xế có dòng lái lúc sự kiện nhận 'khach_doi' (câu cố định, liên kết /cuoc-chuyen) — kể cả tài xế đối tác (A4 T6); người sửa đơn, văn phòng, Quản trị, Kế toán, Toàn quyền, tài xế đã gỡ không", () => {
  const d = dong({ action: "trip_order_synced", actorId: "sales", luc: T2 });
  assert.deepEqual(tinChuyenCho(TX_B, d), { loai: "khach_doi", cau: "Đơn vừa đổi khách ở chuyến CX-1103-02 ngày 11/03 — mở để xem", lienKet: "/cuoc-chuyen?id=t1" });
  assert.equal(tinChuyenCho(TX_A, d), null, "tài xế đã gỡ trước sự kiện");
  for (const p of ["SALES", "ADMIN", "ACCOUNTING", "SUPER_ADMIN", "FIELD", "PARTNER", "INTERN", "HR"] as const) assert.equal(tinChuyenCho(nguoi("x", [p]), d), null, p);
  assert.deepEqual(tinChuyenCho(TX_DT, d), tinChuyenCho(TX_B, d), "tài xế đối tác đang lái (A4 T6, NT-14)");
  assert.equal(tinChuyenCho({ ...TX_B, id: "sales" }, d), null, "người sửa đơn là tài xế đang lái: không tự nhận (E3)");
});
test("Đ2.10: trip_order_synced thuộc nhóm tin THƯỜNG (hộp đọc trần 3000), KHÔNG thuộc ba lệnh khách (trần 1000, chỉ sự kiện MOC_TOI_THIEU); gõ cửa luôn xét; Bảng tin 'cap_nhat' — chuông máy văn phòng không gọi lại (tin chỉ cho tài xế)", () => {
  assert.ok((HANH_DONG_TIN_CHUYEN as readonly string[]).includes("trip_order_synced"));
  assert.ok(HANH_DONG_TIN_THUONG.includes("trip_order_synced"));
  assert.ok(!(HANH_DONG_TIN_KHACH as readonly string[]).includes("trip_order_synced"));
  assert.equal(dongCoTheSinhTin({ action: "trip_order_synced", khanCap: false }), true);
  assert.equal(thayDoiCuaHanhDongChuyen("trip_order_synced"), "cap_nhat");
  assert.equal(thayDoiCoTheCoTin("cap_nhat", true), true, "máy có quyền Tài xế gọi lại chuông");
  assert.equal(thayDoiCoTheCoTin("cap_nhat", false), false, "máy văn phòng không gọi lại (khuôn CAO-3)");
});
