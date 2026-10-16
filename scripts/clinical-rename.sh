#!/usr/bin/env bash
set -eu

echo "Phase 1: @cap/ -> @framecast/ across all source files"
cd "$(dirname "$0")/.."

find apps packages crates scripts .github \
	-type f \
	\( -name "*.ts" -o -name "*.tsx" -o -name "*.rs" -o -name "*.toml" \
	   -o -name "*.json" -o -name "*.js" -o -name "*.mjs" -o -name "*.cjs" \
	   -o -name "*.yaml" -o -name "*.yml" -o -name "*.md" \) \
	-not -path "*/node_modules/*" \
	-not -path "*/target/*" \
	-not -path "*/.next/*" \
	-not -path "*/dist/*" \
	-not -path "*/.turbo/*" \
	-not -path "*/.output/*" \
	-print0 2>/dev/null \
	| xargs -0 sed -i 's|@cap/|@framecast/|g'

echo "Phase 2: root-level files"
for f in package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json CLAUDE.md; do
	if [ -f "$f" ]; then
		sed -i 's|@cap/|@framecast/|g' "$f"
	fi
done

echo "Phase 3: Rust crate rename cap-desktop -> framecast-desktop, cap_desktop_lib -> framecast_desktop_lib"
find apps packages crates scripts .github \
	-type f \
	\( -name "*.rs" -o -name "*.toml" -o -name "*.ts" -o -name "*.tsx" \
	   -o -name "*.js" -o -name "*.mjs" -o -name "*.cjs" -o -name "*.json" \
	   -o -name "*.yaml" -o -name "*.yml" \) \
	-not -path "*/node_modules/*" \
	-not -path "*/target/*" \
	-not -path "*/.next/*" \
	-not -path "*/dist/*" \
	-not -path "*/.turbo/*" \
	-not -path "*/.output/*" \
	-print0 2>/dev/null \
	| xargs -0 sed -i -e 's|cap_desktop_lib|framecast_desktop_lib|g' -e 's|cap-desktop|framecast-desktop|g'

echo "Done. Verifying no stragglers in source."
remaining_cap=$(grep -rln "@cap/" --include="*.ts" --include="*.tsx" --include="*.rs" --include="*.toml" --include="*.json" --include="*.js" --include="*.mjs" apps packages crates scripts .github 2>/dev/null | wc -l)
remaining_crate=$(grep -rln "cap-desktop\|cap_desktop_lib" --include="*.ts" --include="*.tsx" --include="*.rs" --include="*.toml" --include="*.js" --include="*.mjs" apps packages crates scripts .github 2>/dev/null | wc -l)
echo "Remaining @cap/ files: $remaining_cap"
echo "Remaining cap-desktop/cap_desktop_lib files: $remaining_crate"
