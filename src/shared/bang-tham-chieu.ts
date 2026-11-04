/**
 * Bảng tham chiếu ngôn ngữ (ADR-0167): các KIỂU DỮ LIỆU. Dữ liệu nằm ở `bang-tham-chieu-viec.ts` (việc quan trọng, mục bỏ qua) và
 * `bang-tham-chieu-khai-niem.ts` (khái niệm, chữ dùng chung). Chỉ bài kiểm `src/bang-tham-chieu.test.ts` và kịch bản `npm run tham-chieu` đọc bảng;
 * giao diện KHÔNG nạp (bài quét `import` ở bài kiểm canh điều này), nên không trang nào nặng thêm.
 * Thêm hay đổi tên = chủ dự án đã chọn tên (AI đưa 2–3 tên, không tự đặt; ADR-0130).
 */
import type { AuditAction } from "./audit-actions.ts";

/** `da-chot`: chủ đã chọn tên. `cho-chon`: chưa chọn; hàng vẫn ghi chữ ĐANG HIỆN làm tên hiện hành, máy vẫn canh chữ đó. */
export type TrangThaiTen = "da-chot" | "cho-chon";

/**
 * Một nơi đặt nút. `chu` là khoá do `khoaNut` (scripts/quet-nut-lib.mjs) sinh: nhãn đã bỏ ký hiệu đầu (＋ ✓ ← → ⋯), nhiều nhãn nối bằng « / ».
 * Tên chuẩn của một nút nằm ở đây. Một việc có hai lối vào thì có hai nơi đặt khác chữ: đó là «tên khác được phép», không có cột riêng.
 * Hai nút cùng chữ trong MỘT tệp tính là một nơi đặt (giới hạn đã biết).
 */
export interface NoiDatNut {
  tep: string;
  chu: string;
}

export interface ViecQuanTrong {
  nhom: string;
  manHinh: string;
  /** Tiêu đề hàng cho người đọc; có thể gồm nhiều nút. */
  ten: string;
  /** Việc nút làm thật, lời thường. */
  thatSuLam: string;
  /** Có hỏi lại trước khi làm không (lời thường). */
  hoiLai: string;
  /** Hoàn tác được không (lời thường). */
  hoanTac: string;
  /**
   * Đường máy chủ CHÍNH nút này gọi (không có `?…`), tham số `:x`; không chép đường của hàm lân cận. Không chắc thì để mảng rỗng: rỗng không có nghĩa là nút không gọi gì.
   * Dữ liệu hiện có do máy lọc một lần: nhiều hàng chưa đối chiếu với mã, có hàng là đường đọc. Chỉ dùng để tìm mã; muốn chắc thì đọc mã.
   */
  duongLenh: readonly string[];
  /** Mã nhật ký (`AUDIT_ACTIONS`) việc này ghi. Không chắc thì để mảng rỗng. */
  maNhatKy: readonly AuditAction[];
  noiDat: readonly NoiDatNut[];
  /** Thêm `ten-hien-tai`: tên đang hiện, AI rà soát thấy đúng nhưng chủ chưa chọn riêng; đổi tên vẫn phải hỏi chủ. `da-chot` phải chỉ ra lời chủ hoặc số ADR (máy kiểm). */
  trangThai: TrangThaiTen | "ten-hien-tai";
  /** Chủ chọn tên ở đâu (số ADR, ngày); `ten-hien-tai` thì ghi ngày rà soát. */
  nguonTen: string;
}

export interface KhaiNiem {
  /** Tên chuẩn người dùng nhìn thấy. */
  ten: string;
  /** Một hai câu, lời thường. */
  giaiNghia: string;
  /** Khác thế nào với khái niệm gần nó; rỗng nếu không có khái niệm gần. */
  khacVoi: string;
  /** Chữ đã loại (phải bị một dòng cấm của bảng từ bắt, xem `TU_DA_LOAI`). */
  chuDaLoai: readonly string[];
  /** Tên trong mã (mã quyền, tên cột, trạng thái thô). Chỉ để người làm mã tra, không hiện cho người dùng. */
  maNoiBo: readonly string[];
  /** `trong-ma`: thuật ngữ của người làm mã, không hiện cho người dùng nên không cần chủ chọn tên; bắt buộc có `maNoiBo`. */
  trangThai: TrangThaiTen | "trong-ma";
  /** Ngày chủ chọn kèm nguồn, dạng `2026-10-18 (…)`. Bắt buộc có ngày khi `da-chot`. */
  chuChon: string;
}

/** Một nút máy coi là việc ghi hay nút chính nhưng thực ra không phải; lý do bắt buộc. */
export interface MucBoQua extends NoiDatNut {
  lyDo: string;
}

/** Chữ dùng lại ở nhiều nơi vì tiêu đề hộp hay dòng đang xem đã nói đối tượng (ví dụ «Lưu»). `vi` nói vì sao đủ rõ. */
export interface ChuDungChung {
  chu: string;
  vi: string;
}

/**
 * Một tên nằm ở nhiều hàng việc mà không phải chữ dùng chung. `cung-viec`: một việc có nhiều lối vào, hoặc một nút đổi chữ theo bước.
 * `cho-chu`: khác việc mà trùng tên, đang chờ chủ chọn tên; khi chủ chọn thì sửa nút, bảng và bỏ dòng này trong cùng một lần lưu.
 */
export interface TenNhieuHang {
  chu: string;
  loai: "cung-viec" | "cho-chu";
  vi: string;
}
