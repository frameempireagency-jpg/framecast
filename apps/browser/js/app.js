import {
	listDevices,
	meter,
	openCamera,
	openMic,
	startSession,
	support,
} from "./capture.js";
import {
	fileName,
	filmstrip,
	loadVideo,
	renderVideo,
	saveFile,
	shareFile,
	thumbnail,
} from "./editor.js";
import { openFloating } from "./floating.js";
import {
	askToKeep,
	deleteRecording,
	getRecording,
	listRecordings,
	newId,
	putChunk,
	putRecording,
	readVideo,
	recoverInterrupted,
	replaceVideo,
	storageInfo,
} from "./store.js";

const $ = (s, root = document) => root.querySelector(s);
const caps = support();
const phone = !caps.screen;

const SETTINGS_KEY = "framecast.settings";
const defaults = {
	what: "monitor",
	mic: "",
	cam: "",
	system: true,
	studio: true,
	forWho: "",
	notes: "",
	corner: "br",
};
const settings = { ...defaults, ...readJSON(SETTINGS_KEY) };
if (phone) settings.what = "camera";

function readJSON(key) {
	try {
		return JSON.parse(localStorage.getItem(key) || "{}");
	} catch {
		return {};
	}
}
function saveSettings() {
	try {
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {}
}

function fmt(sec) {
	const s = Math.max(0, Math.round(sec || 0));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = String(s % 60).padStart(2, "0");
	return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}
const when = (ts) =>
	new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function play(name) {
	const a = $(`[data-sound="${name}"]`);
	if (!a) return;
	a.currentTime = 0;
	a.play().catch(() => {});
}

function notice(text, kind = "info", key = text) {
	const list = $("[data-notices]");
	if ([...list.children].some((li) => li.dataset.key === key)) return;
	const li = document.createElement("li");
	li.className = kind;
	li.dataset.key = key;
	const span = document.createElement("span");
	span.textContent = text;
	const close = document.createElement("button");
	close.type = "button";
	close.textContent = "Dismiss";
	close.addEventListener("click", () => li.remove());
	li.append(span, close);
	list.append(li);
}
const clearNotices = () => $("[data-notices]").replaceChildren();

function show(view) {
	for (const v of document.querySelectorAll("[data-view]"))
		v.hidden = v.dataset.view !== view;
	window.scrollTo({ top: 0 });
}

/* ---------- devices ---------- */
const whatSel = $("[data-what]");
const micSel = $("[data-mic]");
const camSel = $("[data-cam]");
let micTrack = null;
let camTrack = null;
let stopMeter = null;

const cameraOnly = () => settings.what === "camera";

function fillSelect(sel, devices, kind, current) {
	const keep = sel.value;
	sel.replaceChildren();
	const named = devices.filter((d) => d.deviceId && d.label);
	if (named.length === 0) {
		sel.append(new Option(kind === "mic" ? "Microphone" : "Camera", ""));
	} else {
		for (const d of named) {
			if (d.deviceId === "default" || d.deviceId === "communications") continue;
			sel.append(
				new Option(
					d.label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, ""),
					d.deviceId,
				),
			);
		}
		if (!sel.options.length)
			sel.append(new Option(kind === "mic" ? "Microphone" : "Camera", ""));
	}
	if (!(kind === "cam" && cameraOnly()))
		sel.append(
			new Option(kind === "mic" ? "No microphone" : "No camera", "off"),
		);
	const want = current ?? keep;
	sel.value = [...sel.options].some((o) => o.value === want)
		? want
		: sel.options[0].value;
}

async function refreshDevices() {
	let d = { mics: [], cams: [] };
	try {
		d = await listDevices();
	} catch {}
	fillSelect(micSel, d.mics, "mic", settings.mic);
	fillSelect(camSel, d.cams, "cam", settings.cam);
}

let micPending = null;
let camPending = null;

function ensureMic() {
	micPending ??= openMicNow().finally(() => {
		micPending = null;
	});
	return micPending;
}

function ensureCam() {
	camPending ??= openCamNow().finally(() => {
		camPending = null;
	});
	return camPending;
}

