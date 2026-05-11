import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/report-problem
 * Sends a user problem report via Resend to the admin email.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { message, userEmail, userName } = req.body

  if (!message?.trim()) {
    res.status(400).json({ error: 'Üzenet megadása kötelező' })
    return
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) {
    res.status(500).json({ error: 'Email szolgáltatás nincs konfigurálva' })
    return
  }

  const safeMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeEmail = String(userEmail || 'ismeretlen').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeName = String(userName || 'Ismeretlen').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Emlékkönyv <info@emlekkonyv.com>',
      to: ['szbudahazy@arworks.com'],
      subject: `[Emlékkönyv] Hibajelentés — ${safeName}`,
      html: `
        <h2 style="font-family:sans-serif">Új hibajelentés</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Felhasználó:</td><td><strong>${safeName}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Email:</td><td>${safeEmail}</td></tr>
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #eee"/>
        <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${safeMessage}</p>
      `,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error('[report-problem] Resend error:', errorData)
    res.status(500).json({ error: 'Nem sikerült elküldeni az emailt' })
    return
  }

  res.status(200).json({ success: true })
}
