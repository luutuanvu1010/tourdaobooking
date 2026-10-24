// Luật THUẦN của biên nhận (module receipt — ADR-0024 đ1, ADR-0026 đ11; kế hoạch Task 8): dựng `ReceiptDto` theo DANH SÁCH TRẮNG — chép TỪNG trường được
// phép, KHÔNG BAO GIỜ trải đối tượng nguồn (`...order`), nên thêm một trường bí mật vào đơn/sổ sau này không thể tự lọt ra biên nhận. Không I/O.
import type { CompanyDto, OrderDetailDto, QrThanhToanDto, ReceiptDto, ReceiptPhanDto } from "../../shared/contracts.ts";
import { chiaPhanNguoiBan, nguoiBanCuaDong } from "../../shared/chia-phan-nguoi-ban.ts";
import type { BanChup } from "../../shared/hoa-hong-dong.ts";
import { noiDungChuyenKhoan } from "../../shared/noi-dung-chuyen-khoan.ts";
import { trangThaiHienThi } from "../../shared/order-status-label.ts";
import { payloadVietQr } from "../../shared/vietqr.ts";

/**
 * Người bán của từng dịch vụ, do route đọc (`phanThuongMaiCuaDon` của orders, SAU `can(`) — chỉ ba trường cần để chia phần. `chup` mang cả mức hoa hồng, a% giá vốn,
 * người hưởng; `ten` mang cả tên người hưởng: hàm dưới CHỈ đọc `cungUng.sellerPartyId` và tên NGƯỜI BÁN, không chép gì khác (bài số lạ ở bien-nhan.test.ts).
 * null = không đọc được (đơn huỷ / vừa biến mất) ⇒ mọi dịch vụ vào phần Tour Đảo.
 */
export interface NguoiBanChoBienNhan {
  chup: readonly BanChup[];
  ten: ReadonlyMap<string, string>;
  congTyChuId: string | null;
}
/** Tiền của biên nhận (billing — một hàm `conLai`). `theoThuCho` = đã trả ròng theo «thu cho ai» của khoản thu (id hồ sơ → số); vắng ⇒ mọi khoản thu cho Tour Đảo. */
export interface TienBienNhan {
  daTra: number;
  conLai: number;
  huy?: ReceiptDto["huy"];
  theoThuCho?: ReadonlyMap<string, number>;
}

const TOUR_DAO = "";
/**
 * Chia biên nhận theo người bán (ADR-0078 điều 10; đặc tả P5; sổ đại lý đợt 2 Task 8). Luật (Ruling R-80…R-83 sổ thi công):
 *  - Nhóm: người bán của dòng = `cungUng.sellerPartyId` của bản chụp; người bán là công ty chủ, thiếu người bán (MISSING — dòng nhập tay chưa ghi tay), dòng không có
 *    bản chụp (đơn xác nhận trước khi có bảng mức) ⇒ phần Tour Đảo (tới nay mọi dịch vụ đều do Tour Đảo đứng tên bán — ADR-0078 điều 3). Phần Tour Đảo đứng đầu,
 *    rồi nhà cung cấp theo thứ tự dịch vụ trên đơn.
 *  - Giảm giá hiệu lực của đơn trừ vào phần Tour Đảo trước, phần còn lại trừ lần lượt vào các phần sau (R-81) ⇒ Σ `tong` = tổng cộng của đơn.
 *  - Đã trả: khoản thu «thu cho» một nhà cung cấp của phần đó tính vào phần đó; mọi khoản khác (không chọn, thu cho công ty, thu cho hồ sơ không còn là người bán
 *    trên đơn, trả lại khách) tính vào phần Tour Đảo. Phần nào nhận quá số phải trả thì phần dư chuyển sang các phần còn thiếu theo thứ tự; dư nữa (khách trả dư)
 *    ghi vào phần đầu (R-82) ⇒ Σ `daTra` = đã trả, Σ `conLai` = còn lại của đơn.
 *  - Đơn huỷ ⇒ không phần nào (biên nhận huỷ đọc `huy`).
 * Không I/O. Không chép mức, tỷ lệ, người hưởng.
 */
export function chiaPhanBienNhan(order: OrderDetailDto, tenCongTy: string, ban: NguoiBanChoBienNhan | null, tien: Pick<TienBienNhan, "daTra" | "theoThuCho">): ReceiptPhanDto[] {
  if (order.status === "cancelled") return [];
  // Nhóm theo người bán + giảm giá trừ vào phần Tour Đảo trước (R-81): MỘT hàm `chiaPhanNguoiBan` — billing dùng cùng hàm cho trần phần của quầy (Ruling R-154).
  const chupCua = new Map((ban?.chup ?? []).map((c) => [c.serviceId, c]));
  const ds = chiaPhanNguoiBan(order.services, (s) => nguoiBanCuaDong(chupCua.get(s.id), ban?.congTyChuId ?? null), (s) => s.items.reduce((t, it) => t + it.lineTotal, 0), order.giamGiaHieuLuc)
    .map((p) => ({ k: p.nguoiBan ?? TOUR_DAO, dichVu: p.dong.map((s) => s.name), giam: p.giamGia, tong: p.tong, da: 0 }));
  if (ds.length === 0) return [];
  // Đã trả theo «thu cho ai» (R-82).
  const theo = tien.theoThuCho ?? new Map<string, number>();
  let tienNcc = 0;
  for (const p of ds) {
    if (p.k === TOUR_DAO) continue;
    p.da = Math.max(0, theo.get(p.k) ?? 0);
    tienNcc += p.da;
  }
  const tourDao = ds.find((p) => p.k === TOUR_DAO);
  let du = tien.daTra - tienNcc; // phần của Tour Đảo (gồm khoản thu cho hồ sơ không còn bán gì, trả lại khách); không có phần Tour Đảo ⇒ chuyển hết sang phần khác
  if (tourDao) {
    tourDao.da = du;
    du = 0;
  }
  for (const p of ds) {
    if (p.da > p.tong) {
      du += p.da - p.tong;
      p.da = p.tong;
    } else if (p.da < 0) {
      du += p.da;
      p.da = 0;
    }
  }
  for (const p of ds) {
    if (du <= 0) break;
    const them = Math.min(du, p.tong - p.da);
    p.da += them;
    du -= them;
  }
  if (du > 0) ds[0]!.da += du; // khách trả dư
  for (const p of ds) {
    if (du >= 0) break;
    const bot = Math.min(-du, p.da);
    p.da -= bot;
    du += bot;
  }
  return ds.map((p) => ({
    nguoiBan: p.k === TOUR_DAO ? tenCongTy : (ban?.ten.get(p.k) ?? "Nhà cung cấp"),
    vaiTourDao: p.k === TOUR_DAO ? "nguoi_ban" : "doi_tac_dat_ve",
    dichVu: p.dichVu,
    tong: p.tong,
    giamGia: p.giam,
    daTra: p.da,
    conLai: Math.max(0, p.tong - p.da),
    traTaiQuay: p.k !== TOUR_DAO,
  }));
}

export function dungBienNhan(order: OrderDetailDto, company: CompanyDto, tien: TienBienNhan, ban: NguoiBanChoBienNhan | null): ReceiptDto {
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
    phan: chiaPhanBienNhan(order, company.name, ban, tien),
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
