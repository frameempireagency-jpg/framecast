"use server";

import { db } from "@framecast/database";
import { getCurrentUser } from "@framecast/database/auth/session";
import { developerApps, developerVideos } from "@framecast/database/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function deleteDeveloperVideo(appId: string, videoId: string) {
	const user = await getCurrentUser();
	if (!user) throw new Error("Unauthorized");

	const [app] = await db()
		.select()
		.from(developerApps)
		.where(
			and(
				eq(developerApps.id, appId),
				eq(developerApps.ownerId, user.id),
				isNull(developerApps.deletedAt),
			),
		)
		.limit(1);

	if (!app) throw new Error("App not found");

	await db()
		.update(developerVideos)
		.set({ deletedAt: new Date() })
		.where(
			and(eq(developerVideos.id, videoId), eq(developerVideos.appId, appId)),
		);

	revalidatePath("/dashboard/developers");
	return { success: true };
}
