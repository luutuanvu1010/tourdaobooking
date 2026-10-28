// Trang 07–11, 22, 24: Huy hiệu, Thẻ, Dòng danh sách, Bảng, Cụm tìm lọc, Khung xương, Phân trang.
(() => {
const { BieuTuong, HuyHieu, TU_VUNG_TRANG_THAI, BIEU_TUONG_TONG, The, DongDanhSach, BangDuLieu, CumTimLoc, KhungXuong, PhanTrang, Nut, TrangRong } = window.IslandBookingSystemDesignSystemV2_449f87;
const Nhan = ({ children }) => <p className="tr-nhan">{children}</p>;
const D = window.IB_DEMO = window.IB_DEMO || {};
const TONG = [["cat", "Cát", "Chờ, cần làm"], ["bien", "Biển", "Đang diễn ra"], ["la", "Xanh lá", "Xong, tốt"], ["do", "Đỏ", "Huỷ, lỗi, quá hạn"], ["xam", "Xám", "Không còn hiệu lực"]];
const Tien = ({ children, phu }) => <span className="ib-tien" style={phu ? { color: "var(--c-chu-phu)", fontSize: 14 } : { fontWeight: 600 }}>{children}</span>;

D["07"] = {
  ten: "Huy hiệu trạng thái", thanhPhan: "HuyHieu", mo: "Năm tông, mỗi tông một cặp nền nhạt / chữ đậm và một biểu tượng. Chữ 12/500, bo tròn, không viền. 23 trạng thái cố định trong từ vựng.",
  dung: ["Nói trạng thái của đơn, chuyến, xe, giấy tờ, vé hỗ trợ.", "Đứng cạnh tên hoặc ở cột Trạng thái của bảng.", "Truyền <code>trangThai</code> — bộ tự chọn chữ, tông, hình."],
  khong: ["Không bấm được — muốn lọc theo trạng thái dùng Chip.", "Không tự đặt chữ mới cùng nghĩa (\"Chờ duyệt\" = \"Chờ xác nhận\").", "Không dùng màu tông cho chữ thường hay nút."],
  trangThai: ["Một hình duy nhất, không rê, không tắt.", "Không bao giờ chỉ có màu: luôn có biểu tượng + chữ.", "Cần trạng thái mới: thêm vào từ vựng (một chữ, chọn một trong năm tông), không vẽ huy hiệu riêng."],
  truyen: [["trangThai", "khoá từ vựng", "vd cho-xac-nhan, da-huy"], ["ton · children", "cat | bien | la | do | xam · chữ", "Chỉ khi chưa có trong từ vựng — báo để thêm"]],
  kho768: "giữ nguyên.", kho1440: "giữ nguyên.", token: "<code>--tt-*-bg</code> <code>--tt-*-chu</code> <code>--huy-hieu-pad</code> <code>--fs-huy-hieu</code>",
  cao390: 640, cao1040: 400,
  Demo: ({ kho }) => {
    const theoTong = (t) => Object.keys(TU_VUNG_TRANG_THAI).filter((k) => TU_VUNG_TRANG_THAI[k][0] === t);
    return kho === 390 ? (
      <div className="tr-dem">
        {TONG.map(([t, ten, y]) => (
          <div key={t} className="tr-cot" style={{ gap: 8 }}>
            <Nhan>{ten} · {y} · {BIEU_TUONG_TONG[t]}</Nhan>
            <div className="tr-hang" style={{ gap: 8 }}>{theoTong(t).map((k) => <HuyHieu key={k} trangThai={k} />)}</div>
          </div>
        ))}
      </div>
    ) : (
      <div className="tr-dem tr-dem--rong">
        <div style={{ display: "grid", gridTemplateColumns: "120px 150px 90px 1fr", gap: "0 16px", alignItems: "center" }}>
          {["Tông", "Nền / chữ", "Biểu tượng", "Trạng thái"].map((h) => <Nhan key={h}>{h}</Nhan>)}
          {TONG.map(([t, ten]) => (
            <React.Fragment key={t}>
              <span style={{ fontWeight: 500, padding: "14px 0", borderTop: "1px solid var(--c-vien)" }}>{ten}</span>
              <span style={{ fontFamily: "var(--f-so)", fontSize: 13, color: "var(--c-chu-phu)", padding: "14px 0", borderTop: "1px solid var(--c-vien)" }}>--tt-{t}-bg / chu</span>
              <span style={{ padding: "14px 0", borderTop: "1px solid var(--c-vien)", fontFamily: "var(--f-so)", fontSize: 13 }}>{BIEU_TUONG_TONG[t]}</span>
              <div className="tr-hang" style={{ gap: 8, padding: "10px 0", borderTop: "1px solid var(--c-vien)" }}>{theoTong(t).map((k) => <HuyHieu key={k} trangThai={k} />)}</div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  },
};

const DON = [
  { id: "TD-2026-10-0412", khach: "Nguyễn Thị Lan Anh", dv: "Tour 3 đảo – ca sáng", ngay: "28/10/2026", gio: "07:30", sk: "2 NL · 1 TE", tong: "1.080.000 ₫", con: "670.000 ₫", tt: "cho-xac-nhan" },
  { id: "TD-2026-10-0413", khach: "Trần Quốc Bảo", dv: "Cano riêng Hòn Mun", ngay: "28/10/2026", gio: "08:00", sk: "2 NL", tong: "410.000 ₫", con: "0 ₫", tt: "da-xac-nhan" },
  { id: "TD-2026-10-0414", khach: "Nguyễn Thị Lan Anh", dv: "Đưa đón sân bay Cam Ranh", ngay: "29/10/2026", gio: "14:30", sk: "2 NL · 1 TE", tong: "410.000 ₫", con: "410.000 ₫", tt: "da-xep" },
  { id: "TD-2026-10-0409", khach: "Trần Quốc Bảo", dv: "Tour 3 đảo – ca sáng", ngay: "27/10/2026", gio: "07:30", sk: "2 NL", tong: "1.080.000 ₫", con: "0 ₫", tt: "hoan-tat" },
  { id: "TD-2026-10-0401", khach: "Nguyễn Thị Lan Anh", dv: "Cano riêng Hòn Mun", ngay: "26/10/2026", gio: "09:00", sk: "2 NL · 1 TE", tong: "1.080.000 ₫", con: "—", tt: "da-huy" },
];

function TheXem({ kho }) {
  const thuong = (
    <The key="a" tieuDe="Tour 3 đảo – ca sáng" phu="28/10/2026 · 07:30 · 2 NL · 1 TE" sau={<HuyHieu trangThai="cho-xac-nhan" />}
      chan={<React.Fragment><Nut cap="loi-nho" bieuTuong="handset">Gọi khách</Nut><Nut cap="phu">Sửa đơn</Nut></React.Fragment>}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-chu-phu)" }}><span>Tổng tiền</span><Tien>1.080.000 ₫</Tien></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-chu-phu)" }}><span>Đã cọc</span><span className="ib-tien">410.000 ₫</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--c-chu-phu)" }}><span>Còn phải thu</span><Tien>670.000 ₫</Tien></div>
    </The>
  );
  const bam = <The key="b" bamDuoc tieuDe="Nguyễn Thị Lan Anh" phu={<React.Fragment><span className="ib-so">TD-2026-10-0412</span> · Tour 3 đảo – ca sáng</React.Fragment>} sau={<HuyHieu trangThai="da-xac-nhan" />} />;
  const re = <The key="c" bamDuoc xem="ib-xem-re" tieuDe="Trần Quốc Bảo" phu="Cano riêng Hòn Mun · rê chuột" sau={<HuyHieu trangThai="dang-chay" />} />;
  const td = <The key="d" bamDuoc xem="ib-xem-tieu-diem" tieuDe="Lê Văn Hùng" phu="79B-123.45 – 16 chỗ · tiêu điểm" sau={<HuyHieu trangThai="da-xep" />} />;
  const tai = <The key="e" tieuDe="Đưa đón sân bay Cam Ranh" dangTai><KhungXuong kieu="dong" soDong={3} /></The>;
  const rong = <The key="f" tieuDe="Đơn hôm nay"><TrangRong cau="Chưa có đơn nào hôm nay" hanhDong={{ nhan: "Tạo đơn", bieuTuong: "plus" }} /></The>;
  return kho === 390
    ? <div className="tr-dem">{[thuong, bam, re, td, tai, rong]}</div>
    : <div className="tr-dem tr-dem--rong"><div className="tr-luoi3" style={{ alignItems: "start" }}><div className="tr-cot">{thuong}{tai}</div><div className="tr-cot">{bam}{re}{td}</div>{rong}</div></div>;
}
D["08"] = {
  ten: "Thẻ", thanhPhan: "The", mo: "Một kiểu thẻ: nền trắng, bo 12, một bóng nhẹ, không viền. Hai biến thể: thường (chứa nội dung, có chân nút) và bấm được (cả thẻ là một liên kết, có mũi tên).",
  dung: ["Gom một đối tượng: một đơn, một chuyến, một khối tóm tắt tiền.", "<b>Bấm được</b>: mở chi tiết đối tượng; cả thẻ là vùng bấm."],
  khong: ["Không lồng thẻ trong thẻ; trong thẻ dùng Dòng danh sách.", "Thẻ bấm được không chứa nút bên trong.", "Không dùng thẻ để bọc từng ô của biểu mẫu."],
  trangThai: ["Thường · Rê (bấm được: nền rê, không nổi bóng) · Bấm (thu 99%) · Tiêu điểm.", "Đang tải: giữ khung, ruột là Khung xương — không nhảy bố cục.", "Rỗng: ruột là Trạng thái rỗng."],
  truyen: [["tieuDe · phu", "chữ", "Đầu thẻ"], ["sau", "nút / huy hiệu", "Góc phải đầu thẻ"], ["children", "nội dung", "Ruột"], ["chan", "nút", "Chân thẻ (1 Phụ + Lối nhỏ)"], ["bamDuoc · href · onClick", "", "Thẻ bấm được"], ["dangTai", "đúng/sai", "Đang tải"]],
  kho768: "lưới 2 cột.", kho1440: "lưới 3–4 cột trong 1280.", token: "<code>--r-the</code> <code>--sh-the</code> <code>--pad-the</code> <code>--pad-the-rong</code>",
  cao390: 1170, cao1040: 640, nen: "phu",
  Demo: TheXem,
};

function DongXem({ kho }) {
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <div style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)", overflow: "hidden" }}>
        <DongDanhSach bamDuoc truoc={<BieuTuong ten="orders" />} tieuDe="Nguyễn Thị Lan Anh" phu={<React.Fragment><span className="ib-so">TD-2026-10-0412</span> · Tour 3 đảo – ca sáng</React.Fragment>} dong3="28/10/2026 · 07:30 · 2 NL · 1 TE" sau={<React.Fragment><HuyHieu trangThai="cho-xac-nhan" /><Tien>1.080.000 ₫</Tien></React.Fragment>} />
        <DongDanhSach bamDuoc xem="ib-xem-re" truoc={<BieuTuong ten="orders" />} tieuDe="Trần Quốc Bảo" phu="Cano riêng Hòn Mun · rê chuột" sau={<HuyHieu trangThai="da-xac-nhan" />} />
        <DongDanhSach bamDuoc xem="ib-xem-tieu-diem" truoc={<BieuTuong ten="truck" />} tieuDe="Đưa đón sân bay Cam Ranh — đón tại sảnh quốc tế, cột số 5" phu="79B-123.45 – 16 chỗ · Lê Văn Hùng · tên dài tự xuống dòng, không cắt" sau={<HuyHieu trangThai="da-xep" />} />
        <DongDanhSach chuaDoc truoc={<BieuTuong ten="bell" />} tieuDe="Đơn mới cần xác nhận" phu="TD-2026-10-0412 · 5 phút trước" />
        <DongDanhSach truoc={<BieuTuong ten="money" />} tieuDe="Còn phải thu" phu="Không bấm được — chỉ hiện" sau={<Tien>670.000 ₫</Tien>} />
        <div className="ib-dong"><KhungXuong kieu="dong" soDong={2} /></div>
      </div>
    </div>
  );
}
D["09"] = {
  ten: "Dòng danh sách", thanhPhan: "DongDanhSach", mo: "Dòng cao ≥ 44, đệm 12×16, kẻ dưới 1 px. Tối đa ba dòng chữ: tên 16/500, phụ 14 xám. Tên dài xuống dòng, không bao giờ cắt.",
  dung: ["Danh sách đơn, chuyến, khách, thông báo trên điện thoại.", "Dòng trong thẻ; dòng cài đặt dẫn tới trang con."],
  khong: ["Không dùng thay bảng ở máy tính khi cần so sánh cột số — dùng Bảng.", "Không đặt quá một nút trong dòng; nhiều hành động thì mở chi tiết."],
  trangThai: ["Thường · Rê (bấm được) · Bấm · Tiêu điểm.", "Chưa đọc: nền <code>--thong-bao-chua-doc-bg</code> + chấm biển trước tên (không chỉ màu).", "Đang tải: Khung xương hai dòng cùng chiều cao."],
  truyen: [["tieuDe", "chữ", "Dòng 1"], ["phu", "chữ", "Dòng 2"], ["dong3", "chữ", "Dòng 3 (tuỳ)"], ["truoc", "biểu tượng / chữ tắt", "Bên trái"], ["sau", "huy hiệu / tiền", "Bên phải"], ["bamDuoc · href · onClick", "", "Mở chi tiết"], ["chuaDoc", "đúng/sai", "Thông báo chưa đọc"]],
  kho768: "giữ nguyên, có thể chia 2 cột thẻ.", kho1440: "dùng trong ngăn thông báo, thanh bên phải.", token: "<code>--h-dong</code> <code>--pad-dong</code> <code>--c-vien</code>",
  cao390: 620, cao1040: 500, nen: "phu",
  Demo: DongXem,
};

