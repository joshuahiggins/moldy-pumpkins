const Promise = require('bluebird');
const request = Promise.promisifyAll(require('request'));
const { reject } = require('lodash');

const urls = {
  theater: 'https://www.rottentomatoes.com/api/private/v2.0/browse?maxTomato=100&maxPopcorn=100&services=amazon%3Bhbo_go%3Bitunes%3Bnetflix_iw%3Bvudu%3Bamazon_prime%3Bfandango_now&certified&sortBy=release&type=cf-in-theaters',
  dvd: 'https://www.rottentomatoes.com/api/private/v2.0/browse?minTomato=70&maxTomato=100&maxPopcorn=100&services=amazon%3Bhbo_go%3Bitunes%3Bnetflix_iw%3Bvudu%3Bamazon_prime%3Bfandango_now&certified=true&sortBy=release&type=dvd-streaming-upcoming',
};

module.exports = (flag = 'dvd') => Promise.resolve()
  .then(() => {
    const url = urls[flag] === undefined ? urls.theater : urls[flag];
    return request.getAsync(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36',
      },
    });
  })
  .spread((res, body) => {
    if (res.statusCode !== 200) {
      throw new Error(`Incorrect status code: ${res.statusCode}`);
    }
    return JSON.parse(body).results;
  })
  .map(movie => ({
    title: movie.title,
    score: movie.tomatoScore,
    user_score: movie.popcornScore,
    mpaa: movie.mpaaRating,
  }))
  .then(movies => reject(movies, movie => movie.title.length === 0));
