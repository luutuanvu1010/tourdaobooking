// Bảng kê chi phí xe thuê (/bang-ke-xe — ADR-0057 T2 C9; bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html màn 1c; kế hoạch Đợt 4 G4).
// - Ô transport.cost.view (Kế toán, Quản trị, Toàn quyền). Máy chủ tính MỌI số (tổng cộng, tổng nhóm, tổng điều chỉnh, số chuyến / nhà xe / chuyến chưa có giá) —
//   trang KHÔNG cộng, không đếm (bản vẽ tự cộng ở trình duyệt: không làm theo chỗ đó).
// - Câu 4.1: chưa có nút "Tải bảng kê". Câu 4.2: cột ĐIỀU CHỈNH là SỐ TIỀN máy chủ tính (`tongDieuChinh`).
// - Ô "Nhà xe" (chốt bề mặt): danh sách = nhà xe của lần tải KHÔNG lọc gần nhất cùng khoảng ngày (BangKeResponse không kèm danh sách nhà xe; gọi /bang-gia thì
//   buộc thêm ô transport.rate.view). Đổi khoảng ngày → tải lại không lọc để dựng lại danh sách.
import type { BangKeDongDto, BangKeNhomDto, BangKeResponse, NhomBangKeDto } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { NHAN_NGUON_GIA, NHAN_NHOM_BANG_KE, dongDieuChinhBangKe, tomTatBangKe } from "../src/shared/tien-xe-hien-thi";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { dayMonth, vnd } from "./format";
import { datCrumb } from "./giay-to-ui";
import { initShell, showError } from "./shell";
import { cauLoi, chipTx, dangTai, o, trong } from "./tien-xe-ui";

const errorEl = byId("error");
const trangEl = byId("bk-trang");

const staff = await initShell();
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

const ketQuaEl = h("div", { class: "bk-ket-qua" });

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

const locEl = h("section", { class: "vc-card tx-loc bk-loc", "aria-label": "Lọc bảng kê" });
function veLoc(): void {
  const tu = h("input", { class: "vc-input", type: "date", value: loc.tu });
  const den = h("input", { class: "vc-input", type: "date", value: loc.den });
  const nx = h("select", { class: "vc-input" }, h("option", { value: "" }, "Tất cả nhà xe"), ...dsNhaXe.map((n) => h("option", { value: n.partyId }, n.ten)));
  nx.value = loc.nhaXe;
  const tt = h("select", { class: "vc-input" }, h("option", { value: "" }, "Tất cả trạng thái"), ...(Object.entries(NHAN_NHOM_BANG_KE) as [NhomBangKeDto, { nhan: string }][]).map(([k, v]) => h("option", { value: k }, v.nhan)));
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
  replaceChildren(
    locEl,
    o("bk-tu", "Từ ngày", tu),
    o("bk-den", "Đến ngày", den),
    o("bk-nha-xe", "Nhà xe", nx),
    o("bk-trang-thai", "Trạng thái", tt),
    h("p", { class: "tx-loc-ghi-chu" }, "Lọc theo ngày chạy, tối đa khoảng 3 tháng. Trạng thái: Đã phát sinh (đã chạy xong) · Chưa chạy · Đang chạy · Đã huỷ · Chưa có giá."),
  );
}

const soTien = (d: BangKeDongDto) =>
  d.nhomTrangThai === "THIEU_GIA" ? h("span", { class: "bk-chua-gia" }, "Chưa có giá") : h("span", { class: "bk-tien" }, vnd(d.tong));
const chipTrangThai = (d: BangKeDongDto) => {
  const t = NHAN_NHOM_BANG_KE[d.nhomTrangThai];
  return chipTx(t.nhan, t.tone);
};
const dieuChinh = (d: BangKeDongDto) => {
  const dc = dongDieuChinhBangKe(d);
  return h("span", { class: "bk-dc" }, h("span", { class: `bk-dc-so${dc.am ? " is-am" : ""}` }, dc.so), dc.phu ? h("span", { class: "bk-dc-phu" }, dc.phu) : null);
};
const lopDong = (d: BangKeDongDto, goc: string) => `${goc}${d.nhomTrangThai === "THIEU_GIA" ? " is-thieu" : ""}`;
const href = (d: BangKeDongDto) => `/chuyen?id=${encodeURIComponent(d.tripId)}`;

