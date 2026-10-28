import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";
import { Chip } from "../../hanh-dong/chip/Chip.jsx";
import { Nut } from "../../hanh-dong/nut/Nut.jsx";

export function CumTimLoc({ nhanTim = "Tìm đơn", tuKhoa, onTim, goiY = "Tìm theo tên, số điện thoại, mã đơn", loc = [], locChon = [], onLoc, sapXep, luaChonSapXep = [], onSapXep, ketQua, onXoaLoc, dangTim, className = "" }) {
  const id = React.useId();
  return (
    <div className={"ib-tim-loc " + className}>
      <div className="ib-tim-loc__hang">
        <div className="ib-o ib-tim">
          <label className="ib-o__nhan" htmlFor={id + "-tim"}>{nhanTim}</label>
          <div className="ib-o__khung">
            <BieuTuong ten="search" className="ib-tim__kinh" />
            <input id={id + "-tim"} type="search" enterKeyHint="search" className="ib-o__dieu-khien ib-tim__o" placeholder={goiY} value={tuKhoa} onChange={(e) => onTim && onTim(e.target.value)} />
            {dangTim ? <span className="ib-o__quay" role="status" aria-label="Đang tìm" /> : tuKhoa ? <button type="button" className="ib-tim__xoa" aria-label="Xoá chữ tìm" onClick={() => onTim && onTim("")}><BieuTuong ten="close" co={18} /></button> : null}
          </div>
        </div>
        {luaChonSapXep.length ? (
          <div className="ib-sap">
            <label className="ib-sap__nhan" htmlFor={id + "-sap"}>Sắp xếp</label>
            <div className="ib-o__khung">
              <select id={id + "-sap"} className="ib-sap__chon" value={sapXep} onChange={(e) => onSapXep && onSapXep(e.target.value)}>
                {luaChonSapXep.map((l) => <option key={l.giaTri} value={l.giaTri}>{l.nhan}</option>)}
              </select>
              <BieuTuong ten="chevron-down" co={18} className="ib-sap__mui" />
            </div>
          </div>
        ) : null}
      </div>
      {loc.length ? (
        <div className="ib-tim-loc__chip" role="group" aria-label="Lọc">
          {loc.map((l) => <Chip key={l.id} chon={locChon.includes(l.id)} dem={l.dem} onClick={() => onLoc && onLoc(l.id)}>{l.nhan}</Chip>)}
        </div>
      ) : null}
      {ketQua ? (
        <div className="ib-tim-loc__ket-qua" aria-live="polite">
          <span>{ketQua}</span>
          {locChon.length && onXoaLoc ? <Nut cap="loi-nho" onClick={onXoaLoc}>Xoá bộ lọc</Nut> : null}
        </div>
      ) : null}
    </div>
  );
}
