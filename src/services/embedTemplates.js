const config = require('../../config/config.json');
const { EMBED_COLORS } = require('../constants/vocab');
const { createEmbed } = require('../utils/embedBuilder');

function getFooter(suffix = '') {
	const base = `${config.bot_name2 || 'EzVocab'} • ${config.timezone || 'Australia/Adelaide'}`;
	return suffix ? `${base} • ${suffix}` : base;
}

function formatWordWithId(item) {
	return `${item.text} (ID: ${item.id})`;
}

function formatExamples(examples) {
	if (!examples || examples.length === 0) {
		return 'No example yet.';
	}
	return examples.map((example, index) => `${index + 1}. ${example}`).join('\n');
}

function dailyWordEmbed(item) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: 'Daily Vocabulary',
		description: 'Keep going - small steps daily.',
		fields: [
			{ name: 'Word', value: formatWordWithId(item) },
			{ name: 'Type', value: item.type, inline: true },
			{ name: 'Meaning (VI)', value: item.viDefinition },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter('Daily'),
	});
}

function vocabDetailEmbed(item, title = 'Word Detail', color = EMBED_COLORS.info) {
	return createEmbed({
		color,
		titleText: title,
		fields: [
			{ name: 'Word', value: formatWordWithId(item) },
			{ name: 'Type', value: item.type, inline: true },
			{ name: 'Meaning (VI)', value: item.viDefinition },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter(`ID: ${item.id}`),
	});
}

function listEmbed(title, lines) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: title,
		description: lines.length > 0 ? lines.join('\n') : 'No data available.',
		footerText: getFooter(),
	});
}

function successEmbed(title, description) {
	return createEmbed({
		color: EMBED_COLORS.success,
		titleText: title,
		description,
		footerText: getFooter(),
	});
}

function warningEmbed(title, description) {
	return createEmbed({
		color: EMBED_COLORS.warning,
		titleText: title,
		description,
		footerText: getFooter(),
	});
}

function errorEmbed(title, description) {
	return createEmbed({
		color: EMBED_COLORS.error,
		titleText: title,
		description,
		footerText: getFooter(),
	});
}

function quizQuestionEmbed(session, row) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: `Daily Quiz • Question ${row.question_order + 1}/${session.question_count}`,
		description: `Choose the correct English ${row.correct_type} for this Vietnamese meaning.`,
		fields: [
			{ name: 'Meaning (VI)', value: row.prompt_vi },
			{
				name: 'Options',
				value: [
					`A. ${row.option_a_text}`,
					`B. ${row.option_b_text}`,
					`C. ${row.option_c_text}`,
					`D. ${row.option_d_text}`,
				].join('\n'),
			},
		],
		footerText: getFooter('Quiz'),
	});
}

function quizFeedbackEmbed({ isCorrect, selectedText, row }) {
	return createEmbed({
		color: isCorrect ? EMBED_COLORS.success : EMBED_COLORS.warning,
		titleText: isCorrect ? 'Correct' : 'Not Quite',
		description: 'Now type the correct answer 3 times.',
		fields: [
			...(isCorrect
				? []
				: [{ name: 'Your Choice', value: selectedText || 'Unknown', inline: true }]),
			{
				name: 'Correct Answer',
				value: `${row.correct_text} (ID: ${row.correct_vocab_id})`,
				inline: true,
			},
			{ name: 'Meaning (VI)', value: row.correct_vi_definition },
		],
		footerText: getFooter('Quiz'),
	});
}

function quizTypingProgressEmbed({ correctText, progress, target, isCorrect }) {
	return createEmbed({
		color: isCorrect ? EMBED_COLORS.success : EMBED_COLORS.warning,
		titleText: 'Typing Practice',
		description: isCorrect
			? 'Good. Keep going.'
			: 'Not matched yet. Check spelling and spaces.',
		fields: [
			{ name: 'Target', value: correctText },
			{ name: 'Progress', value: `${progress}/${target}` },
		],
		footerText: getFooter('Quiz'),
	});
}

function quizCompletedEmbed(score, questionCount) {
	return createEmbed({
		color: EMBED_COLORS.success,
		titleText: 'Daily Quiz Complete',
		description: 'Nice work. Consistency beats intensity.',
		fields: [{ name: 'Score', value: `${score}/${questionCount}`, inline: true }],
		footerText: getFooter('Quiz'),
	});
}

