// Một chuyến của TÀI XẾ (/cuoc-chuyen?id=) — ADR-0049 V6 Chuyến đang chạy (route 20–29) + V7 Xuất bến; bản vẽ docs/design/van-chuyen-dieu-phoi/project/05
// (5a, 5b), 06 (6b, 6c); bản đối chiếu 2.5, H15; ruling R-P11, R-P17; lệnh điều phối vòng 3.
// - Chưa xuất bến: CHỈ điều kiện CÒN THIẾU, mỗi dòng "(văn phòng lo)"; đạt hết → "Đủ điều kiện xuất bến" (không hạn giấy tờ, không số giấy tờ); nút "Xuất bến"
//   dính đáy, khoá khi còn thiếu. Tài xế tự bấm: KHÔNG ô "xảy ra lúc" — giờ là lúc bấm (máy chủ từ chối `xayRaLuc` từ route tài xế).
// - Đang chạy: thẻ từng điểm (đón: khách + Đã đón / Vắng / Khách đã huỷ; trả: "Đã trả"), liên hệ của đơn (CHỈ từ GET — phản hồi lệnh không kèm, màn giữ
//   `lienHe` của lần GET; không lưu vào bộ nhớ trình duyệt), đổi thứ tự điểm chưa tới bằng nút lên / xuống (không ô giờ), "Kết thúc chuyến", "Kết thúc gián
//   đoạn" (chọn lý do; KHÔNG ô ghi chú — chủ Q1).
// - HT-03 (kiểm theo vai 2/10 — V1.3): "Xuất bến" mở bảng trượt xác nhận (mã chuyến, ngày chạy, giờ dự kiến, biển số, số khách — `hopXuatBen`); ngày chạy
//   khác hôm nay → dòng cảnh báo đỏ trên trang VÀ trong hộp (`canhBaoNgayChay`, chung với văn phòng). Không dùng confirm() của trình duyệt.
// - Kiểu A (V1.4): "Đã trả" cả điểm và "Kết thúc chuyến" cũng qua bảng trượt xác nhận (`hopTraCaDiem`, `hopKetThuc`); lệnh suất một chạm (Đã đón / Vắng /
//   Khách đã huỷ / người đi kèm) giữ một chạm nhưng hiện ngay "Vừa ghi … — Sai? Báo văn phòng." dưới dòng đó (`dongVuaGhi`).
// - Đợt 5 (bản vẽ V6 bổ sung): điểm văn phòng thêm khi xe chạy → dải "Văn phòng vừa thêm điểm" (giờ đón + tổng khách — lời chủ 5.3) tới khi bấm "Đã xem"
//   (máy này nhớ, `localStorage` bọc try/catch); chip "Mới thêm" / "Văn phòng đã báo huỷ — vẫn tới điểm" ở `veDiemChay`.
// - Mất mạng: dòng đó "Chưa gửi được" + "Bấm lại" (CÙNG requestId — bấm lại hai lần vẫn một lệnh); máy KHÔNG tự gửi lại (lệnh điều phối, khác câu 5a).
//   C55 (đánh giá ERP 7/10): lần tải NỀN hỏng chỉ ẩn trang khi 403 / 404 (`loiTaiNenAnTrang`); mất mạng / lỗi máy chủ GIỮ dữ liệu đang có (chỉ bộ nhớ trang
//   — ADR-0053 D7.2) và hiện dải "Mất mạng — dữ liệu lúc HH:MM" (`daiMatMang`) có nút "Tải lại".
// - Việc 9 gói A+C (đánh giá ERP 7/10, C2): ĐANG CHẠY vẽ cho người đang lái — "Điểm kế tiếp" (một thẻ), "Các điểm sau", "Đã xong (N điểm)" thu gọn (`nhomDiemChay`) và MỘT
//   nút chính dính đáy `#cc-day` (`viecChinh`: Đã tới / Đã đón N khách / Đã trả / Kết thúc chuyến — mỗi nút một chỗ, thẻ không vẽ trùng) (C54); "Đã đón N khách" = hộp
//   xác nhận + lệnh "Đã đón" có sẵn gửi lần lượt, đọc lại một lần (C53); `dangGui` khoá mọi nút ở trạng thái vẽ khi một lệnh còn bay (C56); nút Kết thúc theo `xetKetThuc`,
//   MỘT hàm với máy chủ (C57); đồng hồ chờ "Đã chờ N phút" chỉ hiển thị (C59); không nút nổi "Hỗ trợ" khi chạy (`body.cc-dang-chay`) (C61). Điểm xong không còn dòng khách /
//   liên hệ (đã thu gọn). Kịch bản: docs/evidence/2026-10-12-c2/kich-ban/c2-man-tai-xe-smoke.mjs.
// - ADR-0105 (G13, G18-A): nhóm "Chỉ đường" ở điểm chưa xong (PENDING / ARRIVED) của chuyến kế hoạch / đang chạy, chỉ khi DTO có `diaChiChiDuong` (GET trong
//   ngày chạy); Google Maps mọi máy, Apple Maps chỉ máy Apple (`nutChiDuongCuaDiem`, src/shared/chi-duong.ts). Liên kết `<a>` mở tab mới, `noreferrer noopener`;
//   trang không đọc vị trí. Đọc lại GET sau lệnh hỏng → giữ chuỗi đích của lần GET trước (`giuChiDuong`).
// - A4 T9 (ADR-0053 D7.2, D8; G-A4-16): chuyến CHƯA chạy của người có vế hạn (tài xế đối tác) — dải hạn Từ chối (`daiHanTuChoi`, src/shared/tu-choi-man.ts);
//   nút "Từ chối chuyến" hiện CHỈ theo cờ máy chủ `tuChoiDuoc`; tấm Từ chối (lý do nhóm Từ chối chuyến, "Xác nhận từ chối"); quá hạn, hoặc (ADR-0113 Đ3) chuyến có khách chuyển từ xe khác sang (`chanTuChoi`) → dải cảnh báo + "Gọi văn phòng" (`tel:`,
//   ẩn khi chưa có số); thẻ "thấy tên khách và mã đơn từ …" (`thayKhachTu`). Cờ `trongNgayChay` của DTO nay mang nghĩa "trong khung xem khách" (G-A4-6).
// - ADR-0111 (gói A5 T13; bản vẽ "Điều phối xe đang chạy" V8, V9): ô trip.transfer — "Nhờ xe khác đón" ở điểm đón chưa tới (đề nghị STOP), "Chuyển khách sang
//   xe khác" cạnh "Kết thúc gián đoạn" (cứu hộ ONBOARD, có nơi gặp); thẻ đề nghị gửi đi (đếm ngược, Rút lại) và gửi tới (đếm ngược, Nhận / Không nhận). Đếm
//   ngược theo `hanLuc` máy chủ gửi; hết giờ thì đọc lại danh sách. Thẻ không tên khách (LC-18). Chữ: src/shared/xe-dang-chay-man.ts.
import { CAU_THU_TU_DAO, buocDiem, doiThuTuDuoc, giuTenKhach, chiSuatKhach, soHieuTaiDiemDon, tenNguoiDiKemCuaChuyen, viecNguoiDiKem, type BuocDiem } from "../src/shared/tien-do-man";
import type { CuocChiTietResponse, DeNghiCuaToiResponse, DeNghiDto, DeNghiLenhResponse, XeNhanResponse } from "../src/shared/contracts";
import { coCuocCuaToi } from "../src/shared/start-page";
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, nhomChon, taoLenh } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";
import { daiMatMang, loiTaiNenAnTrang, taoBoLamMoi } from "./lam-moi-logic";
import type { SuKienChuyen } from "../src/shared/bang-tin";
import { cauLoiTienDo, dongMoc, veDiemChay, type LenhDiem } from "./tien-do-ui";
import { msToVnLocal, ngayNgan, vnToday } from "../src/shared/vn-date";
import { canhBaoNgayChay, hopXuatBen } from "../src/shared/xac-nhan-xuat-ben";
import { demNguoc, diemMoiChuaXem, dongXeNhan, nhoDonDuoc, suatCuaKhach, theGuiDi, theGuiToi, type SuatTenDong, type TheDeNghi } from "../src/shared/xe-dang-chay-man";
import { can } from "../src/shared/permissions";
import { chiThieuTenTuLam, hauToDieuKienTaiXe } from "../src/shared/dieu-phoi-hien-thi";
import { dongVuaGhi, dongVuaGhiNhieu, hopDonTatCa, hopKetThuc, hopTraCaDiem, type HopXacNhan, type LenhVuaGhi } from "../src/shared/xac-nhan-tien-do";
import { xetKetThuc } from "../src/shared/ket-thuc-chuyen";
import { cauChuaKetThuc, nhomDiemChay, viecChinh, type ViecChinh } from "../src/shared/diem-ke-tiep";
import { cauChoVang } from "../src/shared/cho-vang";
import { giuChiDuong, nutChiDuongCuaDiem } from "../src/shared/chi-duong";
import { cauThayKhach, daiHanTuChoi, loiTuChoi } from "../src/shared/tu-choi-man";