const COT = [
  { khoa: "id", nhan: "Mã đơn", gon: true, hien: (d) => <span className="ib-so">{d.id}</span> },
  { khoa: "khach", nhan: "Khách" },
  { khoa: "dv", nhan: "Dịch vụ" },
  { khoa: "ngay", nhan: "Ngày đi", gon: true, hien: (d) => <React.Fragment>{d.ngay}<br /><span style={{ color: "var(--c-chu-phu)", fontSize: 14 }}>{d.gio}</span></React.Fragment> },
  { khoa: "tong", nhan: "Tổng tiền", can: "phai" },
  { khoa: "tt", nhan: "Trạng thái", gon: true, hien: (d) => <HuyHieu trangThai={d.tt} /> },
];
const baDong = (d) => ({ dong1: d.khach, sau1: <HuyHieu trangThai={d.tt} />, dong2: <React.Fragment><span className="ib-so">{d.id}</span> · {d.dv} · {d.ngay} {d.gio}</React.Fragment>, dong3: <Tien>{d.tong}</Tien> });
const hd = () => <Nut cap="loi-nho">Xem</Nut>;
D["10"] = {
  ten: "Bảng máy tính", thanhPhan: "BangDuLieu", mo: "Bảng cột chỉ từ bề rộng ≥ 900; hẹp hơn tự thành thẻ ba dòng. Hàng 44, tiêu đề dính, số canh phải, cột hành động luôn cuối.",
  dung: ["Kế toán, điều phối so sánh nhiều đơn cùng lúc trên máy tính.", "Danh sách có cột số cần cộng, so (tiền, số khách)."],
  khong: ["Không dùng bảng ở điện thoại — để bộ tự đổi sang thẻ ba dòng.", "Không quá 7 cột; thêm cột thì chuyển bớt sang trang chi tiết.", "Không đặt biểu mẫu thêm mới trước bảng (lỗi ở ảnh account)."],
  trangThai: ["Hàng: thường · rê (nền rê) · tiêu điểm trên nút trong hàng.", "Đang tải: hàng xương cùng cao 44.", "Rỗng: một ô gộp chứa Trạng thái rỗng.", "Tiêu đề 14/500 xám, viết thường đầu câu — không in hoa."],
  truyen: [["cot", "[{khoa, nhan, can?, gon?, rong?, hien?}]", "Cột; can=\"phai\" cho số, gon = không xuống dòng"], ["dong · khoa", "mảng · tên khoá", "Dữ liệu"], ["hanhDong", "hàm(dòng) → nút", "Cột cuối"], ["theBaDong", "hàm(dòng) → {dong1, sau1, dong2, dong3}", "Thẻ ở khổ hẹp"], ["dangTai · rong", "đúng/sai · nút", "Tải / rỗng"], ["caoToiDa", "px", "Cuộn trong, tiêu đề dính"]],
  kho768: "vẫn là thẻ ba dòng (dưới 900). Ở 1040 có thanh bên, vùng bảng còn ~728: tối đa 6 cột, cột chữ xuống dòng.", kho1440: "bảng giãn tới 1280, cột chữ rộng ra, cột số giữ.", token: "<code>--bang-hang-h</code> <code>--z-dinh</code> <code>--c-nen-phu</code>",
  cao390: 920, cao1040: 860, nen: "phu",
  Demo: ({ kho }) => (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32, gap: 20 } : undefined}>
      <Nhan>Dữ liệu · tiêu đề dính khi cuộn · hàng 2 đang rê</Nhan>
      <BangDuLieu nhan="Đơn hôm nay" cot={COT} dong={DON} theBaDong={baDong} hanhDong={hd} caoToiDa={kho === 1040 ? 280 : undefined} xemRe={1} />
      <Nhan>Đang tải</Nhan>
      <BangDuLieu cot={COT} dong={[]} dangTai soDongXuong={2} theBaDong={baDong} hanhDong={hd} />
      <Nhan>Rỗng</Nhan>
      <BangDuLieu cot={COT} dong={[]} theBaDong={baDong} rong={<TrangRong cau="Chưa có đơn nào hôm nay" hanhDong={{ nhan: "Tạo đơn", bieuTuong: "plus" }} />} />
    </div>
  ),
};

