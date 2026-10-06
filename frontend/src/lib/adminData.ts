/**
 * Repositorio central de datos para el Panel de Administración de CAMIKK Holdings
 * Se sincroniza con el backend en Node/PostgreSQL (puerto 4000) o mantiene datos en memoria
 */

export type AdminConsultation = {
  id: string;
  orderId?: string | null;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  topic: string;
  description?: string;
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string;      // e.g. "10:15 AM"
  timeZone: string;
  durationMinutes: number;
  status: "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PENDING";
  meetingLink?: string;
  notes?: string;
  totalPaid: number;
  stripeSessionId?: string;
  createdAt: string;
};

export const DOSSIER_STATUS_LIST = [
  "Pago pendiente",
  "Pago recibido",
  "Formulario de información/documentación enviado",
  "Información/Documentación recibida",
  "Documentación en revisión",
  "Expediente LLC Listo para presentar al estado",
  "Expediente LLC Presentado al estado",
  "Tramite creación LLC en revisión estatal",
  "LLC aprobada",
  "EIN y documentos finales en proceso",
  "Completado / Entregado",
] as const;

export type DossierStatusType = typeof DOSSIER_STATUS_LIST[number] | string;

export function normalizeDossierStatus(status?: string): string {
  if (!status) return "Pago pendiente";

  const map: Record<string, string> = {
    INCOMPLETE: "Pago pendiente",
    PENDING_PAYMENT: "Pago pendiente",
    "Pago pendiente": "Pago pendiente",

    PAID: "Pago recibido",
    "Pago recibido": "Pago recibido",

    IN_PROGRESS: "Formulario de información/documentación enviado",
    FORM_SENT: "Formulario de información/documentación enviado",
    "Formulario de información/documentación enviado": "Formulario de información/documentación enviado",
    "Formulario de informacion/documentacion enviada": "Formulario de información/documentación enviado",

    SUBMITTED: "Información/Documentación recibida",
    PENDING_REVIEW: "Información/Documentación recibida",
    "Información/Documentación recibida": "Información/Documentación recibida",

    REVIEW: "Documentación en revisión",
    IN_REVIEW: "Documentación en revisión",
    ACTION_REQUIRED: "Documentación en revisión",
    "Documentación en revisión": "Documentación en revisión",

    READY_FOR_STATE: "Expediente LLC Listo para presentar al estado",
    "Expediente LLC Listo para presentar al estado": "Expediente LLC Listo para presentar al estado",
    "Expendiente LLC Listo para presentar al estado": "Expediente LLC Listo para presentar al estado",

    SUBMITTED_TO_STATE: "Expediente LLC Presentado al estado",
    "Expediente LLC Presentado al estado": "Expediente LLC Presentado al estado",

    STATE_REVIEW: "Tramite creación LLC en revisión estatal",
    "Tramite creación LLC en revisión estatal": "Tramite creación LLC en revisión estatal",

    APPROVED: "LLC aprobada",
    "LLC aprobada": "LLC aprobada",

    EIN_IN_PROGRESS: "EIN y documentos finales en proceso",
    "EIN y documentos finales en proceso": "EIN y documentos finales en proceso",

    COMPLETED: "Completado / Entregado",
    "Completado / Entregado": "Completado / Entregado",
  };

  return map[status] || status;
}

export type AdminDossier = {
  id: string;
  token: string;
  submissionNumber: string;
  status: DossierStatusType;
  currentStep: number;
  createdAt: string;
  submittedAt?: string;
  stateFilingNumber?: string;
  assignedEin?: string;
  internalNotes?: string;
  totalAmount: number;
  autoRenewRegisteredOffice: boolean;

  // Cliente
  client: {
    fullName: string;
    email: string;
    phone: string;
  };

  // A. Compañía
  company: {
    state: string;
    name: string;
    secondChoice?: string;
    thirdChoice?: string;
    startDate?: string;
    activity: string;
    description: string;
    address: string;
    cityStateZip: string;
    phone?: string;
    email?: string;
    website?: string;
  };

  // B. Estructura y Administración
  structure: {
    totalMembers: number;
    managementType: "Member-Managed" | "Manager-Managed";
    signingAuthority: string;
    hasNonOwnerManagers: "Si" | "No";
    managerNames?: string;
  };

  // C. Miembros
  members: Array<{
    id: string;
    fullName: string;
    address: string;
    cityStateZip: string;
    email: string;
    phone: string;
    ownershipPercentage: number;
    initialCapital?: string;
    title: string;
  }>;

  // D. Información para EIN / IRS
  ein: {
    responsiblePartyName: string;
    ssnOrItin: string;
    responsiblePartyAddress: string;
    hasEmployeesNext12Months: "Si" | "No";
    estimatedEmployeesCount?: string;
    firstWageDate?: string;
    fiscalYearEndMonth: string;
    irsActivity: string;
    previouslyApplied: "Si" | "No";
  };

  // E. Operating Agreement
  operatingAgreement: {
    profitLossDistribution: string;
    isDistributionProportional: "Si" | "No";
    agreedDistributionExplanation?: string;
    decisionMaking: "Mayoría" | "Unanimidad" | "Otro";
    memberWithdrawalTerms?: string;
    specialAgreements?: string;
  };

  // F. Registered Office
  registeredOffice: {
    confirmedService: boolean;
    preferredMailingAddress?: string;
    primaryContactPerson?: string;
  };

  // G. Documentos
  documents: Array<{
    id: string;
    type: string;
    originalName: string;
    url: string;
    viewUrl?: string;
    sizeBytes?: number;
  }>;

  // H. Certificaciones
  certifications: {
    accurate: boolean;
    authorized: boolean;
    governmentNotice: boolean;
    delaysNotice: boolean;
    electronicSignature: string;
    signedDate: string;
  };
};