function formatTenseWithId(item) {
	return `${item.name} (ID: ${item.id})`;
}

function tenseDetailEmbed(item, title = 'Tense Detail', color = EMBED_COLORS.info) {
	return createEmbed({
		color,
		titleText: title,
		fields: [
			{ name: 'Tense', value: formatTenseWithId(item) },
			{ name: 'Sentence Structure', value: item.structure },
			{ name: 'When to use', value: item.usageNote },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter(`ID: ${item.id}`),
	});
}

function dailyTenseEmbed(item) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: 'Daily Tense',
		description: 'One tense a day keeps grammar confusion away.',
		fields: [
			{ name: 'Tense', value: formatTenseWithId(item) },
			{ name: 'Sentence Structure', value: item.structure },
			{ name: 'When to use', value: item.usageNote },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter('Daily Tense'),
	});
}

function formatSentenceStructureWithId(item) {
	return `${item.name} (ID: ${item.id})`;
}

function sentenceStructureDetailEmbed(
	item,
	title = 'Sentence Structure Detail',
	color = EMBED_COLORS.info,
) {
	return createEmbed({
		color,
		titleText: title,
		fields: [
			{ name: 'Pattern', value: formatSentenceStructureWithId(item) },
			{ name: 'Sentence structure', value: item.structure },
			{ name: 'Meaning', value: item.meaningNote },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter(`ID: ${item.id}`),
	});
}

function dailySentenceStructureEmbed(item) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: 'Sentence Structure',
		description: 'Patterns like conditionals, wish forms, and more.',
		fields: [
			{ name: 'Pattern', value: formatSentenceStructureWithId(item) },
			{ name: 'Sentence structure', value: item.structure },
			{ name: 'Meaning', value: item.meaningNote },
			{ name: 'Examples', value: formatExamples(item.examples) },
		],
		footerText: getFooter('Daily Sentence Structure'),
	});
}

function tenseQuizQuestionEmbed(row) {
	return createEmbed({
		color: EMBED_COLORS.info,
		titleText: `Tense Quiz • Question ${row.currentQuestionIndex + 1}/${row.questionCount}`,
		description: 'Pick the tense that best matches the sentence.',
		fields: [
			{ name: 'Sentence', value: row.sentence },
			{
				name: 'Tense options',
				value: [`A. ${row.optionA}`, `B. ${row.optionB}`, `C. ${row.optionC}`, `D. ${row.optionD}`].join(
					'\n',
				),
			},
		],
		footerText: getFooter('Tense Quiz'),
	});
}

function tenseQuizFeedbackEmbed({ isCorrect, selectedLabel, correctLabel, explanation }) {
	const fields = [
		{ name: 'Your choice', value: selectedLabel || '—', inline: true },
		{ name: 'Correct tense', value: correctLabel || '—', inline: true },
		{ name: 'Why', value: explanation || '—' },
	];
	return createEmbed({
		color: isCorrect ? EMBED_COLORS.success : EMBED_COLORS.warning,
		titleText: isCorrect ? 'Correct' : 'Not quite',
		description: isCorrect ? 'Nice.' : 'Review the explanation below.',
		fields,
		footerText: getFooter('Tense Quiz'),
	});
}

function tenseQuizCompletedEmbed(score, questionCount) {
	return createEmbed({
		color: EMBED_COLORS.success,
		titleText: 'Tense Quiz Complete',
		description: 'Session finished.',
		fields: [{ name: 'Score', value: `${score}/${questionCount}`, inline: true }],
		footerText: getFooter('Tense Quiz'),
	});
}

module.exports = {
	dailyWordEmbed,
	vocabDetailEmbed,
	listEmbed,
	successEmbed,
	warningEmbed,
	errorEmbed,
	quizQuestionEmbed,
	quizFeedbackEmbed,
	quizTypingProgressEmbed,
	quizCompletedEmbed,
	formatWordWithId,
	formatTenseWithId,
	tenseDetailEmbed,
	dailyTenseEmbed,
	formatSentenceStructureWithId,
	sentenceStructureDetailEmbed,
	dailySentenceStructureEmbed,
	tenseQuizQuestionEmbed,
	tenseQuizFeedbackEmbed,
	tenseQuizCompletedEmbed,
};
