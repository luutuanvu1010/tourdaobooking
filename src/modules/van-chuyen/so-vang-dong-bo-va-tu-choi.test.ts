// SỔ VÀNG VẬN CHUYỂN — bài chạy THẬT cho bảy ca VC-14…VC-17 (đồng bộ chuyến theo đơn) và VC-21…VC-23 (báo bận); VC-19, VC-20 (từ chối) ở so-vang-tu-choi.test.ts vì luật đồng hồ.
// Nguồn đáp án: golden/van-chuyen/dieu-phoi-30-ca.json (chủ xác nhận 2026-10-16). Chạy CẢ ứng dụng trên SQLite thật, đúng số liệu của ca (4 khách bớt 2, xe 15 chỗ đã giữ 12…).
// Khác các bài NT-5 / A4 T7 / A4 T8 cùng thư mục ở chỗ: số liệu và câu hỏi lấy từ ca vàng, không từ kế hoạch thi công. Tên khách, SĐT, số giấy tờ GIẢ.
// LUẬT ĐỒNG HỒ (xem đầu tu-choi.test.ts): đường Từ chối thành công đi qua trigger so GIỜ THẬT của CSDL — nhóm VC-19/20 bật đồng hồ giả theo giờ thật và gieo chuyến ngày thật + 2.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  DRIVER, DRIVER_PARTNER, NGAY_SAU, SALES, batDongHo, chiTiet, chuyenSan, denGio, don, nhaXeKhung, setup, taoChuyen, uuid, xe, xeNhaXe, xepHet,
} from "../../../tests/audit/dieu-phoi-khung.mjs";

type W = any;
const DRIVER_PARTNER2 = "66666666-6666-4666-8666-666666666669";
const AT = "2026-09-01T00:00:00.000Z";
let so = 0;

// ───────────── Đồng bộ chuyến theo đơn (VC-14…17) ─────────────
const svcId = (w: W, orderId: string): string => w.q("SELECT id FROM order_service WHERE order_id = ?", orderId)[0].id;
const suaSoKhach = (w: W, orderId: string, adult: number) =>
  w.call("POST", `/api/orders/${orderId}/money-edit`, { as: SALES, body: { lyDo: "KHAC", services: [{ id: svcId(w, orderId), pax: { adult, child: 0, senior: 0, infant: 0 } }] } });
const huy = (w: W, orderId: string) => w.call("POST", `/api/orders/${orderId}/status`, { as: SALES, body: { status: "cancelled", lyDo: "KHACH_DOI_Y" } });
/** Suất khách CÒN MỞ của chặng trên chuyến. */
const moCua = (w: W, tripId: string, legId: string): { id: string; k: string | null }[] =>
  w.q("SELECT id, passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER' ORDER BY id", tripId, legId).map((r: any) => ({ ...r }));
const daDong = (w: W, tripId: string): string[] =>
  w.q("SELECT close_reason r FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NOT NULL ORDER BY id", tripId).map((r: any) => r.r);
