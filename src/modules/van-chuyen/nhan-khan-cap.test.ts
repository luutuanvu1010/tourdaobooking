// NHÃN "ĐIỀU CHỈNH KHẨN CẤP" VÀ ĐUÔI NHẬT KÝ (ADR-0104 Đ1 mục 4, 5; kế hoạch `docs/superpowers/plans/2026-10-08-adr-0104-ke-hoach.md` T1.6, NT-4). Máy chủ thật
// (khung thử harness + D1 node:sqlite; chính sách gieo: mốc 360 phút, nghỉ 30 phút), đồng hồ giả 2027-03-11 06:00 giờ VN.
//   - `khanCap` (lịch chung + chi tiết chuyến văn phòng) = chuyến có sự kiện mang `override_rule_code = 'MOC_TOI_THIEU'` (mọi loại, kể cả UPDATED / CANCELLED);
//     KHÔNG vào DTO tài xế.
//   - Đuôi `detail` nhật ký theo LỚP lúc ghi: KHAN_CAP " · điều chỉnh khẩn cấp <luật>: <lý do>" + MỘT lần " · còn N phút" (xe đang chạy: " · xe đang chạy");
//     QUAN_TRI " · phá lệ <luật>: <lý do>".
//   - Bốn ca LỆCH ĐÃ BIẾT (ADR-0104 Đ1.5 — sự kiện chỉ lưu một mã luật, không lưu lớp): Bán hàng làm dưới mốc → 200 nhưng nhãn chuyến vẫn "Phá lệ" (`khanCap`
//     false, dòng nhật ký chuyến có `phaLe` khác null). Đổi có chủ ý = đổi bài này cùng một ADR mới (lưu lớp vào sự kiện).
//   - Lệnh sửa chuyến kèm `nghiPhaLe` (phiếu kiểm D1 CAO-1, theo chữ ADR-0104 Đ1.4 :78, Đ1.5 :85-90, bài kiểm 4 :281): sự kiện UPDATED mang `KHOANG_NGHI` khi
//     luật nghỉ THẬT SỰ bị vượt (kiểm nghỉ không tính cờ); gửi cờ mà không vi phạm → sự kiện không mang luật (cột vẫn lưu — đường vòng THẤP-1, không đổi).
// Tên, SĐT là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, DRIVER2, LOC, NGAY, NGAY_SAU, SALES, batDongHo, chiTiet, don, setup, taoChuyen, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";

const PL = { lyDo: "PHA_LE_SU_CO" }; // nhãn "Sự cố vận hành"
const goi = (w: any, as: string, m: string, duoi: string, body: Record<string, unknown>) => w.call(m, `/api/van-chuyen/chuyen${duoi}`, { as, body: { requestId: uuid(), ...body } });
const phienBan = async (w: any, id: string) => (await chiTiet(w, id, ADM)).chuyen.version;
const xep = async (w: any, as: string, tripId: string, chang: unknown[], extra: Record<string, unknown> = {}) =>
  goi(w, as, "POST", `/${tripId}/phan-bo`, { version: await phienBan(w, tripId), chang, ...extra });
const nhatKy = (w: any, action: string, tripId: string): string =>
  w.q("SELECT detail FROM audit_log WHERE action = ? AND target_id = ? ORDER BY rowid DESC", action, tripId)[0].detail;
const luatSuKien = (w: any, kind: string, tripId: string): (string | null)[] =>
  w.q("SELECT override_rule_code r FROM vc_trip_event WHERE kind = ? AND trip_id = ? ORDER BY rowid", kind, tripId).map((x: any) => x.r);