function veNhom(g: BangKeNhomDto): HTMLElement {
  return h(
    "section",
    { class: "vc-card bk-nhom", "data-nha-xe": g.nhaXe.partyId, "aria-label": g.nhaXe.ten },
    h(
      "div",
      { class: "bk-nhom-dau" },
      h("div", { class: "vc-grow" }, h("h2", { class: "bk-nhom-ten" }, g.nhaXe.ten), h("div", { class: "bk-nhom-so" }, `${g.soChuyen} chuyến`)),
      h("div", { class: "bk-nhom-tong" }, h("span", { class: "bk-nhan" }, "TỔNG NHÓM"), h("span", { class: "bk-tien bk-tong-nhom", "data-tong": String(g.tongNhom) }, vnd(g.tongNhom))),
    ),
    h(
      "div",
      { class: "bk-bang" },
      h("div", { class: "bk-hang tx-hang-dau" }, ...["MÃ CHUYẾN · NGÀY CHẠY", "BIỂN SỐ · TUYẾN", "TRẠNG THÁI · NGUỒN GIÁ", "ĐIỀU CHỈNH", "SỐ TIỀN"].map((t) => h("span", null, t))),
      ...g.dong.map((d) =>
        h(
          "a",
          { class: lopDong(d, "bk-hang"), href: href(d), "data-chuyen": d.tripId },
          h("span", { class: "bk-cot" }, h("strong", { class: "bk-ma" }, d.ma), h("span", { class: "tx-phu" }, dayMonth(d.ngayChay))),
          h("span", { class: "bk-cot" }, h("strong", null, d.bienSo), h("span", { class: "tx-phu" }, d.tuyen?.ten ?? "Chưa chọn tuyến")),
          h("span", { class: "bk-cot" }, chipTrangThai(d), h("span", { class: "tx-phu" }, NHAN_NGUON_GIA[d.nguonGia ?? "NULL"].nhan)),
          dieuChinh(d),
          h("span", { class: "bk-so" }, soTien(d)),
        )),
    ),
    h(
      "div",
      { class: "bk-the-ds" },
      ...g.dong.map((d) =>
        h(
          "a",
          { class: lopDong(d, "bk-the"), href: href(d), "data-chuyen": d.tripId },
          h("span", { class: "bk-the-dau" }, h("strong", { class: "bk-ma vc-grow" }, d.ma), soTien(d)),
          h("span", { class: "tx-phu" }, `${dayMonth(d.ngayChay)} · ${d.bienSo} · ${d.tuyen?.ten ?? "Chưa chọn tuyến"}`),
          h("span", { class: "bk-the-chip" }, chipTrangThai(d), h("span", { class: "tx-phu" }, NHAN_NGUON_GIA[d.nguonGia ?? "NULL"].nhan)),
          d.soDieuChinh > 0 ? h("span", { class: "bk-the-dc" }, "Điều chỉnh ", dieuChinh(d)) : null,
        )),
    ),
  );
}

function veKetQua(r: BangKeResponse): void {
  if (r.nhom.length === 0) {
    replaceChildren(ketQuaEl, h("div", { class: "vc-card" }, trong("Không có chuyến xe thuê nào trong khoảng này.", "")));
    return;
  }
  replaceChildren(
    ketQuaEl,
    h("div", { class: "bk-tom-tat" }, tomTatBangKe(r)),
    ...r.nhom.map(veNhom),
    h(
      "section",
      { class: "bk-tong-cong", "aria-label": "Tổng cộng" },
      h("div", { class: "vc-grow" }, h("div", { class: "bk-nhan" }, "TỔNG CỘNG"), h("div", { class: "bk-tong-ghi-chu" }, "Chuyến chưa có giá chưa được tính.")),
      h("div", { class: "bk-tong-so", "data-tong": String(r.tongCong) }, vnd(r.tongCong)),
    ),
  );
}

if (!can(staff, "transport.cost.view")) showError(errorEl, "Tài khoản này không xem được bảng kê chi phí xe.");
else {
  veLoc();
  replaceChildren(trangEl, locEl, ketQuaEl);
  await tai();
}