async function openMicNow() {
	if (settings.mic === "off") return null;
	if (micTrack?.readyState === "live") return micTrack;
	try {
		micTrack = await openMic(settings.mic);
		const bars = document.querySelectorAll(".lvl i");
		const shape = [0.55, 1, 0.8, 0.45];
		stopMeter?.();
		stopMeter = meter(micTrack, (v) => {
			bars.forEach((b, i) => {
				b.style.transform = `scaleY(${Math.max(0.15, Math.min(1, v * shape[i] * 1.6))})`;
			});
		});
		$(".lvl").hidden = false;
		await refreshDevices();
	} catch {
		micTrack = null;
		notice(
			"The microphone could not be opened. Allow the browser to use it, then try again.",
			"warn",
			"mic",
		);
	}
	return micTrack;
}

async function openCamNow() {
	if (settings.cam === "off" && !cameraOnly()) return null;
	if (camTrack?.readyState === "live") return camTrack;
	camTrack?.stop();
	try {
		camTrack = await openCamera(settings.cam === "off" ? "" : settings.cam);
		const s = new MediaStream([camTrack]);
		$("[data-cam-preview]").srcObject = s;
		$("[data-cam-preview]").hidden = false;
		$("[data-live-cam]").srcObject = s;
		await refreshDevices();
	} catch {
		camTrack = null;
		notice(
			"The camera could not be opened. Allow the browser to use it, then try again.",
			"warn",
			"cam",
		);
	}
	return camTrack;
}

function dropMic() {
	stopMeter?.();
	stopMeter = null;
	micTrack?.stop();
	micTrack = null;
	$(".lvl").hidden = true;
}
function dropCam() {
	camTrack?.stop();
	camTrack = null;
	$("[data-cam-preview]").srcObject = null;
	$("[data-cam-preview]").hidden = true;
}

async function warmPermitted() {
	if (!navigator.permissions?.query) return refreshDevices();
	const state = async (name) => {
		try {
			return (await navigator.permissions.query({ name })).state;
		} catch {
			return "prompt";
		}
	};
	const [mic, cam] = await Promise.all([state("microphone"), state("camera")]);
	if (mic === "granted") await ensureMic();
	if (cam === "granted") await ensureCam();
	await refreshDevices();
}

/* ---------- the card ---------- */
function applySettings() {
	whatSel.value = settings.what;
	$('[data-row="system"]').hidden = phone || cameraOnly();
	$('[data-row="studio"]').hidden = phone || cameraOnly() || !caps.composite;
	$("[data-system]").checked = settings.system;
	$("[data-studio]").checked = settings.studio;
	const forInput = $("[data-for]");
	if (document.activeElement !== forInput) forInput.value = settings.forWho;
}

if (phone) {
	for (const opt of [...whatSel.options])
		if (opt.value !== "camera") opt.remove();
	$('[data-row="what"]').hidden = true;
	for (const el of document.querySelectorAll("[data-device-word]"))
		el.textContent = "phone";
	$("[data-record]").lastChild.textContent = "Record a video";
	$(".import .grow").firstChild.textContent =
		"Polish a screen recording from your phone ";
}

whatSel.addEventListener("change", async () => {
	settings.what = whatSel.value;
	saveSettings();
	applySettings();
	if (cameraOnly()) {
		if (settings.cam === "off") settings.cam = "";
		await refreshDevices();
		await ensureCam();
	} else {
		await refreshDevices();
	}
});

micSel.addEventListener("pointerdown", () => {
	if (!micTrack && settings.mic !== "off") ensureMic();
});
micSel.addEventListener("change", async () => {
	settings.mic = micSel.value;
	saveSettings();
	dropMic();
	if (settings.mic !== "off") await ensureMic();
});

camSel.addEventListener("pointerdown", () => {
	if (!camTrack && settings.cam !== "off") ensureCam();
});
camSel.addEventListener("change", async () => {
	settings.cam = camSel.value;
	saveSettings();
	dropCam();
	if (settings.cam !== "off" || cameraOnly()) await ensureCam();
});

$("[data-system]").addEventListener("change", (e) => {
	settings.system = e.target.checked;
	saveSettings();
});
$("[data-studio]").addEventListener("change", (e) => {
	settings.studio = e.target.checked;
	saveSettings();
});
$("[data-for]").addEventListener("input", (e) => {
	settings.forWho = e.target.value.trim();
	saveSettings();
});
$("[data-for]").addEventListener("keydown", (e) => {
	if (e.key === "Enter") {
		e.preventDefault();
		$("[data-record]").focus();
	}
});

/* ---------- recording ---------- */
let session = null;
let floating = null;
let ticker = 0;
let muted = false;
let counting = null;
let stopping = false;

