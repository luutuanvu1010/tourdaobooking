// Sổ đại lý đợt 2, Task 12 (ADR-0132, ADR-0078 điều 7, 9; ADR-0079 điều 7–8; đặc tả P4, P6, P7) — quyết định THUẦN của giao diện: tệp `web/` chỉ dựng DOM theo các hàm ở
// đây; máy chủ luôn kiểm lại (giao diện ẩn lựa chọn không đủ điều kiện, máy chủ vẫn từ chối). Có bài cạnh tệp (ben-kia-hien-thi.test.ts). Import kèm đuôi .ts.
//
// Nguồn dữ liệu: `OrderPaymentsResponse.benKia` (máy chủ tính bằng CÙNG `benDatHuong` / `nhaCungCapCuaDon` mà lệnh ghi khoản thu dùng; null với tài khoản giữ
// quyền Đối tác, đơn nháp, đơn chưa chụp, đơn đã giao) — giao diện KHÔNG tự suy đơn có đại lý / quầy nhà cung cấp hay không.
import type { BenKiaLuaChonDto, ChoChupBuDto, LanThuInput, OrderPaymentsResponse, ThuongMaiVanPhongDto } from "./contracts.ts";
import { can, holdsPartner, type PermissionHolder } from "./permissions.ts";

export interface LuaChon {
  readonly value: string;
  readonly nhan: string;
}

const TIEN_TO_NCC = "ncc:";

/** Câu thay form «Ghi khoản thu» khi văn phòng mở đơn mang dấu Tắt mà không có lựa chọn người thu nào (ADR-0178 Đ1 mục 2). */
export const CAU_DOI_TAC_TU_GHI = "Đối tác lập đơn tự ghi khoản thu của đơn này.";

/**
 * Ô «Người thu tiền» của form «Ghi khoản thu»: luôn có Công ty và «Tôi thu»; thêm «Khách trả cho đại lý <tên>» khi đơn có đại lý được hưởng, và mỗi quầy nhà cung cấp
 * của đơn một dòng «Khách trả tại quầy <tên>». `benKia` null (khách lẻ, nháp, chưa chụp, Đối tác) ⇒ chỉ hai dòng đầu.
 * Đơn mang dấu «Khách của đối tác trả cho Công ty» = Tắt (`kenhThu.congTyThu === false`, ADR-0178 Đ1 mục 2): người thu chỉ là hồ sơ của tài khoản Đối tác đã lập đơn —
 * Đối tác ⇒ chỉ «Tôi thu»; văn phòng ⇒ «Khách trả cho đại lý <tên người lập>» khi hồ sơ người lập là bên đặt được hưởng, không thì rỗng (nơi gọi hiện `CAU_DOI_TAC_TU_GHI`).
 * Máy chủ vẫn kiểm lại (`kiemNguoiThuKenh`, trigger 0144).
 */
export function luaChonNguoiThu(benKia: BenKiaLuaChonDto | null, kenhThu?: OrderPaymentsResponse["kenhThu"], laDoiTac = false): LuaChon[] {
  if (kenhThu?.congTyThu === false) {
    if (laDoiTac) return [{ value: "toi", nhan: "Tôi thu" }];
    if (kenhThu.nguoiLapLaBenDatHuong) return [{ value: "ben_dat", nhan: `Khách trả cho đại lý ${kenhThu.nguoiLapTen ?? benKia?.benDat?.ten ?? ""}`.trim() }];
    return [];
  }
  const ds: LuaChon[] = [{ value: "cong_ty", nhan: "Công ty (vào tài khoản công ty)" }, { value: "toi", nhan: "Tôi thu" }];
  if (benKia?.benDat) ds.push({ value: "ben_dat", nhan: `Khách trả cho đại lý ${benKia.benDat.ten}` });
  for (const n of benKia?.nhaCungCap ?? []) ds.push({ value: `${TIEN_TO_NCC}${n.partyId}`, nhan: `Khách trả tại quầy ${n.ten}` });
  return ds;
}

/**
 * Ô người thu của Kế toán ở «Sửa khoản thu đã ghi» và «Ghi bù khoản thu» (giá trị `cong_ty` hoặc id hồ sơ → `{ partyId }`). Đơn mang dấu Tắt (ADR-0178 Đ1 mục 2): đúng một
 * lựa chọn là hồ sơ người lập, kể cả khi người đó không còn trong danh sách đang giữ tiền; người lập chưa gắn hồ sơ ⇒ rỗng (nơi gọi ẩn thao tác). Còn lại: `thuong` nguyên vẹn.
 */
