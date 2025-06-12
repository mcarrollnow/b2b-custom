import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

type Item = { item: string; qty: string };

function generateOrderCode() {
  // Generate B2B order code with date: B2B-MMDD-XXXX-N format
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateCode = `${month}${day}`;
  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomCode = '';
  for (let i = 0; i < 4; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  const sessionCounter = 1;
  return `B2B-${dateCode}-${randomCode}-${sessionCounter}`;
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

    // --- Google Sheets append logic using Perfect 29-Column Mapping ---
    try {
      // Dynamically import googleapis for edge compatibility
      const { google } = await import('googleapis');
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      
      // ✅ UNIFIED GOOGLE SHEET - Same as newpurchaseform and b2b
      const spreadsheetId = '1UGEuFVCLfAJas8Qd2Mjh_kZEb4IBYC4ElJFANRW441Q';
      const range = 'Orders!A:AC';
      
      // Transform B2B-Custom form data to Perfect 29-Column Structure (A-AC)
      const now = new Date().toISOString();
      const row = new Array(29).fill(''); // 29 columns (A-AC)
      
      // Map B2B-Custom form data to exact column positions
      row[0] = now;                           // A: Submission_Timestamp
      row[1] = orderCode;                     // B: Order_Code (B2B-MMDD-XXXX-N format)
      row[2] = 'B2B_TRANSACTION';             // C: Record_Type
      row[3] = name || '';                    // D: Customer_Name
      row[4] = email || '';                   // E: Email
      row[5] = '';                            // F: Business_Name (not collected in current form)
      row[6] = '';                            // G: Phone (not collected in current form)
      row[7] = shippingAddress || '';         // H: Address_Street
      row[8] = shippingCity || '';            // I: Address_City
      row[9] = shippingState || '';           // J: Address_State
      row[10] = shippingZip || '';            // K: Address_ZIP
      
      // Map items array to product columns (L-T: 3 products × 3 fields each)
      for (let i = 0; i < Math.min(3, items.length); i++) {
        const item = items[i];
        const baseIndex = 11 + (i * 3); // Start at column L (index 11)
        const price = PRICE_LIST[item.item?.trim() || ''] || 0;
        
        row[baseIndex] = item.item || '';       // Product_X_Name
        row[baseIndex + 1] = price.toString();  // Product_X_Price
        row[baseIndex + 2] = item.qty || '';    // Product_X_Quantity
      }
      
      row[20] = orderTotal.toFixed(2);        // U: Total_Amount
      row[21] = special || '';                // V: Special_Instructions
      row[22] = 'B2B';                        // W: Order_Type
      row[23] = 'B2B_CUSTOM_FORM';            // X: Submission_Source (distinguish from regular B2B)
      row[24] = 'PENDING';                    // Y: Payment_Status
      row[25] = 'PENDING';                    // Z: Fulfillment_Status
      row[26] = 'PENDING';                    // AA: Invoice_Status
      row[27] = 'SUBMITTED';                  // AB: Lifecycle_Stage
      row[28] = now;                          // AC: Last_Updated
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });
      
      console.log('✅ B2B-Custom order inserted into unified sheet:', orderCode);
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