// ĐỢT 7 TASK 5 (ADR-0056 VK3-A; kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-07-xe-rieng-so-cho.md C7, Review Focus 3–4, tiêu chí 3/3b/3c):
// lệnh chỉ GIẢM khách (rút, cập nhật khách theo đơn, cập nhật điểm theo đơn) KHÔNG BAO GIỜ bị CAM_KET chặn; hết vi phạm thì xoá hai cột phá lệ trong cùng lô
// (có nhật ký); còn vi phạm mà khoá đổi thì giữ cột cũ ⇒ cổng xuất bến giữ chuyến. Cổng xuất bến thấy hết vi phạm mà cột đang có ⇒ lô xuất bến xoá cột.
// Sửa đơn ĐI ĐƯỜNG THẬT của orders (`PUT /api/orders/:id/legs/:legId` — Task 2), phá lệ đi đường thật của Task 4 (Quản trị gửi `camKetPhaLe`). Chạy CẢ ứng
// dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs — xe có Kiểm định + Bảo hiểm, tài xế có GPLX). Mỗi ca MỘT thế giới; đồng hồ chỉ tiến
// tới giờ xuất bến SAU mọi lệnh kế hoạch (trong 6 giờ thì rút / ghép đòi phá lệ mốc — không phải điều bài này kiểm). Tên khách GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, tienDo, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PL = { lyDo: "PHA_LE_SU_CO" };
const camKetCua = (w: any, tripId: string) => ({ ...w.q("SELECT commitment_override_reason_code r, commitment_override_key k FROM vc_trip WHERE id = ?", tripId)[0] });
const TRONG = { r: null, k: null };

