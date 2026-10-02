// Route khung bận của xe chạy CẢ ứng dụng trên SQLite (ADR-0055 VK2-A A5–A6; kế hoạch Đợt 3 Task 6 Step 1b, 3b; Task 7). Mọi ca từ chối khẳng định ĐÚNG MÃ +
// KHÔNG ghi + KHÔNG nhật ký. Khung thử: tests/audit/dieu-phoi-khung.mjs (NGAY = 2027-03-11 thứ Năm, đồng hồ giả 06:00 VN).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, NGAY, SALES, SUP, batDongHo, chuyenSan, denGio, setup, taoChuyen, tienDo, uuid, vnMs, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const than = (tu: string, den: string, ngayDen = NGAY, lyDo = "BAN_XE_BAO_DUONG", ngayTu = NGAY) => ({ batDau: { ngay: ngayTu, gio: tu }, ketThuc: { ngay: ngayDen, gio: den }, lyDo });
const dem = (w: any, bang: string) => w.q(`SELECT count(*) n FROM ${bang}`)[0].n;
const soNhatKy = (w: any, action: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = ?", action)[0].n;
const ghi = (w: any, x: string, body: unknown, as = ADM) => w.call("POST", `/api/van-chuyen/xe/${x}/ban`, { as, body });

test("cổng + ô: Bán hàng, Kế toán → 403 (vehicle.manage) ở cả bốn route, kể cả GET /ban-xe?tu=abc (403 trước 400); không ghi, không nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const k = (await ghi(w, x, than("08:00", "17:00"))).json.dangCo[0];
    const n0 = dem(w, "audit_log");
    for (const as of [SALES, ACC]) {
      assert.equal((await w.call("GET", `/api/van-chuyen/xe/${x}/ban`, { as })).status, 403);
      assert.equal((await ghi(w, x, than("18:00", "19:00"), as)).status, 403);
      assert.equal((await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`, { as, body: { version: k.version } })).status, 403);
      assert.equal((await w.call("GET", "/api/van-chuyen/ban-xe", { as })).status, 403);
      assert.equal((await w.call("GET", "/api/van-chuyen/ban-xe?tu=abc", { as })).status, 403, "403 trước 400");
    }
    assert.equal(dem(w, "vc_unavailability"), 1);
    assert.equal(dem(w, "audit_log"), n0);
    // Toàn quyền giữ vehicle.manage → được.
    assert.equal((await w.call("GET", `/api/van-chuyen/xe/${x}/ban`, { as: SUP })).status, 200);
  } finally { tat(); }
});

test("ghi khung: 201 + đúng một nhật ký (biển số + giờ VN + nhãn lý do); lý do ngoài nhóm / thân sai / xe lạ / xe ngừng → 4xx, không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const r = await ghi(w, x, than("08:00", "17:00"));
    assert.equal(r.status, 201, r.text);
    assert.deepEqual(Object.keys(r.json).sort(), ["dangCo", "lichSu", "lyDo"]);
    assert.deepEqual(r.json.lyDo.map((l: { code: string }) => l.code), ["BAN_XE_BAO_DUONG", "BAN_XE_DANG_KIEM", "BAN_XE_SUA_CHUA", "BAN_XE_KHAC"]);
    assert.equal(r.json.dangCo.length, 1);
    assert.equal(r.json.dangCo[0].lyDo, "Bảo dưỡng");
    const bien = w.q("SELECT plate_number p FROM vc_vehicle WHERE id = ?", x)[0].p;
    const nk = w.q("SELECT detail, target_type, target_id FROM audit_log WHERE action = 'vehicle_unavailability_added'");
    assert.deepEqual(nk.map((n: any) => ({ ...n })), [{ detail: `xe ${bien}: bận 08:00 11/03 → 17:00 11/03 · Bảo dưỡng`, target_type: "vehicle", target_id: x }]);
    for (const [body, ma] of [[than("18:00", "19:00", NGAY, "HUY_KHAC"), 400], [than("18:00", "19:00", NGAY, "BAN_XE_KHONG_CO"), 400], [than("19:00", "18:00"), 400], [than("01:00", "02:00"), 400]] as const) {
      const e = await ghi(w, x, body);
      assert.equal(e.status, ma, `${JSON.stringify(body)}: ${e.text}`);
      assert.equal(e.json.error.code, "invalid_input");
    }
    assert.equal((await ghi(w, uuid(), than("18:00", "19:00"))).status, 404);
    const x2 = xe(w);
    w.sqlite.prepare("UPDATE vc_vehicle SET status = 'retired', valid_to_date = '2027-03-10' WHERE id = ?").run(x2);
    assert.equal((await ghi(w, x2, than("18:00", "19:00"))).status, 409);
    assert.equal(dem(w, "vc_unavailability"), 1);
    assert.equal(soNhatKy(w, "vehicle_unavailability_added"), 1);
  } finally { tat(); }
});

test("ADR tiêu chí 1 lớp route: khung chồng chuyến PLANNED → 409 khung_ban_chong_chuyen liệt kê mã chuyến (không tên khách); không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const c = await chuyenSan(w, { xe: x }); // chuyến 12:30–15:00, khách có tên
    const r = await ghi(w, x, than("12:00", "17:00"));
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "khung_ban_chong_chuyen");
    assert.deepEqual(r.json.error.chuyen, [{ ma: c.ma, gio: "12:30 11/03 → 15:00 11/03" }]);
    assert.doesNotMatch(r.text, /Khách|Dò Tìm|09\d{8}|TD-\d/);
    assert.equal(dem(w, "vc_unavailability"), 0);
    assert.equal(soNhatKy(w, "vehicle_unavailability_added"), 0);
    // Xe khác cùng giờ → được.
    assert.equal((await ghi(w, xe(w), than("12:00", "17:00"))).status, 201);
  } finally { tat(); }
});

test("chuyến ĐANG CHẠY vướng khung → 409; chuyến ĐÃ KẾT THÚC không vướng (lịch sử) — lớp route lẫn trigger", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const c = await chuyenSan(w, { xe: x });
    denGio("12:40");
    assert.equal((await tienDo(w, "van-phong", c.id, "xuat-ben")).status, 200);
    const r = await ghi(w, x, than("13:00", "17:00"));
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "khung_ban_chong_chuyen");
    // Lớp CSDL (lưới thứ hai) cũng chặn khi chuyến đang chạy.
    assert.throws(() => w.sqlite.prepare(`INSERT INTO vc_unavailability (id, subject, vehicle_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
      VALUES ('kb-x', 'VEHICLE', ?, ?, ?, ?, ?, 'BAN_XE_KHAC', 'a', 'a')`).run(x, vnMs(NGAY, "13:00"), vnMs(NGAY, "17:00"), new Date(vnMs(NGAY, "13:00")).toISOString(), new Date(vnMs(NGAY, "17:00")).toISOString()), /unavailability_overlaps_trip/);
    for (const [d, body] of [[`diem/${c.diemDon}/da-toi`, {}], [`phan-bo/${c.suat[0]}/don`, {}], [`phan-bo/${c.suat[1]}/don`, {}], [`diem/${c.diemTra}/da-toi`, {}],
      [`phan-bo/${c.suat[0]}/tra`, {}], [`phan-bo/${c.suat[1]}/tra`, {}], ["ket-thuc", {}]] as const) {
      const t = await tienDo(w, "van-phong", c.id, d, body);
      assert.equal(t.status, 200, `${d}: ${t.text}`);
    }
    assert.equal(w.q("SELECT status s FROM vc_trip WHERE id = ?", c.id)[0].s, "ENDED");
    assert.equal((await ghi(w, x, than("13:00", "17:00"))).status, 201, "chuyến đã kết thúc là lịch sử — không vướng");
  } finally { tat(); }
});

test("Review Focus 3 — rút: version sai → 409; rút đúng → 200 + đúng một nhật ký; rút lần hai → 409, không nhật ký thừa; khung lạ → 404; khung đã qua → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const r0 = await ghi(w, x, than("08:00", "17:00"));
    assert.equal(r0.status, 201, r0.text);
    const k = r0.json.dangCo[0];
    const url = `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`;
    const soRut = () => soNhatKy(w, "vehicle_unavailability_withdrawn");
    let r = await w.call("POST", url, { as: ADM, body: { version: k.version + 1 } });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "khung_ban_vua_doi_route");
    assert.equal((await w.call("POST", url, { as: ADM, body: {} })).status, 400);
    assert.equal(soRut(), 0);
    r = await w.call("POST", url, { as: ADM, body: { version: k.version } });
    assert.equal(r.status, 200, r.text);
    assert.equal(r.json.lichSu.find((x2: { id: string }) => x2.id === k.id).daRut, true);
    assert.equal(r.json.dangCo.length, 0);
    assert.equal(soRut(), 1);
    assert.match(w.q("SELECT detail d FROM audit_log WHERE action = 'vehicle_unavailability_withdrawn'")[0].d, /: rút khung bận 08:00 11\/03 → 17:00 11\/03 · Bảo dưỡng$/);
    r = await w.call("POST", url, { as: ADM, body: { version: k.version } });
    assert.equal(r.status, 409);
    assert.equal(soRut(), 1);
    assert.equal((await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${uuid()}/rut`, { as: ADM, body: { version: 1 } })).status, 404);
    // Khung đã qua: ghi 06:00–07:00 (bây giờ 06:00 → còn hiệu lực), sang 08:00 → rút → 409 khung_ban_da_qua.
    const q = (await ghi(w, x, than("06:00", "07:00"))).json.dangCo[0];
    denGio("08:00");
    r = await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${q.id}/rut`, { as: ADM, body: { version: q.version } });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "khung_ban_da_qua");
    assert.equal(soRut(), 1);
  } finally { tat(); }
});

test("hai người cùng rút (lớp CSDL): câu rút của người sau không đổi dòng nào → 409 khung_ban_vua_doi_route, không nhật ký thừa", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const k = (await ghi(w, x, than("08:00", "17:00"))).json.dangCo[0];
    // Người A rút ngay dưới chân route (giả lập đua): dòng đổi version → người B gửi version cũ.
    w.sqlite.prepare("UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's', version = version + 1, updated_at = ?, updated_by = 's' WHERE id = ?").run("2027-03-10T23:00:00.000Z", "2027-03-10T23:00:00.000Z", k.id);
    const r = await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`, { as: ADM, body: { version: k.version } });
    assert.equal(r.status, 409);
    assert.equal(soNhatKy(w, "vehicle_unavailability_withdrawn"), 0);
  } finally { tat(); }
});