/** `khanCap` của chuyến ở LỊCH CHUNG ngày `ngay` và ở CHI TIẾT chuyến (văn phòng) — hai nơi phải khớp nhau. */
async function nhan(w: any, tripId: string, ngay = NGAY): Promise<boolean> {
  const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${ngay}`, { as: SALES })).json;
  const o = lich.chuyen.find((c: any) => c.id === tripId);
  assert.ok(o, "chuyến có trên lịch");
  const ct = (await chiTiet(w, tripId, SALES)).chuyen.khanCap;
  assert.equal(o.khanCap, ct, "lịch và chi tiết cùng một nhãn");
  assert.equal(typeof ct, "boolean");
  return ct;
}
/** `phaLe` của các dòng nhật ký chuyến (chi tiết văn phòng) loại `loai`, theo thứ tự sự kiện — dòng KHÔNG mang luật bị bỏ khi có dòng mang luật (xếp lần 2). */
async function phaLeDong(w: any, tripId: string, loai: string): Promise<unknown[]> {
  const ds = (await chiTiet(w, tripId, SALES)).nhatKy.filter((n: any) => n.loai === loai).map((n: any) => n.phaLe);
  return ds.some((p: unknown) => p !== null) ? ds.filter((p: unknown) => p !== null) : ds;
}
// Chặng ĐẶT GẤP (đường thật — Quản trị; miễn luật mốc lúc xếp, KHÔNG đưa chuyến ra ngoài mốc): `don(w, { …, datGap: true })` của khung thử, hay `donXeRieng(w, cx, true)`.
// ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc → chặng đặt gấp đón 11:30 (còn 330 phút lúc 06:00), đặt gấp khi đơn còn nháp rồi mới xác nhận.
/** Đơn ĐÃ XÁC NHẬN có cam kết xe riêng (chặng chiều đi, đón 13:00 ngày NGAY — 11:30 khi `datGap`, trả ở bến). */
// ADR-0128 Q2: `cx` = đơn đòi xe tối thiểu `cx` chỗ (R-CX, phá lệ được) thay cho xe riêng (R-XR, chặn cứng); xe thử 15 chỗ nên cx = 16 vi phạm ngay từ một đơn.
async function donXeRieng(w: any, cx?: number, datGap = false) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Riêng", customerPhone: "0912345678",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: datGap ? "11:30" : "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Riêng", dropoffLocationId: LOC, dropoffPlace: "", ...(cx ? { minVehicleSeats: cx } : { exclusiveVehicle: true }) }],
      }],
      passengers: [{ fullName: "Khách Riêng Một", birthYear: 1980, paxCode: "adult" }, { fullName: "Khách Riêng Hai", birthYear: 1981, paxCode: "adult" }],
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  if (datGap) assert.equal((await w.call("POST", `/api/orders/${o.id}/legs/${o.services[0].legs[0].id}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
  assert.equal((await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
  return { id: o.id, legId: o.services[0].legs[0].id };
}

test("NT-4 (ADR-0104 Đ1 mục 5): đổi xe dưới mốc — Bán hàng hay Quản trị → khanCap true ở lịch và chi tiết; chuyến chưa vượt → false; nhật ký 'điều chỉnh khẩn cấp hạn chốt: … · còn 300 phút'", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // 06:00 → 11:00: còn 300 phút
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "15:00" });
    assert.equal(await nhan(w, t1.chuyen.id), false, "chưa vượt gì");
    // Bán hàng đổi xe dưới mốc.
    const r1 = await goi(w, SALES, "PUT", `/${t1.chuyen.id}`, { version: await phienBan(w, t1.chuyen.id), xeId: xe(w), phaLe: PL });
    assert.equal(r1.status, 200, r1.text);
    assert.equal(r1.json.chuyen.khanCap, true, "phản hồi lệnh = chi tiết chuyến");
    assert.equal(await nhan(w, t1.chuyen.id), true);
    assert.match(nhatKy(w, "trip_edited", t1.chuyen.id), / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành · còn 300 phút/);
    assert.doesNotMatch(nhatKy(w, "trip_edited", t1.chuyen.id), /phá lệ/);
    // Quản trị đổi xe dưới mốc — cùng lớp (lớp theo LUẬT, không theo người).
    assert.equal(await nhan(w, t2.chuyen.id), false);
    const r2 = await goi(w, ADM, "PUT", `/${t2.chuyen.id}`, { version: await phienBan(w, t2.chuyen.id), xeId: xe(w), phaLe: PL });
    assert.equal(r2.status, 200, r2.text);
    assert.equal(await nhan(w, t2.chuyen.id), true);
    assert.match(nhatKy(w, "trip_edited", t2.chuyen.id), / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành · còn 300 phút/);
  } finally {
    tat();
  }
});

