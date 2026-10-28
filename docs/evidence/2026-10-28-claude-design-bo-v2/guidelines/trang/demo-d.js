// Trang 17–21, 25, 26: Đầu trang, Thanh dính đáy, Thanh trên, Thanh tab dưới, Thanh bên, Trang mất mạng, Trang lỗi.
(() => {
const { DauTrang, ThanhDinhDay, ThanhTren, ThanhTabDuoi, ThanhBen, TrangMatMang, TrangLoi, Nut, HuyHieu, ONhap, BoDem, DongDanhSach, BieuTuong } = window.IslandBookingSystemDesignSystemV2_449f87;
const Nhan = ({ children }) => <p className="tr-nhan">{children}</p>;
const D = window.IB_DEMO = window.IB_DEMO || {};
const TAB = [{ id: "home", nhan: "Trang chủ", bieuTuong: "home" }, { id: "orders", nhan: "Đơn hàng", bieuTuong: "orders", dem: 3 }, { id: "plus", nhan: "Tạo đơn", bieuTuong: "plus" }, { id: "truck", nhan: "Chuyến", bieuTuong: "truck" }, { id: "me", nhan: "Tôi", bieuTuong: "me" }];
const NHOM = [
  { id: "chinh", muc: [{ id: "home", nhan: "Trang chủ", bieuTuong: "home" }, { id: "orders", nhan: "Đơn hàng", bieuTuong: "orders" }, { id: "cho", nhan: "Chờ xác nhận", bieuTuong: "clock", dem: 3 }] },
  { id: "vc", nhan: "Vận chuyển", muc: [{ id: "dp", nhan: "Điều phối", bieuTuong: "assign" }, { id: "chuyen", nhan: "Chuyến", bieuTuong: "truck" }, { id: "xe", nhan: "Xe và tài xế", bieuTuong: "contact-card" }] },
  { id: "tien", nhan: "Tiền", muc: [{ id: "cn", nhan: "Sổ công nợ", bieuTuong: "money" }, { id: "hh", nhan: "Hoa hồng", bieuTuong: "chart" }, { id: "kt", nhan: "Khoá tháng", bieuTuong: "lock" }] },
  { id: "tl", nhan: "Thiết lập", muc: [{ id: "dv", nhan: "Dịch vụ và giá", bieuTuong: "services" }, { id: "nv", nhan: "Nhân viên", bieuTuong: "staff" }, { id: "dd", nhan: "Địa điểm", bieuTuong: "pin" }, { id: "gd", nhan: "Giao diện", bieuTuong: "palette" }] },
];
const NGUOI = { ten: "Phạm Thu Hà", vaiTro: "Bán hàng", chuTat: "TH" };

D["17"] = {
  ten: "Đầu trang", thanhPhan: "DauTrang", mo: "Tiêu đề trang 20/600 (điện thoại) · 24/600 (máy tính), dòng phụ 14 xám, lối quay lại phía trên. Máy tính: nút của trang nằm bên phải tiêu đề.",
  dung: ["Đầu mọi trang nội dung, ngay dưới thanh trên / dải trên trang.", "Trang con: có \"‹ Tên trang cha\"."],
  khong: ["Không lặp tên ứng dụng (đã có ở thanh trên).", "Điện thoại: không đặt nút Chính ở đầu trang — nút Chính xuống Thanh dính đáy.", "Không in hoa tiêu đề."],
  trangThai: ["Có / không quay lại · có / không huy hiệu · có / không hành động.", "Tiêu đề dài xuống dòng (cân dòng), không cắt.", "Đang tải: tiêu đề là Khung xương một dòng."],
  truyen: [["tieuDe", "chữ", "Tiêu đề"], ["phu", "chữ", "Dòng phụ"], ["quayLai", "{nhan, href | onClick}", "Lối quay lại"], ["huyHieu", "HuyHieu", "Trạng thái cạnh tiêu đề"], ["hanhDong", "nút", "Tối đa 1 Chính + 1 Phụ"]],
  kho768: "tiêu đề 20, hành động xuống dưới tiêu đề nếu thiếu chỗ.", kho1440: "tiêu đề 24, canh theo khối 1280.", token: "<code>--fs-tieu-de-trang</code> <code>--fs-tieu-de-trang-rong</code> <code>--lh-tieu-de</code>",
  cao390: 330, cao1040: 300,
  Demo: ({ kho }) => (
    <div className="tr-dem" style={{ padding: kho === 390 ? 16 : 32, gap: kho === 390 ? 28 : 40 }}>
      <DauTrang tieuDe="Đơn hàng" phu="28/10/2026 · 12 đơn" hanhDong={kho === 1040 ? <Nut cap="phu" bieuTuong="doc-check">Xuất bảng kê</Nut> : null} />
      <DauTrang quayLai={{ nhan: "Đơn hàng" }} tieuDe="Nguyễn Thị Lan Anh" huyHieu={<HuyHieu trangThai="cho-xac-nhan" />} phu={<React.Fragment><span className="ib-so">TD-2026-10-0412</span> · Tour 3 đảo – ca sáng</React.Fragment>}
        hanhDong={kho === 1040 ? <React.Fragment><Nut cap="phu">Sửa đơn</Nut><Nut cap="san-ho">Xác nhận đơn để gửi khách</Nut></React.Fragment> : null} />
    </div>
  ),
};

const Khoi = ({ cao, children }) => <div style={{ height: cao, overflow: "auto", display: "flex", flexDirection: "column", background: "var(--c-nen)", borderBottom: "8px solid var(--c-nen-phu)" }}>{children}</div>;
D["18"] = {
  ten: "Thanh dính đáy", thanhPhan: "ThanhDinhDay", mo: "Giữ nút chốt luôn trong tầm ngón cái. Điện thoại: nút 52, chia đều hết ngang, có dòng tóm tắt tiền. Từ 768: nút 44 canh phải, tóm tắt bên trái.",
  dung: ["Biểu mẫu Lập đơn / Sửa đơn: \"Lưu nháp\" + \"Lưu đơn\".", "Trang chi tiết đơn: \"Xác nhận đơn để gửi khách\" (San hô).", "Màn tài xế: \"Đã đón\" / \"Đã trả\" — một nút Chính 52 hết ngang."],
  khong: ["Không quá hai nút; không đặt Lối nhỏ ở đây.", "Trang có thanh dính đáy thì ẩn thanh tab dưới (việc đang làm là toàn màn).", "Không dính khi trang chỉ đọc."],
  trangThai: ["Nút theo luật Nút: tắt + lý do, đang tải.", "Có / không dòng tóm tắt.", "Tôn trọng vùng an toàn đáy iPhone."],
  truyen: [["children", "1–2 Nut", "Phụ trước, Chính sau"], ["tomTat", "nội dung", "Dòng tóm tắt (tiền, số khách)"]],
  kho768: "nút 44 canh phải, không giãn.", kho1440: "ruột tối đa 1280, giữa màn.", token: "<code>--nut-h-lon</code> <code>--z-dinh</code> <code>--c-vien</code>",
  cao390: 700, cao1040: 420, nen: "phu",
  Demo: ({ kho }) => kho === 390 ? (
    <div>
      <Khoi cao={380}>
        <div className="tr-dem" style={{ flex: 1 }}>
          <Nhan>Lập đơn</Nhan>
          <ONhap nhan="Tên khách" macDinh="Nguyễn Thị Lan Anh" />
          <div className="tr-hang" style={{ gap: 16 }}><BoDem nhan="Người lớn" giaTri={2} min={1} /><BoDem nhan="Trẻ em" giaTri={1} /></div>
          <ONhap nhan="Tiền cọc" kieu="tien" macDinh="410.000" />
        </div>
        <ThanhDinhDay tomTat={<React.Fragment><span>Còn phải thu</span><b className="ib-tien" style={{ color: "var(--c-chu)", fontWeight: 600, fontSize: 16 }}>670.000 ₫</b></React.Fragment>}>
          <Nut cap="phu">Lưu nháp</Nut><Nut bieuTuong="check">Lưu đơn</Nut>
        </ThanhDinhDay>
      </Khoi>
      <Khoi cao={312}>
        <div className="tr-dem" style={{ flex: 1 }}>
          <Nhan>Tài xế · ngoài nắng, một tay</Nhan>
          <DongDanhSach truoc={<BieuTuong ten="pin" />} tieuDe="Đón Nguyễn Thị Lan Anh" phu="07:30 · Khách sạn Biển Xanh, 12 Trần Phú · 2 NL · 1 TE" />
        </div>
        <ThanhDinhDay><Nut cap="phu" bieuTuong="handset">Gọi khách</Nut><Nut bieuTuong="check">Đã đón</Nut></ThanhDinhDay>
      </Khoi>
    </div>
  ) : (
    <Khoi cao={420}>
      <div className="tr-dem tr-dem--rong" style={{ flex: 1 }}>
        <Nhan>Lập đơn</Nhan>
        <div className="tr-luoi3"><ONhap nhan="Tên khách" macDinh="Nguyễn Thị Lan Anh" /><ONhap nhan="Số điện thoại" kieu="sdt" macDinh="0912345678" /><ONhap nhan="Tiền cọc" kieu="tien" macDinh="410.000" /></div>
      </div>
      <ThanhDinhDay tomTat={<React.Fragment><span>Tổng <b className="ib-tien" style={{ color: "var(--c-chu)", fontWeight: 600 }}>1.080.000 ₫</b> · còn phải thu <b className="ib-tien" style={{ color: "var(--c-chu)", fontWeight: 600 }}>670.000 ₫</b></span></React.Fragment>}>
        <Nut cap="phu">Lưu nháp</Nut><Nut tat lyDoTat="Chọn giờ đón để lưu">Lưu đơn</Nut>
      </ThanhDinhDay>
    </Khoi>
  ),
};

D["19"] = {
  ten: "Thanh trên", thanhPhan: "ThanhTren", mo: "Cao 60: logo 30 + tên, rồi Trợ lý, chuông, tài khoản. Từ 768 thêm nút San hô \"+ Tạo đơn\". Không nút nổi. Vỏ mặc định trắng chữ biển; Toàn quyền đổi được màu vỏ.",
  dung: ["Đầu mọi trang sau Đăng nhập, cả điện thoại và máy tính.", "Màu vỏ đổi bằng ba token <code>--vo-bg</code> <code>--vo-chu</code> <code>--vo-vien</code>; mọi thứ trong thanh theo <code>currentColor</code>."],
  khong: ["Không đặt ô tìm, tab, nút khác lên thanh.", "Không có nút nổi (FAB) ở bất kỳ khổ nào.", "Điện thoại không có \"+ Tạo đơn\" trên thanh — đã có ở giữa thanh tab dưới."],
  trangThai: ["Chuông: có số đỏ khi có tin chưa đọc (99+).", "Nút: rê (nền 10% màu chữ) · tiêu điểm.", "Thành phần bên dưới không đọc màu vỏ."],
  truyen: [["ten", "chữ", "Tên hiện cạnh logo"], ["logo", "đường dẫn", "assets/logo-96.png"], ["onTaoDon", "hàm", "Có thì hiện \"+ Tạo đơn\" (≥ 768)"], ["soThongBao", "số", "Số trên chuông"], ["chuTat", "chữ", "Chữ tắt tài khoản"], ["onTroLy · onChuong · onTaiKhoan", "hàm", ""]],
  kho768: "hiện \"+ Tạo đơn\".", kho1440: "như 1040; thanh hết ngang, ruột canh theo màn.", token: "<code>--h-thanh-tren</code> <code>--vo-bg</code> <code>--vo-chu</code> <code>--vo-vien</code>",
  cao390: 260, cao1040: 260, nen: "phu",
  Demo: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="TH" soThongBao={3} onTaoDon={() => {}} />
      <div className="tr-dem"><Nhan>Vỏ do Toàn quyền đổi — thành phần trong thanh tự theo</Nhan></div>
      <div style={{ "--vo-bg": "var(--mau-bien)", "--vo-chu": "var(--mau-trang)", "--vo-vien": "transparent" }}><ThanhTren logo={window.IB_LOGO} chuTat="TH" soThongBao={12} onTaoDon={() => {}} /></div>
      <div style={{ height: 12 }} />
      <div style={{ "--vo-bg": "var(--mau-cat-nhat)", "--vo-chu": "var(--mau-cat-chu)", "--vo-vien": "var(--mau-cat-vien)" }}><ThanhTren logo={window.IB_LOGO} chuTat="TH" onTaoDon={() => {}} /></div>
    </div>
  ),
};

function TabDuoiXem({ kho }) {
  const [chon, datChon] = React.useState("orders");
  if (kho === 1040) {
    return (
      <div className="tr-dem tr-dem--rong">
        <p style={{ margin: 0, color: "var(--c-chu-phu)" }}>Từ 900 trở lên thanh tab dưới nhường chỗ cho Thanh bên (21). Ở 768 (máy tính bảng dọc) thanh tab vẫn giữ — xem dưới.</p>
        <Nhan>768 · máy tính bảng</Nhan>
        <div className="ib-khung" style={{ width: 768, borderRadius: 12, overflow: "hidden", boxShadow: "0 0 0 1px var(--c-vien)" }}><ThanhTabDuoi muc={TAB} chon={chon} onChon={datChon} /></div>
      </div>
    );
  }
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-nen-phu)" }}>
      <div style={{ flex: 1, overflow: "hidden", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Nhan>Bấm để đổi mục · nội dung cuộn sau lớp kính</Nhan>
        {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} style={{ height: 64, borderRadius: 12, background: "var(--c-nen)", boxShadow: "var(--sh-the)" }} />)}
      </div>
      <div style={{ marginTop: -88 }}><ThanhTabDuoi muc={TAB} chon={chon} onChon={datChon} /></div>
    </div>
  );
}
D["20"] = {
  ten: "Thanh tab dưới", thanhPhan: "ThanhTabDuoi", mo: "Điện thoại và 768: 4–5 mục, cao 56 + vùng an toàn, nền kính mờ rgba(255,255,255,.86). Mục đang chọn có viên biển nhạt quanh biểu tượng — không chỉ đổi màu.",
  dung: ["Năm điểm đến chính: Trang chủ, Đơn hàng, Tạo đơn, Chuyến, Tôi (theo vai trò đổi mục 4).", "Số đỏ trên biểu tượng cho việc chờ."],
  khong: ["Không quá 5 mục, không mục \"Thêm\" chứa menu ẩn.", "Không có nút nổi giữa thanh; \"Tạo đơn\" là một mục bình thường.", "Không dùng ở ≥ 900 — dùng Thanh bên."],
  trangThai: ["Thường (xám) · Đang chọn (viên + chữ biển) · Bấm · Tiêu điểm.", "Có số đếm.", "Ẩn khi trang có Thanh dính đáy."],
  truyen: [["muc", "[{id, nhan, bieuTuong, dem?, href?}]", "4–5 mục"], ["chon", "id", "Mục đang chọn"], ["onChon", "hàm(id)", "Khi bấm"]],
  kho768: "giữ thanh tab, mục giãn đều.", kho1440: "không dùng.", token: "<code>--h-thanh-tab</code> <code>--thanh-tab-bg</code> <code>--thanh-tab-mo</code> <code>--z-tab</code>",
  cao390: 520, cao1040: 260,
  Demo: TabDuoiXem,
};

