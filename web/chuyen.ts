// Chi tiết chuyến (/chuyen?id=<chuyến>) — ADR-0049 V2 (route 3, 4, 8, 40), ADR-0050 thành phần B, C, D, E; bản vẽ docs/design/van-chuyen-dieu-phoi/project/02 Chi tiet
// chuyen.dc.html; bản đối chiếu 2.7, 2.12, H10, H11, H14, H17, R-P16.
// - Đầu: mã, trạng thái (bị giữ đỏ), ngày giờ; nút theo cờ quyền: "Sửa chuyến", "Huỷ chuyến" (chỉ chuyến lên kế hoạch, ô trip.dispatch). Dòng khoá theo `khoaMoc`.
// - "Cập nhật điểm theo đơn" (route 40, lý do giữ "Nơi đón / trả đã đổi"): không cần phá lệ; kết quả: đã cập nhật N / không có gì cần cập nhật / chuyến vừa bị sửa.
// - Vòng 5e (R-P29, chủ lần 16): "Cập nhật khách theo đơn" (route `cap-nhat-khach`, lý do giữ KHACH_DA_DOI) — cùng khuôn, không hộp xác nhận, không phá lệ.
// - Bảng điểm dừng (cờ `lechDon` → "Lệch đơn"), điều kiện xuất bến (danh mục cố định từ lý do giữ), nhật ký chuyến (ai bấm hoặc "máy"; hai giờ khi văn phòng khai).
// - CHỜ A15 (chưa có route trên nhánh): "Xuất bến thay tài xế", nút tiến độ bấm thay, "Kết thúc gián đoạn", "Mở màn Xuất bến ›" — chưa dựng (không để nút chết).
// - Đợt 5 (ADR-0052 D5; bản vẽ V11 "Điều phối xe đang chạy"): chuyến ĐANG CHẠY có "Khách đang chờ" (link "Báo huỷ", ô trip.dispatch) và "Việc của văn
//   phòng" (ô trip.dispatch): "Thêm điểm đón / thêm khách" (route them-diem; chặng không đặt gấp: xe đang chạy luôn dưới mốc ⇒ người có ô trip.urgent_adjust
//   — Bán hàng, Quản trị, Toàn quyền — qua hộp "Điều chỉnh khẩn cấp", ADR-0104 Đ1) và
//   "Cập nhật điểm theo đơn" (route 40 khi xe chạy — câu "Đã cập nhật N · bỏ qua M …"). Kế toán chỉ xem.
// - Đợt 5 A-1b (D5c cứu hộ đơn giản, lời chủ 5.2b): nút "Cứu hộ" ở "Việc của văn phòng" (ô trip.progress VÀ trip.dispatch) mở hộp "Kết thúc gián đoạn" bấm
//   thay có sẵn; chuyến đã Kết thúc gián đoạn có khối "Cứu hộ" (ô trip.dispatch; GET …/cuu-ho): chặng cần chuyển, xe cùng ngày của tài xế công ty (bấm để mở
//   chuyến đó rồi "Thêm điểm" / "Xếp"), "Tạo chuyến cứu hộ" (xe nhà xe). Form giá cứu hộ chưa dựng (phụ thuộc Đợt 4 — nợ).
// - Gói A1 (ADR-0096 Đ1, ADR-0097): chuyến KẾ HOẠCH có nút ↑ / ↓ ở điểm (ô trip.dispatch — PUT /chuyen/:id thân `diem`); ↑ / ↓ (kế hoạch và đang chạy) khoá
//   khi làm khách chờ lên bị đảo mới (`doiThuTuDuoc` — cùng luật 409 `thu_tu_dao`). Chuyến ĐANG CHẠY (ô trip.progress): link "Điều chỉnh…" ở dòng khách đã có
//   kết quả (bảng `dichDieuChinh`, lý do nhóm Điều chỉnh) và nút "Thu hồi xuất bến" khi chưa có tiến độ nào sau xuất bến. Máy chủ vẫn là cổng.
// - Gói A5 (ADR-0111; bản vẽ V10, CH): khối "Đề nghị chuyển khách" (ô trip.view — chỉ đọc) liệt kê đề nghị có chuyến này là xe nhờ hoặc xe nhận; đề nghị
//   đang chờ duyệt có link sang màn "Đề nghị chuyển khách" cho người có ô trip.override. Xe đang chạy: nút "Gửi đề nghị cứu hộ" ở "Việc của văn phòng" (ô
//   trip.progress — văn phòng gửi THAY tài xế, chỉ cứu hộ cả xe, có nơi gặp; route GET …/xe-nhan rồi POST …/cuu-ho).
import { NHAN_KHAN_CAP, NUT_VUOT, cauKhoaMoc, thanPhaLe, chuyenXepDuoc, dieuKienXuatBen, dongBanChup, dongGoiBao, dongNhatKy, gioHien, kieuChuyen, nhanDiem, nhomKhach, type NhomKhach } from "../src/shared/dieu-phoi-man";
import { NHAN_TU_CHOI_GOI_BAO, type MaTuChoiGoiBao } from "../src/shared/goi-bao";
import { ApiError } from "./api";
import type { CapNhatDiemResponse, CapNhatKhachResponse, ChuyenChiTietResponse, CuuHoResponse, DeNghiLenhResponse, DeNghiNgayResponse, DiemChuyenDto, HuongDanVienListResponse, LichChungResponse, XeNhanResponse } from "../src/shared/contracts";
import { NUT_CAP_NHAT_KHACH, giuCapNhatKhach } from "../src/shared/ly-do-giu";
import { can } from "../src/shared/permissions";
import { api } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, docLoiLenh, moHuyChuyen, moPhaLe, nhomChon, taoLenh, thuNgay } from "./dieu-phoi-ui";
import { moBangTruot } from "./bang-truot";
import { taoKhoiChiPhi } from "./chi-phi-chuyen";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";
import { taoBoLamMoi } from "./lam-moi-logic";
import type { SuKienChuyen } from "../src/shared/bang-tin";
import { cauLoiTienDo, dongMoc, moKhaiGio, veDiemChay, type LenhDiem } from "./tien-do-ui";
import { CAU_THU_TU_DAO, doiThuTuDuoc, giuTenKhach, ketThucDuoc, viecNguoiDiKem, type BuocDiem, type KhachDiem } from "../src/shared/tien-do-man";
import { coTienDoSauXuatBen, dichDieuChinh, nhanDichDieuChinh, nhanTrangThaiDieuChinh } from "../src/shared/dieu-chinh-suat";
import type { GioVnDto, GoiBaoChangDto } from "../src/shared/contracts";
import { ngayNgan, vnToday } from "../src/shared/vn-date";
import { canhBaoNgayChay } from "../src/shared/xac-nhan-xuat-ben";
import { cauCapNhatDiem, chonThemDiem, dongDeNghiVanPhong, dongXeNhan, khachDangCho, theCuuHo, type KhachChoDong, type LuaChonThemDiem } from "../src/shared/xe-dang-chay-man";
import { counter } from "./counter";

const errorEl = byId("error");
const trangEl = byId("ct-trang");
const bottomEl = byId("ct-bottom");
const id = new URLSearchParams(location.search).get("id") ?? "";

const staff = await initShell();
const coDieuPhoi = can(staff, "trip.dispatch");
/** ADR-0104 Đ1 mục 9: vượt MỐC (khoá xếp / rút / chuyển / đổi xe / huỷ còn khách; thêm khách khi xe chạy) luôn là điều chỉnh khẩn cấp — ô trip.urgent_adjust.
 *  Phá lệ khoảng nghỉ / cam kết ngoài mốc (trip.override) không có nút riêng: hộp mở theo `canQuyen` + `lop` của 409. */
const coKhanCap = can(staff, "trip.urgent_adjust");
/** Bấm thay tài xế (A15, route 31–39): ô trip.progress — Bán hàng, Quản trị, Toàn quyền; Kế toán không. */
const coTienDo = can(staff, "trip.progress");
/** Gói A5: duyệt / bác đề nghị chuyển khách leo thang (ô trip.override — Quản trị, Toàn quyền) — link sang màn "Đề nghị chuyển khách". */
const coDuyetDeNghi = can(staff, "trip.override");

let duLieu: ChuyenChiTietResponse | null = null;
/** Khối "Chi phí chuyến" (Đợt 4 G2): CHỈ có khi ô transport.cost.view; sau lệnh ghi chi phí đọc lại chuyến (lý do giữ "thiếu giá" có thể vừa hết). */
const chiPhi = taoKhoiChiPhi(staff, async () => {
  try {
    await nap();
    ve();
  } catch {
    /* giữ trang đang có — khối chi phí đã cập nhật từ phản hồi lệnh */
  }
});
/** Mã chuyến + phiên bản đã đọc chi phí — đổi (sửa, huỷ, xuất bến…) thì đọc lại chi phí (lô chuyến có thể vừa chụp / đảo giá). */
let khoaChiPhi = "";
let baoCao: HTMLElement | null = null;
/** Đợt 5 A-1b: dữ liệu khối "Cứu hộ" (chỉ chuyến ENDED_INTERRUPTED + ô trip.dispatch); `"loi"` = đọc hỏng (khối hiện câu báo, không chặn trang). */
let cuuHo: CuuHoResponse | "loi" | null = null;

async function nap(): Promise<void> {
  duLieu = await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(id)}`);
  await Promise.all([napCuuHo(), napDeNghi()]);
}
/** Gói A5: đề nghị chuyển khách trong ngày chạy (route văn phòng, ô trip.view) — chỉ giữ đề nghị có chuyến này; đọc hỏng thì giữ lần trước (không chặn trang). */
let deNghiChuyen: DeNghiNgayResponse["deNghi"] = [];
async function napDeNghi(): Promise<void> {
  if (!duLieu || !can(staff, "trip.view")) return;
  try {
    const r = await api<DeNghiNgayResponse>(`/api/van-chuyen/de-nghi?ngay=${duLieu.chuyen.ngayChay}`);
    deNghiChuyen = r.deNghi.filter((d) => d.tuChuyenId === duLieu!.chuyen.id || d.denChuyenId === duLieu!.chuyen.id);
  } catch {
    /* giữ lần trước */
  }
}
async function napCuuHo(): Promise<void> {
  cuuHo = null;
  if (!coDieuPhoi || duLieu?.chuyen.trangThai !== "ENDED_INTERRUPTED") return;
  try {
    cuuHo = await api<CuuHoResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(duLieu.chuyen.id)}/cuu-ho`);
  } catch {
    cuuHo = "loi";
  }
}

