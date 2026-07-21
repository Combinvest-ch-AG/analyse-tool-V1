# Combinvest E-Mail-Templates (Supabase + Resend)

Gestylte Templates im Combinvest-Branding, abgestimmt auf unseren Login-Flow
(Magic Link **und** 6-stelliger Code in derselben Mail).

## Einfügen in Supabase

Dashboard → **Authentication → Emails**. Für jede Vorlage den HTML-Inhalt der
passenden Datei in das jeweilige Template kopieren:

| Datei                 | Supabase-Template   | `type` im Link |
| --------------------- | ------------------- | -------------- |
| `invite.html`         | Invite user         | `invite`       |
| `magic-link.html`     | Magic Link          | `magiclink`    |
| `confirm-signup.html` | Confirm signup      | `signup`       |

## Wie der Link funktioniert

Alle Buttons zeigen auf unsere Verify-Route:

```
{{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=<typ>&next=/dashboard
```

Die Route (`app/auth/verify/route.ts`) ruft `verifyOtp({ token_hash, type })`
auf, prüft das aktive Berater-Profil und leitet nach `/dashboard` weiter.
`{{ .Token }}` ist der 6-stellige Code für die Eingabe auf `/login/verify`.

## Wichtige Einstellungen

- **Site URL / Redirect URLs**: Unter *Authentication → URL Configuration* die
  Produktions-Domain als Site URL setzen und Preview-/Local-URLs als
  *Redirect URLs* erlauben, sonst weist Supabase die Weiterleitung ab.
- **SMTP (Resend)**: Unter *Authentication → Emails → SMTP Settings* Resend als
  Absender hinterlegen (bereits erledigt). `RESEND_API_KEY` ist als Projekt-Env
  gesetzt.
- **`{{ .Token }}`** wird nur gerendert, wenn die Vorlage OTP-basiert ist
  (Magic Link, Invite, Confirm) — für unseren Code-Login passend.
