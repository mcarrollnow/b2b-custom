import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

type Item = { item: string; qty: string };

function generateOrderCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `B2B-${code}`;
}

// --- BEGIN PRICE LIST ---
const PRICE_LIST: Record<string, number> = {
  "Oxytocin Acetate - 2mg": 72,
  "PEG-MGF": 72,
  "PT-141 5mg": 50,
  "Selank 5mg": 72,
  "Semaglutide 2mg": 60,
  "Semax 10mg": 80,
  "Sermorelin 2mg": 60,
  "Snap-8 10mg": 60,
  "Thymulin": 72,
  "Tesamorelin 10 mg": 152,
  "Tesamorelin 5 mg": 112,
  "Tesamorelin 2 mg": 60,
  "Thymosin alpha 1 - 5 MG": 84,
  "TB-500 (Thymosin Œ≤4) 2mg": 48,
  "Retatrutide 10 MG": 19992,
  "Adipotide - 10 MG": 152,
  "NAD+ 500mg": 112,
  "AOD-9604 2mg": 48,
  "BPC 157 2mg": 36,
  "Cagrilintide 5mg": 120,
  "DSIP (Delta Sleep-Inducing Peptide) 5mg": 72,
  "Epithalon 10mg": 60,
  "GHK-Cu 50mg": 52,
  "GHRP-2 - 2mg": 28,
  "HCG 5,000iu": 100,
  "IGF-1 LR3 1mg": 192,
  "Kisspeptin-10 5mg": 60,
  "MOTS-C 10mg": 72,
  "Melanotan 2 10mg": 36,
  "CJC-1295 with DAC 5mg": 65,
  "Tirzepatide 5mg": 112,
  "Tirzepatide 10 mg": 156,
  "Tirzepatide 15 mg": 200,
  "Tirzepatide 30 mg": 280,
  "Tirzepatide 60 mg": 440,
  "Thymosin alpha 1 - 10 MG": 140,
  "TB-500 (Thymosin Œ≤4) 5mg": 84,
  "TB-500 (Thymosin Œ≤4) 10mg": 128,
  "Semaglutide 5mg": 112,
  "Semaglutide 10mg": 160,
  "Sermorelin 5mg": 108,
  "SS-31 10mg": 84,
  "GHRP-2 5mg": 52,
  "GHK-Cu 100mg": 72
};
// --- END PRICE LIST ---

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    // Honeypot check
    if (data.company) {
      return NextResponse.json({ ok: true });
    }
    const { name, email, referredBy, shippingAddress, shippingCity, shippingState, shippingZip, items, special } = data;
    if (!name || !email || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    // Load price list and calculate total
    let orderTotal = 0;
    const itemList = (items as Item[]).map((item, i) => {
      const price = PRICE_LIST[item.item?.trim() || ''] || 0;
      const qty = parseInt(item.qty || '0', 10);
      const lineTotal = price * qty;
      orderTotal += lineTotal;
      return `${i + 1}. ${item.item || ''} (Qty: ${item.qty || 0}) - $${price} x ${qty} = $${lineTotal}`;
    }).join('\n');
    // Generate random order code
    const orderCode = generateOrderCode();
    
    // Format shipping address
    const shippingInfo = [shippingAddress, shippingCity, shippingState, shippingZip]
      .filter(Boolean)
      .join(', ');
    
    // Compose email body
    const mailText = `New request received:

Order Code: ${orderCode}
Name: ${name}
Email: ${email}
${referredBy ? `Referred By: ${referredBy}` : ''}
${shippingInfo ? `Shipping Address: ${shippingInfo}` : ''}

Items Requested:
${itemList}

${special ? `Special Instructions: ${special}` : ''}

Order Total: $${orderTotal.toFixed(2)}`;
    
    // Set up transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_RECEIVER || process.env.GMAIL_USER,
      subject: `New B2B Request (${orderCode})`,
      text: mailText,
      replyTo: email,
    });

    // --- Google Sheets append logic ---
    try {
      // Dynamically import googleapis for edge compatibility
      const { google } = await import('googleapis');
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = '1NgljLac71DtjWuV9gvaWxIAmdFHR6tjGrJ2dRgacHrQ';
      const range = 'Sheet1!A1:Z'; // Adjust if your tab is not Sheet1
      
      // Create arrays for all columns
      const row = [
        new Date().toISOString(), // A: Timestamp
        '', // B: Customer Rank (empty for now)
        referredBy || '', // C: Referred by
        name, // D: Name
        email, // E: Email
        '', // F: Mobile Number (not collected yet)
        orderCode, // G: Purchase Order Number
      ];
      
      // Add Product columns (H-W: columns 7-23)
      for (let i = 0; i < 8; i++) {
        const item = items[i];
        row.push(item?.item || ''); // Product columns
      }
      
      // Add Quantity columns (X-AF: columns 24-31)
      for (let i = 0; i < 8; i++) {
        const item = items[i];
        row.push(item?.qty || ''); // Quantity columns
      }
      
      // Add shipping address fields (Z-AC: columns 25-28)
      row.push(
        shippingAddress || '', // Z: Shipping Address Street
        shippingCity || '',    // AA: Shipping Address City
        shippingZip || '',     // AB: Shipping Address Zip
        shippingState || ''    // AC: Shipping Address State
      );
      
      // Add invoice fields (AD-AJ: columns 29-35)
      row.push(
        '', // AD: Invoice Platform
        '', // AE: Invoice Timestamp
        '', // AF: Invoice ID
        '', // AG: Invoice Status
        orderTotal.toFixed(2), // AH: Total Amount Due
        '', // AI: Total Amount Paid
        ''  // AJ: Balance Owed
      );
      
      // Add special instructions (AK: column 36)
      row.push(special || '');
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });
    } catch (sheetError) {
      console.error('Failed to append to Google Sheet:', sheetError);
      // Optionally, return error here if you want to fail the whole request
    }

    return NextResponse.json({ ok: true, orderTotal: orderTotal.toFixed(2) });
  } catch (error) {
    console.error('API send-request error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}