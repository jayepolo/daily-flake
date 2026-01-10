# ❄️ The Daily Flake

Daily ski resort snow reports delivered via SMS. Built with Next.js 16, Prisma, Clerk, Twilio, and Claude AI.

## Features

- 🔐 **Authentication** - Email/password + Google OAuth via Clerk
- 📱 **Phone Verification** - SMS verification using Twilio Verify Service
- ⛷️ **Multi-Resort Subscriptions** - Subscribe to multiple resorts with custom notification times
- 🤖 **AI-Powered Scraping** - Claude AI extracts snow data from any resort website
- 📨 **SMS Notifications** - Daily snow reports sent at your preferred time
- 👨‍💼 **Admin Dashboard** - Manage resorts, view metrics, monitor deliveries
- ⏰ **Automated Scheduling** - node-cron runs scraping and notifications every 15 minutes

## Quick Start

See full documentation in the repository.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Railway deployment instructions.
