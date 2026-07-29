import type { CSSProperties } from 'react';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 或 alpha-3 国家代码 */
  code?: string;
  size?: number;
  style?: CSSProperties;
}

/** 3-letter → 2-letter 映射（常用），不在映射中则直接取前两位 */
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  PHL: 'PH',
  USA: 'US',
  GBR: 'GB',
  CHN: 'CN',
  JPN: 'JP',
  KOR: 'KR',
  DEU: 'DE',
  FRA: 'FR',
  IND: 'IN',
  BRA: 'BR',
  AUS: 'AU',
  CAN: 'CA',
  RUS: 'RU',
  MEX: 'MX',
  IDN: 'ID',
  THA: 'TH',
  VNM: 'VN',
  MYS: 'MY',
  SGP: 'SG',
  ARE: 'AE',
  SAU: 'SA',
  TUR: 'TR',
  ITA: 'IT',
  ESP: 'ES',
  NLD: 'NL',
  POL: 'PL',
  SWE: 'SE',
  NOR: 'NO',
  DNK: 'DK',
  FIN: 'FI',
  CHE: 'CH',
  AUT: 'AT',
  BEL: 'BE',
  PRT: 'PT',
  GRC: 'GR',
  NZL: 'NZ',
  ZAF: 'ZA',
  EGY: 'EG',
  NGA: 'NG',
  COL: 'CO',
  ARG: 'AR',
  CHL: 'CL',
  PER: 'PE',
  PAK: 'PK',
  BGD: 'BD',
  MMR: 'MM',
  KHM: 'KH',
  LKA: 'LK',
  TWN: 'TW',
  HKG: 'HK',
};

function toAlpha2(code: string): string {
  const upper = code.toUpperCase();
  if (upper.length === 2) return upper;
  return ALPHA3_TO_ALPHA2[upper] || upper.slice(0, 2);
}

const CountryFlag = ({ code, size = 14, style }: CountryFlagProps) => {
  if (!code) return null;
  const alpha2 = toAlpha2(code).toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${alpha2}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      style={{ verticalAlign: 'middle', borderRadius: 1, ...style }}
    />
  );
};

export default CountryFlag;
