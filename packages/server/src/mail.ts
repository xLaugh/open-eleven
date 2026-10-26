// E-mails du compte : confirmation d'inscription et mot de passe oublié.
import nodemailer, { type Transporter } from "nodemailer";
import { config, mailEnabled } from "./config";

let transport: Transporter | null = null;

async function send(to: string, subject: string, text: string): Promise<void> {
  if (!mailEnabled()) throw new Error("e-mails non configurés");
  transport ??= nodemailer.createTransport(config.smtpUrl);
  await transport.sendMail({ from: config.mailFrom, to, subject, text });
}

export function sendConfirmation(to: string, token: string): Promise<void> {
  const link = config.publicUrl + "/api/auth/confirm?token=" + encodeURIComponent(token);
  return send(to, "Open Eleven — confirmez votre adresse",
    "Bienvenue sur Open Eleven !\n\nPour activer votre compte, ouvrez ce lien :\n" + link +
    "\n\nLe lien est valable 48 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n");
}

export function sendAlreadyRegistered(to: string): Promise<void> {
  // Inscription avec une adresse déjà prise : la réponse HTTP reste la même que pour
  // une adresse neuve (on ne révèle pas quels comptes existent). Le titulaire est
  // prévenu ici, et orienté vers la connexion ou la réinitialisation du mot de passe.
  const link = config.publicUrl + "/";
  return send(to, "Open Eleven — vous avez déjà un compte",
    "Quelqu'un vient de tenter de créer un compte Open Eleven avec cette adresse, mais elle en a déjà un.\n\n" +
    "Si c'était vous : connectez-vous simplement sur " + link + " — et utilisez « Mot de passe oublié » si besoin.\n\n" +
    "Si ce n'était pas vous, aucune action n'est nécessaire : aucun compte n'a été créé.\n");
}

export function sendRecovery(to: string, token: string): Promise<void> {
  // Le jeton voyage dans le fragment (#) : il n'est jamais envoyé à un serveur
  // par le navigateur, ni écrit dans un journal d'accès.
  const link = config.publicUrl + "/#type=recovery&token=" + encodeURIComponent(token);
  return send(to, "Open Eleven — nouveau mot de passe",
    "Vous avez demandé à changer de mot de passe.\n\nOuvrez ce lien pour en choisir un nouveau :\n" + link +
    "\n\nLe lien est valable 1 heure. Si vous n'avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.\n");
}
