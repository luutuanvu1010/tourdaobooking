// BÀI GHIM — TIỀN XE THUÊ × TIN CHUYẾN (Đợt 2, ADR-0052 D6) sau khi gộp Đợt 2 vào nhánh Đợt 4 (vòng sửa 1, mục 4):
//   (1) hành động nhật ký tiền xe (`trip_cost_*`, giá thuê, tuyến, cỡ xe) KHÔNG thuộc HANH_DONG_TIN_CHUYEN ⇒ không sinh tin trong hộp thông báo, không gõ cửa
//       điện thoại — dù dòng `trip_cost_*` có targetType "trip" (lọt view v_aud_trip_event — view lấy MỌI trip_*, hộp thông báo lọc theo danh sách);
//   (2) route chi phí của Kế toán KHÔNG gọi `baoThayDoiChuyen` (ngoại lệ có tên ở bài quét Đợt 2 — ghi tiền, không đổi chuyến; Bảng tin không phát); lệnh
//       chuyến có chụp / đảo giá (tạo, sửa) vẫn gọi đúng một lần, và thứ được chuyển chỉ là khoá { tripId, requestId } — không số tiền.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AUDIT_ACTIONS } from "./shared/audit-actions.ts";
import { HANH_DONG_TIN_CHUYEN, laHanhDongTinChuyen, tinChuyenCho, type DongChuyen } from "./shared/tin-chuyen.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, NGAY, SALES, batDongHo, nhaXeKhung, setup, taiXeNhaXe, uuid, xeNhaXe } from "../tests/audit/dieu-phoi-khung.mjs";

const TIEN_XE = (Object.keys(AUDIT_ACTIONS) as string[]).filter((a) => /^(trip_cost_|rental_rate_)|^(route_saved|vehicle_size_saved)$/.test(a));

test("hành động nhật ký tiền xe thuê KHÔNG sinh tin chuyến (không thuộc HANH_DONG_TIN_CHUYEN; tinChuyenCho trả null cho văn phòng lẫn tài xế đang lái)", () => {
  assert.equal(TIEN_XE.length, 8, "chống bài rỗng: 4 trip_cost_* + 2 rental_rate_* + route_saved + vehicle_size_saved");
  for (const a of TIEN_XE) {
    assert.equal(laHanhDongTinChuyen(a), false, a);
    assert.ok(!(HANH_DONG_TIN_CHUYEN as readonly string[]).includes(a), a);
  }
  const lai = { partyId: "p-tx", tu: "2026-10-01T00:00:00.000Z", den: null };
  for (const action of TIEN_XE.filter((a) => a.startsWith("trip_cost_"))) {
    const d: DongChuyen = { id: "e1", tripId: "t1", actorId: "s-ketoan", action, luc: "2026-10-02T01:00:00.000Z", maChuyen: "CX-0210-01", ngayChay: "2026-10-02", lai: [lai], don: [] };
    for (const n of [
      { id: "s-vp", partyId: null, permissions: ["ADMIN"] }, { id: "s-ban", partyId: null, permissions: ["SALES"] }, { id: "s-tx", partyId: "p-tx", permissions: ["DRIVER"] },
    ]) assert.equal(tinChuyenCho(n as never, d), null, `${action} → ${n.id}`);
  }
});

test("route chi phí của Kế toán KHÔNG gọi baoThayDoiChuyen; lệnh chuyến chụp / đảo giá gọi đúng một lần, chỉ chuyển khoá (không số tiền)", async () => {
  const tat = batDongHo();
  try {
    const goi: Record<string, unknown>[] = [];
    const w = setup({ ghiDe: { baoThayDoiChuyen: async (_env: unknown, _a: unknown, e: Record<string, unknown>) => void goi.push(e) } });
    const xong = () => new Promise((r) => setImmediate(r));
    const nx = nhaXeKhung(w);
    const tx = taiXeNhaXe(w, nx);
    const x16 = xeNhaXe(w, nx, 16);
    const t1 = (await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten: "Tuyến A" } })).json.tuyen[0].ma;
    const t2 = (await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten: "Tuyến B" } })).json.tuyen.find((t: any) => t.ten === "Tuyến B").ma;
    for (const [tuyen, soTien] of [[t1, 480_017], [t2, 1_480_017]] as const) {
      assert.equal((await w.call("POST", "/api/van-chuyen/bang-gia", { as: ADM, body: { requestId: uuid(), nhaXePartyId: nx, tuyen, coXe: null, soTien, tuNgay: "2027-03-01", denNgay: null, ghiChu: null, thayDongId: null } })).status, 201);
    }
    const tao = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body: { requestId: uuid(), xeId: x16, taiXePartyId: tx, tuyen: t1, batDau: { ngay: NGAY, gio: "12:30" }, ketThuc: { ngay: NGAY, gio: "15:00" } } });
    assert.equal(tao.status, 201, tao.text);
    const id = tao.json.chuyen.id;
    await xong();
    assert.equal(goi.length, 1, "tạo chuyến (có chụp giá) → một lần");
    const pb = () => w.call("GET", `/api/van-chuyen/chuyen/${id}/chi-phi`, { as: ACC }).then((r: any) => r.json.chiPhi.phienBanChiPhi);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ACC, body: { requestId: uuid(), phienBanChiPhi: await pb(), soTien: 150_000, lyDo: "CPX_PHU_THU_CHO", ghiChu: null } })).status, 201);
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/chi-phi/dieu-chinh`, { as: ADM, body: { requestId: uuid(), phienBanChiPhi: await pb(), soTien: -50_000, lyDo: "CPX_NHAP_SAI", ghiChu: null } })).status, 201);
    await xong();
    assert.equal(goi.length, 1, "ghi tiền của Kế toán / Quản trị → không báo");
    assert.ok(w.q("SELECT count(*) n FROM v_aud_trip_event WHERE action LIKE 'trip_cost_%'")[0].n >= 2, "chống bài rỗng: dòng trip_cost_* có trong view tin chuyến");
    const c = (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as: SALES })).json;
    assert.equal((await w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), tuyen: t2 } })).status, 200);
    await xong();
    assert.equal(goi.length, 2, "sửa chuyến (đảo + chụp lại) → đúng một lần");
    for (const e of goi) {
      assert.deepEqual(Object.keys(e).sort(), ["requestId", "tripId"], "chỉ khoá");
      assert.ok(!/480017|1480017|150000/.test(JSON.stringify(e)));
    }
    // Hộp thông báo của tài xế / văn phòng: dòng trip_cost_* không sinh tin (lọc theo HANH_DONG_TIN_CHUYEN ở truy vấn).
    for (const as of [SALES, ADM]) {
      const r = await w.call("GET", "/api/thong-bao", { as });
      if (r.status === 200) assert.ok(!/480017|1480017|150\.000|150000/.test(r.text), `thông báo của ${as} lộ tiền`);
    }
  } finally {
    tat();
  }
});
