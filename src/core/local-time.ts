/** Time of day without a date or UTC offset; six fractional digits are portable. */
declare const localTimeBrand: unique symbol;
export type LocalTime = string & { readonly [localTimeBrand]: 'TeaQL.LocalTime' };

const LOCAL_TIME_TEXT = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]{1,6})?$/;

export function localTime(value: string): LocalTime {
  if (typeof value !== 'string' || !LOCAL_TIME_TEXT.test(value)) {
    throw new TypeError('LocalTime requires HH:mm:ss with optional 1-6 fractional digits');
  }
  const dot = value.indexOf('.');
  if (dot < 0) return value as LocalTime;
  const fraction = value.slice(dot + 1).padEnd(6, '0');
  return (fraction === '000000' ? value.slice(0, dot) : `${value.slice(0, dot)}.${fraction}`) as LocalTime;
}
