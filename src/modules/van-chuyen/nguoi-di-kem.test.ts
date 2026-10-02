// Người đi kèm (lời chủ 2026-10-01, "Chỉ hướng dẫn viên (Recommended)"): chỉ tài khoản FIELD đang hoạt động; tên ở chi tiết chuyến văn phòng + DTO tài
// xế (chỉ tên, không SĐT); HDV KHÔNG thấy chuyến. Chạy cả ứng dụng trên SQLite thật, đồng hồ giả (tests/audit/dieu-phoi-khung.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, DRIVER, FIELD, SALES, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const SDT_HDV = "0900000004"; // seedStaff của khung thử
const KHOA_SUAT_TAI_XE = ["daDon", "daTra", "diemLen", "diemXuong", "id", "loai", "maDon", "soHieuChuyenBay", "trangThai"];
const xepDiKem = async (w: any, tripId: string, ids: string[], as = SALES) => {
  const c = await chiTiet(w, tripId);
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), nguoiDiKem: ids } });
};
const soCrew = (w: any, tripId: string): number => w.q("SELECT count(*) n FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'CREW' AND valid_to_at IS NULL", tripId)[0].n;

test("danh sách người đi kèm: CHỈ tài khoản FIELD đang hoạt động, tên + hồ sơ, không SĐT; Kế toán 403; HDV bị khoá → biến mất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const r = await w.call("GET", "/api/van-chuyen/huong-dan-vien", { as: SALES });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.nguoi, [{ partyId: `pty-${FIELD}`, ten: "Hướng Dẫn" }]);
    assert.ok(!r.text.includes(SDT_HDV), "không SĐT");
    assert.equal((await w.call("GET", "/api/van-chuyen/huong-dan-vien", { as: ACC })).status, 403);
    w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${FIELD}'`);
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/huong-dan-vien", { as: SALES })).json.nguoi, []);
  } finally {
    tat();
  }
});

test("xếp người đi kèm: không phải HDV → 409 nguoi_di_kem_khong_hop_le, không mở suất; HDV → 200, văn phòng + tài xế thấy tên, không SĐT; nhật ký không SĐT; HDV không mở được chuyến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    for (const sai of [`pty-${SALES}`, `pty-${DRIVER}`, "pty-khong-co"]) {
      const x = await xepDiKem(w, a.id, [sai]);
      assert.equal(x.status, 409, `${sai}: ${x.text}`);
      assert.equal(x.json.error.code, "nguoi_di_kem_khong_hop_le");
      assert.equal(x.json.error.message, "Chỉ gắn được hướng dẫn viên đang có tài khoản làm người đi kèm.");
    }
    assert.equal(soCrew(w, a.id), 0);
    const r = await xepDiKem(w, a.id, [`pty-${FIELD}`]);
    assert.equal(r.status, 200, r.text);
    const ct = await chiTiet(w, a.id);
    assert.deepEqual(ct.suat.filter((s: any) => s.loai === "CREW").map((s: any) => s.tenNguoiDiKem), ["Hướng Dẫn"]);
    const tx = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER });
    assert.equal(tx.status, 200, tx.text);
    const crew = tx.json.suat.filter((s: any) => s.tenNguoiDiKem);
    assert.equal(crew.length, 1);
    assert.deepEqual(Object.keys(crew[0]).sort(), [...KHOA_SUAT_TAI_XE, "tenNguoiDiKem"].sort(), "bài liệt kê khoá: suất người đi kèm chỉ thêm đúng một khoá (tenNguoiDiKem)");
    assert.ok(!tx.text.includes(SDT_HDV) && !JSON.stringify(ct).includes(SDT_HDV), "không SĐT HDV");
    for (const n of w.q("SELECT detail FROM audit_log WHERE action LIKE 'trip_%'")) assert.ok(!String(n.detail).includes(SDT_HDV), `nhật ký không SĐT: ${n.detail}`);
    assert.equal((await w.call("GET", `/api/van-chuyen/chuyen/${a.id}`, { as: FIELD })).status, 403, "HDV chưa thấy chuyến (ADR-0064 còn proposed)");
  } finally {
    tat();
  }
});

test("HDV bị khoá giữa lúc mở màn và lúc gửi → 409, không mở suất", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    w.sqlite.exec(`UPDATE staff SET active = 0 WHERE id = '${FIELD}'`);
    const x = await xepDiKem(w, a.id, [`pty-${FIELD}`]);
    assert.equal(x.status, 409, x.text);
    assert.equal(soCrew(w, a.id), 0);
  } finally {
    tat();
  }
});

test("kết thúc thường với người đi kèm: khách đã trả mà HDV còn WAITING / BOARDED → 409 con_khach_chua_xong; HDV 'don' rồi 'tra' (cả hai route, không đòi điểm dừng) → kết thúc thường 200", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w, { bd: "12:10", kt: "12:40", gio: "12:15" });
    assert.equal((await xepDiKem(w, a.id, [`pty-${FIELD}`])).status, 200);
    const crew = (await chiTiet(w, a.id)).suat.find((s: any) => s.loai === "CREW").id;
    denGio("12:05");
    assert.equal((await tienDo(w, "van-phong", a.id, "xuat-ben")).status, 200);
    denGio("12:15");
    await tienDo(w, "van-phong", a.id, `diem/${a.diemDon}/da-toi`);
    for (const s of a.suat) await tienDo(w, "van-phong", a.id, `phan-bo/${s}/don`);
    await tienDo(w, "van-phong", a.id, `diem/${a.diemTra}/da-toi`);
    for (const s of a.suat) await tienDo(w, "van-phong", a.id, `phan-bo/${s}/tra`);
    const chua = await tienDo(w, "tai-xe", a.id, "ket-thuc");
    assert.equal(chua.status, 409, "CREW còn WAITING chặn kết thúc thường");
    assert.equal(chua.json.error.code, "con_khach_chua_xong");
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${crew}/don`)).status, 200, "tài xế: Đã lên xe cho người đi kèm");
    assert.equal((await tienDo(w, "van-phong", a.id, "ket-thuc")).status, 409, "đang BOARDED vẫn chưa được");
    assert.equal((await tienDo(w, "van-phong", a.id, `phan-bo/${crew}/tra`)).status, 200, "văn phòng: Đã xuống cho người đi kèm");
    const xong = await tienDo(w, "tai-xe", a.id, "ket-thuc");
    assert.equal(xong.status, 200, xong.text);
  } finally {
    tat();
  }
});

test("quyền FIELD của HDV bị ĐÓNG (valid_to_at) giữa lúc mở màn và lúc gửi → 409 nguoi_di_kem_khong_hop_le, không mở suất; danh sách HDV không còn người đó", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    assert.equal((await w.call("GET", "/api/van-chuyen/huong-dan-vien", { as: SALES })).json.nguoi.length, 1);
    w.sqlite.exec(`UPDATE stf_permission SET valid_to_at = valid_from_at WHERE staff_id = '${FIELD}' AND permission_type_code = 'FIELD'`);
    const x = await xepDiKem(w, a.id, [`pty-${FIELD}`]);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "nguoi_di_kem_khong_hop_le");
    assert.equal(soCrew(w, a.id), 0);
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/huong-dan-vien", { as: SALES })).json.nguoi, []);
  } finally {
    tat();
  }
});
