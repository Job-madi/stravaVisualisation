import { Response } from 'firebase-functions';

export function setCorsHeaders(res: Response, origin: string = '*'): void {
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}
