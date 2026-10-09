// G17 điều kiện (4) (sổ thi công 2026-10-08 mục G17; kế hoạch docs/superpowers/plans/2026-10-09-g17-bao-tai-xe-doi-ngay.md): TRẦN SỐ CÂU của lô `updateTrip`
// (`PUT /api/orders/:id/trip`). G17 thêm một dòng nhật ký `order_leg_updated` ngay sau mỗi câu sửa chặng đổi ngày / giờ ⇒ lô xấu nhất tăng từ 232 lên 442 câu.
// Bài đếm câu của CHÍNH hàm `updateTrip` (gói bằng esbuild như repository.test.ts) qua một `db` giả, với ca xấu nhất theo hai trần của đơn (MAX_SERVICES dịch
// vụ × MAX_CHANG_MOI_DICH_VU chặng, mọi chặng đổi ngày / giờ, mỗi dịch vụ thêm một chiều đi), so công thức, và công thức ≤ trần.
// Trần: tài liệu D1 nói 1000 câu / một lần gọi Worker — CÁCH ÁP cho một `db.batch` chưa kiểm trên D1 thật (nợ ở bảng việc); chừa 100 câu cho phần đọc của route.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import { MAX_SERVICES } from "../../shared/trip-rules.ts";
import { MAX_CHANG_MOI_DICH_VU } from "../../shared/chang-dua-don.ts";

const HERE = new URL("./", import.meta.url).pathname;
type Mod = typeof import("./repository.ts");
async function loadModule(): Promise<Mod> {
  const built = await esbuild.build({
    stdin: { contents: 'export * from "./repository";', resolveDir: HERE, loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false,
  });
  return (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Mod;
}
const { updateTrip } = await loadModule();

const TRAN_CAU_LO_SUA_CHUYEN = 1000 - 100;
/** Lô xấu nhất: câu đơn + nhật ký `trip_updated` + mỗi dịch vụ (câu dịch vụ + mỗi chặng [câu chặng + nhật ký chặng] + một câu thêm / đóng chiều đi). */
const congThuc = 2 + MAX_SERVICES * (1 + 2 * MAX_CHANG_MOI_DICH_VU + 1);

/** `db` giả: ghi số câu của lần `batch` (câu đầu "thắng"). */
function dbDem() {
  const dem = { n: -1 };
  const cau = { bind: () => cau };
  const db = { prepare: () => cau, batch: async (s: unknown[]) => ((dem.n = s.length), [{ meta: { changes: 1 } }]) };
  return { db: db as unknown as D1Database, dem };
}

test(`G17 (4): lô updateTrip xấu nhất = công thức (${congThuc} câu) và ≤ ${TRAN_CAU_LO_SUA_CHUYEN}`, async () => {
  const trip = { departDate: "2027-03-12", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
  const fields = { pickupDate: "2027-03-12", pickupTime: "07:00", pickupLocationId: null, pickupPlace: "Nơi thử", dropoffLocationId: null, dropoffPlace: null };
  const updates = Array.from({ length: MAX_SERVICES }, (_x, i) => ({ id: `sv-${i}`, trip }));
  const ops = updates.flatMap((u) => [
    ...Array.from({ length: MAX_CHANG_MOI_DICH_VU }, (_x, j) => ({ kind: "update" as const, legId: `${u.id}-l${j}`, fields, nhatKy: "Chiều về · Tour thử: ngày đón 2027-03-11 → 2027-03-12" })),
    { kind: "insert" as const, serviceId: u.id, leg: { id: null, direction: "OUT" as const, ...fields } },
  ]);
  const { db, dem } = dbDem();
  assert.equal(await updateTrip(db, "don-thu", "nguoi-thu", updates as never, "2027-03-11T00:00:00.000Z", "ngày khởi hành 2027-03-11 → 2027-03-12", ops as never), true);
  assert.equal(dem.n, congThuc, "số câu lô thật lệch công thức — đổi công thức / trần cùng lúc, có lý do");
  assert.ok(congThuc <= TRAN_CAU_LO_SUA_CHUYEN, `lô xấu nhất ${congThuc} câu vượt trần ${TRAN_CAU_LO_SUA_CHUYEN}`);
});
