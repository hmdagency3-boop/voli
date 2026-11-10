import { supabase } from '@/lib/supabase';

/** Gender and country of a member (supabase/020_gender_country.sql). */
export type Gender = 'male' | 'female';
export type ProfileInfo = { gender: Gender | null; country: string | null; country_hidden: boolean };

export const GENDER_LABEL: Record<Gender, string> = { male: 'ذكر', female: 'أنثى' };

/** Arab countries are listed first in the picker. */
const ARAB = ['EG', 'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'JO', 'PS', 'LB', 'SY', 'LY', 'TN', 'DZ', 'MA', 'MR', 'SD', 'SO', 'DJ', 'KM'];
const OTHERS = (
  'AF AL AD AO AG AR AM AU AT AZ BS BD BB BY BE BZ BJ BT BO BA BW BR BN BG BF BI KH CM CA CV CF TD CL CN CO CG CD CR CI HR CU CY CZ ' +
  'DK DM DO EC SV GQ ER EE SZ ET FJ FI FR GA GM GE DE GH GR GD GT GN GW GY HT HN HK HU IS IN ID IR IE IT JM JP KZ KE KI XK KG LA LV ' +
  'LS LR LI LT LU MO MG MW MY MV ML MT MH MU MX FM MD MC MN ME MZ MM NA NR NP NL NZ NI NE NG KP MK NO PK PW PA PG PY PE PH PL PT PR ' +
  'RO RU RW KN LC VC WS SM ST SN RS SC SL SG SK SI SB ZA KR SS ES LK SR SE CH TW TJ TZ TH TL TG TO TT TR TM TV UG UA GB US UY UZ VU ' +
  'VA VE VN ZM ZW'
).split(' ');

let names: Intl.DisplayNames | null = null;
/** Arabic country name for a two-letter code, e.g. EG → مصر. */
export function countryName(code: string): string {
  try {
    names ??= new Intl.DisplayNames(['ar'], { type: 'region' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Flag emoji for a two-letter code, e.g. EG → 🇪🇬. */
export function countryFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Round (1:1) flag pictures bundled with the app, keyed by lower-case country code. */
const FLAG_FILES = import.meta.glob('/node_modules/flag-icons/flags/1x1/*.svg', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const FLAGS: Record<string, string> = Object.fromEntries(
  Object.entries(FLAG_FILES).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1, -4), url]),
);

/** Picture of a country's flag, or null when none is bundled. */
export function countryFlagUrl(code: string): string | null {
  return FLAGS[code.toLowerCase()] ?? null;
}

/** All countries for the picker: Arab countries first, then the rest by Arabic name. */
export function countryOptions(): { code: string; name: string }[] {
  const rest = OTHERS.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  return [...ARAB.map((code) => ({ code, name: countryName(code) })), ...rest];
}

/** Gender and country of a member; null when the database update has not been run yet. */
export async function loadProfileInfo(authId: string): Promise<ProfileInfo | null> {
  const { data, error } = await supabase.rpc('profile_info', { p_auth: authId });
  if (error || !data) return null;
  const d = data as Partial<ProfileInfo>;
  return {
    gender: d.gender === 'male' || d.gender === 'female' ? d.gender : null,
    country: typeof d.country === 'string' ? d.country : null,
    country_hidden: !!d.country_hidden,
  };
}

/** Save my own gender and country. */
export async function saveMyProfileInfo(gender: Gender | null, country: string | null) {
  const { error } = await supabase.rpc('set_my_profile_info', { p_gender: gender, p_country: country });
  if (error) throw error;
}
