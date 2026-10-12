// TỪ CHỐI CHUYẾN của tài xế đối tác (ADR-0053 D8.3–D8.6; kế hoạch A4 T7 — NT-4, NT-7; G-A4-14, G-A4-15, G-A4-24, G-A4-25). Khung thử (cả ứng dụng + SQLite thật).
// LUẬT ĐỒNG HỒ (§2, G-A4-26): đường Từ chối THÀNH CÔNG đi qua trigger B8.3 so GIỜ CSDL (giờ thật) — mọi bài ở đây bật `batDongHo(<giờ thật>)` và gieo chuyến
// NGÀY VN THẬT + 1, chỉ tiến đồng hồ giả. Ngoại lệ có tên: bài "đua sát hạn" (đồng hồ giả CHẬM hơn giờ thật, hạn nằm giữa hai đồng hồ). Tên khách, SĐT, số giấy tờ GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as esbuild from "esbuild";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { seedStaff } from "../../../tests/audit/harness.mjs";
import {
  ACC, ADM, DRIVER, DRIVER_PARTNER, SALES, SUP, batDongHo, chiTiet, chuyenSan, denGio, nhaXeKhung, setup, thanhTaiXe, tienDo, uuid, xeNhaXe,
} from "../../../tests/audit/dieu-phoi-khung.mjs";
import { msToVnLocal } from "../../shared/vn-date.ts";

const DRIVER_PARTNER2 = "66666666-6666-4666-8666-666666666669";
const AT = "2026-09-01T00:00:00.000Z";
let so = 0;
/** Hồ sơ `pty-<id>` (đã có) thành tài xế của nhà xe `carrierId` (DRIVES_FOR + GPLX hạng D) — khuôn tai-xe-doi-tac-cuoc.test.ts. */
function laiChoNhaXe(w: any, staffId: string, carrierId: string) {
  so++;
  w.sqlite.prepare(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
    VALUES (?, ?, ?, 'DRIVES_FOR', '2026-09-01', ?, ?)`).run(uuid(), `pty-${staffId}`, carrierId, AT, AT);
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, 'Nơi cấp Dò Tìm', 'D', '2030-12-31', ?, ?)`).run(`g-tc-${so}`, `pty-${staffId}`, `79440000000${so}`, `79440000000${so}`, AT, AT);
}
/** Ngày VN thật + `n` (luật đồng hồ — gọi SAU `batDongHo`). */
const ngayThat = (n: number) => msToVnLocal(Date.now() + n * 86_400_000).date;
/** Khung thử: tài xế đối tác 1 (nhà xe Một), tài xế đối tác 2 (nhà xe Một — xếp lại được cùng xe), chuyến ngày mai 12:30–15:00 trên xe nhà xe Một. */
async function theGioi(v: { tre?: number } = {}) {
  const tat = batDongHo(Date.now() - (v.tre ?? 0));
  const w = setup();
  seedStaff(w.sqlite, { id: DRIVER_PARTNER2, phone: "0900000036", name: "Tài Xế Đối Tác Hai", perms: ["DRIVER_PARTNER"] });
  const nx = nhaXeKhung(w, "Nhà xe Một");
  laiChoNhaXe(w, DRIVER_PARTNER, nx);
  laiChoNhaXe(w, DRIVER_PARTNER2, nx);
  const xe1 = xeNhaXe(w, nx);
  const ngay = ngayThat(1);
  const a = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xe1, ngay, bd: "12:30", kt: "15:00", gio: "13:00" });
  return { tat, w, nx, xe1, ngay, a };
}
const tuChoi = (w: any, id: string, body: Record<string, unknown>, as = DRIVER_PARTNER) =>
  w.call("POST", `/api/van-chuyen/cuoc-cua-toi/${id}/tu-choi`, { as, body });
const soNhatKy = (w: any, id: string) => w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = ?", id)[0].n as number;
const dongLai = (w: any, id: string) =>
  w.q("SELECT driver_party_id, valid_to_at, close_reason, refuse_reason_code, closed_by_party_id, closed_by FROM vc_trip_driver WHERE trip_id = ? ORDER BY rowid", id);