const errorEl = byId("error");
const trangEl = byId("cc-trang");
const dayEl = byId("cc-day");
const id = new URLSearchParams(location.search).get("id") ?? "";
const goc = `/api/van-chuyen/cuoc-cua-toi/${encodeURIComponent(id)}`;

let duLieu: CuocChiTietResponse | null = null;
/** Liên hệ của đơn — CHỈ từ GET trong ngày chạy; lệnh tiến độ không trả lại khoá này (R-P11). Chỉ giữ trong bộ nhớ trang. */
let lienHe: NonNullable<CuocChiTietResponse["lienHe"]> = [];
/** Lúc của lần tải chi tiết thành công cuối (đồng hồ máy). */
let napLuc: number | null = null;
/** C55: lần tải nền sau `napLuc` hỏng (không phải 403 / 404) — trang đang hiện dữ liệu cũ. `null` = dữ liệu mới. Chỉ trong bộ nhớ trang. */
let duLieuCu: { luc: number; matMang: boolean } | null = null;
let baoCao: HTMLElement | null = null;
/** Kiểu A (V1.4): lệnh suất một chạm vừa ghi xong — dòng "Vừa ghi …" dưới đúng dòng khách / người đi kèm; lệnh kế tiếp xoá. Chỉ trong bộ nhớ trang. */
let vuaGhi: { suatId: string; cau: string } | null = null;
/** Việc chưa gửi được (mất mạng): khoá dòng → hàm gửi lại (cùng thân ⇒ cùng requestId qua `taoLenh`). */
const choGui = new Map<string, () => Promise<void>>();
const cacLenh = new Map<string, ReturnType<typeof taoLenh>>();
const gui = async (duoi: string, than: Record<string, unknown> = {}): Promise<void> => {
  const url = `${goc}/${duoi}`;
  let l = cacLenh.get(url);
  if (!l) cacLenh.set(url, (l = taoLenh()));
  const r = await l.gui<CuocChiTietResponse>(url, "POST", than);
  // GA-55 (máy chủ A18): phản hồi lệnh tiến độ KHÔNG còn tên khách, liên hệ — đọc lại GET chi tiết (route duy nhất trả tên trong ngày chạy); đọc lại
  // hỏng (mất mạng) thì giữ tên đã có theo id suất và liên hệ của lần GET trước.
  try {
    await nap();
  } catch {
    duLieu = giuChiDuong(giuTenKhach(r, duLieu), duLieu);
  }
};

async function nap(): Promise<void> {
  duLieu = await api<CuocChiTietResponse>(goc);
  lienHe = duLieu.lienHe ?? [];
  napLuc = Date.now();
  duLieuCu = null;
  await napDeNghi();
}

// ---- Chuyển khách giữa hai xe (ADR-0111; bản vẽ V8, V9 — gói A5 T13) ---------------------------------------------------------------------------------
/** Ô trip.transfer (đặt ở `main`); máy chủ vẫn kiểm chuyến mình đang lái. */
let coChuyenKhach = false;
/** Đề nghị của CHUYẾN NÀY (gửi đi / gửi tới) + lý do Không nhận — chỉ bộ nhớ trang. Đọc hỏng thì giữ lần trước (khối đề nghị không làm hỏng màn chạy). */
let deNghi: DeNghiCuaToiResponse | null = null;
async function napDeNghi(): Promise<void> {
  if (!coChuyenKhach) return;
  try {
    const r = await api<DeNghiCuaToiResponse>("/api/van-chuyen/de-nghi-cua-toi");
    deNghi = { guiDi: r.guiDi.filter((d) => d.tuChuyenId === id), guiToi: r.guiToi.filter((d) => d.denChuyenId === id), lyDo: r.lyDo };
  } catch {
    /* giữ danh sách lần trước */
  }
}
const TONE_DAI: Record<TheDeNghi["tone"], "info" | "ok" | "danger" | "warning"> = { info: "info", ok: "ok", bad: "danger", end: "info", warn: "warning" };
/** Một thẻ đề nghị (dải có tiêu đề + dòng + đếm ngược + nút). */
function theDeNghi(d: DeNghiDto, t: TheDeNghi, nut: HTMLElement[]): HTMLElement {
  const dem = t.demNguoc ? h("p", { class: "dp-note", "data-han": d.hanLuc }, h("strong", { "data-dem": "" }, demNguoc(d.hanLuc, Date.now()) ?? "00:00"), " còn lại để trả lời") : null;
  return dai(TONE_DAI[t.tone], t.tieuDe, [...t.dong.map(([k, v]) => `${k}: ${v}`), ...(t.cau ? [t.cau] : [])], undefined, [
    dem, nut.length ? h("div", { class: "banner-actions" }, ...nut) : null,
  ]);
}
/** V9: đề nghị gửi tới chuyến này — Chờ lên đầu; đã đóng chỉ giữ lần gần nhất mỗi đề nghị (danh sách trong ngày). */
function khoiDeNghiToi(): HTMLElement[] {
  if (!deNghi || duLieu!.chuyen.trangThai === "ENDED" || duLieu!.chuyen.trangThai === "ENDED_INTERRUPTED") return [];
  return [...deNghi.guiToi].sort((a, b) => Number(b.trangThai === "PENDING") - Number(a.trangThai === "PENDING") || b.guiLuc.localeCompare(a.guiLuc)).map((d) => {
    const t = theGuiToi(d);
    const nut: HTMLElement[] = [];
    if (t.coNhan) {
      const nhan = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "de-nghi-nhan", "data-de-nghi": d.id }, "Nhận") as HTMLButtonElement;
      const khong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "de-nghi-khong-nhan", "data-de-nghi": d.id }, "Không nhận") as HTMLButtonElement;
      nhan.addEventListener("click", () => void lenhDeNghi(nhan, `/api/van-chuyen/de-nghi/${encodeURIComponent(d.id)}/nhan`, {}));
      khong.addEventListener("click", () => moKhongNhan(khong, d));
      nut.push(nhan, khong);
    }
    return theDeNghi(d, t, nut);
  });
}
/** V8 4, 5: đề nghị chuyến này đã gửi — Chờ (Rút lại) và kết quả. */
function khoiDeNghiDi(): HTMLElement[] {
  if (!deNghi) return [];
  const chay = duLieu!.chuyen.trangThai === "RUNNING";
  return [...deNghi.guiDi].sort((a, b) => b.guiLuc.localeCompare(a.guiLuc)).map((d) => {
    const t = theGuiDi(d);
    const nut: HTMLElement[] = [];
    if (t.coRut && chay) {
      const rut = h("button", { type: "button", class: "vc-btn vc-btn-stop", "data-action": "de-nghi-rut", "data-de-nghi": d.id }, "Rút lại") as HTMLButtonElement;
      rut.addEventListener("click", () => void lenhDeNghi(rut, `/api/van-chuyen/de-nghi/${encodeURIComponent(d.id)}/rut`, {}));
      nut.push(rut);
    }
    return theDeNghi(d, t, nut);
  });
}
const lenhDeNghiCua = new Map<string, ReturnType<typeof taoLenh>>();
const CAU_KET_QUA: Record<DeNghiLenhResponse["ketQua"], [("ok" | "info" | "warning"), string, string[]]> = {
  DA_GUI: ["ok", "Đã gửi đề nghị", ["Xe nhận trả lời trong giờ chờ; hết giờ mà chưa ai trả lời thì khách vẫn ở chuyến của bạn."]],
  DA_RUT: ["info", "Đã rút đề nghị", []],
  KHONG_NHAN: ["info", "Đã báo không nhận", ["Tài xế xe nhờ nhận được lý do."]],
  DA_CHUYEN: ["ok", "Đã nhận khách", ["Khách đã vào chuyến của bạn — xem điểm đón mới bên dưới."]],
  LEO_THANG: ["warning", "Chờ văn phòng duyệt", ["Đề nghị vượt giới hạn cấu hình. Khách chưa vào chuyến của bạn cho đến khi văn phòng duyệt."]],
  HET_HAN: ["info", "Đề nghị đã hết giờ chờ", ["Không ghi gì thêm — khách vẫn ở xe nhờ."]],
  DA_BAC: ["info", "Văn phòng không duyệt", []],
};
/** Một lệnh đề nghị (Nhận / Rút / Không nhận): CÙNG requestId khi bấm lại sau mất mạng (`taoLenh`); xong đọc lại chi tiết + danh sách. */
async function lenhDeNghi(nut: HTMLButtonElement, url: string, than: Record<string, unknown>): Promise<boolean> {
  nut.disabled = true;
  let l = lenhDeNghiCua.get(url);
  if (!l) lenhDeNghiCua.set(url, (l = taoLenh()));
  try {
    const r = await l.gui<DeNghiLenhResponse>(url, "POST", than);
    lenhDeNghiCua.delete(url);
    const [tone, tieuDe, dong] = CAU_KET_QUA[r.ketQua];
    baoCao = dai(tone, tieuDe, dong);
    await nap().catch(() => undefined);
    ve();
    return true;
  } catch (e) {
    baoCao = dai("danger", loiCua(e));
    await napDeNghi();
    ve();
    return false;
  }
}
/** V9 2: Không nhận → chọn lý do (nhóm Không nhận của danh mục) → gửi. */
function moKhongNhan(opener: HTMLElement, d: DeNghiDto): void {
  let lyDo: string | null = null;
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-primary", disabled: true, "data-action": "khong-nhan-gui" }, "Gửi lý do") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const bang = moBangTruot({
    title: "Không nhận đề nghị",
    body: [
      h("p", { class: "dp-sheet-text" }, `Chọn lý do để báo lại tài xế chuyến ${d.tuMaChuyen}.`),
      nhomChon("cc-kn", "Lý do không nhận", (deNghi?.lyDo ?? []).map((x) => ({ code: x.code, nhan: x.nhan })), (c) => {
        lyDo = c;
        chinh.disabled = false;
      }),
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!lyDo) return;
    bang.setBusy(true);
    bang.close(false);
    await lenhDeNghi(chinh, `/api/van-chuyen/de-nghi/${encodeURIComponent(d.id)}/khong-nhan`, { lyDo });
  });
}
/**
 * V8 2–3: "Nhờ xe khác đón" (STOP — một điểm đón chưa tới) / "Chuyển khách sang xe khác" (ONBOARD — cứu hộ, cần nơi gặp). Chọn xe cùng ngày (máy chủ lọc: STOP
 * xe kế hoạch / đang chạy, ONBOARD chỉ xe đang chạy), ONBOARD gõ nơi gặp, rồi Gửi. Xe không đủ chỗ cho số khách bị khoá (máy chủ vẫn kiểm lại khi nhận).
 */