export function luaChonNguoiThuSoKeToan(kenhThu: OrderPaymentsResponse["kenhThu"] | undefined, thuong: readonly LuaChon[]): LuaChon[] {
  if (kenhThu?.congTyThu !== false) return [...thuong];
  return kenhThu.nguoiLapPartyId ? [{ value: kenhThu.nguoiLapPartyId, nhan: `${kenhThu.nguoiLapTen ?? "Hồ sơ"} (người lập đơn)` }] : [];
}

/** Người thu của khoản thu đúng trong «Ghi sổ theo phân định» (phần sửa khoản thu): cùng luật `luaChonNguoiThuSoKeToan` — Bật ⇒ Công ty; Tắt ⇒ hồ sơ người lập; Tắt mà chưa gắn hồ sơ ⇒ null (ẩn phần sửa). */
export function nguoiThuSuaPhanDinh(kenhThu: OrderPaymentsResponse["kenhThu"] | undefined): "cong_ty" | { partyId: string } | null {
  const v = luaChonNguoiThuSoKeToan(kenhThu, [{ value: "cong_ty", nhan: "Công ty" }])[0]?.value;
  return v === undefined ? null : v === "cong_ty" ? "cong_ty" : { partyId: v };
}

/** Câu thay form «Ghi khoản thu đòi được» (phân định) ở đơn mang dấu Tắt: ADR-0178 Hệ quả — Kế toán không dùng được đường này cho đơn đó. */
export const CAU_KHONG_GHI_DOI_DUOC = "Đơn này chỉ nhận tiền khách trả cho đối tác đã lập đơn nên Công ty không ghi khoản thu đòi được.";

/** Giá trị ô chọn → trường `nguoiThu` của thân `POST /api/orders/:id/payments`. */
export function nguoiThuTuGiaTri(v: string): LanThuInput["nguoiThu"] {
  if (v.startsWith(TIEN_TO_NCC)) return { nhaCungCapPartyId: v.slice(TIEN_TO_NCC.length) };
  if (v === "toi" || v === "ben_dat") return v;
  return "cong_ty";
}

/** Lựa chọn là «khách trả bên kia» (đại lý / quầy nhà cung cấp). */
export const laBenKia = (v: string): boolean => v === "ben_dat" || v.startsWith(TIEN_TO_NCC);

export const NHAN_O_THU_CHO = "Phần tiền này cho";

/** Ô «Phần tiền này cho» (ADR-0078 điều 9): hiện khi đơn có dòng làm đại lý (có nhà cung cấp); chọn quầy nhà cung cấp ⇒ khoá vào chính nhà cung cấp đó (máy chủ 400 nếu khác). */
export function oThuCho(benKia: BenKiaLuaChonDto | null, nguoiThu: string): { hien: boolean; khoa: string | null } {
  if (!benKia || benKia.nhaCungCap.length === 0) return { hien: false, khoa: null };
  return { hien: true, khoa: nguoiThu.startsWith(TIEN_TO_NCC) ? nguoiThu.slice(TIEN_TO_NCC.length) : null };
}

/** Các dòng của ô «Phần tiền này cho»: Tour Đảo (giá trị rỗng = không gửi trường, máy chủ mặc định Tour Đảo) rồi từng nhà cung cấp. */
export const luaChonThuCho = (benKia: BenKiaLuaChonDto): LuaChon[] => [{ value: "", nhan: "Tour Đảo" }, ...benKia.nhaCungCap.map((n) => ({ value: n.partyId, nhan: n.ten }))];

/** Câu dưới ô người thu tiền khi người KHÔNG ghi sổ chọn hai lựa chọn mới (ADR-0132 điều 1): lời khai chờ Kế toán, chưa ai nợ. Kế toán ghi thẳng ⇒ null. */
export function cauChoKeToan(nguoiThu: string, laKeToan: boolean): string | null {
  if (laKeToan || !laBenKia(nguoiThu)) return null;
  return "Khoản này chờ Kế toán xác nhận với bên nhận tiền; trong lúc chờ, chưa bấm Xác nhận khách đã trả đủ được.";
}

