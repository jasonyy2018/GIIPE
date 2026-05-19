import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  private desKey: string;
  private rsaPrivateKeyPem: string;
  private gatewayPublicKeyPem: string;

  constructor() {
    this.desKey = process.env.PAYMENT_DES_KEY || 'Uqt3frmnmVQQgU7S4wUJnKBrQ0CypPii';

    const rawPrivate = process.env.PAYMENT_RSA_PRIVATE_KEY || '';
    const rawGatewayPub = process.env.PAYMENT_GATEWAY_RSA_PUBLIC_KEY || process.env.PAYMENT_RSA_PUBLIC_KEY || '';

    this.rsaPrivateKeyPem = this.toPem(this.normalizeEnv(rawPrivate), 'RSA PRIVATE KEY');
    this.gatewayPublicKeyPem = this.toPem(this.normalizeEnv(rawGatewayPub), 'PUBLIC KEY');

    if (rawPrivate) {
      this.logger.log('RSA private key loaded successfully');
    } else {
      this.logger.warn('RSA private key is empty — payment signing will fail');
    }
  }

  /**
   * Docker env_file values may contain surrounding quotes and literal \\n.
   */
  private normalizeEnv(raw: string): string {
    if (!raw) return raw;
    let v = raw.trim();
    if ((v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v.replace(/\\n/g, '\n').trim();
  }

  /**
   * Ensure the key string is in PEM format.
   * If it already has BEGIN/END headers, return as-is.
   * Otherwise wrap the raw base64 body.
   */
  private toPem(keyStr: string, label: string): string {
    if (!keyStr) return '';
    if (keyStr.includes('BEGIN')) return keyStr;
    const body = keyStr.replace(/\s+/g, '');
    const lines = body.match(/.{1,64}/g);
    if (!lines) return '';
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
  }

  encryptDESede(data: string, base64Key: string = this.desKey): string {
    try {
      const keyBuf = Buffer.from(base64Key, 'base64');
      const iv = Buffer.alloc(8, 0);
      const cipher = crypto.createCipheriv('des-ede3-cbc', keyBuf, iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return encrypted;
    } catch (error) {
      this.logger.error('Encryption failed', error);
      throw new Error('Encryption failed');
    }
  }

  decryptDESede(encryptedData: string, base64Key: string = this.desKey): string {
    try {
      const keyBuf = Buffer.from(base64Key, 'base64');
      const iv = Buffer.alloc(8, 0);
      const decipher = crypto.createDecipheriv('des-ede3-cbc', keyBuf, iv);
      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Sign data using RSA SHA-1 (PKCS#1 v1.5) via Node.js native crypto.
   */
  signRSA(data: string, pemKey: string = this.rsaPrivateKeyPem): string {
    if (!pemKey) {
      this.logger.error('RSA private key is missing');
      throw new Error('RSA private key is missing');
    }
    try {
      const signer = crypto.createSign('SHA1');
      signer.update(data, 'utf8');
      signer.end();
      return signer.sign(pemKey, 'base64');
    } catch (error: any) {
      this.logger.error('RSA Signing failed', {
        message: error.message,
        keyPreview: pemKey.substring(0, 50) + '...',
      });
      throw new Error(`RSA Signing failed: ${error.message}`);
    }
  }

  /**
   * Verify an RSA SHA-1 signature via Node.js native crypto.
   */
  verifyRSA(data: string, signature: string, pemKey: string = this.gatewayPublicKeyPem): boolean {
    if (!pemKey) {
      this.logger.error('RSA Gateway public key is missing');
      return false;
    }
    try {
      const verifier = crypto.createVerify('SHA1');
      verifier.update(data, 'utf8');
      verifier.end();
      return verifier.verify(pemKey, signature, 'base64');
    } catch (error) {
      this.logger.error('RSA Verification failed', error);
      return false;
    }
  }
}
