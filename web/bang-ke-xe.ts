// Bảng kê chi phí xe thuê (/bang-ke-xe — ADR-0057 T2 C9; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1c; kế hoạch Đợt 4 G4).
// - Ô transport.cost.view (Kế toán, Quản trị, Toàn quyền). Máy chủ tính MỌI số (tổng cộng, tổng nhóm, tổng điều chỉnh, số chuyến / nhà xe / chuyến chưa có giá) —
//   trang KHÔNG cộng, không đếm (bản vẽ tự cộng ở trình duyệt: không làm theo chỗ đó).
// - Bố cục: khuôn Danh sách của khung gốc (ADR-0222) — thanh lọc, mỗi nhà xe một khối bảng (bảng từ 800, danh sách dòng hẹp hơn), tổng nhóm là cặp
//   nhãn và giá trị kiểu số ở cuối khối; dòng «chưa có giá» báo bằng huy hiệu và chữ, không tô nền.
// - Câu 4.1: chưa có nút "Tải bảng kê". Câu 4.2: cột ĐIỀU CHỈNH là SỐ TIỀN máy chủ tính (`tongDieuChinh`).
// - Ô "Nhà xe" (chốt bề mặt): danh sách = nhà xe của lần tải KHÔNG lọc gần nhất cùng khoảng ngày (BangKeResponse không kèm danh sách nhà xe; gọi /bang-gia thì
//   buộc thêm ô transport.rate.view). Đổi khoảng ngày → tải lại không lọc để dựng lại danh sách.
import type { BangKeDongDto, BangKeNhomDto, BangKeResponse, NhomBangKeDto } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { NHAN_NHOM_BANG_KE, nhanNguonGia, dongDieuChinhBangKe, tomTatBangKe } from "../src/shared/tien-xe-hien-thi";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { ngayNganHomNay, vnd } from "./format";
import { datCrumb } from "./giay-to-ui";
import { ganDaiTrangAnhEm } from "./dai-trang-anh-em";
import { initShell, showError } from "./shell";
import { cap, khoi, truong } from "./khung";
import { cauLoi, chipTx, dangTai } from "./tien-xe-ui";

const errorEl = byId("error");
const trangEl = byId("bk-trang");

const staff = await initShell();
ganDaiTrangAnhEm("/bang-ke-xe", staff);
datCrumb("Vận chuyển", "Bảng kê chi phí xe");

const homNay = vnToday(new Date());
const q = new URLSearchParams(location.search);
const loc = {
  tu: isISODate(q.get("tu") ?? "") ? q.get("tu")! : `${homNay.slice(0, 8)}01`,
  den: isISODate(q.get("den") ?? "") ? q.get("den")! : homNay,
  nhaXe: q.get("nha-xe") ?? "",
  trangThai: (Object.keys(NHAN_NHOM_BANG_KE) as NhomBangKeDto[]).find((k) => k === q.get("trang-thai")) ?? "",
};
let dsNhaXe: { partyId: string; ten: string }[] = [];
let khoangDsNhaXe = "";

const url = (nhaXe: string, trangThai: string) =>
  `/api/van-chuyen/chi-phi?tu=${loc.tu}&den=${loc.den}${nhaXe ? `&nha-xe=${encodeURIComponent(nhaXe)}` : ""}${trangThai ? `&trang-thai=${trangThai}` : ""}`;

/** Vùng kết quả: phần tử bọc không tham gia bố cục (.gop) — khối của nó xếp như con của main. */
const ketQuaEl = h("div", { class: "gop bk-ket-qua" });

