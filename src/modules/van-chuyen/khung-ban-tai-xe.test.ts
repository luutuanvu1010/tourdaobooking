// LC-03 XÉT KHUNG BẬN CỦA TÀI XẾ ở lớp máy chủ (ADR-0053 D9 B9.3; kế hoạch A4 T4, G-A4-8, G-A4-9, NT-8 vế "văn phòng xếp tài xế vào khung bận"). Khung gieo
// bằng SQL (route Báo bận ở T8). Mọi ca: 409 có mã TRUNG_GIO_TAI_XE, câu "<Tên> bận từ … đến …. Chọn tài xế khác hoặc đổi giờ chuyến." — KHÔNG lý do bận (lời chủ
// 6.2), không rơi xuống trigger (`trip_rule`). Đồng hồ giả NOW_GIA (không đường Từ chối — §2 "Luật đồng hồ").
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, NGAY, SALES, batDongHo, setup, taoChuyen, uuid, vnMs, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const AT = "2027-03-10T00:00:00.000Z";
/** Khung bận của tài xế `partyId` (SQL thẳng — chưa có route ở T4), lý do "Ốm" (BTX_OM). */
const khungTaiXe = (w: any, partyId: string, tu: string, den: string, ngay = NGAY): string => {
  const id = uuid();
  const a = vnMs(ngay, tu), b = vnMs(ngay, den);
  w.sqlite.prepare(`INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
    VALUES (?, 'DRIVER', NULL, ?, ?, ?, ?, ?, 'BTX_OM', ?, NULL, ?, NULL)`).run(id, partyId, a, b, new Date(a).toISOString(), new Date(b).toISOString(), AT, AT);
  return id;
};
const taoTho = (w: any, x: string, taiXe: string, bd: string, kt: string) =>
  w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: { requestId: uuid(), xeId: x, taiXePartyId: taiXe, batDau: { ngay: NGAY, gio: bd }, ketThuc: { ngay: NGAY, gio: kt } } });
const CAU = /^Tài xế trùng giờ với chuyến khác: Tài Xế Một bận từ 08:00 11\/03 đến 17:00 11\/03\. Chọn tài xế khác hoặc đổi giờ chuyến\.$/;
const chanDungCau = (r: any) => {
  assert.equal(r.status, 409, r.text);
  assert.notEqual(r.json.error.code, "trip_rule", "lớp máy chủ nói trước — không rơi xuống trigger B9.3");
  const l = r.json.error.lyDo.find((x: { ma: string }) => x.ma === "TRUNG_GIO_TAI_XE");
  assert.ok(l, r.text);
  assert.match(l.loiNhan, CAU);
  assert.doesNotMatch(r.text, /Ốm|BTX_/, "không lộ lý do bận (lời chủ 6.2)");
};

test("A4 T4 NT-8: Bán hàng TẠO chuyến với tài xế đang có khung bận → 409 TRUNG_GIO_TAI_XE, câu không lý do; không ghi chuyến; khung rút rồi → tạo được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const k = khungTaiXe(w, `pty-${DRIVER}`, "08:00", "17:00");
    const n0 = w.q("SELECT count(*) n FROM vc_trip")[0].n;
    chanDungCau(await taoTho(w, xe(w), `pty-${DRIVER}`, "09:00", "10:00"));
    assert.equal(w.q("SELECT count(*) n FROM vc_trip")[0].n, n0, "không ghi");
    // Tài xế khác cùng giờ → được (khung theo người).
    assert.equal((await taoTho(w, xe(w), `pty-${DRIVER2}`, "09:00", "10:00")).status, 201);
    w.sqlite.prepare("UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 'x', version = version + 1 WHERE id = ?").run(AT, k);
    assert.equal((await taoTho(w, xe(w), `pty-${DRIVER}`, "09:00", "10:00")).status, 201, "khung đã rút không chặn");
  } finally { tat(); }
});

test("A4 T4 NT-8: SỬA chuyến — dời giờ vào khung bận của tài xế, đổi sang tài xế đang bận → 409 TRUNG_GIO_TAI_XE, câu không lý do", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    khungTaiXe(w, `pty-${DRIVER}`, "08:00", "17:00");
    const c = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "17:30", kt: "18:30" });
    chanDungCau(await w.call("PUT", `/api/van-chuyen/chuyen/${c.chuyen.id}`, {
      as: SALES, body: { version: c.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "16:00" }, ketThuc: { ngay: NGAY, gio: "18:30" } },
    }));
    const c2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}`, bd: "09:00", kt: "10:00" });
    chanDungCau(await w.call("PUT", `/api/van-chuyen/chuyen/${c2.chuyen.id}`, { as: SALES, body: { version: c2.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER}` } }));
  } finally { tat(); }
});

test("A4 T4 G-A4-8: mọi câu ĐỌC của khung-ban-tai-xe-repo.ts lọc subject = 'DRIVER' tường minh và không đọc nhãn lý do ở câu dùng cho văn phòng; lịch chung (dieu-phoi-lenh.ts) không đọc khung tài xế", () => {
  const src = readFileSync(new URL("./khung-ban-tai-xe-repo.ts", import.meta.url), "utf8");
  const cau = [...src.matchAll(/defineSql\("van-chuyen", "([a-z_]+)",\s*`([^`]+)`/g)];
  assert.ok(cau.length >= 1, `chỉ thấy ${cau.length} câu`);
  for (const [, ten, sql] of cau) {
    if (/^\s*(INSERT|UPDATE)/i.test(sql!)) continue;
    assert.match(sql!, /subject = 'DRIVER'/, ten);
    if (ten !== "khung_tai_xe_cua_toi") assert.doesNotMatch(sql!, /reason|vc_reason/, `${ten}: câu cho văn phòng / LC-03 không đọc lý do (lời chủ 6.2)`);
  }
  const lenh = readFileSync(new URL("./dieu-phoi-lenh.ts", import.meta.url), "utf8");
  const i = lenh.indexOf("export async function dungLichNgay");
  assert.ok(i >= 0, "không thấy dungLichNgay — đổi tên thì sửa bài này");
  assert.doesNotMatch(lenh.slice(i), /khungTaiXe|khung-ban-tai-xe-repo/, "lịch chung (trip.view — Kế toán) không nhận khung tài xế (ADR-0053 :147)");
});
