import { getSupportEmail } from '@/lib/email/config'

type EmailContent = {
  subject: string
  html: string
  text: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEmailLayout(title: string, preview: string, contentHtml: string) {
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(preview)
  const supportEmail = escapeHtml(getSupportEmail())

  return `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:Segoe UI,Arial,sans-serif;color:#1d1d1f;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${safePreview}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f5f5f7;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:32px 40px;background:linear-gradient(135deg,#E43432 0%,#c72826 100%);text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">TeamPulse</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.92);font-size:15px;">Sportovní týmový systém</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">${contentHtml}</td>
          </tr>
          <tr>
            <td style="padding:24px 40px;background:#f5f5f7;color:#6e6e73;font-size:13px;line-height:1.6;text-align:center;">
              Pokud máš dotazy, napiš na <a href="mailto:${supportEmail}" style="color:#E43432;text-decoration:none;">${supportEmail}</a>.<br />
              © TeamPulse. Všechna práva vyhrazena.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function joinText(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join('\n\n')
}

export function buildTwoFactorCodeEmail(input: {
  firstName?: string | null
  code: string
  expiresMinutes: number
}): EmailContent {
  const greeting = input.firstName ? `Ahoj ${escapeHtml(input.firstName)},` : 'Dobrý den,'

  return {
    subject: 'Ověřovací kód pro přihlášení – TeamPulse',
    html: renderEmailLayout(
      'Dvoufaktorové ověření',
      `Tvůj přihlašovací kód do TeamPulse je ${input.code}`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Dvoufaktorové ověření</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">${greeting}</p>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">
          Pro dokončení přihlášení do TeamPulse použij tento 6místný kód:
        </p>
        <div style="margin:0 0 24px;padding:20px 24px;background:#111111;border-radius:14px;text-align:center;letter-spacing:10px;font-size:32px;font-weight:700;color:#ffffff;">
          ${escapeHtml(input.code)}
        </div>
        <p style="margin:0;color:#6e6e73;font-size:14px;line-height:1.6;">
          Kód platí ${input.expiresMinutes} minut. Pokud ses právě nepřihlašoval, změň si heslo.
        </p>
      `
    ),
    text: joinText([
      input.firstName ? `Ahoj ${input.firstName},` : 'Dobrý den,',
      `pro dokončení přihlášení do TeamPulse použij tento kód: ${input.code}`,
      `Kód platí ${input.expiresMinutes} minut.`,
    ]),
  }
}

