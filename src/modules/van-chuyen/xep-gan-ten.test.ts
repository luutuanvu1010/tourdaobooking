// I19(a) — MÁY TỰ GẮN TÊN LÚC XẾP (làm bù theo kiểm độc lập K2c VỪA-1; kế hoạch I19 / T-1 R-P3: "(a) lúc xếp — người có tên trong thân (`personKeys`) được gắn
// ngay; không chọn thì máy chọn theo thứ tự `personKey`"). MỘT luật "khoá người rảnh" với lúc xuất bến (I19b — `khoaNguoiRanh`, src/shared/dieu-phoi-kiem.ts).
// Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs). Tên khách GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { DRIVER, DRIVER2, NGAY, SALES, batDongHo, chiTiet, denGio, don, setup, taoChuyen, tienDo, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

/** Khoá người hiện hành của đơn (sắp) — nguồn thật của `nguoiCuaDon`. */
const khoaCuaDon = (w: any, orderId: string): string[] =>
  w.q(`SELECT p.person_key k FROM ord_passenger p WHERE p.order_id = ? AND p.voided_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM ord_passenger n WHERE n.previous_id = p.id AND n.voided_at IS NULL) ORDER BY p.person_key`, orderId).map((r: any) => r.k);
/** Khoá người của các suất khách MỞ của chặng trên chuyến, theo thứ tự mở (rowid). */
const khoaSuat = (w: any, tripId: string, legId: string): (string | null)[] =>
  w.q("SELECT passenger_key k FROM vc_trip_allocation WHERE trip_id = ? AND leg_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER' ORDER BY rowid", tripId, legId).map((r: any) => r.k);
async function xep(w: any, tripId: string, legId: string, soSuat: number, personKeys?: string[], requestId = uuid()) {
  const c = await chiTiet(w, tripId);
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, {
    as: SALES, body: { version: c.chuyen.version, requestId, chang: [{ legId, soSuat, ...(personKeys ? { personKeys } : {}) }] },
  });
}

test("I19(a): đơn đủ tên, xếp KHÔNG gửi personKeys → mọi suất có tên, theo thứ tự khoá người; phản hồi không tên (GA-55)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const r = await xep(w, t.chuyen.id, d.legId, 3);
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), khoaCuaDon(w, d.id), "đúng thứ tự khoá người");
    assert.ok(r.json.suat.every((s: any) => s.coTen === true), "mọi suất có tên");
    assert.ok(!/Khách Dò Tìm|"hoTen"|"namSinh"|"lienHe"/.test(r.text), "phản hồi xếp không kèm tên (GA-55)");
  } finally {
    tat();
  }
});

test("I19(a): đơn THIẾU tên (3 khách, 1 tên) → một suất có tên, phần thiếu null; giữ THIEU_TEN (GA-9) vẫn đúng", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3, ten: 1 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    assert.equal((await xep(w, t.chuyen.id, d.legId, 3)).status, 200);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), [...khoaCuaDon(w, d.id), null, null]);
    const c = await chiTiet(w, t.chuyen.id);
    assert.ok(c.chuyen.lyDoGiu.some((l: any) => l.ma === "THIEU_TEN"), `giữ THIEU_TEN — ${JSON.stringify(c.chuyen.lyDoGiu)}`);
  } finally {
    tat();
  }
});

test("I19(a): gửi personKeys MỘT PHẦN → khoá gửi đứng trước, phần còn lại lấp khoá rảnh (không lặp)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3 });
    const k = khoaCuaDon(w, d.id);
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    assert.equal((await xep(w, t.chuyen.id, d.legId, 3, [k[2]!])).status, 200);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), [k[2], k[0], k[1]]);
    // Khoá gửi nằm ĐẦU danh sách rảnh → phần lấp không lặp nó (chuyến thứ hai, đơn khác).
    const d2 = await don(w, { soNguoi: 3 });
    const k2 = khoaCuaDon(w, d2.id);
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    assert.equal((await xep(w, t2.chuyen.id, d2.legId, 3, [k2[0]!])).status, 200);
    assert.deepEqual(khoaSuat(w, t2.chuyen.id, d2.legId), [k2[0], k2[1], k2[2]]);
  } finally {
    tat();
  }
});

