import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireStaff, hasPermission, PERMISSIONS, logAudit } from '@/lib/admin-auth';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const RATE_KEYS = [
  'MANUAL_USDT_INR_RATE',
  'DEFAULT_SPREAD_PERCENTAGE',
  'DEFAULT_COMPANY_FEE_PERCENTAGE',
  'MIN_SELL_USDT',
  'MAX_SELL_USDT',
  'QUOTE_EXPIRY_SECONDS',
];

export async function GET() {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;

    // Fetch rate settings from database
    const { data: dbSettings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', RATE_KEYS);

    const settingsMap: Record<string, string> = {};
    (dbSettings || []).forEach((row: { key: string; value: string }) => {
      settingsMap[row.key] = row.value;
    });

    const manualRateStr = settingsMap['MANUAL_USDT_INR_RATE'] || process.env.MANUAL_USDT_INR_RATE || '90.00';
    const manualRate = parseFloat(manualRateStr) || 90.00;

    return NextResponse.json({
      success: true,
      liveRate: manualRate,
      rateSource: 'Manual (Admin Set)',
      settings: settingsMap,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const canManageRates = hasPermission(staff.role, PERMISSIONS.MANAGE_RATES, staff.email);
    const canManageSettings = hasPermission(staff.role, PERMISSIONS.MANAGE_SETTINGS, staff.email);

    if (!canManageRates && !canManageSettings) {
      return NextResponse.json(
        { error: 'Access denied. Required permission: MANAGE_RATES' },
        { status: 403 }
      );
    }

    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    if (!RATE_KEYS.includes(key)) {
      return NextResponse.json({ error: `Invalid rate parameter: ${key}` }, { status: 400 });
    }

    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0) {
      return NextResponse.json({ error: 'Value must be a valid non-negative number' }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    const record = {
      id: existing?.id || uuidv4(),
      key,
      value: String(value),
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('system_settings')
      .upsert(record, { onConflict: 'key' });

    if (error) throw error;

    await logAudit(staff, 'UPDATE_RATE_SETTING', 'system_settings', record.id, {
      key,
      newValue: String(value),
    });

    return NextResponse.json({ success: true, message: `Setting '${key}' updated to ${value}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
