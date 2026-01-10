import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function extractSnowReport(html: string, resortName: string) {
  if (!client) {
    throw new Error('Claude API key not configured')
  }

  const prompt = `Extract snow report data from this ski resort webpage and return ONLY valid JSON with no markdown formatting.

Required fields:
- newSnowfall: number (inches in last 24h, or 0 if none)
- baseDepth: number (total base in inches, or 0 if unknown)
- liftsOpen: string (format "X/Y" or "all" or "unknown")
- conditions: string (one word: excellent/good/fair/poor)

If any data is unavailable, use 0 for numbers or "unknown" for strings.

Webpage HTML:
${html.substring(0, 50000)}

Return ONLY the JSON object, no explanation or markdown.`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Claude extraction error:', error)
    throw error
  }
}

export async function generateSMSSummary(reportData: any, resortName: string): Promise<string> {
  if (!client) {
    throw new Error('Claude API key not configured')
  }

  const prompt = `Create a concise SMS message under 150 characters for this snow report.

Resort: ${resortName}
Data: ${JSON.stringify(reportData)}

Format: "{newSnow}" fresh, {base}" base, {lifts} lifts, {conditions}"
Example: "8" fresh, 45" base, 12/15 lifts, excellent"

Return ONLY the message text, nothing else.`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    return content.text.trim()
  } catch (error) {
    console.error('Claude summary error:', error)
    throw error
  }
}
