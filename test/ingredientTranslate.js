const ingredientTranslate = {
  sendOn: 'ingredient.toTranslate',
  recieveOn: 'topic://ingredient.translated',
  timeout: 500,
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
    }
  ]
};

module.exports = {
  amqpFixtures: true,
  ingredientTranslate
};