function ve(): void {
  const r = duLieu!;
  const c = r.chuyen;
  const ngay = c.ngayChay;
  const k = kieuChuyen(c);
  const keHoach = c.trangThai === "PLANNED";
  const back = byId<HTMLAnchorElement>("ct-back");
  back.href = `/dieu-phoi?ngay=${ngay}`;
  back.textContent = `‹ Điều phối xe ${ngayNgan(ngay, vnToday(new Date()))}`;
  document.body.dataset.back = back.href;
  document.title = `${c.ma} — Island Booking System`;
  setBarTitle(c.ma);
  datCrumb("Vận chuyển › Điều phối xe", c.ma);

  const nutSua = keHoach && coDieuPhoi ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen-sua?id=${encodeURIComponent(c.id)}`, "data-action": "sua-chuyen" }, "Sửa chuyến") : null;
  // Xuất bến thay tài xế (bản vẽ 2a + 6d): chuyến lên kế hoạch; bị giữ thì khoá (đối chiếu 2.7) — máy chủ vẫn kiểm.
  const nutXuatBen = (lop: string) => {
    if (!(keHoach && coTienDo)) return null;
    const giu = c.lyDoGiu.length > 0;
    const b = h("button", { type: "button", class: `vc-btn ${lop}`, disabled: giu, "data-action": "xuat-ben-thay", title: giu ? "Chưa đủ điều kiện xuất bến" : null }, "Xuất bến thay tài xế");
    b.addEventListener("click", () => xuatBenThay(b));
    return b;
  };
  // ADR-0097 Đ3: thu hồi xuất bến — chuyến đang chạy, chưa có sự kiện nào sau lần xuất bến cuối (`coTienDoSauXuatBen` trên nhật ký chuyến — cùng hàm máy chủ);
  // quá giờ kẹp lùi thì máy chủ trả 409 qua_gio_thu_hoi (câu hiện trong hộp).
  const nutThuHoi = (lop: string) => {
    if (!(c.trangThai === "RUNNING" && coTienDo && chuaCoTienDo(r))) return null;
    const b = h("button", { type: "button", class: `vc-btn ${lop}`, "data-action": "thu-hoi-xuat-ben" }, "Thu hồi xuất bến") as HTMLButtonElement;
    b.addEventListener("click", () => moThuHoi(b));
    return b;
  };
  const nutHuy = (lop: string) => {
    if (!(keHoach && coDieuPhoi)) return null;
    const b = h("button", { type: "button", class: `vc-btn ${lop}`, "data-action": "huy-chuyen" }, "Huỷ chuyến");
    b.addEventListener("click", () => huy(b));
    return b;
  };
  const head = h(
    "div",
    { class: "dp-ct-head" },
    h("h1", { class: "dp-ct-title" }, c.ma),
    chip(k.nhan, k.kieu === "held" ? "danger" : k.kieu === "nodrv" ? "warn" : k.kieu === "run" ? "navy" : k.kieu === "done" ? "ok" : k.kieu === "cancel" ? "muted" : "unit"),
    c.khanCap ? chip(NHAN_KHAN_CAP, "warn") : null, // ADR-0104 Đ1 mục 5
    h("span", { class: "dp-ct-when" }, `${thuNgay(ngay)} · ${gioHien(c.batDau, ngay)}–${gioHien(c.ketThuc, ngay)}`),
    h("div", { class: "dp-ct-actions" }, nutSua, nutXuatBen("vc-btn-ghost-primary"), nutThuHoi("vc-btn-ghost-primary"), nutHuy("vc-btn-danger")),
  );
  // Mốc tiến độ đã có (thành phần B): xuất bến / kết thúc — một giờ, hoặc hai giờ khi văn phòng khai.
  const moc = c.xuatBen || c.ketThucThat
    ? h("div", { class: "dp-ct-moc" }, dongMoc("Xuất bến", c.xuatBen, ngay), c.ketThucThat ? dongMoc(c.trangThai === "ENDED_INTERRUPTED" ? "Kết thúc gián đoạn" : "Kết thúc", c.ketThucThat, ngay) : null)
    : null;
  const khoa = c.khoaMoc.dangKhoa && keHoach
    ? h("div", { class: "dg-lock dp-ct-lock" }, icon("lock", 16), cauKhoaMoc(r.mocToiThieuPhut, { khanCap: coKhanCap, dieuPhoi: coDieuPhoi }))
    : null;

  // Dải: lý do giữ "Nơi đón / trả đã đổi" (C) + nút; chuyến đang chạy có nơi hẹn khác điểm (D — chỉ báo).
  const dais: Child[] = [];
  const noiDoi = c.lyDoGiu.filter((l) => l.ma === "NOI_HEN_DOI");
  if (keHoach && noiDoi.length) {
    const nut = coDieuPhoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") : null;
    nut?.addEventListener("click", () => capNhatDiem(nut));
    dais.push(dai("danger", "Chuyến bị giữ: Nơi đón / trả đã đổi — cập nhật điểm", [
      ...noiDoi.map((l) => l.loiNhan),
      `Ai xử lý: ${noiDoi[0]!.aiXuLyNhan}. Không cần điều chỉnh khẩn cấp hay phá lệ, kể cả trong vùng khoá trước giờ xuất bến.`,
    ], undefined, nut ? [h("div", { class: "banner-actions" }, nut)] : []));
  }
  // Vòng 5e (R-P29): lý do giữ "Khách trong xe không còn trong đơn" + nút "Cập nhật khách theo đơn" — khuôn dải trên (không phá lệ, kể cả trong vùng khoá).
  // ADR-0104 Đ2.11: nút cũng gỡ đơn huỷ / chặng đã bỏ / đơn không xác nhận / thừa suất (`giuCapNhatKhach`) — tiêu đề trung tính khi không có khách đổi.
  const khachDoi = giuCapNhatKhach(c.lyDoGiu);
  if (keHoach && khachDoi.length) {
    const nut = coDieuPhoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-khach" }, NUT_CAP_NHAT_KHACH) : null;
    nut?.addEventListener("click", () => capNhatKhach(nut));
    const tieuDe = khachDoi.some((l) => l.ma === "KHACH_DA_DOI") ? "Chuyến bị giữ: Khách trong đơn đã đổi — cập nhật khách" : "Chuyến bị giữ: Đơn đã đổi sau khi xếp — cập nhật khách";
    dais.push(dai("danger", tieuDe, [
      ...khachDoi.map((l) => l.loiNhan),
      `Ai xử lý: ${khachDoi[0]!.aiXuLyNhan}. Không cần điều chỉnh khẩn cấp hay phá lệ, kể cả trong vùng khoá trước giờ xuất bến.`,
    ], undefined, nut ? [h("div", { class: "banner-actions" }, nut)] : []));
  }
  // ADR-0055 VK2-B B3: nhắc giờ lái (chỉ nhắc — không chặn xuất bến). Sau tạo / sửa chuyến, màn chuyển về đây nên nhắc hiện ngay (khuôn canhBaoXep).
  for (const w of r.canhBao.filter((x) => x.loai === "GIO_LAI_VUOT" || x.loai === "CHUYEN_DAI_CAN_NGHI")) {
    dais.push(dai("warning", w.nhan, ["Chỉ nhắc — không chặn xuất bến. Toàn quyền đổi con số ở Chính sách điều phối."]));
  }
  // HT-01 (kiểm theo vai 2/10 — V1.2): điểm trả đứng trước điểm đón của khách. Từ ADR-0096 Đ1 (LC-19) chuyến kế hoạch bị GIỮ (mã TRA_TRUOC_DON ở "Điều kiện
  // xuất bến"); dải này chỉ đường sửa. Một dải cho mọi đơn.
  const traTruoc = r.canhBao.filter((x) => x.loai === "TRA_TRUOC_DON");
  if (traTruoc.length > 0 && (c.trangThai === "PLANNED" || c.trangThai === "RUNNING")) {
    const don = [...new Set(traTruoc.map((w) => w.maDon).filter((x): x is string => !!x))].join(", ");
    dais.push(dai("warning", traTruoc[0]!.nhan, [
      `${don ? `Đơn ${don}: ` : ""}khách sẽ được trả ở một điểm đứng trước điểm đón của chính họ.`,
      c.trangThai === "RUNNING"
        ? `Xe đang chạy — đổi thứ tự bằng nút ↑ ↓ ở danh sách điểm hoặc gọi tài xế${c.taiXe ? ` ${c.taiXe.ten}` : ""}.`
        : coDieuPhoi
          ? "Đưa điểm đón lên trước điểm trả bằng nút ↑ ↓ ở danh sách điểm. Chuyến không xuất bến được tới khi sửa xong."
          : "Báo người điều phối đổi thứ tự điểm. Chuyến không xuất bến được tới khi sửa xong.",
    ]));
  }
  if (c.trangThai === "RUNNING") {
    for (const w of r.canhBao.filter((x) => x.loai === "NOI_HEN_KHAC_DIEM")) {
      dais.push(dai("warning", "Nơi hẹn khác điểm xe", [
        `Đơn ${w.maDon ?? ""} hẹn khác điểm của xe.`,
        coDieuPhoi ? "Bấm “Cập nhật điểm theo đơn” ở Việc của văn phòng — chỉ dời khách còn chờ ở điểm xe chưa tới." : `Báo người điều phối hoặc gọi tài xế${c.taiXe ? ` ${c.taiXe.ten}` : ""}.`,
      ]));
    }
  }

  const kv = (nhan: string, giaTri: string, phu: string) => h("div", { class: "dp-kv" }, h("span", { class: "dp-kv-k" }, nhan), h("span", { class: "dp-kv-v" }, giaTri), h("span", { class: "dp-kv-s" }, phu));
  const soLieu = h(
    "div",
    { class: "vc-card dp-kv-strip" },
    kv("XE", c.xe.bienSo, `${c.xe.soCho} chỗ · ${c.xe.chuLaCongTy ? "xe công ty" : `nhà xe ${c.xe.chuXe}`}`),
    kv("TÀI XẾ", c.taiXe?.ten ?? "Chưa có tài xế", c.taiXe ? (c.taiXe.loai === "CONG_TY" ? "Tài xế công ty" : "Tài xế nhà xe") : ""),
    kv("GIỜ", `${gioHien(c.batDau, ngay)}–${gioHien(c.ketThuc, ngay)}`, `Xuất bến dự kiến ${gioHien(c.batDau, ngay)}`),
    kv("TẢI", `${c.tai}/${c.xe.soCho}`, `Còn ${Math.max(0, c.xe.soCho - c.tai)} chỗ`),
  );
  // Điện thoại (bản vẽ 2b): một dòng thay dải bốn ô.
  const dongDt = h("div", { class: "dp-ct-line" }, h("strong", null, c.xe.bienSo), ` · ${c.xe.soCho} chỗ · ${c.taiXe?.ten ?? "Chưa có tài xế"} · tải `, h("strong", null, `${c.tai}/${c.xe.soCho}`));

  const chay = c.trangThai === "RUNNING";
  const diem = chay ? diemChay() : h(
    "section",
    { class: "vc-card dp-stops", "aria-labelledby": "ct-diem-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-diem-title", class: "dp-card-title" }, "Điểm dừng"), h("span", { class: "dp-card-note" }, "Tải hiện tại ", h("strong", null, `${c.tai}/${c.xe.soCho}`))),
    h("div", { class: "dp-stop dp-stop-th", "aria-hidden": "true" }, h("span", null, "#"), h("span", null, "ĐÓN / TRẢ"), h("span", null, "NƠI"), h("span", null, "GIỜ HẸN"), h("span", null, "GIỜ XE TỚI"), h("span", null, "KHÁCH"), h("span", null, "TRẠNG THÁI")),
    ...(r.diem.length
      ? r.diem.map((d) => {
          const n = nhanDiem(d);
          const hen = d.gioHen ? gioHien(d.gioHen, ngay) : "—";
          const toi = d.gioXeToi ? gioHien(d.gioXeToi, ngay) : hen;
          // Máy tính: bảng 7 cột (bản vẽ 2a); điện thoại: vòng số + "Đón · nơi" + một dòng "Hẹn · xe tới · khách" (bản vẽ 2b) — hai cách bày, cùng dữ liệu.
          return h(
            "div",
            { class: `dp-stop${d.lechDon && d.trangThai !== "SKIPPED" ? " is-lech" : ""}${d.trangThai === "SKIPPED" ? " is-bo" : ""}`, "data-diem": d.id },
            h("span", { class: "dp-stop-so" }, n.so),
            h("span", { class: "dp-stop-loai" }, n.loai),
            h("span", { class: "dp-stop-noi" }, h("strong", null, h("span", { class: "dp-stop-loai-m" }, `${n.loai} · `), d.tenNoi), n.ghiChu ? h("span", { class: "dp-stop-note" }, n.ghiChu) : null, ...goiBaoCua(d.id), nutThuTuKeHoach(d)),
            h("span", { class: "dp-stop-hen" }, hen),
            h("span", { class: "dp-stop-toi" }, toi, n.muon ? h("span", { class: "dp-stop-muon" }, n.muon) : null),
            h("span", { class: "dp-stop-khach" }, String(d.soNguoi)),
            h("span", { class: "dp-stop-tom" }, [d.gioHen ? `Hẹn ${hen}` : null, d.gioHen || d.gioXeToi ? `xe tới ${toi}` : null, `${d.soNguoi} khách`].filter(Boolean).join(" · "), n.muon ? h("span", { class: "dp-stop-muon" }, n.muon) : null),
            h("span", { class: "dp-stop-tt" }, chip(n.nhan, n.tone)),
          );
        })
      : [h("div", { class: "dp-stop dp-stop-empty" }, "Chuyến chưa có điểm — xếp khách vào chuyến ở màn Điều phối xe.")]),
  );

  // Điều kiện xuất bến (chuyến lên kế hoạch) / bản chụp lúc xuất bến (sau khi xuất bến).
  let dieuKien: HTMLElement;
  if (keHoach) {
    const dk = dieuKienXuatBen(c.lyDoGiu);
    const soChua = dk.filter((x) => !x.dat).length;
    dieuKien = h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "ct-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "ct-dk-title", class: "dp-card-title" }, "Điều kiện xuất bến"), soChua ? chip(`${soChua} chưa đạt`, "danger") : chip("Đạt hết", "ok")),
      ...dk.map((x) => h("div", { class: "dp-cond", "data-dat": String(x.dat) },
        h("span", { class: x.dat ? "dp-cond-mark is-dat" : "dp-cond-mark is-chua", "aria-label": x.dat ? "Đạt" : "Chưa đạt" }, x.dat ? "✓" : "✕"),
        h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, x.nhan), x.chiTiet ? h("span", { class: "dp-cond-sub" }, x.chiTiet) : null))),
    );
  } else if (r.banChup) {
    const b = r.banChup;
    dieuKien = h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "ct-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "ct-dk-title", class: "dp-card-title" }, "Bản chụp lúc xuất bến"), chip(b.ketQua === "DAT" ? "Đạt" : "Chưa đạt", b.ketQua === "DAT" ? "ok" : "danger")),
      h("div", { class: "dp-cond" }, h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, `${gioHien(b.luc, ngay)} · ${b.bienSo} · ${b.soCho} chỗ`), h("span", { class: "dp-cond-sub" }, `${b.soNguoiChot} khách · nghỉ ${b.nghiDaDung} phút`))),
      ...b.muc.map((m) => {
        const x = dongBanChup(m);
        return h("div", { class: "dp-cond" }, h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, x.nhan), x.phu ? h("span", { class: "dp-cond-sub" }, x.phu) : null));
      }),
    );
  } else {
    dieuKien = h("section", { class: "vc-card dp-side-card" }, h("div", { class: "dp-card-head" }, h("h2", { class: "dp-card-title" }, "Điều kiện xuất bến")), h("div", { class: "dp-cond dp-hist-sub" }, "Chuyến không còn lên kế hoạch."));
  }

  const nhatKy = h(
    "section",
    { class: "vc-card dp-side-card", "aria-labelledby": "ct-nk-title" },
    h("div", { class: "dp-card-head" }, icon("history", 16), h("h2", { id: "ct-nk-title", class: "dp-card-title" }, "Nhật ký chuyến")),
    ...r.nhatKy.map((n) => {
      const d = dongNhatKy(n, ngay);
      return h(
        "div",
        { class: "dp-log" },
        h("span", { class: "dp-log-meta" }, h("span", null, d.gio), h("span", { class: d.laMay ? "dp-log-who is-may" : "dp-log-who" }, d.ai), d.vanPhongKhai ? chip("giờ do văn phòng khai", "warn") : null),
        h("span", null, d.noiDung),
      );
    }),
  );

  replaceChildren(
    trangEl,
    head,
    moc,
    khoa,
    baoCao,
    ...dais,
    h("div", { class: "dp-ct-layout" }, h("div", { class: "dp-ct-main" }, dongDt, soLieu, chay ? h("div", { class: "dp-xc" }, theViecVanPhong(), theKhachCho()) : null, theCuuHoKhoi(), theDeNghiChuyen(), diem, keHoach ? theKhach() : null, chiPhi.el), h("div", { class: "dp-ct-side" }, dieuKien, nhatKy)),
  );
  // Điện thoại: nút ở cuối trang, lưới hai cột (bản vẽ 2b); máy tính: nút ở đầu trang.
  const huyDay = nutHuy("vc-btn-danger");
  const xbDay = nutXuatBen("vc-btn-ghost-primary");
  const thDay = nutThuHoi("vc-btn-ghost-primary");
  replaceChildren(bottomEl, nutSua ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: nutSua.getAttribute("href")!, "data-action": "sua-chuyen" }, "Sửa chuyến") : null, xbDay, thDay, huyDay);
  bottomEl.hidden = !(nutSua || huyDay || xbDay || thDay);
  const khoaCp = `${c.id}:${c.version}:${c.trangThai}`;
  if (chiPhi.el && khoaCp !== khoaChiPhi) {
    khoaChiPhi = khoaCp;
    void chiPhi.tai(c.id);
  }
}

/**
 * GA-55 (máy chủ A18): phản hồi lệnh ghi KHÔNG còn họ tên / năm sinh khách — chỉ GET chi tiết có. Sau mỗi lệnh đọc lại GET; đọc lại hỏng thì giữ tên đã có
 * theo id suất (không ô tên trống, không "undefined").
 */
async function docLai<T extends ChuyenChiTietResponse>(r: T): Promise<T> {
  try {
    return { ...r, ...(await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(r.chuyen.id)}`)) };
  } catch {
    return giuTenKhach(r, duLieu);
  }
}

