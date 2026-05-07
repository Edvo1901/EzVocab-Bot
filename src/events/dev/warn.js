const { Events } = require('discord.js');

module.exports = {
	name: Events.Warn,
	once: false,
	execute(info) {
		console.warn(info);
	},
};
