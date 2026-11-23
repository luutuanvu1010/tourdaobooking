// Biên nhận KHÁCH LẺ gộp phí đưa đón vào giá dịch vụ (ADR-0218 Đ3). THUẦN, không I/O. Tiền của đơn KHÔNG đổi: dòng phí vẫn nằm trong đơn, tạm tính / tổng / đã thu / còn lại đọc đúng số hôm nay;
// gộp chỉ xảy ra ở lớp dựng nội dung gửi khách. Mọi thành tiền mới của dòng in ra đi qua `thanhTienDong` (Hiến chương 5.4 — không viết phép nhân thứ hai).
//   · Dịch vụ do Tour Đảo bán, mọi lượt đón đi chung, mỗi lượt tính đúng bằng số khách tính tiền ⇒ CỘNG tổng đơn giá phí mỗi khách (các chiều) vào đơn giá dòng người lớn, trẻ em, người cao tuổi; em bé giữ nguyên.
//   · Dịch vụ do Tour Đảo bán nhưng không chia đều được (xe riêng; chiều về ít khách; dịch vụ tính theo nhóm hay nhập tay; hoặc cộng vào đơn giá không ra đúng tổng) ⇒ MỘT dòng trọn gói: số khách + thành tiền
//     đã gồm phí, không in đơn giá (`tronGoi`).
//   · Dịch vụ do nhà cung cấp khác bán: phí đưa đón là tiền của Tour Đảo — không cộng vào phần của nhà cung cấp; MỘT dòng riêng «<Tên dịch vụ> — đưa đón» ở phần Tour Đảo (`dongDuaDonTourDao`).
// Mẫu đối tác (HD-02-DT) hoặc công tắc «Hiện riêng» bật ⇒ không gộp (trả nguyên như trước).
import type { MauBienNhan, OrderDetailDto, ReceiptLineDto, ReceiptPhiDto } from "../../shared/contracts.ts";
import { nguoiBanCuaDong } from "../../shared/chia-phan-nguoi-ban.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";
import { payingGuests, thanhTienDong } from "../../shared/order-lines.ts";

export const HAU_TO_DUA_DON = "đưa đón";
/** Chữ dòng trọn gói (đã gồm đưa đón) — không đơn giá. */
export const CHU_TRON_GOI = "Trọn gói, gồm đưa đón";

export interface DauVaoGop {
  chup: readonly BanChup[];
  congTyChuId: string | null;
}
export interface KetQuaGop {
  /** `true` = đang gộp (khách lẻ, công tắc tắt); `false` = trả nguyên như hôm nay (các trường dưới rỗng / giữ gốc). */
  gop: boolean;
  /** Dòng thay thế theo id dịch vụ (chỉ dịch vụ có đổi). */
  items: ReadonlyMap<string, ReceiptLineDto[]>;
  /** Dòng phí hiển thị riêng: đang gộp ⇒ rỗng; không gộp ⇒ như `ReceiptDto.phiDuaDon` cũ. */
  phiDuaDon: ReceiptPhiDto[];
  /** Dòng riêng của dịch vụ do nhà cung cấp khác bán, in ở phần Tour Đảo (chỉ khi đang gộp). */
  dongDuaDonTourDao: { description: string; lineTotal: number }[];
  /** Tên mục ghi thêm vào `dichVu` của phần Tour Đảo thay cho «Phí đưa đón»: đang gộp ⇒ các «<tên> — đưa đón» của nhà cung cấp khác; không gộp ⇒ null (dùng tên cũ). */
  tenDongPhanTourDao: string[] | null;
}

const KHONG_GOP = (order: OrderDetailDto): KetQuaGop => ({
  gop: false, items: new Map(),
  phiDuaDon: (order.phiDuaDon?.dong ?? []).map((d) => ({ description: d.description, quantity: d.quantity, unitPrice: d.unitPrice, lineTotal: d.lineTotal })),
  dongDuaDonTourDao: [], tenDongPhanTourDao: null,
});

export function gopPhiDonVaoDichVu(order: OrderDetailDto, mau: MauBienNhan, hienRieng: boolean, ban: DauVaoGop | null): KetQuaGop {
  const dong = order.phiDuaDon?.dong ?? [];
  if (mau === "doi_tac" || hienRieng || dong.length === 0) return KHONG_GOP(order);
  const chupCua = new Map((ban?.chup ?? []).map((c) => [c.serviceId, c]));
  const items = new Map<string, ReceiptLineDto[]>();
  const rieng: { description: string; lineTotal: number }[] = [];
  for (const s of order.services) {
    const phiCua = dong.filter((d) => d.serviceId === s.id);
    if (phiCua.length === 0) continue;
    const tongPhi = phiCua.reduce((t, d) => t + d.lineTotal, 0);
    if (nguoiBanCuaDong(chupCua.get(s.id), ban?.congTyChuId ?? null) !== null) {
      rieng.push({ description: `${s.name} — ${HAU_TO_DUA_DON}`, lineTotal: tongPhi });
      continue;
    }
    const cu: ReceiptLineDto[] = s.items.map((it) => ({ description: it.description, detail: it.detail, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal }));
    const tongCu = cu.reduce((t, l) => t + l.lineTotal, 0);
    const khach = payingGuests(s.pax);
    // Chia đều được khi: dịch vụ theo đầu người, mọi dòng phí đi chung và đúng bằng số khách tính tiền (không xe riêng, không chiều về ít khách).
    const chiaDeu = s.unit === "perPax" && phiCua.every((d) => d.kind === "PER_PAX" && d.quantity === khach);
    let moi: ReceiptLineDto[] | null = null;
    if (chiaDeu) {
      const moiKhach = phiCua.reduce((t, d) => t + d.unitPrice, 0);
      const thu = s.items.map((it, i) => {
        const traTien = it.paxCode === "adult" || it.paxCode === "child" || it.paxCode === "senior";
        if (!traTien) return cu[i]!;
        const unitPrice = it.unitPrice + moiKhach;
        return { ...cu[i]!, unitPrice, lineTotal: thanhTienDong({ quantity: it.quantity, unitPrice }) };
      });
      // Cộng vào đơn giá phải ra ĐÚNG tổng (số dòng người lớn / trẻ em / cao tuổi cộng lại bằng số khách tính tiền); lệch ⇒ trọn gói.
      if (thu.reduce((t, l) => t + l.lineTotal, 0) === tongCu + tongPhi) moi = thu;
    }
    items.set(s.id, moi ?? [{ description: CHU_TRON_GOI, detail: null, quantity: khach, unitPrice: 0, lineTotal: tongCu + tongPhi, tronGoi: { soKhach: khach } }]);
  }
  return { gop: true, items, phiDuaDon: [], dongDuaDonTourDao: rieng, tenDongPhanTourDao: rieng.map((r) => r.description) };
}
