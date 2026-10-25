// ADR-0107 (accepted 2026-10-08, Q-3 a; phán quyết G11, G15, G16 của sổ thi công gói A+C): (i) Bán hàng tự đóng dấu "Đặt gấp" (ô `order.leg.short_notice`
// SALES `any`; bốn lệnh sửa / thêm / thay chặng và `PUT …/trip` vẫn hỏi `order.trip.edit` trước); (ii) MỌI người kể cả Quản trị: lệnh kèm lý do đặt gấp chỉ hợp lệ
// khi chặng thật sự dưới mốc (409 `short_notice_not_needed`), dấu chỉ ghi lên chặng có giờ SAU lệnh dưới mốc, `PUT …/trip` xét từng chặng; lệnh được phép nhờ lý do
// mà chặng không mang dấu vẫn ghi lý do vào nhật ký. Kế hoạch + tiêu chí: docs/superpowers/plans/2026-10-25-adr-0107-dat-gap-ban-hang.md (T1–T7, T12).
// Chạy CẢ ứng dụng trên SQLite thật, mốc 6 giờ THẬT (chính sách gieo 360 phút — không mốc giả), đồng hồ giả CỐ ĐỊNH của khung điều phối (06:00 giờ VN ngày NGAY):
// chặng đón trước 12:00 ngày NGAY là dưới mốc.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, FIELD, INTERN, LOC, NGAY, NGAY_SAU, PARTNER, SALES, SUP, batDongHo, denGio, setup } from "../../../tests/audit/dieu-phoi-khung.mjs";
import { seedStaff } from "../../../tests/audit/harness.mjs";

