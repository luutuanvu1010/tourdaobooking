// Luật HIỂN THỊ thuần của dấu «Trả sau theo dịch vụ» (ADR-0178 Đ2, ADR-0230 Đ1) cho màn Dịch vụ & giá (`web/catalog-tra-sau-dich-vu.ts`). Không I/O.
// Cách tra dấu của một dịch vụ (riêng thắng nhóm) phải giống `dieuKienTraSauDichVu` ở `tra-sau-dich-vu.ts` — máy chủ mới là nơi quyết; ở đây chỉ để hiện.
// Test cạnh tệp: tra-sau-dich-vu-hien-thi.test.ts.
import { GIO_TOI_DA, kiemSoGio } from "./tra-sau.ts";

export interface DauHienThi {
  targetKind: "GROUP" | "SERVICE";
  targetCode: string;
  gioTra: number;
  gioAnHan: number;
}

type SoGio = { gioTra: number; gioAnHan: number };

const anHanChu = (gioAnHan: number): string => (gioAnHan === 0 ? "không ân hạn" : `ân hạn ${gioAnHan} giờ`);

/** «Trả sau theo dịch vụ: trả trong N giờ, ân hạn M giờ», thêm « (theo nhóm)» khi dịch vụ đang hưởng dấu của nhóm. */
export function cauDauTraSau(d: SoGio, theoNhom: boolean): string {
  return `Trả sau theo dịch vụ: trả trong ${d.gioTra} giờ, ${anHanChu(d.gioAnHan)}${theoNhom ? " (theo nhóm)" : ""}`;
}

/** Dấu đang áp cho một dịch vụ: dấu riêng của mã nếu có, không thì dấu của nhóm hiện tại; không có ⇒ null. */
export function dauHieuLucCuaDichVu<T extends DauHienThi>(ma: string, maNhom: string | null, dau: readonly T[]): { dau: T; theoNhom: boolean } | null {
  const rieng = dau.find((x) => x.targetKind === "SERVICE" && x.targetCode === ma);
  if (rieng) return { dau: rieng, theoNhom: false };
  const nhom = maNhom === null ? undefined : dau.find((x) => x.targetKind === "GROUP" && x.targetCode === maNhom);
  return nhom ? { dau: nhom, theoNhom: true } : null;
}

/** Đọc một ô số giờ (chỉ chữ số) theo cùng khoảng máy chủ nhận (`kiemSoGio`). */
export function docOGio(chu: string, toiThieu: 0 | 1, tenO: string): { gio: number } | { loi: string } {
  const s = chu.trim();
  const gio = /^\d{1,5}$/.test(s) ? Number(s) : NaN;
  return kiemSoGio(gio, toiThieu) ? { gio } : { loi: `${tenO} phải là số giờ nguyên từ ${toiThieu} tới ${GIO_TOI_DA}.` };
}

/** Câu hậu quả của hộp hỏi khi đặt dấu lần đầu (ADR-0230 «Hệ quả chủ cần biết»). */
export function hauQuaDatDau(loai: "GROUP" | "SERVICE", d: SoGio): string {
  const pham = loai === "GROUP" ? "dịch vụ trong nhóm này" : "dịch vụ này";
  const nhom = loai === "GROUP" ? " Áp cả cho dịch vụ thêm vào nhóm sau này." : "";
  return `Đối tác được hưởng lập đơn mà mọi vé đều là vé Tour Đảo của ${pham} sẽ được trả sau không cần hạn mức, vé hiện ngay; hạn trả ${d.gioTra} giờ từ lúc xác nhận, ${anHanChu(d.gioAnHan)}. Không có trần số tiền: đối tác không trả thì công ty có thể mất tiền thật.${nhom}`;
}
