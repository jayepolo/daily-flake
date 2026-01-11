import puppeteer from 'puppeteer'

async function searchHTML(url: string) {
  let browser = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 5000))

    const html = await page.content()

    console.log('Searching for snow data patterns...\n')

    // Look for numbers followed by inch/inches/"
    const patterns = [
      /(\d+)\s*(?:inch|inches|")/gi,
      /(\d+)\s*\/\s*(\d+)\s*lifts?/gi,
      /base[^<]*?(\d+)/gi,
      /overnight[^<]*?(\d+)/gi,
      /24\s*(?:hr|hour)[^<]*?(\d+)/gi,
    ]

    patterns.forEach((pattern, i) => {
      const matches = html.match(pattern)
      if (matches) {
        console.log(`Pattern ${i + 1}: ${pattern}`)
        console.log('Matches:', matches.slice(0, 10))
        console.log()
      }
    })

    // Look for specific sections
    const sections = html.match(/<[^>]*mountain[^>]*report[^>]*>[\s\S]{0,500}/gi)
    if (sections) {
      console.log('\n=== Sections mentioning "mountain" and "report": ===')
      sections.slice(0, 3).forEach((s, i) => {
        console.log(`\nSection ${i + 1}:`, s.substring(0, 400))
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (browser) await browser.close()
  }
}

searchHTML('https://www.snowbasin.com/the-mountain/mountain-report/')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