// Datos semilla de demostración para el panel
const initialConsultations: AdminConsultation[] = [
  {
    id: "cs-001",
    clientName: "Carlos Mendoza",
    clientEmail: "carlos.mendoza@innova-tech.com",
    clientPhone: "+1 (305) 892-1204",
    topic: "Estructura de Nueva LLC",
    description: "Quiero constituir una LLC en Delaware para desarrollo de software con socios extranjeros y procesar pagos en Stripe.",
    scheduledDate: "2026-10-02",
    timeSlot: "10:15 AM",
    timeZone: "America/New_York (EST)",
    durationMinutes: 45,
    status: "CONFIRMED",
    meetingLink: "https://meet.google.com/cmk-asesoria-001",
    notes: "Interesado en pasarela de pagos estadounidense y EIN expedito.",
    totalPaid: 50,
    stripeSessionId: "cs_test_a1b2c3d4e5f6",
    createdAt: "2026-09-30T10:15:00Z",
  },
  {
    id: "cs-002",
    clientName: "Valentina Gómez",
    clientEmail: "vgomez@logistica-andina.co",
    clientPhone: "+57 310 445 9921",
    topic: "LLC existente y Registered Office",
    description: "Tengo una LLC en Florida y necesito cambiar de Registered Agent a CAMIKK Holdings y poner al día los reportes anuales.",
    scheduledDate: "2026-10-02",
    timeSlot: "01:15 PM",
    timeZone: "America/New_York (EST)",
    durationMinutes: 45,
    status: "CONFIRMED",
    meetingLink: "https://meet.google.com/cmk-asesoria-002",
    notes: "Cambio de agente registrado y compliance 2026.",
    totalPaid: 50,
    stripeSessionId: "cs_test_f7g8h9i0j1k2",
    createdAt: "2026-09-29T14:30:00Z",
  },
  {
    id: "cs-003",
    clientName: "David Ramírez",
    clientEmail: "david@ecomglobal.io",
    clientPhone: "+1 (786) 334-9022",
    topic: "EIN-IRS y Cuentas Bancarias",
    description: "Asesoría para solicitar EIN sin SSN para empresa de comercio electrónico en Amazon FBA.",
    scheduledDate: "2026-09-28",
    timeSlot: "11:00 AM",
    timeZone: "America/New_York (EST)",
    durationMinutes: 45,
    status: "COMPLETED",
    meetingLink: "https://meet.google.com/cmk-asesoria-003",
    notes: "Sesión completada con éxito. Se le envió la ruta de formación de LLC en Wyoming.",
    totalPaid: 50,
    stripeSessionId: "cs_test_l3m4n5o6p7q8",
    createdAt: "2026-09-27T09:00:00Z",
  },
  {
    id: "cs-004",
    clientName: "Mariana Restrepo",
    clientEmail: "mariana@consultoresas.com",
    clientPhone: "+1 (212) 555-0199",
    topic: "Estructura del negocio",
    description: "Dudas sobre tributación pass-through vs corporación C para inversores internacionales.",
    scheduledDate: "2026-10-05",
    timeSlot: "02:45 PM",
    timeZone: "America/New_York (EST)",
    durationMinutes: 45,
    status: "CONFIRMED",
    meetingLink: "https://meet.google.com/cmk-asesoria-004",
    notes: "Cliente de alto potencial, evaluar paquete de contabilidad complementaria.",
    totalPaid: 50,
    stripeSessionId: "cs_test_r9s0t1u2v3w4",
    createdAt: "2026-09-30T16:00:00Z",
  },
];

