const PROMPT = `Analiza este pantallazo de Interactive Brokers y extrae los datos de la operación con opciones.

Devuelve SOLO JSON válido sin backticks:
{
  "tipo": "APERTURA" o "CIERRE",
  "estrategia": "VPUT" | "VCALL" | "CPUT" | "CCALL" | "COMBO",
  "ticker": "",
  "fecha": "YYYY-MM-DD",
  "vencimiento": "YYYY-MM-DD",
  "strike": 0,
  "prima": 0,
  "precio_cierre": 0,
  "beneficio": 0,
  "notas": ""
}

Reglas:
- Si es apertura (apertura de posición): rellena ticker, fecha, vencimiento, strike, prima. precio_cierre y beneficio = 0.
- Si es cierre (cierre de posición): rellena ticker, fecha, vencimiento, strike, precio_cierre y beneficio. prima puede estar vacía.
- estrategia: VPUT=venta put, VCALL=venta call, CPUT=compra put, CCALL=compra call
- prima y precio_cierre son el precio por acción (no multiplicado por 100)
- Si no ves claramente algún campo, déjalo en 0 o vacío`

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada' })

  try {
    const { image } = req.body
    if (!image) return res.status(400).json({ error: 'Se necesita una imagen' })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 1000,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text: PROMPT }
        ]}]
      })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const raw = data.content?.[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No se encontró JSON')
    res.status(200).json({ ok: true, result: JSON.parse(match[0]) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
