// ADR-0129 Q4 = (a) (chủ dự án duyệt 2026-10-17; ca B04 sổ vàng): tài xế CÔNG TY được lái xe của NHÀ XE thuê khi đủ hạng bằng, chuyến mang cảnh báo CHEO_XE_TAI_XE;
// chiều ngược (tài xế nhà xe lái xe công ty / xe nhà xe khác) vẫn 409 cheo_xe_tai_xe. Chạy CẢ ứng dụng (khung thử + D1 node:sqlite, migration 0109). Tên, SĐT GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, NGAY_SAU, batDongHo, chiTiet, nhaXeKhung, setup, taiXeNhaXe, taoChuyen, uuid, xe, xeNhaXe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const body = (xeId: string, taiXePartyId: string) => ({
  requestId: uuid(), xeId, taiXePartyId, batDau: { ngay: NGAY_SAU, gio: "08:00" }, ketThuc: { ngay: NGAY_SAU, gio: "11:00" },
});
const tao = (w: any, xeId: string, tx: string) => w.call("POST", "/api/van-chuyen/chuyen", { as: ADM, body: body(xeId, tx) });

test("B04 (ADR-0129 Q4): tài xế công ty lái xe nhà xe thuê → 201 và chi tiết chuyến có cảnh báo «chéo xe – tài xế»; lái xe công ty thì không có cảnh báo", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const nx = nhaXeKhung(w, "Nhà xe Minh Phát");
    const thue = await tao(w, xeNhaXe(w, nx, 16), `pty-${DRIVER}`);
    assert.equal(thue.status, 201, thue.text);
    const ct = await chiTiet(w, thue.json.chuyen.id, ADM);
    const cb = ct.canhBao.filter((x: any) => x.loai === "CHEO_XE_TAI_XE");
    assert.equal(cb.length, 1, JSON.stringify(ct.canhBao));
    assert.match(cb[0].nhan, /chéo xe/);
    const nha = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "13:00", kt: "15:00" });
    assert.equal((await chiTiet(w, nha.chuyen.id, ADM)).canhBao.filter((x: any) => x.loai === "CHEO_XE_TAI_XE").length, 0, "xe công ty + tài xế công ty: không phải ca chéo");
  } finally {
    tat();
  }
});

test("B04B (ADR-0129 Q4): chéo xe được phép nhưng hạng bằng vẫn giữ — tài xế công ty bằng D1 lái xe nhà xe 45 chỗ → 409 khong_du_dieu_kien_lai", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const nx = nhaXeKhung(w, "Nhà xe Minh Phát");
    const r = await tao(w, xeNhaXe(w, nx, 45), `pty-${DRIVER}`);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "khong_du_dieu_kien_lai");
  } finally {
    tat();
  }
});

test("ADR-0129 Q4: chiều ngược VẪN chặn — tài xế nhà xe B lái xe công ty / xe nhà xe A → 409 cheo_xe_tai_xe; không ghi chuyến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const nxA = nhaXeKhung(w, "Nhà xe A");
    const nxB = nhaXeKhung(w, "Nhà xe B");
    const txB = taiXeNhaXe(w, nxB);
    const n0 = w.q("SELECT COUNT(*) n FROM vc_trip")[0].n;
    for (const x of [xe(w), xeNhaXe(w, nxA, 16)]) {
      const r = await tao(w, x, txB);
      assert.equal(r.status, 409, r.text);
      assert.equal(r.json.error.code, "cheo_xe_tai_xe");
    }
    assert.equal(w.q("SELECT COUNT(*) n FROM vc_trip")[0].n, n0);
  } finally {
    tat();
  }
});
