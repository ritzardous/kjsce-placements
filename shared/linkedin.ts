type Person = {name:string;roll:string;companyKey:string;company:string};
const compact=(value:string)=>value.toLowerCase().replace(/[^a-z]/g,'');
const aliases:Record<string,string[]>={
  godrej:['godrej_capital','godrej_boyce','godrej_and_boyce_ppo'],
  aptia:['aptia','aptia_india'], edelweiss:['edelweiss_global_markets'],
  iciciprudential:['icici_prudential_amc_ltd','icici_prudential_life_insurance'],
  nsci:['ncsi_technologies_india'], parimalpharma:['piramal_pharma'],
  lloyd:['lloyds_advance_defence_systems'], axis:['axis_asset_management_company_ltd'],
  nsdl:['national_securities_depository_ltd'], ion:['ion_group'],
  eightydays:['colourblind_ventures_private_limited_eighty_days'],
};
export function buildLinkedInProfiles(source:string,people:Person[]) {
  const profiles:Record<string,string>={},unmatched:{company:string;url:string;reason:string}[]=[],conflicts=new Set<string>();
  let company='';let links=0;
  for(const raw of source.split(/\r?\n/)) {
    const line=raw.trim();if(!line)continue;
    if(!line.includes('https://')){company=line.replace(/^#+\s*/,'');continue;}
    const linksInLine=line.match(/https:\/\/[^\s<>\])]+/g)||[];
    for(const address of linksInLine){
      links++;
      let url:URL;
      try{url=new URL(address);}catch{unmatched.push({company,url:address,reason:'Invalid URL'});continue;}
      if(!['linkedin.com','www.linkedin.com'].includes(url.hostname)||!/^\/in\/[^/]+\/?$/.test(url.pathname)){
        unmatched.push({company,url:address,reason:'Expected a LinkedIn profile URL'});continue;
      }
      const heading=compact(company);
      const keys=aliases[heading];
      const scoped=people.filter(person=>keys?keys.includes(person.companyKey):compact(person.company)===heading||compact(person.company).startsWith(heading));
      let slug:string;
      try{slug=compact(decodeURIComponent(url.pathname.slice(4)));}catch{unmatched.push({company,url:address,reason:'Invalid profile path'});continue;}
      const matches=new Map<string,Person>();
      const explicit=scoped.filter(person=>new RegExp(`\\b${person.roll}\\b`).test(line));
      for(const person of scoped){
        const tokens=person.name.toLowerCase().match(/[a-z]+/g)||[];
        const first=tokens[0],last=tokens.at(-1);
        const explicitRoll=new RegExp(`\\b${person.roll}\\b`).test(line);
        const named=first&&last&&tokens.length>1&&first.length>=2&&
          (slug.includes(compact(person.name))||last.length>=2&&
            (slug.includes(first+last)||slug.includes(last+first)||slug.startsWith(first)&&slug.indexOf(last,first.length)>=first.length));
        if(explicit.length?explicitRoll:named)matches.set(person.roll,person);
      }
      if(matches.size!==1){unmatched.push({company,url:address,reason:matches.size?'More than one candidate matches':'Add the candidate roll number beside this URL'});continue;}
      const roll=[...matches.keys()][0];
      const clean=`https://www.linkedin.com${url.pathname.replace(/\/$/,'')}/`;
      if(conflicts.has(roll)||profiles[roll]&&profiles[roll]!==clean){unmatched.push({company,url:address,reason:`Conflicting profiles for roll ${roll}`});conflicts.add(roll);delete profiles[roll];continue;}
      profiles[roll]=clean;
    }
  }
  return {profiles,unmatched,links};
}
