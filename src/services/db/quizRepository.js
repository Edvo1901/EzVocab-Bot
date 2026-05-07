const { randomUUID } = require('uuid');
const { getPool, sql } = require('./sqlClient');
const { normalizeText } = require('../../constants/vocab');

function shuffle(items) {
	const arr = [...items];
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

async function getActiveQuizSession(channelId) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('channel_id', sql.NVarChar(64), channelId)
		.query(`
		SELECT TOP 1 *
		FROM dbo.quiz_sessions
		WHERE channel_id = @channel_id
			AND status = 'active'
		ORDER BY created_at DESC
	`);

	return result.recordset[0] || null;
}

async function createQuizSession(channelId, questionCount, typingRepetitions) {
	const sessionId = randomUUID();
	const pool = await getPool();
	await pool
		.request()
		.input('id', sql.UniqueIdentifier, sessionId)
		.input('channel_id', sql.NVarChar(64), channelId)
		.input('question_count', sql.Int, questionCount)
		.input('typing_repetitions', sql.Int, typingRepetitions)
		.query(`
		INSERT INTO dbo.quiz_sessions (
			id,
			channel_id,
			status,
			current_question_index,
			phase,
			typing_progress,
			question_count,
			typing_repetitions
		)
		VALUES (
			@id,
			@channel_id,
			'active',
			0,
			'mcq',
			0,
			@question_count,
			@typing_repetitions
		)
	`);

	return sessionId;
}

async function addQuizSessionItem(sessionId, questionOrder, correctItem, distractors) {
	const options = shuffle([
		{ option: 'A', id: correctItem.id, isCorrect: true },
		...distractors.map((item) => ({ option: null, id: item.id, isCorrect: false })),
	]).map((item, index) => ({
		...item,
		option: ['A', 'B', 'C', 'D'][index],
	}));

	const correct = options.find((item) => item.isCorrect);

	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('vocab_id', sql.Int, correctItem.id)
		.input('prompt_vi', sql.NVarChar(sql.MAX), correctItem.viDefinition)
		.input('option_a_id', sql.Int, options.find((item) => item.option === 'A').id)
		.input('option_b_id', sql.Int, options.find((item) => item.option === 'B').id)
		.input('option_c_id', sql.Int, options.find((item) => item.option === 'C').id)
		.input('option_d_id', sql.Int, options.find((item) => item.option === 'D').id)
		.input('correct_option', sql.Char(1), correct.option)
		.query(`
		INSERT INTO dbo.quiz_session_items (
			session_id,
			question_order,
			vocab_id,
			prompt_vi,
			option_a_id,
			option_b_id,
			option_c_id,
			option_d_id,
			correct_option
		)
		VALUES (
			@session_id,
			@question_order,
			@vocab_id,
			@prompt_vi,
			@option_a_id,
			@option_b_id,
			@option_c_id,
			@option_d_id,
			@correct_option
		)
	`);
}

async function getQuizSessionWithCurrentQuestion(sessionId) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.query(`
		SELECT
			s.*,
			i.id AS item_id,
			i.question_order,
			i.prompt_vi,
			i.correct_option,
			i.mcq_answered,
			i.mcq_is_correct,
			i.answered_option,
			cv.id AS correct_vocab_id,
			cv.[text] AS correct_text,
			cv.[type] AS correct_type,
			cv.vi_definition AS correct_vi_definition,
			cv.examples_json AS correct_examples_json,
			oa.id AS option_a_vocab_id,
			oa.[text] AS option_a_text,
			ob.id AS option_b_vocab_id,
			ob.[text] AS option_b_text,
			oc.id AS option_c_vocab_id,
			oc.[text] AS option_c_text,
			od.id AS option_d_vocab_id,
			od.[text] AS option_d_text
		FROM dbo.quiz_sessions s
		LEFT JOIN dbo.quiz_session_items i
			ON i.session_id = s.id
			AND i.question_order = s.current_question_index
		LEFT JOIN dbo.vocab_items cv ON cv.id = i.vocab_id
		LEFT JOIN dbo.vocab_items oa ON oa.id = i.option_a_id
		LEFT JOIN dbo.vocab_items ob ON ob.id = i.option_b_id
		LEFT JOIN dbo.vocab_items oc ON oc.id = i.option_c_id
		LEFT JOIN dbo.vocab_items od ON od.id = i.option_d_id
		WHERE s.id = @session_id
	`);

	return result.recordset[0] || null;
}