const initialDossiers: AdminDossier[] = [
  {
    id: "llc-001",
    token: "tok_llc_948201",
    submissionNumber: "CMK-LLC-2026-000001",
    status: "APPROVED",
    currentStep: 6,
    createdAt: "2026-09-28T11:20:00Z",
    submittedAt: "2026-09-28T14:45:00Z",
    stateFilingNumber: "FL-DOC-2026-89104",
    assignedEin: "98-4729103",
    internalNotes: "Aprobada por el Departamento de Estado de Florida. Documentación enviada al cliente.",
    totalAmount: 850,
    autoRenewRegisteredOffice: true,
    client: {
      fullName: "Andrés Felipe Castro",
      email: "andres@castrosolutions.com",
      phone: "+1 (305) 789-2211",
    },
    company: {
      state: "Florida",
      name: "Castro Digital Solutions LLC",
      secondChoice: "Castro Tech Group LLC",
      thirdChoice: "CDS Holdings LLC",
      startDate: "2026-10-01",
      activity: "Servicios de Software, Consultoría y Marketing Digital",
      description: "Desarrollo de plataformas web a medida, integraciones de software SaaS y pauta digital para clientes en EE.UU. y Latinoamérica.",
      address: "101 Hamilton St. Suite 351",
      cityStateZip: "Allentown, PA 18101",
      phone: "+1 (305) 789-2211",
      email: "contacto@castrosolutions.com",
      website: "https://castrosolutions.com",
    },
    structure: {
      totalMembers: 2,
      managementType: "Member-Managed",
      signingAuthority: "Andrés Felipe Castro y Diana Carolina Vega",
      hasNonOwnerManagers: "No",
    },
    members: [
      {
        id: "m-1",
        fullName: "Andrés Felipe Castro",
        address: "Calle 100 # 15-20 Apto 402",
        cityStateZip: "Bogotá, Colombia 110111",
        email: "andres@castrosolutions.com",
        phone: "+1 (305) 789-2211",
        ownershipPercentage: 60,
        initialCapital: "$6,000 USD",
        title: "Managing Member & CEO",
      },
      {
        id: "m-2",
        fullName: "Diana Carolina Vega",
        address: "Calle 100 # 15-20 Apto 402",
        cityStateZip: "Bogotá, Colombia 110111",
        email: "diana@castrosolutions.com",
        phone: "+57 312 900 8122",
        ownershipPercentage: 40,
        initialCapital: "$4,000 USD",
        title: "Member & COO",
      },
    ],
    ein: {
      responsiblePartyName: "Andrés Felipe Castro",
      ssnOrItin: "No aplica (Extranjero sin SSN/ITIN)",
      responsiblePartyAddress: "Calle 100 # 15-20 Apto 402, Bogotá, Colombia",
      hasEmployeesNext12Months: "No",
      fiscalYearEndMonth: "Diciembre",
      irsActivity: "Tecnología y Comercio Electrónico",
      previouslyApplied: "No",
    },
    operatingAgreement: {
      profitLossDistribution: "Proporcional a los aportes de capital y porcentaje accionario.",
      isDistributionProportional: "Si",
      decisionMaking: "Mayoría",
      memberWithdrawalTerms: "Derecho de tanteo preferencial para el socio restante durante 60 días antes de vender a terceros.",
      specialAgreements: "Poder de firma bancaria individual para ambos socios hasta montos de $10,000 USD.",
    },
    registeredOffice: {
      confirmedService: true,
      preferredMailingAddress: "101 Hamilton St. Suite 351, Allentown, PA 18101",
      primaryContactPerson: "Andrés Felipe Castro",
    },
    documents: [
      {
        id: "doc-1",
        type: "RESPONSIBLE_PARTY_ID",
        originalName: "Pasaporte_Andres_Castro.pdf",
        url: "/dossier?demo_doc=passport_andres",
        sizeBytes: 1420000,
      },
      {
        id: "doc-2",
        type: "ADDITIONAL_MEMBER_ID",
        originalName: "Pasaporte_Diana_Vega.pdf",
        url: "/dossier?demo_doc=passport_diana",
        sizeBytes: 1380000,
      },
    ],
    certifications: {
      accurate: true,
      authorized: true,
      governmentNotice: true,
      delaysNotice: true,
      electronicSignature: "Andrés Felipe Castro",
      signedDate: "2026-09-28 14:45 EST",
    },
  },
  {
    id: "llc-002",
    token: "tok_llc_948202",
    submissionNumber: "CMK-LLC-2026-000002",
    status: "SUBMITTED_TO_STATE",
    currentStep: 6,
    createdAt: "2026-09-29T16:10:00Z",
    submittedAt: "2026-09-29T18:05:00Z",
    stateFilingNumber: "DE-SR-2026-119830",
    assignedEin: "En trámite ante el IRS",
    internalNotes: "Radicado ante la División de Corporaciones de Delaware. Esperando certificado oficial.",
    totalAmount: 795,
    autoRenewRegisteredOffice: true,
    client: {
      fullName: "Santiago Ortiz Morales",
      email: "sortiz@nexuscloud.io",
      phone: "+57 301 228 9033",
    },
    company: {
      state: "Delaware",
      name: "Nexus Cloud Infrastructure LLC",
      secondChoice: "Nexus Platform LLC",
      thirdChoice: "Nexus Global Holdings LLC",
      startDate: "2026-10-15",
      activity: "Hosting en la nube y DevOps",
      description: "Servicios de infraestructura gestionada en AWS y GCP para startups de tecnología.",
      address: "101 Hamilton St. Suite 351",
      cityStateZip: "Allentown, PA 18101",
      phone: "+57 301 228 9033",
      email: "admin@nexuscloud.io",
      website: "https://nexuscloud.io",
    },
    structure: {
      totalMembers: 1,
      managementType: "Member-Managed",
      signingAuthority: "Santiago Ortiz Morales",
      hasNonOwnerManagers: "No",
    },
    members: [
      {
        id: "m-3",
        fullName: "Santiago Ortiz Morales",
        address: "Carrera 43A # 1-50 Of. 801",
        cityStateZip: "Medellín, Colombia 050021",
        email: "sortiz@nexuscloud.io",
        phone: "+57 301 228 9033",
        ownershipPercentage: 100,
        initialCapital: "$5,000 USD",
        title: "Sole Member & President",
      },
    ],
    ein: {
      responsiblePartyName: "Santiago Ortiz Morales",
      ssnOrItin: "No aplica",
      responsiblePartyAddress: "Carrera 43A # 1-50, Medellín, Colombia",
      hasEmployeesNext12Months: "No",
      fiscalYearEndMonth: "Diciembre",
      irsActivity: "Servicios Computacionales",
      previouslyApplied: "No",
    },
    operatingAgreement: {
      profitLossDistribution: "100% al socio único.",
      isDistributionProportional: "Si",
      decisionMaking: "Unanimidad",
      memberWithdrawalTerms: "N/A - Propietario único.",
    },
    registeredOffice: {
      confirmedService: true,
      preferredMailingAddress: "101 Hamilton St. Suite 351, Allentown, PA 18101",
      primaryContactPerson: "Santiago Ortiz Morales",
    },
    documents: [
      {
        id: "doc-3",
        type: "RESPONSIBLE_PARTY_ID",
        originalName: "ID_Santiago_Ortiz.pdf",
        url: "/dossier?demo_doc=id_santiago",
        sizeBytes: 1190000,
      },
    ],
    certifications: {
      accurate: true,
      authorized: true,
      governmentNotice: true,
      delaysNotice: true,
      electronicSignature: "Santiago Ortiz Morales",
      signedDate: "2026-09-29 18:05 EST",
    },
  },
  {
    id: "llc-003",
    token: "tok_llc_948203",
    submissionNumber: "CMK-LLC-2026-000003",
    status: "PENDING_REVIEW",
    currentStep: 6,
    createdAt: "2026-09-30T09:30:00Z",
    submittedAt: "2026-09-30T10:15:00Z",
    internalNotes: "Expediente recién recibido. Verificar legibilidad de la identificación del socio 2.",
    totalAmount: 825,
    autoRenewRegisteredOffice: false,
    client: {
      fullName: "Camila Echeverry",
      email: "camila@echeverryimports.com",
      phone: "+1 (412) 609-3388",
    },
    company: {
      state: "Wyoming",
      name: "Andean Heritage Imports LLC",
      secondChoice: "Andean Goods LLC",
      activity: "Comercio internacional de café y artesanías",
      description: "Importación y comercialización de café especial colombiano y productos de diseño textil en el mercado estadounidense.",
      address: "101 Hamilton St. Suite 351",
      cityStateZip: "Allentown, PA 18101",
      email: "camila@echeverryimports.com",
    },
    structure: {
      totalMembers: 2,
      managementType: "Manager-Managed",
      signingAuthority: "Camila Echeverry",
      hasNonOwnerManagers: "No",
    },
    members: [
      {
        id: "m-4",
        fullName: "Camila Echeverry",
        address: "Av. Santander # 54-10",
        cityStateZip: "Manizales, Colombia",
        email: "camila@echeverryimports.com",
        phone: "+1 (412) 609-3388",
        ownershipPercentage: 70,
        initialCapital: "$7,000 USD",
        title: "Manager",
      },
      {
        id: "m-5",
        fullName: "Rodrigo Echeverry",
        address: "Av. Santander # 54-10",
        cityStateZip: "Manizales, Colombia",
        email: "rodrigo@echeverryimports.com",
        phone: "+57 315 889 0011",
        ownershipPercentage: 30,
        initialCapital: "$3,000 USD",
        title: "Member",
      },
    ],
    ein: {
      responsiblePartyName: "Camila Echeverry",
      ssnOrItin: "No aplica",
      responsiblePartyAddress: "Av. Santander # 54-10, Manizales, Colombia",
      hasEmployeesNext12Months: "No",
      fiscalYearEndMonth: "Diciembre",
      irsActivity: "Venta al por mayor y menor",
      previouslyApplied: "No",
    },
    operatingAgreement: {
      profitLossDistribution: "Proporcional al porcentaje accionario.",
      isDistributionProportional: "Si",
      decisionMaking: "Mayoría",
    },
    registeredOffice: {
      confirmedService: true,
      preferredMailingAddress: "101 Hamilton St. Suite 351, Allentown, PA 18101",
      primaryContactPerson: "Camila Echeverry",
    },
    documents: [
      {
        id: "doc-4",
        type: "RESPONSIBLE_PARTY_ID",
        originalName: "Pasaporte_Camila.pdf",
        url: "/dossier?demo_doc=passport_camila",
      },
    ],
    certifications: {
      accurate: true,
      authorized: true,
      governmentNotice: true,
      delaysNotice: true,
      electronicSignature: "Camila Echeverry",
      signedDate: "2026-09-30 10:15 EST",
    },
  },
];

