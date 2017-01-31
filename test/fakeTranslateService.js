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
      } else if (message.body.text === 'vatten' && message.body.toLanguage === 'en-us') {
        response.text = 'water';
      } else if (message.body.text === 'äpple' && message.body.toLanguage === 'en-us') {
        response.text = 'apple';
      } else if (message.body.text === 'apelsin' && message.body.toLanguage === 'en-us') {
        response.text = 'orange';
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

      const delay = (Math.random() > 0.5 ? 100 : 0) + (Math.random() * 20);
      setTimeout(() => {
        sender.send(response);
      }, delay);

      sender.send(response);
    });
  }, (subscriptionError) => console.error(subscriptionError));
}, (connectionError) => console.error(connectionError));
