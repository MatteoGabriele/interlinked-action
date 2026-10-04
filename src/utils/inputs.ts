export function readInput(name: string) {
	const envName = `INPUT_${name.replace(/ /g, "_").toUpperCase()}`;
	return (process.env[envName] ?? "").trim();
}

export function readBooleanInput(name: string) {
	return readInput(name) === "true";
}

/** Accepts a JSON array or a comma-separated string. */
export function readListInput(name: string) {
	const rawValue = readInput(name);
	if (!rawValue) {
		return [];
	}

	return parseList(rawValue)
		.map((item) => String(item).trim().toLowerCase())
		.filter(Boolean);
}

function parseList(rawValue: string): unknown[] {
	try {
		const parsed = JSON.parse(rawValue);
		return Array.isArray(parsed) ? parsed : rawValue.split(",");
	} catch {
		return rawValue.split(",");
	}
}