function ThanhBenXem({ kho }) {
  const [chon, datChon] = React.useState("orders");
  if (kho === 390) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--c-nen-phu)" }}>
        <div style={{ padding: "12px 16px 4px" }}><Nhan>Điện thoại: không có thanh bên — cùng nhóm nằm trong tab “Tôi”</Nhan></div>
        <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          {NHOM.slice(1).map((n) => (
            <div key={n.id}>
              <p style={{ margin: "8px 0 6px", fontSize: 14, fontWeight: 500, color: "var(--c-chu-phu)" }}>{n.nhan}</p>
              <div style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)", overflow: "hidden" }}>{n.muc.map((m) => <DongDanhSach key={m.id} bamDuoc truoc={<BieuTuong ten={m.bieuTuong} />} tieuDe={m.nhan} />)}</div>
            </div>
          ))}
        </div>
        <ThanhTabDuoi muc={TAB} chon="me" />
      </div>
    );
  }
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="TH" soThongBao={3} onTaoDon={() => {}} />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <ThanhBen nhom={NHOM.map((n) => n.id === "chinh" ? { ...n, muc: n.muc.map((m) => m.id === "cho" ? { ...m, xem: "ib-xem-re" } : m) } : n)} moSan={["vc"]} chon={chon} onChon={datChon} nguoi={NGUOI} />
        <div style={{ flex: 1, padding: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <DauTrang tieuDe="Đơn hàng" phu="28/10/2026 · 12 đơn" />
          <p style={{ margin: 0, color: "var(--c-chu-phu)", fontSize: 14 }}>Nhóm Tiền và Thiết lập đang gập; bấm tên nhóm để mở. Mục “Chờ xác nhận” đang được rê chuột.</p>
        </div>
      </div>
    </div>
  );
}
D["21"] = {
  ten: "Thanh bên nhóm gập", thanhPhan: "ThanhBen", mo: "Máy tính ≥ 900: rộng 248, nền phụ, mục 40 cao. Nhóm có tên viết thường đầu câu, gập được. Mục đang chọn: nền biển nhạt + vạch đầm phá 3 px. Chân: Của tôi, Hỗ trợ, Hướng dẫn, tên người.",
  dung: ["Điều hướng chính của máy tính.", "Nhóm theo việc: Vận chuyển, Tiền, Thiết lập — hiện theo quyền."],
  khong: ["Không in hoa tên nhóm, không giãn chữ.", "Không lồng nhóm trong nhóm.", "Không đặt nút hành động trong thanh bên."],
  trangThai: ["Mục: thường · rê (nền trắng) · đang chọn · tiêu điểm · có số đếm (tông Cát = việc chờ).", "Nhóm: mở / gập (mũi tên xoay 200 ms); nhóm gập mà chứa mục đang chọn thì có chấm biển."],
  truyen: [["nhom", "[{id, nhan?, muc:[{id, nhan, bieuTuong, dem?}]}]", "Nhóm; nhan trống = nhóm đầu không tiêu đề"], ["chon · onChon", "id · hàm", "Mục đang chọn"], ["moSan", "mảng id", "Nhóm mở sẵn"], ["chan", "mảng mục", "Mặc định Của tôi, Hỗ trợ, Hướng dẫn"], ["nguoi", "{ten, vaiTro, chuTat}", "Chân thanh"]],
  kho768: "không dùng — tab dưới + tab “Tôi”.", kho1440: "248 cố định bên trái; nội dung 1280 canh giữa phần còn lại.", token: "<code>--w-thanh-ben</code> <code>--thanh-ben-muc-h</code> <code>--thanh-ben-vach</code> <code>--c-tieu-diem</code>",
  cao390: 700, cao1040: 700,
  Demo: ThanhBenXem,
};

