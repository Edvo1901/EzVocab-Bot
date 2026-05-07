const sql = require('mssql');
const config = require('../../../config/config.json');

let poolPromise;

function getSqlConfig() {
	const db = config.db || {};
	const rawServer = String(db.server || '').trim();
	const hasInstance = rawServer.includes('\\');
	const [host, instanceName] = hasInstance
		? rawServer.split('\\', 2)
		: [rawServer, undefined];
	const explicitPort =
		db.port !== undefined && db.port !== null && String(db.port).trim() !== ''
			? Number(db.port)
			: undefined;
	const useInstanceResolution = Boolean(instanceName) && !explicitPort;

	return {
		server: host || rawServer,
		database: db.database,
		user: db.user,
		password: db.password,
		// If explicit port is provided, always prefer host+port.
		// Instance resolution is used only when port is not provided.
		port: explicitPort || undefined,
		options: {
			encrypt: Boolean(db.encrypt),
			trustServerCertificate: db.trustServerCertificate !== false,
			...(useInstanceResolution ? { instanceName } : {}),
		},
		pool: {
			max: 10,
			min: 0,
			idleTimeoutMillis: 30000,
		},
	};
}

async function getPool() {
	if (!poolPromise) {
		poolPromise = sql.connect(getSqlConfig());
	}
	return poolPromise;
}

module.exports = {
	sql,
	getPool,
};
