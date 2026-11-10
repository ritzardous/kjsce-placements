export async function withTimeout<T>(request: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('The service did not respond. Check your connection and retry.')), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}
