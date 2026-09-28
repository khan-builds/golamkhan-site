import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const members = sqliteTable("team_members", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  accountId: text("account_id").unique(),
  createdAt: integer("created_at").notNull(),
});
export const sessions = sqliteTable("team_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  accountId: text("account_id").notNull(),
  memberId: text("member_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const attempts = sqliteTable("login_attempts", {
  accountId: text("account_id").primaryKey(),
  startedAt: integer("started_at").notNull(),
  count: integer("count").notNull(),
});
export const events = sqliteTable("team_events", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  kind: text("kind").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const imports = sqliteTable("calendar_imports", {
  id: text("id").primaryKey(),
  importedAt: integer("imported_at").notNull(),
});
export const contacts = sqliteTable("crm_contacts", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  organization: text("organization").notNull().default(""),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  kind: text("kind").notNull().default("Coworker"),
  stage: text("stage").notNull().default("New"),
  followUp: text("follow_up").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const reimbursements = sqliteTable("reimbursements", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull(),
  amountCents: integer("amount_cents").notNull(),
  date: text("date").notNull(),
  purpose: text("purpose").notNull(),
  receipt: text("receipt").notNull().default(""),
  status: text("status").notNull().default("Submitted"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const shifts = sqliteTable("time_shifts", {
  id: text("id").primaryKey(),
  memberId: text("member_id").notNull(),
  clockIn: integer("clock_in").notNull(),
  clockOut: integer("clock_out"),
  breaks: text("breaks").notNull().default("[]"),
});
