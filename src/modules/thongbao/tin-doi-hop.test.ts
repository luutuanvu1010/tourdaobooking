// ADR-0062 (tin "đơn đổi sau xác nhận") + ADR-0052 D6.2 MQ-07 ("giờ hẹn chặng đổi khi đã xếp") qua ROUTE THẬT: ghi bằng route orders / dispatch, đọc bằng
// GET /api/thong-bao (câu đọc LIST_DOI trên view v_aud_order_change + hàm tiêm dữ kiện chuyến) — không dựng dòng tay. Tên / SĐT / nơi GIẢ (Dò Tìm).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import {
  ACC, ADM, DRIVER, DRIVER2, FIELD, LOC, NGAY, NGAY_SAU, PARTNER, SALES, batDongHo, chuyenSan, denGio, don, setup, taoChuyen, xe, xepHet,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

type Tin = { loai: string; cau: string; lienKet: string; cuaToi: boolean; maDon: string | null };
const hopCua = async (w: any, as: string, ngan: "cua-toi" | "tat-ca" = "cua-toi"): Promise<Tin[]> => {
  const r = await w.call("GET", `/api/thong-bao?ngan=${ngan}`, { as });
  assert.equal(r.status, 200, r.text);
  return r.json.tin;
};
const doiCua = async (w: any, as: string, ngan: "cua-toi" | "tat-ca" = "cua-toi") => (await hopCua(w, as, ngan)).filter((t) => t.loai === "doi_sau_xac_nhan");
const gioHenCua = async (w: any, as: string, ngan: "cua-toi" | "tat-ca" = "cua-toi") => (await hopCua(w, as, ngan)).filter((t) => t.loai === "chuyen" && t.cau.includes("giờ"));
// ADR-0135: đơn NHÁP chỉ người lập đọc được → khi còn nháp đọc bằng người lập, đã xác nhận thì Quản trị.
const donXem = async (w: any, id: string) => {
  const r = w.q("SELECT status, staff_id FROM orders WHERE id = ?", id)[0];
  return (await w.call("GET", `/api/orders/${id}`, { as: r?.status === "draft" ? String(r.staff_id) : ADM })).json.order;
};
const LEG = (l: any, over: Record<string, unknown> = {}) => ({
  pickupDate: l.pickupDate, pickupTime: l.pickupTime ?? "", pickupLocationId: l.pickupLocationId, pickupPlace: l.pickupPlace ?? "", dropoffLocationId: l.dropoffLocationId,
  dropoffPlace: l.dropoffPlace ?? "", ...over,
});
async function suaChang(w: any, as: string, orderId: string, over: Record<string, unknown>, datGap?: { lyDo: string }) {
  const o = await donXem(w, orderId);
  const l = o.services[0].legs[0];
  const r = await w.call("PUT", `/api/orders/${orderId}/legs/${l.id}`, { as, body: { expectedUpdatedAt: l.updatedAt, leg: LEG(l, over), ...(datGap ? { datGap } : {}) } });
  assert.equal(r.status, 200, r.text);
  return l.id as string;
}
/** Đơn Đối tác lập (một chặng chiều đi 13:00 ngày NGAY), Đối tác tự xác nhận; Quản trị giao Bán hàng phụ trách. */
async function donDoiTac(w: any) {
  const r = await w.call("POST", "/api/orders", {
    as: PARTNER,
    body: {
      customerName: "Khách Liên Hệ Dò Tìm", customerPhone: "0912345678",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: "13:00", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" }],
      }],
    },
  });
  assert.equal(r.status, 201, r.text);
  const id = r.json.order.id;
  assert.equal((await w.call("POST", `/api/orders/${id}/gui-don`, { as: PARTNER, body: {} })).status, 200);
  assert.equal((await w.call("PUT", `/api/orders/${id}/handler`, { as: ADM, body: { staffId: SALES } })).status, 200);
  return { id, code: r.json.order.orderCode as string, legId: r.json.order.services[0].legs[0].id as string };
}

