import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleWritingFormat as toggle, isWritingFormatActive as active, type WritingFormat } from '../src/procedure-formatting';

for (const format of ['bold','italic','code','link','heading','list','quote'] as WritingFormat[]) {
  test(`${format} toggles twice without stacking markers or losing the selection`,()=>{
    const first=toggle('Hello world',0,5,format);
    assert.equal(active(first.body,first.start,first.end,format),true);
    const second=toggle(first.body,first.start,first.end,format);
    assert.deepEqual(second,{body:'Hello world',start:0,end:5});
    assert.equal(active(second.body,second.start,second.end,format),false);
  });
}
test('bold and italic toggle independently when nested',()=>{
  const bold=toggle('Hello',0,5,'bold');
  assert.equal(active(bold.body,bold.start,bold.end,'italic'),false);
  const both=toggle(bold.body,bold.start,bold.end,'italic');
  assert.equal(both.body,'***Hello***');
  const italic=toggle(both.body,both.start,both.end,'bold');
  assert.equal(italic.body,'*Hello*');
  assert.equal(active(italic.body,italic.start,italic.end,'italic'),true);
  assert.deepEqual(toggle(italic.body,italic.start,italic.end,'italic'),{body:'Hello',start:0,end:5});
});
test('a cursor inside formatting removes the format and preserves its position',()=>{
  assert.deepEqual(toggle('A **hello** B',6,6,'bold'),{body:'A hello B',start:4,end:4});
  assert.deepEqual(toggle('[hello](https://edited.example/path)',3,3,'link'),{body:'hello',start:2,end:2});
  assert.deepEqual(toggle('**hello**',0,9,'bold'),{body:'hello',start:0,end:5});
});
test('block tools toggle entire selected lines and exclude the next line at a selection boundary',()=>{
  for(const format of ['heading','list','quote'] as WritingFormat[]){
    const first=toggle('First\nSecond\nThird',2,13,format);
    assert.equal(first.body.endsWith('\nThird'),true);
    assert.deepEqual(toggle(first.body,first.start,first.end,format),{body:'First\nSecond\nThird',start:2,end:13});
  }
});
test('mixed block formatting is normalized in one click rather than duplicated',()=>{
  assert.equal(toggle('- First\nSecond',0,14,'list').body,'- First\n- Second');
  assert.equal(toggle('# Heading',3,3,'heading').body,'Heading');
  assert.equal(toggle('  > Quote',5,5,'quote').body,'  Quote');
});
test('empty editors and empty lines can toggle back to plain writing',()=>{
  for(const format of ['bold','italic','code','link','heading','list','quote'] as WritingFormat[]){
    const first=toggle('',0,0,format);
    const second=toggle(first.body,first.start,first.end,format);
    assert.equal(active(second.body,second.start,second.end,format),false);
    assert.equal(second.body.includes('*'),false);
  }
});
