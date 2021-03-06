const fs = require('fs-extra');
const path = require('path');
const idx = require('idx');

const utils = require('./utils');

const answersFilter = (f) => /usersays/g.test(f) === false;
const fields = ['intent', 'lang', 'answer'];
const noLineBreaksRegex = /(?:\r\n|\r|\n)/g;

const readFileWrapper = (intentPath) => {
  const intentName = utils.extractIntentName(intentPath);
  return new Promise((resolve, reject) => {
    fs.readFile(intentPath).then((content) => {
      resolve([intentName, content]);
    }).catch((error) => {
      reject(error);
    });
  });
};

exports.extract = (agentName, agentFolder, destination) => {
  const intentsPath = agentFolder.concat('intents');
  const csvContent = [];
  let allReadFiles = [];

  return new Promise((resolve, reject) => {
    allReadFiles = utils.getAllFilesFromPath(intentsPath, answersFilter)
        .map((intentPath) => readFileWrapper(intentPath));

    Promise.all(allReadFiles).then((results) => {
      results.forEach(([intentName, content]) => {
        const intent = JSON.parse(content);
        const messages = idx(intent, (_) => _.responses[0].messages);
        if (messages) {
          messages.filter((m) => m.type === 0).forEach((m) => {
            const answer = m.speech;
            if (answer.constructor === Array) {
              if (answer.length === 0) {
                csvContent.push({
                  'intent': intentName,
                  'lang': m.lang,
                  'answer': '',
                });
              } else {
                answer.forEach((a) => {
                  csvContent.push({
                    'intent': intentName,
                    'lang': m.lang,
                    'answer': a.replace(noLineBreaksRegex, ' '),
                  });
                });
              }
            } else {
              csvContent.push({
                'intent': intentName,
                'lang': m.lang,
                'answer': answer.replace(noLineBreaksRegex, ' '),
              });
            }
          });
        }
      });
      resolve(csvContent);
    }).catch((error) => reject(error));
  }).then((csvContent) => {
    const options = {fields};
    const filename = destination.concat(`${agentName}.answers.csv`);
    return utils.writeCsvFile(options, csvContent, filename.join(path.sep));
  });
};

