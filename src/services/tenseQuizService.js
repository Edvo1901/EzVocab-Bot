const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const config = require('../../config/config.json');
const tenseQuizRepository = require('./db/tenseQuizRepository');
const {
	tenseQuizQuestionEmbed,
	tenseQuizFeedbackEmbed,
	tenseQuizCompletedEmbed,
	errorEmbed,
	successEmbed,
} = require('./embedTemplates');

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

function indexToCorrectLetter(index) {
	const i = Number(index);
	if (!Number.isInteger(i) || i < 0 || i > 3) {
		return null;
	}
	return ['A', 'B', 'C', 'D'][i];
}

function validateQuizEntry(entry) {
	const sentence = String(entry.sentence || '').trim();
	const explanation = String(entry.explanation || '').trim();
	const options = entry.options;

	if (!sentence) {
		return { error: 'Each entry needs a non-empty sentence.' };
	}
	if (!explanation) {
		return { error: 'Each entry needs a non-empty explanation.' };
	}
	if (!Array.isArray(options) || options.length !== 4) {
		return { error: 'Each entry needs options as an array of exactly 4 tense labels.' };
	}

	const trimmed = options.map((o) => String(o || '').trim());
	if (trimmed.some((t) => !t)) {
		return { error: 'All four tense options must be non-empty strings.' };
	}

	const letter = indexToCorrectLetter(entry.correct_index ?? entry.correctIndex);
	if (!letter) {
		return { error: 'correct_index must be 0, 1, 2, or 3.' };
	}

	return {
		payload: {
			sentence,
			optionA: trimmed[0],
			optionB: trimmed[1],
			optionC: trimmed[2],
			optionD: trimmed[3],
			correctOption: letter,
			explanation,
		},
	};
}

async function importTenseQuizJsonFromAttachment(attachmentUrl) {
	const json = await fetchJson(attachmentUrl);
	if (!Array.isArray(json)) {
		throw new Error('JSON must be an array of tense quiz entries.');
	}

	const summary = { inserted: 0, failed: 0, errors: [] };

	for (const entry of json) {
		const validated = validateQuizEntry(entry);
		if (validated.error) {
			summary.failed += 1;
			if (summary.errors.length < 5) {
				summary.errors.push(validated.error);
			}
			continue;
		}

		try {
			await tenseQuizRepository.insertQuestion(validated.payload);
			summary.inserted += 1;
		} catch (error) {
			summary.failed += 1;
			if (summary.errors.length < 5) {
				summary.errors.push(error.message);
			}
		}
	}

	return summary;
}

function answerRow(sessionId, questionIndex) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`tense-quiz:answer:${sessionId}:${questionIndex}:A`)
			.setLabel('A')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`tense-quiz:answer:${sessionId}:${questionIndex}:B`)
			.setLabel('B')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`tense-quiz:answer:${sessionId}:${questionIndex}:C`)
			.setLabel('C')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`tense-quiz:answer:${sessionId}:${questionIndex}:D`)
			.setLabel('D')
			.setStyle(ButtonStyle.Primary),
	);
}

function nextRow(sessionId, label = 'Next question') {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`tense-quiz:next:${sessionId}`)
			.setLabel(label)
			.setStyle(ButtonStyle.Success),
	);
}

function optionLabel(row, letter) {
	const L = String(letter || '').toUpperCase();
	const map = { A: row.optionA, B: row.optionB, C: row.optionC, D: row.optionD };
	return map[L] || L;
}

async function createTenseQuizSessionForChannel(channelId) {
	const active = await tenseQuizRepository.getActiveSession(channelId);
	if (active) {
		return { sessionId: active.id, alreadyActive: true };
	}

	const questionCount = Number(config.tense_quiz_question_count || 3);
	const bankTotal = await tenseQuizRepository.countQuestions();
	if (bankTotal < questionCount) {
		return {
			error: `Not enough tense quiz questions in the bank. Need at least ${questionCount}, have ${bankTotal}.`,
		};
	}

	const picks = await tenseQuizRepository.getRandomQuestions(questionCount);
	if (picks.length < questionCount) {
		return { error: 'Could not load enough random questions from the bank.' };
	}

	const sessionId = await tenseQuizRepository.createSession(channelId, questionCount);
	for (let i = 0; i < picks.length; i += 1) {
		await tenseQuizRepository.addSessionItem(sessionId, i, picks[i]);
	}

	return { sessionId, alreadyActive: false };
}

