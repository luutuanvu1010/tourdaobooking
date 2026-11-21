// Khung gốc giao diện (ADR-0222) — phần KHAI BÁO: bảy khuôn trang, mức bề rộng mỗi khuôn được khai (bảng loại trang của lưới 15/11),
// sổ ngoại lệ (Đ5d) và danh sách trang chưa chuyển khuôn (Đ7a). Tệp thuần, không nhập gì; không tệp nào ở web/ nhập nó (không vào gói trang).
// Người đọc: bài `src/khung-goc.test.ts` (máy canh trong `npm test`) và lệnh `npm run do-khung` (đo trên trang thật).
// Hình của từng khuôn và các con số của thang đo do chủ dự án duyệt bằng ảnh (ADR-0222 Đ8); nơi ghi: `docs/superpowers/plans/2026-11-21-khung-goc-giao-dien-thi-cong-nhat-ky.md`.

/** Thuộc tính khai khuôn ở `<body>`. KHÔNG phải `data-khuon` (thuộc tính đó là «trang biểu mẫu không nhận dải nhắc bảo mật», `web/dai.ts`). */
export const THUOC_TINH_KHUON = "data-khung-goc";

export type MucRong = "hep" | "vua" | "rong";

export interface Khuon {
  /** Tên khuôn bằng lời thường. */
  readonly ten: string;
  /** Mức bề rộng `data-rong` khuôn này được khai, theo bảng 15/11; `null` = không ràng mức (trang trạng thái tự căn giữa một khối). */
  readonly rong: readonly MucRong[] | null;
  /** Chỗ đặt nút chính. Bốn khuôn đầu chủ đã duyệt bằng ảnh 21/11; ba khuôn sau mới ở mức sơ đồ, trình ảnh khi tới lượt họ màn đó. */
  readonly nutChinh: string;
}

export const KHUON = {
  "danh-sach": { ten: "Danh sách", rong: ["rong"], nutChinh: "đầu trang, bên phải; điện thoại dùng nút của thanh tab" },
  "chi-tiet": { ten: "Chi tiết", rong: ["vua"], nutChinh: "thanh việc đầu trang, bên trái, việc nguy hiểm tách sang phải; điện thoại dính đáy, việc nguy hiểm ở cuối trang" },
  "bieu-mau": { ten: "Biểu mẫu", rong: ["hep", "vua"], nutChinh: "thanh nút cuối biểu mẫu, «Lưu» bên phải, «Huỷ» cạnh nó, việc nguy hiểm tách sang trái; điện thoại dính đáy" },
  "thiet-lap": { ten: "Thiết lập", rong: ["vua"], nutChinh: "đầu khối, bên phải; «Sửa» ở cuối dòng" },
  "tong-quan": { ten: "Tổng quan", rong: ["rong"], nutChinh: "chưa chốt bằng ảnh" },
  "trang-doc": { ten: "Trang đọc", rong: ["hep"], nutChinh: "chưa chốt bằng ảnh" },
  "trang-thai": { ten: "Trạng thái", rong: null, nutChinh: "chưa chốt bằng ảnh" },
} as const satisfies Record<string, Khuon>;

export type MaKhuon = keyof typeof KHUON;

/** Một mục của sổ ngoại lệ: phần giao diện được phép không theo bộ dựng sẵn của khung. Khung ngoài và vỏ khối vẫn theo khung. */
export interface NgoaiLe {
  /** Màn nào (tên người dùng thấy). */
  readonly man: string;
  /** Đường dẫn trang trong `PAGES`; `null` khi phần ngoại lệ không gắn một trang (hiện ở nhiều trang, hoặc là ảnh máy vẽ). */
  readonly trang: string | null;
  /** Phần nào của màn được ngoại lệ. */
  readonly phan: string;
  /** Loại: `vung-tu-do` = bố cục riêng trong một khối «vùng tự do»; `muc-rong` = khai mức bề rộng khác bảng của khuôn. */
  readonly loai: "vung-tu-do" | "muc-rong";
  /** Vì sao. */
  readonly lyDo: string;
  /** Ngày chủ dự án duyệt (năm-tháng-ngày). */
  readonly ngayDuyet: string;
  /** Nơi ghi lời duyệt. */
  readonly nguon: string;
  /** Tệp mã được dựng «vùng tự do» cho mục này (đường dẫn tính từ gốc kho). */
  readonly tep: readonly string[];
}

