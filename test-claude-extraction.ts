import 'dotenv/config'
import puppeteer from 'puppeteer'
import { extractSnowReport } from './src/lib/claude'

async function testClaudeExtraction(url: string, resortName: string) {
  let browser = null
  try {
    console.log(`Testing Claude extraction for ${resortName}`)
    console.log(`URL: ${url}\n`)

    // Step 1: Fetch page text with Puppeteer
    console.log('Step 1: Launching Puppeteer...')
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 5000))

    const pageText = await page.evaluate(() => document.body.innerText)
    console.log(`✓ Fetched ${pageText.length} characters of page text\n`)

    console.log('First 1000 characters of page text:')
    console.log('---')
    console.log(pageText.substring(0, 1000))
    console.log('---\n')

    // Step 2: Extract with Claude
    console.log('Step 2: Extracting data with Claude AI...')
    const data = await extractSnowReport(pageText, resortName)

    console.log('\n✓ Extraction complete!\n')
    console.log('Extracted data:')
    console.log(JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (browser) await browser.close()
  }
}

testClaudeExtraction('https://www.snowbasin.com/the-mountain/mountain-report/', 'Snowbasin')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
