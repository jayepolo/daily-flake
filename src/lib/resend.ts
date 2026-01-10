import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendSnowReportEmailParams {
  to: string
  resortName: string
  reportSummary: string
  reportData?: {
    newSnowfall?: number
    baseDepth?: number
    liftsOpen?: string
    conditions?: string
  }
}

export async function sendSnowReportEmail({
  to,
  resortName,
  reportSummary,
  reportData,
}: SendSnowReportEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'The Daily Flake <updates@dailyflake.com>',
      to: [to],
      subject: `${resortName} Snow Report - ${new Date().toLocaleDateString()}`,
      html: generateEmailHTML(resortName, reportSummary, reportData),
      text: generateEmailText(resortName, reportSummary, reportData),
    })

    if (error) {
      console.error('[Resend] Error sending email:', error)
      throw error
    }

    console.log('[Resend] Email sent successfully:', data?.id)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('[Resend] Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function generateEmailHTML(
  resortName: string,
  reportSummary: string,
  reportData?: {
    newSnowfall?: number
    baseDepth?: number
    liftsOpen?: string
    conditions?: string
  }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resortName} Snow Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">❄️ ${resortName}</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Daily Snow Report</p>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; font-weight: bold; color: #667eea; margin-top: 0;">Today's Conditions</p>

    ${
      reportData
        ? `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      ${reportData.newSnowfall !== undefined ? `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; font-weight: 600;">New Snow (24hr)</td><td style="text-align: right; font-size: 20px; color: #667eea;">${reportData.newSnowfall}"</td></tr>` : ''}
      ${reportData.baseDepth !== undefined ? `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; font-weight: 600;">Base Depth</td><td style="text-align: right; font-size: 20px; color: #667eea;">${reportData.baseDepth}"</td></tr>` : ''}
      ${reportData.liftsOpen ? `<tr style="border-bottom: 1px solid #f0f0f0;"><td style="padding: 12px 0; font-weight: 600;">Lifts Open</td><td style="text-align: right; font-size: 18px;">${reportData.liftsOpen}</td></tr>` : ''}
      ${reportData.conditions ? `<tr><td style="padding: 12px 0; font-weight: 600;">Conditions</td><td style="text-align: right; font-size: 18px; text-transform: capitalize;">${reportData.conditions}</td></tr>` : ''}
    </table>
    `
        : `<p style="font-size: 16px; color: #666; margin: 20px 0;">${reportSummary}</p>`
    }

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999; font-size: 14px;">
      <p style="margin: 5px 0;">Stay updated with daily snow reports</p>
      <p style="margin: 5px 0;">
        <a href="https://dailyflake.com/dashboard" style="color: #667eea; text-decoration: none;">Manage Subscriptions</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

function generateEmailText(
  resortName: string,
  reportSummary: string,
  reportData?: {
    newSnowfall?: number
    baseDepth?: number
    liftsOpen?: string
    conditions?: string
  }
): string {
  let text = `${resortName} - Daily Snow Report\n\n`

  if (reportData) {
    text += "Today's Conditions:\n\n"
    if (reportData.newSnowfall !== undefined)
      text += `New Snow (24hr): ${reportData.newSnowfall}"\n`
    if (reportData.baseDepth !== undefined)
      text += `Base Depth: ${reportData.baseDepth}"\n`
    if (reportData.liftsOpen) text += `Lifts Open: ${reportData.liftsOpen}\n`
    if (reportData.conditions) text += `Conditions: ${reportData.conditions}\n`
  } else {
    text += `${reportSummary}\n`
  }

  text += `\n---\nManage your subscriptions: https://dailyflake.com/dashboard`

  return text
}
