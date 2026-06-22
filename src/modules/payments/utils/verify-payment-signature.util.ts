import { createHmac, timingSafeEqual } from 'crypto';

const normalizeHex = (value: string): string => value.trim().toLowerCase();

const hexToBuffer = (hex: string): Buffer | null => {
  const normalized = normalizeHex(hex);

  if (!/^[0-9a-f]+$/.test(normalized) || normalized.length % 2 !== 0) {
    return null;
  }

  return Buffer.from(normalized, 'hex');
};

export const verifyPaymentSignature = (
  rawBody: Buffer | undefined,
  signature: string | undefined,
  secret: string,
): boolean => {
  if (!rawBody || !signature) {
    return false;
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuffer = hexToBuffer(expectedSignature);
  const receivedBuffer = hexToBuffer(signature);

  if (!expectedBuffer || !receivedBuffer) {
    return false;
  }

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
};
