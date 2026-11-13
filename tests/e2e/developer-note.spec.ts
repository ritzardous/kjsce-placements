import {test,expect} from '@playwright/test';

test('developer note is public, navigable and honest about data practices', async ({page}) => {
  await page.goto('/#about');
  await expect(page.getByRole('heading',{name:'Good information should travel further.'})).toBeVisible();
  await expect(page.getByRole('link',{name:'a simple HTML page'})).toHaveAttribute('href','https://placementsatkjsce-26.vercel.app/');
  await expect(page.locator('#note-story')).toContainText('Class of 2027');
  await page.getByRole('navigation',{name:'About this project'}).getByRole('link',{name:'Privacy',exact:true}).click();
  await expect(page).toHaveURL(/#about\/privacy$/);
  await expect(page.getByRole('heading',{name:'Know what you’re sharing.'})).toBeInViewport();
  await expect(page.locator('#note-privacy')).toContainText('not a promise of complete erasure');
  await expect(page.locator('#note-contact a[href^="mailto:"]')).toHaveCount(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('navigation',{name:'About this project'}).getByRole('link',{name:'Using the app'}).click();
  await expect(page.locator('#note-terms')).toContainText('independent student-built project');
  await expect(page.locator('#note-terms')).toContainText('do not imply affiliation');
});

test('footer opens the note and alumni card omits decorative clutter', async ({page}) => {
  await page.goto('/#landing');
  await expect(page.getByRole('heading',{name:'Don’t prep in the dark.',exact:true})).toBeVisible();
  await expect(page.locator('.lp-handoff-school .app-icon')).toHaveCount(0);
  await expect(page.locator('.lp-handoff-ticket-heading .app-icon')).toHaveCount(0);
  await expect(page.locator('.lp-handoff-top')).not.toContainText('Your college. Your alumni.');
  await page.getByRole('link',{name:'About this project'}).click();
  await expect(page).toHaveURL(/#about$/);
  await expect(page.getByRole('heading',{name:'Good information should travel further.'})).toBeVisible();
});

test('personal sections come first and the return link stays available throughout the note',async ({page})=>{
  await page.goto('/#about');
  await expect(page.getByRole('link',{name:'riteshjha.exe@gmail.com'})).toHaveAttribute('href','mailto:riteshjha.exe@gmail.com');
  await expect(page.getByRole('link',{name:'sakshamvarshney0701@gmail.com'})).toHaveAttribute('href','mailto:sakshamvarshney0701@gmail.com');
  await expect(page.getByRole('link',{name:'Explore the code on GitHub'})).toHaveAttribute('href','https://github.com/ritzardous/kjsce-placements');
  expect(await page.locator('.developer-note>section').evaluateAll(sections=>sections.map(s=>s.id))).toEqual(['note-story','note-contact','note-sources','note-privacy','note-terms']);
  const back=page.getByRole('link',{name:'Back to Placement Stats',exact:true});
  for(const id of ['note-story','note-contact','note-sources','note-privacy','note-terms']) {
    await page.locator('#'+id).scrollIntoViewIfNeeded();
    await expect(back).toBeInViewport();
    await expect(back).toHaveCSS('position','fixed');
  }
  await back.click();
  await expect(page).toHaveURL(/#landing$/);
});

test('footer story invitation is aligned and easy to open',async ({page})=>{
  await page.goto('/#landing');
  const footer=page.locator('.product-footer');
  await footer.scrollIntoViewIfNeeded();
  const link=footer.getByRole('link',{name:'About this project'});
  await expect(link).toBeVisible();
  const a=await link.boundingBox(),b=await footer.boundingBox();
  expect(a!.height).toBeGreaterThanOrEqual(44);
  await expect(link).toHaveCSS('background-color','rgba(0, 0, 0, 0)');
  if(page.viewportSize()!.width>980) expect(Math.abs(a!.x+a!.width/2-b!.x-b!.width/2)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await link.click();
  await expect(page).toHaveURL(/#about$/);
});

test('about copy names source types and uses no em dashes',async({page})=>{
 await page.goto('/#about/sources');await expect(page.locator('#note-sources')).toBeVisible();
 await expect(page.locator('#note-sources')).toContainText('official T&PO emails');await expect(page.locator('#note-sources')).toContainText('college website');await expect(page.locator('#note-sources')).toContainText('unofficial web sources');
 await expect(page.locator('.developer-note-page')).not.toContainText('—');
});
