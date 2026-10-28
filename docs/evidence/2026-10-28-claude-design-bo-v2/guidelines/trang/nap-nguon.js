// Dự phòng khi _ds_bundle.js chưa được dựng: nạp thẳng mã nguồn thành phần qua Babel.
// Chỉ dùng cho trang tài liệu của bộ này; dự án dùng bộ luôn nạp _ds_bundle.js.
(function () {
  var NS = "IslandBookingSystemDesignSystemV2_449f87";
  if (window[NS] && window[NS].Nut) return;
  var goc = window.IB_GOC || "../../..";
  var TEP = [
    "components/hien-thi/bieu-tuong/BieuTuong.jsx", "components/hanh-dong/nut/Nut.jsx", "components/hanh-dong/tab/Tab.jsx", "components/hanh-dong/chip/Chip.jsx",
    "components/nhap/o-nhap/ONhap.jsx", "components/nhap/o-chon/OTich.jsx", "components/nhap/o-chon/OChonMot.jsx", "components/nhap/o-chon/CongTac.jsx", "components/nhap/bo-dem/BoDem.jsx",
    "components/hien-thi/huy-hieu/HuyHieu.jsx", "components/hien-thi/the/The.jsx", "components/hien-thi/dong-danh-sach/DongDanhSach.jsx", "components/hien-thi/khung-xuong/KhungXuong.jsx", "components/hien-thi/bang-du-lieu/BangDuLieu.jsx",
    "components/dieu-huong/cum-tim-loc/CumTimLoc.jsx", "components/dieu-huong/phan-trang/PhanTrang.jsx", "components/dieu-huong/dau-trang/DauTrang.jsx", "components/dieu-huong/thanh-dinh-day/ThanhDinhDay.jsx",
    "components/dieu-huong/thanh-tren/ThanhTren.jsx", "components/dieu-huong/thanh-tab-duoi/ThanhTabDuoi.jsx", "components/dieu-huong/thanh-ben/ThanhBen.jsx",
    "components/phan-hoi/bang-truot/BangTruot.jsx", "components/phan-hoi/hop-xac-nhan/HopXacNhan.jsx", "components/phan-hoi/dai-thong-bao/DaiThongBao.jsx", "components/phan-hoi/bao-xong/BaoXong.jsx",
    "components/phan-hoi/dai-tren-trang/DaiTrenTrang.jsx", "components/phan-hoi/trang-rong/TrangRong.jsx", "components/trang/trang-mat-mang/TrangMatMang.jsx", "components/trang/trang-loi/TrangLoi.jsx",
  ];
  var kho = {}, ns = {};
  function tai(p) { var x = new XMLHttpRequest(); x.open("GET", goc + "/" + p, false); x.send(); return x.responseText; }
  function noi(goc1, rel) { var a = goc1.split("/"); a.pop(); rel.split("/").forEach(function (s) { if (s === "..") a.pop(); else if (s !== ".") a.push(s); }); return a.join("/"); }
  function can(p) {
    if (kho[p]) return kho[p].exports;
    var m = { exports: {} }; kho[p] = m;
    var ma = Babel.transform(tai(p), { presets: ["react"], plugins: ["transform-modules-commonjs"], filename: p }).code;
    new Function("require", "module", "exports", ma)(function (r) { return r === "react" ? window.React : can(noi(p, r)); }, m, m.exports);
    return m.exports;
  }
  TEP.forEach(function (p) { var e = can(p); Object.keys(e).forEach(function (k) { if (k !== "__esModule") ns[k] = e[k]; }); });
  window[NS] = ns;
})();
