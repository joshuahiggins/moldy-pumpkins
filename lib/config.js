const { defaults } = require('lodash');
const dotenv = require('dotenv');

// load dotenv config vars if available
dotenv.load();

const config = {
  TMDB_KEY: '',
  TRAKT_KEY: '',
  TMDB_POSTER_URL: 'http://image.tmdb.org/t/p/w500',
  AWS_BUCKET: 'moldy-pumpkins',
  AWS_KEY: '',
  AWS_SECRET: '',
};

module.exports = defaults(process.env, config);
