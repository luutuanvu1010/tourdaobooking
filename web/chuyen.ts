// Chi tiết chuyến (/chuyen?id=<chuyến>) — ADR-0049 V2 (route 3, 4, 8, 40), ADR-0050 thành phần B, C, D, E; bản vẽ docs/design/van-chuyen-dieu-phoi/project/02 Chi tiet
// chuyen.dc.html; bản đối chiếu 2.7, 2.12, H10, H11, H14, H17, R-P16.
// - Đầu: mã, trạng thái (bị giữ đỏ), ngày giờ; nút theo cờ quyền: "Sửa chuyến", "Huỷ chuyến" (chỉ chuyến lên kế hoạch, ô trip.dispatch). Dòng khoá theo `khoaMoc`.
// - "Cập nhật điểm theo đơn" (route 40, lý do giữ "Nơi đón / trả đã đổi"): không cần phá lệ; kết quả: đã cập nhật N / không có gì cần cập nhật / chuyến vừa bị sửa.
// - Bảng điểm dừng (cờ `lechDon` → "Lệch đơn"), điều kiện xuất bến (danh mục cố định từ lý do giữ), nhật ký chuyến (ai bấm hoặc "máy"; hai giờ khi văn phòng khai).
// - CHỜ A15 (chưa có route trên nhánh): "Xuất bến thay tài xế", nút tiến độ bấm thay, "Kết thúc gián đoạn", "Mở màn Xuất bến ›" — chưa dựng (không để nút chết).
import { cauKhoaMoc, dieuKienXuatBen, dongNhatKy, gioHien, kieuChuyen, nhanDiem } from "../src/shared/dieu-phoi-man";
import type { CapNhatDiemResponse, ChuyenChiTietResponse } from "../src/shared/contracts";
import { can } from "../src/shared/permissions";
import { api } from "./api";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, docLoiLenh, moHuyChuyen, moPhaLe, taoLenh, thuNgay } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";

const errorEl = byId("error");
const trangEl = byId("ct-trang");
const bottomEl = byId("ct-bottom");
const id = new URLSearchParams(location.search).get("id") ?? "";

const staff = await initShell();
const coDieuPhoi = can(staff, "trip.dispatch");
const coPhaLe = can(staff, "trip.override");

let duLieu: ChuyenChiTietResponse | null = null;
let baoCao: HTMLElement | null = null;

