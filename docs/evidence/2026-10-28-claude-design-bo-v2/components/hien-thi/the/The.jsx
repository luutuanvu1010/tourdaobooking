import React from "react";
import { BieuTuong } from "../bieu-tuong/BieuTuong.jsx";

export function The({ tieuDe, phu, sau, chan, bamDuoc, href, onClick, dangTai, xem = "", className = "", children }) {
  const cls = "ib-the" + (bamDuoc ? " ib-the--bam" : "") + " " + xem + " " + className;
  const dau = tieuDe || sau || bamDuoc ? (
    <div className="ib-the__dau">
      <div className="ib-the__dau-chu">
        {tieuDe ? <h3 className="ib-the__tieu-de">{tieuDe}</h3> : null}
        {phu ? <p className="ib-the__phu">{phu}</p> : null}
      </div>
      {sau ? <div className="ib-the__sau">{sau}</div> : null}
      {bamDuoc ? <BieuTuong ten="next" className="ib-the__mui" /> : null}
    </div>
  ) : null;
  const ruot = (
    <React.Fragment>
      {dau}
      {dangTai ? <div className="ib-the__than" aria-busy="true">{children}</div> : children ? <div className="ib-the__than">{children}</div> : null}
      {chan ? <div className="ib-the__chan">{chan}</div> : null}
    </React.Fragment>
  );
  if (bamDuoc) {
    return href ? <a className={cls} href={href} onClick={onClick}>{ruot}</a> : <button type="button" className={cls} onClick={onClick}>{ruot}</button>;
  }
  return <section className={cls}>{ruot}</section>;
}
