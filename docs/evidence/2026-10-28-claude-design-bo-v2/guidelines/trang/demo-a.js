// Trang 00–06: Biểu tượng, Nút, Tab, Ô nhập, Ô tích/chọn một/công tắc, Bộ đếm, Chip.
(() => {
const { BieuTuong, TEN_BIEU_TUONG, Nut, Tab, ONhap, OTich, OChonMot, CongTac, BoDem, Chip } = window.IslandBookingSystemDesignSystemV2_449f87;
const Nhan = ({ children }) => <p className="tr-nhan">{children}</p>;
const D = window.IB_DEMO = window.IB_DEMO || {};

D["00"] = {
  ten: "Biểu tượng", thanhPhan: "BieuTuong", mo: "37 hình nét chép từ mã (web/icons.ts) + 1 hình MỚI (minus). Lưới 24, nét 2, không tô, màu theo chữ.",
  dung: ["Đứng trước chữ trong nút, dòng, mục điều hướng (20 px).", "Thanh trên, thanh tab, trạng thái rỗng (24 px).", "Năm hình trạng thái: <code>clock</code> cát · <code>swap</code> biển · <code>check</code> xanh lá · <code>alert</code> đỏ · <code>ban</code> xám."],
  khong: ["Không dùng emoji, ký tự Unicode thay hình.", "Không tô đặc, không đổi nét riêng từng chỗ.", "Không dùng một hình cho hai nghĩa — vd <code>chat</code> là Trợ lý, <code>handset</code> là Hỗ trợ."],
  trangThai: ["Một cỡ 20 trong nội dung, 24 ở vỏ, 14 trong huy hiệu, 16 trong chip.", "Màu = <code>currentColor</code>; không có trạng thái riêng.", "Đứng một mình thì truyền <code>nhan</code> để trình đọc màn hình đọc được."],
  truyen: [["ten", "chuỗi", "Tên trong bộ 38"], ["co", "số", "Cỡ px, mặc định 20"], ["nhan", "chuỗi", "Chỉ khi hình mang nghĩa một mình"]],
  kho768: "giữ nguyên cỡ.", kho1440: "giữ nguyên cỡ.", token: "<code>--bt-co</code> <code>--bt-co-lon</code> <code>--bt-net</code>",
  cao390: 760, cao1040: 420,
  Demo: ({ kho }) => (
    <div className="tr-dem" style={{ display: "grid", gridTemplateColumns: `repeat(${kho === 390 ? 4 : 8}, minmax(0,1fr))`, gap: 8 }}>
      {TEN_BIEU_TUONG.map((t) => (
        <div key={t} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px", borderRadius: 8, background: "var(--c-nen-phu)", color: t === "minus" ? "var(--c-nhan)" : "var(--c-chu)" }}>
          <BieuTuong ten={t} co={24} />
          <span style={{ fontFamily: "var(--f-so)", fontSize: 11, lineHeight: "14px", color: "var(--c-chu-phu)" }}>{t}{t === "minus" ? " · MỚI" : ""}</span>
        </div>
      ))}
    </div>
  ),
};

const CAP = [["chinh", "Chính", "Lưu đơn"], ["phu", "Phụ", "Xem đơn"], ["loi-nho", "Lối nhỏ", "Sửa số"], ["phu-nguy-hiem", "Phụ nguy hiểm", "Huỷ đơn"], ["san-ho", "San hô (2 chỗ)", "Tạo đơn"], ["do-dac", "Đỏ đặc (hộp xác nhận)", "Huỷ đơn"]];
D["01"] = {
  ten: "Nút", thanhPhan: "Nut", mo: "Ba cấp — Chính, Phụ, Lối nhỏ — hai cỡ 44 và 52. Mỗi vùng tối đa một nút Chính. Nút tắt luôn kèm một dòng nói vì sao.",
  dung: ["<b>Chính</b>: hành động chính của vùng (Lưu đơn, Xác nhận).", "<b>Phụ</b>: hành động thứ hai cạnh nút Chính (Huỷ bỏ, Xem chi tiết).", "<b>Lối nhỏ</b>: hành động phụ trong dòng, thẻ, bảng (Sửa, Xem đủ số).", "<b>Cỡ 52</b>: chân dính điện thoại, Đăng nhập, màn tài xế."],
  khong: ["Không đặt hai nút Chính trong một vùng.", "San hô CHỈ cho \"Xác nhận đơn để gửi khách\" và \"+ Tạo đơn\" ở thanh trên.", "Đỏ đặc CHỈ trong Hộp xác nhận một chiều; ngoài đó dùng Phụ nguy hiểm.", "Không làm mờ nút tắt; không tắt mà không nói lý do."],
  trangThai: ["Thường · Rê (chỉ khi có chuột: nền đậm hơn, Lối nhỏ gạch chân) · Bấm (thu 98%) · Tiêu điểm (vành 3 px đầm phá).", "Đang tải: vòng quay thế chỗ biểu tượng, chữ giữ nguyên, không bấm lần hai.", "Tắt: xám phẳng <code>--nut-tat-bg</code>, chữ 7:1, vẫn nhận tiêu điểm, có dòng lý do."],
  truyen: [["cap", "chinh | phu | loi-nho | phu-nguy-hiem | san-ho | do-dac", "Cấp nút"], ["co", "thuong | lon", "44 hoặc 52"], ["bieuTuong", "tên hình", "Hình 20 trước chữ"], ["dangTai", "đúng/sai", "Vòng quay"], ["tat · lyDoTat", "đúng/sai · chuỗi", "Tắt + một dòng lý do"], ["rong", "đúng/sai", "Giãn hết ngang"], ["nhan", "chuỗi", "Nhãn nút chỉ có hình"]],
  kho768: "chân dính về 44, nút hết giãn, canh phải.", kho1440: "như 1040.", token: "<code>--nut-h</code> <code>--nut-chinh-bg</code> <code>--nut-phu-vien</code> <code>--nut-tat-bg</code>",
  cao390: 1010, cao1040: 560,
  Demo: ({ kho }) => kho === 390 ? (
    <div className="tr-dem">
      <Nhan>Ba cấp · cỡ 52 ở chân dính</Nhan>
      <div className="tr-cot">
        <Nut co="lon" rong bieuTuong="check">Lưu đơn</Nut>
        <Nut cap="phu" co="lon" rong>Xem chi tiết</Nut>
        <div><Nut cap="loi-nho">Sửa số khách</Nut></div>
      </div>
      <Nhan>Trạng thái · nút Chính 44</Nhan>
      <div className="tr-luoi2">
        <Nut>Thường</Nut><Nut className="ib-xem-tieu-diem">Tiêu điểm</Nut>
        <Nut dangTai>Đang lưu…</Nut><Nut bieuTuong="plus">Có biểu tượng</Nut>
      </div>
      <Nut tat lyDoTat="Chọn lý do để lưu" rong>Lưu thay đổi</Nut>
      <Nhan>Nguy hiểm · san hô</Nhan>
      <div className="tr-cot">
        <Nut cap="phu-nguy-hiem" rong bieuTuong="trash">Huỷ đơn</Nut>
        <Nut cap="san-ho" co="lon" rong>Xác nhận đơn để gửi khách</Nut>
        <Nut cap="do-dac" rong>Huỷ đơn (chỉ trong hộp xác nhận)</Nut>
      </div>
      <Nhan>Chỉ có hình · 44×44</Nhan>
      <div className="tr-hang"><Nut cap="loi-nho" bieuTuong="close" nhan="Đóng" /><Nut cap="phu" bieuTuong="handset" nhan="Gọi khách" /></div>
    </div>
  ) : (
    <div className="tr-dem tr-dem--rong">
      <div style={{ display: "grid", gridTemplateColumns: "170px repeat(5, minmax(0,1fr))", gap: "14px 16px", alignItems: "center" }}>
        <span />{["Thường", "Rê chuột", "Tiêu điểm", "Đang tải", "Tắt + lý do"].map((t) => <Nhan key={t}>{t}</Nhan>)}
        {CAP.map(([c, ten, chu]) => (
          <React.Fragment key={c}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{ten}</span>
            <div><Nut cap={c}>{chu}</Nut></div>
            <div><Nut cap={c} className="ib-xem-re">{chu}</Nut></div>
            <div><Nut cap={c} className="ib-xem-tieu-diem">{chu}</Nut></div>
            <div><Nut cap={c} dangTai>{chu}</Nut></div>
            <div><Nut cap={c} tat lyDoTat="Chọn lý do để lưu">{chu}</Nut></div>
          </React.Fragment>
        ))}
      </div>
    </div>
  ),
};

function TabXem({ kho }) {
  const [chon, datChon] = React.useState("hom-nay");
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <Nhan>Đang chọn · số đếm</Nhan>
      <Tab nhan="Lọc đơn theo ngày" chon={chon} onChon={datChon} rong={kho === 390} muc={[{ id: "hom-nay", nhan: "Hôm nay", dem: 12 }, { id: "ngay-mai", nhan: "Ngày mai", dem: 5 }, { id: "tat-ca", nhan: "Tất cả" }]} />
      <Nhan>Rê chuột (mục 2) · tiêu điểm (mục 3)</Nhan>
      <Tab chon="cho" muc={[{ id: "cho", nhan: "Chờ xác nhận" }, { id: "da", nhan: "Đã xác nhận", xem: "ib-xem-re" }, { id: "huy", nhan: "Đã huỷ", xem: "ib-xem-tieu-diem" }]} />
      <Nhan>Nhiều mục — trượt ngang, không xuống dòng</Nhan>
      <Tab chon="tour" muc={[{ id: "tour", nhan: "Tour đảo" }, { id: "dd", nhan: "Đưa đón" }, { id: "lan", nhan: "Lặn biển" }, { id: "cano", nhan: "Cano riêng" }, { id: "khac", nhan: "Dịch vụ khác" }]} />
    </div>
  );
}
D["02"] = {
  ten: "Tab", thanhPhan: "Tab", mo: "Một kiểu tab duy nhất: rãnh xám, mục đang chọn nổi trắng chữ biển. Đổi nội dung trong cùng trang, không chuyển trang.",
  dung: ["Chia một danh sách theo 2–5 lát cùng loại (Hôm nay / Ngày mai / Tất cả).", "Chuyển góc nhìn của cùng dữ liệu (Danh sách / Lịch)."],
  khong: ["Không dùng thay chip lọc khi chọn được nhiều cái — dùng Chip.", "Không dùng làm điều hướng giữa các trang — dùng Thanh tab dưới / Thanh bên.", "Không tự chế tab riêng cho từng trang (lỗi ở ảnh điều phối)."],
  trangThai: ["Thường (chữ xám) · Rê (nền rê) · Đang chọn (viên trắng nổi + chữ biển — đổi hình, không chỉ đổi màu) · Tiêu điểm.", "Có số đếm tuỳ chọn.", "Không có tab tắt: lát không có dữ liệu vẫn bấm được và hiện Trạng thái rỗng."],
  truyen: [["muc", "[{id, nhan, dem?}]", "Các lát"], ["chon", "id", "Lát đang chọn"], ["onChon", "hàm(id)", "Khi bấm"], ["rong", "đúng/sai", "Chia đều hết ngang (điện thoại, ≤ 3 mục)"], ["nhan", "chuỗi", "Nhãn nhóm cho trình đọc"]],
  kho768: "bỏ chia đều, mục theo độ dài chữ.", kho1440: "như 1040.", token: "<code>--h-dieu-khien</code> <code>--tab-pad</code> <code>--r-tron</code>",
  cao390: 330, cao1040: 340,
  Demo: TabXem,
};

function ONhapXem({ kho }) {
  const o = [
    <ONhap key="1" nhan="Tên khách" macDinh="Nguyễn Thị Lan Anh" />,
    <ONhap key="2" nhan="Số điện thoại" kieu="sdt" macDinh="09123" loi="Số điện thoại cần 10 chữ số, bắt đầu bằng 0" />,
    <ONhap key="3" nhan="Tiền cọc" kieu="tien" macDinh="410.000" huongDan="Còn phải thu 670.000 ₫" />,
    <ONhap key="4" nhan="Ngày đi" kieu="ngay" macDinh="28/10/2026" />,
    <ONhap key="5" nhan="Giờ đón" kieu="gio" macDinh="07:30" />,
    <ONhap key="6" nhan="Dịch vụ" kieu="chon" macDinh="Tour 3 đảo – ca sáng" luaChon={["Tour 3 đảo – ca sáng", "Cano riêng Hòn Mun", "Đưa đón sân bay Cam Ranh"]} />,
    <ONhap key="7" nhan="Số phòng khách sạn" kieu="so" tuyChon goiY="Ví dụ 1204" xem="ib-xem-tieu-diem" />,
    <ONhap key="8" nhan="Mã đơn" macDinh="TD-2026-10-0412" tat lyDoTat="Mã đơn do hệ thống cấp, không sửa được" />,
    <ONhap key="9" nhan="Xe" kieu="chon" goiY="Đang tải danh sách xe…" dangTai tat />,
    <ONhap key="10" nhan="Ghi chú cho điều phối" kieu="nhieu-dong" tuyChon goiY="Ví dụ: khách có trẻ nhỏ, cần ghế em bé" />,
  ];
  return kho === 390 ? <div className="tr-dem">{o}</div> : <div className="tr-dem tr-dem--rong"><div className="tr-luoi3" style={{ rowGap: 20 }}>{o}</div></div>;
}
D["03"] = {
  ten: "Ô nhập", thanhPhan: "ONhap", mo: "Một khuôn cho tám kiểu: chữ, số, tiền, SĐT, ngày, giờ, chọn, nhiều dòng. Nhãn luôn nằm trên ô, không nhãn nổi.",
  dung: ["Mọi chỗ người dùng gõ hoặc chọn một giá trị.", "<b>tiền</b>: canh phải, hậu tố ₫, ghi đủ \"1.080.000 ₫\".", "<b>ngày</b> dd/mm/yyyy, <b>giờ</b> hh:mm — bàn phím số.", "<b>chọn</b>: danh sách ≤ 12 lựa chọn; dài hơn dùng Bảng trượt có ô tìm."],
  khong: ["Không nhãn nổi, không dùng chữ gợi ý làm nhãn.", "Không dùng dấu * cho bắt buộc — ô tuỳ chọn ghi \"(tuỳ chọn)\" sau nhãn.", "Không báo lỗi chỉ bằng màu: luôn kèm hình <code>alert</code> và câu nói cách sửa."],
  trangThai: ["Thường · Rê (viền <code>--o-vien-re</code>) · Tiêu điểm (vành 3 px) · Lỗi (viền đỏ dày 2 + câu dưới ô).", "Tắt: nền phụ, chữ xám, dòng lý do dưới ô.", "Đang tải: vòng quay cuối ô (vd danh sách xe đang về)."],
  truyen: [["nhan", "chuỗi", "Nhãn trên ô (bắt buộc)"], ["kieu", "chu | so | tien | sdt | ngay | gio | chon | nhieu-dong", "Kiểu ô"], ["tuyChon", "đúng/sai", "Thêm \"(tuỳ chọn)\""], ["giaTri · onDoi", "chuỗi · hàm", "Giá trị có kiểm soát"], ["loi", "chuỗi", "Câu nói cách sửa"], ["huongDan", "chuỗi", "Dòng gợi ý dưới ô"], ["tat · lyDoTat", "đúng/sai · chuỗi", "Tắt + lý do"], ["luaChon", "mảng", "Cho kiểu chon"], ["co", "thuong | lon", "44 hoặc 52"]],
  kho768: "lưới 2 cột.", kho1440: "lưới 3 cột trong khối tối đa 1280.", token: "<code>--o-h</code> <code>--o-vien</code> <code>--o-vien-loi</code> <code>--c-tieu-diem</code>",
  cao390: 1080, cao1040: 470,
  Demo: ONhapXem,
};

function OChonXem({ kho }) {
  const [hinhThuc, datHinhThuc] = React.useState("tien-mat");
  const tich = (
    <div className="tr-cot" style={{ gap: 0 }}>
      <Nhan>Ô tích</Nhan>
      <OTich nhan="Khách đã chuyển cọc" macDinh />
      <OTich nhan="Gửi tin nhắn xác nhận cho khách" moTa="Gửi qua Zalo theo số điện thoại của đơn" />
      <OTich nhan="Ghi nhận tiền mặt" xem="ib-xem-tieu-diem" />
      <OTich nhan="Đã khoá sổ tháng" macDinh tat lyDoTat="Sổ tháng 9 đã khoá, không sửa được" />
      <OTich nhan="Đồng ý điều khoản huỷ" loi="Cần đồng ý điều khoản huỷ để gửi đơn" />
    </div>
  );
  const mot = (
    <fieldset className="tr-cot" style={{ gap: 0, border: 0, margin: 0, padding: 0 }}>
      <legend className="tr-nhan" style={{ marginBottom: 12 }}>Ô chọn một · Hình thức thu</legend>
      {[["tien-mat", "Tiền mặt"], ["chuyen-khoan", "Chuyển khoản"], ["cong-no", "Ghi công nợ đại lý", "Chỉ khi đơn do đại lý gửi"]].map(([g, n, m]) => <OChonMot key={g} ten={"ht-" + kho} giaTri={g} nhan={n} moTa={m} chon={hinhThuc === g} onDoi={datHinhThuc} xem={g === "chuyen-khoan" ? "ib-xem-re" : ""} />)}
      <OChonMot ten={"ht2-" + kho} giaTri="the" nhan="Quẹt thẻ" tat lyDoTat="Chưa có máy quẹt thẻ ở quầy" />
    </fieldset>
  );
  const cong = (
    <div className="tr-cot" style={{ gap: 0 }}>
      <Nhan>Công tắc</Nhan>
      <CongTac nhan="Phải đủ danh sách khách" moTa="Chặn xuất bến khi thiếu tên khách" macDinh />
      <CongTac nhan="Phải có hợp đồng" />
      <CongTac nhan="Nhận thông báo đơn mới" xem="ib-xem-tieu-diem" />
      <CongTac nhan="Tự xếp xe" macDinh tat lyDoTat="Chỉ Toàn quyền đổi được" />
    </div>
  );
  return kho === 390 ? <div className="tr-dem">{tich}{mot}{cong}</div> : <div className="tr-dem tr-dem--rong"><div className="tr-luoi3" style={{ gap: 40 }}>{tich}{mot}{cong}</div></div>;
}
D["04"] = {
  ten: "Ô tích, ô chọn một, công tắc", thanhPhan: "OTich · OChonMot · CongTac", mo: "Ba điều khiển chọn chung một khuôn dòng cao ≥ 44: hình bên trái (công tắc bên phải), nhãn 16, mô tả 14.",
  dung: ["<b>Ô tích</b>: bật/tắt một điều kiện khi lưu biểu mẫu; chọn nhiều trong danh sách.", "<b>Ô chọn một</b>: 2–5 lựa chọn loại trừ nhau, thấy hết cùng lúc.", "<b>Công tắc</b>: cài đặt có hiệu lực ngay, không cần bấm Lưu."],
  khong: ["Không dùng công tắc trong biểu mẫu có nút Lưu — dùng ô tích.", "Trên 5 lựa chọn: dùng Ô nhập kiểu chọn.", "Không bỏ trống nhãn; hình nhỏ không thay chữ."],
  trangThai: ["Chưa chọn (viền xám đậm 3:1) · Đã chọn (nền biển + dấu tích / chấm dày / núm sang phải — đổi hình).", "Rê · Tiêu điểm (vành 3 px quanh hình).", "Tắt + lý do · Lỗi (viền đỏ + câu)."],
  truyen: [["nhan", "chuỗi", "Nhãn"], ["moTa", "chuỗi", "Dòng giải thích"], ["chon / bat · onDoi", "đúng/sai · hàm", "Giá trị"], ["ten · giaTri", "chuỗi", "Nhóm ô chọn một"], ["tat · lyDoTat", "đúng/sai · chuỗi", "Tắt + lý do"], ["loi", "chuỗi", "Câu lỗi (ô tích)"]],
  kho768: "giữ một cột trong biểu mẫu.", kho1440: "như 1040.", token: "<code>--tich-co</code> <code>--tich-vien</code> <code>--cong-tac-w</code> <code>--cong-tac-tat-bg</code>",
  cao390: 1170, cao1040: 470,
  Demo: OChonXem,
};

function BoDemXem({ kho }) {
  const [nl, datNl] = React.useState(2);
  const [te, datTe] = React.useState(1);
  const [eb, datEb] = React.useState(0);
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <div className="tr-hang" style={{ gap: kho === 390 ? 16 : 32 }}>
        <BoDem nhan="Người lớn" giaTri={nl} min={1} onDoi={datNl} huongDan="Từ 12 tuổi" />
        <BoDem nhan="Trẻ em" giaTri={te} onDoi={datTe} huongDan="Từ 4 đến 11 tuổi" />
        <BoDem nhan="Em bé" giaTri={eb} onDoi={datEb} huongDan="Dưới 4 tuổi · đang ở 0" />
        <BoDem nhan="Hướng dẫn viên" giaTri={1} tat lyDoTat="Đơn đã xác nhận, đổi số qua Sửa số khách" />
      </div>
      <p style={{ margin: 0, fontSize: 16 }}>Số khách: <b style={{ fontWeight: 600 }}>{nl} NL · {te} TE{eb ? " · " + eb + " EB" : ""}</b></p>
      <Nhan>Rê chuột trên nút −</Nhan>
      <BoDem nhan="Số người được chở" giaTri={16} xem="ib-xem-re" />
    </div>
  );
}
D["05"] = {
  ten: "Bộ đếm − / +", thanhPhan: "BoDem", mo: "Đổi số nhỏ bằng ngón cái: nút 44×44, số 20/600 ở giữa, nhãn trên. Chạm tới giới hạn thì nút tắt và dòng dưới nói giới hạn.",
  dung: ["Số khách theo loại (NL, TE, EB), số người được chở, số ngày.", "Giá trị thường nằm trong 0–20."],
  khong: ["Không dùng cho tiền hay số lớn — dùng Ô nhập kiểu số/tiền.", "Không bấm giữ để tăng nhanh."],
  trangThai: ["Thường · Rê (nút) · Bấm (thu 96%) · Tiêu điểm.", "Ở giới hạn: nút − hoặc + tắt xám; dòng hướng dẫn nói giới hạn.", "Tắt cả bộ + lý do."],
  truyen: [["nhan", "chuỗi", "Nhãn trên"], ["giaTri · onDoi", "số · hàm(số)", "Giá trị"], ["min · max", "số", "Giới hạn"], ["huongDan", "chuỗi", "Dòng dưới"], ["tat · lyDoTat", "đúng/sai · chuỗi", "Tắt + lý do"]],
  kho768: "như 1040, các bộ đứng một hàng.", kho1440: "như 1040.", token: "<code>--dem-nut</code> <code>--dem-o</code> <code>--dem-fs</code>",
  cao390: 470, cao1040: 290,
  Demo: BoDemXem,
};

