import twilio from 'twilio'

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn('Twilio credentials not configured')
}

export const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

export const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''
export const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID || ''

/**
 * Send verification code using Twilio Verify Service
 * This bypasses A2P 10DLC registration requirements
 */
export async function sendVerificationCode(to: string) {
  if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
    console.error('[Twilio Verify] Not configured')
    return { success: false, error: 'Twilio Verify not configured' }
  }

  console.log(`[Twilio Verify] Sending verification code to ${to}`)

  try {
    const verification = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to, channel: 'sms' })

    console.log(`[Twilio Verify] SUCCESS! Status: ${verification.status}, SID: ${verification.sid}`)
    return { success: true, status: verification.status }
  } catch (error: any) {
    console.error('[Twilio Verify] ERROR:', error)
    console.error('[Twilio Verify] Error code:', error.code)
    console.error('[Twilio Verify] Error message:', error.message)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Verify code using Twilio Verify Service
 */
export async function verifyCode(to: string, code: string) {
  if (!twilioClient || !TWILIO_VERIFY_SERVICE_SID) {
    console.error('[Twilio Verify] Not configured')
    return { success: false, error: 'Twilio Verify not configured' }
  }

  console.log(`[Twilio Verify] Verifying code for ${to}`)

  try {
    const verificationCheck = await twilioClient.verify.v2
      .services(TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to, code })

    console.log(`[Twilio Verify] Verification status: ${verificationCheck.status}`)

    if (verificationCheck.status === 'approved') {
      return { success: true, status: verificationCheck.status }
    } else {
      return { success: false, error: 'Invalid or expired code' }
    }
  } catch (error: any) {
    console.error('[Twilio Verify] ERROR:', error)
    console.error('[Twilio Verify] Error code:', error.code)
    console.error('[Twilio Verify] Error message:', error.message)
    return { success: false, error: error.message || String(error) }
  }
}

/**
 * Send SMS using Twilio Messages API
 * Use this for daily snow reports, NOT for verification codes
 */
export async function sendSMS(to: string, body: string) {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.error('[Twilio] Not configured')
    return { success: false, error: 'Twilio not configured' }
  }

  console.log(`[Twilio] Attempting to send SMS to ${to} from ${TWILIO_PHONE_NUMBER}`)
  console.log(`[Twilio] Message: ${body}`)

  try {
    const message = await twilioClient.messages.create({
      body,
      from: TWILIO_PHONE_NUMBER,
      to,
    })
    console.log(`[Twilio] SUCCESS! Message SID: ${message.sid}, Status: ${message.status}`)
    return { success: true, sid: message.sid }
  } catch (error: any) {
    console.error('[Twilio] ERROR:', error)
    console.error('[Twilio] Error code:', error.code)
    console.error('[Twilio] Error message:', error.message)
    console.error('[Twilio] More info:', error.moreInfo)
    return { success: false, error: error.message || String(error) }
  }
}
