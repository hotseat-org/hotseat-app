import { RemixAppLambda } from '../stacks/remixAppLambdaStack'
import type { Environment } from '@aws-cdk/core'
import { App } from '@aws-cdk/core'
import { RemixAppAssetsBucket } from '../stacks/remixAppAssetsBucketStack'
import * as process from 'process'

require('dotenv').config()

const env: Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
}

const app = new App()

new RemixAppLambda(app, 'RemixAppLambda', {
  env,
  environment: {
    BASE_URL: process.env.BASE_URL as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID as string,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET as string,
  },
})

new RemixAppAssetsBucket(app, 'RemixAppAssetsBucket', {
  env,
  bucketName: process.env.ASSETS_BUCKET_NAME as string,
})