async function tai(): Promise<void> {
  replaceChildren(ketQuaEl, dangTai());
  history.replaceState(null, "", `${location.pathname}?${new URLSearchParams({ tu: loc.tu, den: loc.den, ...(loc.nhaXe ? { "nha-xe": loc.nhaXe } : {}), ...(loc.trangThai ? { "trang-thai": loc.trangThai } : {}) })}`);
  try {
    // Danh sách "Nhà xe" theo khoảng ngày: tải không lọc khi khoảng đổi (hoặc lần đầu).
    const khoang = `${loc.tu}:${loc.den}`;
    let khongLoc: BangKeResponse | null = null;
    if (khoang !== khoangDsNhaXe) {
      khongLoc = await api<BangKeResponse>(url("", ""));
      dsNhaXe = khongLoc.nhom.map((g) => g.nhaXe);
      khoangDsNhaXe = khoang;
      if (loc.nhaXe && !dsNhaXe.some((n) => n.partyId === loc.nhaXe)) loc.nhaXe = "";
      veLoc();
    }
    const r = khongLoc && !loc.nhaXe && !loc.trangThai ? khongLoc : await api<BangKeResponse>(url(loc.nhaXe, loc.trangThai));
    veKetQua(r);
  } catch (e) {
    replaceChildren(ketQuaEl, h("div", { class: "banner banner-danger", role: "alert" }, h("div", { class: "banner-title" }, cauLoi(e))));
  }
}

/** Thanh lọc (khuôn Danh sách): bốn ô có nhãn; câu giải thích đứng ngay dưới. */
const locEl = h("div", { id: "bk-loc", class: "thanh-loc", role: "group", "aria-label": "Lọc bảng kê" });
const ghiChuLocEl = h("p", { class: "doan-dan" }, "Lọc theo ngày chạy, tối đa khoảng 3 tháng. Trạng thái: Đã phát sinh (đã chạy xong) · Chưa chạy · Đang chạy · Đã huỷ · Chưa có giá.");
function veLoc(): void {
  const tu = h("input", { id: "bk-tu", class: "o", type: "date", value: loc.tu });
  const den = h("input", { id: "bk-den", class: "o", type: "date", value: loc.den });
  const nx = h("select", { id: "bk-nha-xe", class: "o" }, h("option", { value: "" }, "Tất cả nhà xe"), ...dsNhaXe.map((n) => h("option", { value: n.partyId }, n.ten)));
  nx.value = loc.nhaXe;
  const tt = h("select", { id: "bk-trang-thai", class: "o" }, h("option", { value: "" }, "Tất cả trạng thái"), ...(Object.entries(NHAN_NHOM_BANG_KE) as [NhomBangKeDto, { nhan: string }][]).map(([k, v]) => h("option", { value: k }, v.nhan)));
  tt.value = loc.trangThai;
  const doiNgay = () => {
    if (!isISODate(tu.value) || !isISODate(den.value)) return;
    loc.tu = tu.value;
    loc.den = den.value;
    void tai();
  };
  tu.addEventListener("change", doiNgay);
  den.addEventListener("change", doiNgay);
  nx.addEventListener("change", () => {
    loc.nhaXe = nx.value;
    void tai();
  });
  tt.addEventListener("change", () => {
    loc.trangThai = tt.value as NhomBangKeDto | "";
    void tai();
  });
  replaceChildren(locEl, truong("Từ ngày", tu), truong("Đến ngày", den), truong("Nhà xe", nx), truong("Trạng thái", tt));
}

/** Số tiền của dòng: chuyến chưa có giá ghi chữ (huy hiệu «Chưa có giá» đã ở cột trạng thái), không tô nền. */
const soTien = (d: BangKeDongDto) => (d.nhomTrangThai === "THIEU_GIA" ? h("span", { class: "o-phu" }, "Chưa có giá") : vnd(d.tong));
const chipTrangThai = (d: BangKeDongDto) => {
  const t = NHAN_NHOM_BANG_KE[d.nhomTrangThai];
  return chipTx(t.nhan, t.tone);
};
/** Điều chỉnh: số tiền máy chủ tính (`tongDieuChinh`); số âm có dấu trừ; dòng phụ khi có điều chỉnh bị huỷ do đổi chuyến. */
const dieuChinh = (d: BangKeDongDto): (HTMLElement | string)[] => {
  const dc = dongDieuChinhBangKe(d);
  return [dc.so, dc.phu ? h("span", { class: "o-phu" }, dc.phu) : ""];
};
/** Nguồn giá ở dòng bảng kê: chữ phụ (bảng kê báo thiếu giá bằng huy hiệu nhóm "Chưa có giá", không tô chữ này); `data-tone` theo cùng luật L2 với khối Chi phí chuyến. */
const nguonGiaEl = (d: BangKeDongDto) => {
  const n = nhanNguonGia(d.nguonGia, d.trangThai === "CANCELLED");
  return h("span", { class: "o-phu", "data-tone": n.tone }, n.nhan);
};
const href = (d: BangKeDongDto) => `/chuyen?id=${encodeURIComponent(d.tripId)}`;

