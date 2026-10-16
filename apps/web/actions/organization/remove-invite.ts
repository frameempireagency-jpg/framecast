"use server";

import { db } from "@framecast/database";
import { getCurrentUser } from "@framecast/database/auth/session";
import { organizationInvites, organizations } from "@framecast/database/schema";
import type { Organisation } from "@framecast/web-domain";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrganizationSettingsManager } from "./authorization";

export async function removeOrganizationInvite(
	inviteId: string,
	organizationId: Organisation.OrganisationId,
) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	const organization = await db()
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);

	if (!organization || organization.length === 0) {
		throw new Error("Organization not found");
	}

	await requireOrganizationSettingsManager(user.id, organizationId);

	const [result] = await db()
		.delete(organizationInvites)
		.where(
			and(
				eq(organizationInvites.id, inviteId),
				eq(organizationInvites.organizationId, organizationId),
			),
		);

	if (result.affectedRows === 0) throw new Error("Invite not found");

	revalidatePath("/dashboard/settings/organization");

	return { success: true };
}
