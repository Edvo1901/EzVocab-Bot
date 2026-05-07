const { randomUUID } = require('crypto');
const { getPool, sql } = require('./sqlClient');

function mapBankRow(row) {
	return {
		id: row.id,
		sentence: row.sentence,
		optionA: row.option_a,
		optionB: row.option_b,
		optionC: row.option_c,
		optionD: row.option_d,
		correctOption: String(row.correct_option || '')
			.trim()
			.toUpperCase()
			.slice(0, 1),
		explanation: row.explanation,
	};
}

async function countQuestions() {
	const pool = await getPool();
	const result = await pool.request().query(`SELECT COUNT(*) AS cnt FROM dbo.tense_quiz_questions`);
	return result.recordset[0]?.cnt || 0;
}

async function getRandomQuestions(limit) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('limit', sql.Int, limit)
		.query(`
		SELECT TOP (@limit) *
		FROM dbo.tense_quiz_questions
		ORDER BY NEWID()
	`);
	return result.recordset.map(mapBankRow);
}

async function insertQuestion(payload) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('sentence', sql.NVarChar(1000), payload.sentence)
		.input('option_a', sql.NVarChar(255), payload.optionA)
		.input('option_b', sql.NVarChar(255), payload.optionB)
		.input('option_c', sql.NVarChar(255), payload.optionC)
		.input('option_d', sql.NVarChar(255), payload.optionD)
		.input('correct_option', sql.Char(1), payload.correctOption)
		.input('explanation', sql.NVarChar(sql.MAX), payload.explanation)
		.query(`
		INSERT INTO dbo.tense_quiz_questions (
			sentence, option_a, option_b, option_c, option_d, correct_option, explanation, updated_at
		)
		OUTPUT inserted.*
		VALUES (@sentence, @option_a, @option_b, @option_c, @option_d, @correct_option, @explanation, SYSUTCDATETIME())
	`);
	return mapBankRow(result.recordset[0]);
}

async function getActiveSession(channelId) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('channel_id', sql.NVarChar(64), channelId)
		.query(`
		SELECT TOP 1 *
		FROM dbo.tense_quiz_sessions
		WHERE channel_id = @channel_id AND status = 'active'
		ORDER BY created_at DESC
	`);
	return result.recordset[0] || null;
}

async function createSession(channelId, questionCount) {
	const sessionId = randomUUID();
	const pool = await getPool();
	await pool
		.request()
		.input('id', sql.UniqueIdentifier, sessionId)
		.input('channel_id', sql.NVarChar(64), channelId)
		.input('question_count', sql.Int, questionCount)
		.query(`
		INSERT INTO dbo.tense_quiz_sessions (id, channel_id, status, current_question_index, phase, question_count)
		VALUES (@id, @channel_id, 'active', 0, 'mcq', @question_count)
	`);
	return sessionId;
}

async function addSessionItem(sessionId, questionOrder, bankRow) {
	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('bank_question_id', sql.Int, bankRow.id)
		.input('sentence', sql.NVarChar(1000), bankRow.sentence)
		.input('option_a', sql.NVarChar(255), bankRow.optionA)
		.input('option_b', sql.NVarChar(255), bankRow.optionB)
		.input('option_c', sql.NVarChar(255), bankRow.optionC)
		.input('option_d', sql.NVarChar(255), bankRow.optionD)
		.input('correct_option', sql.Char(1), bankRow.correctOption)
		.input('explanation', sql.NVarChar(sql.MAX), bankRow.explanation)
		.query(`
		INSERT INTO dbo.tense_quiz_session_items (
			session_id, question_order, bank_question_id,
			sentence, option_a, option_b, option_c, option_d, correct_option, explanation
		)
		VALUES (
			@session_id, @question_order, @bank_question_id,
			@sentence, @option_a, @option_b, @option_c, @option_d, @correct_option, @explanation
		)
	`);
}

function mapJoinedRow(row) {
	return {
		sessionId: row.id,
		channelId: row.channel_id,
		status: row.status,
		currentQuestionIndex: row.current_question_index,
		phase: row.phase,
		questionCount: row.question_count,
		createdAt: row.created_at,
		itemId: row.item_id,
		questionOrder: row.question_order,
		sentence: row.sentence,
		optionA: row.option_a,
		optionB: row.option_b,
		optionC: row.option_c,
		optionD: row.option_d,
		correctOption: String(row.correct_option || '').trim().toUpperCase(),
		explanation: row.explanation,
		mcqAnswered: Boolean(row.mcq_answered),
		mcqIsCorrect: row.mcq_is_correct === null ? null : Boolean(row.mcq_is_correct),
		answeredOption: row.answered_option ? String(row.answered_option).trim().toUpperCase() : null,
	};
}

