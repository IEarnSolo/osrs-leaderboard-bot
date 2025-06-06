import { formatInTimeZone } from 'date-fns-tz';
import dotenv from 'dotenv';

dotenv.config();

const timeZone = process.env.TIMEZONE || 'UTC';

function getTimestamp() {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss', { timeZone });
}

const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  originalLog(`[${getTimestamp()}]`, ...args);
};

console.error = (...args) => {
  originalError(`[${getTimestamp()}]`, ...args);
};
