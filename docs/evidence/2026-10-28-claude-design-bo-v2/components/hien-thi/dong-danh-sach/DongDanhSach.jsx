import React from "react";
import { BieuTuong } from "../bieu-tuong/BieuTuong.jsx";

export function DongDanhSach({ truoc, tieuDe, phu, dong3, sau, bamDuoc, href, onClick, chuaDoc, xem = "", className = "" }) {
  const cls = "ib-dong" + (bamDuoc ? " ib-dong--bam" : "") + (chuaDoc ? " is-chua-doc" : "") + " " + xem + " " + className;
  const ruot = (
    <React.Fragment>
      {truoc ? <span className="ib-dong__truoc">{truoc}</span> : null}
      <span className="ib-dong__chu">
        <span className="ib-dong__tieu-de">{chuaDoc ? <span className="ib-dong__cham" aria-label="Chưa đọc" role="img" /> : null}{tieuDe}</span>
        {phu ? <span className="ib-dong__phu">{phu}</span> : null}
        {dong3 ? <span className="ib-dong__phu ib-dong__dong3">{dong3}</span> : null}
      </span>
      {sau ? <span className="ib-dong__sau">{sau}</span> : null}
      {bamDuoc ? <BieuTuong ten="next" className="ib-dong__mui" /> : null}
    </React.Fragment>
  );
  if (bamDuoc) return href ? <a className={cls} href={href} onClick={onClick}>{ruot}</a> : <button type="button" className={cls} onClick={onClick}>{ruot}</button>;
  return <div className={cls}>{ruot}</div>;
}