function defaultTitle() {
	const d = new Date();
	const date = d.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
	});
	const time = d.toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return settings.forWho
		? `${settings.forWho}, ${date}`
		: `Recording ${date} ${time}`;
}

function liveUpdate() {
	if (!session) return;
	const paused = session.state === "paused";
	const time = fmt(session.elapsed() / 1000);
	$("[data-clock]").textContent = time;
	$("[data-live-state]").textContent = paused ? "Paused" : "Recording";
	$(".live-state").classList.toggle("paused", paused);
	$("[data-live-pause]").textContent = paused ? "Resume" : "Pause";
	const m = $("[data-live-mute]");
	m.hidden = !session.hasMic;
	m.setAttribute("aria-pressed", String(muted));
	m.textContent = muted ? "Mic muted" : "Mute mic";
	floating?.update({ time, paused, muted, hasMic: session.hasMic });
}

function togglePause() {
	if (!session || counting) return;
	if (session.state === "paused") session.resume();
	else session.pause();
	play("action");
	liveUpdate();
}

function toggleMute() {
	if (!session) return;
	muted = !muted;
	session.setMuted(muted);
	liveUpdate();
}

function countdown() {
	return new Promise((resolve) => {
		let n = 3;
		const el = $("[data-countdown]");
		el.hidden = false;
		$("[data-clock]").hidden = true;
		const step = () => {
			if (counting?.cancelled) return resolve(false);
			if (n === 0) {
				el.hidden = true;
				$("[data-clock]").hidden = false;
				floating?.countdown(null);
				return resolve(true);
			}
			el.textContent = String(n);
			el.style.animation = "none";
			void el.offsetWidth;
			el.style.animation = "";
			floating?.countdown(n);
			n -= 1;
			setTimeout(step, 1000);
		};
		step();
	});
}

async function startRecording() {
	if (session || counting) return;
	clearNotices();

	if (!cameraOnly()) {
		floating = await openFloating({
			notes: settings.notes,
			onPauseToggle: togglePause,
			onMuteToggle: toggleMute,
			onStop: () => stopRecording(),
			onNotes: (v) => {
				settings.notes = v;
				$("[data-live-notes]").value = v;
				saveSettings();
			},
			onClosed: () => {
				floating = null;
			},
		});
	}

	const mic = await ensureMic();
	const cam = await ensureCam();

	try {
		session = await startSession(
			{
				what: settings.what,
				system: settings.system,
				micTrack: mic,
				camTrack: cam,
				studio: settings.studio,
				bubbleCorner: settings.corner,
				forWho: settings.forWho,
				title: defaultTitle(),
			},
			{
				onSourceEnded: () => stopRecording(),
				onError: () =>
					notice(
						"Part of the recording could not be saved. Stop and check the video.",
						"bad",
						"save",
					),
			},
		);
	} catch (err) {
		floating?.close();
		floating = null;
		if (err?.name !== "NotAllowedError" && err?.name !== "AbortError") {
			notice(
				`Recording could not start: ${err?.message || err}`,
				"bad",
				"start",
			);
		}
		return;
	}

	counting = { cancelled: false };
	muted = false;
	show("live");
	$("[data-live-cam]").hidden = !cameraOnly();
	$("[data-live-notes]").value = settings.notes;
	$("[data-live-hint]").hidden = !floating;
	const go = await countdown();
	if (!go) {
		await session.cancel();
		session = null;
		counting = null;
		floating?.close();
		floating = null;
		show("setup");
		return;
	}
	counting = null;
	play("start");
	await new Promise((r) => setTimeout(r, 350));
	session.begin();
	floating?.live();
	ticker = setInterval(liveUpdate, 250);
	liveUpdate();
	if (session.notes.includes("no-system-audio")) {
		notice(
			"The computer sound was not shared, so only your voice is recorded. Next time tick “Share system audio” in the window that asks what to record.",
			"warn",
			"sys",
		);
	}
	if (session.notes.includes("no-bubble")) {
		notice(
			"This browser cannot add the camera bubble. Your screen and sound are still recording.",
			"warn",
			"bubble",
		);
	}
}

async function stopRecording() {
	if (!session || stopping) return;
	if (counting) {
		counting.cancelled = true;
		return;
	}
	stopping = true;
	clearInterval(ticker);
	play("stop");
	$("[data-live-state]").textContent =
		settings.forWho && caps.composite ? "Adding the end card" : "Saving";
	const rec = await session.stop();
	session = null;
	stopping = false;
	floating?.close();
	floating = null;
	await openReview(rec.id, true);
}

