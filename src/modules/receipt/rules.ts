// Luật THUẦN của biên nhận (module receipt — ADR-0024 đ1, ADR-0026 đ11; kế hoạch Task 8): dựng `ReceiptDto` theo DANH SÁCH TRẮNG — chép TỪNG trường được
// phép, KHÔNG BAO GIỜ trải đối tượng nguồn (`...order`), nên thêm một trường bí mật vào đơn/sổ sau này không thể tự lọt ra biên nhận. Không I/O.
import type { CompanyDto, OrderDetailDto, QrThanhToanDto, ReceiptDto } from "../../shared/contracts.ts";
import { noiDungChuyenKhoan } from "../../shared/noi-dung-chuyen-khoan.ts";
import { trangThaiHienThi } from "../../shared/order-status-label.ts";
import { payloadVietQr } from "../../shared/vietqr.ts";

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

// QR thanh toán (ADR-0108 đ3; đặc tả QR §7). Số tiền trên đường dẫn: chỉ số nguyên dương viết thường (không dấu, không mũ, không số 0 đầu, không khoảng trắng).
const SO_TIEN_QR_RE = /^[1-9]\d{0,12}$/;
export type KiemSoTienQr = { ok: true; soTien: number } | { ok: false; status: 400 | 409; ma: string; cau: string };

/** Thứ tự: đơn đã giao (kể cả đơn lệch cũ còn lại > 0) → hết tiền cần thu → số gõ. Thiếu số ⇒ bằng còn lại. */
export function kiemSoTienQr(i: { daGiao: boolean; conLai: number; soTienRaw: string | null }): KiemSoTienQr {
  if (i.daGiao) return { ok: false, status: 409, ma: "order_delivered", cau: "Đơn đã giao — không thu thêm." };
  if (i.conLai <= 0) return { ok: false, status: 409, ma: "nothing_due", cau: "Đơn không còn tiền cần thu." };
  if (i.soTienRaw === null || i.soTienRaw === "") return { ok: true, soTien: i.conLai };
  if (!SO_TIEN_QR_RE.test(i.soTienRaw)) return { ok: false, status: 400, ma: "invalid_input", cau: "Số tiền phải là số nguyên dương (đồng)." };
  const n = Number(i.soTienRaw);
  if (n > i.conLai) return { ok: false, status: 400, ma: "invalid_input", cau: "Số tiền không được lớn hơn số còn lại của đơn." };
  return { ok: true, soTien: n };
}

/** Dựng DTO QR theo DANH SÁCH TRẮNG — chép từng trường. Tài khoản sai dạng (dữ liệu hỏng) ⇒ lỗi, route trả 409. */
export function dungQrThanhToan(i: {
  maDon: string;
  soTien: number;
  conLai: number;
  tk: { congTy: string; nganHang: string; bin: string; soTaiKhoan: string; chuTaiKhoan: string };
}): { ok: true; dto: QrThanhToanDto } | { ok: false; cau: string } {
  const noiDung = noiDungChuyenKhoan(i.maDon);
  const p = payloadVietQr({ bin: i.tk.bin, soTaiKhoan: i.tk.soTaiKhoan, soTien: i.soTien, noiDung });
  if (!p.ok) return { ok: false, cau: p.loi };
  return {
    ok: true,
    dto: { payload: p.payload, soTien: i.soTien, conLai: i.conLai, maDon: i.maDon, noiDung, congTy: i.tk.congTy, nganHang: i.tk.nganHang, soTaiKhoan: i.tk.soTaiKhoan, chuTaiKhoan: i.tk.chuTaiKhoan },
  };
}
