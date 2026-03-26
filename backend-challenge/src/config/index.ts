import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || 'apitest',
  couponDir: path.resolve(process.env.COUPON_DIR || './data'),
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
  couponFiles: [
    'couponbase1.gz',
    'couponbase2.gz',
    'couponbase3.gz',
  ],
};
