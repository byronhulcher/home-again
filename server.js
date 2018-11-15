var express = require('express');
var app = express();
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var { getScores, saveScore, resetScores } = require('./scores');

var store = new FileStore({
  ttl: 5,
  retries: 0,
  path: './sessions'
});

app.use(session({
    store: store,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        // path: "/scores/",
        // httpOnly: true,
        // secure: true,
        sameSite: true
    },
    name: 'home-again',
    maxAge: 10 * 1000,
    rolling: false,
  })
);

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));
app.use(express.json());

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response, next) {
  response.sendFile(__dirname + '/pages/index.html');
});

app.get('/scores/', function (req, res) {
  // console.log("GET /scores/", req.sessionID);
  if (!req.session.key){
    req.session.key = new Buffer(Date.now().toString()).toString('base64');
    // console.log("Created session", req.sessionID);
  }
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(getScores()));
})

app.post('/scores/', function (req, res) {
  let body = req.body,
    scores;
//   console.log("POST /scores/", req.sessionID);
//   console.log(`Got ${JSON.stringify(body)}`);
  
  if (!Number.isInteger(body.steps) || body.steps % 2 != 0 || typeof body.name !== "string") {
    res.status(400);
    res.send();
    return;
  }
  
  store.get(req.sessionID, function(err, sess) {
    if (sess && sess.key){
      scores = saveScore(req.body.steps, req.body.name.slice(0, 20));
      // console.log("Consuming session", req.sessionID);
      store.destroy(req.sessionID);
    }
    
    req.session.destroy();
    res.clearCookie('home-again');
    
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(scores));
  });
})

if (!getScores().length){
  resetScores();
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
