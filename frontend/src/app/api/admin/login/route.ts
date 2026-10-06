import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@camikk.com";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Camikk2026!Admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos." }, { status: 400 });
    }

    if (
      email.trim().toLowerCase() !== DEFAULT_ADMIN_EMAIL.toLowerCase() ||
      password !== DEFAULT_ADMIN_PASSWORD
    ) {
      return NextResponse.json({ error: "Credenciales de administrador inválidas." }, { status: 401 });
    }

    const token = `camikk_adm_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const adminUser = {
      email: DEFAULT_ADMIN_EMAIL,
      name: "Administrador CAMIKK",
      role: "SUPER_ADMIN",
    };

    const response = NextResponse.json({
      success: true,
      token,
      admin: adminUser,
      user: adminUser,
    });


    response.cookies.set("camikk_admin_session", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    });

    return response;
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al iniciar sesión." },
      { status: 500 }
    );
  }
}
