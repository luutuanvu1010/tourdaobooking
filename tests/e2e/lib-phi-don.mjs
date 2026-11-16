// Khung dùng chung cho MỘT ca «có phí đưa đón» trong các kịch bản đọc tiền (Phí đưa đón Đợt C, Task 5: cong-no-dai-ly, bien-lai, sua-so-khach, qr-thanh-toan). Không phải kịch bản
// (không có trong danh-sach.mjs). Cùng cách dựng / dọn với phi-don-don.mjs và phi-don-xac-nhan.mjs: khu vực + địa điểm dùng một lần (hậu tố theo Date.now()), mức chung từ HÔM QUA cho
// khu vực thử và cho mọi khu vực đang bật còn thiếu mức chung (điều kiện bật phí), bật phí từ HÔM NAY (ngày xác nhận luôn là hôm nay giờ Việt Nam). `donDep` (gọi trong `finally`):
// TẮT phí → kết thúc mức của khu vực thử (mức chung của khu vực khác để mở, xem chú thích ở bước đó) → đưa địa điểm ra khỏi khu vực → ngưng khu vực; mỗi bước tự bắt lỗi.
import assert from "node:assert/strict";
import { call, vnDate } from "./lib.mjs";

const BEN = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)

/**
 * Lượt đón chiều đi từ khách sạn `ksId` tới bến. ĐỔI CÓ CHỦ ĐÍCH 16/11 (ADR-0214, Task 3): phí trên đơn do văn phòng CHỌN — truyền `phiDon` (= `dungPhiDon(...).phiDon`, đúng
 * số tiền của ca) khi đơn do văn phòng lập. Đơn do Đối tác lập KHÔNG được gửi mức (400) — vắng `phiDon` thì lượt đón «chưa chọn» (đơn đi «chờ xác nhận», văn phòng chọn ở Còn vé — Task 4).
 */
export const luotDon = (ksId, phiDon) => ({ direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: ksId, pickupPlace: "", dropoffLocationId: BEN, dropoffPlace: "", ...(phiDon ? { phiDon } : {}) });

/**
 * Dựng phí đưa đón cho một ca: khu vực thử mức `muc` đ/khách. `admin` = phiên Quản trị. Trả `{ ks, donDep }` — `ks.id` dùng cho `luotDon`. Đầu ca phí phải đang tắt (kịch bản trước đã dọn).
 */
