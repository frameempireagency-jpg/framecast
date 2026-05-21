import { useCallback, useRef } from "react";
import type { BackgroundProcessor } from "./background-processor";

export const useStreamManagement = () => {
	const displayStreamRef = useRef<MediaStream | null>(null);
	const cameraStreamRef = useRef<MediaStream | null>(null);
	const rawCameraStreamRef = useRef<MediaStream | null>(null);
	const backgroundProcessorRef = useRef<BackgroundProcessor | null>(null);
	const micStreamRef = useRef<MediaStream | null>(null);
	const mixedStreamRef = useRef<MediaStream | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const detectionTimeoutsRef = useRef<number[]>([]);
	const detectionCleanupRef = useRef<Array<() => void>>([]);

	const clearDetectionTracking = useCallback(() => {
		detectionTimeoutsRef.current.forEach((timeoutId) => {
			window.clearTimeout(timeoutId);
		});
		detectionTimeoutsRef.current = [];
		detectionCleanupRef.current.forEach((cleanup) => {
			try {
				cleanup();
			} catch {
				/* ignore */
			}
		});
		detectionCleanupRef.current = [];
	}, []);

	const cleanupStreams = useCallback(() => {
		clearDetectionTracking();
		const stopTracks = (stream: MediaStream | null) => {
			stream?.getTracks().forEach((track) => {
				track.stop();
			});
		};
		try {
			backgroundProcessorRef.current?.stop();
		} catch {}
		backgroundProcessorRef.current = null;
		stopTracks(displayStreamRef.current);
		stopTracks(cameraStreamRef.current);
		stopTracks(rawCameraStreamRef.current);
		stopTracks(micStreamRef.current);
		stopTracks(mixedStreamRef.current);
		displayStreamRef.current = null;
		cameraStreamRef.current = null;
		rawCameraStreamRef.current = null;
		micStreamRef.current = null;
		mixedStreamRef.current = null;

		if (audioContextRef.current) {
			audioContextRef.current.close().catch(() => {});
			audioContextRef.current = null;
		}

		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, [clearDetectionTracking]);

	return {
		displayStreamRef,
		cameraStreamRef,
		rawCameraStreamRef,
		backgroundProcessorRef,
		micStreamRef,
		mixedStreamRef,
		audioContextRef,
		videoRef,
		detectionTimeoutsRef,
		detectionCleanupRef,
		clearDetectionTracking,
		cleanupStreams,
	};
};
