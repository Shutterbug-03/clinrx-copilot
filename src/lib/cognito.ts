import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";

export const COGNITO_REGION = process.env.NEXT_PUBLIC_AWS_REGION || 'ap-south-1';
export const USER_POOL_ID = process.env.NEXT_PUBLIC_USER_POOL_ID || '';
export const CLIENT_ID = process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '';

// Initialize only if variables are present to avoid build-time crashes
export const userPool = (USER_POOL_ID && CLIENT_ID)
    ? new CognitoUserPool({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
    })
    : null;

export const cognitoClient = new CognitoIdentityProviderClient({
    region: COGNITO_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});
