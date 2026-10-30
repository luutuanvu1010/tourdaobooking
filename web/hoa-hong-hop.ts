// Hộp trượt của trang «Hoa hồng đối tác» (PR 2, đợt 2): Thêm mức, Đổi, Ngừng, Sửa (ADR-0148), Đổi chính sách, Áp dụng chính sách cho loại. Mỗi hộp là `moBangTruot`; gửi xong thì đóng hộp, `napLai`
// vẽ lại trang; lỗi máy chủ (400/409) hiện NGUYÊN câu của máy chủ trong hộp (`.sheet-warn`), hộp giữ mở, nút bấm lại được.
// Gọi (ghi): POST /api/pricing/hoa-hong, /hoa-hong/:id/doi, /hoa-hong/:id/dong, /hoa-hong/:id/sua, /muc-ta/:code/dong, /muc-ta/gan, /muc-ta/gan/:id/doi, /muc-ta/gan/:id/ket-thuc,
// /muc-ta/gan/:id/sua. Đọc trước khi mở hộp Sửa: GET /hoa-hong/:id/sua, /muc-ta/gan/:id/sua (đường huỷ–thay hay «từ ngày» do máy chủ quyết, giao diện không đoán).
// Trang không tính tiền, không chọn mức: ô đọc bằng src/shared/so-dai-ly-nhap.ts, chữ ở src/shared/hoa-hong-hien-thi.ts; máy chủ kiểm lại tất cả.
import {
  CAU_THEO_LOAI_KHACH,
  cauCanhBaoDongRieng,
  cauCanhBaoTheoChinhSach,
  cauDoiTuNgayMai,
  cauMucCuSeNgung,
  cauSeTao,
  cauXemTruocSua,
  chinhSachCuaLoai,
  coTheTimDoiTac,
  ngayDoiSomNhat,
  nhanDoiTuong,
  nhanMucDto,
  nhanPhamVi,
} from "../src/shared/hoa-hong-hien-thi";
import type { PermissionHolder } from "../src/shared/permissions";
import { nhanDong, nhanTyLeBp } from "../src/shared/so-dai-ly-nhan";
import { docLyDoSua, docNgayDong, docThanDoiMuc, docThanDongMucTa, docThanGan, docThanMuc, ngayDongMacDinh, type FormMuc, type LoiO, type PhamViForm } from "../src/shared/so-dai-ly-nhap";
import { addDays, ngayDayDu } from "../src/shared/vn-date";
import { api, type Api } from "./api";
import { moBangTruot } from "./bang-truot";
import { h, type Child } from "./dom";
import type { DuLieuHoaHong } from "./hoa-hong";
import { lyDoLoi, taoBangLoi, taoChonDichVu, taoTimDoiTac, type BangLoi } from "./so-dai-ly-ui";

export interface MoHop {
  themMuc(dien?: { ai: { loai: "VAI"; code: string } | { loai: "DOI_TAC"; partyId: string; ten: string } | { loai: "MUC"; code: string } }): void;
  doi(d: Api.CommissionRuleDto): void;
  /** ADR-0148 Đ1: hỏi máy chủ đường Sửa (GET …/sua) rồi mở hộp Sửa điền sẵn mức cũ; lý do bắt buộc. */
  sua(d: Api.CommissionRuleDto): void;
  /** ADR-0148 Đ1: Sửa một lần áp dụng chính sách cho loại (chính sách + hai ngày), lý do bắt buộc. */
  suaApDung(gan: Api.GanLoaiMucDto): void;
  /** `moTa` thay câu mô tả mặc định khi không có dòng mức để mô tả (vd ngừng một lần áp dụng chính sách cho loại). */
  ngung(d: Api.CommissionRuleDto, url: string, moTa?: string): void;
  /** Ngừng một lần áp dụng chính sách cho loại (R21): chọn ngày cuối, `POST /api/pricing/muc-ta/gan/:id/ket-thuc`. */
  ngungApDung(gan: Api.GanLoaiMucDto): void;
  doiChinhSach(gan: Api.GanLoaiMucDto): void;
  apDungChinhSach(muc: Api.MucTaDto): void;
  /** Hộp chỉ hỏi tên → thêm loại đối tác (`POST /api/pricing/loai-doi-tac`). */
  themLoai(): void;
  /** Hộp chỉ hỏi tên → thêm chính sách (`POST /api/pricing/muc-ta`). */
  themChinhSach(): void;
  /** Lệnh một bước không cần hộp (Tắt / Bật): gửi, nạp lại trang; trả câu lỗi nguyên văn của máy chủ, hoặc null nếu xong. */
  guiNhanh(path: string, thongBao: string): Promise<string | null>;
}

