// Cổng LUẬT BÁN của `orders` (ADR-0146 Đ3, ADR-0152 Đ2; kế hoạch 2026-10-30 R-2, T8): MỘT hàm cho mọi cửa ghi đơn — lập đơn, lưu nháp, đổi bên đặt, xác nhận (qua dòng đầu
// `kiemCongXacNhan`: `/status`, Gửi đơn, Còn vé), Gửi xác nhận. Không tự đọc bảng nào: chỉ gọi hàm công bố `kiemLuatBan` của `pricing` (nhóm, đặc điểm đọc ở đó qua view của
// catalog). Bài `src/luat-ban-moi-cua.test.ts` canh: mỗi cửa gọi `congLuatBan(`, và không tệp nào khác của `orders` gọi `kiemLuatBan(`.
import { cauBiChan, kiemLuatBan } from "../pricing";
import { giaMuaVuChoDon, kiemNgungBanTheoNgay } from "../catalog";
import { cungMua } from "../../shared/gia-mua-vu";
import { error } from "../../shared/http";
import { vnToday } from "../../shared/vn-date";

/**
 * Bên đặt `bookerPartyId` (đã chốt — sau `resolveBooker` / bên đặt đang lưu) + các dòng dịch vụ của đơn. Dòng nhập tay (không mã danh mục) không bị xét. Có luật chặn ⇒ 409
 * `sales_blocked` nêu dịch vụ trúng đầu tiên theo thứ tự trên đơn; không ⇒ null. Ngày xét = ngày Việt Nam lúc thao tác.
 */
export async function congLuatBan(
  db: D1Database,
  v: { bookerPartyId: string | null; dong: readonly { catalogCode: string | null; name: string }[] },
): Promise<Response | null> {
  const ma = v.dong.flatMap((d) => (d.catalogCode ? [d.catalogCode] : []));
  if (!v.bookerPartyId || ma.length === 0) return null;
  const trung = await kiemLuatBan(db, { bookerPartyId: v.bookerPartyId, catalogCodes: ma, ngay: vnToday(new Date()) });
  if (trung.length === 0) return null;
  const biChan = new Set(trung.map((t) => t.catalogCode));
  const dau = v.dong.find((d) => d.catalogCode !== null && biChan.has(d.catalogCode))!;
  const t = trung.find((x) => x.catalogCode === dau.catalogCode)!;
  return error(409, "sales_blocked", cauBiChan({ tenDichVu: dau.name, tenDacDiem: t.tenDacDiem, tenGiaTri: t.tenGiaTri }));
}

/**
 * Cổng «NGỪNG BÁN THEO NGÀY» của `orders` (ADR-0220 Đ3): MỘT hàm cho mọi cửa ghi đơn — lập đơn, lưu nháp, Gửi xác nhận, xác nhận (qua `kiemCongXacNhan`: `/status`, Gửi đơn,
 * Còn vé) và sửa ngày khởi hành (`PUT …/trip`). Chỉ gọi hàm công bố `kiemNgungBanTheoNgay` của `catalog`. Xét theo NGÀY KHỞI HÀNH của từng dịch vụ có mã; không đọc bên đặt, không đọc
 * người thao tác (không ai bán vượt). Trúng ⇒ 409 `sales_paused_date` nêu tên dịch vụ và khoảng ngày; không ⇒ null. Bài `src/ngung-ban-ngay-moi-cua.test.ts` canh mỗi cửa gọi hàm này.
 */
export async function congNgungBanNgay(db: D1Database, dong: readonly { catalogCode: string | null; name: string; departDate: string | null }[]): Promise<Response | null> {
  const cau = await kiemNgungBanTheoNgay(db, dong.map((d) => ({ catalogCode: d.catalogCode, name: d.name, ngay: d.departDate })));
  return cau ? error(409, "sales_paused_date", cau) : null;
}

/**
 * Cổng «CÙNG MÙA» của `orders` (ADR-0229 Đ6): dịch vụ có mã đổi NGÀY ĐI (ngày mới khác ngày đang lưu) mà ngày mới không cùng mùa với bản chụp ⇒ 409 `seasonal_date_changed`,
 * không ghi. «Cùng mùa» theo bản chụp (hàm thuần `cungMua`): dòng chụp quy tắc Q ⇒ ngày mới trong khoảng của chính Q (dù Q đã kết thúc) và không quy tắc khác thắng Q;
 * dòng chụp «không quy tắc» (kể cả dòng cũ trước ADR) ⇒ ngày mới không có quy tắc đang áp. Không tự tính lại tiền (HC-4.2). Nháp đổi ngày qua sửa đơn thì được tính lại giá
 * (Q11 đã vá) — câu báo chỉ đường đó. Dịch vụ không đổi ngày không bị xét. Không nhận người thao tác hay bên đặt: không ai vượt.
 * Bài src/gia-mua-vu-moi-cua.test.ts canh mỗi cửa đổi ngày của đơn đã lưu gọi hàm này.
 */
export async function congCungMua(
  db: D1Database,
  dong: readonly { catalogCode: string | null; name: string; ngayCu: string | null; ngayMoi: string | null; quyTacDaChup: readonly (string | null | undefined)[] }[],
  laNhap: boolean,
): Promise<Response | null> {
  const xet = dong.filter((d) => d.catalogCode && d.ngayMoi && d.ngayMoi !== d.ngayCu);
  if (xet.length === 0) return null;
  const chup = (d: (typeof xet)[number]): string | null => d.quyTacDaChup.find((x): x is string => typeof x === "string" && x !== "") ?? null;
  const { quyTac, nhomCua } = await giaMuaVuChoDon(db, { tuNgay: "0000-01-01", ids: xet.flatMap((d) => (chup(d) ? [chup(d)!] : [])) });
  for (const d of xet) {
    if (cungMua({ quyTacDaChup: chup(d), maDichVu: d.catalogCode!, maNhom: nhomCua.get(d.catalogCode!) ?? null, ngayMoi: d.ngayMoi, quyTac })) continue;
    return error(409, "seasonal_date_changed", laNhap
      ? `Ngày đi mới của «${d.name}» thuộc mùa giá khác. Hãy sửa đơn nháp (đổi ngày ở form sửa đơn) để tính lại giá.`
      : `Ngày đi mới của «${d.name}» thuộc mùa giá khác; đơn đã xác nhận không đổi giá. Hãy huỷ đơn này và lập đơn mới cho ngày mới.`);
  }
  return null;
}
