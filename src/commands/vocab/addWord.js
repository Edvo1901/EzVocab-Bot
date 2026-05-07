const { SlashCommandBuilder, ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('add-word')
		.setDescription('Add a new vocabulary item using a modal form.'),

	async execute(interaction) {
		const modal = new ModalBuilder().setCustomId('vocab:add').setTitle('Add Word');

		const textInput = new TextInputBuilder()
			.setCustomId('text')
			.setLabel('Word or sentence')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(255);

		const typeInput = new TextInputBuilder()
			.setCustomId('type')
			.setLabel('Type (noun, verb, sentence...)')
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setMaxLength(50);

		const definitionInput = new TextInputBuilder()
			.setCustomId('vi_definition')
			.setLabel('Vietnamese definition')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setMaxLength(2000);

		const examplesInput = new TextInputBuilder()
			.setCustomId('examples')
			.setLabel('Examples (one per line)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setMaxLength(2000);

		modal.addComponents(
			new ActionRowBuilder().addComponents(textInput),
			new ActionRowBuilder().addComponents(typeInput),
			new ActionRowBuilder().addComponents(definitionInput),
			new ActionRowBuilder().addComponents(examplesInput),
		);

		return interaction.showModal(modal);
	},
};
