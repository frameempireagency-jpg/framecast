import { serverEnv } from "@framecast/env";
import { Dub } from "dub";

export const dub = () =>
	new Dub({
		token: serverEnv().DUB_API_KEY,
	});