// ---- Bấm thay tài xế (A15; bản vẽ 5c, 6d; thành phần A) ------------------------------------------------------------------------------------------------------
/** Mỗi đường lệnh một bộ requestId (bấm lại sau mất mạng cùng thân → cùng id; lệnh nhiều bước như "Đã trả" có một bộ cho từng khách). */
const cacLenh = new Map<string, ReturnType<typeof taoLenh>>();
const lenhCho = (url: string) => {
  let l = cacLenh.get(url);
  if (!l) cacLenh.set(url, (l = taoLenh()));
  return l;
};
const goc = () => `/api/van-chuyen/chuyen/${encodeURIComponent(duLieu!.chuyen.id)}`;
const guiTienDo = async (duoi: string, than: Record<string, unknown>): Promise<void> => {
  duLieu = await docLai(await lenhCho(`${goc()}/${duoi}`).gui<ChuyenChiTietResponse>(`${goc()}/${duoi}`, "POST", than));
};
const moTaBamThay = () => `Ghi thay tài xế ${duLieu!.chuyen.taiXe?.ten ?? "của chuyến"}. Tên bạn được ghi kèm mốc này.`;
const muonHon = (a: GioVnDto | null | undefined, b: GioVnDto | null | undefined): GioVnDto | null => {
  if (!a) return b ?? null;
  if (!b) return a;
  return `${a.ngay} ${a.gio}` >= `${b.ngay} ${b.gio}` ? a : b;
};
const xong = (baoCaoMoi: HTMLElement | null = null) => {
  baoCao = baoCaoMoi;
  ve();
};

function xuatBenThay(nut: HTMLButtonElement): void {
  const r = duLieu!;
  const dk = dieuKienXuatBen(r.chuyen.lyDoGiu);
  const lechNgay = canhBaoNgayChay(r.chuyen.ngayChay, vnToday(new Date()));
  moKhaiGio({
    tieuDe: `Xuất bến ${r.chuyen.ma} — bấm thay tài xế`,
    // HT-03 (V1.3): ngày chạy khác hôm nay → dòng đỏ CÙNG câu với màn tài xế (`canhBaoNgayChay`). Ngoài cửa sổ xuất bến (ADR-0096 Đ2) máy chủ chặn bằng lý do giữ.
    dauHop: [...(lechNgay ? [dai("danger", "Không phải chuyến của hôm nay", [lechNgay])] : []), dai("ok", `Đạt đủ ${dk.length} điều kiện xuất bến`)],
    moTa: moTaBamThay(),
    nutChinh: "Xuất bến",
    nutLop: "btn btn-accent",
    somNhat: r.gioSomNhatKhai.xuatBen,
    ngayXem: r.chuyen.ngayChay,
    opener: nut,
    onGui: async (xayRaLuc) => {
      await guiTienDo("xuat-ben", xayRaLuc ? { xayRaLuc } : {});
      xong(dai("ok", `Đã ghi xuất bến ${duLieu!.chuyen.ma}`));
    },
  });
}

/** Văn phòng đổi thứ tự điểm CHƯA TỚI khi xe đang chạy (route 39 ↔ 29, ADR-0049 D3): nút lên / xuống như màn tài xế; không ô giờ (route không nhận xayRaLuc). */
function nutThuTuVanPhong(b: BuocDiem): HTMLElement | null {
  const r = duLieu!;
  if (!coTienDo || r.chuyen.trangThai !== "RUNNING" || b.diem.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    const { than, daoMoi } = doiThuTuDuoc(r.diem, r.suat, b.diem.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than || daoMoi, "aria-label": daoMoi ? `${nhan} — ${CAU_THU_TU_DAO}` : nhan, title: daoMoi ? CAU_THU_TU_DAO : null, "data-action": action }, kyHieu);
    x.addEventListener("click", async () => {
      if (!than || daoMoi) return;
      x.disabled = true;
      try {
        await guiTienDo("thu-tu", than);
        xong(dai("ok", "Đã đổi thứ tự điểm"));
      } catch (e) {
        const cau = cauLoiTienDo(e, Date.now(), r.chuyen.ngayChay).cau;
        try {
          await nap(); // 409 (vd tài xế vừa "Đã tới" điểm này): đọc lại chuyến để nút lên / xuống theo trạng thái mới
        } catch {
          /* mất mạng: giữ dữ liệu cũ, dải báo vẫn hiện */
        }
        xong(dai("danger", "Chưa đổi được thứ tự điểm", [cau]));
      }
    });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom" }, nut(-1, "↑", `Đưa ${b.diem.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${b.diem.tenNoi} xuống sau`, "xuong"));
}

