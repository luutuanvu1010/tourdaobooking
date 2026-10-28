// Trang 12–16, 23: Bảng trượt, Hộp xác nhận, Dải thông báo, Báo xong, Dải trên trang, Trạng thái rỗng.
(() => {
const { BangTruot, HopXacNhan, DaiThongBao, BaoXong, DaiTrenTrang, TrangRong, ONhap, OChonMot, DauTrang, DongDanhSach, HuyHieu, ThanhTren, ThanhTabDuoi } = window.IslandBookingSystemDesignSystemV2_449f87;
const Nhan = ({ children }) => <p className="tr-nhan">{children}</p>;
const D = window.IB_DEMO = window.IB_DEMO || {};
const TAB = [{ id: "home", nhan: "Trang chủ", bieuTuong: "home" }, { id: "orders", nhan: "Đơn hàng", bieuTuong: "orders", dem: 3 }, { id: "plus", nhan: "Tạo đơn", bieuTuong: "plus" }, { id: "truck", nhan: "Chuyến", bieuTuong: "truck" }, { id: "me", nhan: "Tôi", bieuTuong: "me" }];

const NenTrang = ({ kho }) => (
  <div style={{ padding: kho === 390 ? 16 : 32, display: "flex", flexDirection: "column", gap: 16 }}>
    <DauTrang tieuDe="Đơn TD-2026-10-0412" phu="Nguyễn Thị Lan Anh · 2 NL · 1 TE" huyHieu={<HuyHieu trangThai="cho-xac-nhan" />} />
    <div style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)" }}>
      <DongDanhSach tieuDe="Tour 3 đảo – ca sáng" phu="28/10/2026 · 07:30" sau={<span className="ib-tien" style={{ fontWeight: 600 }}>1.080.000 ₫</span>} />
      <DongDanhSach tieuDe="Đưa đón sân bay Cam Ranh" phu="29/10/2026 · 14:30" sau={<span className="ib-tien" style={{ fontWeight: 600 }}>410.000 ₫</span>} />
    </div>
  </div>
);

function BangTruotXem({ kho }) {
  const [lyDo, datLyDo] = React.useState("");
  return (
    <div style={{ height: "100%", background: "var(--c-nen-phu)" }}>
      <NenTrang kho={kho} />
      <BangTruot trongKhung tieuDe="Đổi giờ đón" moTa="Tour 3 đảo – ca sáng · 28/10/2026" onDong={() => {}}
        phu={{ nhan: "Huỷ bỏ" }} chinh={{ nhan: "Lưu giờ mới", tat: !lyDo, lyDoTat: "Chọn lý do để lưu" }}>
        <ONhap nhan="Giờ đón mới" kieu="gio" macDinh="08:00" huongDan="Giờ cũ 07:30" />
        <ONhap nhan="Lý do đổi" kieu="chon" goiY="Chọn lý do" giaTri={lyDo} onDoi={datLyDo} luaChon={["Khách xin đổi", "Xe đến muộn", "Thời tiết"]} />
      </BangTruot>
    </div>
  );
}
D["12"] = {
  ten: "Bảng trượt / hộp thoại", thanhPhan: "BangTruot", mo: "Một khuôn: dưới 768 trượt từ đáy (bo 18 hai góc trên, tay cầm), từ 768 là hộp thoại giữa màn rộng 520. Chân luôn 1 nút Chính + 1 Phụ. Màn mờ rgba(15,23,42,.45).",
  dung: ["Sửa nhanh một phần của trang mà không rời trang (đổi giờ, đổi xe, thêm khách).", "Chọn từ danh sách dài có ô tìm.", "Bộ lọc khi có hơn 6 chip."],
  khong: ["Không mở bảng trượt từ bảng trượt — đổi nội dung trong cùng bảng.", "Không dùng cho biểu mẫu dài nhiều bước — mở trang riêng.", "Không dùng cho xác nhận một chiều — dùng Hộp xác nhận (cùng khuôn)."],
  trangThai: ["Mở: trượt lên / hiện dần 200 ms; giảm chuyển động thì hiện ngay.", "Đóng bằng nút ✕, bấm màn mờ, phím Esc, vuốt xuống (điện thoại).", "Nút Chính tắt + lý do khi thiếu dữ liệu; đang tải trong nút khi lưu."],
  truyen: [["mo", "đúng/sai", "Hiện"], ["tieuDe · moTa", "chữ", "Đầu bảng"], ["children", "nội dung", "Ruột (tự cuộn)"], ["chinh", "{nhan, onClick, tat, lyDoTat, dangTai, cap}", "Nút Chính"], ["phu", "{nhan, onClick}", "Nút Phụ"], ["onDong", "hàm", "Đóng"], ["trongKhung", "đúng/sai", "Chỉ cho bản xem trước"]],
  kho768: "đã là hộp thoại giữa màn.", kho1440: "hộp thoại 520 giữa màn (hộp ảnh xác nhận đơn rộng 640).", token: "<code>--r-bang-truot</code> <code>--bang-man</code> <code>--sh-lop-phu</code> <code>--w-bang-truot</code> <code>--z-bang-truot</code>",
  cao390: 640, cao1040: 560,
  Demo: BangTruotXem,
};

function XacNhanXem({ kho }) {
  const [ly, datLy] = React.useState("");
  return (
    <div style={{ height: "100%", background: "var(--c-nen-phu)" }}>
      <NenTrang kho={kho} />
      <HopXacNhan trongKhung tieuDe="Huỷ đơn TD-2026-10-0412?" nhanXacNhan="Huỷ đơn" onHuy={() => {}}
        noiDung="Khách Nguyễn Thị Lan Anh · Tour 3 đảo – ca sáng · 28/10/2026. Tiền cọc 410.000 ₫ chuyển sang chờ hoàn."
        hauQua="Không hoàn tác được. Điều phối và tài xế nhận tin huỷ ngay."
        tatXacNhan={!ly} lyDoTat="Chọn lý do để huỷ">
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="ib-o__nhan" style={{ marginBottom: 4 }}>Lý do huỷ</legend>
          {["Khách đổi ý", "Thời tiết xấu, tàu không chạy", "Trùng đơn"].map((l) => <OChonMot key={l} ten={"ly-" + kho} giaTri={l} nhan={l} chon={ly === l} onDoi={datLy} />)}
        </fieldset>
      </HopXacNhan>
    </div>
  );
}
D["13"] = {
  ten: "Hộp xác nhận hành động một chiều", thanhPhan: "HopXacNhan", mo: "Cùng khuôn Bảng trượt. Nói rõ việc gì sẽ xảy ra và không hoàn tác được. Chỗ DUY NHẤT có nút đỏ đặc.",
  dung: ["Huỷ đơn, xoá dịch vụ, khoá sổ tháng, ngưng tài khoản — việc không quay lại được.", "Câu hỏi là tiêu đề, kết thúc bằng \"?\"; nút đỏ nói đúng động từ (\"Huỷ đơn\", không \"Đồng ý\")."],
  khong: ["Không dùng cho việc hoàn tác được — làm ngay và hiện Báo xong ngắn có \"Hoàn tác\".", "Không để nút đỏ là nút được chọn sẵn khi mở."],
  trangThai: ["Mở như Bảng trượt; tiêu điểm đầu tiên rơi vào nút Phụ \"Không, quay lại\".", "Nút đỏ tắt + lý do cho tới khi chọn lý do (nếu nghiệp vụ cần).", "Đang tải: vòng quay trong nút đỏ, nút Phụ vẫn bấm được."],
  truyen: [["tieuDe", "câu hỏi", "\"Huỷ đơn …?\""], ["noiDung", "chữ", "Đối tượng bị ảnh hưởng"], ["hauQua", "chữ", "Điều xảy ra sau đó"], ["nhanXacNhan · nhanHuy", "chữ", "Hai nút"], ["onXacNhan · onHuy", "hàm", ""], ["tatXacNhan · lyDoTat · dangTai", "", "Trạng thái nút đỏ"], ["children", "nội dung", "Chọn lý do (tuỳ)"]],
  kho768: "hộp thoại giữa màn.", kho1440: "như 1040.", token: "<code>--nut-nguy-hiem</code> <code>--tt-do-bg</code> <code>--tt-do-chu</code>",
  cao390: 700, cao1040: 600,
  Demo: XacNhanXem,
};

D["14"] = {
  ten: "Dải thông báo ba tông", thanhPhan: "DaiThongBao", mo: "Báo trong nội dung, cạnh chỗ nó nói tới. Ba tông Biển / Cát / Đỏ, dùng đúng biểu tượng của tông. Bo 12, không viền.",
  dung: ["<b>Biển</b> (<code>swap</code>): việc đang diễn ra — đồng bộ, đang gửi.", "<b>Cát</b> (<code>clock</code>): cần làm — giấy tờ sắp hết hạn, đơn chờ.", "<b>Đỏ</b> (<code>alert</code>): lỗi chặn — không lưu được, quá hạn."],
  khong: ["Không chồng quá một dải trong một khối.", "Không dùng cho báo của cả ứng dụng — dùng Dải trên trang.", "Không dùng cho \"đã xong\" — dùng Báo xong ngắn."],
  trangThai: ["Có / không tiêu đề; có / không hành động (Lối nhỏ gạch chân).", "Ẩn được bằng ✕ khi tin không chặn việc.", "Đỏ đọc ngay (<code>role=alert</code>); hai tông kia lịch sự (<code>status</code>)."],
  truyen: [["ton", "bien | cat | do", "Tông"], ["tieuDe", "chữ", "Dòng đậm"], ["children", "chữ", "Nội dung"], ["hanhDong", "{nhan, onClick}", "Một Lối nhỏ"], ["onDong", "hàm", "Cho phép ẩn"]],
  kho768: "giữ nguyên.", kho1440: "tối đa bằng khối chứa.", token: "<code>--tt-bien-*</code> <code>--tt-cat-*</code> <code>--tt-do-*</code> <code>--r-the</code>",
  cao390: 560, cao1040: 420,
  Demo: ({ kho }) => (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <DaiThongBao ton="bien" onDong={() => {}}>Đang đồng bộ danh mục dịch vụ từ Google Sheet…</DaiThongBao>
      <DaiThongBao ton="cat" tieuDe="Giấy phép lái xe sắp hết hạn" hanhDong={{ nhan: "Xem giấy tờ" }}>Lê Văn Hùng · 79B-123.45 – 16 chỗ · còn 12 ngày.</DaiThongBao>
      <DaiThongBao ton="do" tieuDe="Chưa lưu được đơn" hanhDong={{ nhan: "Tới ô cần sửa" }}>Số điện thoại cần 10 chữ số, bắt đầu bằng 0.</DaiThongBao>
    </div>
  ),
};

D["15"] = {
  ten: "Báo xong ngắn", thanhPhan: "BaoXong", mo: "Một câu \"đã xong\" hiện 3 giây ở đáy (trên thanh tab), nền biển đậm, có \"Hoàn tác\" khi việc quay lại được. Rê chuột hoặc tiêu điểm thì dừng đếm.",
  dung: ["Sau một việc người dùng vừa làm: lưu, xác nhận, đổi xe, gửi tin.", "Thay hộp xác nhận cho việc hoàn tác được."],
  khong: ["Không báo lỗi bằng báo xong — lỗi dùng Dải thông báo đỏ tại chỗ.", "Không đặt nút khác ngoài \"Hoàn tác\" và ✕.", "Không xếp chồng: báo mới thay báo cũ."],
  trangThai: ["Hiện: nổi lên 200 ms · đếm 3 s · tự đóng.", "Rê / tiêu điểm: dừng đếm.", "Có / không \"Hoàn tác\"."],
  truyen: [["children", "chữ", "Một câu, bắt đầu bằng \"Đã\""], ["hoanTac", "hàm", "Hiện nút Hoàn tác"], ["onDong", "hàm", "Đóng"], ["thoiGian", "ms", "Mặc định 3000"], ["trongKhung · giuNguyen", "", "Chỉ cho bản xem trước"]],
  kho768: "giữa đáy, trên thanh tab.", kho1440: "giữa đáy vùng nội dung, cách đáy 24.", token: "<code>--c-nen-toi</code> <code>--w-bao-xong</code> <code>--sh-noi</code> <code>--bao-xong-tg</code> <code>--z-phu</code>",
  cao390: 420, cao1040: 340,
  Demo: ({ kho }) => (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-nen-phu)" }}>
      <div style={{ flex: 1 }}><NenTrang kho={kho} /></div>
      {kho === 390 ? <ThanhTabDuoi muc={TAB} chon="orders" /> : null}
      <BaoXong trongKhung giuNguyen hoanTac={() => {}} onDong={() => {}}>Đã xác nhận đơn <span className="ib-so">TD-2026-10-0412</span></BaoXong>
    </div>
  ),
};

