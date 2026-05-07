const { SlashCommandBuilder } = require('discord.js');
const vocabRepository = require('../../services/db/vocabRepository');
const { vocabDetailEmbed, errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('word-by-id')
		.setDescription('Show full details of a vocabulary item by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Vocabulary ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await vocabRepository.getVocabById(id);
		if (!item) {
			return interaction.reply({
				embeds: [errorEmbed('Not found', `No entry found with ID: ${id}.`)],
				flags: 64,
			});
		}

		return interaction.reply({
			embeds: [vocabDetailEmbed(item)],
			flags: 64,
		});
	},
};
