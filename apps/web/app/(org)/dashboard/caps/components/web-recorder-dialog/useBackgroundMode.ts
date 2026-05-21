"use client";

import { useCallback, useEffect, useState } from "react";
import type { BackgroundMode } from "./background-processor";

const STORAGE_KEY = "cap-web-recorder-background";
const CHANGE_EVENT = "cap-web-recorder-background-change";

const DEFAULT_MODE: BackgroundMode = { type: "none" };

function readStored(): BackgroundMode {
	if (typeof window === "undefined") return DEFAULT_MODE;
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return DEFAULT_MODE;
		const parsed = JSON.parse(raw) as BackgroundMode;
		if (parsed && typeof parsed === "object" && "type" in parsed) {
			return parsed;
		}
	} catch {}
	return DEFAULT_MODE;
}

function writeStored(mode: BackgroundMode): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
	} catch {}
}

function broadcast(mode: BackgroundMode): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent<BackgroundMode>(CHANGE_EVENT, { detail: mode }),
	);
}

export function useBackgroundMode(): {
	mode: BackgroundMode;
	setMode: (next: BackgroundMode) => void;
} {
	const [mode, setLocalMode] = useState<BackgroundMode>(DEFAULT_MODE);

	useEffect(() => {
		setLocalMode(readStored());
		const onChange = (e: Event) => {
			const detail = (e as CustomEvent<BackgroundMode>).detail;
			if (detail) setLocalMode(detail);
		};
		const onStorage = (e: StorageEvent) => {
			if (e.key === STORAGE_KEY) setLocalMode(readStored());
		};
		window.addEventListener(CHANGE_EVENT, onChange);
		window.addEventListener("storage", onStorage);
		return () => {
			window.removeEventListener(CHANGE_EVENT, onChange);
			window.removeEventListener("storage", onStorage);
		};
	}, []);

	const setMode = useCallback((next: BackgroundMode) => {
		setLocalMode(next);
		writeStored(next);
		broadcast(next);
	}, []);

	return { mode, setMode };
}