test("NT-4 (ADR-0104 Đ1 mục 4, 5): Bán hàng xếp chặng thường dưới mốc, rồi dời (DOI_DI) sang chuyến NGOÀI mốc — cả hai chuyến khanCap true (sự kiện dời 'của cả hai chuyến', GA-35); 'còn N phút' tới giờ xuất bến sớm nhất của hai chuyến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await don(w, { gio: "13:00", soNguoi: 2 });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // còn 300 phút — dưới mốc
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "12:30", kt: "15:30" }); // còn 390 phút — NGOÀI mốc
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: a.legId, soSuat: 2 }], { phaLe: PL });
    assert.equal(x.status, 200, x.text);
    assert.equal(await nhan(w, nguon.chuyen.id), true);
    assert.match(nhatKy(w, "trip_allocated", nguon.chuyen.id), / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành · còn 300 phút$/);
    assert.equal(await nhan(w, dich.chuyen.id), false);
    const d = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, {
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id), phaLe: PL,
    });
    assert.equal(d.status, 200, d.text);
    assert.deepEqual(luatSuKien(w, "ALLOCATION_MOVED", dich.chuyen.id), ["MOC_TOI_THIEU"]);
    assert.equal(await nhan(w, dich.chuyen.id), true);
    assert.match(nhatKy(w, "trip_allocation_moved", dich.chuyen.id), / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành · còn 300 phút/);
  } finally {
    tat();
  }
});

test("Phiếu D1 THẤP-6 (ADR-0104 Đ1 mục 5, GA-35): chuyến NGUỒN chưa có sự kiện mốc (chặng đặt gấp xếp không cờ), rồi Bán hàng dời khẩn cấp sang chuyến khác → nhãn ở CẢ nguồn (chỉ qua related_trip_id của sự kiện ghi ở đích) lẫn đích", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const gap = await don(w, { gio: "11:30", soNguoi: 2, datGap: true });
    const nguon = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" }); // dưới mốc
    const dich = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "11:10", kt: "15:00" });
    const x = await xep(w, SALES, nguon.chuyen.id, [{ legId: gap.legId, soSuat: 2 }]);
    assert.equal(x.status, 200, `đặt gấp — xếp không cần cờ: ${x.text}`);
    assert.equal(await nhan(w, nguon.chuyen.id), false, "trước dời: nguồn chưa có sự kiện mốc");
    const d = await goi(w, SALES, "POST", `/${nguon.chuyen.id}/doi`, {
      version: await phienBan(w, nguon.chuyen.id), suatIds: x.json.suat.map((s: any) => s.id), denChuyenId: dich.chuyen.id, denVersion: await phienBan(w, dich.chuyen.id), phaLe: PL,
    });
    assert.equal(d.status, 200, d.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND override_rule_code = 'MOC_TOI_THIEU'", nguon.chuyen.id)[0].n, 0, "nguồn không có sự kiện mốc của chính nó");
    assert.equal(await nhan(w, nguon.chuyen.id), true, "nguồn: nhãn qua related_trip_id");
    assert.equal(await nhan(w, dich.chuyen.id), true);
  } finally {
    tat();
  }
});

