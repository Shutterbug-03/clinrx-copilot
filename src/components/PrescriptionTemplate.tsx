'use client';

import { useRef } from 'react';

interface MedicationAlternative {
    drug: string;
    dose: string;
    reason?: string;
}

interface PrescriptionMedicationData {
    drug: string;
    dose: string;
    frequency: string;
    duration: string;
    route: string;
    alternatives?: MedicationAlternative[];
}

interface PrescriptionData {
    hospital: {
        name: string;
        address: string;
        phone: string;
        email: string;
        logo?: string;
    };
    doctor: {
        name: string;
        qualifications: string;
        regNumber: string;
        specialty: string;
    };
    patient: {
        name: string;
        age: number;
        sex: string;
        id: string;
    };
    prescription: {
        rxNumber: string;
        date: string;
        medications: PrescriptionMedicationData[];
        warnings?: string[];
    };
}

interface PrescriptionTemplateProps {
    data: PrescriptionData;
    onClose?: () => void;
}

export function PrescriptionTemplate({ data, onClose }: PrescriptionTemplateProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const content = printRef.current;
        if (!content) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription - ${data.patient.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; }
            .prescription { max-width: 800px; margin: 0 auto; border: 2px solid #1e40af; padding: 24px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 16px; }
            .hospital-name { font-size: 24px; font-weight: bold; color: #1e40af; }
            .hospital-info { font-size: 12px; color: #64748b; margin-top: 4px; }
            .logo { max-height: 60px; }
            .doctor-section { display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 12px; }
            .doctor-name { font-weight: 600; font-size: 14px; }
            .doctor-info { font-size: 12px; color: #64748b; }
            .rx-info { text-align: right; font-size: 12px; color: #64748b; }
            .patient-section { background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .patient-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .patient-name { font-size: 16px; font-weight: 600; }
            .rx-symbol { font-size: 28px; color: #1e40af; font-weight: bold; margin: 16px 0 8px; }
            .medication { padding: 12px 0; border-bottom: 1px dashed #e2e8f0; }
            .medication:last-child { border-bottom: none; }
            .med-name { font-size: 16px; font-weight: 600; color: #1e293b; }
            .med-sig { font-size: 13px; color: #64748b; margin-top: 4px; }
            .med-alt { font-size: 11px; color: #94a3b8; margin-top: 6px; font-style: italic; }
            .warnings { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 8px; margin-top: 16px; }
            .warnings-title { font-size: 12px; font-weight: 600; color: #92400e; margin-bottom: 4px; }
            .warning-item { font-size: 12px; color: #78350f; }
            .signature-section { margin-top: 32px; display: flex; justify-content: flex-end; }
            .signature-box { text-align: center; }
            .signature-line { width: 200px; border-top: 1px solid #1e293b; margin-bottom: 4px; }
            .signature-text { font-size: 12px; color: #64748b; }
            .alternatives-footer { margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
            .alts-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .alt-item { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
            @media print { body { padding: 0; } .prescription { border: none; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleDownload = () => {
        handlePrint();
    };

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: `Prescription for ${data.patient.name}`,
                text: `Prescription ${data.prescription.rxNumber}`,
            });
        } else {
            alert('Share: Copy prescription link (sharing not supported in this browser)');
        }
    };

    // Collect all alternatives from medications
    const allAlternatives = data.prescription.medications
        .filter(med => med.alternatives && med.alternatives.length > 0)
        .map(med => ({
            primary: med.drug,
            alternatives: med.alternatives || []
        }));

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
                {/* Toolbar */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-slate-900">Preview Prescription</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleShare}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            📤 Share
                        </button>
                        <button
                            onClick={handleDownload}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            📥 Download PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            🖨️ Print
                        </button>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-3 py-2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Prescription Content */}
                <div className="p-6">
                    <div ref={printRef} className="prescription border-2 border-teal-700 p-6 bg-white">
                        {/* Header */}
                        <div className="header flex justify-between items-start border-b-2 border-teal-700 pb-4 mb-4">
                            <div>
                                <h1 className="hospital-name text-2xl font-bold text-teal-800">{data.hospital.name}</h1>
                                <p className="hospital-info text-sm text-slate-500 mt-1">{data.hospital.address}</p>
                                <p className="hospital-info text-sm text-slate-500">📞 {data.hospital.phone} | ✉️ {data.hospital.email}</p>
                            </div>
                            {data.hospital.logo && (
                                <img src={data.hospital.logo} alt="Hospital Logo" className="logo max-h-16" />
                            )}
                        </div>

                        {/* Doctor & Rx Info */}
                        <div className="doctor-section flex justify-between border-b border-slate-200 pb-3 mb-3">
                            <div>
                                <p className="doctor-name font-semibold">{data.doctor.name}</p>
                                <p className="doctor-info text-sm text-slate-500">{data.doctor.qualifications}</p>
                                <p className="doctor-info text-sm text-slate-500">Reg. No: {data.doctor.regNumber}</p>
                            </div>
                            <div className="rx-info text-right text-sm text-slate-500">
                                <p>Date: {data.prescription.date}</p>
                                <p>Rx No: {data.prescription.rxNumber}</p>
                            </div>
                        </div>

                        {/* Patient Info */}
                        <div className="patient-section bg-slate-50 p-3 rounded-lg mb-4">
                            <div className="flex gap-8">
                                <div>
                                    <p className="patient-label text-xs text-slate-400 uppercase">Patient</p>
                                    <p className="patient-name font-semibold">{data.patient.name}</p>
                                </div>
                                <div>
                                    <p className="patient-label text-xs text-slate-400 uppercase">Age / Sex</p>
                                    <p className="font-medium">{data.patient.age} / {data.patient.sex}</p>
                                </div>
                                <div>
                                    <p className="patient-label text-xs text-slate-400 uppercase">Patient ID</p>
                                    <p className="font-mono text-sm">{data.patient.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Rx Symbol */}
                        <p className="rx-symbol text-3xl font-bold text-teal-700 my-4">℞</p>

                        {/* Medications */}
                        <div className="medications space-y-4">
                            {data.prescription.medications.map((med, i) => (
                                <div key={i} className="medication py-3 border-b border-dashed border-slate-200">
                                    <p className="med-name text-lg font-semibold text-slate-900">
                                        {i + 1}. {med.drug} {med.dose}
                                    </p>
                                    <p className="med-sig text-sm text-slate-600 mt-1">
                                        Sig: {med.frequency} × {med.duration} | Route: {med.route}
                                    </p>
                                    {/* Inline subtle alternative hint */}
                                    {med.alternatives && med.alternatives.length > 0 && (
                                        <p className="med-alt text-xs text-slate-400 mt-1 italic">
                                            Alt: {med.alternatives.map(a => a.drug).join(' / ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Warnings */}
                        {data.prescription.warnings && data.prescription.warnings.length > 0 && (
                            <div className="warnings bg-amber-50 border border-amber-300 p-3 rounded-lg mt-4">
                                <p className="warnings-title text-xs font-semibold text-amber-800 mb-1">⚠️ Important Notes</p>
                                {data.prescription.warnings.map((w, i) => (
                                    <p key={i} className="warning-item text-sm text-amber-700">{w}</p>
                                ))}
                            </div>
                        )}

                        {/* Signature */}
                        <div className="signature-section flex justify-end mt-8">
                            <div className="signature-box text-center">
                                <div className="signature-line w-48 border-t border-slate-900 mb-1"></div>
                                <p className="signature-text text-sm text-slate-500">{data.doctor.name}</p>
                                <p className="text-xs text-slate-400">Authorized Signature</p>
                            </div>
                        </div>

                        {/* Alternatives Section - Subtle, at bottom using white space */}
                        {allAlternatives.length > 0 && (
                            <div className="alternatives-footer mt-8 pt-4 border-t border-dashed border-slate-200">
                                <p className="alts-title text-xs text-slate-400 uppercase tracking-wider mb-3">
                                    📋 Substitution Options (If unavailable)
                                </p>
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                    {allAlternatives.map((item, idx) => (
                                        <div key={idx} className="text-xs text-slate-400">
                                            <span className="text-slate-500">{item.primary}:</span>{' '}
                                            <span className="italic">
                                                {item.alternatives.map((alt, i) => (
                                                    <span key={i}>
                                                        {alt.drug}
                                                        {i < item.alternatives.length - 1 && ' / '}
                                                    </span>
                                                ))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="footer text-center mt-6 pt-3 border-t border-slate-200">
                            <p className="text-xs text-slate-400">
                                This prescription was generated with ClinRx Copilot • AI-Assisted Clinical Decision Support
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                Valid for 30 days from date of issue • For queries: {data.hospital.phone}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
