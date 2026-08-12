export async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const text = await res.text();
    let data = {};
    
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      data = { error: `Server error (Invalid JSON): ${text.slice(0, 80)}` };
    }
    
    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error('API connection failed:', err);
    return {
      ok: false,
      status: 503,
      data: { error: 'Network error: Express server is offline or unreachable.' }
    };
  }
}
