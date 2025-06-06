import { WOMClient } from '@wise-old-man/utils';
import 'dotenv/config';

export const womClient = new WOMClient({
  apiKey: process.env.WOM_API_KEY,
  userAgent: 'iearnsolo',
});