$("[data-record]").addEventListener("click", startRecording);
$("[data-live-pause]").addEventListener("click", togglePause);
$("[data-live-mute]").addEventListener("click", toggleMute);
$("[data-live-stop]").addEventListener("click", () => stopRecording());
$("[data-live-notes]").addEventListener("input", (e) => {
	settings.notes = e.target.value;
	saveSettings();
});

document.addEventListener("keydown", (e) => {
	const typing = /INPUT|TEXTAREA|SELECT/.test(
		document.activeElement?.tagName || "",
	);
	if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
	if (!$('[data-view="setup"]').hidden && e.key.toLowerCase() === "r") {
		e.preventDefault();
		startRecording();
	} else if (counting && e.key === "Escape") {
		counting.cancelled = true;
	} else if (session && !counting && e.key === " ") {
		e.preventDefault();
		togglePause();
	}
});

window.addEventListener("beforeunload", (e) => {
	if (session) e.preventDefault();
});

/* ---------- import ---------- */
$("[data-import]").addEventListener("change", async (e) => {
	const file = e.target.files?.[0];
	e.target.value = "";
	if (!file) return;
	const id = newId();
	const rec = {
		id,
		title: file.name.replace(/\.[^.]+$/, ""),
		forWho: "",
		createdAt: Date.now(),
		status: "done",
		mime: file.type || "video/mp4",
		duration: 0,
		size: file.size,
		opened: false,
		notes: [],
		cards: "",
	};
	await putChunk(id, 0, file);
	await putRecording(rec);
	await openReview(id, false);
});

/* ---------- review ---------- */
let review = null;

async function openReview(id, fresh) {
	const rec = await getRecording(id);
	if (!rec) return;
	if (review?.url) URL.revokeObjectURL(review.url);
	const blob = await readVideo(id, rec.mime);
	show("review");
	const url = URL.createObjectURL(blob);
	$("[data-player]").src = url;
	review = {
		rec,
		blob,
		url,
		start: 0,
		end: rec.duration || 0,
		duration: rec.duration || 0,
	};
	$("[data-title]").value = rec.title;
	$("[data-review-for]").value = rec.cards || rec.forWho || "";
	const badge = $("[data-review-badge]");
	badge.hidden = !(fresh || rec.status === "recovered");
	badge.className = rec.status === "recovered" ? "badge recovered" : "badge";
	badge.textContent =
		rec.status === "recovered"
			? "Recovered after the page closed"
			: "Saved on this " + (phone ? "phone" : "computer");
	$("[data-share]").hidden = !caps.share;
	$("[data-review-hint]").textContent = "";
	$("[data-delete]").textContent = "Delete";
	$("[data-strip]").replaceChildren();

	if (!rec.opened || rec.status === "recovered") {
		rec.opened = true;
		if (rec.status === "recovered") rec.status = "done";
		await putRecording(rec);
	}
	renderLibrary();

	const { video, url: probeUrl, ready } = loadVideo(blob);
	try {
		await ready;
		review.duration = video.duration;
		review.end = video.duration;
		if (Math.abs((rec.duration || 0) - video.duration) > 1) {
			rec.duration = video.duration;
			await putRecording(rec);
		}
		renderTrim();
		$("[data-strip]").replaceChildren(
			...(await filmstrip(video, phone ? 6 : 10, 160)),
		);
		if (!rec.thumb) {
			rec.thumb = await thumbnail(blob);
			await putRecording(rec);
		}
		renderLibrary();
	} catch {
		$("[data-review-hint]").textContent =
			"The preview strip could not be made, but the video is saved.";
	} finally {
		URL.revokeObjectURL(probeUrl);
	}
}

function renderTrim() {
	if (!review) return;
	const d = review.duration || 1;
	const l = (review.start / d) * 100;
	const r = (review.end / d) * 100;
	$('[data-handle="start"]').style.left = `${l}%`;
	$('[data-handle="end"]').style.left = `${r}%`;
	$("[data-keep]").style.left = `${l}%`;
	$("[data-keep]").style.width = `${r - l}%`;
	$('[data-shade="l"]').style.width = `${l}%`;
	$('[data-shade="r"]').style.width = `${100 - r}%`;
	$("[data-trim-start]").textContent = fmt(review.start);
	$("[data-trim-end]").textContent = fmt(review.end);
	$("[data-trim-len]").textContent = isTrimmed()
		? `Keeping ${fmt(review.end - review.start)} of ${fmt(d)}`
		: `${fmt(d)} long`;
}