D["16"] = {
  ten: "Dải trên trang", thanhPhan: "DaiTrenTrang", mo: "Dải sát dưới thanh trên, hết bề ngang, tối đa một. Thu gọn được còn một dòng 44. Dùng cho tin của cả ứng dụng: mất mạng, bảo trì, phiên bản mới.",
  dung: ["Mất mạng: \"Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất\" + \"Thử lại\".", "Bảo trì sắp tới, phiên bản mới, sổ tháng bị khoá."],
  khong: ["Không chồng hai dải (lỗi ở ảnh Chờ xác nhận) — tin kém khẩn vào chuông.", "Không dùng cho tin của một khối — dùng Dải thông báo."],
  trangThai: ["Mở: câu + chi tiết + hành động.", "Thu gọn: một dòng, câu cắt bằng \"…\", vẫn còn hành động và nút mở.", "Ba tông Biển / Cát / Đỏ như Dải thông báo."],
  truyen: [["ton", "bien | cat | do", "Tông"], ["children", "chữ", "Câu chính"], ["chiTiet", "chữ", "Dòng chi tiết (cho phép thu gọn)"], ["hanhDong", "{nhan, onClick, dangTai}", "Một Lối nhỏ"], ["thuGon · macDinhThuGon · onThuGon", "", "Gập"]],
  kho768: "lề trái theo lề trang 32.", kho1440: "chữ canh theo khối 1280, nền vẫn hết ngang.", token: "<code>--dai-tren-h</code> <code>--tt-*</code> <code>--z-dinh</code>",
  cao390: 470, cao1040: 360,
  Demo: ({ kho }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="LA" soThongBao={3} onTaoDon={() => {}} />
      <DaiTrenTrang ton="cat" chiTiet="Lần đồng bộ gần nhất 07:30 28/10/2026. Đơn tạo lúc này sẽ tự gửi khi có mạng." hanhDong={{ nhan: "Thử lại" }}>Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất</DaiTrenTrang>
      <div className="tr-dem"><Nhan>Thu gọn — một dòng</Nhan></div>
      <DaiTrenTrang ton="cat" macDinhThuGon chiTiet="Lần đồng bộ gần nhất 07:30 28/10/2026." hanhDong={{ nhan: "Thử lại" }}>Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất</DaiTrenTrang>
      <div className="tr-dem"><Nhan>Biển · Đỏ</Nhan></div>
      <DaiTrenTrang ton="bien" macDinhThuGon chiTiet="Trang tự tải lại sau khi cập nhật xong.">Đang cập nhật phiên bản mới</DaiTrenTrang>
      <div style={{ height: 8 }} />
      <DaiTrenTrang ton="do" macDinhThuGon chiTiet="Liên hệ kế toán để mở lại sổ.">Sổ tháng 9 đã khoá — không sửa được đơn tháng 9</DaiTrenTrang>
    </div>
  ),
};

