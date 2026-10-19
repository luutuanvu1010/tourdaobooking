// SỰ KIỆN ĐIỀU CHỈNH CÓ LÝ DO — route văn phòng (ADR-0097 Đ2, Đ3, Đ5 — gói A1, V3-B). Chạy CẢ ứng dụng trên SQLite thật, đồng hồ giả (ngày chạy 2027-03-11 —
// tests/audit/dieu-phoi-khung.mjs). Tên, SĐT GIẢ. Lớp CSDL của cùng luật: dieu-chinh-csdl.test.ts; luật thuần bảng Đ2.4: src/shared/dieu-chinh-suat.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, DRIVER, DRIVER2, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, setup, tienDo, uuid } from "../../../tests/audit/dieu-phoi-khung.mjs";

const { CHECKS } = (await import(new URL("../../../scripts/audit-checks.mjs", import.meta.url).href)) as { CHECKS: { code: string; sql: string; level: string; mode?: string }[] };
/** Kiểm định kỳ mức fail của vận chuyển (kể cả R-VC-SUA-1) trên CSDL sau ca — dữ liệu do chính các lô thật ghi phải sạch. */
function kiemDinhKySach(w: any) {
  const vc = CHECKS.filter((c) => c.code.startsWith("R-VC-") && c.level === "fail");
  assert.ok(vc.some((c) => c.code === "R-VC-SUA-1"), "chống bài rỗng: có R-VC-SUA-1");
  for (const c of vc) {
    const rows = w.q(c.sql.replace(/\s+/g, " ").trim());
    const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
    assert.equal(n, 0, `${c.code} có vi phạm`);
  }
}
/** Chuỗi không được có: tên khách, khoá so sánh nơi, số điện thoại. */
const LO = /Dò Tìm|L:|T:|0\d{9}/;
const dieuChinh = async (w: any, tripId: string, suatId: string, trangThai: string, o: { as?: string; lyDo?: string; version?: number; requestId?: string } = {}) => {
  const version = o.version ?? (await chiTiet(w, tripId, ADM)).chuyen.version;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo/${suatId}/dieu-chinh`, {
    as: o.as ?? SALES, body: { version, requestId: o.requestId ?? uuid(), trangThai, lyDo: o.lyDo ?? "DIEU_CHINH_BAM_NHAM" },
  });
};
const thuHoi = async (w: any, tripId: string, o: { as?: string; lyDo?: string; version?: number } = {}) => {
  const version = o.version ?? (await chiTiet(w, tripId, ADM)).chuyen.version;
  return w.call("POST", `/api/van-chuyen/chuyen/${tripId}/thu-hoi-xuat-ben`, { as: o.as ?? SALES, body: { version, requestId: uuid(), lyDo: o.lyDo ?? "DIEU_CHINH_BAM_NHAM" } });
};
/** Chuyến A (2 khách có tên, đón 13:00) đã xuất bến 12:40, xe tới điểm đón 12:50. */
async function dangDon(w: any) {
  const a = await chuyenSan(w);
  denGio("12:40");
  assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
  denGio("12:50");
  assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemDon}/da-toi`)).status, 200);
  return a;
}