const isTrimmed = () =>
	review && (review.start > 0.25 || review.end < review.duration - 0.25);

for (const h of document.querySelectorAll("[data-handle]")) {
	const which = h.dataset.handle;
	const setAt = (t) => {
		if (!review) return;
		if (which === "start")
			review.start = Math.max(0, Math.min(t, review.end - 1));
		else review.end = Math.min(review.duration, Math.max(t, review.start + 1));
		$("[data-player]").currentTime =
			which === "start" ? review.start : review.end;
		renderTrim();
	};
	h.addEventListener("pointerdown", (e) => {
		h.setPointerCapture(e.pointerId);
		const box = $("[data-trim]").getBoundingClientRect();
		const move = (ev) =>
			setAt(((ev.clientX - box.left) / box.width) * review.duration);
		const up = () => {
			h.removeEventListener("pointermove", move);
			h.removeEventListener("pointerup", up);
		};
		h.addEventListener("pointermove", move);
		h.addEventListener("pointerup", up);
	});
	h.addEventListener("keydown", (e) => {
		const by = e.shiftKey ? 5 : 0.5;
		const cur = which === "start" ? review.start : review.end;
		if (e.key === "ArrowLeft") {
			e.preventDefault();
			setAt(cur - by);
		} else if (e.key === "ArrowRight") {
			e.preventDefault();
			setAt(cur + by);
		}
	});
}

$("[data-title]").addEventListener("change", async (e) => {
	if (!review) return;
	review.rec.title = e.target.value.trim() || review.rec.title;
	await putRecording(review.rec);
	renderLibrary();
});

async function finalBlob() {
	const forWho = $("[data-review-for]").value.trim();
	const addCards = !!forWho && forWho !== review.rec.cards;
	if (!isTrimmed() && !addCards) return review.blob;
	const bar = $("[data-progress]");
	const fill = $("[data-progress-bar]");
	bar.hidden = false;
	$("[data-review-hint]").textContent = addCards
		? "Adding the name card and end card. This plays the video once, so it takes as long as the video."
		: "Cutting the video. This plays the kept part once, so it takes as long as the video.";
	for (const b of document.querySelectorAll(".review-actions button"))
		b.disabled = true;
	try {
		const out = await renderVideo(
			review.blob,
			{
				start: review.start,
				end: review.end,
				forWho: addCards ? forWho : "",
				endCard: addCards,
			},
			(p) => {
				fill.style.width = `${Math.round(p * 100)}%`;
			},
		);
		await replaceVideo(review.rec.id, out);
		review.rec.duration = review.end - review.start + (addCards ? 2.2 : 0);
		review.rec.size = out.size;
		review.rec.mime = out.type;
		if (addCards) review.rec.cards = forWho;
		review.rec.thumb = await thumbnail(out);
		await putRecording(review.rec);
		review.blob = out;
		review.duration = review.rec.duration;
		review.start = 0;
		review.end = review.duration;
		URL.revokeObjectURL(review.url);
		review.url = URL.createObjectURL(out);
		$("[data-player]").src = review.url;
		renderTrim();
		renderLibrary();
		$("[data-review-hint]").textContent = "";
		return out;
	} finally {
		bar.hidden = true;
		fill.style.width = "0";
		for (const b of document.querySelectorAll(".review-actions button"))
			b.disabled = false;
	}
}

$("[data-save]").addEventListener("click", async () => {
	if (!review) return;
	const blob = await finalBlob();
	const result = await saveFile(blob, fileName(review.rec.title, blob.type));
	const hint = $("[data-review-hint]");
	if (result === "saved")
		hint.textContent =
			"Saved. Send it on Telegram, WhatsApp or email from where you saved it.";
	else if (result === "downloaded")
		hint.textContent = phone
			? "Saved to your downloads."
			: "Saved to your Downloads folder.";
	if (result !== "cancelled") play("action");
});

$("[data-share]").addEventListener("click", async () => {
	if (!review) return;
	const blob = await finalBlob();
	const result = await shareFile(
		blob,
		fileName(review.rec.title, blob.type),
		review.rec.title,
	);
	const hint = $("[data-review-hint]");
	if (result === "unsupported")
		hint.textContent =
			"This device cannot share a file this big from the browser. Use Save video instead.";
	else if (result === "failed")
		hint.textContent = "Sharing did not finish. Use Save video instead.";
});

