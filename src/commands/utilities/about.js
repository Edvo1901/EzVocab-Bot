const {
	SlashCommandBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require('discord.js');
const createEmbed = require('../../utils/embedBuilder');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('about')
		.setDescription('Displays information about the DISCORDJS Bot Template.'),
	async execute(interaction) {
		await interaction.deferReply();

		const embedOptions = {
			description: `A bot for learning vocabulary.`,
			footerText: 'Maybe',
			timestamp: false,
		};

		const adButton = new ButtonBuilder()
			.setLabel('Github')
			.setStyle(ButtonStyle.Link)
			.setURL(`https://github.com/Edvo1901`);
		const row = new ActionRowBuilder().addComponents(adButton);

		const embed = createEmbed.createEmbed(embedOptions);

		await interaction.editReply({ embeds: [embed], components: [row] });
	},
};
