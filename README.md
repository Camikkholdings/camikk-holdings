# CAMIKK HOLDINGS — LLC Landing, Backend & Expediente Post-Pago

Ecosistema completo para la creación de LLCs en Estados Unidos y agendamiento de consultorías estratégicas con CAMIKK HOLDINGS.

Arquitectura desacoplada en dos aplicaciones:
- `frontend/`: Aplicación en Next.js (App Router, React 19, TypeScript) con la Landing Page, formulario de registro pre-pago, selector de precios, formulario de consulta y el Expediente multipaso (`/dossier`).
- `backend/`: API REST en Node.js + Express + TypeScript, con persistencia en **PostgreSQL (Prisma ORM)**, almacenamiento en **Amazon S3**, pasarela con **Stripe** y notificaciones por correo electrónico (**Nodemailer**).

---

## 📁 Estructura del Proyecto

```text
camikk-holdings/
├── frontend/                     # Aplicación Web Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── comenzar-llc/     # 2. Ruta — Comenzar mi LLC (datos antes del pago)
│   │   │   ├── consulta/         # 6. Ruta — Consulta Empresarial (45 min - $50)
│   │   │   ├── consulta-confirmada/ # Confirmación de consulta y calendario
│   │   │   ├── dossier/          # 7. Expediente completo DESPUÉS DEL PAGO (A-H)
│   │   │   └── page.tsx          # Landing page principal
│   │   ├── components/           # Componentes visuales y wizards
│   │   └── locales/              # Textos bilingües (español / inglés)
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                      # API REST & Servicios
│   ├── prisma/
│   │   └── schema.prisma         # Modelos de PostgreSQL (Client, Order, Dossier, DossierDocument)
│   ├── src/
│   │   ├── config/               # Variables de entorno y configuración
│   │   ├── controllers/          # Controladores (Checkout, Webhook, Dossier, Documentos)
│   │   ├── routes/               # Rutas API (/api/checkout, /api/dossiers, /api/documents, /api/webhooks)
│   │   ├── services/
│   │   │   ├── s3.service.ts     # Carga, URLs prefirmadas y gestión de archivos en AWS S3
│   │   │   ├── stripe.service.ts # Sesiones de checkout y procesamiento de pago
│   │   │   ├── mail.service.ts   # Plantillas HTML y envío de enlaces seguros por correo
│   │   │   └── dossier.service.ts # Lógica de negocio y persistencia en Postgres
│   │   └── index.ts              # Servidor Express (Puerto 4000)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── package.json                  # Orquestador del espacio de trabajo
```

---

## 🚀 Flujo End-to-End Implementado

1. **Decisión Principal (Landing)**:
   - Opción A: **QUIERO REGISTRAR MI LLC** → Redirige a `/comenzar-llc`.
   - Opción B: **QUIERO HABLAR CON UN ESPECIALISTA** → Redirige a `/consulta`.
2. **Cálculo Dinámico**:
   - Tarifa CAMIKK fija de `$725` + Tarifa estatal oficial (50 estados).
   - El monto del botón de pago se actualiza automáticamente con el total.
3. **Pago con Stripe**:
   - Se crea la sesión de Stripe Checkout en modo `payment`.
   - Si no hay credenciales configuradas en `.env`, opera en modo simulación para desarrollo local.
4. **Webhook y Envío de Correo (`checkout.session.completed`)**:
   - Registra el cliente y la orden en **PostgreSQL**.
   - Genera un token único y seguro (ej. `cmk_a1b2c3...`).
   - Envía automáticamente un correo al cliente con el enlace directo al formulario: `https://camikk.com/dossier?token=cmk_...`.
5. **Persistencia Multi-dispositivo**:
   - El cliente puede abrir el enlace en su móvil, tablet o laptop.
   - El formulario consulta la base de datos por `token` y precarga todos los datos y documentos subidos.
6. **Almacenamiento de Identificaciones en Amazon S3**:
   - En el Paso 5 (Sección G), las identificaciones (Pasaporte/ID del Responsible Party, miembros, etc.) se envían al bucket S3.
   - La base de datos guarda la clave y la URL. El cliente puede previsualizar, eliminar o reemplazar archivos desde cualquier dispositivo.
7. **Firma y Radicación Final**:
   - Validación de las 4 certificaciones legales y firma electrónica tipográfica.
   - Emisión de número oficial de expediente (ej. `CMK-LLC-2026-849201`).
   - Correo de confirmación al cliente y notificación a operaciones.

---

## 🛠️ Puesta en Marcha

### 1. Backend (`/backend`)
```bash
cd backend
npm install
cp .env.example .env
# Configura DATABASE_URL, STRIPE_SECRET_KEY, AWS_S3_BUCKET_NAME y SMTP en .env

# Generar cliente de Prisma y aplicar migraciones a PostgreSQL
npm run prisma:generate
npm run prisma:push

# Iniciar servidor backend
npm run dev
```
Servidor disponible en `http://localhost:4000` (Healthcheck: `http://localhost:4000/api/health`).

### 2. Frontend (`/frontend` o raíz)
```bash
cd frontend
npm install
npm run dev
```
Aplicación disponible en `http://localhost:3000`.

---

## 🔐 Variables de Entorno Clave (`backend/.env`)

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/camikk_db?schema=public"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET_NAME="camikk-llc-documents"
SMTP_USER="notificaciones@camikk.com"
SMTP_PASS="app_password"
```