export function buildClubInviteEmail(input: {
  clubName: string
  inviterName: string
  role: string
  inviteUrl: string
  expiresHours: number
}): EmailContent {
  const safeClubName = escapeHtml(input.clubName)
  const safeInviterName = escapeHtml(input.inviterName)
  const safeRole = escapeHtml(input.role)
  const safeInviteUrl = escapeHtml(input.inviteUrl)

  return {
    subject: `Pozvánka do klubu ${input.clubName} – TeamPulse`,
    html: renderEmailLayout(
      'Pozvánka do klubu',
      `Byl(a) jsi pozván(a) do klubu ${input.clubName}`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Pozvánka do klubu ${safeClubName}</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Dobrý den,</p>
        <div style="margin:0 0 24px;padding:18px 22px;background:#f8f9fa;border-left:4px solid #E43432;border-radius:10px;color:#2c2c2c;font-size:16px;line-height:1.7;">
          <strong style="color:#E43432;">${safeInviterName}</strong> vás zve do klubu <strong>${safeClubName}</strong> jako <strong>${safeRole}</strong>.
        </div>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">
          Pro dokončení registrace klikni na tlačítko níže:
        </p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${safeInviteUrl}" style="display:inline-block;padding:15px 32px;background:linear-gradient(135deg,#E43432 0%,#c72826 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Přijmout pozvánku</a>
        </div>
        <div style="margin:0 0 24px;padding:18px 20px;background:#f5f5f7;border-radius:10px;">
          <div style="margin:0 0 8px;color:#6e6e73;font-size:13px;font-weight:600;">Pokud tlačítko nefunguje, použij tento odkaz:</div>
          <a href="${safeInviteUrl}" style="color:#E43432;font-size:13px;word-break:break-all;text-decoration:none;">${safeInviteUrl}</a>
        </div>
        <p style="margin:0;color:#6e6e73;font-size:14px;line-height:1.6;">Tento odkaz vyprší za ${input.expiresHours} hodinu. Pokud jsi tuto pozvánku nečekal(a), email ignoruj.</p>
      `
    ),
    text: joinText([
      'Dobrý den,',
      `${input.inviterName} vás zve do klubu ${input.clubName} jako ${input.role}.`,
      `Přijmout pozvánku: ${input.inviteUrl}`,
      `Odkaz vyprší za ${input.expiresHours} hodinu.`,
    ]),
  }
}

export function buildPasswordResetEmail(input: {
  firstName: string
  resetUrl: string
  expiresHours: number
}): EmailContent {
  const safeFirstName = escapeHtml(input.firstName)
  const safeResetUrl = escapeHtml(input.resetUrl)

  return {
    subject: 'Obnovení hesla – TeamPulse',
    html: renderEmailLayout(
      'Obnovení hesla',
      'Požadavek na změnu hesla v TeamPulse',
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Obnovení hesla</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Dobrý den ${safeFirstName},</p>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">Obdrželi jsme požadavek na obnovení hesla k vašemu účtu TeamPulse.</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${safeResetUrl}" style="display:inline-block;padding:15px 32px;background:linear-gradient(135deg,#E43432 0%,#c72826 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Obnovit heslo</a>
        </div>
        <p style="margin:0 0 16px;color:#6e6e73;font-size:14px;line-height:1.6;">Odkaz je platný ${input.expiresHours} hodinu.</p>
        <a href="${safeResetUrl}" style="color:#E43432;font-size:13px;word-break:break-all;text-decoration:none;">${safeResetUrl}</a>
      `
    ),
    text: joinText([
      `Dobrý den ${input.firstName},`,
      `pro změnu hesla použijte tento odkaz: ${input.resetUrl}`,
      `Odkaz je platný ${input.expiresHours} hodinu.`,
    ]),
  }
}

export function buildRegistrationVerificationEmail(input: {
  fullName: string
  clubName: string
  verificationUrl: string
  expiresHours: number
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeVerificationUrl = escapeHtml(input.verificationUrl)

  return {
    subject: 'Ověř svůj email – TeamPulse',
    html: renderEmailLayout(
      'Ověření emailu',
      `Potvrď registraci klubu ${input.clubName}`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Ověř svůj email</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName},</p>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">Děkujeme za registraci klubu <strong style="color:#E43432;">${safeClubName}</strong>. Pro dokončení registrace ověř svůj email. Po ověření bude žádost čekat na schválení administrátorem.</p>
        <div style="text-align:center;margin:0 0 24px;">
          <a href="${safeVerificationUrl}" style="display:inline-block;padding:15px 32px;background:#E43432;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Ověřit email</a>
        </div>
        <p style="margin:0;color:#6e6e73;font-size:14px;line-height:1.6;">Odkaz vyprší za ${input.expiresHours} hodin.</p>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `pro dokončení registrace klubu ${input.clubName} ověř email zde: ${input.verificationUrl}`,
      'Po ověření bude žádost čekat na schválení administrátorem.',
      `Odkaz vyprší za ${input.expiresHours} hodin.`,
    ]),
  }
}

