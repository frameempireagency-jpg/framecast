import type { Metadata } from "next";
import { ImportPage } from "./ImportPage";

export const metadata: Metadata = {
	title: "Import| FrameCast",
};

export default function Page() {
	return <ImportPage />;
}
