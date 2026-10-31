# La vie privée, en bref

Pour les élèves, les familles et le personnel enseignant. Tous les détails sont dans
l'[inventaire des données](board/data-inventory.html) (en anglais).

## L'essentiel

- **Les élèves utilisent un surnom**, pas leur nom, et se connectent avec des images secrètes. Aucun courriel,
  date de naissance, photo ni adresse n'est recueilli.
- **Protégé est un site Web, et ses renseignements sont gardés en ligne.** Les classes, les leçons, les surnoms
  et ce que les élèves ont appris à Gloam sont stockés dans la base de données de Protégé (Turso, aux
  États-Unis). L'application elle-même fonctionne sur Vercel, aussi aux États-Unis. Rien n'est gardé sur les
  ordinateurs de l'école.
- **Le cerveau de Gloam, c'est Claude**, une IA créée par Anthropic. On le dit aux élèves, avec des mots de
  leur âge.
- **Ce qu'un élève écrit à Gloam** est vu par lui et par son enseignant, et envoyé à Claude pour que Gloam
  puisse répondre. Ce n'est jamais vendu, partagé ni utilisé pour de la publicité.
- **Les bougies de Gloam** sont une estimation de la qualité d'une explication, jamais une note. Le personnel
  enseignant peut les corriger.
- **Rien ne suit personne.** Il n'y a aucun outil d'analyse, publicité, traceur ni script tiers.
- **Les renseignements sont effacés** selon la règle du conseil scolaire (par défaut, un an après la dernière
  utilisation d'une classe).
- **Vous pouvez demander** à voir, à corriger ou à effacer les renseignements d'un élève. Demandez-le à
  l'enseignant, qui peut tout télécharger en un seul fichier, les corriger ou les effacer.

## Ce qui va à Claude

Quand un élève écrit à Gloam, Protégé envoie à Claude la leçon, les consignes de Gloam, et ce que l'élève a
écrit, avec les derniers échanges de la conversation. Il n'envoie **jamais** le surnom de l'élève ni rien qui dise qui il
est. Quand un enseignant ajoute une leçon, Claude reçoit le texte choisi dans ses notes.

Anthropic n'utilise pas ce que Protégé lui envoie pour entraîner son IA.

## Les fichiers de leçon

Quand un enseignant ajoute un fichier PDF, PowerPoint ou Word, il est lu dans son propre navigateur. Le
fichier n'est jamais téléversé : seul le texte choisi est envoyé à Protégé.

## La dictée vocale

Quand un élève appuie sur le micro, son propre appareil transforme sa voix en mots. L'enregistrement n'est
jamais gardé ni envoyé ailleurs, ni à Protégé ni à une entreprise de reconnaissance vocale. Si un appareil ne
peut pas le faire lui-même, le micro n'apparaît pas. Les mots apparaissent dans la boîte de l'élève pour qu'il
puisse les corriger avant d'envoyer.

## La lecture à voix haute

La lecture à voix haute utilise les voix déjà présentes sur l'appareil de l'élève. Ce qu'elle lit n'est jamais
envoyé ailleurs pour être prononcé.

## Les réglages d'accessibilité

Les élèves peuvent choisir des réglages comme un texte plus gros, la lecture à voix haute ou une police adaptée
à la dyslexie. Ces choix peuvent révéler quelque chose de personnel : un enseignant ne voit donc jamais ce qu'un
élève a choisi pour lui-même. Il voit seulement les mesures d'adaptation qu'il a lui-même activées.

## Google

Seulement si un enseignant l'active pour une classe, les élèves peuvent se connecter avec leur compte Google de
l'école. Protégé garde alors seulement un numéro de compte brouillé : aucun nom, courriel ni photo.

## Ce site Web

Ce site offre de l'information, et la page où les élèves tapent le code de leur classe (/fr/j). Cette page les
envoie seulement vers Protégé, et ne garde rien de ce qu'ils tapent. Protégé lui-même ne fonctionne pas ici.
Le site n'a ni témoins (cookies), ni connexion, ni outil d'analyse, ni publicité, ni traceur, et il ne charge
rien depuis d'autres sites. Il retient une seule chose, sur votre propre appareil seulement : si vous avez
activé la voix de Gloam.

Il est hébergé par Cloudflare Pages. Comme tout hébergeur, Cloudflare voit l'adresse Internet des visiteurs,
pour pouvoir livrer les pages et bloquer les attaques.

## Des questions?

Adressez-vous à votre enseignant ou à votre école. Les écoles trouveront tout ce dont leur responsable de la vie
privée a besoin dans la [trousse pour les conseils scolaires](board/README.html) (en anglais).
