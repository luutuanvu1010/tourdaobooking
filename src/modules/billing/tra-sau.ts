// Trả sau theo hạn mức — phần điều phối của billing (ADR-0168 Đ1, Đ2). Số nợ KHÔNG lưu cột: tính bằng JS từ số thật (phải thu hiện hành do `tienNhieuDon`, khoản thu, dòng sổ, dấu đối chiếu),
// một lượt cho cả danh sách đơn (không truy vấn lặp theo từng đơn). Luật thuần ở src/shared/tra-sau.ts. KHÔNG tự kiểm quyền — route hỏi `can(` trước.
import { quaHan, quyetTraSau, trangThaiHan, type CoSoTraSau, type HanMucHieuLuc, type KetQuaKiemTraSau, type TrangThaiHan } from "../../shared/tra-sau";
import { dieuKienTraSauDichVu, type DichVuXetTraSau } from "../../shared/tra-sau-dich-vu";
import { addDays, vnToday } from "../../shared/vn-date";
import { congNoNhieuDon } from "./cong-no-dai-ly";
import { dauTraSauDichVu } from "./tra-sau-dich-vu-route";
import {
  benCoDonTraSau, benDuocHuong, donTraSauCuaCacBen, donTraSauTheoId, hanMucRowMoiBen, hanMucRowTai, phienBanHienTai,
  type DonTraSauRow, type HanMucRow,
} from "./tra-sau-repo";

const toHanMuc = (r: HanMucRow): HanMucHieuLuc => ({ hanMuc: r.limit_amount, gioTra: r.term_hours ?? r.term_days * 24, gioAnHan: r.grace_hours, tuNgay: r.valid_from_date, denNgay: r.valid_to_date });

/** `hanTra`, `hetAnHan`: mốc ISO UTC (ADR-0172 Đ3 mục 2). `trangThai` tính tại `bayGio` của lời gọi. */
export interface DonNo { orderId: string; maDon: string; hanTra: string | null; hetAnHan: string | null; no: number; trangThai: TrangThaiHan; coSo: CoSoTraSau }
/**
 * `tong` = nợ MỌI đơn Trả sau (cổng ngừng hồ sơ, đổi bên đặt, danh sách «đang nợ»); `tongHanMuc` = chỉ đơn theo hạn mức — số DUY NHẤT được trừ vào hạn mức («còn được dùng»,
 * cổng hạn mức, cảnh báo vượt); `tongDichVu` = chỉ đơn Trả sau theo dịch vụ (ADR-0230 Đ1 mục 3–4). `coDonQuaHan` = có đơn (mọi loại) đã HẾT ÂN HẠN còn nợ.
 */
export interface NoBenDat { tong: number; tongHanMuc: number; tongDichVu: number; don: DonNo[]; coDonQuaHan: boolean }
/** Loại của một dòng view: NULL (dữ liệu dựng tay, đơn trước khi chụp) coi như hạn mức — phía an toàn (vẫn bị trừ vào hạn mức). */
const coSoCua = (d: DonTraSauRow): CoSoTraSau => (d.credit_basis === "SERVICE" ? "SERVICE" : "LIMIT");
const bayGioMacDinh = (): string => new Date().toISOString();

/** Nợ từng đơn Trả sau đã xác nhận: «Công nợ còn lại» (ADR-0182 Đ1; đơn không phải đơn đại lý: ADR-0168 Đ2 mục 2), ≥ 0, đơn huỷ 0. */
export async function noTheoDon(db: D1Database, dons: readonly DonTraSauRow[]): Promise<Map<string, number>> {
  return new Map([...(await noVaCocTheoDon(db, dons))].map(([id, x]) => [id, x.no]));
}

/**
 * Nợ và «cọc còn ở tay người thu» của từng đơn trong CÙNG một lượt tính (ADR-0197 Đ4). Số nợ là «Công nợ còn lại» của phần nghiệp vụ «Công nợ đại lý» (ADR-0182 Đ1 mục 8):
 * đơn đại lý tính theo giá đại lý, đơn khác giữ cách cũ — xem `cong-no-dai-ly.ts`; không viết công thức thứ hai ở đây.
 */
