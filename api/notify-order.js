import { Buffer } from 'node:buffer'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const ORDER_PHOTOS_BUCKET = 'order-photos'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value || '').trim()
  )
}

function measurementLabel(key) {
  return {
    leftThumb: 'Pouce main gauche',
    leftHand: 'Main gauche entière',
    rightThumb: 'Pouce main droite',
    rightHand: 'Main droite entière'
  }[key] || key
}

function shapeLabel(shape) {
  const id = Number(shape)

  if (!id) return '-'

  if (id === 11) {
    return '11 — Ongle court, forme naturelle'
  }

  return `${id} — Modèle ${id}`
}

function shippingHtml(order) {
  const shipping = order.shipping || {}

  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;vertical-align:top;">
        Nom
      </td>
      <td style="padding:6px 0;">
        ${escapeHtml(shipping.name || '-')}
      </td>
    </tr>

    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;vertical-align:top;">
        Adresse
      </td>
      <td style="padding:6px 0;">
        ${escapeHtml(shipping.address || '-')}
        ${
          shipping.address2
            ? `<br>${escapeHtml(shipping.address2)}`
            : ''
        }
        <br>
        ${escapeHtml(shipping.postalCode || '')}
        ${' '}
        ${escapeHtml(shipping.city || '')}
        <br>
        ${escapeHtml(shipping.country || '')}
      </td>
    </tr>
  `
}

function orderDetailsHtml(order) {
  if (order.type === 'custom') {
    return `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#777;">
          Couleurs
        </td>
        <td>${escapeHtml(order.colors || '-')}</td>
      </tr>

      <tr>
        <td style="padding:6px 12px 6px 0;color:#777;">
          Chrome
        </td>
        <td>${escapeHtml(order.chrome || '-')}</td>
      </tr>

      <tr>
        <td style="padding:6px 12px 6px 0;color:#777;">
          Bijoux
        </td>
        <td>${escapeHtml(order.jewelry || '-')}</td>
      </tr>

      <tr>
        <td style="padding:6px 12px 6px 0;color:#777;">
          Relief
        </td>
        <td>${escapeHtml(order.relief || '-')}</td>
      </tr>

      <tr>
        <td style="padding:6px 12px 6px 0;color:#777;">
          Description
        </td>
        <td>${escapeHtml(order.desc || '-')}</td>
      </tr>
    `
  }

  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Design
      </td>
      <td>${escapeHtml(order.designName || '-')}</td>
    </tr>

    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Prix
      </td>
      <td>${escapeHtml(order.designPrice ?? '-')} €</td>
    </tr>

    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Modifications souhaitées
      </td>
      <td>${escapeHtml(order.modifications || '-')}</td>
    </tr>
  `
}

