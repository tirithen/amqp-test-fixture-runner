/* global describe, it, before */

const assert = require('assert');
const path = require('path');
const AMQP = require('amqp10');
const walker = require('walker');

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
      let groupReciever;
      let groupSender;

      describe(`Fixtures in ${fixtureGroupName}`, () => {
        before((done) => {
          Promise.all([
            client.createReceiver(fixtureGroup.send.channel),
            client.createSender(fixtureGroup.recieve.channel)
          ]).then((links) => {
            groupReciever = links[0];
            groupReciever.setMaxListeners(fixtureGroup.recieve.messages.length);
            groupSender = links[1];
            done();
          }, done);
        });

        // TODO: figure out a way of looking up nice it descriptions from the fixture data
        fixtureGroup.recieve.messages.forEach((messageToSend, index) => {
          it('Should recieve expected message on time', (done) => {
            const id = `${fixtureGroupName}.${index}`;

            groupReciever.on('message', (messageRecieved) => {
              const expectedMessage = fixtureGroup.recieve.messages[index];
              if (messageRecieved.replyTo === id) {
                assert.deepEqual(messageRecieved, expectedMessage);
                done();
              }
            });

            messageToSend.id = id;
            groupSender.send(messageToSend);
          }).timeout(fixtureGroup.timeout);
        });
      });
    });
  }, (error) => {
    throw error;
  });
});
