// Luật thuần KHỚP CHƯƠNG TRÌNH MIỄN PHÍ ĐƯA ĐÓN (ADR-0218 Đ2.2). Không I/O, không import module khác. Đợt 1 chưa có mã nào dùng nó để tính tiền;
// Đợt 2 gọi từ hàm tính phí một lượt đón. Khớp theo NGÀY ĐÓN của lượt (ngày đi), không theo ngày xác nhận.
export type ChuongTrinh = {
  id: string; name: string; scope: "ALL" | "SERVICES" | "PARTNERS"; tripFrom: string; tripTo: string; includePrivate: boolean; createdAt: string;
  services: readonly string[]; parties: readonly string[];
};
export type LuotDonXet = { catalogCode: string | null; bookerPartyId: string | null; pickupDate: string | null; xeRieng: boolean };

/**
 * Chương trình khớp lượt đón: ngày đón trong khoảng; dịch vụ thuộc phạm vi HOẶC bên đặt thuộc phạm vi (hoặc phạm vi tất cả); lượt đi chung, hoặc xe riêng với cờ «gồm xe riêng».
 * `pickupDate` null (nháp chưa có ngày đón) ⇒ null. Nhiều chương trình khớp ⇒ cái tạo sớm nhất (bằng nhau thì mã nhỏ hơn).
 */
export function chuongTrinhKhop(ds: readonly ChuongTrinh[], luot: LuotDonXet): ChuongTrinh | null {
  if (luot.pickupDate === null) return null;
  const ngay = luot.pickupDate;
  const khop = ds.filter((c) => {
    if (ngay < c.tripFrom || ngay > c.tripTo) return false;
    if (luot.xeRieng && !c.includePrivate) return false;
    if (c.scope === "ALL") return true;
    if (c.scope === "SERVICES") return luot.catalogCode !== null && c.services.includes(luot.catalogCode);
    return luot.bookerPartyId !== null && c.parties.includes(luot.bookerPartyId);
  });
  khop.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return khop[0] ?? null;
}