function TimLocXem({ kho }) {
  const [tu, datTu] = React.useState("Lan Anh");
  const [loc, datLoc] = React.useState(["tour"]);
  const [sap, datSap] = React.useState("moi");
  const doi = (id) => datLoc((c) => c.includes(id) ? c.filter((x) => x !== id) : [...c, id]);
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <CumTimLoc tuKhoa={tu} onTim={datTu} loc={[{ id: "tour", nhan: "Tour đảo", dem: 2 }, { id: "dd", nhan: "Đưa đón", dem: 1 }, { id: "lan", nhan: "Lặn biển", dem: 0 }]} locChon={loc} onLoc={doi}
        sapXep={sap} onSapXep={datSap} luaChonSapXep={[{ giaTri: "moi", nhan: "Mới nhất" }, { giaTri: "gio", nhan: "Giờ đón sớm nhất" }, { giaTri: "tien", nhan: "Còn phải thu nhiều nhất" }]}
        ketQua="3 đơn khớp" onXoaLoc={() => datLoc([])} />
      <div style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)", overflow: "hidden" }}>
        {DON.slice(0, 2).map((d) => <DongDanhSach key={d.id} bamDuoc tieuDe={d.khach} phu={<React.Fragment><span className="ib-so">{d.id}</span> · {d.dv}</React.Fragment>} sau={<HuyHieu trangThai={d.tt} />} />)}
      </div>
      <PhanTrang daHien={2} tong={3} />
      <Nhan>Đang tìm · không có kết quả</Nhan>
      <CumTimLoc tuKhoa="0905 000" dangTim ketQua="Đang tìm…" />
      <TrangRong bieuTuong="search" cau="Không có đơn khớp “0905 000”" phu="Thử tìm bằng mã đơn hoặc bỏ bớt bộ lọc." hanhDong={{ nhan: "Xoá bộ lọc", cap: "phu" }} />
    </div>
  );
}
D["11"] = {
  ten: "Cụm Tìm + Lọc + Sắp xếp + Tải thêm", thanhPhan: "CumTimLoc + PhanTrang", mo: "Một cụm đầu danh sách: ô tìm có nhãn, hàng chip lọc, sắp xếp dạng Lối nhỏ, dòng kết quả. Cuối danh sách là Tải thêm.",
  dung: ["Mọi danh sách dài hơn một màn: đơn, khách, chuyến, xe.", "Câu gợi ý cố định: \"Tìm theo tên, số điện thoại, mã đơn\"."],
  khong: ["Không đặt ô tìm riêng ở thanh trên.", "Không giấu bộ lọc trong bảng trượt khi ≤ 6 chip; > 6 thì nút \"Lọc (n)\" mở Bảng trượt."],
  trangThai: ["Đang tìm: vòng quay trong ô, dòng kết quả \"Đang tìm…\".", "Có chữ: nút xoá trong ô.", "Không khớp: Trạng thái rỗng + \"Xoá bộ lọc\".", "Tìm tự chạy sau 300 ms ngừng gõ."],
  truyen: [["tuKhoa · onTim", "chuỗi · hàm", "Ô tìm"], ["loc · locChon · onLoc", "[{id,nhan,dem}] · mảng id · hàm", "Chip lọc"], ["sapXep · luaChonSapXep · onSapXep", "", "Sắp xếp"], ["ketQua · onXoaLoc", "chữ · hàm", "Dòng kết quả"], ["dangTim", "đúng/sai", "Vòng quay"]],
  kho768: "ô tìm và sắp xếp cùng hàng, chip xuống dòng.", kho1440: "như 1040; ô tìm tối đa 420.", token: "<code>--h-dieu-khien</code> <code>--chip-h</code>",
  cao390: 1080, cao1040: 900, nen: "phu",
  Demo: TimLocXem,
};

