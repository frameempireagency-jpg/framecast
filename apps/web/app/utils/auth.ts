import { getCurrentUser } from "@framecast/database/auth/session";
import { cache } from "react";

export const getUser = cache(getCurrentUser);