export async function noVaCocTheoDon(db: D1Database, dons: readonly DonTraSauRow[]): Promise<Map<string, { no: number; cocConGiu: number }>> {
  return new Map([...(await congNoNhieuDon(db, dons))].map(([id, x]) => [id, { no: x.no, cocConGiu: x.cocConGiu }]));
}

/** Nợ của NHIỀU bên đặt cùng lúc (màn danh sách): số câu truy vấn không phụ thuộc số đơn. */
export async function noCacBenDat(db: D1Database, partyIds: readonly string[], bayGio: string = bayGioMacDinh()): Promise<Map<string, NoBenDat>> {
  const dons = await donTraSauCuaCacBen(db, partyIds);
  const no = await noTheoDon(db, dons);
  const out = new Map<string, NoBenDat>(partyIds.map((p) => [p, { tong: 0, tongHanMuc: 0, tongDichVu: 0, don: [], coDonQuaHan: false }]));
  for (const d of dons) {
    const n = no.get(d.id) ?? 0;
    if (n <= 0 || d.booker_party_id === null) continue;
    const b = out.get(d.booker_party_id)!;
    const coSo = coSoCua(d);
    b.tong += n;
    if (coSo === "SERVICE") b.tongDichVu += n;
    else b.tongHanMuc += n;
    const moc = { hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, bayGio, no: n };
    b.don.push({ orderId: d.id, maDon: d.order_code, hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, no: n, trangThai: trangThaiHan(moc), coSo });
    if (quaHan(moc)) b.coDonQuaHan = true;
  }
  return out;
}
export const noCuaBenDat = async (db: D1Database, partyId: string, bayGio: string = bayGioMacDinh()): Promise<NoBenDat> =>
  (await noCacBenDat(db, [partyId], bayGio)).get(partyId)!;

/**
 * ADR-0188 mục 4(a): mã các đơn Trả sau ĐÃ XÁC NHẬN (chưa huỷ — kể cả đã hết nợ, kể cả đã «Xong») mà hồ sơ đứng tên bên đặt. Cửa gộp hồ sơ dùng để biết có phải hỏi cổng hạn mức
 * của hồ sơ chính không. Không đọc được thì NÉM (không đoán «không có đơn»).
 */
export const maDonTraSauDaXacNhan = async (db: D1Database, partyId: string): Promise<string[]> => (await donTraSauCuaCacBen(db, [partyId])).map((d) => d.order_code);

/** Hạn trả, nợ và cọc còn ở tay người thu (ADR-0197 Đ4 — cổng huỷ) của MỘT đơn; `null` = đơn không phải Trả sau. */
export async function traSauCuaDon(db: D1Database, orderId: string): Promise<{ hanTra: string | null; hetAnHan: string | null; no: number; cocConGiu?: number; benDat: string | null; version: number } | null> {
  const d = await donTraSauTheoId(db, orderId);
  if (!d) return null;
  // Phiên bản của bên đặt đọc TRƯỚC khi tính nợ (khuôn `kiemTraSau`): đường đổi bên đặt gác đúng số này trong lô, nên khoản thu bị đảo chen giữa làm lô thua.
  const version = d.booker_party_id ? await phienBanHienTai(db, d.booker_party_id) : 0;
  const x = (await noVaCocTheoDon(db, [d])).get(d.id);
  // Không tính được tiền của đơn ⇒ vắng `cocConGiu`: cổng huỷ chặn Đối tác 503 (không đoán «hết cọc»); nợ giữ cách cũ (0).
  return { hanTra: d.credit_due_at, hetAnHan: d.credit_grace_until, no: x?.no ?? 0, ...(x ? { cocConGiu: x.cocConGiu } : {}), benDat: d.booker_party_id, version };
}

export async function hanMucHieuLuc(db: D1Database, partyId: string, ngay: string = vnToday(new Date())): Promise<HanMucHieuLuc | null> {
  const r = await hanMucRowTai(db, partyId, ngay);
  return r ? toHanMuc(r) : null;
}
export async function hanMucMoiBen(db: D1Database, ngay: string = vnToday(new Date())): Promise<Map<string, HanMucHieuLuc>> {
  return new Map((await hanMucRowMoiBen(db, ngay)).map((r) => [r.party_id, toHanMuc(r)]));
}
/** Hồ sơ có hạn mức đang hiệu lực HOẶC còn đơn Trả sau đã xác nhận (hạ hoặc ngừng hạn mức khi đang nợ vẫn phải hiện — ADR-0168 Hệ quả). */
export async function benCoLienQuanTraSau(db: D1Database, ngay: string = vnToday(new Date())): Promise<string[]> {
  const [han, co] = await Promise.all([hanMucMoiBen(db, ngay), benCoDonTraSau(db)]);
  return [...new Set([...han.keys(), ...co])];
}

