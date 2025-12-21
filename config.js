// Supabase Configuration
// Replace these with your actual Supabase credentials

const SUPABASE_URL = 'https://ccikwixcrslogqjusbtk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjaWt3aXhjcnNsb2dxanVzYnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMDY3NjEsImV4cCI6MjA4MTg4Mjc2MX0.Ir3Xe1N5xNjlsxlNQTuIPbwetj-K6THQt0fUGgTi6Es';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Membership types
const MEMBERSHIP_TYPES = [
    'Monthly',
    'Quarterly',
    '6 Months',
    'Annual',
    'Drop-in',
    'Trial'
];

// Membership statuses
const MEMBERSHIP_STATUSES = [
    'active',
    'expired',
    'suspended',
    'cancelled'
];