test("I19(a): chặng đã có suất MỞ mang tên A (chuyến khác) → lần xếp thêm KHÔNG dùng lại A; rút suất có tên rồi xếp lại → tên dùng lại được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3 });
    const k = khoaCuaDon(w, d.id);
    const t1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    assert.equal((await xep(w, t1.chuyen.id, d.legId, 1)).status, 200);
    assert.deepEqual(khoaSuat(w, t1.chuyen.id, d.legId), [k[0]], "chuyến 1 nhận khoá đầu");
    assert.equal((await xep(w, t2.chuyen.id, d.legId, 2)).status, 200);
    assert.deepEqual(khoaSuat(w, t2.chuyen.id, d.legId), [k[1], k[2]], "chuyến 2 không dùng lại khoá đang mở ở chuyến 1");
    // Rút suất của chuyến 1 (khoá k0) → xếp lại vào chuyến 1 → k0 dùng lại được.
    const c1 = await chiTiet(w, t1.chuyen.id);
    const rut = await w.call("POST", `/api/van-chuyen/chuyen/${t1.chuyen.id}/rut`, { as: SALES, body: { version: c1.chuyen.version, requestId: uuid(), suatIds: c1.suat.map((s: any) => s.id) } });
    assert.equal(rut.status, 200, rut.text);
    assert.equal((await xep(w, t1.chuyen.id, d.legId, 1)).status, 200);
    assert.deepEqual(khoaSuat(w, t1.chuyen.id, d.legId), [k[0]], "tên của suất đã rút dùng lại được");
  } finally {
    tat();
  }
});

test("I19(a): lệnh lặp cùng requestId → 200, không mở suất / gắn tên thêm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const rid = uuid();
    assert.equal((await xep(w, t.chuyen.id, d.legId, 2, undefined, rid)).status, 200);
    const truoc = khoaSuat(w, t.chuyen.id, d.legId);
    const lap = await xep(w, t.chuyen.id, d.legId, 2, undefined, rid);
    assert.equal(lap.status, 200, lap.text);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId), truoc, "không thêm suất, không đổi tên");
    assert.equal(truoc.length, 2);
  } finally {
    tat();
  }
});

test("I19(b) vẫn đúng: đơn thiếu tên lúc xếp → thêm tên SAU khi xếp → xuất bến gắn tên còn thiếu trong cùng lô (một luật khoá rảnh)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2, ten: 1 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    assert.equal((await xep(w, t.chuyen.id, d.legId, 2)).status, 200);
    assert.deepEqual(khoaSuat(w, t.chuyen.id, d.legId).filter((x) => x === null).length, 1, "một suất chưa tên sau xếp");
    // Văn phòng bổ sung tên thứ hai cho đơn.
    const ds = (await w.call("GET", `/api/orders/${d.id}/passengers`, { as: SALES })).json;
    const them = await w.call("POST", `/api/orders/${d.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Bổ Sung", birthYear: 1985, paxCode: "adult" }], sua: [], huy: [] } });
    assert.equal(them.status, 200, them.text);
    denGio("12:40");
    const x = await tienDo(w, "tai-xe", t.chuyen.id, "xuat-ben");
    assert.equal(x.status, 200, x.text);
    assert.deepEqual([...khoaSuat(w, t.chuyen.id, d.legId)].sort(), khoaCuaDon(w, d.id), "xuất bến gắn khoá còn thiếu — mọi suất có tên");
  } finally {
    tat();
  }
});

test("I19(a) \"chưa bị chính lô này dùng\": một chặng chỉ được xuất hiện MỘT lần trong thân xếp (400) — trong một chặng, khoá không lặp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 3 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const c = await chiTiet(w, t.chuyen.id);
    const r = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/phan-bo`, {
      as: SALES, body: { version: c.chuyen.version, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 1 }, { legId: d.legId, soSuat: 1 }] },
    });
    assert.equal(r.status, 400, r.text);
    assert.match(r.json.error.message, /Một chặng xuất hiện hai lần/);
    assert.equal((await xep(w, t.chuyen.id, d.legId, 3)).status, 200);
    const k = khoaSuat(w, t.chuyen.id, d.legId);
    assert.equal(new Set(k).size, 3, "ba khoá khác nhau");
  } finally {
    tat();
  }
});

void NGAY;
