import type { Construct, Environment } from '@aws-cdk/core'
import { CfnOutput, CfnResource, Duration, Stack } from '@aws-cdk/core'
import path from 'path'
import {
  Runtime,
  Function,
  Code,
  CfnUrl,
  FunctionUrlAuthType,
} from '@aws-cdk/aws-lambda'
import { Bucket, HttpMethods } from '@aws-cdk/aws-s3'
import { BucketDeployment, Source } from '@aws-cdk/aws-s3-deployment'

interface Props {
  env: Environment
  environment: Record<string, string>
  bucket: {
    name: string
    allowedHeaders?: string
    allowedOrigins?: string
  }
}

export class RemixApp extends Stack {
  public constructor(scope: Construct, id: string, props: Props) {
    const { env, environment, bucket } = props

    super(scope, id, { env })

    const remixAppHandler = new Function(this, 'RemixAppHandler', {
      handler: 'lambda/handler.handler',
      code: Code.fromAsset(path.join(__dirname, '..', '..', 'build')),
      memorySize: 128,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.minutes(5),
      environment,
    })

    new CfnUrl(this, 'RemixAppLambdaUrl', {
      targetFunctionArn: remixAppHandler.functionArn,
      authType: FunctionUrlAuthType.NONE,
    })

    new CfnResource(this, 'RemixAppPermission', {
      type: 'AWS::Lambda::Permission',
      properties: {
        Action: 'lambda:InvokeFunctionUrl',
        FunctionName: remixAppHandler.functionArn,
        Principal: '*',
        FunctionUrlAuthType: 'NONE',
      },
    })

    const assetsBucket = new Bucket(this, 'AssetsBucket', {
      bucketName: bucket.name,
      publicReadAccess: true,
      cors: [
        {
          allowedHeaders: bucket.allowedHeaders
            ? [...bucket.allowedHeaders.split(',')]
            : ['*'],
          allowedMethods: [
            HttpMethods.DELETE,
            HttpMethods.GET,
            HttpMethods.HEAD,
            HttpMethods.POST,
            HttpMethods.PUT,
          ],
          allowedOrigins: bucket.allowedOrigins
            ? [...bucket.allowedOrigins.split(',')]
            : ['*'],
          exposedHeaders: ['ETag'],
        },
      ],
    })

    new CfnOutput(this, 'AssetsBucketUrl', {
      value: assetsBucket.bucketWebsiteUrl,
    })

    new BucketDeployment(this, 'AssetsBucketDeployment', {
      sources: [Source.asset(path.join(__dirname, '..', '..', 'public'))],
      destinationBucket: assetsBucket,
    })
  }
}
