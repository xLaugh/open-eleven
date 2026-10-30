// Ce que les modules de l'interface se passent par `window`.
//
// Ils s'exécutent dans l'ordre de main.ts et se découvrent par ces globales : game.ts pose
// OE, i18n.ts pose I18N, account.ts pose OpenElevenAccount, room.ts OpenElevenRoom… Un
// module qui n'existe pas (compte désactivé, par exemple) laisse simplement la sienne
// indéfinie, d'où l'optionnel : le code vérifie toujours leur présence avant de s'en servir.
//
// Leur contenu est typé large (any) pour l'instant : l'enjeu de ce fichier est que le
// compilateur connaisse les NOMS, et rattrape une faute de frappe ou un oubli.

/** Pont entre game.ts et ses modules annexes (fiche, salles) : ce que game.ts expose. */
interface OpenElevenBridge {
  G(): any;
  T(template: string, vars?: Record<string, unknown>): string;
  [name: string]: any;
}

interface Window {
  OE?: OpenElevenBridge;
  OpenElevenAccount?: any;
  OpenElevenRoom?: any;
  OpenElevenNotifs?: any;
  OpenElevenGame?: any;
  I18N?: any;
  /** Pack de traduction du contenu, posé par le pack de la langue retenue (public/i18n-*.js). */
  I18N_DATA?: Record<string, Record<string, string>>;
  /** Dictionnaire d'interface de l'espagnol et de l'arabe, posé par leur pack. */
  I18N_UI?: Record<string, Record<string, string>>;
}

// --- Éléments trouvés par sélecteur ---------------------------------------------------------
// L'interface cherche ses éléments par identifiant ou sélecteur (querySelector, $("id")) et leur
// lit ou écrit aussitôt `value`, `dataset`, `onclick`, `disabled` : TypeScript les voit comme des
// `Element` génériques, qui n'ont aucune de ces propriétés. Plutôt que de typer chaque sélecteur
// (des centaines), on les déclare ici une fois. Un typage par sélecteur pourra s'y substituer
// progressivement ; ces déclarations sont compatibles avec celles de HTMLElement.
interface Element {
  dataset: DOMStringMap;
  onclick: ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null;
  value: any;
  disabled: any;
}
interface EventTarget {
  closest(selectors: string): any;
}
