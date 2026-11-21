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
    o: ["ve.kho.manage"], // bài này là của màn Kho vé; ADR-0170 mở ve.cap.send cho Đối tác nhưng Đối tác không vào kho, nên không tính ô này (bài riêng của Đối tác ở huong-dan-doi-tac.ts)
    gioiHan: [
      `Mỗi lô mặc định tối đa ${TRAN_LO_MAC_DINH} vé; Toàn quyền đổi được từ ${TRAN_LO_NHO_NHAT} đến ${TRAN_LO_LON_NHAT}`,
      `Mỗi ảnh tối đa ${SO_MB_ANH} MB, ảnh JPG hoặc PNG`,
      `Ảnh của lô đã huỷ lưu ${NGAY_LUU_ANH_LO_HUY} ngày`,
      `Đường dẫn cho khách hết hạn sau ngày dùng cuối ${NGAY_HAN_DUONG_DAN_SAU_NGAY_DUNG} ngày`,
    ],
    neo: ["web/ve-kho.ts", "public/ve-kho.html", "web/ve-don.ts", "src/shared/ve-nhap-lo.ts", "src/modules/ve-dien-tu/index.ts", "src/modules/ve-dien-tu/rules.ts", "src/modules/ve-dien-tu/repository.ts", "src/modules/ve-dien-tu/nhap-lo.ts", "src/modules/ve-dien-tu/cap-ve.ts", "src/modules/ve-dien-tu/noi-orders.ts", "src/modules/ve-dien-tu/duong-dan-khach.ts", "web/ve-kho-huy.ts"],
    moDau: "Máy chống được trùng vé, nhưng không biết vé có đúng loại hay không, nên phần khai lô vẫn phụ thuộc vào người nhập.",
    noiDung: `### Các bước
1. **Tải vé từ nhà cung cấp.** Mỗi lần chỉ tải đúng một sản phẩm, một loại khách, một khoảng ngày dùng. Giữ nguyên ảnh gốc, vì ảnh nén quá nhỏ có thể không đọc được QR.
2. **Nhập vào kho.** Chọn dịch vụ và loại khách, gõ tên sản phẩm, chọn ngày dùng, chọn các ảnh vé rồi bấm [[Nhập lô vé]]. Giữ nguyên trang này cho tới khi gửi xong. Ảnh hỏng hoặc trùng bị loại kèm tên tệp, các ảnh còn lại vẫn vào kho.
3. **Máy giữ vé cho đơn.** Máy tự giữ vé theo số khách khi đơn được xác nhận; em bé không có vé. Máy lấy lô đúng loại khách trước, rồi đến lô «Mọi loại khách»; trong mỗi nhóm, vé sắp hết hạn ra trước. Kho thiếu thì đơn báo còn thiếu vé: nhập thêm lô, mở đơn rồi bấm [[Cấp vé]]. Muốn biết sản phẩm nào sắp hết, xem khối **Số vé còn**: gõ tên vào ô «Tìm theo tên sản phẩm» hoặc bấm **Hết vé**, **Còn 1 đến 5**, **Còn trên 5**.
4. **Giao vé.** Vé chỉ mở khi đơn đã thu đủ; đơn trả sau thì vé mở trước, trừ khi đơn đã quá hạn còn nợ; với đơn do đối tác lập, chỉ tính tiền đã về công ty (đối tác tự ghi «Tôi thu» chưa đủ để mở). Bấm nút **Mở … vé để gửi khách** (có số vé của đơn; màn hình nhắc vé sẽ không về kho nữa), rồi bấm [[Gửi Zalo]] và tự chọn người nhận. Máy không có nút này thì bấm các nút **Tải vé** để lưu ảnh rồi tự gửi. Hoặc bấm [[Tạo đường dẫn cho khách]] để khách tự mở và lưu vé; đường dẫn chỉ hiện một lần, nên chép gửi ngay. Khi đơn tăng số khách, vé thêm chỉ hiện cho khách sau khi đơn thu đủ; vé khách đã mở rồi thì vẫn xem được.

### Điều dễ sai
- Máy chỉ giữ vé cho dịch vụ đang bật ô «Có vé». Dịch vụ sắp có vé thì báo Quản trị bật ô này trước khi nhập lô.
- Đừng trộn loại vé trong một lô: vé trẻ em lẫn vào lô người lớn sẽ tới tay khách người lớn.
- Chỉ chọn «Mọi loại khách» khi vé thật sự dùng chung, như vé Harbour tiêu chuẩn.
- Chưa chắc khách lấy thì đừng bấm nút mở vé hay tạo đường dẫn: mọi vé của đơn bị coi là đã lộ, và vé đã lộ không về lại kho, kể cả khi đơn huỷ.
- Không chụp màn hình vé hay gửi mã vé vào nhóm chat chung, vì mã QR có giá trị như tiền.
- Dời ngày đi của đơn đã có vé thì vé không còn hợp ngày mới bị thu lại: vé chưa mở về kho, vé đã mở bị vô hiệu dù khách còn giữ ảnh. Máy tự giữ vé hợp ngày mới nếu kho còn; kho thiếu thì đơn báo còn thiếu vé. Vé đã quét thì giữ nguyên.
- Vé Tour Đảo đã quét thì dòng «Đã dùng» của dịch vụ trên đơn tăng lên. Đơn có vé đã dùng không huỷ được; phải bỏ lượt quét trước.
- Mỗi vé Tour Đảo có **số sê-ri** dạng VE_ và tám chữ cái, in trên ảnh vé và hiện ở danh sách vé của lô. Số này không bí mật nên gọi tên vé được, nhưng một mình nó không cho khách đi: mã trong QR mới là bí mật.
- Huỷ vé hay huỷ lô mà vé đã gửi khách thì khách còn cầm vé cũ, vé đó quét ra đỏ «Vé đã huỷ». Máy cấp vé thay từ kho nhưng không tự báo ai: bạn phải gửi lại vé thay cho khách.

### Khi gặp sự cố
| Gặp | Làm gì |
| --- | --- |
| Nhập xong máy báo dịch vụ đang tắt ô «Có vé» | Báo Quản trị bật ô này ở màn Dịch vụ & giá. Sau đó đơn chưa tới ngày đi sẽ báo thiếu vé và cấp được vé. |
| Lỗi giữa chừng khi nhập | Bấm [[Huỷ lô]] rồi nhập lại từ đầu. |
| Nhập xong mới thấy khai sai, chưa có vé nào được giữ | Bấm [[Huỷ lô]] rồi nhập lại cho đúng. |
| Khai sai và đã có vé được giữ cho đơn | Bấm [[Huỷ lô]] ở lô đó, đọc con số máy hiện (bao nhiêu vé huỷ, bao nhiêu vé giữ nguyên vì đã dùng, bao nhiêu đơn được cấp vé thay), ghi lý do rồi xác nhận. Có vé đã gửi khách thì gõ đúng số vé đó vào ô xác nhận, vì khách còn cầm vé cũ nhưng vé đó hết dùng được; máy chưa tự báo ai, nên bạn mở từng đơn đó và gửi lại vé thay. Lô hãng ngoài đã cấp chỉ Quản lý bán hàng, Quản trị và Toàn quyền huỷ được; Bán hàng vẫn huỷ được lô nhập dở chưa cấp cho đơn nào. |
| Một vé sai hoặc cần thu hồi | Gõ số sê-ri của vé vào ô «Số sê-ri của vé» rồi bấm [[Tìm vé]], hoặc bấm [[Xem vé]] ở lô chứa vé. Bấm [[Huỷ vé]], ghi lý do. Vé đang giữ cho đơn thì máy cấp vé khác; vé đã gửi khách thì gõ lại bốn chữ cuối số sê-ri để xác nhận, rồi phải gửi lại vé thay. Vé đã dùng không huỷ được; vé hãng ngoài đã mở cũng không. Vé hãng ngoài chỉ Quản lý bán hàng, Quản trị và Toàn quyền huỷ được. |
| Huỷ nhầm một vé hãng ngoài | Vé chưa từng giữ cho đơn thì nhập lại đúng ảnh vé đó vào một lô là được. Ở danh sách vé của lô, dòng vé đã huỷ ghi huỷ lúc nào, ai huỷ, lý do, và «Nhập lại được», «Đã nhập lại» hoặc «Không nhập lại được». Vé từng giữ cho đơn không nhập lại được. |
| Lô hoặc vé nhiều, không thấy hết | Danh sách chia trang, mỗi trang 50 dòng: bấm «Trang sau» và «Trang trước», hoặc tìm vé theo số sê-ri. |
| Ảnh bị loại vì không đọc được QR | Tải lại ảnh gốc từ nhà cung cấp, vì chưa gõ tay được mã vé. |
| Cần tra soát vé của lô đã huỷ | Mở ảnh ở khối **Lô đã huỷ gần đây**. Vé đã mở bị khoá hẳn, không nhập lại được, nên chỉ mở khi thật cần. |
| Gửi đường dẫn cho nhầm người | Bấm [[Thu hồi]]. Việc này chỉ đóng đường dẫn; người đó đã lưu ảnh thì vé vẫn dùng được. |

### Nền tảng chưa làm được
- Nhập vé từ tệp PDF hoặc gõ tay mã vé.
- Tự đọc ngày dùng và loại vé trên ảnh để so với phần đã khai.
- Tự cấp vé cho đơn đang thiếu khi kho vừa có thêm, và báo khi kho sắp hết.
- Tự báo người phụ trách đơn khi vé đã gửi khách bị huỷ: người huỷ phải tự mở đơn và gửi lại vé thay.
- Tự gửi Zalo, mua vé tự động, đối soát tiền mua vé.

### Nền tảng không thể làm
- Thu hồi vé khách đã lưu về máy.
- Biết tình trạng vé bên nhà cung cấp, vì chưa có kết nối với họ.
- Biết loại vé từ QR, vì QR không chứa sản phẩm, ngày dùng hay loại khách.
- Chặn việc bán cùng một vé ở nơi khác.
- Chống người có quyền cố ý gian lận: chỉ truy lại được một phần qua nhật ký.`,
  },
  {
    id: "quet-ve",
    tieuDe: "Quét vé Tour Đảo",
    nhomViec: "Quét vé",
    trang: "quetVe",
    o: ["ve.quet.xem"],
    gioiHan: ["Người quét tự bỏ lượt quét trong 5 phút; sau đó nhờ Quản trị", "Cùng một mã trong 3 giây chỉ gửi một lần; vé còn trước camera thì 3 giây sau được kiểm lại"],
    neo: ["web/quet-ve.ts", "web/quet-ve-may.ts", "public/quet-ve.html", "src/shared/ket-qua-quet.ts"],
    moDau: "Màn hình hiện ba màu kèm chữ lớn: xanh là vé hợp lệ, vàng là cần bạn xác nhận, đỏ là không dùng được. Chỉ quét được vé Tour Đảo.",
    noiDung: `### Các bước
1. Mở **Quét vé** rồi bấm [[Bật camera]]. Lần đầu máy hỏi quyền camera, hãy cho phép.
2. Hướng camera vào mã trên vé của khách. Máy tự đọc và hiện kết quả cả màn hình.
3. Xanh thì cho khách đi. Vàng thì đọc câu báo; vẫn cho khách đi thì bấm [[Xác nhận cho đi]]. Đỏ thì không cho đi, đọc câu báo để biết lý do.
4. Bấm [[Quét tiếp]] để quét vé kế tiếp. Vé vừa quét còn nằm trước camera thì máy hiện dòng nhắc: muốn kiểm lại ngay thì bấm [[Quét lại vé này]], không thì 3 giây sau máy tự kiểm lại (vé đã tính rồi sẽ hiện đỏ «Đã dùng»).
5. Camera không mở được thì bấm **Chụp ảnh mã vé** và chụp mã trên vé. Camera trong trang đang bật sẽ tắt khi bấm nút này; chụp xong bấm [[Bật camera]] để quét tiếp bằng camera.
6. Mã trên vé hỏng hoặc in mờ thì gõ **số sê-ri** in trên vé (dạng VE_ và tám chữ cái, chữ thường hay có khoảng trắng đều được) vào ô «Số sê-ri in trên vé», bấm [[Tra số sê-ri]]. Máy tra như khi quét nhưng luôn hiện màu vàng «nhập tay» vì số in trên vé ai nhìn cũng chép được: kiểm đúng vé trước mặt rồi bấm [[Xác nhận cho đi]]; lượt đó ghi «nhập tay» trong nhật ký. Vé hãng ngoài không tra được ở đây. Vé đỏ «Vé đã huỷ» thì không cho đi, báo văn phòng gửi lại vé thay.
7. Mạng yếu thì máy tự gửi lại hai lần; vẫn không được thì hiện «Không gửi được». Kiểm tra Wi-Fi hoặc 4G rồi bấm **Thử lại**. Chưa thấy kết quả xanh thì chưa cho khách đi.

### Điều dễ sai
- Tài xế công ty chỉ xem vé có hợp lệ không; lượt quét của họ không tính vào số vé đã đi.
- Quét nhầm thì bấm [[Bỏ lượt quét]] ở danh sách năm lượt gần nhất, ghi lý do. Đừng gõ số điện thoại hay mã vé vào lý do.
- Vé đỏ «Đã dùng» hiện giờ và tên người đã quét trước đó; đừng cho khách đi lần hai.`,
  },
  {
    id: "doi-chieu-ve",
    tieuDe: "Đối chiếu vé Tour Đảo",
    nhomViec: "Quét vé",
    trang: "veDoiChieu",
    o: ["ve.doi-chieu.view"],
    gioiHan: [],
    neo: ["web/ve-doi-chieu.ts", "public/ve-doi-chieu.html", "src/modules/ve-dien-tu/index.ts", "src/modules/ve-dien-tu/repository.ts"],
    moDau: "Màn này chỉ để xem: Nền tảng báo số khách theo đơn và số vé đã dùng lệch bao nhiêu, không tự sửa gì.",
    noiDung: `### Các bước
1. Mở **Đối chiếu vé** rồi chọn **Ngày đi**.
2. Xem bảng **Khách theo đơn và vé đã dùng**: mỗi dịch vụ có vé Tour Đảo một dòng, gồm khách theo đơn đã xác nhận, khách đã quét «Đã dùng» và chênh lệch.
3. Xem bảng **Người quét trong ngày** để biết mỗi người quét bao nhiêu lượt, bị từ chối và bỏ bao nhiêu.
4. Quản trị và Toàn quyền còn thấy **Lượt đã dùng có thể bỏ**: bấm [[Bỏ lượt quét]] ở lượt quét nhầm, ghi lý do rồi bấm lần nữa. Người khác chỉ tự bỏ được lượt của mình trong 5 phút ở màn **Quét vé**.
5. Cuối trang, **Sổ vé Tour Đảo** cho biết vé đang ở đâu: trong kho, đã cấp chưa mở, đã mở chưa dùng, đã dùng hay đã huỷ.

### Điều dễ sai
- Chênh lệch dương không có nghĩa là khách vắng: có thể khách chưa quét hoặc quét chưa kịp. Hỏi người phụ trách trước khi kết luận.
- Đơn đã huỷ không có trong bảng; vé đã mở rồi mà đơn bị huỷ, hoặc đơn bị dời sang ngày vé không còn hợp, nằm ở «Đã huỷ» của sổ vé.
- Sổ vé tính cả kho, không đổi theo ngày chọn.`,
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
    id: "dich-vu-can-kiem-ve",
    tieuDe: "Đánh dấu vé cần kiểm vé",
    nhomViec: "Cài đặt",
    trang: "dichVu",
    o: ["catalog.confirm_flag.write"],
    gioiHan: [],
    neo: ["web/catalog-kiem-ve.ts", "src/shared/dich-vu-kiem-ve.ts"],
    moDau: "Vé được bật phải chờ người kiểm vé báo còn vé rồi đơn mới được xác nhận. Vé không bật thì xác nhận như thường. Đơn đã xác nhận không đổi (ADR-0136).",
    noiDung: `### Các bước
1. Mở **Dịch vụ & giá**.
2. Tìm vé ở ô tìm, ví dụ gõ «buffet».
3. Gạt công tắc **Cần kiểm vé** ở dòng vé đó. Muốn áp cho mọi vé của một nhóm thì gạt công tắc **Cần kiểm vé** ở dòng nhóm.

### Điều dễ sai
- Vé đã gạt riêng không đổi theo nhóm nữa. Ví dụ nhóm đang bật mà một vé gạt tắt thì vé đó không cần kiểm vé.
- Công tắc **Nhân viên tự kiểm vé đơn mình lập** chỉ Toàn quyền đổi được. Đang bật thì người kiểm vé tự quyết được đơn do chính mình lập. Đối tác và Thực tập luôn chờ người khác.`,
  },
  {
    id: "gioi-han-nhap-hoa-hong",
    tieuDe: "Đổi giới hạn nhập hoa hồng",
    nhomViec: "Cài đặt",
    trang: "hoaHongGioiHan",
    o: ["settings.ops"],
    gioiHan: [],
    neo: ["web/hoa-hong-gioi-han.ts", "src/shared/gioi-han-nhap-muc.ts"],
    moDau: "Số mới chỉ áp cho các mức nhập từ lúc đổi; mức đã có và đơn đã xác nhận giữ nguyên (ADR-0161).",
    noiDung: `### Các bước
1. Mở **Giới hạn nhập hoa hồng**.
2. Gõ số mới ở ô **Phần trăm tối đa (%)** và ô **Số tiền phải chia hết cho (đồng)**.
3. Bấm [[Lưu]].

### Điều dễ sai
- Hạ giới hạn không sửa các mức đã nhập. Muốn sửa mức cũ thì bấm Đổi ở trang Hoa hồng đối tác.
- Số **0** luôn được nhận, nên loại khách không hưởng thì gõ 0.
- Nâng giới hạn rồi quên hạ lại thì mức gõ nhầm dễ lọt hơn.`,
  },
  {
    id: "han-muc-tra-sau",
    tieuDe: "Cấp hạn mức trả sau cho đối tác",
    nhomViec: "Cài đặt",
    trang: "capDaiLy",
    o: ["credit.limit.write"],
    gioiHan: [],
    neo: ["web/o-tra-sau.ts", "web/an-han-tra-sau.ts", "src/shared/han-muc-tra-sau-hien-thi.ts"],
    moDau: "Đối tác được cấp hạn mức trả sau thì đặt được đơn trả sau: vé mở trước, tiền thu sau trong thời hạn trả tính bằng giờ (ADR-0172). Quản trị và Toàn quyền cấp, điều chỉnh, đóng hạn mức; Kế toán chỉ xem.",
    noiDung: `### Các bước
1. Mở **Cấp độ đại lý**, tìm đối tác, bấm chữ ở cột **Trả sau** của dòng đó (đối tác chưa có hạn mức thì ô ghi «Chưa cấp»).
2. Bảng mở ra đã điền sẵn số gợi ý của cấp (nếu có). Sửa **Hạn mức (đồng)**, **Thời hạn trả (giờ)** và **Ân hạn (giờ)** nếu cần.
3. Bấm [[Cấp hạn mức]]. Đối tác đã có hạn mức thì nút ghi [[Điều chỉnh hạn mức]]: bấm để lưu số mới.

### Điều dễ sai
- Thời hạn trả tính từ lúc đơn được xác nhận. Ví dụ 36 giờ: đơn xác nhận 8 giờ sáng thứ Hai thì hạn trả là 8 giờ tối thứ Ba.
- Trong ân hạn, Nền tảng chỉ báo «Quá hạn, đang trong ân hạn», chưa chặn gì. Hết ân hạn mà còn nợ thì đối tác không đặt thêm đơn trả sau được, vé chưa mở cũng không mở được.
- Đổi số mới chỉ áp cho đơn xác nhận sau đó; đơn đã xác nhận giữ hạn trả cũ.
- Quản trị chỉ đặt được hạn mức tới **Mức tối đa Quản trị được cấp** do Toàn quyền đặt ở khối **Hạn mức trả sau** cuối màn. Chưa có mức này thì Quản trị chưa cấp được cho ai.
- Không ai tự cấp hạn mức trả sau cho hồ sơ của chính mình.
- Đối tác không thấy con số hạn mức, chỉ thấy mình được trả sau và số giờ phải trả. Đơn mới đối tác lập được chọn sẵn «Trả sau»; đơn vượt hạn mức thì đối tác được báo chọn Thanh toán ngay hoặc liên hệ Tour Đảo.
- Bấm [[Đóng hạn mức]] (rồi xác nhận ở hộp hỏi) thì đối tác không đặt thêm đơn trả sau được, nhưng nợ cũ vẫn phải thu. Muốn giữ thì bấm «Giữ hạn mức». Đối tác còn nợ thì chưa ngừng tài khoản hay gỡ vai trò đối tác được.
- Ngay dưới khối **Hạn mức trả sau** có thẻ **Khách của đối tác trả cho Công ty**: chỉ Toàn quyền bật, tắt. Tắt thì đơn đối tác lập từ lúc đó chỉ do chính đối tác ghi khoản thu và không có QR thanh toán; đơn đã lập giữ nguyên.

### Lùi hạn trả một đơn
Khách xin thêm thời gian: mở đơn, ở khối Thanh toán bấm [[Ân hạn]], chọn hạn trả mới (giờ Việt Nam), ghi lý do rồi bấm [[Ân hạn]] trong bảng. Hạn mới phải sau hạn cũ; khoảng ân hạn sau hạn trả giữ nguyên.`,
  },
  {
    id: "xem-no-tra-sau",
    tieuDe: "Xem đối tác đang nợ Trả sau",
    nhomViec: "Cài đặt",
    trang: "hanMucTraSau",
    o: ["credit.limit.view"],
    gioiHan: [],
    neo: ["web/han-muc-tra-sau.ts", "public/han-muc-tra-sau.html"],
    moDau: "Màn này chỉ để xem. Cấp, điều chỉnh, đóng hạn mức trả sau làm ở màn Cấp độ đại lý.",
    noiDung: `### Các bước
1. Mở **Hạn mức trả sau**: danh sách đối tác đang bật Trả sau hoặc còn nợ, kèm số đơn quá hạn và số đơn đang trong ân hạn.
2. Bấm **Xem đơn nợ** để xem từng đơn còn nợ, hạn trả (giờ Việt Nam) và trạng thái; bấm mã đơn để mở đơn.

### Điều dễ sai
- «Quá hạn, đang trong ân hạn» chỉ là lời báo, chưa chặn gì. «Quá hạn» nghĩa là đã hết ân hạn: đối tác không đặt thêm đơn trả sau được cho tới khi thu đủ.`,
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
  {
    id: "phi-don",
    tieuDe: "Bật phí đưa đón trên đơn",
    nhomViec: "Cài đặt",
    trang: "phiDon",
    o: ["admin.manage"],
    gioiHan: [],
    neo: ["web/phi-don.ts", "public/phi-don.html", "src/shared/phi-don-hien-thi.ts"],
    moDau: "Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn. Màn Phí đưa đón còn giữ ngày bắt đầu áp: từ ngày đó, mỗi lượt đón trên đơn có ô chọn phí, và lượt chưa chọn phí thì đơn không xác nhận được.",
    noiDung: `### Các bước
1. Mở **Phí đưa đón**, bấm [[Đặt ngày bắt đầu áp]] và chọn ngày. Không cần nhập bảng mức trước.
2. Từ ngày đó, nhân viên văn phòng chọn phí cho từng lượt đón ngay trên đơn: Miễn phí, một mức có sẵn trong danh sách, hoặc Số khác (tự gõ số tiền, có mức tối đa). Đơn do Đối tác gửi thì người kiểm vé chọn phí lúc bấm [[Còn vé, xác nhận đơn]].
3. Muốn dừng tính phí: bấm [[Tắt phí đưa đón]]. Đơn đã xác nhận giữ nguyên phí đã chụp.

### Điều dễ sai
- Bảng mức theo khu vực và khối **Thử tra** vẫn còn để tra cứu, nhưng không còn tính vào đơn.
- Chưa chọn phí khác với Miễn phí: lượt chưa chọn thì đơn không xác nhận được; muốn không thu phí thì chọn Miễn phí.`,
  },
];
