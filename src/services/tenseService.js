const { normalizeText } = require('../constants/vocab');
const tenseRepository = require('./db/tenseRepository');

async function fetchJson(url) {
	if (typeof globalThis.fetch === 'function') {
		const response = await globalThis.fetch(url);
		if (!response.ok) {
			throw new Error(`Failed to fetch attachment: ${response.status}`);
		}
		return response.json();
	}

	const dynamicFetch = await import('node-fetch');
	const response = await dynamicFetch.default(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch attachment: ${response.status}`);
	}
	return response.json();
}

function parseExamplesFromMultiline(value) {
	if (!value) return [];
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function normalizeTenseName(name) {
	return normalizeText(name)
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

async function addTenseEntry(payload) {
	const normalizedName = normalizeTenseName(payload.name);
	if (!normalizedName) {
		return { error: 'Tense name is required.' };
	}
	if (!payload.structure?.trim()) {
		return { error: 'Sentence structure is required.' };
	}
	if (!payload.usageNote?.trim()) {
		return { error: 'Usage note is required.' };
	}

	const duplicate = await tenseRepository.findDuplicate(normalizedName);
	if (duplicate) {
		return { duplicate };
	}

	const created = await tenseRepository.createTenseItem({
		name: normalizedName,
		structure: payload.structure,
		usageNote: payload.usageNote,
		examples: payload.examples || [],
	});
	return { item: created };
}

async function updateTenseEntry(id, payload) {
	const candidate = await tenseRepository.getTenseById(id);
	if (!candidate) {
		return { notFound: true };
	}

	const updatePayload = {};
	if (payload.name !== undefined && payload.name.trim()) {
		updatePayload.name = normalizeTenseName(payload.name);
	}
	if (payload.structure !== undefined && payload.structure.trim()) {
		updatePayload.structure = payload.structure;
	}
	if (payload.usageNote !== undefined && payload.usageNote.trim()) {
		updatePayload.usageNote = payload.usageNote;
	}
	if (payload.examples !== undefined) {
		updatePayload.examples = payload.examples;
	}

	const finalName = updatePayload.name || candidate.name;
	const duplicate = await tenseRepository.findDuplicate(finalName);
	if (duplicate && duplicate.id !== candidate.id) {
		return { duplicate };
	}

	const updated = await tenseRepository.updateTenseItem(id, updatePayload);
	return { item: updated };
}

async function importTenseJsonFromAttachment(attachmentUrl) {
	const json = await fetchJson(attachmentUrl);
	if (!Array.isArray(json)) {
		throw new Error('JSON must be an array of entries.');
	}

	const summary = {
		inserted: 0,
		skipped: 0,
		failed: 0,
		errors: [],
	};

	for (const entry of json) {
		try {
			const examples = Array.isArray(entry.examples)
				? entry.examples
				: parseExamplesFromMultiline(entry.examples || '');
			const result = await addTenseEntry({
				name: entry.name || '',
				structure: entry.structure || '',
				usageNote: entry.usage_note || entry.usageNote || '',
				examples,
			});
			if (result.item) {
				summary.inserted += 1;
			} else if (result.duplicate) {
				summary.skipped += 1;
			} else {
				summary.failed += 1;
			}
		} catch (error) {
			summary.failed += 1;
			if (summary.errors.length < 3) {
				summary.errors.push(error.message);
			}
		}
	}

	return summary;
}

module.exports = {
	parseExamplesFromMultiline,
	normalizeTenseName,
	addTenseEntry,
	updateTenseEntry,
	importTenseJsonFromAttachment,
};
