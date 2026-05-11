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
		name: row.name,
		structure: row.structure,
		meaningNote: row.meaning_note,
		examples: parseExamples(row.examples_json),
		isShowed: Boolean(row.is_showed),
	};
}

async function createSentenceStructureItem({ name, structure, meaningNote, examples }) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('name', sql.NVarChar(255), name.trim())
		.input('structure', sql.NVarChar(500), structure.trim())
		.input('meaning_note', sql.NVarChar(sql.MAX), meaningNote.trim())
		.input('examples_json', sql.NVarChar(sql.MAX), JSON.stringify(examples || []))
		.query(`
		INSERT INTO dbo.sentence_structure_items ([name], [structure], meaning_note, examples_json, updated_at)
		OUTPUT inserted.*
		VALUES (@name, @structure, @meaning_note, @examples_json, SYSUTCDATETIME())
	`);

	return mapRow(result.recordset[0]);
}

async function findDuplicate(name) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('normalized_name', sql.NVarChar(255), normalizeText(name))
		.query(`
		SELECT TOP 1 *
		FROM dbo.sentence_structure_items
		WHERE normalized_name = @normalized_name
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function updateSentenceStructureItem(id, payload) {
	const pool = await getPool();
	const updates = [];
	const request = pool.request().input('id', sql.Int, id);

	if (payload.name !== undefined) {
		request.input('name', sql.NVarChar(255), payload.name.trim());
		updates.push('[name] = @name');
	}
	if (payload.structure !== undefined) {
		request.input('structure', sql.NVarChar(500), payload.structure.trim());
		updates.push('[structure] = @structure');
	}
	if (payload.meaningNote !== undefined) {
		request.input('meaning_note', sql.NVarChar(sql.MAX), payload.meaningNote.trim());
		updates.push('meaning_note = @meaning_note');
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
		return getSentenceStructureById(id);
	}

	const result = await request.query(`
		UPDATE dbo.sentence_structure_items
		SET ${updates.join(', ')}, updated_at = SYSUTCDATETIME()
		OUTPUT inserted.*
		WHERE id = @id
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function deleteSentenceStructureItem(id) {
	const pool = await getPool();
	const result = await pool.request().input('id', sql.Int, id).query(`
		DELETE FROM dbo.sentence_structure_items
		OUTPUT deleted.*
		WHERE id = @id
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function getSentenceStructureById(id) {
	const pool = await getPool();
	const result = await pool.request().input('id', sql.Int, id).query(`
		SELECT TOP 1 *
		FROM dbo.sentence_structure_items
		WHERE id = @id
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function searchSentenceStructureByName(text) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('pattern', sql.NVarChar(255), `%${text.trim()}%`)
		.query(`
		SELECT TOP 25 *
		FROM dbo.sentence_structure_items
		WHERE [name] LIKE @pattern
		ORDER BY [name] ASC
	`);
	return result.recordset.map(mapRow);
}

async function getRandomSentenceStructureItem() {
	const pool = await getPool();
	const result = await pool.request().query(`
		SELECT TOP 1 *
		FROM dbo.sentence_structure_items
		ORDER BY NEWID()
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function markAsShowed(id) {
	const pool = await getPool();
	await pool.request().input('id', sql.Int, id).query(`
		UPDATE dbo.sentence_structure_items
		SET is_showed = 1,
			updated_at = SYSUTCDATETIME()
		WHERE id = @id
	`);
}

module.exports = {
	createSentenceStructureItem,
	findDuplicate,
	updateSentenceStructureItem,
	deleteSentenceStructureItem,
	getSentenceStructureById,
	searchSentenceStructureByName,
	getRandomSentenceStructureItem,
	markAsShowed,
};
