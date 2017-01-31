const ingredientTranslate = {
  sendOn: 'ingredient.toTranslate',
  recieveOn: 'topic://ingredient.translated',
  timeout: 1000,
  tests: [
    {
      send: [
        {
          environment: 'test',
          text: 'vetemjöl',
          toLanguage: 'en-us'
        }
      ],
      recieve: {
        environment: 'test',
        text: 'weat flour',
        language: 'en-us'
      }
    },
    {
      send: {
        id: 2,
        environment: 'test',
        text: 'strösocker',
        toLanguage: 'en-us'
      },
      recieve: [
        {
          replyTo: 2,
          environment: 'test',
          text: 'sugar',
          language: 'en-us'
        }
      ]
    },
    {
      send: {
        id: 3,
        environment: 'test',
        text: 'äpple',
        toLanguage: 'en-us'
      },
      recieve: [
        {
          replyTo: 3,
          environment: 'test',
          text: 'apple',
          language: 'en-us'
        }
      ]
    },
    {
      send: {
        id: 4,
        environment: 'test',
        text: 'vatten',
        toLanguage: 'en-us'
      },
      recieve: [
        {
          replyTo: 4,
          environment: 'test',
          text: 'water',
          language: 'en-us'
        }
      ]
    },
    {
      send: {
        id: 5,
        environment: 'test',
        text: 'äpple',
        toLanguage: 'en-us'
      },
      recieve: [
        {
          replyTo: 5,
          environment: 'test',
          text: 'apple',
          language: 'en-us'
        }
      ]
    },
    {
      send: {
        id: 6,
        environment: 'test',
        text: 'apelsin',
        toLanguage: 'en-us'
      },
      recieve: [
        {
          replyTo: 6,
          environment: 'test',
          text: 'orange',
          language: 'en-us'
        }
      ]
    }
  ]
};

module.exports = {
  amqpFixtures: true,
  ingredientTranslate
};
