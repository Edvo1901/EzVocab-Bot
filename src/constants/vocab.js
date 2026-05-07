const ALLOWED_TYPES = [
	'noun',
	'verb',
	'adjective',
	'adverb',
	'sentence',
	'phrasal_verb',
	'idiom',
];

const EMBED_COLORS = {
	info: '#5865F2',
	success: '#57F287',
	warning: '#FEE75C',
	error: '#ED4245',
};

function normalizeText(value) {
	return String(value || '').trim().toLowerCase();
}

module.exports = {
	ALLOWED_TYPES,
	EMBED_COLORS,
	normalizeText,
};
