const { DynamoDBClient, ScanCommand, DeleteCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand: DocDeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load env manually since dotenv might not be in the path
function loadEnv() {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        env.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) process.env[key.trim()] = value.trim();
        });
    }
}
loadEnv();

const REGION = process.env.AWS_REGION || "ap-south-1";
const client = new DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});
const dynamoDb = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const patientsToDelete = ["Sunita Sharma", "Amit Kumar", "Test Patient AWS"];

async function runCleanup() {
    console.log("Starting cleanup for:", patientsToDelete.join(", "));

    // 1. DynamoDB Cleanup
    try {
        const table = process.env.DYNAMODB_PATIENTS_TABLE || "ClinRx_Patients";
        const { Items } = await dynamoDb.send(new ScanCommand({ TableName: table }));

        for (const item of (Items || [])) {
            const name = item.name?.S || item.name;
            const id = item.patient_id?.S || item.patient_id;

            if (patientsToDelete.includes(name)) {
                console.log(`Deleting from DynamoDB: ${name} (${id})`);
                await dynamoDb.send(new DocDeleteCommand({
                    TableName: table,
                    Key: { patient_id: id }
                }));
                console.log("✅ Deleted from DynamoDB");
            }
        }
    } catch (err) {
        console.error("DynamoDB cleanup failed:", err.message);
    }

    // 2. Supabase Cleanup
    try {
        for (const name of patientsToDelete) {
            console.log(`Deleting from Supabase: ${name}`);
            const { data, error } = await supabase
                .from("patients")
                .delete()
                .eq("name", name);

            if (error) {
                console.error(`❌ Supabase failed for ${name}:`, error.message);
            } else {
                console.log(`✅ Deleted ${name} from Supabase`);
            }
        }
    } catch (err) {
        console.error("Supabase cleanup failed:", err.message);
    }

    console.log("\nCleanup complete.");
}

runCleanup();
