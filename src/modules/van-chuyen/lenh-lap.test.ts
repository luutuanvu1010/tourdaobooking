// C38 — luật "lệnh lặp" (LC-11) ở lớp hàm: `khopLenhLap` (thuần) và đường CHẠY LÔ `chayLo` khi lô thua cổng / đụng UNIQUE request_id (lần gửi đồng thời —
// khung thử router chạy tuần tự nên ca đồng thời thật chỉ dựng được ở đây, bằng D1 giả). Lô mang khoá sự kiện ở câu `SU_KIEN` (`CauCoNhan.suKien`); sự kiện
// đã có cùng request_id phải khớp chuyến + loại + suất / điểm, lệch ⇒ 409 `request_id_reused`. Tệp import không đuôi ⇒ gói bằng esbuild (khuôn
// dieu-phoi-route.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const built = await esbuild.build({ entryPoints: [new URL("./dieu-phoi-route.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const r = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as any;

const ev = (o: Partial<{ trip_id: string; related_trip_id: string | null; kind: string; stop_id: string | null; allocation_id: string | null }> = {}) => ({
  id: "e-1", trip_id: "t-1", related_trip_id: null, kind: "PASSENGER_BOARDED", stop_id: "d-1", allocation_id: "s-1", ...o,
});

test("khopLenhLap: đúng CẶP chuyến (trip_id, related_trip_id), đúng loại, đúng suất / điểm khi lệnh nhắm; tripId null (lệnh tạo) không so chuyến", () => {
  const k = { tripId: "t-1", loai: ["PASSENGER_BOARDED"], suatId: "s-1" };
  assert.equal(r.khopLenhLap(ev(), k), true);
  assert.equal(r.khopLenhLap(ev({ trip_id: "t-2" }), k), false, "khác chuyến");
  assert.equal(r.khopLenhLap(ev({ trip_id: "t-2", related_trip_id: "t-1" }), k), false, "chuyến của lệnh chỉ nằm ở related_trip_id ⇒ lệch");
  // Lệnh dời P→Q: sự kiện ghi ở Q (trip_id), nguồn P (related_trip_id) — chỉ đúng cặp mới khớp.
  const doi = { tripId: "t-q", nguonId: "t-p", loai: ["ALLOCATION_MOVED"] };
  const evDoi = (trip_id: string, related_trip_id: string) => ev({ kind: "ALLOCATION_MOVED", trip_id, related_trip_id, stop_id: null, allocation_id: null });
  assert.equal(r.khopLenhLap(evDoi("t-q", "t-p"), doi), true, "dời P→Q lặp");
  assert.equal(r.khopLenhLap(evDoi("t-p", "t-q"), doi), false, "sự kiện của dời ngược Q→P");
  assert.equal(r.khopLenhLap(evDoi("t-q", "t-z"), doi), false, "cùng đích, khác nguồn");
  assert.equal(r.khopLenhLap(evDoi("t-z", "t-p"), doi), false, "cùng nguồn, khác đích");
  assert.equal(r.khopLenhLap(ev({ kind: "PASSENGER_NO_SHOW" }), k), false, "khác loại");
  assert.equal(r.khopLenhLap(ev({ allocation_id: "s-2" }), k), false, "cùng loại, khác suất");
  assert.equal(r.khopLenhLap(ev({ allocation_id: "s-2" }), { tripId: "t-1", loai: ["PASSENGER_BOARDED"] }), true, "lệnh không nhắm suất: không so suất");
  assert.equal(r.khopLenhLap(ev({ kind: "STOP_ARRIVED", stop_id: "d-2" }), { tripId: "t-1", loai: ["STOP_ARRIVED"], diemId: "d-1" }), false, "khác điểm");
  assert.equal(r.khopLenhLap(ev({ kind: "CREATED", trip_id: "t-9" }), { tripId: null, loai: ["CREATED"] }), true);
  assert.equal(r.khopLenhLap(ev({ kind: "UPDATED", trip_id: "t-9" }), { tripId: null, loai: ["CREATED"] }), false);
});