test("NT-4 (ADR-0104 Đ1 mục 4, 5): Quản trị vượt khoảng nghỉ NGOÀI mốc → khanCap false; nhật ký giữ ' · phá lệ khoảng nghỉ: …' (không 'còn N phút'); nhật ký chuyến văn phòng có mã luật", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const r = await goi(w, ADM, "POST", "", { xeId: x1, taiXePartyId: `pty-${DRIVER2}`, batDau: { ngay: NGAY_SAU, gio: "10:10" }, ketThuc: { ngay: NGAY_SAU, gio: "11:00" }, nghiPhaLe: PL });
    assert.equal(r.status, 201, r.text);
    const id = r.json.chuyen.id;
    assert.deepEqual(luatSuKien(w, "CREATED", id), ["KHOANG_NGHI"]);
    assert.equal(await nhan(w, id, NGAY_SAU), false);
    const nk = nhatKy(w, "trip_created", id);
    assert.match(nk, / · phá lệ khoảng nghỉ: Sự cố vận hành/);
    assert.doesNotMatch(nk, /điều chỉnh khẩn cấp|còn \d+ phút/);
    const dong = (await chiTiet(w, id, SALES)).nhatKy.find((n: any) => n.loai === "CREATED");
    assert.deepEqual(dong.phaLe, { luat: "KHOANG_NGHI", lyDoNhan: "Sự cố vận hành" });
  } finally {
    tat();
  }
});

