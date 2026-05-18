import { buildEnv } from "@cap/env";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { formatStarCount, getGitHubStars } from "@/utils/github";
import { MessengerWidget } from "../Layout/MessengerWidget";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export default async function Layout(props: PropsWithChildren) {
	if (buildEnv.NEXT_PUBLIC_FEATURES_MARKETING !== "true") {
		redirect("/login");
	}

	const starCount = await getGitHubStars();
	const stars = formatStarCount(starCount);

	return (
		<>
			<Navbar stars={stars} />
			{props.children}
			<Footer />
			{buildEnv.NEXT_PUBLIC_IS_CAP === "true" && <MessengerWidget />}
		</>
	);
}