const tinTuChoi = async (w: any, as: string, ngan = "tat-ca") =>
  ((await w.call("GET", `/api/thong-bao?ngan=${ngan}`, { as })).json.tin as any[]).filter((t) => t.loai === "chuyen" && /từ chối/.test(t.cau));
const suaChuyen = async (w: any, id: string, body: Record<string, unknown>) => {
  const c = await chiTiet(w, id);
  return w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
};

test("A4 T7 NT-4 + NT-7: tài xế đối tác Từ chối TRƯỚC hạn → 200 {daTuChoi}; dòng lái REFUSED (lý do, người đóng = chính mình); MỘT dòng nhật ký không tên; chuyến giữ CHUA_CO_TAI_XE; tin 'tu_choi' tới Bán hàng / Quản trị / Toàn quyền, không tới Kế toán / tài xế; văn phòng thấy tên + giờ, lý do chỉ người có trip.dispatch; tài xế mở lại → 404; gửi lại cùng requestId → 200, không thêm gì", async () => {
  const { tat, w, a } = await theGioi();
  try {
    const truoc = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER });
    assert.equal(truoc.json.tuChoiDuoc, true, truoc.text);
    assert.deepEqual(truoc.json.lyDoTuChoi.map((l: any) => l.code ?? l.ma).sort(), ["TCC_BAN_LICH_KHAC", "TCC_KHAC", "TCC_OM_VIEC_RIENG", "TCC_XE_KHONG_CHAY"]);
    const rid = uuid();
    const r = await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_BAN_LICH_KHAC" });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual(r.json, { daTuChoi: true }, "không dữ liệu chuyến");
    const lai = dongLai(w, a.id);
    assert.equal(lai.length, 1);
    assert.equal(lai[0].close_reason, "REFUSED");
    assert.equal(lai[0].refuse_reason_code, "TCC_BAN_LICH_KHAC");
    assert.equal(lai[0].closed_by_party_id, `pty-${DRIVER_PARTNER}`);
    assert.equal(lai[0].closed_by, DRIVER_PARTNER);
    assert.notEqual(lai[0].valid_to_at, null);
    assert.equal(soNhatKy(w, a.id), 1);
    const nk = w.q("SELECT detail FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = ?", a.id)[0].detail;
    assert.equal(nk, `${a.ma}: tài xế từ chối chuyến — TCC_BAN_LICH_KHAC`, "mã chuyến + mã lý do, không tên, không SĐT");
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'DRIVER_REFUSED' AND created_by = ?", a.id, DRIVER_PARTNER)[0].n, 1);
    // NT-7: chuyến giữ ở CHUA_CO_TAI_XE; tài xế mở lại → 404.
    const vp = await chiTiet(w, a.id, SALES);
    assert.equal(vp.chuyen.taiXe, null);
    assert.ok(vp.chuyen.lyDoGiu.some((l: any) => l.ma === "CHUA_CO_TAI_XE"), JSON.stringify(vp.chuyen.lyDoGiu));
    assert.equal(vp.tuChoi.length, 1);
    assert.equal(vp.tuChoi[0].tenTaiXe, "Tài Xế Đối Tác");
    assert.equal(vp.tuChoi[0].lyDo, "Bận lịch khác");
    assert.match(vp.tuChoi[0].luc.gio, /^\d\d:\d\d$/);
    const kt = await chiTiet(w, a.id, ACC);
    assert.equal(kt.tuChoi.length, 1);
    assert.equal(kt.tuChoi[0].tenTaiXe, "Tài Xế Đối Tác");
    assert.equal("lyDo" in kt.tuChoi[0], false, "G-A4-14: Kế toán không thấy lý do");
    // Danh mục lý do (`lyDo` — mọi lý do đang dùng, khuôn có sẵn) có chữ "Bận lịch khác"; lý do ĐÃ CHỌN thì không ở đâu khác: tuChoi, nhật ký chuyến.
    assert.ok(!JSON.stringify([kt.tuChoi, kt.nhatKy, kt.chuyen]).match(/Bận lịch khác|TCC_/), "Kế toán không thấy lý do đã chọn");
    assert.ok(kt.nhatKy.some((e: any) => e.loai === "DRIVER_REFUSED" && e.nhan === "Tài xế từ chối chuyến"), JSON.stringify(kt.nhatKy));
    assert.equal((await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${a.id}`, { as: DRIVER_PARTNER })).status, 404);
    // Tin "tu_choi" (D8.4 bước 5): người có trip.dispatch; không tên, không lý do, không mã đơn.
    const mong = `Tài xế đã từ chối chuyến ${a.ma}`;
    for (const as of [SALES, ADM, SUP]) {
      const t = await tinTuChoi(w, as);
      assert.equal(t.length, 1, `${as}: ${JSON.stringify(t)}`);
      assert.ok(t[0].cau.startsWith(mong) && t[0].cau.endsWith("— cần xếp người khác"), t[0].cau);
      assert.equal(t[0].lienKet, `/chuyen?id=${a.id}`);
      assert.doesNotMatch(t[0].cau, /Tài Xế Đối Tác|Bận lịch|TCC_|TD-/);
    }
    assert.equal((await tinTuChoi(w, SALES, "cua-toi")).length, 1, "ngăn 'Của tôi' (D8.4 bước 5)");
    for (const as of [ACC, DRIVER, DRIVER_PARTNER, DRIVER_PARTNER2]) assert.deepEqual(await tinTuChoi(w, as), [], `${as} không nhận tin từ chối`);
    // Lệnh lặp của chính mình → 200, không thêm nhật ký / sự kiện / tin.
    const lap = await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_KHAC" });
    assert.equal(lap.status, 200, lap.text);
    assert.deepEqual(lap.json, { daTuChoi: true });
    assert.equal(soNhatKy(w, a.id), 1);
    assert.equal(w.q("SELECT count(*) n FROM vc_trip_event WHERE trip_id = ? AND kind = 'DRIVER_REFUSED'", a.id)[0].n, 1);
    assert.equal((await tinTuChoi(w, SALES)).length, 1);
    // Lệnh mới (requestId khác) sau khi đã từ chối → 404 (không còn lái).
    assert.equal((await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 404);
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 (lỗi, thứ tự G-A4-15): lý do thiếu / ngoài nhóm / không có / đã ngưng → 400; tài xế công ty → 403; Toàn quyền không lái → 403 (câu riêng); tài xế đối tác khác → 404; qua hạn → 409 refuse_deadline_passed; mọi ca không ghi gì", async () => {
  const { tat, w, a, ngay } = await theGioi();
  try {
    for (const body of [{ requestId: uuid() }, { requestId: uuid(), lyDo: "CPX_PHU_THU_CHO" }, { requestId: uuid(), lyDo: "TCC_KHONG_CO" }, { requestId: uuid(), lyDo: "" }]) {
      const r = await tuChoi(w, a.id, body);
      assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
    }
    w.sqlite.prepare("UPDATE vc_reason SET active = 0 WHERE code = 'TCC_XE_KHONG_CHAY'").run();
    assert.equal((await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_XE_KHONG_CHAY" })).status, 400, "lý do đã ngưng");
    const cty = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" }, DRIVER);
    assert.equal(cty.status, 403, cty.text);
    const sup = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" }, SUP);
    assert.equal(sup.status, 403, sup.text);
    assert.equal(sup.json.error.message, "Toàn quyền không từ chối thay — đổi người bằng xếp xe.");
    assert.equal((await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" }, DRIVER_PARTNER2)).status, 404, "IDOR: chuyến của người khác");
    assert.equal((await tuChoi(w, uuid(), { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 404, "chuyến không có");
    // Thứ tự: 403 / 404 đứng trước 400.
    assert.equal((await tuChoi(w, a.id, {}, DRIVER_PARTNER2)).status, 404);
    assert.equal((await tuChoi(w, a.id, {}, DRIVER)).status, 403);
    denGio("00:31", ngay); // hạn = 12:30 − 12 giờ = 00:30 (máy chủ nói trước, lô không chạy)
    const qh = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" });
    assert.equal(qh.status, 409, qh.text);
    assert.equal(qh.json.error.code, "refuse_deadline_passed");
    assert.equal(soNhatKy(w, a.id), 0);
    assert.equal(dongLai(w, a.id)[0].valid_to_at, null, "dòng lái vẫn mở");
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 (trip_not_planned): người có vế hạn tự lái đã Xuất bến → 409 trip_not_planned, không ghi", async () => {
  const tat = batDongHo(Date.now());
  try {
    const w = setup();
    const p = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
      as: SUP,
      body: { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 90, dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 300, departureWindowMinutes: 1440, refuseLeadMinutes: 720, officePhone: null, acceptWaitMinutes: 10, autoConfirmTransfer: true },
    });
    assert.equal(p.status, 201, p.text);
    thanhTaiXe(w, `pty-${SUP}`);
    const ngay = ngayThat(1);
    const a = await chuyenSan(w, { taiXe: SUP, ngay, bd: "14:00", kt: "16:00", gio: "14:30" });
    denGio("00:05", ngay); // trước hạn 02:00 — chỉ trạng thái chặn
    const x = await tienDo(w, "tai-xe", a.id, "xuat-ben", {}, SUP);
    assert.equal(x.status, 200, x.text);
    const r = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" }, SUP);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "trip_not_planned");
    assert.equal(soNhatKy(w, a.id), 0);
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 ĐUA SÁT HẠN (ngoại lệ có tên của luật đồng hồ: đồng hồ giả = hạn − 1 giây, giờ thật > hạn) → máy chủ cho qua, trigger B8.3 (tc83_) chặn → 409 refuse_deadline_passed, KHÔNG 500; không ghi", async () => {
  const { tat, w, a } = await theGioi({ tre: 120_000 }); // đồng hồ giả chậm hơn giờ thật 2 phút
  try {
    const han = Date.now() + 1000; // giờ thật ≈ Date.now() + 120 giây > hạn
    w.sqlite.prepare("UPDATE vc_refuse_deadline SET deadline_ms = ? WHERE trip_id = ?").run(han, a.id); // chỉ giảm — trigger cho phép
    const r = await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" });
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "refuse_deadline_passed");
    assert.equal(soNhatKy(w, a.id), 0, "lô huỷ cả — không nhật ký lẻ");
    assert.equal(dongLai(w, a.id)[0].valid_to_at, null);
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 SONG SONG: Từ chối cùng lúc văn phòng đổi tài xế → đúng một bên thắng; bên thua 409 (stale) hoặc 404 (đã không còn lái); nhật ký khớp bên thắng", async () => {
  const { tat, w, a } = await theGioi();
  try {
    const c = await chiTiet(w, a.id);
    const [sua, tc] = await Promise.all([
      w.call("PUT", `/api/van-chuyen/chuyen/${a.id}`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER_PARTNER2}` } }),
      tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_KHAC" }),
    ]);
    const thang = [tc.status, sua.status].filter((s) => s === 200).length;
    assert.equal(thang, 1, `tu-choi ${tc.status} ${tc.text} / sửa ${sua.status} ${sua.text}`);
    if (tc.status === 200) {
      assert.equal(sua.status, 409, sua.text);
      assert.equal(soNhatKy(w, a.id), 1);
      assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_edited' AND target_id = ?", a.id)[0].n, 0);
    } else {
      assert.ok([404, 409].includes(tc.status), tc.text);
      if (tc.status === 409) assert.equal(tc.json.error.code, "stale");
      assert.equal(soNhatKy(w, a.id), 0);
    }
  } finally {
    tat();
  }
});