async function moNhoXe(opener: HTMLButtonElement, o: { phamVi: "STOP" | "ONBOARD"; diemId: string | null; tenNoi: string | null; soKhach: number }): Promise<void> {
  opener.disabled = true;
  let ds: XeNhanResponse;
  try {
    ds = await api<XeNhanResponse>(`${goc}/xe-nhan?phamVi=${o.phamVi}`);
  } catch (e) {
    opener.disabled = false;
    baoCao = dai("danger", loiCua(e));
    return ve();
  }
  opener.disabled = false;
  let chon: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const noiGap = o.phamVi === "ONBOARD" ? (h("input", { id: "cc-noi-gap", class: "vc-input", type: "text", autocomplete: "off", maxlength: "200", "aria-required": "true" }) as HTMLInputElement) : null;
  const guiNut = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: true, "data-action": "de-nghi-gui" }, "Gửi đề nghị") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const xe = ds.xe.map((x) => ({ x, d: dongXeNhan(x, o.soKhach) }));
  const duoc = xe.filter((v) => v.d.du);
  const bang = moBangTruot({
    title: o.phamVi === "STOP" ? "Nhờ xe khác đón" : "Chuyển khách sang xe khác",
    body: [
      h("p", { class: "dp-sheet-text" }, o.phamVi === "STOP" ? `${o.tenNoi ?? "Điểm đón"} · ${o.soKhach} khách` : `${o.soKhach} khách trên xe và đang chờ đón`),
      duoc.length
        ? nhomChon("cc-xe-nhan", "Xe cùng ngày", duoc.map((v) => ({ code: v.x.tripId, nhan: v.d.nhan, phu: `${v.d.phu} · ${v.d.cho}` })), (c) => {
            chon = c;
            guiNut.disabled = false;
          })
        : h("p", { class: "dp-note" }, `Hôm nay không có xe nào khác còn đủ chỗ cho ${o.soKhach} khách.`),
      ...xe.filter((v) => !v.d.du).map((v) => h("p", { class: "dp-note" }, `${v.d.nhan} — ${v.d.cho}, không đủ chỗ`)),
      noiGap ? h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: "cc-noi-gap" }, "Nơi gặp *"), noiGap) : null,
      h("p", { class: "dp-note" }, "Hết giờ chờ mà chưa ai trả lời thì khách vẫn ở chuyến của bạn."),
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
    if (!chon) return;
    const chu = noiGap?.value.trim() ?? "";
    if (noiGap && !chu) {
      replaceChildren(loi, icon("alert", 16, 2), "Nhập nơi gặp để xe nhận tới đón.");
      loi.hidden = false;
      return;
    }
    bang.setBusy(true);
    guiNut.disabled = true;
    loi.hidden = true;
    try {
      const r = await lenh.gui<DeNghiLenhResponse>(`${goc}/de-nghi`, "POST", {
        denChuyenId: chon, phamVi: o.phamVi, ...(o.diemId ? { diemId: o.diemId } : {}), ...(noiGap ? { noiGap: { chu } } : {}),
      });
      bang.close(false);
      const [tone, tieuDe, dongCau] = CAU_KET_QUA[r.ketQua];
      baoCao = dai(tone, tieuDe, dongCau);
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
/** Nút "Nhờ xe khác đón" dưới một điểm đón chưa tới (V8 1) — đủ điều kiện gửi theo `nhoDonDuoc`. */
function nutNhoDon(b: BuocDiem): Child[] {
  const r = duLieu!;
  if (!coChuyenKhach) return [];
  const d = r.diem.find((x) => x.id === b.diem.id);
  if (!d || !nhoDonDuoc(r.chuyen.trangThai, d, r.suat)) return [];
  const so = r.suat.filter((x) => x.diemLen === d.id).length;
  const nut = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "nho-xe-don", "data-diem": d.id }, "Nhờ xe khác đón") as HTMLButtonElement;
  nut.addEventListener("click", () => void moNhoXe(nut, { phamVi: "STOP", diemId: d.id, tenNoi: d.tenNoi, soKhach: so }));
  return [nut];
}
/** Đếm ngược: mỗi giây cập nhật chữ; một thẻ vừa hết giờ → đọc lại danh sách một lần (không dựng lại trang khi đang mở bảng trượt). */
let daHetGio = new Set<string>();
setInterval(() => {
  const bay = Date.now();
  let taiLai = false;
  // C59: đồng hồ chờ ở điểm đón — chỉ đổi chữ, không dựng lại trang.
  for (const el of document.querySelectorAll<HTMLElement>("[data-cho-tu]")) {
    const chu = cauChoVang(Number(el.dataset.choTu), bay);
    if (el.textContent !== chu) el.textContent = chu;
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-han]")) {
    const con = demNguoc(el.dataset.han!, bay);
    const so = el.querySelector<HTMLElement>("[data-dem]");
    if (so) so.textContent = con ?? "00:00";
    if (con === null && !daHetGio.has(el.dataset.han!)) {
      daHetGio = new Set([...daHetGio, el.dataset.han!]);
      taiLai = true;
    }
  }
  // Không dựng lại trang khi đang mở bảng trượt (cùng luật `bangDangMo` ở cuối tệp — viết thẳng vì hàm đó khai sau `await main()`).
  if (taiLai && duLieu && document.querySelector('.sheet[role="dialog"]') === null) void napDeNghi().then(() => ve());
}, 1000);

/**
 * C56 (đánh giá ERP 7/10): MỘT lệnh tại một thời điểm. Chạm đúp khi lệnh đầu còn bay từng sinh lệnh thứ hai mang requestId MỚI (`taoLenh` chỉ giữ id sau lỗi) → máy chủ
 * trả lỗi đỏ dù lệnh đầu đã ghi. Cờ này nằm ở TRẠNG THÁI VẼ (`ve()` vẽ mọi nút lệnh khoá khi cờ bật) chứ không chỉ ở `button.disabled` — tin Bảng tin của chính lệnh
 * này làm trang vẽ lại giữa chừng. Lệnh đến khi cờ đang bật bị bỏ (nút đã khoá, nên chỉ là chạm đúp / phím tắt).
 */
let dangGui = false;
function khoaNutLenh(): void {
  for (const nut of document.querySelectorAll<HTMLButtonElement>("#cc-trang button, #cc-day button")) nut.disabled = true;
}

