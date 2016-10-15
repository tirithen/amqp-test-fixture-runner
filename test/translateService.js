const AMQP = require('amqp10');

const AMQP_URL = 'amqp://producer:DYjpp4fbCQ8zpiDIoJwP@localhost:5672';

const client = new AMQP.Client(AMQP.Policy.ActiveMQ);
client.connect(AMQP_URL).then(() => {
  Promise.all([
    client.createSender('topic://ingredient.translated'),
    client.createReceiver('ingredient.toTranslate')
  ]).then((links) => {
    const sender = links[0];
    const reciever = links[1];

    reciever.on('message', (message) => {
      const response = {};

      if (message.text === 'vetemjöl' && message.toLanguage === 'en-us') {
        response.text = 'weat flour';
      } else if (message.text === 'strösocker' && message.toLanguage === 'en-us') {
        response.text = 'sugar';
      }

      if (message.id) {
        response.replyTo = message.id;
      }

      if (message.environment) {
        response.environment = message.environment;
      }

      if (message.toLanguage) {
        response.language = message.toLanguage;
      }

      sender.send(response);
    });
  });
}, error => console.error(error));
