const { ALLOWED_TYPES, normalizeText } = require('../constants/vocab');
const vocabRepository = require('./db/vocabRepository');

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

function normalizeType(type) {
	const normalized = normalizeText(type).replace(/\s+/g, '_');
	const aliases = {
		n: 'noun',
		nouns: 'noun',
		v: 'verb',
		verbs: 'verb',
		adj: 'adjective',
		adjectives: 'adjective',
		adv: 'adverb',
		adverbs: 'adverb',
		sent: 'sentence',
		sentences: 'sentence',
		phrase: 'sentence',
	};

	return aliases[normalized] || normalized;
}

function validateType(type) {
	return ALLOWED_TYPES.includes(normalizeType(type));
}

async function addVocabEntry(payload) {
	const normalizedType = normalizeType(payload.type);
	if (!validateType(normalizedType)) {
		return { error: `Invalid type "${payload.type}".` };
	}

	const duplicate = await vocabRepository.findDuplicate(payload.text, normalizedType);
	if (duplicate) {
		return { duplicate };
	}

	const created = await vocabRepository.createVocabItem({
		text: payload.text,
		type: normalizedType,
		viDefinition: payload.viDefinition,
		examples: payload.examples || [],
	});
	return { item: created };
}

async function updateVocabEntry(id, payload) {
	const candidate = await vocabRepository.getVocabById(id);
	if (!candidate) {
		return { notFound: true };
	}

	const updatePayload = {};
	if (payload.text !== undefined && payload.text.trim()) {
		updatePayload.text = payload.text;
	}
	if (payload.type !== undefined && payload.type.trim()) {
		const normalizedType = normalizeType(payload.type);
		if (!validateType(normalizedType)) {
			return { error: `Invalid type "${payload.type}".` };
		}
		updatePayload.type = normalizedType;
	}
	if (payload.viDefinition !== undefined && payload.viDefinition.trim()) {
		updatePayload.viDefinition = payload.viDefinition;
	}
	if (payload.examples !== undefined) {
		updatePayload.examples = payload.examples;
	}

	const finalText = updatePayload.text || candidate.text;
	const finalType = updatePayload.type || candidate.type;
	const duplicate = await vocabRepository.findDuplicate(finalText, finalType);
	if (duplicate && duplicate.id !== candidate.id) {
		return { duplicate };
	}

	const updated = await vocabRepository.updateVocabItem(id, updatePayload);
	return { item: updated };
}

async function importVocabJsonFromAttachment(attachmentUrl) {
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
			const result = await addVocabEntry({
				text: entry.text || '',
				type: entry.type || '',
				viDefinition: entry.vi_definition || entry.viDefinition || '',
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
	normalizeType,
	validateType,
	addVocabEntry,
	updateVocabEntry,
	importVocabJsonFromAttachment,
};