const SALES2 = "11111111-1111-4111-8111-111111111112";
const DAT_GAP = { lyDo: "KHACH_DOAN_GOI_GAP", ghiChu: null };
/** Đuôi nhật ký của lý do trên (khuôn `ghiDatGapNhatKy` — ADR-0062, không đổi). */
const DUOI = " · đặt gấp: Khách đoàn gọi gấp";
const KHONG_DAU = { lyDo: null, nguoi: null };
/** Ngày VN cách NGAY `n` ngày. */
const ngaySau = (n: number) => new Date(Date.parse(`${NGAY}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10);

const chang = (ngay: string, gio: string, over: Record<string, unknown> = {}) =>
  ({ direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "", ...over });
const chieuVe = (ngay: string, gio: string) => chang(ngay, gio, { direction: "RETURN", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" });
const dichVu = (legs: unknown[], departDate: string, extra: Record<string, unknown> = {}) => ({
  kind: "catalog", catalogCode: "ZA1", pickupChoice: legs.length ? "DON" : "KHONG_DON", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate, legs, ...extra,
});
const than = (legs: unknown[], departDate: string, extra: Record<string, unknown> = {}) => ({ customerName: "Khách Dò Tìm", customerPhone: "0912345678", services: [dichVu(legs, departDate)], ...extra });

async function nhap(w: any, as: string, legs: unknown[], departDate = NGAY) {
  const r = await w.call("POST", "/api/orders", { as, body: than(legs, departDate) });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
const lay = async (w: any, id: string) => (await w.call("GET", `/api/orders/${id}`, { as: ADM })).json.order;
/** Đơn ĐÃ XÁC NHẬN do `as` lập (xác nhận lúc chặng còn trên mốc). */
async function daXacNhan(w: any, as: string, legs: unknown[], departDate = NGAY) {
  const o = await nhap(w, as, legs, departDate);
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return lay(w, o.id);
}
const dau = (w: any, legId: string) => ({ ...w.q("SELECT short_notice_reason AS lyDo, short_notice_by AS nguoi FROM ord_transfer_leg WHERE id = ?", legId)[0] });
const datGap = (w: any, id: string, legId: string, as: string) => w.call("POST", `/api/orders/${id}/legs/${legId}/short-notice`, { as, body: DAT_GAP });
const soNhatKy = (w: any, id: string) => w.q("SELECT count(*) n FROM audit_log WHERE order_id = ?", id)[0].n as number;
const nhatKyCuoi = (w: any, id: string, action: string) =>
  w.q("SELECT detail FROM audit_log WHERE order_id = ? AND action = ? ORDER BY rowid DESC LIMIT 1", id, action)[0]?.detail as string | undefined;
/** Thân sửa chặng từ LegDto (giữ ngày, giờ, nơi) + `over`. */
const thanChang = (l: any, over: Record<string, unknown> = {}) => ({
  pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId,
  dropoffPlace: l.dropoffPlace ?? "", ...over,
});
const kemDatGap = (datGapBody: unknown) => (datGapBody === undefined ? {} : { datGap: datGapBody });
const suaChang = (w: any, o: any, as: string, over: Record<string, unknown>, datGapBody?: unknown, l = o.services[0].legs[0]) =>
  w.call("PUT", `/api/orders/${o.id}/legs/${l.id}`, { as, body: { expectedUpdatedAt: l.updatedAt, leg: thanChang(l, over), ...kemDatGap(datGapBody) } });
const themChang = (w: any, o: any, as: string, leg: unknown, datGapBody?: unknown) =>
  w.call("POST", `/api/orders/${o.id}/legs`, { as, body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg, ...kemDatGap(datGapBody) } });
const thayChang = (w: any, o: any, as: string, leg: unknown, datGapBody?: unknown, l = o.services[0].legs[0]) =>
  w.call("POST", `/api/orders/${o.id}/legs/${l.id}/replace`, { as, body: { expectedUpdatedAt: o.updatedAt, leg, ...kemDatGap(datGapBody) } });
/** Thân `PUT …/trip` của bảng "Sửa thông tin chuyến" hiện nay (không có hai khoá cũ giờ / nơi đón): mọi dịch vụ dời sang `departDate`. */
const suaChuyen = (w: any, o: any, as: string, departDate: string, datGapBody?: unknown) =>
  w.call("PUT", `/api/orders/${o.id}/trip`, {
    as,
    body: {
      expectedUpdatedAt: o.updatedAt,
      services: o.services.map((s: any) => ({ id: s.id, departDate, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" })),
      ...kemDatGap(datGapBody),
    },
  });
/** Dấu CŨ gieo thẳng vào CSDL — dấu đóng TRƯỚC ADR-0107 trên chặng còn xa (dữ liệu có thật trên production); API nay không còn tạo được. */
const gieoDauCu = (w: any, legId: string) =>
  w.sqlite.prepare("UPDATE ord_transfer_leg SET short_notice_reason = 'KHAC', short_notice_by = ?, short_notice_at = '2027-03-01T00:00:00.000Z', short_notice_lead_minutes = 360 WHERE id = ?")
    .run(ADM, legId);
const ma = (r: any) => r.json?.error?.code;

// ---- Bài 1 (T1): nút Đặt gấp ---------------------------------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 1 — nút Đặt gấp: Bán hàng đóng dấu chặng dưới mốc của đơn NGƯỜI KHÁC lập → 200; chặng trên mốc → 409 short_notice_not_needed cho cả Quản trị, Toàn quyền (không ghi); chặng chưa chốt giờ → 409; Kế toán, HDV, Đối tác, Thực tập → 403", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
    // Nháp của Thực tập, đón 10:00 — lúc 06:00 còn 4 giờ: dưới mốc.
    const n = await nhap(w, INTERN, [chang(NGAY, "10:00")]);
    const legN = n.services[0].legs[0].id;
    const n0 = soNhatKy(w, n.id);
    for (const as of [ACC, FIELD, PARTNER, INTERN]) {
      const r = await datGap(w, n.id, legN, as);
      assert.equal(r.status, 403, `${as}: ${r.text}`);
    }
    assert.deepEqual(dau(w, legN), KHONG_DAU);
    assert.equal(soNhatKy(w, n.id), n0, "403: không nhật ký");
    const ok = await datGap(w, n.id, legN, SALES);
    assert.equal(ok.status, 200, ok.text);
    assert.deepEqual(dau(w, legN), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES }, "Bán hàng (không phải người lập) đóng được dấu");
    assert.equal(nhatKyCuoi(w, n.id, "order_leg_short_notice"), `${n.orderCode} · Chiều đi${DUOI}`);
    assert.equal((await w.call("POST", `/api/orders/${n.id}/status`, { as: INTERN, body: { status: "confirmed" } })).status, 200, "có dấu: người lập xác nhận được");

    // Đơn ĐÃ XÁC NHẬN của Bán hàng khác, đón 13:00 — còn 7 giờ: trên mốc.
    const x = await daXacNhan(w, SALES2, [chang(NGAY, "13:00")]);
    const legX = x.services[0].legs[0].id;
    const x0 = soNhatKy(w, x.id);
    for (const as of [ADM, SUP, SALES]) {
      const r = await datGap(w, x.id, legX, as);
      assert.equal(r.status, 409, `${as}: ${r.text}`);
      assert.equal(ma(r), "short_notice_not_needed", as);
    }
    assert.deepEqual(dau(w, legX), KHONG_DAU, "không ghi dấu");
    assert.equal(soNhatKy(w, x.id), x0, "không nhật ký");
    denGio("08:00"); // còn 5 giờ: dưới mốc
    assert.equal((await datGap(w, x.id, legX, SALES)).status, 200, "chặng đã dưới mốc: Bán hàng đóng được (đơn người khác)");

    // Chặng chưa chốt giờ không bao giờ "dưới mốc" (I13) → 409, kể cả Quản trị.
    const k = await nhap(w, SALES, [chang(NGAY, "")]);
    const rk = await datGap(w, k.id, k.services[0].legs[0].id, ADM);
    assert.equal(rk.status, 409, rk.text);
    assert.equal(ma(rk), "short_notice_not_needed");
  } finally {
    tat();
  }
});

/** Lô ghi dấu của nút Đặt gấp (câu `leg_short_notice` đứng đầu lô). */
const LO_DAT_GAP = /UPDATE ord_transfer_leg SET short_notice_reason = \?1/;

test("ADR-0107 bài 1b — nút Đặt gấp: chặng bị dời ra xa CHEN GIỮA lúc route đọc giờ (dưới mốc) và lúc ghi dấu → câu ghi không áp dụng: 409 stale, chặng không mang dấu, không nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nhap(w, SALES, [chang(NGAY, "10:00")]); // lúc 06:00 còn 4 giờ: dưới mốc
    const legN = n.services[0].legs[0].id;
    const n0 = soNhatKy(w, n.id);
    // Một lệnh khác dời chặng sang 5 ngày sau, đúng lúc route đã xét "dưới mốc" trên giờ cũ và sắp chạy lô ghi dấu.
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => LO_DAT_GAP.test(s.sql)), () => {
      w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_date = ? WHERE id = ?").run(ngaySau(5), legN);
    });
    const r = await datGap(w, n.id, legN, SALES);
    assert.equal(r.status, 409, r.text);
    assert.equal(ma(r), "stale");
    assert.deepEqual(dau(w, legN), KHONG_DAU, "không bao giờ ghi dấu lên giờ chưa được xét");
    assert.equal(soNhatKy(w, n.id), n0, "câu ghi không áp dụng → không nhật ký (changes() > 0)");
    // Bấm lại: route đọc giờ MỚI (còn xa) → 409 short_notice_not_needed.
    const lai = await datGap(w, n.id, legN, SALES);
    assert.equal(ma(lai), "short_notice_not_needed", lai.text);
  } finally {
    tat();
  }
});

test("ADR-0107 bài 1c — nút Đặt gấp: chặng bị dời GIỜ trong cùng ngày ra ngoài mốc chen giữa lúc đọc và lúc ghi dấu → 409 stale, không dấu, không nhật ký (vế giờ của câu ghi)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nhap(w, SALES, [chang(NGAY, "10:00")]); // lúc 06:00 còn 4 giờ: dưới mốc
    const legN = n.services[0].legs[0].id;
    const n0 = soNhatKy(w, n.id);
    // Cùng ngày 10:00 → 23:00 (còn 17 giờ: ngoài mốc) — ngày không đổi, chỉ vế GIỜ của câu ghi bắt được.
    w.chenTruocLo((stmts: { sql: string }[]) => stmts.some((s) => LO_DAT_GAP.test(s.sql)), () => {
      w.sqlite.prepare("UPDATE ord_transfer_leg SET pickup_time = '23:00' WHERE id = ?").run(legN);
    });
    const r = await datGap(w, n.id, legN, SALES);
    assert.equal(r.status, 409, r.text);
    assert.equal(ma(r), "stale");
    assert.deepEqual(dau(w, legN), KHONG_DAU, "không bao giờ ghi dấu lên giờ chưa được xét");
    assert.equal(soNhatKy(w, n.id), n0, "câu ghi không áp dụng → không nhật ký");
  } finally {
    tat();
  }
});

test("ADR-0107 bài 1d — nút Đặt gấp hỏi ô ĐẦU thân: người không có ô luôn 403 (thân sai, đơn lạ, chặng lạ — không lộ đơn / chặng có hay không); người có ô: thân sai 400, đơn lạ hay chặng lạ 404", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nhap(w, SALES, [chang(NGAY, "10:00")]);
    const legN = n.services[0].legs[0].id;
    const LA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const goi = (as: string, id: string, legId: string, body: unknown) => w.call("POST", `/api/orders/${id}/legs/${legId}/short-notice`, { as, body });
    for (const as of [ACC, FIELD, PARTNER, INTERN]) {
      for (const [id, legId, body] of [[n.id, legN, {}], [LA, legN, DAT_GAP], [n.id, LA, DAT_GAP]] as const) {
        const r = await goi(as, id, legId, body);
        assert.equal(r.status, 403, `${as} ${id === LA ? "đơn lạ" : legId === LA ? "chặng lạ" : "thân sai"}: ${r.text}`);
      }
    }
    for (const as of [SALES, ADM]) {
      assert.equal((await goi(as, n.id, legN, {})).status, 400, `${as}: thân sai`);
      assert.equal((await goi(as, LA, legN, DAT_GAP)).status, 404, `${as}: đơn lạ`);
      assert.equal((await goi(as, n.id, LA, DAT_GAP)).status, 404, `${as}: chặng lạ`);
    }
    assert.deepEqual(dau(w, legN), KHONG_DAU);
  } finally {
    tat();
  }
});

// ---- Bài 2 (T2): sửa chặng `PUT …/legs/:legId` -----------------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 2a — sửa chặng: Bán hàng (đơn mình lập) dời giờ VÀO dưới mốc kèm datGap → 200, chặng mang dấu của Bán hàng; vắng datGap → 409 short_notice_required; giờ cũ và mới đều trên mốc kèm datGap → 409 short_notice_not_needed, không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const legId = o.services[0].legs[0].id;
    const xa = await suaChang(w, o, SALES, { pickupTime: "14:00" }, DAT_GAP);
    assert.equal(xa.status, 409, xa.text);
    assert.equal(ma(xa), "short_notice_not_needed");
    assert.equal((await lay(w, o.id)).services[0].legs[0].pickupTime, "13:00", "409: không ghi");
    const thieu = await suaChang(w, o, SALES, { pickupTime: "10:00" });
    assert.equal(thieu.status, 409, thieu.text);
    assert.equal(ma(thieu), "short_notice_required");
    const ok = await suaChang(w, o, SALES, { pickupTime: "10:00" }, DAT_GAP);
    assert.equal(ok.status, 200, ok.text);
    assert.deepEqual(dau(w, legId), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES });
    assert.ok(nhatKyCuoi(w, o.id, "order_leg_updated")!.endsWith(DUOI));
  } finally {
    tat();
  }
});

test("ADR-0107 bài 2b (G15, G16) — chặng còn 150 phút dời ngày đón 5 ngày sau kèm datGap → 200 nhưng KHÔNG mang dấu (dấu cũ bỏ), với Bán hàng lẫn Quản trị; nhật ký vẫn ghi lý do; vắng datGap → 409 short_notice_required", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const b = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    denGio("10:30"); // còn 150 phút
    for (const [o, as] of [[a, SALES], [b, ADM]] as const) {
      const legId = o.services[0].legs[0].id;
      assert.equal((await datGap(w, o.id, legId, as)).status, 200, `${as}: chặng đang dưới mốc — đóng dấu được`);
      const c = await lay(w, o.id);
      const thieu = await suaChang(w, c, as, { pickupDate: ngaySau(5) });
      assert.equal(thieu.status, 409, thieu.text);
      assert.equal(ma(thieu), "short_notice_required", `${as}: cổng xét giờ sớm hơn giữa cũ và mới`);
      const r = await suaChang(w, c, as, { pickupDate: ngaySau(5) }, DAT_GAP);
      assert.equal(r.status, 200, `${as}: ${r.text}`);
      assert.equal(r.json.order.services[0].legs[0].pickupDate, ngaySau(5));
      assert.deepEqual(dau(w, legId), KHONG_DAU, `${as}: chặng đã ra xa không mang dấu (G15)`);
      assert.ok(nhatKyCuoi(w, o.id, "order_leg_updated")!.endsWith(DUOI), `${as}: nhật ký vẫn ghi lý do (G16)`);
    }
  } finally {
    tat();
  }
});

test("ADR-0107 bài 2c — chỉ đổi ô phụ: trên mốc kèm datGap → 409 short_notice_not_needed; dưới mốc vắng datGap → GIỮ dấu cũ (Q-B); dưới mốc kèm datGap (Bán hàng) → 200 và dấu MỚI", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const legId = o.services[0].legs[0].id;
    const xa = await suaChang(w, o, SALES, { flightCode: "VN1553" }, DAT_GAP);
    assert.equal(xa.status, 409, xa.text);
    assert.equal(ma(xa), "short_notice_not_needed");
    denGio("08:00");
    assert.equal((await datGap(w, o.id, legId, ADM)).status, 200);
    const giu = await suaChang(w, await lay(w, o.id), SALES, { flightCode: "VN1553" });
    assert.equal(giu.status, 200, giu.text);
    assert.deepEqual(dau(w, legId), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: ADM }, "vắng datGap: giữ dấu cũ");
    const moi = await suaChang(w, await lay(w, o.id), SALES, { flightCode: "VJ123" }, { lyDo: "CHUYEN_BAY_DOI_GIO" });
    assert.equal(moi.status, 200, moi.text);
    assert.deepEqual(dau(w, legId), { lyDo: "CHUYEN_BAY_DOI_GIO", nguoi: SALES }, "kèm datGap dưới mốc: dấu mới");
  } finally {
    tat();
  }
});

// ---- Bài 3 (T3): `PUT …/trip` (G11 — xét dấu từng chặng) --------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 3a — PUT …/trip: không chặng nào dưới mốc mà kèm datGap → 409 short_notice_not_needed, không ghi; vắng datGap → 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY_SAU, "10:00")], NGAY_SAU);
    const r = await suaChuyen(w, o, SALES, ngaySau(2), DAT_GAP);
    assert.equal(r.status, 409, r.text);
    assert.equal(ma(r), "short_notice_not_needed");
    assert.equal((await lay(w, o.id)).services[0].legs[0].pickupDate, NGAY_SAU, "409: không ghi");
    // Lệnh không đổi chặng nào (chỉ ghi chú) mà kèm datGap: lý do cũng không cần → 409, không ghi.
    const chiGhiChu = await w.call("PUT", `/api/orders/${o.id}/trip`, {
      as: ADM,
      body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: NGAY_SAU, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "Ghi chú mới" }], datGap: DAT_GAP },
    });
    assert.equal(chiGhiChu.status, 409, chiGhiChu.text);
    assert.equal(ma(chiGhiChu), "short_notice_not_needed");
    assert.equal((await lay(w, o.id)).services[0].note ?? "", "", "409: ghi chú không ghi");
    assert.equal((await suaChuyen(w, o, SALES, ngaySau(2))).status, 200);
  } finally {
    tat();
  }
});

test("ADR-0107 bài 3b (G11) — PUT …/trip dời ngày đi: chặng A vào dưới mốc, chặng B vẫn xa, kèm datGap → 200; CHỈ A mang dấu, B không (dấu cũ gieo sẵn bị bỏ); vắng datGap → 409 short_notice_required", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    // Ngày đi NGAY_SAU: A chiều đi 10:00 NGAY_SAU (28 giờ nữa), B chiều về 16:00 ngày NGAY+3 — cả hai trên mốc.
    const o = await daXacNhan(w, SALES, [chang(NGAY_SAU, "10:00"), chieuVe(ngaySau(3), "16:00")], NGAY_SAU);
    const a = o.services[0].legs.find((l: any) => l.direction === "OUT").id;
    const b = o.services[0].legs.find((l: any) => l.direction === "RETURN").id;
    gieoDauCu(w, b);
    // Dời ngày đi về NGAY: A → 10:00 NGAY (còn 4 giờ: dưới mốc), B → 16:00 NGAY+2 (xa).
    const thieu = await suaChuyen(w, o, SALES, NGAY);
    assert.equal(thieu.status, 409, thieu.text);
    assert.equal(ma(thieu), "short_notice_required");
    const r = await suaChuyen(w, o, SALES, NGAY, DAT_GAP);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(dau(w, a), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES }, "A (giờ mới dưới mốc) mang dấu");
    assert.deepEqual(dau(w, b), KHONG_DAU, "B (giờ mới xa) không mang dấu — dấu cũ bỏ (I16)");
    assert.ok(nhatKyCuoi(w, o.id, "trip_updated")!.endsWith(DUOI), "nhật ký lệnh ghi lý do");
  } finally {
    tat();
  }
});

test("ADR-0107 bài 3c (G15, G16) — PUT …/trip dời chặng đang dưới mốc ra xa kèm datGap → 200, chặng không mang dấu; nhật ký lệnh và dòng chặng vẫn ghi lý do", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const legId = o.services[0].legs[0].id;
    denGio("08:00");
    assert.equal((await datGap(w, o.id, legId, SALES)).status, 200);
    // Lệnh chỉ đổi ghi chú (ngày đi giữ nguyên, không chặng nào đổi), vắng datGap → không cổng mốc, chặng không bị đụng: GIỮ dấu.
    const ghiChu = await w.call("PUT", `/api/orders/${o.id}/trip`, {
      as: SALES,
      body: { expectedUpdatedAt: (await lay(w, o.id)).updatedAt, services: [{ id: o.services[0].id, departDate: NGAY, departTime: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "Khách mang xe lăn" }] },
    });
    assert.equal(ghiChu.status, 200, ghiChu.text);
    assert.deepEqual(dau(w, legId), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES }, "chặng không đổi: giữ dấu");
    const c = await lay(w, o.id);
    const thieu = await suaChuyen(w, c, ADM, ngaySau(5));
    assert.equal(thieu.status, 409, thieu.text);
    assert.equal(ma(thieu), "short_notice_required");
    const r = await suaChuyen(w, c, ADM, ngaySau(5), DAT_GAP);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(dau(w, legId), KHONG_DAU, "chặng ra xa: không dấu");
    assert.ok(nhatKyCuoi(w, o.id, "trip_updated")!.endsWith(DUOI), "dòng lệnh có lý do (G16)");
    assert.ok(nhatKyCuoi(w, o.id, "order_leg_updated")!.endsWith(DUOI), "dòng chặng (G17) cùng đuôi");
  } finally {
    tat();
  }
});

// ---- Bài 4 (T4): thêm chặng ----------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 4 — thêm chặng: chặng mới trên mốc kèm datGap → 409 short_notice_not_needed, không ghi; dưới mốc kèm datGap (Bán hàng, đơn mình) → 201 và mang dấu", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const xa = await themChang(w, o, SALES, chang(NGAY, "18:00", { pickupPlace: "Khách sạn Thêm" }), DAT_GAP);
    assert.equal(xa.status, 409, xa.text);
    assert.equal(ma(xa), "short_notice_not_needed");
    assert.equal((await lay(w, o.id)).services[0].legs.length, 1, "409: không thêm chặng");
    const r = await themChang(w, o, SALES, chang(NGAY, "11:00", { pickupPlace: "Khách sạn Thêm" }), DAT_GAP);
    assert.equal(r.status, 201, r.text);
    const moi = r.json.order.services[0].legs.find((l: any) => l.pickupTime === "11:00");
    assert.deepEqual(dau(w, moi.id), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES });
  } finally {
    tat();
  }
});

// ---- Bài 5 (T5): thay chặng --------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 5 — thay chặng: cũ lẫn mới trên mốc kèm datGap → 409 short_notice_not_needed, chặng cũ vẫn mở; mới dưới mốc kèm datGap (Bán hàng) → 200 có dấu; thay chặng dưới mốc bằng chặng xa kèm datGap → 200, chặng mới KHÔNG dấu", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const o = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const p = await daXacNhan(w, SALES, [chang(NGAY, "13:00")]);
    const cu = o.services[0].legs[0].id;
    const xa = await thayChang(w, o, SALES, chang(NGAY, "15:00", { pickupPlace: "Khách sạn Mới" }), DAT_GAP);
    assert.equal(xa.status, 409, xa.text);
    assert.equal(ma(xa), "short_notice_not_needed");
    assert.equal(w.q("SELECT closed_at FROM ord_transfer_leg WHERE id = ?", cu)[0].closed_at, null, "chặng cũ vẫn mở");
    const r = await thayChang(w, o, SALES, chang(NGAY, "11:00", { pickupPlace: "Khách sạn Mới" }), DAT_GAP);
    assert.equal(r.status, 200, r.text);
    const moi = r.json.order.services[0].legs[0];
    assert.equal(moi.pickupTime, "11:00");
    assert.deepEqual(dau(w, moi.id), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES });
    // Đơn p: chặng 13:00 lúc 08:00 còn 5 giờ (dưới mốc) → thay bằng chặng ngày mai (xa).
    denGio("08:00");
    const ra = await thayChang(w, p, ADM, chang(NGAY_SAU, "13:00", { pickupPlace: "Khách sạn Xa" }), DAT_GAP);
    assert.equal(ra.status, 200, ra.text);
    const moiP = ra.json.order.services[0].legs[0];
    assert.equal(moiP.pickupDate, NGAY_SAU);
    assert.deepEqual(dau(w, moiP.id), KHONG_DAU, "chặng mới ở xa: không dấu (G15)");
    assert.ok(nhatKyCuoi(w, p.id, "order_leg_added")!.endsWith(DUOI), "nhật ký thêm chặng vẫn có lý do (G16)");
  } finally {
    tat();
  }
});

// ---- Bài 6 (T6): phạm vi ---------------------------------------------------------------------------------------------------------------------------------------------
test("ADR-0107 bài 6 — phạm vi: Bán hàng gửi lệnh kèm datGap cho đơn của Bán hàng khác (không phụ trách) → 403 ở cả bốn lệnh (ô order.trip.edit không đổi), không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    seedStaff(w.sqlite, { id: SALES2, phone: "0900000002", name: "Bình", perms: ["SALES"] });
    const o = await daXacNhan(w, SALES2, [chang(NGAY, "13:00")]);
    denGio("08:00");
    const n0 = soNhatKy(w, o.id);
    for (const r of [
      await suaChang(w, o, SALES, { pickupTime: "11:00" }, DAT_GAP),
      await themChang(w, o, SALES, chang(NGAY, "11:00", { pickupPlace: "Khách sạn Thêm" }), DAT_GAP),
      await thayChang(w, o, SALES, chang(NGAY, "11:00", { pickupPlace: "Khách sạn Mới" }), DAT_GAP),
      await suaChuyen(w, o, SALES, ngaySau(1), DAT_GAP),
    ]) assert.equal(r.status, 403, r.text);
    assert.equal(soNhatKy(w, o.id), n0, "không ghi");
    assert.deepEqual(dau(w, o.services[0].legs[0].id), KHONG_DAU);
  } finally {
    tat();
  }
});

// ---- Bài 7 (T7): một chỗ canh + ngoại lệ có tên ------------------------------------------------------------------------------------------------------------------
const SRC = new URL("../../", import.meta.url);
function tepNguon(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return tepNguon(new URL(`${e.name}/`, dir));
    return e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") ? [new URL(e.name, dir)] : [];
  });
}
const tenTep = (u: URL) => u.pathname.slice(SRC.pathname.length);
/** Mọi chỗ khớp `re` trong mã nguồn `src/` (trừ bài) → "tệp@vị trí". */
function choKhop(re: RegExp): { tep: string; viTri: number; noiDung: string }[] {
  return tepNguon(SRC).flatMap((u) => {
    const noiDung = readFileSync(u, "utf8");
    return [...noiDung.matchAll(re)].map((m) => ({ tep: tenTep(u), viTri: m.index!, noiDung }));
  });
}
/** Khoảng chữ của MỘT khai báo (từ `dau` tới dòng `}` đóng ở đầu dòng, hoặc tới dòng trống cho khai báo một biểu thức). */
function khoangKhaiBao(noiDung: string, dau: string, ketThuc: "\n}\n" | "\n\n"): [number, number] {
  const tu = noiDung.indexOf(dau);
  assert.ok(tu >= 0, `không thấy "${dau}"`);
  const den = noiDung.indexOf(ketThuc, tu);
  assert.ok(den > tu, `không thấy chỗ kết thúc của "${dau}"`);
  return [tu, den];
}

test("ADR-0107 bài 7 — MỘT chỗ canh (bài tĩnh): dấu MỚI chỉ dựng trong xetDatGapSua (ép kiểu DauDatGapMoi đúng một lần), dấu CHÉP của đơn nháp chỉ dựng trong datGapCuaDong (DauChepNhap đúng một lần); câu gắn năm cột đặt gấp chỉ nhận hai kiểu đó và chỉ nằm ở chang-hanh-khach-repo.ts", () => {
  const moi = choKhop(/as DauDatGapMoi\b/g);
  assert.equal(moi.length, 1, `ép kiểu DauDatGapMoi: ${moi.map((x) => x.tep).join(", ")}`);
  assert.equal(moi[0]!.tep, "modules/orders/index.ts");
  const [a, b] = khoangKhaiBao(moi[0]!.noiDung, "function xetDatGapSua(", "\n}\n");
  assert.ok(moi[0]!.viTri > a && moi[0]!.viTri < b, "ép kiểu dấu mới phải nằm TRONG thân xetDatGapSua");
  const chep = choKhop(/as DauChepNhap\b/g);
  assert.equal(chep.length, 1, `ép kiểu DauChepNhap: ${chep.map((x) => x.tep).join(", ")}`);
  assert.equal(chep[0]!.tep, "modules/orders/dat-gap.ts");
  const [c, d] = khoangKhaiBao(chep[0]!.noiDung, "export const datGapCuaDong", "\n\n");
  assert.ok(chep[0]!.viTri > c && chep[0]!.viTri < d, "ép kiểu dấu chép phải nằm TRONG datGapCuaDong");
  assert.deepEqual(choKhop(/as DauGhi\b/g).map((x) => x.tep), [], "không ép thẳng sang DauGhi");
  // Ép kiểu kiểu cũ `<DauDatGapMoi>{…}` qua mặt được bộ đếm chữ `as …` ở trên (người kiểm độc lập 25/10) → cấm hẳn; `Foo<DauGhi>` (tham số kiểu) không bị bắt.
  assert.deepEqual(choKhop(/(?<![\w$.\]])<\s*(?:DauDatGapMoi|DauChepNhap|DauGhi)\s*>/g).map((x) => x.tep), [], "không ép kiểu bằng ngoặc nhọn <DauDatGapMoi> / <DauChepNhap> / <DauGhi>");
  // Câu GHI năm cột chỉ ở kho chặng, và hai chỗ gắn tham số chỉ nhận kiểu dấu có nguồn.
  const ghi = [...new Set(choKhop(/short_notice_reason\s*=|INSERT INTO ord_transfer_leg[^`]*short_notice_reason/g).map((x) => x.tep))];
  assert.deepEqual(ghi, ["modules/orders/chang-hanh-khach-repo.ts"]);
  const repo = readFileSync(new URL("./chang-hanh-khach-repo.ts", import.meta.url), "utf8");
  assert.match(repo, /const datGapBinds = \(d: DauGhi \| null \| undefined\)/, "bộ gắn năm cột của câu chèn / sửa chỉ nhận DauGhi");
  assert.match(repo, /export const legShortNotice = \(db: D1Database, legId: string, orderId: string, d: DauDatGapMoi[,)]/, "câu của nút Đặt gấp chỉ nhận dấu mới");
});

