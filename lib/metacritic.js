const cheerio = require('cheerio');
const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const { reject } = require('lodash');

const url = 'http://www.metacritic.com/browse/movies/release-date/theaters/date?campaign=new2';

module.exports = () => Promise.resolve()
  .then(() => request.getAsync(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
    },
  }))
  .spread((res, body) => {
    if (res.statusCode !== 200) {
      throw new Error(`Incorrect status code: ${res.statusCode}`);
    }

    const $ = cheerio.load(body);
    return $('td.wide_col').first().find('tr.summary_row').toArray();
  })
  .map((movie) => {
    const $movie = cheerio.load(movie);

    return {
      title: $movie('.title_wrapper a').text().trim(),
      score: $movie('.score_wrapper .metascore_w').text().trim(),
    };
  })
  .then(movies => reject(movies, movie => movie.title.length === 0));