/** Sổ ngoại lệ — khởi đầu bằng sáu mục ADR-0222 Đ5 nêu tên. Thêm mục = chủ dự án duyệt, ghi ngày và nơi ghi lời duyệt. */
export const SO_NGOAI_LE: readonly NgoaiLe[] = [
  { man: "Trang chủ", trang: "/", phan: "cả vùng nội dung", loai: "vung-tu-do", lyDo: "bản vẽ Trang chủ đã duyệt riêng (lề 12 ở điện thoại, 24 ở máy tính, lưới ô số liệu của nó)", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/home.ts"] },
  { man: "Đăng nhập", trang: "/login", phan: "cả trang", loai: "vung-tu-do", lyDo: "trang không dùng khung chung (không thanh trên, không thanh bên), bố cục một thẻ giữa màn hình", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/login.ts"] },
  { man: "Màn bảo trì", trang: null, phan: "thẻ báo bảo trì phủ trang", loai: "vung-tu-do", lyDo: "hiện đè lên mọi trang khi bật bảo trì, bản mẫu duyệt 13/11", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/maintenance-screen.ts"] },
  { man: "Điều phối xe", trang: "/dieu-phoi", phan: "dòng thời gian", loai: "vung-tu-do", lyDo: "trục giờ và các chuyến xếp theo thời gian không dựng được bằng lưới cột", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/dieu-phoi.ts", "web/dieu-phoi-ui.ts"] },
  { man: "Ảnh vé", trang: null, phan: "ảnh vé gửi khách", loai: "vung-tu-do", lyDo: "ảnh do máy vẽ theo bố cục riêng của vé (ADR-0175), không phải trang", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/ve-anh-tour-dao.ts"] },
  { man: "Quét vé", trang: "/quet-ve", phan: "khung ngắm của máy ảnh", loai: "vung-tu-do", lyDo: "khung hình máy ảnh chiếm màn hình theo tỉ lệ của nó", ngayDuyet: "2026-11-21", nguon: "ADR-0222 Đ5", tep: ["web/quet-ve.ts"] },
];

/** Hai thuộc tính bố cục ở thẻ mở `<body …>` của một trang: khuôn (`data-khung-goc`) và mức bề rộng (`data-rong`). */
export function docThanTrang(html: string): { khuon: string | null; rong: string | null } {
  const body = /<body\b[^>]*>/.exec(html)?.[0] ?? "";
  const lay = (ten: string): string | null => new RegExp(`\\s${ten}="([^"]*)"`).exec(body)?.[1] ?? null;
  return { khuon: lay(THUOC_TINH_KHUON), rong: lay("data-rong") };
}

/** Đường dẫn của trang từ tên tệp trong `public/` (`index.html` là `/`). */
export const duongCuaTrang = (tenTep: string): string => (tenTep === "index.html" ? "/" : `/${tenTep.replace(/\.html$/, "")}`);

/** Soát một trang: khai đúng một khuôn hợp lệ (hoặc còn tên trong danh sách chưa chuyển), mức bề rộng khớp khuôn (hoặc có mục `muc-rong` trong sổ ngoại lệ).
 *  Trả các câu lỗi; mảng rỗng = đạt. */
export function soatTrang(tenTep: string, html: string, chuaChuyen: readonly string[], soNgoaiLe: readonly NgoaiLe[]): string[] {
  const { khuon, rong } = docThanTrang(html);
  const conTen = chuaChuyen.includes(tenTep);
  if (khuon === null) {
    return conTen ? [] : [`${tenTep}: chưa khai khuôn. Thêm ${THUOC_TINH_KHUON}="…" vào <body> (bảy khuôn: ${Object.keys(KHUON).join(", ")}) và dựng trang bằng hàm của web/khung.ts.`];
  }
  const loi: string[] = [];
  if (conTen) loi.push(`${tenTep}: đã khai khuôn «${khuon}» mà còn tên trong TRANG_CHUA_CHUYEN (src/shared/khung-goc.ts). Gỡ tên khỏi danh sách và hạ trần «trang chưa chuyển».`);
  if (!Object.hasOwn(KHUON, khuon)) return [...loi, `${tenTep}: khuôn «${khuon}» không thuộc bảy khuôn (${Object.keys(KHUON).join(", ")}).`];
  const k: Khuon = KHUON[khuon as MaKhuon];
  if (k.rong !== null && (rong === null || !(k.rong as readonly string[]).includes(rong))) {
    const coNgoaiLe = soNgoaiLe.some((m) => m.loai === "muc-rong" && m.trang === duongCuaTrang(tenTep));
    if (!coNgoaiLe) loi.push(`${tenTep}: mức bề rộng data-rong=${rong === null ? "(thiếu)" : `"${rong}"`} không khớp khuôn ${k.ten} (được khai: ${k.rong.join(", ")} theo bảng lưới 15/11). Đổi mức, hoặc trình chủ dự án bằng ảnh rồi ghi một mục «muc-rong» vào sổ ngoại lệ.`);
  }
  return loi;
}

/** Soát sổ ngoại lệ: mỗi mục đủ màn, phần, lý do, ngày chủ duyệt hợp lệ (không ở tương lai), nơi ghi lời duyệt, tệp; trang (nếu có) phải có thật. */
export function soatNgoaiLe(so: readonly NgoaiLe[], trangCo: readonly string[], homNay: string): string[] {
  const loi: string[] = [];
  const daGap = new Set<string>();
  so.forEach((m, i) => {
    const ten = `mục ${i + 1} (${m.man || "không tên"})`;
    const thieu = (["man", "phan", "lyDo", "nguon"] as const).filter((k) => String(m[k] ?? "").trim() === "");
    if (thieu.length) loi.push(`${ten}: thiếu ${thieu.map((k) => ({ man: "tên màn", phan: "phần được ngoại lệ", lyDo: "lý do", nguon: "nơi ghi lời duyệt" })[k]).join(", ")}.`);
    const ngay = String(m.ngayDuyet ?? "");
    const hopLe = /^\d{4}-\d{2}-\d{2}$/.test(ngay) && !Number.isNaN(Date.parse(`${ngay}T00:00:00Z`)) && new Date(`${ngay}T00:00:00Z`).toISOString().slice(0, 10) === ngay;
    if (!hopLe) loi.push(`${ten}: thiếu ngày chủ dự án duyệt (dạng năm-tháng-ngày), đang là «${ngay}».`);
    else if (ngay > homNay) loi.push(`${ten}: ngày duyệt ${ngay} ở tương lai.`);
    if (m.loai !== "vung-tu-do" && m.loai !== "muc-rong") loi.push(`${ten}: loại «${String(m.loai)}» không hợp lệ.`);
    if (m.trang !== null && !trangCo.includes(m.trang)) loi.push(`${ten}: trang «${m.trang}» không có trong danh sách trang của Nền tảng.`);
    if (m.loai === "muc-rong" && m.trang === null) loi.push(`${ten}: ngoại lệ mức bề rộng phải gắn một trang.`);
    if (!Array.isArray(m.tep) || (m.loai === "vung-tu-do" && m.tep.length === 0)) loi.push(`${ten}: thiếu tệp mã dựng vùng tự do.`);
    const khoa = `${m.man}|${m.phan}|${m.loai}`;
    if (daGap.has(khoa)) loi.push(`${ten}: trùng một mục khác (cùng màn, phần, loại).`);
    daGap.add(khoa);
  });
  return loi;
}

/** Trang CHƯA chuyển khuôn (tên tệp trong `public/`). Chỉ được bớt: chuyển xong một trang thì khai `data-khung-goc` ở `<body>` và gỡ tên khỏi đây.
 *  Trang mới không được thêm vào đây: phải khai khuôn ngay từ đầu (ADR-0222, «việc giao diện mới trong lúc chuyển phải dùng khung ngay»). */
export const TRANG_CHUA_CHUYEN: readonly string[] = [
  "404.html", "account.html", "audit.html", "ban.html", "bang-gia-xe.html", "bang-ke-xe.html", "cap-dai-ly.html", "catalog.html", "chinh-sach-dieu-phoi.html",
  "cho-xac-nhan.html", "chup-bu.html", "chuyen-sua.html", "chuyen.html", "cuoc-chuyen.html", "cuoc.html", "dac-diem-dich-vu.html", "dang-ky.html",
  "danh-muc-giay-to.html", "de-nghi.html", "dieu-chinh-cong-no.html", "dieu-kien-xuat-ben.html", "dieu-phoi.html", "feedback.html", "giao-dien.html",
  "giay-to-sap-het-han.html", "gui-thong-bao.html", "han-muc-tra-sau.html", "help.html", "hoa-hong-gioi-han.html", "hoa-hong.html", "home.html",
  "huong-dan.html", "index.html", "khoa-thang.html", "lich-xe-ban.html", "loai-giay-to-nguoi.html", "loai-giay-to-xe.html", "login.html",
  "luat-ban.html", "ly-do-dieu-phoi.html", "ngoai-mang.html", "nguoi-ban.html", "order-form.html", "parties.html",
  "phan-dinh.html", "phi-don.html", "phieu-dang-ky.html", "quet-ve.html", "sessions.html", "so-cong-no.html", "staff.html", "tai-xe.html", "thiet-lap.html",
  "to-chuc.html", "tro-ly-cai-dat.html", "ve-cai-dat.html", "ve-doi-chieu.html", "ve-kho.html", "xe-chi-tiet.html", "xe-dang-chay.html", "xe.html",
];