export function buildClubCreatedOwnerEmail(input: {
  fullName: string
  clubName: string
  clubId: number
  sport: string
  city: string
  loginUrl: string
  email: string
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeLoginUrl = escapeHtml(input.loginUrl)
  const safeEmail = escapeHtml(input.email)
  const safeSport = escapeHtml(input.sport)
  const safeCity = escapeHtml(input.city)

  return {
    subject: 'Klub byl založen – TeamPulse',
    html: renderEmailLayout(
      'Klub byl založen',
      `Klub ${input.clubName} je připraven`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Klub byl úspěšně založen</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName}, tvůj klub <strong style="color:#E43432;">${safeClubName}</strong> je připraven.</p>
        <div style="margin:0 0 24px;padding:18px 20px;background:#f5f5f7;border-radius:10px;color:#1d1d1f;font-size:14px;line-height:1.7;">
          <strong>ID klubu:</strong> ${input.clubId}<br />
          <strong>Sport:</strong> ${safeSport}<br />
          <strong>Město:</strong> ${safeCity}
        </div>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">Přihlásíš se emailem <strong>${safeEmail}</strong>.</p>
        <div style="text-align:center;">
          <a href="${safeLoginUrl}" style="display:inline-block;padding:15px 32px;background:#E43432;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Přihlásit se</a>
        </div>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `tvůj klub ${input.clubName} byl založen.`,
      `ID klubu: ${input.clubId}, sport: ${input.sport}, město: ${input.city}.`,
      `Přihlášení: ${input.loginUrl}`,
    ]),
  }
}

export function buildClubPendingApprovalOwnerEmail(input: {
  fullName: string
  clubName: string
  clubId: number
  sport: string
  city: string
  loginUrl: string
  email: string
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeLoginUrl = escapeHtml(input.loginUrl)
  const safeEmail = escapeHtml(input.email)
  const safeSport = escapeHtml(input.sport)
  const safeCity = escapeHtml(input.city)

  return {
    subject: 'Žádost o klub čeká na schválení – TeamPulse',
    html: renderEmailLayout(
      'Žádost čeká na schválení',
      `Žádost o klub ${input.clubName} čeká na schválení administrátorem`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Žádost čeká na schválení</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName}, děkujeme za ověření e-mailu.</p>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Žádost o klub <strong style="color:#E43432;">${safeClubName}</strong> byla přijata a nyní čeká na schválení administrátorem.</p>
        <div style="margin:0 0 24px;padding:18px 20px;background:#f5f5f7;border-radius:10px;color:#1d1d1f;font-size:14px;line-height:1.7;">
          <strong>ID klubu:</strong> ${input.clubId}<br />
          <strong>Sport:</strong> ${safeSport}<br />
          <strong>Město:</strong> ${safeCity}<br />
          <strong>Přihlašovací email:</strong> ${safeEmail}
        </div>
        <p style="margin:0 0 20px;color:#6e6e73;font-size:14px;line-height:1.6;">Po schválení budete mít okamžitý přístup do celé aplikace.</p>
        <div style="text-align:center;">
          <a href="${safeLoginUrl}" style="display:inline-block;padding:15px 32px;background:#E43432;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Přejít na přihlášení</a>
        </div>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `žádost o klub ${input.clubName} čeká na schválení administrátorem.`,
      `ID klubu: ${input.clubId}, sport: ${input.sport}, město: ${input.city}.`,
      `Přihlášení: ${input.loginUrl}`,
    ]),
  }
}

export function buildClubApprovedOwnerEmail(input: {
  fullName: string
  clubName: string
  loginUrl: string
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeLoginUrl = escapeHtml(input.loginUrl)

  return {
    subject: 'Klub byl schválen – TeamPulse',
    html: renderEmailLayout(
      'Klub schválen',
      `Klub ${input.clubName} byl schválen a je aktivní`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Klub byl schválen</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName}, dobrá zpráva - klub <strong style="color:#E43432;">${safeClubName}</strong> byl schválen administrátorem.</p>
        <p style="margin:0 0 24px;color:#4a4a4a;font-size:16px;line-height:1.7;">Nyní se můžeš přihlásit a začít plně používat TeamPulse.</p>
        <div style="text-align:center;">
          <a href="${safeLoginUrl}" style="display:inline-block;padding:15px 32px;background:#E43432;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Přihlásit se</a>
        </div>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `klub ${input.clubName} byl schválen a je aktivní.`,
      `Přihlášení: ${input.loginUrl}`,
    ]),
  }
}