export async function dungPhiDon(admin, { nhan, muc }) {
  const S = String(Date.now()).slice(-6);
  const CHU = S.replace(/\d/g, (d) => "ABCDEGHKLM"[d]); // tên không được chứa dãy số dài
  const ZONE = `E2E_${nhan}${S}`;
  const HOM_QUA = vnDate(-1);
  const HOM_NAY = vnDate(0);
  const NGAY_MAI = vnDate(1);
  const da = { diaDiem: [], mucDaThem: [], vung: [] };
  const phai = (r, status, ten) => {
    assert.equal(r.status, status, `${ten}: ${r.status} ${JSON.stringify(r.body)}`);
    return r.body;
  };
  const bang = async () => (await call(admin, "GET", "/api/pricing/phi-don?ngay=0001-01-01")).body;
  const donDep = async () => {
    const thu = async (ten, f) => { try { await f(); } catch (e) { console.error(`dọn «${ten}» lỗi: ${e?.message ?? e}`); } };
    await thu("tắt ngày bắt đầu áp", async () => {
      const ap = (await call(admin, "GET", "/api/pricing/phi-don")).body.batDauAp;
      if (ap.ngay !== null) phai(await call(admin, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: null, tuLucDaDoc: ap.tuLuc }), 200, "tắt phí");
      assert.equal((await call(admin, "GET", "/api/pricing/phi-don")).body.batDauAp.ngay, null, "cuối ca: ngày bắt đầu áp = tắt");
    });
    await thu("kết thúc mức", async () => {
      // Chỉ mức của khu vực thử; mức chung thêm cho khu vực đang bật còn thiếu để MỞ (phí đã tắt nên không đổi tiền đơn nào) — kết thúc nó làm kịch bản phí sau trên cùng D1 không
      // thêm lại được mức từ hôm qua (409 prc_overlap).
      const mo = (await bang()).muc.filter((m) => da.mucDaThem.includes(m.id) && m.denNgay === null && da.vung.includes(m.dieuKien.vung));
      for (const m of mo) await call(admin, "POST", `/api/pricing/phi-don/${m.id}/ket-thuc`, { validTo: m.tuNgay, expectedUpdatedAt: m.updatedAt });
    });
    await thu("đưa địa điểm ra khỏi khu vực", async () => {
      const ds = (await call(admin, "GET", "/api/locations")).body.locations;
      for (const id of da.diaDiem) {
        const l = ds.find((x) => x.id === id);
        if (l) await call(admin, "PUT", `/api/locations/${l.id}`, { name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: false, zoneCode: null, expectedUpdatedAt: l.updatedAt });
      }
    });
    await thu("ngưng khu vực thử", async () => {
      const zs = (await call(admin, "GET", "/api/locations")).body.zones;
      for (const code of da.vung) {
        const z = zs.find((x) => x.code === code);
        if (z && z.active) await call(admin, "PUT", `/api/location-zones/${code}`, { name: z.name, sortOrder: z.sortOrder, active: false, expectedUpdatedAt: z.updatedAt });
      }
    });
  };
  try {
    phai(await call(admin, "POST", "/api/location-zones", { code: ZONE, name: `Khu vực ${nhan} ${CHU}`, sortOrder: 9 }), 201, `khu vực ${ZONE}`);
    da.vung.push(ZONE);
    const ks0 = phai(await call(admin, "POST", "/api/locations", { code: `${ZONE}_KS`, name: `Khách sạn ${nhan} ${CHU}`, locationTypeCode: "HOTEL", address: null, sortOrder: 95 }), 201, "địa điểm").location;
    da.diaDiem.push(ks0.id);
    phai(await call(admin, "PUT", `/api/locations/${ks0.id}`, { name: ks0.name, locationTypeCode: ks0.locationTypeCode, address: ks0.address, sortOrder: ks0.sortOrder, active: ks0.active, zoneCode: ZONE, expectedUpdatedAt: ks0.updatedAt }), 200, "xếp địa điểm vào khu vực");
    const b0 = await bang();
    assert.equal(b0.batDauAp.ngay, null, "đầu ca: phí đang tắt (kịch bản trước đã dọn)");
    const coMucChung = (vung) => b0.muc.some((m) => m.dieuKien.vung === vung && m.dieuKien.cap === null && m.dieuKien.dichVu === null && m.dieuKien.nhom === null
      && m.dieuKien.chieu === null && m.dieuKien.xeRieng === false && m.tuNgay <= HOM_NAY && (m.denNgay === null || m.denNgay >= NGAY_MAI));
    for (const v of b0.vung.map((x) => x.code)) {
      if (v !== ZONE && coMucChung(v)) continue;
      // Từ hôm qua; đã có dòng cùng điều kiện kết thúc hôm qua (kịch bản cũ dọn kiểu cũ) ⇒ thử từ hôm nay.
      const them = (tu) => call(admin, "POST", "/api/pricing/phi-don", { kind: "PER_PAX", amount: v === ZONE ? muc : 20_000, validFrom: tu, validTo: null, note: `e2e ${nhan}`, dieuKien: [{ khoa: "ZONE", giaTri: v }] });
      let r = await them(HOM_QUA);
      if (r.status === 409 && r.body?.error?.code === "prc_overlap") r = await them(HOM_NAY);
      const m = phai(r, 201, `mức ${v}`).muc;
      da.mucDaThem.push(m.id);
    }
    const tuLuc = (await call(admin, "GET", "/api/pricing/phi-don")).body.batDauAp.tuLuc;
    phai(await call(admin, "POST", "/api/pricing/phi-don/bat-dau-ap", { ngay: HOM_NAY, tuLucDaDoc: tuLuc }), 200, "bật phí từ hôm nay");
    return { ks: ks0, donDep, phiDon: { loai: [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000].includes(muc) ? "DANH_SACH" : "SO_KHAC", soTien: muc } };
  } catch (e) {
    await donDep();
    throw e;
  }
}
