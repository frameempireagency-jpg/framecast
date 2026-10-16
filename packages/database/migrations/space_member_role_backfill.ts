import { db } from "@framecast/database";
import { spaceMembers } from "@framecast/database/schema";
import { sql } from "drizzle-orm";

export async function runSpaceMemberRoleBackfill() {
	await db()
		.update(spaceMembers)
		.set({ role: "admin" })
		.where(sql`LOWER(${spaceMembers.role}) = 'admin'`);
}
