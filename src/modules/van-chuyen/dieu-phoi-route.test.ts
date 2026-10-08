// HT-01 (kiểm theo vai 2/10 — lộ trình 3/10 V1.2): dựng điểm từ chặng (`diemChoKhoa`, I40) rồi sắp lại (`sapLaiDiem`) — hai chặng cùng nơi trả phải ra
// [ĐÓN A, ĐÓN B, TRẢ], không phải [ĐÓN A, TRẢ, ĐÓN B]. Tệp import không đuôi ⇒ gói bằng esbuild rồi nạp (khuôn dieu-phoi-doc.test.ts).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const built = await esbuild.build({ entryPoints: [new URL("./dieu-phoi-route.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const r = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as any;

type Diem = { id: string; tripId: string; seq: number; loai: "PICKUP" | "DROPOFF"; placeKey: string };
const T = "t-1";
const BEN = "L:ben-tau";
const stop = (id: string, seq: number, kind: "PICKUP" | "DROPOFF", place_key: string, status = "PENDING") => ({
  id, trip_id: T, seq, kind, location_id: place_key.slice(2), place_text: null, place_key, location_name: null, location_address: null, planned_date: null, planned_time: null, status,
  arrived_at: null, done_at: null, skip_reason_code: null,
});
/** Mô phỏng vòng dựng điểm của `lenhXepLo`: mỗi chặng ĐÓN rồi TRẢ, rồi sắp lại theo suất còn mở sau lệnh. */
function xep(stops: any[], suatCu: { board: string; alight: string }[], chang: { don: string; tra: string }[]) {
  const moi: Diem[] = [];
  const suatMoi: { board: string; alight: string }[] = [];
  for (const c of chang) {
    const len = r.diemChoKhoa(stops, moi, T, "PICKUP", c.don, c.don.slice(2), null);
    const xuong = r.diemChoKhoa(stops, moi, T, "DROPOFF", c.tra, c.tra.slice(2), null);
    suatMoi.push({ board: len, alight: xuong });
  }
  const doi = r.sapLaiDiem(stops, moi, T, [...suatCu, ...suatMoi]) as { id: string; seq: number }[];
  const tat = [...stops.map((s: any) => ({ id: s.id, seq: doi.find((d) => d.id === s.id)?.seq ?? s.seq, loai: s.kind, key: s.place_key })), ...moi.map((d) => ({ id: d.id, seq: d.seq, loai: d.loai, key: d.placeKey }))];
  return { moi, doi, thuTu: tat.sort((a, b) => a.seq - b.seq).map((x) => `${x.loai === "PICKUP" ? "ĐÓN" : "TRẢ"} ${x.key}`), suatMoi };
}

test("HT-01 tái hiện: một lần xếp hai đoàn cùng xuống Bến tàu (Mường Thanh rồi Novotel) → [ĐÓN Mường Thanh, ĐÓN Novotel, TRẢ Bến tàu]", () => {
  const ra = xep([], [], [{ don: "L:muong-thanh", tra: BEN }, { don: "L:novotel", tra: BEN }]);
  assert.deepEqual(ra.thuTu, ["ĐÓN L:muong-thanh", "ĐÓN L:novotel", `TRẢ ${BEN}`]);
  assert.equal(ra.moi.filter((d) => d.loai === "DROPOFF").length, 1, "nơi trả chung vẫn GỘP một điểm (I40)");
  assert.deepEqual(ra.moi.map((d) => d.seq).sort(), [1, 2, 3]);
  assert.deepEqual(ra.doi, [], "toàn điểm mới: không câu đổi thứ tự điểm cũ");
});

test("HT-01: chuyến đã có [ĐÓN A(1), TRẢ Bến tàu(2)], xếp thêm đoàn B cùng nơi trả → ĐÓN B chèn số 2, điểm TRẢ cũ đổi sang 3 (câu đổi thứ tự)", () => {
  const stops = [stop("s-a", 1, "PICKUP", "L:a"), stop("s-tra", 2, "DROPOFF", BEN)];
  const ra = xep(stops, [{ board: "s-a", alight: "s-tra" }], [{ don: "L:b", tra: BEN }]);
  assert.deepEqual(ra.thuTu, ["ĐÓN L:a", "ĐÓN L:b", `TRẢ ${BEN}`]);
  assert.deepEqual(ra.doi, [{ id: "s-tra", seq: 3 }]);
  assert.deepEqual(ra.suatMoi[0]!.alight, "s-tra", "suất mới dùng lại điểm trả cũ");
});

test("sapLaiDiem: điểm đã tới / bỏ qua giữ số; điểm trong `boQua` không xét; chuyến khác không đụng", () => {
  const stops = [stop("s-bo", 1, "PICKUP", "L:x", "SKIPPED"), stop("s-a", 2, "PICKUP", "L:a"), stop("s-tra", 3, "DROPOFF", BEN), stop("s-rong", 4, "PICKUP", "L:r")];
  const moi: Diem[] = [];
  const len = r.diemChoKhoa(stops, moi, T, "PICKUP", "L:b", "b", null);
  assert.equal(moi[0]!.seq, 5);
  const doi = r.sapLaiDiem(stops, moi, T, [{ board: "s-a", alight: "s-tra" }, { board: len, alight: "s-tra" }], ["s-rong"]);
  assert.deepEqual(doi, [{ id: "s-tra", seq: 5 }]);
  assert.equal(moi[0]!.seq, 3);
  assert.deepEqual(r.sapLaiDiem(stops, [], "t-khac", [{ board: "s-a", alight: "s-tra" }]), []);
});

test("sapLaiDiem: đã đúng thứ tự → không đổi gì (lệnh xếp thường không sinh câu thừa)", () => {
  const stops = [stop("s-a", 1, "PICKUP", "L:a"), stop("s-tra", 2, "DROPOFF", BEN)];
  const ra = xep(stops, [{ board: "s-a", alight: "s-tra" }], [{ don: "L:a", tra: BEN }]);
  assert.deepEqual(ra.doi, []);
  assert.equal(ra.moi.length, 0);
});
