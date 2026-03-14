import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(customParseFormat);
dayjs.extend(relativeTime);

export const INDIA_DATE_FORMAT = 'DD MMM YYYY';
export const INDIA_MONTH_FORMAT = 'MMM YYYY';

const ACCEPTED_DATE_FORMATS = [
  INDIA_DATE_FORMAT,
  'D-MMM-YYYY',
  'DD MMM YYYY',
  'D MMM YYYY',
  'DD-MMM-YY',
  'D-MMM-YY',
  'DD MMM YY',
  'D MMM YY',
  'DD/MM/YYYY',
  'D/M/YYYY',
  'YYYY-MM-DD',
];

const MONTH_MAP: Record<string, string> = {
  jan: 'Jan',
  feb: 'Feb',
  mar: 'Mar',
  apr: 'Apr',
  may: 'May',
  jun: 'Jun',
  jul: 'Jul',
  aug: 'Aug',
  sep: 'Sep',
  oct: 'Oct',
  nov: 'Nov',
  dec: 'Dec',
};

function canonicalizeDateString(value: string): string {
  const compact = value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const parts = compact.split('-');
  if (parts.length !== 3) {
    return compact;
  }

  const [day, month, year] = parts;
  const normalizedMonth = MONTH_MAP[month.toLowerCase()] ?? month;
  return `${day}-${normalizedMonth}-${year}`;
}

export function normalizeIndianDate(value: string | Date | number): string {
  const parsed = (() => {
    if (value instanceof Date || typeof value === 'number') {
      return dayjs(value);
    }

    const canonicalValue = canonicalizeDateString(value);
    const strictParsed = dayjs(canonicalValue, ACCEPTED_DATE_FORMATS, true);
    if (strictParsed.isValid()) {
      return strictParsed;
    }

    const looseParsed = dayjs(canonicalValue, ACCEPTED_DATE_FORMATS, false);
    if (looseParsed.isValid()) {
      return looseParsed;
    }

    return dayjs(value);
  })();

  if (!parsed.isValid()) {
    return String(value);
  }

  return parsed.format(INDIA_DATE_FORMAT);
}

export { dayjs };
