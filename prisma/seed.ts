import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({})

async function main() {
  console.log('Seeding database...')

  // Seed initial resorts
  const resorts = [
    {
      name: 'Vail',
      snowReportUrl: 'https://www.vail.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx',
      scrapeTime: '05:30'
    },
    {
      name: 'Breckenridge',
      snowReportUrl: 'https://www.breckenridge.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx',
      scrapeTime: '05:30'
    },
    {
      name: 'Keystone',
      snowReportUrl: 'https://www.keystoneresort.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx',
      scrapeTime: '05:30'
    },
    {
      name: 'Aspen Snowmass',
      snowReportUrl: 'https://www.aspensnowmass.com/while-you-are-here/mountain-report',
      scrapeTime: '05:30'
    },
    {
      name: 'Steamboat',
      snowReportUrl: 'https://www.steamboat.com/the-mountain/mountain-report',
      scrapeTime: '05:30'
    }
  ]

  for (const resort of resorts) {
    const created = await prisma.resort.upsert({
      where: { name: resort.name },
      update: {},
      create: resort
    })
    console.log(`✓ Created/updated resort: ${created.name}`)
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