function MatMangXem({ kho }) {
  const [dang, datDang] = React.useState(false);
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="TH" onTaoDon={() => {}} />
      <TrangMatMang lanXemCuoi="07:30 28/10/2026" dangThu={dang} onThuLai={() => { datDang(true); setTimeout(() => datDang(false), 1500); }} />
    </div>
  );
}
D["25"] = {
  ten: "Trang mất mạng", thanhPhan: "TrangMatMang", mo: "Khi ngoài mạng mà máy chưa lưu trang này. Nếu đã có bản lưu, KHÔNG dùng trang này — hiện dữ liệu cũ kèm Dải trên trang Cát \"Đang ngoài mạng — đang hiện dữ liệu lần xem gần nhất\".",
  dung: ["Mở một trang chưa từng xem khi không có mạng.", "Lần mở ứng dụng đầu tiên khi không có mạng."],
  khong: ["Không hiện chữ kỹ thuật (\"Failed to fetch\", mã lỗi).", "Không thay dữ liệu đã có bằng trang này."],
  trangThai: ["Thường · Đang thử lại (vòng quay trong nút).", "Có mạng lại: tự tải trang, không cần bấm."],
  truyen: [["lanXemCuoi", "chữ", "Giờ đồng bộ gần nhất"], ["dangThu", "đúng/sai", "Vòng quay"], ["onThuLai", "hàm", "Thử lại"]],
  kho768: "như 1040.", kho1440: "giữa vùng nội dung, rộng tối đa 440.", token: "<code>--tt-cat-bg</code> <code>--fs-tieu-de-trang</code>",
  cao390: 560, cao1040: 520,
  Demo: MatMangXem,
};

