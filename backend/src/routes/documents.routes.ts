import { Router } from "express";
import multer from "multer";
import { documentsController } from "../controllers/documents.controller";

const router = Router();

// Almacenamiento en memoria para pasar directo a S3 sin guardar en disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // Máximo 25 MB por archivo
  },
});

router.post("/:token/upload", upload.single("file"), (req, res) =>
  documentsController.uploadFile(req, res)
);

router.post("/:token/presigned", (req, res) =>
  documentsController.getPresignedUpload(req, res)
);

router.get("/view/:documentId", (req, res) =>
  documentsController.viewDocument(req, res)
);

router.delete("/:token/:documentId", (req, res) =>
  documentsController.deleteFile(req, res)
);

export const documentsRoutes = router;
