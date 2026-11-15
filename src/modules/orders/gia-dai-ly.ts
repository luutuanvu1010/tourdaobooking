// ADR-0182 Đ1 mục 1–3: giá đại lý của NHIỀU đơn đã xác nhận trong MỘT lượt đọc — phần «Tổng công nợ» mà `billing` (phần nghiệp vụ «Công nợ đại lý») cần. Số tiền / số khách mỗi dòng là số
// HIỆN HÀNH (dòng điều chỉnh số khách áp bằng CÙNG `effectiveService` của chi tiết đơn); mức là mức ĐÃ CHỤP; mỗi dòng đi qua `tinhDongDoiTac` (MỘT công thức với khối «Phần đối tác» và
// phiếu «Đã giao»). Bài `src/cong-no-dai-ly.test.ts` khoá: kết quả trùng `phanThuongMaiCuaDon` từng đơn + Σ phí đưa đón hiện hành, kể cả đơn đã sửa số khách.
// Phí đưa đón (Đợt C, Task 5; ADR-0203 ĐB3, chủ chọn 14/11 «có, cộng vào số đại lý nợ»; sổ vàng SV-PD-25): `tong` = Σ giá đại lý dịch vụ + Σ dòng phí hiện hành (`phiHieuLuc` — cùng
// hàm của chi tiết đơn). Phí không vào hoa hồng (`dong` chỉ là dòng dịch vụ); số phí tách riêng ở `phiDon`.
// HÀM CÔNG BỐ, KHÔNG tự kiểm quyền — trả số tiền, không tên / SĐT khách.
import { tinhDongDoiTac, type BanChup } from "../../shared/hoa-hong-dong.ts";
import { thanhTienDong, type PaxCode } from "../../shared/order-lines.ts";
import { effectiveService, phiHieuLuc, type SubtotalServiceInput } from "./money-adjustment.ts";
import { getLatestAdjustments } from "./repository";
import { banChupTuDb, chuaCoBanChup } from "./thuong-mai.ts";
import { docGiaDaiLyNhieu } from "./thuong-mai-repo.ts";
import { quyenMoCuaNguoiLap } from "./xac-nhan-repo";
import { tienChoHoaHong } from "./xac-nhan-chung";
import { apCongTacAnKhach } from "../../shared/an-thong-tin-khach";
import type { PermissionHolder } from "../../shared/permissions";

/** Một dòng dịch vụ của phiếu công nợ. `hoaHong` null = thiếu mức (Đ1 mục 3: dòng tính theo giá bán lẻ, `giaDaiLy` = thành tiền). */
export interface DongGiaDaiLy { serviceId: string; name: string; thanhTien: number; hoaHong: number | null; giaDaiLy: number }
/** `laDonDaiLy` theo luật `mauBienNhan` (bên đặt là đối tác HOẶC người lập là Đối tác thuần). `tong` = Σ `giaDaiLy` + `phiDon`, có thể âm (Đ1 mục 2: không kẹp). `phiDon` = Σ dòng phí
 * đưa đón hiện hành (đã tính lại theo số khách mới nếu có sửa số khách); 0 = đơn không phí. */
export interface GiaDaiLyDon { laDonDaiLy: boolean; dong: DongGiaDaiLy[]; phiDon: number; /** Mỗi dòng phí HIỆN HÀNH một phần tử (ADR-0203 ĐB3: phiếu in mỗi chặng một dòng); Σ `tien` = `phiDon`. `donGia` 0 ⇒ «Miễn phí». */ phiDong: DongPhiGiaDaiLy[]; tong: number }
/** Một dòng phí đưa đón của phiếu công nợ: tên dòng đã lưu (như biên nhận), thành tiền hiện hành (đã tính lại khi sửa số khách), đơn giá đã chụp. */
export interface DongPhiGiaDaiLy { ten: string; tien: number; donGia: number }

