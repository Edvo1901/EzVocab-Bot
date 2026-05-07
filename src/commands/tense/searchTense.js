const { SlashCommandBuilder } = require('discord.js');
const tenseRepository = require('../../services/db/tenseRepository');
const { listEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('search-tense')
		.setDescription('Search tense entries by name.')
		.addStringOption((option) =>
			option.setName('text').setDescription('Search query').setRequired(true),
		),

	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const results = await tenseRepository.searchTenseByName(text);
		const lines = results.map((item) => `${item.name} (ID: ${item.id})`);

		return interaction.reply({
			embeds: [listEmbed(`Tense Results (${results.length})`, lines)],
			flags: 64,
		});
	},
};