test("Bán hàng (người phụ trách) đổi giờ chặng đơn đã xác nhận → người lập (Đối tác) nhận tin 'đổi giờ đón' ở Của tôi, mở được trang đơn; người sửa không nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDoiTac(w);
    denGio("06:10");
    await suaChang(w, SALES, d.id, { pickupTime: "14:00" });
    const t = await doiCua(w, PARTNER);
    assert.deepEqual(t.map((x) => [x.cau, x.lienKet, x.cuaToi]), [[`Đơn ${d.code}: Chiều đi: giờ đón 13:00 → 14:00`, `/order?id=${d.id}`, true]]);
    assert.equal((await w.call("GET", "/api/thong-bao/tom-tat", { as: PARTNER })).json.soChuaDoc >= 1, true, "tính số đỏ");
    assert.equal((await w.call("GET", `/api/orders/${d.id}`, { as: PARTNER })).status, 200, "Đối tác mở được trang đơn mình lập (liên kết của tin)");
    assert.deepEqual(await doiCua(w, SALES, "tat-ca"), [], "người sửa không nhận tin của chính mình");
    assert.deepEqual(await doiCua(w, ACC), [], "Kế toán: không ở Của tôi");
    assert.equal((await doiCua(w, ACC, "tat-ca")).length, 1, "Kế toán: có ở Tất cả");
  } finally {
    tat();
  }
});

test("đổi nơi đón chặng → tin 'đổi nơi đón', KHÔNG ghi nơi mới (chữ, dãy số) ở hộp lẫn câu màn hình khoá", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await donDoiTac(w);
    denGio("06:10");
    await suaChang(w, SALES, d.id, { pickupPlace: "12 Trần Phú gọi 0901234567" });
    const t = await doiCua(w, PARTNER);
    assert.deepEqual(t.map((x) => x.cau), [`Đơn ${d.code}: Chiều đi: đổi nơi đón`]);
    const moi = await w.call("GET", "/api/thong-bao/moi-nhat", { as: PARTNER });
    assert.equal(moi.status, 200, moi.text);
    for (const json of [JSON.stringify(await hopCua(w, PARTNER, "tat-ca")), moi.text]) {
      for (const x of ["Trần Phú", "0901234567", "•••", "Dò Tìm", "Tour đảo"]) assert.ok(!json.includes(x), x);
    }
  } finally {
    tat();
  }
});

