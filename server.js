const express = require('express');
const RateLimit = require('express-rate-limit');
const mds = require('markdown-serve');
const path = require('path');
const app = express();
const fs = require('fs');

// Production / development setup
if (process.env.PRODUCTION) {
  const https = require('https');
  const port = 1234;
  https.createServer({
    key: fs.readFileSync('/home/jenkins/sslcert/server.key'),
    cert: fs.readFileSync('/home/jenkins/sslcert/server.crt')
  }, app).listen(port, () => {
    console.log('We are live on port ' + port);
  });
} else {
  const port = 3000;
  app.listen(port, () => {
    console.log('We are live on port ' + port);
  });
}

// limit requests to 600 per hour
// apply to all requests
app.use(new RateLimit({
  windowMs: 60*60*1000, // 1 hour
  max: 600, // limit each IP to 600 requests per windowMs
  delayMs: 0, // disable delaying - full speed until the max limit is reached
  message: 'You have exceeded your api usage, you are allowed 600 requests per hour'
}));

// markdown and static content serving
app.set('views', path.resolve(__dirname, './markdown-layouts'));
app.set('view engine', 'pug');
app.use(express.static(path.resolve(__dirname, './markdown-layouts')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/README.v1.md', (req, res) => res.redirect('./README.v1'));

const mdServer = new mds.MarkdownServer(path.resolve(__dirname, ''));
mdServer.resolverOptions.defaultPageName = 'README';
app.get(['/', '/README', '/README.v1'], (req, res, next) => {
  mdServer.get(req.path, (err, result) => {
    if (err) {
      console.error(err);
      return next();
    }
    res.render('layout', {markdownFile: result});
  });
});

// import all of the 'routes' JS files
require('./app/routes')(app);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Error - please try again or raise an issue at https://github.com/AdoptOpenJDK/openjdk-api/issues');
});
