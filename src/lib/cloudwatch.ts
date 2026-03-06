import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, DescribeLogStreamsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cwClient = new CloudWatchLogsClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

const LOG_GROUP = '/clinrx/api';
const LOG_STREAM = `api-events-${new Date().toISOString().split('T')[0]}`;

async function ensureLogStream() {
    try {
        const check = await cwClient.send(new DescribeLogStreamsCommand({
            logGroupName: LOG_GROUP,
            logStreamNamePrefix: LOG_STREAM
        }));
        
        if (!check.logStreams || check.logStreams.length === 0) {
            await cwClient.send(new CreateLogStreamCommand({
                logGroupName: LOG_GROUP,
                logStreamName: LOG_STREAM
            }));
        }
    } catch (e: any) {
        console.warn("CloudWatch init warning:", e.message);
    }
}

export async function logEvent(level: 'INFO' | 'WARN' | 'ERROR', message: string, route: string, durationMs?: number) {
    try {
        await ensureLogStream();
        
        const logData = {
            level,
            message,
            route,
            durationMs,
            timestamp: new Date().toISOString()
        };

        const command = new PutLogEventsCommand({
            logGroupName: LOG_GROUP,
            logStreamName: LOG_STREAM,
            logEvents: [
                {
                    message: JSON.stringify(logData),
                    timestamp: Date.now()
                }
            ]
        });
        
        await cwClient.send(command);
    } catch (error) {
        console.error("CloudWatch Logger Error:", error);
    }
}
