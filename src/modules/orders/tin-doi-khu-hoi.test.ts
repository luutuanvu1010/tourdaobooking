// ADR-0062 Đ2 — KHỨ HỒI khuôn chữ nhật ký `trip_updated` (hàm viết THẬT của orders: describeTripChange / describeTripUpdates + đuôi đặt gấp kemDatGap)
// ↔ hàm đọc tin `phanDoiCuaTin` (src/shared/tin-doi-don.ts). Đổi chữ nhật ký mà quên hàm đọc ⇒ đỏ. Test ở đây vì src/shared/ không import src/modules/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LY_DO_DAT_GAP, ghiDatGapNhatKy } from "../../shared/chang-dua-don.ts"; // dat-gap.ts dùng lại đúng hàm này (re-export)
import { NHAN_TRUONG_THOI_GIAN } from "../../shared/truong-thoi-gian.ts";
import { phanDoiCuaTin } from "../../shared/tin-doi-don.ts";
import { describeTripChange, describeTripUpdates, type ValidTrip } from "./service-rules.ts";

const TRUOC: ValidTrip = {
  departDate: "2027-03-11", departTime: "07:30", pickupTime: "07:00", pickupPlace: "Khách sạn Biển Xanh", checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
};
const SAU: ValidTrip = {
  departDate: "2027-03-12", departTime: null, pickupTime: "06:30", pickupPlace: "12 Trần Phú 0901234567", checkinDate: "2027-03-13", checkinTime: "14:00", checkinPlace: "Sảnh B", note: "Ghi chú Anh Nam",
};
const GIA_TRI = ["departDate", "departTime", "pickupTime", "checkinDate", "checkinTime"] as const;
const CHU = ["pickupPlace", "checkinPlace", "note"] as const;
const hien = (v: string | null) => (v === null ? "(trống)" : /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : v);
/** Kỹ thuật kemDatGap của orders/index.ts: nối đúng ghiDatGapNhatKy(nhãn lý do). */
const kemDatGap = (detail: string, nhan: string | null) => (nhan === null ? detail : `${detail}${ghiDatGapNhatKy(nhan)}`);

test("khứ hồi describeTripChange × kemDatGap: MỌI tập con khác rỗng của 8 trường × mọi đuôi đặt gấp → đọc ra đúng phần giữ, không đuôi, không chữ thô", () => {
  const truong = [...GIA_TRI, ...CHU];
  let dem = 0;
  for (let mask = 1; mask < 1 << truong.length; mask++) {
    const chon = truong.filter((_, i) => mask & (1 << i));
    const sau: ValidTrip = { ...TRUOC };
    for (const k of chon) (sau as unknown as Record<string, string | null>)[k] = SAU[k];
    for (const nhan of [null, ...Object.values(LY_DO_DAT_GAP)]) {
      for (const ten of ["Tour 3 đảo", "Anh Nam 0901234567"]) {
        const d = kemDatGap(describeTripChange(ten, TRUOC, sau)!, nhan);
        const k = phanDoiCuaTin("trip_updated", d);
        const giu = [
          ...GIA_TRI.filter((f) => chon.includes(f)).map((f) => `${NHAN_TRUONG_THOI_GIAN[f]} ${hien(TRUOC[f])} → ${hien(SAU[f])}`),
          ...(chon.includes("pickupPlace") ? ["đổi nơi đón"] : []),
        ];
        if (giu.length === 0) assert.equal(k, null, d);
        else assert.deepEqual(k, { loai: "cu-the", phan: giu.join(", "), gioHen: false }, d);
        const cau = k?.loai === "cu-the" ? k.phan : "";
        for (const cam of ["Anh Nam", "0901234567", "Trần Phú", "Sảnh B", "Ghi chú", "đặt gấp", "đảo"]) assert.ok(!cau.includes(cam), `${d} → ${cau}`);
        dem++;
      }
    }
  }
  assert.equal(dem, 255 * 5 * 2);
});

test("khứ hồi describeTripUpdates (hai dịch vụ nối ' | '): đổi giống nhau → cụ thể; đổi khác nhau → câu chung (tên có thể nuốt ' | ' — không đoán)", () => {
  const stored = [{ id: "a", name: "Tour 3 đảo", trip: TRUOC }, { id: "b", name: "Lặn biển", trip: TRUOC }];
  const giong = describeTripUpdates(stored, [{ id: "a", trip: { ...TRUOC, pickupTime: "06:30" } }, { id: "b", trip: { ...TRUOC, pickupTime: "06:30" } }])!;
  assert.deepEqual(phanDoiCuaTin("trip_updated", giong), { loai: "cu-the", phan: "giờ đón 07:00 → 06:30", gioHen: false });
  const khac = describeTripUpdates(stored, [{ id: "a", trip: { ...TRUOC, pickupTime: "06:30" } }, { id: "b", trip: { ...TRUOC, departTime: "08:00" } }])!;
  assert.deepEqual(phanDoiCuaTin("trip_updated", khac), { loai: "chung", cau: "chang", gioHen: false });
  const moi1 = describeTripUpdates(stored, [{ id: "a", trip: { ...TRUOC, note: "x" } }, { id: "b", trip: { ...TRUOC, pickupTime: "06:30" } }])!;
  const k = phanDoiCuaTin("trip_updated", moi1);
  assert.ok(k?.loai === "chung" || (k?.loai === "cu-the" && k.phan === "giờ đón 07:00 → 06:30"), JSON.stringify(k));
});
