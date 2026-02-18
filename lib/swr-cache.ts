export const swrCache = new Map();

export const createFetcher = (getToken: () => Promise<string | null>) => {
  return async (url: string) => {
    const token = await getToken();
    if (!token) throw new Error('No autenticado');

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error en la solicitud');
    }

    return res.json();
  };
};