export function buildClubRejectedOwnerEmail(input: {
  fullName: string
  clubName: string
  loginUrl: string
  reason?: string | null
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeLoginUrl = escapeHtml(input.loginUrl)
  const safeReason = input.reason ? escapeHtml(input.reason) : ''

  return {
    subject: 'Žádost o klub byla zamítnuta – TeamPulse',
    html: renderEmailLayout(
      'Žádost zamítnuta',
      `Žádost o klub ${input.clubName} byla zamítnuta`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Žádost nebyla schválena</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName}, žádost o klub <strong style="color:#E43432;">${safeClubName}</strong> byla zamítnuta.</p>
        ${safeReason ? `<div style="margin:0 0 20px;padding:14px 16px;background:#fff4f4;border:1px solid #f4caca;border-radius:10px;color:#7b2020;font-size:14px;line-height:1.6;"><strong>Důvod:</strong><br />${safeReason}</div>` : ''}
        <p style="margin:0 0 20px;color:#4a4a4a;font-size:15px;line-height:1.7;">V rámci zamítnutí byla odstraněna registrace klubu i účet správce. Pokud chceš pokračovat, založ novou registraci.</p>
        <div style="text-align:center;">
          <a href="${safeLoginUrl}" style="display:inline-block;padding:15px 32px;background:#E43432;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Přejít na TeamPulse</a>
        </div>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `žádost o klub ${input.clubName} byla zamítnuta.`,
      input.reason ? `Důvod: ${input.reason}` : undefined,
      'V rámci zamítnutí byla odstraněna registrace klubu i účet správce.',
      `TeamPulse: ${input.loginUrl}`,
    ]),
  }
}

export function buildAccountDeletedByAdminEmail(input: {
  fullName: string
  reason: string
  supportEmail: string
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeReason = escapeHtml(input.reason)
  const safeSupportEmail = escapeHtml(input.supportEmail)

  return {
    subject: 'Váš účet byl smazán administrátorem – TeamPulse',
    html: renderEmailLayout(
      'Účet byl smazán',
      'Administrátor smazal váš účet v TeamPulse',
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Účet byl smazán</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName},</p>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Tvůj účet v TeamPulse byl smazán administrátorem.</p>
        <div style="margin:0 0 20px;padding:14px 16px;background:#fff4f4;border:1px solid #f4caca;border-radius:10px;color:#7b2020;font-size:14px;line-height:1.6;">
          <strong>Důvod smazání:</strong><br />${safeReason}
        </div>
        <p style="margin:0;color:#6e6e73;font-size:14px;line-height:1.6;">V případě nejasností kontaktuj podporu: <a href="mailto:${safeSupportEmail}" style="color:#E43432;text-decoration:none;">${safeSupportEmail}</a>.</p>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      'tvůj účet v TeamPulse byl smazán administrátorem.',
      `Důvod smazání: ${input.reason}`,
      `Podpora: ${input.supportEmail}`,
    ]),
  }
}