function ChipXem({ kho }) {
  const [chon, datChon] = React.useState(["tour"]);
  const doi = (id) => datChon((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  const ds = [["tour", "Tour đảo", 8], ["dd", "Đưa đón", 3], ["lan", "Lặn biển", 1], ["cano", "Cano riêng", 0]];
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <Nhan>Lọc theo nhóm — chọn nhiều</Nhan>
      <div className="ib-tim-loc__chip" style={{ flexWrap: kho === 390 ? "nowrap" : "wrap" }}>
        {ds.map(([id, n, d]) => <Chip key={id} chon={chon.includes(id)} dem={d} onClick={() => doi(id)}>{n}</Chip>)}
      </div>
      <Nhan>Rê chuột · tiêu điểm · tắt</Nhan>
      <div className="tr-hang"><Chip className="ib-xem-re">Chờ xác nhận</Chip><Chip className="ib-xem-tieu-diem">Hôm nay</Chip><Chip tat>Ca chiều</Chip></div>
      <p className="ib-nut__ly-do" style={{ margin: 0 }}>Ca chiều tắt: hôm nay không còn chuyến chiều.</p>
    </div>
  );
}
D["06"] = {
  ten: "Chip bấm được", thanhPhan: "Chip", mo: "Viên tròn cao 36 (vùng chạm 44) để lọc nhanh. Đang chọn: nền biển nhạt + dấu tích đứng trước — không chỉ đổi màu.",
  dung: ["Lọc danh sách theo nhóm, trạng thái, ca; chọn được nhiều.", "Gợi ý nhanh trong biểu mẫu (vd chọn nhóm dịch vụ)."],
  khong: ["Không dùng để nói trạng thái — dùng Huy hiệu (không bấm được).", "Không dùng thay tab khi chỉ chọn một lát."],
  trangThai: ["Thường (viền ô) · Rê · Đang chọn (nền biển nhạt + <code>check</code>) · Tiêu điểm.", "Có số đếm tuỳ chọn.", "Tắt: xám phẳng, lý do nằm ở dòng kết quả phía dưới."],
  truyen: [["children", "chữ", "Nhãn ngắn"], ["chon", "đúng/sai", "Đang chọn"], ["onClick", "hàm", "Đổi chọn"], ["dem", "số", "Số đếm"], ["bieuTuong", "tên hình", "Hình 16 khi chưa chọn"], ["tat", "đúng/sai", "Tắt"]],
  kho768: "hàng chip xuống dòng thay vì trượt.", kho1440: "như 1040.", token: "<code>--chip-h</code> <code>--chip-pad</code> <code>--c-chinh-nhat</code>",
  cao390: 280, cao1040: 260,
  Demo: ChipXem,
};
})();
