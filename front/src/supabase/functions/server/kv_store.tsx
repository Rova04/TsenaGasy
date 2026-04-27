// Ce fichier a été désactivé pour le mode démo
// L'application utilise maintenant uniquement le localStorage et les données simulées

export const set = async (key: string, value: any) => {
  console.log('Demo mode: KV store set operation simulated');
  return Promise.resolve();
};

export const get = async (key: string) => {
  console.log('Demo mode: KV store get operation simulated');
  return Promise.resolve(null);
};

export const getByPrefix = async (prefix: string) => {
  console.log('Demo mode: KV store getByPrefix operation simulated');
  return Promise.resolve([]);
};