/** Sửa chặng của đơn qua đường thật của orders (sau xác nhận: ô `order.trip.edit`); `over` = khoá cam kết / nơi đón. Đọc lại `updatedAt` mỗi lần. */
async function suaChang(w: any, orderId: string, legId: string, over: Record<string, unknown>) {
  const o = (await w.call("GET", `/api/orders/${orderId}`, { as: ADM })).json.order;
  const l = o.services.flatMap((s: any) => s.legs).find((x: any) => x.id === legId);
  const leg = {
    pickupDate: l.pickupDate ?? "", pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "",
    dropoffLocationId: l.dropoffLocationId, dropoffPlace: l.dropoffPlace ?? "", ...over,
  };
  const r = await w.call("PUT", `/api/orders/${orderId}/legs/${legId}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg } });
  assert.equal(r.status, 200, r.text);
}
/** Xếp `soSuat` suất của chặng lên chuyến (version đọc mới). */
async function xep(w: any, tripId: string, legId: string, as = SALES, extra: Record<string, unknown> = {}, soSuat = 2) {
  const c = await chiTiet(w, tripId);
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat }], ...extra } });
}
const lenh = async (w: any, tripId: string, duoi: string, body: Record<string, unknown> = {}, as = SALES) =>
  w.call("POST", `/api/van-chuyen/chuyen/${tripId}/${duoi}`, { as, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid(), ...body } });
const suatCua = async (w: any, tripId: string, legId: string): Promise<string[]> =>
  (await chiTiet(w, tripId)).suat.filter((s: any) => s.legId === legId && s.loai === "PASSENGER").map((s: any) => s.id);
/** Quản trị phá lệ vi phạm sinh do sửa đơn: PUT chuyến CHỈ có camKetPhaLe (khuôn nghiPhaLe — Task 4). */
const phaLeQuaSuaChuyen = async (w: any, tripId: string) => {
  const r = await w.call("PUT", `/api/van-chuyen/chuyen/${tripId}`, { as: ADM, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid(), camKetPhaLe: PL } });
  assert.equal(r.status, 200, r.text);
};
const khoaCuaDon = (w: any, orderId: string): string[] =>
  w.q(`SELECT p.person_key k FROM ord_passenger p WHERE p.order_id = ? AND p.voided_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL) ORDER BY p.person_key`, orderId).map((r: any) => r.k);
/** Người lập thay một khách của đơn (huỷ một, thêm một) — để "cập nhật khách theo đơn" có việc. */
async function thayKhach(w: any, orderId: string) {
  const ds = (await w.call("GET", `/api/orders/${orderId}/passengers`, { as: SALES })).json;
  const r1 = await w.call("POST", `/api/orders/${orderId}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [khoaCuaDon(w, orderId)[0]] } });
  assert.equal(r1.status, 200, r1.text);
  const r2 = await w.call("POST", `/api/orders/${orderId}/passengers`, {
    as: SALES, body: { expectedUpdatedAt: r1.json.orderUpdatedAt, them: [{ fullName: "Khách Thay Dò Tìm", birthYear: 1985, paxCode: "adult" }], sua: [], huy: [] },
  });
  assert.equal(r2.status, 200, r2.text);
}
/** Thế giới chung: chuyến 12:30–15:00 xe 15 chỗ, tài xế DRIVER; đơn A, B (2 khách, đón 13:00). `ckA` / `ckB` = cam kết bật TRƯỚC khi xếp. */
async function the(ckA: Record<string, unknown> = {}, ckB: Record<string, unknown> = {}, tuyChon: Record<string, unknown> = {}) {
  const w = setup(tuyChon);
  const t = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}` });
  const a = await don(w, { soNguoi: 2 });
  const b = await don(w, { soNguoi: 2 });
  if (Object.keys(ckA).length) await suaChang(w, a.id, a.legId, ckA);
  if (Object.keys(ckB).length) await suaChang(w, b.id, b.legId, ckB);
  return { w, id: t.chuyen.id as string, a, b };
}
const xuatBen = async (w: any, tripId: string) => {
  denGio("12:40");
  return tienDo(w, "van-phong", tripId, "xuat-ben");
};
const nhatKyCuoi = (w: any, action: string) => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid DESC", action)[0]?.detail as string;

test("Tiêu chí 3: ghép A + B rồi bật XE RIÊNG cho A (sửa đơn qua PUT /legs, không lệnh chuyến) → xuất bến 409 chua_du_dieu_kien_xuat_ben có lý do CAM_KET", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the();
    assert.equal((await xep(w, id, a.legId)).status, 200);
    assert.equal((await xep(w, id, b.legId)).status, 200);
    await suaChang(w, a.id, a.legId, { exclusiveVehicle: true });
    const x = await xuatBen(w, id);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.ok(x.json.error.lyDo.some((l: any) => l.ma === "CAM_KET"), JSON.stringify(x.json.error.lyDo));
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "PLANNED");
  } finally {
    tat();
  }
});

// ADR-0128 Q2 (chủ duyệt 2026-10-17): xe riêng KHÔNG phá lệ được → ống dẫn phá lệ cam kết chạy bằng SỐ CHỖ TỐI THIỂU (R-CX); bước xe riêng canh luật mới.
test("Tiêu chí 3b: đã phá lệ số chỗ (B cần ≥ 16 chỗ) — xếp thêm C cũng cần ≥ 16 chỗ → 409 can_pha_le_cam_ket lúc xếp; bật xe riêng ở chặng của B (sửa đơn, không lệnh chuyến) → cột giữ khoá cũ, xuất bến giữ CAM_KET", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the({}, { minVehicleSeats: 16 });
    const c = await don(w, { soNguoi: 2 });
    await suaChang(w, c.id, c.legId, { minVehicleSeats: 16 });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    const pl = await xep(w, id, b.legId, ADM, { camKetPhaLe: PL });
    assert.equal(pl.status, 200, pl.text);
    const ck = camKetCua(w, id);
    assert.equal(ck.r, "PHA_LE_SU_CO");
    const r = await xep(w, id, c.legId);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "can_pha_le_cam_ket");
    await suaChang(w, b.id, b.legId, { exclusiveVehicle: true });
    assert.deepEqual(camKetCua(w, id), ck, "sửa đơn không chạm cột chuyến");
    const x = await xuatBen(w, id);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "chua_du_dieu_kien_xuat_ben");
    assert.ok(x.json.error.lyDo.some((l: any) => l.ma === "CAM_KET"), JSON.stringify(x.json.error.lyDo));
  } finally {
    tat();
  }
});

test("ADR-0128 Q2: chuyến đã có chặng XE RIÊNG của A — xếp B bị CHẶN CỨNG: Quản trị gửi camKetPhaLe cũng 409, không ghi cột phá lệ", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the({ exclusiveVehicle: true });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    const pl = await xep(w, id, b.legId, ADM, { camKetPhaLe: PL });
    assert.equal(pl.status, 409, pl.text);
    assert.equal(pl.json.error.code, "chang_khong_hop_le", "chặn cứng, KHÔNG phải can_pha_le_cam_ket");
    assert.ok(pl.json.error.lyDo.some((l: any) => l.ma === "CAM_KET"), pl.text);
    assert.deepEqual(camKetCua(w, id), TRONG);
    assert.equal(w.q("SELECT COUNT(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'ALLOCATED'", id)[0].n, 1, "chỉ sự kiện xếp A; lệnh bị chặn không ghi sự kiện");
  } finally {
    tat();
  }
});

test("Tiêu chí 3c (cổng): đã phá lệ số chỗ (B cần ≥ 16 chỗ, xe 15) — tăng minVehicleSeats lên 20 → khoá đổi, xuất bến giữ CAM_KET '≥ 20 chỗ'", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the({}, { minVehicleSeats: 16 });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    assert.equal((await xep(w, id, b.legId)).json.error.code, "can_pha_le_cam_ket");
    assert.equal((await xep(w, id, b.legId, ADM, { camKetPhaLe: PL })).status, 200);
    assert.ok(camKetCua(w, id).k.includes(`${b.legId}:CX:0:16`));
    await suaChang(w, b.id, b.legId, { minVehicleSeats: 20 });
    const x = await xuatBen(w, id);
    assert.equal(x.status, 409, x.text);
    assert.deepEqual(x.json.error.lyDo.filter((l: any) => l.ma === "CAM_KET").length, 1);
    assert.match(JSON.stringify(x.json.error.lyDo), /≥ 20 chỗ, xe 15 chỗ/);
  } finally {
    tat();
  }
});

test("Tiêu chí 3c (rút, Review Focus 4): đã phá lệ số chỗ của B — Bán hàng rút B (hết vi phạm) → 200, hai cột NULL NGAY sau lệnh rút, nhật ký 'bỏ phá lệ cam kết'; ghép B lại → 409 can_pha_le_cam_ket (phá lệ mới)", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the({}, { minVehicleSeats: 16 });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    assert.equal((await xep(w, id, b.legId, ADM, { camKetPhaLe: PL })).status, 200);
    assert.notDeepEqual(camKetCua(w, id), TRONG);
    const rut = await lenh(w, id, "rut", { suatIds: await suatCua(w, id, b.legId) });
    assert.equal(rut.status, 200, rut.text);
    assert.deepEqual(camKetCua(w, id), TRONG);
    const nk = nhatKyCuoi(w, "trip_allocation_removed");
    assert.match(nk, /hết vi phạm cam kết — bỏ phá lệ cam kết/);
    assert.ok(!nk.includes("xe:"), `C4: khoá không vào nhật ký — ${nk}`);
    const lai = await xep(w, id, b.legId);
    assert.equal(lai.status, 409, lai.text);
    assert.equal(lai.json.error.code, "can_pha_le_cam_ket");
  } finally {
    tat();
  }
});

test("C7: rút / cập nhật khách / cập nhật điểm KHÔNG BAO GIỜ trả can_pha_le_cam_ket dù còn vi phạm; khoá đổi thì cột GIỮ khoá cũ (không ghi khoá mới) → xuất bến giữ CAM_KET", async () => {
  const tat = batDongHo();
  try {
    // ADR-0128 Q2: xe riêng không phá lệ được → ống dẫn phá lệ chạy bằng số chỗ tối thiểu (B, C cần ≥ 16 chỗ, xe 15).
    const { w, id, a, b } = await the({}, { minVehicleSeats: 16 });
    const c = await don(w, { soNguoi: 2 });
    await suaChang(w, c.id, c.legId, { minVehicleSeats: 16 });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    assert.equal((await xep(w, id, b.legId, ADM, { camKetPhaLe: PL })).status, 200);
    assert.equal((await xep(w, id, c.legId, ADM, { camKetPhaLe: { lyDo: "PHA_LE_KHAC" } })).status, 200);
    const ck = camKetCua(w, id);
    assert.ok(ck.k.includes(c.legId), ck.k);
    // Rút C: còn vi phạm (B), khoá khác khoá đã lưu → Bán hàng làm được, cột giữ.
    const rut = await lenh(w, id, "rut", { suatIds: await suatCua(w, id, c.legId) });
    assert.equal(rut.status, 200, rut.text);
    assert.deepEqual(camKetCua(w, id), ck);
    // Cập nhật khách theo đơn (B đổi một khách) — còn vi phạm → 200, cột giữ.
    await thayKhach(w, b.id);
    const kh = await lenh(w, id, "cap-nhat-khach");
    assert.equal(kh.status, 200, kh.text);
    assert.deepEqual(camKetCua(w, id), ck);
    // Cập nhật điểm theo đơn (B đổi nơi đón) — còn vi phạm → 200, cột giữ.
    await suaChang(w, b.id, b.legId, { pickupPlace: "Khách sạn Đổi Dò Tìm" });
    const di = await lenh(w, id, "cap-nhat-diem");
    assert.equal(di.status, 200, di.text);
    assert.equal(di.json.daCapNhat, 2, di.text);
    assert.deepEqual(camKetCua(w, id), ck);
    const x = await xuatBen(w, id);
    assert.equal(x.status, 409, x.text);
    assert.ok(x.json.error.lyDo.some((l: any) => l.ma === "CAM_KET"), JSON.stringify(x.json.error.lyDo));
  } finally {
    tat();
  }
});

test("Hết vi phạm do SỬA ĐƠN (B bỏ yêu cầu ≥ 16 chỗ; ADR-0128 Q2: xe riêng không còn phá lệ được nên dùng số chỗ): xuất bến ĐẠT và lô xuất bến xoá hai cột, nhật ký 'bỏ phá lệ cam kết'", async () => {
  const tat = batDongHo();
  try {
    const { w, id, a, b } = await the({}, { minVehicleSeats: 16 });
    assert.equal((await xep(w, id, a.legId)).status, 200);
    assert.equal((await xep(w, id, b.legId, ADM, { camKetPhaLe: PL })).status, 200);
    assert.notDeepEqual(camKetCua(w, id), TRONG);
    await suaChang(w, b.id, b.legId, { minVehicleSeats: null });
    const x = await xuatBen(w, id);
    assert.equal(x.status, 200, x.text);
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", id)[0].s, "RUNNING");
    assert.deepEqual(camKetCua(w, id), TRONG);
    const nk = nhatKyCuoi(w, "trip_departed");
    assert.match(nk, /bỏ phá lệ cam kết/);
    assert.ok(!nk.includes("xe:"), nk);
  } finally {
    tat();
  }
});

// ADR-0104 Đ2: sửa khách nay tự đồng bộ chuyến (máy) — nhánh "cập nhật khách" (nút tay) cần TRẠNG THÁI GIỮ nên dựng thế giới không tiêm máy (kế hoạch N9 — đổi
// cách dựng, không nới luật); nhánh "máy đồng bộ" kiểm khúc của máy xoá hai cột khi hết vi phạm (cùng câu đuôi nhật ký với nút tay).
test("Hết vi phạm do sửa đơn, rồi 'cập nhật khách theo đơn' / 'cập nhật điểm theo đơn' / máy đồng bộ theo đơn có việc → lô xoá hai cột (có nhật ký)", async () => {
  for (const loai of ["cap-nhat-khach", "cap-nhat-diem", "may-dong-bo"] as const) {
    const tat = batDongHo();
    try {
      const { w, id, a, b } = await the({}, { minVehicleSeats: 16 }, loai === "cap-nhat-khach" ? { khongDongBoChuyen: true } : {});
      assert.equal((await xep(w, id, a.legId)).status, 200);
      assert.equal((await xep(w, id, b.legId, ADM, { camKetPhaLe: PL })).status, 200);
      assert.notDeepEqual(camKetCua(w, id), TRONG);
      await suaChang(w, b.id, b.legId, { minVehicleSeats: null });
      if (loai === "cap-nhat-diem") await suaChang(w, b.id, b.legId, { pickupPlace: "Khách sạn Đổi Dò Tìm" });
      else await thayKhach(w, b.id);
      if (loai !== "may-dong-bo") {
        const r = await lenh(w, id, loai);
        assert.equal(r.status, 200, `${loai}: ${r.text}`);
      }
      assert.deepEqual(camKetCua(w, id), TRONG, loai);
      const nk = nhatKyCuoi(w, loai === "cap-nhat-khach" ? "trip_passengers_synced" : loai === "cap-nhat-diem" ? "trip_stops_synced" : "trip_order_synced");
      assert.match(nk, /hết vi phạm cam kết — bỏ phá lệ cam kết/, loai);
    } finally {
      tat();
    }
  }
});
