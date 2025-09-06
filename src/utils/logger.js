import { formatInTimeZone } from 'date-fns-tz';
import 'dotenv/config';

const timeZone = process.env.TIMEZONE || 'UTC';
const webhookUrl = process.env.LOG_WEBHOOK_URL;

const DISCORD_MAX_LENGTH = 2000;
const BATCH_DELAY = 1000; // 1 second

let logBuffer = [];
let batchTimer = null;

function getTimestamp() {
  return formatInTimeZone(new Date(), timeZone, 'MM-dd-yyyy hh:mm:ss a zzz');
}

/**
 * Adds a log message to the buffer and schedules a flush.
 * @param {string} level - Log level (INFO, WARN, ERROR)
 * @param {string} msg - Log message
 */
function addToBuffer(level, msg) {
  const formatted = `[${getTimestamp()}] [${level}] ${msg}`;
  logBuffer.push(formatted);

  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushBuffer, BATCH_DELAY);
}

/**
 * Flushes the log buffer by sending its contents to Discord in chunks.
 */
async function flushBuffer() {
  if (logBuffer.length === 0) return;

  const combinedLogs = logBuffer.join('\n');
  logBuffer = [];

  const chunks = splitIntoChunks(combinedLogs, DISCORD_MAX_LENGTH);

  for (const chunk of chunks) {
    await sendToDiscord(chunk);
  }
}

/**
 * Splits a text into chunks not exceeding maxLength.
 * Wraps chunks in code blocks for readability.
 */
function splitIntoChunks(text, maxLength) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    chunks.push('```' + text.slice(start, start + maxLength - 6) + '```');
    start += maxLength - 6;
  }

  return chunks;
}

/**
 * Sends a log message to the Discord webhook.
 */
async function sendToDiscord(content) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  } catch (err) {
    originalError(`[${getTimestamp()}] [ERROR] Failed to send log to Discord: ${err.message}`);
  }
}

// Save originals
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Override console.log, console.warn, console.error
console.log = (...args) => {
  const msg = args.map(String).join(' ');
  originalLog(`[${getTimestamp()}] [INFO]`, ...args);
  addToBuffer('INFO', msg);
};

console.warn = (...args) => {
  const msg = args.map(String).join(' ');
  originalWarn(`[${getTimestamp()}] [WARN]`, ...args);
  addToBuffer('WARN', msg);
};

console.error = (...args) => {
  const msg = args.map(String).join(' ');
  originalError(`[${getTimestamp()}] [ERROR]`, ...args);
  addToBuffer('ERROR', msg);
};