test("NT-4 lệch đã biết ADR-0104 Đ1.5 (bốn ca): Bán hàng làm dưới mốc → 200, nhật ký 'điều chỉnh khẩn cấp …' nhưng nhãn chuyến vẫn 'Phá lệ' (khanCap false — sự kiện chỉ lưu một mã luật, không lưu lớp)", async () => {
  const tat = batDongHo();
  try {
    // Ca 1: tạo chuyến mới DƯỚI mốc kèm vượt khoảng nghỉ.
    {
      const w = setup();
      const x1 = xe(w);
      await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "10:00" });
      const r = await goi(w, SALES, "POST", "", { xeId: x1, taiXePartyId: `pty-${DRIVER2}`, batDau: { ngay: NGAY, gio: "10:10" }, ketThuc: { ngay: NGAY, gio: "11:00" }, nghiPhaLe: PL });
      assert.equal(r.status, 201, `ca 1: ${r.text}`);
      assert.deepEqual(luatSuKien(w, "CREATED", r.json.chuyen.id), ["KHOANG_NGHI"], "ca 1");
      assert.equal(await nhan(w, r.json.chuyen.id), false, "ca 1: lệch đã biết — nhãn 'Phá lệ'");
      assert.match(nhatKy(w, "trip_created", r.json.chuyen.id), / · điều chỉnh khẩn cấp khoảng nghỉ: Sự cố vận hành · còn 250 phút/, "ca 1: nhật ký đúng lớp");
      assert.deepEqual(await phaLeDong(w, r.json.chuyen.id, "CREATED"), [{ luat: "KHOANG_NGHI", lyDoNhan: "Sự cố vận hành" }], "ca 1: dòng nhật ký có nhãn Phá lệ");
    }
    // Ca 2: xếp chặng ĐÃ ĐẶT GẤP kèm vượt cam kết (chuyến vẫn dưới mốc). ADR-0128 Q2: xe riêng không phá lệ được → chặng thứ hai đòi ≥ 16 chỗ (xe 15); cuối ca: xe riêng thì chặn cứng.
    {
      const w = setup();
      const rieng = await don(w, { gio: "11:30", soNguoi: 2, datGap: true });
      const gap = await donXeRieng(w, 16, true);
      const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
      assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: rieng.legId, soSuat: 2 }])).status, 200, "ca 2: đặt gấp — xếp không cần cờ");
      const r = await xep(w, SALES, t.chuyen.id, [{ legId: gap.legId, soSuat: 2 }], { camKetPhaLe: PL });
      assert.equal(r.status, 200, `ca 2: ${r.text}`);
      assert.deepEqual(luatSuKien(w, "ALLOCATED", t.chuyen.id), [null, "CAM_KET"], "ca 2");
      assert.equal(await nhan(w, t.chuyen.id), false, "ca 2: lệch đã biết — nhãn 'Phá lệ'");
      assert.match(nhatKy(w, "trip_allocated", t.chuyen.id), / · điều chỉnh khẩn cấp cam kết: Sự cố vận hành · còn 300 phút$/, "ca 2: nhật ký đúng lớp");
      assert.deepEqual(await phaLeDong(w, t.chuyen.id, "ALLOCATED"), [{ luat: "CAM_KET", lyDoNhan: "Sự cố vận hành" }], "ca 2: dòng xếp thứ hai có nhãn Phá lệ");
      const rr = await donXeRieng(w, undefined, true);
      const chan = await xep(w, SALES, t.chuyen.id, [{ legId: rr.legId, soSuat: 2 }], { camKetPhaLe: PL });
      assert.equal(chan.status, 409, `ca 2 (xe riêng): ${chan.text}`);
      assert.equal(chan.json.error.code, "chang_khong_hop_le", "ca 2 (xe riêng): chặn cứng, không còn lớp khẩn cấp");
      assert.deepEqual(luatSuKien(w, "ALLOCATED", t.chuyen.id), [null, "CAM_KET"], "ca 2 (xe riêng): không ghi sự kiện mới");
    }
    // Ca 3: sửa chuyến CHỈ đổi giờ (vào sát chuyến trước) kèm vượt khoảng nghỉ.
    {
      const w = setup();
      const x1 = xe(w);
      await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "10:00" });
      const t = await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "12:00" });
      const r = await goi(w, SALES, "PUT", `/${t.chuyen.id}`, { version: t.chuyen.version, batDau: { ngay: NGAY, gio: "10:10" }, ketThuc: { ngay: NGAY, gio: "12:00" }, nghiPhaLe: PL });
      assert.equal(r.status, 200, `ca 3: ${r.text}`);
      // Phiếu kiểm D1 CAO-1 (chữ ADR Đ1.4 :78, Đ1.5 :85-90, bài kiểm 4 :281): sự kiện UPDATED mang KHOANG_NGHI (luật nghỉ thật sự bị vượt) — trước đây null
      // vì cờ nghỉ đi vào luật thuần nên luật không báo thiếu.
      assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), ["KHOANG_NGHI"], "ca 3: sự kiện mang luật nghỉ");
      assert.equal(w.q("SELECT rest_override_reason_code r FROM vc_trip WHERE id = ?", t.chuyen.id)[0].r, "PHA_LE_SU_CO", "ca 3: cột nghỉ có lý do");
      assert.equal(await nhan(w, t.chuyen.id), false, "ca 3: lệch đã biết — nhãn 'Phá lệ'");
      assert.deepEqual(await phaLeDong(w, t.chuyen.id, "UPDATED"), [{ luat: "KHOANG_NGHI", lyDoNhan: "Sự cố vận hành" }], "ca 3: dòng nhật ký có nhãn Phá lệ");
      const nk3 = nhatKy(w, "trip_edited", t.chuyen.id);
      assert.match(nk3, / · điều chỉnh khẩn cấp khoảng nghỉ: Sự cố vận hành · còn 250 phút/, "ca 3: nhật ký đúng lớp (giờ xét = min(cũ, mới, sớm nhất) = 10:10)");
      assert.equal(nk3.split("khoảng nghỉ:").length, 2, `ca 3: luật nghỉ ghi MỘT lần — ${nk3}`);
    }
    // Ca 4: sửa chuyến CHỈ gửi camKetPhaLe (vi phạm sinh do SỬA ĐƠN — chặng đòi xe ≥ 30 chỗ, xe 15 chỗ).
    {
      const w = setup();
      const gap = await don(w, { gio: "11:30", soNguoi: 2, datGap: true });
      const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
      assert.equal((await xep(w, SALES, t.chuyen.id, [{ legId: gap.legId, soSuat: 2 }])).status, 200);
      w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 30 WHERE id = ?").run(gap.legId);
      const r = await goi(w, SALES, "PUT", `/${t.chuyen.id}`, { version: await phienBan(w, t.chuyen.id), camKetPhaLe: PL });
      assert.equal(r.status, 200, `ca 4: ${r.text}`);
      assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), ["CAM_KET"], "ca 4");
      assert.equal(await nhan(w, t.chuyen.id), false, "ca 4: lệch đã biết — nhãn 'Phá lệ'");
      assert.deepEqual(await phaLeDong(w, t.chuyen.id, "UPDATED"), [{ luat: "CAM_KET", lyDoNhan: "Sự cố vận hành" }], "ca 4: dòng nhật ký có nhãn Phá lệ");
      const nk = nhatKy(w, "trip_edited", t.chuyen.id);
      // Phiếu D1 THẤP-11: lệnh chỉ gửi cờ (không đổi gì khác) — đuôi vượt luật đứng ngay sau mã chuyến, tên luật KHÔNG lặp ở đầu.
      assert.match(nk, /^CX-\d{4}-\d{2}: điều chỉnh khẩn cấp cam kết: Sự cố vận hành · còn 300 phút/, `ca 4: nhật ký đúng lớp — ${nk}`);
      assert.equal(nk.split("điều chỉnh khẩn cấp cam kết").length, 2, `ca 4: tên luật ghi MỘT lần — ${nk}`);
    }
  } finally {
    tat();
  }
});

