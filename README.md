# amqp-test-fixture-runner - A system that connects to an ActiveMQ instance and runs test fixtures

This package is ment to ease testing of AMQP services by only writing fixture files and requiring this package.

The package will pull and run a docker container with an ActiveMQ service that will act as the AMQP broker for the test fixtures.

## Dependencies

This package requires that you have *docker* and *docker-compose* applications installed on your system.

## Fixture example

See *test/ingredientTranslate.js* for an example of a fixture file.

## Usage

Add this package to your package.json dependencies:

    $ npm install --save-dev amqp-test-fixture-runner

Add the test command to scripts.test inside package.json:

    "scripts": {
      "test": "docker-compose -f ./node_modules/amqp-test-fixture-runner/test/docker-compose.yml up -d && AMQP_URL=amqp://producer:DYjpp4fbCQ8zpiDIoJwP@localhost FIXTURE_DIRECTORIES=./test ./node_modules/.bin/mocha --timeout 60000 && docker-compose  -f ./node_modules/amqp-test-fixture-runner/test/docker-compose.yml down"
    }

Add one or more test fixture files (see *./node_modules/amqp-test-fixture-runner/test/ingredientTranslate.js* as an other example) to your projects ./test directory with the following syntax:

    const add = {
      sendOn: 'add',
      recieveOn: 'topic://add.result',
      timeout: 500,
      tests: [
        {
          send: {
            environment: 'test',
            x: 1,
            y: 2
          },
          recieve: {
            environment: 'test',
            sum: 3
          }
        }
      ]
    };

    module.exports = {
      amqpFixtures: true,
      add
    };

Run your tests with:

    $ npm test

## Test this package

Make sure you have the required dependencies and run:

    $ npm install
    $ npm test

## Contribute

Please feel free to contribute, hack around, add tests, and create a merge request. ;D

## License

This package is released with the GPL-3.0 license.
