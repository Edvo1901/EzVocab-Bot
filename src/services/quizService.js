const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const config = require('../../config/config.json');
const vocabRepository = require('./db/vocabRepository');
const quizRepository = require('./db/quizRepository');
const {
	quizQuestionEmbed,
	quizFeedbackEmbed,
	quizTypingProgressEmbed,
	quizCompletedEmbed,
	errorEmbed,
} = require('./embedTemplates');

function answerRow(sessionId, questionIndex) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`quiz:answer:${sessionId}:${questionIndex}:A`)
			.setLabel('A')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`quiz:answer:${sessionId}:${questionIndex}:B`)
			.setLabel('B')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`quiz:answer:${sessionId}:${questionIndex}:C`)
			.setLabel('C')
			.setStyle(ButtonStyle.Primary),
		new ButtonBuilder()
			.setCustomId(`quiz:answer:${sessionId}:${questionIndex}:D`)
			.setLabel('D')
			.setStyle(ButtonStyle.Primary),
	);
}

function typingRow(sessionId, questionIndex) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId(`quiz:type:${sessionId}:${questionIndex}`)
			.setLabel('Type the answer')
			.setStyle(ButtonStyle.Success),
	);
}

async function createQuizSessionForChannel(channelId) {
	const active = await quizRepository.getActiveQuizSession(channelId);
	if (active) {
		return { sessionId: active.id, alreadyActive: true };
	}

	const questionCount = Number(config.quiz_question_count || 3);
	const typingRepetitions = Number(config.quiz_typing_repetitions || 3);
	const candidates = await vocabRepository.getRandomQuizCandidates(questionCount);
	if (candidates.length < questionCount) {
		return { error: `Not enough vocabulary with same-type distractors. Need at least ${questionCount}.` };
	}

	const sessionId = await quizRepository.createQuizSession(
		channelId,
		questionCount,
		typingRepetitions,
	);

	for (let i = 0; i < candidates.length; i += 1) {
		const candidate = candidates[i];
		const distractors = await vocabRepository.getDistractorsByType(candidate.type, candidate.id, 3);
		if (distractors.length < 3) {
			return { error: `Type "${candidate.type}" has insufficient distractors.` };
		}
		await quizRepository.addQuizSessionItem(sessionId, i, candidate, distractors);
	}

	return { sessionId, alreadyActive: false };
}

async function postCurrentQuestion(channel, sessionId) {
	const row = await quizRepository.getQuizSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return null;
	}

	const embed = quizQuestionEmbed(row, row);
	await channel.send({
		embeds: [embed],
		components: [answerRow(sessionId, row.current_question_index)],
	});
	return row;
}

async function handleAnswerInteraction(interaction, sessionId, questionIndex, option) {
	const row = await quizRepository.getQuizSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return interaction.reply({
			embeds: [errorEmbed('Quiz unavailable', 'This quiz is no longer active.')],
			flags: 64,
		});
	}

	if (row.phase !== 'mcq' || row.current_question_index !== Number(questionIndex)) {
		return interaction.reply({
			embeds: [errorEmbed('Step already moved', 'This quiz already advanced to another step.')],
			flags: 64,
		});
	}

	const selectedText = row[`option_${option.toLowerCase()}_text`];
	const isCorrect = await quizRepository.markMcqAnswered(
		sessionId,
		row.current_question_index,
		option,
	);
	await quizRepository.logQuizAttempt(
		sessionId,
		row.current_question_index,
		'mcq',
		isCorrect,
		option,
	);
	await quizRepository.setSessionPhase(sessionId, 'typing', 0);

	const feedback = quizFeedbackEmbed({
		isCorrect,
		selectedText,
		row,
	});

	return interaction.reply({
		embeds: [feedback],
		components: [typingRow(sessionId, row.current_question_index)],
		flags: 64,
	});
}

