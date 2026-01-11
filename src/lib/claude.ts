import Anthropic from '@anthropic-ai/sdk'

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

export async function extractSnowReport(html: string, resortName: string) {
  if (!client) {
    throw new Error('Claude API key not configured')
  }

  const prompt = `You are extracting snow report data from ${resortName} ski resort's webpage.

Look for these data points anywhere in the HTML:

1. NEW SNOWFALL (24 hours): Look for phrases like:
   - "overnight snow", "last 24 hours", "24hr snow", "new snow", "fresh snow"
   - Numbers followed by " or inches near these terms
   - If you see "0" or "trace" or nothing, use 0

2. BASE DEPTH: Look for phrases like:
   - "base depth", "snow base", "mid mountain base", "base"
   - Usually a larger number (30-100+) followed by " or inches
   - If unavailable, use 0

3. LIFTS OPEN: Look for phrases like:
   - "lifts open", "X of Y lifts", "X/Y lifts", "lift status"
   - Format as "X/Y" (e.g., "10/15")
   - If you can't find exact numbers, use "unknown"

4. CONDITIONS: Look for overall condition descriptions:
   - Words like "powder", "packed powder", "groomed", "icy", "spring conditions"
   - Rate as: "excellent" (powder/fresh), "good" (groomed/packed), "fair" (variable), "poor" (icy/bare)
   - If unavailable, use "unknown"

IMPORTANT: Be aggressive in finding data. Look through the ENTIRE HTML. Numbers near snow-related keywords are likely the data we need.

Return ONLY this JSON format (no markdown, no explanation):
{"newSnowfall": number, "baseDepth": number, "liftsOpen": "string", "conditions": "string"}

Webpage HTML:
${html.substring(0, 100000)}

JSON:`

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1000,
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
