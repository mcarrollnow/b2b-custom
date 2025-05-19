import { NextResponse } from 'next/server';

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

export async function GET() {
  const items = Object.entries(PRICE_LIST).map(([item, price]) => ({ item, price }));
  return NextResponse.json(items);
} 