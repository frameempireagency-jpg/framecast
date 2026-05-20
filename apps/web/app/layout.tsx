import "@/app/globals.css";
import { buildEnv, serverEnv } from "@cap/env";
import { STRIPE_PLAN_IDS } from "@cap/utils";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Effect } from "effect";
import type { Metadata } from "next";
import { DM_Mono, Syne } from "next/font/google";
import type { PropsWithChildren } from "react";
import { SonnerToaster } from "@/components/SonnerToastProvider";
import { runPromise } from "@/lib/server";
import { getBootstrapData } from "@/utils/getBootstrapData";
import { PublicEnvContext } from "@/utils/public-env";
import { AuthContextProvider } from "./Layout/AuthContext";
import { resolveCurrentUser } from "./Layout/current-user";
import { GTag } from "./Layout/GTag";
import { MetaPixel } from "./Layout/MetaPixel";
import { PosthogIdentify } from "./Layout/PosthogIdentify";
import { PurchaseTracker } from "./Layout/PurchaseTracker";
import {
	PostHogProvider,
	ReactQueryProvider,
	SessionProvider,
} from "./Layout/providers";
import { StripeContextProvider } from "./Layout/StripeContext";
//@ts-expect-error
import { script } from "./themeScript";

const syne = Syne({
	subsets: ["latin"],
	weight: ["400", "600", "700", "800"],
	variable: "--font-heading",
	display: "swap",
});

const dmMono = DM_Mono({
	subsets: ["latin"],
	weight: ["300", "400", "500"],
	variable: "--font-mono",
	display: "swap",
});

const defaultFont = {
	className: `${syne.className} ${syne.variable} ${dmMono.variable}`,
};

export const metadata: Metadata = {
	title: "FrameCast | Frame Empire",
	description:
		"Internal screen recordings for Frame Empire. Record. Share. Move on.",
	openGraph: {
		title: "FrameCast | Frame Empire",
		description:
			"Internal screen recordings for Frame Empire. Record. Share. Move on.",
		type: "website",
		images: ["/og.png"],
	},
};

export const dynamic = "force-dynamic";

export default ({ children }: PropsWithChildren) =>
	Effect.gen(function* () {
		const bootstrapData = yield* Effect.promise(getBootstrapData);

		return (
			<html className={defaultFont.className} lang="en">
				<head>
					<link rel="icon" href="/favicon.ico" sizes="any" />
					<link
						rel="apple-touch-icon"
						sizes="180x180"
						href="/framecast-icon.png"
					/>
					<meta name="msapplication-TileColor" content="#521F88" />
					<meta name="theme-color" content="#521F88" />
				</head>
				<body suppressHydrationWarning>
					<script
						dangerouslySetInnerHTML={{ __html: `(${script.toString()})()` }}
					/>
					<TooltipPrimitive.Provider>
						<PostHogProvider bootstrapData={bootstrapData}>
							<AuthContextProvider user={runPromise(resolveCurrentUser)}>
								<SessionProvider>
									<StripeContextProvider
										plans={
											serverEnv().VERCEL_ENV === "production"
												? STRIPE_PLAN_IDS.production
												: STRIPE_PLAN_IDS.development
										}
									>
										<PublicEnvContext
											value={{
												webUrl: buildEnv.NEXT_PUBLIC_WEB_URL,
												workosAuthAvailable: !!serverEnv().WORKOS_CLIENT_ID,
												googleAuthAvailable: !!serverEnv().GOOGLE_CLIENT_ID,
											}}
										>
											<ReactQueryProvider>
												<SonnerToaster />
												<main className="w-full">{children}</main>
												<PosthogIdentify />
												<MetaPixel />
												<GTag />
												<PurchaseTracker />
											</ReactQueryProvider>
										</PublicEnvContext>
									</StripeContextProvider>
								</SessionProvider>
							</AuthContextProvider>
						</PostHogProvider>
					</TooltipPrimitive.Provider>
				</body>
			</html>
		);
	}).pipe(runPromise);