/** Chạy một lệnh: mất mạng → ghi vào `choGui` (dòng đó hiện "Chưa gửi được" + "Bấm lại"); lỗi khác → dải báo. */
async function chay(khoa: string, viec: () => Promise<void>): Promise<void> {
  if (dangGui) return;
  dangGui = true;
  khoaNutLenh();
  vuaGhi = null;
  try {
    await viec();
    choGui.delete(khoa);
    baoCao = null;
  } catch (e) {
    if (!(e instanceof ApiError)) choGui.set(khoa, viec);
    else {
      choGui.delete(khoa);
      baoCao = dai("danger", cauLoiTienDo(e, Date.now(), duLieu!.chuyen.gioBatDau.ngay).cau);
      await nap().catch(() => undefined);
    }
  } finally {
    dangGui = false;
  }
  ve();
}

// ---- Đợt 5 A-1b (ADR-0052 D5b, bản vẽ V6 6.3–6.4 — chủ duyệt 5/10): tài xế bổ sung tên khách chưa có tên -------------------------------------------------
/** Ô `trip.passenger.add` (đặt ở `main`); máy chủ vẫn kiểm chuyến mình đang lái + trong ngày chạy. */
let coBoSungTen = false;
const lenhBoSung = new Map<string, ReturnType<typeof taoLenh>>();
/** Khối "Suất của khách": chỉ trong ngày chạy và khi còn suất thiếu tên (`suatCuaKhach`); KHÔNG hiện tên khách. Link "Bổ sung tên" theo ô quyền. */
function khoiSuatKhach(): HTMLElement | null {
  const k = suatCuaKhach(duLieu!);
  if (!k) return null;
  return h(
    "section",
    { class: "vc-card dp-suat-khach", "aria-labelledby": "cc-sk-title" },
    h("div", { class: "dp-card-head" }, h("h2", { id: "cc-sk-title", class: "dp-card-title" }, "Suất của khách"), chip(`Thiếu tên ${k.thieu}`, "warn")),
    ...k.dong.map((d) => {
      const nut = !d.coTen && coBoSungTen ? (h("button", { type: "button", class: "btn btn-link dp-bo-sung-link", "data-action": "bo-sung-ten", "data-suat": d.suatId }, "Bổ sung tên") as HTMLButtonElement) : null;
      nut?.addEventListener("click", () => moBoSungTen(d, nut));
      return h("div", { class: "dp-kc", "data-suat": d.suatId }, h("span", { class: "dp-kc-text" }, h("span", null, d.nhan)), chip(d.coTen ? "Đã có tên" : "Chưa có tên", d.coTen ? "ok" : "warn"), nut);
    }),
  );
}
/** Bản vẽ V6 6.4 (theo ADR D5b): "Bổ sung tên — Suất N" — Họ tên*, Năm sinh*; Lưu / Đóng. Không ô loại khách (gửi null). Lưu xong đọc lại chi tiết. */
function moBoSungTen(d: SuatTenDong, opener: HTMLButtonElement): void {
  const ten = h("input", { id: "cc-bs-ten", class: "vc-input", type: "text", autocomplete: "off", maxlength: "120", "aria-required": "true" }) as HTMLInputElement;
  const nam = h("input", { id: "cc-bs-nam", class: "vc-input", type: "text", inputmode: "numeric", maxlength: "4", "aria-required": "true" }) as HTMLInputElement;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const luu = h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "bo-sung-ten-luu" }, "Lưu") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: `Bổ sung tên — ${d.nhan.split(" · ")[0]}`,
    body: [
      h("p", { class: "dp-sheet-text" }, "Nhập tên cho khách chưa có tên trong đơn."),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: "cc-bs-ten" }, "Họ tên *"), ten),
      h("div", { class: "vc-field" }, h("label", { class: "vc-label", for: "cc-bs-nam" }, "Năm sinh *"), nam),
      loi,
    ],
    foot: [dong, luu],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  luu.addEventListener("click", async () => {
    const hoTen = ten.value.trim();
    const namSinh = Number(nam.value.trim());
    if (!hoTen || !/^\d{4}$/.test(nam.value.trim())) {
      replaceChildren(loi, icon("alert", 16, 2), "Nhập họ tên và năm sinh (4 chữ số).");
      loi.hidden = false;
      return;
    }
    bang.setBusy(true);
    luu.disabled = true;
    loi.hidden = true;
    try {
      let l = lenhBoSung.get(d.suatId);
      if (!l) lenhBoSung.set(d.suatId, (l = taoLenh()));
      await l.gui(`${goc}/hanh-khach`, "POST", { suatId: d.suatId, fullName: hoTen, birthYear: namSinh, paxCode: null });
      lenhBoSung.delete(d.suatId);
      await nap().catch(() => undefined);
      bang.close(false);
      baoCao = dai("ok", "Đã bổ sung tên khách", ["Văn phòng thấy tên ở chuyến và ở đơn."]);
      ve();
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), loiCua(e));
      loi.hidden = false;
      luu.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Dòng "Người đi kèm: <tên>" (hướng dẫn viên; chỉ tên, không SĐT) — ở mọi trạng thái chuyến. */
function dongDiKem(): HTMLElement | null {
  const ten = tenNguoiDiKemCuaChuyen(duLieu!.suat);
  return ten.length ? h("div", { class: "dp-cc-di-kem" }, icon("me", 16), h("span", null, `Người đi kèm: ${ten.join(", ")}`)) : null;
}

/** Người đi kèm cũng phải "Đã lên xe" → "Đã xuống" thì "Kết thúc chuyến" thường mới được (máy chủ đếm như khách): nút theo `viecNguoiDiKem`, chỉ khi xe đang chạy. */
function khoiDiKem(): HTMLElement | null {
  const viec = viecNguoiDiKem(duLieu!.suat);
  if (!viec.length || duLieu!.chuyen.trangThai !== "RUNNING") return null;
  return h("div", { class: "dp-cc-di-kem-viec" }, ...viec.map((v) => {
    const nut = v.lenh ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": `di-kem-${v.lenh}`, "data-suat": v.id }, v.nhan!) : null;
    nut?.addEventListener("click", () => void chay(`di-kem:${v.id}`, async () => {
      await gui(`phan-bo/${encodeURIComponent(v.id)}/${v.lenh}`);
      ghiVua(v.id, `di-kem-${v.lenh}` as LenhVuaGhi, v.ten);
    }));
    return h("div", { class: "dp-cc-di-kem-dong" }, h("span", null, `${v.ten} — ${v.trangThai === "WAITING" ? "chưa lên xe" : v.trangThai === "BOARDED" ? "đang trên xe" : "đã xuống"}`), nut,
      vuaGhi?.suatId === v.id ? h("div", { class: "dp-vua-ghi", role: "status" }, icon("check", 16, 2), h("span", null, vuaGhi.cau)) : null);
  }));
}

/** Điểm "thêm khi chạy" máy này đã xem (dải V6 6.1) — chỉ là tiện ích của máy; không đọc / ghi được thì dải hiện lại, không hỏng. */
const KHOA_DA_XEM = `cc-diem-da-xem:${id}`;
function daXem(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_DA_XEM) ?? "[]") as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
let daXemTam = new Set<string>();
function ghiDaXem(ids: readonly string[]): void {
  daXemTam = new Set([...daXemTam, ...ids]);
  try {
    localStorage.setItem(KHOA_DA_XEM, JSON.stringify([...new Set([...daXem(), ...ids])]));
  } catch {
    /* không ghi được: giữ trong bộ nhớ trang */
  }
}
function daiDiemMoi(): HTMLElement | null {
  const r = duLieu!;
  if (r.chuyen.trangThai !== "RUNNING") return null;
  const moi = diemMoiChuaXem(r.diem, new Set([...daXem(), ...daXemTam]), r.chuyen.gioBatDau.ngay);
  if (!moi.length) return null;
  const nut = h("button", { type: "button", class: "btn", "data-action": "da-xem-diem-moi" }, "Đã xem");
  nut.addEventListener("click", () => {
    ghiDaXem(moi.map((x) => x.id));
    ve();
  });
  return dai("info", "Văn phòng vừa thêm điểm", [...moi.map((x) => `${x.cau}.`), "Đã nằm trong lộ trình của bạn."], undefined, [h("div", { class: "banner-actions" }, nut)]);
}

