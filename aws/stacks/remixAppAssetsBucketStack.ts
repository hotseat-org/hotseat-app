import type { Construct, Environment} from '@aws-cdk/core';
import { Stack, CfnOutput } from '@aws-cdk/core'
import { Bucket, HttpMethods } from '@aws-cdk/aws-s3'
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment'
import path from 'path'

export interface RemixAppAssetsBucketProps {
  env: Environment
  bucketName: string
  allowedHeaders?: string;
  allowedOrigins?: string;
}

export class RemixAppAssetsBucket extends Stack {
  public constructor(scope: Construct, id: string, props: RemixAppAssetsBucketProps) {
    const { allowedHeaders, allowedOrigins, env, bucketName } = props

    super(scope, id, { env })

    const assetsBucket = new Bucket(this, "AssetsBucket", {
      bucketName,
      publicReadAccess: true,
      cors: [
        {
          allowedHeaders: allowedHeaders ? [...allowedHeaders.split(',')] : ['*'],
          allowedMethods: [HttpMethods.DELETE, HttpMethods.GET, HttpMethods.HEAD, HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins: allowedOrigins ? [...allowedOrigins.split(',')] : ['*'],
          exposedHeaders: ['ETag'],
        },
      ],
    });

    new CfnOutput(this, "AssetsBucketUrl", { value: assetsBucket.bucketWebsiteUrl })

    new BucketDeployment(this, "AssetsBucketDeployment", {
      sources: [Source.asset(path.join(__dirname, "..", "..", "public"))],
      destinationBucket: assetsBucket,
    });
  }
}
