// Khối giao diện dùng chung của các màn TIẾN ĐỘ chuyến (ADR-0049 D3, ADR-0050 VK1-A; bản vẽ docs/design/van-chuyen-dieu-phoi/project/05, 06): bấm thay của
// văn phòng ở Chi tiết chuyến (web/chuyen.ts) và màn tài xế (web/cuoc-chuyen.ts). Luật chữ ở src/shared/tien-do-man.ts; ở đây chỉ dựng DOM (h()) và gửi lệnh.
//  - `moKhaiGio`: hộp "<việc> — bấm thay tài xế" với ô "Xảy ra lúc" (thành phần A): mặc định lúc mở hộp, CHỈ gửi `xayRaLuc` khi người bấm ĐÃ đổi giờ (I34);
//    gợi ý "Sớm nhất" lấy từ máy chủ (`gioSomNhatKhai`, R-P14); 409 giờ → câu dưới ô; mất mạng → "Chưa gửi được — kiểm tra mạng rồi bấm lại." (hộp giữ
//    nguyên, giờ đã khai giữ nguyên, bấm lại dùng CÙNG requestId — không tự gửi lại).
//  - `veDiemChay`: điểm dừng + khách của chuyến đang chạy (bản vẽ 5a / 5c) — nút gọi `onLenh`, màn quyết có hỏi giờ hay gửi ngay.
import { buocDiem, cauConKhach, cauTuChoiKhaiGio, goiYKhaiGio, NHAN_LENH_SUAT, xayRaLucTu, type BuocDiem, type DiemVao, type LenhSuat, type SuatVao } from "../src/shared/tien-do-man";
import { nhanMocTienDo } from "../src/shared/dieu-phoi-hien-thi";
import type { GioVnDto, LyDoDangDungDto, MocTienDoDto } from "../src/shared/contracts";
import { ApiError } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import { chip, dai, docLoiLenh, LOI_MANG, nhomChon } from "./dieu-phoi-ui";
import { icon } from "./icons";
import { msToVnLocal } from "../src/shared/vn-date";

/** Câu lỗi của một lệnh tiến độ (409 giờ / còn khách / câu máy chủ / mất mạng). */
export function cauLoiTienDo(e: unknown, bayGioMs: number, ngayXem: string): { cau: string; oGio: boolean; mang: boolean } {
  if (!(e instanceof ApiError)) return { cau: LOI_MANG, oGio: false, mang: true };
  const d = (e.details ?? {}) as { maGio?: string[]; somNhat?: GioVnDto | null; mocChan?: Parameters<typeof cauTuChoiKhaiGio>[0]["mocChan"]; conSuat?: number; conDiem?: number; goiY?: string };
  if (e.code === "gio_xay_ra_ngoai_khoang") return { cau: cauTuChoiKhaiGio(d, bayGioMs, ngayXem), oGio: true, mang: false };
  if (e.code === "con_khach_chua_xong") return { cau: `${e.message} ${cauConKhach(d)}`, oGio: false, mang: false };
  const l = docLoiLenh(e);
  return { cau: [l.tieuDe, ...l.dong].join(" "), oGio: false, mang: false };
}

/**
 * Hộp bấm thay có ô "Xảy ra lúc" (bản vẽ 5c, 6d). `onGui(xayRaLuc | undefined, lyDo | undefined)` gửi lệnh — ném lỗi thì hộp giữ nguyên và hiện câu.
 * `lyDoNhom`: có thì hộp bắt chọn lý do của nhóm đó (Kết thúc gián đoạn — KHÔNG ô ghi chú, chủ trả lời Q1).
 */