$("[data-delete]").addEventListener("click", async (e) => {
	if (!review) return;
	const btn = e.currentTarget;
	if (btn.dataset.armed !== "1") {
		btn.dataset.armed = "1";
		btn.textContent = "Tap again to delete for good";
		setTimeout(() => {
			btn.dataset.armed = "";
			btn.textContent = "Delete";
		}, 4000);
		return;
	}
	btn.dataset.armed = "";
	await deleteRecording(review.rec.id);
	URL.revokeObjectURL(review.url);
	review = null;
	show("setup");
	renderLibrary();
});

$("[data-back]").addEventListener("click", () => {
	$("[data-player]").pause();
	review = null;
	show("setup");
	renderLibrary();
});

/* ---------- library ---------- */
const thumbUrls = [];

async function renderLibrary() {
	const recs = (await listRecordings()).filter((r) => r.status !== "recording");
	$("[data-lib-empty]").hidden = recs.length > 0;
	const longest = Math.max(1, ...recs.map((r) => r.duration || 0));
	for (const u of thumbUrls.splice(0)) URL.revokeObjectURL(u);
	$("[data-lib]").replaceChildren(
		...recs.map((r) => {
			const li = document.createElement("li");
			if (r.status === "recovered") li.className = "rescued";
			else if (!r.opened) li.className = "fresh";
			const b = document.createElement("button");
			b.type = "button";
			if (review?.rec.id === r.id) b.setAttribute("aria-current", "true");
			const tile = document.createElement("span");
			tile.className = "tile";
			tile.style.display = "block";
			if (r.thumb) {
				const img = document.createElement("img");
				const u = URL.createObjectURL(r.thumb);
				thumbUrls.push(u);
				img.src = u;
				img.alt = "";
				tile.append(img);
			}
			const dur = document.createElement("span");
			dur.className = "dur";
			dur.textContent = fmt(r.duration);
			tile.append(dur);
			if (r.status === "recovered" || !r.opened) {
				const tag = document.createElement("span");
				tag.className = "tag";
				tag.textContent = r.status === "recovered" ? "Recovered" : "New";
				tile.append(tag);
			}
			const title = document.createElement("b");
			title.textContent = r.title;
			const meta = document.createElement("small");
			meta.textContent = r.cards
				? `${when(r.createdAt)}  ·  for ${r.cards.split(",")[0]}`
				: when(r.createdAt);
			const len = document.createElement("span");
			len.className = "len";
			len.setAttribute("aria-hidden", "true");
			const fill = document.createElement("i");
			fill.style.width = `${Math.max(4, ((r.duration || 0) / longest) * 100)}%`;
			len.append(fill);
			b.append(tile, title, meta, len);
			b.addEventListener("click", () => openReview(r.id, false));
			li.append(b);
			return li;
		}),
	);
	const info = await storageInfo();
	if (info) {
		const gb = info.free / 1e9;
		const hours = info.free / 1e6 / 3600;
		$("[data-space]").textContent =
			`${gb >= 10 ? Math.round(gb) : gb.toFixed(1)} GB free for recordings, about ${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} hours.`;
	}
}

/* ---------- install and offline ---------- */
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
	e.preventDefault();
	installPrompt = e;
	$("[data-install]").hidden = false;
});
$("[data-install]").addEventListener("click", async () => {
	if (!installPrompt) return;
	installPrompt.prompt();
	await installPrompt.userChoice;
	installPrompt = null;
	$("[data-install]").hidden = true;
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
	navigator.serviceWorker.register("sw.js").catch(() => {});
}

/* ---------- start ---------- */
async function boot() {
	if (!caps.recorder || !(caps.screen || caps.camera)) {
		$("[data-app]").hidden = true;
		$("[data-blocked]").hidden = false;
		return;
	}
	applySettings();
	show("setup");
	askToKeep();
	const rescued = await recoverInterrupted();
	if (rescued.length) {
		notice(
			rescued.length === 1
				? "A recording was saved when the page closed unexpectedly. It is in Your recordings."
				: `${rescued.length} recordings were saved when the page closed unexpectedly. They are in Your recordings.`,
			"warn",
			"rescued",
		);
	}
	if (!phone && !caps.composite)
		notice(
			"This browser records the screen and sound only. For the camera bubble and studio frame, use Chrome or Edge.",
			"warn",
			"composite",
		);
	await renderLibrary();
	await warmPermitted();
}

boot();
