const fs = require('fs');
const path = require('path');

async function loadEvents(client) {
	const eventsPath = path.join(__dirname, '../events');

	const readFilesRecursively = (dir) => {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const fullPath = path.join(dir, file);
			const stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				readFilesRecursively(fullPath);
			} else if (file.endsWith('.js')) {
				try {
					const event = require(fullPath);
					if (event.once) {
						client.once(event.name, (...args) => {
							try {
								event.execute(...args);
							} catch (error) {
								console.error(`Error executing event ${event.name}:`, error);
							}
						});
					} else {
						client.on(event.name, (...args) => {
							try {
								event.execute(...args);
							} catch (error) {
								console.error(`Error executing event ${event.name}:`, error);
							}
						});
					}
				} catch (error) {
					console.error(`Failed to load event from ${file}:`, error);
				}
			}
		}
	};

	readFilesRecursively(eventsPath);
}

module.exports = { loadEvents };