export function buildClubDeletedByAdminEmail(input: {
  fullName: string
  clubName: string
  reason?: string | null
  supportEmail: string
}): EmailContent {
  const safeFullName = escapeHtml(input.fullName)
  const safeClubName = escapeHtml(input.clubName)
  const safeReason = input.reason ? escapeHtml(input.reason) : ''
  const safeSupportEmail = escapeHtml(input.supportEmail)

  return {
    subject: 'Klub byl odstranen administratorem - TeamPulse',
    html: renderEmailLayout(
      'Klub byl odstraněn',
      `Klub ${input.clubName} byl odstraněn administrátorem`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Klub byl odstraněn</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Ahoj ${safeFullName},</p>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">klub <strong style="color:#E43432;">${safeClubName}</strong> byl odstraněn administrátorem TeamPulse.</p>
        ${safeReason ? `<div style="margin:0 0 20px;padding:14px 16px;background:#fff4f4;border:1px solid #f4caca;border-radius:10px;color:#7b2020;font-size:14px;line-height:1.6;"><strong>Důvod:</strong><br />${safeReason}</div>` : ''}
        <p style="margin:0;color:#6e6e73;font-size:14px;line-height:1.6;">V případě nejasností kontaktuj podporu: <a href="mailto:${safeSupportEmail}" style="color:#E43432;text-decoration:none;">${safeSupportEmail}</a>.</p>
      `
    ),
    text: joinText([
      `Ahoj ${input.fullName},`,
      `klub ${input.clubName} byl odstraněn administrátorem TeamPulse.`,
      input.reason ? `Důvod: ${input.reason}` : undefined,
      `Podpora: ${input.supportEmail}`,
    ]),
  }
}

export function buildClubCreatedClubEmail(input: {
  clubName: string
  managerName: string
  managerEmail: string
  website: string
}): EmailContent {
  const safeClubName = escapeHtml(input.clubName)
  const safeManagerName = escapeHtml(input.managerName)
  const safeManagerEmail = escapeHtml(input.managerEmail)
  const safeWebsite = escapeHtml(input.website)

  return {
    subject: 'Nový klub byl zaregistrován – TeamPulse',
    html: renderEmailLayout(
      'Registrace klubu',
      `Klub ${input.clubName} byl zaregistrován`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Registrace klubu</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Váš klub <strong style="color:#E43432;">${safeClubName}</strong> byl zaregistrován v systému TeamPulse.</p>
        <div style="margin:0;padding:18px 20px;background:#f5f5f7;border-radius:10px;color:#1d1d1f;font-size:14px;line-height:1.7;">
          <strong>Správce:</strong> ${safeManagerName}<br />
          <strong>Kontakt:</strong> ${safeManagerEmail}<br />
          <strong>Web:</strong> ${safeWebsite}
        </div>
      `
    ),
    text: joinText([
      `Klub ${input.clubName} byl zaregistrován v TeamPulse.`,
      `Správce: ${input.managerName}`,
      `Kontakt: ${input.managerEmail}`,
      `Web: ${input.website}`,
    ]),
  }
}

export function buildManagerNewMemberEmail(input: {
  managerFirstName: string
  clubName: string
  memberName: string
  memberEmail: string
  memberPhone?: string | null
  role: string
  membersUrl: string
}): EmailContent {
  const safeManagerFirstName = escapeHtml(input.managerFirstName)
  const safeClubName = escapeHtml(input.clubName)
  const safeMemberName = escapeHtml(input.memberName)
  const safeMemberEmail = escapeHtml(input.memberEmail)
  const safeMemberPhone = escapeHtml(input.memberPhone || 'Neuvedeno')
  const safeRole = escapeHtml(input.role)
  const safeMembersUrl = escapeHtml(input.membersUrl)

  return {
    subject: `Nový člen v klubu ${input.clubName} – TeamPulse`,
    html: renderEmailLayout(
      'Nový člen v klubu',
      `${input.memberName} se připojil(a) do klubu ${input.clubName}`,
      `
        <h2 style="margin:0 0 16px;font-size:24px;color:#1d1d1f;">Nový člen v klubu</h2>
        <p style="margin:0 0 16px;color:#4a4a4a;font-size:16px;line-height:1.7;">Dobrý den ${safeManagerFirstName},</p>
        <div style="margin:0 0 24px;padding:18px 22px;background:#dcfce7;border-left:4px solid #22c55e;border-radius:10px;color:#166534;font-size:16px;line-height:1.7;">
          <strong>${safeMemberName}</strong> se právě připojil(a) do klubu <strong>${safeClubName}</strong> jako <strong>${safeRole}</strong>.
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-collapse:collapse;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Email:</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#1d1d1f;">${safeMemberEmail}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#666;">Telefon:</td><td style="padding:8px 0;border-bottom:1px solid #eee;color:#1d1d1f;">${safeMemberPhone}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Role:</td><td style="padding:8px 0;color:#1d1d1f;">${safeRole}</td></tr>
        </table>
        <div style="text-align:center;">
          <a href="${safeMembersUrl}" style="display:inline-block;padding:15px 32px;background:linear-gradient(135deg,#E43432 0%,#c72826 100%);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:16px;">Zobrazit členy klubu</a>
        </div>
      `
    ),
    text: joinText([
      `Dobrý den ${input.managerFirstName},`,
      `${input.memberName} se připojil(a) do klubu ${input.clubName} jako ${input.role}.`,
      `Email: ${input.memberEmail}`,
      `Telefon: ${input.memberPhone || 'Neuvedeno'}`,
      `Členové klubu: ${input.membersUrl}`,
    ]),
  }
}
