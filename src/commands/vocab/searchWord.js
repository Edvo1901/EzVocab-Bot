const { SlashCommandBuilder } = require('discord.js');
const vocabRepository = require('../../services/db/vocabRepository');
const { listEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search-word')
		.setDescription('Search entries by word/sentence text.')
		.addStringOption((option) =>
			option.setName('text').setDescription('Search query').setRequired(true),
		),

	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const results = await vocabRepository.searchVocabByText(text);
		const lines = results.map(
			(item) => `${item.text} (ID: ${item.id}) • ${item.type}`,
		);

		return interaction.reply({
			embeds: [listEmbed(`Search Results (${results.length})`, lines)],
			flags: 64,
		});
	},
};
