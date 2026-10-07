# Frontend Handoff & Integración de Pagos con Stripe

## 1. Integración de Pagos con Stripe (LLC y Consulta)

El sistema ahora cuenta con integración completa de Stripe tanto en modo de producción como en modo DEMO/simulación local:

- **Creación de LLC (`/api/checkout/llc`)**:
  - Recibe los datos previos al pago: `fullName`, `phone`, `email`, `state`, `companyName`, `secondChoiceName`, `businessActivity`, `ownersCount`, `confirmations`.
  - El backend valida el estado contra la tabla oficial `STATE_FEES` y calcula de forma segura el total: `$725 (tarifa de servicio) + tarifa estatal`.
  - Crea una sesión de Stripe Checkout en modo `payment` con ambos conceptos desglosados y la metadata del cliente.
  - Al completar el pago, Stripe redirige automáticamente al expediente post-pago: `/dossier?session_id={CHECKOUT_SESSION_ID}`.

- **Consulta Empresarial (`/api/checkout/consultation`)**:
  - Recibe: `fullName`, `phone`, `email`, `topic`, `description`.
  - Crea sesión de Stripe Checkout por USD $50.
  - Al completar el pago, redirige a `/consulta-confirmada?session_id={CHECKOUT_SESSION_ID}`, donde el cliente agenda su sesión de 45 minutos en el calendario GoHighLevel sin tener que pagar de nuevo.

- **Modo Demo/Simulación sin API Keys**:
  - Si `STRIPE_SECRET_KEY` no está definida en `.env.local`, el sistema genera una sesión simulada transparente (`mock_llc_...` o `mock_consult_...`) para permitir pruebas completas del flujo de usuario sin interrupciones.

## 2. Suscripción y Renovación de Registered Office

- El primer año de **Registered Office** está incluido en los $725 del servicio de CAMIKK.
- La renovación a partir del año 2 es de **$127 anual**.
- En Stripe Billing se puede asociar al cliente creado mediante el Webhook `checkout.session.completed`, programando la suscripción recurrente con el `STRIPE_ANNUAL_REGISTERED_OFFICE_PRICE_ID`.

## 3. Formulario Completo Post-Pago (`/dossier`)

Cumple estrictamente con las secciones A a H del documento de requerimientos:
- **Paso 1: Compañía (Sección A)**: Datos constitutivos, actividad, descripción detallada, dirección comercial y contacto.
- **Paso 2: Miembros y Estructura (Secciones B y C)**: Tipo de administración (Member/Manager-Managed), autoridad de firma, y generador dinámico de propietarios con cálculo de % de participación (suma 100%).
- **Paso 3: Información para EIN / IRS (Sección D)**: Responsable, SSN/ITIN, empleados próximos 12 meses, salarios, mes fiscal, etc.
- **Paso 4: Operating Agreement (Sección E)**: Distribución de ganancias/pérdidas, votación, retiro de socios y acuerdos especiales.
- **Paso 5: Registered Office y Documentos (Secciones F y G)**: Aceptación de sede y carga de identificaciones oficiales.
- **Paso 6: Certificaciones, Firma y Envío (Sección H)**: 4 checkboxes legales obligatorios, firma electrónica legal tipográfica y fecha.
- **Persistencia**: Permite "Guardar progreso" en `localStorage` y en `/api/dossier/save` para que el cliente pueda regresar en cualquier momento sin perder datos.
