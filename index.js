/* global describe, it, before */

const assert = require('assert');
const path = require('path');
const AMQP = require('amqp10');
const walker = require('walker');

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';
const FIXTURE_DIRECTORIES = (process.env.FIXTURE_DIRECTORIES || __dirname)
                              .trim().split(/\s*[,;\s]\s*/);
const DEFAULT_TIMEOUT = process.env.DEFAULT_TIMEOUT || 1000;

function markSkipProperties(recieved, expected) {
  Object.keys(expected).forEach((key) => {
    if (expected[key] === 'SKIP') {
      recieved[key] = 'SKIP';
    }
  });
}

const jsFileRegExp = /\.js$/i;
function getFixtures(filename) {
  let result;

  if (filename.match(jsFileRegExp)) {
    try {
      const module = require(path.resolve(process.cwd(), filename));
      if (module.amqpFixtures) {
        Reflect.deleteProperty(module, 'amqpFixtures');

        Object.keys(module).forEach((key) => {
          const fixtureGroup = module[key];

          if (!fixtureGroup.timeout) {
            fixtureGroup.timeout = DEFAULT_TIMEOUT;
          }

          if (
            !fixtureGroup.recieveOn ||
            !Array.isArray(fixtureGroup.tests)
          ) {
            throw new Error('Invalid fixture group structure');
          }
        });

        result = module;
      }

      throw new Error('Invalid fixture module');
    } catch (lostError) {
      // We do not handle this error
    }
  }

  if (result) {
    console.info(`    Found module: ${filename}`);
  }

  return result;
}

const directoriesToFilterRegExp = /node_modules|\.git/i;
function directoryShouldBeFiltered(directory) {
  return !directory.match(directoriesToFilterRegExp);
}

function getFixtureTree(directories) {
  return new Promise((resolve, reject) => {
    Promise.all(directories.map((directory) => {
      console.info(`  Scanning ${directory} for fixture files`);
      return new Promise((fixtureGroupResolve, fixtureGroupReject) => {
        const fixtureGroups = [];
        walker(directory)
          .filterDir(directoryShouldBeFiltered)
          .on('file', (filename) => {
            const fixtureGroup = getFixtures(filename);
            if (fixtureGroup) {
              fixtureGroups.push(fixtureGroup);
            }
          })
          .on('error', fixtureGroupReject)
          .on('end', () => {
            fixtureGroupResolve(fixtureGroups);
          });
      });
    })).then((fixtureGroups) => {
      const fixtureGroupResult = fixtureGroups.reduce((group1, group2) => {
        Object.keys(group2).forEach((key) => {
          group1[key] = group2[key];
        });

        return group1;
      })[0];

      resolve(fixtureGroupResult);
    }, reject);
  });
}


describe('Loading test fixtures from given directories', () => {
  const client = new AMQP.Client(AMQP.Policy.ActiveMQ);

  before((done) => {
    client.connect(AMQP_URL).then(() => {
      done();
    }, done);
  });

  it('A test to make the dynamic ones load', () => {
    assert.equal(true, true);
  });

  getFixtureTree(FIXTURE_DIRECTORIES).then((fixtureGroups) => {
    Object.keys(fixtureGroups).forEach((fixtureGroupName) => {
      const fixtureGroup = fixtureGroups[fixtureGroupName];
      const defaultSendOn = fixtureGroup.sendOn;
      const defaultRecieveOn = fixtureGroup.recieveOn;
      const defaultTimeout = fixtureGroup.timeout;

      describe(`Tests for fixtures in ${fixtureGroupName}`, () => {
        if (!Array.isArray(fixtureGroup.tests)) {
          fixtureGroup.tests = [ fixtureGroup.tests ];
        }

        fixtureGroup.tests.forEach((testFixture, index) => {
          const name = testFixture.name || index;
          const sendOn = testFixture.sendOn || defaultSendOn;
          const recieveOn = testFixture.recieveOn || defaultRecieveOn;
          const timeout = testFixture.timeout || defaultTimeout;

          if (testFixture.send && !Array.isArray(testFixture.send)) {
            testFixture.send = [ testFixture.send ];
          }

          if (!Array.isArray(testFixture.recieve)) {
            testFixture.recieve = [ testFixture.recieve ];
          }

          it(`Should pass test with fixture group ${name}`, (done) => { // eslint-disable-line max-nested-callbacks
            Promise.all([
              sendOn ? client.createSender(sendOn) : Promise.resolve(),
              client.createReceiver(recieveOn)
            ]).then((links) => { // eslint-disable-line max-nested-callbacks
              const sender = links[0];
              const reciever = links[1];

              reciever.on('message', (recievedMessage) => { // eslint-disable-line max-nested-callbacks
                const length = testFixture.recieve.length;
                for (let recieveIndex = length - 1; recieveIndex >= 0; recieveIndex -= 1) {
                  const expectedMessage = testFixture.recieve[recieveIndex];

                  markSkipProperties(recievedMessage.body, expectedMessage);

                  assert.deepEqual(recievedMessage.body, expectedMessage);
                  assert.equal(length > 0, true, 'Recieved to many messages');
                  testFixture.recieve.splice(recieveIndex, 1);

                  if (testFixture.recieve.length === 0) {
                    reciever.detach().then(() => { // eslint-disable-line max-nested-callbacks
                      done();
                    }, done);
                    break;
                  }
                }
              });

              if (testFixture.send && sender) {
                testFixture.send.forEach((messageToSend) => { // eslint-disable-line max-nested-callbacks
                  sender.send(messageToSend);
                });
              }
            }, done);
          }).timeout(timeout);
        });
      });
    });
  }, (fixtureTreeError) => {
    throw fixtureTreeError;
  });
});