/**
 * C30 (ADR-0096 Đ1.3c): nút ↑ / ↓ ở điểm CHƯA TỚI của chuyến KẾ HOẠCH — gửi `PUT /chuyen/:id` thân `diem` (đủ các điểm chưa tới, GIỮ giờ xe tới đang có — vắng
 * giờ thì máy chủ hiểu là xoá giờ). Ô trip.dispatch (như "Sửa chuyến"). Khoá khi lệnh làm khách chờ lên bị đảo mới (cùng luật 409 `thu_tu_dao` của máy chủ).
 */
function nutThuTuKeHoach(d: DiemChuyenDto): HTMLElement | null {
  const r = duLieu!;
  if (!coDieuPhoi || r.chuyen.trangThai !== "PLANNED" || d.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    const { than, daoMoi } = doiThuTuDuoc(r.diem, r.suat, d.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than || daoMoi, "aria-label": daoMoi ? `${nhan} — ${CAU_THU_TU_DAO}` : nhan, title: daoMoi ? CAU_THU_TU_DAO : null, "data-action": `ke-hoach-${action}`, "data-diem": d.id }, kyHieu);
    x.addEventListener("click", async () => {
      if (!than || daoMoi) return;
      x.disabled = true;
      const gioToi = new Map(r.diem.map((p) => [p.id, p.gioXeToi]));
      const url = goc();
      try {
        const moi = await lenhCho(`PUT ${url}`).gui<ChuyenChiTietResponse>(url, "PUT", { version: r.chuyen.version, diem: than.diem.map((p) => ({ id: p.id, thuTu: p.thuTu, gioXeToi: gioToi.get(p.id) ?? null })) });
        duLieu = await docLai(moi);
        xong(dai("ok", "Đã đổi thứ tự điểm"));
      } catch (e) {
        const l = docLoiLenh(e);
        try {
          await nap(); // 409 (chuyến vừa bị sửa / đảo mới): đọc lại để nút theo dữ liệu mới
        } catch {
          /* mất mạng: giữ dữ liệu cũ, dải báo vẫn hiện */
        }
        xong(dai("danger", "Chưa đổi được thứ tự điểm", l.cu ? ["Chuyến vừa được người khác sửa — đã tải lại, bấm lại nếu vẫn cần."] : [l.tieuDe, ...l.dong]));
      }
    });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom dp-stop-thu-tu" }, nut(-1, "↑", `Đưa ${d.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${d.tenNoi} xuống sau`, "xuong"));
}

/** "Chưa có tiến độ nào sau xuất bến" (ADR-0097 Đ3.2) — CÙNG hàm với máy chủ, trên nhật ký chuyến của lần đọc (thứ tự ghi); máy chủ vẫn là cổng. */
const chuaCoTienDo = (r: ChuyenChiTietResponse): boolean => !coTienDoSauXuatBen(r.nhatKy.map((n) => ({ loai: n.loai, chuyenKhac: n.chuyenKhac })));

