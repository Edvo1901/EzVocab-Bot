const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

async function loadComponents(client) {
	const componentTypes = ['buttons', 'dropdowns', 'modals'];
	const components = {};

	componentTypes.forEach((type) => {
		client[type] = new Collection();
	});

	componentTypes.forEach((type) => {
		const componentPath = path.join(__dirname, `../${type}`);

		if (!fs.existsSync(componentPath)) return;

		const readFilesRecursively = (dir) => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const fullPath = path.join(dir, file);
				const stat = fs.statSync(fullPath);

				if (stat.isDirectory()) {
					readFilesRecursively(fullPath);
				} else if (file.endsWith('.js')) {
					const component = require(fullPath);
					if ('customID' in component && 'execute' in component) {
						client[type].set(component.customID, component);
					} else {
						console.error(
							`Component file at ${file} is missing required properties.`,
						);
					}
				}
			}
		};

		readFilesRecursively(componentPath);
	});
}

//@note: synchronize the interaction with the corresponding component
async function synchronizeComponent(interaction, client) {
	if (
		!interaction.isButton() &&
		!interaction.isStringSelectMenu() &&
		!interaction.isModalSubmit()
	)
		return;

	let component;
	if (interaction.isButton()) {
		component = resolveComponent(client.buttons, interaction.customId);
	} else if (interaction.isStringSelectMenu()) {
		component = resolveComponent(client.dropdowns, interaction.customId);
	} else if (interaction.isModalSubmit()) {
		component = resolveComponent(client.modals, interaction.customId);
	}

	if (!component) {
		return interaction.reply({
			content: 'Something went wrong!',
			flags: 64,
		});
	}

	try {
		//@note: execute the matched component
		await component.execute(interaction, client);
	} catch (error) {
		console.error('Error executing component:', error);
		await interaction.reply({
			content: 'An error occurred while executing the component.',
			flags: 64,
		});
	}
}

function resolveComponent(collection, customId) {
	if (!collection) {
		return null;
	}

	if (collection.has(customId)) {
		return collection.get(customId);
	}

	for (const [key, component] of collection.entries()) {
		if (customId.startsWith(key)) {
			return component;
		}
	}

	return null;
}

module.exports = { loadComponents, synchronizeComponent };