D["23"] = {
  ten: "Trạng thái rỗng", thanhPhan: "TrangRong", mo: "Biểu tượng trong vòng tròn + một câu nói sự thật + một nút làm bước tiếp theo. Không tranh, không đùa.",
  dung: ["Danh sách, bảng, thẻ chưa có dữ liệu.", "Tìm / lọc không khớp (nút \"Xoá bộ lọc\")."],
  khong: ["Không để trống trắng — luôn có câu.", "Không đặt hai nút; không dùng nút San hô (trừ khi chính là \"+ Tạo đơn\" ở thanh trên)."],
  trangThai: ["Một hình; nút Chính khi đó là việc chính của trang, Phụ khi chỉ là gỡ bộ lọc.", "Câu phụ tuỳ chọn, tối đa 36 chữ một dòng."],
  truyen: [["bieuTuong", "tên hình", "Mặc định orders"], ["cau", "chữ", "Câu chính"], ["phu", "chữ", "Câu phụ"], ["hanhDong", "{nhan, bieuTuong, onClick, cap}", "Một nút"]],
  kho768: "giữ nguyên.", kho1440: "giữa khối chứa.", token: "<code>--c-nen-phu</code> <code>--fw-nhan</code>",
  cao390: 640, cao1040: 360,
  Demo: ({ kho }) => {
    const a = <TrangRong key="a" cau="Chưa có đơn nào hôm nay" hanhDong={{ nhan: "Tạo đơn", bieuTuong: "plus" }} />;
    const b = <TrangRong key="b" bieuTuong="search" cau="Không có đơn khớp “Hòn Tằm”" phu="Thử tìm theo mã đơn hoặc bỏ bớt bộ lọc." hanhDong={{ nhan: "Xoá bộ lọc", cap: "phu" }} />;
    const c = <TrangRong key="c" bieuTuong="truck" cau="Chưa xếp chuyến nào cho 28/10/2026" hanhDong={{ nhan: "Xếp xe", bieuTuong: "assign" }} />;
    return kho === 390 ? <div>{a}{b}</div> : <div className="tr-luoi3" style={{ padding: 16 }}>{a}{b}{c}</div>;
  },
};
})();
