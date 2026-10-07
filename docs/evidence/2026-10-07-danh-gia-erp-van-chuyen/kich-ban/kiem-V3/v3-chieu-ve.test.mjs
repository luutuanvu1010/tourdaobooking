// C28 — chiều về ít người: máy tự gắn tên; rút rồi xếp lại KHÔNG gửi personKeys (đúng như màn hình hôm nay) có ra người khác không. CHỈ ĐỌC repo.
import { test } from "node:test";
import { DRIVER, NGAY, SALES, batDongHo, setup, taoChuyen, uuid, vnMs, xe } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donTuy, legOut, legRet, xepRaw } from "../sc-nangluc/lib.mjs";

const ghi = (nhan, o) => console.log(`OBS ${nhan} ${JSON.stringify(o)}`);

test("C28: chặng về 2/4 người — tên máy tự gắn, rút rồi xếp lại", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "22:00"));
  try {
    for (let lan = 1; lan <= 3; lan++) {
      const w = setup();
      const d = await donTuy(w, { soNguoi: 4, legs: [legOut("08:00", "Khách sạn Chiều Về"), legRet("15:00", "Khách sạn Chiều Về", { paxOverride: 2 })] });
      const ret = d.legs.find((l) => l.direction === "RETURN");
      const T = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "14:50", kt: "16:00" });
      const r = await xepRaw(w, T.chuyen.id, [{ legId: ret.id, soSuat: 2 }]);
      const ten = () => w.q(`SELECT p.full_name AS t FROM vc_trip_allocation a JOIN ord_passenger p ON p.person_key = a.passenger_key AND p.voided_at IS NULL
                             WHERE a.trip_id = ? AND a.valid_to_at IS NULL AND a.kind = 'PASSENGER' ORDER BY p.full_name`, T.chuyen.id).map((x) => x.t);
      const truoc = ten();
      const suat = w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER'", T.chuyen.id).map((x) => x.id);
      const ct = (await w.call("GET", `/api/van-chuyen/chuyen/${T.chuyen.id}`, { as: SALES })).json;
      const rut = await w.call("POST", `/api/van-chuyen/chuyen/${T.chuyen.id}/rut`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), suatIds: suat } });
      const r2 = await xepRaw(w, T.chuyen.id, [{ legId: ret.id, soSuat: 2 }]);
      ghi(`C28.lan${lan}`, { xep: r.status, tenLan1: truoc, rut: rut.status, xepLai: r2.status, tenSauXepLai: ten() });
      // Thử đổi tên một suất đã gắn bằng SQL (lách máy chủ) → trigger gắn tên một lần?
      let loi = null;
      try {
        const s = w.q("SELECT id FROM vc_trip_allocation WHERE trip_id = ? AND valid_to_at IS NULL AND kind = 'PASSENGER' LIMIT 1", T.chuyen.id)[0].id;
        const khac = w.q("SELECT person_key FROM ord_passenger WHERE order_id = ? AND voided_at IS NULL", d.id).map((x) => x.person_key);
        w.sqlite.prepare("UPDATE vc_trip_allocation SET passenger_key = ? WHERE id = ?").run(khac[khac.length - 1], s);
      } catch (e) { loi = String(e.message).slice(0, 120); }
      if (lan === 1) ghi("C28.doi_ten_suat_sql", { loi });
    }
  } finally { tat(); }
});