test("Phiếu D1 CAO-1 (ADR-0104 Đ1.4 :78, bài kiểm 4 :280-281): Quản trị sửa chuyến NGOÀI mốc chỉ đổi giờ kèm nghiPhaLe (vượt khoảng nghỉ thật) → sự kiện UPDATED mang KHOANG_NGHI, khanCap false, nhật ký ' · phá lệ khoảng nghỉ' một lần", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const t = await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "11:00", kt: "12:00" });
    const r = await goi(w, ADM, "PUT", `/${t.chuyen.id}`, { version: t.chuyen.version, batDau: { ngay: NGAY_SAU, gio: "10:10" }, ketThuc: { ngay: NGAY_SAU, gio: "12:00" }, nghiPhaLe: PL });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), ["KHOANG_NGHI"]);
    assert.equal(await nhan(w, t.chuyen.id, NGAY_SAU), false);
    assert.deepEqual(await phaLeDong(w, t.chuyen.id, "UPDATED"), [{ luat: "KHOANG_NGHI", lyDoNhan: "Sự cố vận hành" }]);
    const nk = nhatKy(w, "trip_edited", t.chuyen.id);
    assert.match(nk, / · phá lệ khoảng nghỉ: Sự cố vận hành/);
    assert.equal(nk.split("khoảng nghỉ:").length, 2, `luật nghỉ ghi MỘT lần — ${nk}`);
    assert.doesNotMatch(nk, /điều chỉnh khẩn cấp|còn \d+ phút/);
  } finally {
    tat();
  }
});

test("Phiếu D1 CAO-1: sửa chuyến gửi nghiPhaLe mà KHÔNG vi phạm khoảng nghỉ → sự kiện UPDATED không mang KHOANG_NGHI (dòng nhật ký không nhãn); cột vẫn lưu lý do (đường vòng THẤP-1 — hiện trạng, không đổi)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const t = await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "11:00", kt: "12:00" });
    const r = await goi(w, ADM, "PUT", `/${t.chuyen.id}`, { version: t.chuyen.version, batDau: { ngay: NGAY_SAU, gio: "11:30" }, ketThuc: { ngay: NGAY_SAU, gio: "12:30" }, nghiPhaLe: PL });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), [null]);
    assert.deepEqual(await phaLeDong(w, t.chuyen.id, "UPDATED"), [null]);
    assert.equal(w.q("SELECT rest_override_reason_code r FROM vc_trip WHERE id = ?", t.chuyen.id)[0].r, "PHA_LE_SU_CO", "THẤP-1: cột vẫn lưu (hiện trạng)");
  } finally {
    tat();
  }
});

