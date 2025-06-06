import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config';

const timeZone = process.env.TIMEZONE || 'UTC';

function getTimestamp() {
  return formatInTimeZone(new Date(), timeZone, 'yyyy-MM-dd hh:mm:ss a');
}

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

console.error = (...args) => {
  originalError(`[${getTimestamp()}]`, ...args);
};