/** D1 giả: `batch` chạy hàm cho trước; mọi câu đọc (`eventByRequest`) trả `suKienCo`. */
const db = (batch: () => Promise<unknown[]>, suKienCo: unknown) =>
  ({ batch, prepare: () => ({ bind: () => ({ first: async () => suKienCo }) }) }) as any;
const UNIQUE = async () => {
  throw new Error("D1_ERROR: UNIQUE constraint failed: vc_trip_event.request_id: SQLITE_CONSTRAINT");
};
const thuaCong = async () => [{ meta: { changes: 0 } }];
/** Lô "đã đón suất s-1 của chuyến t-1" (khoá sự kiện như `suKienTienDo` dựng). */
const loDon = [
  { nhan: "CHUYEN_TIEN_DO", stmt: {} },
  { nhan: "CONG", stmt: {} },
  { nhan: "SU_KIEN", stmt: {}, suKien: { tripId: "t-1", relatedTripId: null, loai: "PASSENGER_BOARDED", stopId: "d-1", allocationId: "s-1" } },
];
const ma = async (kq: any) => (kq.ok ? "ok" : `${kq.res.status} ${(await kq.res.json()).error.code}`);

test("chayLo — đụng UNIQUE request_id (lần gửi đồng thời đã thắng): sự kiện của CHÍNH lệnh này ⇒ ok; của lệnh khác (loại / suất / chuyến) ⇒ 409 request_id_reused", async () => {
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev()), loDon, "rid")), "ok");
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev({ kind: "PASSENGER_NO_SHOW", allocation_id: "s-2" })), loDon, "rid")), "409 request_id_reused");
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev({ allocation_id: "s-2" })), loDon, "rid")), "409 request_id_reused");
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev({ trip_id: "t-2" })), loDon, "rid")), "409 request_id_reused");
});

test("chayLo — câu cổng thua: sự kiện khớp ⇒ ok (lặp); lệch ⇒ 409 request_id_reused; không có sự kiện ⇒ 409 stale như cũ", async () => {
  assert.equal(await ma(await r.chayLo(db(thuaCong, ev()), loDon, "rid")), "ok");
  assert.equal(await ma(await r.chayLo(db(thuaCong, ev({ kind: "ENDED", stop_id: null, allocation_id: null })), loDon, "rid")), "409 request_id_reused");
  assert.equal(await ma(await r.chayLo(db(thuaCong, null), loDon, "rid")), "409 stale");
});

test("chayLo — lệnh tạo chuyến không so chuyến (id chuyến mới sinh riêng mỗi request); lệnh dời khớp chuyến đích của chính lô", async () => {
  const loTao = [{ nhan: "CONG", stmt: {} }, { nhan: "SU_KIEN", stmt: {}, suKien: { tripId: "t-moi", relatedTripId: null, loai: "CREATED", stopId: null, allocationId: null } }];
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev({ kind: "CREATED", trip_id: "t-khac", stop_id: null, allocation_id: null })), loTao, "rid")), "ok");
  assert.equal(await ma(await r.chayLo(db(UNIQUE, ev({ kind: "UPDATED", trip_id: "t-khac", stop_id: null, allocation_id: null })), loTao, "rid")), "409 request_id_reused");
  const loDoi = [
    { nhan: "CONG", stmt: {} }, { nhan: "CONG_DOI", stmt: {} },
    { nhan: "SU_KIEN", stmt: {}, suKien: { tripId: "t-dich", relatedTripId: "t-nguon", loai: "ALLOCATION_MOVED", stopId: null, allocationId: null } },
  ];
  const evDoi = ev({ kind: "ALLOCATION_MOVED", trip_id: "t-dich", related_trip_id: "t-nguon", stop_id: null, allocation_id: null });
  assert.equal(await ma(await r.chayLo(db(thuaCong, evDoi), loDoi, "rid", 2)), "ok");
});
