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
    // Bỏ mã UUID ngẫu nhiên trước khi quét: "…-909661116149" từng khớp /09\d{8}/ (đỏ ngẫu nhiên 8/10; khuôn thong-bao-doi.test.ts:24).
    // SĐT không thể nằm trong một mã dạng UUID nên phép bỏ không nới rào.
    assert.doesNotMatch(r.text.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>"), /Khách|Dò Tìm|09\d{8}|TD-\d/);
    assert.ok(r.json.xe.some((v: { id: string }) => v.id === x));
  } finally { tat(); }
});

// ---- Task 7: khung bận chặn tạo / sửa chuyến ở máy chủ; lịch chung trả dải bận; nhắc giờ lái ------------------------------------------------------------
const taoTho = (w: any, x: string, bd: string, kt: string, as = SALES, ngay = NGAY) =>
  w.call("POST", "/api/van-chuyen/chuyen", { as, body: { requestId: uuid(), xeId: x, taiXePartyId: `pty-${DRIVER}`, batDau: { ngay, gio: bd }, ketThuc: { ngay, gio: kt } } });

test("ADR tiêu chí 2 lớp máy chủ: tạo chuyến / dời giờ / đổi xe vào khung → 409 có lý do 'lịch xe bận' (không phải trip_rule của CSDL); khung đã rút → tạo được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const k = (await ghi(w, x, than("08:00", "17:00"))).json.dangCo[0];
    let r = await taoTho(w, x, "09:00", "10:00");
    assert.equal(r.status, 409, r.text);
    assert.notEqual(r.json.error.code, "trip_rule", "lớp máy chủ nói trước — không rơi xuống trigger");
    assert.ok(r.json.error.lyDo.some((l: { ma: string; loiNhan: string }) => l.ma === "TRUNG_GIO_XE" && /lịch xe bận: Bảo dưỡng 08:00 11\/03 → 17:00 11\/03/.test(l.loiNhan)), r.text);
    // Dời giờ chuyến của xe vào khung (PUT).
    const c = await taoChuyen(w, { xe: x, taiXe: `pty-${DRIVER}`, bd: "17:30", kt: "18:30" });
    r = await w.call("PUT", `/api/van-chuyen/chuyen/${c.chuyen.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "16:00" }, ketThuc: { ngay: NGAY, gio: "18:30" } } });
    assert.equal(r.status, 409, r.text);
    assert.ok(r.json.error.lyDo.some((l: { loiNhan: string }) => /lịch xe bận/.test(l.loiNhan)), r.text);
    // Đổi xe chuyến khác sang xe đang bận.
    const c2 = await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "10:00" });
    r = await w.call("PUT", `/api/van-chuyen/chuyen/${c2.chuyen.id}`, { as: SALES, body: { version: c2.chuyen.version, requestId: uuid(), xeId: x } });
    assert.equal(r.status, 409, r.text);
    assert.ok(r.json.error.lyDo.some((l: { loiNhan: string }) => /lịch xe bận/.test(l.loiNhan)), r.text);
    assert.equal((await w.call("POST", `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`, { as: ADM, body: { version: k.version } })).status, 200);
    r = await taoTho(w, x, "11:00", "12:00"); // tài xế đã có chuyến 09:00–10:00 (c2) — chọn giờ khác để chỉ khung bận là biến
    assert.equal(r.status, 201, r.text);
  } finally { tat(); }
});

test("GET /lich (ADR-0055 A4, Review Focus 1, 4): Kế toán (trip.view) thấy khungBanXe ĐÚNG khoá danh sách trắng; khung 23:00 D → 07:00 D+1 có ở D và D+1, không ở D+2", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    assert.equal((await ghi(w, x, than("23:00", "07:00", "2027-03-12", "BAN_XE_SUA_CHUA"))).status, 201);
    const bien = w.q("SELECT plate_number p FROM vc_vehicle WHERE id = ?", x)[0].p;
    for (const ngay of [NGAY, "2027-03-12"]) {
      const r = await w.call("GET", `/api/van-chuyen/lich?ngay=${ngay}`, { as: ACC });
      assert.equal(r.status, 200, r.text);
      assert.equal(r.json.khungBanXe.length, 1, ngay);
      const k = r.json.khungBanXe[0];
      assert.deepEqual(Object.keys(k).sort(), ["batDau", "bienSo", "id", "ketThuc", "lyDo", "xeId"]);
      assert.deepEqual([k.xeId, k.bienSo, k.lyDo, k.batDau, k.ketThuc], [x, bien, "Sửa chữa", new Date(vnMs(NGAY, "23:00")).toISOString(), new Date(vnMs("2027-03-12", "07:00")).toISOString()]);
    }
    assert.deepEqual((await w.call("GET", "/api/van-chuyen/lich?ngay=2027-03-13", { as: ACC })).json.khungBanXe, []);
    // Khung 00:00–07:00 của D+1 (= 17:00 UTC ngày D) KHÔNG thuộc ngày D (khoảng chặn bằng nửa đêm VN).
    const x2 = xe(w);
    assert.equal((await ghi(w, x2, than("00:00", "07:00", "2027-03-12", "BAN_XE_KHAC", "2027-03-12"))).status, 201);
    assert.deepEqual((await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: ACC })).json.khungBanXe.map((k: { xeId: string }) => k.xeId), [x]);
  } finally { tat(); }
});

test("VK2-B B3: tài xế đã có hai chuyến 4 giờ cùng ngày → tạo chuyến 1 giờ 201 kèm canhBaoLenh 'Tài xế lái quá giờ tối đa trong ngày'; GET chi tiết có canhBao cùng loại; lệnh vẫn chạy", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    await taoChuyen(w, { xe: xe(w), taiXe: `pty-${DRIVER}`, bd: "07:00", kt: "11:00" });
    const hai = await taoTho(w, xe(w), "11:30", "15:30");
    assert.equal(hai.status, 201, hai.text);
    assert.equal(hai.json.canhBaoLenh, undefined, "đúng 8 giờ → chưa nhắc (K10)");
    const r = await taoTho(w, xe(w), "16:00", "17:00");
    assert.equal(r.status, 201, r.text);
    assert.deepEqual(r.json.canhBaoLenh.map((c: { loai: string; nhan: string; tripId: string }) => [c.loai, c.nhan, c.tripId]), [["GIO_LAI_VUOT", "Tài xế lái quá giờ tối đa trong ngày", r.json.chuyen.id]]);
    const ct = await w.call("GET", `/api/van-chuyen/chuyen/${r.json.chuyen.id}`, { as: SALES });
    assert.ok(ct.json.canhBao.some((c: { loai: string }) => c.loai === "GIO_LAI_VUOT"), ct.text);
    assert.equal(ct.json.canhBaoLenh, undefined, "chỉ phản hồi lệnh mới có canhBaoLenh");
    // PUT kéo dài chuyến thứ ba → nhắc (kèm chuyến dài).
    const s = await w.call("PUT", `/api/van-chuyen/chuyen/${r.json.chuyen.id}`, { as: SALES, body: { version: r.json.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "16:00" }, ketThuc: { ngay: NGAY, gio: "20:30" } } });
    assert.equal(s.status, 200, s.text);
    assert.deepEqual(s.json.canhBaoLenh.map((c: { loai: string }) => c.loai).sort(), ["CHUYEN_DAI_CAN_NGHI", "GIO_LAI_VUOT"]);
  } finally { tat(); }
});
