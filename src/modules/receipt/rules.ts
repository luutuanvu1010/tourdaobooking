// Luật THUẦN của biên nhận (module receipt — ADR-0024 đ1, ADR-0026 đ11; kế hoạch Task 8): dựng `ReceiptDto` theo DANH SÁCH TRẮNG — chép TỪNG trường được
// phép, KHÔNG BAO GIỜ trải đối tượng nguồn (`...order`), nên thêm một trường bí mật vào đơn/sổ sau này không thể tự lọt ra biên nhận. Không I/O.
import type { CompanyDto, OrderDetailDto, ReceiptDto } from "../../shared/contracts.ts";
import { trangThaiHienThi } from "../../shared/order-status-label.ts";

export function dungBienNhan(order: OrderDetailDto, company: CompanyDto, tien: { daTra: number; conLai: number; huy?: ReceiptDto["huy"] }): ReceiptDto {
  return {
    company: { name: company.name, taxCode: company.taxCode, address: company.address, hotline: company.hotline, email: company.email },
    orderCode: order.orderCode,
    status: trangThaiHienThi({ status: order.status, deliveredAt: order.deliveredAt, completedAt: order.completedAt }),
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerNote: order.customerNote,
    services: order.services.map((s) => ({
      name: s.name,
      unit: s.unit,
      pax: { adult: s.pax.adult, child: s.pax.child, senior: s.pax.senior, infant: s.pax.infant },
      departDate: s.departDate,
      departTime: s.departTime,
      pickupTime: s.pickupTime,
      pickupPlace: s.pickupPlace,
      checkinDate: s.checkinDate,
      checkinTime: s.checkinTime,
      checkinPlace: s.checkinPlace,
      items: s.items.map((it) => ({ description: it.description, detail: it.detail, quantity: it.quantity, unitPrice: it.unitPrice, lineTotal: it.lineTotal })),
    })),
    subtotal: order.subtotal,
    // ADR-0109 QĐ4: dòng "Giảm giá" gửi khách = giảm giá HIỆU LỰC (min(giảm giá, tạm tính hiện hành), máy chủ tính bằng `effectiveMoney`) để Tạm tính − Giảm giá =
    // Tổng cộng; bằng giảm giá đã lưu trừ khi bớt khách làm tạm tính nhỏ hơn. Không suy ngược `subtotal − total` (chỗ tính thứ hai — Hiến chương 5.4).
    discount: order.giamGiaHieuLuc,
    total: order.total,
    daTra: tien.daTra,
    conLai: tien.conLai,
    // ADR-0089 đ9a — chép TỪNG trường (danh sách trắng), không trải đối tượng nguồn.
    huy: tien.huy
      ? { nhom: tien.huy.nhom, daTra: tien.huy.daTra, dangDoiChieu: tien.huy.dangDoiChieu, daDuyet: tien.huy.daDuyet, daChi: tien.huy.daChi, daChuyen: tien.huy.daChuyen, daDuyetChuyen: tien.huy.daDuyetChuyen, han: tien.huy.han }
      : null,
  };
}
