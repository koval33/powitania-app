/**
 * Walidacja pól formularza — NIP, kod pocztowy, telefon
 * Współdzielone między api-contact.js i api-payment.js
 */

// Wagi do sumy kontrolnej polskiego NIP
const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

/**
 * Walidacja NIP — polski (z sumą kontrolną) lub zagraniczny (prefix + cyfry)
 * @param {string} val
 * @returns {{ok: boolean, error?: string}}
 */
function validateNIP(val) {
  if (!val) return { ok: true }; // pole opcjonalne
  const clean = val.replace(/[\s-]/g, '');

  // Zagraniczny NIP: 2 litery + min 5 cyfr
  if (/^[A-Z]{2}/i.test(clean)) {
    const digits = clean.slice(2);
    if (digits.length < 5 || !/^\d+$/.test(digits)) {
      return { ok: false, error: 'Niepoprawny format NIP zagraniczny (np. DE123456789).' };
    }
    return { ok: true };
  }

  // Polski NIP: dokładnie 10 cyfr + suma kontrolna
  if (!/^\d{10}$/.test(clean)) {
    return { ok: false, error: 'NIP powinien zawierać 10 cyfr.' };
  }
  const digits = clean.split('').map(Number);
  const checksum = NIP_WEIGHTS.reduce((sum, w, i) => sum + w * digits[i], 0) % 11;
  if (checksum !== digits[9]) {
    return { ok: false, error: 'Niepoprawny numer NIP (błąd sumy kontrolnej).' };
  }
  return { ok: true };
}

/**
 * Walidacja kodu pocztowego — format dd-ddd
 * @param {string} val
 * @returns {{ok: boolean, error?: string}}
 */
function validateZipCode(val) {
  if (!val) return { ok: true };
  if (!/^\d{2}-\d{3}$/.test(val.trim())) {
    return { ok: false, error: 'Kod pocztowy powinien mieć format XX-XXX.' };
  }
  return { ok: true };
}

/**
 * Walidacja telefonu — min 7 cyfr, dozwolone +, spacje, myślniki
 * @param {string} val
 * @returns {{ok: boolean, error?: string}}
 */
function validatePhone(val) {
  if (!val) return { ok: true }; // pole opcjonalne
  const clean = val.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{7,15}$/.test(clean)) {
    return { ok: false, error: 'Podaj poprawny numer telefonu (min. 7 cyfr).' };
  }
  return { ok: true };
}

module.exports = { validateNIP, validateZipCode, validatePhone };
