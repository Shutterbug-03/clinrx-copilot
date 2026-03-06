import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});
const docClient = DynamoDBDocumentClient.from(ddbClient);

export async function GET(request: NextRequest) {
    const email = request.nextUrl.searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    try {
        const response = await docClient.send(new GetCommand({
            TableName: process.env.DYNAMODB_DOCTORS_TABLE || 'ClinRx_Doctors',
            Key: { email }
        }));

        if (!response.Item) {
            return NextResponse.json({ error: 'Doctor not found' }, { status: 404 });
        }

        return NextResponse.json(response.Item);
    } catch (e) {
        console.error('DynamoDB Error fetching doctor:', e);
        return NextResponse.json({ error: 'Failed to fetch doctor profile' }, { status: 500 });
    }
}