D["22"] = {
  ten: "Khung xương", thanhPhan: "KhungXuong", mo: "Ba hình — dòng, số, viên — giữ chỗ đúng kích thước thật để trang không nhảy khi dữ liệu về. Nhấp nháy chậm 1,2 s; tắt khi giảm chuyển động.",
  dung: ["Lần tải đầu của danh sách, thẻ, ô số liệu, bảng.", "<b>dòng</b> cho chữ · <b>số</b> cho số lớn · <b>viên</b> cho huy hiệu, chip."],
  khong: ["Không dùng khi tải dưới 300 ms — hiện thẳng dữ liệu.", "Không dùng cho hành động của người dùng — dùng vòng quay trong nút.", "Không quét ánh sáng chạy ngang (nặng, rối mắt)."],
  trangThai: ["Một trạng thái: đang tải (<code>role=status</code>, nhãn \"Đang tải\").", "Giảm chuyển động: đứng yên."],
  truyen: [["kieu", "dong | so | vien", "Hình"], ["soDong", "số", "Số dòng (kiểu dong)"], ["rong", "độ dài CSS", "Bề rộng dòng đầu / khối"], ["nhan", "chuỗi", "Nhãn trình đọc"]],
  kho768: "giữ nguyên.", kho1440: "giữ nguyên.", token: "<code>--cd-xuong</code> <code>--c-nen-phu</code>",
  cao390: 560, cao1040: 380, nen: "phu",
  Demo: ({ kho }) => {
    const oSo = (k) => <div key={k} style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)", padding: 16 }}><KhungXuong kieu="so" /></div>;
    const ds = <div style={{ background: "var(--c-nen)", borderRadius: 12, boxShadow: "var(--sh-the)", overflow: "hidden" }}>{[1, 2, 3].map((i) => <div key={i} className="ib-dong" style={{ alignItems: "flex-start" }}><span style={{ flex: 1 }}><KhungXuong kieu="dong" soDong={2} /></span><KhungXuong kieu="vien" rong={92} /></div>)}</div>;
    return (
      <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
        <Nhan>Số · ô số liệu</Nhan>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${kho === 390 ? 2 : 4}, minmax(0,1fr))`, gap: 12 }}>{[1, 2, 3, 4].slice(0, kho === 390 ? 2 : 4).map(oSo)}</div>
        <Nhan>Dòng + viên · danh sách</Nhan>
        {ds}
      </div>
    );
  },
};

function PhanTrangXem({ kho }) {
  const [trang, datTrang] = React.useState(1);
  return (
    <div className="tr-dem" style={kho === 1040 ? { padding: 32 } : undefined}>
      <Nhan>Tải thêm · điện thoại và danh sách thẻ</Nhan>
      <PhanTrang daHien={20} tong={86} />
      <PhanTrang daHien={40} tong={86} dangTai />
      <PhanTrang daHien={86} tong={86} />
      <Nhan>Số trang · bảng máy tính</Nhan>
      <PhanTrang kieu="so-trang" tong={86} trang={trang} onTrang={datTrang} />
    </div>
  );
}
D["24"] = {
  ten: "Phân trang / tải thêm", thanhPhan: "PhanTrang", mo: "Điện thoại và danh sách thẻ: nút Phụ \"Tải thêm\" + dòng \"Đang hiện 20 / 86 đơn\". Bảng máy tính: số trang, 20 hàng một trang.",
  dung: ["<b>tai-them</b>: mọi danh sách cuộn trên điện thoại.", "<b>so-trang</b>: bảng kế toán cần quay lại đúng trang để đối chiếu."],
  khong: ["Không cuộn vô tận tự tải — người dùng mất chỗ đang xem.", "Không dùng cả hai kiểu trên cùng một danh sách."],
  trangThai: ["Tải thêm: thường · đang tải (vòng quay, \"Đang tải…\") · đã hết (\"Đã hiện hết\").", "Số trang: trang đang mở có nền + gạch dưới; Trước/Sau tắt ở hai đầu."],
  truyen: [["kieu", "tai-them | so-trang", ""], ["daHien · tong · donVi", "số · số · chữ", "Dòng đếm"], ["dangTai · onTaiThem", "đúng/sai · hàm", "Tải thêm"], ["trang · coTrang · onTrang", "số · số · hàm", "Số trang"]],
  kho768: "tải thêm, nút tối đa 360.", kho1440: "số trang dưới bảng.", token: "<code>--h-cham</code> <code>--c-chinh-nhat</code>",
  cao390: 540, cao1040: 540,
  Demo: PhanTrangXem,
};
})();