test("MQ-07: chặng ĐÃ XẾP đổi giờ hẹn → tài xế đang lái nhận; tài xế khác không; người lập (Bán hàng) nhận ĐÚNG MỘT tin 'gọi báo khách'; HDV phụ trách và Đối tác người lập (không trip.view) chỉ nhận tin đơn đổi; người sửa không nhận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w); // đơn Bán hàng lập, chặng 13:00, xếp hết lên chuyến của DRIVER
    assert.equal((await w.call("PUT", `/api/orders/${a.don.id}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
    const p = await donDoiTac(w);
    await xepHet(w, { chuyen: { id: a.id } }, p, 2);
    denGio("06:10");
    await suaChang(w, ADM, a.don.id, { pickupTime: "13:30" });
    await suaChang(w, ADM, p.id, { pickupTime: "13:30" });

    const tx = await gioHenCua(w, DRIVER);
    assert.equal(tx.length, 2, JSON.stringify(tx));
    for (const x of tx) {
      assert.match(x.cau, new RegExp(`^Văn phòng vừa đổi giờ đón ở chuyến ${a.ma} ngày \\d{2}/\\d{2} — mở để xem$`));
      assert.equal(x.lienKet, `/cuoc-chuyen?id=${a.id}`);
    }
    assert.deepEqual(await gioHenCua(w, DRIVER2, "tat-ca"), [], "tài xế không lái chuyến này");
    assert.deepEqual(await doiCua(w, DRIVER, "tat-ca"), [], "tài xế không nhận tin đơn đổi");

    for (const ngan of ["cua-toi", "tat-ca"] as const) {
      const cuaBan = (await hopCua(w, SALES, ngan)).filter((x) => x.cau.includes(a.don.code) && (x.loai === "doi_sau_xac_nhan" || x.cau.includes("giờ hẹn")));
      assert.deepEqual(cuaBan.map((x) => [x.loai, x.cau, x.lienKet]), [["chuyen", `Đơn ${a.don.code}: giờ hẹn đổi ở chuyến ${a.ma} ngày 11/03 — gọi báo khách`, `/chuyen?id=${a.id}`]], ngan);
    }
    assert.deepEqual(await gioHenCua(w, FIELD, "tat-ca"), [], "HDV: không trip.view");
    assert.deepEqual((await doiCua(w, FIELD)).map((x) => x.cau), [`Đơn ${a.don.code}: Chiều đi: giờ đón 13:00 → 13:30`]);
    assert.deepEqual(await gioHenCua(w, PARTNER, "tat-ca"), [], "Đối tác: không trip.view");
    assert.deepEqual((await doiCua(w, PARTNER)).map((x) => x.cau), [`Đơn ${p.code}: Chiều đi: giờ đón 13:00 → 13:30`]);
    assert.deepEqual([...(await gioHenCua(w, ADM, "tat-ca")), ...(await doiCua(w, ADM, "tat-ca"))], [], "người sửa không nhận");
    // Không tên khách / SĐT / nơi trong mọi tin vừa sinh.
    for (const as of [DRIVER, SALES, FIELD, PARTNER]) assert.ok(!/Khách|Dò Tìm|0912345678/.test(JSON.stringify(await hopCua(w, as, "tat-ca"))), as);
  } finally {
    tat();
  }
});

test("sửa giờ lúc đơn còn NHÁP rồi mới xác nhận → không tin đổi; sửa sau xác nhận → có (sau xác nhận tính từ nhật ký)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const r = await w.call("POST", "/api/orders", {
      as: SALES,
      body: {
        customerName: "Khách Dò Tìm", customerPhone: "0912345678", handlerStaffId: FIELD,
        services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, departTime: "07:00" }],
      },
    });
    assert.equal(r.status, 201, r.text);
    const id = r.json.order.id;
    const trip = async (as: string, departTime: string) => {
      const o = await donXem(w, id);
      const x = await w.call("PUT", `/api/orders/${id}/trip`, { as, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: NGAY, departTime, checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }] } });
      assert.equal(x.status, 200, x.text);
    };
    denGio("06:05");
    await trip(SALES, "08:00");
    denGio("06:10");
    assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
    assert.deepEqual(await doiCua(w, FIELD, "tat-ca"), [], "dòng sửa lúc nháp không thành tin");
    denGio("06:20");
    await trip(ADM, "09:00");
    assert.deepEqual((await doiCua(w, FIELD)).map((x) => x.cau), [`Đơn ${r.json.order.orderCode}: giờ khởi hành 08:00 → 09:00`]);
  } finally {
    tat();
  }
});

test("đơn xác nhận HƠN 30 ngày trước, hôm nay đổi giờ → vẫn có tin (câu đọc 'đã xác nhận' không bị cửa sổ 30 ngày)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const r = await w.call("POST", "/api/orders", {
      as: SALES,
      body: { customerName: "Khách Dò Tìm", customerPhone: "0912345678", handlerStaffId: FIELD, services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: "2027-05-20", departTime: "07:00" }] },
    });
    assert.equal(r.status, 201, r.text);
    const id = r.json.order.id;
    assert.equal((await w.call("POST", `/api/orders/${id}/status`, { as: SALES, body: { status: "confirmed" } })).status, 200);
    denGio("08:00", "2027-04-21"); // 41 ngày sau
    const o = await donXem(w, id);
    const x = await w.call("PUT", `/api/orders/${id}/trip`, { as: ADM, body: { expectedUpdatedAt: o.updatedAt, services: [{ id: o.services[0].id, departDate: "2027-05-20", departTime: "07:30", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }] } });
    assert.equal(x.status, 200, x.text);
    assert.deepEqual((await doiCua(w, FIELD)).map((t) => t.cau), [`Đơn ${r.json.order.orderCode}: giờ khởi hành 07:00 → 07:30`]);
    assert.equal((await doiCua(w, SALES)).length, 1);
  } finally {
    tat();
  }
});

/** Khoá VAPID THẬT sinh tại chỗ (P-256) + máy nhận cho từng tài khoản (địa chỉ FCM giả — fetch bị thay nên không gọi mạng). */
async function batGoCua(w: any, ids: readonly string[]) {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  w.env.VAPID_PUBLIC_KEY = btoa(String.fromCharCode(...raw)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  w.env.VAPID_PRIVATE_KEY = JSON.stringify(await crypto.subtle.exportKey("jwk", pair.privateKey));
  const at = new Date().toISOString();
  for (const id of ids) {
    w.sqlite.prepare("INSERT INTO ntf_push_sub (id, staff_id, endpoint, thiet_bi, created_at, updated_at) VALUES (?, ?, ?, 'iPhone', ?, ?)").run(`m-${id}`, id, `https://fcm.googleapis.com/fcm/send/${id}`, at, at);
  }
}

test("màn hình khoá (gõ cửa THẬT qua gốc lắp ráp, fetch giả): sửa chặng đã xếp → người lập + HDV + tài xế đang lái, không người sửa / Kế toán / tài xế khác; đơn nháp → không ai; HDV sửa số khách → người lập; y nguyên → không ai; lệnh SAU không ghi dòng đổi (đặt gấp, ghi lần thu) → không gõ cửa lại tin cũ", async () => {
  const tat = batDongHo();
  const fetchGoc = globalThis.fetch;
  try {
    const w = setup();
    const a = await chuyenSan(w); // Bán hàng lập, chặng 13:00 xếp lên chuyến của DRIVER
    assert.equal((await w.call("PUT", `/api/orders/${a.don.id}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
    const p = await donDoiTac(w); // Đối tác lập, Bán hàng phụ trách
    await xepHet(w, { chuyen: { id: a.id } }, p, 2);
    const nhap = await w.call("POST", "/api/orders", {
      as: SALES,
      body: { customerName: "Khách Dò Tìm", customerPhone: "0912345678", handlerStaffId: FIELD, services: [{ kind: "catalog", pickupChoice: "KHONG_DON", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY, departTime: "07:00" }] },
    });
    assert.equal(nhap.status, 201, nhap.text);
    await w.choNen();
    await batGoCua(w, [SALES, FIELD, ADM, ACC, DRIVER, DRIVER2, PARTNER]);
    const goi: string[] = [];
    globalThis.fetch = (async (u: unknown) => (goi.push(String(u)), new Response(null, { status: 201 }))) as typeof fetch;
    const nguoiDuocGo = async () => { await w.choNen(); const r = goi.map((u) => u.split("/").pop()!).sort(); goi.length = 0; return r; };
    denGio("06:10");

    // ADR-0107: chỉ đặt gấp được chặng ĐANG dưới mốc — Quản trị dời giờ đón VÀO dưới mốc (12:00, còn 350 phút) kèm lý do, để lệnh đặt gấp ở dưới hợp lệ.
    await suaChang(w, ADM, a.don.id, { pickupTime: "12:00" }, { lyDo: "KHAC" });
    assert.deepEqual(await nguoiDuocGo(), [SALES, FIELD, DRIVER].sort(), "MQ-07 (Bán hàng, tài xế) + tin đơn đổi (HDV); không Quản trị (người sửa), Kế toán, tài xế khác, Đối tác");
    // Lệnh SAU của cùng người trên cùng đơn, cũng báo "chuyen" nhưng KHÔNG ghi dòng đổi (đặt gấp lại — nhật ký order_leg_short_notice): không gõ cửa lại tin cũ.
    // Đồng hồ giả đứng yên giữa các request → tiến 1 phút (thật: mỗi request một mốc khác) — cố ý vẫn trong 2 phút để bài bắt cách "đọc dòng đổi trong cửa sổ thời gian".
    denGio("06:11");
    const legA = (await donXem(w, a.don.id)).services[0].legs[0].id;
    const g = await w.call("POST", `/api/orders/${a.don.id}/legs/${legA}/short-notice`, { as: ADM, body: { lyDo: "KHAC" } });
    assert.equal(g.status, 200, g.text);
    assert.deepEqual(await nguoiDuocGo(), [], "Quản trị đặt gấp ngay sau khi sửa chặng → không gõ cửa lại tin sửa chặng");

    await suaChang(w, SALES, p.id, { pickupTime: "13:30" });
    assert.deepEqual(await nguoiDuocGo(), [PARTNER, DRIVER].sort(), "Đối tác người lập (tin đơn đổi) + tài xế (MQ-07); không Bán hàng (người sửa)");

    const n = await donXem(w, nhap.json.order.id);
    const x = await w.call("PUT", `/api/orders/${n.id}/trip`, { as: SALES, body: { expectedUpdatedAt: n.updatedAt, services: [{ id: n.services[0].id, departDate: NGAY, departTime: "08:00", checkinDate: "", checkinTime: "", checkinPlace: "", note: "" }] } });
    assert.equal(x.status, 200, x.text);
    assert.deepEqual(await nguoiDuocGo(), [], "NT-B14: đơn NHÁP sửa chuyến → không gõ cửa ai");

    const sv = (await donXem(w, a.don.id)).services[0].id;
    const sua = (adult: number) => w.call("POST", `/api/orders/${a.don.id}/handler-money-edit`, { as: FIELD, body: { reason: "Khách báo thêm", services: [{ id: sv, pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
    const s1 = await sua(3);
    assert.equal(s1.status, 200, s1.text);
    // ADR-0104 Đ2.10 (NỚI có tên N7 — danh sách hành động sinh tin rộng hơn): số khách tăng 2 → 3 ⇒ máy đồng bộ mở thêm một suất trên chuyến của DRIVER
    // (khúc `trip_order_synced`) ⇒ tài xế đang lái cũng được gõ cửa (tin "khach_doi"); HDV (người sửa) vẫn không.
    assert.deepEqual(await nguoiDuocGo(), [SALES, DRIVER].sort(), "HDV sửa số khách → người lập (tin đơn đổi) + tài xế đang lái (máy đồng bộ chuyến)");
    denGio("06:12");
    const thu = await w.call("POST", `/api/orders/${a.don.id}/payments`, { as: FIELD, body: { soTien: 200000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
    assert.equal(thu.status, 201, thu.text);
    assert.deepEqual(await nguoiDuocGo(), [], "HDV ghi lần thu (báo \"tien\", không dòng đổi) ngay sau khi sửa số khách → không gõ cửa lại tin số khách");
    const s2 = await sua(3);
    assert.equal(s2.status, 200, s2.text);
    assert.deepEqual(await nguoiDuocGo(), [], "số khách y nguyên → không dòng nhật ký → không gõ cửa");
    // Hai người trên cùng đơn trong CÙNG mốc (đồng hồ giả đứng yên — thật: hai request chồng nhau): lệnh không ghi dòng đổi của người này không gõ cửa
    // dòng đổi của người kia (câu doi_vua_ghi lọc đúng người làm).
    await suaChang(w, ADM, a.don.id, { pickupTime: "14:00" }, { lyDo: "KHAC" }); // giờ cũ 12:00 dưới mốc → cần lý do (dấu bỏ vì 14:00 ngoài mốc)
    assert.deepEqual(await nguoiDuocGo(), [SALES, FIELD, DRIVER].sort(), "Quản trị sửa chặng lần nữa → như trên");
    const thu2 = await w.call("POST", `/api/orders/${a.don.id}/payments`, { as: FIELD, body: { soTien: 100000, hinhThuc: "CASH", nguoiThu: "cong_ty" } });
    assert.equal(thu2.status, 201, thu2.text);
    assert.deepEqual(await nguoiDuocGo(), [], "HDV ghi lần thu cùng mốc với dòng đổi của Quản trị → không gõ cửa dòng của người khác");
  } finally {
    globalThis.fetch = fetchGoc;
    tat();
  }
});

// ---- G17 (sổ thi công 2026-10-08 mục G17; kế hoạch docs/superpowers/plans/2026-10-09-g17-bao-tai-xe-doi-ngay.md): "Sửa thông tin chuyến" (`PUT /trip`, thân MỚI
// — không khoá giờ / nơi đón) dời NGÀY ĐI của đơn có chặng đã xếp ⇒ MQ-07 như sửa chặng: tài xế đang lái được báo, người lập đúng một tin, người sửa không.
/** `PUT /trip` thân mới: mọi dịch vụ dời sang `ngay`, giữ các trường khác. */
async function doiNgayDi(w: any, as: string, orderId: string, ngay: string) {
  const o = await donXem(w, orderId);
  const r = await w.call("PUT", `/api/orders/${orderId}/trip`, {
    as,
    body: {
      expectedUpdatedAt: o.updatedAt,
      services: o.services.map((s: any) => ({
        id: s.id, departDate: ngay, departTime: s.departTime ?? "", checkinDate: s.checkinDate ?? "", checkinTime: s.checkinTime ?? "", checkinPlace: s.checkinPlace ?? "", note: s.note ?? "",
      })),
    },
  });
  assert.equal(r.status, 200, r.text);
}

test("G17 hộp thư: Quản trị dời ngày đi (PUT /trip) của đơn có chặng ĐÃ XẾP → tài xế đang lái nhận 'đổi giờ đón'; tài xế khác không; người lập (Bán hàng) ĐÚNG MỘT tin 'gọi báo khách'; HDV phụ trách tin đơn đổi; người sửa không", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w); // Bán hàng lập, chặng 13:00 ngày NGAY xếp lên chuyến của DRIVER
    assert.equal((await w.call("PUT", `/api/orders/${a.don.id}/handler`, { as: SALES, body: { staffId: FIELD } })).status, 200);
    denGio("06:10");
    await doiNgayDi(w, ADM, a.don.id, NGAY_SAU);

    const tx = await gioHenCua(w, DRIVER);
    assert.deepEqual(tx.map((x) => [x.cau, x.lienKet]), [[`Văn phòng vừa đổi giờ đón ở chuyến ${a.ma} ngày 11/03 — mở để xem`, `/cuoc-chuyen?id=${a.id}`]]);
    assert.deepEqual(await gioHenCua(w, DRIVER2, "tat-ca"), [], "tài xế không lái chuyến này");
    for (const ngan of ["cua-toi", "tat-ca"] as const) {
      const cuaBan = (await hopCua(w, SALES, ngan)).filter((x) => x.cau.includes(a.don.code));
      assert.deepEqual(cuaBan.map((x) => [x.loai, x.cau]), [["chuyen", `Đơn ${a.don.code}: giờ hẹn đổi ở chuyến ${a.ma} ngày 11/03 — gọi báo khách`]], ngan);
    }
    const hdv = await doiCua(w, FIELD);
    assert.equal(hdv.length, 1, JSON.stringify(hdv));
    assert.match(hdv[0]!.cau, /Chiều đi: ngày đón 11\/03\/2027 → 12\/03\/2027/);
    assert.deepEqual([...(await gioHenCua(w, ADM, "tat-ca")), ...(await doiCua(w, ADM, "tat-ca"))], [], "người sửa không nhận");
    for (const as of [DRIVER, SALES, FIELD]) assert.ok(!/Khách|Dò Tìm|0912345678/.test(JSON.stringify(await hopCua(w, as, "tat-ca"))), as);
  } finally {
    tat();
  }
});

test("G17 màn hình khoá: MỘT lệnh PUT /trip dời ngày đơn có HAI chặng trên HAI chuyến (DRIVER, DRIVER2) → gõ cửa CẢ HAI tài xế + người lập; không người sửa, Kế toán", async () => {
  const tat = batDongHo();
  const fetchGoc = globalThis.fetch;
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 }); // Bán hàng lập, chiều đi 13:00 ngày NGAY
    const o = await donXem(w, d.id);
    const ve = await w.call("POST", `/api/orders/${d.id}/legs`, {
      as: ADM,
      body: { expectedUpdatedAt: o.updatedAt, serviceId: o.services[0].id, leg: { direction: "RETURN", pickupDate: NGAY, pickupTime: "17:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm" } },
    });
    assert.equal(ve.status, 201, ve.text);
    const veId = ve.json.order.services[0].legs.find((l: any) => l.direction === "RETURN").id;
    const c1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    await xepHet(w, c1, d, 2);
    const c2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "16:30", kt: "19:00" });
    await xepHet(w, c2, { legId: veId }, 2);
    await w.choNen();
    await batGoCua(w, [SALES, ADM, ACC, DRIVER, DRIVER2]);
    const goi: string[] = [];
    globalThis.fetch = (async (u: unknown) => (goi.push(String(u)), new Response(null, { status: 201 }))) as typeof fetch;
    denGio("06:10");
    await doiNgayDi(w, ADM, d.id, NGAY_SAU);
    await w.choNen();
    assert.deepEqual(goi.map((u) => u.split("/").pop()!).sort(), [SALES, DRIVER, DRIVER2].sort(), "hai tài xế (MQ-07 mỗi chặng) + người lập; không Quản trị (người sửa), Kế toán");
  } finally {
    globalThis.fetch = fetchGoc;
    tat();
  }
});

test("G17 (phiếu kiểm T1) gõ cửa chỉ theo LÔ MỚI NHẤT: hai PUT /trip chồng mốc của cùng người (đồng hồ giả ĐỨNG YÊN — lô trước có mốc ≥ batDau của lệnh sau) — lệnh sau chỉ đổi ghi chú → không gõ cửa lại tin dời ngày của lô trước", async () => {
  const tat = batDongHo();
  const fetchGoc = globalThis.fetch;
  try {
    const w = setup();
    const a = await chuyenSan(w); // Bán hàng lập, chặng 13:00 xếp lên chuyến của DRIVER
    await w.choNen();
    await batGoCua(w, [SALES, ADM, DRIVER]);
    const goi: string[] = [];
    globalThis.fetch = (async (u: unknown) => (goi.push(String(u)), new Response(null, { status: 201 }))) as typeof fetch;
    const nguoiDuocGo = async () => { await w.choNen(); const r = goi.map((u) => u.split("/").pop()!).sort(); goi.length = 0; return r; };
    denGio("06:10");
    await doiNgayDi(w, ADM, a.don.id, NGAY_SAU);
    assert.deepEqual(await nguoiDuocGo(), [SALES, DRIVER].sort(), "lệnh 1 (dời ngày): người lập + tài xế");
    // Lệnh 2 cùng người, cùng mốc đồng hồ (thật: hai tab chồng nhau) — mốc ghi của lệnh 2 = mốc lệnh 1 + 1 ms, batDau của lệnh 2 = mốc lệnh 1.
    const o = await donXem(w, a.don.id);
    const r = await w.call("PUT", `/api/orders/${a.don.id}/trip`, {
      as: ADM, body: { expectedUpdatedAt: o.updatedAt, services: o.services.map((s: any) => ({ id: s.id, departDate: s.departDate, departTime: s.departTime ?? "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "Ghi chú mới" })) },
    });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(await nguoiDuocGo(), [], "lệnh 2 chỉ đổi ghi chú (không tin) → không gõ cửa lại lô dời ngày của lệnh 1");
  } finally {
    globalThis.fetch = fetchGoc;
    tat();
  }
});
