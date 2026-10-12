// KHUNG ĐỌC CHUYẾN LÂN CẬN của lệnh xuất bến phủ theo GIỜ KẾT THÚC THẬT (sổ thi công Gói A–C, "Kiểm cuối Giai đoạn 2", mục "Nợ mới"; mã lệch luật đã duyệt —
// ADR-0049 `:171` "nghỉ đủ từ giờ kết thúc thật", ADR-0050 VK1-A giờ xảy ra, ADR-0096 Đ2 LC-20 cửa sổ xuất bến tới 48 giờ). Trước đây lệnh xuất bến chỉ đọc
// chuyến chạm khung KẾ HOẠCH ±1 ngày quanh chuyến đang xét, nên khi cửa sổ xuất bến > 24 giờ, chuyến cùng tài xế vừa kết thúc thật (sớm hơn giờ khởi hành
// dự kiến − 1 ngày) không được đọc: luật nghỉ (CH-02) và luật "không khai xuất bến trước khi chuyến trước kết thúc" không được kiểm.
// Máy chủ thật (khung thử harness + D1 node:sqlite, đủ migration). Tên, SĐT, số giấy tờ là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { batDongHo, DRIVER, NGAY, NGAY_SAU, SALES, SUP, chiTiet, denGio, setup, taoChuyen, tienDo, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const ma = (r: any): string[] => (r.json?.error?.lyDo ?? []).map((l: any) => l.ma);
const trangThai = (w: any, trip: string): string => w.q("SELECT status s FROM vc_trip WHERE id = ?", trip)[0].s;

/** Toàn quyền đặt cửa sổ xuất bến 48 giờ (LC-20 cho tới 2880 phút); khoảng nghỉ 30 phút. */
async function cuaSo48(w: any): Promise<void> {
  const r = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
    as: SUP, body: { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240, departureWindowMinutes: 2880, refuseLeadMinutes: 720, officePhone: null },
  });
  assert.equal(r.status, 201, r.text);
}
/** Chuyến A (tài xế DRIVER, không khách) 06:30–07:00 ngày NGAY: xuất bến lúc 06:00 (trong cửa sổ), kết thúc thật lúc 06:50. Trả id chuyến B của CÙNG tài xế,
 * xe khác, khởi hành 10:00 NGÀY HÔM SAU (B − 1 ngày = 10:00 NGAY, muộn hơn giờ A kết thúc thật). */
