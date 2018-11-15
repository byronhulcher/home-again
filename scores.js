const LocalStorage = require('node-localstorage').LocalStorage,
  localStorage = new LocalStorage('./localstorage');

let defaultScores = [
    { 'name': 'Francine', 'score': 8 },
    { 'name': 'Sybil', 'score': 4 },
    { 'name': 'Thelma', 'score': 2 }
  ];

module.exports.getScores = () => {
  try {
    return JSON.parse(localStorage.getItem('scores'));
  } catch(e) {
    return []
  }
}

module.exports.saveScores = (scores) => {
  console.log(`Saving scores: ${scores.map((scoreObj) => `
    ${JSON.stringify({name: scoreObj.name, score: scoreObj.score})}`).join('')}`);
  localStorage.setItem('scores', JSON.stringify(scores));

  return scores;
}

module.exports.saveScore = (score, name) => {
  let scores = module.exports.getScores();
  if (!!scores.length && score < scores[scores.length - 1].score) {
    return scores;
  }
  console.log(`Got new high score! ${JSON.stringify({name, score})}`);
  scores.push({name: name, score});
  scores = scores.sort((a, b) => (b.score - a.score)).slice(0, 10);
  return module.exports.saveScores(scores);
}

module.exports.resetScores = () => {
  console.log("RESETTING SCORES!");
  return module.exports.saveScores(defaultScores.slice());
}