// ---- Phiếu kiểm hẹp D1 CAO-B: thứ tự luật trên MỘT lệnh sửa chuyến (ADR-0104 :85 — MOC_TOI_THIEU > KHOANG_NGHI > CAM_KET; sự kiện chỉ lưu MỘT mã) ------------
test("Phiếu hẹp D1 CAO-B (thứ tự mốc > nghỉ): Bán hàng sửa chuyến DƯỚI mốc vừa đổi xe vừa dời giờ sát chuyến trước của xe mới (vượt khoảng nghỉ thật), gửi phaLe + nghiPhaLe → sự kiện UPDATED mang MOC_TOI_THIEU, khanCap true", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x1 = xe(w);
    const x2 = xe(w);
    await taoChuyen(w, { xe: x1, taiXe: `pty-${DRIVER}`, bd: "08:00", kt: "10:00" });
    const t = await taoChuyen(w, { xe: x2, taiXe: `pty-${DRIVER2}`, bd: "11:00", kt: "12:00" });
    const r = await goi(w, SALES, "PUT", `/${t.chuyen.id}`, {
      version: t.chuyen.version, xeId: x1, batDau: { ngay: NGAY, gio: "10:10" }, ketThuc: { ngay: NGAY, gio: "12:00" }, phaLe: PL, nghiPhaLe: PL,
    });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), ["MOC_TOI_THIEU"]);
    assert.equal(await nhan(w, t.chuyen.id), true, "nhãn Điều chỉnh khẩn cấp");
    const nk = nhatKy(w, "trip_edited", t.chuyen.id);
    assert.match(nk, / · điều chỉnh khẩn cấp hạn chốt: Sự cố vận hành/, nk);
    assert.match(nk, / · điều chỉnh khẩn cấp khoảng nghỉ: Sự cố vận hành/, `luật nghỉ vẫn có trong nhật ký — ${nk}`);
  } finally {
    tat();
  }
});

test("Phiếu hẹp D1 CAO-B (thứ tự nghỉ > cam kết): Quản trị sửa chuyến NGOÀI mốc đổi xe 16 → 15 chỗ (chặng đòi 16 chỗ) và dời giờ sát chuyến trước của xe mới, gửi nghiPhaLe + camKetPhaLe → sự kiện UPDATED mang KHOANG_NGHI", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x15 = xe(w, 15);
    const x16 = xe(w, 16);
    const a = await don(w, { ngay: NGAY_SAU, gio: "13:00", soNguoi: 2 });
    w.sqlite.prepare("UPDATE ord_transfer_leg SET min_vehicle_seats = 16 WHERE id = ?").run(a.legId);
    await taoChuyen(w, { xe: x15, taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:00", kt: "10:00" });
    const t = await taoChuyen(w, { xe: x16, taiXe: `pty-${DRIVER2}`, ngay: NGAY_SAU, bd: "11:00", kt: "15:00" });
    await xepHet(w, t, a, 2, ADM);
    const r = await goi(w, ADM, "PUT", `/${t.chuyen.id}`, {
      version: await phienBan(w, t.chuyen.id), xeId: x15, batDau: { ngay: NGAY_SAU, gio: "10:10" }, ketThuc: { ngay: NGAY_SAU, gio: "15:00" }, nghiPhaLe: PL, camKetPhaLe: PL,
    });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(luatSuKien(w, "UPDATED", t.chuyen.id), ["KHOANG_NGHI"]);
    const nk = nhatKy(w, "trip_edited", t.chuyen.id);
    assert.match(nk, / · phá lệ khoảng nghỉ: Sự cố vận hành/, nk);
    assert.match(nk, / · phá lệ cam kết: Sự cố vận hành/, `luật cam kết vẫn có trong nhật ký — ${nk}`);
  } finally {
    tat();
  }
});

test("NT-4 (ADR-0104 Đ1 mục 5): DTO tài xế (danh sách + chi tiết cuốc) KHÔNG có khoá khanCap, kể cả chuyến đã điều chỉnh khẩn cấp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "11:00", kt: "15:00" });
    const r = await goi(w, SALES, "PUT", `/${t.chuyen.id}`, { version: t.chuyen.version, xeId: xe(w), phaLe: PL });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.chuyen.khanCap, true);
    const ds = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi?tu=${NGAY}&den=${NGAY}`, { as: DRIVER });
    assert.equal(ds.status, 200, ds.text);
    assert.ok(ds.text.includes(t.chuyen.id), "chuyến có trong danh sách cuốc");
    assert.doesNotMatch(ds.text, /khanCap/);
    const ct = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t.chuyen.id}`, { as: DRIVER });
    assert.equal(ct.status, 200, ct.text);
    assert.doesNotMatch(ct.text, /khanCap/);
  } finally {
    tat();
  }
});
