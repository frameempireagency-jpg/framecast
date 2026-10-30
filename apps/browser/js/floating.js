const fontUrl = (w) =>
	new URL(`../fonts/geist-sans-latin-${w}-normal.woff2`, import.meta.url).href;

const CSS = `
@font-face{font-family:Geist;src:url(${fontUrl(400)}) format("woff2");font-weight:400}
@font-face{font-family:Geist;src:url(${fontUrl(600)}) format("woff2");font-weight:600}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{background:#0e0b12;color:#efe9f8;font:15px/1.4 Geist,"Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;gap:12px;padding:14px}
.row{display:flex;align-items:center;gap:10px}
.dot{width:12px;height:12px;border-radius:50%;background:#e5484d;flex:none}
.paused .dot{background:#f5a524}
.time{font-size:28px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.01em;min-width:5ch}
.state{color:#c4a9ec;margin-left:auto}
.count{font-size:64px;font-weight:600;text-align:center;font-variant-numeric:tabular-nums;line-height:1}
button{font:inherit;font-weight:600;border-radius:999px;border:1px solid #3d2a57;background:#1c1526;color:#efe9f8;padding:10px 14px;cursor:pointer;flex:1}
button:hover{background:#271c36}
button:focus-visible{outline:2px solid #c4a9ec;outline-offset:2px}
button.stop{background:#e5484d;border-color:#e5484d;color:#fff}
button.stop:hover{background:#cf3a40}
button[aria-pressed="true"]{background:#3a2852;border-color:#8b4fd6}
textarea{flex:1;min-height:60px;resize:none;border-radius:12px;border:1px solid #3d2a57;background:#151019;color:#efe9f8;font:inherit;padding:10px 12px}
textarea::placeholder{color:#8f80a0}
textarea:focus-visible{outline:2px solid #c4a9ec;outline-offset:1px}
.hint{color:#a99bb8;font-size:13px}
[hidden]{display:none!important}
`;

export function canFloat() {
	return "documentPictureInPicture" in window;
}

export async function openFloating(handlers) {
	if (!canFloat()) return null;
	let pip;
	try {
		pip = await window.documentPictureInPicture.requestWindow({
			width: 340,
			height: 300,
		});
	} catch {
		return null;
	}
	const doc = pip.document;
	doc.title = "FrameCast";
	const style = doc.createElement("style");
	style.textContent = CSS;
	doc.head.append(style);
	doc.body.innerHTML = `
		<div class="count" data-count hidden></div>
		<div class="hint" data-wait>Choose what to record in the window that just opened.</div>
		<div data-live hidden style="display:contents">
			<div class="row"><span class="dot"></span><span class="time" data-time>0:00</span><span class="state" data-state>Recording</span></div>
			<div class="row">
				<button type="button" data-pause>Pause</button>
				<button type="button" data-mute aria-pressed="false">Mute mic</button>
			</div>
			<button type="button" class="stop" data-stop>Stop and review</button>
			<textarea data-notes placeholder="Notes only you can see. They are not in the video."></textarea>
		</div>`;
	const $ = (s) => doc.querySelector(s);
	const notes = $("[data-notes]");
	notes.value = handlers.notes || "";
	notes.addEventListener("input", () => handlers.onNotes?.(notes.value));
	$("[data-pause]").addEventListener("click", () => handlers.onPauseToggle?.());
	$("[data-stop]").addEventListener("click", () => handlers.onStop?.());
	$("[data-mute]").addEventListener("click", () => handlers.onMuteToggle?.());
	doc.addEventListener("keydown", (e) => {
		if (e.target === notes) return;
		if (e.key === " ") {
			e.preventDefault();
			handlers.onPauseToggle?.();
		} else if (e.key === "Escape" || e.key.toLowerCase() === "s") {
			handlers.onStop?.();
		}
	});
	pip.addEventListener("pagehide", () => handlers.onClosed?.());

	return {
		window: pip,
		countdown(n) {
			$("[data-wait]").hidden = true;
			const c = $("[data-count]");
			c.hidden = n === null;
			if (n !== null) c.textContent = String(n);
		},
		live() {
			$("[data-wait]").hidden = true;
			$("[data-count]").hidden = true;
			$("[data-live]").hidden = false;
			$("[data-live]").style.display = "contents";
		},
		update({ time, paused, muted, hasMic }) {
			$("[data-time]").textContent = time;
			doc.body.classList.toggle("paused", paused);
			$("[data-state]").textContent = paused ? "Paused" : "Recording";
			$("[data-pause]").textContent = paused ? "Resume" : "Pause";
			const mute = $("[data-mute]");
			mute.hidden = !hasMic;
			mute.setAttribute("aria-pressed", String(muted));
			mute.textContent = muted ? "Mic muted" : "Mute mic";
		},
		close() {
			try {
				pip.close();
			} catch {}
		},
	};
}
