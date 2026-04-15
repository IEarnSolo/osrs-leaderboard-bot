import { WOMClient } from '@wise-old-man/utils';
import 'dotenv/config';

export const womClient = new WOMClient({
  apiKey: process.env.WOM_API_KEY,
  userAgent: 'iearnsolo',
});

export const leaguesWomClient = new WOMClient({
  baseAPIUrl: 'https://api.wiseoldman.net/league'
});