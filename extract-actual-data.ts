import puppeteer from 'puppeteer'

async function extractActualData(url: string) {
  let browser = null
  try {
    console.log(`Fetching ${url}...\n`)

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(resolve => setTimeout(resolve, 5000))

    console.log('=== EXTRACTING SNOW DATA FROM DOM ===\n')

    // Extract data directly from the DOM instead of from HTML string
    const snowData = await page.evaluate(() => {
      const results: any = {}

      // Look for text containing "overnight" or "24 hour"
      const allText = document.body.innerText
      results.pageText = allText.substring(0, 2000)

      // Try to find elements with snow data
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, span'))

      results.snowKeywords = []
      headings.forEach(el => {
        const text = el.textContent?.toLowerCase() || ''
        if (text.includes('overnight') ||
            text.includes('24 hour') ||
            text.includes('new snow') ||
            text.includes('base depth') ||
            text.includes('lifts open') ||
            text.includes('trails open')) {

          // Get the element and its next siblings to capture the data
          const parent = el.parentElement
          const context = parent?.textContent?.substring(0, 200) || el.textContent?.substring(0, 200) || ''

          results.snowKeywords.push({
            keyword: text.substring(0, 50),
            context: context.replace(/\s+/g, ' ').trim()
          })
        }
      })

      return results
    })

    console.log('=== FIRST 2000 CHARS OF PAGE TEXT ===')
    console.log(snowData.pageText)
    console.log('\n\n=== SNOW KEYWORD CONTEXTS ===')
    snowData.snowKeywords.forEach((item: any, i: number) => {
      console.log(`\n${i + 1}. Keyword: "${item.keyword}"`)
      console.log(`   Context: ${item.context}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (browser) await browser.close()
  }
}

extractActualData('https://www.snowbasin.com/the-mountain/mountain-report/')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
