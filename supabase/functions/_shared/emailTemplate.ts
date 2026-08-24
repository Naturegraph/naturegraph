// _shared/emailTemplate : coquille HTML commune aux emails NG-045
// ─────────────────────────────────────────────────────────────────────────────
// Reprend exactement le style des templates Auth existants (cf.
// supabase/email-templates/confirm-signup.html) : fond crème #fffaf0, carte
// blanche radius 20px, header violet #5f5dd8 avec hermine, Quicksand pour les
// titres. Un seul point de maintenance pour le header/footer/désabonnement :
// chaque email NG-045 ne fournit que son contenu central (heroTitle, bodyHtml,
// CTA optionnel).
//
// Désabonnement : lien obligatoire dans CHAQUE email automatique (RGPD/Loi 25,
// cf. brief NG-045). Toujours fourni par l'appelant (unsubscribeUrl), jamais
// optionnel dans la signature de buildEmailShell.

export interface EmailShellParams {
  /** <title> HTML, invisible dans le corps de l'email. */
  pageTitle: string
  /** Titre principal affiché sous le header (Quicksand, gras). */
  heroTitle: string
  /** Corps de l'email : HTML déjà construit par l'appelant (paragraphes, listes, cartes). */
  bodyHtml: string
  /** Bouton d'action principal, optionnel (tous les emails n'ont pas de CTA unique). */
  cta?: { label: string; url: string }
  /** Lien de désabonnement (obligatoire) : mène à email-unsubscribe avec token signé. */
  unsubscribeUrl: string
}

/**
 * Bouton CTA email-safe : <a> stylé en bloc, tolère bien Gmail/Outlook/Apple Mail.
 *
 * `white-space:nowrap` garantit que le libellé reste sur UNE seule ligne : un
 * bouton dont le texte passe à la ligne (ex. un label long sur mobile) casse la
 * pilule et fait mauvais effet. La cellule garde une marge laterale reduite
 * (24px) pour laisser de la place au libellé sur les petits ecrans.
 */
function ctaButtonHtml(cta: { label: string; url: string } | undefined): string {
  if (!cta) return ''
  return `
      <tr>
        <td align="center" style="padding:8px 24px 32px 24px;">
          <a href="${cta.url}" style="display:inline-block;background-color:#5f5dd8;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:999px;white-space:nowrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            ${cta.label}
          </a>
        </td>
      </tr>`
}

export function buildEmailShell(params: EmailShellParams): string {
  const { pageTitle, heroTitle, bodyHtml, cta, unsubscribeUrl } = params

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${pageTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#fffaf0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#13131a;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#fffaf0;padding:40px 20px;">
    <tr>
      <td align="center">

        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(60,67,128,0.08);">

          <!-- Brand header -->
          <tr>
            <td align="center" style="padding:36px 40px 28px 40px;background-color:#5f5dd8;">
              <img src="https://raw.githubusercontent.com/Naturegraph/naturegraph/main/public/hermine-icon.png" alt="" width="56" height="56" style="display:block;margin:0 auto 12px auto;border:0;outline:none;text-decoration:none;border-radius:50%;background-color:#ffffff;padding:4px;">
              <div style="font-size:28px;font-weight:700;letter-spacing:-0.5px;color:#ffffff;font-family:'Quicksand',-apple-system,sans-serif;">
                Naturegraph
              </div>
              <div style="font-size:13px;color:#ced3f0;margin-top:6px;letter-spacing:0.3px;font-style:italic;">
                Partageons nos émotions
              </div>
            </td>
          </tr>

          <!-- Hero + corps -->
          <tr>
            <td style="padding:40px 48px 8px 48px;">
              <h1 style="margin:0 0 20px 0;font-size:20px;font-weight:700;color:#13131a;font-family:'Quicksand',-apple-system,sans-serif;line-height:1.3;text-align:left;">
                ${heroTitle}
              </h1>
              <div style="font-size:15px;line-height:1.6;color:#4a4869;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
${ctaButtonHtml(cta)}

          <!-- Footer : support + désabonnement obligatoire -->
          <tr>
            <td style="padding:24px 48px;background-color:#f3f4fb;border-top:1px solid #e7e9f7;" align="center">
              <p style="margin:0 0 8px 0;font-size:12px;color:#4a4869;">
                Besoin d'aide ? Contacte-nous à
                <a href="mailto:support@naturegraph.ca" style="color:#5f5dd8;text-decoration:none;font-weight:600;">support@naturegraph.ca</a>
              </p>
              <p style="margin:0 0 8px 0;font-size:11px;color:#6b6981;">
                © 2026 Naturegraph · Partageons nos émotions
              </p>
              <p style="margin:0;font-size:11px;color:#6b6981;">
                <a href="${unsubscribeUrl}" style="color:#6b6981;text-decoration:underline;">Ne plus recevoir ce type d'email</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`
}
