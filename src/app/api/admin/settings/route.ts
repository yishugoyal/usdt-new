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

// GET — System settings
export async function GET() {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const canManageSettings = hasPermission(staff.role, PERMISSIONS.MANAGE_SETTINGS, staff.email);
    const canManageRates = hasPermission(staff.role, PERMISSIONS.MANAGE_RATES, staff.email);

    if (!canManageSettings && !canManageRates) {
      return NextResponse.json(
        { error: 'Access denied. Required permission: MANAGE_SETTINGS or MANAGE_RATES' },
        { status: 403 }
      );
    }

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, settings: settings ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — Update a system setting by key
export async function PATCH(req: Request) {
  try {
    const staffOrRes = await requireStaff();
    if (staffOrRes instanceof NextResponse) return staffOrRes;
    const staff = staffOrRes;

    const { key, value, description } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }

    const isRateKey = RATE_KEYS.includes(key);
    const canManageSettings = hasPermission(staff.role, PERMISSIONS.MANAGE_SETTINGS, staff.email);
    const canManageRates = hasPermission(staff.role, PERMISSIONS.MANAGE_RATES, staff.email);

    if (!canManageSettings && !(isRateKey && canManageRates)) {
      return NextResponse.json(
        { error: 'Access denied. Required permission: MANAGE_SETTINGS' },
        { status: 403 }
      );
    }

    // Check if row already exists to preserve existing id, or generate a fresh UUID
    const { data: existing } = await supabase
      .from('system_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    const record: Record<string, any> = {
      id: existing?.id || uuidv4(),
      key,
      value: String(value),
      updatedAt: new Date().toISOString(),
    };
    if (description !== undefined) record.description = description;

    const { error } = await supabase
      .from('system_settings')
      .upsert(record, { onConflict: 'key' });

    if (error) throw error;

    await logAudit(staff, 'UPDATE_SETTING', 'system_settings', record.id, {
      key,
      newValue: String(value),
    });

    return NextResponse.json({ success: true, message: `Setting '${key}' updated` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