export interface NguCanhHop {
  lay(): DuLieuHoaHong;
  napLai(): Promise<void>;
  nguoiDung: PermissionHolder;
  /** Thông báo thành công ở đầu trang (null = xoá). */
  baoOk(text: string | null): void;
  /** Khung vàng giữ sau khi đóng hộp (null = xoá). */
  canhBao(node: HTMLElement | null): void;
}

const MA_NGAY = (s: string): string => ngayDayDu(s);

/** Mở một hộp một-bước: `chuan` đọc ô (hiện lỗi ô nếu sai, trả null), `xong` chạy sau khi đã đóng hộp và vẽ lại trang. */
function moHop(ctx: NguCanhHop, o: { title: string; body: Child[]; nhan: string; chuan: () => { path: string; body: unknown } | null; xong: (r: unknown) => void }): void {
  const loiEl = h("p", { class: "sheet-warn", role: "alert", hidden: true });
  const gui = h("button", { type: "button", class: "btn btn-primary" }, o.nhan);
  const huy = h("button", { type: "button", class: "btn" }, "Huỷ");
  const sheet = moBangTruot({ title: o.title, body: [loiEl, ...o.body], foot: [huy, gui], footClass: "loc-foot", opener: document.activeElement instanceof HTMLElement ? document.activeElement : null });
  if (!sheet) return;
  huy.addEventListener("click", () => sheet.close());
  gui.addEventListener("click", async () => {
    if (gui.disabled) return;
    loiEl.hidden = true;
    const req = o.chuan();
    if (req === null) return;
    gui.disabled = true;
    huy.disabled = true;
    sheet.setBusy(true);
    ctx.canhBao(null);
    ctx.baoOk(null);
    try {
      const r = await api<unknown>(req.path, { method: "POST", body: req.body });
      sheet.setBusy(false);
      sheet.close(false);
      await ctx.napLai();
      o.xong(r);
    } catch (err) {
      sheet.setBusy(false);
      gui.disabled = false;
      huy.disabled = false;
      loiEl.textContent = lyDoLoi(err); // nguyên câu của máy chủ
      loiEl.hidden = false;
      loiEl.scrollIntoView({ block: "nearest" });
      if (err instanceof Error && "status" in err && (err as { status: number }).status === 409) void ctx.napLai(); // số liệu phía sau hộp đã cũ
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// Khối «Cách tính» + «Hiệu lực» + «Ghi chú» dùng chung cho Thêm mức và Đổi

interface CachTinh {
  readonly root: HTMLElement;
  doc(): { kieu: "RATE" | "PER_PAX"; tyLe: string; moiKhach: string; theoLoai: boolean; treEm: string; nguoiCaoTuoi: string; tuNgay: string; denNgay: string; ghiChu: string };
  /** Gọi khi bất kỳ ô nào đổi. */
  khiDoi(fn: () => void): void;
}

/** `denMacDinh` (hộp Sửa): điền sẵn ngày kết thúc cũ — thiếu nó, sửa riêng con số sẽ lặng lẽ biến dòng có hạn thành không thời hạn. `tuMax`: ngày bắt đầu muộn nhất (Sửa «từ ngày»). */
function dungCachTinh(o: { tienTo: string; loi: BangLoi; homNay: string; tuMacDinh: string; tuMin: string | null; tuMax?: string | null; denMacDinh?: string | null; san: Api.CommissionRuleDto | null }): CachTinh {
  const p = o.tienTo;
  const kieu = h("select", { id: `${p}-kieu`, "aria-label": "Cách tính" }, h("option", { value: "RATE" }, "Phần trăm"), h("option", { value: "PER_PAX" }, "Số tiền mỗi khách"));
  const tyLe = h("input", { id: `${p}-ty-le`, type: "text", inputMode: "decimal", maxLength: 7, placeholder: "12,5", autocomplete: "off" });
  const moiKhach = h("input", { id: `${p}-moi-khach`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "50.000", autocomplete: "off" });
  const nhanMoiKhach = h("span", null, "Số tiền mỗi khách (đồng)");
  const bat = h("input", { id: `${p}-theo-loai`, type: "checkbox", class: "o-tick" });
  const treEm = h("input", { id: `${p}-tre-em`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "Bắt buộc", autocomplete: "off" });
  const nguoiCaoTuoi = h("input", { id: `${p}-nguoi-cao-tuoi`, type: "text", inputMode: "numeric", maxLength: 12, placeholder: "Bắt buộc", autocomplete: "off" });
  const khuTyLe = h("label", null, "Phần trăm (%)", tyLe);
  const haiO = h("div", null, h("div", { class: "grid two" }, h("label", null, "Trẻ em (đồng)", treEm), h("label", null, "Người cao tuổi (đồng)", nguoiCaoTuoi)), h("p", { class: "hint" }, CAU_THEO_LOAI_KHACH));
  const khuTien = h("div", null, h("label", null, nhanMoiKhach, moiKhach), h("label", { class: "check" }, bat, "Tách theo loại khách"), haiO);
  const tu = h("input", { id: `${p}-tu-ngay`, type: "date", value: o.tuMacDinh });
  if (o.tuMin !== null) tu.min = o.tuMin;
  if (o.tuMax) tu.max = o.tuMax;
  const denChon = h("select", { id: `${p}-den-chon`, "aria-label": "Đến" }, h("option", { value: "" }, "không thời hạn"), h("option", { value: "NGAY" }, "chọn ngày…"));
  const den = h("input", { id: `${p}-den-ngay`, type: "date", "aria-label": "Ngày cuối hiệu lực", hidden: true });
  if (o.denMacDinh) {
    denChon.value = "NGAY";
    den.value = o.denMacDinh;
  }
  const ghiChu = h("input", { id: `${p}-ghi-chu`, type: "text", maxLength: 200, autocomplete: "off" });

  const ve = (): void => {
    const rate = kieu.value === "RATE";
    khuTyLe.hidden = !rate;
    khuTien.hidden = rate;
    haiO.hidden = !bat.checked;
    nhanMoiKhach.textContent = bat.checked ? "Người lớn (đồng)" : "Số tiền mỗi khách (đồng)";
    den.hidden = denChon.value !== "NGAY";
  };
  if (o.san) {
    kieu.value = o.san.kieu;
    if (o.san.kieu === "RATE") tyLe.value = nhanTyLeBp(o.san.tyLeBp ?? 0).replace("%", "");
    else {
      moiKhach.value = nhanDong(o.san.moiKhach ?? 0);
      if (o.san.theoLoai) {
        bat.checked = true;
        treEm.value = nhanDong(o.san.theoLoai.treEm);
        nguoiCaoTuoi.value = nhanDong(o.san.theoLoai.nguoiCaoTuoi);
      }
    }
    ghiChu.value = o.san.ghiChu ?? "";
  }
  for (const e of [kieu, bat, denChon]) e.addEventListener("change", ve);
  ve();

  const root = h(
    "div",
    { class: "hh-hop-khoi" },
    h("div", null, h("label", null, "Cách tính", kieu), khuTyLe, khuTien, o.loi.dong("muc")),
    h(
      "fieldset",
      { class: "hh-nhom" },
      h("legend", null, "Hiệu lực"),
      h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ", tu), o.loi.dong("tuNgay")), h("div", null, h("label", null, "Đến", denChon), den, o.loi.dong("denNgay"))),
    ),
    h("div", null, h("label", null, "Ghi chú (không bắt buộc)", ghiChu), o.loi.dong("ghiChu")),
  );
  return {
    root,
    doc: () => ({
      kieu: kieu.value === "PER_PAX" ? "PER_PAX" : "RATE",
      tyLe: tyLe.value,
      moiKhach: moiKhach.value,
      theoLoai: bat.checked,
      treEm: treEm.value,
      nguoiCaoTuoi: nguoiCaoTuoi.value,
      tuNgay: tu.value,
      denNgay: denChon.value === "NGAY" ? den.value : "",
      ghiChu: ghiChu.value,
    }),
    khiDoi(fn) {
      root.addEventListener("input", fn);
      root.addEventListener("change", fn);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------

/** Khung vàng sau khi áp dụng chính sách mà máy chủ báo còn mức riêng thắng (`dongRieng`). */
function khungDongRieng(r: Api.GanLoaiMucResponse, d: DuLieuHoaHong): HTMLElement {
  return h(
    "div",
    { class: "sheet-warn", role: "status" },
    h("div", null, h("p", null, h("strong", null, cauCanhBaoDongRieng(r.gan.loai.ten, r.gan.muc.ten, r.dongRieng.length))), h("ul", { class: "hh-mucta-dong-rieng" }, ...r.dongRieng.map((x) => h("li", null, `${nhanDoiTuong(x.doiTuong).ten} · ${nhanPhamVi(x, d.ten)} · ${nhanMucDto(x)}`))), h("p", null, "Ngừng các mức riêng đó ở thẻ «Loại đối tác».")),
  );
}

export function taoMoHop(ctx: NguCanhHop): MoHop {
  const duocTimTen = coTheTimDoiTac(ctx.nguoiDung);

  function themMuc(dien?: Parameters<MoHop["themMuc"]>[0]): void {
    const d = ctx.lay();
    const loi = taoBangLoi();
    const dich = dien?.ai;
    const laMuc = dich?.loai === "MUC";
    // ---- Ai được hưởng
    let ai: HTMLElement;
    let docAi: () => FormMuc["doiTuong"] = () => null;
    let tenAi: () => string = () => "";
    let tuLoai: () => string | null = () => null;
    if (dich?.loai === "MUC") {
      const tenMuc = d.mucTa.muc.find((m) => m.code === dich.code)?.ten ?? "";
      ai = h("p", null, h("strong", null, `Chính sách ${tenMuc}`));
      tenAi = () => `Chính sách ${tenMuc}`;
    } else {
      const loaiVai = h("input", { type: "radio", class: "o-tick", name: "hh-hop-ai", value: "VAI", checked: dich?.loai !== "DOI_TAC" });
      const loaiDt = h("input", { type: "radio", class: "o-tick", name: "hh-hop-ai", value: "DOI_TAC", checked: dich?.loai === "DOI_TAC" });
      const vai = h("select", { id: "hh-hop-vai", "aria-label": "Loại đối tác" }, h("option", { value: "" }, "— Chọn loại đối tác —"), ...d.vai.map((v) => h("option", { value: v.code }, v.ten)));
      if (dich?.loai === "VAI") vai.value = dich.code;
      const tim = taoTimDoiTac({ choPhep: true, id: "hh-hop-doi-tac" });
      if (dich?.loai === "DOI_TAC") tim.datChon({ partyId: dich.partyId, ten: dich.ten });
      const khuVai = h("div", null, vai);
      const khuDt = h("div", null, tim.root);
      const veAi = (): void => {
        khuVai.hidden = !loaiVai.checked;
        khuDt.hidden = !loaiDt.checked;
      };
      loaiVai.addEventListener("change", veAi);
      loaiDt.addEventListener("change", veAi);
      veAi();
      ai = h(
        "div",
        null,
        duocTimTen && h("div", { class: "hh-radio" }, h("label", { class: "check" }, loaiVai, "Loại đối tác"), h("label", { class: "check" }, loaiDt, "Một đối tác")),
        khuVai,
        duocTimTen && khuDt,
      );
      docAi = () => (loaiDt.checked && duocTimTen ? { loai: "DOI_TAC", partyId: tim.chon()?.partyId ?? "" } : { loai: "VAI", code: vai.value });
      tenAi = () => (loaiDt.checked && duocTimTen ? (tim.chon()?.ten ?? "") : (d.vai.find((v) => v.code === vai.value)?.ten ?? ""));
      tuLoai = () => (loaiDt.checked && duocTimTen ? null : vai.value || null);
      tim.khiDoi(() => {
        loi.xoa();
        veCau();
      });
    }
    // ---- Dịch vụ
    const pv = h("select", { id: "hh-hop-pham-vi", "aria-label": "Dịch vụ" }, h("option", { value: "ALL" }, "Tất cả dịch vụ"), h("option", { value: "GROUP" }, "Một nhóm"), h("option", { value: "SERVICE" }, "Một dịch vụ"));
    pv.value = "SERVICE";
    const nhom = h("select", { id: "hh-hop-nhom", "aria-label": "Nhóm dịch vụ" }, h("option", { value: "" }, "— Chọn nhóm —"), ...d.dm.nhom.map((g) => h("option", { value: g.code }, g.name)));
    const dv = taoChonDichVu(d.dm, "hh-hop-dich-vu");
    const khuNhom = h("div", null, nhom);
    const khuDv = h("div", null, dv.root);
    const vePv = (): void => {
      khuNhom.hidden = pv.value !== "GROUP";
      khuDv.hidden = pv.value !== "SERVICE";
    };
    pv.addEventListener("change", vePv);
    vePv();
    const dichVu = h("div", { class: "hh-pham-vi" }, h("label", null, "Dịch vụ", pv), khuNhom, khuDv, loi.dong("phamVi"));

    const ct = dungCachTinh({ tienTo: "hh-hop", loi, homNay: d.homNay, tuMacDinh: d.homNay, tuMin: null, san: null });
    const cau = h("p", { class: "hint", "aria-live": "polite", hidden: true });
    const canh = h("p", { class: "sheet-warn", hidden: true });

    const docDichVu = (): { phamVi: PhamViForm; catalogCode: string; groupCode: string } => ({ phamVi: pv.value as PhamViForm, catalogCode: pv.value === "SERVICE" ? dv.ma() : "", groupCode: pv.value === "GROUP" ? nhom.value : "" });
    const docThan = (): ReturnType<typeof docThanMuc> | ReturnType<typeof docThanDongMucTa> => {
      const f = { ...docDichVu(), ...ct.doc() };
      return dich?.loai === "MUC" ? docThanDongMucTa(f) : docThanMuc({ doiTuong: docAi(), ...f });
    };
    const veCau = (): void => {
      const kq = docThan();
      if (kq.ok) {
        const b = kq.body;
        const muc = nhanMucDto({ kieu: b.kieu, tyLeBp: "tyLeBp" in b ? b.tyLeBp : null, moiKhach: "moiKhach" in b ? b.moiKhach : null, theoLoai: "theoLoai" in b && b.theoLoai ? { nguoiLon: "moiKhach" in b ? b.moiKhach : 0, treEm: b.theoLoai.treEm, nguoiCaoTuoi: b.theoLoai.nguoiCaoTuoi } : null });
        cau.textContent = cauSeTao({ ai: tenAi(), dichVu: nhanPhamVi({ phamVi: b.phamVi, catalogCode: b.catalogCode ?? null, groupCode: b.groupCode ?? null }, d.ten), muc, tu: b.tuNgay, den: b.denNgay ?? null });
        cau.hidden = false;
      } else cau.hidden = true;
      const code = tuLoai();
      const cs = code === null ? null : chinhSachCuaLoai(ctx.lay().mucTa, code);
      canh.textContent = cs ? cauCanhBaoTheoChinhSach(cs.muc.ten) : "";
      canh.hidden = cs === null;
    };
    moHop(ctx, {
      title: laMuc ? "Thêm mức vào chính sách" : "Thêm mức",
      body: [
        h("fieldset", { class: "hh-nhom" }, h("legend", null, "Ai được hưởng"), ai, loi.dong("doiTuong")),
        dichVu,
        ct.root,
        cau,
        canh,
      ],
      nhan: "Thêm mức",
      chuan() {
        const kq = docThan();
        if (!kq.ok) {
          loi.hien(kq.loi);
          return null;
        }
        loi.xoa();
        const path = dich?.loai === "MUC" ? `/api/pricing/muc-ta/${encodeURIComponent(dich.code)}/dong` : "/api/pricing/hoa-hong";
        return { path, body: kq.body };
      },
      xong: () => ctx.baoOk("Đã thêm mức."),
    });
    // Câu «Sẽ tạo» và cảnh báo chính sách cập nhật theo mọi thay đổi ở ba khối ô.
    for (const k of [ai, dichVu, ct.root]) {
      k.addEventListener("input", veCau);
      k.addEventListener("change", veCau);
    }
    veCau();
  }

  function doi(dong: Api.CommissionRuleDto): void {
    const d = ctx.lay();
    const loi = taoBangLoi();
    const tuSom = ngayDoiSomNhat(dong.tuNgay, d.homNay); // mức cũ bắt đầu hôm nay ⇒ ngày mai (chủ dự án 28/10)
    const ct = dungCachTinh({ tienTo: "hh-doi", loi, homNay: d.homNay, tuMacDinh: tuSom, tuMin: tuSom, san: dong });
    const mucCu = nhanMucDto(dong);
    const cauCu = h("p", { class: "hint", "aria-live": "polite" }, cauMucCuSeNgung(mucCu, tuSom));
    const cauMai = cauDoiTuNgayMai(dong.tuNgay, d.homNay);
    ct.khiDoi(() => {
      const tu = ct.doc().tuNgay;
      cauCu.textContent = /^\d{4}-\d{2}-\d{2}$/.test(tu) ? cauMucCuSeNgung(mucCu, tu) : "";
    });
    const ten = nhanDoiTuong(dong.doiTuong);
    moHop(ctx, {
      title: "Đổi mức",
      body: [
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Ai được hưởng"), h("strong", null, ten.ten), " ", h("span", { class: "muted" }, ten.loai)),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Dịch vụ"), h("strong", null, nhanPhamVi(dong, d.ten))),
        ct.root,
        cauCu,
        ...(cauMai ? [h("p", { class: "hint" }, cauMai)] : []),
      ],
      nhan: "Đổi mức",
      chuan() {
        const kq = docThanDoiMuc(ct.doc());
        if (!kq.ok) {
          loi.hien(kq.loi);
          return null;
        }
        loi.xoa();
        return { path: `/api/pricing/hoa-hong/${encodeURIComponent(dong.id)}/doi`, body: kq.body };
      },
      xong: () => ctx.baoOk("Đã đổi mức."),
    });
  }

  /** GET xem trước của Sửa; lỗi (400 đã huỷ / hết hạn, 403, 503) hiện nguyên câu máy chủ ở khung vàng đầu trang, không mở hộp. */
  async function xemTruocSua(url: string): Promise<Api.SuaXemTruocResponse | null> {
    ctx.baoOk(null);
    ctx.canhBao(null);
    try {
      return await api<Api.SuaXemTruocResponse>(url);
    } catch (err) {
      ctx.canhBao(h("p", { class: "sheet-warn", role: "alert" }, lyDoLoi(err)));
      return null;
    }
  }
  /** Ô «Lý do sửa» (bắt buộc, 10–300 ký tự — `docLyDoSua`, cùng luật với máy chủ). */
  const oLyDo = (id: string, loi: BangLoi): { root: HTMLElement; doc: () => ReturnType<typeof docLyDoSua> } => {
    const o = h("input", { id, type: "text", maxLength: 300, autocomplete: "off", required: true });
    return { root: h("div", null, h("label", null, "Lý do sửa (bắt buộc)", o), loi.dong("lyDo")), doc: () => docLyDoSua(o.value) };
  };

  async function sua(dong: Api.CommissionRuleDto): Promise<void> {
    const url = `/api/pricing/hoa-hong/${encodeURIComponent(dong.id)}/sua`;
    const xt = await xemTruocSua(url);
    if (!xt) return;
    const d = ctx.lay();
    const loi = taoBangLoi();
    const tuNgay = xt.duong === "HUY_THAY" ? dong.tuNgay : xt.tuNgaySomNhat; // huỷ–thay: giữ được ngày bắt đầu cũ (Q5)
    const ct = dungCachTinh({ tienTo: "hh-sua", loi, homNay: d.homNay, tuMacDinh: tuNgay, tuMin: xt.duong === "TU_NGAY" ? xt.tuNgaySomNhat : null, tuMax: xt.duong === "TU_NGAY" ? xt.denNgayToiDa : null,
      denMacDinh: dong.denNgay, san: dong });
    const mucCu = nhanMucDto(dong);
    const cauCu = h("p", { class: "hint", "aria-live": "polite", hidden: xt.duong === "HUY_THAY" }, xt.duong === "TU_NGAY" ? cauMucCuSeNgung(mucCu, tuNgay) : "");
    if (xt.duong === "TU_NGAY") {
      ct.khiDoi(() => {
        const tu = ct.doc().tuNgay;
        cauCu.textContent = /^\d{4}-\d{2}-\d{2}$/.test(tu) ? cauMucCuSeNgung(mucCu, tu) : "";
      });
    }
    const lyDo = oLyDo("hh-sua-ly-do", loi);
    const ten = nhanDoiTuong(dong.doiTuong);
    moHop(ctx, {
      title: "Sửa mức",
      body: [
        h("p", { class: "hint", role: "status" }, h("strong", null, cauXemTruocSua(xt))),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Ai được hưởng"), h("strong", null, ten.ten), " ", h("span", { class: "muted" }, ten.loai)),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Dịch vụ"), h("strong", null, nhanPhamVi(dong, d.ten))),
        ct.root,
        cauCu,
        lyDo.root,
      ],
      nhan: "Lưu sửa",
      chuan() {
        const kq = docThanDoiMuc(ct.doc());
        const ld = lyDo.doc();
        if (!kq.ok || !ld.ok) {
          loi.hien([...(kq.ok ? [] : kq.loi), ...(ld.ok ? [] : [{ truong: "lyDo", message: ld.message } satisfies LoiO])]);
          return null;
        }
        loi.xoa();
        return { path: url, body: { ...kq.body, lyDo: ld.value } };
      },
      xong: () => ctx.baoOk("Đã sửa mức."),
    });
  }

  async function suaApDung(gan: Api.GanLoaiMucDto): Promise<void> {
    const url = `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/sua`;
    const xt = await xemTruocSua(url);
    if (!xt) return;
    const d = ctx.lay();
    const loi = taoBangLoi();
    const chon = h("select", { id: "hh-sua-gan-muc", "aria-label": "Chính sách" }, h("option", { value: "" }, "— Chọn chính sách —"), ...d.mucTa.muc.filter((m) => m.dangBat).map((m) => h("option", { value: m.code }, m.ten)));
    chon.value = d.mucTa.muc.some((m) => m.dangBat && m.code === gan.muc.code) ? gan.muc.code : "";
    const tu = h("input", { id: "hh-sua-gan-tu", type: "date", value: xt.duong === "HUY_THAY" ? gan.tuNgay : xt.tuNgaySomNhat });
    if (xt.duong === "TU_NGAY") {
      tu.min = xt.tuNgaySomNhat;
      if (xt.denNgayToiDa) tu.max = xt.denNgayToiDa;
    }
    const denChon = h("select", { id: "hh-sua-gan-den-chon", "aria-label": "Đến" }, h("option", { value: "" }, "không thời hạn"), h("option", { value: "NGAY" }, "chọn ngày…"));
    const den = h("input", { id: "hh-sua-gan-den", type: "date", "aria-label": "Ngày cuối hiệu lực", value: gan.denNgay ?? "", hidden: gan.denNgay === null });
    denChon.value = gan.denNgay === null ? "" : "NGAY";
    denChon.addEventListener("change", () => (den.hidden = denChon.value !== "NGAY"));
    const lyDo = oLyDo("hh-sua-gan-ly-do", loi);
    moHop(ctx, {
      title: "Sửa áp dụng chính sách",
      body: [
        h("p", { class: "hint", role: "status" }, h("strong", null, cauXemTruocSua(xt, "chính sách này"))),
        h("p", null, h("span", { class: "hh-nhan-nho" }, "Loại đối tác"), h("strong", null, gan.loai.ten)),
        h("div", null, h("label", null, "Chính sách", chon), loi.dong("mucTa")),
        h("fieldset", { class: "hh-nhom" }, h("legend", null, "Hiệu lực"),
          h("div", { class: "grid two" }, h("div", null, h("label", null, "Từ", tu), loi.dong("tuNgay")), h("div", null, h("label", null, "Đến", denChon), den, loi.dong("denNgay")))),
        lyDo.root,
      ],
      nhan: "Lưu sửa",
      chuan() {
        const kq = docThanGan({ loai: gan.loai.code, muc: chon.value, tuNgay: tu.value, denNgay: denChon.value === "NGAY" ? den.value : "" });
        const ld = lyDo.doc();
        if (!kq.ok || !ld.ok) {
          loi.hien([...(kq.ok ? [] : kq.loi), ...(ld.ok ? [] : [{ truong: "lyDo", message: ld.message } satisfies LoiO])]);
          return null;
        }
        loi.xoa();
        const { loai: _loai, ...than } = kq.body; // đích (loại) giữ nguyên — máy chủ đọc từ dòng cũ
        return { path: url, body: { ...than, lyDo: ld.value } };
      },
      xong: (r) => {
        const x = r as Api.SuaGanLoaiResponse;
        if (x.dongRieng.length > 0) ctx.canhBao(khungDongRieng({ gan: x.moi, dongRieng: x.dongRieng }, ctx.lay()));
        else ctx.baoOk(`Đã sửa: loại «${x.moi.loai.ten}» theo chính sách «${x.moi.muc.ten}» từ ngày ${MA_NGAY(x.moi.tuNgay)}.`);
      },
    });
  }

  /** Hộp «chọn ngày cuối hiệu lực» dùng chung cho Ngừng một mức và Ngừng áp dụng một chính sách. */
  function hopNgay(o: { tuNgay: string; moTa: string; url: string; title: string; nhan: string; daXong: string }): void {
    const d = ctx.lay();
    const ngay = h("input", { id: "hh-ngung-ngay", type: "date", value: ngayDongMacDinh(d.homNay, o.tuNgay), min: o.tuNgay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: o.title,
      body: [h("p", null, h("strong", null, o.moTa)), h("label", null, "Ngày cuối hiệu lực", ngay), loi],
      nhan: o.nhan,
      chuan() {
        const kq = docNgayDong(ngay.value, o.tuNgay);
        if (!kq.ok) {
          loi.textContent = kq.message;
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: o.url, body: kq.body };
      },
      xong: () => ctx.baoOk(o.daXong),
    });
  }

  function ngung(dong: Api.CommissionRuleDto, url: string, moTa?: string): void {
    const ten = nhanDoiTuong(dong.doiTuong);
    hopNgay({ tuNgay: dong.tuNgay, moTa: moTa ?? `Ngừng mức: ${ten.ten} · ${nhanPhamVi(dong, ctx.lay().ten)} · ${nhanMucDto(dong)}`, url, title: "Ngừng", nhan: "Ngừng", daXong: "Đã ngừng." });
  }

  function ngungApDung(gan: Api.GanLoaiMucDto): void {
    hopNgay({
      tuNgay: gan.tuNgay,
      moTa: `Ngừng áp dụng chính sách ${gan.muc.ten} cho loại ${gan.loai.ten}`,
      url: `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/ket-thuc`,
      title: "Ngừng áp dụng",
      nhan: "Ngừng áp dụng",
      daXong: `Đã ngừng áp dụng chính sách «${gan.muc.ten}» cho loại «${gan.loai.ten}».`,
    });
  }

  function doiChinhSach(gan: Api.GanLoaiMucDto): void {
    const d = ctx.lay();
    const chon = h("select", { id: "hh-dcs-muc", "aria-label": "Chính sách" }, h("option", { value: "" }, "— Chọn chính sách —"), ...d.mucTa.muc.filter((m) => m.dangBat && m.code !== gan.muc.code).map((m) => h("option", { value: m.code }, m.ten)));
    const tu = h("input", { id: "hh-dcs-tu", type: "date", value: d.homNay, min: d.homNay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    const cauCu = (t: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(t) ? `Chính sách cũ ${gan.muc.ten} sẽ ngừng, đến hết ${MA_NGAY(addDays(t, -1))}.` : "");
    const dong = h("p", { class: "hint", "aria-live": "polite" }, cauCu(d.homNay));
    tu.addEventListener("input", () => (dong.textContent = cauCu(tu.value)));
    moHop(ctx, {
      title: "Đổi chính sách",
      body: [h("p", null, h("span", { class: "hh-nhan-nho" }, "Loại đối tác"), h("strong", null, gan.loai.ten)), h("label", null, "Chính sách mới", chon), h("label", null, "Từ", tu), dong, loi],
      nhan: "Đổi chính sách",
      chuan() {
        if (chon.value === "" || !/^\d{4}-\d{2}-\d{2}$/.test(tu.value)) {
          loi.textContent = chon.value === "" ? "Chọn chính sách." : "Chọn ngày bắt đầu.";
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: `/api/pricing/muc-ta/gan/${encodeURIComponent(gan.id)}/doi`, body: { muc: chon.value, tuNgay: tu.value } };
      },
      xong: (r) => ketQuaGan(r as Api.GanLoaiMucResponse),
    });
  }

  function apDungChinhSach(muc: Api.MucTaDto): void {
    const d = ctx.lay();
    const loai = h("select", { id: "hh-adcs-loai", "aria-label": "Loại đối tác" }, h("option", { value: "" }, "— Chọn loại đối tác —"), ...d.mucTa.loai.map((l) => h("option", { value: l.code }, l.ten)));
    const tu = h("input", { id: "hh-adcs-tu", type: "date", value: d.homNay });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: "Áp dụng chính sách cho loại",
      body: [h("p", null, h("span", { class: "hh-nhan-nho" }, "Chính sách"), h("strong", null, muc.ten)), h("label", null, "Loại đối tác", loai), h("label", null, "Từ", tu), loi],
      nhan: "Áp dụng",
      chuan() {
        const kq = docThanGan({ loai: loai.value, muc: muc.code, tuNgay: tu.value, denNgay: "" });
        if (!kq.ok) {
          loi.textContent = kq.loi.map((x) => x.message).join(" ");
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: "/api/pricing/muc-ta/gan", body: kq.body };
      },
      xong: (r) => ketQuaGan(r as Api.GanLoaiMucResponse),
    });
  }

  function hoiTen(o: { title: string; nhan: string; nhanO: string; path: string; xong: string }): void {
    const ten = h("input", { id: "hh-hoi-ten", type: "text", maxLength: 80, autocomplete: "off" });
    const loi = h("p", { class: "field-error", role: "alert", hidden: true });
    moHop(ctx, {
      title: o.title,
      body: [h("label", null, o.nhanO, ten), loi],
      nhan: o.nhan,
      chuan() {
        if (ten.value.trim() === "") {
          loi.textContent = "Nhập tên.";
          loi.hidden = false;
          return null;
        }
        loi.hidden = true;
        return { path: o.path, body: { ten: ten.value } };
      },
      xong: () => ctx.baoOk(o.xong),
    });
  }
  const themLoai = (): void => hoiTen({ title: "Thêm loại", nhan: "Thêm loại", nhanO: "Tên loại đối tác", path: "/api/pricing/loai-doi-tac", xong: "Đã thêm loại." });
  const themChinhSach = (): void => hoiTen({ title: "Thêm chính sách", nhan: "Thêm chính sách", nhanO: "Tên chính sách", path: "/api/pricing/muc-ta", xong: "Đã thêm chính sách." });
  async function guiNhanh(path: string, thongBao: string): Promise<string | null> {
    ctx.baoOk(null);
    try {
      await api<unknown>(path, { method: "POST", body: {} });
    } catch (err) {
      return lyDoLoi(err);
    }
    await ctx.napLai();
    ctx.baoOk(thongBao);
    return null;
  }

  function ketQuaGan(r: Api.GanLoaiMucResponse): void {
    if (r.dongRieng.length > 0) ctx.canhBao(khungDongRieng(r, ctx.lay()));
    else ctx.baoOk(`Đã áp dụng chính sách «${r.gan.muc.ten}» cho loại «${r.gan.loai.ten}» từ ngày ${MA_NGAY(r.gan.tuNgay)}.`);
  }

  return { themMuc, doi, sua: (x) => void sua(x), suaApDung: (x) => void suaApDung(x), ngung, ngungApDung, doiChinhSach, apDungChinhSach, themLoai, themChinhSach, guiNhanh };
}
