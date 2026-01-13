import { NextRequest, NextResponse } from 'next/server';
import { scanText } from '@/lib/scanner';

export async function POST(req: NextRequest) {
    try {
        const contentType = req.headers.get('content-type') || '';
        let textToScan = '';
        let filename: string | undefined;

        if (contentType.includes('application/json')) {
            const body = await req.json();
            textToScan = body.text || '';
            filename = body.filename;
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file');

            if (file && file instanceof File) {
                textToScan = await file.text();
                filename = file.name;
            } else {
                const text = formData.get('text');
                if (text) textToScan = text.toString();
            }
        }

        if (!textToScan) {
            return NextResponse.json({ findings: [] });
        }

        const findings = scanText(textToScan, filename);
        return NextResponse.json({ findings });

    } catch (error) {
        console.error('Scan error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
