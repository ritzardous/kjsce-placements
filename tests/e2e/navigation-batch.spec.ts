import {test,expect} from '@playwright/test';
import {signInGoogle} from './auth-helper';

test('selected batch survives app sections and refresh; changing batch starts at Home',async({page},info)=>{
 test.setTimeout(60000);
 await signInGoogle(page);
 await expect(page.getByRole('heading',{name:'Class of 2027',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:/Class of 2025/}).click();
 await expect(page.getByRole('heading',{name:/KJSCE '25/})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Placement year'})).toHaveCount(0);
 const quick=page.getByRole('navigation',{name:'Quick navigation'}),phone=info.project.name==='mobile';
 if(phone){await expect(page.getByRole('navigation',{name:'App',exact:true})).not.toBeVisible();await expect(page.getByRole('navigation',{name:'Dashboard',exact:true})).not.toBeVisible();await quick.getByRole('link',{name:'Experiences',exact:true}).click();}
 else await page.getByRole('navigation',{name:'App',exact:true}).getByRole('link',{name:'Company Procedures',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Company Procedures',exact:true})).toBeVisible();
 if(phone)await quick.getByRole('link',{name:'Account',exact:true}).click();else await page.getByRole('link',{name:'My Account',exact:true}).click();
 await page.reload();await expect(page.getByRole('heading',{name:'My Account',exact:true})).toBeVisible();
 if(phone)await quick.getByRole('link',{name:'Statistics',exact:true}).click();else await page.getByRole('navigation',{name:'App',exact:true}).getByRole('link',{name:'Placement Stats',exact:true}).click();
 await expect(page).toHaveURL(/#2025\/overview$/);
 if(phone){await quick.getByRole('button',{name:'Statistics',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:'artifacts/mobile-statistics-menu.png',fullPage:false});await page.getByRole('dialog').getByRole('link',{name:'Career explorer',exact:true}).click();}
 else await page.getByRole('navigation',{name:'Dashboard',exact:true}).getByRole('link',{name:'Career explorer',exact:true}).click();
 const views=page.getByRole('navigation',{name:'Career explorer views'});
 await page.getByRole('textbox',{name:'Search candidates'}).fill('Google');
 await views.getByRole('link',{name:'Hiring timeline',exact:true}).click();await expect(page.getByRole('heading',{name:'Placement Timeline',exact:true})).toBeVisible();
 await views.getByRole('link',{name:'Insights',exact:true}).click();await expect(page.getByRole('heading',{name:'Insights',exact:true})).toBeVisible();
 await views.getByRole('link',{name:'Candidates & roles',exact:true}).click();await expect(page.getByRole('textbox',{name:'Search candidates'})).toHaveValue('Google');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`artifacts/career-explorer-${info.project.name}.png`,fullPage:false});
 await page.locator('.app-header .batch-back').click();await expect(page).toHaveURL(/#home$/);
 await page.getByRole('link',{name:/Class of 2026/}).click();await expect(page).toHaveURL(/#overview$/);
 await page.goto('/#company/barclays');await expect(page.getByRole('heading',{name:'Barclays',exact:true})).toBeVisible();
 const sources=page.locator('.company-source-details');await expect(sources.locator('.announcement-provenance').first()).not.toBeVisible();await sources.locator('summary').click();await expect(sources.locator('.announcement-provenance').first()).toContainText('Source:');
 await sources.locator('summary').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`artifacts/company-clean-${info.project.name}.png`,fullPage:false});
 await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('button',{name:'Continue with Google'})).toBeVisible();
});
