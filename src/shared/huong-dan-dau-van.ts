// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"e9dc6c32e436e040","chu":"dbb458aafae54ae3","ban":"2.85","ngay":"2026-11-09"},
  "quet-ve": {"neo":"6fd9afff97eb6683","chu":"3832545a5f0470e6","ban":"2.84","ngay":"2026-11-09"},
  "doi-chieu-ve": {"neo":"d3a1cab38978fc2d","chu":"f9153bd203565954","ban":"2.85","ngay":"2026-11-09"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"b7f210484a710fae","chu":"b41fe0afa23fe41f","ban":"2.84","ngay":"2026-11-09"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"94c777db435d9756","chu":"38ef6594a828abfa","ban":"2.95","ngay":"2026-11-12"},
  "xem-no-tra-sau": {"neo":"973fc0d160c029ed","chu":"fa963bef8425dbf2","ban":"2.70","ngay":"2026-11-06"},
  "giao-dien": {"neo":"a7f69c17933191a2","chu":"8d315591cb3389c0","ban":"2.82","ngay":"2026-11-09"},
};
