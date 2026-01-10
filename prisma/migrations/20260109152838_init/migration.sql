-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verification_code" TEXT,
    "phone_verification_expires_at" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'America/Denver',
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "resorts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "snow_report_url" TEXT NOT NULL,
    "scrape_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "resort_id" INTEGER NOT NULL,
    "notification_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_subscriptions_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "resorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scraped_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resort_id" INTEGER NOT NULL,
    "scraped_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "report_date" TEXT NOT NULL,
    "report_data" TEXT NOT NULL,
    "sms_summary" TEXT,
    "scrape_status" TEXT NOT NULL,
    "error_message" TEXT,
    CONSTRAINT "scraped_reports_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "resorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "resort_id" INTEGER NOT NULL,
    "phone_number" TEXT NOT NULL,
    "message_sent" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "twilio_message_sid" TEXT,
    "delivery_status" TEXT NOT NULL,
    "error_details" TEXT,
    CONSTRAINT "delivery_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delivery_logs_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "resorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "resorts_name_key" ON "resorts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_user_id_resort_id_key" ON "user_subscriptions"("user_id", "resort_id");

-- CreateIndex
CREATE UNIQUE INDEX "scraped_reports_resort_id_report_date_key" ON "scraped_reports"("resort_id", "report_date");