// G-A4-25 tất định: route đọc chuyến (ảnh cũ) → văn phòng đổi tài xế / huỷ chuyến → lô Từ chối dựng từ ảnh cũ: câu cổng thua → hàm ĐỌC LẠI và trả đúng 409
// (stale khi đã không còn lái; trip_not_planned khi chuyến đã huỷ) thay cho 500 hay "stale" chung chung. Gọi thẳng `lenhTuChoi` (khuôn cap-nhat-khach.test.ts).
const bo = await esbuild.build({
  stdin: { contents: 'export { lenhTuChoi } from "./tu-choi"; export { docNen } from "./dieu-phoi-doc";', resolveDir: new URL(".", import.meta.url).pathname, loader: "ts" },
  bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent",
});
const M = (await import(`data:text/javascript;base64,${Buffer.from(bo.outputFiles[0]!.text).toString("base64")}`)) as Record<string, any>;
const nguoiDP = { id: DRIVER_PARTNER, partyId: `pty-${DRIVER_PARTNER}`, permissions: ["DRIVER_PARTNER"] };

test("A4 T7 G-A4-25 CỔNG THUA (tất định): ảnh chuyến cũ + văn phòng đổi tài xế xen giữa → 409 stale; + văn phòng huỷ chuyến xen giữa → 409 trip_not_planned; không ghi, không 500", async () => {
  const { tat, w, a, xe1, ngay } = await theGioi();
  try {
    const cu = await M.docNen(w.env.DB, a.id);
    assert.equal((await suaChuyen(w, a.id, { taiXePartyId: `pty-${DRIVER_PARTNER2}` })).status, 200);
    const r = await M.lenhTuChoi(w.env.DB, cu, { requestId: uuid(), lyDo: "TCC_KHAC" }, nguoiDP, Date.now());
    assert.ok(r instanceof Response);
    assert.equal(r.status, 409);
    assert.equal(((await r.json()) as any).error.code, "stale");
    assert.equal(soNhatKy(w, a.id), 0);
    const b = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xeNhaXe(w, w.q("SELECT owner_party_id o FROM vc_vehicle WHERE id = ?", xe1)[0].o), ngay, bd: "16:00", kt: "18:00", gio: "16:30" });
    const cu2 = await M.docNen(w.env.DB, b.id);
    const c = await chiTiet(w, b.id);
    const lyDoHuy = c.lyDo.find((l: any) => l.nhom === "HUY_CHUYEN")?.code ?? c.lyDo.find((l: any) => /^HC/.test(l.code))?.code;
    const h = await w.call("POST", `/api/van-chuyen/chuyen/${b.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: lyDoHuy } });
    assert.equal(h.status, 200, h.text);
    const r2 = await M.lenhTuChoi(w.env.DB, cu2, { requestId: uuid(), lyDo: "TCC_KHAC" }, nguoiDP, Date.now());
    assert.equal(r2.status, 409);
    assert.equal(((await r2.json()) as any).error.code, "trip_not_planned");
    assert.equal(soNhatKy(w, b.id), 0);
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 LỆNH LẶP (G-A4-15, TĐ-2): tài xế MỚI được xếp dùng lại requestId Từ chối của người cũ → 409 request_id_reused, không 200; cùng requestId cho chuyến khác → 404", async () => {
  const { tat, w, a, xe1, ngay } = await theGioi();
  try {
    const rid = uuid();
    assert.equal((await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_KHAC" })).status, 200);
    const s = await suaChuyen(w, a.id, { taiXePartyId: `pty-${DRIVER_PARTNER2}` });
    assert.equal(s.status, 200, s.text);
    const r = await tuChoi(w, a.id, { requestId: rid, lyDo: "TCC_KHAC" }, DRIVER_PARTNER2);
    assert.notEqual(r.status, 200, r.text);
    assert.equal(r.status, 409, r.text);
    assert.equal(r.json.error.code, "request_id_reused");
    assert.equal(dongLai(w, a.id).at(-1).valid_to_at, null, "tài xế mới vẫn lái");
    // Người cũ được xếp chuyến khác: cùng requestId cho chuyến KHÁC → 404 (không có lệnh Từ chối của mình ở chuyến đó, và đang lái thì requestId đã dùng → 409).
    const b = await chuyenSan(w, { taiXe: DRIVER_PARTNER, xe: xeNhaXe(w, w.q("SELECT owner_party_id o FROM vc_vehicle WHERE id = ?", xe1)[0].o), ngay, bd: "16:00", kt: "18:00", gio: "16:30" });
    const k = await tuChoi(w, b.id, { requestId: rid, lyDo: "TCC_KHAC" });
    // Lệch chữ NT-4 ("chuyến khác → 404") có ghi: người gọi ĐANG lái chuyến b nên qua cổng 404; mã đã dùng cho chuyến khác → 409 request_id_reused
    // (traLenhLap — khuôn chung). 404 chỉ khi người gọi không lái chuyến đó (dòng dưới).
    assert.equal(k.status, 409, k.text);
    assert.equal(k.json.error.code, "request_id_reused");
    assert.equal(soNhatKy(w, b.id), 0);
    assert.equal((await tuChoi(w, uuid(), { requestId: rid, lyDo: "TCC_KHAC" })).status, 404, "chuyến không có");
  } finally {
    tat();
  }
});

test("A4 T7 NT-4 GIÁ (ADR-0057 lô có sẵn): sau Từ chối, văn phòng giao lại cho xe NHÀ XE KHÁC → đảo giá cũ + chụp giá nhà xe mới; chỉ đổi tài xế, cùng nhà xe, cùng xe → giá giữ", async () => {
  const { tat, w, nx, a } = await theGioi();
  try {
    const tuyen = (await w.call("POST", "/api/van-chuyen/tuyen", { as: ACC, body: { ten: "Tuyến thử Từ chối" } })).json.tuyen.find((t: any) => t.ten === "Tuyến thử Từ chối").ma;
    const co = (await w.call("POST", "/api/van-chuyen/co-xe", { as: ACC, body: { tuSoKhach: 10, denSoKhach: 16 } })).json.coXe.find((c: any) => c.tuSoKhach === 10 && c.dangDung).ma;
    const gia = (nhaXe: string, soTien: number) => w.call("POST", "/api/van-chuyen/bang-gia", {
      as: ACC, body: { requestId: uuid(), nhaXePartyId: nhaXe, tuyen, coXe: co, soTien, tuNgay: ngayThat(0), denNgay: null, ghiChu: null, thayDongId: null },
    });
    assert.equal((await gia(nx, 1_200_000)).status, 201);
    const nx2 = nhaXeKhung(w, "Nhà xe Hai");
    assert.equal((await gia(nx2, 1_300_000)).status, 201);
    const dong = () => w.q("SELECT kind, amount, carrier_party_id c FROM vc_trip_cost_line WHERE trip_id = ? ORDER BY rowid", a.id).map((r: any) => [r.kind, r.amount, r.c === nx ? 1 : r.c === nx2 ? 2 : 0]);
    assert.equal((await suaChuyen(w, a.id, { tuyen })).status, 200);
    assert.deepEqual(dong(), [["SNAPSHOT", 1_200_000, 1]]);
    assert.equal((await tuChoi(w, a.id, { requestId: uuid(), lyDo: "TCC_XE_KHONG_CHAY" })).status, 200);
    assert.deepEqual(dong(), [["SNAPSHOT", 1_200_000, 1]], "Từ chối không chạm tiền");
    // Chỉ đổi tài xế, cùng nhà xe, cùng xe → giá giữ.
    const s1 = await suaChuyen(w, a.id, { taiXePartyId: `pty-${DRIVER_PARTNER2}` });
    assert.equal(s1.status, 200, s1.text);
    assert.deepEqual(dong(), [["SNAPSHOT", 1_200_000, 1]]);
    // Xe nhà xe khác + tài xế lái cho nhà xe đó → đảo + chụp.
    laiChoNhaXe(w, DRIVER_PARTNER, nx2);
    const s2 = await suaChuyen(w, a.id, { xeId: xeNhaXe(w, nx2), taiXePartyId: `pty-${DRIVER_PARTNER}` });
    assert.equal(s2.status, 200, s2.text);
    assert.deepEqual(dong(), [["SNAPSHOT", 1_200_000, 1], ["REVERSAL", -1_200_000, 1], ["SNAPSHOT", 1_300_000, 2]]);
  } finally {
    tat();
  }
});

test("A4 T7 bài canh LUẬT ĐỒNG HỒ (§2, G-A4-26): tệp thử van-chuyen gọi route tu-choi thì không được gọi batDongHo KHÔNG tham số (NOW_GIA = 2027-03-11 — bom hẹn giờ của B8.3)", () => {
  const thuMuc = new URL("./", import.meta.url);
  const loi: string[] = [];
  let soTep = 0;
  for (const f of readdirSync(thuMuc).filter((x) => x.endsWith(".test.ts"))) {
    const src = readFileSync(new URL(f, thuMuc), "utf8");
    if (!/cuoc-cua-toi\/\$\{[^}]+\}\/tu-choi/.test(src)) continue; // GỌI route (đường dẫn có id nội suy) — không tính khoá bảng `…/:id/tu-choi`
    soTep++;
    if (/batDongHo\(\s*\)/.test(src)) loi.push(f);
  }
  assert.ok(soTep >= 1, "chống bài rỗng: ít nhất tệp này gọi route tu-choi");
  assert.deepEqual(loi, []);
});

