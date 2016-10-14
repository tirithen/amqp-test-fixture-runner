/* global describe, it, before */

const assert = require('assert');
const path = require('path');
const AMQP = require('amqp10');
const walker = require('walker');
const equal = require('deep-equal');

const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';
const FIXTURE_DIRECTORIES = (process.env.FIXTURE_DIRECTORIES || __dirname)
                              .trim().split(/\s*[,;\s]\s*/);
const DEFAULT_TIMEOUT = process.env.DEFAULT_TIMEOUT || 1000;

const jsFileRegExp = /\.js$/i;
function getFixtures(filename) {
  let result;

  if (filename.match(jsFileRegExp)) {
    try {
      const module = require(path.resolve(process.cwd(), filename));

      if (module.amqpFixtures) {
        delete module.amqpFixtures;

        Object.keys(module).forEach((key) => {
          const fixtureGroup = module[key];

          if (!fixtureGroup.timeout) {
            fixtureGroup.timeout = DEFAULT_TIMEOUT;
          }

          if (
            !fixtureGroup.send.channel ||
            !fixtureGroup.recieve.channel ||
            !Array.isArray(fixtureGroup.send.messages) ||
            !Array.isArray(fixtureGroup.recieve.messages) ||
            fixtureGroup.send.messages.length !== fixtureGroup.recieve.messages.length
          ) {
            throw new Error('Invalid fixture group structure');
          }
        });

        result = module;
      }

      throw new Error('Invalid fixture module');
    } catch (error) {}
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
      console.info(`Scanning ${directory} for fixture files`);
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
    client.connect(AMQP_URL).then(() => { done(); }, done);
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

      describe(`Fixtures in ${fixtureGroupName}`, () => {
        if (!Array.isArray(fixtureGroup.tests)) {
          fixtureGroup.tests = [fixtureGroup.tests];
        }

        fixtureGroup.tests.forEach((testFixture, index) => {
          const name = testFixture.name || index;
          const sendOn = testFixture.sendOn || defaultSendOn;
          const recieveOn = testFixture.recieveOn || defaultRecieveOn;
          const timeout = testFixture.timeout || defaultTimeout;

          if (!Array.isArray(testFixture.send)) {
            testFixture.send = [testFixture.send];
          }

          if (!Array.isArray(testFixture.recieve)) {
            testFixture.recieve = [testFixture.recieve];
          }

          it(`Should pass test ${name}`, (done) => {
            Promise.all([
              client.createSender(sendOn),
              client.createReceiver(recieveOn)
            ]).then((links) => {
              const sender = links[0];
              const reciever = links[1];

              reciever.on('message', (recievedMessage) => {
                assert.equal(testFixture.recieve > 1, true, 'Recieved to many messages');

                const length = testFixture.recieve.length;
                for (let recieveIndex = length; recieveIndex >= 0; recieveIndex -= 1) {
                  const expectedMessage = testFixture.recieve[recieveIndex];

                  if (equal(recievedMessage, expectedMessage)) {
                    testFixture.recieve.splice(recieveIndex, 1);
                  }

                  if (testFixture.recieve.length === 0) {
                    done();
                  }
                }
              });

              testFixture.send.forEach((messageToSend) => {
                sender.send(messageToSend);
              });
            }, done);
          }).timeout(timeout);
        });
      });
    });
  }, (error) => {
    throw error;
  });
});
