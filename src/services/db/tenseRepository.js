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
		usageNote: row.usage_note,
		examples: parseExamples(row.examples_json),
		isShowed: Boolean(row.is_showed),
	};
}

async function createTenseItem({ name, structure, usageNote, examples }) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('name', sql.NVarChar(255), name.trim())
		.input('structure', sql.NVarChar(500), structure.trim())
		.input('usage_note', sql.NVarChar(sql.MAX), usageNote.trim())
		.input('examples_json', sql.NVarChar(sql.MAX), JSON.stringify(examples || []))
		.query(`
		INSERT INTO dbo.tense_items ([name], [structure], usage_note, examples_json, updated_at)
		OUTPUT inserted.*
		VALUES (@name, @structure, @usage_note, @examples_json, SYSUTCDATETIME())
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
		FROM dbo.tense_items
		WHERE normalized_name = @normalized_name
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function updateTenseItem(id, payload) {
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
	if (payload.usageNote !== undefined) {
		request.input('usage_note', sql.NVarChar(sql.MAX), payload.usageNote.trim());
		updates.push('usage_note = @usage_note');
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
		return getTenseById(id);
	}

	const result = await request.query(`
		UPDATE dbo.tense_items
		SET ${updates.join(', ')}, updated_at = SYSUTCDATETIME()
		OUTPUT inserted.*
		WHERE id = @id
	`);

	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function deleteTenseItem(id) {
	const pool = await getPool();
	const result = await pool.request().input('id', sql.Int, id).query(`
		DELETE FROM dbo.tense_items
		OUTPUT deleted.*
		WHERE id = @id
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function getTenseById(id) {
	const pool = await getPool();
	const result = await pool.request().input('id', sql.Int, id).query(`
		SELECT TOP 1 *
		FROM dbo.tense_items
		WHERE id = @id
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function searchTenseByName(text) {
	const pool = await getPool();
	const result = await pool
		.request()
		.input('pattern', sql.NVarChar(255), `%${text.trim()}%`)
		.query(`
		SELECT TOP 25 *
		FROM dbo.tense_items
		WHERE [name] LIKE @pattern
		ORDER BY [name] ASC
	`);
	return result.recordset.map(mapRow);
}

async function getRandomTenseItem() {
	const pool = await getPool();
	const result = await pool.request().query(`
		SELECT TOP 1 *
		FROM dbo.tense_items
		ORDER BY NEWID()
	`);
	return result.recordset[0] ? mapRow(result.recordset[0]) : null;
}

async function markAsShowed(id) {
	const pool = await getPool();
	await pool.request().input('id', sql.Int, id).query(`
		UPDATE dbo.tense_items
		SET is_showed = 1,
			updated_at = SYSUTCDATETIME()
		WHERE id = @id
	`);
}

module.exports = {
	createTenseItem,
	findDuplicate,
	updateTenseItem,
	deleteTenseItem,
	getTenseById,
	searchTenseByName,
	getRandomTenseItem,
	markAsShowed,
};