/** Nhãn lời thường của ba lý do ở danh sách chờ «Chụp bù» (Ruling R-52, R-P19). */
export const NHAN_LY_DO_CHUP_BU: Readonly<Record<ChoChupBuDto["lyDo"], string>> = {
  co_nguoi_huong: "Đơn có người hưởng hoa hồng",
  nhap_tay: "Đơn có dịch vụ nhập tay — sau khi chụp, ghi mức tay cho dịch vụ đó",
  khach_le: "Đơn khách lẻ chưa được chụp tự động",
};
export const nhanLyDoChupBu = (ma: ChoChupBuDto["lyDo"]): string => NHAN_LY_DO_CHUP_BU[ma] ?? "Đơn chưa có bản chụp mức";

/** Nút «Chụp bù» ở khối Phần đối tác: người có ô ghi tay (`duocGhiTay` — cùng ô `order.terms.override`, không Đối tác, đơn đã xác nhận chưa giao) và đơn CHƯA có bản chụp. */
export const hienNutChupBu = (coGhiTay: boolean, d: Pick<ThuongMaiVanPhongDto, "duKien" | "chuaChup">): boolean => coGhiTay && !d.duKien && d.chuaChup;

export type LoaiDoiChieu = "cong_ty" | "ben_dat" | "nha_cung_cap";

/** Nhãn một khoản chờ đối chiếu (`CocListResponse.doiChieu[]`, `SoCongNoResponse.choXacNhan[]`). */
export function nhanKhoanDoiChieu(k: { loai: LoaiDoiChieu; benKia: string | null }): string {
  if (k.loai === "ben_dat") return `Khách trả cho đại lý ${k.benKia ?? ""}`.trim();
  if (k.loai === "nha_cung_cap") return `Khách trả tại quầy ${k.benKia ?? "nhà cung cấp"}`;
  // Không ghi «chuyển khoản»: loại `cong_ty` gồm cả khoản tiền mặt người ghi chưa nộp về công ty (nhánh HELD của `PENDING_COMPANY`, billing/repository.ts).
  return "Công ty thu";
}

/** Nút xác nhận ngay trong danh sách: chỉ khoản bên kia («Bên kia đã nhận»); khoản Công ty thu cần mã giao dịch ngân hàng ⇒ xác nhận ở trang đơn. */
export const nutXacNhanDoiChieu = (loai: LoaiDoiChieu): string | null => (loai === "cong_ty" ? null : "Bên kia đã nhận");

/** Câu cảnh báo khi giảm giá hiệu lực lớn hơn tổng hoa hồng sau xác nhận (`OrderDetailResponse.canhBaoGiamGia` — ADR-0079 điều 8 gạch 3; không chặn). */
export const cauCanhBaoGiamGia = (c: { vuot: number } | null, dinhDang: (n: number) => string): string | null =>
  c && c.vuot > 0 ? `Giảm giá đang lớn hơn hoa hồng ${dinhDang(c.vuot)} — đại lý chịu phần này.` : null;

/** Câu trần giảm giá theo hoa hồng của đơn (ADR-0079 điều 8): MỘT nguồn cho máy chủ (`viPhamTranGiamGia`) và form lập / sửa đơn. */
export const CAU_TRAN_HOA_HONG = (tran: number): string => `Giảm tối đa ${tran.toLocaleString("vi-VN")} ₫ (bằng hoa hồng của đơn).`;

/**
 * Câu trần giảm giá khi đơn có dịch vụ mà hoa hồng LỚN HƠN thành tiền của dịch vụ (ADR-0161 Đ5): dòng đó không được tính vào trần. MỘT nguồn cho máy chủ và form.
 * Trần 0 ⇒ chưa giảm được; trần còn số ⇒ nói rõ số đó không tính dịch vụ vượt. Cả hai nhắc Kế toán xem lại mức (chỗ sửa mức là việc của Kế toán).
 */
export const cauTranCoDongVuot = (tran: number): string =>
  tran === 0
    ? "Chưa giảm giá được: mức hoa hồng của dịch vụ trong đơn đang vượt giá bán — nhờ Kế toán xem lại."
    : `Giảm tối đa ${tran.toLocaleString("vi-VN")} ₫ (không tính dịch vụ có mức hoa hồng vượt giá bán — nhờ Kế toán xem lại).`;

/** Lý do giữ đơn `stale` (Task 9, M-5: đơn vừa đổi giữa hai lần đọc) ⇒ trang đơn đặt nút «Tải lại» cạnh câu. */
export const lyDoCanTaiLai = (ma: string): boolean => ma === "stale";