async function getSessionWithCurrentQuestion(sessionId) {
	const pool = await getPool();
	const result = await pool.request().input('session_id', sql.UniqueIdentifier, sessionId).query(`
		SELECT
			s.*,
			i.id AS item_id,
			i.question_order,
			i.sentence,
			i.option_a,
			i.option_b,
			i.option_c,
			i.option_d,
			i.correct_option,
			i.explanation,
			i.mcq_answered,
			i.mcq_is_correct,
			i.answered_option
		FROM dbo.tense_quiz_sessions s
		LEFT JOIN dbo.tense_quiz_session_items i
			ON i.session_id = s.id AND i.question_order = s.current_question_index
		WHERE s.id = @session_id
	`);

	const row = result.recordset[0];
	return row ? mapJoinedRow(row) : null;
}

async function markMcqAnswered(sessionId, questionOrder, selectedOption) {
	const letter = String(selectedOption || '').trim().toUpperCase().slice(0, 1);
	const pool = await getPool();
	const result = await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('selected_option', sql.Char(1), letter)
		.query(`
		UPDATE dbo.tense_quiz_session_items
		SET mcq_answered = 1,
			answered_option = @selected_option,
			mcq_is_correct = CASE WHEN correct_option = @selected_option THEN 1 ELSE 0 END
		OUTPUT inserted.mcq_is_correct
		WHERE session_id = @session_id AND question_order = @question_order AND mcq_answered = 0
	`);

	return result.recordset[0] ? Boolean(result.recordset[0].mcq_is_correct) : null;
}

async function setSessionPhase(sessionId, phase) {
	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('phase', sql.NVarChar(20), phase)
		.query(`UPDATE dbo.tense_quiz_sessions SET phase = @phase WHERE id = @session_id`);
}

async function advanceAfterAwaitNext(sessionId) {
	const pool = await getPool();
	const result = await pool.request().input('session_id', sql.UniqueIdentifier, sessionId).query(`
		UPDATE dbo.tense_quiz_sessions
		SET current_question_index = current_question_index + 1,
			phase = 'mcq'
		OUTPUT inserted.current_question_index, inserted.question_count
		WHERE id = @session_id AND status = 'active' AND phase = 'await_next'
	`);

	const row = result.recordset[0];
	if (!row) {
		return { advanced: false, completed: false };
	}

	if (row.current_question_index >= row.question_count) {
		await completeSession(sessionId);
		return { advanced: true, completed: true };
	}

	return { advanced: true, completed: false };
}

async function completeSession(sessionId) {
	const pool = await getPool();
	await pool.request().input('session_id', sql.UniqueIdentifier, sessionId).query(`
		UPDATE dbo.tense_quiz_sessions
		SET status = 'completed', completed_at = SYSUTCDATETIME()
		WHERE id = @session_id
	`);
}

async function logAttempt(sessionId, questionOrder, isCorrect, answeredOption) {
	const pool = await getPool();
	await pool
		.request()
		.input('session_id', sql.UniqueIdentifier, sessionId)
		.input('question_order', sql.Int, questionOrder)
		.input('is_correct', sql.Bit, isCorrect)
		.input('answered_option', sql.Char(1), answeredOption || null)
		.query(`
		INSERT INTO dbo.tense_quiz_attempts (session_id, question_order, attempt_type, is_correct, answered_option)
		VALUES (@session_id, @question_order, 'mcq', @is_correct, @answered_option)
	`);
}

async function getMcqScore(sessionId) {
	const pool = await getPool();
	const result = await pool.request().input('session_id', sql.UniqueIdentifier, sessionId).query(`
		SELECT COUNT(*) AS score
		FROM dbo.tense_quiz_session_items
		WHERE session_id = @session_id AND mcq_is_correct = 1
	`);
	return result.recordset[0]?.score || 0;
}

module.exports = {
	countQuestions,
	getRandomQuestions,
	insertQuestion,
	getActiveSession,
	createSession,
	addSessionItem,
	getSessionWithCurrentQuestion,
	markMcqAnswered,
	setSessionPhase,
	advanceAfterAwaitNext,
	completeSession,
	logAttempt,
	getMcqScore,
};
