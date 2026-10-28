import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function BoDem({ nhan, giaTri = 0, min = 0, max = 99, onDoi, huongDan, tat, lyDoTat, xem = "", className = "" }) {
  const id = React.useId();
  const thapNhat = tat || giaTri <= min;
  const caoNhat = tat || giaTri >= max;
  const moTa = tat && lyDoTat ? lyDoTat : huongDan;
  const doi = (d) => { const v = Math.min(max, Math.max(min, giaTri + d)); if (v !== giaTri && onDoi) onDoi(v); };
  return (
    <div className={"ib-dem" + (tat ? " is-tat" : "") + " " + className}>
      <span className="ib-o__nhan" id={id + "-nhan"}>{nhan}</span>
      <div className="ib-dem__hang" role="group" aria-labelledby={id + "-nhan"} aria-describedby={moTa ? id : undefined}>
        <button type="button" className={"ib-dem__nut " + xem} aria-label={"Bớt một " + (nhan || "")} aria-disabled={thapNhat ? "true" : undefined} onClick={() => !thapNhat && doi(-1)}><BieuTuong ten="minus" co={20} /></button>
        <output className="ib-dem__o" aria-live="polite">{giaTri}</output>
        <button type="button" className="ib-dem__nut" aria-label={"Thêm một " + (nhan || "")} aria-disabled={caoNhat ? "true" : undefined} onClick={() => !caoNhat && doi(1)}><BieuTuong ten="plus" co={20} /></button>
      </div>
      {moTa ? <p className="ib-o__huong-dan" id={id}>{moTa}</p> : null}
    </div>
  );
}
