import { Request, Response } from "express";
import { dossierService } from "../services/dossier.service";
import { s3Service } from "../services/s3.service";
import { prisma } from "../db/prisma";

export class DocumentsController {
  /**
   * Redirige a la URL prefirmada para ver o descargar un documento
   */
  async viewDocument(req: Request, res: Response) {
    try {
      const documentId = String(req.params.documentId);
      const doc = await prisma.dossierDocument.findUnique({
        where: { id: documentId },
      });

      if (!doc) {
        return res.status(404).json({ error: "Documento no encontrado." });
      }

      const viewUrl = await s3Service.getPresignedDownloadUrl(doc.s3Key, 86400);
      return res.redirect(viewUrl);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Subida de archivo físico en multipart/form-data directo hacia S3
   */
  async uploadFile(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const { documentType } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No se adjuntó ningún archivo." });
      }

      if (!documentType) {
        return res.status(400).json({ error: "Falta especificar documentType." });
      }

      const uploaded = await dossierService.uploadDocument({
        token,
        documentType,
        originalName: Buffer.from(file.originalname, "latin1").toString("utf8"),
        buffer: file.buffer,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });

      return res.status(201).json(uploaded);
    } catch (error: any) {
      console.error("Error subiendo documento:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Genera URL prefirmada para subida directa S3 si se prefiere subida cliente -> S3
   */
  async getPresignedUpload(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { documentType, fileName, contentType } = req.body;

      if (!documentType || !fileName) {
        return res.status(400).json({ error: "Faltan parámetros del archivo." });
      }

      const key = `documentos llc/${token}/${documentType}_${Date.now()}_${fileName}`;
      const presigned = await s3Service.getPresignedUploadUrl(key, contentType || "application/octet-stream");

      return res.json(presigned);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Elimina un documento
   */
  async deleteFile(req: Request, res: Response) {
    try {
      const token = String(req.params.token);
      const documentId = String(req.params.documentId);
      const result = await dossierService.removeDocument(token, documentId);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

export const documentsController = new DocumentsController();
