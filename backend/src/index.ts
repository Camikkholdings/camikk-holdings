import express from "express";
import cors from "cors";
import { ENV } from "./config/env";
import { webhookRoutes } from "./routes/webhook.routes";
import { checkoutRoutes } from "./routes/checkout.routes";
import { dossierRoutes } from "./routes/dossier.routes";
import { documentsRoutes } from "./routes/documents.routes";
import { consultationRouter } from "./routes/consultation.routes";
import { adminRoutes } from "./routes/admin.routes";
import { pendingRecoveryService } from "./services/pending-recovery.service";

const app = express();

// Configuración de CORS
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);

      const cleanEnv = (ENV.FRONTEND_URL || "").replace(/\/$/, "");
      const isVercel = requestOrigin.endsWith(".vercel.app");
      const isLocal = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
      const isCustomMatch = cleanEnv && requestOrigin === cleanEnv;

      if (isCustomMatch || isVercel || isLocal) {
        return callback(null, true);
      }
      return callback(null, requestOrigin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  })
);

// 1. Webhook de Stripe: Requiere raw body antes de express.json()
app.use("/api/webhooks", webhookRoutes);

// 2. Parsers para las demás rutas
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 3. Healthcheck
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "CAMIKK Holdings Backend API",
    time: new Date().toISOString(),
    postgresConfigured: !!ENV.DATABASE_URL,
    stripeConfigured: !!ENV.STRIPE_SECRET_KEY,
    s3Configured: !!(ENV.AWS_ACCESS_KEY_ID && ENV.AWS_SECRET_ACCESS_KEY),
  });
});

// 4. Rutas principales
app.use("/api/checkout", checkoutRoutes);
app.use("/api/dossiers", dossierRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/consultations", consultationRouter);
app.use("/api/admin", adminRoutes);

// Iniciar servidor
app.listen(ENV.PORT, "0.0.0.0", async () => {
  console.log(`\n======================================================`);
  console.log(`🚀 CAMIKK Holdings Backend iniciado en puerto ${ENV.PORT}`);
  console.log(`🔗 Frontend URL: ${ENV.FRONTEND_URL}`);
  console.log(`🗄️  PostgreSQL: ${ENV.DATABASE_URL ? "Configurado" : "Pendiente en .env"}`);
  console.log(`💳 Stripe: ${ENV.STRIPE_SECRET_KEY ? "Modo Activo" : "Modo Simulación"}`);
  console.log(`☁️  AWS S3: ${ENV.AWS_ACCESS_KEY_ID ? "Conectado" : "Modo Mock local"}`);
  console.log(`======================================================\n`);

  if (process.env.AUTO_PRISMA_DB_PUSH === "true" && ENV.DATABASE_URL) {
    try {
      const { execSync } = await import("child_process");
      console.log("🔄 Sincronizando esquema PostgreSQL (prisma db push)...");
      execSync("npx prisma db push --accept-data-loss", { stdio: "inherit" });
      console.log("✅ Esquema sincronizado exitosamente.");
    } catch (err: any) {
      console.warn("⚠️ Advertencia al sincronizar base de datos:", err?.message || err);
    }
  }

  // Iniciar tarea programada de recuperación de pagos pendientes (4x al día, 7am - 5pm hora NY)
  pendingRecoveryService.initScheduler();
});

export default app;
