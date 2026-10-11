import {test} from 'node:test';
import assert from 'node:assert/strict';
import {matchesSearch} from '../shared/search';

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
