import fs from 'fs';
import path from 'path';
import process from 'process';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseValue(value) {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function parseFilters(rawFilter) {
  if (!rawFilter) {
    throw new Error('Missing filter. Expected format: column=value[,column2=value2]');
  }

  return rawFilter
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const separator = pair.indexOf('=');
      if (separator === -1) {
        throw new Error(`Invalid filter \"${pair}\". Use column=value`);
      }

      const column = pair.slice(0, separator).trim();
      const value = parseValue(pair.slice(separator + 1).trim());

      if (!column) {
        throw new Error(`Invalid filter \"${pair}\". Column cannot be empty.`);
      }

      return { column, value };
    });
}

function applyFilters(query, filters) {
  let current = query;
  for (const filter of filters) {
    current = current.eq(filter.column, filter.value);
  }
  return current;
}

function printUsage() {
  console.log('Usage:');
  console.log('  npm run db -- list <table> [limit] [column=value[,column2=value2]]');
  console.log('  npm run db -- get <table> <column=value[,column2=value2]>');
  console.log('  npm run db -- insert <table> <jsonObject>');
  console.log('  npm run db -- update <table> <column=value[,column2=value2]> <jsonPatch>');
  console.log('  npm run db -- delete <table> <column=value[,column2=value2]>');
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const supabase = createClient(url, serviceRoleKey);

  const [command, table, arg3, arg4] = process.argv.slice(2);

  if (!command || !table) {
    printUsage();
    process.exit(1);
  }

  if (command === 'list') {
    const limit = Number.isFinite(Number(arg3)) ? Number(arg3) : 20;
    const filterInput = Number.isFinite(Number(arg3)) ? arg4 : arg3;
    let query = supabase.from(table).select('*', { count: 'exact' }).limit(limit);
    if (filterInput) {
      query = applyFilters(query, parseFilters(filterInput));
    }
    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ table, count, rows: data }, null, 2));
    return;
  }

  if (command === 'get') {
    const filters = parseFilters(arg3);
    const query = applyFilters(supabase.from(table).select('*'), filters);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ table, rows: data }, null, 2));
    return;
  }

  if (command === 'insert') {
    if (!arg3) {
      throw new Error('Missing JSON object for insert.');
    }

    const payload = JSON.parse(arg3);
    const { data, error } = await supabase.from(table).insert(payload).select();
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ action: 'insert', table, rows: data }, null, 2));
    return;
  }

  if (command === 'update') {
    if (!arg3 || !arg4) {
      throw new Error('Missing filter or JSON patch for update.');
    }

    const filters = parseFilters(arg3);
    const patch = JSON.parse(arg4);
    const query = applyFilters(supabase.from(table).update(patch), filters).select();
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ action: 'update', table, rows: data }, null, 2));
    return;
  }

  if (command === 'delete') {
    const filters = parseFilters(arg3);
    const query = applyFilters(supabase.from(table).delete(), filters).select();
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    console.log(JSON.stringify({ action: 'delete', table, rows: data }, null, 2));
    return;
  }

  printUsage();
  throw new Error(`Unknown command \"${command}\".`);
}

main().catch((error) => {
  console.error(`DB tool error: ${error.message}`);
  process.exit(1);
});