/** Phần thuần (test được không cần D1): ghép dòng đã đọc thành giá đại lý từng đơn. Đơn nháp / huỷ / id lạ: không có trong Map. */
export function ghepGiaDaiLy(v: {
  doc: Awaited<ReturnType<typeof docGiaDaiLyNhieu>>;
  dieuChinh: ReadonlyMap<string, { after: readonly { serviceId: string; pax: { adult?: number; child?: number; senior?: number; infant?: number } }[] }>;
  doiTacThuan: ReadonlySet<string>;
}): Map<string, GiaDaiLyDon> {
  const chupTheoDv = new Map<string, BanChup>(v.doc.chup.map((r) => [r.order_service_id, banChupTuDb(r)]));
  const dongTheoDv = new Map<string, Awaited<ReturnType<typeof docGiaDaiLyNhieu>>["dong"]>();
  for (const d of v.doc.dong) if (d.service_id) dongTheoDv.set(d.service_id, [...(dongTheoDv.get(d.service_id) ?? []), d]);
  const out = new Map<string, GiaDaiLyDon>();
  for (const o of v.doc.don) {
    if (o.status !== "confirmed") continue;
    const sau = new Map((v.dieuChinh.get(o.id)?.after ?? []).map((a) => [a.serviceId, a.pax]));
    const dong: DongGiaDaiLy[] = v.doc.dichVu.filter((s) => s.order_id === o.id).map((s) => {
      const items = (dongTheoDv.get(s.id) ?? []).map((i) => ({ paxCode: i.pax_code as PaxCode | null, catalogPrice: i.catalog_price, unitPrice: i.unit_price, lineTotal: i.line_total, quantity: i.quantity }));
      const goc = { adult: s.pax_adult, child: s.pax_child, senior: s.pax_senior, infant: s.pax_infant };
      const vao: SubtotalServiceInput = { id: s.id, catalogCode: s.catalog_code, name: s.name, unit: s.unit, items };
      const eff = effectiveService(vao, sau.get(s.id) as Parameters<typeof effectiveService>[1]);
      const hienHanh = eff.recomputed
        ? { unit: s.unit, pax: eff.recomputed.pax, items: eff.recomputed.lines.map((l) => ({ quantity: l.quantity, lineTotal: thanhTienDong(l) })) }
        : { unit: s.unit, pax: goc, items };
      const tien = tienChoHoaHong(hienHanh);
      const t = tinhDongDoiTac(chupTheoDv.get(s.id) ?? chuaCoBanChup(s.id), tien);
      return { serviceId: s.id, name: s.name, thanhTien: t.thanhTien, hoaHong: t.hoaHong, giaDaiLy: t.giaDaiLy ?? t.thanhTien };
    });
    const phi = phiHieuLuc(
      v.doc.phi.filter((p) => p.order_id === o.id).map((p) => ({ serviceId: p.order_service_id, kind: p.fee_kind, returnPax: p.fee_return_pax, quantity: p.quantity, unitPrice: p.unit_price, lineTotal: p.line_total, ten: p.description })),
      v.dieuChinh.get(o.id)?.after.map((a) => ({ serviceId: a.serviceId, pax: { adult: a.pax.adult ?? 0, child: a.pax.child ?? 0, senior: a.pax.senior ?? 0, infant: a.pax.infant ?? 0 } })) ?? [],
    );
    const phiDon = phi.tong;
    const phiDong = phi.dong.map((d) => ({ ten: d.ten, tien: d.lineTotal, donGia: d.unitPrice }));
    out.set(o.id, { laDonDaiLy: o.la === 1 || v.doiTacThuan.has(o.staff_id), dong, phiDon, phiDong, tong: dong.reduce((s, d) => s + d.giaDaiLy, 0) + phiDon });
  }
  return out;
}

/** Giá đại lý của các đơn ĐÃ XÁC NHẬN trong `orderIds` — số câu truy vấn không phụ thuộc số đơn (trừ một câu quyền cho mỗi NGƯỜI LẬP khác nhau). Rỗng → không truy vấn. */
export async function giaDaiLyNhieuDon(db: D1Database, orderIds: readonly string[]): Promise<Map<string, GiaDaiLyDon>> {
  if (orderIds.length === 0) return new Map();
  const [doc, dieuChinh] = await Promise.all([docGiaDaiLyNhieu(db, orderIds), getLatestAdjustments(db, orderIds)]);
  const nguoiLap = [...new Set(doc.don.filter((o) => o.la !== 1).map((o) => o.staff_id))];
  const thuan = await Promise.all(nguoiLap.map(async (id) => [id, await nguoiLapDoiTacThuan(db, id)] as const));
  return ghepGiaDaiLy({ doc, dieuChinh, doiTacThuan: new Set(thuan.filter(([, la]) => la).map(([id]) => id)) });
}

/**
 * HD-02-DT: người lập đơn HIỆN LÀ Đối tác thuần (giữ quyền Đối tác và không giữ quyền nào ngoài nhóm bên ngoài) — cùng luật `apCongTacAnKhach` của công tắc ẩn khách. Chỉ để CHỌN MẪU IN biên
 * nhận và nhận «đơn đại lý» (mã quyền là điều kiện DỮ LIỆU, không phải điều kiện cho phép); đọc hiện trạng, không chụp lúc lập. Không tự kiểm quyền: chỉ gọi trong thân route SAU `can(`
 * (src/orders-cong-bo.test.ts) hoặc từ `giaDaiLyNhieuDon`.
 */
export async function nguoiLapDoiTacThuan(db: D1Database, staffId: string): Promise<boolean> {
  return apCongTacAnKhach({ permissions: (await quyenMoCuaNguoiLap(db, staffId)) as PermissionHolder["permissions"] });
}