function ve(): void {
  const r = duLieu!;
  const c = r.chuyen;
  document.title = `${c.ma} — Island Booking System`;
  setBarTitle(c.trangThai === "PLANNED" ? `Cho xe chạy ${c.ma}` : c.ma);
  const ngay = c.gioBatDau.ngay;
  const mang = daiMatMang({ duLieuLuc: duLieuCu?.luc ?? null, matMang: duLieuCu?.matMang ?? true, soChoGui: choGui.size });
  const dauMang = mang ? dai("warning", mang.tieuDe, mang.dong, mang.taiLai ? () => void lamMoi.yeuCau() : undefined) : null;
  // C61: màn tài xế đang chạy không có nút nổi "Hỗ trợ" (nó đè nút dính đáy / dòng cuối khi đang lái); hết chạy thì nút trở lại (CSS `body.cc-dang-chay`).
  document.body.classList.toggle("cc-dang-chay", c.trangThai === "RUNNING");
  if (c.trangThai === "PLANNED") return veXuatBen(dauMang);
  const trenXe = r.suat.filter((s) => s.trangThai === "BOARDED").length;
  const dauTrang = h(
    "div",
    { class: "dp-cc-head" },
    chip(c.trangThaiNhan, c.trangThai === "RUNNING" ? "unit" : c.trangThai === "ENDED" ? "ok" : "muted"),
    h("span", null, h("strong", null, c.bienSo), c.xuatBen ? ` · xe chạy ${c.xuatBen.gioXayRa.gio}` : "", " · trên xe ", h("strong", null, `${trenXe}/${c.soCho}`)),
  );
  const chayDuoc = c.trangThai === "RUNNING";
  const phuDiem = (b: BuocDiem) => ({ ben: nutThuTu(b), duoi: [...bayCua(b, r.suat), ...lienHeCua(b), ...chiDuongCua(b, r), ...nutNhoDon(b)] });
  const buoc = buocDiem(r.diem, r.suat, c.trangThai, ngay);
  // C54: khi chạy, "Điểm kế tiếp" + "Các điểm sau" + "Đã xong" (thu gọn) và MỘT nút chính dính đáy; không chạy (đã kết thúc…) thì danh sách đủ như cũ.
  const nhom = nhomDiemChay(buoc);
  const kq = xetKetThuc({ suat: r.suat, diem: r.diem }); // C57: CÙNG hàm với máy chủ (LC-16)
  const viec = chayDuoc ? viecChinh(nhom, kq.duoc) : null;
  const chung = {
    diem: r.diem, suat: r.suat, trangThai: c.trangThai, ngayXem: ngay, coNut: chayDuoc, onLenh: lenhDiem, choGui: new Set([...choGui.keys()]), vuaGhi, phuDiem, khoa: dangGui,
    choVang: chayDuoc, nutChinhODay: new Set(viec && viec.loai !== "ket-thuc" ? [viec.buoc.diem.id] : []),
  };
  const idsSau = new Set(nhom.sau.map((x) => x.diem.id));
  const keTiep = chayDuoc && nhom.keTiep ? veDiemChay({ ...chung, loc: (x) => x.diem.id === nhom.keTiep!.diem.id, keTiepId: nhom.keTiep.diem.id }) : [];
  const sau = chayDuoc ? veDiemChay({ ...chung, loc: (x) => idsSau.has(x.diem.id) }) : [];
  const diem = chayDuoc ? [...keTiep, ...sau] : veDiemChay(chung);
  // "Bấm lại" ở dòng khách chưa gửi được.
  for (const el of diem) {
    for (const nut of el.querySelectorAll<HTMLButtonElement>('[data-action="bam-lai"]')) {
      nut.addEventListener("click", () => {
        const viecCho = choGui.get(nut.dataset.suat!);
        if (viecCho) void chay(nut.dataset.suat!, viecCho);
      });
    }
  }
  const diemCho = [...choGui.keys()].filter((k) => k.startsWith("diem:"));
  // Kiểu A (V1.4): "Kết thúc chuyến" mở hộp xác nhận (tóm tắt kết quả khách) — lệnh chỉ gửi khi bấm nút trong hộp.
  const moKetThuc = (nut: HTMLElement) => moXacNhan(nut, hopKetThuc({ ma: c.ma, suat: r.suat }), "ket-thuc", () => void chay("ket-thuc", () => gui("ket-thuc")));
  const gianDoan = h("button", { type: "button", class: "vc-btn vc-btn-stop dp-gian-doan", disabled: dangGui, "data-action": "ket-thuc-gian-doan" }, "Kết thúc gián đoạn"); // bản 1.39: nút viền đỏ, nhỏ hơn — không còn là nút to nhất lúc đang chạy (nút xác nhận trong hộp vẫn đỏ đặc)
  gianDoan.addEventListener("click", () => moGianDoan(gianDoan));
  // ADR-0111 Đ4 (cứu hộ ONBOARD — V8 / CH): tài xế tự nhờ xe đang chạy khác nhận cả khách trên xe và khách chờ đón, gặp ở một nơi.
  const conKhach = chiSuatKhach(r.suat).filter((s) => s.trangThai === "WAITING" || s.trangThai === "BOARDED").length;
  const chuyenXe = coChuyenKhach && chayDuoc && conKhach > 0
    ? (h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", disabled: dangGui, "data-action": "chuyen-khach-xe-khac" }, "Chuyển khách sang xe khác") as HTMLButtonElement)
    : null;
  chuyenXe?.addEventListener("click", () => void moNhoXe(chuyenXe, { phamVi: "ONBOARD", diemId: null, tenNoi: null, soKhach: conKhach }));
  // Nút "Kết thúc chuyến" khoá (còn việc): ở cuối danh sách cùng lời giải thích; khi được bấm thì nó là nút chính dính đáy (một nút, một chỗ).
  const ketThucKhoa = chayDuoc && !kq.duoc ? h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: true, "data-action": "ket-thuc" }, "Kết thúc chuyến") : null;
  // "Vừa ghi …" của điểm đã xong (điểm thu gọn không còn thẻ để mang dòng đó) lên đầu danh sách.
  const suatVua = vuaGhi ? r.suat.find((x) => x.id === vuaGhi!.suatId) : undefined;
  const vuaGhiDau = chayDuoc && vuaGhi && suatVua?.diemLen && nhom.xong.some((x) => x.diem.id === suatVua.diemLen)
    ? h("div", { class: "dp-vua-ghi dp-vua-ghi-dau", role: "status" }, icon("check", 16, 2), h("span", null, vuaGhi.cau))
    : null;
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    ...khoiDeNghiToi(),
    daiDiemMoi(),
    dauTrang,
    ...khoiDeNghiDi(),
    dongDiKem(),
    khoiDiKem(),
    chayDuoc ? khoiSuatKhach() : null,
    c.ketThucThat ? h("div", { class: "dp-ct-moc" }, dongMoc(c.trangThai === "ENDED_INTERRUPTED" ? "Kết thúc gián đoạn" : "Kết thúc", c.ketThucThat, ngay)) : null,
    vuaGhiDau,
    ...diemCho.map((k) => h("div", { class: "dp-khach-cho" }, "Một lệnh ở điểm chưa gửi được", h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", disabled: dangGui, "data-action": "bam-lai" }, "Bấm lại"))),
    chayDuoc
      ? h("section", { class: "dp-cc-khoi", "aria-labelledby": "cc-ke-tiep" }, h("h2", { id: "cc-ke-tiep", class: "dp-cc-muc" }, "Điểm kế tiếp"),
          keTiep.length ? h("div", { class: "dp-run-list dp-cc-ke-tiep" }, ...keTiep) : h("p", { class: "dp-note" }, kq.duoc ? "Đã xong mọi điểm." : "Không còn điểm nào chờ bạn."))
      : null,
    sau.length ? h("section", { class: "dp-cc-khoi", "aria-labelledby": "cc-sau" }, h("h2", { id: "cc-sau", class: "dp-cc-muc" }, `Các điểm sau (${sau.length})`), h("div", { class: "dp-run-list" }, ...sau)) : null,
    chayDuoc ? khoiDiemXong(nhom.xong, ngay) : null,
    !chayDuoc ? h("div", { class: "dp-run-list" }, ...diem) : null,
    chayDuoc ? h("div", { class: "dp-run-end thanh-hanh-dong-cuoi" }, ketThucKhoa, kq.duoc ? null : h("span", { class: "dp-note" }, cauChuaKetThuc(kq)), chuyenXe, gianDoan) : null,
  );
  // Nút "Bấm lại" của lệnh ở điểm (Đã tới / Đã trả / Đã đón N khách).
  trangEl.querySelectorAll<HTMLButtonElement>(':scope > .dp-khach-cho [data-action="bam-lai"]').forEach((nut, i) => {
    nut.addEventListener("click", () => {
      const k = diemCho[i]!;
      const viecCho = choGui.get(k);
      if (viecCho) void chay(k, viecCho);
    });
  });
  // Thanh dính đáy: MỘT nút chính (Đã tới / Đã đón N khách / Đã trả / Kết thúc chuyến) + một dòng nói đang ở điểm nào.
  if (viec) {
    const nut = nutChinh(viec, moKetThuc);
    replaceChildren(dayEl, nut, h("span", { class: "dp-note dp-cc-foot" }, viec.loai === "ket-thuc" ? "Đã xong mọi điểm." : `Điểm ${viec.buoc.so} · ${viec.buoc.diem.tenNoi}`));
    dayEl.hidden = false;
  } else {
    replaceChildren(dayEl);
    dayEl.hidden = true;
  }
}