const nhatKyDongBo = (w: W): { detail: string }[] => w.q("SELECT detail FROM audit_log WHERE action = 'trip_order_synced' ORDER BY rowid").map((r: any) => ({ ...r }));
/** Xe A 15 chỗ + chuyến 12:30 (đúng ví dụ của chủ); đơn `khac` người đã chiếm sẵn chỗ (đủ tên) và đơn thử `soNguoi` người, `ten` người có tên. Sau đó đồng hồ giả đến 12:15 (còn 15 phút < 30). */
async function chuyenXeA(khac: number, soNguoi: number, ten: number) {
  const w = setup();
  const t = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}` });
  if (khac > 0) await xepHet(w, t, await don(w, { soNguoi: khac, ten: khac }), khac);
  const d = await don(w, { soNguoi, ten });
  await xepHet(w, t, d, soNguoi);
  denGio("12:15");
  return { w, t, d };
}

test("VC-14 bớt khách khi xe sắp chạy: đơn 4 khách (2 có tên), bớt còn 2, còn 15 phút → máy tự TRẢ 2 ghế, không vướng khoá giờ, số chỗ đã xếp giảm đúng 2", async () => {
  const tat = batDongHo();
  try {
    const { w, t, d } = await chuyenXeA(0, 4, 2);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 4);
    const r = await suaSoKhach(w, d.id, 2);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    const mo = moCua(w, t.chuyen.id, d.legId);
    assert.equal(mo.length, 4 - 2, "giảm đúng 4 − 2 = 2 ghế");
    assert.ok(mo.every((s) => s.k !== null), "hai ghế bị trả là hai ghế chưa tên");
    assert.deepEqual(daDong(w, t.chuyen.id), ["REMOVED", "REMOVED"]);
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.equal(nk[0]!.detail, `${t.chuyen.ma}: máy cập nhật theo đơn — ${d.code} (bớt khách): trả 2 ghế`);
    assert.doesNotMatch(nk[0]!.detail, /Khách Dò Tìm/, "nhật ký không có tên khách");
  } finally {
    tat();
  }
});

test("VC-15 huỷ cả đơn: 4 ghế đang giữ → máy đóng cả 4 cùng lô với lệnh huỷ; không còn lý do giữ «đơn đã huỷ»; nhật ký không tên khách", async () => {
  const tat = batDongHo();
  try {
    const { w, t, d } = await chuyenXeA(0, 4, 4);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 4);
    const r = await huy(w, d.id);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.dongBoChuyen, { nhac: null, capNhatTay: false });
    assert.deepEqual(moCua(w, t.chuyen.id, d.legId), [], "không còn ghế mở");
    assert.deepEqual(daDong(w, t.chuyen.id), ["REMOVED", "REMOVED", "REMOVED", "REMOVED"]);
    assert.ok(!(await chiTiet(w, t.chuyen.id)).chuyen.lyDoGiu.some((l: any) => l.ma === "DON_DA_HUY"), "không giữ DON_DA_HUY");
    const nk = nhatKyDongBo(w);
    assert.equal(nk.length, 1);
    assert.match(nk[0]!.detail, /\(đơn huỷ\): trả 4 ghế$/);
    assert.doesNotMatch(nk[0]!.detail, /Khách Dò Tìm/);
  } finally {
    tat();
  }
});

test("VC-16 thêm khách, xe còn chỗ: xe 15 chỗ đã giữ 12, đơn 4 → 6 → máy thêm ĐÚNG 2 ghế trên đúng xe đó, cùng điểm đón; không thêm nhiều hơn số vừa tăng", async () => {
  const tat = batDongHo();
  try {
    const { w, t, d } = await chuyenXeA(8, 4, 2);
    const truoc = moCua(w, t.chuyen.id, d.legId);
    assert.equal(truoc.length, 4);
    const r = await suaSoKhach(w, d.id, 6);
    assert.equal(r.status, 200, r.text);
    assert.equal(moCua(w, t.chuyen.id, d.legId).length, 4 + (6 - 4), "thêm đúng 2");
    const diem = w.q("SELECT DISTINCT board_stop_id b, alight_stop_id a FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", t.chuyen.id, d.legId);
    assert.equal(diem.length, 1, "mọi ghế của chặng cùng một điểm lên / xuống");
    const tong = w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", t.chuyen.id)[0].n;
    assert.equal(tong, 12 + 2, "xe giữ 14 trên 15 chỗ");
    assert.equal(nhatKyDongBo(w)[0]!.detail, `${t.chuyen.ma}: máy cập nhật theo đơn — ${d.code} (thêm khách): thêm 2 ghế`);
  } finally {
    tat();
  }
});

// VC-17: chủ chốt 2026-10-16 «đơn vẫn lưu (tăng lên 6), xe giữ nguyên, báo người xếp xe» — tức máy KHÔNG tự thêm ghế nào khi xe không đủ chỗ cho cả phần tăng.
// Mã hiện hành (bài NT-5 «xe hết chỗ (LC-02)» ở dong-bo-chuyen-route.test.ts) mở phần CÒN CHỖ (ở đây 1 ghế) và giữ THIEU_SUAT cho phần còn lại: lệch ý chủ → ghi `todo`.
test("VC-17 thêm khách, xe hết chỗ: xe 15 chỗ đã giữ 14, đơn 4 → 6 cần 2 ghế, còn 1 → đơn VẪN LƯU; máy KHÔNG tự thêm ghế nào, xe giữ nguyên",
  { todo: "chủ muốn khác luật hiện hành: máy hôm nay mở phần còn chỗ (1 ghế); cần quyết định riêng" }, async () => {
    const tat = batDongHo();
    try {
      const { w, t, d } = await chuyenXeA(10, 4, 2);
      const r = await suaSoKhach(w, d.id, 6);
      assert.equal(r.status, 200, "đơn vẫn lưu");
      const dh = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order;
      assert.equal(dh.services[0].pax.adult, 6, "đơn đã lưu 6 khách");
      assert.equal(moCua(w, t.chuyen.id, d.legId).length, 4, "xe giữ nguyên, không tự thêm ghế nào");
    } finally {
      tat();
    }
  });

// ───────────── Dựng tài xế đối tác ─────────────
function laiChoNhaXe(w: W, staffId: string, carrierId: string) {
  so++;
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${staffId}`, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-sv-${so}`, `pty-${staffId}`, `79660000000${so}`, `79660000000${so}`, AT, AT);
}
function theGioiDoiTac(w: W) {
  seedStaff(w.sqlite, { id: DRIVER_PARTNER2, phone: "0900000036", name: "Tài Xế Đối Tác Hai", perms: ["DRIVER_PARTNER"] });
  const nx = nhaXeKhung(w, "Nhà xe Một");
  laiChoNhaXe(w, DRIVER_PARTNER, nx);
  laiChoNhaXe(w, DRIVER_PARTNER2, nx);
  return { nx, xe1: xeNhaXe(w, nx) };
}

// ───────────── Báo bận của tài xế đối tác (VC-21, VC-22, VC-23) ─────────────
const ghiBan = (w: W, batDau: [string, string], ketThuc: [string, string], as = DRIVER_PARTNER) =>
  w.call("POST", "/api/van-chuyen/ban", { as, body: { batDau: { ngay: batDau[0], gio: batDau[1] }, ketThuc: { ngay: ketThuc[0], gio: ketThuc[1] }, lyDo: "BTX_OM" } });
const rutBan = (w: W, id: string, version: number) => w.call("POST", `/api/van-chuyen/ban/${id}/rut`, { as: DRIVER_PARTNER, body: { version } });
const nhatKyBan = (w: W): string[] => w.q("SELECT action FROM audit_log WHERE action LIKE 'driver_unavailability_%' ORDER BY rowid").map((r: any) => r.action);
/** Văn phòng lập chuyến cho tài xế đối tác `DRIVER_PARTNER` ngày NGAY_SAU từ `bd` đến `kt`. */
const lapChuyen = (w: W, nx: string, bd: string, kt: string) =>
  w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: { requestId: uuid(), xeId: xeNhaXe(w, nx), taiXePartyId: `pty-${DRIVER_PARTNER}`, batDau: { ngay: NGAY_SAU, gio: bd }, ketThuc: { ngay: NGAY_SAU, gio: kt } } });

test("VC-21 báo bận trùng chuyến của chính mình: khung 08:00–10:00 chồng chuyến 07:30–09:00 (60 phút) → CHẶN, nói rõ chuyến chồng, không tạo khung", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { xe1 } = theGioiDoiTac(w);
    const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay: NGAY_SAU, bd: "07:30", kt: "09:00", gio: "07:45" });
    const r = await ghiBan(w, [NGAY_SAU, "08:00"], [NGAY_SAU, "10:00"]);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "khung_ban_chong_chuyen_tai_xe");
    assert.deepEqual(r.json.error.chuyen.map((c: any) => c.ma), [a.ma]);
    assert.match(r.json.error.chuyen[0].gio, /07:30 12\/03 → 09:00 12\/03/);
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/ban/cua-toi", { as: DRIVER_PARTNER })).json.khung, [], "không tạo khung bận");
    assert.deepEqual(nhatKyBan(w), []);
  } finally {
    tat();
  }
});

test("VC-22 văn phòng xếp tài xế vào khung bận: 14:00–16:00 nằm trọn trong 13:00–17:00 → CHẶN, câu báo không nêu lý do bận", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { nx } = theGioiDoiTac(w);
    assert.equal((await ghiBan(w, [NGAY_SAU, "13:00"], [NGAY_SAU, "17:00"])).status, 201);
    const c = await lapChuyen(w, nx, "14:00", "16:00");
    assert.equal(c.status, 409, c.text);
    assert.ok(c.json.error.lyDo.some((l: any) => l.ma === "TRUNG_GIO_TAI_XE" && /bận từ 13:00 12\/03 đến 17:00 12\/03/.test(l.loiNhan)), c.text);
    assert.doesNotMatch(c.text, /Ốm|BTX_/, "không nêu lý do bận của tài xế");
    // Nửa «chèn tay bằng SQL cũng bị cơ sở dữ liệu chặn»: chiều ngược (chèn khung chồng chuyến) đã có bài canh ở bao-ban-tai-xe.test.ts «chồng chuyến»; chiều này (chèn tay một chuyến vào khung) CHƯA có bài riêng.
  } finally {
    tat();
  }
});

test("VC-23 rút khung bận rồi xếp lại: rút thành công, đúng 1 dòng nhật ký rút; rút lần hai báo đã rút; sau đó xếp lại ĐƯỢC", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { nx } = theGioiDoiTac(w);
    const k = (await ghiBan(w, [NGAY_SAU, "13:00"], [NGAY_SAU, "17:00"])).json.khung[0];
    assert.equal((await lapChuyen(w, nx, "14:00", "16:00")).status, 409, "còn khung thì chặn");
    const r = await rutBan(w, k.id, k.version);
    assert.equal(r.status, 200, r.text);
    assert.equal(nhatKyBan(w).filter((a) => a === "driver_unavailability_withdrawn").length, 1);
    assert.equal((await rutBan(w, k.id, k.version + 1)).status, 409, "rút lần hai báo đã rút");
    assert.equal((await lapChuyen(w, nx, "14:00", "16:00")).status, 201, "rút khung xong thì xếp lại được");
  } finally {
    tat();
  }
});
