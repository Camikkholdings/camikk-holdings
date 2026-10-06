import { prisma } from "../db/prisma";
import { mailService } from "./mail.service";

export type CreateConsultationInput = {
  fullName: string;
  email: string;
  phone: string;
  topic: string;
  description?: string;
  scheduledDate: string; // YYYY-MM-DD
  timeSlot: string;      // Ej. "10:00 AM"
  timeZone?: string;
  stripeSessionId?: string;
  totalAmount?: number;
};

export class ConsultationService {
  /**
   * Obtiene los horarios disponibles para una fecha específica (excluyendo los ya reservados)
   */
  async getSlotsData(dateStr: string): Promise<{ allSlots: string[]; availableSlots: string[]; bookedSlots: string[] }> {
    const allSlots = [
      "08:00 AM",
      "08:45 AM",
      "09:30 AM",
      "10:15 AM",
      "11:00 AM",
      "11:45 AM",
      "01:15 PM",
      "02:00 PM",
      "02:45 PM",
      "03:30 PM",
      "04:15 PM",
    ];

    try {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

      // Consultar en PostgreSQL si hay citas ya confirmadas para ese día
      // @ts-ignore prisma model generated dynamically
      const existingBookings = await (prisma as any).consultationBooking?.findMany({
        where: {
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        select: { timeSlot: true },
      });

      const bookedSlots: string[] = existingBookings ? existingBookings.map((b: any) => b.timeSlot) : [];
      const bookedSet = new Set(bookedSlots);
      const availableSlots = allSlots.filter((slot) => !bookedSet.has(slot));

      return { allSlots, availableSlots, bookedSlots };
    } catch (err) {
      console.warn("Aviso al consultar citas en base de datos (retornando horarios por defecto):", err);
      return { allSlots, availableSlots: allSlots, bookedSlots: [] };
    }
  }

  async getAvailableSlots(dateStr: string): Promise<string[]> {
    const data = await this.getSlotsData(dateStr);
    return data.availableSlots;
  }

  /**
   * Guarda la reserva confirmada de la consulta en PostgreSQL
   */
  async createBooking(input: CreateConsultationInput) {
    const {
      fullName,
      email,
      phone,
      topic,
      description = "",
      scheduledDate,
      timeSlot,
      timeZone = "America/Bogota",
      stripeSessionId,
      totalAmount = 50,
    } = input;

    // 1. Buscar o crear cliente atómicamente con upsert para evitar errores de unicidad
    const normalizedEmail = email.toLowerCase().trim();
    const client = await prisma.client.upsert({
      where: { email: normalizedEmail },
      update: {
        fullName: fullName || undefined,
        phone: phone || undefined,
      },
      create: {
        fullName: fullName || "Cliente",
        email: normalizedEmail,
        phone: phone || "",
      },
    });


    // 2. Crear Orden si viene con sesión de Stripe
    let order = null;
    if (stripeSessionId) {
      order = await prisma.order.upsert({
        where: { stripeSessionId },
        update: {
          status: "PAID",
          paidAt: new Date(),
        },
        create: {
          clientId: client.id,
          type: "CONSULTATION",
          serviceFee: totalAmount,
          stateFee: 0,
          totalAmount,
          stripeSessionId,
          status: "PAID",
          paidAt: new Date(),
          metadata: {
            topic,
            description,
            scheduledDate,
            timeSlot,
            timeZone,
          },
        },
      });
    }

    // 3. Crear Registro de Consulta en PostgreSQL (con protección de orden única)
    const parsedDate = new Date(`${scheduledDate}T12:00:00.000Z`);

    let booking;
    if (order?.id) {
      // @ts-ignore prisma model generated dynamically
      booking = await (prisma as any).consultationBooking?.upsert({
        where: { orderId: order.id },
        update: {
          clientId: client.id,
          clientName: fullName,
          clientEmail: email,
          clientPhone: phone,
          topic,
          description,
          scheduledDate: parsedDate,
          timeSlot,
          timeZone,
          status: "CONFIRMED",
        },
        create: {
          orderId: order.id,
          clientId: client.id,
          clientName: fullName,
          clientEmail: email,
          clientPhone: phone,
          topic,
          description,
          scheduledDate: parsedDate,
          timeSlot,
          timeZone,
          durationMinutes: 45,
          status: "CONFIRMED",
          notes: `Asesoría de 45 minutos. Tema: ${topic}`,
        },
      });
    } else {
      // @ts-ignore prisma model generated dynamically
      booking = await (prisma as any).consultationBooking?.create({
        data: {
          orderId: null,
          clientId: client.id,
          clientName: fullName,
          clientEmail: email,
          clientPhone: phone,
          topic,
          description,
          scheduledDate: parsedDate,
          timeSlot,
          timeZone,
          durationMinutes: 45,
          status: "CONFIRMED",
          notes: `Asesoría de 45 minutos. Tema: ${topic}`,
        },
      });
    }


    console.log(`✅ Cita de consulta registrada con éxito en PostgreSQL. Cliente: ${fullName} (${email}), Fecha: ${scheduledDate} a las ${timeSlot}`);

    // 4. Enviar correo de confirmación de la cita
    try {
      await mailService.sendConsultationConfirmationEmail({
        toEmail: email,
        clientName: fullName,
        topic,
        scheduledDate,
        timeSlot,
        timeZone,
      });
    } catch (mailErr) {
      console.warn("Aviso al enviar email de confirmación:", mailErr);
    }

    return booking;
  }
}

export const consultationService = new ConsultationService();