test("ADR-0107 bài 7 — ngoại lệ có tên (chép dấu cũ khi lưu lại đơn nháp): Đối tác và Thực tập lưu lại nháp của mình có chặng Bán hàng vừa đặt gấp, không đổi giờ / nơi → 200, dấu còn nguyên (người đóng vẫn là Bán hàng)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    for (const as of [PARTNER, INTERN]) {
      const n = await nhap(w, as, [chang(NGAY, "10:00")]);
      assert.equal((await datGap(w, n.id, n.services[0].legs[0].id, SALES)).status, 200);
      const d = (await w.call("GET", `/api/orders/${n.id}`, { as })).json.order;
      const luu = await w.call("PUT", `/api/orders/${n.id}`, {
        as, body: { ...than([chang(NGAY, "10:00")], NGAY), services: [dichVu([chang(NGAY, "10:00")], NGAY, { id: d.services[0].id })], expectedUpdatedAt: d.updatedAt },
      });
      assert.equal(luu.status, 200, `${as}: ${luu.text}`);
      const leg = luu.json.order.services[0].legs[0];
      assert.deepEqual(dau(w, leg.id), { lyDo: "KHACH_DOAN_GOI_GAP", nguoi: SALES }, `${as}: dấu chép nguyên từ CSDL`);
      assert.deepEqual(leg.datGap, { daDuyet: true }, `${as}: chỉ thấy cờ`);
    }
  } finally {
    tat();
  }
});

// ---- Bài 12 (T12): chỗ thứ hai hỏi ô — danh sách đơn nháp chờ đặt gấp trên lịch chung ------------------------------------------------------------------------------
test("ADR-0107 bài 12 — GET /api/van-chuyen/lich: Bán hàng thấy đơn nháp chờ đặt gấp (nhapChoDatGap); Kế toán (có trip.view, không có ô đặt gấp) nhận mảng rỗng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const n = await nhap(w, INTERN, [chang(NGAY, "10:00")]);
    const ban = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    assert.equal(ban.status, 200, ban.text);
    assert.deepEqual(ban.json.nhapChoDatGap.map((x: any) => x.orderId), [n.id]);
    const kt = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: ACC });
    assert.equal(kt.status, 200, kt.text);
    assert.deepEqual(kt.json.nhapChoDatGap, []);
  } finally {
    tat();
  }
});