D["26"] = {
  ten: "Trang không quyền / không có trang", thanhPhan: "TrangLoi", mo: "Một trang chung cho 403 và 404: biểu tượng, câu nói chuyện gì xảy ra, \"Về Trang chủ\" và một lối nhỏ. Mã lỗi chỉ là dòng nhỏ cuối trang — không bao giờ in nguyên dòng mã.",
  dung: ["<b>khong-co-trang</b>: địa chỉ sai, đơn đã bị xoá, liên kết cũ.", "<b>khong-quyen</b>: vai trò không được xem trang."],
  khong: ["Không hiện dòng mã lỗi thô (lỗi ở ảnh 404 của Bán hàng).", "Không đẩy người dùng ra màn Đăng nhập khi chỉ thiếu quyền."],
  trangThai: ["Hai loại, cùng khuôn.", "Trong khung ứng dụng (thanh trên, thanh tab / thanh bên vẫn còn)."],
  truyen: [["loai", "khong-co-trang | khong-quyen", ""], ["duongDan", "chữ", "Địa chỉ đã mở (hiện nhỏ, chữ máy)"], ["onVeTrangChu", "hàm", "Nút Chính"], ["onPhu", "hàm", "Báo địa chỉ sai / Nhờ cấp quyền"]],
  kho768: "hai nút cùng hàng.", kho1440: "giữa vùng nội dung.", token: "<code>--c-nen-phu</code> <code>--f-so</code>",
  cao390: 560, cao1040: 520,
  Demo: ({ kho }) => kho === 390 ? (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="TH" />
      <TrangLoi loai="khong-co-trang" duongDan="/don-hang/TD-2026-10-9999" />
    </div>
  ) : (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ThanhTren logo={window.IB_LOGO} chuTat="TH" onTaoDon={() => {}} />
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div className="ib-khung" style={{ borderRight: "1px solid var(--c-vien)" }}><TrangLoi loai="khong-co-trang" duongDan="/don-hang/TD-2026-10-9999" /></div>
        <div className="ib-khung"><TrangLoi loai="khong-quyen" duongDan="/so-cong-no" /></div>
      </div>
    </div>
  ),
};
})();