async function haiChuyen(w: any, v: { gianDoan?: boolean; ngayB?: string; gioB?: string } = {}): Promise<{ a: string; maA: string; b: string }> {
  await cuaSo48(w);
  const a = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "06:30", kt: "07:00" });
  const gioB = v.gioB ?? "10:00";
  const b = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: v.ngayB ?? NGAY_SAU, bd: gioB, kt: `${String(Number(gioB.slice(0, 2)) + 1).padStart(2, "0")}${gioB.slice(2)}` });
  const xb = await tienDo(w, "tai-xe", a.chuyen.id, "xuat-ben");
  assert.equal(xb.status, 200, xb.text);
  denGio("06:50");
  const kt = v.gianDoan ? await tienDo(w, "tai-xe", a.chuyen.id, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }) : await tienDo(w, "tai-xe", a.chuyen.id, "ket-thuc");
  assert.equal(kt.status, 200, kt.text);
  assert.equal(trangThai(w, a.chuyen.id), v.gianDoan ? "ENDED_INTERRUPTED" : "ENDED");
  return { a: a.chuyen.id, maA: a.chuyen.ma, b: b.chuyen.id };
}
/** NGAY + 2 ngày (lịch VN) — chuyến B cách đủ xa để chỉ khung lùi theo GIỜ KẾT THÚC THẬT (cửa sổ + trần nghỉ) đọc được chuyến A. */
const NGAY_KIA = (() => {
  const d = new Date(`${NGAY}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
})();

test("Khung đọc theo giờ kết thúc thật: cửa sổ xuất bến 48 giờ — chuyến B (khởi hành 10:00 hôm sau) xuất bến lúc 07:00, 10 phút sau khi chuyến A cùng tài xế kết thúc thật → 409 NGHI_THIEU, không ghi; 07:20 (đủ 30 phút) → 200", async () => {
  const tat = batDongHo(Date.parse(`${NGAY}T06:00:00+07:00`));
  try {
    const w = setup();
    const { maA, b } = await haiChuyen(w);
    denGio("07:00");
    for (const [ben, as] of [["tai-xe", DRIVER], ["van-phong", SALES]] as const) {
      const r = await tienDo(w, ben, b, "xuat-ben", {}, as);
      assert.equal(r.status, 409, `${ben}: ${r.text}`);
      assert.equal(r.json.error.code, "chua_du_dieu_kien_xuat_ben");
      assert.deepEqual(ma(r), ["NGHI_THIEU"], r.text);
      assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(maA));
    }
    assert.equal(trangThai(w, b), "PLANNED", "không ghi");
    denGio("07:20");
    const ok = await tienDo(w, "tai-xe", b, "xuat-ben");
    assert.equal(ok.status, 200, ok.text);
    assert.equal(trangThai(w, b), "RUNNING");
  } finally {
    tat();
  }
});

// ---- Phiếu kiểm D1 CAO-4 + phiếu hẹp CAO-A: ba bài chặn bốn đột biến C0 còn sống sót ở lượt kiểm độc lập (C0a, C0b, C0f / C0g) -------------------------
test("CAO-4 (C0a): chuyến A cùng tài xế KẾT THÚC GIỮA CHỪNG (ENDED_INTERRUPTED) thật lúc 06:50 — B (khởi hành 10:00 hôm sau, cửa sổ 48 giờ) xuất bến 07:00 → 409 NGHI_THIEU, không ghi", async () => {
  const tat = batDongHo(Date.parse(`${NGAY}T06:00:00+07:00`));
  try {
    const w = setup();
    const { maA, b } = await haiChuyen(w, { gianDoan: true });
    denGio("07:00");
    const r = await tienDo(w, "tai-xe", b, "xuat-ben");
    assert.equal(r.status, 409, r.text);
    assert.deepEqual(ma(r), ["NGHI_THIEU"], r.text);
    assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(maA));
    assert.equal(trangThai(w, b), "PLANNED", "không ghi");
  } finally {
    tat();
  }
});

test("CAO-4 (C0b): A kết thúc thật 06:50 — NGOÀI cửa sổ 48 giờ của B (B khởi hành 07:01 ngày kia) nhưng trong phần lùi THÊM của trần khoảng nghỉ; B xuất bến 07:01 (11 phút sau A) → 409 NGHI_THIEU", async () => {
  const tat = batDongHo(Date.parse(`${NGAY}T06:00:00+07:00`));
  try {
    const w = setup();
    const { maA, b } = await haiChuyen(w, { ngayB: NGAY_KIA, gioB: "07:01" });
    denGio("07:01"); // đúng giờ sớm nhất cửa sổ cho phép (07:01 ngày kia − 2880 phút); A kết thúc 06:50 = trước đầu cửa sổ 11 phút
    const r = await tienDo(w, "tai-xe", b, "xuat-ben");
    assert.equal(r.status, 409, r.text);
    assert.deepEqual(ma(r), ["NGHI_THIEU"], r.text);
    assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(maA));
    assert.equal(trangThai(w, b), "PLANNED", "không ghi");
  } finally {
    tat();
  }
});

// C0f / C0g (đối số khung ở chi tiết cuốc và "Cuốc của tôi"; phiếu kiểm hẹp D1 CAO-A — người thi công từng ghi nhầm là "đột biến tương đương"): khung KẾ
// HOẠCH (`trips_touching`) còn loại chuyến lên kế hoạch SAU B hơn 24 giờ (vế giờ khởi hành dự kiến < cuối khung). Chuyến C như vậy mà chạy SỚM trong cửa sổ
// > 24 giờ và vừa kết thúc thật thì chỉ khung theo giờ kết thúc thật mới đọc được — thiếu nó, màn tài xế báo "đủ điều kiện" còn máy chủ trả 409 NGHI_THIEU.
test("CAO-A (C0f / C0g): chuyến C cùng tài xế, kế hoạch SAU B hơn 24 giờ (12:00 hôm sau), chạy SỚM trong cửa sổ 48 giờ, kết thúc thật 09:50 — lúc 09:55 B (10:00) hiện NGHI_THIEU ở chi tiết cuốc và \"Cuốc của tôi\"; xuất bến B 10:00 → 409 NGHI_THIEU", async () => {
  const tat = batDongHo(Date.parse(`${NGAY}T06:00:00+07:00`));
  try {
    const w = setup();
    await cuaSo48(w);
    const b = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "11:00" });
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "12:00", kt: "13:00" });
    denGio("08:00");
    const xb = await tienDo(w, "tai-xe", c.chuyen.id, "xuat-ben");
    assert.equal(xb.status, 200, xb.text);
    denGio("09:50");
    const kt = await tienDo(w, "tai-xe", c.chuyen.id, "ket-thuc");
    assert.equal(kt.status, 200, kt.text);
    denGio("09:55");
    const ct = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${b.chuyen.id}`, { as: DRIVER });
    assert.equal(ct.status, 200, ct.text);
    assert.deepEqual((ct.json.dieuKienConThieu ?? []).map((x: any) => x.ma), ["NGHI_THIEU"], `chi tiết cuốc (C0f): ${JSON.stringify(ct.json.dieuKienConThieu)}`);
    const ds = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi?tu=${NGAY}&den=${NGAY}`, { as: DRIVER });
    assert.equal(ds.status, 200, ds.text);
    const muc = ds.json.chuyen.find((x: any) => x.id === b.chuyen.id);
    assert.ok(muc, "B có trong Cuốc của tôi");
    assert.deepEqual((muc.dieuKienConThieu ?? []).map((x: any) => x.ma), ["NGHI_THIEU"], `Cuốc của tôi (C0g): ${JSON.stringify(muc.dieuKienConThieu)}`);
    denGio("10:00");
    const r = await tienDo(w, "tai-xe", b.chuyen.id, "xuat-ben");
    assert.equal(r.status, 409, r.text);
    assert.deepEqual(ma(r), ["NGHI_THIEU"], r.text);
    assert.match(r.json.error.lyDo[0].loiNhan, new RegExp(c.chuyen.ma));
    assert.equal(trangThai(w, b.chuyen.id), "PLANNED", "không ghi");
  } finally {
    tat();
  }
});

test("Khung đọc theo giờ kết thúc thật: văn phòng KHAI xuất bến B lúc 06:40 — trước giờ chuyến A cùng tài xế kết thúc thật (06:50) → 409 gio_xay_ra_ngoai_khoang CHONG_CHUYEN_TRUOC (mốc chặn = mã chuyến A), không ghi; chi tiết chuyến B báo giờ khai sớm nhất 06:50 (một luật cho màn và máy chủ)", async () => {
  const tat = batDongHo(Date.parse(`${NGAY}T06:00:00+07:00`));
  try {
    const w = setup();
    const { maA, b } = await haiChuyen(w);
    denGio("07:30");
    assert.deepEqual((await chiTiet(w, b)).gioSomNhatKhai.xuatBen, { ngay: NGAY, gio: "06:50" });
    const r = await tienDo(w, "van-phong", b, "xuat-ben", { xayRaLuc: `${NGAY}T06:40:00+07:00` });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "gio_xay_ra_ngoai_khoang");
    assert.ok(r.json.error.maGio.includes("CHONG_CHUYEN_TRUOC"), r.text);
    assert.equal(r.json.error.mocChan?.maChuyen, maA, r.text);
    assert.equal(trangThai(w, b), "PLANNED", "không ghi");
  } finally {
    tat();
  }
});