const lenhThuHoi = new Map<string, ReturnType<typeof taoLenh>>();
/** ADR-0097 Đ3: hộp "Thu hồi xuất bến" — lý do nhóm Điều chỉnh (không ô chữ), chuyến về chưa chạy; tài xế nhận tin và bấm Xuất bến lại khi xe thật sự chạy. */
function moThuHoi(opener: HTMLButtonElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  let code: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "thu-hoi-gui" }, "Thu hồi xuất bến") as HTMLButtonElement;
  const quay = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const bang = moBangTruot({
    title: `Thu hồi xuất bến ${c.ma}`,
    body: [
      dai("warning", "Chuyến về trạng thái chưa chạy", [
        "Dùng khi tài xế bấm Xuất bến nhầm chuyến. Bản chụp lúc xuất bến vẫn giữ trong nhật ký.",
        `Tài xế${c.taiXe ? ` ${c.taiXe.ten}` : ""} nhận tin và bấm Xuất bến lại khi xe thật sự chạy.`,
      ]),
      nhomChon("ct-thu-hoi", "Lý do", r.lyDo.filter((l) => l.nhom === "DIEU_CHINH").map((l) => ({ code: l.code, nhan: l.nhan })), (x) => { code = x; gui.disabled = false; }),
      loi,
    ],
    foot: [quay, gui],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  quay.addEventListener("click", () => bang.close());
  gui.addEventListener("click", async () => {
    if (!code) return;
    bang.setBusy(true);
    gui.disabled = true;
    loi.hidden = true;
    try {
      let l = lenhThuHoi.get(c.id);
      if (!l) lenhThuHoi.set(c.id, (l = taoLenh()));
      const url = `${goc()}/thu-hoi-xuat-ben`;
      duLieu = await docLai(await l.gui<ChuyenChiTietResponse>(url, "POST", { version: duLieu!.chuyen.version, lyDo: code }));
      bang.close(false);
      xong(dai("ok", `Đã thu hồi xuất bến ${c.ma}`, ["Chuyến về chưa chạy — tài xế bấm Xuất bến lại khi xe thật sự chạy."]));
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), loiTrongHop(e));
      loi.hidden = false;
      gui.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

type TrangThaiSuatDto = ChuyenChiTietResponse["suat"][number]["trangThai"];
/** ADR-0097 Đ2: link "Điều chỉnh…" ở dòng khách đã có kết quả (chuyến đang chạy, ô trip.progress) — chỉ khi bảng điều chỉnh còn lựa chọn làm được. */
function linkDieuChinh(k: KhachDiem): HTMLElement | null {
  const r = duLieu!;
  if (!coTienDo || r.chuyen.trangThai !== "RUNNING") return null;
  const s = r.suat.find((x) => x.id === k.suatId);
  if (!s || s.loai === "CREW") return null;
  const trangThaiDiem = (id: string | null) => (id === null ? null : r.diem.find((d) => d.id === id)?.trangThai ?? null);
  const dich = dichDieuChinh(s.trangThai, { diemLen: trangThaiDiem(s.diemLen) ?? "DONE", diemXuong: trangThaiDiem(s.diemXuong) });
  if (!dich.length) return null;
  const nut = h("button", { type: "button", class: "btn btn-link dp-dieu-chinh-link", "data-action": "dieu-chinh", "data-suat": s.id }, "Điều chỉnh…") as HTMLButtonElement;
  nut.addEventListener("click", () => moDieuChinh(k, s.trangThai, dich, nut));
  return nut;
}

const lenhDieuChinh = new Map<string, ReturnType<typeof taoLenh>>();
/** ADR-0097 Đ2: hộp "Điều chỉnh kết quả" — sửa thành (bảng Đ2.4) + lý do nhóm Điều chỉnh; không xoá kết quả cũ (Nền tảng ghi thêm một lần điều chỉnh có lý do). */
function moDieuChinh(k: KhachDiem, tu: TrangThaiSuatDto, dich: readonly TrangThaiSuatDto[], opener: HTMLButtonElement): void {
  const r = duLieu!;
  let den: TrangThaiSuatDto | null = null;
  let code: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "vc-btn btn btn-primary", disabled: true, "data-action": "dieu-chinh-gui" }, "Điều chỉnh") as HTMLButtonElement;
  const quay = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const moKhoa = () => {
    gui.disabled = !(den && code);
  };
  const bang = moBangTruot({
    title: "Điều chỉnh kết quả",
    body: [
      h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, k.ten), h("div", { class: "dp-note" }, `Đang ghi: ${nhanTrangThaiDieuChinh(tu)}`)),
      nhomChon("ct-dc-den", "Sửa thành", dich.map((x) => ({ code: x, nhan: nhanDichDieuChinh(tu, x) })), (x) => { den = dich.find((y) => y === x) ?? null; moKhoa(); }),
      nhomChon("ct-dc-ly-do", "Lý do", r.lyDo.filter((l) => l.nhom === "DIEU_CHINH").map((l) => ({ code: l.code, nhan: l.nhan })), (x) => { code = x; moKhoa(); }),
      h("p", { class: "dp-note" }, "Kết quả cũ không bị xoá — Nền tảng ghi thêm một lần điều chỉnh có lý do. Tài xế nhận tin."),
      loi,
    ],
    foot: [quay, gui],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  quay.addEventListener("click", () => bang.close());
  gui.addEventListener("click", async () => {
    if (!den || !code) return;
    const denChon = den;
    bang.setBusy(true);
    gui.disabled = true;
    loi.hidden = true;
    try {
      let l = lenhDieuChinh.get(k.suatId);
      if (!l) lenhDieuChinh.set(k.suatId, (l = taoLenh()));
      const url = `${goc()}/phan-bo/${encodeURIComponent(k.suatId)}/dieu-chinh`;
      duLieu = await docLai(await l.gui<ChuyenChiTietResponse>(url, "POST", { version: duLieu!.chuyen.version, trangThai: denChon, lyDo: code }));
      bang.close(false);
      xong(dai("ok", `Đã điều chỉnh ${k.ten}: ${nhanTrangThaiDieuChinh(tu)} → ${nhanDichDieuChinh(tu, denChon)}`));
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), loiTrongHop(e));
      loi.hidden = false;
      gui.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

function diemChay(): HTMLElement {
  const r = duLieu!;
  const c = r.chuyen;
  const ketThuc = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: !ketThucDuoc(r.suat), "data-action": "ket-thuc" }, "Kết thúc chuyến");
  const gianDoan = h("button", { type: "button", class: "vc-btn vc-btn-danger", "data-action": "ket-thuc-gian-doan" }, "Kết thúc gián đoạn");
  ketThuc.addEventListener("click", () => moKhaiGio({
    tieuDe: `Kết thúc ${c.ma} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: "Kết thúc chuyến", nutLop: "btn btn-accent",
    somNhat: r.gioSomNhatKhai.ketThuc, ngayXem: c.ngayChay, opener: ketThuc,
    onGui: async (xayRaLuc) => {
      await guiTienDo("ket-thuc", xayRaLuc ? { xayRaLuc } : {});
      xong(dai("ok", `Đã kết thúc ${duLieu!.chuyen.ma}`));
    },
  }));
  gianDoan.addEventListener("click", () => moGianDoan(gianDoan));
  return h(
    "section",
    { class: "dp-run-list", "aria-labelledby": "ct-diem-title" },
    h("div", { class: "dp-card-head dp-run-list-head" }, h("h2", { id: "ct-diem-title", class: "dp-card-title" }, "Điểm dừng"), h("span", { class: "dp-card-note" }, "Tải hiện tại ", h("strong", null, `${c.tai}/${c.xe.soCho}`))),
    ...veDiemChay({ diem: r.diem, suat: r.suat, trangThai: c.trangThai, ngayXem: c.ngayChay, coNut: coTienDo, onLenh: lenhDiemChay, phuDiem: (b) => ({ ben: nutThuTuVanPhong(b) ?? undefined, duoi: goiBaoCua(b.diem.id).map((x) => h("div", { class: "dp-gb-dong" }, x)) }), phuKhach: linkDieuChinh }),
    ...khoiDiKemVanPhong(),
    coTienDo ? h("div", { class: "dp-run-end thanh-hanh-dong-cuoi" }, ketThuc, ketThuc.disabled ? h("span", { class: "dp-note" }, "Bấm được khi đã trả hết khách và người đi kèm đã xuống.") : null, gianDoan) : null,
  );
}

/**
 * Hộp "Kết thúc gián đoạn" bấm thay tài xế (route ket-thuc-gian-doan, nhóm lý do KET_THUC_GIAN_DOAN). `cuuHo` (nút "Cứu hộ" — Đợt 5 A-1b): thêm dòng giải
 * thích; thành công thì đọc khối "Cứu hộ" và cuộn tới đó.
 */
function moGianDoan(opener: HTMLButtonElement, laCuuHo = false): void {
  const r = duLieu!;
  const c = r.chuyen;
  moKhaiGio({
    tieuDe: `Kết thúc gián đoạn ${c.ma} — bấm thay tài xế`,
    ...(laCuuHo ? { dauHop: [dai("warning", "Xe hỏng: kết thúc gián đoạn rồi xếp khách sang xe cứu hộ.")] } : {}),
    moTa: `${moTaBamThay()} Khách còn trên xe và khách chưa đón sẽ báo về văn phòng.`,
    nutChinh: "Kết thúc gián đoạn", nutLop: "vc-btn-danger",
    lyDo: r.lyDo.filter((l) => l.nhom === "KET_THUC_GIAN_DOAN"),
    somNhat: r.gioSomNhatKhai.ketThuc, ngayXem: c.ngayChay, opener,
    onGui: async (xayRaLuc, lyDo) => {
      await guiTienDo("ket-thuc-gian-doan", { lyDo, ...(xayRaLuc ? { xayRaLuc } : {}) });
      await napCuuHo();
      xong(dai("info", `Đã kết thúc gián đoạn ${duLieu!.chuyen.ma}`, cuuHo && cuuHo !== "loi" ? ["Xếp khách sang xe cứu hộ ở khối “Cứu hộ” bên dưới."] : []));
      if (laCuuHo) document.getElementById("ct-cuu-ho")?.scrollIntoView({ block: "start" });
    },
  });
}

/** Văn phòng bấm thay cho người đi kèm: "Đã lên xe" → "Đã xuống" (cùng lệnh suất của máy chủ; giờ ghi = giờ bấm). Cần "trip.progress"; không có thì chỉ xem. */
function khoiDiKemVanPhong(): HTMLElement[] {
  const viec = viecNguoiDiKem(duLieu!.suat);
  if (!viec.length) return [];
  return [h("div", { class: "dp-cc-di-kem-viec" }, ...viec.map((v) => {
    const nut = coTienDo && v.lenh ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": `di-kem-${v.lenh}`, "data-suat": v.id }, v.nhan!) : null;
    nut?.addEventListener("click", () => {
      nut.disabled = true;
      void guiTienDo(`phan-bo/${encodeURIComponent(v.id)}/${v.lenh}`, {}).then(() => xong(), (e) => xong(dai("danger", loiCua(e))));
    });
    return h("div", { class: "dp-cc-di-kem-dong" }, h("span", null, `Người đi kèm ${v.ten} — ${v.trangThai === "WAITING" ? "chưa lên xe" : v.trangThai === "BOARDED" ? "đang trên xe" : "đã xuống"}`), nut);
  }))];
}

function lenhDiemChay(l: LenhDiem, nut: HTMLButtonElement): void {
  const r = duLieu!;
  const d = l.buoc.diem;
  const som = r.gioSomNhatKhai;
  if (l.loai === "da-toi") {
    moKhaiGio({
      tieuDe: `Đã tới ${d.tenNoi} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: "Ghi “Đã tới”",
      somNhat: som.diem.find((x) => x.id === d.id)?.daToi ?? null, ngayXem: r.chuyen.ngayChay, opener: nut,
      onGui: async (xayRaLuc) => {
        await guiTienDo(`diem/${encodeURIComponent(d.id)}/da-toi`, xayRaLuc ? { xayRaLuc } : {});
        xong();
      },
    });
    return;
  }
  if (l.loai === "tra-het") {
    const traCho = l.buoc.traCho;
    const somTra = traCho.reduce<GioVnDto | null>((m, id) => muonHon(m, som.suat.find((x) => x.id === id)?.tra), d.trangThai === "PENDING" ? som.diem.find((x) => x.id === d.id)?.daToi ?? null : null);
    moKhaiGio({
      tieuDe: `Đã trả ở ${d.tenNoi} — bấm thay tài xế`, moTa: `${moTaBamThay()} Trả ${traCho.length} khách đang trên xe ở điểm này.`, nutChinh: "Ghi “Đã trả”",
      somNhat: somTra, ngayXem: r.chuyen.ngayChay, opener: nut,
      onGui: async (xayRaLuc) => {
        const than = xayRaLuc ? { xayRaLuc } : {};
        // Nhiều lệnh nối nhau (tới điểm, rồi trả từng khách): hỏng giữa chừng thì tải lại — bấm lại làm nốt phần còn lại.
        try {
          if (duLieu!.diem.find((x) => x.id === d.id)?.trangThai === "PENDING") await guiTienDo(`diem/${encodeURIComponent(d.id)}/da-toi`, than);
          for (const id of traCho) {
            if (duLieu!.suat.find((x) => x.id === id)?.trangThai !== "BOARDED") continue;
            await guiTienDo(`phan-bo/${encodeURIComponent(id)}/tra`, than);
          }
        } finally {
          ve();
        }
        xong();
      },
    });
    return;
  }
  const lenh = l.loai;
  const nhan = { don: "Đã đón", vang: "Vắng", "khach-huy": "Khách đã huỷ" }[lenh];
  moKhaiGio({
    tieuDe: `${nhan} — ${l.ten} — bấm thay tài xế`, moTa: moTaBamThay(), nutChinh: `Ghi “${nhan}”`,
    somNhat: som.suat.find((x) => x.id === l.suatId)?.lenXe ?? null, ngayXem: r.chuyen.ngayChay, opener: nut,
    onGui: async (xayRaLuc) => {
      await guiTienDo(`phan-bo/${encodeURIComponent(l.suatId)}/${lenh}`, xayRaLuc ? { xayRaLuc } : {});
      xong();
    },
  });
}

// ---- ADR-0051: "Đã gọi báo" / "Bỏ đánh dấu" ở dòng điểm dừng (V2) ----------------------------------------------------------------------------------------
/** Dòng gọi báo của các chặng có khách LÊN ở điểm này (chặng ↔ điểm qua suất). Nút theo `baoDuoc` / `boDuoc` của máy chủ. */
function goiBaoCua(diemId: string): HTMLElement[] {
  const r = duLieu!;
  const legs = new Set(r.suat.filter((x) => x.diemLen === diemId && x.legId).map((x) => x.legId));
  return (r.goiBao ?? []).filter((g) => legs.has(g.legId)).flatMap((g) => {
    const d = dongGoiBao(g);
    if (!d) return [];
    const nut = d.nut ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-gb-btn", "data-action": d.nut.kieu === "da-goi" ? "da-goi-bao" : "bo-danh-dau", "data-leg": g.legId }, d.nut.nhan) : null;
    const x = d.nut;
    nut?.addEventListener("click", () => void goiBao(g.legId, x!.kieu === "da-goi" ? { url: "da-goi-bao", than: { phienBan: x!.phienBan, gioMoi: (x as { gioMoi: unknown }).gioMoi } } : { url: "bo-danh-dau-goi-bao", than: { phienBan: x!.phienBan } }, nut));
    return [h("span", { class: `dp-gb${g.gioHenDoi ? " is-chua" : ""}`, "data-leg": g.legId }, icon("handset", 14), h("span", null, d.chu), nut)];
  });
}
async function goiBao(legId: string, lenh: { url: string; than: Record<string, unknown> }, nut: HTMLButtonElement): Promise<void> {
  nut.disabled = true;
  try {
    const g = await lenhCho(`/api/van-chuyen/chang/${legId}/${lenh.url}`).gui<GoiBaoChangDto>(`/api/van-chuyen/chang/${encodeURIComponent(legId)}/${lenh.url}`, "POST", lenh.than);
    duLieu = { ...duLieu!, goiBao: (duLieu!.goiBao ?? []).map((x) => (x.legId === legId ? g : x)) };
    xong();
  } catch (e) {
    if (e instanceof ApiError && e.code in NHAN_TU_CHOI_GOI_BAO) xong(dai("warning", NHAN_TU_CHOI_GOI_BAO[e.code as MaTuChoiGoiBao], [], () => location.reload()));
    else {
      const l = docLoiLenh(e);
      xong(dai("danger", l.tieuDe, l.dong));
    }
  }
}

const lenhDiem = taoLenh();
async function capNhatDiem(nut: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  nut.disabled = true;
  try {
    const r = await lenhDiem.gui<CapNhatDiemResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-diem`, "POST", { version: c.version });
    const dangChay = c.trangThai === "RUNNING";
    duLieu = await docLai(r);
    const cau = cauCapNhatDiem(r, dangChay);
    baoCao = dai(cau.tone, cau.tieuDe, cau.dong);
  } catch (e) {
    const l = docLoiLenh(e);
    baoCao = l.cu ? dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi bấm lại."], () => location.reload()) : dai("danger", l.tieuDe, l.dong);
  }
  ve();
  (baoCao ?? trangEl).scrollIntoView({ block: "nearest" });
}

/** Vòng 5e (R-P29): "Cập nhật khách theo đơn" — thân `{ version, requestId }`; phản hồi KHÔNG tên → đọc lại GET (GA-55); lỗi như "Cập nhật điểm theo đơn". */
const lenhKhach = taoLenh();
async function capNhatKhach(nut: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  nut.disabled = true;
  try {
    const r = await lenhKhach.gui<CapNhatKhachResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-khach`, "POST", { version: c.version });
    duLieu = await docLai(r);
    baoCao = r.daCapNhat > 0
      ? dai("ok", "Đã cập nhật khách theo đơn", [`Cập nhật ${r.daCapNhat} chỗ theo khách hiện có của đơn.`])
      : dai("info", "Không có khách nào cần cập nhật", ["Không còn chỗ nào cập nhật được theo đơn. Thừa chỗ mà chỗ nào cũng đã có tên khách thì người xếp xe tự rút bớt."]);
  } catch (e) {
    const l = docLoiLenh(e);
    baoCao = l.cu ? dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi bấm lại."], () => location.reload()) : dai("danger", l.tieuDe, l.dong);
  }
  ve();
  (baoCao ?? trangEl).scrollIntoView({ block: "nearest" });
}

