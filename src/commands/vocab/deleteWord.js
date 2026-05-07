const { SlashCommandBuilder } = require('discord.js');
const vocabRepository = require('../../services/db/vocabRepository');
const { warningEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-word')
		.setDescription('Delete a vocabulary entry by ID (hard delete).')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Vocabulary ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const deleted = await vocabRepository.deleteVocabItem(id);
		if (!deleted) {
			return interaction.reply({
				embeds: [errorEmbed('Delete failed', `No entry found with ID: ${id}.`)],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [
				warningEmbed(
					'Word deleted',
					`Deleted ${deleted.text} (ID: ${deleted.id}) • ${deleted.type}`,
				),
			],
			flags: 64,
		});
	},
};
