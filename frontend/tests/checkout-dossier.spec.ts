import { expect, test } from "@playwright/test";

test.describe("Flujo Completo de LLC, Stripe y Dossier Post-Pago", () => {
  test("completa el formulario inicial de LLC y calcula el precio dinámicamente", async ({ page }) => {
    await page.goto("/?lang=es");

    // Llenar datos iniciales requeridos antes del pago (Página 1 y 4 del documento)
    await page.locator("#llc-fullname").fill("Juan Pérez");
    await page.locator("#llc-phone").fill("+13304491683");
    await page.locator("#llc-email").fill("juan@ejemplo.com");
    await page.locator("#state-select").selectOption("Pennsylvania");

    // Verificar cálculo automático: $725 + $125 = $850
    await expect(page.locator(".price-total strong")).toHaveText("$850");

    await page.locator("#llc-companyname").fill("Innova Solutions LLC");
    await page.locator("#llc-secondname").fill("Innova Group LLC");
    await page.locator("#llc-activity").fill("Comercio electrónico y consultoría");

    // Seleccionar cantidad de propietarios
    await page.getByRole("radio", { name: /1 propietario/ }).click();

    // Marcar las 4 confirmaciones obligatorias (Página 4 del documento)
    const checkboxes = page.locator(".confirmations-box input[type='checkbox']");
    await expect(checkboxes).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await checkboxes.nth(i).check();
    }

    // El botón de checkout debe mostrar el total dinámico: Pagar $850 y Comenzar mi LLC
    const checkoutButton = page.locator(".checkout-action-area button");
    await expect(checkoutButton).toBeEnabled();
    await expect(checkoutButton).toContainText("$850");
  });

  test("navega por el formulario multipaso del expediente post-pago", async ({ page }) => {
    // Abrir el dossier simulando haber completado el pago de Pennsylvania
    await page.goto(
      "/dossier?session_id=mock_llc_test&state=Pennsylvania&company=Innova+Solutions+LLC&name=Juan+Perez&email=juan@ejemplo.com&phone=+13304491683&activity=Ecommerce&owners=2"
    );

    // Verificar banner de agradecimiento oficial
    await expect(page.locator(".dossier-alert-bar")).toContainText("¡Gracias! Tu pago ha sido recibido con éxito.");

    // Paso 1: Compañía (datos pre-llenados)
    await expect(page.locator("#company-name")).toHaveValue("Innova Solutions LLC");
    await expect(page.locator("#company-state")).toHaveValue("Pennsylvania");
    await page.locator("#company-desc").fill("Venta de productos en línea y logística.");
    await page.locator("#company-address").fill("101 Hamilton St. Suite 351");
    await page.locator("#company-city-zip").fill("Allentown, PA 18101");

    // Avanzar al Paso 2: Miembros y Estructura
    await page.locator(".btn-wizard-next").scrollIntoViewIfNeeded();
    await page.locator(".btn-wizard-next").click({ force: true });
    await expect(page.locator("#step-2-title")).toBeVisible();

    // Configurar autoridad de firma
    await page.locator("#signing-auth").fill("Juan Pérez");

    // Paso 2 tiene 2 miembros generados por owners=2
    await page.locator("#m-name-0").fill("Juan Pérez");
    await page.locator("#m-addr-0").fill("Calle 10 #20");
    await page.locator("#m-city-0").fill("Allentown, PA 18101");
    await page.locator("#m-email-0").fill("juan@ejemplo.com");
    await page.locator("#m-phone-0").fill("+13304491683");
    await page.locator("#m-percent-0").fill("50");

    await page.locator("#m-name-1").fill("María Pérez");
    await page.locator("#m-addr-1").fill("Calle 10 #20");
    await page.locator("#m-city-1").fill("Allentown, PA 18101");
    await page.locator("#m-email-1").fill("maria@ejemplo.com");
    await page.locator("#m-phone-1").fill("+13304491684");
    await page.locator("#m-percent-1").fill("50");

    // Avanzar al Paso 3: EIN / IRS
    await page.locator(".btn-wizard-next").scrollIntoViewIfNeeded();
    await page.locator(".btn-wizard-next").click({ force: true });
    await expect(page.locator("#step-3-title")).toBeVisible();

    await page.locator("#ein-ssn-itin").fill("NO POSEE / EXTRANJERO");
    await page.locator("#ein-resp-addr").fill("101 Hamilton St. Suite 351, Allentown, PA");

    // Avanzar al Paso 4: Operating Agreement
    await page.locator(".btn-wizard-next").scrollIntoViewIfNeeded();
    await page.locator(".btn-wizard-next").click({ force: true });
    await expect(page.locator("#step-4-title")).toBeVisible();

    // Avanzar al Paso 5: Registered Office y Documentos
    await page.locator(".btn-wizard-next").scrollIntoViewIfNeeded();
    await page.locator(".btn-wizard-next").click({ force: true });
    await expect(page.locator("#step-5-title")).toBeVisible();

    // Avanzar al Paso 6: Certificaciones Finales
    await page.locator(".btn-wizard-next").scrollIntoViewIfNeeded();
    await page.locator(".btn-wizard-next").click({ force: true });
    await expect(page.locator("#step-6-title")).toBeVisible();

    // Marcar las 4 certificaciones finales obligatorias
    const certChecks = page.locator(".legal-checkboxes-block input[type='checkbox']");
    await expect(certChecks).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await certChecks.nth(i).check();
    }

    // Firmar electrónicamente
    await page.locator("#final-signature").fill("Juan Pérez");

    // Enviar formulario
    await page.locator(".submit-final-button").scrollIntoViewIfNeeded();
    await page.locator(".submit-final-button").click();

    // Verificar pantalla de éxito con número de radicación
    await expect(page.locator(".dossier-success-card h1")).toHaveText("¡Expediente de LLC Completado con Éxito!");
    await expect(page.locator(".submission-id-box strong")).toContainText("CMK-LLC-");
  });
});
