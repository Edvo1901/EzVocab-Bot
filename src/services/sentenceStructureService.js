const { normalizeText } = require('../constants/vocab');
const { parseExamplesFromMultiline } = require('./tenseService');
const sentenceStructureRepository = require('./db/sentenceStructureRepository');

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

function normalizeName(name) {
	return normalizeText(name)
		.split(' ')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

async function addSentenceStructureEntry(payload) {
	const normalizedName = normalizeName(payload.name);
	if (!normalizedName) {
		return { error: 'Name is required.' };
	}
	if (!payload.structure?.trim()) {
		return { error: 'Structure pattern is required.' };
	}
	if (!payload.meaningNote?.trim()) {
		return { error: 'Meaning / note is required.' };
	}

	const duplicate = await sentenceStructureRepository.findDuplicate(normalizedName);
	if (duplicate) {
		return { duplicate };
	}

	const created = await sentenceStructureRepository.createSentenceStructureItem({
		name: normalizedName,
		structure: payload.structure,
		meaningNote: payload.meaningNote,
		examples: payload.examples || [],
	});
	return { item: created };
}

async function updateSentenceStructureEntry(id, payload) {
	const candidate = await sentenceStructureRepository.getSentenceStructureById(id);
	if (!candidate) {
		return { notFound: true };
	}

	const updatePayload = {};
	if (payload.name !== undefined && payload.name.trim()) {
		updatePayload.name = normalizeName(payload.name);
	}
	if (payload.structure !== undefined && payload.structure.trim()) {
		updatePayload.structure = payload.structure;
	}
	if (payload.meaningNote !== undefined && payload.meaningNote.trim()) {
		updatePayload.meaningNote = payload.meaningNote;
	}
	if (payload.examples !== undefined) {
		updatePayload.examples = payload.examples;
	}

	const finalName = updatePayload.name || candidate.name;
	const duplicate = await sentenceStructureRepository.findDuplicate(finalName);
	if (duplicate && duplicate.id !== candidate.id) {
		return { duplicate };
	}

	const updated = await sentenceStructureRepository.updateSentenceStructureItem(
		id,
		updatePayload,
	);
	return { item: updated };
}

async function importSentenceStructureJsonFromAttachment(attachmentUrl) {
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
			const meaningNote =
				entry.meaning_note != null && entry.meaning_note !== ''
					? entry.meaning_note
					: entry.meaning != null && entry.meaning !== ''
						? entry.meaning
						: '';
			const result = await addSentenceStructureEntry({
				name: entry.name || '',
				structure: entry.structure || '',
				meaningNote,
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
	normalizeName,
	addSentenceStructureEntry,
	updateSentenceStructureEntry,
	importSentenceStructureJsonFromAttachment,
};
