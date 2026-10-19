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
    assert.match(r.json.error.message, /Một lượt đưa đón xuất hiện hai lần/);
    assert.equal((await xep(w, t.chuyen.id, d.legId, 3)).status, 200);
    const k = khoaSuat(w, t.chuyen.id, d.legId);
    assert.equal(new Set(k).size, 3, "ba khoá khác nhau");
  } finally {
    tat();
  }
});

// K2d VỪA — ĐUA LC-01 trên HAI chuyến: hai lệnh xếp CÙNG một chặng vào hai chuyến khác nhau, đọc cùng trạng thái nên CÙNG chọn một khoá rảnh (I19a). Cổng
// `version` không chặn (hai chuyến khác nhau) — chỉ chỉ mục duy nhất `vc_trip_allocation_person_open_uq` (LC-01) chặn: lệnh sau 409 `trip_rule` câu tiếng Việt
// (không 500), lô của nó huỷ trọn, dữ liệu không trùng. Khung thử chạy yêu cầu gần như lần lượt (đo 30/9: hai lệnh song song vẫn ra hai khoá khác nhau), nên
// bài dựng ĐUA CHẮC CHẮN bằng một CHẶN ở `env.DB.batch`: lô thứ nhất chờ tới khi lô thứ hai cũng tới (cả hai đã đọc xong trạng thái cũ), rồi hai lô chạy lần
// lượt như D1 thật. Lệnh thua 409 chứng tỏ hai lệnh đã chọn CÙNG khoá (chọn khác khoá thì cả hai 200).
test("K2d VỪA — đua LC-01 hai chuyến: hai lệnh xếp cùng chặng, cùng khoá rảnh → một 200, một 409 trip_rule tiếng Việt; không suất trùng (chặng, khoá người)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2 });
    const k = khoaCuaDon(w, d.id);
    const t1 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    const t2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER2}` });
    const [v1, v2] = [(await chiTiet(w, t1.chuyen.id)).chuyen.version, (await chiTiet(w, t2.chuyen.id)).chuyen.version];
    const goc = w.env.DB.batch;
    const cho: (() => void)[] = [];
    let den = 0;
    w.env.DB.batch = async (stmts: unknown[]) => {
      den++;
      if (den === 1) await new Promise<void>((r) => cho.push(r));
      else cho.splice(0).forEach((f) => f());
      return goc(stmts);
    };
    const kq = await Promise.all([
      w.call("POST", `/api/van-chuyen/chuyen/${t1.chuyen.id}/phan-bo`, { as: SALES, body: { version: v1, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 1 }] } }),
      w.call("POST", `/api/van-chuyen/chuyen/${t2.chuyen.id}/phan-bo`, { as: SALES, body: { version: v2, requestId: uuid(), chang: [{ legId: d.legId, soSuat: 1 }] } }),
    ]);
    w.env.DB.batch = goc;
    assert.equal(den, 2, "chống bài rỗng: hai lô cùng tới chặn");
    assert.deepEqual(kq.map((r: any) => r.status).sort(), [200, 409], kq.map((r: any) => `${r.status} ${r.text.slice(0, 160)}`).join(" | "));
    const thua = kq.find((r: any) => r.status === 409)!;
    assert.equal(thua.json.error.code, "trip_rule");
    assert.match(thua.json.error.message, /Chuyến vừa thay đổi hoặc lệnh vi phạm luật chuyến xe/);
    const mo = w.q("SELECT passenger_key k FROM vc_trip_allocation WHERE leg_id = ? AND valid_to_at IS NULL", d.legId).map((r: any) => r.k);
    assert.deepEqual(mo, [k[0]], "đúng MỘT suất mở, mang khoá rảnh đầu (lệnh thua không để lại gì)");
    assert.equal(w.q("SELECT count(*) n FROM (SELECT leg_id, passenger_key FROM vc_trip_allocation WHERE valid_to_at IS NULL AND passenger_key IS NOT NULL GROUP BY 1, 2 HAVING count(*) > 1)")[0].n, 0);
    // Lệnh thua xếp lại (đọc lại) → nhận khoá rảnh kế tiếp.
    const tThua = kq[0]!.status === 409 ? t1 : t2;
    const lai = await xep(w, tThua.chuyen.id, d.legId, 1);
    assert.equal(lai.status, 200, lai.text);
    assert.deepEqual(khoaSuat(w, tThua.chuyen.id, d.legId), [k[1]]);
  } finally {
    tat();
  }
});

// K2d CAO (người kiểm độc lập K2d @1f8b498) — ĐÃ SỬA theo chủ lần 16 ("Giữ xe + nút cập nhật", R-P29). Điều BẮT BUỘC (ADR-0049 D2 "một hàm cho máy chủ và
// màn hình"): màn văn phòng (lý do giữ của GET chi tiết — `kiemXuatBen`) và lệnh xuất bến CÙNG một kết luận. Kịch bản: đơn 2 khách A, B → xếp (máy gắn A, B —
// I19a) → huỷ A khỏi đơn → thêm C → trước đây màn "đạt" mà lệnh 409 THIEU_TEN "tải lại"; nay CẢ HAI giữ KHACH_DA_DOI (gỡ bằng "Cập nhật khách theo đơn" —
// src/modules/van-chuyen/cap-nhat-khach.test.ts). Bài từng là `todo` (§10.33) — đã bỏ.
// ADR-0104 Đ2 (kế hoạch N9 — đổi cách DỰNG, không nới luật): sửa khách nay tự đồng bộ chuyến; bài cần TRẠNG THÁI GIỮ (lưới khi máy không nối được khúc chuyến)
// nên dựng thế giới không tiêm máy (`khongDongBoChuyen`).
test("K2d CAO: khách được gắn tên lúc xếp rồi bị huỷ khỏi đơn (thêm khách mới) → màn văn phòng và lệnh xuất bến CÙNG kết luận (không 'màn đạt, nút không')", async () => {
  const tat = batDongHo();
  try {
    const w = setup({ khongDongBoChuyen: true });
    const d = await don(w, { soNguoi: 2 });
    const t = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}` });
    assert.equal((await xep(w, t.chuyen.id, d.legId, 2)).status, 200);
    const [a] = khoaCuaDon(w, d.id);
    // Huỷ A khỏi đơn, thêm C (số khách giữ 2).
    let ds = (await w.call("GET", `/api/orders/${d.id}/passengers`, { as: SALES })).json;
    ds = (await w.call("POST", `/api/orders/${d.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [], sua: [], huy: [a] } })).json;
    const them = await w.call("POST", `/api/orders/${d.id}/passengers`, { as: SALES, body: { expectedUpdatedAt: ds.orderUpdatedAt, them: [{ fullName: "Khách Thay Thế", birthYear: 1980, paxCode: "adult" }], sua: [], huy: [] } });
    assert.equal(them.status, 200, them.text);
    denGio("12:40");
    const man = await chiTiet(w, t.chuyen.id);
    const lyDo = man.chuyen.lyDoGiu.map((l: any) => l.ma);
    const x = await tienDo(w, "van-phong", t.chuyen.id, "xuat-ben");
    assert.equal(lyDo.length === 0, x.status === 200, `màn: ${JSON.stringify(lyDo)} — lệnh xuất bến: ${x.status} ${x.text}`);
    assert.deepEqual(lyDo, ["KHACH_DA_DOI"], "màn giữ KHACH_DA_DOI (R-P29)");
    assert.deepEqual(x.json.error.lyDo.map((l: any) => l.ma), ["KHACH_DA_DOI"], "lệnh xuất bến giữ CÙNG lý do");
  } finally {
    tat();
  }
});

void NGAY;
