import puppeteer from 'puppeteer'

async function debugHTMLContext(url: string) {
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

    const html = await page.content()

    console.log(`Fetched ${html.length} characters of HTML\n`)
    console.log('=== SEARCHING FOR SNOW DATA WITH CONTEXT ===\n')

    // Find all instances of numbers with inches/quotes
    const pattern = /(\d+)\s*(?:inch|inches|")/gi
    const matches = []
    let match

    while ((match = pattern.exec(html)) !== null) {
      const contextStart = Math.max(0, match.index - 150)
      const contextEnd = Math.min(html.length, match.index + match[0].length + 150)
      const context = html.substring(contextStart, contextEnd)

      matches.push({
        number: match[1],
        match: match[0],
        context: context.replace(/\n/g, ' ').replace(/\s+/g, ' ')
      })
    }

    console.log(`Found ${matches.length} total matches\n`)

    // Show first 10 unique contexts
    const seen = new Set()
    let shown = 0

    for (const m of matches) {
      if (shown >= 10) break
      if (seen.has(m.context)) continue

      seen.add(m.context)
      shown++

      console.log(`\n--- Match #${shown}: "${m.match}" (number: ${m.number}) ---`)
      console.log(m.context)
    }

    // Also search for specific keywords
    console.log('\n\n=== SEARCHING FOR SPECIFIC KEYWORDS ===\n')

    const keywords = [
      'overnight',
      'last 24',
      '24 hour',
      'new snow',
      'fresh snow',
      'base depth',
      'snow base',
      'lifts open',
      'lift status'
    ]

    for (const keyword of keywords) {
      const regex = new RegExp(`.{0,100}${keyword}.{0,100}`, 'gi')
      const keywordMatches = html.match(regex)
      if (keywordMatches && keywordMatches.length > 0) {
        console.log(`\n"${keyword}": Found ${keywordMatches.length} matches`)
        console.log('First match:', keywordMatches[0].replace(/\n/g, ' ').replace(/\s+/g, ' '))
      }
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    if (browser) await browser.close()
  }
}

debugHTMLContext('https://www.snowbasin.com/the-mountain/mountain-report/')
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
