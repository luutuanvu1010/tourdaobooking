// ADR-0052 tiêu chí 11 (ý cuối): route gọi baoThayDoiChuyen ĐÚNG MỘT LẦN sau lô thành công; không gọi khi 409 / 403 / lệnh lặp. + bài quét đủ tuyến.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, NGAY, SALES, batDongHo, chuyenSan, setup, tienDo, uuid, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

function voiGoi() {
  const goi: { tripId: string; requestId: string }[] = [];
  const w = setup({ ghiDe: { baoThayDoiChuyen: async (_env: unknown, _a: unknown, e: { tripId: string; requestId: string }) => void goi.push(e) } });
  return { w, goi };
}
const xong = () => new Promise((r) => setImmediate(r));

test("tạo chuyến 201 → 1 lời gọi; gửi lại cùng requestId (200) → không thêm; huỷ thiếu version đúng (409) → không thêm", async () => {
  const tat = batDongHo();
  try {
    const { w, goi } = voiGoi();
    const a = await chuyenSan(w); // tạo + xếp = 2 lệnh
    await xong();
    assert.equal(goi.length, 2);
    assert.ok(goi.every((g) => g.tripId === a.id));
    const sai = await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: 999, requestId: uuid(), lyDo: "HUY_KHAC" } });
    assert.equal(sai.status, 409, sai.text);
    const ktBam = await tienDo(w, "van-phong", a.id, "ket-thuc", {}, ACC);
    assert.equal(ktBam.status, 403);
    await xong();
    assert.equal(goi.length, 2, "409 / 403 không bắn tin");
    const rid = uuid();
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES })).json;
    for (let i = 0; i < 2; i++) await w.call("POST", `/api/van-chuyen/chuyen/${a.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: rid, lyDo: "HUY_KHAC" } });
    await xong();
    assert.equal(goi.filter((g) => g.requestId === rid).length, 1, "lệnh lặp không bắn lần hai");
  } finally {
    tat();
  }
});

test("bài quét: MỌI route POST/PUT lệnh chuyến của van-chuyen gọi baoThayDoiChuyen, và lời gọi nằm SAU `if (r) return r` / `if (!r.ok) return r.res`", () => {
  const src = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
  const routes = [...src.matchAll(/route\("(POST|PUT)", "(\/api\/van-chuyen\/(?:chuyen|cuoc-cua-toi)[^"]*)"[\s\S]*?\n    \}\),/g)];
  const lenh = routes.filter((m) => !/\/chang\//.test(m[2]!));
  // Đo 2026-10-02 (sau Đợt 1, bản 1.65): 8 route kế hoạch văn phòng + 9 route tài xế + 9 route văn phòng bấm thay = 26 (kế hoạch ghi ≥ 27 là đếm nhầm).
  assert.ok(lenh.length >= 26, `chỉ thấy ${lenh.length} route lệnh chuyến`);
  const ten = new Set(lenh.map((m) => `${m[1]} ${m[2]}`));
  for (const r of ["POST /api/van-chuyen/chuyen/:id/thu-tu", "POST /api/van-chuyen/cuoc-cua-toi/:id/thu-tu", "POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/don",
    "POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/tra", "POST /api/van-chuyen/chuyen/:id/phan-bo", "POST /api/van-chuyen/chuyen", "PUT /api/van-chuyen/chuyen/:id"]) {
    assert.ok(ten.has(r), `bài quét không phủ ${r}`);
  }
  for (const m of lenh) {
    const than = m[0];
    const i = than.indexOf("baoThayDoiChuyen(");
    assert.ok(i > 0, `${m[1]} ${m[2]} chưa gọi baoThayDoiChuyen`);
    const chan = Math.max(
      than.lastIndexOf("if (r) return r", i), than.lastIndexOf("return r.res", i), than.lastIndexOf("if (r instanceof Response) return r", i),
      than.lastIndexOf("if (r.loi) return r.loi", i),
    );
    assert.ok(chan > 0 && chan < i, `${m[1]} ${m[2]}: lời gọi phải đứng sau nhánh trả lỗi của lệnh`);
    // Vòng sửa 1 (T1): lời gọi phải nằm TRONG khối "lệnh chưa lặp" (`if (!(await eventByRequest(…))) {` / `if (!lap) {`) — dời ra ngoài khối thì lệnh lặp
    // cùng requestId cũng bắn tin lần hai. Đếm ngoặc từ `{` mở khối tới lời gọi: độ sâu không được về 0.
    const khoi = Math.max(than.lastIndexOf("if (!(await eventByRequest(", i), than.lastIndexOf("if (!lap) {", i));
    assert.ok(khoi > 0, `${m[1]} ${m[2]}: không thấy khối "lệnh chưa lặp" trước lời gọi`);
    const mo = than.indexOf(") {", khoi) + 2; // `{` mở khối: `…requestId))) {` hoặc `if (!lap) {`
    assert.ok(mo > khoi + 1 && mo < i, `${m[1]} ${m[2]}: không thấy ngoặc mở khối "lệnh chưa lặp"`);
    let sau = 0;
    let trong = true;
    for (let k = mo; k < i; k++) {
      if (than[k] === "{") sau++;
      else if (than[k] === "}") sau--;
      if (sau === 0) { trong = false; break; }
    }
    assert.ok(trong, `${m[1]} ${m[2]}: lời gọi phải nằm TRONG khối "lệnh chưa lặp" (không bắn lại khi gửi lặp cùng requestId)`);
  }
});

test("gửi lặp lệnh TẠO chuyến cùng requestId (201 rồi 200) → đúng MỘT lời gọi baoThayDoiChuyen (không gõ cửa hai lần)", async () => {
  const tat = batDongHo();
  try {
    const { w, goi } = voiGoi();
    const xeId = xe(w);
    const rid = uuid();
    const than = { requestId: rid, xeId, taiXePartyId: `pty-${DRIVER}`, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } };
    const r1 = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: than });
    assert.equal(r1.status, 201, r1.text);
    const r2 = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: than });
    assert.equal(r2.status, 200, r2.text);
    assert.equal(r2.json.chuyen.id, r1.json.chuyen.id);
    await xong();
    assert.deepEqual(goi.filter((g) => g.requestId === rid), [{ tripId: r1.json.chuyen.id, requestId: rid }]);
  } finally {
    tat();
  }
});
