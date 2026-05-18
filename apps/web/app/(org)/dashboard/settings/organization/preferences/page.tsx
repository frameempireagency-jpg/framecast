import { buildEnv } from "@cap/env";
import type { Metadata } from "next";
import CapSettingsCard from "../components/CapSettingsCard";

export const metadata: Metadata = {
	title: "Organization Preferences | FrameCast",
};

export default function PreferencesPage() {
	if (buildEnv.NEXT_PUBLIC_FEATURES_AI !== "true") {
		return (
			<p className="text-sm text-gray-10">
				AI features are disabled in this deployment.
			</p>
		);
	}
	return <CapSettingsCard />;
}