// ---- Đợt 5: chuyến ĐANG CHẠY — "Việc của văn phòng", "Khách đang chờ", "Báo huỷ một suất", "Thêm điểm đón / thêm khách" (bản vẽ V11) ---------------------
/** V11 bảng 11.3 + 11.6: chỉ người có ô trip.dispatch (Kế toán không thấy khối này). Nút "Cứu hộ" (A-1b): cần THÊM ô trip.progress (bấm thay gián đoạn). */
function theViecVanPhong(): HTMLElement | null {
  if (!coDieuPhoi) return null;
  const them = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "them-diem" }, "Thêm điểm đón / thêm khách") as HTMLButtonElement;
  them.addEventListener("click", () => void moThemDiem(them));
  const capNhat = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") as HTMLButtonElement;
  capNhat.addEventListener("click", () => void capNhatDiem(capNhat));
  const cuuHoNut = coTienDo ? (h("button", { type: "button", class: "vc-btn vc-btn-danger", "data-action": "cuu-ho" }, "Cứu hộ") as HTMLButtonElement) : null;
  cuuHoNut?.addEventListener("click", () => moGianDoan(cuuHoNut, true));
  // Gói A5 (ADR-0111 Đ4): văn phòng gửi THAY tài xế đề nghị cứu hộ — xe đang chạy khác tới nơi gặp nhận cả khách trên xe và khách chờ (ô trip.progress).
  const deNghiNut = coTienDo ? (h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "gui-de-nghi-cuu-ho" }, "Gửi đề nghị cứu hộ") as HTMLButtonElement) : null;
  deNghiNut?.addEventListener("click", () => void moGuiCuuHo(deNghiNut));
  return h(
    "section",
    { class: "vc-card dp-viec-vp", "aria-labelledby": "ct-viec-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-viec-title", class: "dp-card-title" }, "Việc của văn phòng")),
    h("div", { class: "dp-viec-vp-nut" }, them, capNhat, deNghiNut, cuuHoNut),
    h("p", { class: "dp-note dp-viec-vp-note" }, "Tài xế nhận tin ngay khi văn phòng thêm khách, báo huỷ hay đổi điểm đón."),
  );
}

/** Gói A5 (V10 — chỉ đọc): đề nghị chuyển khách có chuyến này là xe nhờ hoặc xe nhận; leo thang + ô trip.override → link sang màn duyệt. */
function theDeNghiChuyen(): HTMLElement | null {
  if (!deNghiChuyen.length || !duLieu) return null;
  const ngay = duLieu.chuyen.ngayChay;
  return h(
    "section",
    { class: "vc-card dp-de-nghi-chuyen", "aria-labelledby": "ct-dn-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-dn-title", class: "dp-card-title" }, "Đề nghị chuyển khách"), h("span", { class: "dp-card-note" }, `${deNghiChuyen.length} đề nghị`)),
    ...[...deNghiChuyen].sort((a, b) => b.guiLuc.localeCompare(a.guiLuc)).map((d) => {
      const x = dongDeNghiVanPhong(d, ngay);
      return h(
        "div",
        { class: "dp-kc", "data-de-nghi": d.id },
        h("span", { class: "dp-kc-text" }, h("strong", null, x.tieuDe), h("span", { class: "dp-note" }, x.dong.map(([k, v]) => `${k}: ${v}`).join(" · "))),
        chip(x.chip.nhan, x.chip.tone),
        x.canDuyet && coDuyetDeNghi ? h("a", { class: "btn btn-link", href: `/de-nghi?ngay=${ngay}#dn-${d.id}`, "data-action": "mo-duyet-de-nghi" }, "Mở hộp duyệt") : null,
      );
    }),
  );
}

/** Gói A5 (ADR-0111 Đ4; bản vẽ CH): "Gửi đề nghị cứu hộ" — chọn xe đang chạy khác (đủ chỗ cho khách còn trên xe + chờ đón), gõ nơi gặp, gửi (máy chủ kiểm lại). */
async function moGuiCuuHo(opener: HTMLButtonElement): Promise<void> {
  const r = duLieu!;
  const soKhach = r.suat.filter((s) => (s.loai ?? "PASSENGER") === "PASSENGER" && (s.trangThai === "WAITING" || s.trangThai === "BOARDED")).length;
  opener.disabled = true;
  let ds: XeNhanResponse;
  try {
    ds = await api<XeNhanResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(r.chuyen.id)}/xe-nhan`);
  } catch (e) {
    opener.disabled = false;
    baoCao = dai("danger", loiCua(e));
    return ve();
  }
  opener.disabled = false;
  let chon: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const noiGap = h("input", { id: "ct-noi-gap", class: "vc-input", type: "text", autocomplete: "off", maxlength: "200", "aria-required": "true" }) as HTMLInputElement;
  const guiNut = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: true, "data-action": "cuu-ho-gui" }, "Gửi đề nghị") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const xe = ds.xe.map((x) => ({ x, d: dongXeNhan(x, soKhach) }));
  const duoc = xe.filter((v) => v.d.du);
  const bang = moBangTruot({
    title: "Gửi đề nghị cứu hộ",
    body: [
      h("p", { class: "dp-sheet-text" }, `${r.chuyen.ma}: ${soKhach} khách trên xe và đang chờ đón. Tài xế xe nhận bấm Nhận / Không nhận; văn phòng gửi thay tài xế xe này.`),
      duoc.length
        ? nhomChon("ct-xe-nhan", "Xe đang chạy cùng ngày", duoc.map((v) => ({ code: v.x.tripId, nhan: v.d.nhan, phu: `${v.d.phu} · ${v.d.cho}` })), (c) => {
            chon = c;
            guiNut.disabled = false;
          })
        : h("p", { class: "dp-note" }, `Hôm nay không có xe đang chạy nào khác còn đủ chỗ cho ${soKhach} khách — dùng "Cứu hộ" để kết thúc gián đoạn rồi xếp xe.`),
      ...xe.filter((v) => !v.d.du).map((v) => h("p", { class: "dp-note" }, `${v.d.nhan} — ${v.d.cho}, không đủ chỗ`)),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: "ct-noi-gap" }, "Nơi gặp *"), noiGap),
      loi,
    ],
    foot: [dong, guiNut],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  const lenh = taoLenh();
  guiNut.addEventListener("click", async () => {
    const chu = noiGap.value.trim();
    if (!chon) return;
    if (!chu) {
      replaceChildren(loi, icon("alert", 16, 2), "Nhập nơi gặp để xe nhận tới đón.");
      loi.hidden = false;
      return;
    }
    bang.setBusy(true);
    guiNut.disabled = true;
    loi.hidden = true;
    try {
      const k = await lenh.gui<DeNghiLenhResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(r.chuyen.id)}/cuu-ho`, "POST", { denChuyenId: chon, phamVi: "ONBOARD", noiGap: { chu } });
      bang.close(false);
      baoCao = dai("ok", "Đã gửi đề nghị cứu hộ", [`Chờ tài xế ${k.deNghi.denMaChuyen} trả lời — kết quả hiện ở khối “Đề nghị chuyển khách”.`]);
      await napDeNghi();
      ve();
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), loiCua(e));
      loi.hidden = false;
      guiNut.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/**
 * Bản vẽ CH.2 bản đơn giản (lời chủ 5.2b): khối "Cứu hộ" trên chuyến đã Kết thúc gián đoạn — ô trip.dispatch. Danh sách xe = chuyến cùng ngày của tài xế công
 * ty (bấm để mở chuyến đó rồi "Thêm điểm đón" / "Xếp khách"); xe nhà xe đi "Tạo chuyến cứu hộ". Không km, không form giá (Đợt 4 — nợ).
 */