// ---- Trang tuần GET /api/van-chuyen/ban-xe (Step 3b) ----------------------------------------------------------------------------------------------------
test("ban-xe: vắng tu → thứ Hai của tuần hiện tại theo ngày VN (00:30 VN thứ Hai = 17:30 UTC Chủ nhật vẫn là tuần MỚI); tu thứ Tư → chuẩn về thứ Hai; sai khuôn → 400", async () => {
  const tat = batDongHo(vnMs("2027-03-15", "00:30"));
  try {
    const w = setup();
    let r = await w.call("GET", "/api/van-chuyen/ban-xe", { as: ADM });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual([r.json.tu, r.json.den], ["2027-03-15", "2027-03-21"]);
    r = await w.call("GET", "/api/van-chuyen/ban-xe?tu=2027-03-17", { as: ADM });
    assert.deepEqual([r.json.tu, r.json.den], ["2027-03-15", "2027-03-21"]);
    r = await w.call("GET", "/api/van-chuyen/ban-xe?tu=2027-3-17", { as: ADM });
    assert.equal(r.status, 400);
    assert.deepEqual(Object.keys((await w.call("GET", "/api/van-chuyen/ban-xe", { as: SUP })).json).sort(), ["chuyen", "den", "khung", "lyDo", "tu", "xe"]);
  } finally { tat(); }
});

