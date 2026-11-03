// Chữ viết tay của các bài theo việc (đặc tả docs/superpowers/specs/2026-11-03-huong-dan-muc-rieng/DAC-TA.md). Thuần. Luật viết như src/shared/huong-dan.ts:
// chỉ tên nút và cách làm; con số giới hạn NHẬP TỪ MÃ, không gõ tay vào chữ. `neo` = các tệp mã bài dựa vào: đổi tệp mà chưa xem lại bài thì
// src/huong-dan-may-canh.test.ts đỏ; xem lại xong chạy `npm run huong-dan:xem-lai -- <id>`.
import type { OperationCode } from "./permissions.ts";
import type { KhoaTrang } from "./muc-giao-dien.ts";
import { NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG, NGAY_LUU_ANH_LO_HUY, TOI_DA_BYTE_ANH, TRAN_LO_LON_NHAT, TRAN_LO_MAC_DINH, TRAN_LO_NHO_NHAT } from "./ve-nhap-lo.ts";

export interface BaiViec {
  readonly id: string;
  readonly tieuDe: string;
  /** Tên nhóm việc trong danh sách của vai: trùng nhóm có sẵn thì xếp vào đó, không thì thành nhóm mới. */
  readonly nhomViec: string;
  /** Màn của bài: máy điền «Ở đâu» và nút mở màn từ khoá này. */
  readonly trang: KhoaTrang;
  /** Ô quyền của việc: máy điền «Ai dùng được» và quyết ai thấy bài. */
  readonly o: readonly OperationCode[];
  /** Các dòng giới hạn, ghép từ hằng số của mã. */
  readonly gioiHan: readonly string[];
  readonly neo: readonly string[];
  /** Câu mở bài, nói thẳng điều quan trọng nhất. */
  readonly moDau: string;
  readonly noiDung: string;
  /** Đổi đáng báo ở một bản: hiện dải «Bài này vừa đổi» khi đúng bản đang chạy. */
  readonly doiO?: { readonly ban: string; readonly cau: string };
}

const SO_MB_ANH = TOI_DA_BYTE_ANH / (1024 * 1024);