export function moKhaiGio(o: {
  tieuDe: string;
  moTa: string;
  nutChinh: string;
  nutLop?: string;
  somNhat: GioVnDto | null;
  ngayXem: string;
  dauHop?: Child[];
  lyDo?: readonly LyDoDangDungDto[];
  opener?: HTMLElement | null;
  onGui: (xayRaLuc: string | undefined, lyDo: string | undefined) => Promise<void>;
}): void {
  const moLuc = Date.now();
  const macDinh = msToVnLocal(moLuc).time;
  const oGio = h("input", { id: "tdo-gio", class: "vc-input dp-khai-gio", type: "time", value: macDinh, "aria-describedby": "tdo-gio-hint tdo-gio-error" });
  const goiY = h("div", { id: "tdo-gio-hint", class: "vc-hint" }, goiYKhaiGio(o.somNhat, moLuc, o.ngayXem));
  const loiGio = h("div", { id: "tdo-gio-error", class: "vc-field-error", role: "alert", hidden: true });
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  let lyDo: string | undefined;
  const chinh = h("button", { type: "button", class: `vc-btn ${o.nutLop ?? "btn btn-primary"}`, disabled: !!o.lyDo, "data-action": "khai-gio-gui" }, o.nutChinh);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const nhom = o.lyDo
    ? nhomChon("tdo-ly-do", "Lý do", o.lyDo.map((l) => ({ code: l.code, nhan: l.nhan })), (c) => {
        lyDo = c;
        chinh.disabled = false;
      })
    : null;
  const bang = moBangTruot({
    title: o.tieuDe,
    body: [
      ...(o.dauHop ?? []),
      h("p", { class: "dp-sheet-text" }, o.moTa),
      nhom,
      h("div", { class: "vc-field dp-khai-gio-field" }, h("label", { for: "tdo-gio" }, "Xảy ra lúc"), oGio, goiY, loiGio),
      loi,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener: o.opener,
  });
  if (!bang) return;
  bang.dialog.classList.add("dp-sheet-khai-gio");
  dong.addEventListener("click", () => bang.close());
  oGio.addEventListener("input", () => {
    loiGio.hidden = true;
    oGio.removeAttribute("aria-invalid");
  });
  chinh.addEventListener("click", async () => {
    if (o.lyDo && !lyDo) return;
    // Chỉ gửi giờ khi người bấm ĐÃ đổi ô (I34) — để nguyên = lúc bấm do máy chủ ghi.
    const doi = oGio.value !== macDinh;
    let xayRaLuc: string | undefined;
    if (doi) {
      const v = xayRaLucTu(oGio.value, Date.now());
      if (!v) {
        replaceChildren(loiGio, icon("alert", 16, 2), "Chọn giờ theo dạng giờ:phút.");
        loiGio.hidden = false;
        oGio.setAttribute("aria-invalid", "true");
        return;
      }
      xayRaLuc = v;
    }
    bang.setBusy(true);
    chinh.disabled = true;
    loi.hidden = true;
    loiGio.hidden = true;
    try {
      await o.onGui(xayRaLuc, lyDo);
      bang.close(false);
    } catch (e) {
      const l = cauLoiTienDo(e, Date.now(), o.ngayXem);
      const dich = l.oGio ? loiGio : loi;
      replaceChildren(dich, icon("alert", 16, 2), l.cau);
      dich.hidden = false;
      if (l.oGio) oGio.setAttribute("aria-invalid", "true");
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Dòng mốc tiến độ ("Đã tới 07:31 · ghi lúc 07:45 — Hoa" + chip "giờ do văn phòng khai") — thành phần B. */
export function dongMoc(nhan: string, m: MocTienDoDto | null, ngayXem: string): HTMLElement | null {
  if (!m) return null;
  const gio = (g: GioVnDto) => (g.ngay === ngayXem ? g.gio : `${g.gio} ${g.ngay.slice(8, 10)}/${g.ngay.slice(5, 7)}`);
  // nhanMocTienDo nhận giờ TRẦN "HH:MM" (chuỗi kèm ngày làm nó ném RangeError — lỗi lần chạy đầu cuoc-smoke); ngày chỉ nối khi khác ngày đang xem.
  const n = nhanMocTienDo({ gioXayRa: m.gioXayRa.gio, gioGhiNhan: m.gioGhiNhan.gio, vanPhongKhai: m.vanPhongKhai, nguoiBam: m.nguoiBam ?? null });
  const sau = n.vanPhongKhai ? n.chu.slice(n.chu.indexOf(" · ") + 3).replace(m.gioGhiNhan.gio, gio(m.gioGhiNhan)) : "";
  return h(
    "span",
    { class: "dp-moc" },
    `${nhan} `,
    h("strong", null, gio(m.gioXayRa)),
    sau ? h("span", { class: "dp-moc-ghi" }, ` · ${sau}`) : null,
    n.vanPhongKhai ? chip("giờ do văn phòng khai", "warn") : null,
  );
}

export type LenhDiem = { loai: "da-toi"; buoc: BuocDiem } | { loai: "tra-het"; buoc: BuocDiem } | { loai: LenhSuat; buoc: BuocDiem; suatId: string; ten: string };
/**
 * Điểm dừng + khách của chuyến ĐANG CHẠY (bản vẽ 5a thẻ từng điểm; 5c văn phòng dùng cùng khối). `coNut` = người xem được bấm (tài xế đang lái, hoặc văn phòng
 * có ô trip.progress). `phuDiem(b)` thêm dòng riêng của màn (liên hệ của tài xế, nút đổi thứ tự…).
 */
export function veDiemChay(o: {
  diem: readonly DiemVao[];
  suat: readonly SuatVao[];
  trangThai: string;
  ngayXem: string;
  coNut: boolean;
  onLenh: (l: LenhDiem, nut: HTMLButtonElement) => void;
  phuDiem?: (b: BuocDiem) => { ben?: Child; duoi?: Child[] };
  choGui?: ReadonlySet<string>;
}): HTMLElement[] {
  return buocDiem(o.diem, o.suat, o.trangThai, o.ngayXem).map((b) => {
    const d = b.diem;
    const nutDiem = o.coNut && b.nut ? h("button", { type: "button", class: "vc-btn btn btn-primary dp-run-btn", "data-action": b.nut.lenh, "data-diem": d.id }, b.nut.nhan) : null;
    nutDiem?.addEventListener("click", () => o.onLenh(b.nut!.lenh === "da-toi" ? { loai: "da-toi", buoc: b } : { loai: "tra-het", buoc: b }, nutDiem));
    const phu = o.phuDiem ? o.phuDiem(b) : {};
    return h(
      "section",
      { class: `vc-card dp-run is-${b.trangThaiHien}`, "data-diem": d.id, "aria-label": `${b.nhanLoai} ${d.tenNoi}` },
      h(
        "div",
        { class: "dp-run-head" },
        h("span", { class: "dp-run-so" }, b.so),
        h(
          "span",
          { class: "dp-run-text" },
          h("span", { class: "dp-run-loai" }, b.nhanLoai),
          h("span", { class: "dp-run-noi" }, d.tenNoi),
          dongMoc("Đã tới", d.daToi, o.ngayXem),
          d.trangThai === "SKIPPED" ? h("span", { class: "dp-run-bo" }, "Bỏ qua — không còn khách") : null,
        ),
        phu.ben ?? null,
      ),
      ...(phu.duoi ?? []),
      ...b.khach.map((k) => {
        const cho = o.choGui?.has(k.suatId) ?? false;
        const nut = o.coNut && !cho ? k.nut.map((l) => {
          const x = h("button", { type: "button", class: `vc-btn ${l === "don" ? "btn btn-primary" : "vc-btn-ghost-primary"} dp-khach-btn`, "data-action": l, "data-suat": k.suatId }, NHAN_LENH_SUAT[l]);
          x.addEventListener("click", () => o.onLenh({ loai: l, buoc: b, suatId: k.suatId, ten: k.ten }, x));
          return x;
        }) : [];
        return h(
          "div",
          { class: `dp-khach${cho ? " is-cho" : ""}`, "data-suat": k.suatId },
          h("div", { class: "dp-khach-dong" }, h("span", { class: "dp-khach-ten" }, k.ten), k.namSinh ? h("span", { class: "dp-khach-nam" }, String(k.namSinh)) : null,
            k.ketQua ? h("span", { class: `dp-khach-kq${k.ketQua === "Vắng" ? " is-vang" : k.ketQua === "Đã đón" || k.ketQua === "Đã trả" ? " is-ok" : ""}` }, k.ketQua) : null),
          cho ? h("div", { class: "dp-khach-cho" }, "Chưa gửi được", h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "bam-lai", "data-suat": k.suatId }, "Bấm lại")) : null,
          nut.length ? h("div", { class: "dp-khach-nut" }, ...nut) : null,
        );
      }),
      nutDiem ? h("div", { class: "dp-run-foot" }, nutDiem, h("span", { class: "dp-note" }, b.nut!.goiY)) : null,
    );
  });
}

/** Dải "Chưa gửi được" dùng chung. */
export const daiChuaGui = (): HTMLElement => dai("warning", "Chưa gửi được", ["Kiểm tra mạng rồi bấm lại ở dòng đó — máy không tự gửi lại."]);
