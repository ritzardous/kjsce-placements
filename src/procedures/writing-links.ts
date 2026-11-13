/** Only explicit web and email links can be inserted into an experience. */
export function safeWritingLink(value:string):string|null {
  const text=value.trim();
  if(!/^(https?:|mailto:)/i.test(text)||/[\u0000-\u0020\u007f]/.test(text))return null;
  try {const url=new URL(text);if(url.protocol==='mailto:')return url.pathname?url.href:null;return url.hostname&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