async function markMcqAnswered(sessionId, questionOrder, selectedOption) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('selected_option', sql.Char(1), selectedOption)
		.query(`
		UPDATE dbo.quiz_session_items
		SET mcq_answered = 1,
			answered_option = @selected_option,
			mcq_is_correct = CASE WHEN correct_option = @selected_option THEN 1 ELSE 0 END
		OUTPUT inserted.mcq_is_correct
		WHERE session_id = @session_id
			AND question_order = @question_order
	`);

	return result.recordset[0] ? Boolean(result.recordset[0].mcq_is_correct) : false;
}

async function setSessionPhase(sessionId, phase, typingProgress = 0) {
	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('phase', sql.NVarChar(20), phase)
		.input('typing_progress', sql.Int, typingProgress)
		.query(`
		UPDATE dbo.quiz_sessions
		SET phase = @phase,
			typing_progress = @typing_progress
		WHERE id = @session_id
	`);
}

async function incrementTypingProgress(sessionId) {
	const pool = await getPool();
	const result = await pool.request().input('session_id', sql.UniqueIdentifier, sessionId)
		.query(`
		UPDATE dbo.quiz_sessions
		SET typing_progress = typing_progress + 1
		OUTPUT inserted.typing_progress
		WHERE id = @session_id
	`);

	return result.recordset[0]?.typing_progress || 0;
}

async function advanceToNextQuestionOrComplete(sessionId) {
	const pool = await getPool();
	const result = await pool.request().input('session_id', sql.UniqueIdentifier, sessionId)
		.query(`
		UPDATE dbo.quiz_sessions
		SET
			current_question_index = current_question_index + 1,
			phase = 'mcq',
			typing_progress = 0
		OUTPUT inserted.current_question_index, inserted.question_count
		WHERE id = @session_id
	`);

	const row = result.recordset[0];
	if (!row) {
		return { completed: false };
	}

	if (row.current_question_index >= row.question_count) {
		await completeSession(sessionId);
		return { completed: true };
	}

	return { completed: false };
}

async function completeSession(sessionId) {
	const pool = await getPool();
	await pool.request().input('session_id', sql.UniqueIdentifier, sessionId).query(`
		UPDATE dbo.quiz_sessions
		SET status = 'completed',
			completed_at = SYSUTCDATETIME()
		WHERE id = @session_id
	`);
}

async function logQuizAttempt(sessionId, questionOrder, attemptType, isCorrect, userInput) {
	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('attempt_type', sql.NVarChar(20), attemptType)
		.input('is_correct', sql.Bit, isCorrect)
		.input('user_input', sql.NVarChar(500), userInput || null)
		.query(`
		INSERT INTO dbo.quiz_attempts (
			session_id,
			question_order,
			attempt_type,
			is_correct,
			user_input
		)
		VALUES (
			@session_id,
			@question_order,
			@attempt_type,
			@is_correct,
			@user_input
		)
	`);
}

function isTypingAnswerCorrect(actualAnswer, userInput) {
	return normalizeText(actualAnswer) === normalizeText(userInput);
}

module.exports = {
	getActiveQuizSession,
	createQuizSession,
	addQuizSessionItem,
	getQuizSessionWithCurrentQuestion,
	markMcqAnswered,
	setSessionPhase,
	incrementTypingProgress,
	advanceToNextQuestionOrComplete,
	completeSession,
	logQuizAttempt,
	isTypingAnswerCorrect,
};
