import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Facebook Data Deletion Callback endpoint.
 *
 * GET  /data-deletion  → served by the React SPA (DataDeletionPage component)
 * POST /data-deletion  → this function, returns JSON confirmation per Facebook spec
 *
 * Facebook sends a signed_request parameter in the POST body.
 * We generate a unique confirmation code and return the status URL.
 *
 * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Generate a short unique confirmation code
  const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase()
  const confirmationCode = `DEL-${randomPart}`

  const statusUrl = `https://emlekkonyv.com/data-deletion?code=${confirmationCode}`

  res.status(200).json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  })
}
