// Ce fichier a été désactivé pour le mode démo
// L'application fonctionne maintenant entièrement en local sans backend

export default function handler() {
  return new Response(
    JSON.stringify({ 
      message: 'Mode démo activé - pas de serveur backend nécessaire',
      status: 'enabled'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }
  );
}