function theCuuHoKhoi(): HTMLElement | null {
  if (!cuuHo || !duLieu) return null;
  const tieuDe = (chu: string) => h("div", { class: "dp-card-head" }, icon("alert", 16), h("h2", { id: "ct-cuu-ho-title", class: "dp-card-title" }, chu));
  if (cuuHo === "loi") {
    return h("section", { id: "ct-cuu-ho", class: "vc-card dp-cuu-ho", "aria-labelledby": "ct-cuu-ho-title" }, tieuDe("Cứu hộ"), h("p", { class: "dp-note" }, "Chưa tải được danh sách cứu hộ — tải lại trang để thử lại."));
  }
  const t = theCuuHo(cuuHo);
  const ngay = duLieu.chuyen.ngayChay;
  return h(
    "section",
    { id: "ct-cuu-ho", class: "vc-card dp-cuu-ho", "aria-labelledby": "ct-cuu-ho-title" },
    tieuDe(t.tieuDe),
    t.chang.length
      ? h("div", { class: "dp-cuu-ho-nhom" }, h("h3", { class: "dp-cuu-ho-nhan" }, "Chặng cần chuyển"), ...t.chang.map((x) => h("div", { class: "dp-cuu-ho-dong" }, x)))
      : h("p", { class: "dp-note" }, "Khách của chuyến này đã được xếp sang xe khác."),
    t.chang.length
      ? h(
          "div",
          { class: "dp-cuu-ho-nhom" },
          h("h3", { class: "dp-cuu-ho-nhan" }, "Chọn xe cứu hộ"),
          ...(t.xe.length
            ? t.xe.map((x) => h("a", { class: "dp-cuu-ho-xe", href: `/chuyen?id=${encodeURIComponent(x.tripId)}`, "data-action": "cuu-ho-xe" }, h("strong", null, x.nhan), h("span", { class: "dp-note" }, x.phu)))
            : [h("p", { class: "dp-note" }, "Cùng ngày chưa có xe nào của tài xế công ty.")]),
          h("p", { class: "dp-note" }, "Mở xe rồi bấm “Thêm điểm đón / thêm khách” (xe đang chạy) hoặc xếp khách (xe chưa chạy)."),
          h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen-sua?ngay=${ngay}`, "data-action": "tao-chuyen-cuu-ho" }, "Tạo chuyến cứu hộ"),
        )
      : null,
  );
}

/** V11 bảng 11.2: suất khách còn chờ của chuyến đang chạy; link "Báo huỷ" (ô trip.dispatch, suất chưa báo); dòng đã báo: chip + "vẫn chiếm chỗ". */
function theKhachCho(): HTMLElement | null {
  const r = duLieu!;
  const ds = khachDangCho(r.suat, r.diem, r.chuyen.ngayChay);
  if (!ds.length) return null;
  return h(
    "section",
    { class: "vc-card dp-khach-cho-the", "aria-labelledby": "ct-cho-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-cho-title", class: "dp-card-title" }, "Khách đang chờ"), h("span", { class: "dp-card-note" }, `${ds.length} khách`)),
    ...ds.map((k) => {
      const nut = coDieuPhoi && !k.baoHuy ? (h("button", { type: "button", class: "btn btn-link dp-bao-huy-link", "data-action": "bao-huy", "data-suat": k.suatId }, "Báo huỷ") as HTMLButtonElement) : null;
      nut?.addEventListener("click", () => moBaoHuy(k, nut));
      return h(
        "div",
        { class: "dp-kc", "data-suat": k.suatId },
        h("span", { class: "dp-kc-text" }, h("strong", null, k.ten), h("span", { class: "dp-note" }, [k.maDon, k.noiDon].filter(Boolean).join(" · ")),
          k.baoHuy ? h("span", { class: "dp-kc-bh" }, chip(k.baoHuy.nhan, "warn"), h("span", { class: "dp-note" }, k.baoHuy.phu)) : null),
        nut,
      );
    }),
  );
}

const lenhBaoHuy = new Map<string, ReturnType<typeof taoLenh>>();
/** V11 bảng 11.5: hộp "Báo huỷ một suất" — 4 lý do nhóm BAO_HUY_DIEM, không ô chữ; nút Báo huỷ / Quay lại. Chỉ đặt cờ: suất vẫn chiếm chỗ. */
function moBaoHuy(k: KhachChoDong, opener: HTMLButtonElement): void {
  const r = duLieu!;
  let code: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "bao-huy-gui" }, "Báo huỷ") as HTMLButtonElement;
  const quay = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const bang = moBangTruot({
    title: "Báo huỷ một suất",
    body: [
      h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, k.ten), h("div", { class: "dp-note" }, [k.maDon, k.noiDon].filter(Boolean).join(" · "))),
      nhomChon("ct-bao-huy", "Lý do", r.lyDo.filter((l) => l.nhom === "BAO_HUY_DIEM").map((l) => ({ code: l.code, nhan: l.nhan })), (c) => { code = c; gui.disabled = false; }),
      h("p", { class: "dp-note" }, "Thẻ vẫn chiếm chỗ và hiện nhãn “Văn phòng đã báo huỷ” cho tài xế."),
      loi,
    ],
    foot: [quay, gui],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  quay.addEventListener("click", () => bang.close());
  gui.addEventListener("click", async () => {
    if (!code) return;
    bang.setBusy(true);
    gui.disabled = true;
    loi.hidden = true;
    try {
      let l = lenhBaoHuy.get(k.suatId);
      if (!l) lenhBaoHuy.set(k.suatId, (l = taoLenh()));
      const url = `${goc()}/phan-bo/${encodeURIComponent(k.suatId)}/bao-huy`;
      duLieu = await docLai(await l.gui<ChuyenChiTietResponse>(url, "POST", { version: duLieu!.chuyen.version, lyDo: code }));
      bang.close(false);
      xong(dai("ok", `Đã báo huỷ ${k.ten}`, ["Suất vẫn chiếm chỗ cho đến khi tài xế xác nhận “Khách đã huỷ”."]));
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), loiTrongHop(e));
      loi.hidden = false;
      gui.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

const lenhThemDiem = new Map<string, ReturnType<typeof taoLenh>>();
/** Câu dòng khoá cho người không có ô điều chỉnh khẩn cấp (V11 bảng 11.4 — ADR D5.1: không nút "Xin…"; ADR-0104 Đ1: Bán hàng không còn bị khoá). */
const KHOA_THEM_DIEM = "Khách không đặt gấp — cần người xếp xe điều chỉnh khẩn cấp.";
/**
 * V11 bảng 11.4: chọn chặng chờ xếp của ngày chạy (GET /lich), điểm đón chỉ đọc, số khách ≤ người còn lại. Xe đang chạy luôn trong mốc giờ tối thiểu: chặng
 * đặt gấp thêm ngay; chặng khác — người có ô trip.urgent_adjust bấm thì máy chủ trả 409 cần vượt mốc (lớp KHAN_CAP) → hộp "Điều chỉnh khẩn cấp", gửi lại
 * CÙNG lệnh kèm lý do (ADR-0104 Đ1).
 */
async function moThemDiem(opener: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  opener.disabled = true;
  let ds: LuaChonThemDiem[];
  try {
    ds = chonThemDiem(await api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${c.ngayChay}`));
  } catch (e) {
    xong(dai("danger", loiCua(e)));
    return;
  } finally {
    opener.disabled = false;
  }
  let chon: LuaChonThemDiem | null = null;
  let so = 0;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "vc-btn btn btn-primary", disabled: true, "data-action": "them-diem-gui" }, "Thêm vào chuyến") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const noiDon = h("div", { class: "dp-them-noi", "aria-live": "polite" }, "Chọn chặng để xem điểm đón.");
  const khoa = h("div", { class: "dg-lock dp-them-khoa", hidden: true }, icon("lock", 14), KHOA_THEM_DIEM);
  const dem = counter({ label: "Số khách", value: 0, onChange: (n) => { so = n; capNhat(); } });
  function capNhat(): void {
    const quaSo = !!chon && (so < 1 || so > chon.conLai);
    dem.setInvalid(quaSo);
    const biKhoa = !!chon && !chon.datGap && !coKhanCap;
    khoa.hidden = !biKhoa;
    gui.disabled = !chon || quaSo || biKhoa;
  }
  const bang = moBangTruot({
    title: "Thêm điểm đón / thêm khách",
    body: ds.length
      ? [
          h("p", { class: "dp-sheet-text" }, "Chọn chặng đang chờ xếp rồi thêm vào chuyến đang chạy."),
          nhomChon("ct-them-chang", "Chặng chờ xếp", ds.map((x) => ({ code: x.legId, nhan: x.nhan, phu: x.phu })), (id) => {
            chon = ds.find((x) => x.legId === id) ?? null;
            replaceChildren(noiDon, chon?.noiDon ?? "");
            so = chon?.conLai ?? 0;
            dem.set(so);
            capNhat();
          }),
          h("div", { class: "vc-field" }, h("div", { class: "vc-label" }, "Điểm đón"), noiDon),
          h("div", { class: "vc-field" }, h("div", { class: "vc-label" }, "Số khách"), dem.root),
          khoa,
          loi,
        ]
      : [h("p", { class: "dp-sheet-text" }, "Ngày chạy không còn chặng nào chờ xếp.")],
    foot: [dong, gui],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-them-diem");
  dong.addEventListener("click", () => bang.close());
  const guiLenh = async (x: LuaChonThemDiem, soSuat: number, phaLe?: Record<string, { lyDo: string }>): Promise<string> => {
    let l = lenhThemDiem.get(x.legId);
    if (!l) lenhThemDiem.set(x.legId, (l = taoLenh()));
    duLieu = await docLai(await l.gui<ChuyenChiTietResponse>(`${goc()}/them-diem`, "POST", {
      version: duLieu!.chuyen.version, chang: [{ legId: x.legId, soSuat }], ...(phaLe ?? {}),
    }));
    lenhThemDiem.delete(x.legId);
    return `Đã thêm ${soSuat} khách của ${x.nhan.split(" · ")[0]} vào ${duLieu!.chuyen.ma} — tài xế nhận tin ngay.`;
  };
  gui.addEventListener("click", async () => {
    const x = chon;
    if (!x) return;
    const soSuat = so;
    bang.setBusy(true);
    gui.disabled = true;
    loi.hidden = true;
    try {
      const cau = await guiLenh(x, soSuat);
      bang.close(false);
      xong(dai("ok", cau));
    } catch (e) {
      const l = docLoiLenh(e);
      if (l.canPhaLe && l.duocPhaLe) {
        bang.close(false);
        setTimeout(() => moPhaLe({
          lyDo: duLieu!.lyDo, opener, nutChinh: NUT_VUOT.them[l.lop], lop: l.lop,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `Thêm ${soSuat} khách · ${x.nhan}`), h("div", { class: "dp-note" }, l.tieuDe)],
          onXacNhan: async (code) => xong(dai("ok", await guiLenh(x, soSuat, thanPhaLe(l.lyDo.map((m) => m.ma), code, false)))),
        }), 0);
        return;
      }
      replaceChildren(loi, icon("alert", 16, 2), loiTrongHop(e));
      loi.hidden = false;
      gui.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

// ---- Vòng 5b: "Rút khỏi xe" / "Chuyển sang xe khác" trên từng nhóm khách (route 6 `rut`, route 7 `doi` của A13) ----------------------------------------------
// Chủ trả lời lần 15: "Làm ngay, thợ tự đặt nút" — bản vẽ không có chỗ bấm; đặt thẻ "Khách trong chuyến" dưới bảng điểm dừng (lệch bản vẽ D-B2-4). Nút theo ô
// trip.dispatch + chuyến lên kế hoạch; trong vùng khoá (`khoaMoc` của máy chủ) người có ô trip.urgent_adjust (Bán hàng, Quản trị, Toàn quyền — ADR-0104 Đ1)
// bấm được và đi qua hộp "Điều chỉnh khẩn cấp" khi máy chủ đòi (409 `canQuyen` + `lop`, khuôn huỷ chuyến H17); người thiếu ô chỉ thấy câu khoá (không nút).
// Sau mỗi lệnh đọc lại GET chi tiết (GA-55).
function theKhach(): HTMLElement | null {
  const r = duLieu!;
  const c = r.chuyen;
  const ds = nhomKhach(r.suat, r.diem);
  const khoa = c.khoaMoc.dangKhoa;
  const coNut = coDieuPhoi && (!khoa || coKhanCap);
  // T-7: trong vùng khoá trước giờ xuất bến không có nút (khuôn câu khoá của "Rút khỏi xe").
  const nutDiKem = coDieuPhoi && !khoa ? (h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "them-di-kem" }, "Thêm người đi kèm") as HTMLButtonElement) : null;
  nutDiKem?.addEventListener("click", () => void moThemDiKem(nutDiKem));
  if (!ds.length && !nutDiKem) return null;
  return h(
    "section",
    { class: "vc-card dp-khach-nhom-the", "aria-labelledby": "ct-khach-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "ct-khach-title", class: "dp-card-title" }, "Khách trong chuyến"), h("span", { class: "dp-card-note" }, `${c.tai} chỗ`), nutDiKem),
    khoa && coDieuPhoi && !coKhanCap ? h("div", { class: "dg-lock dp-khach-khoa" }, icon("lock", 14), "Trong vùng khoá trước giờ xuất bến — rút hay chuyển khách cần người xếp xe điều chỉnh khẩn cấp.") : null,
    ...ds.map((g) => {
      const nut: HTMLElement[] = [];
      if (coNut) {
        const rut = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-khach-nhom-btn", "data-action": "rut", "data-nhom": g.khoa }, "Rút khỏi xe");
        const doi = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-khach-nhom-btn", "data-action": "doi", "data-nhom": g.khoa }, "Chuyển sang xe khác");
        rut.addEventListener("click", () => moRut(g, rut));
        doi.addEventListener("click", () => void moDoi(g, doi));
        nut.push(rut, doi);
      }
      return h(
        "div",
        { class: "dp-khach-nhom", "data-nhom": g.khoa },
        h("span", { class: "dp-khach-nhom-t" }, h("strong", null, g.tieuDe), g.tuyen ? h("span", { class: "dp-khach-nhom-tuyen" }, g.tuyen) : null),
        h("span", { class: "dp-khach-nhom-ten" }, g.ten),
        nut.length ? h("span", { class: "dp-khach-nhom-nut" }, ...nut) : null,
      );
    }),
  );
}

/** Lời chủ 2026-10-01 ("Chỉ hướng dẫn viên"): gắn MỘT hướng dẫn viên làm người đi kèm — chọn từ GET /huong-dan-vien, gửi `nguoiDiKem` qua route xếp. */
const lenhDiKem = taoLenh();
async function moThemDiKem(opener: HTMLButtonElement): Promise<void> {
  let ds: HuongDanVienListResponse["nguoi"];
  try {
    // Ẩn người ĐÃ gắn vào chuyến này (suất CREW đang mở) — danh sách chuyến chỉ có tên nên so theo tên (chỉ bề mặt; máy chủ giữ nguyên luật).
    const daGan = new Set(duLieu!.suat.filter((x) => x.loai === "CREW" && x.tenNguoiDiKem).map((x) => x.tenNguoiDiKem));
    ds = (await api<HuongDanVienListResponse>("/api/van-chuyen/huong-dan-vien")).nguoi.filter((x) => !daGan.has(x.ten));
  } catch (e) {
    xong(dai("danger", "Chưa tải được danh sách hướng dẫn viên", docLoiLenh(e).dong));
    return;
  }
  let chon: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "vc-btn btn btn-primary", disabled: true, "data-action": "di-kem-gui" }, "Gắn lên xe") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: "Thêm người đi kèm",
    body: ds.length
      ? [nhomChon("ct-di-kem", "Hướng dẫn viên", ds.map((x) => ({ code: x.partyId, nhan: x.ten })), (c) => { chon = c; gui.disabled = false; }), loi]
      : [h("p", { class: "dp-sheet-text" }, "Không còn hướng dẫn viên nào để thêm: mọi hướng dẫn viên đang hoạt động đã đi kèm chuyến này.")],
    foot: [dong, gui],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  gui.addEventListener("click", async () => {
    if (!chon) return;
    bang.setBusy(true);
    try {
      const url = `/api/van-chuyen/chuyen/${encodeURIComponent(duLieu!.chuyen.id)}/phan-bo`;
      duLieu = await docLai(await lenhDiKem.gui<ChuyenChiTietResponse>(url, "POST", { version: duLieu!.chuyen.version, nguoiDiKem: [chon] }));
      bang.close(false);
      xong(dai("ok", "Đã gắn người đi kèm"));
    } catch (e) {
      bang.setBusy(false);
      const l = docLoiLenh(e);
      replaceChildren(loi, [l.tieuDe, ...l.dong].join(" "));
      loi.hidden = false;
    }
  });
}