export const BAI_VIEC: readonly BaiViec[] = [
  {
    id: "kho-ve",
    tieuDe: "Kho vé điện tử",
    nhomViec: "Gửi cho khách",
    trang: "veKho",
    o: ["ve.kho.manage", "ve.cap.send"],
    gioiHan: [
      `Mỗi lô mặc định tối đa ${TRAN_LO_MAC_DINH} vé; Toàn quyền đổi được từ ${TRAN_LO_NHO_NHAT} đến ${TRAN_LO_LON_NHAT}`,
      `Mỗi ảnh tối đa ${SO_MB_ANH} MB, ảnh JPG hoặc PNG`,
      `Ảnh của lô đã huỷ lưu ${NGAY_LUU_ANH_LO_HUY} ngày`,
      `Đường dẫn cho khách hết hạn sau ngày dùng cuối ${NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG} ngày`,
    ],
    neo: ["web/ve-kho.ts", "web/ve-don.ts", "src/shared/ve-nhap-lo.ts", "src/modules/ve-dien-tu/cap-ve.ts", "src/modules/ve-dien-tu/noi-orders.ts", "src/modules/ve-dien-tu/duong-dan-khach.ts"],
    moDau: "Máy chống được trùng vé, nhưng không biết vé có đúng loại hay không, nên phần khai lô vẫn phụ thuộc vào người nhập.",
    noiDung: `### Các bước
1. **Tải vé từ nhà cung cấp.** Mỗi lần chỉ tải đúng một sản phẩm, một loại khách, một khoảng ngày dùng. Giữ nguyên ảnh gốc, vì ảnh nén quá nhỏ có thể không đọc được QR.
2. **Nhập vào kho.** Chọn dịch vụ và loại khách, gõ tên sản phẩm, chọn ngày dùng, chọn các ảnh vé rồi bấm [[Nhập lô vé]]. Giữ nguyên trang này cho tới khi gửi xong. Ảnh hỏng hoặc trùng bị loại kèm tên tệp, các ảnh còn lại vẫn vào kho.
3. **Máy giữ vé cho đơn.** Máy tự giữ vé theo số khách khi đơn được xác nhận; em bé không có vé. Máy lấy lô đúng loại khách trước, rồi đến lô «Mọi loại khách»; trong mỗi nhóm, vé sắp hết hạn ra trước. Kho thiếu thì đơn báo còn thiếu vé: nhập thêm lô, mở đơn rồi bấm [[Cấp vé]].
4. **Giao vé.** Vé chỉ mở khi đơn đã thu đủ. Bấm nút **Chuẩn bị … vé để gửi** (có số vé của đơn), rồi bấm [[Gửi Zalo]] và tự chọn người nhận, hoặc bấm [[Tạo đường dẫn cho khách]] để khách tự mở và lưu vé.

### Điều dễ sai
- Đừng trộn loại vé trong một lô: vé trẻ em lẫn vào lô người lớn sẽ tới tay khách người lớn.
- Chỉ chọn «Mọi loại khách» khi vé thật sự dùng chung, như vé Harbour tiêu chuẩn.
- Chưa chắc khách lấy thì đừng bấm nút chuẩn bị vé hay tạo đường dẫn: mọi vé của đơn bị coi là đã lộ, và vé đã lộ không về lại kho, kể cả khi đơn huỷ.
- Không chụp màn hình vé hay gửi mã vé vào nhóm chat chung, vì mã QR có giá trị như tiền.

### Khi gặp sự cố
| Gặp | Làm gì |
| --- | --- |
| Lỗi giữa chừng khi nhập | Bấm [[Huỷ lô]] rồi nhập lại từ đầu. |
| Nhập xong mới thấy khai sai, chưa có vé nào được giữ | Bấm [[Huỷ lô]] rồi nhập lại cho đúng. |
| Khai sai và đã có vé được giữ | Không huỷ được lô và chưa có nút gỡ từng vé. Gửi yêu cầu hỗ trợ ngay. |
| Ảnh bị loại vì không đọc được QR | Tải lại ảnh gốc từ nhà cung cấp, vì chưa gõ tay được mã vé. |
| Cần tra soát vé của lô đã huỷ | Mở ảnh ở khối **Lô đã huỷ gần đây**. Vé đã mở bị khoá hẳn, không nhập lại được, nên chỉ mở khi thật cần. |
| Gửi đường dẫn cho nhầm người | Bấm [[Thu hồi]]. Việc này chỉ đóng đường dẫn; người đó đã lưu ảnh thì vé vẫn dùng được. |

### Nền tảng chưa làm được
- Nhập vé từ tệp PDF hoặc gõ tay mã vé.
- Tự đọc ngày dùng và loại vé trên ảnh để so với phần đã khai.
- Tự cấp vé cho đơn đang thiếu khi kho vừa có thêm, và báo khi kho sắp hết.
- Gỡ từng vé khỏi kho.
- Tự gửi Zalo, mua vé tự động, đối soát tiền mua vé.

### Nền tảng không thể làm
- Thu hồi vé khách đã lưu về máy.
- Biết tình trạng vé bên nhà cung cấp, vì chưa có kết nối với họ.
- Biết loại vé từ QR, vì QR không chứa sản phẩm, ngày dùng hay loại khách.
- Chặn việc bán cùng một vé ở nơi khác.
- Chống người có quyền cố ý gian lận: chỉ truy lại được một phần qua nhật ký.`,
  },
  {
    id: "cai-dat-ve",
    tieuDe: "Đổi số vé tối đa mỗi lô",
    nhomViec: "Cài đặt",
    trang: "veCaiDat",
    o: ["settings.ops"],
    gioiHan: [`Đặt được từ ${TRAN_LO_NHO_NHAT} đến ${TRAN_LO_LON_NHAT} vé, mặc định ${TRAN_LO_MAC_DINH}`],
    neo: ["web/ve-cai-dat.ts", "src/shared/ve-nhap-lo.ts"],
    moDau: "Số mới chỉ áp cho các lô nhập từ lúc đổi; vé đã nhập giữ nguyên.",
    noiDung: `### Các bước
1. Mở **Cài đặt vé điện tử**.
2. Gõ số mới ở ô **Số vé tối đa mỗi lô**.
3. Bấm [[Lưu]].

### Điều dễ sai
- Lô càng lớn thì khai sai càng tốn công sửa, vì lô đã có vé được giữ thì không huỷ được. Chỉ nâng số khi thật cần.`,
  },
  {
    id: "giao-dien",
    tieuDe: "Đổi giao diện công ty",
    nhomViec: "Cài đặt",
    trang: "giaoDien",
    o: ["settings.ops"],
    gioiHan: [],
    neo: ["web/giao-dien.ts", "public/giao-dien.html"],
    moDau: "Màn này đổi màu và cỡ chữ cho mọi người dùng Nền tảng, nên xem trước kỹ rồi mới áp dụng.",
    noiDung: `### Các bước
1. Mở **Giao diện**, đổi các ô cần đổi và xem phần xem trước trên cùng màn.
2. Không ưng thì bấm [[Bỏ thay đổi]].
3. Ưng rồi thì bấm [[Áp dụng cho mọi người]], đọc câu hỏi lại rồi bấm [[Áp dụng]].

### Khi gặp sự cố
| Gặp | Làm gì |
| --- | --- |
| Áp dụng xong thấy chữ nhạt, đọc không rõ | Bấm [[Về mặc định toàn bộ]]. |
| Chỉ muốn trả một ô về như cũ | Bấm [[Về mặc định]] ngay ô đó. |`,
  },
];