function simpleSetHtml(order) {
  if (!order.simpleSet) return ''

  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Set simple
      </td>
      <td>
        Oui — +${escapeHtml(order.simpleSetSurcharge || 10)} €
      </td>
    </tr>

    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Couleur du Set simple
      </td>
      <td>
        ${escapeHtml(order.simpleSetColor || '-')}
      </td>
    </tr>

    <tr>
      <td style="padding:6px 12px 6px 0;color:#777;">
        Style du Set simple
      </td>
      <td>
        ${escapeHtml(order.simpleSetStyle || '-')}
      </td>
    </tr>

    ${
      order.type === 'design'
        ? `
          <tr>
            <td style="padding:6px 12px 6px 0;color:#777;">
              Montant total
            </td>
            <td>
              <strong>
                ${escapeHtml(
                  order.totalPrice ??
                  (
                    Number(order.designPrice || 0) +
                    Number(order.simpleSetSurcharge || 10)
                  )
                )} €
              </strong>
            </td>
          </tr>
        `
        : `
          <tr>
            <td style="padding:6px 12px 6px 0;color:#777;">
              Supplément au montant final
            </td>
            <td>
              <strong>+10 €</strong>
            </td>
          </tr>
        `
    }
  `
}

function collectPhotoEntries(order) {
  const photos = []

  for (const [key, path] of Object.entries(order.measurements || {})) {
    if (
      typeof path === 'string' &&
      !path.startsWith('data:')
    ) {
      photos.push({
        path,
        name: `${measurementLabel(key)}.jpg`
      })
    }
  }

  for (
    let index = 0;
    index < (order.inspirations || []).length;
    index += 1
  ) {
    const path = order.inspirations[index]

    if (
      typeof path === 'string' &&
      !path.startsWith('data:')
    ) {
      photos.push({
        path,
        name: `Inspiration ${String(index + 1).padStart(2, '0')}.jpg`
      })
    }
  }

  return photos
}

async function buildAttachments(supabase, order) {
  const attachments = []

  for (const photo of collectPhotoEntries(order)) {
    const { data, error } = await supabase.storage
      .from(ORDER_PHOTOS_BUCKET)
      .download(photo.path)

    if (error) {
      console.error(
        'Attachment download failed:',
        photo.path,
        error
      )
      continue
    }

    attachments.push({
      content: Buffer.from(
        await data.arrayBuffer()
      ).toString('base64'),
      name: photo.name
    })
  }

  return attachments
}

async function sendBrevoEmail({
  apiKey,
  sender,
  to,
  subject,
  htmlContent,
  attachments = []
}) {
  const payload = {
    sender: {
      name: 'Annette Bakeur',
      email: sender
    },
    to: [
      {
        email: to
      }
    ],
    subject,
    htmlContent
  }

  if (attachments.length > 0) {
    payload.attachment = attachments
  }

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  )

  const responseBody = await response.text()

  if (!response.ok) {
    throw new Error(
      `Brevo ${response.status}: ${responseBody}`
    )
  }

  return responseBody
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res
      .status(405)
      .json({ error: 'Method not allowed' })
  }

  const orderId = req.body?.orderId

  if (!orderId) {
    return res
      .status(400)
      .json({ error: 'orderId is required' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY
  const brevoApiKey = process.env.BREVO_API_KEY
  const recipient =
    process.env.ORDER_NOTIFICATION_EMAIL
  const sender = process.env.ORDER_FROM_EMAIL
  const bankIban =
    process.env.ORDER_BANK_IBAN || ''
  const siteUrl =
    process.env.SITE_URL ||
    'https://annettebakeur.vercel.app'

  if (
    !supabaseUrl ||
    !serviceRoleKey ||
    !brevoApiKey ||
    !recipient ||
    !sender
  ) {
    return res.status(500).json({
      error: 'Missing server environment variables'
    })
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  )

  const { data: row, error: orderError } =
    await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

  if (orderError || !row) {
    console.error(
      'Order lookup failed:',
      orderError
    )

    return res
      .status(404)
      .json({ error: 'Order not found' })
  }

  const order = row.data || {}

  const attachments = await buildAttachments(
    supabase,
    order
  )

  const clientEmail = String(
    order.email ||
      (
        String(order.contact || '').includes('@')
          ? order.contact
          : ''
      )
  ).trim()

  const typeLabel =
    order.type === 'design'
      ? `Design existant — ${order.designName || ''}`
      : 'Commande personnalisée'

  const details = orderDetailsHtml(order)

  const adminHtml = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#171717">

      <h1 style="margin-bottom:4px;">
        Nouvelle commande Annette Bakeur
      </h1>

      <p style="margin-top:0;color:#666;">
        Commande #${escapeHtml(orderId)}
      </p>

      <table style="width:100%;border-collapse:collapse;margin:24px 0;">
        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Type
          </td>
          <td>${escapeHtml(typeLabel)}</td>
        </tr>

        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Email
          </td>
          <td>${escapeHtml(clientEmail || '-')}</td>
        </tr>

        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Instagram
          </td>
          <td>${escapeHtml(order.instagram || '-')}</td>
        </tr>

        ${shippingHtml(order)}

        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Forme / longueur
          </td>
          <td>
            ${escapeHtml(shapeLabel(order.shape))}
          </td>
        </tr>

        ${details}
        ${simpleSetHtml(order)}
      </table>

      <p>
        Photos jointes : ${attachments.length}
      </p>

      <p style="margin-top:24px;">
        <a
          href="${escapeHtml(siteUrl)}"
          style="
            display:inline-block;
            background:#f21b1b;
            color:white;
            text-decoration:none;
            padding:12px 18px;
          "
        >
          Ouvrir le site / espace admin
        </a>
      </p>

    </div>
  `

  const paymentHtml = bankIban
    ? `
      <div
        style="
          margin-top:28px;
          padding:20px;
          background:#f3f0e8;
          color:#111;
        "
      >
        <h2 style="margin-top:0;">
          Paiement par virement
        </h2>

        ${
          order.type === 'design'
            ? `
              <p>
                Montant :
                <strong>
                  ${escapeHtml(
  order.totalPrice ??
  (
    Number(order.designPrice || 0) +
    (order.simpleSet ? Number(order.simpleSetSurcharge || 10) : 0)
  )
)} €
                </strong>
              </p>
            `
            : `
              <p>
                Pour une commande personnalisée,
                attendez la validation du montant final
                avant d'effectuer le virement.
              </p>
            `
        }

        <p>
          <strong>IBAN :</strong><br>
          ${escapeHtml(bankIban)}
        </p>

        <p>
          Merci d'indiquer
          <strong>#${escapeHtml(orderId)}</strong>
          dans le libellé du virement.
        </p>
      </div>
    `
    : ''

  const clientHtml = `
    <div
      style="
        font-family:Arial,sans-serif;
        max-width:680px;
        margin:auto;
        color:#171717;
      "
    >
      <p
        style="
          font-size:12px;
          letter-spacing:.18em;
          font-weight:bold;
          color:#777;
        "
      >
        ANNETTE BAKEUR
      </p>

      <h1
        style="
          font-size:36px;
          line-height:1;
          margin-bottom:10px;
          color:#f21b1b;
        "
      >
        COMMANDE REÇUE !
      </h1>

      <p>
        Merci pour votre commande.
        Voici votre récapitulatif.
      </p>

      <p>
        Numéro de commande :
        <strong>#${escapeHtml(orderId)}</strong>
      </p>

      <table
        style="
          width:100%;
          border-collapse:collapse;
          margin:26px 0;
        "
      >
        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Type
          </td>
          <td>${escapeHtml(typeLabel)}</td>
        </tr>

        <tr>
          <td style="padding:6px 12px 6px 0;color:#777;">
            Forme / longueur
          </td>
          <td>
            ${escapeHtml(shapeLabel(order.shape))}
          </td>
        </tr>

        ${details}
        ${simpleSetHtml(order)}

        ${shippingHtml(order)}
      </table>

      ${paymentHtml}

      ${
        order.type === 'custom'
          ? `
            <p style="margin-top:28px;">
              Je reviendrai vers vous pour valider
              les détails et le montant final de
              votre commande personnalisée.
            </p>
          `
          : `
            <p style="margin-top:28px;">
              Je reviendrai vers vous si j'ai besoin
              d'une précision concernant votre commande.
            </p>
          `
      }

      <p style="margin-top:28px;">
        À bientôt,<br>
        <strong>Annette Bakeur</strong>
      </p>
    </div>
  `

  const sends = [
    sendBrevoEmail({
      apiKey: brevoApiKey,
      sender,
      to: recipient,
      subject:
        `Nouvelle commande Annette Bakeur — #${orderId}`,
      htmlContent: adminHtml,
      attachments
    })
  ]

  if (isValidEmail(clientEmail)) {
    sends.push(
      sendBrevoEmail({
        apiKey: brevoApiKey,
        sender,
        to: clientEmail,
        subject:
          `Confirmation de votre commande Annette Bakeur — #${orderId}`,
        htmlContent: clientHtml
      })
    )
  }

  const results =
    await Promise.allSettled(sends)

  const failures = results
    .filter(
      result =>
        result.status === 'rejected'
    )
    .map(
      result =>
        result.reason?.message ||
        'Unknown email error'
    )

  if (failures.length > 0) {
    console.error(
      'Email sending failed:',
      failures
    )

    return res.status(502).json({
      error: 'One or more emails failed',
      details: failures
    })
  }

  return res.status(200).json({
    ok: true,
    adminEmailSent: true,
    clientEmailSent:
      isValidEmail(clientEmail)
  })
}