async function postCurrentTenseQuestion(channel, sessionId) {
	const row = await tenseQuizRepository.getSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return null;
	}

	const embed = tenseQuizQuestionEmbed(row);
	await channel.send({
		embeds: [embed],
		components: [answerRow(sessionId, row.currentQuestionIndex)],
	});
	return row;
}

async function handleAnswerInteraction(interaction, sessionId, questionIndex, option) {
	const row = await tenseQuizRepository.getSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return interaction.reply({
			embeds: [errorEmbed('Tense quiz unavailable', 'This quiz is no longer active.')],
			flags: 64,
		});
	}

	if (row.phase !== 'mcq' || row.currentQuestionIndex !== Number(questionIndex)) {
		return interaction.reply({
			embeds: [errorEmbed('Wrong step', 'Answer the current question on the channel message.')],
			flags: 64,
		});
	}

	if (row.mcqAnswered) {
		return interaction.reply({
			embeds: [errorEmbed('Already answered', 'Use Next to continue.')],
			flags: 64,
		});
	}

	const selectedLetter = String(option || '').trim().toUpperCase().slice(0, 1);
	const isCorrectResult = await tenseQuizRepository.markMcqAnswered(
		sessionId,
		row.currentQuestionIndex,
		selectedLetter,
	);

	if (isCorrectResult === null) {
		return interaction.reply({
			embeds: [errorEmbed('Could not record answer', 'Try again or continue from the latest message.')],
			flags: 64,
		});
	}

	await tenseQuizRepository.logAttempt(
		sessionId,
		row.currentQuestionIndex,
		isCorrectResult,
		selectedLetter,
	);
	await tenseQuizRepository.setSessionPhase(sessionId, 'await_next');

	const selectedLabel = optionLabel(row, selectedLetter);
	const correctLabel = optionLabel(row, row.correctOption);
	const isLast = row.currentQuestionIndex >= row.questionCount - 1;
	const nextLabel = isLast ? 'Finish' : 'Next question';

	return interaction.reply({
		embeds: [
			tenseQuizFeedbackEmbed({
				isCorrect: isCorrectResult,
				selectedLabel,
				correctLabel,
				explanation: row.explanation,
			}),
		],
		components: [nextRow(sessionId, nextLabel)],
		flags: 64,
	});
}

async function handleNextInteraction(interaction, sessionId) {
	const row = await tenseQuizRepository.getSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return interaction.reply({
			embeds: [errorEmbed('Tense quiz unavailable', 'This quiz is no longer active.')],
			flags: 64,
		});
	}

	if (row.phase !== 'await_next') {
		return interaction.reply({
			embeds: [errorEmbed('Not ready', 'Answer the question first.')],
			flags: 64,
		});
	}

	const advance = await tenseQuizRepository.advanceAfterAwaitNext(sessionId);
	if (!advance.advanced) {
		return interaction.reply({
			embeds: [errorEmbed('Could not advance', 'This step may already have been used.')],
			flags: 64,
		});
	}

	const questionCount = row.questionCount;

	if (advance.completed) {
		const score = await tenseQuizRepository.getMcqScore(sessionId);
		await interaction.channel.send({
			embeds: [tenseQuizCompletedEmbed(score, questionCount)],
		});
		return interaction.reply({
			embeds: [
				successEmbed(
					'Tense quiz complete',
					`Score: ${score}/${questionCount}. Summary posted above.`,
				),
			],
			flags: 64,
		});
	}

	await postCurrentTenseQuestion(interaction.channel, sessionId);
	const updated = await tenseQuizRepository.getSessionWithCurrentQuestion(sessionId);
	const displayNum = updated ? updated.currentQuestionIndex + 1 : questionCount;
	return interaction.reply({
		embeds: [
			successEmbed(
				'Next question',
				`Question ${displayNum}/${questionCount} posted in this channel.`,
			),
		],
		flags: 64,
	});
}

module.exports = {
	importTenseQuizJsonFromAttachment,
	createTenseQuizSessionForChannel,
	postCurrentTenseQuestion,
	handleAnswerInteraction,
	handleNextInteraction,
};