const lenhRut = new Map<string, ReturnType<typeof taoLenh>>();
const lenhCua = (khoa: string) => {
  let l = lenhRut.get(khoa);
  if (!l) lenhRut.set(khoa, (l = taoLenh()));
  return l;
};
/** Lỗi của rút / chuyển trong hộp: `stale` → câu chung + Tải lại (H10); còn lại câu máy chủ + từng lý do (chéo xe / tài xế, hết chỗ… — tiếng Việt của máy chủ). */
const loiTrongHop = (e: unknown): string => {
  const l = docLoiLenh(e);
  return l.cu ? "Chuyến vừa được người khác sửa — đóng hộp, tải lại rồi làm lại." : [l.tieuDe, ...l.dong].join(" ");
};

/**
 * Hộp xác nhận chung (rút / chuyển): tóm tắt nhóm, phần riêng, nút chính; `gui(phaLe?)` ném lỗi → câu trong hộp; 409 cần vượt + đủ ô → hộp vượt luật (chữ
 * theo `lop` — ADR-0104 Đ1; `nutVuot` = khoá của bảng NUT_VUOT).
 */
function hopLenh(o: { tieuDe: string; g: NhomKhach; them: Child[]; nutChinh: string; nutLop: string; khoaNut?: boolean; nutVuot: keyof typeof NUT_VUOT; opener: HTMLElement; gui: (phaLe?: Record<string, { lyDo: string }>) => Promise<string> }): { nut: HTMLButtonElement } | null {
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: `vc-btn ${o.nutLop}`, disabled: !!o.khoaNut, "data-action": "khach-gui" }, o.nutChinh);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: o.tieuDe,
    body: [h("div", { class: "dp-sheet-sum" }, h("div", { class: "dp-sheet-sum-title" }, o.g.tieuDe), o.g.tuyen ? h("div", { class: "dp-note" }, o.g.tuyen) : null, h("div", { class: "dp-note" }, o.g.ten)), ...o.them, loi],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener: o.opener,
  });
  if (!bang) return null;
  bang.dialog.classList.add("dp-sheet-khach");
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    bang.setBusy(true);
    chinh.disabled = true;
    loi.hidden = true;
    try {
      const baoCaoMoi = await o.gui();
      bang.close(false);
      xong(dai("ok", baoCaoMoi));
    } catch (e) {
      const l = docLoiLenh(e);
      if (l.canPhaLe && l.duocPhaLe) {
        bang.close(false);
        setTimeout(() => moPhaLe({
          lyDo: duLieu!.lyDo, opener: o.opener, nutChinh: NUT_VUOT[o.nutVuot][l.lop], lop: l.lop,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `${o.tieuDe} · ${o.g.tieuDe}`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: async (code) => xong(dai("ok", await o.gui(thanPhaLe(l.lyDo.map((m) => m.ma), code, false)))),
        }), 0);
        return;
      }
      replaceChildren(loi, icon("alert", 16, 2), loiTrongHop(e));
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
  return { nut: chinh };
}

function moRut(g: NhomKhach, opener: HTMLElement): void {
  const c = duLieu!.chuyen;
  hopLenh({
    tieuDe: "Rút khỏi xe", g, opener, nutChinh: "Rút khỏi xe", nutLop: "vc-btn-danger", nutVuot: "rut",
    them: [h("p", { class: "dp-sheet-text" }, `${g.suatIds.length} khách trở về cột “Chưa xếp” của Điều phối xe. Điểm dừng không còn khách sẽ bỏ qua.`)],
    gui: async (phaLe) => {
      const url = `/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/rut`;
      duLieu = await docLai(await lenhCua(`rut:${g.khoa}`).gui<ChuyenChiTietResponse>(url, "POST", { version: duLieu!.chuyen.version, suatIds: g.suatIds, ...(phaLe ?? {}) }));
      return `Đã rút ${g.suatIds.length} khách khỏi ${c.ma} — về cột “Chưa xếp”.`;
    },
  });
}

/** "Chuyển sang xe khác": chuyến đích = chuyến lên kế hoạch CÙNG NGÀY theo lịch máy chủ trả (GET /lich), trừ chuyến này. */
async function moDoi(g: NhomKhach, opener: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  opener.disabled = true;
  let lich: LichChungResponse;
  try {
    lich = await api<LichChungResponse>(`/api/van-chuyen/lich?ngay=${c.ngayChay}`);
  } catch (e) {
    xong(dai("danger", loiCua(e)));
    return;
  } finally {
    opener.disabled = false;
  }
  const ds = chuyenXepDuoc(lich).filter((x) => x.chuyen.id !== c.id);
  let den: string | null = null;
  const chon = ds.length
    ? nhomChon("ct-doi-chuyen", "Chuyến đích", ds.map((x) => ({ code: x.chuyen.id, nhan: x.nhan, phu: x.khoa ? "đang khoá" : undefined })), (id) => {
        den = id;
        if (hop) hop.nut.disabled = false;
      })
    : h("p", { class: "dp-sheet-text" }, "Ngày này không còn chuyến nào lên kế hoạch để chuyển sang.");
  const hop = hopLenh({
    tieuDe: "Chuyển sang xe khác", g, opener, nutChinh: "Chuyển khách", nutLop: "btn btn-primary", khoaNut: true, nutVuot: "chuyen",
    them: [chon],
    gui: async (phaLe) => {
      const dich = ds.find((x) => x.chuyen.id === den)!.chuyen;
      const url = `/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/doi`;
      duLieu = await docLai(await lenhCua(`doi:${g.khoa}`).gui<ChuyenChiTietResponse>(url, "POST", {
        version: duLieu!.chuyen.version, denChuyenId: dich.id, denVersion: dich.version, suatIds: g.suatIds, ...(phaLe ?? {}),
      }));
      return `Đã chuyển ${g.suatIds.length} khách sang ${dich.ma} (${dich.xe.bienSo}).`;
    },
  });
}

const lenhHuy = taoLenh();
function huy(nut: HTMLButtonElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  const gui = async (lyDo: string, phaLe?: string) => {
    const kq = await lenhHuy.gui<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/huy`, "POST", { version: c.version, lyDo, ...(phaLe ? { phaLe: { lyDo: phaLe } } : {}) });
    duLieu = await docLai(kq);
    baoCao = dai("info", "Đã huỷ chuyến", [c.tai > 0 ? "Khách trong chuyến đã trở về cột “Chưa xếp”." : "Chuyến không bị xoá, vẫn xem được trong nhật ký."]);
    ve();
  };
  moHuyChuyen({
    ma: c.ma, soKhach: c.tai, lyDo: r.lyDo, opener: nut,
    onXacNhan: async (code) => {
      try {
        await gui(code);
      } catch (e) {
        const l = docLoiLenh(e);
        if (l.cu) {
          baoCao = dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi làm lại."], () => location.reload());
          ve();
          return;
        }
        if (!(l.canPhaLe && l.duocPhaLe)) throw e;
        // H17: huỷ chuyến trong vùng khoá khi còn khách → vượt mốc (khuôn 1f) — ADR-0104 Đ1: luôn lớp điều chỉnh khẩn cấp (chữ theo `lop` của 409).
        setTimeout(() => moPhaLe({
          lyDo: r.lyDo, opener: nut, nutChinh: NUT_VUOT.huy[l.lop], lop: l.lop,
          tomTat: [h("div", { class: "dp-sheet-sum-title" }, `Huỷ ${c.ma} · ${c.tai} khách`), h("div", { class: "dp-note" }, l.lyDo.map((x) => x.loiNhan).join("; "))],
          onXacNhan: (p) => gui(code, p),
        }), 0);
      }
    },
  });
}

async function main(): Promise<void> {
  if (!can(staff, "trip.view")) return showError(errorEl, "Tài khoản này không xem được lịch xe.");
  if (!id) return showError(errorEl, "Thiếu mã chuyến.");
  try {
    await nap();
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  ve();
}
await main();

/** ADR-0052 D6.4: đang mở bảng trượt / hộp (khuôn `.sheet[role=dialog]`) thì KHÔNG tự dựng lại trang dưới tay người dùng — lần nối lại / tin sau sẽ tải. */
const bangDangMo = (): boolean => document.querySelector('.sheet[role="dialog"]') !== null;
// ADR-0052 D6.4: tin Bảng tin về ĐÚNG chuyến đang xem (theo mã chuyến) → tải lại + vẽ lại; nối lại Bảng tin → tải lại. Trang chưa tải được thì thôi.
const lamMoi = taoBoLamMoi(async () => {
  if (!duLieu || bangDangMo()) return;
  try {
    await nap();
  } catch (e) {
    trangEl.hidden = true; // chuyến không còn mở được (bị đổi ra, không còn quyền) — không để màn cũ trông như còn đúng
    return showError(errorEl, loiCua(e));
  }
  // Vòng sửa 1 (T2): tải lại được (vd sau một lần lỗi mạng) thì hiện lại trang, ẩn câu lỗi cũ.
  trangEl.hidden = false;
  showError(errorEl, null);
  ve();
});
window.addEventListener("chuyen-thay-doi", (ev) => {
  // Gói A5: tin của xe kia trong một đề nghị (xe nhận đã nhận / không nhận…) cũng đọc lại — mã chuyến nằm trong khối "Đề nghị chuyển khách".
  const lienQuan = new Set([duLieu?.chuyen.ma, ...deNghiChuyen.flatMap((d) => [d.tuMaChuyen, d.denMaChuyen])]);
  if ((ev as CustomEvent<SuKienChuyen[]>).detail.some((e) => lienQuan.has(e.maChuyen))) void lamMoi.yeuCau();
});
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
