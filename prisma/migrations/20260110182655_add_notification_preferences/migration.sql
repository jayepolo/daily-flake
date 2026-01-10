/*
  Warnings:

  - You are about to drop the column `phone_number` on the `delivery_logs` table. All the data in the column will be lost.
  - You are about to drop the column `twilio_message_sid` on the `delivery_logs` table. All the data in the column will be lost.
  - Added the required column `delivery_type` to the `delivery_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipient_address` to the `delivery_logs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_delivery_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "resort_id" INTEGER NOT NULL,
    "delivery_type" TEXT NOT NULL,
    "recipient_address" TEXT NOT NULL,
    "message_sent" TEXT NOT NULL,
    "sent_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_id" TEXT,
    "delivery_status" TEXT NOT NULL,
    "error_details" TEXT,
    CONSTRAINT "delivery_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "delivery_logs_resort_id_fkey" FOREIGN KEY ("resort_id") REFERENCES "resorts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_delivery_logs" ("delivery_status", "error_details", "id", "message_sent", "resort_id", "sent_at", "user_id") SELECT "delivery_status", "error_details", "id", "message_sent", "resort_id", "sent_at", "user_id" FROM "delivery_logs";
DROP TABLE "delivery_logs";
ALTER TABLE "new_delivery_logs" RENAME TO "delivery_logs";
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clerk_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone_verification_code" TEXT,
    "phone_verification_expires_at" DATETIME,
    "email_notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_notifications_enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Denver',
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("clerk_user_id", "created_at", "email", "id", "is_paused", "phone_number", "phone_verification_code", "phone_verification_expires_at", "phone_verified", "timezone", "updated_at") SELECT "clerk_user_id", "created_at", "email", "id", "is_paused", "phone_number", "phone_verification_code", "phone_verification_expires_at", "phone_verified", "timezone", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
