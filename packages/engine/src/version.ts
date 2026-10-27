// Version du MOTEUR (règles + données). Envoyée au serveur avec chaque journal de
// choix, et comparée à la sienne : sans ça, un déploiement en cours de journée ferait
// vérifier certains runs avec l'ancien moteur et d'autres avec le nouveau.
// ⚠️ À AVANCER à chaque changement qui touche le déroulé d'une carrière (règles,
// équilibrage, données).
export const ENGINE_VERSION = "10.89";
