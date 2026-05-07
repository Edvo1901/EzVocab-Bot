const {
	SlashCommandBuilder,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
} = require('discord.js');
const vocabRepository = require('../../services/db/vocabRepository');
const { errorEmbed } = require('../../services/embedTemplates');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('update-word')
		.setDescription('Update an existing vocabulary item by ID.')
		.addIntegerOption((option) =>
			option.setName('id').setDescription('Vocabulary ID').setRequired(true),
		),

	async execute(interaction) {
		const id = interaction.options.getInteger('id', true);
		const item = await vocabRepository.getVocabById(id);
		if (!item) {
			return interaction.reply({
				embeds: [errorEmbed('Update failed', `No entry found with ID: ${id}.`)],
				flags: 64,
			});
		}

		const modal = new ModalBuilder()
			.setCustomId(`vocab:update:${id}`)
			.setTitle(`Update Word ID ${id}`);

		const textInput = new TextInputBuilder()
			.setCustomId('text')
			.setLabel('Word or sentence (optional)')
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setValue(item.text)
			.setMaxLength(255);

		const typeInput = new TextInputBuilder()
			.setCustomId('type')
			.setLabel('Type (optional)')
			.setStyle(TextInputStyle.Short)
			.setRequired(false)
			.setValue(item.type)
			.setMaxLength(50);

		const definitionInput = new TextInputBuilder()
			.setCustomId('vi_definition')
			.setLabel('Vietnamese definition (optional)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue(item.viDefinition)
			.setMaxLength(2000);

		const examplesInput = new TextInputBuilder()
			.setCustomId('examples')
			.setLabel('Examples (optional, one per line)')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setValue((item.examples || []).join('\n'))
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