/**
 * Ô «Giảm giá» của tài khoản chỉ dùng giá danh mục (`chiGiaDanhMuc` — Đối tác, Thực tập) ở form lập / sửa đơn (Task 7, ADR-0079 điều 9; nợ M-2): Đối tác ĐƯỢC HƯỞNG
 * (`benDatCuaToi` của `/api/auth/me` khác null — máy chủ ép bên đặt về chính họ) giảm được tới hoa hồng của đơn ⇒ mở ô; Đối tác không hưởng và Thực tập (kể cả Đối tác +
 * Thực tập) trần 0 ⇒ khoá. Máy chủ vẫn kiểm lại khi lưu (`viPhamTranGiamGia`).
 */
export function oGiamGiaChiGiaDanhMuc(v: { laDoiTac: boolean; laThucTap: boolean; duocHuong: boolean }): { khoa: boolean; cau: string } {
  if (v.laDoiTac && !v.laThucTap && v.duocHuong) return { khoa: false, cau: "Giảm giá được tới mức hoa hồng của đơn (hoa hồng của bạn); Nền tảng báo số cụ thể nếu vượt khi lưu." };
  if (v.laDoiTac) return { khoa: true, cau: "Chỉ giảm được trên đơn bạn hưởng hoa hồng." };
  return { khoa: true, cau: "Tài khoản Thực tập không được giảm giá." };
}

/**
 * Câu trần dưới ô giảm giá khi SỬA đơn đã lưu có người hưởng (số từ `GET …/thuong-mai`): `tong` = tổng hoa hồng TÍNH VÀO TRẦN (`tongTinhTran`, dòng vượt thành tiền đã tính 0); null = còn dịch vụ
 * thiếu mức ⇒ không đoán số (máy chủ báo khi lưu). `coDongVuot` = đơn có dịch vụ vượt thành tiền ⇒ câu nói rõ số đó không tính dịch vụ vượt (ADR-0161 Đ5).
 */
export const cauTranGiamGiaForm = (tong: number | null, coDongVuot = false): string | null =>
  tong === null ? null : `${coDongVuot ? cauTranCoDongVuot(tong) : CAU_TRAN_HOA_HONG(tong)} Số này theo đơn đã lưu; đổi dịch vụ hay số khách thì Nền tảng tính lại khi lưu.`;

/**
 * Khối «Chờ đối chiếu» ở Trang chủ (vòng sửa người kiểm Task 12, Minor 1): người ghi sổ (`ledger.write`) KHÔNG giữ quyền Đối tác — tài khoản lai Kế toán + Đối tác
 * không thấy (R-91: luật Đối tác thắng khi XEM). Lưu ý: route `GET /api/ledger/coc` vẫn trả `doiChieu[].benKia` cho tài khoản lai (nợ, chủ quyết).
 */
export const coKhoiChoDoiChieu = (s: PermissionHolder | null): boolean => !!s && can(s, "ledger.write") && !holdsPartner(s);

/** «Chụp bù cả danh sách» (Minor 2): bấm lại chỉ gửi đơn CHƯA chụp xong ở lượt trước (đơn đã xong gửi lại sẽ nhận 409 và đè câu thành công). */
export const donChupBuConLai = <T extends { orderId: string }>(ds: readonly T[], xong: ReadonlySet<string>): T[] => ds.filter((d) => !xong.has(d.orderId));

/** Câu kết quả một lượt «Chụp bù cả danh sách». */
export const cauKetQuaChupBu = (xong: number, con: number): string =>
  con === 0 ? `Đã chụp bù ${xong} đơn.` : `Đã chụp bù ${xong} đơn; ${con} đơn còn thiếu mức — xem câu dưới từng đơn.`;

/** Chữ máy chủ thay cho tên người thu mà người xem không được biết (`NGUOI_THU_KHAC` của billing — Task 9, R-91). */
const NGUOI_THU_KHAC = "Người thu tiền khác";
/** Câu hỏi lại của nút «Bên kia đã nhận» (Minor 4): không ghép chữ thay thế vào câu như một cái tên — nói «bên nhận tiền». */
export function cauBenKiaDaNhan(nguoiThu: string, soTien: string): string {
  const ten = nguoiThu === NGUOI_THU_KHAC ? "bên nhận tiền" : nguoiThu;
  return `Đã đối chiếu: ${ten} xác nhận đã nhận ${soTien} của khách? Từ lúc này khoản này là nợ của ${ten} với Tour Đảo. Bên kia báo không nhận thì dùng «Huỷ khoản thu».`;
}