test("ADR-0097 Đ2.1: tài xế (cổng office) và Kế toán (không có trip.progress) → 403 ở cả hai route; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await dangDon(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).status, 200);
    for (const as of [DRIVER, ACC]) {
      assert.equal((await dieuChinh(w, a.id, a.suat[0], "NO_SHOW", { as })).status, 403, `điều chỉnh: ${as}`);
      assert.equal((await thuHoi(w, a.id, { as })).status, 403, `thu hồi: ${as}`);
    }
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind IN ('CORRECTION', 'DEPARTURE_REVOKED')")[0].n, 0);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ2 (HT-04): Đã đón nhầm → Vắng — 201 + Location; suất cũ đóng REMOVED, suất thay thế trỏ về (cờ thêm sau xuất bến) + bản chốt; sự kiện có lý do; nhật ký không tên; tin cho tài xế + điều phối, không cho người bấm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await dangDon(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).status, 200);
    denGio("12:52");
    const r = await dieuChinh(w, a.id, a.suat[0], "NO_SHOW");
    assert.equal(r.status, 201, r.text);
    assert.equal(r.headers.get("location"), `/chuyen?id=${a.id}`);
    const moi = r.json.suat.find((s: any) => s.loai === "PASSENGER" && !a.suat.includes(s.id));
    assert.equal(moi.trangThai, "NO_SHOW");
    assert.ok(!r.json.suat.some((s: any) => s.id === a.suat[0]), "suất cũ không còn trong danh sách mở");
    assert.doesNotMatch(r.text, /Khách Dò Tìm \d|"hoTen"|"namSinh"/, "phản hồi không kèm tên khách");
    const cu = w.q("SELECT close_reason, closed_cmd_id FROM vc_trip_allocation WHERE id = ?", a.suat[0])[0];
    assert.equal(cu.close_reason, "REMOVED");
    const ev = w.q("SELECT id, allocation_id, reason_code, count FROM vc_trip_event WHERE kind = 'CORRECTION'");
    assert.equal(ev.length, 1);
    assert.deepEqual({ ...ev[0], id: "" }, { id: "", allocation_id: a.suat[0], reason_code: "DIEU_CHINH_BAM_NHAM", count: 1 });
    assert.equal(cu.closed_cmd_id, ev[0].id);
    const thay = w.q("SELECT corrects_allocation_id, added_after_departure, opened_cmd_id FROM vc_trip_allocation WHERE id = ?", moi.id)[0];
    assert.deepEqual({ ...thay }, { corrects_allocation_id: a.suat[0], added_after_departure: 1, opened_cmd_id: ev[0].id });
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_manifest WHERE allocation_id = ? AND check_id IS NULL AND added_after_departure = 1", moi.id)[0].n, 1, "bản chốt dòng thêm sau xuất bến");
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_allocation_corrected'");
    assert.equal(nk.length, 1);
    assert.match(nk[0].detail, new RegExp(`^${a.ma}: ${a.don.code} — một suất Đã đón → Vắng · Bấm nhầm · văn phòng bấm thay$`));
    assert.doesNotMatch(nk[0].detail, LO);
    // Đ5: tin cho tài xế đang lái + người có trip.dispatch (Quản trị, Toàn quyền); người bấm (Bán hàng) không tự nhận.
    const tinCua = async (as: string) => (await w.call("GET", "/api/thong-bao", { as })).json.tin.filter((x: any) => x.loai === "chuyen" && /điều chỉnh kết quả một khách/.test(x.cau));
    const tx = await tinCua(DRIVER);
    assert.equal(tx.length, 1);
    assert.match(tx[0].cau, /^Văn phòng vừa điều chỉnh kết quả một khách ở chuyến /);
    assert.equal(tx[0].lienKet, `/cuoc-chuyen?id=${a.id}`);
    for (const as of [ADM, SUP]) {
      const t = await tinCua(as);
      assert.equal(t.length, 1, `điều phối ${as}`);
      assert.equal(t[0].lienKet, `/chuyen?id=${a.id}`);
      assert.doesNotMatch(t[0].cau, LO);
    }
    assert.equal((await tinCua(SALES)).length, 0, "người bấm không tự nhận tin");
    assert.equal((await tinCua(ACC)).length, 0, "Kế toán không nhận");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ2.3 (bước điểm tự xong): Đã đón → Vắng khi xe đã tới điểm trả và không còn ai xuống → điểm trả tự xong, Kết thúc được (không bị đẩy về gián đoạn)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await dangDon(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/don`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/don`)).status, 200);
    denGio("13:30");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemTra}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/tra`)).status, 200);
    const truoc = (await chiTiet(w, a.id)).diem.find((d: any) => d.id === a.diemTra);
    assert.equal(truoc.trangThai, "ARRIVED", "còn một khách 'Đã đón' chưa trả");
    const r = await dieuChinh(w, a.id, a.suat[0], "NO_SHOW");
    assert.equal(r.status, 201, r.text);
    assert.equal(r.json.diem.find((d: any) => d.id === a.diemTra).trangThai, "DONE", "điểm trả tự xong trong cùng lô");
    const kt = await tienDo(w, "tai-xe", a.id, "ket-thuc");
    assert.equal(kt.status, 200, kt.text);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ2.4: ngoài bảng / điểm đã xong → 409 câu tiếng Việt; lý do sai nhóm → 400; trạng thái lạ → 400; chuyến chưa chạy → 409; mốc cũ → 409; không ghi gì", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const p = await chuyenSan(w, { taiXe: DRIVER2 }); // tài xế khác: chuyến A dưới cùng giờ
    const chuaChay = await dieuChinh(w, p.id, p.suat[0], "WAITING");
    assert.equal(chuaChay.status, 409, chuaChay.text);
    assert.match(chuaChay.json.error.message, /Xe chưa chạy — chưa có kết quả nào để điều chỉnh/);
    const a = await dangDon(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/vang`)).status, 200);
    const vangDon = await dieuChinh(w, a.id, a.suat[0], "BOARDED");
    assert.equal(vangDon.status, 409, vangDon.text);
    assert.equal(vangDon.json.error.code, "dieu_chinh_ngoai_bang");
    assert.match(vangDon.json.error.message, /bấm "Đã đón"/);
    const choXuLy = await dieuChinh(w, a.id, a.suat[1], "NO_SHOW");
    assert.equal(choXuLy.status, 409);
    assert.match(choXuLy.json.error.message, /^Kết quả Chưa xử lý không điều chỉnh được thành Vắng\.$/);
    assert.equal((await dieuChinh(w, a.id, a.suat[0], "WAITING", { lyDo: "BAO_HUY_KHONG_DI" })).status, 400, "lý do nhóm khác");
    assert.equal((await dieuChinh(w, a.id, a.suat[0], "DROPPED")).status, 400, "trạng thái đích không nhận");
    const cu = await dieuChinh(w, a.id, a.suat[0], "WAITING", { version: 1 });
    assert.equal(cu.status, 409, "mốc cũ (màn chưa tải lại)");
    // Điểm đón đã xong (cả hai khách đã có kết quả) → không đưa về "Chưa xử lý"; chọn "Khách huỷ tại điểm" thì được.
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/don`)).status, 200);
    assert.equal((await chiTiet(w, a.id)).diem.find((d: any) => d.id === a.diemDon).trangThai, "DONE");
    const xong = await dieuChinh(w, a.id, a.suat[0], "WAITING");
    assert.equal(xong.status, 409, xong.text);
    assert.equal(xong.json.error.code, "diem_da_xong");
    assert.match(xong.json.error.message, /Điểm đón đã xong/);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'CORRECTION'")[0].n, 0, "từ chối thì không ghi");
    assert.equal((await dieuChinh(w, a.id, a.suat[0], "CANCELLED_AT_STOP")).status, 201);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ3 (HT-03): thu hồi xuất bến chưa có tiến độ — 201, chuyến về PLANNED, giờ xuất bến xoá; bản chụp + DEPARTED giữ nguyên; xuất bến lại được; tin tài xế + điều phối", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("12:45");
    const r = await thuHoi(w, a.id);
    assert.equal(r.status, 201, r.text);
    assert.equal(r.headers.get("location"), `/chuyen?id=${a.id}`);
    assert.equal(r.json.chuyen.trangThai, "PLANNED");
    assert.equal(r.json.chuyen.xuatBen, null);
    assert.deepEqual({ ...w.q("SELECT status, departed_at, departed_ms FROM vc_trip WHERE id = ?", a.id)[0] }, { status: "PLANNED", departed_at: null, departed_ms: null });
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'DEPARTED'", a.id)[0].n, 1, "sự kiện DEPARTED giữ nguyên");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check WHERE trip_id = ?", a.id)[0].n, 1, "bản chụp lúc xuất bến giữ nguyên");
    assert.equal(w.q("SELECT reason_code FROM vc_trip_event WHERE kind = 'DEPARTURE_REVOKED'")[0].reason_code, "DIEU_CHINH_BAM_NHAM");
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_departure_revoked'");
    assert.deepEqual(nk.map((x: any) => x.detail), [`${a.ma}: thu hồi lệnh cho xe chạy — Bấm nhầm · văn phòng bấm thay`]);
    const tx = (await w.call("GET", "/api/thong-bao", { as: DRIVER })).json.tin.filter((x: any) => /thu hồi (xuất bến|lệnh cho xe chạy)/.test(x.cau));
    assert.equal(tx.length, 1);
    assert.equal(tx[0].lienKet, `/cuoc-chuyen?id=${a.id}`);
    assert.equal((await w.call("GET", "/api/thong-bao", { as: ADM })).json.tin.filter((x: any) => /thu hồi (xuất bến|lệnh cho xe chạy)/.test(x.cau)).length, 1);
    assert.equal((await w.call("GET", "/api/thong-bao", { as: SALES })).json.tin.filter((x: any) => /thu hồi (xuất bến|lệnh cho xe chạy)/.test(x.cau)).length, 0, "người bấm");
    denGio("12:55");
    const lai = await tienDo(w, "tai-xe", a.id, "xuat-ben");
    assert.equal(lai.status, 200, lai.text);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_departure_check WHERE trip_id = ?", a.id)[0].n, 2, "xuất bến lại: bản chụp mới");
    assert.equal(w.q("SELECT status FROM vc_trip WHERE id = ?", a.id)[0].status, "RUNNING");
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ3.2: đã có tiến độ sau xuất bến → 409 chỉ đường; chuyến chưa chạy → 409", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const p = await chuyenSan(w, { taiXe: DRIVER2 }); // tài xế khác: chuyến A dưới cùng giờ
    const chuaChay = await thuHoi(w, p.id);
    assert.equal(chuaChay.status, 409);
    assert.match(chuaChay.json.error.message, /không có gì để thu hồi/);
    const a = await dangDon(w);
    const tienDoRoi = await thuHoi(w, a.id);
    assert.equal(tienDoRoi.status, 409, tienDoRoi.text);
    assert.equal(tienDoRoi.json.error.code, "da_co_tien_do");
    assert.match(tienDoRoi.json.error.message, /sửa từng khách bằng "Điều chỉnh…", hoặc "Kết thúc gián đoạn"/);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'DEPARTURE_REVOKED'")[0].n, 0);
  } finally {
    tat();
  }
});

test("ADR-0097 Đ3.2: quá kẹp lùi của chính sách (180 phút) → 409 'Đã quá 3 giờ' chỉ đường; lý do sai nhóm → 400", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const b = await chuyenSan(w);
    denGio("12:41");
    assert.equal((await tienDo(w, "tai-xe", b.id, "xuat-ben")).status, 200);
    assert.equal((await thuHoi(w, b.id, { lyDo: "GIAN_DOAN_XE_HONG" })).status, 400, "lý do nhóm khác");
    denGio("15:42");
    const qua = await thuHoi(w, b.id);
    assert.equal(qua.status, 409, qua.text);
    assert.equal(qua.json.error.code, "qua_gio_thu_hoi");
    assert.match(qua.json.error.message, /^Đã quá 3 giờ từ giờ xe chạy nên không thu hồi được — sửa từng khách bằng "Điều chỉnh…", hoặc "Kết thúc gián đoạn"/);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'DEPARTURE_REVOKED'")[0].n, 0);
  } finally {
    tat();
  }
});

test("ADR-0097 (HT-04 chuỗi): khách huỷ nhầm → điều chỉnh thành Đã đón → Đã trả → Kết thúc; điều chỉnh tiếp lần hai trên suất thay thế được (chuỗi corrects)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await dangDon(w);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[0]}/khach-huy`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/don`)).status, 200);
    const r1 = await dieuChinh(w, a.id, a.suat[0], "BOARDED", { lyDo: "DIEU_CHINH_KHACH_DOI_Y" });
    assert.equal(r1.status, 201, r1.text);
    const s1 = r1.json.suat.find((s: any) => s.loai === "PASSENGER" && !a.suat.includes(s.id));
    assert.equal(s1.trangThai, "BOARDED");
    const r2 = await dieuChinh(w, a.id, s1.id, "NO_SHOW");
    assert.equal(r2.status, 201, r2.text);
    const s2 = r2.json.suat.find((s: any) => s.loai === "PASSENGER" && s.id !== s1.id && !a.suat.includes(s.id));
    assert.equal(w.q("SELECT corrects_allocation_id c FROM vc_trip_allocation WHERE id = ?", s2.id)[0].c, s1.id, "chuỗi corrects giữ lịch sử");
    const r3 = await dieuChinh(w, a.id, s2.id, "BOARDED");
    assert.equal(r3.status, 409, "Vắng → Đã đón: dùng nút Đã đón");
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${s2.id}/don`)).status, 200);
    denGio("13:30");
    assert.equal((await tienDo(w, "tai-xe", a.id, `diem/${a.diemTra}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${s2.id}/tra`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, `phan-bo/${a.suat[1]}/tra`)).status, 200);
    assert.equal((await tienDo(w, "tai-xe", a.id, "ket-thuc")).status, 200);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE kind = 'CORRECTION'")[0].n, 2);
    kiemDinhKySach(w);
  } finally {
    tat();
  }
});
