import type { Construct, Environment} from '@aws-cdk/core';
import { CfnResource, Duration, Stack } from '@aws-cdk/core'
import path from 'path'
import { Runtime, Function, Code, CfnUrl, FunctionUrlAuthType } from '@aws-cdk/aws-lambda'

interface Props {
  env: Environment
  environment: Record<string, string>
}

export class RemixAppLambda extends Stack {

  public constructor(scope: Construct, id: string, props: Props) {
    const { env, environment } = props

    super(scope, id, { env });

    const remixAppHandler = new Function(this, "RemixAppHandler", {
      handler: "lambda/handler.handler",
      code: Code.fromAsset(path.join(__dirname, "..", "..", "build")),
      memorySize: 128,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.minutes(5),
      environment,
    });

    new CfnUrl(this, "RemixAppLambdaUrl", {
      targetFunctionArn: remixAppHandler.functionArn,
      authType: FunctionUrlAuthType.NONE,
    });

    new CfnResource(this, "RemixAppPermission", {
      type: "AWS::Lambda::Permission",
      properties: {
        Action: "lambda:InvokeFunctionUrl",
        FunctionName: remixAppHandler.functionArn,
        Principal: "*",
        FunctionUrlAuthType: "NONE",
      },
    });
  }
}
