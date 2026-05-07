const { SlashCommandBuilder } = require('discord.js');
const tenseRepository = require('../../services/db/tenseRepository');
const { warningEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-tense')
		.setDescription('Delete a tense entry by ID (hard delete).')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Tense ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const deleted = await tenseRepository.deleteTenseItem(id);
		if (!deleted) {
			return interaction.reply({
				embeds: [errorEmbed('Delete failed', `No tense found with ID: ${id}.`)],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [
				warningEmbed(
					'Tense deleted',
					`Deleted ${deleted.name} (ID: ${deleted.id}).`,
				),
			],
			flags: 64,
		});
	},
};
