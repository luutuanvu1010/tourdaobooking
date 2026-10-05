// CỨU HỘ ĐƠN GIẢN — route đọc `GET /api/van-chuyen/chuyen/:id/cuu-ho` (ADR-0052 D5c bản đơn giản; kế hoạch Đợt 5 Task 15). Chạy CẢ ứng dụng trên SQLite thật,
// đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). Không lệnh ghi mới: văn phòng xem các chặng vừa về "chưa xếp" sau Kết thúc gián đoạn và các xe cùng ngày có
// tài xế công ty để xếp lại bằng route có sẵn (them-diem / phan-bo / tạo chuyến). DTO KHÔNG tên khách, SĐT, mã đơn.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, NGAY, SALES, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { cuuHoTu } from "./cuu-ho.ts";

const cuuHo = (w: any, id: string, as = SALES) => w.call("GET", `/api/van-chuyen/chuyen/${id}/cuu-ho`, { as });

test("cứu hộ: chuyến chưa gián đoạn → 409; sau Kết thúc gián đoạn → chặng cần chuyển + xe nhận cùng ngày (tài xế công ty, chưa kết thúc); khoá DTO; Kế toán / tài xế 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await chuyenSan(w, { taiXe: DRIVER2, gio: "14:00", bd: "13:30", kt: "16:00", noiDon: "Khách sạn Hai" });
    const truoc = await cuuHo(w, a.id);
    assert.equal(truoc.status, 409, truoc.text);
    assert.equal(truoc.json.error.code, "chua_gian_doan");
    assert.equal(truoc.json.error.message, "Chỉ tạo chuyến cứu hộ sau khi xe đã Kết thúc gián đoạn.");
    assert.equal((await cuuHo(w, uuid())).status, 404);
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("12:41");
    const gd = await tienDo(w, "tai-xe", a.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" });
    assert.equal(gd.status, 200, gd.text);
    assert.equal((await cuuHo(w, a.id, ACC)).status, 403, "Kế toán không có trip.dispatch");
    assert.equal((await cuuHo(w, a.id, DRIVER)).status, 403, "tài xế không qua cổng văn phòng");
    const r = await cuuHo(w, a.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["changChoXep", "chuyenHong", "xeNhan"]);
    assert.deepEqual(r.json.chuyenHong, { id: a.id, ma: a.ma, ngay: NGAY, soKhachCanChuyen: 2 });
    assert.deepEqual(r.json.changChoXep, [{ legId: a.don.legId, soNguoi: 2, noiDon: "Khách sạn Dò Tìm", gioHen: "13:00", datGap: false }]);
    assert.deepEqual(r.json.xeNhan.map((x: any) => Object.keys(x).sort()), [["choTrong", "diemSapToi", "maChuyen", "tenTaiXe", "trangThai", "tripId", "version"]]);
    const x = r.json.xeNhan[0];
    assert.deepEqual([x.tripId, x.trangThai, x.choTrong, x.diemSapToi], [b.id, "PLANNED", 13, "Khách sạn Hai"]);
    assert.ok(x.tenTaiXe.length > 0);
    const text = JSON.stringify(r.json);
    for (const lo of ["Khách Dò Tìm 1", "0912345678", a.don.code, b.don.code]) assert.ok(!text.includes(lo), `lộ "${lo}"`);
    // Xếp lại chặng sang B (Quản trị phá lệ — trong mốc) → chặng không còn "cần chuyển".
    const cb = await chiTiet(w, b.id, ADM);
    const x2 = await w.call("POST", `/api/van-chuyen/chuyen/${b.id}/phan-bo`, { as: ADM, body: { version: cb.chuyen.version, requestId: uuid(), chang: [{ legId: a.don.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } } });
    assert.equal(x2.status, 200, x2.text);
    const sau = await cuuHo(w, a.id);
    assert.deepEqual([sau.json.changChoXep, sau.json.chuyenHong.soKhachCanChuyen], [[], 0]);
  } finally {
    tat();
  }
});

test("cuuHoTu (thuần): xe nhận chỉ chuyến PLANNED / RUNNING khác chuyến hỏng, tài xế CONG_TY; chặng chỉ khi còn người chưa xếp (số = min(suất gián đoạn, còn lại))", () => {
  const nen: any = {
    trip: { id: "h", code: "CX-1", service_date: NGAY, status: "ENDED_INTERRUPTED" },
    allocs: [
      { kind: "PASSENGER", leg_id: "l1", close_reason: "TRIP_INTERRUPTED" }, { kind: "PASSENGER", leg_id: "l1", close_reason: "TRIP_INTERRUPTED" },
      { kind: "PASSENGER", leg_id: "l2", close_reason: "TRIP_INTERRUPTED" }, { kind: "PASSENGER", leg_id: "l3", close_reason: "STOP_CHANGED" },
      { kind: "CREW", leg_id: null, close_reason: "TRIP_INTERRUPTED" },
    ],
  };
  const ch = (legId: string, soNguoi: number, soDaXep: number) => ({ legId, maDon: `TD-${legId}`, soNguoi, soDaXep, noiDon: `Nơi ${legId}`, gioDon: "09:00", datGap: legId === "l2", trangThai: soDaXep === 0 ? "CHUA_XEP" : "DA_XEP", nhan: soDaXep > 0 && soDaXep < soNguoi ? ["XEP_MOT_PHAN"] : [] });
  const tr = (id: string, trangThai: string, loai: string | null, tai = 3) => ({ id, ma: `M-${id}`, version: 4, trangThai, tai, xe: { soCho: 16 }, taiXe: loai ? { ten: `TX ${id}`, loai } : null, diem: [{ thuTu: 1, tenNoi: "Đã qua", trangThai: "DONE" }, { thuTu: 2, tenNoi: `Kế ${id}`, trangThai: "PENDING" }] });
  const l: any = {
    chang: [ch("l1", 3, 1), ch("l2", 1, 1), ch("l3", 2, 0)],
    chuyen: [tr("h", "ENDED_INTERRUPTED", "CONG_TY"), tr("p", "PLANNED", "CONG_TY"), tr("r", "RUNNING", "CONG_TY"), tr("n", "PLANNED", "NHA_XE"), tr("e", "ENDED", "CONG_TY"), tr("k", "PLANNED", null)],
  };
  const r = cuuHoTu(nen, l);
  assert.deepEqual(r.changChoXep, [{ legId: "l1", soNguoi: 2, noiDon: "Nơi l1", gioHen: "09:00", datGap: false }]);
  assert.deepEqual(r.chuyenHong, { id: "h", ma: "CX-1", ngay: NGAY, soKhachCanChuyen: 2 });
  assert.deepEqual(r.xeNhan.map((x) => [x.tripId, x.trangThai, x.choTrong, x.diemSapToi, x.version]), [["p", "PLANNED", 13, "Kế p", 4], ["r", "RUNNING", 13, "Kế r", 4]]);
});
