const { getPool, sql } = require('./sqlClient');
const { normalizeText } = require('../../constants/vocab');

function parseExamples(value) {
	if (!value) return [];
	if (Array.isArray(value)) return value;
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function mapRow(row) {
	return {
		id: row.id,
		text: row.text,
		type: row.type,
		viDefinition: row.vi_definition,
		examples: parseExamples(row.examples_json),
		isShowed: Boolean(row.is_showed),
	};
}

async function createVocabItem({ text, type, viDefinition, examples }) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('text', sql.NVarChar(255), text.trim())
		.input('type', sql.NVarChar(50), type.trim())
		.input('vi_definition', sql.NVarChar(sql.MAX), viDefinition.trim())
		.input('examples_json', sql.NVarChar(sql.MAX), JSON.stringify(examples || []))
		.query(`
		INSERT INTO dbo.vocab_items ([text], [type], vi_definition, examples_json, updated_at)
		OUTPUT inserted.*
		VALUES (@text, @type, @vi_definition, @examples_json, SYSUTCDATETIME())
	`);

	return mapRow(result.recordset[0]);
}

async function findDuplicate(text, type) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('normalized_text', sql.NVarChar(255), normalizeText(text))
		.input('normalized_type', sql.NVarChar(50), normalizeText(type))
		.query(`
		SELECT TOP 1 *
		FROM dbo.vocab_items
		WHERE normalized_text = @normalized_text
			AND normalized_type = @normalized_type
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function updateVocabItem(id, payload) {
	const pool = await getPool();
	const updates = [];
	const request = pool.request().input('id', sql.Int, id);

	if (payload.text !== undefined) {
		request.input('text', sql.NVarChar(255), payload.text.trim());
		updates.push('[text] = @text');
	}
	if (payload.type !== undefined) {
		request.input('type', sql.NVarChar(50), payload.type.trim());
		updates.push('[type] = @type');
	}
	if (payload.viDefinition !== undefined) {
		request.input('vi_definition', sql.NVarChar(sql.MAX), payload.viDefinition.trim());
		updates.push('vi_definition = @vi_definition');
	}
	if (payload.examples !== undefined) {
		request.input(
			'examples_json',
			sql.NVarChar(sql.MAX),
			JSON.stringify(payload.examples || []),
		);
		updates.push('examples_json = @examples_json');
	}

	if (updates.length === 0) {
		return getVocabById(id);
	}

	const result = await request.query(`
		UPDATE dbo.vocab_items
		SET ${updates.join(', ')}, updated_at = SYSUTCDATETIME()
		OUTPUT inserted.*
		WHERE id = @id
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function deleteVocabItem(id) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('id', sql.Int, id)
		.query(`
		DELETE FROM dbo.vocab_items
		OUTPUT deleted.*
		WHERE id = @id
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function getVocabById(id) {
	const pool = await getPool();
	const result = await pool.request().input('id', sql.Int, id).query(`
		SELECT TOP 1 *
		FROM dbo.vocab_items
		WHERE id = @id
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function searchVocabByText(text) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('pattern', sql.NVarChar(255), `%${text.trim()}%`)
		.query(`
		SELECT TOP 25 *
		FROM dbo.vocab_items
		WHERE [text] LIKE @pattern
		ORDER BY [text] ASC
	`);

	return result.recordset.map(mapRow);
}

async function getRandomVocabItem() {
	const pool = await getPool();
	const result = await pool.request().query(`
		SELECT TOP 1 *
		FROM dbo.vocab_items
		ORDER BY NEWID()
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function markAsShowed(id) {
	const pool = await getPool();
	await pool.request().input('id', sql.Int, id).query(`
		UPDATE dbo.vocab_items
		SET is_showed = 1,
			updated_at = SYSUTCDATETIME()
		WHERE id = @id
	`);
}

async function getRandomQuizCandidates(questionCount) {
	const pool = await getPool();
	const result = await pool.request().input('question_count', sql.Int, questionCount)
		.query(`
		WITH eligible_types AS (
			SELECT normalized_type
			FROM dbo.vocab_items
			GROUP BY normalized_type
			HAVING COUNT(*) >= 4
		)
		SELECT TOP (@question_count) v.*
		FROM dbo.vocab_items v
		INNER JOIN eligible_types et ON v.normalized_type = et.normalized_type
		ORDER BY NEWID()
	`);

	return result.recordset.map(mapRow);
}

async function getDistractorsByType(type, excludeId, limit = 3) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('normalized_type', sql.NVarChar(50), normalizeText(type))
		.input('exclude_id', sql.Int, excludeId)
		.input('limit', sql.Int, limit)
		.query(`
		SELECT TOP (@limit) *
		FROM dbo.vocab_items
		WHERE normalized_type = @normalized_type
			AND id <> @exclude_id
		ORDER BY NEWID()
	`);

	return result.recordset.map(mapRow);
}

module.exports = {
	createVocabItem,
	findDuplicate,
	updateVocabItem,
	deleteVocabItem,
	getVocabById,
	searchVocabByText,
	getRandomVocabItem,
	markAsShowed,
	getRandomQuizCandidates,
	getDistractorsByType,
};