async function showTypingModal(interaction, sessionId, questionIndex) {
	const row = await quizRepository.getQuizSessionWithCurrentQuestion(sessionId);
	if (!row || row.status !== 'active') {
		return interaction.reply({
			embeds: [errorEmbed('Quiz unavailable', 'This quiz is no longer active.')],
			flags: 64,
		});
	}

	if (row.phase !== 'typing' || row.current_question_index !== Number(questionIndex)) {
		return interaction.reply({
			embeds: [errorEmbed('Wrong step', 'Typing is not available for this question anymore.')],
			flags: 64,
		});
	}

	const modal = new ModalBuilder()
		.setCustomId(`quiz:type:submit:${sessionId}:${questionIndex}`)
		.setTitle('Typing Practice');

	const input = new TextInputBuilder()
		.setCustomId('typed_answer')
		.setLabel('Type the correct word/sentence')
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setMaxLength(255);

	modal.addComponents(new ActionRowBuilder().addComponents(input));
	return interaction.showModal(modal);
}

async function handleTypingSubmit(interaction, sessionId, questionIndex) {
	const typedAnswer = interaction.fields.getTextInputValue('typed_answer');
	const row = await quizRepository.getQuizSessionWithCurrentQuestion(sessionId);

	if (!row || row.status !== 'active') {
		return interaction.reply({
			embeds: [errorEmbed('Quiz unavailable', 'This quiz is no longer active.')],
			flags: 64,
		});
	}

	if (row.phase !== 'typing' || row.current_question_index !== Number(questionIndex)) {
		return interaction.reply({
			embeds: [errorEmbed('Wrong step', 'This typing step is already completed.')],
			flags: 64,
		});
	}

	const isCorrect = quizRepository.isTypingAnswerCorrect(row.correct_text, typedAnswer);
	await quizRepository.logQuizAttempt(
		sessionId,
		row.current_question_index,
		'typing',
		isCorrect,
		typedAnswer,
	);

	if (!isCorrect) {
		return interaction.reply({
			embeds: [
				quizTypingProgressEmbed({
					correctText: row.correct_text,
					progress: row.typing_progress,
					target: row.typing_repetitions,
					isCorrect: false,
				}),
			],
			components: [typingRow(sessionId, row.current_question_index)],
			flags: 64,
		});
	}

	const progress = await quizRepository.incrementTypingProgress(sessionId);
	const target = row.typing_repetitions;

	if (progress < target) {
		return interaction.reply({
			embeds: [
				quizTypingProgressEmbed({
					correctText: row.correct_text,
					progress,
					target,
					isCorrect: true,
				}),
			],
			components: [typingRow(sessionId, row.current_question_index)],
			flags: 64,
		});
	}

	const advance = await quizRepository.advanceToNextQuestionOrComplete(sessionId);
	if (advance.completed) {
		const finalSession = await quizRepository.getQuizSessionWithCurrentQuestion(sessionId);
		const score = await getMcqScore(sessionId);
		await interaction.reply({
			embeds: [quizCompletedEmbed(score, finalSession.question_count)],
		});
		return null;
	}

	await interaction.reply({
		embeds: [
			quizTypingProgressEmbed({
				correctText: row.correct_text,
				progress: target,
				target,
				isCorrect: true,
			}),
		],
		flags: 64,
	});
	return postCurrentQuestion(interaction.channel, sessionId);
}

async function getMcqScore(sessionId) {
	const { getPool } = require('./db/sqlClient');
	const pool = await getPool();
	const result = await pool.request().input('session_id', sessionId).query(`
		SELECT COUNT(*) AS score
		FROM dbo.quiz_session_items
		WHERE session_id = @session_id
			AND mcq_is_correct = 1
	`);
	return result.recordset[0]?.score || 0;
}

module.exports = {
	createQuizSessionForChannel,
	postCurrentQuestion,
	handleAnswerInteraction,
	showTypingModal,
	handleTypingSubmit,
};