function veNhom(g: BangKeNhomDto): HTMLElement {
  const idTen = `bk-nhom-${g.nhaXe.partyId}`;
  return khoi(
    { tieuDe: g.nhaXe.ten, idTieuDe: idTen, moTa: `${g.soChuyen} chuyến`, kieu: "bang", thuoc: { class: "bk-nhom", "data-nha-xe": g.nhaXe.partyId } },
    h(
      "table",
      { class: "bang" },
      h("thead", null, h("tr", null, h("th", null, "Mã chuyến · ngày chạy"), h("th", null, "Biển số · tuyến"), h("th", null, "Trạng thái · nguồn giá"), h("th", { "data-so": "" }, "Điều chỉnh"), h("th", { "data-so": "" }, "Số tiền"))),
      h(
        "tbody",
        null,
        ...g.dong.map((d) =>
          h(
            "tr",
            { "data-chuyen": d.tripId },
            h("td", null, h("a", { href: href(d) }, h("strong", null, d.ma)), h("span", { class: "o-phu" }, ngayNganHomNay(d.ngayChay))),
            h("td", null, d.bienSo, h("span", { class: "o-phu" }, d.tuyen?.ten ?? "Chưa chọn tuyến")),
            h("td", null, chipTrangThai(d), nguonGiaEl(d)),
            h("td", { "data-so": "" }, ...dieuChinh(d)),
            h("td", { "data-so": "" }, soTien(d)),
          )),
      ),
    ),
    h(
      "div",
      { class: "ds-dong", "data-thay-bang": "" },
      ...g.dong.map((d) =>
        h(
          "a",
          { class: "dong", href: href(d), "data-chuyen": d.tripId },
          h(
            "span",
            { class: "dong-chu" },
            h("strong", null, d.ma),
            h("span", { class: "o-phu" }, `${ngayNganHomNay(d.ngayChay)} · ${d.bienSo} · ${d.tuyen?.ten ?? "Chưa chọn tuyến"}`),
            h("span", { class: "hang" }, chipTrangThai(d), nguonGiaEl(d)),
            d.soDieuChinh > 0 ? h("span", { class: "o-phu" }, "Điều chỉnh ", ...dieuChinh(d)) : null,
          ),
          h("span", null, soTien(d)),
        )),
    ),
    // Tổng nhóm (máy chủ tính): cặp nhãn và giá trị kiểu số, đứng cuối khối.
    h("div", { class: "ds-dong" }, h("div", { class: "dong" }, h("div", { class: "dong-chu" }, cap("Tổng nhóm", h("span", { "data-tong": String(g.tongNhom) }, vnd(g.tongNhom)), { kieu: "so" })))),
  );
}

function veKetQua(r: BangKeResponse): void {
  if (r.nhom.length === 0) {
    replaceChildren(ketQuaEl, khoi({ kieu: "bang", thuoc: { "aria-label": "Bảng kê" } }, h("p", { class: "rong" }, "Không có chuyến xe thuê nào trong khoảng này.")));
    return;
  }
  replaceChildren(
    ketQuaEl,
    h("p", { class: "doan-dan" }, tomTatBangKe(r)),
    ...r.nhom.map(veNhom),
    khoi(
      { thuoc: { "aria-label": "Tổng cộng" } },
      cap("Tổng cộng", h("span", { "data-tong": String(r.tongCong) }, vnd(r.tongCong)), { kieu: "so", manh: true }),
      h("p", { class: "khoi-mo-ta" }, "Chuyến chưa có giá chưa được tính."),
    ),
  );
}

if (!can(staff, "transport.cost.view")) showError(errorEl, "Tài khoản này không xem được bảng kê chi phí xe.");
else {
  veLoc();
  replaceChildren(trangEl, locEl, ghiChuLocEl, ketQuaEl);
  await tai();
}
