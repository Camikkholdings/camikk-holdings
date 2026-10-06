import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",

  // AWS S3
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || "camikk-llc-documents",

  // Resend Email API (Recomendado para envío transaccional de correos)
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM: process.env.RESEND_FROM || process.env.EMAIL_FROM || "CAMIKK Holdings <onboarding@resend.dev>",

  // SMTP Mail (Fallback)
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
  SMTP_SECURE: process.env.SMTP_SECURE === "true",
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "CAMIKK Holdings <notificaciones@camikk.com>",
  
  // Admin credentials & notifications
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@camikk.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "Camikk2026!Admin",
  ADMIN_SECRET: process.env.ADMIN_SECRET || "camikk_admin_secret_key_2026",
  ADMIN_NOTIFICATION_EMAIL:
    process.env.ADMIN_NOTIFICATION_EMAIL || "c.martinez@coraltechnology.online",

  // GoHighLevel / LeadConnector Webhook
  GHL_LLC_WEBHOOK_URL:
    process.env.GHL_LLC_WEBHOOK_URL ||
    "https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/d56a6193-d738-406e-8464-bd7521ca02c4",
  GHL_WHATSAPP_WEBHOOK_URL:
    process.env.GHL_WHATSAPP_WEBHOOK_URL ||
    "https://services.leadconnectorhq.com/hooks/aHD8KXbpJBMl7s7fUD6X/webhook-trigger/2bc71d4f-dbaf-49f5-a921-6fb2401c21c6",
};