/**
 * Điều kiện «Trả sau theo dịch vụ» của MỘT đơn cho MỘT bên đặt (ADR-0230 Đ1 mục 2): bên đặt mang loại đối tác được hưởng VÀ `dieuKienTraSauDichVu` đạt với các dấu đang mở.
 * `null` = không đủ. Dòng dịch vụ do gốc lắp ráp dựng từ danh mục đã gộp (`dichVuXetTuDanhMuc`) — billing không import catalog.
 */
export async function dieuKienDichVuCuaBen(db: D1Database, benDat: string, dichVu: readonly DichVuXetTraSau[]): Promise<{ gioTra: number; gioAnHan: number } | null> {
  if (dichVu.length === 0) return null;
  const [huong, dau] = await Promise.all([benDuocHuong(db, benDat), dauTraSauDichVu(db)]);
  return huong ? dieuKienTraSauDichVu(dichVu, dau) : null;
}

/**
 * Cổng Trả sau (ADR-0168 Đ2 mục 3; ADR-0230 Đ1 mục 3): chọn loại bằng luật thuần `quyetTraSau`. Theo dịch vụ ⇒ không kiểm hạn mức, chỉ chặn khi có đơn (mọi loại) quá hạn; theo hạn mức ⇒
 * có hạn mức hiệu lực, không đơn quá hạn, nợ THEO HẠN MỨC + đơn này không vượt. Đọc PHIÊN BẢN TRƯỚC khi tính nợ (cả hai nhánh): mọi lệnh làm tăng nợ sau đó đều tăng phiên bản,
 * nên lô gác `cauGacPhienBan` của lệnh này sẽ hỏng nếu có ai chen vào. `boQuaDon` = đơn đang xét (khỏi tính nợ của chính nó hai lần — chỉ trừ khi đơn đó theo hạn mức).
 * `dichVu` vắng ⇒ chỉ xét hạn mức (đổi bên đặt, gộp hồ sơ). `coSo` ép loại (đơn đã chụp loại).
 */
export async function kiemTraSau(
  db: D1Database,
  i: { benDat: string; soTienDon: number; boQuaDon?: string; bayGio?: string; loai?: "sua_tang" | "doi_ben"; dichVu?: readonly DichVuXetTraSau[]; coSo?: CoSoTraSau },
): Promise<KetQuaKiemTraSau> {
  const bayGio = i.bayGio ?? bayGioMacDinh();
  const version = await phienBanHienTai(db, i.benDat);
  const [hanMuc, no, dichVu] = await Promise.all([
    hanMucHieuLuc(db, i.benDat, vnToday(new Date(bayGio))),
    noCuaBenDat(db, i.benDat, bayGio),
    i.dichVu && i.coSo !== "LIMIT" ? dieuKienDichVuCuaBen(db, i.benDat, i.dichVu) : Promise.resolve(null),
  ]);
  const cuaDon = i.boQuaDon ? no.don.find((d) => d.orderId === i.boQuaDon && d.coSo === "LIMIT")?.no ?? 0 : 0;
  const kq = quyetTraSau({
    laDoiTacHuong: dichVu !== null, dichVu, hanMuc, noHanMuc: no.tongHanMuc - cuaDon, soTienDon: i.soTienDon, coDonQuaHan: no.coDonQuaHan,
    ...(i.loai ? { loai: i.loai } : {}), ...(i.coSo ? { coSo: i.coSo } : {}),
  });
  return kq.ok ? { ...kq, version } : kq;
}

export { cauGacPhienBan, cauTangPhienBan } from "./tra-sau-gac";

/** Ngày hôm qua theo giờ Việt Nam — ngày kết thúc của dòng hạn mức bị thay hoặc ngừng (hạn mức hết hiệu lực từ hôm nay). */
export const homQua = (homNay: string): string => addDays(homNay, -1);
