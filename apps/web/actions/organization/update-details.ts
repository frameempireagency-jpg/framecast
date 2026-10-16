"use server";

import { db } from "@framecast/database";
import { getCurrentUser } from "@framecast/database/auth/session";
import { organizations } from "@framecast/database/schema";
import type { Organisation } from "@framecast/web-domain";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrganizationSettingsManager } from "./authorization";

export async function updateOrganizationDetails({
	organizationName,
	allowedEmailDomain,
	organizationId,
}: {
	organizationName?: string | null;
	allowedEmailDomain?: string | null;
	organizationId: Organisation.OrganisationId;
}) {
	const user = await getCurrentUser();

	if (!user) {
		throw new Error("Unauthorized");
	}

	const organization = await db()
		.select()
		.from(organizations)
		.where(eq(organizations.id, organizationId));

	if (!organization || organization.length === 0) {
		throw new Error("Organization not found");
	}

	await requireOrganizationSettingsManager(user.id, organizationId);

	if (organizationName) {
		await db()
			.update(organizations)
			.set({
				name: organizationName,
			})
			.where(eq(organizations.id, organizationId));
	}

	if (allowedEmailDomain || allowedEmailDomain === "") {
		await db()
			.update(organizations)
			.set({
				allowedEmailDomain: allowedEmailDomain,
			})
			.where(eq(organizations.id, organizationId));
	}

	revalidatePath("/dashboard/settings/organization");

	return { success: true };
}
