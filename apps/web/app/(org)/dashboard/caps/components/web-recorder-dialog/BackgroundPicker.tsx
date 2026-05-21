"use client";

import { Upload } from "lucide-react";
import { useId, useRef } from "react";
import type { BackgroundMode } from "./background-processor";
import { useBackgroundMode } from "./useBackgroundMode";

const TEMPLATES: { id: string; label: string; url: string }[] = [
	{ id: "framecast-purple", label: "Purple", url: "/backgrounds/framecast-purple.svg" },
	{ id: "framecast-dark", label: "Dark", url: "/backgrounds/framecast-dark.svg" },
	{ id: "office", label: "Warm", url: "/backgrounds/office.svg" },
	{ id: "sky", label: "Sky", url: "/backgrounds/sky.svg" },
	{ id: "studio-warm", label: "Studio", url: "/backgrounds/studio-warm.svg" },
	{ id: "green-screen", label: "Green", url: "/backgrounds/green-screen.svg" },
];

type Tab = "none" | "blur" | "color" | "image";

function tabFromMode(mode: BackgroundMode): Tab {
	return mode.type;
}

export const BackgroundPicker = () => {
	const { mode, setMode } = useBackgroundMode();
	const colorInputId = useId();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const activeTab = tabFromMode(mode);
	const currentColor = mode.type === "color" ? mode.color : "#521F88";
	const customImage = mode.type === "image" ? mode.url : null;
	const isTemplate = TEMPLATES.some((t) => t.url === customImage);
	const isCustomImage = customImage !== null && !isTemplate;

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			if (typeof reader.result === "string") {
				setMode({ type: "image", url: reader.result });
			}
		};
		reader.readAsDataURL(file);
		e.target.value = "";
	};

	const tabs: { id: Tab; label: string }[] = [
		{ id: "none", label: "None" },
		{ id: "blur", label: "Blur" },
		{ id: "color", label: "Color" },
		{ id: "image", label: "Image" },
	];

	const onTabClick = (tab: Tab) => {
		switch (tab) {
			case "none":
				setMode({ type: "none" });
				break;
			case "blur":
				setMode({ type: "blur", amount: 18 });
				break;
			case "color":
				setMode({ type: "color", color: currentColor });
				break;
			case "image":
				if (customImage) return;
				setMode({ type: "image", url: TEMPLATES[0]!.url });
				break;
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-baseline justify-between">
				<h3 className="text-sm font-medium text-gray-12">Background</h3>
				<p className="text-[11px] text-gray-10">Applied to your camera</p>
			</div>

			<div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-3 p-1">
				{tabs.map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => onTabClick(t.id)}
						className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
							activeTab === t.id
								? "bg-gray-1 text-gray-12 shadow-sm dark:bg-gray-2"
								: "text-gray-10 hover:text-gray-12"
						}`}
					>
						{t.label}
					</button>
				))}
			</div>

			{activeTab === "blur" && (
				<p className="text-xs text-gray-10">
					Subtle blur applied to the background behind you.
				</p>
			)}

			{activeTab === "color" && (
				<div className="flex items-center gap-3">
					<label
						htmlFor={colorInputId}
						className="relative inline-block h-9 w-12 cursor-pointer overflow-hidden rounded-md ring-1 ring-gray-5"
						style={{ backgroundColor: currentColor }}
					>
						<input
							id={colorInputId}
							type="color"
							value={currentColor}
							onChange={(e) =>
								setMode({ type: "color", color: e.target.value })
							}
							className="absolute inset-0 size-full cursor-pointer opacity-0"
						/>
					</label>
					<span className="font-mono text-xs text-gray-11">
						{currentColor.toUpperCase()}
					</span>
				</div>
			)}

			{activeTab === "image" && (
				<div className="flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						className={`grid size-10 place-items-center rounded-md transition-colors ${
							isCustomImage
								? "bg-primary/10 ring-2 ring-primary"
								: "bg-gray-3 ring-1 ring-gray-4 hover:bg-gray-4"
						}`}
						title={isCustomImage ? "Replace upload" : "Upload your own"}
					>
						<Upload className="size-3.5 text-gray-12" />
					</button>
					{TEMPLATES.map((tpl) => {
						const active = customImage === tpl.url;
						return (
							<button
								key={tpl.id}
								type="button"
								onClick={() => setMode({ type: "image", url: tpl.url })}
								className={`relative size-10 overflow-hidden rounded-md transition-all ${
									active ? "ring-2 ring-primary" : "ring-1 ring-gray-4 hover:ring-gray-6"
								}`}
								title={tpl.label}
								aria-label={tpl.label}
							>
								{/* biome-ignore lint/performance/noImgElement: thumbnail preview */}
								<img
									src={tpl.url}
									alt=""
									className="absolute inset-0 size-full object-cover"
								/>
							</button>
						);
					})}
				</div>
			)}

			<input
				ref={fileInputRef}
				type="file"
				accept="image/png,image/jpeg,image/webp,image/svg+xml"
				className="hidden"
				onChange={handleFile}
			/>
		</div>
	);
};
