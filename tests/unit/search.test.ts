import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch, companyMatchScore} from '../../shared/search';

test('search tolerates accents, punctuation, reordered words and whitespace',()=>{
  assert(matchesSearch('Café Data-Engineer at Barclays','  BARCLAYS café  '));
  assert(matchesSearch('JP Morgan Chase','JP-Morgan'));
  assert(matchesSearch('JP Morgan Chase','jpmorgan'));
  assert(matchesSearch('Data Engineer','engineer data'));
  assert(matchesSearch('Software Engineer','   '));
});
test('one spelling error or transposition is tolerated without broad false matches',()=>{
  for(const query of ['Barclys','Barclays','Barclayz','Barclasy'])assert(matchesSearch('Barclays',query),query);
  assert(!matchesSearch('Barclays','Microsoft'));
  assert(!matchesSearch('IT','IB'));
  assert(!matchesSearch('16010122129','16010122128'));
  assert(!matchesSearch('Coding interview','coding finance'));
});
test('dynamic company search handles upper/lower case, ampersands, abbreviations and ranks accurately', () => {
  const lt = { name: 'L&T Technology Services', key: 'l-t-technology-services', type: 'Core', roles: ['Graduate Engineer Trainee'] };
  const tata = { name: 'Tata Motors Insurance Broking And Advisory Services Limited', key: 'tata-motors', type: 'Consultancy', roles: ['Graduate Engineer Trainee'] };
  const tekgeminus = { name: 'Tekgeminus Solutions Ltd', key: 'tekgeminus', type: 'Not provided', roles: ['Not provided'] };

  // All uppercase, lowercase, spaced, and abbreviation variants of L&T match L&T
  for (const q of ['L&T', 'l&t', 'L & T', 'l & t', 'L and T', 'l and t', 'LT', 'lnt', 'ltts']) {
    const scoreLT = companyMatchScore(lt, q);
    const scoreTata = companyMatchScore(tata, q);
    const scoreTek = companyMatchScore(tekgeminus, q);
    assert.ok(scoreLT > 0, `Expected L&T to match query "${q}"`);
    assert.equal(scoreTata, 0, `Expected Tata Motors NOT to match query "${q}"`);
    assert.equal(scoreTek, 0, `Expected Tekgeminus NOT to match query "${q}"`);
  }

  // Matches even with minor typos ("here and there")
  assert.ok(companyMatchScore(lt, 'l&tt') > 0);
  assert.ok(companyMatchScore({ name: 'Barclays' }, 'barclys') > 0);
  assert.ok(companyMatchScore({ name: 'Gupshup Technology' }, 'gupshp') > 0);
});
