import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "../config/env";

export class S3Service {
  private s3Client: S3Client | null = null;
  private bucket: string;

  constructor() {
    this.bucket = ENV.AWS_S3_BUCKET_NAME;

    if (ENV.AWS_ACCESS_KEY_ID && ENV.AWS_SECRET_ACCESS_KEY) {
      this.s3Client = new S3Client({
        region: ENV.AWS_REGION,
        credentials: {
          accessKeyId: ENV.AWS_ACCESS_KEY_ID,
          secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        },
      });
    } else {
      console.warn("⚠️ AWS S3: Credenciales no configuradas. Operando en modo local/mock.");
    }
  }

  /**
   * Sube un buffer directamente a S3
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<{ key: string; url: string }> {
    if (!this.s3Client) {
      // Modo Mock local
      const mockUrl = `/uploads-mock/${key}`;
      return { key, url: mockUrl };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    const publicUrl = `https://${this.bucket}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
    return { key, url: publicUrl };
  }

  /**
   * Genera una URL prefirmada para subida directa desde el navegador (Pre-signed PUT URL)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = 3600
  ): Promise<{ uploadUrl: string; key: string; fileUrl: string }> {
    if (!this.s3Client) {
      return {
        uploadUrl: `${ENV.FRONTEND_URL}/api/mock-upload?key=${encodeURIComponent(key)}`,
        key,
        fileUrl: `/uploads-mock/${key}`,
      };
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    const fileUrl = `https://${this.bucket}.s3.${ENV.AWS_REGION}.amazonaws.com/${key}`;
    return { uploadUrl, key, fileUrl };
  }

  /**
   * Genera una URL prefirmada para visualización segura/temporal de un documento privado
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    if (!this.s3Client) {
      return `/uploads-mock/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * Elimina un archivo de S3
   */
  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) return;

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}

export const s3Service = new S3Service();