/** Nút chính của thanh dính đáy (C54). `ket-thuc` mở hộp xác nhận kết thúc; `don-tat-ca` mở hộp "Đã đón N khách"; còn lại đi đường lệnh điểm có sẵn. */
function nutChinh(viec: ViecChinh, moKetThuc: (nut: HTMLElement) => void): HTMLButtonElement {
  const nut = h("button", { type: "button", class: "vc-btn btn btn-accent dp-cc-viec", disabled: dangGui, "data-action": viec.loai, ...(viec.loai === "ket-thuc" ? {} : { "data-diem": viec.buoc.diem.id }) }, viec.nhan) as HTMLButtonElement;
  nut.addEventListener("click", () => {
    if (viec.loai === "ket-thuc") moKetThuc(nut);
    else if (viec.loai === "don-tat-ca") donTatCa(viec, nut);
    else lenhDiem({ loai: viec.loai, buoc: viec.buoc }, nut);
  });
  return nut;
}

/**
 * C53: "Đã đón N khách" — hộp xác nhận rồi gửi LẦN LƯỢT đúng lệnh "Đã đón" có sẵn của từng khách còn chờ (không lệnh mới), đọc lại chi tiết MỘT lần ở cuối.
 * `daGui` sống qua các lần "Bấm lại" của cùng một lượt xác nhận: suất đã ghi không gửi lại (lệnh gửi lại sẽ mang requestId mới và bị máy chủ từ chối).
 */
function donTatCa(v: Extract<ViecChinh, { loai: "don-tat-ca" }>, opener: HTMLElement): void {
  const d = v.buoc.diem;
  const daGui = new Set<string>();
  moXacNhan(opener, hopDonTatCa({ tenNoi: d.tenNoi, soKhach: v.suatIds.length }), "don-tat-ca", () => void chay(`diem:${d.id}`, async () => {
    let cuoi: CuocChiTietResponse | null = null;
    try {
      for (const sid of v.suatIds) {
        if (daGui.has(sid) || duLieu!.suat.find((x) => x.id === sid)?.trangThai !== "WAITING") continue;
        const url = `${goc}/phan-bo/${encodeURIComponent(sid)}/don`;
        let l = cacLenh.get(url);
        if (!l) cacLenh.set(url, (l = taoLenh()));
        cuoi = await l.gui<CuocChiTietResponse>(url, "POST", {});
        daGui.add(sid);
      }
    } catch (e) {
      await nap().catch(() => undefined); // những khách đã ghi hiện đúng trạng thái; mất mạng thì giữ như cũ
      throw e;
    }
    try {
      await nap();
    } catch {
      if (cuoi) duLieu = giuChiDuong(giuTenKhach(cuoi, duLieu), duLieu);
    }
    vuaGhi = { suatId: v.suatIds[0]!, cau: dongVuaGhiNhieu(v.suatIds.length, d.tenNoi) };
  }));
}

/** C54: điểm đã xong / bỏ qua gom vào một khối thu gọn — mỗi điểm một dòng (số, loại, nơi, kết quả khách, giờ tới). Mở / đóng được nhớ qua các lần vẽ lại. */
let diemXongMo = false;
function khoiDiemXong(xong: readonly BuocDiem[], ngay: string): HTMLElement | null {
  if (!xong.length) return null;
  const tomTat = (b: BuocDiem): string => {
    if (b.trangThaiHien === "bo") return "Bỏ qua — không còn khách";
    if (b.diem.loai === "DROPOFF") return "Đã trả";
    const dem = (...kq: string[]) => b.khach.filter((k) => k.ketQua !== null && kq.includes(k.ketQua)).length;
    const phan: [number, string][] = [[dem("Đã đón", "Đã trả"), "đã đón"], [dem("Vắng"), "vắng"], [dem("Khách đã huỷ"), "khách huỷ"]];
    return phan.filter(([n]) => n > 0).map(([n, nhan]) => `${n} ${nhan}`).join(" · ") || "Đã xong";
  };
  const hop = h(
    "details",
    { class: "dp-cc-xong", "data-diem-xong": "" },
    h("summary", { class: "dp-cc-xong-tieu-de" }, `Đã xong (${xong.length} điểm)`),
    h("ul", { class: "dp-cc-xong-ds" }, ...xong.map((b) =>
      h("li", { class: "dp-cc-xong-dong", "data-diem": b.diem.id }, h("span", { class: "dp-run-so" }, b.so),
        h("span", { class: "dp-cc-xong-text" }, h("strong", null, b.diem.tenNoi), h("span", { class: "dp-note" }, `${b.nhanLoai} · ${tomTat(b)}`), dongMoc("Đã tới", b.diem.daToi, ngay))))),
  ) as HTMLDetailsElement;
  hop.open = diemXongMo;
  hop.addEventListener("toggle", () => { diemXongMo = hop.open; });
  return hop;
}

/** Số hiệu chuyến bay của khách lên ở điểm đón này (ADR-0055 C3 — có mọi lúc, không chỉ ra người): cả trước xuất bến lẫn lúc chạy. */
function bayCua(b: BuocDiem, suat: CuocChiTietResponse["suat"]): Child[] {
  if (b.diem.loai !== "PICKUP") return [];
  const ds = soHieuTaiDiemDon(suat, b.diem.id);
  return ds.length ? [h("div", { class: "dp-run-bay" }, ...ds.map((x) => h("span", { class: "chip chip-code" }, `✈︎ ${x}`)))] : [];
}

/** Liên hệ của đơn có khách lên ở điểm đón này (chỉ trong ngày chạy — DTO có `lienHe`). */
function lienHeCua(b: BuocDiem): Child[] {
  if (b.diem.loai !== "PICKUP" || !lienHe.length) return [];
  const don = new Set(duLieu!.suat.filter((s) => s.diemLen === b.diem.id && s.maDon).map((s) => s.maDon));
  return lienHe.filter((l) => don.has(l.maDon)).map((l) =>
    h("div", { class: "dp-run-lien-he" }, icon("handset", 16), h("span", null, `Liên hệ: ${l.tenLienHe}`), h("a", { href: `tel:${l.sdtLienHe.replace(/[^\d+]/g, "")}` }, l.sdtLienHe)));
}

/**
 * Nhóm "Chỉ đường" (ADR-0105) của một điểm: hai liên kết bản đồ (Apple chỉ trên máy Apple). Điểm nào có nút do `nutChiDuongCuaDiem` quyết — một luật với bài thuần.
 * Liên kết là điều hướng (không phải lệnh) nên hiện cả trước xuất bến; không gửi gì ra ngoài khi chưa bấm.
 */
function chiDuongCua(b: BuocDiem, r: CuocChiTietResponse): Child[] {
  const d = r.diem.find((x) => x.id === b.diem.id);
  if (!d) return [];
  const nut = nutChiDuongCuaDiem({ trangThaiChuyen: r.chuyen.trangThai, trangThaiDiem: d.trangThai, chuoiDich: d.diaChiChiDuong, ua: navigator.userAgent });
  if (!nut.length) return [];
  return [
    h(
      "div",
      { class: "dp-run-chi-duong", role: "group", "aria-label": `Chỉ đường tới ${b.diem.tenNoi}` },
      h("span", { class: "dp-run-chi-duong-nhan" }, "Chỉ đường"),
      ...nut.map((n) => h("a", { class: "vc-btn vc-btn-ghost-primary", href: n.href, target: "_blank", rel: "noreferrer noopener", "data-ban-do": n.banDo }, n.nhan)),
    ),
  ];
}

/** Đổi thứ tự điểm CHƯA TỚI (route 29) — nút lên / xuống thay tay nắm kéo của bản vẽ 5a (bấm được bằng bàn phím); không ô giờ. */
function nutThuTu(b: BuocDiem): HTMLElement | null {
  const r = duLieu!;
  if (r.chuyen.trangThai !== "RUNNING" || b.diem.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    // C30 (ADR-0096 Đ1.3c): khoá khi lệnh làm khách chờ lên bị đảo mới — cùng luật 409 `thu_tu_dao` của máy chủ.
    const { than, daoMoi } = doiThuTuDuoc(r.diem, r.suat, b.diem.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than || daoMoi || dangGui, "aria-label": daoMoi ? `${nhan} — ${CAU_THU_TU_DAO}` : nhan, title: daoMoi ? CAU_THU_TU_DAO : null, "data-action": action }, kyHieu);
    x.addEventListener("click", () => { if (than && !daoMoi) void chay("thu-tu", () => gui("thu-tu", than)); });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom" }, nut(-1, "↑", `Đưa ${b.diem.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${b.diem.tenNoi} xuống sau`, "xuong"));
}

