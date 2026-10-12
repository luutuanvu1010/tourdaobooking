// S9 — Trùng giờ: cùng tài xế 2 chuyến chồng giờ trên 2 xe; cùng xe 2 tài xế chồng giờ; sửa chuyến dời vào chồng; lớp CSDL (trigger) khi chèn thẳng.
import { test } from "node:test";
import {
  ADM, DRIVER, DRIVER2, NGAY, SALES, batDongHo, setup, taoChuyen, vnMs, xe, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { ghiNhan, taoChuyenRaw, tt } from "./lib.mjs";

const log = ghiNhan("s9-trung-gio");

test("S9 trùng giờ xe / tài xế", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    const w = setup();
    const X1 = xe(w, 16), X2 = xe(w, 16);
    const A = await taoChuyen(w, { xe: X1, taiXe: `pty-${DRIVER}`, bd: "09:00", kt: "11:00" });
    log("A", { ma: A.chuyen.ma });
    log("cung_TX_xe_khac_chong_1000_1200", tt(await taoChuyenRaw(w, { as: SALES, xe: X2, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "12:00" })));
    log("cung_xe_TX_khac_chong_1000_1200", tt(await taoChuyenRaw(w, { as: SALES, xe: X1, taiXe: `pty-${DRIVER2}`, bd: "10:00", kt: "12:00" })));
    log("cung_TX_xe_khac_ADM_pha_le_nghi", tt(await taoChuyenRaw(w, { as: ADM, xe: X2, taiXe: `pty-${DRIVER}`, bd: "10:00", kt: "12:00", extra: { nghiPhaLe: { lyDo: "PHA_LE_SU_CO" } } })));
    log("chuyen_bao_trum_0800_1200_TX2_X2", tt(await taoChuyenRaw(w, { as: SALES, xe: X2, taiXe: `pty-${DRIVER2}`, bd: "08:00", kt: "12:00" })));
    // Sửa: chuyến B (X2, TX2, 14:00–15:00) dời vào 10:00 với TX = DRIVER (đổi tài xế + giờ)
    const B = await taoChuyen(w, { xe: X2, taiXe: `pty-${DRIVER2}`, bd: "14:00", kt: "15:00" });
    const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${B.chuyen.id}`, { as: SALES })).json;
    log("sua_B_doi_TX_va_gio_vao_chong", tt(await w.call("PUT", `/api/van-chuyen/chuyen/${B.chuyen.id}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), taiXePartyId: `pty-${DRIVER}`, batDau: { ngay: NGAY, gio: "10:00" }, ketThuc: { ngay: NGAY, gio: "10:30" } } })));
    // Lớp CSDL: chèn thẳng chuyến chồng giờ cùng xe → trigger
    let loi = null;
    try {
      const t0 = w.q("SELECT * FROM vc_trip WHERE id = ?", A.chuyen.id)[0];
      const cols = Object.keys(t0);
      const vals = cols.map((c) => (c === "id" ? uuid() : c === "code" ? "CX-THU-99" : c === "last_cmd_id" ? uuid() : t0[c]));
      w.sqlite.prepare(`INSERT INTO vc_trip (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`).run(...vals);
    } catch (e) { loi = String(e.message); }
    log("csdl_chen_thang_chuyen_trung_xe", { loi });
    log("db_trips", { rows: w.q("SELECT code, vehicle_id = ? AS x1, status, planned_start_ms FROM vc_trip ORDER BY code", X1).map((r) => ({ ...r, bd: new Date(r.planned_start_ms + 7 * 3600e3).toISOString().slice(11, 16) })) });
  } finally { tat(); }
});
