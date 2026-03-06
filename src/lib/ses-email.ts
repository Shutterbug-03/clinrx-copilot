import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
});

const DEFAULT_SENDER = process.env.NEXT_PUBLIC_SES_SENDER || 'dr.arun@citymedical.com'; 

export async function sendPrescriptionEmail(
    doctorEmail: string, 
    patientEmail: string, 
    prescriptionHtml: string
) {
    try {
        const command = new SendEmailCommand({
            Source: DEFAULT_SENDER,
            Destination: {
                ToAddresses: [patientEmail, doctorEmail]
            },
            Message: {
                Subject: { Data: "Your Prescription from ClinRx Copilot", Charset: "UTF-8" },
                Body: {
                    Html: { Data: prescriptionHtml, Charset: "UTF-8" },
                    Text: { Data: "Please view this email in an HTML compatible client to see your prescription.", Charset: "UTF-8" }
                }
            }
        });
        
        const response = await sesClient.send(command);
        console.log("Email sent successfully! MessageId:", response.MessageId);
        return response.MessageId;
    } catch (error) {
        console.error("SES Error:", error);
        throw new Error("Failed to send prescription via SES");
    }
}