function lenhDiem(l: LenhDiem, nut: HTMLButtonElement): void {
  const d = l.buoc.diem;
  if (l.loai === "da-toi") return void chay(`diem:${d.id}`, () => gui(`diem/${encodeURIComponent(d.id)}/da-toi`));
  // Kiểu A (V1.4) + HT-02: "Đã trả" cả điểm mở hộp xác nhận (số khách xuống ở đây; 0 khách → cảnh báo) — lệnh chỉ gửi khi bấm nút trong hộp.
  if (l.loai === "tra-het") return moXacNhan(nut, hopTraCaDiem({ tenNoi: d.tenNoi, soKhach: l.buoc.traCho.length }), "tra-het", () => traHet(l));
  const lenh = l.loai;
  const ten = l.ten;
  void chay(l.suatId, async () => {
    await gui(`phan-bo/${encodeURIComponent(l.suatId)}/${lenh}`);
    ghiVua(l.suatId, lenh, ten);
  });
}

/** Ghi dòng "Vừa ghi …" (Kiểu A) cho lệnh suất vừa thành công; `ve()` của `chay` vẽ nó. */
function ghiVua(suatId: string, lenh: LenhVuaGhi, ten: string): void {
  const cau = dongVuaGhi(lenh, ten);
  vuaGhi = cau ? { suatId, cau } : null;
}

/** Bảng trượt xác nhận dùng chung cho lệnh chốt (Kết thúc chuyến, Đã trả cả điểm) — nội dung từ hàm thuần, giao diện chỉ vẽ. */
function moXacNhan(opener: HTMLElement, hop: HopXacNhan, ten: string, lam: () => void): void {
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": `${ten}-xac-nhan` }, hop.nutXacNhan);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": `${ten}-dong` }, "Chưa, quay lại");
  const bang = moBangTruot({
    title: hop.tieuDe,
    body: [
      hop.canhBao ? dai("warning", hop.canhBao) : null,
      h("dl", { class: "dp-xn-ds" }, ...hop.dong.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
      h("p", { class: "dp-sheet-text dp-note" }, hop.ghiChu),
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", () => {
    chinh.disabled = true;
    bang.close(false);
    lam();
  });
}

/** "Đã trả" cả điểm sau khi xác nhận: tới điểm nếu chưa tới, rồi trả từng suất còn trên xe xuống ở đây. */
function traHet(l: Extract<LenhDiem, { loai: "tra-het" }>): void {
  const d = l.buoc.diem;
  void chay(`diem:${d.id}`, async () => {
    if (duLieu!.diem.find((x) => x.id === d.id)?.trangThai === "PENDING") await gui(`diem/${encodeURIComponent(d.id)}/da-toi`);
    for (const sid of l.buoc.traCho) {
      if (duLieu!.suat.find((x) => x.id === sid)?.trangThai !== "BOARDED") continue;
      await gui(`phan-bo/${encodeURIComponent(sid)}/tra`);
    }
  });
}

/** Hộp "Kết thúc gián đoạn" (bản vẽ 5b): lý do nhóm Kết thúc gián đoạn; không ô ghi chú (Q1). */
function moGianDoan(opener: HTMLElement): void {
  const r = duLieu!;
  let lyDo: string | null = null;
  const conTren = chiSuatKhach(r.suat).filter((s) => s.trangThai === "BOARDED").length;
  const chuaDon = chiSuatKhach(r.suat).filter((s) => s.trangThai === "WAITING").length;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "gian-doan-gui" }, "Kết thúc gián đoạn");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: "Kết thúc gián đoạn",
    body: [
      h("p", { class: "dp-sheet-text" }, `${r.chuyen.ma} dừng ở đây. ${conTren} khách còn trên xe và ${chuaDon} khách chưa đón sẽ báo về văn phòng.`),
      // Đợt 5 A-1b (câu 5.2c, lời chủ): tài xế chưa chọn xe cứu hộ (D4 hoãn) — văn phòng nhận tin trip_ended_interrupted và xếp.
      h("p", { class: "dp-note", "data-cau": "cuu-ho" }, "Xe hỏng mà còn khách? Đóng hộp này, bấm “Chuyển khách sang xe khác” để nhờ xe đang chạy tới đón trước — rồi mới kết thúc gián đoạn. Văn phòng nhận tin ngay."),
      nhomChon("cc-gd", "Lý do", r.lyDo.map((x) => ({ code: x.code, nhan: x.nhan })), (c) => {
        lyDo = c;
        chinh.disabled = false;
      }),
      loi,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!lyDo) return;
    bang.setBusy(true);
    chinh.disabled = true;
    try {
      await gui("ket-thuc-gian-doan", { lyDo });
      bang.close(false);
      baoCao = dai("info", `Đã kết thúc gián đoạn ${duLieu!.chuyen.ma}`, ["Văn phòng đã nhận báo."]);
      ve();
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), cauLoiTienDo(e, Date.now(), r.chuyen.gioBatDau.ngay).cau);
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Điểm của chuyến CHƯA xuất bến (bản 1.39): số người ở mỗi điểm; điểm trả có giờ hẹn thì ghi kèm (điểm đón đã có "HẸN …" ở nhãn loại). */
function veDiemTruoc(r: CuocChiTietResponse): HTMLElement[] {
  const theoId = new Map(r.diem.map((d) => [d.id, d]));
  return veDiemChay({
    diem: r.diem, suat: [], trangThai: r.chuyen.trangThai, ngayXem: r.chuyen.gioBatDau.ngay, coNut: false, onLenh: () => undefined,
    phuDiem: (b) => {
      const d = theoId.get(b.diem.id)!;
      const hen = d.loai === "DROPOFF" && d.gioHen ? `Hẹn ${d.gioHen.gio} · ` : "";
      return { duoi: [...bayCua(b, r.suat), h("div", { class: "dp-note dp-cc-so-nguoi" }, `${hen}${d.soNguoi} khách`), ...chiDuongCua(b, r)] };
    },
  });
}

