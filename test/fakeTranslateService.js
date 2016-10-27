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

      if (message.body.text === 'vetemjöl' && message.body.toLanguage === 'en-us') {
        response.text = 'weat flour';
      } else if (message.body.text === 'strösocker' && message.body.toLanguage === 'en-us') {
        response.text = 'sugar';
      }

      if (message.body.id) {
        response.replyTo = message.body.id;
      }

      if (message.body.environment) {
        response.environment = message.body.environment;
      }

      if (message.body.toLanguage) {
        response.language = message.body.toLanguage;
      }

      sender.send(response);
    });
  }, error => console.error(error));
}, error => console.error(error));
