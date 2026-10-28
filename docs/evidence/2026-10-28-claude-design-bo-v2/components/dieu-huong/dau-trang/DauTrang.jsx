import React from "react";
import { BieuTuong } from "../../hien-thi/bieu-tuong/BieuTuong.jsx";

export function DauTrang({ tieuDe, phu, quayLai, huyHieu, hanhDong, className = "" }) {
  return (
    <header className={"ib-dau-trang " + className}>
      {quayLai ? (
        quayLai.href
          ? <a className="ib-dau-trang__lui" href={quayLai.href} onClick={quayLai.onClick}><BieuTuong ten="back" co={20} />{quayLai.nhan}</a>
          : <button type="button" className="ib-dau-trang__lui" onClick={quayLai.onClick}><BieuTuong ten="back" co={20} />{quayLai.nhan}</button>
      ) : null}
      <div className="ib-dau-trang__hang">
        <div className="ib-dau-trang__chu">
          <h1 className="ib-dau-trang__tieu-de">{tieuDe}{huyHieu ? <span className="ib-dau-trang__hh">{huyHieu}</span> : null}</h1>
          {phu ? <p className="ib-dau-trang__phu">{phu}</p> : null}
        </div>
        {hanhDong ? <div className="ib-dau-trang__hd">{hanhDong}</div> : null}
      </div>
    </header>
  );
}
