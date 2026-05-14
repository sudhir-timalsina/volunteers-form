/* =============================================
   TRAIL Volunteer Registration — script.js
   Supabase backend + form validation
============================================= */

// ─── Supabase Config ───────────────────────
// Replace these with your actual Supabase project credentials
// See DEPLOYMENT GUIDE for how to set these safely
const SUPABASE_URL  = 'https://ixobfvdsugzmumbfcfdp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4b2JmdmRzdWd6bXVtYmZjZmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3MzYxNTUsImV4cCI6MjA5NDMxMjE1NX0.5hjz9y2oodMs-RW4wz025q2WTP2H870ndPluhbyYzYc';

const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── DOM Refs ──────────────────────────────
const form       = document.getElementById('volunteerForm');
const submitBtn  = document.getElementById('submitBtn');
const successMsg = document.getElementById('successMsg');
const errorMsg   = document.getElementById('errorMsg');
const errorText  = document.getElementById('errorText');

// ─── Validation helpers ────────────────────
const isEmpty  = v => !v || !v.trim();
const isEmail  = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhone  = v => /^[+\d\s\-()]{7,15}$/.test(v);

function setError(fieldId, msg) {
  const el = document.getElementById('err-' + fieldId);
  const input = document.getElementById(fieldId);
  if (el) el.textContent = msg;
  if (input) {
    if (msg) input.classList.add('invalid');
    else     input.classList.remove('invalid');
  }
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.invalid').forEach(e => e.classList.remove('invalid'));
}

function validateForm(data) {
  let valid = true;
  if (isEmpty(data.full_name)) {
    setError('full_name', 'Full name is required.'); valid = false;
  }
  if (isEmpty(data.email)) {
    setError('email', 'Email address is required.'); valid = false;
  } else if (!isEmail(data.email)) {
    setError('email', 'Enter a valid email address.'); valid = false;
  }
  if (isEmpty(data.phone)) {
    setError('phone', 'Phone number is required.'); valid = false;
  } else if (!isPhone(data.phone)) {
    setError('phone', 'Enter a valid phone number.'); valid = false;
  }
  if (!data.age) {
    setError('age', 'Age is required.'); valid = false;
  } else if (data.age < 16 || data.age > 60) {
    setError('age', 'Age must be between 16 and 60.'); valid = false;
  }
  if (isEmpty(data.address)) {
    setError('address', 'Permanent address is required.'); valid = false;
  }
  if (isEmpty(data.reason)) {
    setError('reason', 'Please share your motivation.'); valid = false;
  } else if (data.reason.trim().length < 30) {
    setError('reason', 'Please write at least 30 characters.'); valid = false;
  }
  if (!data.consent) {
    setError('consent', 'You must agree to participate.'); valid = false;
  }
  return valid;
}

// ─── Loading state ──────────────────────────
function setLoading(on) {
  submitBtn.disabled = on;
  if (on) submitBtn.classList.add('loading');
  else    submitBtn.classList.remove('loading');
}

function showSuccess() {
  successMsg.hidden = false;
  errorMsg.hidden   = true;
  successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function showError(msg) {
  errorMsg.hidden   = false;
  successMsg.hidden = true;
  errorText.textContent = msg || 'Something went wrong. Please try again.';
  errorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Honeypot check ─────────────────────────
function isSpam() {
  const hp = document.getElementById('honeypot');
  return hp && hp.value.length > 0;
}

// ─── Form submit ────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  successMsg.hidden = true;
  errorMsg.hidden   = true;

  // Spam guard
  if (isSpam()) return;

  // Collect values
  const data = {
    full_name : form.full_name.value.trim(),
    email     : form.email.value.trim().toLowerCase(),
    phone     : form.phone.value.trim(),
    age       : parseInt(form.age.value, 10) || null,
    address   : form.address.value.trim(),
    reason    : form.reason.value.trim(),
    consent   : form.consent.checked,
  };

  // Client-side validation
  if (!validateForm(data)) return;

  setLoading(true);

  try {
    // ── 1. Check for duplicate email ──────────
    const { data: existing, error: checkErr } = await db
      .from('volunteers')
      .select('id')
      .eq('email', data.email)
      .maybeSingle();

    if (checkErr) throw checkErr;

    if (existing) {
      setLoading(false);
      setError('email', 'This email is already registered.');
      showError('This email address has already been used to register. Each volunteer can register only once.');
      return;
    }

    // ── 2. Insert record ──────────────────────
    const { error: insertErr } = await db
      .from('volunteers')
      .insert([data]);

    if (insertErr) throw insertErr;

    // ── 3. Success ────────────────────────────
    setLoading(false);
    form.reset();
    showSuccess();

  } catch (err) {
    setLoading(false);
    console.error('Supabase error:', err);

    // Friendly messages for known codes
    if (err?.code === '23505') {
      setError('email', 'This email is already registered.');
      showError('This email address has already been used. Please use a different email or contact us if you think this is a mistake.');
    } else if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      showError('Network error – please check your connection and try again.');
    } else {
      showError('Something went wrong on our end. Please try again in a moment.');
    }
  }
});

// ─── Live validation (on blur) ──────────────
['full_name','email','phone','age','address'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('blur', () => {
    const v = el.value.trim();
    if (id === 'full_name' && isEmpty(v)) setError(id, 'Full name is required.');
    if (id === 'email' && v && !isEmail(v)) setError(id, 'Enter a valid email address.');
    if (id === 'phone' && v && !isPhone(v)) setError(id, 'Enter a valid phone number.');
    if (id === 'age' && v && (v < 16 || v > 60)) setError(id, 'Age must be between 16 and 60.');
  });
  el.addEventListener('input', () => {
    setError(id, '');
    el.classList.remove('invalid');
  });
});

document.getElementById('reason')?.addEventListener('input', () => {
  setError('reason', '');
  document.getElementById('reason').classList.remove('invalid');
});

// ─── Smooth scroll for hero CTA ─────────────
document.querySelectorAll('a[href="#register"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById('register').scrollIntoView({ behavior: 'smooth' });
  });
});