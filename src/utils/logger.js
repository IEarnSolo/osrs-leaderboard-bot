import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config';

const timeZone = process.env.TIMEZONE || 'UTC';

function getTimestamp() {
  return formatInTimeZone(new Date(), timeZone, 'MM-dd-yyyy hh:mm:ss a');
}

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

console.error = (...args) => {
  originalError(`[${getTimestamp()}]`, ...args);
};
