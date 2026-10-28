/** Dải trên trang — tối đa một, sát dưới thanh trên, thu gọn còn một dòng. Tin của cả ứng dụng: mất mạng, bảo trì, phiên bản. */
export interface DaiTrenTrangProps {
  ton?: "bien" | "cat" | "do";
  chiTiet?: React.ReactNode;
  hanhDong?: { nhan: string; onClick?: () => void; dangTai?: boolean };
  thuGon?: boolean;
  macDinhThuGon?: boolean;
  onThuGon?: (thuGon: boolean) => void;
  className?: string;
  children: React.ReactNode;
}
export declare function DaiTrenTrang(props: DaiTrenTrangProps): JSX.Element;
