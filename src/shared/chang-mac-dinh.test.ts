// `changMacDinh` (ADR-0054 D10.2; ADR nháp nơi trả mặc định D3 — kế hoạch 2026-10-01-may-chu-o-moi-chang Task 6 TC-M4, Task 7.4). Luật THUẦN, chỉ form dùng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHE_DO_DUA_DON, changMacDinh, isCheDoDuaDon } from "./chang-mac-dinh.ts";

const BEN = { id: "a941dd7d-faab-4098-9ab9-1df7fa6dd551", ten: "Bến tàu du lịch Nha Trang" };
const KS = { pickupLocationId: null, pickupPlace: "KS Mường Thanh" };

test("TC-M4: hai chiều → 2 chặng (đi rồi về); chặng về ĐẢO nơi đón / trả của chặng đi, giờ = giờ gợi ý; không điểm mặc định → nơi trả trống", () => {
  const legs = changMacDinh({ mode: "ROUND_TRIP", returnTimeHint: "16:00", noiTraMacDinh: null }, KS);
  assert.deepEqual(legs, [
    { direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: null, pickupPlace: "KS Mường Thanh", dropoffLocationId: null, dropoffPlace: "" },
    { direction: "RETURN", pickupDate: "", pickupTime: "16:00", pickupLocationId: null, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "KS Mường Thanh" },
  ]);
});

test("NT tiêu chí 4: hai chiều + điểm mặc định → chặng đi TRẢ ở điểm, chặng về ĐÓN ở điểm (trả về nơi đón của khách); một chiều → chỉ chặng đi trả ở điểm", () => {
  const hai = changMacDinh({ mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinh: BEN }, KS);
  assert.equal(hai.length, 2);
  assert.deepEqual([hai[0]!.dropoffLocationId, hai[0]!.dropoffPlace], [BEN.id, ""]);
  assert.deepEqual([hai[1]!.pickupLocationId, hai[1]!.pickupPlace, hai[1]!.pickupTime, hai[1]!.dropoffPlace], [BEN.id, "", "", "KS Mường Thanh"]);
  const mot = changMacDinh({ mode: "ONE_WAY", returnTimeHint: null, noiTraMacDinh: BEN }, { pickupLocationId: null, pickupPlace: "" });
  assert.deepEqual(mot, [{ direction: "OUT", pickupDate: "", pickupTime: "", pickupLocationId: null, pickupPlace: "", dropoffLocationId: BEN.id, dropoffPlace: "" }]);
  // Nơi đón của khách là điểm danh mục → chặng về trả ĐÚNG điểm đó.
  const diem = changMacDinh({ mode: "ROUND_TRIP", returnTimeHint: null, noiTraMacDinh: BEN }, { pickupLocationId: "ec67ff94-bb00-4546-842a-aedb5f916b0a", pickupPlace: "" });
  assert.deepEqual([diem[1]!.dropoffLocationId, diem[1]!.dropoffPlace], ["ec67ff94-bb00-4546-842a-aedb5f916b0a", ""]);
});

test("TC-M4: không đưa đón (NONE) hoặc KHÔNG có dòng mẫu (null) → 0 chặng", () => {
  assert.deepEqual(changMacDinh({ mode: "NONE", returnTimeHint: null, noiTraMacDinh: null }, KS), []);
  assert.deepEqual(changMacDinh(null, KS), []);
});

test("tập chế độ ĐÓNG đúng CHECK của 0058", () => {
  assert.deepEqual(Object.keys(CHE_DO_DUA_DON), ["NONE", "ONE_WAY", "ROUND_TRIP"]);
  assert.equal(isCheDoDuaDon("ROUND_TRIP"), true);
  assert.equal(isCheDoDuaDon("BOTH"), false);
});
