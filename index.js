const Promise = require('bluebird');
const moment = require('moment');
const { Stats } = require('fast-stats');
const s3 = require('./lib/s3');
const tmdb = require('./lib/tmdb');
const trakt = require('./lib/trakt');
const winston = require('./lib/winston');
// const metacritic = require('./lib/metacritic');
const rottenTomatoes = require('./lib/rotten-tomatoes');
const {
  extend, filter, get, map, pick, pluck, reject, uniq,
} = require('lodash');
let tempWrite = require('temp-write');

tempWrite = Promise.promisify(tempWrite);

const getImdbId = tmdb_id => Promise.resolve()
  .then(() => tmdb.getMovie(tmdb_id).then(movie => movie.imdb_id))
  .then((imdb_id) => { this.imdb_id = imdb_id; })
  .then(() => this.imdb_id);

// exports.getMetacriticMovies = () => Promise.resolve()
//   .then(() => metacritic())
//   .map(metacriticMovie => tmdb.searchMovie(metacriticMovie.title)
//     .then((movie) => {
//       movie.metacritic_score = metacriticMovie.score;
//       return movie;
//     }), { concurrency: 1 });

exports.getCertifiedFreshMovies = flag => Promise.resolve()
  .then(() => rottenTomatoes(flag))
  .map(freshMovie => tmdb.searchMovie(freshMovie.title)
    .then((movie) => {
      movie.metacritic_score = freshMovie.score;
      movie.user_score = freshMovie.user_score;
      return movie;
    }), { concurrency: 1 })
  .then(movies => reject(movies, movie => movie.id === undefined));

exports.filterByReleaseDate = results => Promise.resolve(results)
  .then((movies) => {
    // filter down these movies a little bit
    const tooOld = moment().subtract(2, 'year').valueOf();
    const tooNew = moment().subtract(7, 'days').valueOf();

    return filter(movies, (movie) => {
      const releaseDate = moment(movie.release_date, 'YYYY-MM-DD').valueOf();
      return releaseDate >= tooOld && releaseDate <= tooNew;
    });
  });

exports.filterByPopularity = results => Promise.resolve(results)
  .then(movies => filter(movies, (movie) => {
    winston.info('filterByPopularity', {
      title: movie.title,
      popularity: movie.popularity,
    });
    return movie.popularity >= 10.0;
  }));

exports.filterByVote = results => Promise.resolve(results)
  .then(movies => filter(movies, (movie) => {
    winston.info('filterByVote', {
      title: movie.title,
      vote_average: movie.vote_average,
    });
    return movie.vote_average >= 2.5;
  }));

exports.filterByMetacriticScore = results => Promise.resolve(results)
  .then(movies => filter(movies, (movie) => {
    winston.info('filterByMetacriticScore', {
      title: movie.title,
      metacritic_score: movie.metacritic_score,
    });
    return movie.metacritic_score >= 25;
  }));

exports.timeWeightField = (field) => {
  const halfYearAgo = moment().subtract(6, 'months').valueOf();

  return movies => map(movies, (movie) => {
    let value = movie[field];
    if (moment(movie.release_date, 'YYYY-MM-DD').valueOf() > halfYearAgo) { value *= 1.5; }
    movie[`weighted_${field}`] = value;
    return movie;
  });
};

exports.geometricAverageField = field => (movies) => {
  const stats = new Stats().push(pluck(movies, field));
  const mean = stats.gmean();

  return filter(movies, (movie) => {
    if (movie[field] < mean) {
      winston.warn(field, {
        title: movie.title,
        mean,
        value: movie[field],
      });
    }

    return movie[field] >= mean;
  });
};

exports.associateImdbIds = results => Promise.resolve(results)
  .map(movie => getImdbId(movie.id)
    .then((imdb_id) => {
      movie.imdb_id = imdb_id;
      return movie;
    }), { concurrency: 1 });

exports.getTraktData = results => Promise.resolve(results)
  .map(movie => Promise.resolve(trakt.getMovie(movie.imdb_id))
    .then(traktMovie => extend(movie, traktMovie)), { concurrency: 1 });

exports.uniqueMovies = results => uniq(results, m => m.imdb_id);

exports.sanatizeForResponse = results => Promise.resolve(results)
  .map(movie => pick(movie, [
    'title', 'imdb_id', 'poster_url', 'metacritic_score', 'user_score', 'mpaa',
  ]));

exports.filterByValue = (key, value) => movies =>
  filter(movies, movie => get(movie, key, 0) >= value);

exports.exportToS3 = (results) => {
  let bucketPath = 'fresh-movies.json';
  if (this.event.type === 'theater') bucketPath = 'fresh-movies-in-theaters.json';

  return Promise.resolve(results)
    // .then(exports => tempWrite(JSON.stringify(exports)))
    .then(data => s3.uploadJson(JSON.stringify(data), bucketPath));
};

exports.handler = (event = {}, context, callback) => {
  this.event = event;
  this.context = context;

  return Promise.resolve(this.getCertifiedFreshMovies(event.type))
    .bind({})
    // .then(this.filterByReleaseDate)
    // .then(this.filterByVote)
    // .then(this.filterByMetacriticScore)
    // .then(this.filterByValue('vote_count', 10))
    // .then(this.filterByPopularity)
    // .then(this.timeWeightField('vote_count'))
    // .then(this.geometricAverageField('weighted_vote_count'))
    .then(this.associateImdbIds)
    // .then(this.getTraktData)
    // .then(this.geometricAverageField('plays'))
    .then(this.uniqueMovies)
    .then(this.sanatizeForResponse)
    .then(event.exportToS3 ? this.exportToS3 : Promise.resolve())
    .nodeify(callback);
};
