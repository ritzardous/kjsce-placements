import {test,expect} from '@playwright/test';
test('adding a missing company survives input blur, reports failures and selects the result',async ({page})=>{
  await page.goto('/tests/fixtures/company-picker.html');
  const input=page.getByRole('combobox',{name:'Company',exact:true});
  await input.fill('Fail Labs');
  await page.getByRole('button',{name:'Add “Fail Labs”',exact:true}).click();
  await expect(page.getByRole('alert')).toHaveText('Please retry');
  await input.fill('New Labs');
  await page.getByRole('button',{name:'Add “New Labs”',exact:true}).click();
  await expect(page.getByRole('button',{name:'Adding company…'})).toBeDisabled();
  await expect(input).toHaveValue('New Labs');
  await expect(page.locator('.procedure-company-selected')).toContainText('New Labs');
  await expect(page.locator('.company-create-button')).toHaveCount(0);
});
