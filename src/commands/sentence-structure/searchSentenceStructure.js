const { SlashCommandBuilder } = require('discord.js');
const sentenceStructureRepository = require('../../services/db/sentenceStructureRepository');
const { listEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search-sentence-structure')
		.setDescription('Search sentence structure patterns by name.')
		.addStringOption((option) =>
			option.setName('text').setDescription('Search query').setRequired(true),
		),

	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const results = await sentenceStructureRepository.searchSentenceStructureByName(text);
		const lines = results.map((item) => `${item.name} (ID: ${item.id})`);

		return interaction.reply({
			embeds: [listEmbed(`Sentence structure results (${results.length})`, lines)],
			flags: 64,
		});
	},
};
