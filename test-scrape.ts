import puppeteer from 'puppeteer'
import { extractSnowReport } from './src/lib/claude'

async function testScrape(url: string, resortName: string) {
  let browser = null
  try {
    console.log(`Testing ${resortName}: ${url}`)
    console.log('Launching browser...')

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1920, height: 1080 })

    console.log('Navigating to page...')
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    await new Promise(resolve => setTimeout(resolve, 5000))

    const html = await page.content()

    console.log(`\n✓ Fetched ${html.length} characters of HTML`)
    console.log('\n--- First 2000 characters of HTML: ---')
    console.log(html.substring(0, 2000))
    console.log('\n--- Searching for snow-related keywords: ---')

    const keywords = ['snow', 'base', 'lift', 'fresh', 'powder', 'condition', 'inch', '"']
    keywords.forEach(keyword => {
      const matches = (html.match(new RegExp(keyword, 'gi')) || []).length
      console.log(`  "${keyword}": ${matches} matches`)
    })

    console.log('\n--- Attempting Claude extraction: ---')
    const data = await extractSnowReport(html, resortName)
    console.log('Extracted data:', JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Test Snowbasin
testScrape('https://www.snowbasin.com/the-mountain/mountain-report/', 'Snowbasin')
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