async function nap(): Promise<void> {
  duLieu = await api<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(id)}`);
}

function ve(): void {
  const r = duLieu!;
  const c = r.chuyen;
  const ngay = c.ngayChay;
  const k = kieuChuyen(c);
  const keHoach = c.trangThai === "PLANNED";
  const back = byId<HTMLAnchorElement>("ct-back");
  back.href = `/dieu-phoi?ngay=${ngay}`;
  back.textContent = `‹ Điều phối xe ${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
  document.body.dataset.back = back.href;
  document.title = `${c.ma} — Island Booking System`;
  setBarTitle(c.ma);
  datCrumb("Vận chuyển › Điều phối xe", c.ma);

  const nutSua = keHoach && coDieuPhoi ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: `/chuyen-sua?id=${encodeURIComponent(c.id)}`, "data-action": "sua-chuyen" }, "Sửa chuyến") : null;
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
    h("span", { class: "dp-ct-when" }, `${thuNgay(ngay)} · ${gioHien(c.batDau, ngay)}–${gioHien(c.ketThuc, ngay)}`),
    h("div", { class: "dp-ct-actions" }, nutSua, nutHuy("vc-btn-danger")),
  );
  const khoa = c.khoaMoc.dangKhoa && keHoach
    ? h("div", { class: "dg-lock dp-ct-lock" }, icon("lock", 16), cauKhoaMoc(r.mocToiThieuPhut, { phaLe: coPhaLe, dieuPhoi: coDieuPhoi }))
    : null;

  // Dải: lý do giữ "Nơi đón / trả đã đổi" (C) + nút; chuyến đang chạy có nơi hẹn khác điểm (D — chỉ báo).
  const dais: Child[] = [];
  const noiDoi = c.lyDoGiu.filter((l) => l.ma === "NOI_HEN_DOI");
  if (keHoach && noiDoi.length) {
    const nut = coDieuPhoi ? h("button", { type: "button", class: "vc-btn btn btn-primary", "data-action": "cap-nhat-diem" }, "Cập nhật điểm theo đơn") : null;
    nut?.addEventListener("click", () => capNhatDiem(nut));
    dais.push(dai("danger", "Chuyến bị giữ: Nơi đón / trả đã đổi — cập nhật điểm", [
      ...noiDoi.map((l) => l.loiNhan),
      `Ai xử lý: ${noiDoi[0]!.aiXuLyNhan}. Không cần phá lệ, kể cả trong vùng khoá trước giờ xuất bến.`,
    ], undefined, nut ? [h("div", { class: "banner-actions" }, nut)] : []));
  }
  if (c.trangThai === "RUNNING") {
    for (const w of r.canhBao.filter((x) => x.loai === "NOI_HEN_KHAC_DIEM")) {
      dais.push(dai("warning", "Nơi hẹn khác điểm xe", [`Đơn ${w.maDon ?? ""} hẹn khác điểm của xe. Xe đang chạy nên không cập nhật điểm — gọi tài xế${c.taiXe ? ` ${c.taiXe.ten}` : ""}.`]));
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

  const diem = h(
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
            h("span", { class: "dp-stop-noi" }, h("strong", null, h("span", { class: "dp-stop-loai-m" }, `${n.loai} · `), d.tenNoi), n.ghiChu ? h("span", { class: "dp-stop-note" }, n.ghiChu) : null),
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
      ...b.muc.map((m) => h("div", { class: "dp-cond" }, h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, m.loai), h("span", { class: "dp-cond-sub" }, [m.hang ? `hạng ${m.hang}` : null, m.hetHan ? `hạn ${m.hetHan.slice(8, 10)}/${m.hetHan.slice(5, 7)}/${m.hetHan.slice(0, 4)}` : null].filter(Boolean).join(" · "))))),
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
    khoa,
    baoCao,
    ...dais,
    h("div", { class: "dp-ct-layout" }, h("div", { class: "dp-ct-main" }, dongDt, soLieu, diem), h("div", { class: "dp-ct-side" }, dieuKien, nhatKy)),
  );
  // Điện thoại: nút ở cuối trang, lưới hai cột (bản vẽ 2b); máy tính: nút ở đầu trang.
  const huyDay = nutHuy("vc-btn-danger");
  replaceChildren(bottomEl, nutSua ? h("a", { class: "vc-btn vc-btn-ghost-primary", href: nutSua.getAttribute("href")!, "data-action": "sua-chuyen" }, "Sửa chuyến") : null, huyDay);
  bottomEl.hidden = !(nutSua || huyDay);
}

const lenhDiem = taoLenh();
async function capNhatDiem(nut: HTMLButtonElement): Promise<void> {
  const c = duLieu!.chuyen;
  nut.disabled = true;
  try {
    const r = await lenhDiem.gui<CapNhatDiemResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/cap-nhat-diem`, "POST", { version: c.version });
    duLieu = r;
    baoCao = r.daCapNhat > 0
      ? dai("ok", "Đã cập nhật điểm theo đơn", [`Đổi điểm cho ${r.daCapNhat} khách theo nơi đón / trả mới của đơn; điểm không còn khách chuyển “bỏ qua — không còn khách”.`])
      : dai("info", "Không có điểm nào cần cập nhật", ["Điểm dừng đã khớp các đơn trong chuyến."]);
  } catch (e) {
    const l = docLoiLenh(e);
    baoCao = l.cu ? dai("warning", "Chuyến vừa được người khác sửa — tải lại", ["Tải lại để xem bản mới rồi bấm lại."], () => location.reload()) : dai("danger", l.tieuDe, l.dong);
  }
  ve();
  (baoCao ?? trangEl).scrollIntoView({ block: "nearest" });
}

const lenhHuy = taoLenh();
function huy(nut: HTMLButtonElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  const gui = async (lyDo: string, phaLe?: string) => {
    const kq = await lenhHuy.gui<ChuyenChiTietResponse>(`/api/van-chuyen/chuyen/${encodeURIComponent(c.id)}/huy`, "POST", { version: c.version, lyDo, ...(phaLe ? { phaLe: { lyDo: phaLe } } : {}) });
    duLieu = kq;
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
        // H17: huỷ chuyến trong vùng khoá khi còn khách → phá lệ (khuôn 1f). Đóng hộp huỷ, mở hộp phá lệ, gửi lại cùng lệnh kèm phá lệ.
        setTimeout(() => moPhaLe({
          lyDo: r.lyDo, opener: nut, nutChinh: "Phá lệ và huỷ",
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