// ---- A4 T9: Từ chối chuyến (ADR-0053 D8) -----------------------------------------------------------------------------------------------------------------
/** Một lệnh Từ chối mỗi trang (cùng requestId khi bấm lại sau mất mạng — `taoLenh`). */
const lenhTuChoi = taoLenh();
/** Dải hạn Từ chối + thẻ "thấy khách từ …" của chuyến chưa chạy (chỉ người có vế hạn — máy chủ gửi `hanTuChoi` / `thayKhachTu`). */
function khoiHanTuChoi(r: CuocChiTietResponse): Child[] {
  const homNay = vnToday(new Date());
  const d = daiHanTuChoi({ trangThai: r.chuyen.trangThai, tuChoiDuoc: r.tuChoiDuoc, hanTuChoi: r.hanTuChoi, sdtVanPhong: r.sdtVanPhong, chanTuChoi: r.chanTuChoi }, homNay);
  const out: Child[] = [];
  if (d) {
    const nut: HTMLElement[] = [];
    if (d.loai === "con_han" && r.tuChoiDuoc) {
      const tc = h("button", { type: "button", class: "vc-btn vc-btn-stop", "data-action": "tu-choi" }, "Từ chối chuyến");
      tc.addEventListener("click", () => moTuChoi(tc));
      nut.push(tc);
    }
    if (d.loai !== "con_han" && d.sdt) nut.push(h("a", { class: "vc-btn btn", href: `tel:${d.sdt}`, "data-action": "goi-van-phong" }, "Gọi văn phòng"));
    out.push(dai(d.loai === "con_han" ? "info" : "warning", d.tieuDe, d.dong, undefined, nut.length ? [h("div", { class: "banner-actions" }, ...nut)] : []));
  }
  const thay = cauThayKhach(r.thayKhachTu, homNay);
  if (thay) out.push(h("div", { class: "dp-note dp-cc-thay-khach", "data-cau": "thay-khach" }, icon("eye", 16, 2), h("span", null, thay)));
  return out;
}
/** Tấm "Từ chối chuyến": chọn lý do (nhóm Từ chối chuyến — máy chủ gửi `lyDoTuChoi` khi `tuChoiDuoc`) → "Xác nhận từ chối". Xong → về Cuốc của tôi. */
function moTuChoi(opener: HTMLElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  let lyDo: string | null = null;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "tu-choi-gui" }, "Xác nhận từ chối");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: "Từ chối chuyến",
    body: [
      h("p", { class: "dp-sheet-text" }, `${c.ma} (${c.gioBatDau.gio} ${ngayNgan(c.gioBatDau.ngay, vnToday(new Date()))}) trả lại văn phòng để xếp người khác. Từ chối xong, chuyến không còn trong Cuốc của bạn.`),
      nhomChon("cc-tc", "Lý do", (r.lyDoTuChoi ?? []).map((x) => ({ code: x.code, nhan: x.nhan })), (code) => {
        lyDo = code;
        chinh.disabled = false;
      }),
      loi,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!lyDo) return;
    bang.setBusy(true);
    chinh.disabled = true;
    try {
      await lenhTuChoi.gui<{ daTuChoi: true }>(`${goc}/tu-choi`, "POST", { lyDo });
      bang.close(false);
      location.replace(`/cuoc?daTuChoi=${encodeURIComponent(c.ma)}`);
    } catch (e) {
      if (!(e instanceof ApiError)) {
        replaceChildren(loi, icon("alert", 16, 2), "Chưa gửi được — kiểm tra mạng rồi bấm lại.");
        loi.hidden = false;
        chinh.disabled = false;
        return;
      }
      const l = loiTuChoi({ status: e.status, code: e.code, message: e.message });
      if (l.hanhDong === "giu") {
        replaceChildren(loi, icon("alert", 16, 2), l.cau);
        loi.hidden = false;
        chinh.disabled = false;
        return;
      }
      bang.close(false);
      if (l.hanhDong === "ve_cuoc") return location.replace("/cuoc");
      baoCao = dai("warning", l.cau);
      await nap().catch(() => undefined);
      ve();
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Xuất bến (bản vẽ 6b, 6c — màn tài xế): chỉ điều kiện CÒN THIẾU "(văn phòng lo)" (thiếu tên + tự bổ sung được: chỉ chỗ tự làm — `hauToDieuKienTaiXe`); đạt hết → "Đủ điều kiện xuất bến". Không ô giờ. */
function veXuatBen(dauMang: HTMLElement | null): void {
  const r = duLieu!;
  const c = r.chuyen;
  const thieu = r.dieuKienConThieu;
  const lechNgay = canhBaoNgayChay(c.gioBatDau.ngay, vnToday(new Date()));
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    lechNgay ? dai("danger", "Không phải chuyến của hôm nay", [lechNgay]) : null,
    ...khoiHanTuChoi(r),
    h("div", { class: "dp-note dp-cc-meta" }, `${c.bienSo} · ${ngayNgan(c.gioBatDau.ngay, vnToday(new Date()))} ${c.gioBatDau.gio} · ${chiSuatKhach(r.suat).length} khách`),
    dongDiKem(),
    khoiSuatKhach(),
    // Bản 1.39 (chủ quyết 30/9: "tài xế nên thấy điểm đón từ trước, ngày giờ đón, vị trí và số lượng khách"): các điểm của chuyến TRƯỚC khi xuất bến — thứ tự,
    // loại, tên nơi, giờ hẹn, số người; dùng lại cách vẽ điểm của màn đang chạy, KHÔNG nút tiến độ, KHÔNG khách từng người (`suat: []`) — tên / SĐT khách vẫn
    // chỉ trong ngày chạy (ADR-0053 D7.2). Chỉ vẽ dữ liệu route 20 đã gửi (`diem`), không đổi máy chủ.
    h("div", { class: "dp-run-list dp-cc-diem" }, ...veDiemTruoc(r)),
    h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "cc-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "cc-dk-title", class: "dp-card-title" }, "Điều kiện cho xe chạy"), thieu.length ? chip(`${thieu.length} chưa đạt`, "danger") : chip("Đạt hết", "ok")),
      ...(thieu.length
        ? thieu.map((x) => h("div", { class: "dp-cond", "data-dat": "false" }, h("span", { class: "dp-cond-mark is-chua", "aria-label": "Chưa đạt" }, "✕"),
            h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, `${x.loiNhan} ${hauToDieuKienTaiXe(x.ma, coBoSungTen && r.trongNgayChay)}`))))
        : [h("div", { class: "dp-cond", "data-dat": "true" }, h("span", { class: "dp-cond-mark is-dat", "aria-label": "Đạt" }, "✓"), h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, "Đủ điều kiện cho xe chạy")))]),
    ),
  );
  const nut = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: thieu.length > 0, "data-action": "xuat-ben" }, "Cho xe chạy");
  // HT-03: một chạm chỉ MỞ hộp xác nhận; lệnh chỉ gửi khi bấm nút trong hộp. Mất mạng lúc gửi: hộp đóng, "Bấm lại" ở dải đầu trang như cũ (`chay`).
  nut.addEventListener("click", () => moXacNhanXuatBen(nut));
  replaceChildren(dayEl, nut, h("span", { class: "dp-note dp-cc-foot" }, thieu.length ? (chiThieuTenTuLam(thieu, coBoSungTen && r.trongNgayChay) ? "Chưa cho xe chạy được — bổ sung tên khách ở trên trước." : "Chưa cho xe chạy được — văn phòng đang lo.") : `Bấm lúc xe lăn bánh — giờ ghi là lúc bấm (${msToVnLocal(Date.now()).time}).`));
  dayEl.hidden = false;
}

/** Hộp xác nhận "Xuất bến" (HT-03): nội dung từ hàm thuần `hopXuatBen` — giao diện chỉ vẽ. */
function moXacNhanXuatBen(opener: HTMLElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  const hop = hopXuatBen({ ma: c.ma, ngayChay: c.gioBatDau.ngay, gioDuKien: c.gioBatDau.gio, bienSo: c.bienSo, soKhach: chiSuatKhach(r.suat).length }, vnToday(new Date()));
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "xuat-ben-xac-nhan" }, hop.nutXacNhan);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "xuat-ben-dong" }, "Chưa, quay lại");
  const bang = moBangTruot({
    title: hop.tieuDe,
    body: [
      hop.canhBao ? dai("danger", "Không phải chuyến của hôm nay", [hop.canhBao]) : null,
      h("dl", { class: "dp-xn-ds" }, ...hop.dong.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
      h("p", { class: "dp-sheet-text dp-note" }, hop.ghiChu),
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", () => {
    chinh.disabled = true;
    bang.close(false);
    // Sau xuất bến, `gui` đọc lại chi tiết — có tên khách + liên hệ NẾU trong ngày chạy (phản hồi lệnh không kèm; xuất bến sớm tối hôm trước thì chưa có — Q-L3-B).
    void chay("xuat-ben", () => gui("xuat-ben"));
  });
}

async function main(): Promise<void> {
  const staff = await initShell();
  if (!coCuocCuaToi(staff)) return showError(errorEl, "Tài khoản này không có cuốc xe.");
  coBoSungTen = can(staff, "trip.passenger.add", { assigned: true });
  coChuyenKhach = can(staff, "trip.transfer", { assigned: true });
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
// ADR-0052 D6.4: văn phòng sửa / huỷ / đổi tài xế chuyến đang xem → tải lại + vẽ lại (bị đổi ra thì máy chủ trả 404 → câu lỗi). Nối lại Bảng tin → tải lại.
const lamMoi = taoBoLamMoi(async () => {
  if (!duLieu || bangDangMo()) return;
  try {
    await nap();
  } catch (e) {
    if (loiTaiNenAnTrang(e instanceof ApiError ? { status: e.status } : null)) {
      trangEl.hidden = true; // chuyến không còn mở được (bị đổi ra, không còn quyền) — không để màn cũ trông như còn đúng
      return showError(errorEl, loiCua(e));
    }
    // C55: mất mạng / lỗi máy chủ thoáng qua — giữ nguyên danh sách điểm, tên khách, số liên hệ, nút; chỉ thêm dải "dữ liệu lúc HH:MM".
    duLieuCu = { luc: napLuc ?? Date.now(), matMang: !(e instanceof ApiError) };
    if (!trangEl.hidden) ve();
    return;
  }
  // Vòng sửa 1 (T2): tải lại được (vd sau một lần lỗi mạng) thì hiện lại trang, ẩn câu lỗi cũ.
  trangEl.hidden = false;
  showError(errorEl, null);
  ve();
});
window.addEventListener("chuyen-thay-doi", (ev) => {
  // ADR-0111: tin của xe kia trong một đề nghị (xe nhận đã nhận / không nhận…) cũng đọc lại — mã chuyến nằm trong thẻ đề nghị của trang này.
  const lienQuan = new Set([duLieu?.chuyen.ma, ...(deNghi ? [...deNghi.guiDi, ...deNghi.guiToi].flatMap((d) => [d.tuMaChuyen, d.denMaChuyen]) : [])]);
  if ((ev as CustomEvent<SuKienChuyen[]>).detail.some((e) => lienQuan.has(e.maChuyen))) void lamMoi.yeuCau();
});
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
