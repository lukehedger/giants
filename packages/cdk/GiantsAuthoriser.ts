import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  type MethodOptions,
} from 'aws-cdk-lib/aws-apigateway';
import { UserPool } from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface GiantsAuthoriserProps {
  userPoolArn: string;
}

export class GiantsAuthoriser extends Construct {
  public readonly methodOptions: MethodOptions;

  constructor(scope: Construct, id: string, props: GiantsAuthoriserProps) {
    super(scope, id);

    const userPool = UserPool.fromUserPoolArn(
      this,
      'UserPool',
      props.userPoolArn,
    );

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [userPool],
    });

    this.methodOptions = {
      authorizer,
      authorizationType: AuthorizationType.COGNITO,
    };
  }
}
