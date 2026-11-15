// LỚP XEM TRƯỚC bước 2: gán mức bề rộng theo khuôn trang (bản thật sẽ viết thẳng `data-rong` vào <body> của từng tệp HTML).
(() => {
  const HEP = ["/dieu-chinh-cong-no", "/chup-bu", "/ban", "/xe-sua", "/phan-dinh", "/help", "/gui-thong-bao", "/tro-ly-cai-dat", "/sessions", "/quet-ve"];
  const VUA = ["/order-form", "/order", "/chuyen", "/chuyen-sua", "/xe-chi-tiet", "/cuoc-chuyen", "/account", "/staff", "/locations", "/loai-giay-to-nguoi", "/loai-giay-to-xe", "/chinh-sach-dieu-phoi",
    "/dieu-kien-xuat-ben", "/ly-do-dieu-phoi", "/catalog", "/giao-dien", "/huong-dan", "/thiet-lap", "/luat-ban", "/dac-diem-dich-vu", "/cap-dai-ly", "/han-muc-tra-sau", "/nguoi-ban", "/hoa-hong-gioi-han", "/ve-cai-dat", "/bang-gia-xe"];
  const p = location.pathname.replace(/\/+$/, "") || "/";
  if (HEP.includes(p)) document.body.dataset.rong = "hep";
  else if (VUA.includes(p)) document.body.dataset.rong = "vua";
  if (window.__XEM_TRUOC_TRAI) document.body.classList.add("xem-truoc-trai");
})();