test("ban-xe (Review Focus 1): khung 23:00 Chủ nhật → 07:00 thứ Hai có trong `khung` của CẢ tuần trước và tuần sau; khung đã rút thì không", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const r0 = await ghi(w, x, than("23:00", "07:00", "2027-03-15", "BAN_XE_SUA_CHUA", "2027-03-14"));
    assert.equal(r0.status, 201, r0.text);
    for (const tu of ["2027-03-08", "2027-03-15"]) {
      const r = await w.call("GET", `/api/van-chuyen/ban-xe?tu=${tu}`, { as: ADM });
      assert.deepEqual(r.json.khung.map((k: { xeId: string; lyDo: string }) => [k.xeId, k.lyDo]), [[x, "Sửa chữa"]], tu);
    }
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/ban-xe?tu=2027-03-22", { as: ADM })).json.khung, []);
    const k = r0.json.dangCo[0];
    await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`, { as: ADM, body: { version: k.version } });
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/ban-xe?tu=2027-03-15", { as: ADM })).json.khung, []);
  } finally { tat(); }
});

test("ban-xe (câu 3.1 — khoá DTO): mỗi phần tử `chuyen` có ĐÚNG khoá id, ma, xeId, batDauMs, ketThucMs, trangThai; không tên khách / SĐT / mã đơn; chuyến đã huỷ không có", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const c = await chuyenSan(w, { xe: x });
    const huy = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "17:00" });
    const h = await w.call("POST", `/api/van-chuyen/chuyen/${huy.chuyen.id}/huy`, { as: SALES, body: { version: huy.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
    assert.equal(h.status, 200, h.text);
    const r = await w.call("GET", "/api/van-chuyen/ban-xe?tu=2027-03-08", { as: ADM });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json.chuyen.map((t: { id: string }) => t.id), [c.id], "chuyến đã huỷ không có");
    for (const t of r.json.chuyen) assert.deepEqual(Object.keys(t).sort(), ["batDauMs", "id", "ketThucMs", "ma", "trangThai", "xeId"]);
    assert.doesNotMatch(r.text, /Khách|Dò Tìm|09\d{8}|TD-\d/);
    assert.ok(r.json.xe.some((v: { id: string }) => v.id === x));
  } finally { tat(); }
});
