# moldy-pumpkins

This repo is based on the [Steven Lu popular movies list](https://github.com/sjlu/popular-movies).

## Lists

Currently, this tool outputs 2 lists:

* Certified Fresh in theaters ([feed](https://s3.amazonaws.com/moldy-pumpkins/fresh-movies-in-theaters.json)) ([RT](https://www.rottentomatoes.com/browse/dvd-streaming-upcoming))
* Certified Fresh dvd/streaming releases ([feed](https://s3.amazonaws.com/moldy-pumpkins/fresh-movies.json)) ([RT](https://www.rottentomatoes.com/browse/cf-in-theaters/))

Since many indie movies go straight to streaming services, using both lists together should catch nearly all new Certified Fresh titles. If you're getting too many documentaries or low budget releases, try using the first list only.

I plan to add a third list for popular movies on RT, similar to Steven Lu's list.

## Usage

You can poll the following JSON files for a list of movies.

```
https://s3.amazonaws.com/moldy-pumpkins/fresh-movies.json
https://s3.amazonaws.com/moldy-pumpkins/fresh-movies-in-theaters.json
```

  * This file is regenerated nightly so it is recommended that you
    only poll this file once per day.
  * It is recommended that you take a snapshot of this list and not
    remove based on the list no longer displaying a particular movie.

## Develop

This list utilizes AWS SAM to deploy a Lambda that publishes to S3. You can work locally using the `aws-sam-local`.

Dependencies:

* Node v6.10
* AWS CLI installed and a user profile setup
* `.env` file with at least the following variable: `TMDB_KEY`

Running `npm test` will trigger a simple console output of the `fresh-movies` results. To test more complex operations, I've included several event objects in `sample-events/` that can be triggered by `sam local`:

`sam local invoke -e sample-events/export-fresh-movies.json CertifiedFresh`

## Deployment

To deploy, you must first update the CloudFormation package, then push it to AWS to trigger an update:

```
aws cloudformation package --template-file template.yaml --output-template-file output.yaml --s3-bucket <AWS_BUCKET>
aws cloudformation deploy --template-file output.yaml --stack-name <STACK_NAME> --parameter-overrides TmdbKey=<TMDB_KEY> --capabilities CAPABILITY_IAM
```
