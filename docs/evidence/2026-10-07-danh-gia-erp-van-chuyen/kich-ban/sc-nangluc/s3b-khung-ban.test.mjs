// S3b — Khung bận (xe vào xưởng): đặt khung bận rồi tạo / sửa chuyến chồng lên; khung bận chồng chuyến có sẵn; khung bận của tài xế.
import { test } from "node:test";
import {
  ADM, DRIVER, DRIVER2, NGAY, SALES, batDongHo, setup, taoChuyen, vnMs, xe, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghiNhan, taoChuyenRaw, tt } from "./lib.mjs";

const log = ghiNhan("s3b-khung-ban");
const than = (tu, den, lyDo = "BAN_XE_SUA_CHUA") => ({ batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den }, lyDo });

test("S3b khung bận xe 09:00–12:00 (Sửa chữa) — tạo chuyến chồng / sát / sửa chuyến dời vào", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X = xe(w, 16);
    log("sales_dat_khung_ban", tt(await w.call("POST", `/api/van-chuyen/xe/${X}/ban`, { as: SALES, body: than("09:00", "12:00") })));
    const k = await w.call("POST", `/api/van-chuyen/xe/${X}/ban`, { as: ADM, body: than("09:00", "12:00") });
    log("adm_dat_khung_ban", { status: k.status, dangCo: k.json?.dangCo });
    log("chuyen_chong_1000_1100", tt(await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "11:00" })));
    log("chuyen_chong_mot_phan_0830_0930", tt(await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "08:30", kt: "09:30" })));
    log("adm_pha_le_nghi_vao_khung_ban", tt(await taoChuyenRaw(w, { as: ADM, xe: X, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "11:00", extra: { nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } } })));
    const sat = await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "12:00", kt: "13:00" });
    log("chuyen_sat_sau_khung_1200_1300", { ...tt(sat), ma: sat.json?.chuyen?.ma });
    const truoc = await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER2}`, bd: "07:00", kt: "08:00" });
    log("chuyen_truoc_khung_0700_0800_TX2", { ...tt(truoc), ma: truoc.json?.chuyen?.ma });
    // Sửa chuyến 07:00–08:00 dời vào 08:30–09:30 (chồng khung)
    if (truoc.status === 201) {
      const id = truoc.json.chuyen.id;
      const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as: SALES })).json;
      log("sua_doi_vao_khung_0830_0930", tt(await w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), batDau: { ngay: NGAY, gio: "08:30" }, ketThuc: { ngay: NGAY, gio: "09:30" } } })));
    }
    // Khung bận mới chồng chuyến đã có (07:00–08:00 của TX2)
    log("khung_ban_chong_chuyen_co_san_0730_0830", tt(await w.call("POST", `/api/van-chuyen/xe/${X}/ban`, { as: ADM, body: than("07:30", "08:30", "BAN_XE_BAO_DUONG") })));
    // Rút khung → tạo lại chuyến 10:00
    const kid = k.json?.dangCo?.[0];
    if (kid) {
      log("rut_khung", tt(await w.call("POST", `/api/van-chuyen/xe/${X}/ban/${kid.id}/rut`, { as: ADM, body: { version: kid.version } })));
      log("chuyen_1000_sau_khi_rut", tt(await taoChuyenRaw(w, { as: SALES, xe: X, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "11:00" })));
    }
    log("db_khung_ban", { rows: w.q("SELECT subject, start_at, end_at, reason_code, withdrawn_at IS NOT NULL AS da_rut FROM vc_unavailability").map((r) => ({ ...r })) });
    // Khung bận cho TÀI XẾ (subject DRIVER) — có route không? Thử chèn thẳng để đọc trigger.
    let loi = null;
    try {
      w.sqlite.prepare("INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at) VALUES (?, 'DRIVER', NULL, ?, ?, ?, ?, ?, 'BAN_XE_KHAC', ?, ?)")
        .run(uuid(), `pty-${DRIVER}`, vnMs(NGAY, "14:00"), vnMs(NGAY, "15:00"), new Date(vnMs(NGAY, "14:00")).toISOString(), new Date(vnMs(NGAY, "15:00")).toISOString(), "2026-09-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z");
    } catch (e) { loi = String(e.message); }
    log("khung_ban_tai_xe_chen_thang_sql", { loi });
  } finally { tat(); }
});

test("S3b.2 khung bận của TÀI XẾ: nhóm lý do BAN_TAI_XE và trigger chặn", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    log("nhom_ly_do_ban", { rows: w.q("SELECT reason_group, count(*) n FROM vc_reason WHERE reason_group LIKE 'BAN%' GROUP BY reason_group").map((r) => ({ ...r })) });
    log("trigger_driver_closed", { rows: w.q("SELECT name FROM sqlite_master WHERE type = 'trigger' AND name LIKE 'vc_unavailability%'").map((r) => r.name) });
    // Chèn lý do BAN_TAI_XE giả rồi thử lại → trigger driver_closed?
    w.sqlite.exec("INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES ('BAN_TX_THU', 'BAN_TAI_XE', 'Thử', 1, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')");
    let loi = null;
    try {
      w.sqlite.prepare("INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at) VALUES (?, 'DRIVER', NULL, ?, ?, ?, ?, ?, 'BAN_TX_THU', ?, ?)")
        .run(uuid(), `pty-${DRIVER}`, vnMs(NGAY, "14:00"), vnMs(NGAY, "15:00"), new Date(vnMs(NGAY, "14:00")).toISOString(), new Date(vnMs(NGAY, "15:00")).toISOString(), "2026-09-01T00:00:00.000Z", "2026-09-01T00:00:00.000Z");
    } catch (e) { loi = String(e.message); }
    log("khung_ban_tai_xe_sql_co_ly_do", { loi });
    const r = w.q("SELECT name FROM sqlite_master WHERE sql LIKE '%/api/van-chuyen/tai-xe%'");
    log("route_ban_tai_xe", { ghiChu: "xem grep route trong báo cáo", r });
  } finally { tat(); }
});