// Almacenamiento en memoria para el servidor frontend
let globalConsultations = [...initialConsultations];
let globalDossiers = [...initialDossiers];

export const adminDataStore = {
  getConsultations: () => globalConsultations,
  addConsultation: (c: AdminConsultation) => {
    globalConsultations.unshift(c);
    return c;
  },
  updateConsultation: (id: string, updates: Partial<AdminConsultation>) => {
    const idx = globalConsultations.findIndex((c) => c.id === id);
    if (idx !== -1) {
      globalConsultations[idx] = { ...globalConsultations[idx], ...updates };
      return globalConsultations[idx];
    }
    return null;
  },
  deleteConsultation: (id: string) => {
    globalConsultations = globalConsultations.filter((c) => c.id !== id);
  },

  getDossiers: () => globalDossiers,
  addDossier: (d: AdminDossier) => {
    globalDossiers.unshift(d);
    return d;
  },
  updateDossier: (id: string, updates: Partial<AdminDossier>) => {
    const idx = globalDossiers.findIndex((d) => d.id === id);
    if (idx !== -1) {
      globalDossiers[idx] = { ...globalDossiers[idx], ...updates };
      return globalDossiers[idx];
    }
    return null;
  },

  getStats: () => {
    const totalConsultations = globalConsultations.length;
    const confirmedConsultations = globalConsultations.filter((c) => c.status === "CONFIRMED").length;
    const completedConsultations = globalConsultations.filter((c) => c.status === "COMPLETED").length;
    const consultationRevenue = globalConsultations
      .filter((c) => c.status !== "CANCELLED")
      .reduce((acc, c) => acc + (c.totalPaid || 50), 0);

    const totalDossiers = globalDossiers.length;
    const approvedDossiers = globalDossiers.filter((d) => d.status === "APPROVED").length;
    const pendingDossiers = globalDossiers.filter((d) => d.status === "PENDING_REVIEW" || d.status === "SUBMITTED_TO_STATE").length;
    const llcRevenue = globalDossiers.reduce((acc, d) => acc + (d.totalAmount || 850), 0);

    return {
      consultations: {
        total: totalConsultations,
        confirmed: confirmedConsultations,
        completed: completedConsultations,
        revenue: consultationRevenue,
      },
      llcs: {
        total: totalDossiers,
        approved: approvedDossiers,
        pending: pendingDossiers,
        revenue: llcRevenue,
      },
      totalRevenue: consultationRevenue + llcRevenue,
    };
  },
};
