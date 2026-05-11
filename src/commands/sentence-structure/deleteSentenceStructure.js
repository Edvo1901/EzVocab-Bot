const { SlashCommandBuilder } = require('discord.js');
const sentenceStructureRepository = require('../../services/db/sentenceStructureRepository');
const { warningEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-sentence-structure')
		.setDescription('Delete a sentence structure pattern by ID (hard delete).')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Pattern ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const deleted = await sentenceStructureRepository.deleteSentenceStructureItem(id);
		if (!deleted) {
			return interaction.reply({
				embeds: [
					errorEmbed('Delete failed', `No sentence structure found with ID: ${id}.`),
				],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [
				warningEmbed(
					'Pattern deleted',
					`Deleted ${deleted.name} (ID: ${deleted.id}).`,
				),
			],
			flags: 64,
		});
	},
};
